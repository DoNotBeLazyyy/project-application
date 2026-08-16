# 07 — Faculty Role

**Responsibility boundary:** instruction within assigned sections — attendance, grading, assessments, content, and discussion. Faculty cannot create sections, enroll students, or touch another instructor's section.

Faculty is the **deepest role in the system**. A single page, `SectionDetailPage`, carries eight tabs, and two of those tabs open onto full sub-applications (the assessment builder and the grading engine).

## Contents

- [1. Routes and navigation](#1-routes-and-navigation)
- [2. Dashboard](#2-dashboard)
- [3. My Sections (list)](#3-my-sections-list)
- [4. Section Detail — the eight tabs](#4-section-detail--the-eight-tabs)
  - [4.1 Students (roster)](#41-tab-1--students-roster)
  - [4.2 Attendance](#42-tab-2--attendance)
  - [4.3 Grading](#43-tab-3--grading)
  - [4.4 Assessments](#44-tab-4--assessments)
  - [4.5 Rubrics](#45-tab-5--rubrics)
  - [4.6 Content](#46-tab-6--content-modules--materials)
  - [4.7 Discussion](#47-tab-7--discussion)
  - [4.8 Insight](#48-tab-8--insight)
- [5. Assessment Builder](#5-assessment-builder)
- [6. Submissions & grading](#6-submissions--grading)
- [7. Item Analysis](#7-item-analysis)
- [8. Rubric Builder](#8-rubric-builder)
- [9. Service → RPC inventory](#9-service--rpc-inventory)
- [10. Faculty gaps summary](#10-faculty-gaps-summary)

**Related chapters:** [10 — Assessment Engine](10-assessment-engine.md) · [11 — Grading Engine](11-grading-engine.md) · [12 — Analytics & AI](12-analytics-and-ai.md) · [09 — Shared Features](09-shared-features.md)

---

## 1. Routes and navigation

All routes are children of `<FacultyLayout />` at `faculty`, mounted under `<RoleGate allowedRoles={['Faculty']} />`.

| Route | Page file |
|---|---|
| `/faculty` | [FacultyDashboard.tsx](../../src/pages/faculty/FacultyDashboard.tsx) |
| `/faculty/sections` | [sections/index.tsx](../../src/pages/faculty/sections/index.tsx) |
| `/faculty/sections/:sectionId` | [SectionDetailPage.tsx](../../src/pages/faculty/sections/SectionDetailPage.tsx) |
| `/faculty/sections/:sectionId/assessments/:assessmentId/builder` | [AssessmentBuilderPage.tsx](../../src/pages/faculty/sections/assessments/builder/AssessmentBuilderPage.tsx) |
| `/faculty/sections/:sectionId/assessments/:assessmentId/submissions` | [SubmissionsPage.tsx](../../src/pages/faculty/sections/assessments/submissions/SubmissionsPage.tsx) |
| `/faculty/sections/:sectionId/assessments/:assessmentId/analysis` | [ItemAnalysisPage.tsx](../../src/pages/faculty/sections/assessments/analysis/ItemAnalysisPage.tsx) |
| `/faculty/sections/:sectionId/rubrics/:rubricId` | [RubricBuilderPage.tsx](../../src/pages/faculty/sections/rubrics/RubricBuilderPage.tsx) |
| `/faculty/profile` | shared profile page |
| `/faculty/announcement-management` `/new` `/:id` | shared — see [09](09-shared-features.md) |
| `/faculty/event-management` `/new` `/:id` | shared — see [09](09-shared-features.md) |

`assessmentId` and `rubricId` accept the literal sentinel **`'new'`** (`isNew = assessmentId === 'new'`). There is no separate create route.

### Sidebar

Defined inline in `FacultyLayout.tsx`, section label `OVERVIEW`:

| Label | Target |
|---|---|
| Dashboard | `/faculty` |
| Sections | `/faculty/sections` |
| Announcements | `/faculty/announcement-management` |
| Events | `/faculty/event-management` |

Footer: "My Profile". Navbar: `NotificationBell`, display name, Sign Out. Role switcher renders only when the user holds more than one role.

> **Gaps**
> - Dashboard and Sections use the **same icon** (`SquaresFourIcon`) — copy-paste duplication.
> - `FacultyLayout.tsx:80` — the `displayName` fallback string is `'Dean'`, residue from `DeanLayout`.

---

## 2. Dashboard

**Route** `/faculty` · **RPC** `fn_get_faculty_dashboard` via `getFacultyDashboard()` in `dashboard.service.ts`, called with `{ p_term_id: null }` — **there is no term picker in the UI**; the RPC resolves the active term itself. Feeds come from `useDashboardFeeds()`.

**Six stat cards**, all navigating to `/faculty/sections`: `my_sections`, `total_students`, `pending_grading`, `at_risk_students`, `published_assessments`, `sessions_today`.

**Four feed cards:**

| Card | Content | Click target |
|---|---|---|
| Today's Classes | `course_code · section_code`, title, room, `time_start`–`time_end` trimmed to `HH:MM` | `/faculty/sections/{section_id}` |
| Pending Grading | title, `course_code · section_code · assessment_type`, `{n} ungraded` | `.../assessments/{id}/submissions` |
| My Sections | enrolled count, `Avg {x}%`, `{n} at risk` in error colour | section detail |
| Insight Highlights | at-risk students with name, `Avg x% · Att y%`, risk badge (`Low`→success, `Moderate`→warning, `High`→error) | **not clickable** — rendered as a `<div>`, unlike the other three |

Then the shared `AnnouncementsFeedCard` and `EventsFeedCard`.

**Business rules** (`docs/sql/dashboards.sql`): guard `fn_assert_role('Faculty', 'Admin')`. `at_risk_students` count is `COUNT(*) FILTER (WHERE r.is_at_risk)`; the list is ordered by `risk_score DESC`. The at-risk threshold is **risk score ≥ 30**.

> **Gaps** The Insight Highlights card is the only non-navigable feed card — an inconsistency, since the at-risk students it names are exactly the ones a faculty member would want to click through to.

---

## 3. My Sections (list)

**Route** `/faculty/sections` · **RPC** `fn_list_my_sections` via `listMySections(page, size, search, sort)`.

Rendered through `CommonTableCard`. Row click → section detail.

| Column | Sortable |
|---|---|
| `section_code` | ✅ |
| `course_code` | ✅ |
| `course_title` | ✅ |
| `term_label` | ✅ |
| Enrolled — formatted `"{enrolled} / {max_slots}"` | ❌ |
| Status badge | ❌ |

Status variants: `Open`→success, `Full`→warning, `Ongoing`→info, `Closed`→error, `Cancelled`→error.

**No create, edit, or delete** — section management belongs to the Dean.

---

## 4. Section Detail — the eight tabs

**Route** `/faculty/sections/:sectionId` · Header loaded from `fn_get_section_detail` (`section_code`, `course_code`, `course_title`, `term_label`, `room`).

**Tab state lives in the URL query string** — `?tab=<value>`, written with `setSearchParams({ tab }, { replace: true })`. An invalid or absent tab falls back to `students`. This is why the assessment and rubric builders' Back buttons can return you to the correct tab.

All eight tabs are **mounted and unmounted** conditionally, so each one refetches on every tab switch. There is no caching.

| # | Tab | Component | Owner chapter |
|---|---|---|---|
| 1 | Students | `StudentsTab` | this chapter |
| 2 | Attendance | `AttendanceTab` | this chapter |
| 3 | Grading | `GradingTab` | [11](11-grading-engine.md) |
| 4 | Assessments | `AssessmentsTab` | [10](10-assessment-engine.md) |
| 5 | Rubrics | `RubricsTab` | [10](10-assessment-engine.md) |
| 6 | Content | `SectionContentPanel` (shared) | this chapter |
| 7 | Discussion | `SectionDiscussionPanel` (shared) | [09](09-shared-features.md) |
| 8 | Insight | `SectionInsightPanel` (shared) | [12](12-analytics-and-ai.md) |

There is **no announcements tab inside a section** — announcements are a top-level sidebar item using a `Section` audience.

---

### 4.1 Tab 1 — Students (roster)

**File** `StudentsTab.tsx` · **RPC** `fn_list_section_students`

Card titled "Roster". Columns: `student_number`, `full_name`, `email`, `year_level` (all sortable), `status`, `enrolled_at` (sortable). Unique key is `enrollment_id`.

**The only action is row click**, which opens `StudentEvaluationModal`.

**Guard** (`docs/sql/rbac-fix-definer-holes.sql`): raises `42501 'Forbidden: you do not have access to this section roster.'` unless the caller is the section's faculty or holds Dean/Registrar/Admin. Search is glued in as a `format(... ILIKE %L ...)` string over `student_number`, `first_name`, `last_name`, `email`; results go through `fn_build_pageable_dto` with default order `last_name, first_name`.

#### StudentEvaluationModal — three inner tabs

Loads `fn_get_section_student_evaluation(p_enrollment_id)`. **If it returns no data the modal auto-closes.** Header shows full name, student number, email, year level, program. Inner tabs reset to `attendance` on open.

**Attendance inner tab** — `fn_get_student_attendance(p_enrollment_id)`. Five stat tiles.

> **Business rule encoded in the client:** attendance rate is computed in TSX as `round(((present + late) / recorded) * 100)`. **Late counts as attended. Excused does not count toward the rate** but is displayed. `recorded === 0` → 0%.

Table columns: Class Day (sortable), Status badge (sortable), Remarks. Row click opens `AttendanceEditModal` — a status select (Present/Absent/Late/Excused) plus free-text remarks → `fn_save_attendance_records`. **This is the only place remarks can be edited.**

**Assessments inner tab** — purely client-side over the already-loaded `data.assessments`. Three cascading `CommonSelect` filters (type, grading period sorted by sequence, submission status), each with an "All" option. Row click → `SubmissionDetailModal` → `fn_get_submission_for_grading` (read-only here) with submission files opened via `getFileUrl('submissions', path)`.

**Grades inner tab** — table over `data.grades`: Grading Period, Weight, Raw, Final, **Transmuted** (falls back to the `special_grade` string when present, else numeric, else `—`), Status. Row click → `GradeBreakdownModal` → `fn_get_student_grade_breakdown(p_enrollment_id, p_grading_period_id)`, rendered as one accordion per component.

---

### 4.2 Tab 2 — Attendance

**Files** `attendance/AttendanceTab.tsx` (container), `AttendanceSessionList.tsx` (left, fixed `w-80`), `AttendanceRecordList.tsx` (right).

| Action | Service fn | RPC | Params |
|---|---|---|---|
| Load sessions | `listAttendanceSessions` | `fn_list_attendance_sessions` | `p_section_id` |
| Select a session | `getAttendanceRecords` | `fn_get_attendance_records` | `p_session_id` |
| New Session | `createAttendanceSession` | `fn_create_attendance_session` | `p_section_id`, `p_session_date`, `p_notes` |
| Delete session (trash icon) | `deleteAttendanceSession` | `fn_delete_attendance_session` | `p_session_id` |
| Save Attendance | `saveAttendanceRecords` | `fn_save_attendance_records` | `p_session_id`, `p_records[]` |

Create form: `session_date` (required) and `notes` (optional textarea). The session-row trash button calls `e.stopPropagation()` so delete doesn't also select the row.

**Only `status` is editable in the record grid** — a per-row `CommonSelect`. Remarks are editable only through the per-student modal in §4.1. Any change sets `isDirty`; "Save Attendance" is disabled while clean, with the caption *"All attendance changes are saved. Change a status to enable saving."* (added by SF2). Deleting the selected session clears the right pane.

**Business rules** (`docs/sql/phase-1-b7-attendance-access.sql`):

- **Reads** use the boolean `fn_can_access_section_staff` and return a **soft** `{success:false, message}` envelope rather than raising. `fn_get_attendance_records` resolves the session's `section_id` first and soft-denies a missing or deleted session — this fixed the "delete succeeded → Forbidden on refetch" bug.
- **Writes are faculty-owner-only** via `fn_is_section_faculty`. Dean/Registrar/Admin can *read* attendance but not write it: *"Only the assigned faculty can record attendance for this section."*
- **One session per date per section**: *"An attendance session already exists for this date."*
- **Create auto-seeds records** — one row per enrollment whose status is not `Dropped`/`Withdrawn`, **defaulted to `Present`**.
- Delete is a soft delete cascading to child records.
- Save loops `jsonb_array_elements`, updating `status` and `remarks = NULLIF(trim(...), '')`, scoped to the session.

> **Gaps**
> - Save performs **no validation beyond the enum cast**, and **unmatched record ids are silently ignored** — no per-row error reporting.
> - The default-to-`Present` seeding means an untouched session records a full house. Convenient, but it means "no data entered" and "everyone present" are indistinguishable.

---

### 4.3 Tab 3 — Grading

**Files** `grading/GradingTab.tsx`, `GradingComponentPanel.tsx` (left, `w-72`), `GradeSheetPanel.tsx` (right).

On mount: `fn_list_grading_periods_by_section`. **The first period auto-selects**; an empty list renders only *"No grading periods found for this section's term."* Periods render as a nested `CommonTabMenu`.

On period change, three calls in `Promise.all`: `fn_list_grading_components`, `fn_list_grade_sheet`, `fn_is_section_grading_locked`.

| Action | Service fn | RPC |
|---|---|---|
| Add component | `createGradingComponent` | `fn_create_grading_component` |
| Edit component | `updateGradingComponent` | `fn_update_grading_component` |
| Delete component | `deleteGradingComponent` | `fn_delete_grading_component` |
| Reset to institutional template | `reseedSectionGrading` | `fn_reseed_section_grading` |
| Calculate Grades | `calculateAllGradesForPeriod` | `fn_calculate_all_grades_for_period` |

Component form: `name` required; `weight` required, min 1, max 100. Total displayed as `Total: {n}%`.

**"Add" is disabled when `locked || totalWeight >= 100`**, with the explanatory line "Components already total 100%." (QA Phase 2). When locked, a banner reads *"Locked: grades have been recorded for this period, so components can no longer be changed."* The reseed button renders **only when `!locked && components.length === 0`**.

Grade sheet is read-only: `student_number`, `full_name`, `raw_grade`, `transmuted_grade`, `status`. One button — "Calculate Grades" — disabled when there are no components.

Full rules for the lock, weights, transmutation, reseeding, and calculation are in **[11 — Grading Engine](11-grading-engine.md)**.

> **Gaps**
> - `fn_calculate_all_grades_for_period` returns `{processed, succeeded, failed, failures[]}` with **no `message` key**, so `callRpc` shows **no success toast at all** — the button appears to do nothing. Worse, the per-student `failures[]` array **is never surfaced**; `handleCalculate` only checks `result.error`. A partial failure is completely invisible.
> - `fn_list_grade_sheet` returns `final_grade` and `special_grade`, but `GradeSheetPanel` **renders neither**.
> - **Faculty have no UI to assign a special grade.** The field is read-only everywhere on the faculty side; only Admin can configure the catalogue, and nothing can apply one to a student.

---

### 4.4 Tab 4 — Assessments

**File** `AssessmentsTab.tsx` · **RPC** `fn_list_assessments(p_section_id)`

Columns: Title (sortable), Type badge, Points, Questions, Submissions, Due, Status (`Published`→success / `Draft`→warning), plus a 250px action cell.

Type variants: Quiz→info, Exam→error, Activity→success, Assignment→warning, Project→info, Lab Report→info.

**Six row actions:**

| # | Action | Target / RPC |
|---|---|---|
| 1 | Builder | `.../assessments/{id}/builder` |
| 2 | Submissions | `.../submissions` |
| 3 | Publish / Unpublish | `fn_publish_assessment` / `fn_unpublish_assessment` |
| 4 | Item analysis | `.../analysis` |
| 5 | Copy to other sections | `fn_duplicate_assessment_to_sections` via `DuplicateToSectionsModal` |
| 6 | Delete | `fn_delete_assessment` |

Header: `{n} assessment(s)` + **New Assessment** → `.../assessments/new/builder`.

**Business rules:**
- `fn_publish_assessment` — ownership is a raw inline `sections.faculty_id = auth.uid()` (owner-only, **not** `fn_assert_section_staff`). Refuses *"Cannot publish an assessment with no questions."* Sets `is_published = true, published_at = now()`.
- `fn_unpublish_assessment` — same check, sets `is_published = false` and leaves `published_at`.
- `DuplicateToSectionsModal` lists targets via `fn_list_my_teaching_sections(p_exclude_section_id)`.

> **Gaps**
> - **Assessment delete has no confirmation modal**, while rubric delete uses `DeletePromptModal`. A misclick destroys an assessment and its questions.
> - **No guard against unpublishing an assessment that already has submissions.** Students mid-attempt lose access with no warning to anyone.

---

### 4.5 Tab 5 — Rubrics

**File** `rubrics/RubricsTab.tsx` · **RPC** `fn_list_rubrics(p_section_id)`

Columns: Title (sortable), Points, Criteria count, **In Use** (`{attached_count} assessment(s)`), action cell.

| Action | RPC |
|---|---|
| Edit | → `/faculty/sections/{sectionId}/rubrics/{id}` |
| Copy to other sections | `fn_copy_rubric_to_sections` — returns `{copied_count}` |
| Delete | `fn_delete_rubric`, behind `DeletePromptModal` |

Header: `{n} rubric(s)` + **New Rubric**.

---

### 4.6 Tab 6 — Content (modules & materials)

**File (shared)** `src/pages/shared/content/SectionContentPanel.tsx` — also used by the student portal. The entire panel is gated by `content.can_manage` returned from the RPC, so one component serves both audiences.

Loads `fn_get_section_content(p_section_id)` → `{ can_manage, modules[] }`, each module carrying `materials[]`, `material_count`, `completed_count`, `is_published`.

**Faculty actions (`can_manage === true`):**

| Action | RPC |
|---|---|
| Add / edit module (inline composer, title + 1000-char description) | `fn_create_module` / `fn_update_module` |
| Publish / unpublish module | `fn_set_module_published` |
| Copy module to other sections | `fn_duplicate_module_to_sections` |
| Delete module | `fn_delete_module` |
| Add material | `fn_create_material` (9 params incl. `p_material_type`, `p_file_url`, `p_external_url`, `p_mime_type`, `p_file_size_bytes`) |
| Edit material | `fn_update_material` |
| Publish / unpublish material | `fn_set_material_published` |
| Delete material | `fn_delete_material` |
| Open a material | `Link` type opens `external_url`; otherwise a signed URL via `getFileUrl('materials', …)` |

Material types: File, Link, Video, Document, Slide, Other. `MaterialFormModal` uploads via `uploadFile({ bucket: 'materials' })` with a `generateId()`-derived path, then calls `fn_create_material`.

**Student-only action:** completion toggle → `fn_mark_material_complete`, called with **`{ silent: true }`**. The per-module `CommonProgressBar` renders only when `!canManage`.

**Backend** (`docs/sql/content.sql`): real RLS on `modules`, `course_materials`, `material_completions` — SELECT `USING (deleted_at IS NULL AND fn_can_access_section(section_id))`, INSERT/UPDATE `WITH CHECK (fn_is_section_faculty(section_id))`. Every write RPC re-checks `fn_is_section_faculty` on top of the policy.

> **Gaps** `fn_mark_material_complete` is silent — a failed progress toggle is invisible to the student, who simply sees the checkbox not stick. This is open item SF6, and it is the least defensible of the silent call sites (unlike the notification poll, this one represents user-owned data).

---

### 4.7 Tab 7 — Discussion

Shared component; full detail in [09 — Shared Features](09-shared-features.md).

Summary: threads listed via `fn_list_section_threads_json`, composer creates via `fn_create_thread`. Thread view supports reply, pin/unpin, resolve/unresolve, mark-post-as-answer, and delete thread/post. **Pinning is faculty-only**; delete/resolve/mark-answer allow the author *or* section faculty.

> **Gaps** The list is **hardcoded to page 1, size 50, with no pagination control and no search box** — threads beyond the 50th are unreachable through the UI.

---

### 4.8 Tab 8 — Insight

Shared component; full detail in [12 — Analytics & AI](12-analytics-and-ai.md).

Summary: `fn_get_section_insight(p_section_id)` renders four stat tiles (Enrolled, At Risk, Cohort Avg Score, Cohort Attendance), a mastery-gaps section whose granularity switches between competency-level and assessment-type-level depending on whether questions are tagged, a hand-rolled score-distribution bar chart, an at-risk student table, and an assessment-performance table. Read-only.

The mastery gap threshold is **below 75%**. The at-risk threshold is **risk score ≥ 30**.

---

## 5. Assessment Builder

**Route** `.../assessments/:assessmentId/builder` · **File** `AssessmentBuilderPage.tsx`

`isNew = assessmentId === 'new'`. `assessmentDbId` starts empty and is set from the create response, after which the page `navigate(..., { replace: true })`s to the real id — so it **transitions from create to edit without remounting**.

**Layout:** back button (→ `?tab=assessments`), title, `<RubricAttachPanel>` (only once `assessmentDbId` exists), then a two-column row — `<AssessmentSettingsForm>` (`w-80`) beside `<QuestionList>` — plus `<BulkImportModal>` and `<QuestionModal>`.

### Grading-component options

The effect depends on `sectionId` **only**. It calls `fn_list_grading_periods_by_section`, then `Promise.all(fn_list_grading_components per period)`, and flattens into options labelled `"{period} — {component} ({weight}%)"`.

This was QA fix **B8**: the previous code passed `assessmentDbId` as `p_grading_period_id`, and since `fn_list_grading_components` filters strictly on that column it always returned `[]`. The root cause is structural — a component belongs to a period, an assessment's component can sit under *any* period, and the builder form has no period field.

### Settings form

Defaults from `src/constants/faculty.constant.ts` `DEFAULT_ASSSESSMENT_VALUES` (**note the typo — three s's** in an exported constant): type `Quiz`, `total_points '100'`, `max_attempts '1'`, `show_all_questions true`.

| Field | Rules |
|---|---|
| `title` | required |
| `assessment_type` | required — Quiz / Exam / Activity / Assignment / Project / Lab Report |
| `description` | textarea |
| `grading_component_id` | **optional** select |
| `total_points` | required, min 1 |
| `passing_points`, `time_limit_minutes`, `max_attempts` | optional numbers |
| `shuffle_questions`, `shuffle_choices`, `show_all_questions` | checkboxes |
| `questions_per_page` | required, min 1 — **only when `show_all_questions` is false** |

Five date-time pickers, each with helper text added in QA Phase 2:

| Field | Helper text | Past-date validation |
|---|---|---|
| Scheduled Publish | "When the assessment auto-publishes to students. A past time publishes it immediately. Leave blank to publish manually." | none |
| Opens At | "When students can start the assessment." | none |
| Due At | "Submission deadline; attempts after this are marked late." | `disablePast` + `validateNotPast` |
| Closes At | "Hard cutoff; no submissions accepted after this time." | same |
| Show Results At | "When students can view their scores and correct answers. Leave blank to release manually." | same |

An **`allow_past_dates` checkbox** overrides the three validated fields, for backdating an assessment that already happened. A `useEffect` re-`trigger()`s those fields when it flips so stale errors clear. On load for edit, the checkbox is pre-ticked if any of the three dates is already in the past.

**Server-side date rules** (`docs/sql/assessment-schedule-dates.sql`): ownership is `sections.faculty_id = auth.uid()`; `opens_at < due_at`; `opens_at < closes_at`; `closes_at >= due_at`; **`scheduled_publish_at <= opens_at`**; `!show_all_questions` requires `questions_per_page >= 1`. Inserts with `is_published = false`.

> **Gaps** `allow_past_dates` is a **client-only field** — never sent to the database, and the database performs no past-date validation of its own. The override is purely a client-side unlock of a client-side rule.

### Question list and modal

Header shows `{n} question(s) · {totalPoints} pts total`, summed client-side from `question.points`.

Both "Import CSV" and "Add Question" are **disabled until the settings are saved**, with the reason "Save the assessment settings first to add or import questions." (SF2).

`QuestionModal` fields: `question_type` (required), `points` (required, min 0.01), `question_text` (required textarea), `explanation`, `is_required`, plus **File Upload-only** fields `allowed_file_types`, `max_file_size_mb`, `max_file_count`.

Seven types: Multiple Choice, True or False, Short Answer, Essay, Fill in the Blank, Matching, File Upload. Only `Multiple Choice`, `True or False`, and `Matching` render the `ChoiceBuilder`.

**Correct-answer semantics:** for `Multiple Choice` the toggle is **multi-select** (flips the clicked one only); for every other choice-based type it is **single-select**. Defaults to two blank choices.

Save → `fn_upsert_question` with `sequence = editingQuestion?.sequence ?? questions.length + 1`.

> **Gaps**
> - **The client-summed question points are never reconciled with the `total_points` settings field.** A 10-question, 50-point assessment can be configured as `total_points = 100`, and `fn_calculate_final_grade` will divide by the settings value.
> - **There is no drag-to-reorder.** Sequence is assigned on create and never editable.

### Bulk import

Template columns: `question_text`, `question_type`, `points`, `is_required`, `explanation`, `choices` (hint: `Paris*|London|Rome — separate with | and mark correct with *`) → `fn_bulk_import_questions`, returning `{provisioned_count, errors:[{row, code, message}]}` mapped to `"Row {n}: {message}"` plus a structured error grid.

### Rubric attach panel

Loads `fn_list_rubrics` + `fn_get_assessment_rubric`. Clearing the rubric forces `useScoring = false`. The "Use rubric to score submissions" toggle is disabled without a rubric, with the reason line "Attach a rubric above to score submissions with it." Save → `fn_set_assessment_rubric(p_assessment_id, p_rubric_id, p_use_scoring)`.

Rules (`docs/sql/rubrics.sql`): guard `fn_assert_section_staff`; `use_scoring` with a null rubric is refused; the rubric must belong to the same section; existing `assessment_item_rubrics` rows are soft-deleted then re-inserted.

### ⚠️ Dead code

**`AssessmentAttachmentPanel.tsx` (140 lines) is never imported anywhere.** Consequently:

- `uploadAssessmentAttachment`, `getAttachmentSignedUrl`, and `deleteAssessmentAttachment` in `assessment.service.ts` are unreachable
- The RPCs `fn_create_assessment_attachment` and `fn_delete_assessment_attachment` have no caller
- **Faculty cannot attach files to an assessment at all today**

The panel also hardcodes `p_sequence: 1` for every upload. Note that `docs/silent-failure-remediation.md` SF8 still lists this file as an outstanding wrapper-bypass to audit — apparently unaware that it is dead.

---

## 6. Submissions & grading

**Route** `.../assessments/:assessmentId/submissions` · **RPC** `fn_list_submissions(p_assessment_id)`

Two-pane: `SubmissionList` (`w-2/5`) beside the grading panel.

List columns: Student No. (sortable), Student Name (sortable), Attempt, Status badge, Score, Submitted At (sortable), Late (Yes/No).

Status variants: `Not Started`→warning, `In Progress`→warning, `Submitted`→info, `Late`→error, `Graded`→success, `Returned`→success.

Selecting a row calls `fn_get_submission_for_grading` and seeds `draftFeedback` and `draftAnswers`. **If `use_rubric_scoring` is true** it additionally calls `fn_get_submission_rubric` and seeds `draftEvaluations`.

**Save dispatches on the mode:**

| Mode | RPC | Returns |
|---|---|---|
| Rubric | `fn_grade_submission_rubric(p_submission_id, p_feedback, p_evaluations)` | `{raw_score}` |
| Per-question | `fn_grade_submission(p_submission_id, p_feedback, p_answers)` | — |

On success the list refetches and the same submission is re-selected.

### AnswerCard

`MANUAL_GRADE_TYPES = ['Essay', 'Short Answer', 'File Upload']`.

- **Auto-graded types** render read-only `✓ Correct` / `✗ Incorrect` and `{points_earned} / {points} pts`.
- **Manual types** render a `points_earned` number input (min 0, max `answer.points`, step 0.01) plus a "Grader Notes" textarea.
- Student answer rendering priority: `answer_text` → `file_attachments[]` (buttons opening a signed URL) → italic "No answer provided".

### RubricGradingPanel

Header shows the rubric title and `Score: {earned} / {rubric.total_points} pts` (client-side reduce). One card per criterion with a number input capped at `max_points` and a per-criterion feedback textarea, plus the shared overall-feedback textarea.

**Rules** (`fn_grade_submission_rubric`): resolves the section via `fn_resolve_submission_section` then `fn_assert_section_staff`. Refuses when no rubric is attached, when a criterion doesn't belong to the attached rubric, or when `points < 0 OR points > max_points`. Upserts `rubric_evaluations`, then sets `raw_score = final_score = SUM(points)`, `status = 'Graded'`, `graded_at`, `graded_by`.

> **Gaps — two of these are significant**
> - **Auto-graded answers cannot be manually overridden.** A faculty member who spots a wrongly-keyed multiple-choice question has no way to correct a student's score from this screen.
> - **Rubric totals and `assessment_items.total_points` are never reconciled.** In rubric mode `raw_score` is denominated in *rubric* points, but `fn_calculate_final_grade` divides component scores by `SUM(assessment_items.total_points)`. If a rubric totals 50 and the assessment is configured at 100, the weighted grade is silently halved. There is no validation tying the two together.
> - The `min`/`max` on the points input are **HTML attributes only** — nothing clamps the value in JavaScript before it is sent. (The server does validate in rubric mode; per-question mode is less clear.)

---

## 7. Item Analysis

**Route** `.../assessments/:assessmentId/analysis` · A 32-line shell wrapping the shared `<ItemAnalysisView>` with a "Back to Assessments" button.

`fn_get_assessment_item_analysis(p_assessment_id)` drives five stat tiles — **Submissions, Mean, Median, High, Std Dev** — then a per-question list showing:

- `CommonChip`s of tagged competency codes
- A difficulty badge: `{difficulty_label} · p={difficulty_index}` (the classical p-value)
- A discrimination badge: `{discrimination_label} · D={discrimination_index}`

All labels and indices are computed server-side in `docs/sql/learning-analytics.sql`. Read-only.

> **Gaps** No export. For a thesis defense this is the screen most worth being able to screenshot or export as evidence — psychometric item analysis is a genuinely strong feature and it's currently trapped on screen.

---

## 8. Rubric Builder

**Route** `.../rubrics/:rubricId` · **File** `RubricBuilderPage.tsx`

`isNew = rubricId === 'new'`. Uses `useFieldArray({ name: 'criteria' })` with one empty criterion by default. Loading an existing rubric with zero criteria substitutes one empty row.

Live `totalPoints` is a `useMemo` over `watch('criteria')` with a `Number.isFinite` guard, shown as `Total: {n} pts`.

Fields: `title` (required, helper "A short name for this rubric."), `description` (helper "Optional context for graders."). Per criterion: **Criterion** (required), **Guidance** (optional), **Max Points** (required number), and a Remove button **disabled when only one criterion remains**.

Submit carries each criterion's `id` so existing rows are updated rather than recreated. Create → `fn_create_rubric`; update → `fn_update_rubric`. Both navigate back to `?tab=rubrics` on success.

**Rules:** `fn_assert_section_staff`; title required; at least one criterion; **each criterion's `max_points` must be > 0**; `rubrics.total_points` is recomputed as the sum of criteria. `fn_copy_rubric_to_sections` requires the caller to teach the source *and* **every** target, skips the source section, and returns `copied_count`.

> **Gaps**
> - The client enforces only `required` on Max Points, not `> 0`, so `0` reaches the server and is rejected there.
> - Worse, **`fn_create_rubric` returns that rejection after having already inserted the `rubrics` row and any preceding criteria** — it `RETURN`s mid-loop rather than raising, so the insert is not rolled back. A rejected save leaves a **partial rubric** in the database.

---

## 9. Service → RPC inventory

**`faculty.service.ts`** (19 functions)
`fn_list_my_sections` · `fn_get_section_detail` · `fn_list_section_students` · `fn_get_section_student_evaluation` · `fn_get_student_attendance` · `fn_get_student_grade_breakdown` · `fn_list_attendance_sessions` · `fn_create_attendance_session` · `fn_delete_attendance_session` · `fn_get_attendance_records` · `fn_save_attendance_records` · `fn_list_grading_periods_by_section` · `fn_list_grading_components` · `fn_create_grading_component` · `fn_update_grading_component` · `fn_delete_grading_component` · `fn_list_grade_sheet` · `fn_calculate_all_grades_for_period` · `fn_is_section_grading_locked` · `fn_reseed_section_grading`

**`assessment.service.ts`**
`fn_list_assessments` · `fn_get_assessment_by_id` · `fn_create_assessment` · `fn_update_assessment` · `fn_publish_assessment` · `fn_unpublish_assessment` · `fn_delete_assessment` · `fn_duplicate_assessment_to_sections` · `fn_create_assessment_attachment`† · `fn_delete_assessment_attachment`† · `fn_get_assessment_questions` · `fn_upsert_question` · `fn_bulk_import_questions` · `fn_delete_question` · `fn_list_submissions` · `fn_get_submission_for_grading` · `fn_grade_submission`
† unreachable — see the dead-code note in §5.

**`rubric.service.ts`**
`fn_list_rubrics` · `fn_get_rubric` · `fn_create_rubric` · `fn_update_rubric` · `fn_delete_rubric` · `fn_copy_rubric_to_sections` · `fn_get_assessment_rubric` · `fn_set_assessment_rubric` · `fn_get_submission_rubric` · `fn_grade_submission_rubric`

**`content.service.ts`**
`fn_list_my_teaching_sections` · `fn_duplicate_module_to_sections` · `fn_get_section_content` · `fn_create_module` · `fn_update_module` · `fn_delete_module` · `fn_set_module_published` · `fn_create_material` · `fn_update_material` · `fn_delete_material` · `fn_set_material_published` · `fn_mark_material_complete` *(silent)*

**`discussion.service.ts`**
`fn_list_section_threads_json` · `fn_get_discussion_thread` · `fn_create_thread` · `fn_reply_to_thread` · `fn_delete_thread` · `fn_delete_post` · `fn_set_thread_resolved` · `fn_set_post_answer` · `fn_set_thread_pinned`

**`analytics.service.ts`**
`fn_get_student_insight` · `fn_get_section_insight` · `fn_get_assessment_item_analysis`

---

## 10. Faculty gaps summary

Ranked by how much they'd hurt in a live term or a demo.

| # | Gap | Impact |
|---|---|---|
| 1 | **Faculty cannot attach files to assessments** — `AssessmentAttachmentPanel` is dead code | 🔴 A whole advertised capability is missing |
| 2 | **"Calculate Grades" gives no feedback and hides per-student failures** | 🔴 Silent partial failure on the most consequential action in the role |
| 3 | **Rubric points vs assessment `total_points` unreconciled** | 🔴 Silently wrong weighted grades |
| 4 | **Assessment delete has no confirmation** | 🟠 Irreversible data loss on a misclick |
| 5 | **Auto-graded answers cannot be overridden** | 🟠 A keying error in a quiz cannot be corrected |
| 6 | **Unpublish is allowed with live submissions in flight** | 🟠 Students lose access mid-attempt |
| 7 | **Faculty cannot assign a special grade** (INC, DRP…) | 🟠 The catalogue exists with no way to apply it |
| 8 | **Question points never reconciled with `total_points`** | 🟠 Quietly wrong denominators |
| 9 | **Discussion capped at 50 threads, no search, no pagination** | 🟡 Unusable in a busy section |
| 10 | **Attendance saves ignore unmatched rows silently** | 🟡 No per-row error reporting |
| 11 | **Attendance rate rule lives in TSX, not SQL** | 🟡 Violates the thick-DB paradigm |
| 12 | **Partial rubric left behind on a rejected create** | 🟡 Non-transactional write |
| 13 | **Item analysis has no export** | 🟡 Strong feature, hard to evidence |
| 14 | **No drag-to-reorder for questions** | 🟡 Usability |
| 15 | `DEFAULT_ASSSESSMENT_VALUES` typo · `'Dean'` display-name fallback · duplicate sidebar icons | ⚪ Cosmetic |
