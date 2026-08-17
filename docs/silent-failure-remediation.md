# Silent Failure Remediation

Execution tracker for the "the app knows, but never tells the user" class of bug. Origin: a QA tester set a 5-character password on `/set-password`, got a red border and no message, and had no way to know what was wrong. The audit that followed found the same shape in several other places. This doc is the source of truth so any session can resume — read the Status table, then execute the requested phase using the per-item detail below.

## How to execute (for a fresh session)

1. Read the **Status** table to see what is done vs pending.
2. The user will name a phase or an item ID (e.g. "execute Phase 2", "do SF3"). Do only what is asked.
3. Verify frontend fixes with `npm run build-dev` (this runs `tsc -b` — it is the typecheck; there is no test runner) and `npx eslint <touched files>`. Do **not** run project-wide `lint:fix` — it churns unrelated files and collides with the user's parallel commits.
4. Any SQL is authored as `docs/sql/*.sql`. There is no migration runner; the **user applies it to the live Supabase DB manually**. Mark such items "authored (awaiting apply)".
5. Update the Status table after each item, and record what you verified.

## The systemic root cause

Three repo-wide decisions combine so that a failure can reach the user as *nothing at all*:

1. **Feedback was opt-in.** `hasHelper` defaulted to `false` in every `ValidCommon*` wrapper, so a form that forgot the prop rendered a red border with no message. Fixed in Phase 1 — the default is now `true`.
2. **`no-console` is enforced** and the standards explicitly bless silent returns, so a swallowed failure leaves no devtools trace either. There is no second channel.
3. **Disabled state carries the reason implicitly.** Controls are disabled on a condition the user cannot see (record not yet saved, weights already at 100%, nothing selected), and only some sites print that reason.

The rule this workstream enforces: **every path that can fail, or that blocks the user, must render a reason.** Styling alone (a red border, a greyed button) is not a message.

## Status

| ID | Item | Phase | Status |
|---|---|---|---|
| SF1 | Inline validation messages never rendered (`hasHelper` opt-in) | 1 | ✅ done (build + lint pass) |
| SF1b | `text-area` / `checkbox` had no error surface at all | 1 | ✅ done (build + lint pass) |
| SF2 | Disabled controls with no stated reason | 2 | ✅ done (build + lint pass) |
| SF3 | CSV bulk import silently mangles / drops data | 3 | ✅ done (build + lint pass, 14 parser cases pass) |
| SF4 | `formErrors` lost the `window.alert` CLAUDE.md still documents | 4 | ✅ done — option (a) form-level summary (build + lint pass) |
| SF5 | Errors on inactive tabs/steps are invisible | 4 | ✅ closed — repro ruled out; tab boundary = form boundary |
| SF6 | `{ silent: true }` reads fail as "empty data" | 5 | ✅ done — `silent` split into `background` + `silent` (build + lint pass) |
| SF7 | Write RPCs that return no `{success, message}` confirm nothing | 5 | ✅ done — 98 write RPCs audited; 1 real defect fixed (SQL awaiting apply) |
| SF8 | Flows that bypass the service wrapper entirely | 5 | ✅ done — new `callStorage` wrapper + `refreshSession` (build + lint pass) |

Legend: ✅ done · 🟡 partial / needs runtime repro · ⬜ not started · ❌ rejected

---

## Phase 1 — DONE

### SF1 — Inline validation messages never rendered

**Symptom.** QA typed a 5-character password on `/set-password`. The field turned red; no text explained why; Save appeared to do nothing.

**Cause.** `ValidCommonInput` gates `helperText` behind a `hasHelper` prop (`src/components/input/ValidCommonInput.tsx`), which defaulted to `false`. `SetPasswordPage` never passed it. `formErrors` only moves focus, so there was no fallback.

**Fix applied.**

- `hasHelper` now defaults to `true` in `src/components/form/CommonForm.tsx` and `src/components/form/FormField.tsx`, which covers every `CommonForm`-driven screen (~50 management forms) in one change.
- Same default in all eight wrappers, so directly-composed fields cannot regress: `ValidCommonInput`, `ValidCommonNumberInput`, `ValidCommonSelect`, `ValidCommonMultiSelect`, `ValidCommonDatepicker`, `ValidCommonDateTimepicker`, `ValidCommonTextArea`, `ValidCommonCheckbox`.
- `src/pages/auth/SetPasswordPage.tsx`: `hasHelper` + descriptive `helperText` on both fields, plus `deps: ['confirm_password']` so the mismatch error clears when the user edits the *first* field.
- `src/pages/auth/LoginPage.tsx`: same missing `hasHelper` on email and password.
- `src/pages/faculty/sections/rubrics/RubricBuilderPage.tsx` (Criterion, Max Points) and `src/pages/registrar/enrollment-management/EnrollmentWorkspaceModal.tsx` (both override checkboxes) — the only remaining direct usages that had `rules` but no `hasHelper`.

