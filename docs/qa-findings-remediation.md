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
| B1 | Student schedule color `ON CONFLICT` fix | 1b | ✅ done (`docs/sql/phase-1b-sql-fixes.sql` applied to live) |
| B2 | `fn_start_assessment_timer` column names | 1b | ✅ done (`docs/sql/phase-1b-sql-fixes.sql` applied to live) |
| B3 | Create `fn_get_admin_dashboard_stats()` | 1b | ✅ done (applied; keys reconciled to `total_students`/`total_faculty`) |
| B5 | Apply multi-role `fn_update_user(...text[])` | 1c | ✅ done (`docs/sql/phase-1c-sql-fixes.sql` applied to live) |
| B6 | Resolve `fn_create_term` (`p_evaluation_scope`) | 1c | ✅ done (8-param canonical signature applied to live) |
| B4 | Announcement/Event empty-uuid guard (frontend) | 1d | ✅ done (build + lint pass) |
| B7 | Align attendance read/write access model (SQL) | 1 | ✅ done (`docs/sql/phase-1-b7-attendance-access.sql` applied to live) |
| B8 | Assessment builder grading-component id | 2 | ✅ done (build + lint pass) |
| — | Assessment builder schedule reset-to-blank | 2 | ✅ done (build + lint pass) |
| — | Assessment builder date-field relabel | 2 | ✅ done (build + lint pass) |
| — | Grading "cannot add component" clearer message | 2 | ✅ done (build + lint pass) |
| U2 | AG-Grid header tooltips (global) | 3 | ✅ done (build + lint pass) |
| U3 | Remove filler sort arrows | 3 | ✅ done (build + lint pass) |
| U5 | Clickable dashboard stat cards | 3 | ✅ done (build + lint pass) |
| U6 | Announcement/Event back button | 3 | ✅ done (build + lint pass) |
| U9 | Dedupe "two Settings" (footer icon) | 3 | ✅ done (build + lint pass) |
| U1 | Login password toggle reliability | 3 | ✅ done (build + lint pass) |
| U7 | Enroll button hidden at 100% zoom | 3 | ✅ done (build + lint pass) |
| U8 | Year filter 1st–4th + Reset button | 3 | ✅ done (build + lint pass) |
| U4 | "Dean Panel" label on wrong role | 4 | ✅ done (build + lint pass) |
| R3 | Settings 403 (RoleGate/role-switch) | 4 | ✅ done (build + lint pass) |
| R1 | School year create fails/doesn't display | 4 | 🟡 frontend fixed + `docs/sql/qa-r1-r2-fixes.sql` applied; needs runtime repro to close |
| R2 | Program level edit won't save | 4 | 🟡 frontend fixed + `docs/sql/qa-r1-r2-fixes.sql` applied; needs runtime repro to close |
| F4 | Arellano hymn & core values | 5 | 🟡 built (build + lint pass); text needs official verification |
| F3 | Admin reset password | 5 | ✅ done (build + lint pass) |
| — | Grades empty-state copy | 5 | ✅ done (build + lint pass) |
| F1 | Separate lab & lec | 6 | ❌ rejected — already satisfied by the existing `is_split` two-course model; work reverted and deleted |
| F2 | Batch year/sem progression + auto-enroll | 6 | ✅ done (`docs/sql/batch-progression.sql` applied to live); needs runtime smoke test |
| U10 | Dashboard hover-preview / grade summary tiles | — | ❌ not built — only the click-through half of the suggestion landed (U5) |

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

## Phase 2 — Faculty grading & assessment builder — DONE

All four items frontend-only; verified with `npm run build-dev` (tsc + vite exit 0) + `eslint` on touched files (clean). No SQL.

### B8 — Grading component id not showing — DONE
- `src/pages/faculty/sections/assessments/builder/AssessmentBuilderPage.tsx`: the fetch effect called `listGradingComponents(sectionId, assessmentDbId)`, forwarding the assessment id as `p_grading_period_id`; `fn_list_grading_components` filters strictly on `grading_period_id` so it returned `[]`. Components belong to a grading period and an assessment's component can sit under any period, and the builder form has no period field. Fix: effect now depends on `sectionId` only, calls `listGradingPeriodsBySection`, then `Promise.all(listGradingComponents per period)`, and flattens to options labeled `"{period} — {component} ({weight}%)"`. Every component across all periods is now selectable and the persisted `grading_component_id` matches.

