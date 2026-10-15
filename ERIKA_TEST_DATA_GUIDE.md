# 📋 AU-JAS LMS: Erika Test Environment & Data Reference Guide

**Purpose:** Comprehensive reference guide and quick-start manual for **Erika** to test the **Faculty** and **Student** experiences in the AU-JAS Learning Management System.  
**System URL:** `https://project-application-two.vercel.app` (or local `http://localhost:5173`)  
**Existing Academic Calendar:** `AY-2027-2028` — *Academic Year 2027–2028*  
**Active Operational Term:** `1st Semester` (Status: **`Ongoing`**)  

---

## 🔑 1. User Accounts & Credentials

All test accounts use the default password: **`TestPass123!`**

| Role / Scope | Email | Password | Description / Testing Focus |
| :--- | :--- | :--- | :--- |
| **Faculty (Dedicated)** | `erika.faculty@example.com` | `TestPass123!` | Primary instructor for section **`ERIKA-SEC-101`** |
| **Student (Dedicated)** | `erika.student@example.com` | `TestPass123!` | Enrolled student in **`ERIKA-SEC-101`** and **`ERIKA-SEC-102`** |
| **Unified (All 5 Roles)** | `erika@example.com` | `TestPass123!` | Switch between Admin, Dean, Registrar, Faculty, and Student |
| *Admin (Reference)* | `erika.admin@example.com` | `TestPass123!` | College administrator (department & system oversight) |
| *Dean (Reference)* | `erika.dean@example.com` | `TestPass123!` | Program chair & curriculum head for Computer Studies |
| *Registrar (Reference)* | `erika.registrar@example.com` | `TestPass123!` | Records officer (student admissions, enrollments, clearance) |

> [!NOTE]
> All Erika accounts have `profile_completed = true` pre-configured. You will **not** be interrupted by any profile onboarding modals and can proceed directly into feature testing.

---

## 🏛️ 2. Administrative & Academic Data Populated

All prerequisite setup from **Admin**, **Dean**, and **Registrar** has been completed under the currently active academic calendar. Every record is tagged with `"Erika"` / `"ERIKA"` for immediate identification.

### A. Academic Calendar & Term
* **Academic Year:** `AY-2027-2028` (*Academic Year 2027–2028*)
* **Active Term:** `1st Semester`
* **Term Status:** **`Ongoing`** *(Enables live class schedules, active subject studios, quizzes, attendance sessions, and grading)*

### B. Admin Setup
* **Academic Department:**
  * **Code:** `CCS-ERIKA`
  * **Name:** `Erika College of Computer Studies`
* **Department Assignment:** All Erika users are assigned to `CCS-ERIKA`.
* **Campus Announcement:**
  * **Title:** `Welcome to AY 2027-2028 - Erika College of Computer Studies`
  * **Audience:** Global
  * **Status:** Pinned & Published
* **Faculty Evaluation Template:**
  * **Title:** `Erika Faculty Teaching Effectiveness Evaluation`
  * **Scope:** Linked to the `ERIKA-BSCS` degree program
  * **Questions (1–5 Rating Scale):**
    1. *Demonstrates mastery of subject matter and explains programming concepts with clarity.*
    2. *Provides helpful, timely feedback and guidance on coding laboratory activities.*
    3. *Maintains an encouraging, inclusive, and professional academic environment.*
    4. *Organizes course modules and assignments effectively to facilitate student success.*

### C. Dean Setup (Catalog, Curriculum & Class Offerings)
* **Degree Program:**
  * **Code:** `ERIKA-BSCS`
  * **Name:** `Erika Bachelor of Science in Computer Science`
  * **Level:** `UNDERGRADUATE` (4 Years, 168 Units)
  * **Department:** `CCS-ERIKA`
* **Course Blueprints (Subjects):**
  1. **`ERIKA-CS101`** — *Erika Introduction to Computing & Programming*
     * Classification: `Lecture with Laboratory (LECTURE_LAB)`
     * Units: 2.0 Lecture + 1.0 Lab = **3.0 Total Units** (3.0 Credit Hours)
  2. **`ERIKA-CS102`** — *Erika Data Structures & Algorithms*
     * Classification: `Lecture with Laboratory (LECTURE_LAB)`
     * Units: 2.0 Lecture + 1.0 Lab = **3.0 Total Units** (3.0 Credit Hours)
* **Curriculum Map:**
  * Both `ERIKA-CS101` and `ERIKA-CS102` mapped to **Year Level 1, 1st Semester** of `ERIKA-BSCS`.
* **Class Sections & Faculty Loading:**
  1. **Section `ERIKA-SEC-101`:**
     * **Course:** `ERIKA-CS101`
     * **Assigned Faculty:** Prof. Erika Faculty (`erika.faculty@example.com`)
     * **Room:** `ERIKA-LAB-301`
     * **Max Slots:** 40
     * **Schedule:** **Monday & Wednesday (08:00 AM – 10:00 AM)**
  2. **Section `ERIKA-SEC-102`:**
     * **Course:** `ERIKA-CS102`
     * **Assigned Faculty:** Prof. Erika All-Roles (`erika@example.com`)
     * **Room:** `ERIKA-LAB-302`
     * **Max Slots:** 40
     * **Schedule:** **Tuesday & Thursday (10:00 AM – 12:00 PM)**