### SF1b — `text-area` and `checkbox` had no error surface

`FormField` dropped `hasHelper` on those two branches, and neither underlying component rendered a message. Required fields blocked submit with zero feedback — e.g. `question_text` in the assessment `QuestionModal`, and the prerequisite/conflict override checkboxes in `EnrollmentWorkspaceModal`.

Both branches now forward `hasHelper`, and `ValidCommonTextArea` / `ValidCommonCheckbox` render the message themselves in a `<span>` below the control.

**Layout note for future work.** `CommonTextarea` positions its character counter `absolute; bottom: 12px` inside its own container, so MUI `helperText` would be overlapped by the counter. That is why the textarea message is rendered *outside* the `CommonTextarea` container rather than passed as `helperText`. Do not "simplify" this back.

**Distortion guarantee.** Helper text is only emitted when a message exists, so idle forms render pixel-identical to before; height changes only on error. Verified the row-layout checkbox call sites (`SpecialGradeItem`, `AssessmentSettingsForm`) carry no rules, so their alignment is unchanged.

**Verified.** `npm run build-dev` (tsc + vite) and `npx eslint` on all touched paths pass.

**Not yet re-tested by QA.** Worth a targeted sweep on the assessment question builder and the enrollment override modals — those are where missing feedback most looked like a dead Save button.

---

## Phase 2 — DONE

### SF2 — Disabled controls with no stated reason

Controls were disabled on a condition the user had no way to infer, with no adjacent text. Each now renders its reason next to the control, following `GradingComponentPanel.tsx:151-157` — a short conditional line in `text-(--mui-palette-text-secondary) text-xs`, or `warning-main` when the condition blocks the primary action.

| File | Condition | Message added |
|---|---|---|
| `src/pages/faculty/sections/assessments/builder/QuestionList.tsx` | `!assessmentDbId` | "Save the assessment settings first to add or import questions." (`warning-main`, in the header beside the two disabled buttons) |
| `src/pages/faculty/sections/assessments/builder/RubricAttachPanel.tsx` | `!rubricId` | "Attach a rubric above to score submissions with it." |
| `src/pages/faculty/sections/grading/GradeSheetPanel.tsx` | `components.length === 0` | "Add at least one grading component before grades can be calculated." (`warning-main`) |
| `src/pages/faculty/sections/attendance/AttendanceRecordList.tsx` | `!isDirty` | "All attendance changes are saved. Change a status to enable saving." |
| `src/pages/registrar/batch-progression/index.tsx` | `!hasWork` | Two-state: no preview yet → "Preview the cohort first — Run Progression stays disabled until there are proposed changes."; preview returned nothing → "This cohort has nothing to promote or enroll for the selected term. Adjust the programs, year levels, or term and preview again." |

**Notes.**

- `QuestionList` already had a centered "Save the assessment settings first…" empty state in the body. It is kept — the new line sits in the header so the reason is adjacent to the disabled buttons themselves, which is where the user clicks.
- The `RubricAttachPanel` row is `sm:flex-row sm:items-end`; the toggle button was wrapped in a `flex-col` so the message stacks under it without breaking the row alignment.
- `GradeSheetPanel` and `AttendanceRecordList` header spans were wrapped in a `flex-col` for the same reason.
- Batch progression's button row became `flex-wrap … items-center` with the message pushed left via `mr-auto`.
- Every message is conditional, so the non-blocked state renders exactly as before.

**Verified.** `npm run build-dev` (tsc -b + vite) passes; `npx eslint` on all five touched files reports zero problems.

---

## Phase 3 — DONE

### SF3 — CSV bulk import silently mangled data

All four defects fixed in `src/components/modal/BulkImportModal.tsx`. The preview step, `structuredErrors` grid, and results summary are untouched — this phase only changed what reaches them.

