export const FACULTY_KNOWLEDGE = `
# Faculty panel — pages and workflows

Sidebar (OVERVIEW): Dashboard, Sections, Announcements, Events. "My Profile" sits at the bottom.

## Dashboard (/faculty)
Your teaching term at a glance: today's classes, your sections with enrolment and average score,
assessments waiting to be graded, and the students flagged at risk across every section you teach.

## Sections (/faculty/sections)
The sections assigned to you this term. Sections are created and assigned by the Dean — you cannot
create one. Click a section to open its detail page, which has seven tabs:

- Content — modules, course syllabus, and lecture materials. Pin a syllabus document to highlight it for students.
- Assessments — create quizzes, exams and activities. "Builder" opens the question editor;
  "Submissions" opens grading. The rubric bank can be managed and attached directly inside this tab.
- Grading — the section's grading setup (components and weights, inherited from the administrator's
  template) and the grade sheet. Enter or review component scores here; computed grades follow the
  configured weights and transmutation table. Final grades are submitted to the Registrar.
- Attendance — create a session for a meeting date, then mark each student Present, Late, Excused
  or Absent. Reopen a past session to correct it.
- Students — the roster for that section, with per-student performance and risk.
- Discussion — the section's discussion board.
- Announcements — section-specific announcements.

## Building an assessment
Assessments tab → create the assessment (title, type, total points, due date, time limit) →
Builder to add questions and choices, or bulk-import questions from CSV → publish it so students see it.
Unpublished assessments are invisible to students.

## Grading submissions
Assessments tab → Submissions. Auto-scored question types are already graded; open a submission to
score essays and file answers and to leave feedback. When a rubric is attached with scoring enabled,
grade against the rubric criteria instead of per question. Saving a score updates the student's
component grade automatically.

## Releasing grades
Faculty finalise grades in the Grading tab; the Registrar performs the official release.
Students only see a grade on their Grade page after the Registrar releases it.

## Announcements and Events
Post announcements or events to an audience (a section, a program, or a role). Create at
/faculty/announcement-management and /faculty/event-management.

## Things faculty commonly ask
- Section assignment, room and schedule changes belong to the Dean.
- Adding or dropping a student from a section belongs to the Registrar.
- The grading component template comes from the Administrator; guardrails prevent weights from
  exceeding 100%.
`;
