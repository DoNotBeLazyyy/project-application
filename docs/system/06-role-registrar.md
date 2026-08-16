# 06 — Registrar Role

**Responsibility boundary:** students and records. The registrar owns the student registry, enrollment, official academic records, student lifecycle (status changes, program shifts, year progression), and the release of grades to students. The registrar does **not** design curriculum or teach.

Registrar RPCs generally guard with `fn_assert_role('Registrar', 'Admin')` — **with one significant exception documented in §7.**

## Contents

- [1. Routes and navigation](#1-routes-and-navigation)
- [2. Dashboard](#2-dashboard)
- [3. Student Management](#3-student-management)
- [4. Student Academic Records](#4-student-academic-records)
- [5. Enrollment Management](#5-enrollment-management)
- [6. Batch Progression](#6-batch-progression)
- [7. Grade Release](#7-grade-release)
- [8. Registrar gaps summary](#8-registrar-gaps-summary)

**Related chapters:** [11 — Grading Engine](11-grading-engine.md) · [08 — Student](08-role-student.md) · [05 — Dean](05-role-dean.md)

---

## 1. Routes and navigation

| Label | Path |
|---|---|
| Dashboard | `/registrar` |
| Student | `/registrar/student-management` |
| Enrollment | `/registrar/enrollment-management` |
| Batch Progression | `/registrar/batch-progression` |
| Grade Release | `/registrar/grade-release` |
| Announcements | `/registrar/announcement-management` |
| Events | `/registrar/event-management` |

Plus the un-navigated drill-down `/registrar/student-management/:studentId/records`.

> **Gaps** `RegistrarLayout` has the same `displayName` fallback of `'Dean'` found in the Faculty and Student layouts. Four of seven nav items share the `SquaresFourIcon`.

---

## 2. Dashboard

**Route** `/registrar` · **RPC** `fn_get_registrar_dashboard` with `{ p_term_id: null }` — term resolved server-side; the client never passes one.

**Seven clickable KPI tiles:**

| Tile | Stat key | Links to |
|---|---|---|
| Active Students | `active_students` | student management |
| Enrollments This Term | `enrollments_this_term` | enrollment management |
| Pending Grade Releases | `pending_grade_releases` | grade release |
| Incomplete Grades | `incomplete_grades` | grade release |
| Dropped This Term | `dropped_this_term` | student management |
| Students on LOA | `students_on_loa` | student management |
| Graduated Students | `graduated_students` | student management |

**Two analytic cards:**
- **Awaiting Grade Release** — `pending_releases` grouped by section + grading period, limited to 8, ordered by count. Each row is a button navigating to `/registrar/grade-release` — **without passing the section**, so it is a drill-*out*, not a drill-*down*.
- **Enrollment Distribution** — `program_distribution` (top 6 programs) rendered as manual percentage bars, with the denominator computed client-side.

**Server rules** (`docs/sql/dashboards.sql`): `fn_assert_role('Registrar','Admin')`; term resolved via `fn_dashboard_active_term()`. Note that `active_students`, `students_on_loa`, and `graduated_students` are **global counts, not term-scoped**, while the rest are term-scoped.

> **Gaps — one is a real workflow break**
> - 🔴 **`pending_grade_releases` counts `section_final_grades.status IN ('Submitted','Approved')`, but the release engine only processes `IN ('Draft','Approved')`.** A grade sitting in `'Submitted'` is counted here as pending and is **unreachable by both "Release Now" and the scheduled sweep**. The dashboard advertises work that the system provides no way to do.
> - The "Awaiting Grade Release" panel knows the `section_id` and discards it when navigating.

---

## 3. Student Management

**Route** `/registrar/student-management`

| Action | RPC |
|---|---|
| List | `fn_list_students_json` (`p_program_ids`, `p_year_levels`, `p_statuses` + paging) |
| Get | `fn_get_student_by_id` |
| Create | `fn_create_student` (`p_user_id`, `p_student_number`, `p_program_id`, `p_year_level`, `p_admitted_at`) |
| Update | `fn_update_student` (+ `p_status`) |
| Delete / bulk delete | `fn_delete_student` / `fn_bulk_delete_students` |
| **Re-evaluate year level** | `fn_evaluate_student_year_level` |
| Bulk CSV import | `fn_bulk_create_students` |

Columns: student number, last name, first name, email, program code, year level (all sortable), status badge (Active→success, Inactive→error, LOA→warning, Graduated→info, Expelled→error).

**Row menu:** View · Edit · **Academic Records** (→ the drill-down in §4) · **Re-evaluate Year Level** · Delete.

**Create form:** `user_id` select (populated from `fn_get_users_by_roles(['Student'])` — **a student record must be attached to an already-provisioned user account**, which Admin creates), plus student number, program, year level, admission date. Status is hidden on create. Validation: student number 3–20 chars matching `/^[A-Za-z0-9-]+$/`; `admitted_at <= today`.

**Edit form:** the same minus `user_id`, plus a status select.

CSV template: `email`, `student_number`, `program_code` (optional), `year_level` (optional, defaults 1), `admitted_at` (optional).

### Business rule — automatic year-level evaluation

`fn_evaluate_student_year_level` walks year 1→5. For each year it counts the non-elective `curriculum_maps` rows for the student's program, **skips years with zero requirements**, then counts enrollments with `status = 'Completed'` mapped to that year. If `completed >= required`, the proposed year becomes `LEAST(check_year + 1, 6)`; otherwise it stops. Hard cap at year 6.

This is a *curriculum-completion* model of progression — distinct from the *calendar* model used by Batch Progression (§6). **The two can disagree**, and nothing reconciles them.

> **Gaps**
> - **There is no data export anywhere in the registrar surface.** The "Download CSV" and "Upload CSV" toolbar buttons **both open the import modal**. For the role that owns official records, the inability to export the student registry is a notable omission.
> - The refresh-after-mutation hack `setActiveFilters(prev => ({...prev}))` permanently leaves the page in a "filtered" state — after the first create or edit, `activeFilters` is no longer `null`, so the "no filters applied" state is lost.
> - `getStudents()` / `fn_get_students` is exported with no caller in this surface.

---

## 4. Student Academic Records

**Route** `/registrar/student-management/:studentId/records` — a four-tab drill-down. All four tabs mount eagerly on selection with no caching.

| Tab | Component | RPC |
|---|---|---|
| Transcript | `TranscriptView` (shared) | `fn_get_student_transcript` |
| Curriculum Checklist | `CurriculumAuditView` (shared) | `fn_get_curriculum_audit` |
| Insight | `StudentInsightView` (shared) | `fn_get_student_insight` |
| Lifecycle | `LifecyclePanel` | `fn_list_student_lifecycle_events` |

### Print / export

Transcript and Curriculum Checklist each render a printer button calling `window.print()`, with `no-print` on the chrome and `print-area` on the content.

`TranscriptView` renders an institutional header, a student block, per-term tables (Code / Title / Units / Grade / Remarks) with `term_gwa` and `earned_units`, then Total Units Earned and Cumulative GWA. **`transcript.is_official` toggles the heading** between "Official Transcript of Records" and "Unofficial Grade Report" — the latter appending *"Request an official transcript from the Registrar."* The registrar sees the official variant; the student sees the unofficial one.

### The access gate

`fn_resolve_record_student(p_student_id)` gates all four record RPCs:
- Null `auth.uid()` → `28000 Unauthorized`
- `p_student_id IS NULL` → resolve the caller's own student row, else `42501 'Forbidden: no student profile linked'`
- Caller holds Admin/Registrar/Dean → **pass through any id**
- Otherwise the id must be the caller's own, else `42501 'Forbidden: you may only view your own academic records'`

This is one of the cleaner authorization designs in the codebase — one function, one place, reused by four RPCs, and it makes the same components safely reusable by both registrar and student.

### Lifecycle actions

| Action | Fields | RPC |
|---|---|---|
| **Change Status** | `status`*, `effective_date` (defaults today), `reason`* (**required** — *"A reason is required for the audit trail"*) | `fn_change_student_status` |
| **Shift Program** | `program_id`*, `year_level`*, `effective_date`, `reason`* | `fn_shift_student_program` |

Server rules:
- Both guard `fn_assert_role('Registrar','Admin')` and 404 on a missing student.
- **Both reject a no-op** — *"The student already holds this status."* / same program and year.
- Program shift requires the target program to exist **and be active**, and the year to be 1–6.
- Both insert a `student_lifecycle_events` row with from/to values and the effective date.

The timeline renders each event with a badge, a `describeEvent()` summary, the effective date, the reason, and *"Recorded by {name} on {date}"*.

> **Gaps** `describeEvent()` only special-cases `'Status Change'`. A `'Year Level Progression'` event — written by Batch Progression — falls into the program branch and renders as **`"None → None · Year 2 → Year 3"`**, because those rows have null program codes. Every batch-progressed student's timeline is visibly broken.

---

## 5. Enrollment Management

**Route** `/registrar/enrollment-management` — the most rule-dense screen in the system.

### The roster

On mount, two parallel fetches: `fn_get_enrollment_target_term` (sets the working term and header label) and `fn_get_terms` (options for the workspace).

| Action | RPC |
|---|---|
| List roster | `fn_list_enrollment_students_json` (`p_term_id`, `p_program_ids`, `p_year_levels`, `p_statuses`, `p_enrollment_states` + paging) |
| Target term | `fn_get_enrollment_target_term` |
| Bulk enroll via CSV | `fn_bulk_enroll_students` |

Columns: student number, name, program, year level, Subjects (`enrolled_count`), Units, enrollment state badge, status badge.

**No create, update, delete, or checkbox on the roster** — the only row action opens the workspace.

`fn_get_enrollment_target_term` picks one term ordered by status priority — `Enrollment Open` → `Ongoing` → `Upcoming` → other — tie-broken by proximity of `start_date` to today.

CSV bulk-enroll template: `student_number`, `term_label` (blank = active term), `section_codes` (**pipe-separated**), `allow_conflict`, `override_prerequisites`, `conflict_reason` (required when allowing a conflict).

### The Enrollment Workspace modal

A wide (`76rem`) modal loading `fn_get_enrollment_student_detail` and `fn_list_eligible_sections`.

1. **Header strip** — student number, name, program, year level.
2. **Term select** — changing it re-runs the whole workspace, so the registrar can enroll into a term other than the target term.
3. **Current Load table** — course, section, schedule, faculty, units, status. One row action: **Drop** behind a confirm prompt → `fn_drop_enrollment`.
4. **Eligible Sections table** — with checkboxes and a manual search box. Helper text states the core rule: *"Only sections whose course exists in the student's program curriculum are listed, regardless of which program opened the section."*

   Columns include **Slots** (`slots_taken/max_slots`) and **Advisories**, badged by precedence: Recommended (success) · Elective (info) · Full (error) · `Conflicts with {x}` (error) · `Needs {x}` (warning) · Open (info).
5. **Conditional override checkboxes** — if any selected row has unmet prerequisites, a required `override_prerequisites` checkbox appears; if any has a conflict, a required `allow_conflict` checkbox appears, which when ticked reveals a **required** free-text `conflict_reason`.
6. **Confirm button** with a dynamic label: `Enroll {n} Section(s) — {units} Units`.

### The enrollment state machine

`fn_enroll_student_section(student, section, allow_conflict, conflict_reason, override_prerequisites)` is the single authority. Ordered gates, each returning a coded soft error:

| # | Code | Condition |
|---|---|---|
| 1 | `STUDENT_NOT_FOUND` | — |
| 2 | `STUDENT_INACTIVE` | `students.status <> 'Active'` |
| 3 | `NO_PROGRAM` | student has no program |
| 4 | `SECTION_NOT_FOUND` | — |
| 5 | `SECTION_UNAVAILABLE` | section is `Closed` or `Cancelled` |
| 6 | `NOT_IN_CURRICULUM` | no `curriculum_maps` row for (program, course) |
| 7 | `ALREADY_TAKEN` | same **course** already `Enrolled` or `Completed` in any section |
| 8 | `SECTION_FULL` | non-dropped enrollments ≥ `max_slots` |
| 9 | `PREREQUISITE_UNMET` | unless overridden |
| 10 | `SCHEDULE_CONFLICT` | unless allowed |

On success it inserts with `status='Enrolled'` and — **only when a conflict actually existed** — records `is_conflict_authorized`, `conflict_authorized_by`, `conflict_authorized_at`, and the reason. This authorization trail is what the student schedule later renders as a shield icon.

**Prerequisite evaluation** (`fn_get_unmet_prerequisites`): only `Required` rows count. A `standing` prerequisite is unmet when `year_level < year_level_required`. A `course` prerequisite is unmet when there is no `Completed` enrollment on it satisfying `minimum_grade IS NULL OR COALESCE(final_grade, 5.0) <= minimum_grade` — **note the direction: lower is better on the 1.00–5.00 scale.**

**Conflict detection** (`fn_get_schedule_conflicts`): same `day_of_week` and a half-open overlap test (`target.start < existing.end AND existing.start < target.end`), restricted to the same term and to `Enrolled` enrollments. **Back-to-back classes correctly do not conflict.**

`fn_bulk_enroll_student` loops the section array with a per-section `BEGIN/EXCEPTION` so one failure can't abort the batch, returning `{enrolled_count, errors[]}` and a partial-success message.

> **Gaps**
> - **The drop reason is hardcoded to `''`.** `handleConfirmDrop` calls `dropEnrollment(id, '')` — the UI never collects one, so `drop_reason` is always NULL despite the column existing and the RPC accepting it. For a records-owning role this is an audit-trail hole.
> - **`fn_drop_enrollment` has no role assertion inside the function body** — it relies entirely on GRANT.
> - **Overrides apply uniformly to the whole batch.** You cannot authorize a conflict for one section but not another in a single submit.
> - **Full sections are listed and selectable** (badged "Full"); only the insert rejects them, so the user discovers the failure after confirming.
> - `fn_create_enrollment` / `fn_bulk_create_enrollments` are a **parallel, weaker enrollment path** with no curriculum, prerequisite, or already-taken checks. They are not called by any registrar page but remain callable.
> - Two different program-option sources are used in one role — this page imports `getPrograms()` while student management imports `useProgramOptions` **from the Dean's page folder** (`@pages/dean/program-management/useProgramOptions`), a cross-role page import.
> - `Inactive` maps to `warning` here but `error` in student management.

---

## 6. Batch Progression

**Route** `/registrar/batch-progression` — promote a cohort's year level and auto-enroll them into the next term's curriculum. **Preview-then-commit.**

| Action | RPC |
|---|---|
| Preview (read-only, `STABLE`) | `fn_preview_batch_progression` |
| Run | `fn_run_batch_progression` (+ `p_auto_enroll`, `p_reason`) |

Cohort form: `term_id`* (**Target Term** — *"Year level advances only when this term starts a new school year."*), `program_ids` (blank = all), `year_levels` (filters on the year held *today*), `reason`, and `auto_enroll` (**default true**).

Flow: Preview → four summary tiles (Students In Cohort / To Be Promoted / Enrollments To Create / Skipped) + a preview grid → "Run Progression" behind a confirm prompt → result modal + automatic re-preview.

The Run button is gated on `hasWork` with contextual copy explaining exactly why it's disabled (an SF2 fix).

Row click opens a detail modal listing every planned course with its resolved section and a per-course status.

### The promotion rule

`fn_list_progression_candidates` evaluates three history flags against the **target term's school year**:

- `has_earlier_history` — any non-dropped enrollment in a *different* school year
- `has_target_year_history` — any enrollment already in the target school year
- `is_already_progressed` — a `Year Level Progression` lifecycle event already tagged to that school year

```
advances_year = Active AND has_program AND has_earlier_history
                AND NOT has_target_year_history AND NOT is_already_progressed
```

Three consequences worth stating plainly:

1. **Year level only advances across a school-year boundary.** A second-semester run in the same school year promotes nobody.
2. **It is idempotent** — re-running cannot double-promote.
3. **Brand-new students with no prior history are never promoted.**

Blockers reported per row, never silently dropped: `INACTIVE`, `NO_PROGRAM`, `PROGRAM_COMPLETE` (*"already in the final year level — handle graduation manually"*).

### The auto-enroll plan

`fn_plan_progression_sections` takes the program's **non-elective** curriculum rows for the proposed year, matched on the target term's `term_type_id` and `school_year_id` (a NULL on the map matches anything). **Electives are never auto-planned.**

Section auto-pick: sections in the term for that course that are not Closed/Cancelled and not full, ordered **conflict-free first, then by `section_code`**, taking one.

Issue codes surfaced per course: `ALREADY_TAKEN`, `NO_SECTION`, `SCHEDULE_CONFLICT`.

The actual writes go through `fn_enroll_student_section(student, section, FALSE, NULL, FALSE)` — **conflict and prerequisite overrides hard-coded off** — so every guard in §5 still applies. `ALREADY_TAKEN` is treated as a no-op, not an error.

**Hard batch cap of 500 candidates**, refusing larger runs with a message to narrow the filters.

> **Gaps**
> - 🔴 **`fn_run_batch_progression` is not transactional across students.** A mid-loop exception leaves earlier students promoted and enrolled, and returns only `{success: false, message: SQLERRM}` with **no partial report** of what did happen. The registrar has no way to know how far it got.
> - `resolveCohortParams` always sends `p_student_ids: null`, so **the per-student cohort parameter the RPC supports is unreachable from the UI** — there is no way to progress a hand-picked list.
> - The `Year Level Progression` events it writes render incorrectly in the Lifecycle timeline (§4).
> - The two progression models — this calendar-based one and `fn_evaluate_student_year_level`'s curriculum-completion one (§3) — can produce different answers, and nothing reconciles them.
> - The explicit `GRANT EXECUTE` for `fn_run_batch_progression` is absent from the file that defines it (only `fn_preview_batch_progression` is granted).

---

## 7. Grade Release

**Route** `/registrar/grade-release` — schedule or trigger when each grading period's grades become visible to students.

| Action | RPC |
|---|---|
| Load board | `fn_list_grade_release_schedule` (`p_term_id`) |
| Set / clear schedule | `fn_set_grading_period_release_at` (`p_release_at`, null clears) |
| Release immediately | `fn_release_grading_period_now` |

A card grid, one card per grading period, showing `{released_count}/{total_grades} grades released` and a status label resolved in precedence order:

1. `total_grades === 0` → "No grades submitted yet"
2. fully released → "Fully released"
3. no schedule → "No release scheduled"
4. `release_at > now` → `"Releases {date · time}"`
5. otherwise → `"Releasing — {blocked_count} awaiting evaluation"`

When `blocked_count > 0`, a warning row reads *"{n} student(s) have not submitted their evaluation"*.

Buttons: **Schedule / Edit Schedule** and **Release Now** (disabled when fully released or there are no grades). The schedule modal offers a **Remove Schedule** action, explaining *"Removing the schedule stops any further automatic release. Grades already released stay visible."*

### The release state machine

`fn_release_grading_period_grades(gp)` loops `section_final_grades` with `status IN ('Draft','Approved')`:

1. `Draft` → promote to `Approved` (recording `approved_by`, `approved_at`)
2. Then, **only if `fn_check_evaluation_completion(enrollment, gp)` is true** → `status='Released'`, `released_at=now()`, and set `enrollments.is_grade_visible = true`

```
Draft ──→ Approved ──[student submitted faculty evaluation]──→ Released
```

A blocked student stays at `Approved` until they submit their evaluation, at which point `fn_submit_evaluation` calls `fn_release_grades_after_evaluation` and flips their visibility. **This is the evaluation gate**, and it is the mechanism that makes course evaluations actually get filled in.

### The scheduled sweep

`fn_sweep_scheduled_grade_releases()` iterates every grading period whose `release_at` has passed and runs the engine. It is **scheduled via `pg_cron` every 15 minutes** — `cron.schedule('grade-release-sweep', '*/15 * * * *', …)`. Because the engine is idempotent, a period keeps re-sweeping and picks up late evaluators on subsequent runs.

**This is the only cron job in the entire system.**

> **Gaps**
> - 🟠 **`fn_set_grading_period_release_at` and `fn_release_grading_period_now` allow Registrar *only*** — via an explicit inline `user_roles ⋈ roles WHERE code='Registrar'` check, not `fn_assert_role`. **An Admin cannot operate this screen**, inconsistent with every other registrar function which accepts `('Registrar','Admin')`. If the registrar account is unavailable, grade release is blocked entirely.
> - 🟠 **`fn_list_grade_release_schedule` has no role assertion at all** — any authenticated caller with EXECUTE can read the board.
> - 🟠 **Performance:** `blocked_count` is computed by calling `fn_check_evaluation_completion` **per grade row inside a lateral aggregate** — O(grades) plpgsql calls per period, per page load. This will degrade badly at real enrolment volumes.
> - The `'Submitted'` status hole from §2 — those grades are permanently unreleasable through this UI.
> - The board **auto-selects `termOptions[0]`**, not the active term.
> - The status display assumes the sweep has already fired: a period whose `release_at` just passed shows *"Releasing — N awaiting evaluation"* for up to **15 minutes** before anything actually happens.
> - **Release is all-or-nothing per grading period.** There is no per-section or per-student control. A per-section function (`fn_approve_and_release_grades`) exists but is not called from any registrar page.

---

## 8. Registrar gaps summary

| # | Gap | Impact |
|---|---|---|
| 1 | **`'Submitted'` grades counted as pending but unreachable by the release engine** | 🔴 Advertised work that cannot be done |
| 2 | **Batch progression is not transactional and gives no partial report on failure** | 🔴 Unknown state after a mid-run error |
| 3 | **Admin is locked out of grade release** (Registrar-only inline check) | 🟠 Single point of operational failure |
| 4 | **`fn_list_grade_release_schedule` has no role guard** | 🟠 Any authenticated user can read it |
| 5 | **`blocked_count` is O(grades) plpgsql calls per page load** | 🟠 Will not scale |
| 6 | **Drop reason hardcoded to empty** | 🟠 Audit-trail hole in the records role |
| 7 | **`fn_drop_enrollment` has no internal role check** | 🟠 |
| 8 | **No data export anywhere in the registrar surface** | 🟠 The records role cannot extract records |
| 9 | **`Year Level Progression` events render as `"None → None"`** in the lifecycle timeline | 🟠 Visibly broken on every progressed student |
| 10 | **Two unreconciled year-progression models** (curriculum-completion vs calendar) | 🟠 Can disagree |
| 11 | Per-student batch progression unreachable from the UI | 🟡 |
| 12 | Overrides apply uniformly to a whole enrollment batch | 🟡 |
| 13 | Full sections are selectable and fail only at insert | 🟡 |
| 14 | Grade release board auto-selects the wrong term | 🟡 |
| 15 | Up-to-15-minute lag between "Releasing" display and actual release | 🟡 |
| 16 | Dashboard's release panel discards the `section_id` it has | 🟡 |
| 17 | `Inactive` badge variant differs between two registrar screens | 🟡 |
| 18 | Cross-role page import of `useProgramOptions` from `@pages/dean/` | 🟡 |
| 19 | Dead parallel enrollment path (`fn_create_enrollment`) with weaker rules | ⚪ |
| 20 | `RegistrarLayout` display-name fallback is `'Dean'` | ⚪ |
