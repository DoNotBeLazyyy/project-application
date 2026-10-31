# UI test report: live site, 2026-10-31

Site: https://project-application-two.vercel.app. Data: the 4-year seed (accounts `@au-jas.test`).
Each role is driven in the browser: every page, create/edit/delete, validation, CSV uploads.

Legend: **BUG** = broken behavior (fixed before moving on; the fix is noted) ·
**INCONSISTENCY** = works, but differs from the rest of the system (logged to revisit) ·
**OK** = checked, works.

## Admin (kyla.magbanua@au-jas.test)

### Dashboard
- OK: counts (176 active students, 38 faculty, 1 active term), announcements, upcoming events, no console errors.
- OK (by design): pinned announcements are listed first, so the pinned Oct 24 post sits above Oct 29.

### Users
- OK: create validation (required fields, invalid email, duplicate email error from the server), edit (required first name and
  roles), view, search, filter by status, deactivate (confirmation), reactivate.
- BUG (fixed): after a failed save (e.g. duplicate email) a "Restore Unsaved Draft?" prompt popped up over the still-open form.
  The form disables its fields while saving, so the draft feature treated it as closed and then offered to "restore" the
  form's own values. Fix: `useFormDraft` skips the prompt when the form already shows exactly the draft (`src/hooks/useFormDraft.ts`).
- BUG (fixed): Reactivate showed two success toasts. The database call already shows the server's message; the page added a
  second one. Removed the page toasts (`src/pages/admin/user-management/index.tsx`).
- NOT TESTABLE without your input: Create user, Upload CSV, Resend Invite and Reset Password all send real emails through Supabase
  Auth, and Supabase rejects the seed's `@au-jas.test` addresses ("Email address ... is invalid"). They need an inbox you control.
- INCONSISTENCY: Roles in Edit User is required but has no red asterisk (Create shows "Role *"). The label is also "Role" in
  Create and "Roles" in Edit.
- INCONSISTENCY: search only runs on Enter; typed text that hasn't been submitted stays in the box while the list ignores it
  (also seen on Profile Approvals). Card labels mix casing ("Role" vs "EMAIL").
- INCONSISTENCY: Users opens filters from a "⋮" menu; Profile Approvals has a "Filter & Sort" button.
- Test data changed: Bernard Mercado's last name is now "Mercado Jr." (to revert at the end).

### Profile Approvals (staff)
- OK: review modal, show changed/all fields, reject (reason required), status filter, list refresh.
- BUG (fixed): the "Administrator Verification & Edit Mode" banner (and the Registrar's student version) had grey text on a
  bright blue background. The theme never defined an `info` color, so the MUI default bright blue was used. Added `info` to the
  light and dark palettes (`src/constants/theme/palette.constant.ts`, `tokens.constant.ts`); this also fixes the student
  dashboard icon tile and the profile prompt banner that use the same color.
- INCONSISTENCY: blanking a field before approving silently keeps the current value, but the request is still recorded as
  "Approved with Edits".
- INCONSISTENCY: the Reject dialog's Confirm button stays disabled until a reason is typed; other forms let you submit and then
  show the field error.
- INCONSISTENCY: the page is "Profile Approvals" in the sidebar, "Profile Verifications" in the breadcrumb and "Staff Profile
  Approvals" in the title.

### Academic Years
- OK: view all 6 wizard steps (special-grade rules with their auto-detect conditions show in Step 5), history/versions,
  duplicate validation (required dates, code, label).
- BUG (fixed): moving to the next wizard step kept the previous step's scroll position, so a step opened at its bottom. Fixed
  once in the shared stepper header (`ModalStepperHeader`), which covers all 11 wizards.
- BUG (fixed): typing the End Date produced the code "AY-2027-2" / label "Academic Year 2027-2". The code was generated from
  the half-typed year "0002"; because the code and label fields are read-only, it could not be corrected without closing the
  wizard. Years below 1900 are no longer treated as real years, and impossible dates (e.g. year 0027) now show "Enter a valid
  date".
- INCONSISTENCY: History step 1 doesn't show "Max Units per Term", which the wizard has.
- INCONSISTENCY: confirmation wording differs between dialogs: "Keep Editing / Discard Changes" vs "Continue Editing / Discard".
- INCONSISTENCY: breadcrumb says "School Years", title says "Academic Years".
- Pending: create a new academic year and delete it (re-run after the deploy, with the fix above).

### Departments
- OK: create wizard (3 steps), validation, edit, delete.
- BUG (fixed): when a field had an error, its red error bubble covered the middle of the input, and clicking there didn't focus
  the field. Error bubbles now let clicks through, and hide when their field is scrolled out of view instead of floating over
  the page header.
- BUG (fixed, global): one action showed two success toasts ("Department created successfully" twice). The toast store now
  merges same-action success toasts.
- INCONSISTENCY: the auto-generated code for "College of Nursing" is "CONUR", while the existing codes are acronyms (CAS, CBA, CCS, CED).

### Calendar
- BUG (fixed): every day showed 300+ class sessions. The schedule function returned all sections of all four years with no
  term dates, so each weekly class repeated on every date, including the Oct 21–24 semestral break and holidays marked "Class
  Suspended" (e.g. Oct 31, Nov 2). Both schedule functions now return the term dates (migration
  `20261031010000_calendar_schedule_term_dates`, exact rollback), and the calendar shows a class only inside its term and
  not on suspended days. This applies to the Admin, Dean, Faculty and Student calendars.
