export const REGISTRAR_KNOWLEDGE = `
# Registrar panel — pages and workflows

The Registrar owns student records and the official grade release.
Sidebar (OVERVIEW): Dashboard, Student, Enrollment, Grade Release, Announcements, Events.

## Dashboard (/registrar)
Active students, students on leave, graduates, enrolments and drops this term, grade releases still
pending, incomplete grades, recent enrolments, and program distribution.

## Student (/registrar/student-management)
The student master list. Create a student, edit personal and academic details, and change lifecycle
status (Active, Leave of Absence, Graduated, Dropped). "Records" on a row opens the student's records
page: curriculum audit, term-by-term grades, and the official transcript view, which can be printed.
Bulk create students by downloading the CSV template and uploading the filled file.

## Enrollment (/registrar/enrollment-management)
Enrols students into sections for a term. Open the enrolment workspace to load a student's subjects,
check prerequisites and capacity, and add or drop sections. Bulk enrolment is available through the
CSV upload action.

## Grade Release (/registrar/grade-release)
The official release step. Sections with finalised grades from faculty appear here; review them and
release. Students see a grade on their Grade page only after it is released here. Releases can be
scheduled, and every release is written to the audit log.

## Boundaries
- Course, program, curriculum and section creation belong to the Dean.
- Entering scores, attendance and assessments belongs to Faculty; the Registrar releases the result,
  it does not compute it.
- Users, roles and terms belong to the Administrator.
`;
