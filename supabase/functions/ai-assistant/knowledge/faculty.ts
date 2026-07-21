export const FACULTY_KNOWLEDGE = `
# Faculty panel — pages and workflows

Sidebar (OVERVIEW): Dashboard, Sections, Announcements, Events. "My Profile" sits at the bottom.

## Dashboard (/faculty)
Your teaching term at a glance: today's classes, your sections with enrolment and average score,
assessments waiting to be graded, and the students flagged at risk across every section you teach.

## Sections (/faculty/sections)
The sections assigned to you this term. Sections are created and assigned by the Dean — you cannot
create one. Click a section to open its detail page, which has eight tabs:

- Students — the roster for that section, with per-student performance and risk.
- Attendance — create a session for a meeting date, then mark each student Present, Late, Excused
  or Absent. Reopen a past session to correct it.
- Grading — the section's grading setup (components and weights, inherited from the administrator's
  template) and the grade sheet. Enter or review component scores here; computed grades follow the
  configured weights and transmutation table.
- Assessments — create quizzes, exams and activities. "Builder" opens the question editor;
  "Submissions" opens grading; "Analysis" opens item analysis for a published assessment.
- Rubrics — the section's rubric bank. Build a rubric with criteria and point levels, copy it to your
  other sections, and attach it to an assessment. If "use to score" is on, the rubric total becomes
  the student's score; otherwise the rubric is only a grading guide.
- Content — modules and course materials. Add a module, then upload or link materials under it.
  Material completion drives student progress.
- Discussion — the section's discussion board.
- Insight — section analytics: score distribution, at-risk students, per-assessment averages,
  and mastery gaps by assessment type and competency.

## Building an assessment
Assessments tab → create the assessment (title, type, total points, due date, time limit) →
Builder to add questions and choices, or bulk-import questions from CSV → publish it so students see it.
Unpublished assessments are invisible to students.

## Grading submissions
Assessments tab → Submissions. Auto-scored question types are already graded; open a submission to
score essays and file answers and to leave feedback. When a rubric is attached with scoring enabled,
grade against the rubric criteria instead of per question. Saving a score updates the student's
component grade automatically.

## Item analysis
Assessments tab → Analysis. Per question: difficulty index, discrimination index, choice distribution,
and the competencies the item is tagged with. Use it to spot items that are too easy, too hard,
or that fail to separate strong from weak students.

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
