# AU-JAS LMS: "Break It" Test Guide

Written 2026-11-04 and updated 2026-11-06 from the code as it is today. Nothing here was copied from the older walkthroughs; every button name below comes from the current screens.

**Who this is for:** anyone on the team testing the system. You do not need to know how it works inside. Act like a confused, impatient, careless user. Your job is to make it fail.

**Before you start:** this guide checks the bug fixes made on 2026-11-04. Those fixes only show up on the live site after:
1. the new database migrations are applied (files starting with `20261104` and `20261106` in `supabase/migrations`; see `DEPLOY-20261104-BUGFIXES.md`), and
2. the new frontend is deployed, and
3. the `admin-user-provision` edge function is redeployed.

If those are not done yet, the tests marked **[RETEST]** will still show the old bugs.

---

## Part 0. How to test like a "dumb user"

### 0.1 The one rule
Never trust a green toast. A toast saying "Saved" means nothing until you **refresh the page (F5)** and see the change is still there. Most of the bugs teammates found were *silent*: the screen looked fine, but nothing was saved, or the wrong thing was saved.

### 0.2 After EVERY action, check these 4 things
1. **Did a message appear?** One message is right. Two of the same message is a bug. None at all is a bug.
2. **Press F5.** Is the change still there?
3. **Log in as the other role that should see it** (for example, the student after a teacher publishes). Do they see it?
4. **Is anything else wrong now?** Counts on the dashboard, the calendar, the notification bell.

### 0.3 The "do this to every form" list
Do all of these at least once on every form in the system. Each of them has broken something before.

| # | Do this | What should happen |
|---|---|---|
| F1 | Click Save/Submit **twice fast** (double-click) | Only one record is created. The button greys out while saving. |
| F2 | Leave every field empty and click Save | Red messages under the required fields. Nothing is saved. |
| F3 | Type only spaces in a required field | Treated as empty. |
| F4 | Type a very long text (paste a paragraph 5 times) | Either it is accepted and shows properly, or a clear limit message appears. No raw database error. |
| F5 | Type emoji and accented letters: `Peña 😀 Ñoño` | Saved and shown correctly after F5. |
| F6 | Numbers: type `0`, `-5`, `1.5`, `99999999`, `abc`, leave empty | Clear message for bad values. Never a message like "numeric field overflow" or "does not meet the requirements". |
| F7 | Dates: a date in the past, far future, end date before start date | Clear message, or it is allowed on purpose. |
| F8 | Fill half the form, then close it (X or click outside) | Asks "Discard unsaved changes?" |
| F9 | Fill half the form, press F5 | Either a draft is offered back, or nothing is half-saved. |
| F10 | Press the browser **Back** button right after Save | No duplicate, no error. |
| F11 | Open the same page in **two tabs**, change it in both | The second save either works or shows a clear message. Never a silent overwrite of something important. |
| F12 | Do it on a **phone** (or Chrome DevTools at 390 px wide) | Nothing cut off, nothing sideways-scrolling, buttons reachable. |
| F13 | Switch the theme (sun/moon button at the top) and look again | All text readable in light and dark, including the sidebar and the notification panel. |

### 0.4 The "do this to every list" list
Every list page (Users, Sections, Courses, etc.) shows cards and has a search box and a 3-dot menu at the top.

| # | Do this | What should happen |
|---|---|---|
| L1 | Type in search and press **Enter** | The list filters. (Search runs on Enter or the search icon, not while typing. That is on purpose.) |
| L2 | Search for something that does not exist | "No matching results found" plus a "Clear Search" button. |
| L3 | Open **Filter & Sort**, change something, click **Apply Filters** | The window closes and the list changes on the **first** click. **[RETEST]** (Hubilla: had to apply twice.) |
| L4 | Open Filter & Sort, change things, close it **without** applying, open it again | It shows the filters that are really applied, not the ones you abandoned. **[RETEST]** |
| L5 | Try every **sort** option, both directions | The list re-orders. No error toast. (Dean → Sections → sort by Program used to crash.) **[RETEST]** |
| L6 | Scroll to the bottom of a long list | More cards load ("Loading more…"). The "Showing X of Y" counter is right. |
| L7 | Tick a card's select box, then **Select All (N)** | N is the number of cards you can see loaded. It selects exactly that many. **[RETEST]** |
| L8 | Scroll down a long list, delete a card | The list reloads and you still see the earlier cards. Nothing disappears until refresh. **[RETEST]** |
| L9 | Delete something | A confirm window first ("Delete this record?" / "Yes, Delete"). |

### 0.5 The "do this to every CSV upload" list
Upload CSV exists on: Users, Departments, Evaluations (Admin); Program Levels, Course Types, Programs, Courses, Sections, curriculum map (Dean); Section Enrollments (Registrar); questions inside an assessment (Faculty).

| # | Do this | What should happen |
|---|---|---|
| C1 | Click **Download CSV Template**, upload it **unchanged** | Message: "This file only has the example row from the template. Replace it with your own rows and upload again." **[RETEST]** (Hubilla: "even the default template doesn't work". It was silently dropping the example row.) |
| C2 | Keep the example row, add 2 real rows below it | Preview shows 2 rows, with a note "Row 2 was left out because it is the example row from the template." |
| C3 | Leave a required cell blank | "These required cells are blank: Row N: …". **Row N must match the row number in Excel.** **[RETEST]** |
| C4 | Delete a required column from the header | "These required columns are missing…" |
| C5 | Add an extra column nobody asked for | Warning that it will be ignored; the rest still imports. |
| C6 | Rename an `.xlsx` to `.csv` and upload | Should fail clearly, not import garbage. |
| C7 | Save from Excel as "CSV (Comma delimited)" with `ñ` in a name | Check whether `ñ` survives. If it turns into `�`, report it (save as "CSV UTF-8" instead and note the difference). |
| C8 | Put the same row twice | See what happens. Duplicates should be blocked or reported, not silently doubled. |
| C9 | Upload 50+ rows | Finishes, and the result tabs (Created / Updated / Blocked / Failed / Conflicts) add up to the number of rows. |
| C10 | After import, refresh the list | The imported rows are really there. |

### 0.6 How to report a bug
Copy this for each bug:

```
TITLE: (one line, what broke)
ROLE + ACCOUNT: (e.g. Faculty, the account you used)
PAGE: (sidebar item, then tab)
STEPS:
1.
2.
3.
EXPECTED:
ACTUAL: (exact message text, copy it)
AFTER F5: (still broken? data there or not?)
SCREENSHOT / SCREEN RECORDING:
TIME IT HAPPENED: (so it can be found in the Audit Log)
```

"Silent bug" means: no error was shown, but the result is wrong. Always say if it was silent.

---

## Part 1. Setup (do this once, together)

### 1.1 Inboxes
Every account is created by an **email invite**. The person opens the email, clicks the link, and sets their own password on the "Set Your Password" page. So every test account needs a real inbox you can open.

Fill in this table before starting. Use inboxes the tester controls.

| Account | Role | Email (fill in) | Who opens it |
|---|---|---|---|
| T-Admin | Admin | (already exists) | |
| T-Dean | Dean | | |
| T-Registrar | Registrar | | |
| T-Faculty-1 | Faculty | | |
| T-Faculty-2 | Faculty | | |
| T-Student-1 | Student | | |
| T-Student-2 | Student | | |
| T-Student-3 | Student | | |

