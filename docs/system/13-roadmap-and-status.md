# 13 — Roadmap & Status

**Read this chapter first.** It answers the question the rest of the documentation only implies: *what was planned, what actually shipped, what is half-done, and what was never executed.*

Every verdict below is backed by evidence in the repository — a SQL script, a source file, or its absence — not by what a plan document intended.

> **Legend:** ✅ Built · 🟡 Partial / needs verification · ⬜ Planned, not executed · ❌ Rejected

## Contents

- [1. The plan inventory](#1-the-plan-inventory)
- [2. ⚠️ Orphan plans from another project](#2-️-orphan-plans-from-another-project)
- [3. The master roadmap — phase by phase](#3-the-master-roadmap--phase-by-phase)
- [4. The two AI specs and what was actually built](#4-the-two-ai-specs-and-what-was-actually-built)
- [5. QA Findings round 1](#5-qa-findings-round-1)
- [6. The F1 rejection — do not rebuild](#6-the-f1-rejection--do-not-rebuild)
- [7. Silent Failure remediation](#7-silent-failure-remediation)
- [8. Findings round 2](#8-findings-round-2)
- [9. Explicit scope cuts](#9-explicit-scope-cuts)
- [10. Consolidated outstanding work](#10-consolidated-outstanding-work)

**Related chapters:** [14 — Pros & Cons](14-assessment-pros-cons.md) · [12 — Analytics & AI](12-analytics-and-ai.md)

---

## 1. The plan inventory

`docs/plans/` holds **16 files**. Nine concern this project; **seven do not**.

### LMS plans

| File | Subject | Status |
|---|---|---|
| `based-on-the-current-proud-ember.md` | **The master waterfall roadmap** — Phases 0–8 + capstone | mostly ✅, see §3 |
| `what-s-our-current-status-curried-shamir.md` | AI advisor spec (Gemini) | ✅ built, §4 |
| `so-for-my-lms-generic-river.md` | AI guide-bot spec (Anthropic, tool-calling) | ❌ superseded, §4 |
| `grade-transmutation-table-in-wobbly-codd.md` | Admin grading config: lazy tabs, whole-number transmutation, grid focus | ✅ built |
| `so-there-s-another-issue-splendid-sunbeam.md` | 100% total cap on grading period templates | 🟡 period cap built; **component cap not enforced** |
| `sequential-nibbling-rossum.md` | Special grade uniqueness + field investigation | 🟡 uniqueness built; the field investigation was report-only |

### Tracker documents (not in `docs/plans/`)

| File | Subject |
|---|---|
| `docs/qa-findings-remediation.md` | QA round 1, all five roles — §5 |
| `docs/silent-failure-remediation.md` | The "app knows but never tells" bug class — §7 |

---

## 2. ⚠️ Orphan plans from another project

**Seven files in `docs/plans/` belong to `hris-web`, a payroll/HRIS application — not to this LMS.**

| File | Actual subject |
|---|---|
| `now-i-plan-to-snoopy-puddle.md` | Non-Holiday Pay Rates, Phase 1 |
| `the-payrates-select-should-lexical-crystal.md` | Pay-rate two-tab form |
| `hello-for-my-renderrow-zany-walrus.md` | Premium-rate row de-sync |
| `distributed-forging-quail.md` | Pay-rate update submit |
| `so-for-your-question-lexical-harbor.md` | Pay-rate error focus |
| `replicated-seeking-backus.md` | Pay-rate auto-focus |
| `use-the-domain-modeling-skill-calm-melody.md` | Production-Operations endpoint collapse (Spring Boot) |
| `wobbly-forging-wand.md` | Creating a `CLAUDE.md` — its own Context line says *"This repo (`hris-web`)"* |

They reference `src/pages/system/rate/non-holiday-rate/`, `ProductionOperationsRestController`, and `NonHolidayPayRatePremiumDTO` — none of which exist here.

**Recommendation:** delete them, or move them to `docs/plans/_other-project/`. They are pure noise in a repository someone will read to understand this system's scope, and a thesis reader stumbling on "Non-Holiday Pay Rates" will be confused.

---

## 3. The master roadmap — phase by phase

`docs/plans/based-on-the-current-proud-ember.md` — a locked waterfall design in strict dependency order, committed to a 2-week sprint.

**Overall verdict: the plan was executed to a remarkable degree.** Phases 0 through 6, the analytics centerpiece, the optional Phase 8, and the AI capstone all shipped. The two things that slipped are the two the plan explicitly time-boxed.

### Phase 0 — Foundations

| Item | Status | Evidence |
|---|---|---|
| **0.1** RBAC guard — `fn_current_user_role_codes`, `fn_assert_role`, revoke from `anon` | ✅ | `rbac-guard.sql`; definer holes fixed in `rbac-fix-definer-holes.sql` |
| **0.2** Academic-computation core — configurable `academic_thresholds`, refactored `fn_get_academic_standing` | ✅ | `academic-thresholds.sql` + admin screen |
| **0.2b** Grading-schema inheritance + governance | 🟡 | `grading-schema-inheritance.sql`. Inheritance ✅, lock ✅, audit ✅, period weights admin-only ✅. **Invariant (a) — components sum to 100% — is displayed but never enforced.** See [11 §3](11-grading-engine.md) |
| **0.3** Audience-resolution core | ✅ | `audience-resolution-core.sql` |
| **0.4** Active-role contract | 🟡 | `active-role-contract.sql` defines `fn_assert_active_role` — **which has zero call sites**. The contract exists and is never enforced. See [02 §8](02-auth-and-rbac.md) |
| **0.5** Learning-analytics data foundation | ✅ | `learning-analytics-foundation.sql` — competencies, question tagging, alignments, 9 RLS policies |
| **0.6** UI navigation foundation — `EntityFormPage` + migrate 13 modal screens | 🟡 | `EntityFormPage` exists and is used by **announcements and events only**. **The 13-screen migration did not happen.** Every management screen still uses modal detail |

### Phase 1 — Communication

| Item | Status |
|---|---|
| Announcements, incl. multi-section posting | ✅ |
| Notifications UI (bell) | ✅ |
| Events / calendar | ✅ |
| Discussion / Q&A | 🟡 built, but **hardcoded to 50 threads with no pagination or search** |

### Phase 2 — Content & assessment completion

| Item | Status |
|---|---|
| Content delivery (modules, materials, completions) | ✅ `content.sql` |
| Assignment submissions — file upload / essay | ✅ `assessment-file-answers.sql` |
| Student results review | ✅ `student-assessment-result.sql` — with correct server-side answer-key withholding |
| **2.x** Duplicate assessment to sections | ✅ `fn_duplicate_assessment_to_sections` |
| **2.y** Duplicate modules to sections | ✅ `content-duplication.sql` |
| Question-bank bulk import | ✅ `question-bulk-import.sql` |

### Phase 3 — Records & academic

| Item | Status |
|---|---|
| Curriculum progress / degree audit + printable unofficial checklist | ✅ |
| Registrar official TOR / grade report | ✅ — `is_official` toggles the heading |
| Student lifecycle (shift / LOA / status) | ✅ `records-academic.sql` |

### Phase 4 — Learning Analytics engine (the centerpiece)

| Item | Status |
|---|---|
| Per-student: strengths/weaknesses, GWA trend, honours & scholarship trajectory, engagement, at-risk flag | ✅ |
| Per-section: at-risk list, mastery gaps, score distribution, item analysis, cohort trends | ✅ |
| Student and faculty insight surfaces | ✅ |

`learning-analytics.sql` is 1,429 lines. **The centerpiece was protected as the plan required, and it landed in full.**

### Phase 5 — Accounts & admin depth

| Item | Status |
|---|---|
| Profile + change password (all roles) | ✅ |
| Multi-role assignment | ✅ `fn_update_user(… p_role_codes text[])` |
| Admin audit-log viewer | ✅ — but **no export** |
| Dean faculty load & schedule conflicts | ✅ — but **conflict failures are silent** |
| Section-setup rollover | ✅ `fn_copy_section_setup_to_sections` |

### Phase 6 — Dashboards

All five role dashboards ✅ (`dashboards.sql`). The cosmetic cleanup the phase called for was done via QA U4/U9 — with the exception that **three role→path derivations still coexist**, and the `'Dean'` display-name fallback survives in three layouts.

### Phase 7 — Security retrofit ⚠️

| Item | Status |
|---|---|
| `fn_assert_role` across ~200 existing RPCs | 🟡 **~47 done of ~200** |
| Tighten role-aware RLS on bypassed tables | 🟡 **~14 tables of ~55** |

**The plan explicitly time-boxed this phase** — "cap it; guard all NEW RPCs from creation, fix the two known definer holes now, retrofit the remaining ~198 only if hours remain." That is exactly what happened: the holes were fixed, new RPCs are born guarded, and roughly a quarter of the legacy surface was retrofitted.

So this is **a documented, deliberate partial** rather than a failure. But it must be stated honestly, because "the system has RBAC" and "roughly a quarter of the legacy RPCs were retrofitted" are different claims — and the drift problem in [03 §7](03-data-model.md) means even the 47 cannot be assumed live without verification.

### Phase 8 — Rubrics (optional)

✅ **Built** — `rubrics.sql`, full CRUD, attach, rubric grading, copy-to-sections, 7 RLS policies. The "only if time holds" item shipped.

### Capstone — AI advisor

✅ **Built.** See §4.

---

## 4. The two AI specs and what was actually built

Two competing specifications exist. **Only one was implemented, and it is important not to confuse them.**

| | `so-for-my-lms-generic-river.md` | `what-s-our-current-status-curried-shamir.md` | **What shipped** |
|---|---|---|---|
| Provider | Anthropic Claude | Google Gemini Flash | **Gemini Flash** |
| Audience | Students only, hard stop | Two-sided + all-role how-to | **Two-sided + how-to** |
| Mechanism | Tool-calling loop over 6 read RPCs | One grounding RPC | **One grounding RPC** |
| Transport | SSE streaming | Request/response | **Request/response** |
| Primary purpose | Navigation guidance | Analytics-grounded advising | **Advising** |
| Prompt caching | Discussed at length | Not a factor | n/a |
| **Evaluation set (~40 questions + adversarial refusals)** | ⬜ specified | not specified | ⬜ **not built** |
| Phase 2 pgvector RAG over materials | ⬜ specified | ⬜ optional | ⬜ **not built** |

**`generic-river.md` was superseded.** Do not read it as a description of the system — its tool registry, its model choice, and its student-only scope all describe a design that was not taken.

**Two things from it remain valuable, though:**

1. Its **Phase 0** identified the `fn_list_grade_sheet` / `fn_list_section_students` definer holes as a live cross-student grade leak, independent of the chatbot. That finding was acted on (`rbac-fix-definer-holes.sql`) and is one of the strongest results in the project. Its own note stands: *"I found and fixed a cross-student grade leak while threat-modeling the assistant"* is a better slide than the chatbot itself.

2. Its **evaluation chapter** — ~40 questions with known-correct answers spanning navigation, single-tool lookups, multi-tool aggregation, and an **adversarial refusal set**, reporting tool-selection accuracy, answer correctness, and refusal rate. **This was never built for either design**, and it remains the single largest thesis gap. See [14 §A](14-assessment-pros-cons.md).

From `curried-shamir.md`, one optional item was also not built: **persistent chat history** (`assistant_conversations` / `assistant_messages`), explicitly deferred as "not v1."

---

## 5. QA Findings round 1

Source: `Findings.pdf`, tracked in `docs/qa-findings-remediation.md`. A five-role QA pass, executed in six phases.

### Two systemic root causes identified

1. **The wrapper logged users out on any HTTP 403.** The Phase-7 retrofit made ~47 RPCs raise `42501`, which PostgREST returns as 403 — so *normal authorization errors silently signed users out.* Fixed in Phase 1a by distinguishing a 403 carrying a 5-character SQLSTATE from a genuine auth failure. **This is the single most important fix in the tracker**, and a nice illustration of a security change breaking an unrelated layer.
2. **The live DB drifts from `docs/sql`.** See [03 §7](03-data-model.md).

### Status table

| ID | Item | Status |
|---|---|---|
| S1 | Wrapper: stop logout on business 403s | ✅ |
| B1 | Student schedule colour `ON CONFLICT` fix | ✅ applied |
| B2 | `fn_start_assessment_timer` column names | ✅ applied |
| B3 | Create `fn_get_admin_dashboard_stats` (**did not exist at all**) | ✅ applied |
| B4 | Announcement/event empty-UUID guard | ✅ |
| B5 | Apply multi-role `fn_update_user` | ✅ applied |
| B6 | Resolve `fn_create_term` param conflict | ✅ applied |
| B7 | Align attendance read/write access model | ✅ applied |
| B8 | Assessment builder grading-component id | ✅ |
| — | Assessment builder schedule reset, date relabel, grading message | ✅ |
| U1–U9 | Shared UI/UX (tooltips, sort arrows, stat cards, back button, settings dedupe, password toggle, zoom, year filter) | ✅ |
| U4 | "Dean Panel" label on wrong role | ✅ |
| R3 | Settings 403 on role switch | ✅ |
| **R1** | **School year create fails / doesn't display** | 🟡 **frontend fixed + SQL applied — needs runtime repro to close** |
| **R2** | **Program level edit won't save** | 🟡 **same** |
| **F4** | **Arellano hymn & core values** | 🟡 **built; text unverified** |
| F3 | Admin reset password | ✅ |
| — | Grades empty-state copy | ✅ |
| **F1** | **Separate lab & lec** | ❌ **rejected and reverted — see §6** |
| F2 | Batch year/sem progression + auto-enroll | ✅ applied; needs a smoke test |
| **U10** | **Dashboard hover-preview / grade summary tiles** | ❌ **never built** — only the click-through half (U5) landed |

### R1 / R2 — why they are still open

Neither symptom reproduced from a static read. A second pass removed three **structural** defects that could produce exactly those symptoms, and they are worth knowing because the same patterns exist elsewhere:

1. **View and edit shared one `useForm`.** `TableModals` mounts the update modal before the view modal, so the view instance's `useController` registered **last** and overwrote the shared field entries — **stripping the `required` rules** and re-pointing `_f.ref` at inputs that unmount when the view dialog closes. Both screens now own separate form instances.
2. **`handleSwitchToEdit` never set `selectedId`**, and `handleUpdateSubmit` opened with `if (!selectedId) return;` — **a silent no-op that looks exactly like a dead Save button.**
3. School-year code auto-fill **clobbered manual edits** and collided with the unique index.

> ⚠️ **Defect pattern 1 still exists on other screens** — notably Term Management, whose view modal reuses `updateMethods`.

### F4 — verify before submission

- **Vision and mission** — ✅ confirmed verbatim from `arellano.edu.ph/about/vision-and-mission/`
- **The hymn lyrics** — 🟡 sourced from **search snippets and student-upload sites**, not a clean read of the official page. Check punctuation and the `nami't` / `mo'y` contractions against `arellano.edu.ph/about/arellano-hymn/`
- **The six core values** (Competence, Humility, Integrity, Equity, Fortitude, Stewardship) — 🟡 appear only in **secondary sources**. The official `about/philosophy/` page publishes a philosophy statement plus four objectives instead. **Confirm which framing JAS uses.** Values render as labels only; no descriptions were found and none were invented
- **No seal or logo asset** — none supplied, none taken from the web

All of this is displayed on the student dashboard. **Misquoting the institution's own hymn in a thesis defended at that institution is an avoidable embarrassment.**

---

## 6. The F1 rejection — do not rebuild

**F1 ("separate lab & lec") was built, then deleted on 2026-07-27.** Read this before proposing any lecture/lab schema work.

### The requirement was already satisfied

`courses.is_split` is **not a column** — it is a create-time flag on `fn_create_course`. With `p_is_split = true` the RPC writes **two `courses` rows**, `<CODE>_LEC` and `<CODE>_LAB`, each with its own units. They are thereafter two ordinary independent courses: separate curriculum entries, sections, enrollments, final grades, and transcript lines. That is exactly the "enrolled separately, printed as separate report-card lines" requirement, with no additional schema.

### Why the `delivery_mode` model was wrong

F1 introduced a **second, parallel** model — one `courses` row plus `sections.delivery_mode`, with `fn_student_course_attempts()` re-merging components for the audit. Since F1 never redefined `fn_create_course`, applying it would have left **both models live at once**.

The fatal flaw: the merge grouped by `(term_id, course_id)`, so it only reconstructed a course correctly when both components sat in the **same term**. `fn_get_curriculum_audit` then took `DISTINCT ON (course_id)` — one attempt per course, preferring a passing one — and credited the course's full `total_units`.

**Consequence:** a student who passes the lecture in one term and takes the lab in a later term gets the **whole course credited from the lecture alone**, and the outstanding lab requirement **vanishes from the audit**.

This was hit in real life — transferring in with a 2-unit course against AU's 3-unit lec/lab split, needing to enrol in the lab alone to close the deficiency. Component-only enrolment is a **recurring flow** (transfer credit, unit deficiency, single-component retake), not an edge case. The two-course model has no such failure.

### Surviving gaps in the two-course model

- ~~**`is_split` has no backing column**, so `fn_get_course_by_id` cannot return it — the edit form reads `undefined`~~ — ✅ **fixed in the frontend, no schema change.** The form now derives `is_split: Number(laboratory_units) > 0` on load. A course with lab units *is* a split course, so the derivation is exact
- **Nothing records that `_LEC` and `_LAB` came from the same parent.** Pairing is by code convention only
- **No auto-pairing at enrolment.** If that becomes tedious, the increment is a shared `section_group_id` driving **defaults only** — never mandatory co-enrolment, which would break the component-only flow above
- Separately: ~~**`updateCourse` wipes laboratory units** on every edit~~ — ✅ **fixed.** It sent `p_laboratory_units: null` hardcoded; it now sends the real value, matching `createCourse`. See [05 §7](05-role-dean.md)

---

## 7. Silent Failure remediation

`docs/silent-failure-remediation.md`. Origin: QA set a 5-character password on `/set-password`, got a red border and **no message**.

**Three combining root causes:** `hasHelper` defaulted to `false` in every `ValidCommon*` wrapper, so a form that forgot the prop rendered a red border with no text; `no-console` is enforced and the standards bless silent returns, so a swallowed failure leaves no devtools trace either; and disabled state carries its reason implicitly.

**The rule adopted:** *every path that can fail, or that blocks the user, must render a reason — styling alone is not a message.*

| ID | Item | Status |
|---|---|---|
| SF1 | Inline validation messages never rendered | ✅ `hasHelper` now defaults to `true` — **~50 forms fixed at once** |
| SF1b | `text-area` / `checkbox` had **no** error surface at all | ✅ |
| SF2 | Disabled controls with no stated reason | ✅ 5 controls, **4 of them faculty screens** |
| SF3 | CSV bulk import silently mangled data | ✅ **14 parser cases pass — not runtime-tested against a live upload** |
| **SF4** | `formErrors` lost the `window.alert` `CLAUDE.md` still documents | ✅ option (a) chosen — `FormErrorSummary` wired into `CommonForm` (**~42 forms**) plus 7 hand-rolled forms |
| **SF5** | Errors on inactive tabs/steps are invisible | ✅ repro **ruled out** — tab boundary = form boundary; `CommonStepper` does not exist |
| **SF6** | `{ silent: true }` reads fail as "empty data" | ✅ `silent` split into `background` + `silent`; feeds report inline |
| **SF7** | Write RPCs returning no `{success, message}` confirm nothing | ✅ 98 audited, 6 correct-as-is, 1 real defect fixed (SQL awaiting apply) |
| **SF8** | Flows bypassing the service wrapper entirely | ✅ new `callStorage` wrapper; `refreshSession` now logs out on failure |

### SF3 is worth calling out

The CSV parser had four defects, one of them delicious: **`downloadTemplate` did not escape its own output.** The user-management Role hint is literally `Admin, Faculty, Student, Registrar, Dean` — so **the template the app generated could not be parsed by the app.** All four are fixed (`line.split(',')` replaced by an RFC-4180 state machine, case-insensitive header matching with blocking/warning distinction, hint-row detection, named reader error handlers).

### The five open items, with what this review adds

- **SF4** — ✅ **resolved.** The user chose the inline form-level summary. `checkForMessage` now returns a full `list` of errors; the new `FormErrorSummary` renders them after a failed submit and is injected by `CommonForm` for ~42 forms, with 7 hand-rolled forms wired manually. `CLAUDE.md` §4 now documents the summary as mandatory. See [silent-failure-remediation.md](../silent-failure-remediation.md) SF4.
- **SF5** — ✅ **ruled out, not fixed** — there was nothing to fix. Every named file (`SectionDetailPage`, `StudentRecordsPage`, profile, grading-config) puts an independent form behind each tab, each with its own submit button, so a form's fields are never hidden from its own submit. The profile page uses two separate `useForm` instances. The "steps" half is moot: **`CommonStepper` does not exist** — there is no `src/components/stepper/`, only an orphaned `stepper.type.ts`, and CLAUDE.md §4 lists a component path that points at nothing. The one genuine variant, conditionally-rendered validated fields, was already handled by `shouldUnregister: true` in `EnrollmentWorkspaceModal`.
- **SF6** — ✅ **the filed premise was wrong.** `{ silent: true }` never suppressed the toast in `callRpc`/`callFunction` — `notify()` was unconditional there; it only suppressed the loading overlay. `callQuery`/`callSingle` *did* gate the toast. One flag, two meanings. The live damage ran the *other* way: the 60s notification poll and the per-blur exam proctor event **toasted on every failure**. Now split into `background` (no overlay) and `silent` (no toast, implies background), honoured identically by all four wrappers, with every call site re-declared by intent. The dashboard feeds additionally gained a real inline error state, replacing the "No announcements right now." that a failed fetch used to render.
- **SF7** — ✅ **98 write RPCs audited** by parsing balanced `jsonb_build_object` blocks for `'success', true` without `'message'`. 8 hits, 6 correct as-is (telemetry, per-click toggles, and a bulk import that already renders structured errors). The one real defect was the confirmed instance: **`fn_calculate_all_grades_for_period`**. Fixed in `docs/sql/sf7-grade-calculation-feedback.sql` (**awaiting apply**) — adds a `message` and enriches `failures[]` with student names — plus a frontend panel that lists the failed students, which works before the SQL lands. See [11 §5](11-grading-engine.md). **22 further write RPCs are absent from `docs/sql/` entirely and could not be audited from the repo.**
- **SF8** — ✅ **fixed, and a fourth bypass found.** `ProtectedLayout` now logs out and states the reason instead of silently keeping a dead session after "Stay logged in". A new `callStorage` wrapper gives every storage path the same loading/toast/401 contract as `callRpc`, covering `storage.service` plus the three services that inlined their own `supabase.storage` calls. The extra find: `getAttachmentSignedUrl` returned a bare `''` on error and both callers did `if (!url) return`, making Download a permanent silent no-op.
- **`AssessmentAttachmentPanel.tsx`** — ✅ **now mounted.** The tracker listed it as an audit target without noticing it **had no importer at all**, so faculty could not attach files to an assessment. `AssessmentBuilderPage` now renders it, sourcing attachments from `listAssessments` (the only RPC that returns them) so no new SQL is needed.

> **One documentation correction:** the tracker states that `callQuery` / `callSingle` return errors with no toast at all. Reading the current wrapper, **they do notify when `!isSilent`.** The doc is stale on this point. Moot in practice — neither has any call site.

---

## 8. Findings round 2

Evidenced by `docs/sql/findings-2-remediation.sql` and the commit `a3640a9 fix: fix findings 2`. The source document is `Findings 2.docx`, which is **untracked in git** — it sits in the working tree unversioned.

Confirmed from the SQL: `fn_list_my_section_colors` was among the fixes.

> **There is no round-2 tracker markdown.** Rounds 1 and the silent-failure workstream each got a resumable status document; round 2 did not. Its scope, its full item list, and its completion state are **not recoverable from the repository** — only from a Word document that isn't committed.
>
> **Recommendation:** commit `Findings 2.docx`, and write a `docs/findings-2-remediation.md` tracker matching the other two. Otherwise this round's outcomes are lost the moment that file is.

---

## 9. Explicit scope cuts

| Cut | Status |
|---|---|
| **Clearances** | Cut in the master plan. **But `student_clearances` and `clearance_requirements` remain as tables, and the admin dashboard still counts `pending_clearances`.** The cut was decided and only partly carried out |
| **Persistent AI chat history** | Deferred as "not v1"; not built |
| **pgvector RAG over course materials** | AI spec Phase 2, "only if Phase 1 lands early"; not built |
| **Configurable role↔RPC permission matrix** | Deliberately rejected in Phase 0.1 — RBAC is static and code-level by design. **But the sidebar still labels the roles screen "Permissions"** ([04 §7](04-role-admin.md)) |

---

## 10. Consolidated outstanding work

Everything the project intended and did not finish, in one place.

### From the master roadmap

| Item | Effort |
|---|---|
| ⬜ Phase 7 — retrofit the remaining ~150 RPCs with `fn_assert_role` | Large |
| ⬜ Phase 7 — RLS on the ~40 tables without policies | Large |
| 🟡 0.4 — actually call `fn_assert_active_role` somewhere | Small |
| 🟡 0.2b — enforce the component 100% invariant on submit | Small |
| 🟡 0.6 — migrate the 13 modal-detail screens into `EntityFormPage` | Medium, mechanical |
| ⬜ Bulk CSV import for school years, terms, departments, program levels, course prerequisites | Medium |

### From QA round 1

| Item | Effort |
|---|---|
| 🟡 R1 / R2 — runtime repro to close, or confirm fixed | Small |
| 🟡 **F4 — verify the hymn text and core values against official sources** | Small — **do this before submission** |
| ⬜ U10 — dashboard hover-preview / grade summary tiles | Small |
| 🟡 F2 — smoke-test batch progression against live data | Small |

### From the silent-failure workstream

| Item | Effort |
|---|---|
| ✅ SF4 — form-error summary implemented (`FormErrorSummary`) | Done |
| ✅ SF5 — repro ruled out; no change needed | Done |
| ✅ SF6 — `background` vs `silent` split; dashboard feeds report inline | Done |
| ✅ SF7 — 98 write RPCs audited; grade-calculation defect fixed | Done (SQL awaiting apply) |
| ✅ SF8 — `callStorage` wrapper; `refreshSession` logs out on failure | Done |

### From the AI capstone spec

| Item | Effort |
|---|---|
| ⬜ **Build the ~40-question evaluation set with an adversarial refusal subset, and report tool-selection accuracy, answer correctness, and refusal rate** | Medium — **the highest-value remaining thesis work** |
| ⬜ Persistent chat history | Small |
| ⬜ pgvector RAG over course materials | Large |

### Found by this review, not in any tracker

These are documented in the role and engine chapters and appear in no plan:

| Item | Severity |
|---|---|
| 🔴 Service-role key inlined into the client bundle | Critical |
| 🔴 No assessment attempt resume — a refresh locks the student out | Critical |
| 🔴 Timer auto-submit strands the submission `In Progress` forever | Critical |
| 🔴 `server_expires_at` written nowhere; expiry sweep not scheduled | Critical |
| 🔴 Scheduled-publish assessments start then dead-end on "Access denied." | Critical |
| 🔴 Rubric points vs `total_points` never reconciled | Critical |
| 🔴 Special grades configurable but never assignable | High |
| 🔴 School year bulk delete silently deletes only the first row | High |
| 🔴 `updateCourse` wipes laboratory units | High |
| 🔴 Schedule-conflict failures look identical to "no conflicts" | High |
| 🔴 `'Submitted'` grades are permanently unreleasable | High |
| 🔴 Batch progression not transactional, no partial report | High |
| 🔴 Evaluation `Multiple Choice` has no options editor | High |
| 🔴 Discussion capped at 50 threads with pagination and search discarded | High |

Full detail and the complete list in each chapter's gaps table, prioritised in [14 §B](14-assessment-pros-cons.md).
