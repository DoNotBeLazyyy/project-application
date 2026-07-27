# QA Findings Remediation

Execution tracker for the QA pass across all five roles (Student, Registrar, Faculty, Admin, Dean). Source: `Findings.pdf`. This doc is the source of truth so any session can resume the work — check the Status table, then execute the requested phase using the per-item detail below.

## How to execute (for a fresh session)

1. Read the **Status** table to see what is done vs pending.
2. The user will name a phase (e.g. "execute the rest of Phase 1", "execute 1d", "execute Phase 3"). Do only what is asked.
3. Frontend fixes: verify with `npm run build-dev` (this runs `tsc -b` — the typecheck) and `npm run lint` on the touched files only (do NOT run project-wide `lint:fix` — it churns unrelated files).
4. Backend fixes are authored as `docs/sql/*.sql` files. There is **no migration runner**; the **user must apply them to the live Supabase DB manually**. Those runtime errors will not clear until applied. Mark the SQL item "authored (awaiting apply)".
5. Update the Status table after each item.

## Systemic root causes (context)

1. **Wrapper logged users out on any HTTP 403.** `isAuthFailure()` in `src/services/supabase.wrapper.ts` treated every 401/403 as an expired session and hard-redirected to `/login`. The Phase-7 security retrofit made ~47 RPCs `RAISE ... ERRCODE '42501'`, which PostgREST returns as HTTP 403 — so normal authorization errors silently logged users out. **FIXED in Phase 1a.**
2. **Live DB is out of sync with `docs/sql`.** Several bugs are the live/dumped function diverging from newer intended SQL (`fn_update_user`, `fn_create_term`) or outright bugs in the live copy (wrong `ON CONFLICT` target, wrong column names). SQL is applied to Supabase manually.

## Status

| ID | Item | Phase | Status |
|---|---|---|---|
| S1 | Wrapper: stop logout on business 403s | 1a | ✅ done (build + lint pass) |
| B1 | Student schedule color `ON CONFLICT` fix | 1b | ⬜ pending |
| B2 | `fn_start_assessment_timer` column names | 1b | ⬜ pending |
| B3 | Create `fn_get_admin_dashboard_stats()` | 1b | ⬜ pending |
| B5 | Apply multi-role `fn_update_user(...text[])` | 1c | ⬜ pending |
| B6 | Resolve `fn_create_term` (`p_evaluation_scope`) | 1c | ⬜ pending |
| B4 | Announcement/Event empty-uuid guard (frontend) | 1d | ✅ done (build + lint pass) |
| B7 | Align attendance read/write access model (SQL) | 1 | 🟡 authored (awaiting apply) |
| B8 | Assessment builder grading-component id | 2 | ⬜ pending |
| — | Assessment builder schedule reset-to-blank | 2 | ⬜ pending |
| — | Assessment builder date-field relabel | 2 | ⬜ pending |
| U2 | AG-Grid header tooltips (global) | 3 | ⬜ pending |
| U3 | Remove filler sort arrows | 3 | ⬜ pending |
| U5 | Clickable dashboard stat cards | 3 | ⬜ pending |
| U6 | Announcement/Event back button | 3 | ⬜ pending |
| U9 | Dedupe "two Settings" (footer icon) | 3 | ⬜ pending |
| U1 | Login password toggle reliability | 3 | ⬜ pending |
| U7 | Enroll button hidden at 100% zoom | 3 | ⬜ pending |
| U8 | Year filter 1st–4th + Reset button | 3 | ⬜ pending |
| U4 | "Dean Panel" label on wrong role | 4 | ⬜ pending (needs repro) |
| R3 | Settings 403 (RoleGate/role-switch) | 4 | ⬜ pending (needs repro) |
| R1 | School year create fails/doesn't display | 4 | ⬜ pending (needs repro) |
| R2 | Program level edit won't save | 4 | ⬜ pending (needs repro) |
| F4 | Arellano hymn & core values | 5 | ⬜ pending |
| F3 | Admin reset password | 5 | ⬜ pending |
| — | Grades empty-state copy | 5 | ⬜ pending |
| F1 | Separate lab & lec | deferred | ⏸ deferred (needs design) |
| F2 | Batch year/sem progression + auto-enroll | deferred | ⏸ deferred (needs PRD) |