**Warning about email limits:** Supabase's free email service only sends a few emails per hour. Inviting 8 people at once may partly fail. If a row fails with "Email rate limit reached…", wait and use **Resend Invite** later. That message itself is something to check (see A2.12).

### 1.2 Test data plan (create it through the app, in this order)
1. Admin: Academic Year with 2 terms, grading periods, holidays (Part A3).
2. Admin: one Department; assign T-Dean and both faculty to it (A4).
3. Dean: Program Level, Course Types, 3 Courses, 1 Program with a curriculum map (Part D).
4. Dean: 2 Sections for the current term, one per faculty, with weekly schedules (D6).
5. Registrar: assign students to the program, enroll them in both sections (Part R).
6. Faculty: lessons, assessments, rubric, attendance, grades (Part F).
7. Student: take everything (Part S).
8. Faculty → Registrar → Student: grade submission and release (Part E2E).

Prefix every name you create with your initials, e.g. `JB Test Course`, so testers don't confuse each other's data.

---

## Part F. FACULTY (least tested: go slow, try everything)

Log in as T-Faculty-1. Sidebar: **Dashboard, Calendar, My Sections, Student Evaluations, Announcements & Events**.

### F1. First login
- [ ] F1.1 First time logging in: a "Complete Your Profile Information" window appears. Try closing it without filling it in. Expected: you can't use the system until it's done.
- [ ] F1.2 Fill it with a mobile number like `12345`. Expected: "Enter a valid mobile number (e.g. 0917 123 4567)".
- [ ] F1.3 Fill it correctly. Expected: window closes, the dashboard loads, your name shows top right.

### F2. Dashboard
- [ ] F2.1 Check each stat card: My Sections, Total Students, Pending Grading, At-Risk Students, Published Assessments, Classes Today. Compare with what you really have.
- [ ] F2.2 Click a class in "today's classes" → opens that section. Click a "pending grading" item → opens that assessment's Submissions page.
- [ ] F2.3 Note: **Pending Grading** only counts assessments with questions a teacher must grade by hand (essay, short answer, fill in the blank, file upload). An all-multiple-choice quiz grades itself and never appears here. That is on purpose.

### F3. My Sections
- [ ] F3.1 This is the **only page with a card/table view switch** (in the 3-dot menu). Switch to table, then back. Expected: the list restarts from the top each time, no duplicates.
- [ ] F3.2 In **table** view with more than 10 sections: page numbers appear at the bottom and you can reach every section. **[RETEST]** (Before, only the first 10 could ever be seen.)
- [ ] F3.3 Current-term sections are listed first.
- [ ] F3.4 Open a section. Tabs: **Lessons & Syllabus, Assessments, Gradebook, Attendance, Class Roster, Discussions, Announcements**.
- [ ] F3.5 Change the URL to `?tab=nonsense`. Expected: falls back to Lessons & Syllabus, no crash.

### F4. Lessons & Syllabus
- [ ] F4.1 **Add Module** → step 1 "Module Identity": leave Module Title empty → error. Type only spaces → error.
- [ ] F4.2 Choose a grading period, choose **Draft (Hidden)**, add resources, save. Then log in as a student **right away**. Expected: the student never sees the draft module, not even for a moment. **[RETEST]**
- [ ] F4.3 Add Resource type Link with URL `google.com` (no https). Expected: error asking for http:// or https://.
- [ ] F4.4 Upload a **0-byte file** (make an empty .txt). Expected: clear message that the file is empty. **[RETEST]**
- [ ] F4.5 Upload a 30 MB file → "larger than 25 MB". A `.exe` → "is a program file and cannot be uploaded". A file named `#test%😀.pdf` → uploads and opens fine. **[RETEST]**
- [ ] F4.6 Make one resource fail on purpose (for example, disconnect Wi-Fi just before Save). Expected: the final message names which resource failed. It must **not** say "saved successfully" if something failed. **[RETEST]**
- [ ] F4.7 Edit a module and change its grading period twice. Expected: the title shows only **one** `[Period]` prefix, e.g. not `[Midterm] [Prelim] Intro`. **[RETEST]**
- [ ] F4.8 Name a module "Final Project" in Prelim, then edit it. Check the period shown is still Prelim (not guessed as Finals from the word "Final").
- [ ] F4.9 Publish/Unpublish a module and a single resource. Check the student view each time.
- [ ] F4.10 **Copy to other sections**: copy a module to the other section. Run it again. Expected: the second time it is skipped, and the message says how many sections were skipped. **[RETEST]**
- [ ] F4.11 Delete a module → confirm window → gone for students too.
- [ ] F4.12 A material whose title contains "syllabus" becomes the "Official Syllabus" card. Add two such materials and see which one shows.

### F5. Assessments (most important faculty area)
Open the **Assessments** tab → **New Assessment**. The wizard has 4 steps: **Overview & Grading → Schedule & Timing → Questions & Content → Rubrics & Display Rules**.

**Creating**
- [ ] F5.1 Fill step 1 and click **Next Step**. Then log in as a student. Expected: the student sees **nothing** and gets **no notification**. The assessment is a Draft. **[RETEST]** (Before, clicking Next already published an empty quiz to every student.)
- [ ] F5.2 Close the wizard after step 1. Expected: the assessment stays in the list as **Draft**, not published.
- [ ] F5.3 Title of only spaces → error. Total Points `0`, `-1`, `1000000` → clear error, no raw database message.
- [ ] F5.4 Passing Points bigger than Total Points → error.
- [ ] F5.5 Leave **Grading Component** empty. Note: an assessment with no grading component **never counts toward the grade**. Make one like this on purpose and check later in the Gradebook that it is not counted.

**Schedule**
- [ ] F5.6 Due date before Opens date → error. Closes before Due → error.
- [ ] F5.7 Past due date without ticking "Allow past dates…" → error. Tick it → allowed.
- [ ] F5.8 Time Limit `0` → error. Maximum Attempts `0` → error. Maximum Attempts `3` (needed for retake tests later).
- [ ] F5.9 Leave **Show Results At**, **Closes At** and **Due At** all empty on an all-multiple-choice quiz. Remember it for test S6.4 (results should show right after submit). **[RETEST]**

**Questions**
- [ ] F5.10 Add one of each type: Multiple Choice, True or False, Short Answer, Essay, Fill in the Blank, Matching, File Upload.
- [ ] F5.11 Multiple Choice with no correct answer marked → error. With only 1 choice → error.
- [ ] F5.12 Change a Multiple Choice with 4 choices into True or False. Check what happens to the extra choices.
- [ ] F5.13 Question points `0`, `-1`, `10000` → clear error.
- [ ] F5.14 Delete a question → **confirm window** first. **[RETEST]**
- [ ] F5.15 Make question points add up to **less** than Total Points. Expected: a warning, and a "Sync to N pts" button. Click it. Expected: Total Points changes and the message is only shown if it really saved. **[RETEST]**
- [ ] F5.16 **Import CSV** questions: download template, upload unchanged (see C1), then upload real rows. Use `*` to mark correct choices and `|` between choices.