### Schedule reset-to-blank — DONE
- Same file, `fetchAssessment` `settingsMethods.reset(...)` omitted `opens_at`, `scheduled_publish_at`, `show_all_questions`, `questions_per_page`; RHF `reset()` replaces the whole form so those four blanked on reopen. `fn_get_assessment_by_id` returns all of them (verified in dump). Fix: added the four keys to the reset object (`questions_per_page` stringified, `show_all_questions ?? true`).

### Date-field relabel — DONE
- `src/pages/faculty/sections/assessments/builder/AssessmentSettingsForm.tsx`: added `hasHelper` + descriptive `helperText` to all five `ValidCommonDateTimePicker`s (Scheduled Publish / Opens At / Due At / Closes At / Show Results At) per the per-field helper-text convention. Kept Due At and Closes At as distinct fields (late-vs-cutoff) — helper text now disambiguates them, so neither was removed.

### "Cannot create another component" — DONE
- `src/pages/faculty/sections/grading/GradingComponentPanel.tsx`: the `Add` disable at `totalWeight >= 100` is correct. Added a warning line ("Components already total 100%.") under the total when `!locked && totalWeight >= 100`, so the disabled button now reads as intentional rather than broken. No behavior change.

## Phase 3 — Shared UI/UX — DONE

All eight items are frontend-only; verified with `npm run build-dev` (tsc + vite, exit 0) and `eslint` on the touched files (clean). Six of the eight landed in shared components, so they apply everywhere at once.