Already satisfied (no work): a profile page with self-service name + password change already exists at `src/pages/shared/profile/index.tsx`, routed `/{role}/profile` for every role via the footer "My Profile" button.

---

## Phase 1a — DONE

`src/services/supabase.wrapper.ts`: replaced `isAuthFailure(status)` with `shouldRedirectToLogin(status, error)`. A 401/403 carrying a 5-char Postgres SQLSTATE (`42501`, `P0001`, …) is treated as a normal error (toast, session preserved); only 401/403 without a SQLSTATE (expired-JWT / PostgREST auth) redirect to `/login`. Applied in `callRpc`, `callQuery`, `callSingle`, `callFunction`.

## Phase 1 remainder — blocking backend

### B1 — Student schedule color won't save (`docs/sql`)
- Symptom: `constraint "idx_student_section_colors_unique" for table "student_section_colors" does not exist`.
- Service: `src/services/student-portal.service.ts` `upsertSectionColor()` → `callRpc('fn_upsert_student_section_color', { p_section_id, p_color })`.
- Root cause: RPC uses `ON CONFLICT ON CONSTRAINT idx_student_section_colors_unique` — but that name is a partial **unique index**, not a table constraint.
- Fix: recreate `fn_upsert_student_section_color` with `ON CONFLICT (student_id, section_id) WHERE deleted_at IS NULL`. Reference the current body in `supabase_ai_context.sql` (around the `fn_upsert_student_section_color` definition). Author as a new `docs/sql/qa-fixes-phase1.sql` (or similar). No SQL comments (CLAUDE.md §6).

### B2 — Can't take assessment (`docs/sql`)
- Symptom: `column "started_at" of relation "assessment_timer_sessions" does not exist`.
- Service: `src/services/student-portal.service.ts` → `callRpc('fn_start_assessment_timer', { p_enrollment_id, p_assessment_id })`.
- Root cause: RPC INSERTs `started_at`/`expires_at`; the real columns are `server_started_at`/`server_expires_at`. The INSERT also omits the NOT NULL `enrollment_id` and `assessment_item_id` columns.
- Fix: recreate `fn_start_assessment_timer` inserting `server_started_at`/`server_expires_at` and including `enrollment_id` + `assessment_item_id`. Confirm the exact `assessment_timer_sessions` columns in `supabase_ai_context.sql` before writing.

### B3 — Admin dashboard error (`docs/sql`)
- Symptom: `Could not find the function public.fn_get_admin_dashboard_stats without parameters`.
- Service: `src/services/admin.service.ts` `getAdminDashboardStats()` → `callRpc('fn_get_admin_dashboard_stats')` (no params).
- Root cause: the function does not exist anywhere (confirmed).
- Fix: create `fn_get_admin_dashboard_stats()` (no params) returning JSONB with the keys `AdminDashboard.tsx` reads: `active_students`, `active_faculty`, `total_programs`, `active_terms`, `active_enrollments`, `pending_clearances`. Mirror the shape/style of `fn_get_dean_dashboard` / `fn_get_faculty_dashboard` in `docs/sql/dashboards.sql`. Add a caller guard `PERFORM public.fn_assert_role('Admin')`.

### B5 — Edit user 404 (apply existing SQL)
- Symptom: `fn_update_user 404 Not Found`; error names `fn_update_user(p_first_name, p_last_name, p_role_code, p_user_id)`.
- Root cause: live still has singular `p_role_code text`; frontend (`src/services/user.service.ts`) sends `p_role_codes text[]`. The Phase-5 multi-role version in `docs/sql/accounts-admin-depth.sql` (drops the old, creates `fn_update_user(p_user_id uuid, p_first_name text, p_last_name text, p_role_codes text[])`) was never applied to live.
- Fix: ensure `docs/sql/accounts-admin-depth.sql` is the intended definition; user applies it to live. Verify no other pending statements in that file regress.