**Rubric and display**
- [ ] F5.17 Step 4: choose a rubric in "Attached Rubric", tick "Use rubric to score submissions", then click the **big Save Assessment** button (there is no separate rubric save button anymore). Reopen the assessment. Expected: the rubric is still attached. **[RETEST]** (Before, the rubric was silently not attached.)
- [ ] F5.18 Leave both shuffle boxes **unticked** and save. Expected: saves fine. **[RETEST]** (Erika: had to tick shuffle to save.)
- [ ] F5.19 Untick "Display all questions at once" and leave Questions Per Page empty → error. Set `0` → error.
- [ ] F5.20 Upload attachments; delete one → **confirm window**. **[RETEST]** Upload a 0-byte file → rejected.
- [ ] F5.21 Final save shows **one** message ("Assessment saved as a Draft. Publish it when it is ready for students."), not two. **[RETEST]**

**Publishing**
- [ ] F5.22 Click **Publish** on an assessment with 0 questions → refused: "Cannot publish an assessment with no questions."
- [ ] F5.23 Publish when question points ≠ Total Points → refused, and the message shows both numbers. **[RETEST]**
- [ ] F5.24 Publish properly → student gets a notification and sees it.
- [ ] F5.25 After a student has submitted, click **Unpublish**. Expected: a confirm window that says how many submissions exist. **[RETEST]**
- [ ] F5.26 **Delete Assessment** → confirm window saying grades for it will no longer count. **[RETEST]**
- [ ] F5.27 Edit an assessment **after** students submitted: change the correct answer of a multiple-choice question. Expected: a confirm "Scores will be recalculated" → **Save and Recalculate** → the message says how many attempts were re-scored, and the students' scores change to match the new key. **[RETEST]**
- [ ] F5.27b Same, but change a question's points, then Total Points. Same confirm; scores follow. **[RETEST]**
- [ ] F5.28 **Copy to other sections**: the copy is a Draft; the message says questions and attachments were copied and the rubric link was not. Copy again → skipped. **[RETEST]**
- [ ] F5.29 Set a **Scheduled Publish** time on an assessment with no questions, or with points that don't match Total Points. Expected: refused with the reason. Add questions so it passes, schedule it, then delete a question so it no longer passes. Expected: the schedule is removed and the message says so. **[RETEST]**

### F6. Rubrics
Assessments tab → toggle **Grading Rubrics** → **New Rubric**.
- [ ] F6.1 Add 3 criteria worth **20, 30, 50**. Expected: "Total: 100 pts" shows **immediately**, without adding another criterion. Save works. **[RETEST]** (Erika: showed 50, and save failed with "One of the values provided does not meet the requirements".)
- [ ] F6.2 Criterion Max Points `0`, `-5`, empty → error. `10000` → clear error, not a raw database message.
- [ ] F6.3 Decimals like `33.33` → allowed? Write down the total shown.
- [ ] F6.4 Try to remove the last remaining criterion → button disabled.
- [ ] F6.5 Click **Back** with unsaved changes → prompt to save or discard.
- [ ] F6.6 Delete a rubric that is attached to an assessment → refused: "Detach this rubric from its assessments before deleting."
- [ ] F6.7 Edit a rubric that was already used to grade. Report what happens to the old grades.

### F7. Grading submissions
Open an assessment → **Submissions**.
- [ ] F7.1 The list shows each student with Status, Score, Submitted. Click a row.
- [ ] F7.2 Multiple choice / true-false answers show ✓ Correct / ✗ Incorrect and points. These cannot be changed by hand (on purpose).
- [ ] F7.3 Essay **Points Earned**: type `-1`, type more than the maximum, leave empty. Expected: red message, **Save Grade disabled**. **[RETEST]** (Before, these were accepted and later broke the grade calculation.)
- [ ] F7.4 Try to grade an attempt that is still **In Progress**. Expected: Save is disabled with an explanation. **[RETEST]**
- [ ] F7.5 Type a grade, then click another student **without saving**. Expected: "discard unsaved grading?" prompt. **[RETEST]**
- [ ] F7.6 With a rubric attached and "use rubric" on: tabs **All / Submission / Rubric**. Enter more than a criterion's max → refused.
- [ ] F7.7 Save the same grade 3 times without changing it. Expected: the student gets **one** "Assessment Graded" notification. Change the score and save → one more. **[RETEST]**
- [ ] F7.8 Erika's suggestion: an all-multiple-choice quiz is graded **automatically** on submit, no faculty save needed. Check that a student's MC-only quiz shows as Graded without you touching it.

### F8. Gradebook (where most grade bugs live)
- [ ] F8.1 Period tabs show "Prelim (30%)" etc. Open each.
- [ ] F8.2 **Components panel → Edit**: change weights so they total 90. Expected: Save disabled until exactly 100.
- [ ] F8.3 **Add** a component: weight bigger than what's left → refused.
- [ ] F8.4 Click **Calculate**. Expected: button shows it's working and can't be clicked twice. **[RETEST]**
- [ ] F8.5 Click **Audit Breakdown** on a student. Expected: each component shows `earned / max = %`, `× weight`, then the sum, `÷ total weight`, the raw grade, and the transmuted grade. Components with nothing graded say "no graded items yet, counts as 0%". **Do the math on a calculator. It must match.** **[RETEST]** (Erika: "it didn't show the raw calculation", "Invalid".)
- [ ] F8.6 Set up the trap: a component "Major Exam 40%" with no exam yet. Check a student's raw grade. It is capped at 60% because the exam counts as 0. That is how the system works; make sure the audit explains it.
- [ ] F8.7 After a trial **Calculate**, edit components. Expected: still editable. **[RETEST]** After **Submit to Registrar**, they lock with "Locked: grades for this period were submitted…". **[RETEST]**
- [ ] F8.8 **Flag Selector**: pick INC. Expected: a confirm window first. **[RETEST]** One message after, not two. **[RETEST]**
- [ ] F8.8b Click **Calculate** on a period where every grade is already submitted. Expected: "All N grades are locked because they were submitted." **[RETEST]**
- [ ] F8.13 The registrar returns your grades (R3.7). Expected: you get a notification with their reason; the grades are Draft again, so you can recalculate and submit again. **[RETEST]**
- [ ] F8.9 **Export CSV** → open in Excel → numbers match the screen.
- [ ] F8.10 **Submit to Registrar** with one enrolled student not calculated. Expected: refused, says how many students have no grade. **[RETEST]**
- [ ] F8.11 Submit properly → confirm "Submit Grades to Registrar?" → "Officially Submit Grades". Then try **Calculate** again. Expected: refused, grade is locked. **[RETEST]**
- [ ] F8.12 "Thresholds" button only shows when an admin allowed section overrides. Don't report it missing otherwise.

### F9. Attendance
- [ ] F9.1 Create a session for **tomorrow** → refused. **[RETEST]** For a date outside the term → refused. **[RETEST]**
- [ ] F9.2 Create a session on a **holiday marked "Class Suspended"** → refused: "Classes are suspended on this date…"
- [ ] F9.3 Create two sessions on the same date → second refused.
- [ ] F9.4 In step 2, mark some Absent/Late/Excused, create. Then open the session. Expected: the marks you chose are there (not everyone Present). **[RETEST]**
- [ ] F9.5 Change marks, then click another session without saving → "discard?" prompt. **[RETEST]**
- [ ] F9.6 Check the date shown on the session matches the date you picked (not one day earlier). **[RETEST]**
- [ ] F9.7 Absent/Excused students get a notification. Save twice without changes → still **one**. Change a student from Present to Absent → one new notification. **[RETEST]**
- [ ] F9.8 Delete a session → confirm.