- OK: Create Event from the calendar, event shows on its date, category filter chips.

### Announcements & Events
- OK: event create/view/edit/delete, announcement create, bulk delete via checkbox, search, empty state.
- BUG (fixed): the create/edit pages opened scrolled down past Type and Title. The Toast UI editor focuses itself by default
  (`autofocus: false` now).
- BUG (fixed, global): after fixing one field, focus jumped to the next field that still had an error, mid-typing (in the
  event form the Title kept only its first letter). Fields now take focus only right after a submit (editor, inputs,
  number inputs, selects, multi-selects, textareas).
- BUG (fixed, global): on submit the page jumped to the Description editor instead of the first empty field (Title). The first
  error is now picked by on-screen order, not by registration order.
- BUG (fixed): an announcement could be given an expiry date in the past. It is now validated.
- DATA (fixed): 10 enrollment announcements from past years were still pinned at the top of the feed; unpinned.
- INCONSISTENCY: the date-time pickers ignore typed input, so dates can only be picked (date-only pickers accept typing). The
  End picker opens on the current month, not the Start date's month.
- INCONSISTENCY: the menu says "Create Post" here and "Create" elsewhere; an event is "Upcoming Event" on its card and
  "Scheduled Event" on its detail page; "Posted on" shows seconds.
- NOT TESTED: attachment upload (needs a file you share with me).

### Evaluations
- OK: create (validation incl. max rating < min rating), edit (deactivate), delete.
- INCONSISTENCY: a new section defaults to sequence 1 even when sequence 1 is taken (no duplicate warning); in Edit you must go
  to step 2 to save, while the Department wizard has "Save Changes" on every step.

### Audit Log
- OK: list, payload inspector (before/after diff).
- DATA (fixed): 189 seeded rows (discussion posts, notifications, 1 audit entry) had timestamps in the future (up to Nov 3);
  moved back before today.
- INCONSISTENCY: a soft delete is logged as "UPDATE / *_SAVED", not as a delete; every audit card shows an "Active" badge.

### System Settings
- OK: required fields and email validation, Cancel reverts, save (changed and restored the mobile number).
- BUG (fixed): Institution Phone accepted letters ("abc"). It now needs a phone-number format.

### My Profile (all roles share this page)
- BUG (fixed): Postal Code accepted "abcd" and saved it, and Mobile Number had no format check. Both are now validated (4-digit
  postal code; 09XX XXX XXXX / +639XX XXX XXXX), also in the student first-login profile prompt.
- INCONSISTENCY: the profile fields stop at about 80% of the card width; other forms are full width.

### Roles (reachable at /admin/roles, not in the sidebar)
- BUG (fixed): the five built-in roles could be deleted (once nobody held them) or have their code changed, which would break
  every permission check. They can still be relabeled, but not deleted or recoded (migration
  `20261031020000_protect_builtin_roles`, exact rollback).

### Old admin routes
- OK: /admin/terms, /special-grades and the other retired pages redirect to Academic Years.