### D. Registrar Setup (Admissions & Enrollments)
* **Verified Student Records:**
  * **Dedicated Student:** `erika.student@example.com` (Student No: `2026-00003`, Status: `Active`, Year Level: `1`, Program: `ERIKA-BSCS`)
  * **Unified Student:** `erika@example.com` (Student No: `2026-00002`, Status: `Active`, Year Level: `1`, Program: `ERIKA-BSCS`)
* **Class Enrollments:**
  * Both students are **`Enrolled`** in **`ERIKA-SEC-101`** and **`ERIKA-SEC-102`**.

### E. Pre-Seeded Course Studio Content (in `ERIKA-SEC-101`)
* **Learning Module:** `Module 1: Foundations of Python Programming` (Published)
* **Lecture Material:** `Lecture 01 Slide Deck & Cheat Sheet` (Link to Python documentation)
* **Interactive Assessment:** `Quiz 1: Python Basics & Expressions`
  * Total Points: 20 pts (2 Multiple Choice Questions, 10 pts each)
  * Time Limit: 30 minutes (2 attempts allowed)
  * Status: Open and Published (due in 7 days)
  * Question 1: *"What is the output of print(2 ** 3)?"* (Correct answer: `8`)
  * Question 2: *"Which built-in Python function returns the data type of an object?"* (Correct answer: `type()`)
* **Discussion Board:** Pinned thread *"Welcome to ERIKA-CS101! Class Introduction Thread"* with instructor welcome greeting.

---

## 🧪 3. Step-by-Step Testing Guide

### Scenario A: Testing the Faculty Experience
**Account:** `erika.faculty@example.com` | **Password:** `TestPass123!`

1. **Sign In:** Go to `/login` and authenticate with `erika.faculty@example.com`.
2. **Faculty Dashboard (`/faculty`):**
   * Review live metric cards: `My Sections: 1`, `Total Students: 2`, `Published Assessments: 1`.
   * Review the global welcome announcement from Erika College.
3. **Sections Workspace (`/faculty/sections`):**
   * Open the section card for **`ERIKA-SEC-101`**.
4. **Interactive Tabs to Test:**
   * **Modules / Syllabus:** Review *Module 1* and attached reading material. Create a new module or add extra materials.
   * **Assessments:** View *Quiz 1: Python Basics & Expressions*. Try creating an Activity or Project.
   * **Class Record & Attendance:** Launch an attendance session wizard for today and mark students Present / Absent / Late.
   * **Class Discussion:** Open the pinned introduction thread and post a reply to the class.
   * **Student Roster:** Inspect the 2 enrolled students (`2026-00002` and `2026-00003`).
   * **Grading Suite:** Review pending student submissions, enter scores, or assign special flags (`INC`, `DRP`).

---

### Scenario B: Testing the Student Experience
**Account:** `erika.student@example.com` | **Password:** `TestPass123!`

1. **Sign In:** Go to `/login` and authenticate with `erika.student@example.com`.
2. **Student Dashboard (`/student`):**
   * Observe upcoming tasks banner: displays **`Quiz 1: Python Basics & Expressions`**.
3. **Weekly Timetable (`/student/schedule`):**
   * View the weekly visual grid displaying:
     * Mon/Wed 8:00 AM – 10:00 AM: `ERIKA-CS101` in `ERIKA-LAB-301`
     * Tue/Thu 10:00 AM – 12:00 PM: `ERIKA-CS102` in `ERIKA-LAB-302`
4. **My Subjects (`/student/subject`):**
   * View enrolled course cards: `ERIKA-CS101` and `ERIKA-CS102`.
   * Click **`ERIKA-CS101`** to enter the student subject studio:
     * Open **Module 1** and view lecture resources.
     * Navigate to **Assessments**, launch **`Quiz 1`**, answer the 2 questions, and submit your attempt.
     * Check **Discussions** and reply to the welcome thread.
     * Review your **Attendance Records** and **Grades** summary.
5. **Faculty Evaluation (`/student/evaluation`):**
   * Open the evaluation tab to submit ratings and feedback for Prof. Erika Faculty using the pre-seeded questionnaire.

---

### Scenario C: Testing the Unified Account (Role Switching)
**Account:** `erika@example.com` | **Password:** `TestPass123!`

* If you prefer to test all features using a single login, sign into `erika@example.com`.
* Use the **Role Switcher** in the navigation bar to toggle between:
  * **Faculty View:** Oversee and grade `ERIKA-SEC-102` (*Data Structures & Algorithms*).
  * **Student View:** Learn and submit coursework for both `ERIKA-SEC-101` and `ERIKA-SEC-102`.
  * **Dean / Registrar / Admin Views:** Inspect the underlying college catalog, enrollments, and institutional governance.