### F10. Class Roster
- [ ] F10.1 Columns and badges: Pending Verification, At Risk, Dean's List Candidate.
- [ ] F10.2 **View Evaluation** → tabs Attendance / Assessments / Grades. Edit one attendance record here; check it changed in the Attendance tab too.
- [ ] F10.3 "Dean's List Candidate" follows the Academic Year's thresholds (step 6). Change the Dean's List cutoff in the Academic Year, reload the roster: the badges follow. **[RETEST]**

### F11. Discussions
- [ ] F11.1 **New Discussion**: empty title → error. Message of 2001+ characters → blocked.
- [ ] F11.2 Attach a file over 25 MB → skipped with a warning. Paste an image from the clipboard.
- [ ] F11.3 Reply with Enter (sends) and Shift+Enter (new line).
- [ ] F11.4 Pin, Mark resolved, Mark as answer.
- [ ] F11.5 Delete a reply and a thread → **confirm window** each time. **[RETEST]**
- [ ] F11.6 There is **no edit** for posts. Don't look for it.
- [ ] F11.7 With more than 50 threads, a **Load More (N older)** button appears and loads the rest. **[RETEST]**

### F12. Section Announcements
- [ ] F12.1 **Post Announcement** → goes to the announcement form with this section pre-selected → after saving, returns here.
- [ ] F12.2 The delete (trash) icon only shows on **your own** posts, not on admin/dean posts. **[RETEST]**

### F13. Student Evaluations page
- [ ] F13.1 Click each row in **Rating Distribution** (5, 4, 3, 2, 1 stars). Expected: the list filters every time, and the chip says e.g. "Rating: 3 Stars", never "Rating: undefined". **[RETEST]**
- [ ] F13.2 **Filters** window: Course, Section, Rating. **Reset Filters** clears all.

---

## Part S. STUDENT (least tested: go slow, try everything)

Log in as T-Student-1. Sidebar: **Dashboard, Announcements & Events, Calendar, Class Schedule, My Subjects, My Grades, Achievement & Honors Tracker, Faculty Evaluations, Curriculum Audit, Grade Report**.

### S1. First login and profile prompts
- [ ] S1.1 First login: the "Complete Your Profile Information" window. Then possibly a "Set Up Student Profile" window. Expected: **never two windows stacked** on top of each other. **[RETEST]**
- [ ] S1.2 Dashboard banner "Student Profile Missing" → **Set Up Student Profile** opens the same single window. Saving it updates the dashboard without refresh. **[RETEST]**
- [ ] S1.3 Banner "Academic Program Not Assigned" → "Go to Curriculum Checklist".

### S2. Dashboard
- [ ] S2.1 Stat cards: Enrolled Subjects, Upcoming Assessments, Grades to View. Match reality?
- [ ] S2.2 "Take Assessment" from the upcoming list opens the right one.

### S3. Class Schedule
- [ ] S3.1 Subject chips toggle subjects; "Show all".
- [ ] S3.2 Click a class block → "Customize Color" → pick a color → **Save Color**. F5: color kept. Hidden subjects come back after F5 (known: not saved).
- [ ] S3.3 Red "now" line is at the right time.

### S4. My Subjects and subject page
- [ ] S4.1 Card list; Filter & Sort is sort only.
- [ ] S4.2 Open a subject. Tabs: **Lessons & Syllabus, Assessments, Grades, Attendance, Discussions, Announcements**.
- [ ] S4.3 Paste another student's subject URL (ask a teammate for theirs). Expected: "Subject not found".
- [ ] S4.4 Lessons: draft modules are invisible; published ones show; mark a material complete; F5 keeps it.
- [ ] S4.5 Discussions: post, reply, attach. Students cannot pin.

### S5. Taking an assessment (most important student area)
Assessments tab. The row button says **Take**, **Resume**, **Retake (attempt n of m)**, **Opens <date>**, **Closed**, **Max attempts reached**, or **View Results**.

**Starting**
- [ ] S5.1 Click **Start Assessment Now** twice fast. Expected: only one attempt starts. **[RETEST]**
- [ ] S5.2 Turn off Wi-Fi, then open an assessment. Expected: an error with "Back to Subject" and "Try Again", not "Loading assessment…" forever. **[RETEST]**

**Answering and saving**
- [ ] S5.3 Pick a multiple-choice answer. Expected: next to the timer, "Saving…" then "All answers saved" right away. **[RETEST]**
- [ ] S5.4 Type in an essay and stop. After about 1.5 seconds: "All answers saved". **[RETEST]**
- [ ] S5.5 Answer 3 questions, then **press F5**. Expected: before leaving, the browser asks if you're sure (only if something is unsaved). After reload, click Resume: **your answers are still there**. **[RETEST]**
- [ ] S5.6 Answer, then close the tab and reopen it from the subject page → Resume → answers there.
- [ ] S5.7 Turn off Wi-Fi, change an answer. Expected: "Not saved". Turn Wi-Fi on, change again → "All answers saved".
- [ ] S5.8 Turn off Wi-Fi and click **Finish & Submit Assessment** → **Submit Assessment**. Expected: **not submitted**, one clear error, your answers still on screen. **[RETEST]** (Erika: "saved" but stayed on the page.)
- [ ] S5.9 Leave a required question empty and submit → "Answer all required questions before submitting (N remaining)."
- [ ] S5.10 File Upload question: upload a file of a type not allowed, over the size limit, an empty file, an `.exe`, and more files than allowed. Each gives its own message. **[RETEST]**
- [ ] S5.10b Upload a file, then remove it and let it save. Expected: it is gone from the answer. **[RETEST]**

**Timer and idle**
- [ ] S5.11 Timed quiz (e.g. 2 minutes): let it run out. Expected: auto-submits at 00:00, one "Time is up" message, a screen with **View Result**. No error toast every 30 seconds. **[RETEST]**
- [ ] S5.12 Start a timed quiz, close the browser, come back after the time is over, click the assessment. Expected: "Your last attempt ran out of time", **View Result**, and **Retake** only if attempts are left. It must **not** silently start a new attempt. **[RETEST]**
- [ ] S5.13 Start an untimed assessment and don't touch the mouse or keyboard for **31 minutes**. Expected: you are **not** signed out while the attempt is open. **[RETEST]** (Outside an assessment, 30 minutes idle shows "Session About to Expire" and signs out a minute later. That is on purpose.)
- [ ] S5.14 Set your computer clock 10 minutes ahead and take a timed quiz. Report what the timer does.

**Two tabs**
- [ ] S5.15 Open the same assessment in two tabs, answer different things in each, submit in tab 1, then submit in tab 2. Expected: tab 2 shows a clear message (e.g. "Submission is not in a submittable state."), no crash.

**Retake**
- [ ] S5.16 On a 3-attempt assessment, submit once. Expected: **Retake (attempt 2 of 3)** shows on the subject page and on the result page. **[RETEST]** (Before, students could never retake.)
- [ ] S5.17 Use all attempts → "Max attempts reached" → "View Assessment Results".