### B6 — Can't create term (resolve + apply SQL)
- Symptom: term create fails / doesn't display.
- Root cause: frontend `src/services/term/term.service.ts` `createTerm` sends 8 params incl. `p_evaluation_scope`; live `fn_create_term` has 7. There is a conflicting 7-param redefinition in `docs/sql/grading-schema-inheritance.sql` vs the 8-param version in `docs/sql/evaluation-scope.sql`.
- Fix: confirm the 8-param `evaluation-scope.sql` version is the intended live definition (ties into the in-progress evaluation-scope work in the tree), make sure frontend params match, user applies. School-year create (R1) has a matching signature — treat separately in Phase 4 (runtime).

### B7 — Attendance access model (SQL side)
- Symptoms: "Session not found or access denied" on save; "Forbidden: you do not have access to this section" + logout on delete (logout half fixed by S1).
- Services: `src/services/faculty.service.ts` — `createAttendanceSession`, `deleteAttendanceSession`, `saveAttendanceRecords`, `listAttendanceSessions`, `getAttendanceRecords`.
- Root cause: mixed model — reads (`fn_list_attendance_sessions`, `fn_get_attendance_records`) were retrofitted to raise 42501 via `fn_assert_section_staff`; writes still return soft `{ success:false, message:'Session not found or access denied.' }`. All gate on `sections.faculty_id = auth.uid()`.
- Fix: make the model consistent — recommend both reads and writes return the soft jsonb (so denials are clean toasts, not 403s). With S1 done, a 42501 no longer logs out regardless. Also confirm at runtime that the test section's `faculty_id` equals the acting `auth.uid()` (the "delete succeeded then Forbidden on refetch" pattern suggests a membership check evaluated differently on refetch).
- Fix authored (awaiting apply) → `docs/sql/phase-1-b7-attendance-access.sql`. All five attendance RPCs now return the soft `{ success:false, message }` envelope instead of raising 42501:
    - New helper `fn_can_access_section_staff(uuid)` returns boolean (no raise) for the read allow-set — assigned faculty OR Dean/Registrar/Admin (mirrors `fn_assert_section_staff` minus the exception).
    - Reads (`fn_list_attendance_sessions`, `fn_get_attendance_records`) replace `PERFORM fn_assert_section_staff(...)` with the boolean check; on denial they return soft jsonb so `callRpc` shows a clean toast and returns `data: null`. `fn_get_attendance_records` resolves the session's `section_id` first and soft-denies when the session is missing/deleted (fixes the "delete → Forbidden on refetch" edge where the deleted-session subquery went NULL and `fn_assert_section_staff(NULL)` raised).
    - Writes (`fn_create/delete/save`) keep faculty-owner-only authority (`fn_is_section_faculty`) and already soft-denied; hardened with `SET search_path = public` and NULL-section guards for consistency.
    - Frontend needs no change: `AttendanceTab.tsx` already guards both reads with `if (result.data)`, so a `null` payload is a clean no-op + toast.
    - SQL-only: verified against the live retrofit definitions in `docs/sql/security-retrofit.sql`; no build/lint impact.

### B4 — Announcement/Event empty-uuid guard (frontend, Phase 1d) — DONE
- Symptom: `invalid input syntax for type uuid: ""` on create.
- Files: `src/services/announcement.service.ts` `createAnnouncement`/`updateAnnouncement`, `src/services/event.service.ts` `createEvent`/`updateEvent`.
- Root cause: the only uuid-typed param is `p_section_ids uuid[]`; it receives an empty-string element (or `[""]`).
- Fix applied: added pure helper `sanitizeUuidArray` in `src/utils/uuid.util.ts` (trims, drops falsy/blank entries, returns `null` when empty). Both services now send `sanitizeUuidArray(params.section_ids)` for `Section` audience and `null` otherwise — applied to create **and** update in each service. Confirmed `fn_get_announcement_section_options` returns `s.id` (a real UUID PK), so no empty-id option exists at source; the empty string originated from the multi-select field default. Verified with `npm run build-dev` (tsc + vite, exit 0) and `eslint` on the three touched files (clean).

