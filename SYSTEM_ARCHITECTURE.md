# SYSTEM_ARCHITECTURE.md — System Architecture & Workflow Specification

This document provides an architectural breakdown of the Arellano University Learning Management System (AU-JAS LMS), detailing role responsibilities, routing, workflows, and core subsystems.

---

## 1. High-Level Architectural Diagram

```
                               ┌─────────────────────────────────────────┐
                               │             React 18 Frontend           │
                               │  Vite + MUI v7 + Tailwind + Zustand v5  │
                               └────────────────────┬────────────────────┘
                                                    │ (REST / RPC)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │           Supabase API Gateway          │
                               │          PostgREST / Auth / Storage     │
                               └──────────┬───────────────────┬──────────┘
                                          │                   │
                     ┌────────────────────┴─────┐       ┌─────┴────────────────────┐
                     │   PostgreSQL 17 Database │       │  Deno Edge Function      │
                     │  - 55 Tables, 20 Enums   │       │  `ai-assistant`          │
                     │  - 200+ RPC Stored Procs │       │  (Google Gemini Flash)   │
                     │  - RLS & Assert Guards   │       └──────────────────────────┘
                     └──────────────────────────┘
```

---

## 2. Five Roles & Single Responsibility Model

To ensure academic and administrative integrity, the system strictly isolates capabilities across five roles:

### 1. Admin (`/admin`)
- **Domain**: System configuration, security, and master calendar.
- **Pages**:
  - `Dashboard`: System-wide statistics (student count, faculty count, programs, terms).
  - `Users` (`/admin/users`): Single and bulk user provisioning with CSV import/export, role assignment, resend invitation links.
  - `Academic Years` (`/admin/school-years`): Creation and lifecycle of school years.
  - `Terms & Term Types` (`/admin/terms`, `/admin/term-types`): Semesters/trimesters and evaluation scopes.
  - `Grading Configuration` (`/admin/grade-configurations`):
    - *Grading Periods*: Global templates (Prelim, Midterm, Finals) with weight validation totaling 100%.
    - *Transmutation Table*: Minimum % ladder for grade conversion.
    - *Special Grades*: Configuration of INC, DRP, and non-numerical codes.
  - `System Settings` & `Audit Logs`: System thresholds, honours criteria, and immutable activity logs.

### 2. Dean (`/dean`)
- **Domain**: Academic catalog, curriculum design, and faculty allocation.
- **Pages**:
  - `Dashboard`: Departmental metrics, enrolled students, at-risk student monitoring.
  - `Departments` (`/dean/department-management`): Creation and management of academic departments.
  - `Programs & Program Levels` (`/dean/program-management`): Degree program structures.
  - `Course Catalog` (`/dean/course-management`): Course creation, lecture/laboratory unit splits, prerequisite trees.
  - `Curriculum Maps` (`/dean/curriculum-map-management`): Matrix mapping courses to year levels and terms with CSV import/export.
  - `Sections` (`/dean/section-management`): Creation of course sections and assignment of faculty instructors.

### 3. Registrar (`/registrar`)
- **Domain**: Student lifecycle, enrollment records, and grade release.
- **Pages**:
  - `Dashboard`: Enrollment statistics, clearance overviews, upcoming academic milestones.
  - `Student Registry` (`/registrar/student-management`): Official student rosters, profile records, bulk CSV student onboarding.
  - `Enrollments` (`/registrar/enrollment-management`): Section-by-section student enrollments and schedule validation.
  - `Batch Progression` (`/registrar/batch-progression`): End-of-term promotion of student cohorts to next year/term levels.
  - `Grade Release` (`/registrar/grade-release`): Scheduled publication and locking of final grades per grading period.

### 4. Faculty (`/faculty`)
- **Domain**: Classroom instruction, attendance, assessment delivery, and grading.
- **Pages**:
  - `Dashboard`: Faculty schedule, active sections, quick actions.
  - `My Sections` (`/faculty/sections`): Roster of assigned sections.
  - `Section Detail` (`/faculty/sections/:sectionId`): 8-tab comprehensive instructional workspace:
    1. *Students*: Section roster and student status.
    2. *Attendance*: Date-based session tracking (Present, Late, Absent, Excused).
    3. *Grading*: Continuous grading sheet with component breakdowns.
    4. *Assessments*: Assessment list, publish toggles, and submission management.
    5. *Modules*: Learning materials and lecture file uploads.
    6. *Announcements*: Section-scoped communication.
    7. *Discussions*: Class Q&A and forum threads.
    8. *Item Analysis*: Psychometric evaluation ($p$-value difficulty and $D$-value discrimination).
  - `Assessment Builder` (`/faculty/sections/:sectionId/assessments/new`): Comprehensive builder supporting 7 question types, time limits, scheduling windows, and rubrics.

### 5. Student (`/student`)
- **Domain**: Learning, assessment taking, schedule viewing, and academic records.
- **Pages**:
  - `Dashboard`: Class schedules, upcoming deadlines, announcements, academic summary.
  - `My Schedule` (`/student/schedule`): Weekly visual timetable with custom section color coding.
  - `My Subjects` (`/student/subjects`): Enrolled subjects, course materials, discussions.
  - `Assessment Taker` (`/student/assessments/:assessmentId/take`): Online exam interface with server-synchronized countdown timer.
  - `My Grades` (`/student/grades`): Period grades, transmutations, and faculty evaluation gating.
  - `Curriculum Audit` (`/student/curriculum-audit`): Degree progress tracking against curriculum requirements.

---

## 3. Core Engine Specifications

### 1. Assessment & Autograding Engine
- **Server-Side Answer Key Withholding**: All score calculations and answer keys are protected on the database level. `fn_get_my_assessment_result` withholds choices' `is_correct` flags until the scheduled results release date.
- **Timer Session Management**:
  - `fn_start_assessment_timer`: Records server start time and expiration timestamp in `assessment_timer_sessions`.
  - Heartbeat checks (`assessment_timer_heartbeats`) track student activity.
  - Auto-submission triggers when expiration time is reached.
- **Item Analysis Engine**: Automatically computes:
  $$\text{Difficulty Index } (p) = \frac{R}{N}$$
  $$\text{Discrimination Index } (D) = \frac{U - L}{n}$$
  Where $U$ and $L$ are correct responses from upper and lower 27% scoring brackets.

### 2. Grading & Transmutation Engine
- **Hierarchical Schema**:
  $$\text{Final Grade} = \sum (\text{Grading Period Score} \times \text{Period Weight})$$
  $$\text{Period Score} = \sum (\text{Component Raw Score} \times \text{Component Weight})$$
- **Transmutation Scale**:
  Raw percentage is converted via `grade_transmutation_tables` into numerical grades (1.00 to 5.00) or special grade codes (INC/DRP).
- **Evaluation Gating**:
  Students cannot view released term grades until they complete the mandatory Faculty Evaluation survey for the corresponding section (`fn_check_evaluation_completion`).

### 3. Learning Analytics & AI Assistant Engine
- **At-Risk Scoring Model**:
  Computes a composite risk indicator combining academic average (50%), attendance rate (30%), and missing assessment count (20%).
- **AI Assistant Edge Function (`/supabase/functions/ai-assistant`)**:
  - Communicates via Google Gemini Flash API.
  - Executes `fn_get_assistant_context` (a read-only `SECURITY INVOKER` function) to gather the student or faculty member's real-time academic context.
  - Generates deterministic, fact-grounded academic advising responses without direct database write permissions.

