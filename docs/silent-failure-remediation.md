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
| SF3 | CSV bulk import silently mangles / drops data | 3 | ⬜ not started |
| SF4 | `formErrors` lost the `window.alert` CLAUDE.md still documents | 4 | ⬜ not started — needs a user decision, see item |
| SF5 | Errors on inactive tabs/steps are invisible | 4 | ⬜ not started — unverified, needs a repro pass first |
| SF6 | `{ silent: true }` reads fail as "empty data" | 5 | ⬜ not started |
| SF7 | Write RPCs that return no `{success, message}` confirm nothing | 5 | ⬜ not started — needs an RPC audit |
| SF8 | Flows that bypass the service wrapper entirely | 5 | ⬜ not started |

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

## Phase 3 — CSV bulk import silently mangles data

**Status:** not started. Verified by reading `src/components/modal/BulkImportModal.tsx:90-154`.

This one is worse than SF1: it fails quietly *into the database* rather than at the button. Four distinct defects:

1. **No quoted-field handling.** `parseCsv` does `line.split(',')`. A single value containing a comma (`"Dela Cruz, Juan"`, an address) shifts every subsequent column into the wrong field. Rows import successfully with scrambled data.
2. **Headers matched by exact label.** `templateColumns.find((col) => col.label === header)` — a renamed or typo'd header is silently skipped, so that field arrives empty with no warning. Should report unrecognized/missing headers before the preview step.
3. **The template's hint row is parsed as data.** `downloadTemplate` writes `[headers, hints]`; `parseCsv` takes `lines.slice(1)`, so the hint row becomes row 1 of the import. Either drop the hint row from the template, or detect and skip it on parse.
4. **`reader.onerror` is unhandled.** Selecting an unreadable file does literally nothing — no error, no state change. Same shape as the original password bug.

**Note:** CRLF is already safe — every value is `.trim()`ed, so the trailing `\r` is stripped.

**What is already good, keep it:** the preview step, the per-row `structuredErrors` grid, and the results summary are solid. This phase is about getting correct rows *into* that pipeline.

**Done when:** a CSV containing quoted commas round-trips correctly; a mismatched header is reported to the user before import; the template's own hint row never imports; an unreadable file shows an error.

---

## Phase 4 — Form-level error surfacing

### SF4 — `formErrors` lost its alert

**Status:** blocked on a user decision.

`CLAUDE.md` §4 states the `formErrors` utility "handles `window.alert` and automatic focus." `src/utils/form.util.ts:13-23` only calls `methods.setFocus`. The alert was the safety net for exactly the QA bug that started this workstream, and `setFocus` is a no-op on an unmounted or hidden field.

**Two valid resolutions — ask the user which:**

- (a) Restore a form-level summary (not `window.alert` — that is hostile UI and contradicts the move to inline helpers). A short error line or count near the submit button, reading from `checkForMessage`'s `count` and `firstError`, which already exist and are already computed.
- (b) Keep focus-only and update CLAUDE.md §4 to match the code.

Recommendation: (a) with an inline summary, since it also resolves SF5. `checkForMessage` already returns `{ count, firstError }` and is currently only half-used.

### SF5 — Errors on inactive tabs/steps are invisible

**Status:** not started, and **unverified** — inferred from tabs and forms coexisting. Confirm with a real repro before building anything.

Inline errors only help if the field is on screen. These files combine `CommonTabMenu`/`CommonStepper` with forms: `src/pages/faculty/sections/SectionDetailPage.tsx`, `src/pages/registrar/student-records/StudentRecordsPage.tsx`, `src/pages/shared/profile/index.tsx`, `src/pages/admin/grading-config-management/index.tsx`.

If a required field sits on an inactive tab, Save produces the exact original symptom: nothing visible happens. The fix is the SF4(a) summary plus, ideally, an error marker on the offending tab.

**Done when:** a repro is confirmed or ruled out for each file, and confirmed cases surface a form-level message.

---

## Phase 5 — Silent service surfaces

### SF6 — `{ silent: true }` reads fail as "empty data"

`callRpc(..., { silent: true })` suppresses the error toast. A failed fetch then renders as `0` / empty, which reads as *correct data* rather than an error. Call sites: `src/services/notification.service.ts` (3), `src/services/content.service.ts:128`, `src/services/faculty-load.service.ts:29`, `src/services/student-portal.service.ts:139`.

Silence is defensible for a background poll like the unread count; it is not defensible for content progress or faculty load, where the number is the whole point. Decide per call site: keep silent, or surface an inline error state in the consuming component.

**Latent trap, no live instances:** `callQuery` and `callSingle` return errors with **no toast at all**, unlike `callRpc`/`callFunction` (`src/services/supabase.wrapper.ts`). No service currently uses them, so nothing is broken today — but the next read written with them will fail invisibly. Consider aligning them with `callRpc` now, while there are zero call sites to migrate.

### SF7 — Writes that confirm nothing

`callRpc` only toasts on success when the payload matches `{ success: true, message }` (`isRpcSuccessPayload`). Any write RPC returning a bare row or void completes with zero feedback — the user cannot tell it worked. With ~200 `fn_*` functions, some certainly do not return the message shape.

**This is an audit, not a code change yet.** Grep the services for write-path `callRpc` names, check each against `supabase_ai_context.sql` (noting the schema snapshot is stale — the live DB has more functions than the dump), and list the ones returning no message. Fixing them is SQL, so it lands in `docs/sql/` and awaits manual apply.

### SF8 — Flows that bypass the wrapper

`SetPasswordPage` was one — raw `supabase.auth.updateUser`, which is *why* it hand-rolled a `submitError` and got no toast. Remaining:

- `src/components/layout/ProtectedLayout.tsx:22` — `await supabase.auth.refreshSession()` with the result ignored. A failed refresh leaves a stale session and no signal.
- File uploads: `src/pages/faculty/sections/assessments/builder/AssessmentAttachmentPanel.tsx` and the system-settings logo upload — check the storage error paths.

**Done when:** each bypass either routes through the wrapper or renders its own error, and `ProtectedLayout` reacts to a failed refresh.

---

## Conventions this workstream must respect

- No comments in generated TS/TSX/SQL (CLAUDE.md §6). Names carry the meaning.
- 4-space indent, single quotes, no trailing commas, no EOF newline, `function` declarations for components (§3).
- Zero relative imports — path aliases only (§3).
- No `<Typography>`/`<Box>`/`<Stack>`/`<Grid>`; HTML + Tailwind for layout and text, MUI only for interactive components (§9).
- Error copy is user-facing: say what is wrong and what to do, not "Invalid input".