## Phase 2 — Faculty grading & assessment builder

### B8 — Grading component id not showing (frontend)
- File: `src/pages/faculty/sections/assessments/builder/AssessmentBuilderPage.tsx` (~line 56).
- Root cause: calls `listGradingComponents(sectionId, assessmentDbId)` but the 2nd arg is forwarded as `p_grading_period_id`; passing the assessment id makes the RPC return `[]` → empty `grading_component_id` select.
- Fix: pass the real grading-period id.

### Schedule reset-to-blank (frontend)
- Assessment builder schedule datetime fields ("Scheduled Publish", "Opens at") lose their value after reopening. Investigate the load/reset path (`reset(defaultValues)` firing before fetched values arrive, or field-name mismatch when mapping the fetched assessment back into the form). Fix so saved values rehydrate.

### Date-field relabel (frontend)
- Clarify "Scheduled Publish / Opens at / Due at / Closes at / Show Results at" with per-field helper text (project convention: descriptive helperText per field). Consider collapsing "Due at" vs "Closes at" only if truly redundant — confirm intent with user before removing either.

### "Cannot create another component"
- Expected guard: `fn_create_grading_component` rejects total weight > 100% and `GradingComponentPanel.tsx` (~line 153) disables Add at ≥100%. If components already sum to 100 this is correct — surface a clearer message ("Components already total 100%") instead of a silently disabled button. Only change behavior if the disable fires prematurely.

## Phase 3 — Shared UI/UX

- **U2 header tooltips (explicitly requested):** in `src/components/table/useTableConfigs.tsx` (`resolvedColDefs`, ~lines 60-83) add a custom `headerComponent`/`headerComponentParams` that renders `params.displayName` with a native `title` attribute — one global change gives every AG-Grid header a hover tooltip (fixes truncated "SECTION…/COURSE…"). AG-Grid `headerTooltip` needs a literal per-column string, so a shared header component is cleaner.
- **U3 remove filler arrows:** remove the forced `unSortIcon` from `<AgGridReact>` in `src/components/table/CommonTable.tsx` (or make it an opt-in prop) so the double-caret only shows on sortable columns while sorted. Keep asc/desc icons. Verify My Subjects + My Grades.
- **U5 clickable stat cards:** add optional `onClick`/`to` to `src/components/card/StatCard.tsx` (render as button with hover when provided); wire navigation on Faculty/Student/Registrar/Dean/Admin dashboards; convert student dashboard's inline tiles to `StatCard`.
- **U6 back button:** `src/pages/shared/entity-form/EntityFormPage.tsx` `exitEditing()` — in view mode (not `isCreate`, not `isEditing`) `navigate(backTo)` instead of only `setIsEditing(false)`. Fixes View Announcement / View Event.
- **U9 two Settings:** change the sidebar footer button icon in `src/components/sidebar/CommonSideBar.tsx` (~lines 116-151) from `GearSixIcon` to a user/account icon (e.g. `UserCircleIcon`) so "My Profile" no longer reads as a second Settings gear. Admin nav "Settings" (→ system-settings) stays.
- **U1 password toggle:** make reveal reliable — memoize the eye adornment in `src/pages/auth/LoginPage.tsx`, or (cleaner) add native `type="password"` + built-in visibility toggle to `src/components/input/CommonInput.tsx` and reuse. Password must stay visible across an invalid-login re-render.
- **U7 enroll button at zoom:** cap modal height + make body scrollable in `src/pages/registrar/enrollment-management/EnrollmentWorkspaceModal.tsx` (e.g. `max-h-[85vh]` + `overflow-y-auto` on the content region) so the pinned footer button is on-screen at 100% zoom. Prefer fixing the shared `CommonActionModal`/`CommonModal` if it doesn't regress others.
- **U8 year filter:** trim `src/constants/year-level.constant.ts` to 1st–4th Year and consolidate the 5+ inline copies (`StudentFilterForm`, `EnrollmentStudentFilterForm`, `StudentForm`, `LifecyclePanel`, `CurriculumMapForm`) to import the shared constant. Add a **Reset** button to the filter modal — extend `CommonFormModal` `formButtonsProps` with an optional reset, or add a reset in each filter form calling `reset(defaultFilterValues)`. Confirm trimming doesn't break stored 5th/6th-year data.