1. **Quoted fields.** `line.split(',')` is replaced by `splitCsvRecords`, an RFC 4180 state machine handling quoted values, `""` escapes, commas and newlines inside quotes, and CR/LF or CRLF line endings. Fully-blank records are dropped, so trailing newlines and blank separator lines no longer produce phantom rows.
2. **Header reporting.** Headers are matched case- and whitespace-insensitively. `parseCsv` now returns `{ rows, missingHeaders, unknownHeaders }`. A missing required column **blocks** the import at the upload step with the offending labels named; unrecognized columns are non-blocking and surface as a warning line at the top of the preview, since their data is silently discarded.
3. **Hint row.** `isHintRecord` compares the first data record against the template's own `hint` values and skips it if they all match. The template keeps its hints (they are the only per-column documentation the user gets), and a downloaded-then-filled template imports only the real rows.
4. **`reader.onerror` / `onabort`** now set a named error mentioning the file, e.g. *"…could not be read. Check that the file is not open in another program."*

**Also fixed while here.** `downloadTemplate` did not escape its own output — `escapeCsvValue` was added. The user-management template's Role hint is literally `Admin, Faculty, Student, Registrar, Dean`, so **the template the app generated could not be parsed by the app**: those four commas shifted every column. Two call-site hints that told users to avoid commas (`src/pages/admin/evaluation-management/index.tsx`) were dropped, since that constraint no longer exists.

**Verified.** `npm run build-dev` (tsc -b + vite) and `npx eslint` on both touched files pass. The parser and `downloadTemplate` were additionally extracted into a scratch harness and run against 14 cases — all pass: template round-trip imports zero data rows; `"Dela Cruz, Jr."` and `"O""Brien, Ana"` survive intact; a newline inside quotes stays one row; a typo'd header appears in *both* `missingHeaders` and `unknownHeaders`; extra columns are flagged and dropped; lowercase/padded headers still match; blank lines, header-only and empty files yield no rows; a genuine data row is never mistaken for the hint row; trailing empty values stay `''`.

**Not runtime-tested.** No live upload was performed against a real management screen — worth one pass on user-management (the comma-heavy template) and course-management (the `|`-delimited prerequisites column).

---

## Phase 4 — Form-level error surfacing

### SF4 — `formErrors` lost its alert

**Status:** ✅ done. The user chose **(a) — the form-level summary**.

`setFocus` is a no-op on an unmounted or hidden field, so a form whose only invalid field sat off-screen produced no visible feedback. `formErrors` had since gained a `FORM_ERROR_EVENT` → `CommonToast` warning toast, but a transient toast still does not point at *which* fields are wrong.

**What was built.**

- `checkForMessage` now also returns `list: ErrorMessageProps<T>[]` — every error, not just the first. `count` and `firstError` are unchanged, so existing callers are unaffected.
- `formatFieldLabel(key)` was extracted into `src/utils/form.util.ts` (it was a local `formatLabel` inside `CommonForm`). It strips numeric path segments, so `components.2.weight` renders as "Weight".
- **New component `src/components/form/FormErrorSummary.tsx`.** Takes `control`, subscribes via `useFormState`, and renders nothing until `submitCount > 0` — so it never fires on a pristine form. On a failed submit it renders a bordered `error-main` block: a headline count plus a bulleted `<label> — <message>` line per invalid field.
- Entries are deliberately **not** clickable. A hidden-tab field is not in the DOM, so a click handler would be a silent no-op — the exact bug class this workstream exists to remove.

**Wiring.** `CommonForm` renders it at the foot of the `<form>` behind a `hasErrorSummary` prop (default `true`), which covers **~42 forms at once**. The seven forms that compose fields directly rather than through `CommonForm` got it added by hand: all three auth pages (`SetPasswordPage` — the origin bug — `LoginPage`, `ForgotPasswordPage`), `academic-threshold-management/index.tsx`, `TransmutationTab.tsx`, `EnrollmentWorkspaceModal.tsx`, `ReleaseScheduleForm.tsx`. `PeriodModalForm` needed no change: its `PeriodForm` child uses `CommonForm`, and the summary walks the whole error tree, so the `components` field-array rows surface there too.

**Zero-distortion.** The component returns `null` when the form is clean or unsubmitted, so idle layout is pixel-identical.

**Verified.** `npm run build-dev` (tsc + vite) and `npx eslint` on all ten touched paths pass. **Not runtime-tested** — no test runner exists; a QA pass on `/set-password` with a 5-character password is the direct repro.

**Note on `CLAUDE.md`.** §4 already describes the current behaviour accurately (focus, scroll, `FORM_ERROR_EVENT` toast, explicitly *not* `window.alert`). The "handles `window.alert`" claim this item was filed against is gone. §4 should now also mention the summary.