- **U2 header tooltips — done.** `src/components/table/useTableConfigs.tsx` gained a pure `withHeaderTooltip()` that maps over `leadingColumnDefs`/`trailingColumnDefs` and derives `headerTooltip` from each column's own `headerName` (skipped when the caller set `headerTooltip`, or the header is empty/non-string — so the blank action column stays untouched). `CommonTable` sets `enableBrowserTooltips`, which renders them as native browser tooltips with no styling work. A custom `headerComponent` was rejected: it would have meant reimplementing sort clicks and sort-icon rendering to gain the same hover text.
- **U3 filler arrows — done.** Removed the hardcoded `unSortIcon` from `<AgGridReact>` in `src/components/table/CommonTable.tsx`. Because `CommonTableProps` extends `AgGridReactProps` and `{...props}` spreads after the defaults, `unSortIcon` is now opt-in per table with no type change. Asc/desc icons are unaffected.
- **U5 clickable stat cards — done.** `StatCard` takes an optional `to`; with it the body renders as a full-width `<button>` with a hover tint and navigates via `useNavigate`, without it the original non-interactive `<div>` is preserved exactly. Targets were chosen to respect the §10 RBAC boundaries — a card only links to a route the acting role actually owns, so Admin's Total Programs / Active Enrollments / Pending Clearances stay non-clickable (Dean and Registrar own those screens), as do Dean's Enrolled Students and the At-Risk counters, which have no role-level destination. The student dashboard's three hand-rolled inline tiles were replaced by `StatCard` driven by a `STAT_CARDS` array + `resolveStatValue()`, so all five dashboards now share one tile.
- **U6 back button — done.** `EntityFormPage` lives at `src/components/entity-form/EntityFormPage.tsx` (not `src/pages/shared/`). `exitEditing()` now navigates when `!isEditing`, so in view mode Back leaves the page instead of silently re-setting `isEditing` to false; edit mode still falls back to view. Fixes View Announcement / View Event.
- **U9 two Settings — done.** `CommonSideBar`'s footer button icon is `UserCircleIcon` instead of `GearSixIcon`; all five layouts label it "My Profile" and none override the icon, so the Admin nav "Settings" gear is now the only gear.
- **U1 password toggle — done.** Took the cleaner route: the toggle now lives in `CommonInput` behind `hasPasswordToggle`, which owns its own `isPasswordVisible` state, memoizes the eye adornment, and adds `onMouseDown` → `preventDefault` so the click can't be lost to the input's blur. `LoginPage` dropped its local `showPassword` state and per-render `slotProps` object entirely; `SetPasswordPage` got the same toggle on both password fields for consistency.
- **U7 enroll button at zoom — done.** Fixed in the shared `CommonActionModal` rather than the one modal. The theme gives `MuiDialog.paper` `maxHeight: calc(100% - 4rem)` + `overflowY: auto`, so tall content scrolled the *whole* paper and pushed the action row off-screen. The card is now a flex column with `overflow: hidden` (applied via `sx`, which beats the theme's `styleOverrides`), the children region scrolls (`flex-1 min-h-0 overflow-y-auto`), and `FormButtons` is `shrink-0` — so Enroll/Cancel are always visible. Short modals are unaffected because the paper is not stretched.
- **U8 year filter — done.** `YEAR_LEVEL_OPTIONS` trimmed to 1st–4th Year, and the four inline duplicates (`StudentFilterForm`, `EnrollmentStudentFilterForm` — which also used a divergent "Year 1" label — `StudentForm`, `LifecyclePanel`) now import it; `CurriculumMapForm` already did. **Note:** the constant only drives the pickers, so a student already stored at year 5/6 still renders from their own data — but they can no longer be re-selected in a form. Raise this if 5th/6th-year programs exist. Reset is generic: `FormButtonsProps` gained an optional `resetProps`, `CommonFormModal` gained an `onReset` prop that renders a "Reset" button, and all twelve filter modals (audit-log, school-year, term, user, course, department, program, section, enrollment, student, announcement, event) pass a `handleFilterReset` that does `filterMethods.reset()` + `setActiveFilters(null)`. The modal stays open after reset so the cleared fields are visible.

### Follow-ups found while working (not fixed here)

- **B3 key mismatch (Phase 1b) — RESOLVED.** Settled on `total_students` / `total_faculty`: `fn_get_admin_dashboard_stats()` in `docs/sql/phase-1b-sql-fixes.sql` returns those keys and `AdminDashboard.tsx` reads them. The earlier `active_students` / `active_faculty` naming in the B3 spec above was never built.

## Phase 4 — Role/routing — DONE (U4, R3); R1/R2 fixed, awaiting SQL apply + runtime confirmation

New shared module `src/constants/role.constant.ts` holds `ROLE_HOME`, `ROLE_PANEL_LABEL`, `resolveRoleHome()`, `resolvePanelLabel()`. It replaces six duplicated role→path maps (a private `ROLE_DASHBOARD` in each of the five layouts plus `ROLE_PATHS` in `RoleRedirect`), so a role can no longer be mapped inconsistently in one place.

- **U4 "Dean Panel" on wrong role — fixed.** Every layout's sidebar subtitle now reads `resolvePanelLabel(activeRole, '<OwnRole>')` instead of a hardcoded string, so the label is always derived from the store's `activeRole` and cannot disagree with the role the user is acting as. The per-layout literal survives only as the fallback for a null `activeRole`.
- **R3 Settings 403 — fixed.** `RoleGate` no longer dead-ends a legitimate multi-role user on `/unauthorized`: a signed-in user whose `activeRole` is not in `allowedRoles` is redirected to `ROLE_HOME[activeRole]` (their own home) instead. `/unauthorized` is now reserved for the genuine no-active-role case. Role switching in all five layouts also navigates with `{ replace: true }`, so Back cannot return to the previous role's subtree and re-trigger the guard.
- **R1 school year create — partially addressed.** The create/update success path refreshed the grid by re-setting filter state (`setActiveFilters((prev) => ({ ...prev } as SchoolYearFilterValues))`), a cast-driven hack that reused the filter dependency as a refresh signal. Replaced with the `refreshKey` counter every other management screen uses (`dependencies={[activeFilters, refreshKey]}`). Verified statically that the rest of the path is sound: `fn_create_school_year(p_code, p_label, p_start_date, p_end_date, p_is_active)` matches `createSchoolYear` exactly, the function carries no `fn_assert_role` guard (so it cannot 403), and `listSchoolYears` maps absent filters to SQL `NULL`. If create still fails at repro, read the RPC's own `{ success:false, message }` toast (duplicate code / end-date-before-start) before changing any SQL.
- **R2 program level edit — no defect found statically; needs repro.** Audited the whole save path: `fn_update_program_level(p_program_level_id, p_code, p_label, p_description)` matches `updateProgramLevel`; the retrofit guard is `fn_assert_role('Dean', 'Admin')`, correct for this screen; `selectedId` is set before the modal opens and survives view→edit; the Save button is `type="submit" form={UPDATE_FORM_ID}` and `ProgramLevelForm` renders that `id` on a real `<form>`; `onConfirmClose` only drives the discard prompt, never the save; `TableActionCell` calls `stopPropagation`, so the row-click view modal does not open on top of the edit modal; and `ValidCommonInput` never forwards `disabled` into `useController`, so the read-only view form sharing `updateMethods.control` cannot blank the submitted values. Remaining candidates are runtime only: a `{ success:false }` payload surfaced as a toast, or the live DB diverging from `docs/sql` the way `fn_update_user` did (B5). Capture the toast / network response at repro before touching SQL.

### R1 / R2 second pass — shared-control + live-signature fixes

Neither symptom reproduces from a static read of the happy path (see the two audits above), so this pass removed the three structural defects that could produce exactly these symptoms and normalised both RPCs on live. **Still unconfirmed against a runtime repro** — if either screen still misbehaves, capture the toast / network response, because every silent path is now gone.

**Frontend (`src/pages/admin/school-year-management/index.tsx`, `.../SchoolYearForm.tsx`, `src/pages/dean/program-management/level/index.tsx`)**

1. **View and edit shared one `useForm`.** Both screens rendered the view modal and the update modal from the same `updateMethods.control`, with the view instance passing `disabled` and `rules: undefined` for every field. `TableModals` mounts the update modal *before* the view modal, so the view instance's `useController` registered last and overwrote the shared field entries — stripping the `required` rules and re-pointing `_f.ref` at inputs that unmount when the view dialog closes. Each screen now owns a separate `viewMethods` form; `loadIntoForm(id, methods)` takes the target form so view and edit can never touch each other's state.
2. **`handleSwitchToEdit` never set `selectedId`.** It relied on `handleOpenView` having set it earlier, and `handleUpdateSubmit` opens with `if (!selectedId) return;` — a **silent** no-op that looks exactly like "Save does nothing". Both screens now `setSelectedId(id)` in `handleSwitchToEdit`, and the guard raises an error toast instead of returning quietly, so a lost id can never be invisible again.
3. **School-year code auto-fill clobbered manual edits (R1 only).** The `isNew` effect in `SchoolYearForm` rewrote `code`/`label` on every date change, and the generated code is deterministically `SY-<startYear>-<endYear>` — which collides with `uidx_school_years_code` for any second school year spanning the same year pair, and wiped the user's corrected code the moment they nudged a date. The effect now writes each field only while it is not dirty, and both fields carry helper text (the code field states it must be unique).

**SQL — `docs/sql/qa-r1-r2-fixes.sql` (awaiting manual apply)**

- Drops the stale 5-arg `fn_list_school_years_json(integer,integer,text,jsonb,boolean)`. Live carries **two** overloads (5-arg and 6-arg) — the fingerprint of a signature change applied without dropping the old one, the same failure mode as `fn_update_user` (B5), and a standing PostgREST `PGRST203` hazard for any caller that omits `p_year`.
- Recreates `fn_create_school_year` at the canonical 5-param signature, dropping the 4-param shape first. The Phase-7 retrofit guarded `fn_update_school_year`/`fn_delete_school_year` but **skipped create**, so it now `PERFORM public.fn_assert_role('Admin')` like its siblings, gains `SET search_path = public`, and returns a soft `{ success:false, message }` for null/blank code, label, or dates instead of failing on a NOT NULL violation.
- Recreates `fn_update_program_level` at the canonical 4-param signature, dropping the 3-param shape, with the `fn_assert_role('Dean','Admin')` guard, `SET search_path = public`, and soft messages for a null id or blank code/label.
- Both functions trim inputs before the uniqueness check and the write, so a trailing space can no longer slip past the duplicate check and then land in the table. Grants mirror `docs/sql/rbac-guard.sql` (`REVOKE ... FROM anon`, `GRANT ... TO authenticated`).


## Phase 5 — Content & small features

- **F4 Arellano hymn & core values (🟡 built, text unverified):** decision — **panel on the student dashboard**. Content was sourced from the web rather than supplied by the user. New `src/constants/institution.constant.ts` holds the name/campus, vision, mission, six core-value labels, and the hymn as `string[][]` (two verses, one entry per line), so any correction is a one-file edit. New `src/components/dashboard/InstitutionalIdentityCard.tsx` renders a `CommonCard` ("Our Identity") with a small pill `CommonTabMenu` over three panels — Hymn (two verses side-by-side on desktop), Vision & Mission, Core Values (grid of seal-check tiles). Tabbed rather than stacked because the hymn alone is 16 lines and would push the feed cards off-screen. Rendered last on `StudentDashboard.tsx`, below the announcements/events row. Build + lint clean.
    - **Open — verify before thesis submission.** Vision and Mission are confirmed verbatim from `arellano.edu.ph/about/vision-and-mission/`. The **hymn lyrics came from search snippets and student-upload sites**, not a clean read of the official page — check punctuation and the `nami't` / `mo'y` forms against `arellano.edu.ph/about/arellano-hymn/`. The **six core values** (Competence, Humility, Integrity, Equity, Fortitude, Stewardship) appear only in secondary sources; the official `about/philosophy/` page instead publishes a philosophy statement + four objectives. Confirm which framing JAS uses. Values render as **labels only** — no descriptions were found, and none were invented.
    - **No seal/logo asset** — none supplied and none taken from the web. Card renders fine without it; drop a file into `src/assets/` to add one.
- **F3 admin reset password (✅ done):** decision — **secure recovery email**. Added `resetUserPassword(email)` in `src/services/user.service.ts` (`supabaseAdmin.auth.resetPasswordForEmail` → `/set-password`, same flow as `resendInvite`) and a **"Reset Password"** row action in `src/pages/admin/user-management/hooks/useUserTableConfig.tsx`, `disabled` unless `status === 'Active'` (complements Resend Invite, which is enabled only for non-Active). Success/error surfaced via `useToastStore.showToast`. Build + lint clean.
- **Grades empty-state (✅ done):** `src/pages/student/subject/SubjectGradeList.tsx` now renders an explanatory empty block ("No grades to show yet" + why: instructor must set up grading periods and release) when `grades.length === 0`, instead of the bare AG-Grid overlay. Root cause is a data-config gap (no grading periods / not released), not a fetch bug — the table simply received `[]`. Build + lint clean.

## Phase 6 — F2 Batch year/sem progression + auto-enroll

New registrar screen at `/registrar/batch-progression` ("Batch Progression" in the sidebar). Backend authored in `docs/sql/batch-progression.sql` — **awaiting manual apply**; the screen will error until then.

**Progression rule (deterministic, DB-side).** A student advances a year level only when the target term starts a *new school year* for them. Concretely, `fn_list_progression_candidates` promotes when the student is Active, has a program, has non-dropped enrollments in an *earlier* school year, has **no** enrollments in the target school year, and has no prior `Year Level Progression` lifecycle event for that school year. Second-semester runs therefore keep the year level; a brand-new student with no history keeps theirs too. Blockers (`INACTIVE`, `NO_PROGRAM`, `PROGRAM_COMPLETE` — already in the program's final year) are reported per row and skipped, never silently dropped.

**Idempotency.** `student_lifecycle_events` gained a nullable `term_id` column (plus `Year Level Progression` added to `chk_student_lifecycle_event_type`), so a re-run against the same school year finds the existing event and refuses to double-promote while still filling in any enrollments that failed the first time.

**Auto-enroll.** `fn_plan_progression_sections` resolves the student's non-elective `curriculum_maps` rows for the proposed year level, matched on the target term's `term_type_id` and `school_year_id` (NULL on the map = applies to any). For each course it picks one section in the target term — not Closed/Cancelled, not full, conflict-free sections preferred, then by `section_code`. Each row carries an `issue_code` (`ALREADY_TAKEN` / `NO_SECTION` / `SCHEDULE_CONFLICT`) so the preview explains gaps rather than hiding them. Actual writes go through the existing `fn_enroll_student_section`, so every guard it owns (curriculum membership, slots, prerequisites, conflicts, duplicates) still applies; `ALREADY_TAKEN` is treated as a no-op, not an error.

**Two RPCs, preview-then-commit.** `fn_preview_batch_progression` is read-only and returns per-student rows plus counts; `fn_run_batch_progression` performs the same resolution and writes in one transaction, returning a per-student result list. Both `PERFORM fn_assert_role('Registrar', 'Admin')`. The run is capped at 500 students and refuses larger batches with a message to narrow the filters.

**Frontend.** `src/services/progression.service.ts`, `src/types/progression.type.ts`, and `src/pages/registrar/batch-progression/` (cohort form, preview columns, per-student detail modal, run-result modal). Nothing is written until the confirm prompt; after a run the preview auto-refreshes so the screen shows the new steady state. Verified with `npm run build-dev` (tsc + vite, exit 0) and `eslint` on the touched files (clean).

## Phase 6 — F1 Separate lab & lec — REJECTED, DO NOT REBUILD

**F1 was built, then removed. The requirement it targeted is already met by a mechanism that predates it.** Both the SQL (`docs/sql/lecture-lab-separation.sql`) and the frontend work were deleted on 2026-07-27. Read this section before proposing any lecture/lab schema work.

### The requirement was already satisfied

`courses.is_split` is **not a column** — it is a create-time flag on `fn_create_course`. With `p_is_split = true` the RPC writes **two `courses` rows**, `<CODE>_LEC` and `<CODE>_LAB`, each carrying its own `lecture_units` / `laboratory_units`. From that point they are two ordinary, independent courses: separate `curriculum_maps` entries, separate `sections`, separate `enrollments`, separate `section_final_grades`, separate transcript lines. That is exactly the "enrolled separately, printed as separate report-card lines" requirement, with no additional schema.

F1 introduced a **second, parallel** model — one `courses` row plus `sections.delivery_mode`, with `fn_student_course_attempts()` re-merging the components afterward for the audit. Since F1 never redefined `fn_create_course`, applying it would have left **both** models live at once: a dean could create `CS101_LEC` *and* give it a Laboratory-mode section.

### Why the `delivery_mode` model was the wrong one

F1's merge groups by `(term_id, course_id)`, so it only reconstructs a course correctly when both components sit in the **same term**. `fn_get_curriculum_audit` then took `DISTINCT ON (course_id)` — one attempt per course, preferring a passing one — and credited the course's full `total_units`.

Consequence: a student who passes the lecture in one term and takes the lab in a later term gets the **whole course credited from the lecture alone**, and the outstanding lab requirement disappears from the audit. The user hit exactly this in real life — transferring in with a 2-unit course against AU's 3-unit lec/lab split, and needing to enrol in the lab alone to close the deficiency. Component-only enrolment is a real, recurring flow (transfer credit, unit deficiency, single-component retake), not an edge case.

The two-course model has no such failure: `_LEC` and `_LAB` are separate curriculum requirements at their own unit values, so passing one credits only its units and the other stays outstanding regardless of term.

`courses.total_units` is `GENERATED ALWAYS AS (lecture_units + laboratory_units) STORED`, so units stay consistent under either model — that was never the deciding factor.

### What was removed

- Deleted `docs/sql/lecture-lab-separation.sql` (never applied to live — no DB state to unwind).
- Deleted `src/constants/delivery-mode.constant.ts`.
- Reverted `src/services/section.service.ts`, `SectionForm.tsx`, `SectionFilterForm.tsx`, `useSectionTableConfig.tsx`, `src/pages/faculty/sections/index.tsx`, `src/pages/student/grade/index.tsx`, `src/pages/student/subject/index.tsx` (all F1-only diffs).
- Surgically removed the mode picker/filter/CSV column from `src/pages/dean/section-management/index.tsx` and `DeliveryMode` from the section/faculty/records/student-portal types, preserving the Phase 3–5 work living in those same files (notably the U8 filter Reset).
- Verified with `npm run build-dev` (tsc + vite, exit 0) and `eslint` on the touched files (clean). Zero `delivery_mode` references remain in `src/`.

### Known gaps in the surviving two-course model (not defects introduced here)

- `is_split` has no backing column, so `fn_get_course_by_id` cannot return it — the dean's course **edit** form reads `result.data.is_split` and gets `undefined` ([course-management/index.tsx:91](src/pages/dean/course-management/index.tsx#L91)). The create path works; only round-tripping is broken.
- Nothing records that `<CODE>_LEC` and `<CODE>_LAB` originated from the same parent course. Pairing today is by code convention only.
- No auto-pairing at enrolment: the registrar enrols the student into each course separately. If that becomes tedious, the increment is a shared `section_group_id` (symmetric, with a partial unique index on `(section_group_id, delivery_mode)`) driving **defaults only** — never a mandatory co-enrolment rule, which would break the component-only flow described above.

## Verification checklist

No automated tests exist. Use `npm run build-dev` + `npm run lint` (touched files only), then manual runthrough on `npm run dev`:
- Student: schedule color saves (B1); assessment starts, no `started_at` error (B2); Grades render.
- Admin: dashboard shows real numbers (B3); create school year (R1) + term (B6) → row appears; edit user roles → no 404 (B5); create announcement/event with Global + Section audiences → no `uuid: ""` (B4).
- Faculty: create/delete attendance session + save attendance → no logout, clean toast on denial (S1 + B7); assessment builder shows grading components (B8).
- Dean: edit program level saves (R2).
- Frontend: header tooltips on hover (U2); no idle sort arrows (U3); stat cards navigate (U5); back works on View Announcement/Event (U6); one Settings gear per sidebar (U9); password stays visible after invalid login (U1); Enroll button visible at 100% zoom (U7); year filter 1st–4th + Reset (U8).
- Routing: correct "{Role} Panel" (U4); Settings reachable without 403 (R3).