## Phase 4 — Role/routing (reproduce first)

- **U4 "Dean Panel" on wrong role:** subtitles are hardcoded correctly per layout (`DeanLayout` = 'Dean Panel', etc.), so a wrong label means the wrong layout is mounted for the active role — OR derive the subtitle centrally from `activeRole`. Reproduce which layout mounts on the reported screens, then fix routing or derive the subtitle in `CommonSideBar` via a `{role → "{Role} Panel"}` map.
- **R3 Settings 403:** `src/routes/guards/RoleGate.tsx` redirects to `/unauthorized` when `activeRole` ∉ `allowedRoles`. A multi-role user on `/admin/*` with a non-Admin `activeRole` hits it. Fix by making role-switch navigate to the newly-active role's home and/or only showing the admin Settings nav item when `activeRole === 'Admin'`.
- **R1 school year create / R2 program level save:** signatures match, so the defect is runtime (`success:false` payload, failing guard, or modal submit wiring). Instrument the actual RPC responses (`fn_create_school_year`, `fn_update_program_level`) during repro and fix the specific failure — do not guess a schema change.

## Phase 5 — Content & small features

- **F4 Arellano hymn & core values:** add a static, clickable display (hymn image/text + core values) on the student dashboard or a small "About/Institution" panel. Confirm placement + assets with user first.
- **F3 admin reset password:** add a User Management row action; prefer the secure recovery flow already used for onboarding (`supabase.auth.resetPasswordForEmail`, per CLAUDE.md §11) over a literal default password. Confirm which the user wants.
- **Grades empty-state:** verify whether "grades unavailable / no grading periods" is a data-config gap (term has no grading periods) vs a fetch bug in `getSubjectGrades`. Improve empty-state copy to explain why. Likely resolves once Phase-1 SQL + term/grading config is applied.

## Deferred (large features)

- **F1 Separate lab & lec** across assessments and grades — data-model + multi-screen change; dedicated design pass.
- **F2 Batch year/sem progression + auto-enroll** — significant registrar workflow (bulk RPC over curriculum maps); separate PRD.

## Verification checklist

No automated tests exist. Use `npm run build-dev` + `npm run lint` (touched files only), then manual runthrough on `npm run dev`:
- Student: schedule color saves (B1); assessment starts, no `started_at` error (B2); Grades render.
- Admin: dashboard shows real numbers (B3); create school year (R1) + term (B6) → row appears; edit user roles → no 404 (B5); create announcement/event with Global + Section audiences → no `uuid: ""` (B4).
- Faculty: create/delete attendance session + save attendance → no logout, clean toast on denial (S1 + B7); assessment builder shows grading components (B8).
- Dean: edit program level saves (R2).
- Frontend: header tooltips on hover (U2); no idle sort arrows (U3); stat cards navigate (U5); back works on View Announcement/Event (U6); one Settings gear per sidebar (U9); password stays visible after invalid login (U1); Enroll button visible at 100% zoom (U7); year filter 1st–4th + Reset (U8).
- Routing: correct "{Role} Panel" (U4); Settings reachable without 403 (R3).