### SF5 — Errors on inactive tabs/steps are invisible

**Status:** ✅ closed — **repro ruled out** for every named file. No code change was needed beyond SF4.

The item was filed as "unverified, inferred from tabs and forms coexisting". The repro pass found the inference does not hold. **A tab boundary is also a form boundary in this codebase**, so a form's fields can never be hidden from its own submit button:

| File | Finding |
|---|---|
| `SectionDetailPage.tsx` | Tabs render independent panels (students / attendance / grading / assessments / rubrics / content / discussion / insight). No form spans them. |
| `StudentRecordsPage.tsx` | Tabs render independent read views (transcript / checklist / insight / lifecycle). |
| `shared/profile/index.tsx` | **Two separate `useForm` instances** — `profileMethods` on the details tab, `passwordMethods` on the security tab. Each submit button sits on the same tab as its own fields. |
| `admin/grading-config-management/index.tsx` | Three tabs, each owning its own form and Save button. |

**The "steps" half is moot: `CommonStepper` does not exist.** There is no `src/components/stepper/` directory — only an orphaned `src/types/stepper.type.ts`. CLAUDE.md §4 lists `@components/stepper/CommonStepper` in its component table; that row points at nothing.

**The one real variant of this bug — conditionally rendered fields — is already handled.** A field rendered behind a condition (`{allowConflict && <ValidCommonInput rules={{required}} />}`) unmounts while its error persists in `formState.errors`, blocking submit invisibly. React Hook Form's `shouldUnregister` defaults to `false`, which would preserve exactly that stale error. `EnrollmentWorkspaceModal.tsx:91` — the only place in the codebase nesting validated fields behind a runtime condition — already sets `shouldUnregister: true`, so those fields deregister and their errors clear.

Belt-and-braces, the SF4 `FormErrorSummary` would surface any such stale error by name rather than leaving Save inert.

**Done:** repro ruled out for all four files; steppers confirmed non-existent; conditional-field case confirmed already correct.

---

## Phase 5 — Silent service surfaces

### SF6 — `{ silent: true }` reads fail as "empty data"

**Status:** ✅ done.

**The filed premise was wrong, and the real bug was worse.** This item assumed `{ silent: true }` suppresses the error toast. It did not — in `callRpc` and `callFunction`, `notify(...)` was called **unconditionally** on every error path. `silent` only suppressed the **loading overlay** there. But `callQuery` and `callSingle` *did* gate the toast on it.

So `silent` meant two different things depending on which wrapper you called, and the flag's name is what misled this very audit. Two live consequences ran in opposite directions:

- The 60-second unread-notification **poll toasted on every failed tick** — a permanently offline backend would stack a toast a minute.
- `recordFocusEvent`, which fires on **every window blur during a proctored exam**, toasted the student mid-exam.
- `askAssistant` renders its own in-chat error bubble *and* toasted — double-reporting the same failure.

**The fix: one flag became two, honoured identically by all four wrappers.**

| Option | Meaning |
|---|---|
| `background: true` | Suppress the global loading overlay. **Errors still toast.** |
| `silent: true` | Suppress the toast. Implies `background` — a silent call is by definition a background one, so old `{ silent: true }` call sites keep their previous no-overlay behaviour. |

Every call site was then re-declared by intent:

| Call site | Now | Why |
|---|---|---|
| `getUnreadNotificationCount` | `background + silent` | 60s poll — the only genuinely defensible silence |
| `recordFocusEvent` | `background + silent` | fires on every blur during an exam |
| `askAssistant` | `background + silent` | renders its own error bubble in the chat |
| `listMyAnnouncementsFeed`, `listMyEventsFeed` | `background + silent` | **refresh on every window focus** — a toast would fire on every refocus; these report inline instead (below) |
| `listMyNotifications` | `background` | panel has its own spinner; failures must be visible |
| `markMyNotificationsRead` / `Unread` | `background` | writes |
| `markMaterialComplete` | `background` | write |
| `saveStudentAnswerFiles` | `background` | **a student's exam file answers** |

**The dashboard feeds got a real inline error state.** They were the clearest instance of the original complaint: a failed fetch rendered "No announcements right now." / "No upcoming events." — indistinguishable from genuine emptiness. `useDashboardFeeds` now returns `announcementsError` / `eventsError`; `AnnouncementsFeedCard` and `EventsFeedCard` take an `error` prop and render a red warning block with the reason **instead of** the empty state (`{!error && items.length === 0}`). Wired through all five dashboards (admin, dean, faculty, registrar, student).

