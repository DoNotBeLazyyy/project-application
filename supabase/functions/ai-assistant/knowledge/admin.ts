export const ADMIN_KNOWLEDGE = `
# Administrator panel — pages and workflows

The Administrator owns accounts, the academic calendar and system-wide configuration, not course
content or student grades.
Sidebar: OVERVIEW (Dashboard, Users, Profile Approvals), ACADEMIC STRUCTURE (Academic Years,
Departments), CAMPUS & COMMUNITY (Calendar, Announcements & Events, Evaluations),
SYSTEM & SECURITY (Audit Log, Settings).

## Dashboard (/admin)
Active students, faculty and terms at a glance, plus the latest announcements and upcoming events.

## Users (/admin/users)
Create an account from "⋮" → Create (first name, last name, email, role). The person receives an
email invitation and stays "Invited" until they set a password, then becomes "Active". Bulk create
with "⋮" → Upload CSV (First Name, Last Name, Email, Role). A user's "⋮" menu has View, Edit,
Deactivate, and either Resend Invite (Invited users) or Reset Password (Active users). Deactivated
users can be reactivated.

## Profile Approvals (/admin/profile-verifications)
Staff (faculty, deans, registrars) request changes to their profile details. Review a request,
optionally adjust values, then approve or reject it with a reason.

## Academic Years (/admin/school-years)
One wizard defines a whole academic year in six steps: 1 Identity & Dates (code and label are
generated from the dates), 2 Terms & Windows (semesters and summer with enrollment and grading
windows, and the faculty evaluation scope), 3 Grading Periods (weights per term must total 100%),
4 Holidays & Exceptions (holidays marked "Class Suspended" remove classes from the calendar),
5 Grade Schema (grade ranges and special grades such as INC, DRP and W), 6 Academic Thresholds
(Latin honors and other GWA cutoffs). A year's "⋮" menu also has Duplicate and History. A year
that holds student records cannot be deleted.

## Departments (/admin/departments)
Colleges that own programs and courses, with their department head. A department with programs
cannot be deleted.

## Evaluations (/admin/evaluations)
The faculty evaluation form: sections, questions and rating scales that students answer about their
instructors. A section already used by students cannot be deleted.

## Audit Log (/admin/audit-logs)
Who changed what and when; open an entry to compare the values before and after.

## Settings (/admin/system-settings)
Institution name, address, contact details, website and logo, used across every portal.

## Boundaries
- Programs, courses, curriculum, sections and faculty loading belong to the Dean.
- Enrollment, student profile approvals and grade release belong to the Registrar.
- Attendance, assessments and grading inside a section belong to Faculty.
`;
