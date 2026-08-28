# QA_AND_KNOWN_ISSUES.md — QA Findings, Remediations & Known Issues

This document compiles the quality assurance findings, root-cause analyses, resolved bugs, and outstanding issues across all testing rounds (QA Round 1, Findings 2, and Findings 3).

---

## 1. Overview of Testing Rounds

The codebase has undergone three comprehensive rounds of manual QA testing covering all five roles (Admin, Dean, Registrar, Faculty, Student):
- **QA Round 1**: Core functionality, auth redirects, attendance permissions, and initial CRUD operations.
- **Findings 2 (Docx Report)**: Role-specific functional blockers, assessment timers, schedule color pickers, enrollment dropdowns, and UI overflows.
- **Findings 3 (Docx Report)**: New user login onboarding, dashboard stat card links, lag/performance on term types, profile updates, and announcement distributions.

---

## 2. Resolved Defects & Remediations

### Core Auth & Navigation
- **403 Session Invalidation Bug**: Previously, business authorization rejections (Postgres error `42501`) were treated by `supabase.wrapper.ts` as expired JWTs, causing immediate logouts. **Resolved** by filtering SQLSTATE codes so permission denials produce error toasts rather than session termination.
- **Onboarding Gate**: Users in status `'Invited'` are strictly contained on `/set-password` until onboarding is complete.
- **Role Switcher Synchronization**: Active role switches cleanly re-render role-specific routes without state leaks.

### Admin Domain
- **Dashboard Stats RPC (`fn_get_admin_dashboard_stats`)**: Fixed missing RPC signature returning `active_students`, `active_faculty`, `total_programs`, `active_terms`, `active_enrollments`, and `pending_clearances`.
- **Multi-Role User Update (`fn_update_user`)**: Reconciled backend parameter from singular string `p_role_code` to array `p_role_codes text[]` (`docs/sql/phase-1c-sql-fixes.sql`).
- **Term Creation Signature**: Resolved 7-param vs 8-param conflict by standardizing `p_evaluation_scope` parameter across frontend and database (`docs/sql/evaluation-scope.sql`).
- **School Year & Program Level Creation**: Resolved duplicate definition overloads and parameter type mismatches (`docs/sql/qa-r1-r2-fixes.sql`).

### Dean Domain
- **Department Head Assignment**: Decoupled Dean account roles from department head foreign key constraints.
- **Curriculum Map CRUD & Print**: Fixed modal edit flows and added CSV bulk import/export.
- **Course Prerequisites Selector**: Fixed dependent dropdown logic preventing invalid prerequisite chains.

### Registrar Domain
- **Enrollment Management UI Visibility**: Fixed layout clipping at 100% browser zoom; adjusted action button placements.
- **Batch Progression (`fn_run_batch_progression`)**: Implemented automated end-of-term progression of student cohorts (`docs/sql/batch-progression.sql`).
- **Year Level Filters**: Added 1st–4th year filters and clear filter reset triggers.

### Faculty Domain
- **Attendance Access Model (`docs/sql/phase-1-b7-attendance-access.sql`)**: Unified attendance read/write access checks into soft JSON envelopes, eliminating 403 crashes.
- **Assessment Builder Validation**: Resolved missing grading component IDs on newly created items.
- **Grading Lock Integrity**: Enforced locked state once grades are submitted to Registrar.

### Student Domain
- **Schedule Color Picker (`docs/sql/phase-1b-sql-fixes.sql`)**: Fixed `ON CONFLICT` clause targeting partial unique index `(student_id, section_id)`.
- **Server-Side Answer Key Protection**: Enforced `is_correct` concealment until results release dates.
- **Assessment Timer Initialization (`fn_start_assessment_timer`)**: Fixed column name mismatch (`started_at` $\rightarrow$ `server_started_at`).

---

## 3. Outstanding / Pending Bugs & Silent Failures

### Critical Priority (Data & Session Risks)
1. **Assessment Resumption on Page Refresh**: If a student refreshes their browser during an active timed assessment where `max_attempts = 1`, the current logic fails to resume the open session and blocks re-entry.
2. **Timer Expiration Auto-Submit**: If a student leaves the page when the timer expires, the submission remains in status `'InProgress'` indefinitely rather than auto-submitting.
3. **School Year Bulk Delete**: The bulk delete action in Admin School Years currently processes only the first selected UUID instead of iterating the entire array.
4. **Course Update Lab Units**: Updating course title or lecture units via `updateCourse` inadvertently sets `lab_units` to 0 if not explicitly supplied.

### High Priority (UI / Workflow Blockers)
1. **AI Chatbot Response Latency**: The `ai-assistant` Edge Function can take up to 10–15 seconds during cold starts. Follow-up suggested prompt buttons disappear after initial response.
2. **Dashboard Stat Tile Navigation**: Clicking summary metric cards on Admin/Dean dashboards does not yet filter the target management page by that metric.
3. **Calculation Failures Feedback**: When `fn_calculate_all_grades_for_period` encounters invalid component totals, failures are logged internally but the UI does not show a breakdown of affected students.
4. **Schedule Conflict Detection Silence**: When `fn_list_schedule_conflicts` encounters an error, it returns an empty array, making a query failure indistinguishable from "no conflicts found".

---

## 4. Remediation Action Plan

| Bug / Defect | Remediation Target | Effort |
|---|---|---|
| Assessment session resume | Modify `fn_start_assessment_timer` to return existing active session if status = `'InProgress'` | 2 hours |
| Timer auto-submit sweeper | Author Supabase pg_cron job / Edge Function to mark expired timer sessions as `'Submitted'` | 4 hours |
| School year bulk delete fix | Update `AdminSchoolYearsPage.tsx` to pass UUID array to `fn_bulk_delete_school_years` | 30 mins |
| Lab units preservation | Ensure `CourseEditModal` passes existing `lab_units` value on update | 15 mins |
| Grade calculation error toast | Update frontend service to display `result.data.failures` in a summary dialog | 1 hour |

