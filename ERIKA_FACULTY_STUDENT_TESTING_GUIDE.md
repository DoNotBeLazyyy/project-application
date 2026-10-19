# 🎓 AU-JAS LMS: Erika Faculty & Student Complete UI Testing Guide

**Document Purpose:** Exhaustive, step-by-step manual testing guide for **Erika** to test 100% of the **Faculty** and **Student** features directly through the user interface (UI) on the latest production deployment.  
**Production URL:** `https://project-application-two.vercel.app`  
*(Local Development URL: `http://localhost:5173`)*  
**Active Academic Calendar (Shared Base):** `AY-2027-2028` — *Academic Year 2027–2028*  
**Operational Academic Term:** `1st Semester` (Status: **`Ongoing`**)  
**All Accounts Password:** **`TestPass123!`**  

---

## 📑 Table of Contents
1. [Test Accounts & Access Credentials](#1-test-accounts--access-credentials)
2. [Pre-Provisioned Base Environment Overview](#2-pre-provisioned-base-environment-overview)
3. [PART I: Faculty Portal — Complete UI Feature Testing Guide](#part-i-faculty-portal--complete-ui-feature-testing-guide)
   - [1. Authentication & Faculty Dashboard Overview](#1-authentication--faculty-dashboard-overview)
   - [2. My Sections Catalog & Workspace Access](#2-my-sections-catalog--workspace-access)
   - [3. Tab 1: Course Content & Modules Roadmap](#3-tab-1-course-content--modules-roadmap)
   - [4. Tab 2: 4-Tier Assessment Authoring Suite](#4-tab-2-4-tier-assessment-authoring-suite)
   - [5. Tab 3: Submissions & Rubric Grading Suite](#5-tab-3-submissions--rubric-grading-suite)
   - [6. Tab 4: Multi-Criterion Rubrics Builder](#6-tab-4-multi-criterion-rubrics-builder)
   - [7. Tab 5: Daily Attendance Session Wizard & Class Records](#7-tab-5-daily-attendance-session-wizard--class-records)
   - [8. Tab 6: Interactive Discussion Board & Thread Moderation](#8-tab-6-interactive-discussion-board--thread-moderation)
   - [9. Tab 7: Enrolled Student Roster & 3-Tab Holistic Evaluation Modal](#9-tab-7-enrolled-student-roster--3-tab-holistic-evaluation-modal)
   - [10. Tab 8: Grading Sheet, Special Flags & Section Policies](#10-tab-8-grading-sheet-special-flags--section-policies)
   - [11. Faculty Evaluation Analytics Hub](#11-faculty-evaluation-analytics-hub)
   - [12. Faculty Teaching Timetable & Universal Calendar](#12-faculty-teaching-timetable--universal-calendar)
   - [13. Faculty AI Lesson Copilot & Profile Management](#13-faculty-ai-lesson-copilot--profile-management)
4. [PART II: Student Portal — Complete UI Feature Testing Guide](#part-ii-student-portal--complete-ui-feature-testing-guide)
   - [1. Authentication & Student Dashboard Overview](#1-authentication--student-dashboard-overview)
   - [2. Weekly Timetable & Visual Class Matrix](#2-weekly-timetable--visual-class-matrix)
   - [3. My Subjects & Subject Studio Exploration](#3-my-subjects--subject-studio-exploration)
   - [4. Taking & Submitting All 4 Assessment Tiers](#4-taking--submitting-all-4-assessment-tiers)
   - [5. Assessment Results Review & Teacher Feedback](#5-assessment-results-review--teacher-feedback)
   - [6. Discussion Board Participation & Forum Q&A](#6-discussion-board-participation--forum-qa)
   - [7. Real-Time Attendance Rate Tracking](#7-real-time-attendance-rate-tracking)
   - [8. Mandatory Faculty Evaluation Suite (5 Sections)](#8-mandatory-faculty-evaluation-suite-5-sections)
   - [9. My Grades, Transmutations & Grade Breakdown](#9-my-grades-transmutations--grade-breakdown)
   - [10. 4-Year Curriculum Tracker & Degree Audit Prospectus](#10-4-year-curriculum-tracker--degree-audit-prospectus)
   - [11. Academic Insights & What-If Grade Simulator](#11-academic-insights--what-if-grade-simulator)
   - [12. Student Universal Interactive Calendar](#12-student-universal-interactive-calendar)
   - [13. Student AI Academic Tutor & Profile Requests](#13-student-ai-academic-tutor--profile-requests)
5. [PART III: Seamless Role-Switching (Unified Account)](#part-iii-seamless-role-switching-unified-account)
6. [Interactive Cross-Role Verification Checklist](#interactive-cross-role-verification-checklist)

---

## 🔑 1. Test Accounts & Access Credentials

All test accounts use the default password: **`TestPass123!`**.  
All accounts have pre-verified profiles (`profile_completed = true`), so you can immediately begin testing without onboarding delays.

| Role / Scope | Email | Password | Primary Purpose / Assigned Workspace |
| :--- | :--- | :--- | :--- |
| **Faculty (Dedicated)** | `erika.faculty@example.com` | `TestPass123!` | Instructor for `ERIKA-SEC-101`, `ERIKA-SEC-103`, `ERIKA-SEC-105` |
| **Faculty (Secondary)** | `erikapaulamendoza2003@gmail.com` | `TestPass123!` | Instructor for `ERIKA-SEC-104` (Web Systems) |
| **Student (Dedicated)** | `erika.student@example.com` | `TestPass123!` | Student (ID: `2026-00003`) enrolled in all 5 Erika sections |
| **Unified (All 5 Roles)** | `erika@example.com` | `TestPass123!` | Instant Role Switcher between Faculty (`ERIKA-SEC-102`), Student (ID: `2026-00002`), Admin, Dean, and Registrar |
| *Admin (Reference)* | `erika.admin@example.com` | `TestPass123!` | College administrator view for Erika College |
| *Dean (Reference)* | `erika.dean@example.com` | `TestPass123!` | Dean / Curriculum chair view for Computer Studies |
| *Registrar (Reference)* | `erika.registrar@example.com` | `TestPass123!` | University records view for student enrollments |

---

## 🏛️ 2. Pre-Provisioned Base Environment Overview

The following isolated base has been provisioned specifically for Erika under the shared **AY 2027–2028 (1st Semester)**:

* **Department:** `CCS-ERIKA` — *Erika College of Computer Studies*
* **Degree Program:** `ERIKA-BSCS` — *Erika Bachelor of Science in Computer Science* (4 Years, 168 Units)
* **Course Blueprints (5 Subjects):**
  1. `ERIKA-CS101`: *Erika Introduction to Computing & Programming* (2 Lec, 1 Lab = 3 Units)
  2. `ERIKA-CS102`: *Erika Data Structures & Algorithms* (2 Lec, 1 Lab = 3 Units)
  3. `ERIKA-CS103`: *Erika Database Management Systems* (2 Lec, 1 Lab = 3 Units)
  4. `ERIKA-CS104`: *Erika Web Systems & Technologies* (2 Lec, 1 Lab = 3 Units)
  5. `ERIKA-CS105`: *Erika Software Engineering & Architecture* (3 Lec, 0 Lab = 3 Units)
* **Class Sections & Faculty Loading (5 Sections):**
  1. `ERIKA-SEC-101`: Course `ERIKA-CS101` | Prof. Erika Faculty | Room `ERIKA-LAB-301` | Mon/Wed 08:00 AM – 10:00 AM
  2. `ERIKA-SEC-102`: Course `ERIKA-CS102` | Prof. Erika All-Roles | Room `ERIKA-LAB-302` | Tue/Thu 10:00 AM – 12:00 PM
  3. `ERIKA-SEC-103`: Course `ERIKA-CS103` | Prof. Erika Faculty | Room `ERIKA-LAB-303` | Mon/Wed 01:00 PM – 03:00 PM
  4. `ERIKA-SEC-104`: Course `ERIKA-CS104` | Prof. Pau Mendoza | Room `ERIKA-LAB-304` | Tue/Thu 02:00 PM – 04:00 PM
  5. `ERIKA-SEC-105`: Course `ERIKA-CS105` | Prof. Erika Faculty | Room `ERIKA-LEC-201` | Friday 09:00 AM – 12:00 PM
* **Student Enrollments:** Both `erika.student@example.com` and `erika@example.com` are officially enrolled in all 5 sections.
* **Faculty Evaluation Questionnaire (5 Sections):**
  - Section 1: *Teaching Effectiveness & Subject Mastery*
  - Section 2: *Instructional Materials & Learning Delivery*
  - Section 3: *Classroom Management & Inclusive Learning Environment*
  - Section 4: *Assessment Quality, Feedback & Student Mentoring*
  - Section 5: *Professionalism, Ethics & Academic Leadership*
* **Pre-Seeded Interactive Courseware (in `ERIKA-SEC-101`):**
  - Learning Modules (Modules 1 and 2) + Attached Lecture Slide Deck
  - 3-Criterion Performance Rubric (100 Points)
  - All 4 Assessment Tiers (Quiz 1, Lab Activity 1, Prelim Exam, Final Milestone Project)
  - Pinned Class Discussion Forum Thread
  - Attendance Session for Today with pre-marked records
  - Published Campus Announcement

---

# PART I: Faculty Portal — Complete UI Feature Testing Guide

> **Testing Account:** `erika.faculty@example.com`  
> **Password:** `TestPass123!`  
> **Primary Workspace:** Section **`ERIKA-SEC-101`** (also assigned to `ERIKA-SEC-103` and `ERIKA-SEC-105`)

---

### 1. Authentication & Faculty Dashboard Overview
1. Open your browser and navigate to `https://project-application-two.vercel.app/login`.
2. Enter email `erika.faculty@example.com` and password `TestPass123!`. Click **Sign In**.
3. You will land on the **Faculty Dashboard** (`/faculty`):
   - **Metric Cards:** Verify the summary counts:
     - `My Sections`: Displays **3** (Sections 101, 103, 105).
     - `Total Students`: Displays the aggregate count of enrolled students.
     - `Active Assessments`: Displays pre-seeded published assessments.
   - **University Announcements Card:** Observe the pinned welcome bulletin: *"Welcome to AY 2027-2028 - Erika College of Computer Studies"*.
   - **Today's Class Schedule:** Verify your upcoming Monday/Wednesday class blocks in `ERIKA-LAB-301`.

---

### 2. My Sections Catalog & Workspace Access
1. In the left navigation menu, click **Sections** (`/faculty/sections`).
2. Verify that your 3 assigned sections appear as interactive cards:
   - **`ERIKA-SEC-101`** (*Erika Introduction to Computing & Programming*)
   - **`ERIKA-SEC-103`** (*Erika Database Management Systems*)
   - **`ERIKA-SEC-105`** (*Erika Software Engineering & Architecture*)
3. Test the search bar: Type `CS101` to filter down to Section 101.
4. Click on the card for **`ERIKA-SEC-101`** to enter the **Section Studio Workspace**.

---

### 3. Tab 1: Course Content & Modules Roadmap
The Section Studio contains **8 dedicated tabs**. Start with **Modules**:
1. **Inspect Pre-Seeded Modules:**
   - Observe **Module 1: Foundations of Computing & Logic Formulation** (Published).
   - Observe **Module 2: Algorithmic Thinking & Control Flow** (Published).
   - Click Module 1 to expand: Verify the attached lecture item: *"Lecture 01 Slide Deck & Cheat Sheet"*. Click the link to test opening external documentation.
2. **Create a New Module (UI Test):**
   - Click the blue **+ Add Module** button.
   - In the modal, enter:
     - **Module Title:** `Module 3: Object-Oriented Fundamentals`
     - **Description:** `Introduction to classes, objects, and encapsulation in Python.`
     - **Sequence:** `3`
   - Click **Save Module**. Verify it immediately appears in the module tree.
3. **Add Learning Material to Module 3:**
   - In Module 3, click **+ Add Material**.
   - Fill in:
     - **Title:** `Module 3 Class Notes & Code Repository`
     - **Material Type:** Select `Link`.
     - **External URL:** `https://github.com`
     - **Available Date:** Leave default (immediate).
   - Click **Save Resource**. Confirm the material appears under Module 3.
4. **Publish / Unpublish Toggle:**
   - Click the toggle switch on Module 3 to change its status between Draft and Published.

---

### 4. Tab 2: 4-Tier Assessment Authoring Suite
Click the **Assessments** tab. Verify the 4 pre-seeded tiers:
* Tier 1: **Quiz 1: Python Basics & Expressions** (Quiz, 20 pts)
* Tier 2: **Lab Activity 1: Logic & Flow Control Exercise** (Activity, 30 pts)
* Tier 3: **Prelim Examination: Computing Principles** (Exam, 50 pts)
* Tier 4: **Final Project: Console Management Information System** (Project, 100 pts)

#### Create a New Assessment through the Wizard:
1. Click the blue **+ Create Assessment** button to launch the multi-step builder.
2. **Step 1 — Assessment Details:**
   - **Title:** `Quiz 2: Loops & Conditional Control`
   - **Assessment Type:** Select `Quiz`.
   - **Associated Module:** Select `Module 2: Algorithmic Thinking & Control Flow`.
   - **Description:** `Brief quiz evaluating while-loops and nested conditionals.`
   - Click **Next**.
3. **Step 2 — Rules & Deadlines:**
   - **Total Points:** `20`
   - **Passing Points:** `15`
   - **Time Limit (Minutes):** `25`
   - **Max Attempts:** `2`
   - **Due Date:** Select a date 7 days in the future.
   - **Toggles:** Turn on *Allow Student Review* and *Shuffle Questions*.
   - Click **Next**.
4. **Step 3 — Question Authoring:**
   - Click **+ Add Question**.
   - Choose **Multiple Choice**:
     - **Question Text:** `Which statement terminates a loop immediately in Python?`
     - **Points:** `10`
     - In Choice Builder, add 4 options:
       - Choice 1: `continue` (Incorrect)
       - Choice 2: `break` (Mark **Correct**)
       - Choice 3: `pass` (Incorrect)
       - Choice 4: `exit()` (Incorrect)
   - Click **Save Question**.
   - Click **+ Add Question** again.
   - Choose **Essay / Short Answer**:
     - **Question Text:** `Explain when you should use a while loop instead of a for loop.`
     - **Points:** `10`
   - Click **Save Question**.
5. **Step 4 — Finalize & Publish:**
   - Review the summary scoresheet (Total: 20 pts).
   - Click **Publish Assessment**. Confirm `Quiz 2` appears live in the assessment table.

---

### 5. Tab 3: Submissions & Rubric Grading Suite
Click the **Submissions** tab (or click **View Submissions** on any assessment card):
1. **View Student Submissions:**
   - When students submit attempts, their records appear here with submission timestamps and grading status (*Submitted*, *Graded*, or *Late*).
2. **Grade an Attempt:**
   - Click **Grade** next to an attempt by student `Erika Student`.
   - **Multiple Choice Questions:** Notice auto-graded scores are pre-filled.
   - **Essay / Code Questions:** Type points earned (e.g., `28 / 30`) and enter constructive instructor feedback in the remarks box: *"Excellent explanation of recursive time complexity."*
   - If rubric scoring is enabled, click the rubric level cells directly to award points.
   - Click **Submit Grade**. Verify the score is recorded and status changes to **Graded**.

---

### 6. Tab 4: Multi-Criterion Rubrics Builder
Click the **Rubrics** tab:
1. **Inspect Existing Rubric:**
   - View **"Comprehensive Programming & Lab Rubric"** (100 Points).
   - Notice the 3 weighted criteria:
     1. *Functional Correctness & Logic* (40 pts)
     2. *Code Quality & Software Architecture* (30 pts)
     3. *Testing, Documentation & Error Handling* (30 pts)
2. **Create a Custom Assessment Rubric (UI Test):**
   - Click **+ Create Rubric**.
   - Fill in:
     - **Rubric Title:** `Oral Presentation & Defense Rubric`
     - **Description:** `Evaluation rubric for software architecture defense.`
     - **Total Points:** `50`
   - Click **+ Add Criterion**:
     - **Criterion 1:** `Technical Architecture Mastery` (Max Points: `30`)
     - **Criterion 2:** `Clarity of Q&A Responses` (Max Points: `20`)
   - Click **Save Rubric**. Verify it appears in your rubric repository and is ready to attach to Projects or Activities.

---

### 7. Tab 5: Daily Attendance Session Wizard & Class Records
Click the **Attendance** tab:
1. **Inspect Pre-Seeded Today's Session:**
   - Notice today's session: *"Day 1 Orientation & Course Introduction Session"*.
   - Expand the session to see students `2026-00002` and `2026-00003` marked **Present**.
2. **Launch New Attendance Session:**
   - Click the green **+ Take Attendance** button.
   - **Date Picker:** Select today (or yesterday).
   - **Session Notes:** `Laboratory Session 02 - Syntax Debugging`.
   - **Student Roster:**
     - For student `2026-00003` (`erika.student@example.com`): Click **Present**.
     - For student `2026-00002` (`erika@example.com`): Click **Late**.
   - Click **Save Attendance Session**.
3. **Attendance Modification Modal (Remarks Audit):**
   - Click the **Edit (Pencil)** icon next to the student marked Late.
   - A modal appears: Change status to **Excused**.
   - In the required **Remarks** field, type: *"Excused due to university clinic consultation"*.
   - Click **Update Record**. Verify the record updates with the audit note.

---

### 8. Tab 6: Interactive Discussion Board & Thread Moderation
Click the **Discussions** tab:
1. **Inspect Pre-Seeded Thread:**
   - Click **"Welcome to ERIKA-CS101! Class Introduction Thread"** (Pinned).
   - Read the thread body and the instructor welcome post.
2. **Post a Faculty Reply / Clarification:**
   - In the reply text box at the bottom, type:
     *"Reminder: Laboratory exercises are due every Sunday at 11:59 PM. Feel free to ask questions here anytime."*
   - Click **Post Reply**. Verify your post appears in the discussion stream.
3. **Create a New Discussion Topic:**
   - Click **+ New Thread**.
   - **Title:** `FAQ: Python Virtual Environments & Setup`
   - **Body:** `Please post your questions regarding virtual environment activation on Windows and MacOS here.`
   - Check the **Pin to Top** checkbox.
   - Click **Publish Thread**. Verify the new pinned topic appears at the top.

---

### 9. Tab 7: Enrolled Student Roster & 3-Tab Holistic Evaluation Modal
Click the **Students** tab:
1. **Review Enrolled Roster:**
   - Verify both students are listed:
     - `2026-00003` — **Erika Student** (`erika.student@example.com`)
     - `2026-00002` — **Erika All-Roles** (`erika@example.com`)
   - Verify their academic status displays **Active / Enrolled**.
2. **Open the 3-Tab Holistic Student Evaluation Modal:**
   - Click on the name of **Erika Student** (`2026-00003`).
   - A detailed 3-tab modal opens:
     - **Tab A (Attendance):** Review attendance rate percentage and chronological session history.
     - **Tab B (Assessments):** Review all completed and pending quizzes, lab activities, exams, and projects with individual scores.
     - **Tab C (Grade Breakdown):** Inspect preliminary weighted scores across components.
   - Close the modal.

---

### 10. Tab 8: Grading Sheet, Special Flags & Section Policies
Click the **Grading** tab:
1. **Review Master Grade Sheet:**
   - Observe the full class matrix displaying student names, raw scores across grading periods (Prelim, Midterm, Finals), and automated weighted transmutation.
2. **Assign Special Grade Flags (`INC`, `DRP`, `FA`):**
   - Locate the action menu on a student row and click **Assign Special Flag**.
   - In the modal:
     - Select **Flag Type:** `INC` (*Incomplete*).
     - Enter **Reason:** `Pending submission of Final Project due to documented illness`.
     - Select **Completion Deadline:** Set 30 days ahead.
   - Click **Apply Flag**. Notice the high-visibility **INC** banner appears on the student's grade record.
   - Reopen the modal and select **Clear Flag** to restore normal grade calculation.
3. **Section Policy Threshold Overrides:**
   - Click the **Threshold Settings** button.
   - Inspect the passing grade threshold (default 75% or 3.0). You can customize section-specific rounding or cutoffs.

---

### 11. Faculty Evaluation Analytics Hub
1. In the top/left navigation, click **Evaluations** (`/faculty/evaluations`).
2. **Inspect Student Evaluation Feedback:**
   - View your overall teaching rating average (scale of 1.0 to 5.0).
   - Review performance breakdown across the **5 pre-seeded sections**:
     - Section 1: *Teaching Effectiveness & Subject Mastery*
     - Section 2: *Instructional Materials & Learning Delivery*
     - Section 3: *Classroom Management & Inclusive Learning Environment*
     - Section 4: *Assessment Quality, Feedback & Student Mentoring*
     - Section 5: *Professionalism, Ethics & Academic Leadership*
   - Read qualitative comments and feedback submitted anonymously by students.

---

### 12. Faculty Teaching Timetable & Universal Calendar
1. Click **Calendar** or **Schedule** in the navigation menu.
2. View your weekly teaching grid:
   - **Mon/Wed 08:00 AM – 10:00 AM:** `ERIKA-CS101` in Room `ERIKA-LAB-301`
   - **Mon/Wed 01:00 PM – 03:00 PM:** `ERIKA-CS103` in Room `ERIKA-LAB-303`
   - **Friday 09:00 AM – 12:00 PM:** `ERIKA-CS105` in Room `ERIKA-LEC-201`
3. Switch views between **Month**, **Week**, and **Day** agenda.

---

### 13. Faculty AI Lesson Copilot & Profile Management
1. Click the **AI Assistant** floating icon in the bottom corner.
2. Ask a pedagogical prompt:  
   *`"Generate 3 challenging multiple-choice questions on binary search trees with explanations."`*
3. Observe the AI assistant respond with formatted questions and answers.
4. Click on your profile avatar in the upper right -> **Profile Settings**:
   - Inspect your assigned department: **Erika College of Computer Studies** (`CCS-ERIKA`).
   - Test updating contact details or changing password.

---

# PART II: Student Portal — Complete UI Feature Testing Guide

> **Testing Account:** `erika.student@example.com`  
> **Password:** `TestPass123!`  
> **Student Number:** `2026-00003` | **Year Level:** `1st Year` | **Program:** `ERIKA-BSCS`

---

### 1. Authentication & Student Dashboard Overview
1. Sign out of any active session, or open a private/incognito browser window.
2. Navigate to `https://project-application-two.vercel.app/login`.
3. Sign in with `erika.student@example.com` and password `TestPass123!`.
4. You will arrive on the **Student Dashboard** (`/student`):
   - **Metric Cards:**
     - `Enrolled Subjects`: **5** (`ERIKA-CS101` through `ERIKA-CS105`).
     - `Attendance Rate`: Reflects live attendance percentage.
     - `Academic Standing`: Displays **Good Standing / Active**.
   - **Upcoming Assessments Banner:** Prominently displays due items (e.g., *Quiz 1: Python Basics & Expressions*, *Lab Activity 1*).
   - **Campus Announcements Feed:** Read the welcome announcement from Erika College.

---

### 2. Weekly Timetable & Visual Class Matrix
1. Click **Schedule** or **Timetable** (`/student/schedule`) in the navigation.
2. Observe your 5-day visual weekly timetable with color-coded subject blocks:
   - **Mon / Wed:**
     - 08:00 AM – 10:00 AM: `ERIKA-CS101` (Room: `ERIKA-LAB-301` | Prof. Erika Faculty)
     - 01:00 PM – 03:00 PM: `ERIKA-CS103` (Room: `ERIKA-LAB-303` | Prof. Erika Faculty)
   - **Tue / Thu:**
     - 10:00 AM – 12:00 PM: `ERIKA-CS102` (Room: `ERIKA-LAB-302` | Prof. Erika All-Roles)
     - 02:00 PM – 04:00 PM: `ERIKA-CS104` (Room: `ERIKA-LAB-304` | Prof. Pau Mendoza)
   - **Friday:**
     - 09:00 AM – 12:00 PM: `ERIKA-CS105` (Room: `ERIKA-LEC-201` | Prof. Erika Faculty)

---

### 3. My Subjects & Subject Studio Exploration
1. In the navigation, click **My Subjects** (`/student/subject`).
2. Observe your 5 enrolled course cards with subject codes, units, room numbers, and instructor names.
3. Click on the card for **`ERIKA-CS101`** to enter the **Student Subject Studio**:
   - **Roadmap / Syllabus:**
     - View **Module 1: Foundations of Computing & Logic Formulation**.
     - Click **Lecture 01 Slide Deck & Cheat Sheet** to open learning materials.
     - Check off completed topics to observe your progress bar update.
   - **Subject Navigation Tabs:** Switch between **Roadmap**, **Assessments**, **Attendance**, and **Discussions**.

---

### 4. Taking & Submitting All 4 Assessment Tiers
Navigate to the **Assessments** tab in `ERIKA-CS101` (or click directly from your Dashboard banner):

#### A. Take Quiz 1 (Tier 1: Timed Multiple Choice Quiz)
1. Locate **Quiz 1: Python Basics & Expressions** (20 pts, 30 min limit).
2. Click **Take Assessment** / **Start Quiz**.
3. **Assessment Player Interface:**
   - Notice the live countdown timer widget ticking in the top corner.
   - Question 1: *"What is the output of print(2 ** 3)?"* -> Click radio button **`8`**.
   - Question 2: *"Which built-in Python function returns the data type of an object?"* -> Click radio button **`type()`**.
4. Click **Submit Assessment**.
5. In the confirmation dialog, click **Confirm Submit**.
6. **Instant Results:** Verify immediate score output: **`20 / 20 (100%) - Passed`**.

#### B. Take Lab Activity 1 (Tier 2: Practical Coding / Essay)
1. Click **Lab Activity 1: Logic & Flow Control Exercise** (30 pts).
2. Click **Start Activity**.
3. In the essay/code text area, input your solution:
   ```python
   def factorial(n):
       if n <= 1:
           return 1
       return n * factorial(n - 1)

   # Time Complexity: O(N) linear recursions
   ```
4. Click **Submit Activity** and confirm submission. Status updates to **Submitted (Pending Faculty Review)**.

#### C. Take Prelim Exam (Tier 3: Major Examination)
1. Click **Prelim Examination: Computing Principles** (50 pts, 90 min limit).
2. Answer the questions:
   - Question 1: *"Which data structure follows First-In, First-Out (FIFO)?"* -> Select **`Queue`**.
   - Question 2: *"Explain the difference between mutable and immutable data structures."* -> Type your explanation.
3. Submit the exam attempt.

#### D. Submit Final Project (Tier 4: Milestone Project)
1. Click **Final Project: Console Management Information System** (100 pts, Rubric Scored).
2. Review the attached **Comprehensive Programming & Lab Rubric** breakdown.
3. In the submission field, enter your project GitHub repository link and architecture documentation.
4. Click **Submit Project**.

---

### 5. Assessment Results Review & Teacher Feedback
1. Once an assessment has been submitted or graded by the instructor, click **Review Answers** / **View Feedback**.
2. Verify:
   - Green highlights for correct answers.
   - Total score and percentage.
   - Instructor's written feedback annotations.
   - Itemized rubric scoresheet showing points awarded per criterion.

---

### 6. Discussion Board Participation & Forum Q&A
1. In the subject studio, click the **Discussions** tab.
2. Click on **"Welcome to ERIKA-CS101! Class Introduction Thread"**.
3. Read posts from Prof. Erika Faculty.
4. In the reply box, type your introduction:  
   *"Hello Prof. Erika! I am Erika Student. Looking forward to mastering algorithms and Python programming this semester!"*
5. Click **Post Reply**. Confirm your message appears with your student badge.

---

### 7. Real-Time Attendance Rate Tracking
1. Click the **Attendance** tab in `ERIKA-CS101` (or click Attendance in your main dashboard).
2. Review your personal attendance analytics:
   - **Attendance Percentage:** (e.g., `100%`).
   - Total sessions held, total attended, excused sessions, and absences.
   - Chronological breakdown with session dates and instructor notes.

---

### 8. Mandatory Faculty Evaluation Suite (5 Sections)
> **Crucial LMS Feature — Dual-Key Gating:** Students are required to evaluate their instructors across all 5 evaluation sections before end-of-term grades and report cards are unlocked.

1. In the navigation menu, click **Faculty Evaluation** (`/student/evaluation`).
2. **Evaluation Target Cards:**
   - Notice the evaluation cards for your assigned instructors:
     - **Prof. Erika Faculty** (for `ERIKA-CS101`, `ERIKA-CS103`, `ERIKA-CS105`)
     - **Prof. Erika All-Roles** (for `ERIKA-SEC-102`)
     - **Prof. Pau Mendoza** (for `ERIKA-SEC-104`)
3. Click **Evaluate Faculty** for **Prof. Erika Faculty**.
4. **Complete the 5-Section Evaluation Questionnaire:**
   - **Section 1: Teaching Effectiveness & Subject Mastery:**
     - Rate Q1 (*Mastery of subject matter*): Select **5 (Strongly Agree)**.
     - Rate Q2 (*Systematic and clear explanation*): Select **5 (Strongly Agree)**.
     - Rate Q3 (*Practical code demonstrations*): Select **5 (Strongly Agree)**.
     - Click **Next Section**.
   - **Section 2: Instructional Materials & Learning Delivery:**
     - Rate Q1 (*Well-structured modules & resources*): Select **5 (Strongly Agree)**.
     - Rate Q2 (*Modern technology & interactive tools*): Select **5 (Strongly Agree)**.
     - Rate Q3 (*Assignments reinforce lecture concepts*): Select **5 (Strongly Agree)**.
     - Click **Next Section**.
   - **Section 3: Classroom Management & Inclusive Learning Environment:**
     - Rate Q1 (*Inclusive and collaborative atmosphere*): Select **5 (Strongly Agree)**.
     - Rate Q2 (*Punctuality of class sessions*): Select **5 (Strongly Agree)**.
     - Rate Q3 (*Encourages active student participation*): Select **5 (Strongly Agree)**.
     - Click **Next Section**.
   - **Section 4: Assessment Quality, Feedback & Student Mentoring:**
     - Rate Q1 (*Assessments reflect course objectives*): Select **5 (Strongly Agree)**.
     - Rate Q2 (*Timely and constructive feedback*): Select **5 (Strongly Agree)**.
     - Rate Q3 (*Accessible during consultation hours*): Select **5 (Strongly Agree)**.
     - Click **Next Section**.
   - **Section 5: Professionalism, Ethics & Academic Leadership:**
     - Rate Q1 (*High ethical standards and impartiality*): Select **5 (Strongly Agree)**.
     - Rate Q2 (*Treats all students with dignity and respect*): Select **5 (Strongly Agree)**.
     - Rate Q3 (*Overall inspires academic excellence*): Select **5 (Strongly Agree)**.
     - Open-ended Feedback: Type: *"Exceptional professor. Clear explanations and great hands-on coding exercises."*
5. Click **Submit Evaluation**.
6. Confirm submission in the dialog. Verify the status updates to **Completed / Evaluated** with a green checkmark.

---

### 9. My Grades, Transmutations & Grade Breakdown
1. In the navigation, click **My Grades** (`/student/grade`).
2. **Subject Grade Cards:**
   - View your enrolled subjects (`ERIKA-CS101` to `ERIKA-CS105`).
   - Notice that completing your faculty evaluations removes the evaluation lock banner and displays released grades.
3. **Inspect Grade Breakdown:**
   - Click **View Breakdown** on `ERIKA-CS101`.
   - Review weighted scoring components:
     - Quizzes (Weight: 20%)
     - Laboratory Activities (Weight: 25%)
     - Major Examinations (Weight: 30%)
     - Term Project (Weight: 25%)
   - Verify raw percentage, Philippine grading transmutation (e.g., `1.00 - 1.25` / `95%+`), and **Passed** status.

---

### 10. 4-Year Curriculum Tracker & Degree Audit Prospectus
1. In the navigation, click **Curriculum** (`/student/curriculum`).
2. View your complete **4-Year Degree Audit Roadmap** for `ERIKA-BSCS`:
   - **Year 1, 1st Semester:**
     - All 5 Erika courses (`ERIKA-CS101` through `ERIKA-CS105`) mapped with 3.0 units each (15.0 units enrolled).
   - **Subsequent Semesters:**
     - View upcoming curriculum roadmap for 2nd Year, 3rd Year, and 4th Year specialization subjects.
   - **Degree Audit Summary:**
     - `Total Units Required`: 168 Units.
     - `Completed Units`: Live tally.
     - `Remaining Units`: Real-time graduation progress indicator.

---

### 11. Academic Insights & What-If Grade Simulator
1. In the navigation, click **Insights** (`/student/insight`).
2. **Academic Analytics:**
   - View your cumulative **General Weighted Average (GWA)** trend chart.
   - View unit completion velocity.
3. **Interactive What-If Grade Simulator:**
   - Scroll down to the **What-If Grade Simulator** panel.
   - Use the interactive sliders to adjust hypothetical scores for upcoming Final Exams and Term Projects.
   - Observe the live recalculation:
     - Simulated Term GWA.
     - Projected Honors Eligibility: **Dean's List / President's List**.
   - Test different slider values to model minimum scores needed to maintain target honors.

---

### 12. Student Universal Interactive Calendar
1. Click **Calendar** (`/calendar`).
2. View integrated calendar entries:
   - **Class Sessions:** Weekly recurring blocks for all 5 subjects.
   - **Assessment Deadlines:** Red/amber flags indicating due dates for Quiz 1, Lab Activity 1, Prelim Exam, and Final Project.
   - **University Events & Holidays:** Institutional dates from the active academic calendar.
3. Switch between Month, Week, and Day views.

---

### 13. Student AI Academic Tutor & Profile Requests
1. Click the floating **AI Assistant** icon in the bottom corner.
2. Ask an academic question:  
   *`"Can you explain the difference between a stack and a queue in programming with simple analogies?"`*
3. Observe the AI tutor's immediate structured explanation.
4. Click on your profile avatar in the upper right -> **Profile**:
   - Inspect verified student information: Student No `2026-00003`, Program `ERIKA-BSCS`, Year Level `1`.
   - Click **Request Profile Changes**: Enter updated address or emergency contact to test the Registrar audit pipeline.

---

# PART III: Seamless Role-Switching (Unified Account)

> **Account:** `erika@example.com`  
> **Password:** `TestPass123!`  
> **Roles Assigned:** **Admin**, **Dean**, **Registrar**, **Faculty**, and **Student**

If you want to rapidly test end-to-end multi-role workflows without logging out and back in:

1. Sign in to `erika@example.com`.
2. Locate the **Role Switcher** dropdown in the top navigation header.
3. **Faculty Mode:**
   - Select **Faculty**: You will immediately see Section **`ERIKA-SEC-102`** (*Erika Data Structures & Algorithms*).
   - Test creating lessons, taking attendance, or grading submissions as the instructor.
4. **Student Mode:**
   - Select **Student**: You are instantly transported into the student portal as Student ID `2026-00002`.
   - Take quizzes in `ERIKA-SEC-101`, submit project files, and complete faculty evaluations.
5. **Dean Mode:**
   - Select **Dean**: View the `CCS-ERIKA` department catalog, courses, and section schedules.
6. **Registrar Mode:**
   - Select **Registrar**: Inspect student admissions, enrollment rosters, and grade release queues.
7. **Admin Mode:**
   - Select **Admin**: Inspect the academic year status, department settings, and evaluation templates.

---

# 📋 Interactive Cross-Role Verification Checklist

Use this checklist during your testing to confirm that every feature operates cleanly:

- [ ] **Faculty Login & Dashboard:** Metric cards, schedule, and announcement feed load with zero errors.
- [ ] **Section Content Roadmap:** Pre-seeded Module 1 & 2 viewable; new Module 3 and material created and published via UI.
- [ ] **Assessment Authoring:** 4-tier assessment builder tested (Quiz, Activity, Exam, Project); questions and choices authoring works.
- [ ] **Rubrics Studio:** 3-criterion rubric inspected; new custom rubric created via UI.
- [ ] **Attendance Session Wizard:** Today's session inspected; new attendance session taken with Present/Late; modification modal tested with required remarks.
- [ ] **Class Discussion Forum:** Pre-seeded thread read; instructor reply posted; new pinned topic created via UI.
- [ ] **Enrolled Student Roster:** 3-tab holistic student evaluation modal opened (Attendance, Assessments, Grade Breakdown).
- [ ] **Grading Suite & Special Flags:** Student score entered; special grade flag (`INC`) applied with deadline and verified.
- [ ] **Faculty Evaluations Feedback:** Aggregated 5-section evaluation ratings and student comments inspected in `/faculty/evaluations`.
- [ ] **Student Dashboard & Timetable:** Color-coded 5-day visual weekly timetable loaded with no conflicting blocks.
- [ ] **Subject Studio:** Modules, reading resources, and external links accessible.
- [ ] **Taking Assessments:** Quiz 1 taken with countdown timer; instant 100% score verified; Lab Activity code submitted.
- [ ] **Submitting Faculty Evaluation:** All 5 sections completed with 1-5 ratings and written feedback; submission confirmed.
- [ ] **Grade Sheet & Breakdown:** Transmuted grades and component percentage breakdowns verified after evaluation completion.
- [ ] **Curriculum Tracker & Prospectus:** 4-year degree audit for `ERIKA-BSCS` viewed; completed vs remaining units validated.
- [ ] **What-If Grade Simulator:** Interactive sliders tested to project hypothetical GWA and honors standing.
- [ ] **Unified Role Switcher:** Instant role switching tested on `erika@example.com` across Faculty, Student, Dean, Registrar, and Admin.