**Two doc corrections.** `faculty-load.service.ts:29` no longer passes `silent` — the schedule-conflict panel was fixed in an earlier round, so the "only silent RPC in the codebase" note in [05 §10](system/05-role-dean.md) is stale. And the "latent trap" note below was already false: `callQuery`/`callSingle` **do** notify when `!isSilent`.

**Verified.** `npm run build-dev` and `npx eslint` on all 15 touched files pass.

### SF7 — Writes that confirm nothing

**Status:** ✅ audit done, one real defect found and fixed (SQL awaiting apply).

**Method.** Extracted every `fn_*` name reached through `callRpc`/`callFunction` in `src/services/` (217 total, **98 on write paths**), matched each against its newest definition in `docs/sql/` (cumulative — last file wins), then parsed **balanced `jsonb_build_object(...)` blocks** and flagged any block containing `'success', true` but no `'message'`.

> **Method note for future audits.** A naive "does the body contain `'message'`" grep reports **zero** hits, because almost every function carries `'message', SQLERRM` in its `EXCEPTION` handler. The success path must be tested separately or the audit silently passes everything.

**Result: 8 write RPCs return a success payload with no `message`, so `isRpcSuccessPayload` never matches and no toast fires.** Six are correct as they stand:

| RPC | Verdict |
|---|---|
| `fn_record_focus_event`, `fn_record_heartbeat` | ✅ correct — proctoring telemetry, fires constantly |
| `fn_mark_my_notifications_read` / `_unread` | ✅ correct — per-click toggles; the row state is the confirmation |
| `fn_mark_material_complete` | ✅ correct — the checkbox itself is the confirmation |
| `fn_start_assessment_timer` | ✅ correct — the UI transitions into the exam |
| `fn_bulk_import_questions` | ✅ correct — returns `provisioned_count` + structured per-row `errors`, which the import modal already renders in full |
| **`fn_calculate_all_grades_for_period`** | 🔴 **real defect** |

**The one real defect.** Faculty press "Calculate Grades" and get **nothing** — no toast, no confirmation. Worse, the RPC returns a `failures[]` array naming each student whose grade could not be computed, and the frontend **discarded it entirely** (`ServiceResult<null>`, and `GradingTab` only checked `result.error`). Grades silently failed to compute for individual students with no indication which, or why.

**Fixed on both sides:**

- **SQL** — `docs/sql/sf7-grade-calculation-feedback.sql` (**awaiting manual apply**). Adds a `message` summarising the outcome in four cases (nothing enrolled / all succeeded / all failed / partial), and enriches each failure with `student_number` and `full_name` by joining `students` and `users` — the old payload returned a bare `enrollment_id`, which is useless in a UI. Loop order is now by student name.
- **Frontend** (works today, before the SQL is applied) — new `GradeCalculationResult` / `GradeCalculationFailure` types; `calculateAllGradesForPeriod` returns the real shape; `GradingTab` holds the failures in state; `GradeSheetPanel` renders a dismissible red panel listing every student who failed and the reason.

**Verified.** `npm run build-dev` and `npx eslint` pass. The message toast will not appear until the SQL is applied; the failure panel works regardless.

**22 write RPCs could not be audited** — they have no definition anywhere in `docs/sql/` (live-only, per the known `docs/sql` ⟷ live drift): `fn_bulk_create_curriculum_map`, `fn_bulk_create_students`, `fn_bulk_delete_departments`, `fn_bulk_delete_sections`, `fn_bulk_delete_students`, `fn_bulk_delete_users`, `fn_create_assessment_attachment`, `fn_create_curriculum_map_entry`, `fn_create_department`, `fn_create_student`, `fn_delete_assessment`, `fn_delete_assessment_attachment`, `fn_delete_curriculum_map_entry`, `fn_delete_department`, `fn_delete_question`, `fn_delete_role`, `fn_delete_school_year`, `fn_delete_section`, `fn_delete_special_grade_config`, `fn_delete_student`, `fn_publish_assessment`, `fn_save_student_answer`. Checking these needs a live introspection query, not a repo grep.

### SF8 — Flows that bypass the wrapper

**Status:** ✅ done.

