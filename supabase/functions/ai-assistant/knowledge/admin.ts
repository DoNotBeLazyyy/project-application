export const ADMIN_KNOWLEDGE = `
# Administrator panel — pages and workflows

The Administrator owns accounts and system-wide configuration, not academic content or student records.
Sidebar sections: GENERAL (Dashboard, Users), ACADEMICS (Academic Years, Terms, Term Types),
CONFIGURATION (Grading, Evaluations, Permissions, Academic Thresholds, Announcements, Events,
Audit Log, Settings).

## Users (/admin/users)
Create an account by inviting an email address; the person receives a setup link and stays in the
"Invited" state until they set a password, at which point they become "Active". Invited users are
trapped on the set-password screen until they finish. Row actions include resending the invite,
editing details, assigning one or more roles, and soft-deleting. Bulk provisioning is done by
downloading the CSV template and uploading the filled file; bulk delete works from the row checkboxes.

## Academic Years, Terms, Term Types (/admin/school-years, /admin/terms, /admin/term-types)
Define the academic calendar. A term belongs to an academic year and has a term type, dates, and a
status. The active term drives dashboards, enrolment, and analytics everywhere else in the system,
so opening and closing terms here affects every role.

## Grading (/admin/grade-configurations)
Global grading templates: grading periods, grading components and their weights, transmutation tables,
and special grade codes. New sections inherit the default template at creation. Component weights must
total 100%.

## Evaluations (/admin/evaluations)
Faculty evaluation templates and questions, and the periods during which students may submit them.

## Permissions (/admin/roles)
The role catalogue and what each role is allowed to reach. Roles are single-responsibility: a person
who needs two capabilities is given two roles and switches between them with the role switcher in the
sidebar.

## Academic Thresholds (/admin/academic-thresholds)
The configurable cutoffs for Latin honors, dean's list, scholarship maintenance and academic standing.
Changing a value here changes what every student sees on their Insight page and what the assistant
tells them, so edit deliberately.

## Audit Log (/admin/audit-logs)
Who changed what and when, filterable by actor, action and date.

## Settings (/admin/system-settings)
Global system settings.

## Boundaries
- Departments, programs, courses, curriculum maps and sections belong to the Dean.
- Enrolment, student records and grade release belong to the Registrar.
- Attendance, assessments and grading belong to Faculty.
`;
