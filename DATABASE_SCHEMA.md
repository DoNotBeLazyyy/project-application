# DATABASE_SCHEMA.md — PostgreSQL Data Model & Stored Procedures

This document specifies the PostgreSQL 17 database structure, tables, enums, audit patterns, and stored procedure conventions used in the Arellano University LMS (AU-JAS).

---

## 1. Database Architecture & Design Standards

- **Primary Keys**: Universally UUID with `DEFAULT gen_random_uuid()`.
- **Foreign Keys**: Enforced with `ON DELETE RESTRICT` to prevent unintended cascading deletions of academic records.
- **Audit Columns**: Mandatory across all tables:
  - `created_at` (`timestamptz NOT NULL DEFAULT now()`)
  - `updated_at` (`timestamptz`)
  - `deleted_at` (`timestamptz` — soft delete marker)
  - `created_by` (`uuid DEFAULT auth.uid()`)
  - `updated_by` (`uuid`)
  - `deleted_by` (`uuid`)
- **Audit Trigger**: Every table attaches `trg_{table}_updated_audit` calling `fn_set_updated_audit()`.
- **Soft Deletes**: Deletion operations update `deleted_at = now()`, `deleted_by = auth.uid()`. All active queries filter `WHERE deleted_at IS NULL`.
- **Partial Unique Indexes**: Unique constraints are implemented via partial indexes (`WHERE deleted_at IS NULL`) to allow reuse of natural keys after soft deletion.

---

## 2. Table Catalog by Domain (~55 Tables)

### System & Administration
- `users`: Core profile record synchronized with Supabase `auth.users` (`id`, `email`, `first_name`, `last_name`, `status`, `avatar_url`).
- `roles`: Role definitions (`code`, `name`, `description`).
- `user_roles`: Many-to-many role assignments (`user_id`, `role_id`).
- `school_years`: Academic years (`code`, `start_date`, `end_date`, `is_active`).
- `term_types`: Classification of terms (Semester, Trimester, Summer).
- `terms`: Academic terms tied to school years (`school_year_id`, `term_type_id`, `code`, `start_date`, `end_date`, `is_active`, `evaluation_scope`).
- `system_settings`: Global configuration and academic thresholds.
- `audit_logs`: Immutable audit trails for grade changes, enrollments, and user updates.
- `notifications`: User notification queue (`user_id`, `title`, `message`, `type`, `is_read`, `action_url`).

### Academic Structure (Dean Domain)
- `departments`: Academic departments (`code`, `name`, `head_faculty_id`).
- `programs`: Degree programs (`department_id`, `code`, `name`, `total_years`).
- `program_levels`: Year levels within programs (1st Year, 2nd Year, etc.).
- `courses`: Master course catalog (`code`, `title`, `lecture_units`, `lab_units`, `is_split`, `department_id`).
- `course_types`: Course classifications (Major, General Education, Elective).
- `course_prerequisites`: Prerequisite requirements (`course_id`, `prerequisite_course_id`, `type`, `min_grade`).
- `curriculum_maps`: Curriculum grids mapping courses to program, year level, and term.
- `sections`: Scheduled course offerings (`course_id`, `term_id`, `faculty_id`, `section_name`, `max_capacity`).
- `section_schedules`: Meeting times and rooms (`section_id`, `day_of_week`, `start_time`, `end_time`, `room`).

### Students, Records & Enrollment (Registrar Domain)
- `students`: Extended student profile (`user_id`, `student_number`, `program_id`, `current_year_level`, `academic_standing`).
- `enrollments`: Student section enrollments (`student_id`, `section_id`, `status`, `enrollment_date`).
- `student_clearances`: Term clearance records (`student_id`, `term_id`, `status`).
- `clearance_requirements`: Specific clearance items (Library, Accounting, Department Head).
- `section_final_grades`: Official submitted and released final grades per grading period.
- `grade_audit_logs`: Transaction history of grade modifications.

### Instruction & Assessments (Faculty & Student Domains)
- `assessments`: Master assessment metadata (`section_id`, `title`, `type`, `grading_component_id`, `total_points`, `passing_points`, `time_limit_minutes`, `max_attempts`, `scheduled_publish_at`, `opens_at`, `due_at`, `closes_at`, `show_results_at`).
- `assessment_items`: Section-level assessment instances.
- `assessment_questions`: Questions attached to assessments (`item_id`, `question_text`, `question_type`, `points`, `order_index`).
- `assessment_question_choices`: Multiple choice options (`question_id`, `choice_text`, `is_correct`, `order_index`).
- `assessment_submissions`: Student submission records (`assessment_id`, `student_id`, `enrollment_id`, `attempt_number`, `status`, `total_score`, `submitted_at`).
- `student_answers`: Specific student answers to questions (`submission_id`, `question_id`, `selected_choice_id`, `text_answer`, `score`, `feedback`).
- `assessment_timer_sessions`: Active timer tracking (`enrollment_id`, `assessment_id`, `server_started_at`, `server_expires_at`, `status`).
- `assessment_timer_heartbeats`: Client heartbeat logs to detect dropped sessions.
- `rubrics`: Scoring rubrics (`faculty_id`, `title`, `total_points`).
- `rubric_criteria`: Criteria levels and point distributions.
- `rubric_evaluations`: Evaluated rubric scores per submission.
- `modules`: Course modules (`section_id`, `title`, `description`, `order_index`).
- `course_materials`: Uploaded files and resources linked to modules (`module_id`, `title`, `file_url`, `file_type`).
- `attendance_sessions`: Daily attendance session headers (`section_id`, `session_date`, `notes`).
- `attendance_records`: Individual student attendance states (`session_id`, `student_id`, `status`).