**`refreshSession` — the worst of the three.** `ProtectedLayout` called `await supabase.auth.refreshSession()` and threw the result away. The user clicks **"Stay logged in"** on the timeout modal, the refresh fails, the modal closes, the idle timer resets — and they carry on working against a **dead session**, discovering it only when the next action 401s. Now: a `refreshSession()` in `@services/auth.service` returns a proper `ServiceResult<Session>` (treating a missing session as an error, not just a thrown one), and `ProtectedLayout` toasts the reason and logs out rather than pretending the renewal worked. This also removes a direct `supabase` import from a component, which §7 forbids.

**Storage had no wrapper at all.** `storage.service.ts` returned well-formed `ServiceResult`s, but **nothing showed loading and nothing toasted** — so any caller that ignored the result failed completely silently, and every caller had to remember to render the error itself. Three more services bypassed `storage.service` entirely with their own inline `supabase.storage` calls.

**New `callStorage` wrapper** in `supabase.wrapper.ts`, matching the existing contract exactly — loading overlay, error toast, 401/403 redirect, and the same `background` / `silent` options from SF6. Every storage path now routes through it:

| File | Operation | Options |
|---|---|---|
| `storage.service.ts` | `uploadFile`, `deleteFile` | default (overlay + toast) |
| `storage.service.ts` | `getFileUrl`, `listFiles` | `background` — URL resolution shouldn't flash a spinner |
| `student-portal.service.ts` | `uploadSubmissionFile` | default |
| `assessment.service.ts` | attachment upload | default |
| `discussion.service.ts` | `uploadDiscussionFile` | default |
| `discussion.service.ts` | `getDiscussionFileUrl` | `background` |

**A fourth bypass found during the pass.** `getAttachmentSignedUrl` returned a bare `string` and swallowed its error, returning `''`. Both callers did `if (!url) return;` — a **completely silent no-op**: the student or faculty clicks Download and nothing happens, forever, with no way to tell why. It now returns `ServiceResult<string>` through `callStorage`; both call sites updated.

**Verified.** `npm run build-dev` and `npx eslint` pass.

> The tracker listed `AssessmentAttachmentPanel.tsx` as an audit target without noticing it **had no importer at all**. That is tracked separately — see "Assessment attachments were unreachable" below.

---

## Phase 6 — Adjacent defects found during Phase 5

These were not SF items. They surfaced while auditing, and are the same failure class.

### Assessment attachments were unreachable

`AssessmentAttachmentPanel.tsx` is a complete, working component — upload, download, delete, empty states, a disabled-reason line — that **nothing imported**. Faculty could not attach a file to an assessment at all. There was no error to report because the feature never rendered.

`AssessmentBuilderPage` now mounts it. Attachments are sourced from `listAssessments(sectionId)` and matched by id, because `attachments` lives on `AssessmentListRow` and **not** on the `fn_get_assessment_by_id` payload the builder otherwise uses. That avoids inventing a new RPC, so the fix works against the live DB today with no SQL to apply. If an `fn_get_assessment_attachments` is ever added, `refreshAttachments()` is the single place to swap.

### Editing any split course silently wiped its laboratory units

Tracked in [05 §7](system/05-role-dean.md) as 🔴 data loss on a routine action. `updateCourse` sent `p_laboratory_units: null` **hardcoded**, so editing a split course to fix a typo in its title erased the lab units. `courses.total_units` is a generated column (`lecture_units + laboratory_units`), so the credit value silently changed too.

Now sends `params.is_split ? Number(params.laboratory_units) || null : null` — matching what `createCourse` already did correctly.

### `is_split` did not round-trip into the edit form

`is_split` is a **create-time flag on `fn_create_course`, not a column** (see [13 §6](system/13-roadmap-and-status.md) — do not rebuild this as schema). So `fn_get_course_by_id` cannot return it, and the edit form read `undefined`, collapsing the laboratory-units field.

Fixed in the frontend without touching the schema: the form now derives `is_split: Number(result.data.laboratory_units) > 0` on load. A course with lab units *is* a split course, so the derivation is exact. Combined with the fix above, editing a split course now round-trips correctly.

---

## Conventions this workstream must respect

- No comments in generated TS/TSX/SQL (CLAUDE.md §6). Names carry the meaning.
- 4-space indent, single quotes, no trailing commas, no EOF newline, `function` declarations for components (§3).
- Zero relative imports — path aliases only (§3).
- No `<Typography>`/`<Box>`/`<Stack>`/`<Grid>`; HTML + Tailwind for layout and text, MUI only for interactive components (§9).
- Error copy is user-facing: say what is wrong and what to do, not "Invalid input".
