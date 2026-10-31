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
- OK (with your 4 Gmail addresses): Create User (invite email arrived), Upload CSV (2 valid rows created and invited; invalid
  email, existing email and unknown role rejected with clear reasons), Resend Invite (email arrived), Reset Password (email
  arrived; its link opens `/set-password` on the live site).
- BUG (fixed): after a CSV import with some failed rows, the results listed the wrong rows as "Created" (the failed rows 4 and
  5 instead of rows 1 and 2) and numbered the failures 1–3. Errors are now matched to their real row
  (`src/components/modal/BulkImportModal.tsx`, unit-tested).
- BUG (fixed, all CSV imports): the list didn't refresh after an import where some rows failed, so new records only showed
  after a manual reload. The list now refreshes whenever at least one row was saved. The Users page also had no refresh after
  an import at all.
- BUG (fixed): Resend Invite gave no feedback (no success or error message). It now shows "Invitation sent again to …".
- INCONSISTENCY: Resend Invite emails a "Reset Your Password" message instead of a second invitation (the link still lets the
  person set their password).
- INCONSISTENCY: the CSV preview doesn't flag invalid emails or unknown roles; they are only reported after Confirm Import.
- DATA: Supabase emailed that the project "is running out of Disk IO Budget". When the budget runs out, Supabase throttles the
  database, which feels like lag for everyone. The new indexes (release 5) cut disk reads; the free plan's budget refills over time.
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
- OK: created "Academic Year 2027-2028" through all 6 steps with typed dates (code and label generated correctly), then
  deleted it. Checked: at least one term required, term before the year's start rejected, enrollment close before open
  rejected, grading-period weights must total 100%.
- BUG (fixed, all forms): typing into date fields didn't work. Clicking a date field opened its calendar, which took the
  keyboard focus, so the typed date was ignored and the next click typed into the previous field. Date and date-time fields
  now take typing; the calendar button opens the calendar. Jumping to a date field with an error no longer opens its
  calendar either (`ValidCommonDatepicker`, `ValidCommonDateTimepicker`, `form.util.ts`).
- INCONSISTENCY: "no terms" and "weights must total 100%" errors appear as a toast, not next to the fields.
- INCONSISTENCY: the Exam Start/End and Encoding Start/End date fields are too narrow; "MM/DD/YYYY" is cut off.
- INCONSISTENCY: list pages show "Showing 0 of 0 records" with an empty card while loading, with no loading indicator.

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
  Suspended" (e.g. Nov 2, All Souls' Day). Both schedule functions now return the term dates (migration
  `20261031010000_calendar_schedule_term_dates`, exact rollback), and the calendar shows a class only inside its term and
  not on suspended days. This applies to the Admin, Dean, Faculty and Student calendars.
- OK: Create Event from the calendar, event shows on its date, category filter chips.
- OK (re-checked live after the fix): Oct 21–24 show only the semestral break, no classes; regular days show 16–62 items
  instead of 300+. Oct 28 shows 161 items because 114 sections each have a quiz due that day (correct). Oct 31 ("Undas Long
  Weekend") is a campus event, not a class suspension, so classes still show that day, as the data says.

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


## Dean (bianca.robles@au-jas.test)

### Dashboard
- OK: counts (2 programs, 47 courses, 24 sections, 59 students, 9 faculty), announcements, upcoming events.
- DATA (fixed): the "Undas Long Weekend (No Classes)" event was only a campus event, so classes still showed on Oct 31.
  Added it as a class-suspension holiday (Oct 31–Nov 1) in the 2026-2027 academic year.
- INCONSISTENCY (edge case): switching accounts without signing out (e.g. opening another account's link while signed in)
  first shows "Access Denied" until a reload, because the previous account's role is kept.

### Sections
- BUG (fixed): every section card showed "0 / 40" enrolled. The list function never returned the enrolled count
  (migration `20261031040000_section_list_enrolled_count`).
- OK: create wizard (term, course, faculty, room, slots), required fields, "Must be at least 1" slots, end time before start
  time rejected, grading weights inherited.
- BUG (fixed): a section could be saved with a slot that double-books its instructor or room; the clash only showed up later
  on the Schedule Conflicts report. The wizard now checks first and stops with the clashing section, day and time
  (`fn_check_section_schedule_conflicts`, migration `20261031050000`).
- INCONSISTENCY: a generated section code looks like "ACC211-001" while existing ones look like "ACC-222-BSA2A".
- INCONSISTENCY: the Term dropdown offers the already closed 1st Semester.

### Faculty Loading
- OK: load details (sections, units, weekly hours, students), schedule conflict analysis (shows the overlap time).
- BUG (fixed, all card lists): cards without a term showed the placeholder text "1st Sem AY 25-26" (hard-coded fallback in
  `CommonTableCard`).
- INCONSISTENCY: the list shows totals across all terms; the detail shows the current term only. Each card repeats the
  faculty's name under "Faculty In-Charge".

### Programs
- BUG (fixed, serious): deleting a program that still had students silently removed the program from every student (30 BSA
  students lost their program). Restored the data; a program with students can no longer be deleted.

## Security (found while testing Programs)
- BUG (fixed, critical): 22 database write functions had no role check. Signed in as a student, it was possible to delete
  programs, sections, school years, students, enrollments and curriculum entries, or enroll any student in any section.
  Each now requires the role that owns the page; 16 functions no page calls are no longer callable by signed-in users
  (migrations `20261031060000`, `20261031070000`, `20261031080000`).
- BUG (fixed): a student could switch their own program and year level at any time; now only first-time setup is allowed,
  and later shifts go through the Registrar.
- BUG (fixed): a student could read another student's credited courses and grades, the list of every account's email, and
  the progression candidate list (migration `20261031090000`).
- BUG (fixed, critical): 5 tables (registrar logs, staff and student profile change requests, credited courses, course types
  link) let any signed-in user read, change or delete every row through the API. They are now read-only to the row's owner
  and the responsible staff (migration `20261031100000`).
- Verified by calling each function as a student inside rolled-back transactions: before, the calls succeeded; after, all
  are refused, while the Registrar still sees everything they need.