### S6. Results
- [ ] S6.1 All-multiple-choice quiz: submit with all **correct** answers. Expected: full score.
- [ ] S6.2 Submit with all **wrong** answers. Expected: a score of 0 is shown as **0 / total**, not as "no grade". (Erika's case.)
- [ ] S6.3 Submit with all **blank** answers (if none are required). Same: 0 shown.
- [ ] S6.4 The quiz from F5.9 (no results date, no close date, no due date): score shows **right after submitting**. **[RETEST]**
- [ ] S6.5 A quiz with a future "Show Results At": shows "Results will be available on …" and **no score hints** anywhere on the page. **[RETEST]**
- [ ] S6.6 A quiz with an essay: "awaiting grading" until the teacher saves a grade.
- [ ] S6.7 When the score is shown, the grade line matches the school's real grade table (the one the admin set in the Academic Year, step 5). **[RETEST]** (Before, this page used its own made-up table.)
- [ ] S6.8 Download a teacher's attachment and your own uploaded file. Expected: it opens, or a clear error. Never nothing. **[RETEST]**

### S7. My Grades, breakdown, evaluations
- [ ] S7.1 My Grades is a **table** with page numbers at the bottom if more than 10 rows. **[RETEST]**
- [ ] S7.2 Raw/Final/Transmuted show "Locked" until you do the faculty evaluation for that period. The **Evaluate** button takes you there.
- [ ] S7.3 After evaluation and release: the grade shown on **My Grades**, the **breakdown page**, **Grade Report** and **Curriculum Audit** must be **the same value, same format** (e.g. "1.50" everywhere, and "INC" everywhere if INC). **[RETEST]** (Before, one page said 2.5 and another said INC.)
- [ ] S7.4 Breakdown page: component percentages match what the teacher sees in Audit Breakdown.
- [ ] S7.4b Subject page → **Grades** tab after doing the evaluation, while the teacher has only **calculated** (not submitted), or submitted but the registrar has not released: expected **no grade shown**. **[RETEST]**
- [ ] S7.5 **Faculty Evaluations**: pick a faculty → **Proceed to Evaluation Form**. Answer half the ratings, **press F5**. Expected: your ratings come back. **[RETEST]**
- [ ] S7.6 Submit with a required question empty → "Please answer all required questions."
- [ ] S7.7 Submit, then try to submit again (Back button, or open the link again). Expected: "You have already completed this evaluation." / read-only view.
- [ ] S7.8 Turn off Wi-Fi and open the evaluation page. Expected: an error with "Try Again", not a silent jump back to the list. **[RETEST]**

### S8. Curriculum Audit and Grade Report
- [ ] S8.1 With no program: the "Academic Program Not Assigned" form with **Assign Program**. Students can only do this once.
- [ ] S8.2 With Wi-Fi off, open Curriculum Audit **as a student who has a program**. Expected: an error with "Try Again", **not** the assign-program form. **[RETEST]**
- [ ] S8.3 **Print Checklist** and **Print Report**: use Chrome print preview in light mode and dark mode, and on a phone. Nothing cut off; sidebar and buttons not printed.

### S9. Achievement & Honors Tracker
- [ ] S9.1 Tiles (GWA, attendance, etc.) match reality.
- [ ] S9.2 **What-If Grade & Honors Simulator**: courses with no grade start as "Not set (left out)". **[RETEST]**
- [ ] S9.3 Set one course to a grade, check the GWA by hand using **the real units** of each course (not 3 for every course). **[RETEST]**
- [ ] S9.4 Cumulative GWA does not count this term's released grades twice. **[RETEST]**
- [ ] S9.5 Grade options match the school's grade table. **Reset to Actual** works.

### S10. Profile (students)
- [ ] S10.1 Upload Photo: a 2.1 MB image → "The image must be 2 MB or smaller." A `.gif` → "Choose a JPG, PNG, or WEBP image."
- [ ] S10.2 **Remove** photo with Wi-Fi off. Expected: error, and your photo is **not** broken afterwards. **[RETEST]**
- [ ] S10.3 Change your name and click **Submit Profile Changes**. Expected: a "pending" banner; the form is locked; **View Changes** shows old vs new.
- [ ] S10.4 **Cancel Request** → asks to confirm first. **[RETEST]**
- [ ] S10.5 Security tab: wrong current password → "Your current password is incorrect." New password of 7 characters → error. Same as current → error.

---

## Part A. ADMIN

Sidebar: **Dashboard, Users, Profile Approvals, Academic Years, Departments, Calendar, Announcements & Events, Evaluations, Roles, Audit Log, Settings**. (**Roles** is new in the sidebar.) **[RETEST]**

### A1. Dashboard
- [ ] A1.1 Click Active Students, Active Faculty, Active Terms. Each opens the right filtered page.

### A2. Users
- [ ] A2.1 3-dot menu: **Create**, **Filter & Sort**, **Upload CSV**.
- [ ] A2.2 **Create** → "Add New User": empty names, spaces-only names, bad email. Double-click **Save** → only one invite.
- [ ] A2.3 Invite the same email twice → clear error.
- [ ] A2.4 Open the invite email → link → "Set Your Password" → password of 7 characters → "Password must be at least 8 characters." Mismatch → "Passwords do not match." Then **Activate Account** → login page says "Account activated successfully".
- [ ] A2.5 Open the same invite link again → "Link Expired or Invalid" with "Request New Link".
- [ ] A2.6 Card menu items depend on status. **Resend Invite** only on **Invited** users. **Reset Password** only on **Active** users. **Reactivate** only on **Inactive** users. **[RETEST]**
- [ ] A2.7 Click **Resend Invite** / **Reset Password** / **Reactivate** several times fast. Expected: the item greys out while working; only one email is sent. **[RETEST]**
- [ ] A2.8 Try to **Deactivate yourself**. Expected: the option isn't there for your own card; a bulk deactivate that includes you is refused with "You cannot deactivate your own account." **[RETEST]**
- [ ] A2.9 **Edit** a user's email to an email that already belongs to someone else. Expected: refused. Then log in with the **old** email: it must still work (the login email must not have changed). **[RETEST]**
- [ ] A2.10 Edit and remove your own Admin role → refused.
- [ ] A2.11 Deactivate a user who is logged in elsewhere. Expected: within 3 minutes, or as soon as they click back into the window, they are signed out and the login page says the account is inactive. **[RETEST]**
- [ ] A2.12 **Upload CSV** users (C1–C10). With 8+ rows, some may fail with "Email rate limit reached. Supabase allows only a few invitation emails per hour on the free plan. Try this row again later." Expected: each failed row says that, and rows after it say "Not sent…", instead of the whole import hanging. **[RETEST]**
- [ ] A2.13 Filter & Sort: Role, Status (the default is "Active & Invited"), City, Province. See L3–L5.

### A3. Profile Approvals (staff profile changes)
- [ ] A3.1 As T-Faculty-1, submit a profile change. As admin, open it.
- [ ] A3.2 "Show all fields (15)" / "Show changed fields only (n)".
- [ ] A3.3 On a **desktop** screen, type a bad mobile number in "Verified Value" and click **Approve Profile**. Expected: the field shows a red error and nothing is approved. **[RETEST]** (Before, Approve silently did nothing on desktop.)
- [ ] A3.4 Approve the same request in two tabs. Second tab: a clear "already been processed" message. **[RETEST]** (Before: nothing visible.)
- [ ] A3.5 **Reject Request** → "Confirm Rejection" stays disabled until a reason is typed.
- [ ] A3.6 Switch to another browser tab and back. Expected: the list does **not** jump back to the top. **[RETEST]**
- [ ] A3.7 The staff approval window now works like the registrar's student approval window (same kind of fields, errors and draft restore). Try a bad postal code at desktop width and at phone width. **[RETEST]**

### A4. Academic Years (6-step wizard)
Steps: **Identity & Dates → Terms & Windows → Grading Periods → Holidays & Exceptions → Grade Schema → Academic Thresholds**.
- [ ] A4.1 **Create**. Step 1: End before Start → error. A year overlapping an existing one → error. Max Units `0`, `61` → error.
- [ ] A4.2 Step 2: two terms; second term starting before the first ends → error. **Grading Deadline** before the term start → error. **[RETEST]**
- [ ] A4.3 Step 3: period weights totalling 90 → error toast. Component weights not 100 → error.
- [ ] A4.4 Step 4: add a holiday with "Class Suspended". There is **no "Configure Types" button anymore**. **[RETEST]**
- [ ] A4.5 Step 5: grade rows; Min > Max → error; rows overlapping → error.
- [ ] A4.6 Step 6: thresholds; Min GWA > Max → error.
- [ ] A4.7 **Save Calendar**. Tick "Set as Active Academic Year". Note: this **turns off every other year**, for everyone.
- [ ] A4.8 **Edit** a year: try to remove a term that already has sections → refused with a clear message. Remove a grading period that has grades/assessments → refused. **[RETEST]**
- [ ] A4.9 **View** a year (read-only) and click **Next Step** through all steps. Expected: never blocked by validation. **[RETEST]**
- [ ] A4.10 **Duplicate** a year to the next year. Expected: holidays are copied, and all term, period and holiday dates move to the new year (same month and day). A message tells you to review the dates. **[RETEST]**
- [ ] A4.11 Start a Create, close it, then start a Duplicate. Expected: Duplicate does **not** offer the Create draft. **[RETEST]**
- [ ] A4.12 **History**: create a year **without** holidays, then edit it and add a holiday. Open History → v1. Expected: v1 shows **no** holiday. **[RETEST]** (Hubilla's bug.)
- [ ] A4.12b History now shows the **same screens as the wizard** (read-only). **Compare Versions**: added/changed/removed items are marked on every step, and Step 1 shows "Original: …" under changed fields. Swap and Exit Compare work. **[RETEST]**
- [ ] A4.13 **Revert to vN** → confirm. If the wizard had unsaved changes, the confirm says they'll be discarded. **[RETEST]** One message only on failure. **[RETEST]**
- [ ] A4.14 **Delete** a year with only terms (no enrolled sections), single and with **Delete Selected**. Expected: both behave the same. **[RETEST]**
- [ ] A4.15 Filter & Sort → **Apply Filters** → the window closes. **[RETEST]**

### A5. Departments
- [ ] A5.1 **Create** → 3 steps: Department Details → Dean Assignment → Faculty Roster.
- [ ] A5.2 Description box: is the text visible without hovering? (Hubilla's bug; check in light and dark theme.)
- [ ] A5.3 **Rename** an existing department. Expected: its **code stays the same**. **[RETEST]**
- [ ] A5.4 "Reassign Here" moves a dean/faculty from another department. Check the other department afterwards.
- [ ] A5.5 Delete a department that still has a dean or faculty assigned → refused. **[RETEST]**
- [ ] A5.6 Save fails (Wi-Fi off) → the draft is still offered when you reopen. **[RETEST]**
- [ ] A5.7 One success message per save, not two. **[RETEST]**

### A6. Evaluations (faculty evaluation questionnaire)
- [ ] A6.1 **Create** → 2 steps. Rating Min `5`, Max `3` → error.
- [ ] A6.2 Cards here can't be selected anymore (there was no bulk action). **[RETEST]**
- [ ] A6.3 CSV with blank Section Title or Question Text → "These required cells are blank". **[RETEST]**
- [ ] A6.4 Hubilla noticed the CSV template has more fields than the form (Section Sequence, Section Description). Check the form now has the same fields; report any mismatch.
- [ ] A6.5 Delete a section students already answered → refused.

### A7. Roles
- [ ] A7.1 **Create** twice fast → only one role. **[RETEST]**
- [ ] A7.2 Rename a built-in role (e.g. Faculty). Expected: the shown code stays the real code. **[RETEST]**
- [ ] A7.3 Delete a built-in role or one assigned to users → refused.

### A8. Audit Log
- [ ] A8.1 Click the **INSERT (Create)** pill, then open Filter & Sort: Action Type already shows INSERT. Set it to "All Actions" → the pill follows. **[RETEST]**
- [ ] A8.2 Date From after Date To → error. **[RETEST]**
- [ ] A8.3 Do something at a known time (e.g. 7:30 AM), filter by today's date. Expected: it appears under today, not yesterday. **[RETEST]**
- [ ] A8.4 Click a card → "JSON Payload Inspector".

### A9. Settings
- [ ] A9.1 **Upload Logo**, then **Cancel**. Expected: the logo everywhere is unchanged. **[RETEST]**
- [ ] A9.2 Upload a 3 MB logo → refused (2 MB limit). A `.gif` → refused. **[RETEST]**
- [ ] A9.3 Upload a logo and **Save Settings** → new logo shows in every portal after F5 (no old cached image). **[RETEST]**
- [ ] A9.4 Open Settings with Wi-Fi off. Expected: a red error and Save disabled, **not** an empty form you could save over the real settings. **[RETEST]**

---

## Part D. DEAN

Sidebar: **Dashboard, Sections, Faculty Loading, Programs, Courses, Program Levels, Course Types, Calendar, Announcements & Events**. (The curriculum map is inside **Programs**, step 2.)

### D1. Dashboard
- [ ] D1.1 Each stat card opens the right page. Counts match. The **Schedule Conflicts** card is no longer clickable (no page lists room clashes). **[RETEST]**
- [ ] D1.4 Schedule Conflicts count: one section with two overlapping slots of its own does **not** count; two sections in the same room `rm 101` and `RM 101 ` at the same time **do** count. **[RETEST]**
- [ ] D1.2 "Needs a Faculty Assignment": click an item → opens that section's edit wizard.
- [ ] D1.3 Log in as a dean **not assigned to any department**. Expected: a banner on Dashboard, Sections, Courses, Programs, Faculty Loading: "Your account is not assigned to a department yet. Ask the admin to assign you in Departments." **[RETEST]**

### D2. Program Levels / D3. Course Types
- [ ] D2.1 Create, view, edit, delete. Code is generated from the name.
- [ ] D2.2 Duplicate name (different capitals, extra spaces) → refused.
- [ ] D2.3 Delete a level in use by a program → refused.
- [ ] D3.1 Delete a course type used by a course → refused: "Cannot delete: N course(s) use this type." **[RETEST]**
- [ ] D3.2 CSV tests C1–C10.

### D4. Courses
- [ ] D4.1 3 steps: **Overview Data → Course Type → Prerequisite**. Double-click **Save Course** → one course. **[RETEST]**
- [ ] D4.2 All units 0 → refused. **[RETEST]** Units `10.5`, `11` → refused.
- [ ] D4.3 Prerequisite = the course itself → see what happens.
- [ ] D4.4 Delete a course used in a curriculum map or section → refused.
- [ ] D4.5 **CSV**: unchanged template (C1). Then real rows where row 3's prerequisite is a course defined in row 5 of the **same file**. Expected: works. **[RETEST]**
- [ ] D4.7 CSV with a prerequisite code that doesn't exist. Expected: the course is still saved, and one **warning** message names the missing prerequisite (not an error). **[RETEST]**
- [ ] D4.6 CSV with a course code that belongs to **another department** → refused, not silently moved. **[RETEST]**

### D5. Programs and curriculum map
- [ ] D5.1 Step 1 **Program Details**: Duration (Years) `7` → refused (max 6). **[RETEST]**
- [ ] D5.2 Step 2 **Curriculum Map**: 3-dot menu: Add Entry, Upload CSV, Print Curriculum, Clear Curriculum.
- [ ] D5.3 Double-click **Save Program** → one program. **[RETEST]**
- [ ] D5.4 Make curriculum saving fail (Wi-Fi off right before Save), then click Save again with Wi-Fi on. Expected: **one** program, not two. **[RETEST]**
- [ ] D5.5 Print Curriculum → print preview looks right.
- [ ] D5.6 Delete a program with students → refused.

### D6. Sections (3-step wizard)
Steps: **Overview → Schedule → Grading Schema**.
- [ ] D6.1 Max Slots `0`, `1000` → refused.
- [ ] D6.2 Schedule slot with end before start → refused. Two overlapping slots in the same section → refused.
- [ ] D6.3 Give T-Faculty-1 two sections at the same day/time → conflict message. Same room, same time → conflict. 9:00–10:00 and 10:00–11:00 → **allowed** (touching is fine).
- [ ] D6.4 Make the schedule save fail, click Save again → **one** section, not two. **[RETEST]**
- [ ] D6.4b One success message per save, not two. **[RETEST]**
- [ ] D6.5 Edit a section with students: lower Max Slots below the number enrolled → refused. **[RETEST]** Change its course or term → refused. **[RETEST]**
- [ ] D6.6 Grading Schema override: set one, save, reopen → the override is still shown. Click "Default (Inherit)", save → override removed. **[RETEST]**
- [ ] D6.7 Filter by **Program** → list really filters. **[RETEST]** Sort by **Program** → no error. **[RETEST]**
- [ ] D6.8 **CSV** sections with days written `MWF`, `TTh`, `Mon Wed`, `M/W` and times `8:00 AM`, `08:00:00`, `13:00`. Expected: each either works or gives a row error. **Never a section silently saved without a schedule.** **[RETEST]**
- [ ] D6.9 Edit/Delete only show for sections in the **active** academic year.

### D7. Faculty Loading
- [ ] D7.1 Read-only wizard: Overview → Section List → Conflict.
- [ ] D7.2 The header button **Assign New Section** opens Section Management to create a new section for that faculty. **[RETEST]**
- [ ] D7.3 Conflict step lists **both** same-faculty clashes and **room** clashes (same room, same time, same term), with the other class's instructor. **[RETEST]**

### D8. Calendar (Dean)
Hubilla: "scheduled section slots don't appear in the calendar."
- [ ] D8.1 Month view → week of the term → the sections' classes appear on their days. Check in this order if missing: (1) is the dean assigned to the department of those courses? (2) is today inside the term's start/end dates? (3) is the day a "Class Suspended" holiday?
- [ ] D8.2 A class at **6:30 AM** and one at **9:30 PM**: both visible in **Week** and **Day** view. **[RETEST]**
- [ ] D8.3 Click Next 3 months in Month view, then **Day**. Expected: Day shows the selected date with its events. **[RETEST]**
- [ ] D8.4 Click Next/Prev very fast 10 times, then stop. Expected: the events shown belong to the month on screen. **[RETEST]**
- [ ] D8.5 Turn off Wi-Fi and reload the calendar → an error with **Retry**, not an empty calendar. **[RETEST]**

---

## Part R. REGISTRAR

Sidebar: **Dashboard, Section Enrollments, Grade Release, Profile Verification, Registrar Logs, Calendar, Announcements & Events**.

### R1. Dashboard
- [ ] R1.1 Two cards: **Subject Enrollments This Term** (one student in 5 subjects = 5) and **Students Enrolled This Term** (that student = 1). Check both numbers by hand. **[RETEST]** (Hubilla's note.)
- [ ] R1.2 "Enrollment Distribution" percentages add up to 100% over all students with a program. **[RETEST]**

### R2. Section Enrollments
- [ ] R2.1 Card menu: **Manage Enrollment**, **Assign Program & Year**, **View Current Load**, **Copy Student No.**, **Copy Email**.
- [ ] R2.2 **Assign Program & Year**: year level higher than the program's duration → refused. **[RETEST]**
- [ ] R2.3 **Manage Load**: add a section, drop another, then make the enrollment fail (e.g. a full section). Expected: the drop does **not** happen either, and **one** summary message. **[RETEST]**
- [ ] R2.4 Enroll in 3 sections where 1 is not allowed. Expected: a warning (not green) listing the skipped section and the **reason**. **[RETEST]**
- [ ] R2.4b Drop section A of a course and add section B of the **same course** in one save. Expected: works (switching sections).
- [ ] R2.4c Enrollment with the window closed but "Authorize prerequisite override" ticked. Expected: still refused for the closed window. **[RETEST]**
- [ ] R2.5 Schedule conflict: tick "Authorize overlapping schedule conflict(s)" and leave the reason empty → refused. Type a reason → saved. (The reason is now stored with the enrollment.) **[RETEST]**
- [ ] R2.6 Fill a section to Max Slots. Expected: it shows **Full** and can't take one more. Two registrars enrolling the last seat at the same time → only one gets it. **[RETEST]**
- [ ] R2.7 Try to drop a **Completed** or graded enrollment → refused. **[RETEST]**
- [ ] R2.8 **Credit Courses** (workspace header): credit a transferee course; revoke it ("Keep Credit" / "Yes, Revoke Credit").
- [ ] R2.9 **Upload CSV** enrollments: `section_codes` separated by `|`. C1–C10.

### R3. Grade Release
- [ ] R3.1 Tabs: All, Submitted, Pending Faculty, Released.
- [ ] R3.2 A section whose faculty only **calculated** (Draft) grades and didn't submit: the **Release** button does not show. **Release All** skips it and the message says how many drafts were skipped. **[RETEST]**
- [ ] R3.3 **Schedule** a release in the past → refused. **[RETEST]**
- [ ] R3.4 **Inspect** → grade sheet → **Approve & Release** → confirm. Students see grades only after their faculty evaluation.
- [ ] R3.5 A student with an INC flag pending blocks release. Check the message.
- [ ] R3.6 **Return to Faculty** (in Inspect, and the **Return** button on a section card) only shows for Submitted grades. The reason is required. **[RETEST]**
- [ ] R3.7 Return a section's grades with a reason. Expected: the faculty gets a notification with the reason; the section goes back to Pending Faculty; Registrar Logs shows "Grades Returned to Faculty". **[RETEST]**

### R4. Profile Verification (student profile changes)
- [ ] R4.1 As a student, change only your **name**. As registrar, approve. Expected: the student's **other fields are not wiped** (address, phone, etc. stay). **[RETEST]**
- [ ] R4.2 Reject with "Flag as False or Inaccurate Information" → the student gets a high-priority notice.
- [ ] R4.3 **Notify** → title and message required.

### R5. Registrar Logs
- [ ] R5.1 From date after To date → error. **[RETEST]**
- [ ] R5.2 Every approve/reject from R4 shows here.

---

## Part X. SHARED FEATURES (test with every role)

### X1. Login, passwords, access
- [ ] X1.1 Wrong password → **one** error message, not two. **[RETEST]**
- [ ] X1.2 10 wrong passwords in a row → write down what Supabase says.
- [ ] X1.3 **Forgot password?** → "Send Reset Link" → email → link. Expected: the page says **"Reset Your Password"** (not "activate your account"), and after saving, the login page says "Password updated". **[RETEST]**
- [ ] X1.4 Forgot password for a **deactivated** account → "Account Inactive". Reset password for a suspended user must **not** reactivate them. **[RETEST]**
- [ ] X1.5 As a student, paste `/admin/users`, `/faculty/sections`, `/registrar/grade-release`. Expected: "Access Denied: You do not have permission to access this page." and back to your home.
- [ ] X1.6 Log out, paste a deep link (e.g. a section page), log in. Expected: you land on that page if it's your role's page.
- [ ] X1.7 Idle 30 minutes on any page **except** an open assessment → "Session About to Expire" → "Stay Logged In" works; ignoring it signs you out after 1 minute.

### X2. Announcements & Events
- [ ] X2.1 Create an announcement for "Everyone (Global)". Check every role sees it.
- [ ] X2.2 Create one for "All Faculty". Students must **not** see it.
- [ ] X2.3 **Erika's bug:** open an announcement you created, change its type to **Event**, save. Expected: it becomes an event, no "Event not found". Then change it back to Announcement. **[RETEST]**
- [ ] X2.4 After changing the type, click the **old notification** for that post (as a student). Expected: it opens the converted item. People already notified do **not** get a second notification. **[RETEST]**
- [ ] X2.5 Students only see; they can't create/edit/delete.
- [ ] X2.6 Pinned posts stay on top.

### X3. Calendar (every role)
- [ ] X3.1 Views: Month, Week, Day, Agenda (on phone they're in the menu).
- [ ] X3.2 Category chips: All Items, Campus Events, Academic Deadlines, Class Schedule, Assessments & Due Dates, Holidays & Breaks. At least one must stay on.
- [ ] X3.3 Holidays show on the right date (not one day early). **[RETEST]**
- [ ] X3.4 Registrar's calendar has no class schedules (on purpose).
- [ ] X3.5 D8.3–D8.5 for every role. **[RETEST]**

### X4. Notification bell
- [ ] X4.1 Unread count goes up live when someone sends you something (no refresh).
- [ ] X4.2 Click the Unread/Read pill with Wi-Fi off. Expected: it does **not** flip. **[RETEST]**
- [ ] X4.3 **Mark all read** → count goes to 0.
- [ ] X4.4 Click a notification → goes to the right page.
- [ ] X4.5 The panel shows 8; **Load more (N older)** adds 8 more each click. A new notification arriving while it's open doesn't shrink the list back. **[RETEST]**
- [ ] X4.6 Hubilla: notification text hard to read. Check in **light and dark** theme.

### X5. AI Assistant
- [ ] X5.1 Ask a question. Expected: an answer within ~25 seconds, or "The AI assistant took too long to respond. Please try again in a moment." **Never a 5-minute wait.** **[RETEST]** (Erika's bug.)
- [ ] X5.2 After every answer, "Suggested questions" still shows. **[RETEST]**
- [ ] X5.3 When a question fails, it stays visible with a **Retry** button. Retry works, and the next question still gets a sensible answer. **[RETEST]**
- [ ] X5.4 Ask 5 questions quickly in a row. Report whether it gets "busy".
- [ ] X5.5 A 2001-character question → refused.
- [ ] X5.6 Refresh the page: the chat is **still there**. Sign out and back in: the chat is cleared. Another account on the same browser never sees your chat. **[RETEST]**

### X6. Theme and phone
- [ ] X6.1 The theme button cycles System → Light/Dark → … The tooltip says the current mode.
- [ ] X6.2 Go through each sidebar page in dark mode. List every place where text is hard to read (sidebar, notification panel, input boxes, the Departments Description box).
- [ ] X6.3 Phone (390 px): hamburger opens the menu; tapping an item closes it. Every page: no sideways scroll.

---

## Part E2E. Full life cycle (do last, in one sitting)

This is the chain that broke last time. Do it with real accounts, one step after another, checking the other role after each step.

1. [ ] Admin: active Academic Year with grading periods and a grade table.
2. [ ] Dean: course + section for T-Faculty-1 with a schedule.
3. [ ] Registrar: T-Student-1 and T-Student-2 enrolled. **Check:** the section appears for the faculty, and the class appears on both students' **Class Schedule** and **Calendar**.
4. [ ] Faculty: a quiz (MC only, 3 attempts), an exam (MC + essay), an activity with a rubric. All with a grading component.
5. [ ] Student 1: answers everything correctly. Student 2: everything wrong.
6. [ ] **Check:** quiz is auto-graded for both (no faculty action). Student 2 sees **0**, not "no grade".
7. [ ] Faculty: grades the essay and the rubric activity.
8. [ ] Faculty: Gradebook → **Calculate** → **Audit Breakdown** for both students. Do the math by hand. It must match.
9. [ ] Faculty: **Submit to Registrar**.
10. [ ] Students: My Grades shows **Locked** until the faculty evaluation is done. Do the evaluation.
11. [ ] Registrar: **Inspect** → **Approve & Release**.
12. [ ] Students: the grade is the same on **My Grades, the breakdown, Grade Report, Curriculum Audit**, and matches the faculty's sheet.
13. [ ] Faculty: try to Calculate again → refused (locked).
14. [ ] Admin: Audit Log shows these actions at the right times.

---

## Appendix 1. What changed on 2026-11-04 (so you know what to retest)

**Removed (don't look for these):**
- "Configure Types" button in Academic Year step 4 (it never saved anything).
- Faculty Loading editor buttons (Save Changes, Revert, Add to Load, reassign). They were never reachable. The "Edit Load" button is now "Assign New Section".
- The "Approved" tab code on Grade Release (it had no button).
- A read-only "View Assessment Details" mode that nothing opened.
- The separate "Save Rubric" button inside the assessment wizard (the main Save now saves the rubric).
- Card selection on Evaluations and Roles (there was nothing to do with selected cards).
- An unused second CSV upload window, an unused number input, an unused icon, and an unused second grade-checking tool.

**Behavior that changed on purpose:**
- New assessments start as **Draft**. Students see nothing until you click **Publish**.
- Publishing needs question points to add up to Total Points.
- Calculate and Submit to Registrar refuse locked grades.
- Students are not signed out for being idle while an assessment is open.
- A Resend Invite on a deactivated user is refused ("Reactivate this user first.").
- Registrars can only release grades the faculty **submitted**.
- Program duration is limited to 1-6 years (the curriculum map only goes to 6th year).
- Deans can only import courses into their own department.

## Appendix 2. Known limits (not bugs unless they hurt the demo)
- No edit for discussion posts.
- Discussion filters apply to the threads loaded so far (the panel says when older ones exist).
- A dean assigned to a department while signed in sees the "not assigned" banner until they reload.
- A deactivated user can keep working for up to 3 minutes before being signed out.
- Supabase free plan: few emails per hour; the database is small, so many testers at once can make it slow. Test with one or two people active when checking speed.
