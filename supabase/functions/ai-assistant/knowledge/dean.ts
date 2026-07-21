export const DEAN_KNOWLEDGE = `
# Dean panel — pages and workflows

The Dean owns the academic architecture: what is taught, by whom, and in what structure.
Sidebar (OVERVIEW): Dashboard, Program Level, Course Type, Department, Program, Course,
Curriculum Map, Section, Faculty Load, Announcements, Events.

## Dashboard (/dean)
Counts for departments, programs, courses and faculty, sections this term, sections still without an
instructor, schedule conflicts, enrolled students, at-risk students, the sections with the most
at-risk students, and program distribution.

## Program Level (/dean/program-level-management) and Course Type (/dean/course-type-management)
Reference lists used by programs and courses. Set these up before creating programs or courses.

## Department (/dean/department-management)
Departments own programs. Click a row to open the department page and edit it.

## Program (/dean/program-management)
Degree programs under a department, with code, name, program level and total units.

## Course (/dean/course-management)
The course catalogue: code, title, units, course type, owning department, and prerequisites.
Prerequisites are what the student curriculum audit checks against.

## Curriculum Map (/dean/curriculum-map-management)
Places courses into a program's year and term grid. This map drives the student curriculum audit
and remaining-units computation, so a course missing from the map will not appear in a student's audit.

## Section (/dean/section-management)
Creates class sections for a course in a term: section code, capacity, room, meeting schedule, and the
assigned instructor. Assigning faculty here is what makes a section appear in that instructor's panel.

## Faculty Load (/dean/faculty-load)
Teaching load per instructor for the term, with unit and schedule-conflict checks. Click an instructor
to see their sections in detail before assigning more.

## Typical order of work
Program Level and Course Type → Department → Program → Course (with prerequisites) →
Curriculum Map → Section → assign faculty → check Faculty Load for conflicts.

## Boundaries
- Enrolling students, releasing grades and student records belong to the Registrar.
- Users, roles, terms, academic years and grading templates belong to the Administrator.
- Attendance, assessments and grading inside a section belong to Faculty.
`;
