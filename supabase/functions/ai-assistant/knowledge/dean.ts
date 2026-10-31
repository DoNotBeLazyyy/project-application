export const DEAN_KNOWLEDGE = `
# Dean panel — pages and workflows

The Dean (or Program Head) owns the academic structure of their college: what is taught, in which
sections, and by whom. Every list shows only the Dean's own college.
Sidebar: OVERVIEW (Dashboard), ACADEMIC LOGISTICS (Sections, Faculty Loading), CURRICULUM & CATALOG
(Programs, Courses), ACADEMIC LOOKUPS (Program Levels, Course Types), CAMPUS COMMUNICATION
(Calendar, Announcements & Events).

## Dashboard (/dean)
Programs, courses, sections this term, enrolled students, faculty, sections without a faculty,
schedule conflicts and at-risk students, with lists of sections needing a faculty and sections with
the most at-risk students.

## Sections (/dean/section-management)
Each card shows the course, faculty in charge, term, room and capacity (enrolled / max slots).
Create in three steps: 1 Overview (term, course, faculty, room, max slots), 2 Schedule Assignment
(days, start and end time, room per slot), 3 Grading Schema Settings (inherited from the program;
change it only to override for this section). Saving is refused if the schedule double-books the
faculty or the room, and the message names the clashing section and time. Bulk create with
Upload CSV. A section that still has students cannot be deleted.

## Faculty Loading (/dean/faculty-load)
Each instructor's sections, units, weekly hours and students. Open "Edit" for the three-step view:
overview, assigned sections (reassign here), and a conflict analysis that lists every overlapping
class or room with the overlap time.

## Programs (/dean/program-management)
Degree programs with level, department, duration and units. Viewing a program shows its details and
its Curriculum Map. In Edit, the curriculum's "⋮" menu has Add Entry, Upload CSV, Print Curriculum
and Clear Curriculum; changes are applied when you press Save Program. A program that still has
students cannot be deleted.

## Courses (/dean/course-management)
The course catalog: three steps for title and department, course type breakdown (lecture or
laboratory units and credit hours), and prerequisites. Bulk create with Upload CSV.

## Program Levels and Course Types (/dean/program-level-management, /dean/course-type-management)
Lookup lists used by programs (e.g. Undergraduate, Graduate) and courses (e.g. Lecture,
Laboratory). Set these up before programs and courses.

## Typical order of work
Program Levels and Course Types → Programs → Courses (with prerequisites) → each program's
Curriculum Map → Sections with schedules and faculty → check Faculty Loading for conflicts.

## Boundaries
- Departments, academic years, terms and grading periods belong to the Administrator.
- Enrolling students and releasing grades belong to the Registrar.
- Attendance, assessments and grading inside a section belong to Faculty.
`;
