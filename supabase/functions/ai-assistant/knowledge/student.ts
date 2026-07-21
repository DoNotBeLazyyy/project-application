export const STUDENT_KNOWLEDGE = `
# Student panel — pages and workflows

Navigation lives in the left sidebar under OVERVIEW. The top bar has the notification bell,
your name, and Sign Out. "My Profile" is at the bottom of the sidebar.

## Dashboard (/student)
Landing page. Shows your current term at a glance: today's classes, upcoming deadlines,
recent grades, announcements and events addressed to you, and a summary of your academic insight.

## Schedule (/student/schedule)
Your weekly class schedule for the active term: day, time, room, section and instructor.
It is generated from your enrolled sections — you cannot edit it. If a subject is missing,
the enrollment has not been recorded yet; contact the Registrar.

## Subject (/student/subjects)
The list of subjects you are enrolled in this term. Click a subject to open its detail page,
which has four tabs:
- Assessments — quizzes, exams and activities. Click one to take it; once submitted and graded,
  "View Result" opens the result page with your score, per-question feedback, and the rubric
  breakdown when the instructor graded with a rubric.
- Grades — your running component scores for that subject (per grading period).
- Content — modules and course materials posted by the instructor. Opening a material marks it
  complete and feeds your progress bar.
- Discussion — the subject's discussion board; post a thread or reply.

## Taking an assessment
Open the assessment from the Assessments tab and press Start. Timed assessments show a countdown
and keep running on the server, so closing the tab does not stop the clock — reopen it to continue.
Answers save as you go; press Submit to finish. After the due date, late or missing submissions are
flagged to your instructor.

## Grade (/student/grade)
Your official released grades per term. Only grades the Registrar has released appear here.
The scale is 1.00 to 5.00 where 1.00 is the highest and 5.00 is a failure; 3.00 is the passing mark.
A grade you can see in a subject's Grades tab but not here has not been released yet.

## Curriculum (/student/curriculum)
Your curriculum audit: every course in your program's curriculum map, grouped by year and term,
marked as completed, in progress, or remaining, with earned versus required units and any
prerequisites you have not cleared yet.

## Insight (/student/insight)
Your learning analytics: GWA trend across terms, honors and scholarship trajectory, per-subject
performance, strengths and weaknesses, attendance and submission engagement, a risk indicator,
and a recommended-focus list. This is the same data the assistant explains.

## Profile (/student/profile)
View your personal details and change your password. Account details such as your student number,
program and year level are maintained by the Registrar — request a correction rather than expecting
to edit them yourself.

## Things students commonly ask
- Enrollment, subject loading, dropping and shifting are handled by the Registrar, not in this panel.
- Grade corrections go through your instructor first, then the Registrar releases the corrected grade.
- Latin honors and scholarship cutoffs are configured by the Administrator and shown on your Insight page.
`;