### Grading Configuration & Transmutation
- `grading_period_templates`: Global period templates (Prelim, Midterm, Finals).
- `grading_periods`: Section-specific grading periods.
- `grading_component_templates`: Global component templates (Written Work, Performance Task, Exam).
- `grading_components`: Section-specific component weight configurations.
- `grade_transmutation_tables`: Conversion ranges from raw scores to final grades.
- `special_grade_configs`: Non-numeric grade codes (INC, DRP).

### Evaluation & Communication
- `evaluation_templates`: Faculty evaluation question templates.
- `evaluation_questions`: Individual survey questions.
- `evaluation_responses`: Anonymous student evaluation submissions.
- `announcements`: Announcements scoped by role, department, program, or section.
- `events`: Academic calendar events.
- `student_section_colors`: Student-customized timetable color preferences.

---

## 3. Database Enums (20 Types)

| Enum Name | Allowed Values |
|---|---|
| `announcement_audience_type` | `'All'`, `'Department'`, `'Program'`, `'Section'`, `'Role'` |
| `assessment_type` | `'Quiz'`, `'Exam'`, `'Assignment'`, `'Project'`, `'Activity'` |
| `attendance_status_type` | `'Present'`, `'Late'`, `'Absent'`, `'Excused'` |
| `audit_action_type` | `'INSERT'`, `'UPDATE'`, `'DELETE'`, `'LOGIN'`, `'GRADE_SUBMIT'`, `'GRADE_RELEASE'` |
| `civil_status_type` | `'Single'`, `'Married'`, `'Widowed'`, `'Separated'` |
| `clearance_status_type` | `'Pending'`, `'Cleared'`, `'Deficient'` |
| `day_of_week_type` | `'Monday'`, `'Tuesday'`, `'Wednesday'`, `'Thursday'`, `'Friday'`, `'Saturday'`, `'Sunday'` |
| `enrollment_status_type` | `'Enrolled'`, `'Dropped'`, `'Withdrawn'`, `'Completed'` |
| `evaluation_question_type` | `'Likert'`, `'Text'`, `'MultipleChoice'` |
| `faculty_status_type` | `'FullTime'`, `'PartTime'`, `'OnLeave'`, `'Inactive'` |
| `gender_type` | `'Male'`, `'Female'`, `'Other'` |
| `grade_status_type` | `'Draft'`, `'Submitted'`, `'Released'`, `'Locked'` |
| `material_type` | `'Document'`, `'Video'`, `'Link'`, `'Presentation'` |
| `prerequisite_type` | `'Required'`, `'CoRequisite'`, `'Recommended'` |
| `question_type` | `'MultipleChoice'`, `'TrueFalse'`, `'ShortAnswer'`, `'Essay'`, `'FillInBlank'`, `'Matching'`, `'FileUpload'` |
| `section_status_type` | `'Open'`, `'Closed'`, `'Merged'`, `'Cancelled'` |
| `student_status_type` | `'Regular'`, `'Irregular'`, `'Probationary'`, `'Graduated'`, `'Inactive'` |
| `submission_status_type` | `'InProgress'`, `'Submitted'`, `'Graded'`, `'Late'`, `'Excused'` |
| `submission_timer_status` | `'Active'`, `'Expired'`, `'Submitted'` |
| `term_status_type` | `'Upcoming'`, `'Active'`, `'Completed'`, `'Archived'` |

---

## 4. Stored Procedure Conventions & Pagination Wrapper

### RPC Naming Rules
- `fn_get_<entity>_by_id` / `fn_get_<entity>`: Single entity query returning a JSONB object or table row.
- `fn_list_<entity>_json`: Dynamic paginated list query returning standard `CommonListResDto<T>`.
- `fn_create_<entity>` / `fn_update_<entity>` / `fn_delete_<entity>`: Single-entity transactional mutations.
- `fn_bulk_create_<entity>` / `fn_bulk_delete_<entity>`: Multi-row transactional array mutations.
- `fn_assert_role(role_name)` / `fn_assert_section_staff(section_id)`: Security assertion triggers raising `42501` exception if unauthorized.

### Standard Pagination Envelope (`fn_build_pageable_dto`)
List RPCs build standardized pagination responses matching the frontend DTO format:
```json
{
    "items": [...],
    "totalElements": 150,
    "totalPages": 15,
    "pageNumber": 0,
    "pageSize": 10
}
```
All pagination procedures accept `p_page` (1-indexed UI input), `p_size`, `p_search`, `p_sort_col`, and `p_sort_dir` using parameterized dynamic SQL.

