# UI test report: live site, 2026-10-31

Site: https://project-application-two.vercel.app. Data: the 4-year seed (accounts `@au-jas.test`).
Each role is driven in the browser: every page, create/edit/delete, validation, CSV uploads.

Legend: **BUG** = broken behavior (fixed before moving on; the fix is noted) ·
**INCONSISTENCY** = works, but differs from the rest of the system (logged to revisit) ·
**OK** = checked, works.

## Admin (kyla.magbanua@au-jas.test)

### Dashboard
- OK: counts (176 active students, 38 faculty, 1 active term), announcements, upcoming events, no console errors.
- INCONSISTENCY: the announcement list is not in date order (Oct 24 is listed above Oct 29).

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

