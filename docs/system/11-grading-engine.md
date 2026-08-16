# 11 — The Grading Engine

How a student's submissions become a number on a transcript. This chapter follows the pipeline from admin policy down through faculty configuration, per-student calculation, transmutation, release, and finally GWA and academic standing.

## Contents

- [1. The pipeline end to end](#1-the-pipeline-end-to-end)
- [2. Layer 1 — Institutional policy (Admin)](#2-layer-1--institutional-policy-admin)
- [3. Layer 2 — Section grading schema (inherited, then Faculty-owned)](#3-layer-2--section-grading-schema-inherited-then-faculty-owned)
- [4. The grading lock](#4-the-grading-lock)
- [5. Layer 3 — Per-student calculation](#5-layer-3--per-student-calculation)
- [6. Transmutation](#6-transmutation)
- [7. Special grades](#7-special-grades)
- [8. Layer 4 — Release](#8-layer-4--release)
- [9. Layer 5 — GWA, standing, honours](#9-layer-5--gwa-standing-honours)
- [10. The audit trail](#10-the-audit-trail)
- [11. Grading defect register](#11-grading-defect-register)

**Related chapters:** [04 — Admin](04-role-admin.md) · [07 — Faculty](07-role-faculty.md) · [06 — Registrar](06-role-registrar.md) · [10 — Assessment Engine](10-assessment-engine.md)

---

## 1. The pipeline end to end

```
ADMIN  ── grading_period_templates ──┐
          (+ nested components)      │  cloned on section creation
       ── grade_transmutation_tables │
       ── special_grade_configs      │
       ── academic_thresholds        │
                                     ▼
DEAN   ── fn_create_section ──→ grading_periods (per term)
                              └→ grading_components (per section, per period)
                                     │
FACULTY ── customises components within admin-owned periods
        ── authors assessments, links each to a component
        ── grades submissions
                                     │
                     fn_calculate_all_grades_for_period
                                     ▼
                     fn_calculate_final_grade (per student)
                              raw % → transmuted 1.00–5.00
                                     ▼
                     section_final_grades (status = Draft)
                                     │
REGISTRAR ── fn_release_grading_period_grades
                     Draft → Approved → [evaluation gate] → Released
                                     ▼
STUDENT   ── sees the grade
                                     ▼
              fn_compute_student_gwa → fn_get_academic_standing
                     ↑ reads academic_thresholds
                                     ▼
              honours, scholarship, at-risk analytics, AI advising
```

Four roles touch this pipeline and each owns exactly one layer. That separation is the design's main strength.

---

## 2. Layer 1 — Institutional policy (Admin)

Configured at `/admin/grade-configurations` and `/admin/academic-thresholds`. See [04 §8 and §10](04-role-admin.md) for the UI.

### Grading period templates

Each template carries `name`, `sequence`, `weight`, and a nested `components[]` of `{name, weight}`.

- Period weights must total 100% across the institution — **enforced**: create is blocked once the total reaches 100, and per-period maxima are computed as the remainder.
- Component weights within a period are **displayed** as needing to total 100% — **not enforced on submit** (see §11).
- `sequence` is auto-assigned and **cannot be reordered**, which matters because seeding matches templates to periods **by sequence**.

### The transmutation ladder

A fixed 10-rung table mapping a raw percentage floor to a Philippine 1.00–5.00 grade. **Lower is better.**

| Grade | Default floor | Description |
|---|---|---|
| 1.00 | 98 | Excellent |
| 1.25 | 95 | Superior |
| 1.50 | 92 | Very Good |
| 1.75 | 89 | Good |
| 2.00 | 86 | Meritorious |
| 2.25 | 83 | Very Satisfactory |
| 2.50 | 80 | Satisfactory |
| 2.75 | 77 | Fairly Satisfactory |
| 3.00 | **75** | Passing |
| 5.00 | **0** (fixed) | Failed |

Only the floors are editable. `max_percentage` is derived as *previous floor − 1*, with the top row at 100.

`fn_save_transmutation_table` enforces exactly 10 rows at exactly those grades, whole-number floors in 0–100, a fixed 0 floor for 5.00, and **strictly decreasing floors**. Saving soft-deletes the previous institutional rows.

**Program-specific ladders are supported.** The lookup is:

```sql
WHERE (program_id = <student's program> OR program_id IS NULL)
  AND raw_grade >= min_percentage
ORDER BY (program_id IS NOT NULL) DESC, min_percentage DESC
LIMIT 1
```

A program-specific table wins over the institutional default. The admin UI only manages the institutional (`program_id IS NULL`) rows — **there is no UI for program-specific ladders**, though the engine fully supports them.

---

## 3. Layer 2 — Section grading schema (inherited, then Faculty-owned)

This was roadmap item **0.2b**, and it solved a real problem: before it, `fn_create_section` did not seed grading components, so every faculty member rebuilt their grading schema from scratch for every section.

### Inheritance on section creation

`fn_create_section` and `fn_bulk_create_sections` (`docs/sql/grading-schema-inheritance.sql`) call `fn_seed_section_grading`, which:

1. Calls `fn_seed_term_grading_periods(term_id)` to materialise the term's grading periods from the period templates
2. For each period: **skips it** if locked or if it already has components
3. Otherwise copies `grading_component_templates` joined to `grading_period_templates` **matched on `sequence`**

Every section therefore starts from a valid default.

`fn_seed_section_grading` is **REVOKEd from `authenticated`** — internal-only, reachable only through the two public entry points below.

### Faculty customisation

`fn_reseed_section_grading` ("Reset to institutional template") is allowed for Admin/Dean **or the section's own faculty**, soft-denying otherwise. In the UI the button renders **only when the section has no components and is unlocked**.

Faculty may then add, edit, and delete components within the admin-defined periods.

### The governance model

Three rules, and the reasoning behind them is worth understanding:

| Rule | Enforcement |
|---|---|
| **Period weights are admin-owned and immutable to faculty** | Faculty UI has no period-weight field |
| **Component weights per period may not exceed 100%** | `fn_create_grading_component` refuses when `SUM(existing) + new > 100`; update excludes the edited row from the sum |
| **The schema locks once grading has started** | §4 |

**There is deliberately no approval workflow.** The roadmap locked this decision explicitly: a dean/admin gate would contradict faculty single-responsibility and create a bottleneck, and the real risk — edits that silently rewrite already-computed grades — is handled by the lock plus the audit trail, not by pre-approval.

> **Gap** There is **no requirement that component weights total exactly 100.** They may total less, and `fn_calculate_final_grade` normalises by dividing by the *actual* total weight. So a period whose components sum to 60% still produces a grade out of 100 — the components just carry proportionally more weight than their stated numbers. That is defensible arithmetic, but the admin UI displays "(must equal 100%)" as though it were enforced, so the faculty member's mental model and the engine's behaviour diverge.

---

## 4. The grading lock

`fn_is_section_grading_locked(p_section_id, p_grading_period_id)` returns true iff **any** non-deleted `section_final_grades` row exists for any enrollment in that section for that period.

Once a single grade is recorded, component create, update, and delete are all refused: *"This grading period is locked because grades have already been recorded."*

The UI reflects this: a lock banner reads *"Locked: grades have been recorded for this period, so components can no longer be changed."*, and the Add / Edit / Delete controls disable.

This is the mechanism that prevents post-hoc rewriting of the weighting after grades exist. It is a clean, single-predicate rule with no exceptions — the kind of invariant that is easy to defend.

> **Note:** the lock is per (section, period), not per section. A faculty member can still restructure the Finals components after Prelim grades exist, which is correct.

---

## 5. Layer 3 — Per-student calculation

Triggered by the faculty "Calculate Grades" button → `fn_calculate_all_grades_for_period(p_section_id, p_grading_period_id)`.

Guard: `fn_assert_section_staff` — so Dean, Registrar, and Admin can also trigger it.

It loops **only enrollments with `status = 'Enrolled'`** and calls `fn_calculate_final_grade` per student, returning `{processed, succeeded, failed, failures[]}`.

### `fn_calculate_final_grade` — the core

For each grading component in the period:

```
component_score = SUM(assessment_submissions.final_score)
                    over submissions with status = 'Graded' ONLY
component_max   = SUM(assessment_items.total_points)
                    for items whose grading_component_id matches

weighted        = component_max > 0 ? (score / max) * weight : 0
```

Then:

```
raw_grade = ROUND((total_weighted / total_weight) * 100, 2)
```

If `total_weight = 0` it returns `{success: false, 'No grading components found for this period.'}`.

The result upserts into `section_final_grades` with `final_grade = raw_grade`, `status = 'Draft'`, and `remarks = 'Auto-calculated via fn_calculate_final_grade'`.

The whole function is wrapped in `EXCEPTION WHEN OTHERS THEN return {success:false, SQLERRM}`.

### Three consequences worth stating plainly

1. **Only `Graded` submissions count.** An ungraded essay contributes zero to the numerator while its assessment's `total_points` still contributes to the denominator — so calculating grades before finishing grading produces artificially low results with no warning.
2. **Missing submissions count as zero**, not as excluded. That is almost certainly the intent, but it is implicit.
3. **The denominator is `assessment_items.total_points`**, which is why the rubric mismatch in [10 §8](10-assessment-engine.md) corrupts grades.

### 🔴 The feedback hole

`fn_calculate_all_grades_for_period` returns a payload with **no `message` key**. Per the wrapper contract in [01 §4](01-architecture.md), that means `callRpc` shows **no toast at all** — the button appears to do nothing.

Worse, `GradingTab.handleCalculate` only checks `result.error`. **The per-student `failures[]` array is never surfaced.** A run where 3 of 40 students failed to calculate looks, from the faculty's chair, exactly like a run where all 40 succeeded.

This is the single most consequential instance of the SF7 silent-write class, because it sits on the most consequential action in the faculty role.

---

## 6. Transmutation

Applied inside `fn_calculate_final_grade` using the lookup in §2. The raw percentage maps to a 1.00–5.00 grade, written to `section_final_grades.transmuted_grade`.

**Direction matters and is easy to get backwards:** on the Philippine scale **1.00 is the best grade and 5.00 is failing**. Every comparison in the codebase reflects this — a prerequisite's `minimum_grade` check reads `COALESCE(final_grade, 5.0) <= minimum_grade`, and honours cutoffs are *maximum* GWA values.

---

## 7. Special grades

Configured by Admin: `code`, `label`, `description`, `min_absence_percentage`, `requires_completion`, `completion_deadline_days`, `is_passing`, `is_active`. Intended for INC, FDA, DRP, and similar.

The plumbing exists throughout:
- `section_final_grades.special_grade` is a real column
- `fn_list_grade_sheet` returns it
- The faculty per-student grade tab displays it (falling back to it when `transmuted_grade` is null)
- The student grades page falls back to it
- The curriculum audit falls back to it

### 🔴 Nothing can ever set one

**No role has a UI to assign a special grade to a student.** The field is read-only on the faculty side, absent from the registrar side, and admin only manages the catalogue. `fn_calculate_final_grade` never sets it.

The entire feature is **write-only configuration with no consumer**. Every display path handles a value that can never be produced. Given that INC (Incomplete) is a routine academic outcome, this is a real functional gap rather than a cosmetic one — and note that `enrollment_status_type` has its own separate `Incomplete` value, so there are two unconnected representations of the same idea.

---

## 8. Layer 4 — Release

Owned by the Registrar at `/registrar/grade-release`. Full UI detail in [06 §7](06-role-registrar.md).

### The state machine

```
Draft ──→ Approved ──[student submitted faculty evaluation]──→ Released
```

`fn_release_grading_period_grades(gp)` loops `section_final_grades` with `status IN ('Draft','Approved')`:

1. `Draft` → promote to `Approved`, recording `approved_by` and `approved_at`
2. Then **only if `fn_check_evaluation_completion(enrollment, gp)` is true** → `status = 'Released'`, `released_at = now()`, and `enrollments.is_grade_visible = true`

Returns `{approved, released, blocked_by_evaluation}`.

### The evaluation gate

A student who has not submitted their faculty evaluation stays at `Approved`. When they do submit, `fn_submit_evaluation` calls `fn_release_grades_after_evaluation`, which re-checks completion and flips `is_grade_visible`.

Meanwhile `fn_list_my_grades` NULLs every grade column server-side unless the evaluation lock is complete, rendering `'Locked'` in the UI with an inline **Evaluate** button linking to that exact enrollment and period.

**This is a genuinely well-designed incentive mechanism**: evaluations are not nagged, they are structurally required, the gate is enforced server-side rather than by hiding UI, and the unlock is one click away from the thing the student wants.

### Scope: Period vs Term

An enum on `terms.evaluation_scope` (falling back to `system_settings.default_evaluation_scope`, default `Period`). `fn_resolve_evaluation_period` maps any grading period to an **anchor** period when scope is `Term`, so **one evaluation unlocks every period of the term**. Under Term scope the period displays as `'Whole Term'`.

### The scheduled sweep

`fn_sweep_scheduled_grade_releases()` processes every period whose `release_at` has passed, via `pg_cron` **every 15 minutes**. Because the engine is idempotent, a period keeps re-sweeping and picks up late evaluators on subsequent runs.

**This is the only cron job in the system.**

> **Gaps**
> - 🔴 **The `'Submitted'` status is a dead end.** `grade_status_type` includes it, and the registrar dashboard counts `IN ('Submitted','Approved')` as pending release — but the engine only processes `IN ('Draft','Approved')`. A grade in `'Submitted'` is **permanently unreleasable** through the UI.
> - 🟠 **Admin cannot operate grade release.** `fn_set_grading_period_release_at` and `fn_release_grading_period_now` use an inline Registrar-only check rather than `fn_assert_role('Registrar','Admin')`.
> - 🟠 **`fn_list_grade_release_schedule` has no role guard**, and computes `blocked_count` with a per-row plpgsql call inside a lateral aggregate — O(grades) function calls per period per page load.
> - **Release is all-or-nothing per grading period.** A per-section function `fn_approve_and_release_grades(section, gp)` exists but is called from no page.
> - Up to **15 minutes** of lag between the UI showing "Releasing…" and anything happening.
> - **Divergent completeness semantics:** `fn_check_evaluation_completion` (which gates release) counts required questions against the lock's **single `template_id`**, while `fn_submit_evaluation` validates against the full **`template_ids[]`**. On multi-section evaluation forms the gate is weaker than the submit check.

---

## 9. Layer 5 — GWA, standing, honours

| Function | Returns |
|---|---|
| `fn_compute_student_gwa(student_id, term_id)` | `{gwa, total_units}` — units-weighted, **released grades only** |
| `fn_get_academic_standing(student_id, term_id)` | `{gwa, total_units, failed_count, standing}` |
| `fn_get_deans_list(term_id, p_min_gwa)` | the list |

### `academic_thresholds` — the configurable core

Roadmap item **0.2**. Before it, honour cutoffs were a hard-coded `CASE` inside `fn_get_academic_standing` (Summa ≤1.25, Magna ≤1.50, Dean's List ≤1.75, Good Standing ≤3.00, else Probation; any grade > 3.0 → Probation).

Now they live in a table, grouped into three categories:

| Category | Purpose |
|---|---|
| `Honor` | Latin honour cutoffs — a student qualifies for the highest honour whose GWA ceiling they meet |
| `Scholarship` | Scholarship cutoffs plus the tuition discount at each tier |
| `Standing` | The passing GWA ceiling separating Good Standing from Probation |

Per row: `max_gwa` (the ceiling), `requires_no_failing`, `scholarship_discount_pct`, `is_active`.

**This is what makes the analytics and the AI defensible.** One configurable table feeds grade computation, the student insight trajectories, the at-risk model, and the AI advisor's honours projections — so a number the AI states cannot disagree with a number the transcript shows. That single-source property is the strongest architectural argument in the thesis.

---

## 10. The audit trail

Every grading component create, update, and delete writes a `grade_audit_logs` row capturing action, table, record id, field changed, old value, new value, and `inet_client_addr()`.

The Admin audit-log viewer at `/admin/audit-logs` surfaces these with filters on action, table, and date range.

> **Gaps**
> - **`inet_client_addr()` behind Supabase's connection pooler records the pooler's address, not the user's.** The IP column in the audit trail is effectively useless.
> - **No export** from the audit-log viewer.
> - Grade *values* changing (via recalculation) do not appear to be audited — only component configuration is. Recalculating a period silently overwrites every student's grade with no trail of what it was before.

---

## 11. Grading defect register

| # | Defect | Consequence |
|---|---|---|
| 1 | **"Calculate Grades" gives no confirmation and discards `failures[]`** | 🔴 Silent partial failure on the most consequential faculty action |
| 2 | **Special grades can be configured but never assigned** | 🔴 A whole feature with no producer; INC is unrepresentable |
| 3 | **Rubric points vs `total_points` never reconciled** ([10 §8](10-assessment-engine.md)) | 🔴 Silently wrong weighted grades |
| 4 | **`'Submitted'` grades are permanently unreleasable** | 🔴 Dead state in the machine |
| 5 | **Component 100% total shown as required, never enforced** | 🔴 Faculty's mental model diverges from the arithmetic |
| 6 | **Only `Graded` submissions count, but their `total_points` still count** | 🟠 Calculating early silently deflates every grade |
| 7 | **Admin locked out of grade release** | 🟠 Single point of operational failure |
| 8 | **`fn_list_grade_release_schedule`: no role guard, O(grades) plpgsql calls** | 🟠 Security and scaling |
| 9 | **Completion check gating release is weaker than the submit check** | 🟠 Multi-section forms can unlock early |
| 10 | **Grade recalculation is not audited** | 🟠 No before/after trail on the values themselves |
| 11 | **Faculty cannot override an auto-graded answer** ([10 §8](10-assessment-engine.md)) | 🟠 Feeds wrong data into the calculation |
| 12 | **Release is all-or-nothing per period** | 🟡 No per-section control despite a function existing |
| 13 | **Period templates cannot be reordered**, yet seeding matches by sequence | 🟡 Mis-sequencing propagates to every new section |
| 14 | **No UI for program-specific transmutation ladders** despite full engine support | 🟡 |
| 15 | **`inet_client_addr()` records the pooler, not the user** | 🟡 Audit IP is useless |
| 16 | **Up to 15 minutes of release lag vs the displayed status** | 🟡 |
| 17 | **`GradeSheetPanel` never renders `final_grade` or `special_grade`** though the RPC returns both | 🟡 |
| 18 | **Audit log has no export** | 🟡 |
