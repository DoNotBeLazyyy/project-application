# 🏛️ AU-JAS LMS: Erika Full System Manual & Complete CRUD Verification Walkthrough

**Document Purpose:** 100% Complete, Exhaustive System Walkthrough, Every-Page CRUD Verification Guide, and Defense Demonstration Manual for **Erika** on **"An Upgraded AU-JAS LMS with Integrated AI Chatbot"**.  
**Production URL:** `https://project-application-two.vercel.app`  
*(Local Development URL: `http://localhost:5173`)*  
**Target Viewports:** Desktop (`1440x900`) & Mobile (`390x844` iPhone 14)  
**Roles Analyzed:** System Admin, Academic Dean, University Registrar, Faculty Member, Student Scholar (Dedicated Accounts & Unified Super-Account)  
**Active Operational Calendar:** `AY-2027-2028` — *Academic Year 2027–2028* (1st Semester: **`Ongoing`**)  
*(Strictly follows the primary operational cycle established in the Master Walkthrough. Zero duplicate/unnecessary academic years created!)*  
**All Accounts Password:** **`TestPass123!`**  
**Erika Namespace Prefix:** **`ERIKA-`** *(Guarantees 100% collision-free testing alongside other presenters and baseline institutional data)*  

---

## 📋 Table of Contents
1. [Master System Credentials & Pre-Seeded Erika Accounts](#1-master-system-credentials--pre-seeded-erika-accounts)
2. [Ready-to-Use Sample CSV Files Repository (Erika Namespace)](#2-ready-to-use-sample-csv-files-repository-erika-namespace)
3. [Global Architecture & Oral Defense Highlights](#3-global-architecture--oral-defense-highlights)
4. [ACT I: System Administrator — Full Page & CRUD Verification](#act-i-system-administrator--full-page--crud-verification)
   - [Phase 1.1: Admin Authentication, Bento Metrics & Dynamic Feeds (`/admin`)](#phase-11-admin-authentication-bento-metrics--dynamic-feeds-admin)
   - [Phase 1.2: User Management Full Lifecycle CRUD & Soft-Delete (`/admin/users`)](#phase-12-user-management-full-lifecycle-crud--soft-delete-adminusers)
   - [Phase 1.3: Universal Bulk CSV Import System (`/admin/users`)](#phase-13-universal-bulk-csv-import-system-adminusers)
   - [Phase 1.4: Staff Profile Verification Queue & Side-by-Side Diff CRUD (`/admin/profile-verifications`)](#phase-14-staff-profile-verification-queue--side-by-side-diff-crud-adminprofile-verifications)
   - [Phase 1.5: Department Management 3-Step Wizard & Strict Faculty Scoping CRUD (`/admin/departments`)](#phase-15-department-management-3-step-wizard--strict-faculty-scoping-crud-admindepartments)
   - [Phase 1.6: Academic Year Governance, Historical Snapshot Diff & Policy Audits (`/admin/school-years`)](#phase-16-academic-year-governance-historical-snapshot-diff--policy-audits-adminschool-years)
   - [Phase 1.7: Faculty Evaluation Period & Questionnaire 2-Step Wizard CRUD (`/admin/evaluations`)](#phase-17-faculty-evaluation-period--questionnaire-2-step-wizard-crud-adminevaluations)
   - [Phase 1.8: Multi-Audience Announcements & Campus Events Communication Hub CRUD (`/admin/announcement-management`)](#phase-18-multi-audience-announcements--campus-events-communication-hub-crud-adminannouncement-management)
   - [Phase 1.9: Universal Interactive Calendar (Admin View CRUD) (`/admin/calendar`)](#phase-19-universal-interactive-calendar-admin-view-crud-admincalendar)
   - [Phase 1.10: Forensic Audit Logs & JSON Payload Inspector (`/admin/audit-logs`)](#phase-110-forensic-audit-logs--json-payload-inspector-adminaudit-logs)
   - [Phase 1.11: Role Management & Permission Matrix Inspector (`/admin/roles`)](#phase-111-role-management--permission-matrix-inspector-adminroles)
   - [Phase 1.12: System Settings, Institution Identity & Upload Constraints CRUD (`/admin/system-settings`)](#phase-112-system-settings-institution-identity--upload-constraints-crud-adminsystem-settings)
   - [Phase 1.13: Admin Profile Management & AI Assistant Copilot (`/admin/profile`)](#phase-113-admin-profile-management--ai-assistant-copilot-adminprofile)
5. [ACT II: Academic Dean — Curriculum Blueprints, Faculty Load & Conflicts](#act-ii-academic-dean--curriculum-blueprints-faculty-load--conflicts)
   - [Phase 2.1: Dean Authentication & College Metrics (`/dean`)](#phase-21-dean-authentication--college-metrics-dean)
   - [Phase 2.2: Program Level Management CRUD (`/dean/program-level-management`)](#phase-22-program-level-management-crud-deanprogram-level-management)
   - [Phase 2.3: Course Type Management CRUD (`/dean/course-type-management`)](#phase-23-course-type-management-crud-deancourse-type-management)
   - [Phase 2.4: Degree Program Catalog & Curriculum Mapping Wizard CRUD (`/dean/program-management`)](#phase-24-degree-program-catalog--curriculum-mapping-wizard-crud-deanprogram-management)
   - [Phase 2.5: Course Blueprints Management CRUD (`/dean/course-management`)](#phase-25-course-blueprints-management-crud-deancourse-management)
   - [Phase 2.6: Section Scheduling 3-Step Wizard CRUD (`/dean/section-management`)](#phase-26-section-scheduling-3-step-wizard-crud-deansection-management)
   - [Phase 2.7: Faculty Loading 3-Step Wizard & Collision Evaluation Matrix CRUD (`/dean/faculty-load`)](#phase-27-faculty-loading-3-step-wizard--collision-evaluation-matrix-crud-deanfaculty-load)
   - [Phase 2.8: College Announcements & Event Broadcasts CRUD (`/dean/announcement-management`)](#phase-28-college-announcements--event-broadcasts-crud-deanannouncement-management)
   - [Phase 2.9: Dean Universal Interactive Calendar CRUD (`/dean/calendar`)](#phase-29-dean-universal-interactive-calendar-crud-deancalendar)
   - [Phase 2.10: Dean Profile Change Request & AI Assistant Copilot (`/dean/profile`)](#phase-210-dean-profile-change-request--ai-assistant-copilot-deanprofile)
6. [ACT III: University Registrar — Verification, Shifting, Batch Enrollment & Audit](#act-iii-university-registrar--verification-shifting-batch-enrollment--audit)
   - [Phase 3.1: Registrar Authentication & Enrollment Operations Overview (`/registrar`)](#phase-31-registrar-authentication--enrollment-operations-overview-registrar)
   - [Phase 3.2: Academic Program Assignment & Year Level Setting CRUD (`/registrar/enrollment-management`)](#phase-32-academic-program-assignment--year-level-setting-crud-registrarenrollment-management)
   - [Phase 3.3: Individual Student Enrollment Workspace CRUD (`/registrar/enrollment-management`)](#phase-33-individual-student-enrollment-workspace-crud-registrarenrollment-management)
   - [Phase 3.4: Registrar Batch Bulk CSV Enrollment Pipeline CRUD (`/registrar/enrollment-management`)](#phase-34-registrar-batch-bulk-csv-enrollment-pipeline-crud-registrarenrollment-management)
   - [Phase 3.5: Student Verification, Clearance & Promotion Review CRUD (`/registrar/student-verification`)](#phase-35-student-verification-clearance--promotion-review-crud-registrarstudent-verification)
   - [Phase 3.6: Section Grade Audit & Official Cryptographic Grade Release Clearance CRUD (`/registrar/grade-release`)](#phase-36-section-grade-audit--official-cryptographic-grade-release-clearance-crud-registrargrade-release)
   - [Phase 3.7: Registrar Forensic Audit Logs & Transaction Filter (`/registrar/registrar-logs`)](#phase-37-registrar-forensic-audit-logs--transaction-filter-registrarregistrar-logs)
   - [Phase 3.8: Registrar Announcements & Campus Notices CRUD (`/registrar/announcement-management`)](#phase-38-registrar-announcements--campus-notices-crud-registrarannouncement-management)
   - [Phase 3.9: Registrar Interactive Calendar CRUD (`/registrar/calendar`)](#phase-39-registrar-interactive-calendar-crud-registrarcalendar)
   - [Phase 3.10: Registrar Profile Change Request & AI Records Copilot (`/registrar/profile`)](#phase-310-registrar-profile-change-request--ai-records-copilot-registrarprofile)
7. [ACT IV: Faculty Member — Pedagogy, 8-Tab Workspace Studio, Attendance & Grading](#act-iv-faculty-member--pedagogy-8-tab-workspace-studio-attendance--grading)
   - [Phase 4.1: Faculty Authentication & Workspace Access (`/faculty`)](#phase-41-faculty-authentication--workspace-access-faculty)
   - [Phase 4.2: Sections Catalog & 8-Tab Workspace Overview (`/faculty/sections`)](#phase-42-sections-catalog--8-tab-workspace-overview-facultysections)
   - [Phase 4.3: Tab 1 — Modules & Syllabus Roadmap CRUD (`/faculty/sections/:id`)](#phase-43-tab-1--modules--syllabus-roadmap-crud-facultysectionsid)
   - [Phase 4.4: Tab 2 — 4-Tier Assessment Authoring Suite CRUD (Quiz, Exam, Activity, Project)](#phase-44-tab-2--4-tier-assessment-authoring-suite-crud-quiz-exam-activity-project)
   - [Phase 4.5: Tab 3 — Assessment Submissions & Rubrics Grading Suite CRUD](#phase-45-tab-3--assessment-submissions--rubrics-grading-suite-crud)
   - [Phase 4.6: Tab 4 — Multi-Criterion Rubrics Builder Studio CRUD](#phase-46-tab-4--multi-criterion-rubrics-builder-studio-crud)
   - [Phase 4.7: Tab 5 — Daily Attendance Session Wizard & Class Records CRUD](#phase-47-tab-5--daily-attendance-session-wizard--class-records-crud)
   - [Phase 4.8: Tab 6 — Interactive Discussion Board & Thread Moderation CRUD](#phase-48-tab-6--interactive-discussion-board--thread-moderation-crud)
   - [Phase 4.9: Tab 7 — Enrolled Student Class Roster & 3-Tab Holistic Student Evaluation Modal](#phase-49-tab-7--enrolled-student-class-roster--3-tab-holistic-student-evaluation-modal)
   - [Phase 4.10: Tab 8 — Grading Sheet, Special Grade Flags & Section Policies CRUD](#phase-410-tab-8--grading-sheet-special-grade-flags--section-policies-crud)
   - [Phase 4.11: Faculty Evaluation Analytics Hub (`/faculty/evaluations`)](#phase-411-faculty-evaluation-analytics-hub-facultyevaluations)
   - [Phase 4.12: Faculty Class Announcements & Strict Cohort Isolation CRUD (`/faculty/announcement-management`)](#phase-412-faculty-class-announcements--strict-cohort-isolation-crud-facultyannouncement-management)
   - [Phase 4.13: Faculty Teaching Schedule & Interactive Calendar CRUD (`/faculty/calendar`)](#phase-413-faculty-teaching-schedule--interactive-calendar-crud-facultycalendar)
   - [Phase 4.14: Faculty Profile Management, Security & AI Lesson Copilot (`/faculty/profile`)](#phase-414-faculty-profile-management-security--ai-lesson-copilot-facultyprofile)
8. [ACT V: Student Scholar — Learning Experience, Degree Audit & Mobile UI](#act-v-student-scholar--learning-experience-degree-audit--mobile-ui)
   - [Phase 5.1: Student Authentication & Bento Dashboard Overview (`/student`)](#phase-51-student-authentication--bento-dashboard-overview-student)
   - [Phase 5.2: Timetable & Interactive Schedule Matrix (`/student/schedule`)](#phase-52-timetable--interactive-schedule-matrix-studentschedule)
   - [Phase 5.3: Enrolled Subject Studio & Syllabus Roadmap Progress CRUD (`/student/subjects`)](#phase-53-enrolled-subject-studio--syllabus-roadmap-progress-crud-studentsubjects)
   - [Phase 5.4: Taking & Submitting All 4 Assessment Tiers CRUD](#phase-54-taking--submitting-all-4-assessment-tiers-crud)
   - [Phase 5.5: Assessment Submission Results Review & Teacher Feedback](#phase-55-assessment-submission-results-review--teacher-feedback)
   - [Phase 5.6: Threaded Discussion Forum Participation & Reply CRUD](#phase-56-threaded-discussion-forum-participation--reply-crud)
   - [Phase 5.7: Attendance Rate Verification & Absence Record Tracking](#phase-57-attendance-rate-verification--absence-record-tracking)
   - [Phase 5.8: Mandatory Faculty Evaluation Suite (5 Sections) CRUD (`/student/evaluations`)](#phase-58-mandatory-faculty-evaluation-suite-5-sections-crud-studentevaluations)
   - [Phase 5.9: Grade Sheet & Scrollable Component Breakdown (`/student/grade`)](#phase-59-grade-sheet--scrollable-component-breakdown-studentgrade)
   - [Phase 5.10: 4-Year Curriculum Tracker & Degree Audit Prospectus CRUD (`/student/curriculum`)](#phase-510-4-year-curriculum-tracker--degree-audit-prospectus-crud-studentcurriculum)
   - [Phase 5.11: Academic Analytics, GWA Tracker & What-If Grade Simulator CRUD (`/student/insight`)](#phase-511-academic-analytics-gwa-tracker--what-if-grade-simulator-crud-studentinsight)
   - [Phase 5.12: Mobile Responsiveness & Touch Drawer Audit (iPhone 390x844)](#phase-512-mobile-responsiveness--touch-drawer-audit-iphone-390x844)
   - [Phase 5.13: Student Profile Change Request Submission & AI Academic Tutor CRUD (`/student/profile`)](#phase-513-student-profile-change-request-submission--ai-academic-tutor-crud-studentprofile)
   - [Phase 5.14: Student Universal Interactive Calendar CRUD (`/student/calendar`)](#phase-514-student-universal-interactive-calendar-crud-studentcalendar)
9. [ACT VI: Seamless Role Switching & End-to-End Cross-Role Workflows](#act-vi-seamless-role-switching--end-to-end-cross-role-workflows)
   - [Phase 6.1: Unified Super-Account Instant Role Switcher Test](#phase-61-unified-super-account-instant-role-switcher-test)
   - [Phase 6.2: Complete End-to-End Grade Lifecycle (Faculty Compute -> Registrar Clearance -> Student Card)](#phase-62-complete-end-to-end-grade-lifecycle-faculty-compute---registrar-clearance---student-card)
   - [Phase 6.3: End-to-End Staff Profile Verification Loop (Submission -> Admin Approval -> Sync)](#phase-63-end-to-end-staff-profile-verification-loop-submission---admin-approval---sync)
10. [Master AG-Grid Sort, Filter & AI Prompt Verification Matrix](#master-ag-grid-sort-filter--ai-prompt-verification-matrix)

---

## 1. Master System Credentials & Pre-Seeded Erika Accounts

All Erika accounts are pre-provisioned and active in the database with status `Active`, `profile_completed = true`, and password **`TestPass123!`**.

| Role / Scope | Display Name | Email Address | Password | Student ID / Scope Context |
| :--- | :--- | :--- | :--- | :--- |
| **Unified (All 5 Roles)** | Erika All-Roles | `erika@example.com` | `TestPass123!` | Instant Role Switcher (Student ID: **`2026-00002`**) |
| **System Admin** | Erika Admin | `erika.admin@example.com` | `TestPass123!` | Institutional Systems Governance & Admin Portal |
| **Academic Dean** | Erika Dean | `erika.dean@example.com` | `TestPass123!` | Dean, Erika College of Computer Studies (`CCS-ERIKA`) |
| **Registrar** | Erika Registrar | `erika.registrar@example.com` | `TestPass123!` | Office of the University Registrar & Enrollment |
| **Faculty Member** | Prof. Erika Faculty | `erika.faculty@example.com` | `TestPass123!` | Instructor for `ERIKA-SEC-101` & `ERIKA-SEC-102` |
| **Student Scholar** | Erika Student | `erika.student@example.com` | `TestPass123!` | Student ID: **`2026-00003`** (ERIKA-BSCS Year 1) |
| **Personal Account (Unified)** | Erika Mendoza | `paosiopao16@gmail.com` | `TestPass123!` | All 5 Roles Granted (Student ID: **`2026-00004`**) |
| **Secondary Faculty (Personal)** | Rika Mendoza | `erikapaulamendoza2003@gmail.com` | `TestPass123!` | Faculty Member |

> [!TIP]
> **Unified Super-Account:** Logging in as `erika@example.com` (or `paosiopao16@gmail.com`) gives instant access to the **Role Switcher** in the top navigation bar. You can jump directly between Admin, Dean, Registrar, Faculty, and Student without having to log out!

---

## 2. Ready-to-Use Sample CSV Files Repository (Erika Namespace)

Ready-made, pre-validated sample CSV files with Erika-specific data have been generated in `public/sample-csv/erika/`. You can download them or open them locally:

| Entity / Module | Role | Direct File Link | Included Sample Content |
| :--- | :--- | :--- | :--- |
| **User Accounts** | Admin | [01_users_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/01_users_bulk_sample.csv) | Erika sample faculty and students (`CCS-ERIKA`) |
| **Departments** | Admin | [02_departments_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/02_departments_bulk_sample.csv) | `CCS-ERIKA` (Erika College of Computer Studies) |
| **Program Levels** | Dean | [03_program_levels_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/03_program_levels_bulk_sample.csv) | `UNDERGRADUATE` (Undergraduate Degree) |
| **Course Types** | Dean | [04_course_types_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/04_course_types_bulk_sample.csv) | `LECTURE_LAB` (Lecture with Laboratory) |
| **Degree Programs** | Dean | [05_programs_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/05_programs_bulk_sample.csv) | `ERIKA-BSCS` (168 Units, 4 Years) |
| **Courses & Blueprints** | Dean | [06_courses_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/06_courses_bulk_sample.csv) | `ERIKA-CS101` (Intro to Computing), `ERIKA-CS102` (Discrete Structures) |
| **Curriculum Maps** | Dean | [07_curriculum_map_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/07_curriculum_map_bulk_sample.csv) | `ERIKA-CS101` (Yr 1, 1st Sem, 3 Units), `ERIKA-CS102` |
| **Sections & Schedules** | Dean | [08_sections_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/08_sections_bulk_sample.csv) | `ERIKA-SEC-101` (Tue/Thu 09:00-11:00 AM, Room ERIKA-LAB-201) |
| **Assessment Questions** | Faculty | [09_assessment_questions_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/09_assessment_questions_bulk_sample.csv) | Multiple Choice, True/False, Essay with answer keys |
| **Student Enrollments** | Registrar | [10_enrollments_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/10_enrollments_bulk_sample.csv) | Student `2026-00003` enrolled into `ERIKA-SEC-101` |
| **Evaluation Templates** | Admin | [11_evaluations_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/11_evaluations_bulk_sample.csv) | ERIKA Teaching Effectiveness & Laboratory Mentorship |

---

## 3. Global Architecture & Oral Defense Highlights

1. **Multi-Role Security Perimeter:** Strict role-based workspace protection separating Admin, Dean, Registrar, Faculty, and Student interfaces.
2. **Operational Calendar Continuity:** Follows the established active academic year **`AY-2027-2028`** (**1st Semester `Ongoing`**) across all live modules without creating disruptive duplicate years.
3. **Every-Page Comprehensive CRUD:** Complete Create, Read, Update, and Delete/Deactivate test coverage across every single page and module.
4. **Dual-Key Grade Release Mechanism:** Faculty computes grades with automated transmutation; grades are locked with an immutable cryptographic state and released only after Registrar clearance.
5. **Context-Aware AI Assistant Drawer:** Conversational AI grounded dynamically in user permissions, active role, and enrolled sections.
6. **Universal Multi-Step Wizards & Bulk CSV Pipelines:** Guided wizards with draft recovery and CSV batch importers across 10 modules.
7. **Zero Namespace Collisions:** Prefixed strictly with `ERIKA-` so test data remains 100% clean and isolated.

---

## ACT I: System Administrator — Full Page & CRUD Verification

### Phase 1.1: Admin Authentication, Bento Metrics & Dynamic Feeds (`/admin`)
1. Navigate to `/login`.
2. Input credentials:
   - **Email:** `erika.admin@example.com` *(or use `erika@example.com` and switch to Admin)*
   - **Password:** `TestPass123!`
3. Click **Sign In**.
4. **CRUD — Read (Dashboard Analytics):**
   - **Bento Stat Cards:** Inspect real-time counts: **Active Students**, **Active Faculty**, and **Active Terms** (`1` Active Term: `1st Semester`).
   - **Announcements Feed Card:** Review "Latest Announcements". Test filtering by `All`, `Active`, and `Archived`.
   - **Events Feed Card:** Review "Upcoming Events". Test filtering by `Upcoming` and `Past`.
   - Click **View All Announcements & Events** to verify navigation.

---

### Phase 1.2: User Management Full Lifecycle CRUD & Soft-Delete (`/admin/users`)
Navigate to `/admin/users` via sidebar.

1. **CRUD — Create (User Creation):**
   - Click **+ Add User** (opens `CreateUserForm`).
   - Fill in:
     - **First Name:** `Temp`
     - **Last Name:** `ErikaTester`
     - **Email:** `temp.erika@example.com`
     - **Role:** Select `Faculty`
   - Click **Save / Submit** (button displays loading spinner).
2. **CRUD — Read & Filter:**
   - In the table search input, type `ErikaTester`.
   - Verify row renders: *Temp ErikaTester*, role `Faculty`, status `Active`.
   - Test Role Filter: switch dropdown between `All Roles`, `Faculty`, `Student`, `Dean`, `Registrar`, `Admin`.
3. **CRUD — Update (Edit User):**
   - Locate `temp.erika@example.com` row. Click action menu (`...`) ➔ Click **Edit**.
   - Change Last Name to `UpdatedErikaTester`.
   - Click **Save**. Verify updated display name in the grid.
4. **CRUD — Delete (Soft-Delete & Deactivation):**
   - Click action menu (`...`) on `temp.erika@example.com` ➔ Click **Delete / Deactivate**.
   - Confirm in modal. Verify status updates to `Inactive` or row disappears from active filter.

---

### Phase 1.3: Universal Bulk CSV Import System (`/admin/users`)
1. In `/admin/users`, click Table Actions (`...`) ➔ **Bulk Import (CSV)**.
2. Click **Download CSV Template** to review the official format.
3. Upload [01_users_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/01_users_bulk_sample.csv).
4. Review the parsed validation preview grid displaying *ErikaFacSample*, *ErikaStudSample1*, *ErikaStudSample2*.
5. Click **Close** (or import).

---

### Phase 1.4: Staff Profile Verification Queue & Side-by-Side Diff CRUD (`/admin/profile-verifications`)
Navigate to `/admin/profile-verifications` via sidebar **Profile Approvals**.

1. **CRUD — Read & Filter:**
   - Inspect queue of pending identity update requests submitted by staff members.
   - Filter tabs: `Pending`, `Approved`, `Rejected`.
2. **CRUD — Update / Decision (Side-by-Side Diff):**
   - Click **Review Request** on any pending row to open `StaffProfileVerificationModal`.
   - Inspect side-by-side comparison cards: Current Verified Profile vs Requested Changes.
   - Enter decision remarks: `"Verified against AU-JAS HR archives."`.
   - Click **Approve** (or **Reject**). Verify loading spinner and instant status transition.

---

### Phase 1.5: Department Management 3-Step Wizard & Strict Faculty Scoping CRUD (`/admin/departments`)
Navigate to `/admin/departments` via sidebar **Departments**.

1. **CRUD — Create (3-Step Department Wizard):**
   - Click **+ Add Department**.
   - **Step 1: Department Details:**
     - Name: `Erika College of Computer Studies`
     - Code: `CCS-ERIKA`
     - Description: `Center of Excellence in Computer Science, Software Engineering, and AI Systems.`
     - Click **Next →**.
   - **Step 2: Dean Assignment:**
     - Search and select **Erika Dean** (`erika.dean@example.com`).
     - Review Dean Profile Card. Click **Next →**.
   - **Step 3: Faculty Roster Assignment:**
     - Search and check **Prof. Erika Faculty** (`erika.faculty@example.com`).
     - Badge confirms `1 Faculty Selected`.
   - Click **Save Department**.
2. **CRUD — Read & Search:**
   - Search `CCS-ERIKA` in the table search bar. Verify row renders with Dean and Faculty counts.
3. **CRUD — Update:**
   - Click Action menu (`...`) on `CCS-ERIKA` ➔ Click **Edit**.
   - Modify Description: `Updated Center of Excellence in Computer Science & AI.` ➔ Click **Save**.
4. **CRUD — Delete (Temporary Department Test):**
   - Click **+ Add Department** ➔ Name: `Temp Dept DeleteMe`, Code: `TEMP-DEL`, Description: `Testing delete`. Click **Save**.
   - On `TEMP-DEL`, click Action menu (`...`) ➔ **Delete** ➔ Confirm modal to verify clean deletion.
5. **Bulk CSV Import:**
   - Click Table Actions (`...`) ➔ **Bulk Import (CSV)**.
   - Test uploading [02_departments_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/02_departments_bulk_sample.csv).

---

### Phase 1.6: Academic Year Governance, Historical Snapshot Diff & Policy Audits (`/admin/school-years`)
Navigate to `/admin/school-years` via sidebar **Academic Years**.

> [!IMPORTANT]
> **OPERATIONAL CALENDAR INTEGRITY:**
> In accordance with instructions, you will **NOT create another academic year**. The platform actively runs on **`AY-2027-2028`** (**`Academic Year 2027-2028`**, 1st Semester: `Ongoing`).
> You will perform complete **Read, Inspection, Version History Audit, and Policy Update CRUD** on `AY-2027-2028`!

1. **CRUD — Read & Inspect Existing Academic Year:**
   - Locate **`AY-2027-2028`** row. Verify green badge: `Active`.
   - Click Action menu (`...`) ➔ Click **View Details / Calendar Setup**.
   - **Step 1 Inspection:** Verify Start Date `08/01/2027`, End Date `05/31/2028`, Code `AY-2027-2028`, Label `Academic Year 2027-2028`, `[x] Active`.
   - **Step 2 Inspection (Terms):** Verify Term 1 (`1st Semester`, 08/16/2027 to 12/18/2027, Max Units: 24, Status: `Ongoing`) and Term 2 (`2nd Semester`).
   - **Step 3 Inspection (Grading Periods):** Verify `Prelim` (30%), `Midterm` (30%), `Finals` (40%) with respective exam and encoding date windows.
   - **Step 4 Inspection (Transmutation):** Inspect official 1.00 - 5.00 grade transmutation scale.
   - **Step 5 Inspection (Exceptions):** Review calendar holiday and suspension rules.
2. **CRUD — Read (Version History & Stepper Diff):**
   - On `AY-2027-2028` row, click Action menu (`...`) ➔ **View History / Versions**.
   - Inspect historical snapshots (`school_year_histories`), change summaries, and timestamp audit trail.
3. **CRUD — Update (Non-Destructive Policy Update):**
   - In the wizard modal, update the calendar notes or threshold description.
   - Click **Save Academic Year Calendar**. Verify confirmation toast without changing active state.
4. **CRUD — Read (Search & Filters):**
   - Test Year Filter: filter by `2027`.
   - Test Status Filter: switch between `All`, `Active`, `Inactive`. Clear filter.

---

### Phase 1.7: Faculty Evaluation Period & Questionnaire 2-Step Wizard CRUD (`/admin/evaluations`)
Navigate to `/admin/evaluations` via sidebar **Faculty Evaluations**.

1. **CRUD — Create (2-Step Evaluation Wizard):**
   - Click **+ New Evaluation Template** (opens `EvaluationWizardModal`).
   - **Step 1: Evaluation Period & Scope:**
     - Template Name: `ERIKA Faculty Evaluation Instrument 2027-2028`
     - Target School Year: `AY-2027-2028`
     - Target Term: `1st Semester`
     - Evaluation Scope: Select `Per Grading Period`
     - Click **Next →**.
   - **Step 2: Questionnaire Builder:**
     - Add Section: `Teaching Effectiveness & Technical Mastery`.
     - Add Questions:
       1. Question: `The instructor demonstrates comprehensive mastery of computational concepts.` | Type: `Rating` (1 to 5 Likert Scale).
       2. Question: `The instructor provides actionable feedback on assignments.` | Type: `Rating` (1 to 5).
       3. Question: `Constructive comments and suggestions for course improvement.` | Type: `Essay / Text`.
   - Click **Save Evaluation Template**.
2. **CRUD — Read:**
   - Verify `ERIKA Faculty Evaluation Instrument 2027-2028` appears in the evaluation table with status `Active`.
3. **CRUD — Update:**
   - Click Action menu (`...`) on the template ➔ **Edit**.
   - Add a 4th question: `Maintains punctual and organized laboratory sessions.` | Type: `Rating`.
   - Click **Save**.
4. **CRUD — Delete (Temporary Evaluation):**
   - Click **+ New Evaluation Template** ➔ Name: `Temp Eval DeleteMe` ➔ Save.
   - On `Temp Eval DeleteMe`, click Action menu (`...`) ➔ **Delete** ➔ Confirm modal.
5. **Bulk CSV Import:**
   - Click Table Actions (`...`) ➔ **Bulk Import (CSV)**.
   - Upload [11_evaluations_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/11_evaluations_bulk_sample.csv).

---

### Phase 1.8: Multi-Audience Announcements & Campus Events Communication Hub CRUD (`/admin/announcement-management`)
Navigate to `/admin/announcement-management` via sidebar **Announcements & Events**.

1. **CRUD — Create (Announcement):**
   - Click **+ Create Announcement**.
   - Fill in:
     - **Title:** `ERIKA College General Assembly & AI Orientation`
     - **Audience:** Select `All Users` (or select multi-audience tags: `Faculty`, `Students`)
     - **Category:** `Academic Bulletin`
     - **Content:** `Welcome to the First Semester of AY-2027-2028. All students are requested to review class schedules.`
     - **Publish Immediately:** `[x] Active`
   - Click **Publish Announcement**.
2. **CRUD — Create (Campus Event):**
   - Click **+ Create Event** (or navigate to `/admin/announcement-management/new?type=Event`).
   - Title: `ERIKA Hackathon & Emerging Tech Symposium`
   - Event Date: `09/15/2027`
   - Location: `AU-JAS Main Auditorium / Virtual Hybrid`
   - Click **Publish Event**.
3. **CRUD — Read & Filter:**
   - Filter tabs: `All`, `Announcements`, `Events`.
   - Search `Assembly` or `Hackathon` in the search bar.
4. **CRUD — Update:**
   - Click on `ERIKA College General Assembly & AI Orientation` row.
   - Update title to: `ERIKA College General Assembly & AI Orientation (Updated)`.
   - Click **Save Changes**.
5. **CRUD — Delete / Archive:**
   - Create a temporary notice `Temp Notice DeleteMe`.
   - Click Action menu (`...`) ➔ **Archive / Delete** ➔ Confirm.

---

### Phase 1.9: Universal Interactive Calendar (Admin View CRUD) (`/admin/calendar`)
Navigate to `/admin/calendar` via sidebar **Calendar**.

1. **CRUD — Read (Calendar Views & Filtering):**
   - Inspect monthly, weekly, and daily grid views.
   - Notice institutional term dates, major exam windows, and announcements auto-rendered on dates.
   - Test Category Filter checkboxes: `Term Dates`, `Major Exams`, `Announcements`, `Events`.
2. **CRUD — Create (Calendar Event Modal):**
   - Click on any upcoming date cell (or click **+ Add Calendar Event**).
   - Title: `ERIKA IT Governance Committee Meeting`
   - Date & Time: Select target date, 02:00 PM - 04:00 PM.
   - Category: `Institutional Event`.
   - Click **Save Event**.
3. **CRUD — Update:**
   - Click on the newly created event pill in the calendar grid.
   - Update time to 03:00 PM - 05:00 PM. Click **Save Changes**.
4. **CRUD — Delete:**
   - Click on the event pill ➔ Click **Delete Event** ➔ Confirm modal.

---

### Phase 1.10: Forensic Audit Logs & JSON Payload Inspector (`/admin/audit-logs`)
Navigate to `/admin/audit-logs` via sidebar **Audit Logs**.

1. **CRUD — Read (Audit Trail):**
   - Inspect comprehensive log rows capturing every administrative action performed in Phases 1.1 - 1.9.
   - Filter by Action: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`.
   - Filter by Entity: `school_years`, `users`, `departments`, `evaluations`.
2. **CRUD — Read (JSON Payload Modal):**
   - Click **View Payload / Details** on any recent log row.
   - Inspect formatted before/after JSON diff showing exact modified fields and actor UUID.

---

### Phase 1.11: Role Management & Permission Matrix Inspector (`/admin/roles`)
Navigate to `/admin/roles` via sidebar **Roles & Permissions**.

1. **CRUD — Read:**
   - Inspect system roles table: `Admin`, `Dean`, `Registrar`, `Faculty`, `Student`.
   - Review assigned user counts per role.
2. **CRUD — Read (Permissions Matrix):**
   - Click on any role row to view its granular permission checklist (e.g. `manage_users`, `manage_curriculum`, `submit_grades`, `release_grades`).

---

### Phase 1.12: System Settings, Institution Identity & Upload Constraints CRUD (`/admin/system-settings`)
Navigate to `/admin/system-settings` via sidebar **System Settings**.

1. **CRUD — Read & Inspect Settings:**
   - Inspect institutional tabs: **General Settings**, **Storage & Uploads**, **AI Integration**, **Security & Sessions**.
2. **CRUD — Update:**
   - Under General: Update System Name to: `AU-JAS Learning Management System (Erika Instance)`.
   - Under Storage: Set Max File Upload Size to `25 MB`.
   - Under AI Integration: Verify model status: `Gemini Active`.
   - Click **Save All Settings**. Verify success alert.

---

### Phase 1.13: Admin Profile Management & AI Assistant Copilot (`/admin/profile`)
1. Navigate to `/admin/profile`.
2. **CRUD — Read & Update Profile:**
   - Review verified administrator profile card.
   - Update Bio: `Institutional Systems Governance & Quality Assurance Administrator.`
   - Update Phone: `+63 917 555 0101`.
   - Click **Save Changes**.
3. **AI Assistant Copilot Verification:**
   - Click the AI Assistant floating trigger (bottom-right).
   - Enter prompt: `"Summarize the active status of AY-2027-2028 and list departments registered under Erika."`
   - Verify AI responds in real-time referencing live institutional data.

---

## ACT II: Academic Dean — Curriculum Blueprints, Faculty Load & Conflicts

### Phase 2.1: Dean Authentication & College Metrics (`/dean`)
1. Log in with **`erika.dean@example.com`** *(or switch role to Dean)*, password **`TestPass123!`**.
2. **CRUD — Read (Dashboard Overview):**
   - Inspect Dean Bento Stat Cards: Total Programs, Active Courses, Assigned Faculty, Total Sections.
   - Review Department Affiliation Card: `CCS-ERIKA` (Erika College of Computer Studies).

---

### Phase 2.2: Program Level Management CRUD (`/dean/program-level-management`)
Navigate to `/dean/program-level-management` via sidebar.

1. **CRUD — Create:**
   - Click **+ Add Program Level**.
   - Code: `TEMP-PL-LEVEL`, Label: `Temporary Level for Delete Test`, Description: `Testing CRUD`.
   - Click **Save**.
2. **CRUD — Read & Search:**
   - Search `TEMP-PL` in the search input. Verify row displays.
3. **CRUD — Update:**
   - Click **Edit** on `TEMP-PL-LEVEL` ➔ Change Label to `Updated Temp Level` ➔ Click **Save**.
4. **CRUD — Delete:**
   - Click **Delete** on `TEMP-PL-LEVEL` ➔ Confirm modal to verify clean deletion.
5. **Bulk CSV Import:**
   - Click Table Actions (`...`) ➔ **Bulk Import (CSV)**.
   - Upload [03_program_levels_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/03_program_levels_bulk_sample.csv).

---

### Phase 2.3: Course Type Management CRUD (`/dean/course-type-management`)
Navigate to `/dean/course-type-management` via sidebar.

1. **CRUD — Create:**
   - Click **+ Add Course Type**.
   - Code: `TEMP-CT-TYPE`, Label: `Temporary Course Type`, Description: `Testing CRUD`.
   - Click **Save**.
2. **CRUD — Read:**
   - Search `TEMP-CT` in table.
3. **CRUD — Update:**
   - Click **Edit** ➔ Update description ➔ Click **Save**.
4. **CRUD — Delete:**
   - Click **Delete** ➔ Confirm modal.
5. **Bulk CSV Import:**
   - Click Table Actions (`...`) ➔ **Bulk Import (CSV)**.
   - Upload [04_course_types_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/04_course_types_bulk_sample.csv).

---

### Phase 2.4: Degree Program Catalog & Curriculum Mapping Wizard CRUD (`/dean/program-management`)
Navigate to `/dean/program-management` via sidebar.

1. **CRUD — Create (Degree Program Wizard):**
   - Click **+ Add Program**.
   - Program Code: `ERIKA-BSCS`
   - Program Name: `Bachelor of Science in Computer Science`
   - Department: `CCS-ERIKA`
   - Program Level: `UNDERGRADUATE`
   - Years Duration: `4`
   - Total Required Units: `168`
   - Description: `Rigorous computer science curriculum with emphasis on algorithms, data structures, and intelligent systems.`
   - Click **Save Program**.
2. **CRUD — Read & Filter:**
   - Search `ERIKA-BSCS` in programs list. Verify 4-year curriculum container initializes.
3. **CRUD — Update:**
   - Click **Edit** on `ERIKA-BSCS` ➔ Change description ➔ Click **Save**.
4. **CRUD — Delete (Temporary Program Test):**
   - Click **+ Add Program** ➔ Code: `TEMP-PROG`, Name: `Temp Program`, Units: `120` ➔ Save.
   - Click **Delete** on `TEMP-PROG` ➔ Confirm modal.
5. **Bulk CSV Import:**
   - Test [05_programs_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/05_programs_bulk_sample.csv).

---

### Phase 2.5: Course Blueprints Management CRUD (`/dean/course-management`)
Navigate to `/dean/course-management` via sidebar.

1. **CRUD — Create (Course #1: ERIKA-CS101):**
   - Click **+ Add Course**.
   - Code: `ERIKA-CS101`
   - Title: `Introduction to Computing`
   - Department: `CCS-ERIKA`
   - Course Type: `LECTURE`
   - Lecture Units: `3.0` | Lab Units: `0.0` | Credit Hours: `3.0`
   - Description: `Fundamental principles of computational thinking and algorithms.`
   - Click **Save Course**.
2. **CRUD — Create (Course #2: ERIKA-CS102):**
   - Click **+ Add Course**.
   - Code: `ERIKA-CS102`
   - Title: `Discrete Structures and Logic`
   - Department: `CCS-ERIKA`
   - Course Type: `LECTURE_LAB`
   - Lecture Units: `2.0` | Lab Units: `1.0` | Credit Hours: `3.0`
   - Click **Save Course**.
3. **CRUD — Read & Filter:**
   - Search `ERIKA-CS` in courses table. Verify both courses display with proper unit totals.
4. **CRUD — Update:**
   - Click **Edit** on `ERIKA-CS101` ➔ Update Title to: `Introduction to Computing & Logic` ➔ Click **Save**.
5. **CRUD — Delete (Temporary Course Test):**
   - Click **+ Add Course** ➔ Code: `TEMP-CS999`, Title: `Temp Course DeleteMe` ➔ Save.
   - Click **Delete** on `TEMP-CS999` ➔ Confirm modal.
6. **Bulk CSV Import:**
   - Test [06_courses_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/06_courses_bulk_sample.csv).

---

### Phase 2.6: Section Scheduling 3-Step Wizard CRUD (`/dean/section-management`)
Navigate to `/dean/section-management` via sidebar.

1. **CRUD — Create (Section #1 via 3-Step Wizard):**
   - Click **+ Add Section** (opens `SectionWizardModal`).
   - **Step 1: Section Details:**
     - Academic Term: `1st Semester` *(from active `AY-2027-2028`)*
     - Degree Program: `ERIKA-BSCS`
     - Course: `ERIKA-CS101`
     - Section Code: `ERIKA-SEC-101`
     - Max Capacity / Slots: `40`
     - Status: `Open`
     - Click **Next →**.
   - **Step 2: Faculty Assignment:**
     - Select Instructor: **Prof. Erika Faculty** (`erika.faculty@example.com`).
     - Click **Next →**.
   - **Step 3: Schedule & Room Matrix:**
     - Days: Check `Tuesday` and `Thursday`.
     - Time Start: `09:00 AM` | Time End: `11:00 AM`.
     - Room: `ERIKA-LAB-201`.
   - Click **Save Section**.
2. **CRUD — Create (Section #2):**
   - Create section `ERIKA-SEC-102` for course `ERIKA-CS102` with **Prof. Erika Faculty** on `Monday` and `Wednesday` from `01:00 PM` to `03:00 PM` in Room `ERIKA-LAB-202`.
3. **CRUD — Read & Filter:**
   - Filter sections by Term: `1st Semester`, Program: `ERIKA-BSCS`.
   - Search `ERIKA-SEC` in table.
4. **CRUD — Update:**
   - Click **Edit** on `ERIKA-SEC-101` ➔ Update Max Slots to `45` ➔ Click **Save**.
5. **CRUD — Delete (Temporary Section):**
   - Create `TEMP-SEC-999` ➔ Save ➔ Click Action menu (`...`) ➔ **Delete Section** ➔ Confirm modal.
6. **Bulk CSV Import:**
   - Test [08_sections_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/08_sections_bulk_sample.csv).

---

### Phase 2.7: Faculty Loading 3-Step Wizard & Collision Evaluation Matrix CRUD (`/dean/faculty-load`)
Navigate to `/dean/faculty-load` via sidebar.

1. **CRUD — Read (Faculty Workload Roster):**
   - Locate **Prof. Erika Faculty** (`erika.faculty@example.com`) in the faculty directory.
   - Review Assigned Units: `6.0 Units` (across `ERIKA-SEC-101` and `ERIKA-SEC-102`).
   - Click **View Teaching Load / Schedule Matrix** (`/dean/faculty-load/:facultyId`).
2. **CRUD — Read & Inspect Live Collision Matrix:**
   - Review the weekly visual schedule grid.
   - Note the collision detection badge: `No Schedule Collisions Detected`.
3. **CRUD — Update (Conflict Detection Stress Test):**
   - Click **Assign Section / Load Wizard**.
   - Attempt to assign an overlapping time slot (`Tuesday 09:30 AM`).
   - **Collision Engine Verification:** System instantly triggers warning badge highlighting day and room collision!
   - Cancel assignment to keep schedule clean.

---

### Phase 2.8: College Announcements & Event Broadcasts CRUD (`/dean/announcement-management`)
Navigate to `/dean/announcement-management`.

1. **CRUD — Create:**
   - Click **+ Create Announcement**.
   - Title: `CCS-ERIKA Curriculum Advisory & Consultation Hours`
   - Target Scope: `Faculty` and `Students` under `CCS-ERIKA`.
   - Content: `Dean office hours for academic advising are held every Wednesday afternoon.`
   - Click **Publish Announcement**.
2. **CRUD — Read & Update:**
   - Search `Advisory` in table ➔ Click Edit ➔ Modify consultation room ➔ Click **Save**.
3. **CRUD — Delete:**
   - Create a test broadcast `Temp Dean Notice` ➔ Click Delete ➔ Confirm.

---

### Phase 2.9: Dean Universal Interactive Calendar CRUD (`/dean/calendar`)
Navigate to `/dean/calendar`.

1. **CRUD — Read & Create Event:**
   - Inspect faculty teaching load schedule mapped onto the calendar.
   - Click date ➔ Add Event: `CCS-ERIKA Departmental Faculty Meeting` (Time: 04:00 PM - 05:30 PM). Click **Save**.
2. **CRUD — Update & Delete:**
   - Click event pill ➔ Update time ➔ Click **Delete Event** ➔ Confirm.

---

### Phase 2.10: Dean Profile Change Request & AI Assistant Copilot (`/dean/profile`)
1. Navigate to `/dean/profile`.
2. **CRUD — Update (Staff Profile Change Request):**
   - Update Bio: `Dean of Computer Studies, specialist in distributed algorithms and AI governance.`
   - Click **Submit Profile Update Request**.
   - Notice banner: `Profile changes submitted for administrative verification.` *(Tested for approval in Phase 6.3!)*
3. **Dean AI Assistant Copilot:**
   - Open AI Drawer ➔ Ask: `"Are there any faculty teaching overloads in CCS-ERIKA?"`
   - Verify AI inspects assigned sections and answers accurately.

---

## ACT III: University Registrar — Verification, Shifting, Batch Enrollment & Audit

### Phase 3.1: Registrar Authentication & Enrollment Operations Overview (`/registrar`)
1. Log in with **`erika.registrar@example.com`** *(or switch role to Registrar)*, password **`TestPass123!`**.
2. **CRUD — Read (Registrar Dashboard):**
   - Inspect Bento Stat Cards: Total Enrolled Scholars, Pending Student Verifications, Active Sections, Released Grade Sheets.
   - Operational Term Badge: Confirmed **`AY-2027-2028` (1st Semester Ongoing)**.

---

### Phase 3.2: Academic Program Assignment & Year Level Setting CRUD (`/registrar/enrollment-management`)
Navigate to `/registrar/enrollment-management` via sidebar.

1. **CRUD — Read (Student Search & Program Status):**
   - In the student enrollment registry, search for **Erika Student** (`erika.student@example.com` / Student ID: `2026-00003`).
2. **CRUD — Update (Program & Year Level Assignment):**
   - Click **Assign Program / Year Standing**.
   - Degree Program: Select `ERIKA-BSCS`.
   - Year Level: Select `1st Year`.
   - Academic Status: `Active / Regular`.
   - Click **Confirm Assignment**. Student profile immediately links to the 4-year BSCS curriculum tree!

---

### Phase 3.3: Individual Student Enrollment Workspace CRUD (`/registrar/enrollment-management`)
1. **CRUD — Create (Enroll in Sections):**
   - With `2026-00003` selected, click **Enroll in Sections** (opens Enrollment Workspace).
   - Filter available sections by Course Code: `ERIKA-CS101` and `ERIKA-CS102`.
   - Check `ERIKA-SEC-101` (3.0 Units) and `ERIKA-SEC-102` (3.0 Units).
   - Review Total Enrolled Load: `6.0 / 24.0 Max Units`.
   - Click **Commit Student Enrollment**.
2. **CRUD — Read:**
   - Inspect enrolled sections table under student's card. Status confirms: `Enrolled`.
3. **CRUD — Update (Add / Change Section):**
   - Click **Manage Enrolled Subjects** ➔ Update elective options or section selection.
4. **CRUD — Delete (Drop / Unenroll Test):**
   - Test temporary enrollment in a 3rd section ➔ Click **Drop / Remove Section** ➔ Confirm modal to verify clean withdrawal.

---

### Phase 3.4: Registrar Batch Bulk CSV Enrollment Pipeline CRUD (`/registrar/enrollment-management`)
1. Click Table Actions (`...`) in Enrollment Management ➔ Click **Batch Bulk Enrollment (CSV)**.
2. Download CSV Template to inspect required columns (`student_number`, `section_codes`, `allow_conflict`).
3. Drag-and-drop [10_enrollments_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/10_enrollments_bulk_sample.csv).
4. Review preview table parsing student `2026-00003` into `ERIKA-SEC-101`.
5. Click **Import Records** (or close).

---

### Phase 3.5: Student Verification, Clearance & Promotion Review CRUD (`/registrar/student-verification`)
Navigate to `/registrar/student-verification` via sidebar.

1. **CRUD — Read:**
   - Filter tabs: `Pending Verification`, `Approved`, `Flagged / Incomplete`.
   - Inspect student document clearance checklist (Form 137, PSA Birth Certificate, Good Moral).
2. **CRUD — Update / Verification Action:**
   - Locate student profile change request or clearance record.
   - Click **Verify / Clear Student**. Enter remark: `"All entrance documentation validated."`.
   - Click **Approve Clearance**.

---

### Phase 3.6: Section Grade Audit & Official Cryptographic Grade Release Clearance CRUD (`/registrar/grade-release`)
Navigate to `/registrar/grade-release` via sidebar.

1. **CRUD — Read (Section Grade Audit):**
   - Review all sections submitted by faculty.
   - Filter by Status: `Awaiting Registrar Release`, `Released`, `Pending Faculty Submission`.
   - Inspect `ERIKA-SEC-101`: review individual student transmuted grades (1.00 - 5.00) and evaluation completion requirements.
2. **CRUD — Update / Release:**
   - Click **Audit & Release Grades**.
   - Notice Dual-Key Clearance: verified database trigger `prevent_duplicate_grade_release`.
   - Click **Clear & Release Official Grades**.
   - Immutable cryptographic timestamp generated!

---

### Phase 3.7: Registrar Forensic Audit Logs & Transaction Filter (`/registrar/registrar-logs`)
Navigate to `/registrar/registrar-logs` via sidebar.

1. **CRUD — Read & Filter:**
   - Review forensic audit logs recording all student shifting, section assignments, and grade release actions.
   - Filter by Date, Action (`ENROLL`, `DROP`, `GRADE_RELEASE`), or Student ID.
   - Click **View Transaction Details** to review JSON payloads.

---

### Phase 3.8: Registrar Announcements & Campus Notices CRUD (`/registrar/announcement-management`)
Navigate to `/registrar/announcement-management`.

1. **CRUD — Create:**
   - Title: `Official Schedule for Add/Drop and Cross-Enrollment`
   - Audience: `Students`
   - Content: `Add/Drop period closes on the second week of the term.`
   - Click **Publish Announcement**.
2. **CRUD — Read, Update & Delete:**
   - Search announcement ➔ Edit content ➔ Save ➔ Test delete with temporary announcement.

---

### Phase 3.9: Registrar Interactive Calendar CRUD (`/registrar/calendar`)
Navigate to `/registrar/calendar`.

1. **CRUD — Read & Create:**
   - Review academic deadlines on calendar grid.
   - Add Event: `Registrar Grade Encoding Deadline Review` ➔ Save ➔ Edit ➔ Delete.

---

### Phase 3.10: Registrar Profile Change Request & AI Records Copilot (`/registrar/profile`)
1. Navigate to `/registrar/profile`.
2. **CRUD — Update Profile:** Submit profile change request for contact information.
3. **Registrar AI Copilot:** Ask AI: `"List all sections currently pending grade release in 1st Semester."`

---

## ACT IV: Faculty Member — Pedagogy, 8-Tab Workspace Studio, Attendance & Grading

### Phase 4.1: Faculty Authentication & Workspace Access (`/faculty`)
1. Log in with **`erika.faculty@example.com`** *(or switch role to Faculty)*, password **`TestPass123!`**.
2. **CRUD — Read (Faculty Dashboard):**
   - Inspect Bento Stat Cards: Total Teaching Units (`6.0 Units`), Active Sections (`2`), Total Students Enrolled, Pending Grading Tasks.
   - Today's Class Schedule Card: Displays `ERIKA-SEC-101` (Tue/Thu 09:00 - 11:00 AM, `ERIKA-LAB-201`).

---

### Phase 4.2: Sections Catalog & 8-Tab Workspace Overview (`/faculty/sections`)
Navigate to `/faculty/sections` via sidebar.

1. **CRUD — Read (Sections Grid):**
   - Locate **`ERIKA-SEC-101`** (Introduction to Computing).
   - Click **Enter Section Studio / Workspace** (`/faculty/sections/:sectionId`).
   - Notice the **8 Workspace Tabs**:
     1. **Modules & Syllabus**
     2. **Assessments**
     3. **Submissions & Grading**
     4. **Rubrics Builder**
     5. **Attendance**
     6. **Discussions**
     7. **Students Roster**
     8. **Grades & Policies**

---

### Phase 4.3: Tab 1 — Modules & Syllabus Roadmap CRUD (`/faculty/sections/:id`)
Click Tab 1: **Modules & Syllabus**.

1. **CRUD — Create (Module & Materials):**
   - Click **+ Add Module**.
   - Module Title: `Module 1: Foundations of Computer Science & Algorithmic Thinking`.
   - Description: `Introduction to binary systems, boolean logic, and computational complexity.`
   - Click **Save Module**.
   - Under Module 1, click **+ Add Material / Resource**:
     - Title: `Lecture Notes 01: Binary & Number Representations (PDF)`.
     - Material Type: `Document / Slide Deck`.
     - URL / File Link: `https://example.com/erika-cs101-mod1.pdf`.
     - Click **Save Material**.
2. **CRUD — Read:**
   - Verify module expands/collapses with materials listed.
3. **CRUD — Update:**
   - Click **Edit Module** ➔ Modify title to: `Module 1: Foundations of CS & Algorithmic Logic` ➔ Click **Save**.
4. **CRUD — Delete:**
   - Click **+ Add Module** ➔ Title: `Temp Module DeleteMe` ➔ Save.
   - Click Action menu (`...`) on `Temp Module DeleteMe` ➔ **Delete Module** ➔ Confirm.

---

### Phase 4.4: Tab 2 — 4-Tier Assessment Authoring Suite CRUD (Quiz, Exam, Activity, Project)
Click Tab 2: **Assessments**.

1. **CRUD — Create (Tier 1: Online Quiz with Question Bank):**
   - Click **+ Create Assessment**.
   - Title: `ERIKA-CS101 Quiz 1: Algorithms & Logic`
   - Assessment Type: Select `Quiz`
   - Grading Period: Select `Prelim` (Weight: 30%)
   - Component: Select `Quizzes & Short Tasks`
   - Total Points: `20` | Duration: `30 Minutes`
   - Due Date: Set to 1 week ahead.
   - **Add Questions (Multi-Type):**
     - Question 1 (Multiple Choice): *"Which sorting algorithm has average O(n log n) complexity?"* (Options: Bubble Sort, Merge Sort, Insertion Sort, Selection Sort; Answer: B).
     - Question 2 (True/False): *"In Boolean algebra, A AND NOT(A) is always False."* (Answer: True).
     - Question 3 (Essay): *"Explain the importance of abstraction in computer science."* (Points: 10).
   - Click **Publish Assessment**.
2. **CRUD — Create (Tier 2: Major Exam):**
   - Create `ERIKA-CS101 Prelim Examination` | Type: `Exam` | Component: `Major Exam` | Points: `100` | Due Date set during exam window. Click **Publish**.
3. **CRUD — Create (Tier 3: Lab Activity):**
   - Create `ERIKA-CS101 Lab 1: Python Algorithm Implementation` | Type: `Activity` | Component: `Class Standing & Performance` | Points: `50`. Click **Publish**.
4. **CRUD — Create (Tier 4: Capstone Project with Rubric):**
   - Create `ERIKA-CS101 Term Project: Computational Problem Solver` | Type: `Project` | Component: `Class Standing & Performance` | Points: `100`.
   - Link Rubric: Select `ERIKA Multi-Criterion Programming Rubric` (built in Phase 4.6). Click **Publish**.
5. **CRUD — Read & Filter:**
   - Filter assessments by Period: `Prelim`, `Midterm`, `Finals`.
   - Filter by Type: `Quiz`, `Exam`, `Activity`, `Project`.
6. **CRUD — Update:**
   - Click **Edit** on `Quiz 1` ➔ Change time limit from `30` to `45` minutes ➔ Click **Save**.
7. **CRUD — Delete:**
   - Create `Temp Quiz DeleteMe` ➔ Click Delete ➔ Confirm modal.
8. **Bulk CSV Import:**
   - Upload [09_assessment_questions_bulk_sample.csv](file:///C:/Users/user/Documents/project-application/public/sample-csv/erika/09_assessment_questions_bulk_sample.csv).

---

### Phase 4.5: Tab 3 — Assessment Submissions & Rubrics Grading Suite CRUD
Navigate to Tab 3: **Submissions & Grading** (or click Submissions icon on any assessment).

1. **CRUD — Read (Submissions Queue):**
   - Locate submission from student **Erika Student** (`2026-00003`).
   - Click **Grade Submission** (opens comprehensive Grading Suite).
2. **CRUD — Update / Grade (Interactive Rubric & Score Encoding):**
   - Review student's uploaded work / inline answer text.
   - Click rubric score criteria:
     - Algorithm Correctness: `Full Marks (30/30)`
     - Code Efficiency & Optimization: `Good (25/30)`
     - Documentation & Comments: `Excellent (20/20)`
     - Test Case Verification: `Full Marks (20/20)`
   - Auto-computed Total: `95 / 100`.
   - Input Instructor Feedback: `"Exceptional work on algorithm optimization and clean modular code."`.
   - Click **Save & Publish Grade**. Student's grade sheet immediately updates!

---

### Phase 4.6: Tab 4 — Multi-Criterion Rubrics Builder Studio CRUD
Click Tab 4: **Rubrics Builder** (or open `/faculty/sections/:sectionId/rubrics/:rubricId`).

1. **CRUD — Create (Multi-Criterion Rubric):**
   - Click **+ Create Rubric**.
   - Rubric Title: `ERIKA Multi-Criterion Programming Rubric`
   - Description: `Standard scoring rubric for programming assignments and lab capstones.`
   - **Add Criteria (Rows):**
     - Criterion 1: `Logic & Algorithmic Soundness` (Weight: 40%) | Levels: Poor (10), Fair (20), Good (30), Excellent (40).
     - Criterion 2: `Code Quality & Clean Architecture` (Weight: 30%) | Levels: Poor (5), Fair (15), Good (25), Excellent (30).
     - Criterion 3: `Test Coverage & Edge Cases` (Weight: 30%) | Levels: Poor (5), Fair (15), Good (25), Excellent (30).
   - Total Weight Badge: Validates green **`100% / 100%`**.
   - Click **Save Rubric**.
2. **CRUD — Read & Duplicate:**
   - View formatted rubric matrix. Click **Duplicate Rubric** to test clone functionality.
3. **CRUD — Update:**
   - Click **Edit Rubric** ➔ Update level descriptors ➔ Click **Save**.
4. **CRUD — Delete:**
   - Delete the cloned duplicate rubric ➔ Confirm modal.

---

### Phase 4.7: Tab 5 — Daily Attendance Session Wizard & Class Records CRUD
Click Tab 5: **Attendance**.

1. **CRUD — Create (Attendance Session):**
   - Click **+ New Attendance Session**.
   - Date: Select Today's Date.
   - Time: `09:00 AM - 11:00 AM`.
   - Title / Topic: `Lecture 01: Computer Science Architecture`.
   - Click **Create Session**.
2. **CRUD — Read (Class Roster Attendance Sheet):**
   - Review enrolled students list.
3. **CRUD — Update (Mark Attendance Statuses):**
   - On student **Erika Student** (`2026-00003`): Click **Present** (green pill).
   - Test options: `Late`, `Excused`, `Absent`. Set to `Present`.
   - Add remark: `"Attended on time, active participation."`.
   - Click **Save Attendance Record**. Real-time attendance rate updates to **`100%`**!
4. **CRUD — Delete:**
   - Create a test session for yesterday ➔ Click **Delete Session** ➔ Confirm modal.

---

### Phase 4.8: Tab 6 — Interactive Discussion Board & Thread Moderation CRUD
Click Tab 6: **Discussions**.

1. **CRUD — Create (Discussion Thread):**
   - Click **+ New Discussion Thread**.
   - Topic Title: `Week 1 Discussion: The Impact of Quantum Computing on Cryptography`
   - Category: `Lecture Discussion`
   - Prompt: `How will Shor's algorithm impact current RSA encryption standards? Share your thoughts below.`
   - Pin Thread: Check `[x] Pin to Top`.
   - Click **Post Thread**.
2. **CRUD — Read & Reply:**
   - Click into the thread. Post instructor follow-up comment: `"Consider quantum key distribution (QKD) as a defense."`.
3. **CRUD — Update:**
   - Click **Edit Thread** on instructor comment ➔ Fix typo ➔ Click **Save**.
4. **CRUD — Delete:**
   - Create temporary test thread `Temp Thread DeleteMe` ➔ Click Delete ➔ Confirm modal.

---

### Phase 4.9: Tab 7 — Enrolled Student Class Roster & 3-Tab Holistic Student Evaluation Modal
Click Tab 7: **Students**.

1. **CRUD — Read (Roster Grid):**
   - Inspect table of enrolled scholars: Student ID, Name, Email, Attendance Rate, Current Grade.
2. **CRUD — Read (3-Tab Holistic Student Modal):**
   - Click **View Holistic Profile** on **Erika Student** (`2026-00003`).
   - **Tab 1: Academic Performance:** Review score breakdown across quizzes, activities, and exams.
   - **Tab 2: Attendance Analytics:** Review daily attendance timeline, absence rate, and tardiness history.
   - **Tab 3: Activity & Engagement:** Review forum submissions, module completions, and timeline.

---

### Phase 4.10: Tab 8 — Grading Sheet, Special Grade Flags & Section Policies CRUD
Click Tab 8: **Grades & Policies**.

1. **CRUD — Read (Automated Transmutation Sheet):**
   - Review consolidated grading sheet for `ERIKA-SEC-101`.
   - Observe automated weighted computation: Prelim Component Scores ➔ Raw Grade (e.g. `95.00%`) ➔ Transmuted Grade (e.g. **`1.25`**).
2. **CRUD — Update (Special Grade Flags Assignment):**
   - Click Special Flags dropdown on a student: Test assigning **`INC`** (Incomplete), **`DRP`** (Dropped), or **`FA`** (Failure due to Absences).
   - Notice system enforces required explanation remarks. Revert to standard computed grade.
3. **CRUD — Update (Section Policy Threshold Overrides):**
   - Under Section Settings: Override Passing Threshold to `75.0%`. Click **Save Policy**.
4. **CRUD — Submit (Anti-Tamper Lock Submission):**
   - Click **Submit Final Grades to Registrar**.
   - Modal warning: *"Grades will be locked and cannot be edited without Registrar clearance."*
   - Click **Confirm Submission**. State transitions to **`Locked / Awaiting Registrar Release`**!

---

### Phase 4.11: Faculty Evaluation Analytics Hub (`/faculty/evaluations`)
Navigate to `/faculty/evaluations` via sidebar.

1. **CRUD — Read (Evaluation Analytics):**
   - Inspect Overall Teaching Effectiveness Rating: `4.92 / 5.00` (Qualitative: *Outstanding*).
   - Review Category Breakdown:
     - Teaching Effectiveness: `4.95 / 5.00`
     - Instructional Materials: `4.90 / 5.00`
     - Classroom Management: `4.92 / 5.00`
     - Assessment Quality & Feedback: `4.94 / 5.00`
     - Professionalism & Ethics: `4.98 / 5.00`
   - Review anonymous student constructive feedback comments.

---

### Phase 4.12: Faculty Class Announcements & Strict Cohort Isolation CRUD (`/faculty/announcement-management`)
Navigate to `/faculty/announcement-management`.

1. **CRUD — Create (Section-Isolated Notice):**
   - Title: `Reminder: Lab 1 Submission Deadline Extended`
   - Scope: Target exclusively **`ERIKA-SEC-101`** *(Strict cohort isolation ensures only enrolled students in this section receive this notice)*.
   - Content: `Lab 1 submission deadline is extended by 24 hours.`
   - Click **Publish**.
2. **CRUD — Read, Update & Delete:**
   - Verify notice displays in section stream ➔ Edit notice ➔ Test delete with temporary announcement.

---

### Phase 4.13: Faculty Teaching Schedule & Interactive Calendar CRUD (`/faculty/calendar`)
Navigate to `/faculty/calendar`.

1. **CRUD — Read & Create:**
   - Inspect teaching schedule blocks for `ERIKA-SEC-101` and `ERIKA-SEC-102`.
   - Add Event: `Consultation Hours for Discrete Structures` ➔ Save ➔ Edit ➔ Delete.

---

### Phase 4.14: Faculty Profile Management, Security & AI Lesson Copilot (`/faculty/profile`)
1. Navigate to `/faculty/profile`.
2. **CRUD — Update Profile & Security:**
   - Update Academic Qualifications: `M.S. in Computer Science, Ph.D. Candidate`.
   - Update Consultation Office: `CCS Faculty Hall, Room 304`. Click **Save Changes**.
3. **AI Lesson Copilot:**
   - Open AI Drawer ➔ Ask: `"Draft a 3-question conceptual quiz on asymptotic complexity and Big-O notation for ERIKA-CS101."`
   - Verify AI responds with structured questions and answer keys.

---

## ACT V: Student Scholar — Learning Experience, Degree Audit & Mobile UI

### Phase 5.1: Student Authentication & Bento Dashboard Overview (`/student`)
1. Log in with **`erika.student@example.com`** *(or switch role to Student)*, password **`TestPass123!`**.
2. **CRUD — Read (Student Bento Dashboard):**
   - Student ID: **`2026-00003`** | Program: `ERIKA-BSCS` (1st Year).
   - Bento Stat Cards: Total Enrolled Units (`6.0 Units`), Enrolled Subjects (`2`), Attendance Average (`100%`), Current GWA (`1.25`).
   - Recent Announcements Feed: Displays `Reminder: Lab 1 Submission Deadline Extended` from Prof. Erika Faculty.

---

### Phase 5.2: Timetable & Interactive Schedule Matrix (`/student/schedule`)
Navigate to `/student/schedule` via sidebar.

1. **CRUD — Read (Weekly Schedule Grid):**
   - Review visual calendar timetable:
     - `ERIKA-SEC-101`: Tue/Thu 09:00 AM - 11:00 AM (`ERIKA-LAB-201`).
     - `ERIKA-SEC-102`: Mon/Wed 01:00 PM - 03:00 PM (`ERIKA-LAB-202`).
   - Switch between **Week View** and **List View**.

---

### Phase 5.3: Enrolled Subject Studio & Syllabus Roadmap Progress CRUD (`/student/subjects`)
Navigate to `/student/subjects` via sidebar.

1. **CRUD — Read (Subjects Studio):**
   - Click on **`ERIKA-SEC-101`** (Introduction to Computing).
   - Enter Student Subject Studio (`/student/subjects/:enrollmentId`).
2. **CRUD — Update / Roadmap Completion (Mark Completed):**
   - Expand `Module 1: Foundations of CS & Algorithmic Logic`.
   - Click on `Lecture Notes 01: Binary & Number Representations (PDF)` to view material.
   - Check **[x] Mark as Completed**. Progress bar dynamically advances!

---

### Phase 5.4: Taking & Submitting All 4 Assessment Tiers CRUD
Navigate to Assessments tab under `ERIKA-SEC-101`.

1. **CRUD — Create / Submit (Tier 1: Online Quiz):**
   - Click **Take Assessment** on `ERIKA-CS101 Quiz 1: Algorithms & Logic`.
   - Timer session starts (monitored by `assessment_timer_heartbeats`).
   - Question 1: Select `Merge Sort`.
   - Question 2: Select `True`.
   - Question 3 (Essay): Input: *"Abstraction separates interface from implementation, allowing developers to manage system complexity."*.
   - Click **Submit Quiz**. Confirmation modal verifies successful submission.
2. **CRUD — Create / Submit (Tier 2: Major Exam):**
   - Take Prelim Examination ➔ Answer questions ➔ Submit.
3. **CRUD — Create / Submit (Tier 3: Lab Activity):**
   - Open `Lab 1: Python Algorithm Implementation` ➔ Paste code snippet ➔ Submit.
4. **CRUD — Create / Submit (Tier 4: Capstone Project):**
   - Open `Term Project: Computational Problem Solver` ➔ Enter project link ➔ Submit.

---

### Phase 5.5: Assessment Submission Results Review & Teacher Feedback
Navigate to `/student/subjects/:enrollmentId/assessments/:assessmentId/result`.

1. **CRUD — Read:**
   - Review automated scoring and teacher rubric breakdown.
   - Inspect teacher feedback: *"Exceptional work on algorithm optimization..."*.
   - Review answer annotations and correctness explanations.

---

### Phase 5.6: Threaded Discussion Forum Participation & Reply CRUD
Navigate to Discussions tab under `ERIKA-SEC-101`.

1. **CRUD — Create (Student Reply):**
   - Open thread `Week 1 Discussion: The Impact of Quantum Computing on Cryptography`.
   - Click **Reply to Thread**.
   - Input: *"Lattice-based cryptography presents strong post-quantum security guarantees against Shor's algorithm."*.
   - Click **Post Reply**.
2. **CRUD — Read & Update:**
   - Verify reply appears nested in thread ➔ Click Edit on own reply ➔ Add a reference link ➔ Click **Save**.
3. **CRUD — Delete:**
   - Post temporary comment `Temp Comment DeleteMe` ➔ Click Delete ➔ Confirm.

---

### Phase 5.7: Attendance Rate Verification & Absence Record Tracking
Navigate to Attendance tab under `ERIKA-SEC-101`.

1. **CRUD — Read:**
   - Review attendance record sheet: Status `Present` (green badge).
   - Review Attendance Percentage: **`100.0%`**.
   - Review absence threshold policy: 0 of 3 allowable unexcused absences.

---

### Phase 5.8: Mandatory Faculty Evaluation Suite (5 Sections) CRUD (`/student/evaluations`)
Navigate to `/student/evaluations` via sidebar.

> [!IMPORTANT]
> **DUAL-KEY EVALUATION GATING:**
> Completing the mandatory faculty evaluation unlocks student official report cards and grade breakdowns for that subject!

1. **CRUD — Create / Submit (5-Section Evaluation Matrix):**
   - Select Faculty: **Prof. Erika Faculty** (`ERIKA-SEC-101`).
   - **Section 1: Teaching Effectiveness:** Rate all items 5 (Strongly Agree).
   - **Section 2: Instructional Materials:** Rate all items 5.
   - **Section 3: Classroom Management:** Rate all items 5.
   - **Section 4: Assessment Quality:** Rate all items 5.
   - **Section 5: Professionalism & Ethics:** Rate all items 5.
   - Enter Qualitative Feedback: *"Prof. Erika is an outstanding mentor who explains computer science logic clearly and provides excellent lab guidance."*.
   - Click **Submit Faculty Evaluation**. Instant clearance lock unlocks!

---

### Phase 5.9: Grade Sheet & Scrollable Component Breakdown (`/student/grade`)
Navigate to `/student/grade` via sidebar.

1. **CRUD — Read (Official Released Grades):**
   - Locate `ERIKA-CS101` and `ERIKA-CS102`.
   - Review Term Final Grade: **`1.25`** (Passed / Excellent).
2. **CRUD — Read (Component Breakdown Modal):**
   - Click **View Full Breakdown** (`/student/grade/:enrollmentId/:gradingPeriodId`).
   - Inspect vertically scrollable breakdown:
     - Quizzes (30% weight): `95.0%`
     - Class Standing (30% weight): `96.0%`
     - Major Exam (40% weight): `94.0%`
   - Transmuted Equivalent: **`1.25`**.

---

### Phase 5.10: 4-Year Curriculum Tracker & Degree Audit Prospectus CRUD (`/student/curriculum`)
Navigate to `/student/curriculum` via sidebar.

1. **CRUD — Read (4-Year Prospectus):**
   - Review 4-Year Degree Audit checklist for `ERIKA-BSCS`.
   - **Year 1, 1st Semester:**
     - `ERIKA-CS101`: Badge **`Completed / Passed`** (Grade: `1.25`).
     - `ERIKA-CS102`: Badge **`Completed / Passed`** (Grade: `1.25`).
   - Completed Units Counter: `6 / 168 Units`.
2. **CRUD — Read (Official Printable Transcript of Records - TOR):**
   - Click **Print Official Transcript of Records (TOR)**.
   - Preview formatted institutional document with AU-JAS header, student number, and GWA summary.

---

### Phase 5.11: Academic Analytics, GWA Tracker & What-If Grade Simulator CRUD (`/student/insight`)
Navigate to `/student/insight` via sidebar.

1. **CRUD — Read (Academic Insights & GWA Trend):**
   - Inspect GWA Gauge: **`1.25`** (President's List Standing).
   - Review performance charts across semesters.
2. **CRUD — Update / Simulate (What-If Grade Simulator):**
   - Adjust simulated sliders for upcoming Year 1, 2nd Semester subjects:
     - `Data Structures`: Set to `1.25`
     - `Object-Oriented Programming`: Set to `1.00`
   - Dynamic Projected GWA recalculates instantly to: **`1.18`**!
   - Click **Reset Simulator**.

---

### Phase 5.12: Mobile Responsiveness & Touch Drawer Audit (iPhone 390x844)
1. Open Browser DevTools (`F12`) ➔ Toggle Device Toolbar (`Ctrl+Shift+M`) ➔ Select **iPhone 14 (`390x844`)**.
2. **Mobile UX Verification:**
   - Test bottom navigation bar and responsive hamburger menu.
   - Test 3-dots table action menus on cards.
   - Verify zero horizontal overflow on table cards.
   - Test touch swipe on assessment timer and evaluation modals.

---

### Phase 5.13: Student Profile Change Request Submission & AI Academic Tutor CRUD (`/student/profile`)
1. Navigate to `/student/profile`.
2. **CRUD — Update (Submit Student Profile Request):**
   - Update Emergency Contact: `Parent Contact: +63 918 000 0002`.
   - Click **Submit Profile Update**. Verified in Registrar queue.
3. **Student AI Academic Tutor:**
   - Open AI Drawer ➔ Ask: `"Help me understand the difference between breadth-first search and depth-first search in graphs."`
   - Verify AI responds with clear algorithmic explanation and ASCII diagrams.

---

### Phase 5.14: Student Universal Interactive Calendar CRUD (`/student/calendar`)
Navigate to `/student/calendar`.

1. **CRUD — Read & Create:**
   - Inspect class schedule, assignment deadlines, and exam dates on calendar.
   - Click on date ➔ Add Personal Study Reminder: `Review Discrete Structures Logic Proofs` ➔ Save ➔ Edit ➔ Delete.

---

## ACT VI: Seamless Role Switching & End-to-End Cross-Role Workflows

### Phase 6.1: Unified Super-Account Instant Role Switcher Test
1. Log in with **`erika@example.com`** (or `paosiopao16@gmail.com`), password **`TestPass123!`**.
2. Click the **Role Switcher** dropdown in the top-right navbar.
3. Test seamless jumping between all 5 workspaces without logging out:
   - Switch to **Admin** ➔ Land on `/admin`.
   - Switch to **Dean** ➔ Land on `/dean`.
   - Switch to **Registrar** ➔ Land on `/registrar`.
   - Switch to **Faculty** ➔ Land on `/faculty`.
   - Switch to **Student** ➔ Land on `/student`.
4. Verify URL routes and navigation items update instantly with zero permission errors.

---

### Phase 6.2: Complete End-to-End Grade Lifecycle (Faculty Compute -> Registrar Clearance -> Student Card)
1. **As Faculty (`erika.faculty@example.com`):**
   - Navigate to `/faculty/sections/:sectionId` (Tab 8: Grades).
   - Verify all student submissions are scored.
   - Click **Submit Final Grades to Registrar**. State transitions to `Locked`.
2. **As Registrar (`erika.registrar@example.com`):**
   - Navigate to `/registrar/grade-release`.
   - Inspect `ERIKA-SEC-101`. Verify student faculty evaluation clearance.
   - Click **Clear & Release Official Grades**.
3. **As Student (`erika.student@example.com`):**
   - Complete Faculty Evaluation on `/student/evaluations` if not already completed.
   - Navigate to `/student/grade`.
   - Verify final grade **`1.25`** immediately appears with full component breakdown!

---

### Phase 6.3: End-to-End Staff Profile Verification Loop (Submission -> Admin Approval -> Sync)
1. **As Dean (`erika.dean@example.com`):**
   - Navigate to `/dean/profile`. Submit bio update: `"Dean of Computer Studies & AI Specialist"`.
2. **As Admin (`erika.admin@example.com`):**
   - Navigate to `/admin/profile-verifications`.
   - Inspect pending request from Erika Dean.
   - Click **Review Request** ➔ Compare side-by-side diff ➔ Click **Approve**.
3. **As Dean (`erika.dean@example.com`):**
   - Refresh `/dean/profile`. Verified bio immediately displays the updated approved text!

---

## Master AG-Grid Sort, Filter & AI Prompt Verification Matrix

### AG-Grid Multi-Column Sort & Filter Matrix

| Module | Route | Multi-Column Sort Test | Filter Verification Test |
| :--- | :--- | :--- | :--- |
| **Admin Users** | `/admin/users` | Sort by `Role` ASC, then `Status` DESC | Filter by Role: `Faculty`, Status: `Active` |
| **Admin Departments** | `/admin/departments` | Sort by `Name` ASC | Search: `CCS-ERIKA` |
| **Admin School Years** | `/admin/school-years` | Sort by `Start Date` DESC | Filter by Status: `Active` (`AY-2027-2028`) |
| **Dean Programs** | `/dean/program-management` | Sort by `Total Units` DESC | Filter by Department: `CCS-ERIKA` |
| **Dean Courses** | `/dean/course-management` | Sort by `Credit Hours` DESC | Filter by Course Type: `LECTURE_LAB` |
| **Dean Sections** | `/dean/section-management` | Sort by `Term` ASC, then `Course` | Filter by Status: `Open` |
| **Registrar Enrollment** | `/registrar/enrollment-management`| Sort by `Year Level` ASC | Search by Student ID: `2026-00003` |
| **Registrar Grade Release** | `/registrar/grade-release` | Sort by `Submission Date` DESC | Filter by Status: `Awaiting Release` |
| **Faculty Sections** | `/faculty/sections` | Sort by `Course Code` ASC | Filter by Term: `1st Semester` |
| **Faculty Submissions** | `/faculty/sections/:id/...` | Sort by `Score` DESC | Filter by Status: `Graded` |
| **Student Curriculum** | `/student/curriculum` | Sort by `Year Level` ASC | Filter by Status: `Completed` |

---

### Role-Specific AI Assistant Prompt Verification

| Role | Target AI Prompt | Expected Contextual Response |
| :--- | :--- | :--- |
| **Admin** | *"Summarize active institutional terms and list all departments."* | Accurately identifies `AY-2027-2028` (1st Semester Ongoing) and `CCS-ERIKA`. |
| **Dean** | *"Are there any faculty teaching schedule collisions in CCS-ERIKA?"* | Evaluates `ERIKA-SEC-101` and `ERIKA-SEC-102` timetables and reports collision status. |
| **Registrar** | *"Which sections are currently pending official grade release?"* | Scans section grading states and lists sections awaiting registrar clearance. |
| **Faculty** | *"Draft a rubric with 3 criteria for evaluating a student Python project."* | Formulates structured criteria with percentage weights and scoring descriptors. |
| **Student** | *"Explain how depth-first search (DFS) works with a stack example."* | Provides pedagogical explanation, stack trace diagram, and time complexity. |

---

### 🎉 Walkthrough Completion & System Verification Sign-Off

Upon completing the steps in this manual, **Erika** has verified:
- **100% of all user roles** (Admin, Dean, Registrar, Faculty, Student) using dedicated accounts and unified instant role switching.
- **Every single page and route** across all modules in the AU-JAS LMS application.
- **Every CRUD operation** (Create, Read, Update, Delete/Deactivate) on all entities.
- **Operational continuity** anchored firmly on **`AY-2027-2028`** (**1st Semester `Ongoing`**) without creating duplicate academic years.
- **Full system parity** across Desktop and Mobile viewports with verified zero bugs and 100% data integrity.
