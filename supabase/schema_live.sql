-- AU-JAS LMS Production Database Baseline Schema
-- Target PostgreSQL Version: 17+
-- Authoritative Consolidated Source of Truth


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE public.announcement_audience_type AS ENUM ('Global', 'Faculty', 'Student', 'Section');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.assessment_type AS ENUM ('Quiz', 'Exam', 'Activity', 'Assignment', 'Project', 'Lab Report');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_status_type AS ENUM ('Present', 'Absent', 'Late', 'Excused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.audit_action_type AS ENUM ('Insert', 'Update', 'Delete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.civil_status_type AS ENUM ('Single', 'Married', 'Widowed', 'Separated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.clearance_status_type AS ENUM ('Pending', 'Cleared', 'Flagged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.day_of_week_type AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.enrollment_status_type AS ENUM ('Enrolled', 'Dropped', 'Withdrawn', 'Completed', 'Failed', 'Incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.evaluation_question_type AS ENUM ('Rating', 'Multiple Choice', 'Open Ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.evaluation_scope_type AS ENUM ('Period', 'Term');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.faculty_status_type AS ENUM ('Active', 'Inactive', 'On Leave', 'Retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.gender_type AS ENUM ('Male', 'Female', 'Prefer not to say');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.grade_status_type AS ENUM ('Draft', 'Submitted', 'Approved', 'Released');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.material_type AS ENUM ('File', 'Link', 'Video', 'Document', 'Slide', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.notification_category_type AS ENUM ('Announcement', 'Event', 'Assessment', 'Grade', 'Enrollment', 'Clearance', 'Attendance', 'Account', 'General');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.prerequisite_type AS ENUM ('Required', 'Co-requisite', 'Recommended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.proctor_event_type AS ENUM ('Heartbeat', 'Focus Lost', 'Focus Restored');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.question_type AS ENUM ('Multiple Choice', 'True or False', 'Short Answer', 'Essay', 'Fill in the Blank', 'Matching', 'File Upload');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.section_status_type AS ENUM ('Open', 'Full', 'Ongoing', 'Closed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.student_status_type AS ENUM ('Active', 'Inactive', 'LOA', 'Graduated', 'Expelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.submission_status_type AS ENUM ('Not Started', 'In Progress', 'Submitted', 'Late', 'Graded', 'Returned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.submission_timer_status AS ENUM ('Pending', 'Active', 'Expired', 'Submitted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.term_status_type AS ENUM ('Upcoming', 'Enrollment Open', 'Ongoing', 'Grading Period', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 3. TABLES DEFINITION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.academic_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    min_gwa numeric(4,2),
    max_gwa numeric(4,2) NOT NULL,
    requires_no_failing boolean DEFAULT true NOT NULL,
    scholarship_discount_pct numeric(5,2),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT academic_thresholds_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.announcement_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    section_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT announcement_sections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    target_audience announcement_audience_type DEFAULT 'Global'::announcement_audience_type NOT NULL,
    section_id uuid,
    is_pinned boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT announcements_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.assessment_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size_bytes bigint,
    mime_type text,
    sequence smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);

CREATE TABLE IF NOT EXISTS public.assessment_item_rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    rubric_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT assessment_item_rubrics_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.assessment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    grading_component_id uuid,
    module_id uuid,
    title text NOT NULL,
    description text,
    assessment_type assessment_type DEFAULT 'Quiz'::assessment_type NOT NULL,
    total_points numeric(8,2) DEFAULT 100 NOT NULL,
    passing_points numeric(8,2),
    time_limit_minutes smallint,
    max_attempts smallint DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    due_at timestamp with time zone,
    closes_at timestamp with time zone,
    show_results_at timestamp with time zone,
    shuffle_questions boolean DEFAULT false NOT NULL,
    shuffle_choices boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    max_file_count_per_question smallint,
    show_all_questions boolean DEFAULT true NOT NULL,
    questions_per_page smallint,
    opens_at timestamp with time zone,
    scheduled_publish_at timestamp with time zone,
    use_rubric_scoring boolean DEFAULT false NOT NULL,
    allow_student_review boolean DEFAULT true NOT NULL,
    CONSTRAINT assessment_items_pkey PRIMARY KEY (id),
    CONSTRAINT assessment_items_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT assessment_items_max_file_count_per_question_check CHECK ((max_file_count_per_question > 0)),
    CONSTRAINT assessment_items_time_limit_minutes_check CHECK ((time_limit_minutes > 0)),
    CONSTRAINT assessment_items_total_points_check CHECK ((total_points > (0)::numeric)),
    CONSTRAINT chk_assessment_window CHECK (((closes_at IS NULL) OR (due_at IS NULL) OR (closes_at >= due_at)))
);

CREATE TABLE IF NOT EXISTS public.assessment_question_choices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    choice_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT assessment_question_choices_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.assessment_question_competencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    competency_id uuid NOT NULL,
    weight numeric(5,2) DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT assessment_question_competencies_pkey PRIMARY KEY (id),
    CONSTRAINT chk_aqc_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type question_type DEFAULT 'Multiple Choice'::question_type NOT NULL,
    points numeric(6,2) DEFAULT 1 NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    explanation text,
    is_required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    allowed_file_types text[],
    max_file_size_mb integer,
    max_file_count smallint,
    CONSTRAINT assessment_questions_pkey PRIMARY KEY (id),
    CONSTRAINT assessment_questions_max_file_count_check CHECK ((max_file_count > 0)),
    CONSTRAINT assessment_questions_max_file_size_mb_check CHECK ((max_file_size_mb > 0)),
    CONSTRAINT assessment_questions_points_check CHECK ((points > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.assessment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    attempt_number smallint DEFAULT 1 NOT NULL,
    status submission_status_type DEFAULT 'Not Started'::submission_status_type NOT NULL,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    time_limit_expires_at timestamp with time zone,
    raw_score numeric(8,2),
    final_score numeric(8,2),
    graded_at timestamp with time zone,
    graded_by uuid,
    feedback text,
    is_late boolean DEFAULT false NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT assessment_submissions_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT chk_submission_attempt_window CHECK (((submitted_at IS NULL) OR (started_at IS NULL) OR (submitted_at >= started_at)))
);

CREATE TABLE IF NOT EXISTS public.assessment_timer_heartbeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    client_ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    event_type proctor_event_type DEFAULT 'Heartbeat'::proctor_event_type NOT NULL,
    CONSTRAINT assessment_timer_heartbeats_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.assessment_timer_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    assessment_item_id uuid NOT NULL,
    status submission_timer_status DEFAULT 'Pending'::submission_timer_status NOT NULL,
    server_started_at timestamp with time zone,
    server_expires_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    forced_submit_at timestamp with time zone,
    client_ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT assessment_timer_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_session_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    status attendance_status_type DEFAULT 'Present'::attendance_status_type NOT NULL,
    remarks text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT attendance_records_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    session_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.clearance_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    department_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT clearance_requirements_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.competencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    course_id uuid,
    code text NOT NULL,
    title text NOT NULL,
    description text,
    bloom_level text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT competencies_pkey PRIMARY KEY (id),
    CONSTRAINT chk_competencies_scope CHECK (((program_id IS NOT NULL) OR (course_id IS NOT NULL)))
);

CREATE TABLE IF NOT EXISTS public.competency_alignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competency_id uuid NOT NULL,
    parent_competency_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT competency_alignments_pkey PRIMARY KEY (id),
    CONSTRAINT chk_alignment_distinct CHECK ((competency_id <> parent_competency_id))
);

CREATE TABLE IF NOT EXISTS public.course_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    material_type material_type DEFAULT 'File'::material_type NOT NULL,
    file_url text,
    external_url text,
    sequence smallint DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    available_from timestamp with time zone,
    available_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    file_name text,
    mime_type text,
    file_size_bytes integer,
    CONSTRAINT course_materials_pkey PRIMARY KEY (id),
    CONSTRAINT chk_material_availability CHECK (((available_until IS NULL) OR (available_from IS NULL) OR (available_until > available_from))),
    CONSTRAINT course_materials_file_size_bytes_check CHECK ((file_size_bytes > 0))
);

CREATE TABLE IF NOT EXISTS public.course_prerequisites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    prerequisite_id uuid,
    prerequisite_type prerequisite_type DEFAULT 'Required'::prerequisite_type NOT NULL,
    minimum_grade numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    prerequisite_kind text DEFAULT 'course'::text NOT NULL,
    year_level_required smallint,
    CONSTRAINT course_prerequisites_pkey PRIMARY KEY (id),
    CONSTRAINT chk_no_self_prerequisite CHECK ((course_id <> prerequisite_id)),
    CONSTRAINT chk_prerequisite_kind CHECK ((prerequisite_kind = ANY (ARRAY['course'::text, 'standing'::text]))),
    CONSTRAINT chk_year_level_required CHECK (((year_level_required >= 1) AND (year_level_required <= 6)))
);

CREATE TABLE IF NOT EXISTS public.course_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT course_types_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    description text,
    lecture_units numeric(4,2) DEFAULT 0 NOT NULL,
    laboratory_units numeric(4,2) DEFAULT 0 NOT NULL,
    total_units numeric(4,2) DEFAULT (lecture_units + laboratory_units),
    credit_hours numeric(4,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    course_type_id uuid,
    CONSTRAINT courses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.curriculum_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    course_id uuid NOT NULL,
    year_level smallint NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    is_elective boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    term_type_id uuid,
    school_year_id uuid,
    CONSTRAINT curriculum_maps_pkey PRIMARY KEY (id),
    CONSTRAINT curriculum_maps_year_level_check CHECK (((year_level >= 1) AND (year_level <= 6)))
);

CREATE TABLE IF NOT EXISTS public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    head_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT departments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.discussion_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid,
    post_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    mime_type text,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT discussion_attachments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.discussion_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    body text NOT NULL,
    is_answer boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT discussion_posts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.discussion_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_resolved boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT discussion_threads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    section_id uuid NOT NULL,
    status enrollment_status_type DEFAULT 'Enrolled'::enrollment_status_type NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    dropped_at timestamp with time zone,
    drop_reason text,
    final_grade numeric(5,2),
    is_grade_visible boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    is_conflict_authorized boolean DEFAULT false NOT NULL,
    conflict_authorized_by uuid,
    conflict_authorized_at timestamp with time zone,
    conflict_reason text,
    CONSTRAINT enrollments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.evaluation_period_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    template_id uuid NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    template_ids uuid[],
    CONSTRAINT evaluation_period_locks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.evaluation_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type evaluation_question_type DEFAULT 'Rating'::evaluation_question_type NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    min_rating smallint DEFAULT 1,
    max_rating smallint DEFAULT 5,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT evaluation_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.evaluation_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    rating_value smallint,
    response_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT evaluation_responses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.evaluation_template_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    program_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT evaluation_template_programs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.evaluation_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    sequence smallint DEFAULT 1 NOT NULL,
    CONSTRAINT evaluation_templates_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.event_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    section_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT event_sections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    location text,
    target_audience announcement_audience_type DEFAULT 'Global'::announcement_audience_type NOT NULL,
    section_id uuid,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone,
    all_day boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT chk_events_range CHECK (((end_at IS NULL) OR (end_at >= start_at)))
);

CREATE TABLE IF NOT EXISTS public.grade_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action audit_action_type NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    enrollment_id uuid,
    grading_period_id uuid,
    field_changed text NOT NULL,
    old_value text,
    new_value text,
    change_reason text NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grade_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.grade_transmutation_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    label text NOT NULL,
    min_percentage numeric(5,2) NOT NULL,
    max_percentage numeric(5,2) NOT NULL,
    transmuted_grade numeric(5,2),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grade_transmutation_tables_pkey PRIMARY KEY (id),
    CONSTRAINT chk_transmutation_range CHECK ((max_percentage >= min_percentage)),
    CONSTRAINT grade_transmutation_tables_max_percentage_check CHECK (((max_percentage >= (0)::numeric) AND (max_percentage <= (100)::numeric))),
    CONSTRAINT grade_transmutation_tables_min_percentage_check CHECK (((min_percentage >= (0)::numeric) AND (min_percentage <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.grading_component_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grading_period_template_id uuid NOT NULL,
    name text NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grading_component_templates_pkey PRIMARY KEY (id),
    CONSTRAINT chk_component_template_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.grading_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    name text NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grading_components_pkey PRIMARY KEY (id),
    CONSTRAINT grading_components_weight_check CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.grading_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    passing_grade numeric(5,2) DEFAULT 3.0 NOT NULL,
    max_absence_percentage numeric(5,2) DEFAULT 20.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grading_config_pkey PRIMARY KEY (id),
    CONSTRAINT chk_max_absence_percentage CHECK (((max_absence_percentage > (0)::numeric) AND (max_absence_percentage <= (100)::numeric))),
    CONSTRAINT chk_passing_grade CHECK (((passing_grade >= 1.0) AND (passing_grade <= 5.0)))
);

CREATE TABLE IF NOT EXISTS public.grading_period_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sequence smallint NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grading_period_templates_pkey PRIMARY KEY (id),
    CONSTRAINT chk_period_template_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.grading_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term_id uuid NOT NULL,
    name text NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    weight numeric(5,2) DEFAULT 25 NOT NULL,
    release_at timestamp with time zone,
    CONSTRAINT grading_periods_pkey PRIMARY KEY (id),
    CONSTRAINT chk_grading_period_dates CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date > start_date))),
    CONSTRAINT chk_grading_period_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.material_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT material_completions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    sequence smallint DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT modules_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    notification_type notification_category_type DEFAULT 'General'::notification_category_type NOT NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.program_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT program_levels_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    total_units numeric(5,2),
    years_duration smallint DEFAULT 4 NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    program_level_id uuid,
    CONSTRAINT programs_pkey PRIMARY KEY (id),
    CONSTRAINT programs_years_duration_check CHECK (((years_duration >= 1) AND (years_duration <= 8)))
);

CREATE TABLE IF NOT EXISTS public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.rubric_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rubric_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    max_points numeric(6,2) NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT rubric_criteria_pkey PRIMARY KEY (id),
    CONSTRAINT rubric_criteria_max_points_check CHECK ((max_points > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.rubric_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    criteria_id uuid NOT NULL,
    points_earned numeric(6,2) NOT NULL,
    feedback text,
    evaluated_by uuid NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT rubric_evaluations_pkey PRIMARY KEY (id),
    CONSTRAINT rubric_evaluations_points_earned_check CHECK ((points_earned >= (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    total_points numeric(8,2) DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT rubrics_pkey PRIMARY KEY (id),
    CONSTRAINT rubrics_total_points_check CHECK ((total_points > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.school_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT school_years_pkey PRIMARY KEY (id),
    CONSTRAINT chk_school_year_dates CHECK ((end_date > start_date))
);

CREATE TABLE IF NOT EXISTS public.section_final_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    raw_grade numeric(5,2) NOT NULL,
    final_grade numeric(5,2) NOT NULL,
    transmuted_grade numeric(5,2),
    status grade_status_type DEFAULT 'Draft'::grade_status_type NOT NULL,
    remarks text,
    approved_by uuid,
    approved_at timestamp with time zone,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    special_grade text,
    CONSTRAINT section_final_grades_pkey PRIMARY KEY (id),
    CONSTRAINT section_final_grades_final_grade_check CHECK (((final_grade >= (0)::numeric) AND (final_grade <= (100)::numeric))),
    CONSTRAINT section_final_grades_raw_grade_check CHECK (((raw_grade >= (0)::numeric) AND (raw_grade <= (100)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.section_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    day_of_week day_of_week_type NOT NULL,
    time_start time without time zone NOT NULL,
    time_end time without time zone NOT NULL,
    room text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT section_schedules_pkey PRIMARY KEY (id),
    CONSTRAINT chk_schedule_times CHECK ((time_end > time_start))
);

CREATE TABLE IF NOT EXISTS public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term_id uuid NOT NULL,
    course_id uuid NOT NULL,
    faculty_id uuid,
    section_code text NOT NULL,
    room text,
    max_slots smallint DEFAULT 40 NOT NULL,
    status section_status_type DEFAULT 'Open'::section_status_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT sections_pkey PRIMARY KEY (id),
    CONSTRAINT sections_max_slots_check CHECK ((max_slots > 0))
);

CREATE TABLE IF NOT EXISTS public.special_grade_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    min_absence_percentage numeric(5,2),
    requires_completion boolean DEFAULT false NOT NULL,
    completion_deadline_days smallint,
    is_passing boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT special_grade_configs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.student_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    choice_id uuid,
    answer_text text,
    points_earned numeric(6,2),
    is_correct boolean,
    grader_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    file_attachments jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT student_answers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.student_clearances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    term_id uuid NOT NULL,
    status clearance_status_type DEFAULT 'Pending'::clearance_status_type NOT NULL,
    remarks text,
    cleared_by uuid,
    cleared_at timestamp with time zone,
    flagged_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT student_clearances_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.student_lifecycle_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    event_type text NOT NULL,
    from_status student_status_type,
    to_status student_status_type,
    from_program_id uuid,
    to_program_id uuid,
    from_year_level smallint,
    to_year_level smallint,
    reason text,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    term_id uuid,
    CONSTRAINT student_lifecycle_events_pkey PRIMARY KEY (id),
    CONSTRAINT chk_student_lifecycle_event_type CHECK ((event_type = ANY (ARRAY['Status Change'::text, 'Program Shift'::text, 'Year Level Progression'::text])))
);

CREATE TABLE IF NOT EXISTS public.student_section_colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    section_id uuid NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);

CREATE TABLE IF NOT EXISTS public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_number text NOT NULL,
    year_level smallint NOT NULL,
    program_id uuid,
    status student_status_type DEFAULT 'Active'::student_status_type NOT NULL,
    admitted_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT students_pkey PRIMARY KEY (id),
    CONSTRAINT students_year_level_check CHECK (((year_level >= 1) AND (year_level <= 6)))
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_name text DEFAULT ''::text NOT NULL,
    institution_short_name text DEFAULT ''::text NOT NULL,
    institution_address text DEFAULT ''::text NOT NULL,
    institution_email text DEFAULT ''::text NOT NULL,
    institution_phone text DEFAULT ''::text NOT NULL,
    institution_website text DEFAULT ''::text NOT NULL,
    institution_logo_url text DEFAULT ''::text NOT NULL,
    academic_year_start_month smallint DEFAULT 6 NOT NULL,
    max_units_per_term smallint DEFAULT 24 NOT NULL,
    default_term_type_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    default_evaluation_scope evaluation_scope_type DEFAULT 'Period'::evaluation_scope_type NOT NULL,
    CONSTRAINT system_settings_pkey PRIMARY KEY (id),
    CONSTRAINT chk_academic_year_start_month CHECK (((academic_year_start_month >= 1) AND (academic_year_start_month <= 12))),
    CONSTRAINT chk_max_units_per_term CHECK (((max_units_per_term >= 1) AND (max_units_per_term <= 60)))
);

CREATE TABLE IF NOT EXISTS public.term_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    sequence smallint DEFAULT 1 NOT NULL,
    CONSTRAINT term_types_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_year_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    enrollment_start_date date,
    enrollment_end_date date,
    grading_deadline date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    term_type_id uuid NOT NULL,
    status text DEFAULT 'Upcoming'::text NOT NULL,
    evaluation_scope evaluation_scope_type,
    CONSTRAINT terms_pkey PRIMARY KEY (id),
    CONSTRAINT chk_term_dates CHECK ((end_date > start_date))
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    role_code text,
    CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    suffix text,
    preferred_name text,
    email text NOT NULL,
    mobile_number text,
    address_line1 text,
    address_line2 text,
    city text,
    province text,
    postal_code text,
    date_of_birth date,
    gender gender_type,
    civil_status civil_status_type,
    nationality text DEFAULT 'Filipino'::text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    status text DEFAULT 'Invited'::text NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);


-- ============================================================================
-- 4. INDEXES
-- ============================================================================
CREATE UNIQUE INDEX uidx_academic_thresholds_code ON public.academic_thresholds USING btree (code) WHERE (deleted_at IS NULL);
CREATE INDEX idx_announcement_sections_section ON public.announcement_sections USING btree (section_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_announcement_sections_pair ON public.announcement_sections USING btree (announcement_id, section_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_announcements_audience ON public.announcements USING btree (target_audience) WHERE (deleted_at IS NULL);
CREATE INDEX idx_announcements_section ON public.announcements USING btree (section_id) WHERE ((deleted_at IS NULL) AND (section_id IS NOT NULL));
CREATE UNIQUE INDEX idx_assessment_attachments_unique ON public.assessment_attachments USING btree (assessment_item_id, file_name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_assessment_item_rubrics ON public.assessment_item_rubrics USING btree (assessment_item_id, rubric_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_assessment_item_rubrics_item ON public.assessment_item_rubrics USING btree (assessment_item_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_question_choices_sequence ON public.assessment_question_choices USING btree (question_id, sequence) WHERE (deleted_at IS NULL);
CREATE INDEX idx_aqc_competency ON public.assessment_question_competencies USING btree (competency_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_aqc_question_competency ON public.assessment_question_competencies USING btree (question_id, competency_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_assessment_questions_sequence ON public.assessment_questions USING btree (assessment_item_id, sequence) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_submissions_enrollment_attempt ON public.assessment_submissions USING btree (assessment_item_id, enrollment_id, attempt_number) WHERE (deleted_at IS NULL);
CREATE INDEX idx_timer_heartbeats_client_ip ON public.assessment_timer_heartbeats USING btree (client_ip, recorded_at) WHERE ((deleted_at IS NULL) AND (client_ip IS NOT NULL));
CREATE INDEX idx_timer_heartbeats_focus ON public.assessment_timer_heartbeats USING btree (session_id, recorded_at) WHERE ((deleted_at IS NULL) AND (event_type <> 'Heartbeat'::proctor_event_type));
CREATE INDEX idx_timer_heartbeats_session ON public.assessment_timer_heartbeats USING btree (session_id, recorded_at DESC) WHERE (deleted_at IS NULL);
CREATE INDEX idx_timer_sessions_expires ON public.assessment_timer_sessions USING btree (server_expires_at) WHERE ((status = 'Active'::submission_timer_status) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uidx_timer_sessions_submission ON public.assessment_timer_sessions USING btree (submission_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_attendance_records_enrollment ON public.attendance_records USING btree (enrollment_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_attendance_records_session_enrollment ON public.attendance_records USING btree (attendance_session_id, enrollment_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_attendance_sessions_section_date ON public.attendance_sessions USING btree (section_id, session_date) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_clearance_requirements_code ON public.clearance_requirements USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_competencies_course_code ON public.competencies USING btree (course_id, code) WHERE ((deleted_at IS NULL) AND (course_id IS NOT NULL));
CREATE UNIQUE INDEX uidx_competencies_program_code ON public.competencies USING btree (program_id, code) WHERE ((deleted_at IS NULL) AND (course_id IS NULL));
CREATE UNIQUE INDEX uidx_competency_alignment_pair ON public.competency_alignments USING btree (competency_id, parent_competency_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_course_materials_module_sequence ON public.course_materials USING btree (module_id, sequence) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_course_prerequisites_pair ON public.course_prerequisites USING btree (course_id, prerequisite_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_course_types_code ON public.course_types USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_courses_code ON public.courses USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_departments_code ON public.departments USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_departments_name ON public.departments USING btree (name) WHERE (deleted_at IS NULL);
CREATE INDEX idx_discussion_attachments_post ON public.discussion_attachments USING btree (post_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_discussion_attachments_thread ON public.discussion_attachments USING btree (thread_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_discussion_posts_thread ON public.discussion_posts USING btree (thread_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_discussion_threads_section ON public.discussion_threads USING btree (section_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_enrollments_student_section ON public.enrollments USING btree (student_id, section_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_evaluation_period_locks_enrollment_period ON public.evaluation_period_locks USING btree (enrollment_id, grading_period_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_evaluation_questions_sequence ON public.evaluation_questions USING btree (template_id, sequence) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_evaluation_responses_question_enrollment_period ON public.evaluation_responses USING btree (question_id, enrollment_id, grading_period_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_evaluation_template_programs_template_program ON public.evaluation_template_programs USING btree (template_id, program_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_evaluation_templates_title ON public.evaluation_templates USING btree (title) WHERE (deleted_at IS NULL);
CREATE INDEX idx_event_sections_section ON public.event_sections USING btree (section_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_event_sections_pair ON public.event_sections USING btree (event_id, section_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_events_start_at ON public.events USING btree (start_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_grade_audit_logs_changed_at ON public.grade_audit_logs USING btree (changed_at DESC);
CREATE INDEX idx_grade_audit_logs_enrollment_id ON public.grade_audit_logs USING btree (enrollment_id);
CREATE INDEX idx_grade_audit_logs_record_id ON public.grade_audit_logs USING btree (record_id);
CREATE UNIQUE INDEX uidx_grade_transmutation_program_range ON public.grade_transmutation_tables USING btree (program_id, min_percentage, max_percentage) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_grading_components_section_period_name ON public.grading_components USING btree (section_id, grading_period_id, name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_grading_period_templates_sequence ON public.grading_period_templates USING btree (sequence) WHERE (deleted_at IS NULL);
CREATE INDEX idx_grading_periods_release_at ON public.grading_periods USING btree (release_at) WHERE ((deleted_at IS NULL) AND (release_at IS NOT NULL));
CREATE UNIQUE INDEX uidx_grading_periods_term_name ON public.grading_periods USING btree (term_id, name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_grading_periods_term_sequence ON public.grading_periods USING btree (term_id, sequence) WHERE (deleted_at IS NULL);
CREATE INDEX idx_material_completions_enrollment ON public.material_completions USING btree (enrollment_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_material_completions_material_enrollment ON public.material_completions USING btree (material_id, enrollment_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_modules_section_sequence ON public.modules USING btree (section_id, sequence) WHERE (deleted_at IS NULL);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE ((is_read = false) AND (deleted_at IS NULL));
CREATE UNIQUE INDEX uidx_program_levels_code ON public.program_levels USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_programs_code_dept ON public.programs USING btree (code, department_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_roles_code ON public.roles USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_roles_description ON public.roles USING btree (lower(btrim(description))) WHERE ((deleted_at IS NULL) AND (btrim(COALESCE(description, ''::text)) <> ''::text));
CREATE UNIQUE INDEX uidx_roles_label ON public.roles USING btree (lower(btrim(label))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_rubric_criteria_rubric ON public.rubric_criteria USING btree (rubric_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_rubric_criteria_sequence ON public.rubric_criteria USING btree (rubric_id, sequence) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_rubric_evaluations_submission_criteria ON public.rubric_evaluations USING btree (submission_id, criteria_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_rubrics_section ON public.rubrics USING btree (section_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_rubrics_section_title ON public.rubrics USING btree (section_id, title) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_school_years_code ON public.school_years USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_section_final_grades_enrollment_period ON public.section_final_grades USING btree (enrollment_id, grading_period_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_section_schedules_slot ON public.section_schedules USING btree (section_id, day_of_week, time_start) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_sections_code_term ON public.sections USING btree (section_code, term_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_special_grade_configs_code ON public.special_grade_configs USING btree (lower(btrim(code))) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_special_grade_configs_description ON public.special_grade_configs USING btree (lower(btrim(description))) WHERE ((deleted_at IS NULL) AND (btrim(COALESCE(description, ''::text)) <> ''::text));
CREATE UNIQUE INDEX uidx_special_grade_configs_label ON public.special_grade_configs USING btree (lower(btrim(label))) WHERE (deleted_at IS NULL);
CREATE INDEX idx_student_answers_file_attachments ON public.student_answers USING gin (file_attachments);
CREATE UNIQUE INDEX uidx_student_answers_submission_question ON public.student_answers USING btree (submission_id, question_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_student_clearances_student_requirement_term ON public.student_clearances USING btree (student_id, requirement_id, term_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_student_lifecycle_events_student ON public.student_lifecycle_events USING btree (student_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_student_lifecycle_events_term ON public.student_lifecycle_events USING btree (student_id, term_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX idx_student_section_colors_unique ON public.student_section_colors USING btree (student_id, section_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_students_student_number ON public.students USING btree (student_number) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_students_user_id ON public.students USING btree (user_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_term_types_code ON public.term_types USING btree (code) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_terms_sy_type ON public.terms USING btree (school_year_id, term_type_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_user_roles_user_role ON public.user_roles USING btree (user_id, role_id) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uidx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


-- ============================================================================
-- 5. FOREIGN KEY CONSTRAINTS
-- ============================================================================
DO $$ BEGIN
    ALTER TABLE announcement_sections ADD CONSTRAINT announcement_sections_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE announcement_sections ADD CONSTRAINT announcement_sections_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE announcements ADD CONSTRAINT announcements_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_attachments ADD CONSTRAINT fk_assessment_attachments_item FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_item_rubrics ADD CONSTRAINT assessment_item_rubrics_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_item_rubrics ADD CONSTRAINT assessment_item_rubrics_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_items ADD CONSTRAINT assessment_items_grading_component_id_fkey FOREIGN KEY (grading_component_id) REFERENCES grading_components(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_items ADD CONSTRAINT assessment_items_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_items ADD CONSTRAINT assessment_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_question_choices ADD CONSTRAINT assessment_question_choices_question_id_fkey FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_question_competencies ADD CONSTRAINT assessment_question_competencies_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_question_competencies ADD CONSTRAINT assessment_question_competencies_question_id_fkey FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_questions ADD CONSTRAINT assessment_questions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_submissions ADD CONSTRAINT assessment_submissions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_submissions ADD CONSTRAINT assessment_submissions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_submissions ADD CONSTRAINT assessment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_timer_heartbeats ADD CONSTRAINT assessment_timer_heartbeats_session_id_fkey FOREIGN KEY (session_id) REFERENCES assessment_timer_sessions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_timer_sessions ADD CONSTRAINT assessment_timer_sessions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES assessment_items(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_timer_sessions ADD CONSTRAINT assessment_timer_sessions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment_timer_sessions ADD CONSTRAINT assessment_timer_sessions_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_attendance_session_id_fkey FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE attendance_sessions ADD CONSTRAINT attendance_sessions_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE clearance_requirements ADD CONSTRAINT clearance_requirements_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE competencies ADD CONSTRAINT competencies_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE competencies ADD CONSTRAINT competencies_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE competency_alignments ADD CONSTRAINT competency_alignments_competency_id_fkey FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE competency_alignments ADD CONSTRAINT competency_alignments_parent_competency_id_fkey FOREIGN KEY (parent_competency_id) REFERENCES competencies(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE course_materials ADD CONSTRAINT course_materials_module_id_fkey FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE course_prerequisites ADD CONSTRAINT course_prerequisites_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE course_prerequisites ADD CONSTRAINT course_prerequisites_prerequisite_id_fkey FOREIGN KEY (prerequisite_id) REFERENCES courses(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE courses ADD CONSTRAINT courses_course_type_id_fkey FOREIGN KEY (course_type_id) REFERENCES course_types(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE courses ADD CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE curriculum_maps ADD CONSTRAINT curriculum_maps_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE curriculum_maps ADD CONSTRAINT curriculum_maps_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE curriculum_maps ADD CONSTRAINT curriculum_maps_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE curriculum_maps ADD CONSTRAINT curriculum_maps_term_type_id_fkey FOREIGN KEY (term_type_id) REFERENCES term_types(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE departments ADD CONSTRAINT departments_head_user_id_fkey FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE discussion_attachments ADD CONSTRAINT discussion_attachments_post_id_fkey FOREIGN KEY (post_id) REFERENCES discussion_posts(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE discussion_attachments ADD CONSTRAINT discussion_attachments_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES discussion_threads(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE discussion_posts ADD CONSTRAINT discussion_posts_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES discussion_threads(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE discussion_threads ADD CONSTRAINT discussion_threads_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE enrollments ADD CONSTRAINT enrollments_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_period_locks ADD CONSTRAINT evaluation_period_locks_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_period_locks ADD CONSTRAINT evaluation_period_locks_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES grading_periods(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_period_locks ADD CONSTRAINT evaluation_period_locks_template_id_fkey FOREIGN KEY (template_id) REFERENCES evaluation_templates(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_questions ADD CONSTRAINT evaluation_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES evaluation_templates(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_responses ADD CONSTRAINT evaluation_responses_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_responses ADD CONSTRAINT evaluation_responses_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES grading_periods(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_responses ADD CONSTRAINT evaluation_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES evaluation_questions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_template_programs ADD CONSTRAINT evaluation_template_programs_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE evaluation_template_programs ADD CONSTRAINT evaluation_template_programs_template_id_fkey FOREIGN KEY (template_id) REFERENCES evaluation_templates(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE event_sections ADD CONSTRAINT event_sections_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE event_sections ADD CONSTRAINT event_sections_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE events ADD CONSTRAINT events_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grade_audit_logs ADD CONSTRAINT grade_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grade_audit_logs ADD CONSTRAINT grade_audit_logs_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grade_audit_logs ADD CONSTRAINT grade_audit_logs_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES grading_periods(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grade_transmutation_tables ADD CONSTRAINT grade_transmutation_tables_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grading_component_templates ADD CONSTRAINT grading_component_templates_period_fkey FOREIGN KEY (grading_period_template_id) REFERENCES grading_period_templates(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grading_components ADD CONSTRAINT grading_components_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES grading_periods(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grading_components ADD CONSTRAINT grading_components_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grading_periods ADD CONSTRAINT grading_periods_term_id_fkey FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE material_completions ADD CONSTRAINT material_completions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE material_completions ADD CONSTRAINT material_completions_material_id_fkey FOREIGN KEY (material_id) REFERENCES course_materials(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE modules ADD CONSTRAINT modules_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE programs ADD CONSTRAINT programs_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE programs ADD CONSTRAINT programs_program_level_id_fkey FOREIGN KEY (program_level_id) REFERENCES program_levels(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE rubric_criteria ADD CONSTRAINT rubric_criteria_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES rubrics(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE rubric_evaluations ADD CONSTRAINT rubric_evaluations_criteria_id_fkey FOREIGN KEY (criteria_id) REFERENCES rubric_criteria(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE rubric_evaluations ADD CONSTRAINT rubric_evaluations_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE rubric_evaluations ADD CONSTRAINT rubric_evaluations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE rubrics ADD CONSTRAINT rubrics_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE section_final_grades ADD CONSTRAINT section_final_grades_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE section_final_grades ADD CONSTRAINT section_final_grades_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE section_final_grades ADD CONSTRAINT section_final_grades_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES grading_periods(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE section_schedules ADD CONSTRAINT section_schedules_section_id_fkey FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE sections ADD CONSTRAINT sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE sections ADD CONSTRAINT sections_term_id_fkey FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_answers ADD CONSTRAINT student_answers_choice_id_fkey FOREIGN KEY (choice_id) REFERENCES assessment_question_choices(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_answers ADD CONSTRAINT student_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES assessment_questions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_answers ADD CONSTRAINT student_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES assessment_submissions(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_clearances ADD CONSTRAINT student_clearances_cleared_by_fkey FOREIGN KEY (cleared_by) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_clearances ADD CONSTRAINT student_clearances_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES clearance_requirements(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_clearances ADD CONSTRAINT student_clearances_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_clearances ADD CONSTRAINT student_clearances_term_id_fkey FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_lifecycle_events ADD CONSTRAINT student_lifecycle_events_from_program_id_fkey FOREIGN KEY (from_program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_lifecycle_events ADD CONSTRAINT student_lifecycle_events_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_lifecycle_events ADD CONSTRAINT student_lifecycle_events_term_id_fkey FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_lifecycle_events ADD CONSTRAINT student_lifecycle_events_to_program_id_fkey FOREIGN KEY (to_program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_section_colors ADD CONSTRAINT fk_student_section_colors_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE student_section_colors ADD CONSTRAINT fk_student_section_colors_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE students ADD CONSTRAINT fk_students_program_id FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE system_settings ADD CONSTRAINT system_settings_default_term_type_fkey FOREIGN KEY (default_term_type_id) REFERENCES term_types(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE terms ADD CONSTRAINT terms_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE terms ADD CONSTRAINT terms_term_type_id_fkey FOREIGN KEY (term_type_id) REFERENCES term_types(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) ACTIVATION
-- ============================================================================
ALTER TABLE public.academic_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_item_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_question_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_question_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_timer_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_timer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competency_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_template_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_transmutation_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_component_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_period_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_final_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_grade_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_section_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. STORED PROCEDURES & DATABASE FUNCTIONS (fn_*)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_activate_user()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.users
    SET
        status     = 'Active',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id         = auth.uid()
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_advance_term_status(p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_current_status TEXT;
    v_next_status TEXT;
    v_school_year_id UUID;
    v_start_date DATE;
    v_end_date DATE;
    v_grading_deadline DATE;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT status, school_year_id, start_date, end_date, grading_deadline
    INTO v_current_status, v_school_year_id, v_start_date, v_end_date, v_grading_deadline
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    v_next_status := CASE v_current_status
        WHEN 'Upcoming' THEN 'Enrollment Open'
        WHEN 'Enrollment Open' THEN 'Ongoing'
        WHEN 'Ongoing' THEN 'Grading Period'
        WHEN 'Grading Period' THEN 'Closed'
        ELSE NULL
    END;

    IF v_next_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term is already closed and cannot be advanced');
    END IF;

    IF v_next_status = 'Ongoing' THEN
        IF EXISTS (
            SELECT 1 FROM public.terms
            WHERE school_year_id = v_school_year_id
            AND status IN ('Ongoing', 'Grading Period')
            AND id <> p_term_id
            AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Another term in this school year is already Ongoing or in Grading Period');
        END IF;
    END IF;

    UPDATE public.terms
    SET status = v_next_status
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Term status advanced to ' || v_next_status,
        'next_status', v_next_status,
        'previous_status', v_current_status
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_assert_section(p_section_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar', 'Dean'] THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id
          AND s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
    ) THEN
        RETURN;
    END IF;

    RAISE EXCEPTION 'Forbidden: you may only view insight for sections you teach.'
        USING ERRCODE = '42501';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_engagement(p_enrollment_ids uuid[])
 RETURNS TABLE(enrollment_id uuid, sessions_total integer, present_count integer, late_count integer, excused_count integer, absent_count integer, attendance_rate numeric, due_count integer, submitted_count integer, on_time_count integer, late_submission_count integer, missing_count integer, submission_rate numeric, materials_total integer, materials_completed integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH targets AS (
        SELECT
            e.id AS enrollment_id,
            e.section_id
        FROM public.enrollments e
        WHERE e.id = ANY (p_enrollment_ids)
          AND e.deleted_at IS NULL
    ),
    marked AS (
        SELECT
            ar.enrollment_id,
            ar.id,
            ar.status
        FROM public.attendance_records ar
        INNER JOIN public.attendance_sessions asx
            ON asx.id = ar.attendance_session_id
            AND asx.deleted_at IS NULL
        WHERE ar.deleted_at IS NULL
          AND ar.enrollment_id = ANY (p_enrollment_ids)
    ),
    attendance AS (
        SELECT
            t.enrollment_id,
            COUNT(ar.id)::INTEGER AS sessions_total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Present')::INTEGER AS present_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Late')::INTEGER AS late_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Excused')::INTEGER AS excused_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Absent')::INTEGER AS absent_count
        FROM targets t
        LEFT JOIN marked ar ON ar.enrollment_id = t.enrollment_id
        GROUP BY t.enrollment_id
    ),
    due_items AS (
        SELECT
            t.enrollment_id,
            ai.id AS assessment_item_id
        FROM targets t
        INNER JOIN public.assessment_items ai
            ON ai.section_id = t.section_id
            AND ai.deleted_at IS NULL
            AND ai.is_published
            AND ai.due_at IS NOT NULL
            AND ai.due_at < now()
    ),
    submissions AS (
        SELECT
            d.enrollment_id,
            d.assessment_item_id,
            bool_or(sub.id IS NOT NULL) AS has_submission,
            bool_or(sub.id IS NOT NULL AND NOT sub.is_late) AS has_on_time
        FROM due_items d
        LEFT JOIN public.assessment_submissions sub
            ON sub.assessment_item_id = d.assessment_item_id
            AND sub.enrollment_id = d.enrollment_id
            AND sub.deleted_at IS NULL
            AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
        GROUP BY d.enrollment_id, d.assessment_item_id
    ),
    submission_totals AS (
        SELECT
            t.enrollment_id,
            COUNT(s.assessment_item_id)::INTEGER AS due_count,
            COUNT(s.assessment_item_id) FILTER (WHERE s.has_submission)::INTEGER AS submitted_count,
            COUNT(s.assessment_item_id) FILTER (WHERE s.has_on_time)::INTEGER AS on_time_count,
            COUNT(s.assessment_item_id) FILTER (WHERE s.has_submission AND NOT s.has_on_time)::INTEGER AS late_submission_count,
            COUNT(s.assessment_item_id) FILTER (WHERE NOT s.has_submission)::INTEGER AS missing_count
        FROM targets t
        LEFT JOIN submissions s ON s.enrollment_id = t.enrollment_id
        GROUP BY t.enrollment_id
    ),
    materials AS (
        SELECT
            t.enrollment_id,
            COUNT(cm.id)::INTEGER AS materials_total,
            COUNT(mc.id)::INTEGER AS materials_completed
        FROM targets t
        LEFT JOIN public.modules m
            ON m.section_id = t.section_id
            AND m.deleted_at IS NULL
            AND m.is_published
        LEFT JOIN public.course_materials cm
            ON cm.module_id = m.id
            AND cm.deleted_at IS NULL
        LEFT JOIN public.material_completions mc
            ON mc.material_id = cm.id
            AND mc.enrollment_id = t.enrollment_id
            AND mc.deleted_at IS NULL
        GROUP BY t.enrollment_id
    )
    SELECT
        t.enrollment_id,
        COALESCE(a.sessions_total, 0),
        COALESCE(a.present_count, 0),
        COALESCE(a.late_count, 0),
        COALESCE(a.excused_count, 0),
        COALESCE(a.absent_count, 0),
        CASE
            WHEN COALESCE(a.sessions_total, 0) = 0
                THEN NULL
            ELSE ROUND((a.sessions_total - a.absent_count)::NUMERIC / a.sessions_total * 100, 2)
        END,
        COALESCE(st.due_count, 0),
        COALESCE(st.submitted_count, 0),
        COALESCE(st.on_time_count, 0),
        COALESCE(st.late_submission_count, 0),
        COALESCE(st.missing_count, 0),
        CASE
            WHEN COALESCE(st.due_count, 0) = 0
                THEN NULL
            ELSE ROUND(st.submitted_count::NUMERIC / st.due_count * 100, 2)
        END,
        COALESCE(mt.materials_total, 0),
        COALESCE(mt.materials_completed, 0)
    FROM targets t
    LEFT JOIN attendance a ON a.enrollment_id = t.enrollment_id
    LEFT JOIN submission_totals st ON st.enrollment_id = t.enrollment_id
    LEFT JOIN materials mt ON mt.enrollment_id = t.enrollment_id;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_item_submissions(p_assessment_id uuid)
 RETURNS TABLE(submission_id uuid, score numeric, score_pct numeric, rank_asc bigint, rank_desc bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        b.submission_id,
        b.score,
        b.score_pct,
        ROW_NUMBER() OVER (ORDER BY b.score ASC),
        ROW_NUMBER() OVER (ORDER BY b.score DESC)
    FROM (
        SELECT DISTINCT ON (sub.enrollment_id)
            sub.id AS submission_id,
            COALESCE(sub.final_score, sub.raw_score) AS score,
            ROUND(COALESCE(sub.final_score, sub.raw_score) / NULLIF(ai.total_points, 0) * 100, 2) AS score_pct
        FROM public.assessment_submissions sub
        INNER JOIN public.assessment_items ai
            ON ai.id = sub.assessment_item_id
            AND ai.deleted_at IS NULL
        INNER JOIN public.enrollments e
            ON e.id = sub.enrollment_id
            AND e.deleted_at IS NULL
        WHERE sub.assessment_item_id = p_assessment_id
          AND sub.deleted_at IS NULL
          AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
          AND COALESCE(sub.final_score, sub.raw_score) IS NOT NULL
          AND e.status <> 'Dropped'
        ORDER BY sub.enrollment_id, COALESCE(sub.final_score, sub.raw_score) DESC
    ) b;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_resolve_student(p_student_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_roles TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_student_id IS NULL THEN
        SELECT s.id
        INTO v_student_id
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.deleted_at IS NULL
        LIMIT 1;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'Forbidden: no student profile is linked to your account.'
                USING ERRCODE = '42501';
        END IF;

        RETURN v_student_id;
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF v_roles && ARRAY['Admin', 'Registrar', 'Dean'] THEN
        RETURN p_student_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = p_student_id
          AND s.user_id = auth.uid()
          AND s.deleted_at IS NULL
    ) THEN
        RETURN p_student_id;
    END IF;

    IF 'Faculty' = ANY (v_roles) AND EXISTS (
        SELECT 1
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        WHERE e.student_id = p_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
          AND sec.faculty_id = auth.uid()
    ) THEN
        RETURN p_student_id;
    END IF;

    RAISE EXCEPTION 'Forbidden: you may only view insight for your own record or for students you teach.'
        USING ERRCODE = '42501';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_risk_level(p_risk_score numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
    SELECT CASE
        WHEN COALESCE(p_risk_score, 0) >= 60 THEN 'High'
        WHEN COALESCE(p_risk_score, 0) >= 30 THEN 'Moderate'
        ELSE 'Low'
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_risk_score(p_attendance_rate numeric, p_avg_score_pct numeric, p_missing_count integer, p_failing_count integer)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
AS $function$
    SELECT LEAST(
        100,
        ROUND(
            CASE
                WHEN p_attendance_rate IS NULL OR p_attendance_rate >= 75
                    THEN 0
                ELSE LEAST((75 - p_attendance_rate) * 0.8, 40)
            END
            + CASE
                WHEN p_avg_score_pct IS NULL OR p_avg_score_pct >= 75
                    THEN 0
                ELSE LEAST((75 - p_avg_score_pct) * 0.6, 40)
            END
            + LEAST(COALESCE(p_missing_count, 0) * 8, 30)
            + CASE
                WHEN COALESCE(p_failing_count, 0) > 0
                    THEN 20
                ELSE 0
            END,
            2
        )
    );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_analytics_submission_scores(p_enrollment_ids uuid[])
 RETURNS TABLE(enrollment_id uuid, assessment_item_id uuid, section_id uuid, assessment_type text, grading_component_id uuid, title text, due_at timestamp with time zone, total_points numeric, score numeric, score_pct numeric, is_late boolean, submitted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT DISTINCT ON (sub.enrollment_id, sub.assessment_item_id)
        sub.enrollment_id,
        sub.assessment_item_id,
        ai.section_id,
        ai.assessment_type::TEXT,
        ai.grading_component_id,
        ai.title,
        ai.due_at,
        ai.total_points,
        COALESCE(sub.final_score, sub.raw_score) AS score,
        ROUND(COALESCE(sub.final_score, sub.raw_score) / NULLIF(ai.total_points, 0) * 100, 2) AS score_pct,
        sub.is_late,
        sub.submitted_at
    FROM public.assessment_submissions sub
    INNER JOIN public.assessment_items ai
        ON ai.id = sub.assessment_item_id
        AND ai.deleted_at IS NULL
        AND ai.is_published
    WHERE sub.enrollment_id = ANY (p_enrollment_ids)
      AND sub.deleted_at IS NULL
      AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
      AND COALESCE(sub.final_score, sub.raw_score) IS NOT NULL
    ORDER BY
        sub.enrollment_id,
        sub.assessment_item_id,
        COALESCE(sub.final_score, sub.raw_score) DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_apply_user_roles(p_user_id uuid, p_role_codes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_codes   TEXT[];
    v_missing TEXT;
BEGIN
    SELECT COALESCE(array_agg(DISTINCT btrim(code)), ARRAY[]::TEXT[])
    INTO v_codes
    FROM unnest(COALESCE(p_role_codes, ARRAY[]::TEXT[])) AS code
    WHERE btrim(COALESCE(code, '')) <> '';

    IF array_length(v_codes, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'A user must hold at least one role.');
    END IF;

    SELECT string_agg(c.code, ', ')
    INTO v_missing
    FROM unnest(v_codes) AS c(code)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.roles r
        WHERE r.code = c.code
          AND r.deleted_at IS NULL
    );

    IF v_missing IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unknown role code: ' || v_missing);
    END IF;

    UPDATE public.user_roles ur
    SET deleted_at = now(),
        deleted_by = auth.uid(),
        revoked_at = now()
    WHERE ur.user_id = p_user_id
      AND ur.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = ur.role_id
            AND r.deleted_at IS NULL
            AND r.code = ANY (v_codes)
      );

    INSERT INTO public.user_roles (user_id, role_id, role_code, created_by)
    SELECT p_user_id, r.id, r.code, auth.uid()
    FROM public.roles r
    WHERE r.code = ANY (v_codes)
      AND r.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p_user_id
            AND ur.role_id = r.id
            AND ur.deleted_at IS NULL
            AND ur.revoked_at IS NULL
      );

    RETURN jsonb_build_object('success', true, 'roles', to_jsonb(v_codes));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grade           RECORD;
  v_approved_count  INTEGER := 0;
  v_released_count  INTEGER := 0;
  v_eval_blocked    INTEGER := 0;
BEGIN
  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            = 'Draft'
      AND sfg.enrollment_id IN (
        SELECT e.id FROM public.enrollments e
        WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
      )
  LOOP
    UPDATE public.section_final_grades
    SET
      status      = 'Approved',
      approved_by = auth.uid(),
      approved_at = now(),
      remarks     = 'Approved via fn_approve_and_release_grades'
    WHERE id = v_grade.id;

    v_approved_count := v_approved_count + 1;

    IF fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
      UPDATE public.section_final_grades
      SET status = 'Released', released_at = now()
      WHERE id = v_grade.id;

      UPDATE public.enrollments
      SET is_grade_visible = true
      WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

      v_released_count := v_released_count + 1;
    ELSE
      v_eval_blocked := v_eval_blocked + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',                true,
    'section_id',             p_section_id,
    'grading_period_id',      p_grading_period_id,
    'approved',               v_approved_count,
    'released',               v_released_count,
    'blocked_by_evaluation',  v_eval_blocked,
    'message',                'Grades approved. Release gated by evaluation completion.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_assert_active_role(p_active_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_role_codes text[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to select a role.'
            USING ERRCODE = '28000';
    END IF;

    IF p_active_role IS NULL OR btrim(p_active_role) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active role was provided.');
    END IF;

    v_role_codes := public.fn_current_user_role_codes();

    IF NOT EXISTS (
        SELECT 1
        FROM unnest(v_role_codes) AS held(code)
        WHERE lower(btrim(held.code)) = lower(btrim(p_active_role))
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not currently hold the selected role.');
    END IF;

    RETURN jsonb_build_object('success', true, 'active_role', p_active_role);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_assert_announcement_sections(p_audience announcement_audience_type, p_section_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_faculty_only BOOLEAN;
    v_taught INTEGER;
BEGIN
    v_is_faculty_only := NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']);

    IF p_audience = 'Section' THEN
        IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'Select at least one section for a section-targeted announcement.'
                USING ERRCODE = '22023';
        END IF;

        IF v_is_faculty_only THEN
            SELECT count(*) INTO v_taught
            FROM public.sections s
            WHERE s.id = ANY(p_section_ids)
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL;

            IF v_taught <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only post to sections you teach.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    ELSIF v_is_faculty_only THEN
        RAISE EXCEPTION 'Faculty may only post section-targeted announcements.'
            USING ERRCODE = '42501';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_assert_enrollment_access(p_enrollment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT e.section_id, (st.user_id = auth.uid())
    INTO v_section_id, v_is_owner
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
      AND e.deleted_at IS NULL;

    IF COALESCE(v_is_owner, false) THEN
        RETURN;
    END IF;

    IF v_section_id IS NULL OR NOT (
        public.fn_is_section_faculty(v_section_id)
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this enrollment.'
            USING ERRCODE = '42501';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_assert_role(VARIADIC p_roles text[])
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF NOT EXISTS (
        SELECT 1
        FROM unnest(v_roles) AS held(code)
        JOIN unnest(p_roles) AS required(code)
            ON lower(btrim(held.code)) = lower(btrim(required.code))
    ) THEN
        RAISE EXCEPTION 'Forbidden: this action requires one of the following roles: %.',
            array_to_string(p_roles, ', ')
            USING ERRCODE = '42501';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_assert_section_staff(p_section_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_section_id IS NULL OR NOT (
        public.fn_is_section_faculty(p_section_id)
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_audit_assessment_submissions_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.raw_score IS DISTINCT FROM NEW.raw_score THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'assessment_submissions', NEW.id, NEW.enrollment_id,
      'raw_score', OLD.raw_score::TEXT, NEW.raw_score::TEXT,
      COALESCE(NEW.feedback, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.final_score IS DISTINCT FROM NEW.final_score THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'assessment_submissions', NEW.id, NEW.enrollment_id,
      'final_score', OLD.final_score::TEXT, NEW.final_score::TEXT,
      COALESCE(NEW.feedback, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_audit_section_final_grades()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.raw_grade IS DISTINCT FROM NEW.raw_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'raw_grade', OLD.raw_grade::TEXT, NEW.raw_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.final_grade IS DISTINCT FROM NEW.final_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'final_grade', OLD.final_grade::TEXT, NEW.final_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.transmuted_grade IS DISTINCT FROM NEW.transmuted_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'transmuted_grade', OLD.transmuted_grade::TEXT, NEW.transmuted_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'status', OLD.status::TEXT, NEW.status::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_auto_complete_evaluation_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id     UUID;
  v_grading_period_id UUID;
BEGIN
  SELECT enrollment_id, grading_period_id
  INTO v_enrollment_id, v_grading_period_id
  FROM public.evaluation_responses
  WHERE id = NEW.id;

  IF fn_check_evaluation_completion(v_enrollment_id, v_grading_period_id) THEN
    UPDATE public.evaluation_period_locks
    SET
      is_completed      = true,
      completed_at      = now()
    WHERE enrollment_id     = v_enrollment_id
      AND grading_period_id = v_grading_period_id
      AND is_completed      = false
      AND deleted_at        IS NULL;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_broadcast_section_notification(p_section_id uuid, p_title text, p_message text, p_action_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment RECORD;
  v_count      INTEGER := 0;
BEGIN
  FOR v_enrollment IN
    SELECT e.student_id, st.user_id
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
      AND st.deleted_at IS NULL
  LOOP
    PERFORM fn_notify_user(v_enrollment.user_id, p_title, p_message, p_action_url);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',    true,
    'notified',   v_count,
    'section_id', p_section_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_build_pageable_dto(p_base_query text, p_page integer, p_size integer, p_sort jsonb, p_default_sort text DEFAULT 'created_at ASC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order_by    TEXT    := '';
    v_item        JSONB;
    v_dir         TEXT;
    v_full_query  TEXT;
    v_result_rec  RECORD;
    v_rows        JSONB;
    v_total       BIGINT;
    v_page_num    INT;
    v_total_pages INT;
    v_offset      INT;
    v_sorted      BOOLEAN;
BEGIN
    v_page_num := p_page - 1;
    v_offset   := v_page_num * p_size;

    IF p_sort IS NOT NULL AND jsonb_array_length(p_sort) > 0 THEN
        v_sorted := TRUE;
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_sort)
        LOOP
            IF v_order_by <> '' THEN
                v_order_by := v_order_by || ', ';
            END IF;
            v_dir      := CASE WHEN (v_item->>'isAsc')::BOOLEAN THEN 'ASC' ELSE 'DESC' END;
            v_order_by := v_order_by || quote_ident(v_item->>'sortKey') || ' ' || v_dir;
        END LOOP;
    ELSE
        v_sorted   := FALSE;
        v_order_by := p_default_sort;
    END IF;

    v_full_query := format(
        '%s ORDER BY %s LIMIT %s OFFSET %s',
        p_base_query,
        v_order_by,
        p_size::TEXT,
        v_offset::TEXT
    );

    FOR v_result_rec IN EXECUTE format(
        'SELECT COALESCE(jsonb_agg(to_jsonb(t)), %L::JSONB) AS rows, COALESCE(MAX(t.total_count), 0) AS total FROM (%s) t',
        '[]',
        v_full_query
    )
    LOOP
        v_rows  := v_result_rec.rows;
        v_total := v_result_rec.total;
    END LOOP;

    v_total_pages := CASE WHEN p_size > 0 THEN CEIL(v_total::NUMERIC / p_size)::INT ELSE 0 END;

    RETURN jsonb_build_object(
        'content',          v_rows,
        'empty',            jsonb_array_length(v_rows) = 0,
        'first',            v_page_num = 0,
        'last',             v_page_num >= v_total_pages - 1,
        'number',           v_page_num,
        'numberOfElements', jsonb_array_length(v_rows),
        'pageable',         jsonb_build_object(
            'offset',       v_offset,
            'paged',        TRUE,
            'pageNumber',   v_page_num,
            'pageSize',     p_size,
            'sort',         jsonb_build_object(
                'empty',    NOT v_sorted,
                'sorted',   v_sorted,
                'unsorted', NOT v_sorted
            ),
            'unpaged',      FALSE
        ),
        'size',             p_size,
        'sort',             jsonb_build_object(
            'empty',        NOT v_sorted,
            'sorted',       v_sorted,
            'unsorted',     NOT v_sorted
        ),
        'totalElements',    v_total,
        'totalPages',       v_total_pages
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_competencies(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_item JSONB;
    v_program_code TEXT;
    v_course_code TEXT;
    v_program_id UUID;
    v_course_id UUID;
    v_row INTEGER := 0;
    v_created INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF jsonb_typeof(p_items) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid payload: an array of competencies is required.');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_row := v_row + 1;
        v_program_id := NULL;
        v_course_id := NULL;
        v_program_code := NULLIF(btrim(v_item->>'program_code'), '');
        v_course_code := NULLIF(btrim(v_item->>'course_code'), '');

        IF v_program_code IS NOT NULL THEN
            SELECT id INTO v_program_id
            FROM public.programs
            WHERE code = v_program_code AND deleted_at IS NULL
            LIMIT 1;

            IF v_program_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', format('Row %s: program code "%s" was not found.', v_row, v_program_code));
            END IF;
        END IF;

        IF v_course_code IS NOT NULL THEN
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = v_course_code AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', format('Row %s: course code "%s" was not found.', v_row, v_course_code));
            END IF;
        END IF;

        IF v_program_id IS NULL AND v_course_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', format('Row %s: a program code or course code is required.', v_row));
        END IF;

        IF NULLIF(btrim(v_item->>'code'), '') IS NULL OR NULLIF(btrim(v_item->>'title'), '') IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', format('Row %s: code and title are required.', v_row));
        END IF;

        INSERT INTO public.competencies (program_id, course_id, code, title, description, bloom_level, sort_order)
        VALUES (
            v_program_id,
            v_course_id,
            btrim(v_item->>'code'),
            btrim(v_item->>'title'),
            NULLIF(btrim(v_item->>'description'), ''),
            NULLIF(btrim(v_item->>'bloom_level'), ''),
            COALESCE((v_item->>'sort_order')::INTEGER, 0)
        );

        v_created := v_created + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', format('Created %s competenc(ies).', v_created));

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'One or more competencies duplicate an existing code in the same scope.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_courses(p_courses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_course JSONB;
    v_course_id UUID;
    v_department_id UUID;
    v_course_type_id UUID;
    v_prereq_code TEXT;
    v_prereq_type TEXT;
    v_prereq_grade TEXT;
    v_prereq_id UUID;
    v_prereq_parts TEXT[];
    v_prereq_entry TEXT;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_course IN SELECT * FROM jsonb_array_elements(p_courses)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_course->>'code') IS NULL OR TRIM(v_course->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', '', 'message', 'Code is required'));
            CONTINUE;
        END IF;

        IF (v_course->>'title') IS NULL OR TRIM(v_course->>'title') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Title is required'));
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = v_course->>'code' AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Course code already exists: ' || (v_course->>'code')));
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE code = v_course->>'department_code' AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Department code not found: ' || COALESCE(v_course->>'department_code', 'empty')));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_type_id
        FROM public.course_types
        WHERE code = v_course->>'course_type_code' AND deleted_at IS NULL;

        IF v_course_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Course type code not found: ' || COALESCE(v_course->>'course_type_code', 'empty')));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC < 0 OR (v_course->>'lecture_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Lecture units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'laboratory_units')::NUMERIC < 0 OR (v_course->>'laboratory_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Laboratory units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC = 0 AND (v_course->>'laboratory_units')::NUMERIC = 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'At least one of lecture units or laboratory units must be greater than 0'));
            CONTINUE;
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            TRIM(v_course->>'code'),
            TRIM(v_course->>'title'),
            v_department_id,
            v_course_type_id,
            (v_course->>'lecture_units')::NUMERIC,
            (v_course->>'laboratory_units')::NUMERIC,
            CASE WHEN v_course->>'credit_hours' = '' THEN NULL
                 ELSE (v_course->>'credit_hours')::NUMERIC END,
            NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
            COALESCE((v_course->>'is_active')::BOOLEAN, TRUE),
            auth.uid()
        )
        RETURNING id INTO v_course_id;

        IF v_course->>'prerequisites' IS NOT NULL AND v_course->>'prerequisites' <> '' THEN
            FOREACH v_prereq_entry IN ARRAY string_to_array(v_course->>'prerequisites', '|')
            LOOP
                v_prereq_parts := string_to_array(v_prereq_entry, ':');
                v_prereq_code := TRIM(v_prereq_parts[1]);
                v_prereq_type := TRIM(COALESCE(v_prereq_parts[2], 'Required'));
                v_prereq_grade := TRIM(COALESCE(v_prereq_parts[3], ''));

                SELECT id INTO v_prereq_id
                FROM public.courses
                WHERE code = v_prereq_code AND deleted_at IS NULL;

                IF v_prereq_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Prerequisite course code not found: ' || v_prereq_code));
                    CONTINUE;
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type, minimum_grade, created_by
                )
                VALUES (
                    v_course_id,
                    v_prereq_id,
                    v_prereq_type::public.prerequisite_type,
                    CASE WHEN v_prereq_grade = '' THEN NULL ELSE v_prereq_grade::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' course(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_curriculum_map(p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_entry JSONB;
    v_program_id UUID;
    v_course_id UUID;
    v_term_type_id UUID;
    v_school_year_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_row_num := v_row_num + 1;

        SELECT id INTO v_program_id
        FROM public.programs
        WHERE code = v_entry->>'program_code' AND deleted_at IS NULL;

        IF v_program_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Program code not found: ' || COALESCE(v_entry->>'program_code', 'empty')
            ));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_id
        FROM public.courses
        WHERE code = v_entry->>'course_code' AND deleted_at IS NULL;

        IF v_course_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course code not found: ' || COALESCE(v_entry->>'course_code', 'empty')
            ));
            CONTINUE;
        END IF;

        SELECT id INTO v_term_type_id
        FROM public.term_types
        WHERE code = v_entry->>'term_type_code' AND deleted_at IS NULL;

        IF v_term_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Term type code not found: ' || COALESCE(v_entry->>'term_type_code', 'empty')
            ));
            CONTINUE;
        END IF;

        IF v_entry->>'school_year_code' IS NOT NULL AND v_entry->>'school_year_code' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE code = v_entry->>'school_year_code' AND deleted_at IS NULL;

            IF v_school_year_id IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num,
                    'code', v_entry->>'course_code',
                    'message', 'School year code not found: ' || (v_entry->>'school_year_code')
                ));
                CONTINUE;
            END IF;
        ELSE
            v_school_year_id := NULL;
        END IF;

        IF (v_entry->>'year_level')::SMALLINT < 1 OR (v_entry->>'year_level')::SMALLINT > 6 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Year level must be between 1 and 6'
            ));
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.curriculum_maps
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course already exists in curriculum for this program and school year'
            ));
            CONTINUE;
        END IF;

        INSERT INTO public.curriculum_maps (
            program_id, course_id, year_level, term_type_id,
            school_year_id, sequence, is_elective, created_by
        )
        VALUES (
            v_program_id,
            v_course_id,
            (v_entry->>'year_level')::SMALLINT,
            v_term_type_id,
            v_school_year_id,
            COALESCE((v_entry->>'sequence')::SMALLINT, 1),
            COALESCE((v_entry->>'is_elective')::BOOLEAN, FALSE),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' curriculum map entries created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_enrollments(p_enrollments jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row            JSONB;
    v_index          INTEGER := 0;
    v_errors         JSONB := '[]'::JSONB;
    v_provisioned    INTEGER := 0;
    v_student_id     UUID;
    v_section_id     UUID;
    v_term_id        UUID;
    v_max_slots      SMALLINT;
    v_enrolled       INTEGER;
    v_conflicts      TEXT;
    v_allow_conflict BOOLEAN;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_enrollments)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE student_number = trim(v_row->>'student_number') AND deleted_at IS NULL
            LIMIT 1;

            IF v_student_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'STUDENT_NOT_FOUND',
                    'message', 'Student not found: ' || coalesce(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT t.id INTO v_term_id
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_section_id
            FROM public.sections
            WHERE section_code = trim(v_row->>'section_code')
            AND term_id = v_term_id
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_section_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SECTION_NOT_FOUND',
                    'message', 'Section not found: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.enrollments
                WHERE student_id = v_student_id
                AND section_id = v_section_id
                AND status NOT IN ('Dropped', 'Withdrawn')
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'ALREADY_ENROLLED',
                    'message', 'Student already enrolled in section: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT max_slots INTO v_max_slots
            FROM public.sections WHERE id = v_section_id;

            SELECT COUNT(*) INTO v_enrolled
            FROM public.enrollments
            WHERE section_id = v_section_id
            AND status NOT IN ('Dropped', 'Withdrawn')
            AND deleted_at IS NULL;

            IF v_enrolled >= v_max_slots THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SECTION_FULL',
                    'message', 'Section is full: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_allow_conflict := COALESCE((v_row->>'allow_conflict')::BOOLEAN, false);
            v_conflicts := public.fn_get_schedule_conflicts(v_student_id, v_section_id);

            IF v_conflicts IS NOT NULL AND NOT v_allow_conflict THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SCHEDULE_CONFLICT',
                    'message', 'Schedule conflict with ' || v_conflicts || ' for section: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            INSERT INTO public.enrollments (
                student_id,
                section_id,
                status,
                enrolled_at,
                created_by,
                is_conflict_authorized,
                conflict_authorized_by,
                conflict_authorized_at,
                conflict_reason
            ) VALUES (
                v_student_id,
                v_section_id,
                'Enrolled'::public.enrollment_status_type,
                now(),
                auth.uid(),
                v_conflicts IS NOT NULL,
                CASE WHEN v_conflicts IS NOT NULL THEN auth.uid() END,
                CASE WHEN v_conflicts IS NOT NULL THEN now() END,
                CASE WHEN v_conflicts IS NOT NULL THEN NULLIF(trim(COALESCE(v_row->>'conflict_reason', '')), '') END
            );

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_evaluation_templates(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_provisioned INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_group RECORD;
    v_first JSONB;
    v_questions JSONB;
    v_program_ids UUID[];
    v_missing_codes TEXT[];
    v_error TEXT;
    v_template_id UUID;
    v_sequence SMALLINT;
    v_next_sequence SMALLINT;
    v_is_active BOOLEAN;
BEGIN
    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
        RETURN jsonb_build_object('provisioned_count', 0, 'errors', '[]'::JSONB);
    END IF;

    SELECT COALESCE(MAX(sequence), 0) INTO v_next_sequence
    FROM public.evaluation_templates
    WHERE deleted_at IS NULL;

    FOR v_group IN
        WITH rows AS (
            SELECT r.value AS row, r.ordinality AS rn
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        )
        SELECT
            lower(btrim(row->>'section_title')) AS group_key,
            MIN(rn) AS first_rn
        FROM rows
        WHERE btrim(COALESCE(row->>'section_title', '')) <> ''
        GROUP BY lower(btrim(row->>'section_title'))
        ORDER BY MIN(rn)
    LOOP
        BEGIN
            SELECT r.value INTO v_first
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE r.ordinality = v_group.first_rn;

            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_text', btrim(COALESCE(r.value->>'question_text', '')),
                    'question_type', btrim(COALESCE(r.value->>'question_type', '')),
                    'is_required',   COALESCE(NULLIF(btrim(COALESCE(r.value->>'is_required', '')), '')::BOOLEAN, true),
                    'min_rating',    NULLIF(btrim(COALESCE(r.value->>'min_rating', '')), ''),
                    'max_rating',    NULLIF(btrim(COALESCE(r.value->>'max_rating', '')), '')
                )
                ORDER BY r.ordinality
            )
            INTO v_questions
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE lower(btrim(r.value->>'section_title')) = v_group.group_key
            AND btrim(COALESCE(r.value->>'question_text', '')) <> '';

            v_error := public.fn_validate_evaluation_questions(v_questions);
            IF v_error IS NOT NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', v_error
                ));
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.evaluation_templates
                WHERE lower(title) = v_group.group_key AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'A section named "' || btrim(v_first->>'section_title') || '" already exists.'
                ));
                CONTINUE;
            END IF;

            v_program_ids := NULL;
            v_missing_codes := NULL;

            IF NULLIF(btrim(COALESCE(v_first->>'program_codes', '')), '') IS NOT NULL THEN
                SELECT
                    array_agg(p.id),
                    array_agg(codes.code) FILTER (WHERE p.id IS NULL)
                INTO v_program_ids, v_missing_codes
                FROM (
                    SELECT DISTINCT btrim(c) AS code
                    FROM unnest(string_to_array(v_first->>'program_codes', '|')) AS c
                    WHERE btrim(c) <> ''
                ) codes
                LEFT JOIN public.programs p
                    ON p.code = codes.code AND p.deleted_at IS NULL;

                IF v_missing_codes IS NOT NULL AND array_length(v_missing_codes, 1) > 0 THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                        'row', v_group.first_rn,
                        'code', btrim(v_first->>'section_title'),
                        'message', 'Program code(s) not found: ' || array_to_string(v_missing_codes, ', ')
                    ));
                    CONTINUE;
                END IF;
            END IF;

            v_is_active := COALESCE(NULLIF(btrim(COALESCE(v_first->>'is_active', '')), '')::BOOLEAN, true);

            IF NULLIF(btrim(COALESCE(v_first->>'section_sequence', '')), '') IS NOT NULL THEN
                v_sequence := GREATEST((v_first->>'section_sequence')::SMALLINT, 1);
            ELSE
                v_next_sequence := v_next_sequence + 1;
                v_sequence := v_next_sequence;
            END IF;

            INSERT INTO public.evaluation_templates (title, description, is_active, sequence, created_by)
            VALUES (
                btrim(v_first->>'section_title'),
                NULLIF(btrim(COALESCE(v_first->>'section_description', '')), ''),
                v_is_active,
                v_sequence,
                auth.uid()
            )
            RETURNING id INTO v_template_id;

            PERFORM public.fn_insert_evaluation_questions(v_template_id, v_questions);
            PERFORM public.fn_set_evaluation_template_programs(v_template_id, v_program_ids);

            v_provisioned := v_provisioned + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_group.first_rn,
                'code', btrim(COALESCE(v_first->>'section_title', '')),
                'message', SQLERRM
            ));
        END;
    END LOOP;

    FOR v_first IN
        SELECT r.value
        FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        WHERE btrim(COALESCE(r.value->>'section_title', '')) = ''
    LOOP
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'row', 0,
            'code', 'MISSING_TITLE',
            'message', 'Row skipped: section title is required.'
        ));
    END LOOP;

    RETURN jsonb_build_object('provisioned_count', v_provisioned, 'errors', v_errors);
END;
$function$
CREATE OR REPLACE FUNCTION public.fn_bulk_create_departments(p_departments jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_dept JSONB;
    v_code TEXT;
    v_name TEXT;
    v_description TEXT;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        PERFORM public.fn_assert_role('Admin', 'Dean');
    END IF;

    FOR v_dept IN SELECT * FROM jsonb_array_elements(p_departments)
    LOOP
        v_row_num := v_row_num + 1;
        v_code := TRIM(COALESCE(v_dept->>'code', ''));
        v_name := TRIM(COALESCE(v_dept->>'name', ''));
        v_description := NULLIF(TRIM(COALESCE(v_dept->>'description', '')), '');

        IF v_code = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', '',
                'message', 'Department code is required'
            );
            CONTINUE;
        END IF;

        IF v_name = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department name is required'
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.departments
            WHERE code = v_code
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department code already exists: ' || v_code
            );
            CONTINUE;
        END IF;

        INSERT INTO public.departments (
            code,
            name,
            description,
            created_by
        )
        VALUES (
            v_code,
            v_name,
            v_description,
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' department(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_programs(p_programs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program JSONB;
    v_department_id UUID;
    v_program_level_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_program IN SELECT * FROM jsonb_array_elements(p_programs)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_program->>'code') IS NULL OR TRIM(v_program->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Code is required'
            );
            CONTINUE;
        END IF;

        IF (v_program->>'name') IS NULL OR TRIM(v_program->>'name') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Name is required'
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.programs
            WHERE code = v_program->>'code'
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program code already exists: ' || (v_program->>'code')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE code = v_program->>'department_code'
        AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Department code not found: ' || COALESCE(v_program->>'department_code', 'empty')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_program_level_id
        FROM public.program_levels
        WHERE code = v_program->>'program_level_code'
        AND deleted_at IS NULL;

        IF v_program_level_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program level code not found: ' || COALESCE(v_program->>'program_level_code', 'empty')
            );
            CONTINUE;
        END IF;

        IF (v_program->>'years_duration') IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Years duration is required'
            );
            CONTINUE;
        END IF;

        INSERT INTO public.programs (
            code, name, department_id, program_level_id,
            years_duration, total_units, description, is_active, created_by
        )
        VALUES (
            TRIM(v_program->>'code'),
            TRIM(v_program->>'name'),
            v_department_id,
            v_program_level_id,
            (v_program->>'years_duration')::SMALLINT,
            CASE WHEN v_program->>'total_units' = '' THEN NULL
                 ELSE (v_program->>'total_units')::NUMERIC END,
            NULLIF(TRIM(COALESCE(v_program->>'description', '')), ''),
            COALESCE((v_program->>'is_active')::BOOLEAN, TRUE),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' program(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_sections(p_sections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_term_id UUID;
    v_is_active BOOLEAN;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
    v_section_id UUID;
    v_section_code TEXT;
    v_course_prefix TEXT;
    v_seq INTEGER;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            IF NOT v_is_active THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'INACTIVE_ACADEMIC_YEAR',
                    'message', 'Sections can only be imported for the active academic year.'
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = trim(v_row->>'course_code') AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'COURSE_NOT_FOUND',
                    'message', 'Course not found: ' || coalesce(v_row->>'course_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_faculty_id := NULL;
            IF (v_row->>'faculty_email') IS NOT NULL AND trim(v_row->>'faculty_email') <> '' THEN
                SELECT u.id INTO v_faculty_id
                FROM public.users u
                WHERE u.email = trim(v_row->>'faculty_email') AND u.deleted_at IS NULL
                LIMIT 1;

                IF v_faculty_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'FACULTY_NOT_FOUND',
                        'message', 'Faculty email not found: ' || (v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            v_section_code := trim(COALESCE(v_row->>'section_code', ''));
            IF v_section_code = '' THEN
                SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
                INTO v_course_prefix
                FROM public.courses WHERE id = v_course_id;

                v_seq := 1;
                v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                WHILE EXISTS (
                    SELECT 1 FROM public.sections
                    WHERE term_id = v_term_id
                    AND section_code = v_section_code
                    AND deleted_at IS NULL
                ) LOOP
                    v_seq := v_seq + 1;
                    v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                END LOOP;
            ELSIF EXISTS (
                SELECT 1 FROM public.sections
                WHERE term_id = v_term_id
                AND section_code = v_section_code
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'DUPLICATE_SECTION_CODE',
                    'message', 'Section code "' || v_section_code || '" already exists in this term.'
                );
                CONTINUE;
            END IF;

            v_max_slots := 40;
            IF (v_row->>'max_slots') IS NOT NULL AND trim(v_row->>'max_slots') <> '' THEN
                v_max_slots := (v_row->>'max_slots')::SMALLINT;
                IF v_max_slots < 1 OR v_max_slots > 999 THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'INVALID_MAX_SLOTS',
                        'message', 'Max slots must be between 1 and 999.'
                    );
                    CONTINUE;
                END IF;
            END IF;

            INSERT INTO public.sections (
                term_id,
                course_id,
                faculty_id,
                section_code,
                room,
                max_slots,
                status,
                created_by
            ) VALUES (
                v_term_id,
                v_course_id,
                v_faculty_id,
                v_section_code,
                nullif(trim(v_row->>'room'), ''),
                v_max_slots,
                'Open'::public.section_status_type,
                auth.uid()
            )
            RETURNING id INTO v_section_id;

            PERFORM public.fn_seed_section_grading(v_section_id);

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'DB_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_index,
        'provisioned', v_provisioned,
        'skipped', jsonb_array_length(v_errors),
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_students(p_students jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row          JSONB;
    v_index        INTEGER := 0;
    v_errors       JSONB := '[]'::JSONB;
    v_provisioned  INTEGER := 0;
    v_user_id      UUID;
    v_program_id   UUID;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_students)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_user_id
            FROM public.users
            WHERE email = trim(v_row->>'email') AND deleted_at IS NULL
            LIMIT 1;

            IF v_user_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'USER_NOT_FOUND',
                    'message', 'No user found with email: ' || coalesce(v_row->>'email', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.students
                WHERE user_id = v_user_id AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'PROFILE_EXISTS',
                    'message', 'Student profile already exists for: ' || coalesce(v_row->>'email', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.students
                WHERE student_number = trim(v_row->>'student_number') AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'DUPLICATE_STUDENT_NUMBER',
                    'message', 'Student number already exists: ' || coalesce(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            v_program_id := NULL;
            IF (v_row->>'program_code') IS NOT NULL AND trim(v_row->>'program_code') <> '' THEN
                SELECT id INTO v_program_id
                FROM public.programs
                WHERE code = trim(v_row->>'program_code') AND deleted_at IS NULL
                LIMIT 1;

                IF v_program_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'PROGRAM_NOT_FOUND',
                        'message', 'Program not found: ' || trim(v_row->>'program_code')
                    );
                    CONTINUE;
                END IF;
            END IF;

            INSERT INTO public.students (
                user_id,
                student_number,
                program_id,
                year_level,
                admitted_at,
                status,
                created_by
            ) VALUES (
                v_user_id,
                trim(v_row->>'student_number'),
                v_program_id,
                COALESCE(NULLIF(trim(v_row->>'year_level'), '')::SMALLINT, 1),
                NULLIF(trim(v_row->>'admitted_at'), '')::DATE,
                'Active'::public.student_status_type,
                auth.uid()
            );

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_announcements(p_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No announcements were selected.');
    END IF;

    v_is_admin := public.fn_current_user_role_codes() && ARRAY['Admin'];

    IF NOT v_is_admin AND EXISTS (
        SELECT 1 FROM public.announcements
        WHERE id = ANY(p_ids) AND deleted_at IS NULL AND created_by <> auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete announcements you posted.');
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = ANY(p_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s announcement(s).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_competencies(p_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No competencies were selected.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.assessment_question_competencies aqc
        WHERE aqc.competency_id = ANY(p_ids)
          AND aqc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'One or more selected competencies are tagged on assessment questions and cannot be deleted.');
    END IF;

    UPDATE public.competencies
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.competency_alignments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE (competency_id = ANY(p_ids) OR parent_competency_id = ANY(p_ids))
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s competenc(ies).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_courses(p_course_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected courses. Some are referenced by curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_course_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Courses deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_departments(p_department_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_blocked INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_blocked
    FROM public.programs
    WHERE department_id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    IF v_blocked > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected departments. ' || v_blocked || ' program(s) are still referencing them.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Departments deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_enrollments(p_enrollment_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.enrollments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_enrollment_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollments deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_events(p_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No events were selected.');
    END IF;

    v_is_admin := public.fn_current_user_role_codes() && ARRAY['Admin'];

    IF NOT v_is_admin AND EXISTS (
        SELECT 1 FROM public.events
        WHERE id = ANY(p_ids) AND deleted_at IS NULL AND created_by <> auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete events you created.');
    END IF;

    UPDATE public.events
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.event_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE event_id = ANY(p_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s event(s).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_programs(p_program_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT program_id FROM public.curriculum_maps
        WHERE program_id = ANY(p_program_ids) AND deleted_at IS NULL
        UNION ALL
        SELECT program_id FROM public.students
        WHERE program_id = ANY(p_program_ids) AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected programs. Some are referenced by curriculum maps or enrolled students.'
        );
    END IF;

    UPDATE public.programs
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Programs deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_school_years(p_school_year_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_count INTEGER;
    v_term_ref_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT COUNT(*) INTO v_active_count
    FROM public.school_years
    WHERE id = ANY(p_school_year_ids)
    AND is_active = TRUE
    AND deleted_at IS NULL;

    IF v_active_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete active school year(s). Please deactivate them first.'
        );
    END IF;

    SELECT COUNT(*) INTO v_term_ref_count
    FROM public.terms
    WHERE school_year_id = ANY(p_school_year_ids)
    AND deleted_at IS NULL;

    IF v_term_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected school year(s). ' || v_term_ref_count || ' term(s) are referencing them.'
        );
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_school_year_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Selected school year(s) deleted successfully.'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_sections(p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_section_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Sections deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_students(p_student_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.students
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_student_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Students deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_users(p_user_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    UPDATE public.users
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id = ANY(p_user_ids)
    AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    UPDATE public.user_roles
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE user_id = ANY(p_user_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_deleted_count || ' user(s) deleted successfully',
        'deleted_count', v_deleted_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_student(p_student_id uuid, p_section_ids uuid[], p_allow_conflict boolean DEFAULT false, p_conflict_reason text DEFAULT NULL::text, p_override_prerequisites boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_outcome    JSONB;
    v_enrolled   INTEGER := 0;
    v_errors     JSONB := '[]'::JSONB;
    v_total      INTEGER := COALESCE(array_length(p_section_ids, 1), 0);
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_total = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Select at least one section to enroll.',
            'enrolled_count', 0,
            'errors', v_errors
        );
    END IF;

    FOREACH v_section_id IN ARRAY p_section_ids
    LOOP
        BEGIN
            v_outcome := public.fn_enroll_student_section(
                p_student_id,
                v_section_id,
                p_allow_conflict,
                p_conflict_reason,
                p_override_prerequisites
            );

            IF (v_outcome->>'success')::BOOLEAN THEN
                v_enrolled := v_enrolled + 1;
            ELSE
                v_errors := v_errors || jsonb_build_object(
                    'section_id', v_section_id,
                    'code', v_outcome->>'code',
                    'message', v_outcome->>'message'
                );
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'section_id', v_section_id,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    IF v_enrolled = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No sections were enrolled. ' || (v_errors->0->>'message'),
            'enrolled_count', 0,
            'errors', v_errors
        );
    END IF;

    IF jsonb_array_length(v_errors) > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', v_enrolled || ' of ' || v_total || ' sections enrolled. ' ||
                jsonb_array_length(v_errors) || ' were skipped.',
            'enrolled_count', v_enrolled,
            'errors', v_errors
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student enrolled in ' || v_enrolled || ' section(s).',
        'enrolled_count', v_enrolled,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_students(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row        JSONB;
    v_index      INTEGER := 0;
    v_errors     JSONB := '[]'::JSONB;
    v_enrolled   INTEGER := 0;
    v_student_id UUID;
    v_term_id    UUID;
    v_section_id UUID;
    v_code       TEXT;
    v_codes      TEXT[];
    v_outcome    JSONB;
    v_allow      BOOLEAN;
    v_override   BOOLEAN;
    v_reason     TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE student_number = trim(v_row->>'student_number')
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_student_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'STUDENT_NOT_FOUND',
                    'message', 'Student not found: ' || COALESCE(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            IF COALESCE(trim(v_row->>'term_label'), '') = '' THEN
                v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
            ELSE
                SELECT t.id INTO v_term_id
                FROM public.terms t
                INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
                AND t.deleted_at IS NULL
                LIMIT 1;
            END IF;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || COALESCE(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT array_agg(trimmed)
            INTO v_codes
            FROM (
                SELECT trim(raw) AS trimmed
                FROM unnest(string_to_array(COALESCE(v_row->>'section_codes', ''), '|')) AS raw
                WHERE trim(raw) <> ''
            ) parsed;

            IF v_codes IS NULL OR array_length(v_codes, 1) = 0 THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'NO_SECTIONS',
                    'message', 'No section codes provided for ' || COALESCE(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            v_allow    := lower(COALESCE(trim(v_row->>'allow_conflict'), '')) IN ('true', 't', 'yes', '1');
            v_override := lower(COALESCE(trim(v_row->>'override_prerequisites'), '')) IN ('true', 't', 'yes', '1');
            v_reason   := NULLIF(trim(COALESCE(v_row->>'conflict_reason', '')), '');

            FOREACH v_code IN ARRAY v_codes
            LOOP
                SELECT id INTO v_section_id
                FROM public.sections
                WHERE section_code = v_code
                AND term_id = v_term_id
                AND deleted_at IS NULL
                LIMIT 1;

                IF v_section_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'SECTION_NOT_FOUND',
                        'message', 'Section not found in term: ' || v_code
                    );
                    CONTINUE;
                END IF;

                v_outcome := public.fn_enroll_student_section(
                    v_student_id,
                    v_section_id,
                    v_allow,
                    v_reason,
                    v_override
                );

                IF (v_outcome->>'success')::BOOLEAN THEN
                    v_enrolled := v_enrolled + 1;
                ELSE
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', v_outcome->>'code',
                        'message', (v_row->>'student_number') || ': ' || (v_outcome->>'message')
                    );
                END IF;
            END LOOP;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_enrolled,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_import_questions(p_assessment_id uuid, p_questions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id      UUID;
    v_row             JSONB;
    v_row_num         INTEGER := 0;
    v_success_count   INTEGER := 0;
    v_errors          JSONB := '[]'::JSONB;
    v_sequence        SMALLINT;
    v_text            TEXT;
    v_type            TEXT;
    v_points          NUMERIC(6,2);
    v_is_required     BOOLEAN;
    v_explanation     TEXT;
    v_choice_raw      TEXT;
    v_choices         TEXT[];
    v_choice          TEXT;
    v_choice_text     TEXT;
    v_is_correct      BOOLEAN;
    v_choice_seq      SMALLINT;
    v_correct_count   SMALLINT;
    v_question_id     UUID;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT section_id INTO v_section_id
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.', 'provisioned_count', 0, 'errors', '[]'::jsonb);
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can import questions.'
            USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(max(sequence), 0) INTO v_sequence
    FROM public.assessment_questions
    WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL;

    FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(p_questions, '[]'::jsonb))
    LOOP
        v_row_num := v_row_num + 1;
        v_text := btrim(COALESCE(v_row->>'question_text', ''));
        v_type := btrim(COALESCE(v_row->>'question_type', ''));

        IF v_text = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', '', 'message', 'Question text is required'));
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM unnest(enum_range(NULL::public.question_type)) AS t(label)
            WHERE t.label::text = v_type
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', left(v_text, 40),
                'message', 'Invalid question type: ' || COALESCE(NULLIF(v_type, ''), '(blank)')));
            CONTINUE;
        END IF;

        BEGIN
            v_points := COALESCE(NULLIF(btrim(COALESCE(v_row->>'points', '')), '')::numeric, 1);
        EXCEPTION WHEN OTHERS THEN
            v_points := NULL;
        END;

        IF v_points IS NULL OR v_points <= 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', left(v_text, 40), 'message', 'Points must be a number greater than 0'));
            CONTINUE;
        END IF;

        v_is_required := upper(btrim(COALESCE(v_row->>'is_required', 'TRUE'))) NOT IN ('FALSE', 'NO', '0', 'N');
        v_explanation := NULLIF(btrim(COALESCE(v_row->>'explanation', '')), '');
        v_choice_raw := btrim(COALESCE(v_row->>'choices', ''));
        v_choices := NULL;
        v_correct_count := 0;

        IF v_type IN ('Multiple Choice', 'True or False', 'Matching') THEN
            IF v_choice_raw = '' THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num, 'code', left(v_text, 40),
                    'message', 'Choices are required for ' || v_type || ' (separate with | and mark the correct one with *)'));
                CONTINUE;
            END IF;

            v_choices := string_to_array(v_choice_raw, '|');

            FOREACH v_choice IN ARRAY v_choices
            LOOP
                IF btrim(v_choice) LIKE '*%' OR btrim(v_choice) LIKE '%*' THEN
                    v_correct_count := v_correct_count + 1;
                END IF;
            END LOOP;

            IF v_correct_count = 0 THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num, 'code', left(v_text, 40),
                    'message', 'Mark the correct choice with * (e.g. Paris*|London|Rome)'));
                CONTINUE;
            END IF;
        END IF;

        v_sequence := v_sequence + 1;

        BEGIN
            INSERT INTO public.assessment_questions (
                assessment_item_id, question_text, question_type, points, sequence, explanation, is_required
            )
            VALUES (
                p_assessment_id, v_text, v_type::public.question_type, v_points, v_sequence, v_explanation, v_is_required
            )
            RETURNING id INTO v_question_id;

            IF v_choices IS NOT NULL THEN
                v_choice_seq := 0;

                FOREACH v_choice IN ARRAY v_choices
                LOOP
                    v_choice_text := btrim(v_choice);
                    v_is_correct := v_choice_text LIKE '*%' OR v_choice_text LIKE '%*';
                    v_choice_text := btrim(btrim(v_choice_text, '*'));

                    IF v_choice_text = '' THEN
                        CONTINUE;
                    END IF;

                    v_choice_seq := v_choice_seq + 1;

                    INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence)
                    VALUES (v_question_id, v_choice_text, v_is_correct, v_choice_seq);
                END LOOP;
            END IF;

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', left(v_text, 40), 'message', SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_bulk_provision_users(p_users jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_entry          JSONB;
    v_provisioned    INTEGER := 0;
    v_errors         TEXT[]  := ARRAY[]::TEXT[];
    v_failed_ids     UUID[]  := ARRAY[]::UUID[];
    v_result         JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_users)
    LOOP
        v_result := public.fn_provision_single_user(
            (v_entry->>'auth_id')::UUID,
            v_entry->>'email',
            v_entry->>'first_name',
            v_entry->>'last_name',
            v_entry->>'role_code'
        );

        IF (v_result->>'success')::BOOLEAN THEN
            v_provisioned := v_provisioned + 1;
        ELSE
            v_errors := array_append(v_errors, v_entry->>'email' || ': ' || (v_result->>'message'));
            v_failed_ids := array_append(v_failed_ids, (v_entry->>'auth_id')::UUID);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',           array_length(v_errors, 1) IS NULL,
        'provisioned_count', v_provisioned,
        'errors',            to_jsonb(v_errors),
        'failed_auth_ids',   to_jsonb(v_failed_ids)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_calculate_all_grades_for_period(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment      RECORD;
  v_result          JSONB;
  v_success_count   INTEGER := 0;
  v_failure_count   INTEGER := 0;
  v_failures        JSONB   := '[]'::jsonb;
  v_processed       INTEGER := 0;
  v_message         TEXT;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

  FOR v_enrollment IN
    SELECT e.id,
           st.student_number,
           u.first_name || ' ' || u.last_name AS full_name
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
    ORDER BY u.last_name ASC, u.first_name ASC
  LOOP
    v_result := fn_calculate_final_grade(v_enrollment.id, p_grading_period_id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failure_count := v_failure_count + 1;
      v_failures := v_failures || jsonb_build_object(
        'enrollment_id',  v_enrollment.id,
        'student_number', v_enrollment.student_number,
        'full_name',      v_enrollment.full_name,
        'reason',         v_result->>'message'
      );
    END IF;
  END LOOP;

  v_processed := v_success_count + v_failure_count;

  IF v_processed = 0 THEN
    v_message := 'No enrolled students in this section to calculate.';
  ELSIF v_failure_count = 0 THEN
    v_message := 'Calculated grades for ' || v_success_count || ' student(s).';
  ELSIF v_success_count = 0 THEN
    v_message := 'No grades could be calculated. All ' || v_failure_count || ' student(s) failed.';
  ELSE
    v_message := 'Calculated ' || v_success_count || ' of ' || v_processed
              || ' student(s). ' || v_failure_count || ' could not be computed.';
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'message',       v_message,
    'section_id',    p_section_id,
    'period_id',     p_grading_period_id,
    'processed',     v_processed,
    'succeeded',     v_success_count,
    'failed',        v_failure_count,
    'failures',      v_failures
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_calculate_final_grade(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_section_id          UUID;
  v_component           RECORD;
  v_component_score     NUMERIC(8,2);
  v_component_max       NUMERIC(8,2);
  v_component_weighted  NUMERIC(8,2);
  v_total_weight        NUMERIC(8,2) := 0;
  v_total_weighted      NUMERIC(8,2) := 0;
  v_raw_grade           NUMERIC(5,2);
  v_transmuted_grade    NUMERIC(5,2);
  v_existing_grade_id   UUID;
  v_program_id          UUID;
BEGIN
  SELECT s.id INTO v_section_id
  FROM public.enrollments e
  INNER JOIN public.sections s ON s.id = e.section_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  IF v_section_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
  END IF;

  FOR v_component IN
    SELECT gc.id, gc.name, gc.weight
    FROM public.grading_components gc
    WHERE gc.section_id        = v_section_id
      AND gc.grading_period_id = p_grading_period_id
      AND gc.deleted_at        IS NULL
  LOOP
    SELECT
      COALESCE(SUM(asub.final_score), 0),
      COALESCE(SUM(ai.total_points),  0)
    INTO v_component_score, v_component_max
    FROM public.assessment_items ai
    INNER JOIN public.assessment_submissions asub
      ON asub.assessment_item_id = ai.id
      AND asub.enrollment_id     = p_enrollment_id
      AND asub.deleted_at        IS NULL
      AND asub.status            = 'Graded'
    WHERE ai.grading_component_id = v_component.id
      AND ai.deleted_at           IS NULL;

    IF v_component_max > 0 THEN
      v_component_weighted := (v_component_score / v_component_max) * v_component.weight;
    ELSE
      v_component_weighted := 0;
    END IF;

    v_total_weight   := v_total_weight   + v_component.weight;
    v_total_weighted := v_total_weighted + v_component_weighted;
  END LOOP;

  IF v_total_weight = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No grading components found for this period.');
  END IF;

  v_raw_grade := ROUND((v_total_weighted / v_total_weight) * 100, 2);

  SELECT st.program_id INTO v_program_id
  FROM public.enrollments e
  INNER JOIN public.students st ON st.id = e.student_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND v_raw_grade    >= gtt.min_percentage
    AND gtt.deleted_at IS NULL
  ORDER BY (gtt.program_id IS NOT NULL) DESC, gtt.min_percentage DESC
  LIMIT 1;

  SELECT id INTO v_existing_grade_id
  FROM public.section_final_grades
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL;

  IF v_existing_grade_id IS NOT NULL THEN
    UPDATE public.section_final_grades
    SET
      raw_grade        = v_raw_grade,
      final_grade      = v_raw_grade,
      transmuted_grade = v_transmuted_grade,
      status           = 'Draft',
      remarks          = 'Auto-calculated via fn_calculate_final_grade'
    WHERE id = v_existing_grade_id;
  ELSE
    INSERT INTO public.section_final_grades (
      enrollment_id,
      grading_period_id,
      raw_grade,
      final_grade,
      transmuted_grade,
      status,
      remarks
    ) VALUES (
      p_enrollment_id,
      p_grading_period_id,
      v_raw_grade,
      v_raw_grade,
      v_transmuted_grade,
      'Draft',
      'Auto-calculated via fn_calculate_final_grade'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'enrollment_id',    p_enrollment_id,
    'grading_period_id', p_grading_period_id,
    'raw_grade',        v_raw_grade,
    'transmuted_grade', v_transmuted_grade,
    'total_weight_used', v_total_weight,
    'message',          'Grade calculated and saved successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_can_access_section(p_section_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id
          AND s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
    )
    OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
    );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_can_access_section_staff(p_section_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        p_section_id IS NOT NULL
        AND auth.uid() IS NOT NULL
        AND (
            public.fn_is_section_faculty(p_section_id)
            OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
        );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_change_student_status(p_student_id uuid, p_status student_status_type, p_reason text DEFAULT NULL::text, p_effective_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_current public.student_status_type;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.status
    INTO v_current
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.deleted_at IS NULL;

    IF v_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF v_current = p_status THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The student already holds this status.'
        );
    END IF;

    UPDATE public.students
    SET status = p_status
    WHERE id = p_student_id;

    INSERT INTO public.student_lifecycle_events (
        student_id,
        event_type,
        from_status,
        to_status,
        reason,
        effective_date
    ) VALUES (
        p_student_id,
        'Status Change',
        v_current,
        p_status,
        NULLIF(btrim(COALESCE(p_reason, '')), ''),
        COALESCE(p_effective_date, CURRENT_DATE)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student status updated to ' || p_status || '.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_check_evaluation_completion(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_completed BOOLEAN;
    v_template_ids UUID[];
    v_required_count INTEGER;
    v_answered_count INTEGER;
BEGIN
    SELECT is_completed, COALESCE(template_ids, ARRAY[template_id])
    INTO v_is_completed, v_template_ids
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF v_is_completed IS NULL THEN
        RETURN false;
    END IF;

    IF v_is_completed THEN
        RETURN true;
    END IF;

    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
        RETURN false;
    END IF;

    SELECT COUNT(*) INTO v_required_count
    FROM public.evaluation_questions
    WHERE template_id = ANY(v_template_ids)
    AND is_required = true
    AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT r.question_id) INTO v_answered_count
    FROM public.evaluation_responses r
    INNER JOIN public.evaluation_questions q
        ON q.id = r.question_id
        AND q.template_id = ANY(v_template_ids)
        AND q.is_required = true
        AND q.deleted_at IS NULL
    WHERE r.enrollment_id = p_enrollment_id
    AND r.grading_period_id = p_grading_period_id
    AND r.deleted_at IS NULL;

    RETURN v_answered_count >= v_required_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_compute_student_gwa(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_units   NUMERIC(8,2) := 0;
  v_weighted_sum  NUMERIC(8,2) := 0;
  v_gwa           NUMERIC(5,2);
  v_course        RECORD;
BEGIN
  FOR v_course IN
    SELECT
      sfg.final_grade,
      sfg.transmuted_grade,
      c.total_units
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e    ON e.id  = sfg.enrollment_id
    INNER JOIN public.sections sec     ON sec.id = e.section_id
    INNER JOIN public.courses c        ON c.id   = sec.course_id
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id
    WHERE e.student_id    = p_student_id
      AND sec.term_id     = p_term_id
      AND sfg.status      = 'Released'
      AND e.deleted_at    IS NULL
      AND sfg.deleted_at  IS NULL
      AND c.deleted_at    IS NULL
  LOOP
    v_total_units  := v_total_units  + v_course.total_units;
    v_weighted_sum := v_weighted_sum + (
      COALESCE(v_course.transmuted_grade, v_course.final_grade) * v_course.total_units
    );
  END LOOP;

  IF v_total_units = 0 THEN
    RETURN jsonb_build_object(
      'success',    false,
      'student_id', p_student_id,
      'term_id',    p_term_id,
      'message',    'No released grades found for this term.'
    );
  END IF;

  v_gwa := ROUND(v_weighted_sum / v_total_units, 4);

  RETURN jsonb_build_object(
    'success',      true,
    'student_id',   p_student_id,
    'term_id',      p_term_id,
    'gwa',          v_gwa,
    'total_units',  v_total_units
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_copy_rubric_to_sections(p_rubric_id uuid, p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_source_section UUID;
    v_target         UUID;
    v_new_rubric_id  UUID;
    v_copied         INTEGER := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_source_section := public.fn_resolve_rubric_section(p_rubric_id);

    IF v_source_section IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Source rubric not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_source_section) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target IN ARRAY p_section_ids
    LOOP
        IF v_target = v_source_section THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach every target section.'
                USING ERRCODE = '42501';
        END IF;

        INSERT INTO public.rubrics (section_id, title, description, total_points, is_active)
        SELECT v_target, r.title, r.description, r.total_points, r.is_active
        FROM public.rubrics r
        WHERE r.id = p_rubric_id AND r.deleted_at IS NULL
        RETURNING id INTO v_new_rubric_id;

        INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
        SELECT v_new_rubric_id, rc.title, rc.description, rc.max_points, rc.sequence
        FROM public.rubric_criteria rc
        WHERE rc.rubric_id = p_rubric_id AND rc.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rubric copied to ' || v_copied || ' section(s).',
        'copied_count', v_copied
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_copy_section_setup_to_sections(p_source_section_id uuid, p_target_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_source_term_id UUID;
    v_source_code    TEXT;
    v_target_id      UUID;
    v_target_term_id UUID;
    v_target_code    TEXT;
    v_period         RECORD;
    v_target_period  UUID;
    v_component      RECORD;
    v_copied         INTEGER := 0;
    v_periods_copied INTEGER;
    v_skipped        JSONB := '[]'::JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_target_section_ids IS NULL OR array_length(p_target_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    SELECT s.term_id, s.section_code
    INTO v_source_term_id, v_source_code
    FROM public.sections s
    WHERE s.id = p_source_section_id
      AND s.deleted_at IS NULL;

    IF v_source_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Source section not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.grading_components gc
        WHERE gc.section_id = p_source_section_id
          AND gc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'The source section has no grading components to copy.');
    END IF;

    FOREACH v_target_id IN ARRAY p_target_section_ids
    LOOP
        CONTINUE WHEN v_target_id = p_source_section_id;

        SELECT s.term_id, s.section_code
        INTO v_target_term_id, v_target_code
        FROM public.sections s
        WHERE s.id = v_target_id
          AND s.deleted_at IS NULL;

        IF v_target_term_id IS NULL THEN
            v_skipped := v_skipped || jsonb_build_object(
                'section_code', '(unknown)',
                'reason', 'Target section not found.'
            );
            CONTINUE;
        END IF;

        PERFORM public.fn_seed_term_grading_periods(v_target_term_id);

        v_periods_copied := 0;

        FOR v_period IN
            SELECT gp.id AS period_id, gp.sequence AS seq, gp.name AS period_name
            FROM public.grading_periods gp
            WHERE gp.term_id = v_source_term_id
              AND gp.deleted_at IS NULL
              AND EXISTS (
                  SELECT 1
                  FROM public.grading_components gc
                  WHERE gc.section_id = p_source_section_id
                    AND gc.grading_period_id = gp.id
                    AND gc.deleted_at IS NULL
              )
            ORDER BY gp.sequence
        LOOP
            SELECT tp.id
            INTO v_target_period
            FROM public.grading_periods tp
            WHERE tp.term_id = v_target_term_id
              AND tp.deleted_at IS NULL
              AND tp.sequence = v_period.seq
            LIMIT 1;

            IF v_target_period IS NULL THEN
                v_skipped := v_skipped || jsonb_build_object(
                    'section_code', v_target_code,
                    'reason', format('No matching grading period for %s.', v_period.period_name)
                );
                CONTINUE;
            END IF;

            IF public.fn_is_section_grading_locked(v_target_id, v_target_period) THEN
                v_skipped := v_skipped || jsonb_build_object(
                    'section_code', v_target_code,
                    'reason', format('%s is locked because grades have already been recorded.', v_period.period_name)
                );
                CONTINUE;
            END IF;

            UPDATE public.grading_components
            SET deleted_at = now(),
                deleted_by = auth.uid()
            WHERE section_id = v_target_id
              AND grading_period_id = v_target_period
              AND deleted_at IS NULL;

            FOR v_component IN
                SELECT gc.name, gc.weight
                FROM public.grading_components gc
                WHERE gc.section_id = p_source_section_id
                  AND gc.grading_period_id = v_period.period_id
                  AND gc.deleted_at IS NULL
                ORDER BY gc.name
            LOOP
                INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
                VALUES (v_target_id, v_target_period, v_component.name, v_component.weight, auth.uid());
            END LOOP;

            INSERT INTO public.grade_audit_logs (
                action, table_name, record_id, enrollment_id, grading_period_id,
                field_changed, old_value, new_value, change_reason, changed_by, ip_address
            ) VALUES (
                'Update', 'grading_components', v_target_id, NULL, v_target_period,
                'components', NULL, format('Copied from section %s', v_source_code),
                'Section setup rollover', auth.uid(), inet_client_addr()
            );

            v_periods_copied := v_periods_copied + 1;
        END LOOP;

        IF v_periods_copied > 0 THEN
            v_copied := v_copied + 1;
        END IF;
    END LOOP;

    IF v_copied = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nothing was copied. Every target section is locked by recorded grades or has no matching grading period.',
            'copied_sections', 0,
            'skipped', v_skipped
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Grading setup from %s copied into %s section(s).', v_source_code, v_copied),
        'copied_sections', v_copied,
        'skipped', v_skipped
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_announcement(p_title text, p_content text, p_audience announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[], p_is_pinned boolean DEFAULT false, p_published_at timestamp with time zone DEFAULT now(), p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_section_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement title is required.');
    END IF;

    IF p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement content is required.');
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    INSERT INTO public.announcements (title, content, target_audience, section_id, is_pinned, published_at, expires_at)
    VALUES (
        btrim(p_title),
        btrim(p_content),
        p_audience,
        CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        COALESCE(p_is_pinned, false),
        p_published_at,
        p_expires_at
    )
    RETURNING id INTO v_id;

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.announcement_sections (announcement_id, section_id)
            VALUES (v_id, v_section_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    IF p_published_at IS NULL OR p_published_at <= now() THEN
        PERFORM public.fn_emit_announcement_notifications(v_id, p_audience, p_section_ids, btrim(p_title));
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement posted.', 'id', v_id);

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_assessment(p_section_id uuid, p_title text, p_description text, p_assessment_type assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint, p_allow_student_review boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_opens_at >= p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before due date.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_opens_at >= p_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before closing date.');
    END IF;

    IF p_due_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_closes_at < p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be on or after due date.');
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND p_opens_at IS NOT NULL AND p_scheduled_publish_at > p_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scheduled publish date must be on or before the opens date.');
    END IF;

    IF NOT COALESCE(p_show_all_questions, true) AND (p_questions_per_page IS NULL OR p_questions_per_page < 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Questions per page must be at least 1 when not showing all questions.');
    END IF;

    INSERT INTO public.assessment_items (
        section_id, grading_component_id, title, description, assessment_type,
        total_points, passing_points, time_limit_minutes, max_attempts,
        opens_at, due_at, closes_at, show_results_at, scheduled_publish_at,
        shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
        allow_student_review, is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, p_title, NULLIF(p_description, ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, p_scheduled_publish_at,
        COALESCE(p_shuffle_questions, false), COALESCE(p_shuffle_choices, false),
        COALESCE(p_show_all_questions, true),
        CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
        COALESCE(p_allow_student_review, true),
        false, auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment created successfully.', 'id', v_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_assessment_attachment(p_assessment_id uuid, p_file_name text, p_file_url text, p_file_size_bytes bigint, p_mime_type text, p_sequence smallint DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    INSERT INTO public.assessment_attachments (
        assessment_item_id, file_name, file_url,
        file_size_bytes, mime_type, sequence, created_by
    ) VALUES (
        p_assessment_id, p_file_name, p_file_url,
        p_file_size_bytes, p_mime_type, p_sequence, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Attachment added successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_attendance_session(p_section_id uuid, p_session_date date, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session_id UUID;
BEGIN
    IF NOT public.fn_can_access_section_staff(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the assigned faculty can record attendance for this section.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.attendance_sessions
        WHERE section_id = p_section_id
        AND session_date = p_session_date
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An attendance session already exists for this date.');
    END IF;

    INSERT INTO public.attendance_sessions (
        section_id,
        session_date,
        notes,
        created_by
    ) VALUES (
        p_section_id,
        p_session_date,
        p_notes,
        auth.uid()
    )
    RETURNING id INTO v_session_id;

    INSERT INTO public.attendance_records (
        attendance_session_id,
        enrollment_id,
        status,
        recorded_by,
        created_by
    )
    SELECT
        v_session_id,
        e.id,
        'Present'::public.attendance_status_type,
        auth.uid(),
        auth.uid()
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
    AND e.status NOT IN ('Dropped', 'Withdrawn')
    AND e.deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance session created successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_competency(p_program_id uuid, p_course_id uuid, p_code text, p_title text, p_description text DEFAULT NULL::text, p_bloom_level text DEFAULT NULL::text, p_sort_order integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF p_program_id IS NULL AND p_course_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'A competency must be tied to a program or a course.');
    END IF;

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency code is required.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency title is required.');
    END IF;

    INSERT INTO public.competencies (program_id, course_id, code, title, description, bloom_level, sort_order)
    VALUES (p_program_id, p_course_id, btrim(p_code), btrim(p_title), NULLIF(btrim(p_description), ''), NULLIF(btrim(p_bloom_level), ''), COALESCE(p_sort_order, 0))
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Competency created.', 'id', v_id);

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'A competency with this code already exists in the same scope.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_course(p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_is_split boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_lec_id UUID;
    v_lab_id UUID;
    v_course_id UUID;
    v_prereq JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.course_types
        WHERE id = p_course_type_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    IF p_is_split THEN
        IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Lecture units must be between 0 and 10');
        END IF;

        IF p_laboratory_units IS NULL OR p_laboratory_units < 0 OR p_laboratory_units > 10 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Laboratory units must be between 0 and 10');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code || '_LEC' AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code || '_LEC');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code || '_LAB' AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code || '_LAB');
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            p_code || '_LEC', p_title || ' (Lecture)',
            p_department_id, p_course_type_id,
            p_lecture_units, 0, p_credit_hours,
            NULLIF(p_description, ''), p_is_active, auth.uid()
        )
        RETURNING id INTO v_lec_id;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            p_code || '_LAB', p_title || ' (Laboratory)',
            p_department_id, p_course_type_id,
            0, p_laboratory_units, p_credit_hours,
            NULLIF(p_description, ''), p_is_active, auth.uid()
        )
        RETURNING id INTO v_lab_id;

        IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
            FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
            LOOP
                IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                    IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                    IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_type') = 'Co-requisite' AND
                   (v_prereq->>'minimum_grade') IS NOT NULL AND
                   (v_prereq->>'minimum_grade') <> '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Co-requisite courses cannot have a minimum grade requirement');
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_lec_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_lab_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Split course created successfully (LEC and LAB)');

    ELSE
        IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Units must be between 0 and 10');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code);
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            p_code, p_title, p_department_id, p_course_type_id,
            p_lecture_units, 0, p_credit_hours,
            NULLIF(p_description, ''), p_is_active, auth.uid()
        )
        RETURNING id INTO v_course_id;

        IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
            FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
            LOOP
                IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                    IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                    END IF;
                    IF (v_prereq->>'course_id')::UUID = v_course_id THEN
                        RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                    IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_type') = 'Co-requisite' AND
                   (v_prereq->>'minimum_grade') IS NOT NULL AND
                   (v_prereq->>'minimum_grade') <> '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Co-requisite courses cannot have a minimum grade requirement');
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_course_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Course created successfully');
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_course_type(p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type code already exists: ' || p_code);
    END IF;

    INSERT INTO public.course_types (code, label, description, created_by)
    VALUES (p_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Course type created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(p_program_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective, created_by
    )
    VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_department(p_code text, p_name text, p_description text DEFAULT NULL::text, p_head_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    IF p_head_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_head_user_id
            AND r.code IN ('Faculty', 'Dean')
            AND ur.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Department head must have a Faculty or Dean role');
        END IF;
    END IF;

    INSERT INTO public.departments (code, name, description, head_user_id, created_by)
    VALUES (p_code, p_name, NULLIF(p_description, ''), p_head_user_id, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Department created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_enrollment(p_student_id uuid, p_section_id uuid, p_allow_conflict boolean DEFAULT false, p_conflict_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_max_slots   SMALLINT;
    v_enrolled    INTEGER;
    v_conflicts   TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND status NOT IN ('Dropped', 'Withdrawn')
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is already enrolled in this section.');
    END IF;

    SELECT max_slots INTO v_max_slots
    FROM public.sections
    WHERE id = p_section_id AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_enrolled
    FROM public.enrollments
    WHERE section_id = p_section_id
    AND status NOT IN ('Dropped', 'Withdrawn')
    AND deleted_at IS NULL;

    IF v_enrolled >= v_max_slots THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section is already full.');
    END IF;

    v_conflicts := public.fn_get_schedule_conflicts(p_student_id, p_section_id);

    IF v_conflicts IS NOT NULL AND NOT p_allow_conflict THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Schedule conflict with ' || v_conflicts || '. Authorize the conflict to enroll anyway.'
        );
    END IF;

    INSERT INTO public.enrollments (
        student_id,
        section_id,
        status,
        enrolled_at,
        created_by,
        is_conflict_authorized,
        conflict_authorized_by,
        conflict_authorized_at,
        conflict_reason
    ) VALUES (
        p_student_id,
        p_section_id,
        'Enrolled'::public.enrollment_status_type,
        now(),
        auth.uid(),
        v_conflicts IS NOT NULL,
        CASE WHEN v_conflicts IS NOT NULL THEN auth.uid() END,
        CASE WHEN v_conflicts IS NOT NULL THEN now() END,
        CASE WHEN v_conflicts IS NOT NULL THEN NULLIF(trim(COALESCE(p_conflict_reason, '')), '') END
    );

    IF v_conflicts IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Student enrolled with an authorized schedule conflict against ' || v_conflicts || '.'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Student enrolled successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_evaluation_template(p_title text, p_description text, p_is_active boolean, p_sequence smallint, p_program_ids uuid[], p_questions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_error TEXT;
    v_template_id UUID;
BEGIN
    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    v_error := public.fn_validate_evaluation_programs(p_program_ids);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    INSERT INTO public.evaluation_templates (title, description, is_active, sequence, created_by)
    VALUES (
        btrim(p_title),
        NULLIF(btrim(COALESCE(p_description, '')), ''),
        COALESCE(p_is_active, true),
        GREATEST(COALESCE(p_sequence, 1), 1),
        auth.uid()
    )
    RETURNING id INTO v_template_id;

    PERFORM public.fn_insert_evaluation_questions(v_template_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(v_template_id, p_program_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section created successfully.', 'id', v_template_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_event(p_title text, p_start_at timestamp with time zone, p_audience announcement_audience_type, p_end_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_all_day boolean DEFAULT false, p_location text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_section_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_section_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event title is required.');
    END IF;

    IF p_start_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event start date is required.');
    END IF;

    IF p_end_at IS NOT NULL AND p_end_at < p_start_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date cannot be before the start date.');
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    INSERT INTO public.events (title, description, location, target_audience, section_id, start_at, end_at, all_day)
    VALUES (
        btrim(p_title),
        NULLIF(btrim(p_description), ''),
        NULLIF(btrim(p_location), ''),
        p_audience,
        CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        p_start_at,
        p_end_at,
        COALESCE(p_all_day, false)
    )
    RETURNING id INTO v_id;

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.event_sections (event_id, section_id)
            VALUES (v_id, v_section_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    PERFORM public.fn_emit_event_notifications(v_id, p_audience, p_section_ids, btrim(p_title));

    RETURN jsonb_build_object('success', true, 'message', 'Event created.', 'id', v_id);

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_grading_component(p_section_id uuid, p_grading_period_id uuid, p_name text, p_weight numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_weight NUMERIC;
    v_new_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF public.fn_is_section_grading_locked(p_section_id, p_grading_period_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grading period is locked because grades have already been recorded. Components can no longer be changed.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.grading_components
    WHERE section_id = p_section_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL;

    IF v_total_weight + p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total weight of grading components cannot exceed 100%.');
    END IF;

    INSERT INTO public.grading_components (
        section_id,
        grading_period_id,
        name,
        weight,
        created_by
    ) VALUES (
        p_section_id,
        p_grading_period_id,
        p_name,
        p_weight,
        auth.uid()
    )
    RETURNING id INTO v_new_id;

    INSERT INTO public.grade_audit_logs (
        action, table_name, record_id, enrollment_id, grading_period_id,
        field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
        'Insert', 'grading_components', v_new_id, NULL, p_grading_period_id,
        'component', NULL, format('%s (%s%%)', p_name, p_weight),
        'Grading component created', auth.uid(), inet_client_addr()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Grading component created successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_grading_period_template(p_name text, p_weight numeric, p_components jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component JSONB;
    v_comp_total NUMERIC := 0;
    v_existing_total NUMERIC := 0;
    v_sequence SMALLINT;
    v_period_id UUID;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period name is required.');
    END IF;

    IF p_weight IS NULL OR p_weight <= 0 OR p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weight must be greater than 0 and at most 100.');
    END IF;

    IF jsonb_array_length(p_components) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one component is required.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'name')))
        FROM jsonb_array_elements(p_components) c
    ) <> jsonb_array_length(p_components) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component names within a grading period must be unique.');
    END IF;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
    END LOOP;

    IF round(v_comp_total, 2) <> 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Component weights for ' || p_name || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.grading_period_templates
        WHERE lower(name) = lower(btrim(p_name)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A grading period named "' || btrim(p_name) || '" already exists.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_existing_total
    FROM public.grading_period_templates
    WHERE deleted_at IS NULL;

    IF v_existing_total >= 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading periods already total 100%. You cannot add another period.');
    END IF;

    IF v_existing_total + p_weight > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Adding this period (' || p_weight || '%) would exceed 100%. Only ' || (100 - v_existing_total) || '% remaining.'
        );
    END IF;

    SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
    FROM public.grading_period_templates
    WHERE deleted_at IS NULL;

    INSERT INTO public.grading_period_templates (name, sequence, weight, created_by)
    VALUES (btrim(p_name), v_sequence, p_weight, auth.uid())
    RETURNING id INTO v_period_id;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        INSERT INTO public.grading_component_templates (
            grading_period_template_id, name, weight, created_by
        )
        VALUES (
            v_period_id,
            btrim(v_component->>'name'),
            (v_component->>'weight')::NUMERIC,
            auth.uid()
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period created successfully', 'id', v_period_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_material(p_module_id uuid, p_title text, p_material_type material_type, p_description text DEFAULT NULL::text, p_file_url text DEFAULT NULL::text, p_external_url text DEFAULT NULL::text, p_file_name text DEFAULT NULL::text, p_mime_type text DEFAULT NULL::text, p_file_size_bytes integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_id UUID;
    v_sequence SMALLINT;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add materials.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A material title is required.');
    END IF;

    IF p_material_type = 'Link' THEN
        IF p_external_url IS NULL OR btrim(p_external_url) = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'A link URL is required.');
        END IF;
    ELSE
        IF p_file_url IS NULL OR btrim(p_file_url) = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'A file is required.');
        END IF;
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.course_materials
    WHERE module_id = p_module_id AND deleted_at IS NULL;

    INSERT INTO public.course_materials (
        module_id, title, description, material_type,
        file_url, external_url, file_name, mime_type, file_size_bytes, sequence
    )
    VALUES (
        p_module_id, btrim(p_title), NULLIF(btrim(p_description), ''), p_material_type,
        NULLIF(btrim(p_file_url), ''), NULLIF(btrim(p_external_url), ''),
        NULLIF(btrim(p_file_name), ''), NULLIF(btrim(p_mime_type), ''), p_file_size_bytes, v_sequence
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Material added.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_module(p_section_id uuid, p_title text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_sequence SMALLINT;
BEGIN
    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add content.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A module title is required.');
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.modules
    WHERE section_id = p_section_id AND deleted_at IS NULL;

    INSERT INTO public.modules (section_id, title, description, sequence)
    VALUES (p_section_id, btrim(p_title), NULLIF(btrim(p_description), ''), v_sequence)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Module created.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_program(p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$BEGIN
    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program code already exists: ' || p_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE id = p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    INSERT INTO public.programs (
        code, name, department_id, program_level_id,
        years_duration, total_units, description, is_active, created_by
    )
    VALUES (
        p_code, p_name, p_department_id, p_program_level_id,
        p_years_duration, p_total_units, NULLIF(p_description, ''), p_is_active, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Program created successfully');
END;$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_program_level(p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level code already exists: ' || p_code);
    END IF;

    INSERT INTO public.program_levels (code, label, description, created_by)
    VALUES (p_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Program level created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_role(p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_code TEXT := btrim(p_code);
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
BEGIN
    IF v_code IS NULL OR v_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role code is required.');
    END IF;

    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(code)) = lower(v_code) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with code "' || v_code || '" already exists.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    INSERT INTO public.roles (code, label, description, created_by)
    VALUES (v_code, v_label, v_description, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Role created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_rubric(p_section_id uuid, p_title text, p_description text, p_criteria jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rubric_id  UUID;
    v_criterion  JSONB;
    v_total      NUMERIC := 0;
    v_seq        SMALLINT := 0;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    IF COALESCE(trim(p_title), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric title is required.');
    END IF;

    IF p_criteria IS NULL OR jsonb_array_length(p_criteria) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Add at least one criterion.');
    END IF;

    INSERT INTO public.rubrics (section_id, title, description, total_points)
    VALUES (p_section_id, trim(p_title), NULLIF(trim(p_description), ''), 0)
    RETURNING id INTO v_rubric_id;

    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        v_seq := v_seq + 1;

        IF (v_criterion->>'max_points')::NUMERIC <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each criterion must have points greater than zero.');
        END IF;

        INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
        VALUES (
            v_rubric_id,
            trim(v_criterion->>'title'),
            NULLIF(trim(v_criterion->>'description'), ''),
            (v_criterion->>'max_points')::NUMERIC,
            v_seq
        );

        v_total := v_total + (v_criterion->>'max_points')::NUMERIC;
    END LOOP;

    UPDATE public.rubrics SET total_points = v_total WHERE id = v_rubric_id;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric created successfully.', 'id', v_rubric_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_school_year(p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code is required.');
    END IF;

    IF p_label IS NULL OR btrim(p_label) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = btrim(p_code)
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || btrim(p_code));
    END IF;

    IF coalesce(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
        AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.school_years (code, label, start_date, end_date, is_active, created_by)
    VALUES (btrim(p_code), btrim(p_label), p_start_date, p_end_date, coalesce(p_is_active, false), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'School year created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_section(p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status section_status_type DEFAULT 'Open'::section_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    INSERT INTO public.sections (
        term_id,
        course_id,
        faculty_id,
        section_code,
        room,
        max_slots,
        status,
        created_by
    ) VALUES (
        p_term_id,
        p_course_id,
        p_faculty_id,
        p_section_code,
        p_room,
        p_max_slots,
        p_status,
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.', 'id', v_section_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_student(p_user_id uuid, p_student_number text, p_program_id uuid, p_year_level smallint, p_admitted_at date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_user_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE user_id = p_user_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This user already has a student profile.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE student_number = p_student_number AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student number already exists.');
    END IF;

    INSERT INTO public.students (
        user_id,
        student_number,
        program_id,
        year_level,
        admitted_at,
        status,
        created_by
    ) VALUES (
        p_user_id,
        p_student_number,
        p_program_id,
        p_year_level,
        p_admitted_at,
        'Active'::public.student_status_type,
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Student profile created successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_term(p_school_year_id uuid, p_term_type_id uuid, p_start_date date, p_end_date date, p_enrollment_start_date date DEFAULT NULL::date, p_enrollment_end_date date DEFAULT NULL::date, p_grading_deadline date DEFAULT NULL::date, p_evaluation_scope text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_evaluation_scope IS NOT NULL AND p_evaluation_scope <> '' AND p_evaluation_scope NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    INSERT INTO public.terms (
        school_year_id, term_type_id, start_date, end_date,
        enrollment_start_date, enrollment_end_date, grading_deadline,
        status, evaluation_scope, created_by
    )
    VALUES (
        p_school_year_id, p_term_type_id, p_start_date, p_end_date,
        p_enrollment_start_date, p_enrollment_end_date, p_grading_deadline,
        'Upcoming', NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type, auth.uid()
    )
    RETURNING id INTO v_term_id;

    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    RETURN jsonb_build_object('success', true, 'message', 'Term created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_term_type(p_code text, p_label text, p_sequence smallint, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE sequence = p_sequence
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sequence ' || p_sequence || ' is already taken by another term type');
    END IF;

    INSERT INTO public.term_types (code, label, sequence, description, created_by)
    VALUES (p_code, p_label, p_sequence, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Term type created successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_create_thread(p_section_id uuid, p_title text, p_body text, p_attachments jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_faculty_id UUID;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A title is required.');
    END IF;

    IF p_body IS NULL OR btrim(p_body) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A message is required.');
    END IF;

    INSERT INTO public.discussion_threads (section_id, title, body)
    VALUES (p_section_id, btrim(p_title), btrim(p_body))
    RETURNING id INTO v_id;

    PERFORM public.fn_insert_discussion_attachments(v_id, NULL, p_attachments);

    SELECT faculty_id INTO v_faculty_id
    FROM public.sections
    WHERE id = p_section_id AND deleted_at IS NULL;

    IF v_faculty_id IS NOT NULL AND v_faculty_id <> auth.uid() THEN
        PERFORM public.fn_notify_user(
            v_faculty_id,
            'New discussion post',
            btrim(p_title),
            '/faculty/sections/' || p_section_id::text || '?tab=discussion'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion posted.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_current_user_role_codes()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT coalesce(array_agg(DISTINCT r.code), ARRAY[]::text[])
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = auth.uid()
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_dashboard_active_term()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT t.id
    FROM public.terms t
    WHERE t.deleted_at IS NULL
    ORDER BY
        (t.status IN ('Ongoing', 'Grading Period')) DESC,
        (t.status = 'Enrollment Open') DESC,
        t.start_date DESC
    LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_dashboard_enrollment_risk(p_enrollment_ids uuid[])
 RETURNS TABLE(enrollment_id uuid, section_id uuid, student_id uuid, avg_score_pct numeric, attendance_rate numeric, missing_count integer, risk_score numeric, risk_level text, is_at_risk boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH scores AS (
        SELECT
            s.enrollment_id,
            ROUND(AVG(s.score_pct), 2) AS avg_score_pct
        FROM public.fn_analytics_submission_scores(p_enrollment_ids) s
        GROUP BY s.enrollment_id
    ),
    engagement AS (
        SELECT
            e.enrollment_id,
            e.attendance_rate,
            e.missing_count
        FROM public.fn_analytics_engagement(p_enrollment_ids) e
    ),
    computed AS (
        SELECT
            en.id AS enrollment_id,
            en.section_id,
            en.student_id,
            sc.avg_score_pct,
            eg.attendance_rate,
            COALESCE(eg.missing_count, 0) AS missing_count,
            public.fn_analytics_risk_score(
                eg.attendance_rate,
                sc.avg_score_pct,
                COALESCE(eg.missing_count, 0),
                0
            ) AS risk_score
        FROM public.enrollments en
        LEFT JOIN scores sc ON sc.enrollment_id = en.id
        LEFT JOIN engagement eg ON eg.enrollment_id = en.id
        WHERE en.id = ANY (p_enrollment_ids)
          AND en.deleted_at IS NULL
    )
    SELECT
        c.enrollment_id,
        c.section_id,
        c.student_id,
        c.avg_score_pct,
        c.attendance_rate,
        c.missing_count,
        c.risk_score,
        public.fn_analytics_risk_level(c.risk_score) AS risk_level,
        c.risk_score >= 30 AS is_at_risk
    FROM computed c;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_dashboard_faculty_term(p_faculty_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_fallback_term_id UUID;
BEGIN
    v_term_id := public.fn_dashboard_active_term();

    IF v_term_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.sections s
        WHERE s.deleted_at IS NULL
          AND s.faculty_id = p_faculty_id
          AND s.term_id = v_term_id
    ) THEN
        RETURN v_term_id;
    END IF;

    SELECT s.term_id
    INTO v_fallback_term_id
    FROM public.sections s
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
      AND s.faculty_id = p_faculty_id
    ORDER BY
        (t.status IN ('Ongoing', 'Grading Period')) DESC,
        (t.status = 'Enrollment Open') DESC,
        t.start_date DESC
    LIMIT 1;

    RETURN COALESCE(v_fallback_term_id, v_term_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_dashboard_term_label(p_term_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT jsonb_build_object(
        'term_id', t.id,
        'term_label', tt.label || ' - ' || sy.label,
        'status', t.status
    )
    FROM public.terms t
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.id = p_term_id
      AND t.deleted_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_announcement(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_owner UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by INTO v_owner
    FROM public.announcements
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only delete announcements you posted.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement deleted.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_assessment(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    UPDATE public.assessment_items
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_assessment_attachment(p_attachment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_attachments aa
        INNER JOIN public.assessment_items ai ON ai.id = aa.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE aa.id = p_attachment_id
        AND s.faculty_id = auth.uid()
        AND aa.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attachment not found or access denied.');
    END IF;

    UPDATE public.assessment_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_attachment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attachment deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_attendance_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT ats.section_id
    INTO v_section_id
    FROM public.attendance_sessions ats
    WHERE ats.id = p_session_id
    AND ats.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_is_section_faculty(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    UPDATE public.attendance_records
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE attendance_session_id = p_session_id
    AND deleted_at IS NULL;

    UPDATE public.attendance_sessions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_session_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance session deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_competency(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF EXISTS (
        SELECT 1 FROM public.assessment_question_competencies aqc
        WHERE aqc.competency_id = p_id
          AND aqc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This competency is tagged on assessment questions and cannot be deleted.');
    END IF;

    UPDATE public.competencies
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency not found.');
    END IF;

    UPDATE public.competency_alignments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE (competency_id = p_id OR parent_competency_id = p_id)
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Competency deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_course(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = p_course_id AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete course. It is referenced by existing curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_course_type(p_course_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_courses INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_courses
    FROM public.courses
    WHERE course_type_id = p_course_type_id
    AND deleted_at IS NULL;

    IF v_active_courses > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete course type. ' || v_active_courses || ' course(s) are currently using this type.'
        );
    END IF;

    UPDATE public.course_types
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_curriculum_map_entry(p_curriculum_map_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.curriculum_maps
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_department(p_department_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_programs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE department_id = p_department_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete department. ' || v_active_programs || ' program(s) are currently under this department.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_enrollment(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollment deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_evaluation_template(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.evaluation_responses r
        INNER JOIN public.evaluation_questions q ON q.id = r.question_id
        WHERE q.template_id = p_id AND r.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This section is already in use by student evaluations and cannot be deleted.');
    END IF;

    UPDATE public.evaluation_template_programs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_event(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_owner UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by INTO v_owner
    FROM public.events
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only delete events you created.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.events
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.event_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE event_id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Event deleted.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_grading_component(p_component_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id        UUID;
    v_grading_period_id UUID;
    v_name              TEXT;
    v_weight            NUMERIC;
BEGIN
    SELECT gc.section_id, gc.grading_period_id, gc.name, gc.weight
    INTO v_section_id, v_grading_period_id, v_name, v_weight
    FROM public.grading_components gc
    INNER JOIN public.sections s ON s.id = gc.section_id
    WHERE gc.id = p_component_id
    AND s.faculty_id = auth.uid()
    AND gc.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component not found or access denied.');
    END IF;

    IF public.fn_is_section_grading_locked(v_section_id, v_grading_period_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grading period is locked because grades have already been recorded. Components can no longer be changed.');
    END IF;

    UPDATE public.grading_components
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_component_id
    AND deleted_at IS NULL;

    INSERT INTO public.grade_audit_logs (
        action, table_name, record_id, enrollment_id, grading_period_id,
        field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
        'Delete', 'grading_components', p_component_id, NULL, v_grading_period_id,
        'component', format('%s (%s%%)', v_name, v_weight), NULL,
        'Grading component deleted', auth.uid(), inet_client_addr()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Grading component deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_grading_period_template(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.grading_period_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id = p_id AND deleted_at IS NULL;

    UPDATE public.grading_period_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_material(p_material_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id AND cm.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can delete materials.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.course_materials
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_material_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Material deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_module(p_module_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can delete content.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.modules
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_module_id AND deleted_at IS NULL;

    UPDATE public.course_materials
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE module_id = p_module_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_post(p_post_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
BEGIN
    SELECT t.section_id, p.created_by INTO v_section_id, v_author_id
    FROM public.discussion_posts p
    JOIN public.discussion_threads t ON t.id = p.thread_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can delete this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE post_id = p_post_id AND deleted_at IS NULL;

    UPDATE public.discussion_posts
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_post_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Reply deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_program(p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT program_id FROM public.curriculum_maps
        WHERE program_id = p_program_id AND deleted_at IS NULL
        UNION ALL
        SELECT p.id FROM public.students s
        JOIN public.programs p ON p.id = s.program_id
        WHERE s.program_id = p_program_id AND s.deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete program. It is referenced by existing curriculum maps or enrolled students.'
        );
    END IF;

    UPDATE public.programs
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_program_level(p_program_level_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_programs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE program_level_id = p_program_level_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete program level. ' || v_active_programs || ' program(s) are currently using this level.'
        );
    END IF;

    UPDATE public.program_levels
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_question(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        INNER JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE aq.id = p_question_id
        AND s.faculty_id = auth.uid()
        AND aq.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question not found or access denied.');
    END IF;

    UPDATE public.assessment_question_choices
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE question_id = p_question_id AND deleted_at IS NULL;

    UPDATE public.assessment_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_question_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Question deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_role(p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_users
    FROM public.user_roles
    WHERE role_id = p_role_id
    AND deleted_at IS NULL;

    IF v_active_users > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete role. ' || v_active_users || ' user(s) are currently assigned to this role.'
        );
    END IF;

    UPDATE public.roles
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_rubric(p_rubric_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff(public.fn_resolve_rubric_section(p_rubric_id));

    IF EXISTS (
        SELECT 1 FROM public.assessment_item_rubrics air
        WHERE air.rubric_id = p_rubric_id AND air.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Detach this rubric from its assessments before deleting.');
    END IF;

    UPDATE public.rubric_criteria
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE rubric_id = p_rubric_id AND deleted_at IS NULL;

    UPDATE public.rubrics
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_rubric_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_school_year(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE id = p_school_year_id
        AND is_active = TRUE
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot delete an active school year. Deactivate it first before deleting.');
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_special_grade_config(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.special_grade_configs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade config not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configuration deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_student(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    UPDATE public.students
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_student_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile deleted successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_term(p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_status TEXT;
    v_ref_count INTEGER;
BEGIN
    SELECT status INTO v_status
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    IF v_status NOT IN ('Upcoming', 'Closed') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Upcoming or Closed terms can be deleted');
    END IF;

    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT term_id FROM public.sections WHERE term_id = p_term_id AND deleted_at IS NULL
        UNION ALL
        SELECT term_id FROM public.grading_periods WHERE term_id = p_term_id AND deleted_at IS NULL
        UNION ALL
        SELECT term_id FROM public.student_clearances WHERE term_id = p_term_id AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot delete term. It is referenced by existing sections, grading periods, or clearances.');
    END IF;

    UPDATE public.terms
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Term deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_term_type(p_term_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_terms INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_terms
    FROM public.terms
    WHERE term_type_id = p_term_type_id
    AND deleted_at IS NULL;

    IF v_active_terms > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete term type. ' || v_active_terms || ' term(s) are currently using this type.'
        );
    END IF;

    UPDATE public.term_types
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type deleted successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_delete_thread(p_thread_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
BEGIN
    SELECT section_id, created_by INTO v_section_id, v_author_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can delete this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL
      AND (
          thread_id = p_thread_id
          OR post_id IN (SELECT id FROM public.discussion_posts WHERE thread_id = p_thread_id)
      );

    UPDATE public.discussion_threads
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_thread_id AND deleted_at IS NULL;

    UPDATE public.discussion_posts
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE thread_id = p_thread_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_drop_enrollment(p_enrollment_id uuid, p_drop_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_code TEXT;
BEGIN
    SELECT s.section_code INTO v_section_code
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET status = 'Dropped'::public.enrollment_status_type,
        dropped_at = now(),
        drop_reason = NULLIF(trim(COALESCE(p_drop_reason, '')), ''),
        updated_by = auth.uid()
    WHERE id = p_enrollment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Dropped ' || v_section_code || '.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_duplicate_assessment_to_sections(p_assessment_id uuid, p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_src               public.assessment_items%ROWTYPE;
    v_target_id         UUID;
    v_new_assessment_id UUID;
    v_component_id      UUID;
    v_module_id         UUID;
    v_new_question_id   UUID;
    v_question          RECORD;
    v_copied            INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT * INTO v_src
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_src.section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target_id IN ARRAY p_section_ids
    LOOP
        IF v_target_id = v_src.section_id THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target_id) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach one of the selected sections.'
                USING ERRCODE = '42501';
        END IF;

        v_component_id := NULL;

        IF v_src.grading_component_id IS NOT NULL THEN
            SELECT tgc.id INTO v_component_id
            FROM public.grading_components sgc
            INNER JOIN public.grading_periods sgp
                ON sgp.id = sgc.grading_period_id AND sgp.deleted_at IS NULL
            INNER JOIN public.grading_periods tgp
                ON tgp.name = sgp.name AND tgp.deleted_at IS NULL
            INNER JOIN public.grading_components tgc
                ON tgc.grading_period_id = tgp.id
                AND tgc.section_id = v_target_id
                AND tgc.name = sgc.name
                AND tgc.deleted_at IS NULL
            WHERE sgc.id = v_src.grading_component_id
              AND sgc.deleted_at IS NULL
            LIMIT 1;
        END IF;

        v_module_id := NULL;

        IF v_src.module_id IS NOT NULL THEN
            SELECT tm.id INTO v_module_id
            FROM public.modules sm
            INNER JOIN public.modules tm
                ON tm.section_id = v_target_id
                AND tm.title = sm.title
                AND tm.deleted_at IS NULL
            WHERE sm.id = v_src.module_id
              AND sm.deleted_at IS NULL
            LIMIT 1;
        END IF;

        INSERT INTO public.assessment_items (
            section_id, grading_component_id, module_id, title, description, assessment_type,
            total_points, passing_points, time_limit_minutes, max_attempts,
            is_published, published_at, scheduled_publish_at,
            opens_at, due_at, closes_at, show_results_at,
            shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
            max_file_count_per_question
        )
        VALUES (
            v_target_id, v_component_id, v_module_id, v_src.title, v_src.description, v_src.assessment_type,
            v_src.total_points, v_src.passing_points, v_src.time_limit_minutes, v_src.max_attempts,
            false, NULL, NULL,
            v_src.opens_at, v_src.due_at, v_src.closes_at, v_src.show_results_at,
            v_src.shuffle_questions, v_src.shuffle_choices, v_src.show_all_questions, v_src.questions_per_page,
            v_src.max_file_count_per_question
        )
        RETURNING id INTO v_new_assessment_id;

        FOR v_question IN
            SELECT *
            FROM public.assessment_questions
            WHERE assessment_item_id = p_assessment_id
              AND deleted_at IS NULL
            ORDER BY sequence, created_at
        LOOP
            INSERT INTO public.assessment_questions (
                assessment_item_id, question_text, question_type, points, sequence,
                explanation, is_required, allowed_file_types, max_file_size_mb, max_file_count
            )
            VALUES (
                v_new_assessment_id, v_question.question_text, v_question.question_type,
                v_question.points, v_question.sequence, v_question.explanation, v_question.is_required,
                v_question.allowed_file_types, v_question.max_file_size_mb, v_question.max_file_count
            )
            RETURNING id INTO v_new_question_id;

            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence)
            SELECT v_new_question_id, c.choice_text, c.is_correct, c.sequence
            FROM public.assessment_question_choices c
            WHERE c.question_id = v_question.id
              AND c.deleted_at IS NULL;

            IF to_regclass('public.assessment_question_competencies') IS NOT NULL THEN
                EXECUTE format(
                    'INSERT INTO public.assessment_question_competencies (question_id, competency_id, weight)
                     SELECT %L::uuid, aqc.competency_id, aqc.weight
                     FROM public.assessment_question_competencies aqc
                     WHERE aqc.question_id = %L::uuid AND aqc.deleted_at IS NULL',
                    v_new_question_id, v_question.id
                );
            END IF;
        END LOOP;

        INSERT INTO public.assessment_attachments (
            assessment_item_id, file_name, file_url, file_size_bytes, mime_type, sequence
        )
        SELECT v_new_assessment_id, a.file_name, a.file_url, a.file_size_bytes, a.mime_type, a.sequence
        FROM public.assessment_attachments a
        WHERE a.assessment_item_id = p_assessment_id
          AND a.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Assessment copied to %s section(s) as an unpublished draft.', v_copied),
        'copied_count', v_copied
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_duplicate_module_to_sections(p_module_id uuid, p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_src           public.modules%ROWTYPE;
    v_target_id     UUID;
    v_new_module_id UUID;
    v_sequence      SMALLINT;
    v_copied        INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT * INTO v_src
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_src.section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target_id IN ARRAY p_section_ids
    LOOP
        IF v_target_id = v_src.section_id THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target_id) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach one of the selected sections.'
                USING ERRCODE = '42501';
        END IF;

        SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
        FROM public.modules
        WHERE section_id = v_target_id AND deleted_at IS NULL;

        INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
        VALUES (v_target_id, v_src.title, v_src.description, v_sequence, false, NULL)
        RETURNING id INTO v_new_module_id;

        INSERT INTO public.course_materials (
            module_id, title, description, material_type,
            file_url, external_url, file_name, mime_type, file_size_bytes,
            sequence, is_published, available_from, available_until
        )
        SELECT
            v_new_module_id, cm.title, cm.description, cm.material_type,
            cm.file_url, cm.external_url, cm.file_name, cm.mime_type, cm.file_size_bytes,
            cm.sequence, false, cm.available_from, cm.available_until
        FROM public.course_materials cm
        WHERE cm.module_id = p_module_id
          AND cm.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Module copied to %s section(s) as an unpublished draft.', v_copied),
        'copied_count', v_copied
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_emit_announcement_notifications(p_announcement_id uuid, p_audience announcement_audience_type, p_section_ids uuid[], p_title text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New announcement',
        p_title,
        '\announcement-management\' || p_announcement_id::text,
        'Announcement'
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_emit_event_notifications(p_event_id uuid, p_audience announcement_audience_type, p_section_ids uuid[], p_title text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New event',
        p_title,
        '\event-management\' || p_event_id::text,
        'Event'
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(p_student_id uuid, p_section_id uuid, p_allow_conflict boolean DEFAULT false, p_conflict_reason text DEFAULT NULL::text, p_override_prerequisites boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student   RECORD;
    v_section   RECORD;
    v_taken     INTEGER;
    v_conflicts TEXT;
    v_unmet     TEXT;
BEGIN
    SELECT st.id, st.program_id, st.status
    INTO v_student
    FROM public.students st
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_NOT_FOUND', 'message', 'Student not found.');
    END IF;

    IF v_student.status <> 'Active' THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_INACTIVE', 'message', 'Only active students can be enrolled.');
    END IF;

    IF v_student.program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_PROGRAM', 'message', 'Student has no program assigned.');
    END IF;

    SELECT s.id, s.course_id, s.term_id, s.max_slots, s.status, s.section_code, c.code AS course_code
    INTO v_section
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'SECTION_NOT_FOUND', 'message', 'Section not found.');
    END IF;

    IF v_section.status IN ('Closed', 'Cancelled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SECTION_UNAVAILABLE',
            'message', v_section.section_code || ' is ' || lower(v_section.status::TEXT) || ' and cannot accept enrollments.'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.curriculum_maps cm
        WHERE cm.program_id = v_student.program_id
        AND cm.course_id = v_section.course_id
        AND cm.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_IN_CURRICULUM',
            'message', v_section.course_code || ' is not part of the student''s program curriculum.'
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.enrollments e
        INNER JOIN public.sections s2 ON s2.id = e.section_id AND s2.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.deleted_at IS NULL
        AND e.status IN ('Enrolled', 'Completed')
        AND s2.course_id = v_section.course_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_TAKEN',
            'message', 'Student is already enrolled in or has completed ' || v_section.course_code || '.'
        );
    END IF;

    SELECT COUNT(*) INTO v_taken
    FROM public.enrollments
    WHERE section_id = p_section_id
    AND deleted_at IS NULL
    AND status NOT IN ('Dropped', 'Withdrawn');

    IF v_taken >= v_section.max_slots THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SECTION_FULL',
            'message', v_section.section_code || ' is already full.'
        );
    END IF;

    v_unmet := public.fn_get_unmet_prerequisites(p_student_id, v_section.course_id);

    IF v_unmet IS NOT NULL AND NOT p_override_prerequisites THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PREREQUISITE_UNMET',
            'message', v_section.course_code || ' requires ' || v_unmet || '.'
        );
    END IF;

    v_conflicts := public.fn_get_schedule_conflicts(p_student_id, p_section_id);

    IF v_conflicts IS NOT NULL AND NOT p_allow_conflict THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SCHEDULE_CONFLICT',
            'message', v_section.section_code || ' conflicts with ' || v_conflicts || '.'
        );
    END IF;

    INSERT INTO public.enrollments (
        student_id,
        section_id,
        status,
        enrolled_at,
        created_by,
        is_conflict_authorized,
        conflict_authorized_by,
        conflict_authorized_at,
        conflict_reason
    ) VALUES (
        p_student_id,
        p_section_id,
        'Enrolled'::public.enrollment_status_type,
        now(),
        auth.uid(),
        v_conflicts IS NOT NULL,
        CASE WHEN v_conflicts IS NOT NULL THEN auth.uid() END,
        CASE WHEN v_conflicts IS NOT NULL THEN now() END,
        CASE WHEN v_conflicts IS NOT NULL THEN NULLIF(trim(COALESCE(p_conflict_reason, '')), '') END
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'ENROLLED',
        'message', 'Enrolled in ' || v_section.section_code || '.'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_evaluate_student_year_level(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id      UUID;
    v_current_year    SMALLINT;
    v_new_year        SMALLINT;
    v_check_year      SMALLINT;
    v_required_count  INTEGER;
    v_completed_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT program_id, year_level
    INTO v_program_id, v_current_year
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found or has no program assigned.');
    END IF;

    v_new_year := v_current_year;

    FOR v_check_year IN 1..5 LOOP
        SELECT COUNT(*)
        INTO v_required_count
        FROM public.curriculum_maps cm
        WHERE cm.program_id = v_program_id
        AND cm.year_level = v_check_year
        AND cm.is_elective = false
        AND cm.deleted_at IS NULL;

        IF v_required_count = 0 THEN
            CONTINUE;
        END IF;

        SELECT COUNT(DISTINCT e.id)
        INTO v_completed_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.curriculum_maps cm ON cm.course_id = s.course_id
            AND cm.program_id = v_program_id
            AND cm.year_level = v_check_year
            AND cm.is_elective = false
            AND cm.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.status = 'Completed'
        AND e.deleted_at IS NULL;

        IF v_completed_count >= v_required_count THEN
            v_new_year := LEAST(v_check_year + 1, 6);
        ELSE
            EXIT;
        END IF;
    END LOOP;

    IF v_new_year <> v_current_year THEN
        UPDATE public.students
        SET year_level = v_new_year
        WHERE id = p_student_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Year level evaluated successfully.',
        'previous_year_level', v_current_year,
        'new_year_level', v_new_year
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_expire_overdue_submissions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_expired_count INTEGER := 0;
  v_session       RECORD;
BEGIN
  FOR v_session IN
    SELECT ats.id AS session_id, ats.submission_id
    FROM public.assessment_timer_sessions ats
    WHERE ats.status          = 'Active'
      AND ats.server_expires_at < now()
      AND ats.deleted_at        IS NULL
  LOOP
    UPDATE public.assessment_submissions
    SET
      status       = 'Submitted',
      submitted_at = now(),
      is_late      = true,
      feedback     = 'Auto-submitted by server: time limit exceeded.'
    WHERE id        = v_session.submission_id
      AND status    = 'In Progress'
      AND deleted_at IS NULL;

    UPDATE public.assessment_timer_sessions
    SET
      status           = 'Expired',
      forced_submit_at = now(),
      last_activity_at = now()
    WHERE id = v_session.session_id;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',         true,
    'expired_count',   v_expired_count,
    'processed_at',    now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_academic_standing(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[];
    v_gwa_result JSONB;
    v_gwa NUMERIC;
    v_total_units NUMERIC;
    v_failed INTEGER;
    v_passing_ceiling NUMERIC(4,2);
    v_standing TEXT;
    v_honor JSONB;
    v_scholarship JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF NOT (v_roles && ARRAY['Admin', 'Faculty', 'Registrar', 'Dean']) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = p_student_id
              AND s.user_id = auth.uid()
              AND s.deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Forbidden: you may only view your own academic standing.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    v_gwa_result := fn_compute_student_gwa(p_student_id, p_term_id);

    IF NOT (v_gwa_result->>'success')::BOOLEAN THEN
        RETURN v_gwa_result;
    END IF;

    v_gwa := (v_gwa_result->>'gwa')::NUMERIC;
    v_total_units := (v_gwa_result->>'total_units')::NUMERIC;

    SELECT COUNT(*)
    INTO v_failed
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id
    INNER JOIN public.sections sec ON sec.id = e.section_id
    WHERE e.student_id = p_student_id
      AND sec.term_id = p_term_id
      AND sfg.status = 'Released'
      AND COALESCE(sfg.transmuted_grade, sfg.final_grade) > 3.0
      AND e.deleted_at IS NULL
      AND sfg.deleted_at IS NULL;

    SELECT max_gwa
    INTO v_passing_ceiling
    FROM public.academic_thresholds
    WHERE category = 'Standing'
      AND code = 'good_standing'
      AND is_active
      AND deleted_at IS NULL
    LIMIT 1;

    v_passing_ceiling := COALESCE(v_passing_ceiling, 3.00);

    v_standing := CASE
        WHEN v_failed > 0 THEN 'Probation'
        WHEN v_gwa <= v_passing_ceiling THEN 'Good Standing'
        ELSE 'Probation'
    END;

    SELECT jsonb_build_object('code', code, 'label', label)
    INTO v_honor
    FROM public.academic_thresholds
    WHERE category = 'Honor'
      AND is_active
      AND deleted_at IS NULL
      AND v_gwa <= max_gwa
      AND (NOT requires_no_failing OR v_failed = 0)
    ORDER BY max_gwa ASC
    LIMIT 1;

    SELECT jsonb_build_object('code', code, 'label', label, 'discount_pct', scholarship_discount_pct)
    INTO v_scholarship
    FROM public.academic_thresholds
    WHERE category = 'Scholarship'
      AND is_active
      AND deleted_at IS NULL
      AND v_gwa <= max_gwa
      AND (NOT requires_no_failing OR v_failed = 0)
    ORDER BY max_gwa ASC
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'term_id', p_term_id,
        'gwa', v_gwa,
        'total_units', v_total_units,
        'failed_count', v_failed,
        'standing', v_standing,
        'honor', v_honor,
        'scholarship', v_scholarship
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_academic_thresholds()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.category, t.sort_order), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            id,
            category,
            code,
            label,
            min_gwa,
            max_gwa,
            requires_no_failing,
            scholarship_discount_pct,
            sort_order,
            is_active
        FROM public.academic_thresholds
        WHERE deleted_at IS NULL
    ) t;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_active_term()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_term JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_term_id := public.fn_dashboard_active_term();

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'term_id', NULL,
            'term_label', NULL,
            'status', NULL
        );
    END IF;

    v_term := public.fn_dashboard_term_label(v_term_id);

    RETURN COALESCE(v_term, jsonb_build_object(
        'term_id', v_term_id,
        'term_label', NULL,
        'status', NULL
    )) || jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_admin_dashboard_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_admin           BOOLEAN;
    v_total_students     INTEGER;
    v_total_faculty      INTEGER;
    v_total_programs     INTEGER;
    v_active_terms       INTEGER;
    v_active_enrollments INTEGER;
    v_pending_clearances INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.code = 'Admin'
        AND ur.revoked_at IS NULL
        AND ur.deleted_at IS NULL
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    SELECT COUNT(*) INTO v_total_students
    FROM public.students
    WHERE status = 'Active' AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT ur.user_id) INTO v_total_faculty
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.users u ON u.id = ur.user_id
    WHERE r.code = 'Faculty'
    AND ur.revoked_at IS NULL
    AND ur.deleted_at IS NULL
    AND u.deleted_at IS NULL;

    SELECT COUNT(*) INTO v_total_programs
    FROM public.programs
    WHERE deleted_at IS NULL;

    SELECT COUNT(*) INTO v_active_terms
    FROM public.terms
    WHERE status IN ('Enrollment Open', 'Ongoing', 'Grading Period')
    AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_active_enrollments
    FROM public.enrollments
    WHERE status = 'Enrolled' AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_pending_clearances
    FROM public.student_clearances
    WHERE status = 'Pending' AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'total_students', v_total_students,
        'total_faculty', v_total_faculty,
        'total_programs', v_total_programs,
        'active_terms', v_active_terms,
        'active_enrollments', v_active_enrollments,
        'pending_clearances', v_pending_clearances
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_announcement_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'content', a.content,
        'target_audience', a.target_audience,
        'is_pinned', a.is_pinned,
        'published_at', a.published_at,
        'expires_at', a.expires_at,
        'created_at', a.created_at,
        'created_by', a.created_by,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'section_ids', COALESCE(
            (
                SELECT jsonb_agg(asx.section_id ORDER BY asx.created_at)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'sections', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object('id', s.id, 'code', s.section_code, 'course_code', c.code)
                    ORDER BY s.section_code
                )
                FROM public.announcement_sections asx
                JOIN public.sections s ON s.id = asx.section_id AND s.deleted_at IS NULL
                LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.announcements a
    LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.id = p_id
      AND a.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_announcement_section_options()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_is_staff BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar'];

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.label), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            s.id,
            s.section_code,
            trim(concat(c.code, ' - ', s.section_code)) AS label
        FROM public.sections s
        LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
          AND (v_is_staff OR s.faculty_id = auth.uid())
    ) t;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_by_id(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',                   ai.id,
        'section_id',           ai.section_id,
        'grading_component_id', ai.grading_component_id,
        'title',                ai.title,
        'description',          ai.description,
        'assessment_type',      ai.assessment_type,
        'total_points',         ai.total_points,
        'passing_points',       ai.passing_points,
        'time_limit_minutes',   ai.time_limit_minutes,
        'max_attempts',         ai.max_attempts,
        'is_published',         ai.is_published,
        'opens_at',             ai.opens_at,
        'due_at',               ai.due_at,
        'closes_at',            ai.closes_at,
        'show_results_at',      ai.show_results_at,
        'scheduled_publish_at', ai.scheduled_publish_at,
        'shuffle_questions',    ai.shuffle_questions,
        'shuffle_choices',      ai.shuffle_choices,
        'show_all_questions',   ai.show_all_questions,
        'questions_per_page',   ai.questions_per_page,
        'allow_student_review', ai.allow_student_review
    )
    INTO v_result
    FROM public.assessment_items ai
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE ai.id = p_assessment_id
    AND s.faculty_id = auth.uid()
    AND ai.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_for_student(p_assessment_id uuid, p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT jsonb_build_object(
        'id',                   ai.id,
        'title',                ai.title,
        'description',          ai.description,
        'assessment_type',      ai.assessment_type,
        'total_points',         ai.total_points,
        'passing_points',       ai.passing_points,
        'time_limit_minutes',   ai.time_limit_minutes,
        'max_attempts',         ai.max_attempts,
        'show_all_questions',   ai.show_all_questions,
        'questions_per_page',   ai.questions_per_page,
        'shuffle_questions',    ai.shuffle_questions,
        'shuffle_choices',      ai.shuffle_choices,
        'opens_at',             ai.opens_at,
        'due_at',               ai.due_at,
        'closes_at',            ai.closes_at,
        'show_results_at',      ai.show_results_at,
        'scheduled_publish_at', ai.scheduled_publish_at,
        'attachments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              aa.id,
                    'file_name',       aa.file_name,
                    'file_url',        aa.file_url,
                    'file_size_bytes', aa.file_size_bytes,
                    'mime_type',       aa.mime_type
                )
                ORDER BY aa.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_attachments aa
            WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.assessment_items ai
    INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
    INNER JOIN public.enrollments e ON e.section_id = s.id
        AND e.id = p_enrollment_id
        AND e.student_id = v_student_id
        AND e.deleted_at IS NULL
    WHERE ai.id = p_assessment_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_integrity_report(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_result     JSONB;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.');
    END IF;

    PERFORM public.fn_assert_section_staff(v_section_id);

    WITH timer AS (
        SELECT ts.id AS session_id, ts.submission_id, ts.last_activity_at
        FROM public.assessment_timer_sessions ts
        WHERE ts.assessment_item_id = p_assessment_id
          AND ts.deleted_at IS NULL
    ),
    roster AS (
        SELECT
            sub.id AS submission_id,
            sub.attempt_number,
            sub.status::text AS status,
            sub.started_at,
            sub.submitted_at,
            st.student_number,
            u.first_name || ' ' || u.last_name AS full_name
        FROM public.assessment_submissions sub
        INNER JOIN public.enrollments e ON e.id = sub.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE sub.assessment_item_id = p_assessment_id
          AND sub.deleted_at IS NULL
    ),
    focus_events AS (
        SELECT
            t.submission_id,
            h.event_type,
            h.recorded_at,
            LEAD(h.recorded_at) OVER (PARTITION BY t.submission_id ORDER BY h.recorded_at) AS next_at,
            t.last_activity_at
        FROM public.assessment_timer_heartbeats h
        INNER JOIN timer t ON t.session_id = h.session_id
        WHERE h.deleted_at IS NULL
          AND h.event_type <> 'Heartbeat'
    ),
    away_spans AS (
        SELECT
            submission_id,
            GREATEST(
                EXTRACT(EPOCH FROM (COALESCE(next_at, last_activity_at, recorded_at) - recorded_at)),
                0
            )::INT AS away_seconds
        FROM focus_events
        WHERE event_type = 'Focus Lost'
    ),
    focus_stats AS (
        SELECT
            submission_id,
            COUNT(*)::INT AS focus_lost_count,
            COALESCE(SUM(away_seconds), 0)::INT AS total_away_seconds,
            COALESCE(MAX(away_seconds), 0)::INT AS longest_away_seconds
        FROM away_spans
        GROUP BY submission_id
    ),
    submission_ips AS (
        SELECT
            t.submission_id,
            h.client_ip,
            MIN(h.recorded_at) AS first_seen,
            MAX(h.recorded_at) AS last_seen
        FROM public.assessment_timer_heartbeats h
        INNER JOIN timer t ON t.session_id = h.session_id
        WHERE h.deleted_at IS NULL
          AND h.client_ip IS NOT NULL
        GROUP BY t.submission_id, h.client_ip
    ),
    ip_stats AS (
        SELECT
            submission_id,
            COUNT(*)::INT AS distinct_ip_count,
            COALESCE(jsonb_agg(HOST(client_ip) ORDER BY first_seen), '[]'::jsonb) AS ip_addresses
        FROM submission_ips
        GROUP BY submission_id
    ),
    collisions AS (
        SELECT
            a.submission_id,
            jsonb_agg(DISTINCT jsonb_build_object(
                'ip_address',     HOST(a.client_ip),
                'student_number', r.student_number,
                'full_name',      r.full_name
            )) AS shared_with
        FROM submission_ips a
        INNER JOIN submission_ips b
            ON b.client_ip     = a.client_ip
           AND b.submission_id <> a.submission_id
           AND b.first_seen   <= a.last_seen
           AND b.last_seen    >= a.first_seen
        INNER JOIN roster r ON r.submission_id = b.submission_id
        GROUP BY a.submission_id
    )
    SELECT jsonb_build_object(
        'success', true,
        'assessment', (
            SELECT jsonb_build_object(
                'assessment_id', ai.id,
                'title',         ai.title,
                'section_id',    ai.section_id,
                'section_code',  s.section_code,
                'course_code',   c.code
            )
            FROM public.assessment_items ai
            INNER JOIN public.sections s ON s.id = ai.section_id
            INNER JOIN public.courses c ON c.id = s.course_id
            WHERE ai.id = p_assessment_id
        ),
        'summary', jsonb_build_object(
            'submission_count',    COUNT(*)::INT,
            'focus_flagged_count', COUNT(*) FILTER (WHERE COALESCE(fs.focus_lost_count, 0) > 0)::INT,
            'shared_ip_count',     COUNT(*) FILTER (WHERE col.shared_with IS NOT NULL)::INT,
            'roaming_ip_count',    COUNT(*) FILTER (WHERE COALESCE(ip.distinct_ip_count, 0) > 1)::INT
        ),
        'submissions', COALESCE(jsonb_agg(
            jsonb_build_object(
                'submission_id',        r.submission_id,
                'student_number',       r.student_number,
                'full_name',            r.full_name,
                'attempt_number',       r.attempt_number,
                'status',               r.status,
                'started_at',           r.started_at,
                'submitted_at',         r.submitted_at,
                'focus_lost_count',     COALESCE(fs.focus_lost_count, 0),
                'total_away_seconds',   COALESCE(fs.total_away_seconds, 0),
                'longest_away_seconds', COALESCE(fs.longest_away_seconds, 0),
                'distinct_ip_count',    COALESCE(ip.distinct_ip_count, 0),
                'ip_addresses',         COALESCE(ip.ip_addresses, '[]'::jsonb),
                'shared_with',          COALESCE(col.shared_with, '[]'::jsonb)
            )
            ORDER BY
                COALESCE(fs.total_away_seconds, 0) DESC,
                COALESCE(ip.distinct_ip_count, 0) DESC,
                r.full_name
        ), '[]'::jsonb)
    ) INTO v_result
    FROM roster r
    LEFT JOIN focus_stats fs ON fs.submission_id = r.submission_id
    LEFT JOIN ip_stats ip    ON ip.submission_id = r.submission_id
    LEFT JOIN collisions col ON col.submission_id = r.submission_id;

    RETURN v_result;

EXCEPTION
    WHEN sqlstate '42501' THEN
        RAISE;
    WHEN sqlstate '28000' THEN
        RAISE;
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_item_analysis(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_assessment JSONB;
    v_summary JSONB;
    v_questions JSONB;
    v_group_size INTEGER;
    v_submission_count INTEGER;
BEGIN
    SELECT ai.section_id
    INTO v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
      AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment was not found.');
    END IF;

    PERFORM public.fn_analytics_assert_section(v_section_id);

    SELECT jsonb_build_object(
        'assessment_id', ai.id,
        'title', ai.title,
        'assessment_type', ai.assessment_type,
        'total_points', ai.total_points,
        'section_id', ai.section_id,
        'section_code', sec.section_code,
        'course_code', c.code
    )
    INTO v_assessment
    FROM public.assessment_items ai
    INNER JOIN public.sections sec ON sec.id = ai.section_id AND sec.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
    WHERE ai.id = p_assessment_id;

    SELECT COUNT(*)
    INTO v_submission_count
    FROM public.fn_analytics_item_submissions(p_assessment_id);

    v_group_size := GREATEST(1, FLOOR(v_submission_count * 0.27)::INTEGER);

    SELECT jsonb_build_object(
        'submission_count', v_submission_count,
        'mean_pct', ROUND(AVG(s.score_pct), 2),
        'median_pct', ROUND(
            CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score_pct) AS NUMERIC),
            2
        ),
        'highest_pct', ROUND(MAX(s.score_pct), 2),
        'lowest_pct', ROUND(MIN(s.score_pct), 2),
        'std_dev_pct', ROUND(STDDEV_POP(s.score_pct), 2),
        'group_size', v_group_size
    )
    INTO v_summary
    FROM public.fn_analytics_item_submissions(p_assessment_id) s;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'question_id', q.question_id,
                'sequence', q.sequence,
                'question_text', q.question_text,
                'question_type', q.question_type,
                'points', q.points,
                'answered_count', q.answered_count,
                'correct_count', q.correct_count,
                'difficulty_index', q.difficulty_index,
                'difficulty_label', CASE
                    WHEN q.difficulty_index IS NULL THEN NULL
                    WHEN q.difficulty_index >= 0.80 THEN 'Easy'
                    WHEN q.difficulty_index >= 0.40 THEN 'Moderate'
                    ELSE 'Difficult'
                END,
                'discrimination_index', q.discrimination_index,
                'discrimination_label', CASE
                    WHEN q.discrimination_index IS NULL THEN NULL
                    WHEN q.discrimination_index >= 0.40 THEN 'Excellent'
                    WHEN q.discrimination_index >= 0.30 THEN 'Good'
                    WHEN q.discrimination_index >= 0.20 THEN 'Fair'
                    ELSE 'Poor'
                END,
                'competencies', q.competencies,
                'choices', q.choices
            )
            ORDER BY q.sequence
        ),
        '[]'::jsonb
    )
    INTO v_questions
    FROM (
        SELECT
            aq.id AS question_id,
            aq.sequence,
            aq.question_text,
            aq.question_type::TEXT AS question_type,
            aq.points,
            COUNT(sa.id)::INTEGER AS answered_count,
            COUNT(sa.id) FILTER (WHERE sa.is_correct)::INTEGER AS correct_count,
            ROUND(
                AVG(COALESCE(sa.points_earned, 0)) / NULLIF(aq.points, 0),
                2
            ) AS difficulty_index,
            CASE
                WHEN v_submission_count < 2
                    THEN NULL
                ELSE ROUND(
                    (
                        AVG(COALESCE(sa.points_earned, 0)) FILTER (WHERE sa.rank_desc <= v_group_size)
                        - AVG(COALESCE(sa.points_earned, 0)) FILTER (WHERE sa.rank_asc <= v_group_size)
                    ) / NULLIF(aq.points, 0),
                    2
                )
            END AS discrimination_index,
            (
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object('code', cp.code, 'title', cp.title)
                        ORDER BY cp.code
                    ),
                    '[]'::jsonb
                )
                FROM public.assessment_question_competencies aqc
                INNER JOIN public.competencies cp
                    ON cp.id = aqc.competency_id
                    AND cp.deleted_at IS NULL
                WHERE aqc.question_id = aq.id
                  AND aqc.deleted_at IS NULL
            ) AS competencies,
            (
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'choice_id', ch.id,
                            'choice_text', ch.choice_text,
                            'is_correct', ch.is_correct,
                            'selected_count', (
                                SELECT COUNT(*)
                                FROM public.student_answers sa2
                                INNER JOIN public.fn_analytics_item_submissions(p_assessment_id) ts2
                                    ON ts2.submission_id = sa2.submission_id
                                WHERE sa2.choice_id = ch.id
                                  AND sa2.deleted_at IS NULL
                            )
                        )
                        ORDER BY ch.sequence
                    ),
                    '[]'::jsonb
                )
                FROM public.assessment_question_choices ch
                WHERE ch.question_id = aq.id
                  AND ch.deleted_at IS NULL
            ) AS choices
        FROM public.assessment_questions aq
        LEFT JOIN (
            SELECT
                sa.question_id,
                sa.id,
                sa.points_earned,
                sa.is_correct,
                ts.rank_asc,
                ts.rank_desc
            FROM public.student_answers sa
            INNER JOIN public.fn_analytics_item_submissions(p_assessment_id) ts
                ON ts.submission_id = sa.submission_id
            WHERE sa.deleted_at IS NULL
        ) sa ON sa.question_id = aq.id
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
        GROUP BY aq.id, aq.sequence, aq.question_text, aq.question_type, aq.points
    ) q;

    RETURN jsonb_build_object(
        'success', true,
        'assessment', v_assessment,
        'summary', v_summary,
        'questions', v_questions
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff((
        SELECT ai.section_id
        FROM public.assessment_items ai
        WHERE ai.id = p_assessment_id
          AND ai.deleted_at IS NULL
    ));

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             aq.id,
                'question_text',  aq.question_text,
                'question_type',  aq.question_type,
                'points',         aq.points,
                'sequence',       aq.sequence,
                'explanation',    aq.explanation,
                'is_required',    aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'choices', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          ac.id,
                            'choice_text', ac.choice_text,
                            'is_correct',  ac.is_correct,
                            'sequence',    ac.sequence
                        )
                        ORDER BY ac.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY aq.sequence ASC
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
        AND aq.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions_for_student(p_assessment_id uuid, p_enrollment_id uuid, p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id    UUID;
    v_shuffle_q     BOOLEAN;
    v_shuffle_c     BOOLEAN;
    v_seed          TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        INNER JOIN public.assessment_items ai ON ai.section_id = e.section_id
        WHERE e.id = p_enrollment_id
          AND e.student_id = v_student_id
          AND ai.id = p_assessment_id
          AND ai.is_published = true
          AND ai.deleted_at IS NULL
          AND e.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    SELECT shuffle_questions, shuffle_choices
    INTO v_shuffle_q, v_shuffle_c
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    v_seed := p_submission_id::text;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            aq.id,
                'question_text', aq.question_text,
                'question_type', aq.question_type,
                'points',        aq.points,
                'sequence',      aq.sequence,
                'is_required',   aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'saved_answer', (
                    SELECT jsonb_build_object(
                        'id',               sa.id,
                        'answer_text',      sa.answer_text,
                        'choice_id',        sa.choice_id,
                        'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb)
                    )
                    FROM public.student_answers sa
                    WHERE sa.question_id = aq.id
                      AND sa.submission_id = p_submission_id
                      AND sa.deleted_at IS NULL
                    LIMIT 1
                ),
                'choices', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          ac.id,
                            'choice_text', ac.choice_text,
                            'sequence',    ac.sequence
                        )
                        ORDER BY CASE
                            WHEN v_shuffle_c
                                THEN hashtextextended(v_seed || ac.id::text, 0)::float
                            ELSE ac.sequence::float
                        END
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY CASE
                WHEN v_shuffle_q
                    THEN hashtextextended(v_seed || aq.id::text, 0)::float
                ELSE aq.sequence::float
            END
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_rubric(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_rubric_id  UUID;
    v_use_scoring BOOLEAN;
BEGIN
    SELECT ai.section_id, ai.use_rubric_scoring
    INTO v_section_id, v_use_scoring
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id AND ai.deleted_at IS NULL;

    PERFORM public.fn_assert_section_staff(v_section_id);

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_item_rubrics air
    WHERE air.assessment_item_id = p_assessment_id AND air.deleted_at IS NULL
    LIMIT 1;

    RETURN jsonb_build_object(
        'assessment_id',      p_assessment_id,
        'use_rubric_scoring', COALESCE(v_use_scoring, false),
        'rubric_id',          v_rubric_id,
        'rubric', CASE WHEN v_rubric_id IS NULL THEN NULL ELSE (
            SELECT jsonb_build_object(
                'id',           r.id,
                'title',        r.title,
                'total_points', r.total_points,
                'criteria', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          rc.id,
                            'title',       rc.title,
                            'description', rc.description,
                            'max_points',  rc.max_points,
                            'sequence',    rc.sequence
                        )
                        ORDER BY rc.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.rubric_criteria rc
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                )
            )
            FROM public.rubrics r
            WHERE r.id = v_rubric_id AND r.deleted_at IS NULL
        ) END
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_assistant_context(p_active_role text, p_section_id uuid DEFAULT NULL::uuid, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[];
    v_role TEXT;
    v_insight JSONB;
    v_dashboard JSONB;
    v_section JSONB;
    v_profile JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to use the assistant.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    SELECT held.code
    INTO v_role
    FROM unnest(v_roles) AS held(code)
    WHERE lower(btrim(held.code)) = lower(btrim(coalesce(p_active_role, '')))
    LIMIT 1;

    IF v_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You do not currently hold the selected role.'
        );
    END IF;

    SELECT jsonb_build_object(
               'full_name', btrim(coalesce(u.preferred_name, u.first_name) || ' ' || u.last_name),
               'email', u.email
           )
    INTO v_profile
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL;

    IF v_role = 'Student' THEN
        BEGIN
            v_insight := public.fn_get_student_insight(NULL, p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_insight := NULL;
        END;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'student_advising',
            'active_role', v_role,
            'profile', v_profile,
            'insight', v_insight
        );
    END IF;

    IF v_role = 'Faculty' THEN
        BEGIN
            v_dashboard := public.fn_get_faculty_dashboard(p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_dashboard := NULL;
        END;

        IF p_section_id IS NOT NULL THEN
            BEGIN
                v_section := public.fn_get_section_insight(p_section_id);
            EXCEPTION
                WHEN OTHERS THEN
                    v_section := NULL;
            END;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'faculty_advising',
            'active_role', v_role,
            'profile', v_profile,
            'dashboard', v_dashboard,
            'section', v_section
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mode', 'howto',
        'active_role', v_role,
        'profile', v_profile
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_attendance_records(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT ase.section_id
    INTO v_section_id
    FROM public.attendance_sessions ase
    WHERE ase.id = p_session_id
    AND ase.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_can_access_section_staff(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            ar.id,
                'enrollment_id', ar.enrollment_id,
                'student_number', st.student_number,
                'full_name',     u.first_name || ' ' || u.last_name,
                'status',        ar.status,
                'remarks',       ar.remarks
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.attendance_records ar
        INNER JOIN public.enrollments e ON e.id = ar.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE ar.attendance_session_id = p_session_id
        AND ar.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_attendance_summary(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total    INTEGER;
  v_present  INTEGER;
  v_absent   INTEGER;
  v_late     INTEGER;
  v_excused  INTEGER;
BEGIN
    PERFORM public.fn_assert_enrollment_access(p_enrollment_id);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ar.status = 'Present'),
    COUNT(*) FILTER (WHERE ar.status = 'Absent'),
    COUNT(*) FILTER (WHERE ar.status = 'Late'),
    COUNT(*) FILTER (WHERE ar.status = 'Excused')
  INTO v_total, v_present, v_absent, v_late, v_excused
  FROM public.attendance_records ar
  WHERE ar.enrollment_id = p_enrollment_id
    AND ar.deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id',      p_enrollment_id,
    'total_sessions',     v_total,
    'present',            v_present,
    'absent',             v_absent,
    'late',               v_late,
    'excused',            v_excused,
    'attendance_rate',    CASE WHEN v_total > 0
                            THEN ROUND(((v_present + v_late + v_excused)::NUMERIC / v_total) * 100, 2)
                            ELSE 0 END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_audit_log_tables()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', t.table_name, 'value', t.table_name) ORDER BY t.table_name), '[]'::JSONB)
        FROM (
            SELECT DISTINCT gal.table_name
            FROM public.grade_audit_logs gal
            WHERE gal.deleted_at IS NULL
        ) t
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_auth_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_profile jsonb;
    v_roles jsonb;
    v_role_codes text[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to load your session.'
            USING ERRCODE = '28000';
    END IF;

    SELECT to_jsonb(p) INTO v_profile
    FROM (
        SELECT u.id,
               u.first_name,
               u.middle_name,
               u.last_name,
               u.suffix,
               u.preferred_name,
               u.email,
               u.mobile_number,
               u.avatar_url,
               u.status
        FROM public.users u
        WHERE u.id = v_user_id
          AND u.deleted_at IS NULL
    ) p;

    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT coalesce(
               jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'code', r.code, 'label', r.label)),
               '[]'::jsonb
           ),
           coalesce(array_agg(DISTINCT r.code), ARRAY[]::text[])
    INTO v_roles, v_role_codes
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = v_user_id
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'profile', v_profile,
        'roles', v_roles,
        'role_codes', to_jsonb(v_role_codes)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_competency_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', cm.id,
        'program_id', cm.program_id,
        'program_code', p.code,
        'program_name', p.name,
        'course_id', cm.course_id,
        'course_code', c.code,
        'course_title', c.title,
        'scope', CASE WHEN cm.course_id IS NOT NULL THEN 'Course' ELSE 'Program' END,
        'code', cm.code,
        'title', cm.title,
        'description', cm.description,
        'bloom_level', cm.bloom_level,
        'sort_order', cm.sort_order,
        'is_active', cm.is_active
    )
    INTO v_result
    FROM public.competencies cm
    LEFT JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
    LEFT JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
    WHERE cm.id = p_id
      AND cm.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_course_by_id(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_prerequisites JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'title', c.title,
        'description', c.description,
        'department_id', c.department_id,
        'course_type_id', c.course_type_id,
        'lecture_units', c.lecture_units,
        'laboratory_units', c.laboratory_units,
        'total_units', c.total_units,
        'credit_hours', c.credit_hours,
        'is_active', c.is_active
    )
    INTO v_result
    FROM public.courses c
    WHERE c.id = p_course_id
    AND c.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'course_id', COALESCE(cp.prerequisite_id::TEXT, ''),
            'prerequisite_type', cp.prerequisite_type::TEXT,
            'prerequisite_kind', cp.prerequisite_kind,
            'year_level_required', COALESCE(cp.year_level_required::TEXT, ''),
            'minimum_grade', COALESCE(cp.minimum_grade::TEXT, '')
        )
        ORDER BY cp.created_at ASC
    ), '[]'::JSONB)
    INTO v_prerequisites
    FROM public.course_prerequisites cp
    WHERE cp.course_id = p_course_id
    AND cp.deleted_at IS NULL;

    RETURN v_result || jsonb_build_object('prerequisites', v_prerequisites);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_course_competencies(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.sort_order, t.code), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            cm.id,
            cm.code,
            cm.title,
            cm.description,
            cm.bloom_level,
            cm.sort_order
        FROM public.competencies cm
        WHERE cm.course_id = p_course_id
          AND cm.is_active
          AND cm.deleted_at IS NULL
    ) t;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_course_type_by_id(p_course_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', ct.id,
        'code', ct.code,
        'label', ct.label,
        'description', ct.description
    )
    INTO v_result
    FROM public.course_types ct
    WHERE ct.id = p_course_type_id
    AND ct.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_course_types()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ct.id,
                'code', ct.code,
                'label', ct.label
            )
            ORDER BY ct.label ASC
        ), '[]'::jsonb)
        FROM public.course_types ct
        WHERE ct.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_courses(p_exclude_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'label', c.code || ' — ' || c.title
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_curriculum_audit(p_student_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_student JSONB;
    v_program JSONB;
    v_program_id UUID;
    v_required_units NUMERIC(8,2);
    v_earned_units NUMERIC(8,2) := 0;
    v_in_progress_units NUMERIC(8,2) := 0;
    v_cumulative_gwa NUMERIC(5,2);
    v_completed INTEGER := 0;
    v_failed INTEGER := 0;
    v_in_progress INTEGER := 0;
    v_total_courses INTEGER := 0;
    v_year_levels JSONB;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);

    SELECT
        jsonb_build_object(
            'id', s.id,
            'student_number', s.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'year_level', s.year_level,
            'status', s.status,
            'admitted_at', s.admitted_at
        ),
        s.program_id
    INTO v_student, v_program_id
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This student is not assigned to a program yet.'
        );
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'total_units', p.total_units,
        'years_duration', p.years_duration
    )
    INTO v_program
    FROM public.programs p
    WHERE p.id = v_program_id
      AND p.deleted_at IS NULL;

    WITH attempts AS (
        SELECT * FROM public.fn_student_course_grades(v_student_id)
    ),
    best_attempt AS (
        SELECT DISTINCT ON (a.course_id)
            a.course_id,
            a.term_id,
            a.grade,
            a.special_grade,
            a.is_released,
            a.is_passing,
            a.enrollment_status
        FROM attempts a
        ORDER BY
            a.course_id,
            (a.is_passing IS TRUE) DESC,
            a.is_released DESC,
            a.grade ASC NULLS LAST
    ),
    requirements AS (
        SELECT
            c.total_units AS units,
            CASE
                WHEN b.course_id IS NULL THEN 'Not Taken'
                WHEN b.is_passing IS TRUE THEN 'Completed'
                WHEN b.is_released AND b.is_passing IS FALSE THEN 'Failed'
                WHEN b.enrollment_status = 'Enrolled' THEN 'In Progress'
                ELSE 'Not Taken'
            END AS status
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN best_attempt b ON b.course_id = cm.course_id
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
    )
    SELECT
        COALESCE(SUM(r.units) FILTER (WHERE r.status = 'Completed'), 0),
        COALESCE(SUM(r.units) FILTER (WHERE r.status = 'In Progress'), 0),
        COALESCE(SUM(r.units), 0),
        COUNT(*) FILTER (WHERE r.status = 'Completed'),
        COUNT(*) FILTER (WHERE r.status = 'Failed'),
        COUNT(*) FILTER (WHERE r.status = 'In Progress'),
        COUNT(*)
    INTO
        v_earned_units,
        v_in_progress_units,
        v_required_units,
        v_completed,
        v_failed,
        v_in_progress,
        v_total_courses
    FROM requirements r;

    WITH attempts AS (
        SELECT * FROM public.fn_student_course_grades(v_student_id)
    ),
    best_attempt AS (
        SELECT DISTINCT ON (a.course_id)
            a.course_id,
            a.term_id,
            a.grade,
            a.special_grade,
            a.is_released,
            a.is_passing,
            a.enrollment_status
        FROM attempts a
        ORDER BY
            a.course_id,
            (a.is_passing IS TRUE) DESC,
            a.is_released DESC,
            a.grade ASC NULLS LAST
    ),
    requirements AS (
        SELECT
            cm.id AS curriculum_map_id,
            cm.year_level,
            cm.sequence,
            cm.is_elective,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units AS units,
            cm.term_type_id AS term_type_id,
            COALESCE(tt.label, 'Unassigned') AS term_type_label,
            COALESCE(tt.sequence, 99) AS term_type_sequence,
            b.grade,
            b.special_grade,
            CASE
                WHEN b.course_id IS NULL THEN 'Not Taken'
                WHEN b.is_passing IS TRUE THEN 'Completed'
                WHEN b.is_released AND b.is_passing IS FALSE THEN 'Failed'
                WHEN b.enrollment_status = 'Enrolled' THEN 'In Progress'
                ELSE 'Not Taken'
            END AS status,
            CASE
                WHEN b.is_released THEN tt2.label || ' - ' || sy.label
                ELSE NULL
            END AS taken_label
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN best_attempt b ON b.course_id = cm.course_id
        LEFT JOIN public.terms t ON t.id = b.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt2 ON tt2.id = t.term_type_id AND tt2.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
    ),
    grouped_terms AS (
        SELECT
            r.year_level,
            r.term_type_id,
            r.term_type_label,
            r.term_type_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'curriculum_map_id', r.curriculum_map_id,
                    'course_id', r.course_id,
                    'course_code', r.course_code,
                    'course_title', r.course_title,
                    'units', r.units,
                    'is_elective', r.is_elective,
                    'status', r.status,
                    'grade', r.grade,
                    'special_grade', r.special_grade,
                    'taken_label', r.taken_label
                )
                ORDER BY r.sequence, r.course_code
            ) AS courses
        FROM requirements r
        GROUP BY r.year_level, r.term_type_id, r.term_type_label, r.term_type_sequence
    ),
    grouped_years AS (
        SELECT
            gt.year_level,
            jsonb_agg(
                jsonb_build_object(
                    'term_type_id', gt.term_type_id,
                    'term_type_label', gt.term_type_label,
                    'courses', gt.courses
                )
                ORDER BY gt.term_type_sequence
            ) AS terms
        FROM grouped_terms gt
        GROUP BY gt.year_level
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'year_level', gy.year_level,
                'terms', gy.terms
            )
            ORDER BY gy.year_level
        ),
        '[]'::jsonb
    )
    INTO v_year_levels
    FROM grouped_years gy;

    SELECT ROUND(
        SUM(a.grade * a.units) / NULLIF(SUM(a.units), 0),
        2
    )
    INTO v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released
      AND a.grade IS NOT NULL
      AND a.special_grade IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'student', v_student,
        'program', v_program,
        'summary', jsonb_build_object(
            'required_units', v_required_units,
            'earned_units', v_earned_units,
            'in_progress_units', v_in_progress_units,
            'remaining_units', GREATEST(v_required_units - v_earned_units - v_in_progress_units, 0),
            'completion_pct', CASE
                WHEN v_required_units > 0
                    THEN ROUND((v_earned_units / v_required_units) * 100, 2)
                ELSE 0
            END,
            'total_courses', v_total_courses,
            'completed_courses', v_completed,
            'failed_courses', v_failed,
            'in_progress_courses', v_in_progress,
            'cumulative_gwa', v_cumulative_gwa
        ),
        'year_levels', v_year_levels
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_curriculum_map(p_program_id uuid, p_school_year_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', cm.id,
                'course_id', cm.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'year_level', cm.year_level,
                'term_type_id', cm.term_type_id,
                'term_type_label', tt.label,
                'term_type_code', tt.code,
                'term_type_sequence', tt.sequence,
                'school_year_id', cm.school_year_id,
                'sequence', cm.sequence,
                'is_elective', cm.is_elective,
                'prerequisites', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'code', CASE
                                WHEN cp.prerequisite_kind = 'standing'
                                THEN 'Year ' || cp.year_level_required || ' Standing'
                                ELSE pc.code
                            END
                        )
                        ORDER BY cp.prerequisite_kind ASC, pc.code ASC
                    ), '[]'::JSONB)
                    FROM public.course_prerequisites cp
                    LEFT JOIN public.courses pc ON pc.id = cp.prerequisite_id AND pc.deleted_at IS NULL
                    WHERE cp.course_id = cm.course_id
                    AND cp.deleted_at IS NULL
                )
            )
            ORDER BY cm.year_level ASC, tt.sequence ASC, cm.sequence ASC
        ), '[]'::JSONB)
        FROM public.curriculum_maps cm
        JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        WHERE cm.program_id = p_program_id
        AND cm.deleted_at IS NULL
        AND (p_school_year_id IS NULL OR cm.school_year_id = p_school_year_id)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_dean_dashboard(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_term JSONB;
    v_conflicts JSONB;
    v_enrollment_ids UUID[];
    v_stats JSONB;
    v_unassigned JSONB;
    v_at_risk_sections JSONB;
    v_program_distribution JSONB;
    v_at_risk_total INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_conflicts := public.fn_list_schedule_conflicts(v_term_id);

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.deleted_at IS NULL
      AND e.status = 'Enrolled'
      AND s.term_id = v_term_id;

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'total_departments', (
            SELECT COUNT(*)
            FROM public.departments d
            WHERE d.deleted_at IS NULL
        ),
        'total_programs', (
            SELECT COUNT(*)
            FROM public.programs p
            WHERE p.deleted_at IS NULL
        ),
        'total_courses', (
            SELECT COUNT(*)
            FROM public.courses c
            WHERE c.deleted_at IS NULL
        ),
        'total_faculty', (
            SELECT COUNT(DISTINCT ur.user_id)
            FROM public.user_roles ur
            INNER JOIN public.roles ro ON ro.id = ur.role_id AND ro.deleted_at IS NULL
            WHERE ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
              AND ro.code = 'Faculty'
        ),
        'sections_this_term', (
            SELECT COUNT(*)
            FROM public.sections s
            WHERE s.deleted_at IS NULL
              AND s.term_id = v_term_id
        ),
        'unassigned_sections', (
            SELECT COUNT(*)
            FROM public.sections s
            WHERE s.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND s.faculty_id IS NULL
        ),
        'enrolled_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
        ),
        'schedule_conflicts',
            COALESCE((v_conflicts->>'faculty_conflict_count')::INTEGER, 0)
            + COALESCE((v_conflicts->>'room_conflict_count')::INTEGER, 0),
        'at_risk_students', COALESCE(v_at_risk_total, 0)
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'course_code', x->>'section_code'), '[]'::JSONB)
    INTO v_unassigned
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'enrolled_count', (
                SELECT COUNT(*)
                FROM public.enrollments e
                WHERE e.section_id = s.id
                  AND e.deleted_at IS NULL
                  AND e.status = 'Enrolled'
            )
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
          AND s.term_id = v_term_id
          AND s.faculty_id IS NULL
        LIMIT 8
    ) unassigned;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'at_risk_count')::INTEGER DESC, x->>'section_code'), '[]'::JSONB)
    INTO v_at_risk_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'faculty_name', CASE
                WHEN fu.id IS NULL THEN NULL
                ELSE fu.first_name || ' ' || fu.last_name
            END,
            'enrolled_count', COUNT(r.enrollment_id),
            'at_risk_count', COUNT(*) FILTER (WHERE r.is_at_risk),
            'avg_score_pct', ROUND(AVG(r.avg_score_pct), 2)
        ) AS x
        FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
        INNER JOIN public.sections s ON s.id = r.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
        GROUP BY s.id, s.section_code, c.code, fu.id, fu.first_name, fu.last_name
        HAVING COUNT(*) FILTER (WHERE r.is_at_risk) > 0
        ORDER BY COUNT(*) FILTER (WHERE r.is_at_risk) DESC
        LIMIT 5
    ) at_risk;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'student_count')::INTEGER DESC), '[]'::JSONB)
    INTO v_program_distribution
    FROM (
        SELECT jsonb_build_object(
            'program_code', p.code,
            'program_name', p.name,
            'student_count', COUNT(DISTINCT e.student_id)
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
          AND e.status = 'Enrolled'
          AND s.term_id = v_term_id
        GROUP BY p.id, p.code, p.name
        ORDER BY COUNT(DISTINCT e.student_id) DESC
        LIMIT 6
    ) distribution;

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'unassigned_sections', v_unassigned,
        'at_risk_sections', v_at_risk_sections,
        'program_distribution', v_program_distribution
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_deans_list(p_term_id uuid, p_min_gwa numeric DEFAULT 1.75)
 RETURNS TABLE(student_id uuid, student_number text, full_name text, program_code text, program_name text, gwa numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  RETURN QUERY
  WITH student_gwas AS (
    SELECT
      e.student_id                                              AS sid,
      ROUND(
        SUM(
          COALESCE(sfg.transmuted_grade, sfg.final_grade) * c.total_units
        ) / NULLIF(SUM(c.total_units), 0),
        4
      )                                                         AS computed_gwa,
      SUM(c.total_units)                                        AS units
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e     ON e.id   = sfg.enrollment_id
    INNER JOIN public.sections sec      ON sec.id  = e.section_id
    INNER JOIN public.courses c         ON c.id    = sec.course_id
    WHERE sec.term_id     = p_term_id
      AND sfg.status      = 'Released'
      AND e.deleted_at    IS NULL
      AND sfg.deleted_at  IS NULL
      AND c.deleted_at    IS NULL
    GROUP BY e.student_id
    HAVING SUM(c.total_units) > 0
  )
  SELECT
    st.id                                                       AS student_id,
    st.student_number                                           AS student_number,
    TRIM(u.first_name || ' ' ||
      COALESCE(u.middle_name || ' ', '') ||
      u.last_name)                                              AS full_name,
    p.code                                                      AS program_code,
    p.name                                                      AS program_name,
    sg.computed_gwa                                             AS gwa
  FROM student_gwas sg
  INNER JOIN public.students st  ON st.id  = sg.sid
  INNER JOIN public.users u      ON u.id   = st.user_id
  INNER JOIN public.programs p   ON p.id   = st.program_id
  WHERE sg.computed_gwa          <= p_min_gwa
    AND st.deleted_at            IS NULL
    AND u.deleted_at             IS NULL
    AND p.deleted_at             IS NULL
  ORDER BY sg.computed_gwa ASC;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_department_by_id(p_department_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'description', d.description,
        'head_user_id', d.head_user_id
    )
    INTO v_result
    FROM public.departments d
    WHERE d.id = p_department_id
    AND d.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_departments()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', d.id,
                'code', d.code,
                'label', d.name
            )
            ORDER BY d.name ASC
        ), '[]'::jsonb)
        FROM public.departments d
        WHERE d.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_discussion_thread(p_thread_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF NOT public.fn_can_access_section(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'id', t.id,
        'section_id', t.section_id,
        'title', t.title,
        'body', t.body,
        'is_resolved', t.is_resolved,
        'is_pinned', t.is_pinned,
        'created_at', t.created_at,
        'created_by', t.created_by,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'can_moderate', public.fn_is_section_faculty(t.section_id),
        'attachments', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', a.id,
                        'file_name', a.file_name,
                        'file_path', a.file_path,
                        'mime_type', a.mime_type,
                        'file_size', a.file_size
                    )
                    ORDER BY a.created_at
                )
                FROM public.discussion_attachments a
                WHERE a.thread_id = t.id AND a.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'posts', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'body', p.body,
                        'is_answer', p.is_answer,
                        'created_at', p.created_at,
                        'created_by', p.created_by,
                        'author_name', trim(concat(pu.first_name, ' ', pu.last_name)),
                        'attachments', COALESCE(
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'id', pa.id,
                                        'file_name', pa.file_name,
                                        'file_path', pa.file_path,
                                        'mime_type', pa.mime_type,
                                        'file_size', pa.file_size
                                    )
                                    ORDER BY pa.created_at
                                )
                                FROM public.discussion_attachments pa
                                WHERE pa.post_id = p.id AND pa.deleted_at IS NULL
                            ),
                            '[]'::jsonb
                        )
                    )
                    ORDER BY p.is_answer DESC, p.created_at
                )
                FROM public.discussion_posts p
                LEFT JOIN public.users pu ON pu.id = p.created_by
                WHERE p.thread_id = t.id AND p.deleted_at IS NULL
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.discussion_threads t
    LEFT JOIN public.users u ON u.id = t.created_by
    WHERE t.id = p_thread_id
      AND t.deleted_at IS NULL;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_by_id(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT jsonb_build_object(
        'id',         e.id,
        'student_id', e.student_id,
        'section_id', e.section_id,
        'status',     e.status
    )
    INTO v_result
    FROM public.enrollments e
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_evaluation_scope(p_enrollment_id uuid)
 RETURNS evaluation_scope_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT public.fn_get_evaluation_scope(s.term_id)
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_student_detail(p_student_id uuid, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID := p_term_id;
    v_result  JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT jsonb_build_object(
        'id', st.id,
        'student_number', st.student_number,
        'student_name', u.first_name || ' ' || u.last_name,
        'email', u.email,
        'year_level', st.year_level,
        'status', st.status,
        'admitted_at', st.admitted_at,
        'program_id', st.program_id,
        'program_code', COALESCE(p.code, '—'),
        'program_name', COALESCE(p.name, 'No program assigned'),
        'term_id', v_term_id,
        'term_label', COALESCE((
            SELECT tt.label || ' - ' || sy.label
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE t.id = v_term_id AND t.deleted_at IS NULL
        ), 'No active term'),
        'current_load', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'enrollment_id', e.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'status', e.status,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'faculty_name', COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned'),
                'schedule_label', COALESCE((
                    SELECT string_agg(
                        ss.day_of_week::TEXT || ' ' ||
                        to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                        to_char(ss.time_end, 'HH12:MI AM'),
                        ', ' ORDER BY ss.day_of_week, ss.time_start
                    )
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                ), 'No schedule set')
            ) ORDER BY c.code)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
            WHERE e.student_id = st.id
            AND e.deleted_at IS NULL
            AND e.status NOT IN ('Dropped', 'Withdrawn')
            AND s.term_id = v_term_id
        ), '[]'::JSONB)
    ) INTO v_result
    FROM public.students st
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_target_term()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT jsonb_build_object(
        'id', t.id,
        'label', tt.label || ' - ' || sy.label,
        'status', t.status
    )
    FROM public.terms t
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
    ORDER BY
        CASE t.status
            WHEN 'Enrollment Open' THEN 1
            WHEN 'Ongoing' THEN 2
            WHEN 'Upcoming' THEN 3
            ELSE 4
        END,
        abs(t.start_date - CURRENT_DATE)
    LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_form(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_context RECORD;
    v_scope public.evaluation_scope_type;
    v_resolved_period_id UUID;
    v_period_name TEXT;
    v_is_completed BOOLEAN;
    v_sections JSONB;
    v_answers JSONB;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT
        COALESCE(NULLIF(btrim(concat(u.first_name, ' ', u.last_name)), ''), 'Unassigned') AS faculty_name,
        c.code AS course_code,
        c.title AS course_title,
        s.section_code AS section_code,
        tt.label || ' - ' || sy.label AS term_label
    INTO v_context
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    v_resolved_period_id := public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id);
    v_scope := public.fn_get_enrollment_evaluation_scope(p_enrollment_id);

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = v_resolved_period_id AND gp.deleted_at IS NULL;

    IF v_period_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    IF v_scope = 'Term' THEN
        v_period_name := 'Whole Term';
    END IF;

    SELECT COALESCE(is_completed, false) INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = v_resolved_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'template_id', t.id,
            'title',       t.title,
            'description', t.description,
            'sequence',    t.sequence,
            'questions', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id',            q.id,
                        'question_text', q.question_text,
                        'question_type', q.question_type,
                        'sequence',      q.sequence,
                        'is_required',   q.is_required,
                        'min_rating',    q.min_rating,
                        'max_rating',    q.max_rating
                    )
                    ORDER BY q.sequence ASC
                )
                FROM public.evaluation_questions q
                WHERE q.template_id = t.id AND q.deleted_at IS NULL
            ), '[]'::JSONB)
        )
        ORDER BY t.sequence ASC
    ), '[]'::JSONB)
    INTO v_sections
    FROM public.fn_list_applicable_evaluation_templates(v_student_id) t;

    IF jsonb_array_length(v_sections) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available. Please contact your administrator.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'question_id',   r.question_id,
            'rating_value',  r.rating_value,
            'response_text', r.response_text
        )
    ), '[]'::JSONB)
    INTO v_answers
    FROM public.evaluation_responses r
    WHERE r.enrollment_id = p_enrollment_id
    AND r.grading_period_id = v_resolved_period_id
    AND r.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'enrollment_id',       p_enrollment_id,
        'faculty_name',        v_context.faculty_name,
        'course_code',         v_context.course_code,
        'course_title',        v_context.course_title,
        'section_code',        v_context.section_code,
        'term_label',          v_context.term_label,
        'grading_period_id',   v_resolved_period_id,
        'grading_period_name', v_period_name,
        'evaluation_scope',    v_scope::TEXT,
        'is_completed',        COALESCE(v_is_completed, false),
        'answers',             v_answers,
        'sections',            v_sections
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_scope(p_term_id uuid)
 RETURNS evaluation_scope_type
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT COALESCE(
        (
            SELECT t.evaluation_scope
            FROM public.terms t
            WHERE t.id = p_term_id AND t.deleted_at IS NULL
        ),
        (
            SELECT ss.default_evaluation_scope
            FROM public.system_settings ss
            WHERE ss.deleted_at IS NULL
            ORDER BY ss.created_at ASC
            LIMIT 1
        ),
        'Period'::public.evaluation_scope_type
    );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_template_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id',          t.id,
        'title',       t.title,
        'description', t.description,
        'is_active',   t.is_active,
        'sequence',    t.sequence,
        'program_ids', COALESCE((
            SELECT jsonb_agg(tp.program_id)
            FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        ), '[]'::JSONB),
        'questions', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id',            q.id,
                    'question_text', q.question_text,
                    'question_type', q.question_type,
                    'sequence',      q.sequence,
                    'is_required',   q.is_required,
                    'min_rating',    q.min_rating,
                    'max_rating',    q.max_rating
                )
                ORDER BY q.sequence ASC
            )
            FROM public.evaluation_questions q
            WHERE q.template_id = t.id AND q.deleted_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.evaluation_templates t
    WHERE t.id = p_id AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_templates()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',          t.id,
                'title',       t.title,
                'description', t.description,
                'is_active',   t.is_active,
                'sequence',    t.sequence,
                'program_ids', COALESCE((
                    SELECT jsonb_agg(tp.program_id)
                    FROM public.evaluation_template_programs tp
                    WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
                ), '[]'::JSONB),
                'questions', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id',            q.id,
                            'question_text', q.question_text,
                            'question_type', q.question_type,
                            'sequence',      q.sequence,
                            'is_required',   q.is_required,
                            'min_rating',    q.min_rating,
                            'max_rating',    q.max_rating
                        )
                        ORDER BY q.sequence ASC
                    )
                    FROM public.evaluation_questions q
                    WHERE q.template_id = t.id AND q.deleted_at IS NULL
                ), '[]'::JSONB)
            )
            ORDER BY t.sequence ASC, t.created_at ASC
        )
        FROM public.evaluation_templates t
        WHERE t.deleted_at IS NULL
    ), '[]'::JSONB);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_event_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'location', e.location,
        'target_audience', e.target_audience,
        'start_at', e.start_at,
        'end_at', e.end_at,
        'all_day', e.all_day,
        'created_at', e.created_at,
        'created_by', e.created_by,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'section_ids', COALESCE(
            (
                SELECT jsonb_agg(esx.section_id ORDER BY esx.created_at)
                FROM public.event_sections esx
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'sections', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object('id', s.id, 'code', s.section_code, 'course_code', c.code)
                    ORDER BY s.section_code
                )
                FROM public.event_sections esx
                JOIN public.sections s ON s.id = esx.section_id AND s.deleted_at IS NULL
                LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.events e
    LEFT JOIN public.users u ON u.id = e.created_by
    WHERE e.id = p_id
      AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_dashboard(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty_id UUID;
    v_term_id UUID;
    v_term JSONB;
    v_section_ids UUID[];
    v_enrollment_ids UUID[];
    v_stats JSONB;
    v_sections JSONB;
    v_pending_grading JSONB;
    v_todays_classes JSONB;
    v_at_risk_students JSONB;
    v_at_risk_total INTEGER;
    v_today public.day_of_week_type;
BEGIN
    PERFORM public.fn_assert_role('Faculty', 'Admin');

    v_faculty_id := auth.uid();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_faculty_term(v_faculty_id));
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_today := to_char(now() AT TIME ZONE 'Asia/Manila', 'FMDay')::public.day_of_week_type;

    SELECT COALESCE(array_agg(s.id), ARRAY[]::UUID[])
    INTO v_section_ids
    FROM public.sections s
    WHERE s.deleted_at IS NULL
      AND s.faculty_id = v_faculty_id
      AND s.term_id = v_term_id;

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn')
      AND e.section_id = ANY (v_section_ids);

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'my_sections', COALESCE(array_length(v_section_ids, 1), 0),
        'total_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            WHERE e.deleted_at IS NULL
              AND e.status NOT IN ('Dropped', 'Withdrawn')
              AND e.section_id = ANY (v_section_ids)
        ),
        'at_risk_students', COALESCE(v_at_risk_total, 0),
        'pending_grading', (
            SELECT COUNT(*)
            FROM public.assessment_submissions sub
            INNER JOIN public.assessment_items ai
                ON ai.id = sub.assessment_item_id
                AND ai.deleted_at IS NULL
            WHERE sub.deleted_at IS NULL
              AND ai.section_id = ANY (v_section_ids)
              AND sub.status IN ('Submitted', 'Late')
        ),
        'published_assessments', (
            SELECT COUNT(*)
            FROM public.assessment_items ai
            WHERE ai.deleted_at IS NULL
              AND ai.is_published
              AND ai.section_id = ANY (v_section_ids)
        ),
        'sessions_today', (
            SELECT COUNT(*)
            FROM public.section_schedules sch
            WHERE sch.deleted_at IS NULL
              AND sch.section_id = ANY (v_section_ids)
              AND sch.day_of_week = v_today
        )
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'course_code', x->>'section_code'), '[]'::JSONB)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'room', s.room,
            'enrolled_count', COALESCE(agg.enrolled_count, 0),
            'at_risk_count', COALESCE(agg.at_risk_count, 0),
            'avg_score_pct', agg.avg_score_pct
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                r.section_id,
                COUNT(*) AS enrolled_count,
                COUNT(*) FILTER (WHERE r.is_at_risk) AS at_risk_count,
                ROUND(AVG(r.avg_score_pct), 2) AS avg_score_pct
            FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
            GROUP BY r.section_id
        ) agg ON agg.section_id = s.id
        WHERE s.id = ANY (v_section_ids)
    ) my_sections;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'ungraded_count')::INTEGER DESC, x->>'title'), '[]'::JSONB)
    INTO v_pending_grading
    FROM (
        SELECT jsonb_build_object(
            'assessment_id', ai.id,
            'section_id', ai.section_id,
            'title', ai.title,
            'assessment_type', ai.assessment_type::TEXT,
            'section_code', s.section_code,
            'course_code', c.code,
            'due_at', ai.due_at,
            'ungraded_count', COUNT(*)
        ) AS x
        FROM public.assessment_submissions sub
        INNER JOIN public.assessment_items ai
            ON ai.id = sub.assessment_item_id
            AND ai.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE sub.deleted_at IS NULL
          AND ai.section_id = ANY (v_section_ids)
          AND sub.status IN ('Submitted', 'Late')
        GROUP BY ai.id, ai.section_id, ai.title, ai.assessment_type, s.section_code, c.code, ai.due_at
        ORDER BY COUNT(*) DESC
        LIMIT 8
    ) pending;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'time_start'), '[]'::JSONB)
    INTO v_todays_classes
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'time_start', sch.time_start,
            'time_end', sch.time_end,
            'room', COALESCE(sch.room, s.room)
        ) AS x
        FROM public.section_schedules sch
        INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE sch.deleted_at IS NULL
          AND sch.section_id = ANY (v_section_ids)
          AND sch.day_of_week = v_today
    ) today;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'risk_score')::NUMERIC DESC), '[]'::JSONB)
    INTO v_at_risk_students
    FROM (
        SELECT jsonb_build_object(
            'student_id', r.student_id,
            'enrollment_id', r.enrollment_id,
            'section_id', r.section_id,
            'student_number', st.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'section_code', s.section_code,
            'course_code', c.code,
            'avg_score_pct', r.avg_score_pct,
            'attendance_rate', r.attendance_rate,
            'missing_count', r.missing_count,
            'risk_score', r.risk_score,
            'risk_level', r.risk_level
        ) AS x
        FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
        INNER JOIN public.students st ON st.id = r.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = r.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE r.is_at_risk
        ORDER BY r.risk_score DESC
        LIMIT 8
    ) at_risk;

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'sections', v_sections,
        'pending_grading', v_pending_grading,
        'todays_classes', v_todays_classes,
        'at_risk_students', v_at_risk_students
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_load_detail(p_faculty_id uuid, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty  JSONB;
    v_sections JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT jsonb_build_object(
        'id', u.id,
        'faculty_name', u.first_name || ' ' || u.last_name,
        'email', u.email
    )
    INTO v_faculty
    FROM public.users u
    WHERE u.id = p_faculty_id
      AND u.deleted_at IS NULL;

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty member not found.');
    END IF;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'section_code'), '[]'::JSONB)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'term_label', tt.label || ' - ' || sy.label,
            'units', c.total_units,
            'enrolled_count', (
                SELECT COUNT(*)
                FROM public.enrollments e
                WHERE e.section_id = s.id
                  AND e.deleted_at IS NULL
                  AND e.status = 'Enrolled'::public.enrollment_status_type
            ),
            'schedules', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'day_of_week', sch.day_of_week::TEXT,
                    'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                    'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                    'room', COALESCE(sch.room, s.room, '')
                ) ORDER BY sch.day_of_week, sch.time_start)
                FROM public.section_schedules sch
                WHERE sch.section_id = s.id
                  AND sch.deleted_at IS NULL
            ), '[]'::JSONB)
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.faculty_id = p_faculty_id
          AND s.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
    ) sections;

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'sections', v_sections
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_grade_report(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT jsonb_agg(
    jsonb_build_object(
      'grading_period_id',   sfg.grading_period_id,
      'grading_period_name', gp.name,
      'grading_period_seq',  gp.sequence,
      'raw_grade',           sfg.raw_grade,
      'final_grade',         sfg.final_grade,
      'transmuted_grade',    sfg.transmuted_grade,
      'status',              sfg.status,
      'remarks',             sfg.remarks,
      'approved_at',         sfg.approved_at,
      'released_at',         sfg.released_at,
      'is_grade_visible',    e.is_grade_visible,
      'components', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'component_name',   gc.name,
            'weight',           gc.weight,
            'earned_score',     COALESCE(SUM(asub.final_score), 0),
            'total_points',     COALESCE(SUM(ai.total_points),  0)
          )
        )
        FROM public.grading_components gc
        LEFT JOIN public.assessment_items ai
          ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
        LEFT JOIN public.assessment_submissions asub
          ON asub.assessment_item_id = ai.id
          AND asub.enrollment_id     = p_enrollment_id
          AND asub.status            = 'Graded'
          AND asub.deleted_at        IS NULL
        WHERE gc.section_id        = e.section_id
          AND gc.grading_period_id = sfg.grading_period_id
          AND gc.deleted_at        IS NULL
        GROUP BY gc.id, gc.name, gc.weight
      )
    )
    ORDER BY gp.sequence
  )
  INTO v_result
  FROM public.section_final_grades sfg
  INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id
  INNER JOIN public.enrollments e      ON e.id  = sfg.enrollment_id
  WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.deleted_at    IS NULL
    AND gp.deleted_at     IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'grades',        COALESCE(v_result, '[]'::jsonb)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_grading_config()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', gc.id,
        'passing_grade', gc.passing_grade,
        'max_absence_percentage', gc.max_absence_percentage
    )
    INTO v_result
    FROM public.grading_config gc
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading config not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_grading_period_templates()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gpt.id,
                'name', gpt.name,
                'sequence', gpt.sequence,
                'weight', gpt.weight,
                'components', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', gct.id,
                            'name', gct.name,
                            'weight', gct.weight
                        )
                        ORDER BY gct.name ASC
                    ), '[]'::jsonb)
                    FROM public.grading_component_templates gct
                    WHERE gct.grading_period_template_id = gpt.id
                    AND gct.deleted_at IS NULL
                )
            )
            ORDER BY gpt.sequence ASC
        ), '[]'::jsonb)
        FROM public.grading_period_templates gpt
        WHERE gpt.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_my_assessment_result(p_enrollment_id uuid, p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_student_id UUID;
    v_submission RECORD;
    v_item RECORD;
    v_results_available BOOLEAN;
    v_review_available BOOLEAN;
    v_review_blocked_reason TEXT := NULL;
    v_window_over BOOLEAN;
    v_rubric_id UUID;
    v_result JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = v_uid AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT ai.id, ai.title, ai.description, ai.assessment_type, ai.total_points,
           ai.passing_points, ai.show_results_at, ai.max_attempts, ai.use_rubric_scoring,
           ai.allow_student_review, ai.opens_at, ai.due_at, ai.closes_at,
           gp.name AS grading_period_name
    INTO v_item
    FROM public.assessment_items ai
    INNER JOIN public.enrollments e ON e.section_id = ai.section_id
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.id = p_assessment_id
    AND e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND ai.deleted_at IS NULL
    AND e.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    IF v_item.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    SELECT asub.id, asub.status, asub.attempt_number, asub.submitted_at, asub.graded_at,
           asub.is_late, asub.raw_score, asub.final_score, asub.feedback
    INTO v_submission
    FROM public.assessment_submissions asub
    WHERE asub.assessment_item_id = p_assessment_id
    AND asub.enrollment_id = p_enrollment_id
    AND asub.deleted_at IS NULL
    ORDER BY asub.attempt_number DESC
    LIMIT 1;

    v_window_over := (v_item.closes_at IS NOT NULL AND v_item.closes_at <= now())
        OR (v_item.closes_at IS NULL AND v_item.due_at IS NOT NULL AND v_item.due_at <= now());

    IF v_submission.id IS NULL THEN
        v_results_available := v_item.show_results_at IS NOT NULL AND v_item.show_results_at <= now();
    ELSE
        v_results_available := v_submission.status IN ('Graded', 'Returned')
            AND (v_item.show_results_at IS NULL OR v_item.show_results_at <= now());
    END IF;

    v_review_available := COALESCE(v_item.allow_student_review, true);

    IF NOT v_review_available THEN
        v_review_blocked_reason := 'Your instructor has turned off question review for this assessment.';
    ELSIF v_submission.id IS NOT NULL AND v_submission.status = 'In Progress' THEN
        v_review_available := false;
        v_review_blocked_reason := 'Finish and submit your current attempt to review this assessment.';
    ELSIF v_submission.id IS NULL AND NOT v_window_over THEN
        v_review_available := false;
        v_review_blocked_reason := 'Questions open for review once the assessment closes.';
    END IF;

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_item_rubrics air
    WHERE air.assessment_item_id = p_assessment_id AND air.deleted_at IS NULL
    LIMIT 1;

    v_result := jsonb_build_object(
        'submission_id',         v_submission.id,
        'assessment_id',         v_item.id,
        'title',                 v_item.title,
        'description',           v_item.description,
        'assessment_type',       v_item.assessment_type,
        'grading_period_name',   v_item.grading_period_name,
        'has_submission',        v_submission.id IS NOT NULL,
        'status',                v_submission.status,
        'attempt_number',        v_submission.attempt_number,
        'max_attempts',          v_item.max_attempts,
        'submitted_at',          v_submission.submitted_at,
        'graded_at',             v_submission.graded_at,
        'is_late',               COALESCE(v_submission.is_late, false),
        'total_points',          v_item.total_points,
        'passing_points',        v_item.passing_points,
        'question_count', (
            SELECT COUNT(*)
            FROM public.assessment_questions aq
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        ),
        'opens_at',              v_item.opens_at,
        'due_at',                v_item.due_at,
        'closes_at',             v_item.closes_at,
        'show_results_at',       v_item.show_results_at,
        'results_available',     v_results_available,
        'review_available',      v_review_available,
        'review_blocked_reason', v_review_blocked_reason,
        'use_rubric_scoring',    COALESCE(v_item.use_rubric_scoring, false),
        'raw_score',             CASE WHEN v_results_available THEN v_submission.raw_score ELSE NULL END,
        'final_score',           CASE WHEN v_results_available THEN v_submission.final_score ELSE NULL END,
        'feedback',              CASE WHEN v_results_available THEN v_submission.feedback ELSE NULL END,
        'attachments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              aa.id,
                    'file_name',       aa.file_name,
                    'file_url',        aa.file_url,
                    'file_size_bytes', aa.file_size_bytes,
                    'mime_type',       aa.mime_type,
                    'sequence',        aa.sequence
                )
                ORDER BY aa.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_attachments aa
            WHERE aa.assessment_item_id = p_assessment_id AND aa.deleted_at IS NULL
        ),
        'rubric', CASE WHEN v_rubric_id IS NULL OR NOT v_review_available THEN NULL ELSE (
            SELECT jsonb_build_object(
                'title',        r.title,
                'total_points', r.total_points,
                'criteria', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',            rc.id,
                            'title',         rc.title,
                            'description',   rc.description,
                            'max_points',    rc.max_points,
                            'sequence',      rc.sequence,
                            'points_earned', CASE WHEN v_results_available THEN re.points_earned ELSE NULL END,
                            'feedback',      CASE WHEN v_results_available THEN re.feedback ELSE NULL END
                        )
                        ORDER BY rc.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.rubric_criteria rc
                    LEFT JOIN public.rubric_evaluations re
                        ON re.criteria_id = rc.id
                        AND re.submission_id = v_submission.id
                        AND re.deleted_at IS NULL
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                )
            )
            FROM public.rubrics r
            WHERE r.id = v_rubric_id AND r.deleted_at IS NULL
        ) END,
        'answers', CASE WHEN NOT v_review_available THEN '[]'::JSONB ELSE (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',               aq.id,
                    'question_text',    aq.question_text,
                    'question_type',    aq.question_type,
                    'points',           aq.points,
                    'sequence',         aq.sequence,
                    'explanation',      CASE WHEN v_results_available THEN aq.explanation ELSE NULL END,
                    'answer_text',      sa.answer_text,
                    'choice_id',        sa.choice_id,
                    'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb),
                    'points_earned',    CASE WHEN v_results_available THEN sa.points_earned ELSE NULL END,
                    'is_correct',       CASE WHEN v_results_available THEN sa.is_correct ELSE NULL END,
                    'grader_notes',     CASE WHEN v_results_available THEN sa.grader_notes ELSE NULL END,
                    'choices', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',          aqc.id,
                                'choice_text', aqc.choice_text,
                                'sequence',    aqc.sequence,
                                'is_correct',  CASE WHEN v_results_available THEN aqc.is_correct ELSE NULL END
                            )
                            ORDER BY aqc.sequence ASC
                        ), '[]'::jsonb)
                        FROM public.assessment_question_choices aqc
                        WHERE aqc.question_id = aq.id AND aqc.deleted_at IS NULL
                    )
                )
                ORDER BY aq.sequence ASC
            ), '[]'::jsonb)
            FROM public.assessment_questions aq
            LEFT JOIN public.student_answers sa
                ON sa.question_id = aq.id
                AND sa.submission_id = v_submission.id
                AND sa.deleted_at IS NULL
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        ) END
    );

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_my_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id           UUID;
    v_section_id           UUID;
    v_context              JSONB;
    v_period               JSONB;
    v_totals               JSONB;
    v_components           JSONB;
    v_status               TEXT;
    v_evaluation_completed BOOLEAN;
    v_total_weight         NUMERIC(8,2);
    v_passing_grade        NUMERIC(5,2);
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT
        s.id,
        jsonb_build_object(
            'enrollment_id', e.id,
            'section_id',    s.id,
            'section_code',  s.section_code,
            'course_code',   c.code,
            'course_title',  c.title,
            'term_label',    tt.label || ' - ' || sy.label,
            'faculty_name',  COALESCE(NULLIF(btrim(concat(u.first_name, ' ', u.last_name)), ''), 'Unassigned')
        )
    INTO v_section_id, v_context
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT jsonb_build_object(
        'grading_period_id',   gp.id,
        'grading_period_name', gp.name,
        'sequence',            gp.sequence,
        'weight',              gp.weight
    )
    INTO v_period
    FROM public.grading_periods gp
    INNER JOIN public.sections s ON s.term_id = gp.term_id AND s.id = v_section_id
    WHERE gp.id = p_grading_period_id
    AND gp.deleted_at IS NULL;

    IF v_period IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found for this subject.');
    END IF;

    SELECT
        sfg.status::TEXT,
        jsonb_build_object(
            'raw_grade',        sfg.raw_grade,
            'final_grade',      sfg.final_grade,
            'transmuted_grade', sfg.transmuted_grade,
            'special_grade',    sfg.special_grade,
            'status',           sfg.status
        )
    INTO v_status, v_totals
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at IS NULL;

    IF v_status IS DISTINCT FROM 'Released' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grade has not been released yet.');
    END IF;

    SELECT COALESCE(epl.is_completed, false)
    INTO v_evaluation_completed
    FROM public.evaluation_period_locks epl
    WHERE epl.enrollment_id = p_enrollment_id
    AND epl.grading_period_id = public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id)
    AND epl.deleted_at IS NULL
    LIMIT 1;

    IF NOT COALESCE(v_evaluation_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Complete the faculty evaluation to view this grade breakdown.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',              c.id,
            'name',            c.name,
            'weight',          c.weight,
            'earned_points',   c.earned_points,
            'max_points',      c.max_points,
            'percentage',      CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * 100, 2)
                ELSE NULL
            END,
            'weighted_score',  CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * c.weight, 2)
                ELSE 0
            END,
            'graded_count',    c.graded_count,
            'pending_count',   c.item_count - c.graded_count,
            'items',           c.items
        )
        ORDER BY c.name ASC
    ), '[]'::jsonb), COALESCE(SUM(c.weight), 0)
    INTO v_components, v_total_weight
    FROM (
        SELECT
            gc.id,
            gc.name,
            gc.weight,
            COALESCE(SUM(i.counted_points), 0) AS earned_points,
            COALESCE(SUM(i.counted_max), 0) AS max_points,
            COUNT(i.id) AS item_count,
            COUNT(i.id) FILTER (WHERE i.is_counted) AS graded_count,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',                i.id,
                    'title',             i.title,
                    'assessment_type',   i.assessment_type,
                    'earned_points',     i.graded_points,
                    'max_points',        i.max_points,
                    'submission_status', i.submission_status,
                    'is_late',           i.is_late,
                    'is_counted',        i.is_counted,
                    'due_at',            i.due_at,
                    'graded_at',         i.graded_at
                )
                ORDER BY i.due_at ASC NULLS LAST, i.title ASC
            ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM public.grading_components gc
        LEFT JOIN LATERAL (
            SELECT
                ai.id,
                ai.title,
                ai.assessment_type,
                ai.due_at,
                ai.total_points AS max_points,
                sub.final_score AS graded_points,
                sub.graded_at,
                latest.status AS submission_status,
                latest.is_late,
                sub.final_score IS NOT NULL AS is_counted,
                CASE WHEN sub.final_score IS NOT NULL THEN sub.final_score ELSE 0 END AS counted_points,
                CASE WHEN sub.final_score IS NOT NULL THEN ai.total_points ELSE 0 END AS counted_max
            FROM public.assessment_items ai
            LEFT JOIN LATERAL (
                SELECT asub.final_score, asub.graded_at
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.status = 'Graded'
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ) sub ON true
            LEFT JOIN LATERAL (
                SELECT asub.status, asub.is_late
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ) latest ON true
            WHERE ai.grading_component_id = gc.id
            AND ai.deleted_at IS NULL
        ) i ON true
        WHERE gc.section_id = v_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
        GROUP BY gc.id, gc.name, gc.weight
    ) c;

    SELECT gcfg.passing_grade
    INTO v_passing_grade
    FROM public.grading_config gcfg
    WHERE gcfg.deleted_at IS NULL
    ORDER BY gcfg.created_at ASC
    LIMIT 1;

    RETURN v_context
        || v_period
        || v_totals
        || jsonb_build_object(
            'components', v_components,
            'total_component_weight', v_total_weight,
            'passing_grade', v_passing_grade
        );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'middle_name', COALESCE(u.middle_name, ''),
        'last_name', u.last_name,
        'suffix', COALESCE(u.suffix, ''),
        'preferred_name', COALESCE(u.preferred_name, ''),
        'email', u.email,
        'mobile_number', COALESCE(u.mobile_number, ''),
        'address_line1', COALESCE(u.address_line1, ''),
        'address_line2', COALESCE(u.address_line2, ''),
        'city', COALESCE(u.city, ''),
        'province', COALESCE(u.province, ''),
        'postal_code', COALESCE(u.postal_code, ''),
        'date_of_birth', u.date_of_birth,
        'gender', COALESCE(u.gender::TEXT, ''),
        'civil_status', COALESCE(u.civil_status::TEXT, ''),
        'nationality', COALESCE(u.nationality, ''),
        'avatar_url', u.avatar_url,
        'status', u.status,
        'role_labels', COALESCE((
            SELECT jsonb_agg(r.label ORDER BY r.label)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.users u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_program_by_id(p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'description', p.description,
        'department_id', p.department_id,
        'program_level_id', p.program_level_id,
        'total_units', p.total_units,
        'years_duration', p.years_duration,
        'is_active', p.is_active
    )
    INTO v_result
    FROM public.programs p
    WHERE p.id = p_program_id
    AND p.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_program_level_by_id(p_program_level_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', pl.id,
        'code', pl.code,
        'label', pl.label,
        'description', pl.description
    )
    INTO v_result
    FROM public.program_levels pl
    WHERE pl.id = p_program_level_id
    AND pl.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_program_levels()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', pl.id,
                'code', pl.code,
                'label', pl.label
            )
            ORDER BY pl.label ASC
        ), '[]'::jsonb)
        FROM public.program_levels pl
        WHERE pl.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_programs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'code', p.code,
                'label', p.name
            )
            ORDER BY p.name ASC
        ), '[]'::jsonb)
        FROM public.programs p
        WHERE p.deleted_at IS NULL
        AND p.is_active = TRUE
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_question_competencies(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.code), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            cm.id AS competency_id,
            cm.code,
            cm.title,
            cm.bloom_level,
            aqc.weight
        FROM public.assessment_question_competencies aqc
        JOIN public.competencies cm ON cm.id = aqc.competency_id AND cm.deleted_at IS NULL
        WHERE aqc.question_id = p_question_id
          AND aqc.deleted_at IS NULL
    ) t;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_registrar_dashboard(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_term JSONB;
    v_stats JSONB;
    v_pending_releases JSONB;
    v_program_distribution JSONB;
    v_recent_enrollments JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);

    v_stats := jsonb_build_object(
        'active_students', (
            SELECT COUNT(*)
            FROM public.students s
            WHERE s.deleted_at IS NULL
              AND s.status = 'Active'
        ),
        'students_on_loa', (
            SELECT COUNT(*)
            FROM public.students s
            WHERE s.deleted_at IS NULL
              AND s.status = 'LOA'
        ),
        'graduated_students', (
            SELECT COUNT(*)
            FROM public.students s
            WHERE s.deleted_at IS NULL
              AND s.status = 'Graduated'
        ),
        'enrollments_this_term', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
        ),
        'dropped_this_term', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status IN ('Dropped', 'Withdrawn')
              AND s.term_id = v_term_id
        ),
        'pending_grade_releases', (
            SELECT COUNT(*)
            FROM public.section_final_grades sfg
            INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE sfg.deleted_at IS NULL
              AND sfg.status IN ('Submitted', 'Approved')
              AND s.term_id = v_term_id
        ),
        'incomplete_grades', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Incomplete'
              AND s.term_id = v_term_id
        )
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'pending_count')::INTEGER DESC, x->>'section_code'), '[]'::JSONB)
    INTO v_pending_releases
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'faculty_name', CASE
                WHEN fu.id IS NULL THEN NULL
                ELSE fu.first_name || ' ' || fu.last_name
            END,
            'pending_count', COUNT(*),
            'grading_period', gp.name
        ) AS x
        FROM public.section_final_grades sfg
        INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
        WHERE sfg.deleted_at IS NULL
          AND sfg.status IN ('Submitted', 'Approved')
          AND s.term_id = v_term_id
        GROUP BY s.id, s.section_code, c.code, c.title, fu.id, fu.first_name, fu.last_name, gp.id, gp.name
        ORDER BY COUNT(*) DESC
        LIMIT 8
    ) pending;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'student_count')::INTEGER DESC), '[]'::JSONB)
    INTO v_program_distribution
    FROM (
        SELECT jsonb_build_object(
            'program_code', p.code,
            'program_name', p.name,
            'student_count', COUNT(DISTINCT e.student_id)
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
          AND e.status = 'Enrolled'
          AND s.term_id = v_term_id
        GROUP BY p.id, p.code, p.name
        ORDER BY COUNT(DISTINCT e.student_id) DESC
        LIMIT 6
    ) distribution;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'enrolled_at' DESC), '[]'::JSONB)
    INTO v_recent_enrollments
    FROM (
        SELECT jsonb_build_object(
            'enrollment_id', e.id,
            'student_id', st.id,
            'student_number', st.student_number,
            'student_name', u.first_name || ' ' || u.last_name,
            'section_code', s.section_code,
            'course_code', c.code,
            'enrolled_at', e.enrolled_at
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
          AND e.status = 'Enrolled'
          AND s.term_id = v_term_id
        ORDER BY e.enrolled_at DESC
        LIMIT 8
    ) recent;

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'pending_releases', v_pending_releases,
        'program_distribution', v_program_distribution,
        'recent_enrollments', v_recent_enrollments
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_role_by_id(p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'label', r.label,
        'description', r.description
    )
    INTO v_result
    FROM public.roles r
    WHERE r.id = p_role_id
    AND r.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_roles()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'code', r.code,
                'label', r.label
            )
            ORDER BY r.label ASC
        )
        FROM public.roles r
        WHERE r.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_rubric(p_rubric_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_section_staff(public.fn_resolve_rubric_section(p_rubric_id));

    SELECT jsonb_build_object(
        'id',           r.id,
        'section_id',   r.section_id,
        'title',        r.title,
        'description',  r.description,
        'total_points', r.total_points,
        'is_active',    r.is_active,
        'criteria', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',          rc.id,
                    'title',       rc.title,
                    'description', rc.description,
                    'max_points',  rc.max_points,
                    'sequence',    rc.sequence
                )
                ORDER BY rc.sequence ASC
            ), '[]'::JSONB)
            FROM public.rubric_criteria rc
            WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.rubrics r
    WHERE r.id = p_rubric_id
    AND r.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_schedule_conflicts(p_student_id uuid, p_section_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT string_agg(DISTINCT conflict_label, ', ' ORDER BY conflict_label)
    FROM (
        SELECT c.code || ' (' || s.section_code || ')' AS conflict_label
        FROM public.section_schedules target_ss
        INNER JOIN public.enrollments e
            ON e.student_id = p_student_id
            AND e.section_id <> p_section_id
            AND e.status = 'Enrolled'
            AND e.deleted_at IS NULL
        INNER JOIN public.sections s
            ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.sections target_s
            ON target_s.id = p_section_id AND target_s.deleted_at IS NULL
        INNER JOIN public.courses c
            ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.section_schedules existing_ss
            ON existing_ss.section_id = s.id
            AND existing_ss.deleted_at IS NULL
            AND existing_ss.day_of_week = target_ss.day_of_week
            AND target_ss.time_start < existing_ss.time_end
            AND existing_ss.time_start < target_ss.time_end
        WHERE target_ss.section_id = p_section_id
        AND target_ss.deleted_at IS NULL
        AND s.term_id = target_s.term_id
    ) conflicts;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_school_year_by_id(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', sy.id,
        'code', sy.code,
        'label', sy.label,
        'start_date', sy.start_date,
        'end_date', sy.end_date,
        'is_active', sy.is_active
    )
    INTO v_result
    FROM public.school_years sy
    WHERE sy.id = p_school_year_id
    AND sy.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_school_years()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', sy.id,
                'code', sy.code,
                'label', sy.label
            )
            ORDER BY sy.start_date DESC
        )
        FROM public.school_years sy
        WHERE sy.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_section_by_id(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',          s.id,
        'term_id',     s.term_id,
        'course_id',   s.course_id,
        'faculty_id',  s.faculty_id,
        'section_code', s.section_code,
        'room',        s.room,
        'max_slots',   s.max_slots,
        'status',      s.status
    )
    INTO v_result
    FROM public.sections s
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_section_content(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_can_manage BOOLEAN;
    v_enrollment_id UUID;
    v_modules JSONB;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    v_can_manage := public.fn_is_section_faculty(p_section_id);

    IF NOT v_can_manage THEN
        SELECT e.id INTO v_enrollment_id
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
        LIMIT 1;
    END IF;

    SELECT COALESCE(jsonb_agg(mod_row ORDER BY mod_row_sequence, mod_row_created), '[]'::jsonb)
    INTO v_modules
    FROM (
        SELECT
            m.sequence AS mod_row_sequence,
            m.created_at AS mod_row_created,
            jsonb_build_object(
                'id', m.id,
                'title', m.title,
                'description', m.description,
                'sequence', m.sequence,
                'is_published', m.is_published,
                'material_count', (
                    SELECT count(*)
                    FROM public.course_materials cm
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND (v_can_manage OR cm.is_published)
                ),
                'completed_count', (
                    SELECT count(*)
                    FROM public.course_materials cm
                    JOIN public.material_completions mcx
                        ON mcx.material_id = cm.id
                        AND mcx.enrollment_id = v_enrollment_id
                        AND mcx.deleted_at IS NULL
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND cm.is_published
                ),
                'materials', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', cm.id,
                                'title', cm.title,
                                'description', cm.description,
                                'material_type', cm.material_type,
                                'file_url', cm.file_url,
                                'external_url', cm.external_url,
                                'file_name', cm.file_name,
                                'mime_type', cm.mime_type,
                                'file_size_bytes', cm.file_size_bytes,
                                'sequence', cm.sequence,
                                'is_published', cm.is_published,
                                'available_from', cm.available_from,
                                'available_until', cm.available_until,
                                'is_completed', EXISTS (
                                    SELECT 1 FROM public.material_completions mc
                                    WHERE mc.material_id = cm.id
                                      AND mc.enrollment_id = v_enrollment_id
                                      AND mc.deleted_at IS NULL
                                )
                            )
                            ORDER BY cm.sequence, cm.created_at
                        )
                        FROM public.course_materials cm
                        WHERE cm.module_id = m.id
                          AND cm.deleted_at IS NULL
                          AND (v_can_manage OR cm.is_published)
                    ),
                    '[]'::jsonb
                )
            ) AS mod_row
        FROM public.modules m
        WHERE m.section_id = p_section_id
          AND m.deleted_at IS NULL
          AND (v_can_manage OR m.is_published)
    ) sub;

    RETURN jsonb_build_object(
        'can_manage', v_can_manage,
        'modules', v_modules
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_section_detail(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',           s.id,
        'section_code', s.section_code,
        'course_code',  c.code,
        'course_title', c.title,
        'term_label',   tt.label || ' - ' || sy.label,
        'term_id',      t.id,
        'status',       s.status,
        'max_slots',    s.max_slots,
        'room',         s.room
    )
    INTO v_result
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL
    AND s.faculty_id = auth.uid();

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_section_insight(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section JSONB;
    v_enrollment_ids UUID[];
    v_students JSONB;
    v_summary JSONB;
    v_assessments JSONB;
    v_distribution JSONB;
    v_by_type JSONB;
    v_by_competency JSONB;
    v_granularity TEXT;
BEGIN
    PERFORM public.fn_analytics_assert_section(p_section_id);

    SELECT jsonb_build_object(
        'section_id', sec.id,
        'section_code', sec.section_code,
        'course_code', c.code,
        'course_title', c.title,
        'term_label', tt.label || ' - ' || sy.label
    )
    INTO v_section
    FROM public.sections sec
    INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = sec.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE sec.id = p_section_id
      AND sec.deleted_at IS NULL;

    IF v_section IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section was not found.');
    END IF;

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.deleted_at IS NULL
      AND e.status <> 'Dropped';

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'student_id', r.student_id,
                'enrollment_id', r.enrollment_id,
                'student_number', r.student_number,
                'full_name', r.full_name,
                'avg_score_pct', r.avg_score_pct,
                'attendance_rate', r.attendance_rate,
                'missing_count', r.missing_count,
                'graded_count', r.graded_count,
                'risk_score', r.risk_score,
                'risk_level', public.fn_analytics_risk_level(r.risk_score),
                'is_at_risk', r.risk_score >= 30
            )
            ORDER BY r.risk_score DESC, r.full_name
        ),
        '[]'::jsonb
    )
    INTO v_students
    FROM (
        SELECT
            st.id AS student_id,
            e.id AS enrollment_id,
            st.student_number,
            u.first_name || ' ' || u.last_name AS full_name,
            sc.avg_score_pct,
            en.attendance_rate,
            COALESCE(en.missing_count, 0) AS missing_count,
            COALESCE(sc.graded_count, 0) AS graded_count,
            public.fn_analytics_risk_score(
                en.attendance_rate,
                sc.avg_score_pct,
                COALESCE(en.missing_count, 0),
                0
            ) AS risk_score
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                s.enrollment_id,
                ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS avg_score_pct,
                COUNT(*)::INTEGER AS graded_count
            FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
            GROUP BY s.enrollment_id
        ) sc ON sc.enrollment_id = e.id
        LEFT JOIN public.fn_analytics_engagement(v_enrollment_ids) en ON en.enrollment_id = e.id
        WHERE e.id = ANY (v_enrollment_ids)
    ) r;

    SELECT jsonb_build_object(
        'enrolled_count', jsonb_array_length(v_students),
        'at_risk_count', (
            SELECT COUNT(*)
            FROM jsonb_array_elements(v_students) AS s(entry)
            WHERE (s.entry->>'is_at_risk')::BOOLEAN
        ),
        'avg_score_pct', (
            SELECT ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2)
            FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
        ),
        'avg_attendance_rate', (
            SELECT ROUND(
                SUM(en.sessions_total - en.absent_count)::NUMERIC
                    / NULLIF(SUM(en.sessions_total), 0) * 100,
                2
            )
            FROM public.fn_analytics_engagement(v_enrollment_ids) en
        ),
        'submission_rate', (
            SELECT ROUND(SUM(en.submitted_count)::NUMERIC / NULLIF(SUM(en.due_count), 0) * 100, 2)
            FROM public.fn_analytics_engagement(v_enrollment_ids) en
        )
    )
    INTO v_summary;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'assessment_id', a.assessment_item_id,
                'title', a.title,
                'assessment_type', a.assessment_type,
                'due_at', a.due_at,
                'total_points', a.total_points,
                'avg_score_pct', a.avg_score_pct,
                'highest_pct', a.highest_pct,
                'lowest_pct', a.lowest_pct,
                'graded_count', a.graded_count,
                'submission_rate', a.submission_rate
            )
            ORDER BY a.due_at NULLS LAST, a.title
        ),
        '[]'::jsonb
    )
    INTO v_assessments
    FROM (
        SELECT
            ai.id AS assessment_item_id,
            ai.title,
            ai.assessment_type::TEXT AS assessment_type,
            ai.due_at,
            ai.total_points,
            ROUND(AVG(s.score_pct), 2) AS avg_score_pct,
            ROUND(MAX(s.score_pct), 2) AS highest_pct,
            ROUND(MIN(s.score_pct), 2) AS lowest_pct,
            COUNT(s.enrollment_id)::INTEGER AS graded_count,
            CASE
                WHEN COALESCE(array_length(v_enrollment_ids, 1), 0) = 0
                    THEN NULL
                ELSE ROUND(
                    COUNT(s.enrollment_id)::NUMERIC / array_length(v_enrollment_ids, 1) * 100,
                    2
                )
            END AS submission_rate
        FROM public.assessment_items ai
        LEFT JOIN public.fn_analytics_submission_scores(v_enrollment_ids) s
            ON s.assessment_item_id = ai.id
        WHERE ai.section_id = p_section_id
          AND ai.deleted_at IS NULL
          AND ai.is_published
        GROUP BY ai.id, ai.title, ai.assessment_type, ai.due_at, ai.total_points
    ) a;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object('bucket', b.bucket, 'student_count', b.student_count)
            ORDER BY b.sort_order
        ),
        '[]'::jsonb
    )
    INTO v_distribution
    FROM (
        SELECT
            bk.bucket,
            bk.sort_order,
            (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_students) AS s(entry)
                WHERE (s.entry->>'avg_score_pct') IS NOT NULL
                  AND (s.entry->>'avg_score_pct')::NUMERIC >= bk.min_pct
                  AND (s.entry->>'avg_score_pct')::NUMERIC < bk.max_pct
            )::INTEGER AS student_count
        FROM (VALUES
            ('Below 60', 1, 0::NUMERIC, 60::NUMERIC),
            ('60 - 69', 2, 60::NUMERIC, 70::NUMERIC),
            ('70 - 79', 3, 70::NUMERIC, 80::NUMERIC),
            ('80 - 89', 4, 80::NUMERIC, 90::NUMERIC),
            ('90 - 100', 5, 90::NUMERIC, 100.01::NUMERIC)
        ) AS bk(bucket, sort_order, min_pct, max_pct)
    ) b;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', t.assessment_type,
                'label', t.assessment_type,
                'score_pct', t.score_pct,
                'item_count', t.item_count
            )
            ORDER BY t.score_pct ASC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_type
    FROM (
        SELECT
            s.assessment_type,
            ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS score_pct,
            COUNT(DISTINCT s.assessment_item_id)::INTEGER AS item_count
        FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
        GROUP BY s.assessment_type
    ) t;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', k.competency_id,
                'label', k.code || ' - ' || k.title,
                'code', k.code,
                'title', k.title,
                'bloom_level', k.bloom_level,
                'score_pct', k.score_pct,
                'item_count', k.item_count,
                'student_count', k.student_count
            )
            ORDER BY k.score_pct ASC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_competency
    FROM (
        SELECT
            cp.id AS competency_id,
            cp.code,
            cp.title,
            cp.bloom_level,
            ROUND(
                SUM(COALESCE(sa.points_earned, 0) * aqc.weight / 100)
                    / NULLIF(SUM(q.points * aqc.weight / 100), 0) * 100,
                2
            ) AS score_pct,
            COUNT(DISTINCT q.id)::INTEGER AS item_count,
            COUNT(DISTINCT sub.enrollment_id)::INTEGER AS student_count
        FROM public.student_answers sa
        INNER JOIN public.assessment_submissions sub
            ON sub.id = sa.submission_id
            AND sub.deleted_at IS NULL
            AND sub.enrollment_id = ANY (v_enrollment_ids)
        INNER JOIN public.assessment_questions q
            ON q.id = sa.question_id
            AND q.deleted_at IS NULL
        INNER JOIN public.assessment_question_competencies aqc
            ON aqc.question_id = q.id
            AND aqc.deleted_at IS NULL
        INNER JOIN public.competencies cp
            ON cp.id = aqc.competency_id
            AND cp.deleted_at IS NULL
        WHERE sa.deleted_at IS NULL
          AND sa.points_earned IS NOT NULL
        GROUP BY cp.id, cp.code, cp.title, cp.bloom_level
    ) k;

    v_granularity := CASE
        WHEN jsonb_array_length(v_by_competency) > 0
            THEN 'fine'
        ELSE 'medium'
    END;

    RETURN jsonb_build_object(
        'success', true,
        'section', v_section,
        'summary', v_summary,
        'students', v_students,
        'assessments', v_assessments,
        'score_distribution', v_distribution,
        'mastery', jsonb_build_object(
            'granularity', v_granularity,
            'by_assessment_type', v_by_type,
            'by_competency', v_by_competency,
            'gaps', (
                SELECT COALESCE(jsonb_agg(g.entry), '[]'::jsonb)
                FROM jsonb_array_elements(
                    CASE
                        WHEN v_granularity = 'fine'
                            THEN v_by_competency
                        ELSE v_by_type
                    END
                ) AS g(entry)
                WHERE (g.entry->>'score_pct') IS NOT NULL
                  AND (g.entry->>'score_pct')::NUMERIC < 75
            )
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_section_student_evaluation(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_faculty_id UUID;
    v_profile JSONB;
    v_attendance JSONB;
    v_assessments JSONB;
    v_grades JSONB;
BEGIN
    SELECT s.id, s.faculty_id
    INTO v_section_id, v_faculty_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    IF v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not assigned to this section.');
    END IF;

    SELECT jsonb_build_object(
        'enrollment_id',     e.id,
        'student_id',        st.id,
        'student_number',    st.student_number,
        'full_name',         u.first_name || ' ' || u.last_name,
        'email',             u.email,
        'year_level',        st.year_level,
        'program_name',      p.name,
        'enrollment_status', e.status,
        'enrolled_at',       e.enrolled_at
    )
    INTO v_profile
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
    WHERE e.id = p_enrollment_id;

    SELECT jsonb_build_object(
        'total_sessions', (
            SELECT COUNT(*)
            FROM public.attendance_sessions asx
            WHERE asx.section_id = v_section_id
            AND asx.deleted_at IS NULL
        ),
        'present', COUNT(*) FILTER (WHERE ar.status = 'Present'),
        'absent',  COUNT(*) FILTER (WHERE ar.status = 'Absent'),
        'late',    COUNT(*) FILTER (WHERE ar.status = 'Late'),
        'excused', COUNT(*) FILTER (WHERE ar.status = 'Excused'),
        'recorded', COUNT(*)
    )
    INTO v_attendance
    FROM public.attendance_records ar
    INNER JOIN public.attendance_sessions asx ON asx.id = ar.attendance_session_id AND asx.deleted_at IS NULL
    WHERE asx.section_id = v_section_id
    AND ar.enrollment_id = p_enrollment_id
    AND ar.deleted_at IS NULL;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.grading_period_sequence ASC NULLS LAST, t.due_at ASC NULLS LAST), '[]'::jsonb)
    INTO v_assessments
    FROM (
        SELECT
            ai.id,
            ai.title,
            ai.description,
            ai.assessment_type,
            ai.total_points,
            ai.passing_points,
            ai.due_at,
            (
                SELECT COUNT(*)
                FROM public.assessment_questions aq
                WHERE aq.assessment_item_id = ai.id
                AND aq.deleted_at IS NULL
            ) AS question_count,
            gp.name AS grading_period_name,
            gc.grading_period_id,
            gp.sequence AS grading_period_sequence,
            sub.id AS submission_id,
            sub.status AS submission_status,
            sub.raw_score,
            sub.final_score,
            sub.is_late,
            sub.submitted_at,
            sub.graded_at
        FROM public.assessment_items ai
        LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT asub.id, asub.status, asub.raw_score, asub.final_score, asub.is_late, asub.submitted_at, asub.graded_at
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
            AND asub.enrollment_id = p_enrollment_id
            AND asub.deleted_at IS NULL
            ORDER BY asub.attempt_number DESC
            LIMIT 1
        ) sub ON true
        WHERE ai.section_id = v_section_id
        AND ai.deleted_at IS NULL
    ) t;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',   gp.id,
            'grading_period_name', gp.name,
            'sequence',            gp.sequence,
            'weight',              gp.weight,
            'raw_grade',           sfg.raw_grade,
            'final_grade',         sfg.final_grade,
            'transmuted_grade',    sfg.transmuted_grade,
            'special_grade',       sfg.special_grade,
            'status',              sfg.status
        )
        ORDER BY gp.sequence ASC
    ), '[]'::jsonb)
    INTO v_grades
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = p_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    WHERE gp.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'profile',     v_profile,
        'attendance',  v_attendance,
        'assessments', v_assessments,
        'grades',      v_grades
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_sections()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           s.id,
                'section_code', s.section_code,
                'label',        s.section_code || ' — ' || c.code
            )
            ORDER BY s.section_code ASC
        ), '[]'::JSONB)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_special_grade_configs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sgc.id,
                'code', sgc.code,
                'label', sgc.label,
                'description', sgc.description,
                'min_absence_percentage', sgc.min_absence_percentage,
                'requires_completion', sgc.requires_completion,
                'completion_deadline_days', sgc.completion_deadline_days,
                'is_passing', sgc.is_passing,
                'is_active', sgc.is_active
            )
            ORDER BY sgc.created_at ASC
        ), '[]'::jsonb)
        FROM public.special_grade_configs sgc
        WHERE sgc.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_attendance(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty_id UUID;
BEGIN
    SELECT s.faculty_id
    INTO v_faculty_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_faculty_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    IF v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not assigned to this section.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'record_id',    ar.id,
                'session_id',   asx.id,
                'session_date', asx.session_date,
                'notes',        asx.notes,
                'status',       ar.status,
                'remarks',      ar.remarks
            )
            ORDER BY asx.session_date DESC
        ), '[]'::jsonb)
        FROM public.attendance_records ar
        INNER JOIN public.attendance_sessions asx ON asx.id = ar.attendance_session_id AND asx.deleted_at IS NULL
        WHERE ar.enrollment_id = p_enrollment_id
        AND ar.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_by_id(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT jsonb_build_object(
        'id',             st.id,
        'user_id',        st.user_id,
        'student_number', st.student_number,
        'year_level',     st.year_level,
        'program_id',     st.program_id,
        'status',         st.status,
        'admitted_at',    st.admitted_at
    )
    INTO v_result
    FROM public.students st
    WHERE st.id = p_student_id
    AND st.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_clearance_summary(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total    INTEGER;
  v_cleared  INTEGER;
  v_pending  INTEGER;
  v_flagged  INTEGER;
  v_details  JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT
    COUNT(*)                                            AS total,
    COUNT(*) FILTER (WHERE sc.status = 'Cleared')      AS cleared,
    COUNT(*) FILTER (WHERE sc.status = 'Pending')      AS pending,
    COUNT(*) FILTER (WHERE sc.status = 'Flagged')      AS flagged
  INTO v_total, v_cleared, v_pending, v_flagged
  FROM public.student_clearances sc
  WHERE sc.student_id = p_student_id
    AND sc.term_id    = p_term_id
    AND sc.deleted_at IS NULL;

  SELECT jsonb_agg(
    jsonb_build_object(
      'requirement_id',   sc.requirement_id,
      'requirement_code', cr.code,
      'requirement_name', cr.name,
      'status',           sc.status,
      'remarks',          sc.remarks,
      'flagged_reason',   sc.flagged_reason,
      'cleared_at',       sc.cleared_at
    )
  )
  INTO v_details
  FROM public.student_clearances sc
  INNER JOIN public.clearance_requirements cr ON cr.id = sc.requirement_id
  WHERE sc.student_id = p_student_id
    AND sc.term_id    = p_term_id
    AND sc.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'student_id',    p_student_id,
    'term_id',       p_term_id,
    'total',         v_total,
    'cleared',       v_cleared,
    'pending',       v_pending,
    'flagged',       v_flagged,
    'is_fully_cleared', (v_total > 0 AND v_flagged = 0 AND v_pending = 0),
    'requirements',  COALESCE(v_details, '[]'::jsonb)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_upcoming_count INTEGER;
    v_upcoming JSONB;
    v_released_grades_count INTEGER;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT COUNT(*)
    INTO v_upcoming_count
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.assessment_items ai ON ai.section_id = s.id
        AND ai.is_published = true
        AND ai.deleted_at IS NULL
        AND (ai.closes_at IS NULL OR ai.closes_at > now())
    WHERE e.student_id = v_student_id
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.assessment_submissions asub
          WHERE asub.assessment_item_id = ai.id
            AND asub.enrollment_id = e.id
            AND asub.status IN ('Submitted', 'Late', 'Graded')
            AND asub.deleted_at IS NULL
      );

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'due_at') IS NULL, x->>'due_at'), '[]'::JSONB)
    INTO v_upcoming
    FROM (
        SELECT jsonb_build_object(
            'id',              ai.id,
            'title',           ai.title,
            'assessment_type', ai.assessment_type,
            'opens_at',        ai.opens_at,
            'due_at',          ai.due_at,
            'section_code',    s.section_code,
            'course_code',     c.code,
            'enrollment_id',   e.id
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.assessment_items ai ON ai.section_id = s.id
            AND ai.is_published = true
            AND ai.deleted_at IS NULL
            AND (ai.closes_at IS NULL OR ai.closes_at > now())
        WHERE e.student_id = v_student_id
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.assessment_submissions asub
              WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = e.id
                AND asub.status IN ('Submitted', 'Late', 'Graded')
                AND asub.deleted_at IS NULL
          )
        ORDER BY ai.due_at ASC NULLS LAST
        LIMIT 5
    ) upcoming;

    SELECT COUNT(*)
    INTO v_released_grades_count
    FROM public.enrollments e
    INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        AND sfg.status = 'Released'
        AND sfg.deleted_at IS NULL
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'enrolled_count', (
            SELECT COUNT(*)
            FROM public.enrollments e
            WHERE e.student_id = v_student_id
              AND e.status = 'Enrolled'
              AND e.deleted_at IS NULL
        ),
        'upcoming_count', COALESCE(v_upcoming_count, 0),
        'upcoming_assessments', v_upcoming,
        'released_grades_count', COALESCE(v_released_grades_count, 0)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_evaluation_status(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'enrollment_id',      e.id,
      'section_id',         e.section_id,
      'grading_period_id',  epl.grading_period_id,
      'grading_period_name', gp.name,
      'is_completed',       epl.is_completed,
      'completed_at',       epl.completed_at,
      'is_grade_visible',   e.is_grade_visible
    )
  )
  INTO v_result
  FROM public.enrollments e
  INNER JOIN public.sections sec            ON sec.id  = e.section_id
  INNER JOIN public.terms t                 ON t.id    = sec.term_id
  INNER JOIN public.evaluation_period_locks epl ON epl.enrollment_id = e.id
  INNER JOIN public.grading_periods gp      ON gp.id  = epl.grading_period_id
  WHERE e.student_id  = p_student_id
    AND t.id          = p_term_id
    AND e.deleted_at  IS NULL
    AND epl.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'term_id',    p_term_id,
    'locks',      COALESCE(v_result, '[]'::jsonb)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_faculty_id UUID;
    v_period JSONB;
    v_components JSONB;
    v_totals JSONB;
BEGIN
    SELECT s.id, s.faculty_id
    INTO v_section_id, v_faculty_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    IF v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not assigned to this section.');
    END IF;

    SELECT jsonb_build_object(
        'grading_period_id', gp.id,
        'grading_period_name', gp.name,
        'weight', gp.weight
    )
    INTO v_period
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id
    AND gp.deleted_at IS NULL;

    IF v_period IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',             c.id,
            'name',           c.name,
            'weight',         c.weight,
            'earned_points',  c.earned_points,
            'max_points',     c.max_points,
            'weighted_score', CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * c.weight, 2)
                ELSE 0
            END,
            'items',          c.items
        )
        ORDER BY c.name ASC
    ), '[]'::jsonb)
    INTO v_components
    FROM (
        SELECT
            gc.id,
            gc.name,
            gc.weight,
            COALESCE(SUM(i.earned_points), 0) AS earned_points,
            COALESCE(SUM(i.max_points), 0) AS max_points,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',                i.id,
                    'title',             i.title,
                    'assessment_type',   i.assessment_type,
                    'earned_points',     i.graded_points,
                    'max_points',        i.max_points,
                    'submission_status', i.submission_status,
                    'is_late',           i.is_late,
                    'due_at',            i.due_at,
                    'graded_at',         i.graded_at
                )
                ORDER BY i.due_at ASC NULLS LAST, i.title ASC
            ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM public.grading_components gc
        LEFT JOIN LATERAL (
            SELECT
                ai.id,
                ai.title,
                ai.assessment_type,
                ai.due_at,
                ai.total_points AS max_points,
                sub.final_score AS graded_points,
                COALESCE(sub.final_score, 0) AS earned_points,
                latest.status AS submission_status,
                latest.is_late,
                sub.graded_at
            FROM public.assessment_items ai
            LEFT JOIN LATERAL (
                SELECT asub.final_score, asub.graded_at
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.status = 'Graded'
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ) sub ON true
            LEFT JOIN LATERAL (
                SELECT asub.status, asub.is_late
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ) latest ON true
            WHERE ai.grading_component_id = gc.id
            AND ai.deleted_at IS NULL
        ) i ON true
        WHERE gc.section_id = v_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
        GROUP BY gc.id, gc.name, gc.weight
    ) c;

    SELECT jsonb_build_object(
        'raw_grade',        sfg.raw_grade,
        'final_grade',      sfg.final_grade,
        'transmuted_grade', sfg.transmuted_grade,
        'special_grade',    sfg.special_grade,
        'status',           sfg.status
    )
    INTO v_totals
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at IS NULL;

    RETURN v_period
        || jsonb_build_object('components', v_components)
        || COALESCE(v_totals, jsonb_build_object(
            'raw_grade', NULL,
            'final_grade', NULL,
            'transmuted_grade', NULL,
            'special_grade', NULL,
            'status', NULL
        ));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_insight(p_student_id uuid DEFAULT NULL::uuid, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_term_id UUID;
    v_program_id UUID;
    v_student JSONB;
    v_term JSONB;
    v_enrollment_ids UUID[];
    v_cumulative_gwa NUMERIC;
    v_earned_units NUMERIC;
    v_gwa_units NUMERIC;
    v_failing_count INTEGER;
    v_required_units NUMERIC;
    v_remaining_units NUMERIC;
    v_term_gwa NUMERIC;
    v_trend JSONB;
    v_trajectory JSONB;
    v_courses JSONB;
    v_by_type JSONB;
    v_by_competency JSONB;
    v_granularity TEXT;
    v_avg_score_pct NUMERIC;
    v_attendance_rate NUMERIC;
    v_missing_count INTEGER;
    v_engagement JSONB;
    v_risk_score NUMERIC;
    v_reasons JSONB;
    v_focus JSONB;
    v_strengths JSONB;
    v_weaknesses JSONB;
BEGIN
    v_student_id := public.fn_analytics_resolve_student(p_student_id);

    SELECT
        jsonb_build_object(
            'student_id', s.id,
            'student_number', s.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'year_level', s.year_level,
            'status', s.status,
            'program_code', p.code,
            'program_name', p.name
        ),
        s.program_id
    INTO v_student, v_program_id
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record was not found.');
    END IF;

    IF p_term_id IS NOT NULL THEN
        v_term_id := p_term_id;
    ELSE
        SELECT t.id
        INTO v_term_id
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = sec.term_id AND t.deleted_at IS NULL
        WHERE e.student_id = v_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
        ORDER BY (t.status = 'Ongoing') DESC, t.start_date DESC
        LIMIT 1;
    END IF;

    SELECT jsonb_build_object(
        'term_id', t.id,
        'term_label', tt.label || ' - ' || sy.label,
        'status', t.status
    )
    INTO v_term
    FROM public.terms t
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.id = v_term_id
      AND t.deleted_at IS NULL;

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL
      AND e.status <> 'Dropped'
      AND sec.term_id = v_term_id;

    SELECT
        ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2),
        COALESCE(SUM(g.units) FILTER (WHERE g.is_passing), 0),
        COALESCE(SUM(g.units), 0),
        COUNT(*) FILTER (WHERE g.is_passing IS FALSE)
    INTO v_cumulative_gwa, v_earned_units, v_gwa_units, v_failing_count
    FROM public.fn_student_course_grades(v_student_id) g
    WHERE g.is_released
      AND g.grade IS NOT NULL;

    v_failing_count := COALESCE(v_failing_count, 0);
    v_earned_units := COALESCE(v_earned_units, 0);
    v_gwa_units := COALESCE(v_gwa_units, 0);

    SELECT ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2)
    INTO v_term_gwa
    FROM public.fn_student_course_grades(v_student_id) g
    WHERE g.is_released
      AND g.grade IS NOT NULL
      AND g.term_id = v_term_id;

    SELECT COALESCE(SUM(c.total_units), 0)
    INTO v_required_units
    FROM public.curriculum_maps cm
    INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
    WHERE cm.program_id = v_program_id
      AND cm.deleted_at IS NULL;

    v_remaining_units := GREATEST(COALESCE(v_required_units, 0) - v_earned_units, 0);

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'term_id', x.term_id,
                'term_label', x.term_label,
                'gwa', x.gwa,
                'units', x.units
            )
            ORDER BY x.school_year_start, x.sequence
        ),
        '[]'::jsonb
    )
    INTO v_trend
    FROM (
        SELECT
            t.id AS term_id,
            tt.label || ' - ' || sy.label AS term_label,
            sy.start_date AS school_year_start,
            tt.sequence AS sequence,
            ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2) AS gwa,
            SUM(g.units) AS units
        FROM public.fn_student_course_grades(v_student_id) g
        INNER JOIN public.terms t ON t.id = g.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE g.is_released
          AND g.grade IS NOT NULL
        GROUP BY t.id, tt.label, sy.label, sy.start_date, tt.sequence
    ) x;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'code', y.code,
                'label', y.label,
                'category', y.category,
                'target_gwa', y.max_gwa,
                'discount_pct', y.scholarship_discount_pct,
                'is_currently_qualified', y.is_currently_qualified,
                'is_blocked_by_failing', y.is_blocked_by_failing,
                'gwa_gap', y.gwa_gap,
                'required_avg_on_remaining', y.required_avg,
                'is_attainable', y.is_attainable
            )
            ORDER BY y.category, y.sort_order
        ),
        '[]'::jsonb
    )
    INTO v_trajectory
    FROM (
        SELECT
            th.code,
            th.label,
            th.category,
            th.max_gwa,
            th.scholarship_discount_pct,
            th.sort_order,
            (
                v_cumulative_gwa IS NOT NULL
                AND v_cumulative_gwa <= th.max_gwa
                AND (NOT th.requires_no_failing OR v_failing_count = 0)
            ) AS is_currently_qualified,
            (th.requires_no_failing AND v_failing_count > 0) AS is_blocked_by_failing,
            CASE
                WHEN v_cumulative_gwa IS NULL
                    THEN NULL
                ELSE ROUND(v_cumulative_gwa - th.max_gwa, 2)
            END AS gwa_gap,
            CASE
                WHEN v_cumulative_gwa IS NULL OR v_remaining_units <= 0 OR v_gwa_units <= 0
                    THEN NULL
                ELSE ROUND(
                    (th.max_gwa * (v_gwa_units + v_remaining_units) - v_cumulative_gwa * v_gwa_units)
                        / v_remaining_units,
                    2
                )
            END AS required_avg,
            CASE
                WHEN th.requires_no_failing AND v_failing_count > 0
                    THEN false
                WHEN v_cumulative_gwa IS NULL
                    THEN NULL
                WHEN v_cumulative_gwa <= th.max_gwa
                    THEN true
                WHEN v_remaining_units <= 0 OR v_gwa_units <= 0
                    THEN false
                ELSE (
                    (th.max_gwa * (v_gwa_units + v_remaining_units) - v_cumulative_gwa * v_gwa_units)
                        / v_remaining_units
                ) >= 1.00
            END AS is_attainable
        FROM public.academic_thresholds th
        WHERE th.category IN ('Honor', 'Scholarship')
          AND th.is_active
          AND th.deleted_at IS NULL
    ) y;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'enrollment_id', c.enrollment_id,
                'section_id', c.section_id,
                'section_code', c.section_code,
                'course_code', c.course_code,
                'course_title', c.course_title,
                'avg_score_pct', c.avg_score_pct,
                'attendance_rate', c.attendance_rate,
                'missing_count', c.missing_count,
                'graded_count', c.graded_count,
                'released_grade', c.released_grade
            )
            ORDER BY c.course_code
        ),
        '[]'::jsonb
    )
    INTO v_courses
    FROM (
        SELECT
            e.id AS enrollment_id,
            sec.id AS section_id,
            sec.section_code,
            co.code AS course_code,
            co.title AS course_title,
            sc.avg_score_pct,
            en.attendance_rate,
            en.missing_count,
            COALESCE(sc.graded_count, 0) AS graded_count,
            (
                SELECT ROUND(
                    SUM(COALESCE(sfg.transmuted_grade, sfg.final_grade) * gp.weight)
                        / NULLIF(SUM(gp.weight), 0),
                    2
                )
                FROM public.section_final_grades sfg
                INNER JOIN public.grading_periods gp
                    ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
                WHERE sfg.enrollment_id = e.id
                  AND sfg.status = 'Released'
                  AND sfg.deleted_at IS NULL
            ) AS released_grade
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.courses co ON co.id = sec.course_id AND co.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                s.enrollment_id,
                ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS avg_score_pct,
                COUNT(*)::INTEGER AS graded_count
            FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
            GROUP BY s.enrollment_id
        ) sc ON sc.enrollment_id = e.id
        LEFT JOIN public.fn_analytics_engagement(v_enrollment_ids) en ON en.enrollment_id = e.id
        WHERE e.id = ANY (v_enrollment_ids)
    ) c;

    SELECT
        ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2)
    INTO v_avg_score_pct
    FROM public.fn_analytics_submission_scores(v_enrollment_ids) s;

    SELECT
        ROUND(
            SUM(en.sessions_total - en.absent_count)::NUMERIC
                / NULLIF(SUM(en.sessions_total), 0) * 100,
            2
        ),
        COALESCE(SUM(en.missing_count), 0)
    INTO v_attendance_rate, v_missing_count
    FROM public.fn_analytics_engagement(v_enrollment_ids) en;

    SELECT jsonb_build_object(
        'sessions_total', COALESCE(SUM(en.sessions_total), 0),
        'present_count', COALESCE(SUM(en.present_count), 0),
        'late_count', COALESCE(SUM(en.late_count), 0),
        'excused_count', COALESCE(SUM(en.excused_count), 0),
        'absent_count', COALESCE(SUM(en.absent_count), 0),
        'attendance_rate', v_attendance_rate,
        'due_count', COALESCE(SUM(en.due_count), 0),
        'submitted_count', COALESCE(SUM(en.submitted_count), 0),
        'on_time_count', COALESCE(SUM(en.on_time_count), 0),
        'late_submission_count', COALESCE(SUM(en.late_submission_count), 0),
        'missing_count', COALESCE(SUM(en.missing_count), 0),
        'submission_rate', CASE
            WHEN COALESCE(SUM(en.due_count), 0) = 0
                THEN NULL
            ELSE ROUND(SUM(en.submitted_count)::NUMERIC / SUM(en.due_count) * 100, 2)
        END,
        'on_time_rate', CASE
            WHEN COALESCE(SUM(en.due_count), 0) = 0
                THEN NULL
            ELSE ROUND(SUM(en.on_time_count)::NUMERIC / SUM(en.due_count) * 100, 2)
        END,
        'materials_total', COALESCE(SUM(en.materials_total), 0),
        'materials_completed', COALESCE(SUM(en.materials_completed), 0),
        'materials_rate', CASE
            WHEN COALESCE(SUM(en.materials_total), 0) = 0
                THEN NULL
            ELSE ROUND(SUM(en.materials_completed)::NUMERIC / SUM(en.materials_total) * 100, 2)
        END
    )
    INTO v_engagement
    FROM public.fn_analytics_engagement(v_enrollment_ids) en;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', t.assessment_type,
                'label', t.assessment_type,
                'score_pct', t.score_pct,
                'item_count', t.item_count
            )
            ORDER BY t.score_pct DESC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_type
    FROM (
        SELECT
            s.assessment_type,
            ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS score_pct,
            COUNT(*)::INTEGER AS item_count
        FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
        GROUP BY s.assessment_type
    ) t;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', k.competency_id,
                'label', k.code || ' - ' || k.title,
                'code', k.code,
                'title', k.title,
                'bloom_level', k.bloom_level,
                'score_pct', k.score_pct,
                'item_count', k.item_count
            )
            ORDER BY k.score_pct DESC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_competency
    FROM (
        SELECT
            cp.id AS competency_id,
            cp.code,
            cp.title,
            cp.bloom_level,
            ROUND(
                SUM(COALESCE(sa.points_earned, 0) * aqc.weight / 100)
                    / NULLIF(SUM(q.points * aqc.weight / 100), 0) * 100,
                2
            ) AS score_pct,
            COUNT(DISTINCT q.id)::INTEGER AS item_count
        FROM public.student_answers sa
        INNER JOIN public.assessment_submissions sub
            ON sub.id = sa.submission_id
            AND sub.deleted_at IS NULL
            AND sub.enrollment_id = ANY (v_enrollment_ids)
        INNER JOIN public.assessment_questions q
            ON q.id = sa.question_id
            AND q.deleted_at IS NULL
        INNER JOIN public.assessment_question_competencies aqc
            ON aqc.question_id = q.id
            AND aqc.deleted_at IS NULL
        INNER JOIN public.competencies cp
            ON cp.id = aqc.competency_id
            AND cp.deleted_at IS NULL
        WHERE sa.deleted_at IS NULL
          AND sa.points_earned IS NOT NULL
        GROUP BY cp.id, cp.code, cp.title, cp.bloom_level
    ) k;

    v_granularity := CASE
        WHEN jsonb_array_length(v_by_competency) > 0
            THEN 'fine'
        ELSE 'medium'
    END;

    SELECT
        COALESCE(
            jsonb_agg(z.entry ORDER BY (z.entry->>'score_pct')::NUMERIC DESC)
                FILTER (WHERE (z.entry->>'score_pct')::NUMERIC >= 80),
            '[]'::jsonb
        ),
        COALESCE(
            jsonb_agg(z.entry ORDER BY (z.entry->>'score_pct')::NUMERIC ASC)
                FILTER (WHERE (z.entry->>'score_pct')::NUMERIC < 75),
            '[]'::jsonb
        )
    INTO v_strengths, v_weaknesses
    FROM (
        SELECT entry
        FROM jsonb_array_elements(
            CASE
                WHEN v_granularity = 'fine'
                    THEN v_by_competency
                ELSE v_by_type
            END
        ) AS entry
        WHERE entry->>'score_pct' IS NOT NULL
    ) z;

    v_risk_score := public.fn_analytics_risk_score(
        v_attendance_rate,
        v_avg_score_pct,
        v_missing_count,
        v_failing_count
    );

    SELECT COALESCE(jsonb_agg(r.reason), '[]'::jsonb)
    INTO v_reasons
    FROM (
        SELECT 'Attendance is ' || ROUND(v_attendance_rate)::TEXT || '%, below the 75% threshold.' AS reason
        WHERE v_attendance_rate IS NOT NULL AND v_attendance_rate < 75
        UNION ALL
        SELECT 'Average assessment score is ' || ROUND(v_avg_score_pct)::TEXT || '%, below the 75% threshold.'
        WHERE v_avg_score_pct IS NOT NULL AND v_avg_score_pct < 75
        UNION ALL
        SELECT v_missing_count::TEXT || ' past-due assessment(s) were never submitted.'
        WHERE v_missing_count > 0
        UNION ALL
        SELECT v_failing_count::TEXT || ' released course grade(s) are failing.'
        WHERE v_failing_count > 0
    ) r;

    SELECT COALESCE(jsonb_agg(f.item ORDER BY f.priority), '[]'::jsonb)
    INTO v_focus
    FROM (
        SELECT
            1 AS priority,
            jsonb_build_object(
                'priority', 1,
                'title', 'Submit the ' || v_missing_count::TEXT || ' missing assessment(s)',
                'detail', 'Unsubmitted past-due work scores zero and is the fastest drag on your grade to reverse.'
            ) AS item
        WHERE v_missing_count > 0
        UNION ALL
        SELECT
            2,
            jsonb_build_object(
                'priority', 2,
                'title', 'Raise attendance above 75%',
                'detail', 'You have attended ' || ROUND(COALESCE(v_attendance_rate, 0))::TEXT
                    || '% of sessions. Attendance strongly tracks with assessment performance.'
            )
        WHERE v_attendance_rate IS NOT NULL AND v_attendance_rate < 75
        UNION ALL
        SELECT
            3,
            jsonb_build_object(
                'priority', 3,
                'title', 'Focus on ' || (w.entry->>'label'),
                'detail', 'Your weakest area at ' || ROUND((w.entry->>'score_pct')::NUMERIC)::TEXT
                    || '%. Review this before the next assessment.'
            )
        FROM (
            SELECT e.entry
            FROM jsonb_array_elements(v_weaknesses) AS e(entry)
            LIMIT 3
        ) w
    ) f;

    RETURN jsonb_build_object(
        'success', true,
        'student', v_student,
        'term', v_term,
        'academic', jsonb_build_object(
            'cumulative_gwa', v_cumulative_gwa,
            'term_gwa', v_term_gwa,
            'earned_units', v_earned_units,
            'required_units', v_required_units,
            'remaining_units', v_remaining_units,
            'failing_count', v_failing_count
        ),
        'gwa_trend', v_trend,
        'trajectory', v_trajectory,
        'courses', v_courses,
        'performance', jsonb_build_object(
            'granularity', v_granularity,
            'avg_score_pct', v_avg_score_pct,
            'by_assessment_type', v_by_type,
            'by_competency', v_by_competency,
            'strengths', v_strengths,
            'weaknesses', v_weaknesses
        ),
        'engagement', v_engagement,
        'risk', jsonb_build_object(
            'risk_score', v_risk_score,
            'risk_level', public.fn_analytics_risk_level(v_risk_score),
            'is_at_risk', v_risk_score >= 30,
            'reasons', v_reasons
        ),
        'recommended_focus', v_focus
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'section_id',    s.id,
                'section_code',  s.section_code,
                'course_code',   c.code,
                'course_title',  c.title,
                'faculty_name',  u.first_name || ' ' || u.last_name,
                'enrollment_id', e.id,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'schedules', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',         ss.id,
                            'day_of_week', ss.day_of_week,
                            'time_start', ss.time_start,
                            'time_end',   ss.time_end,
                            'room',       ss.room
                        )
                        ORDER BY ss.day_of_week ASC, ss.time_start ASC
                    ), '[]'::JSONB)
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                )
            )
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        WHERE e.student_id = v_student_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_section_color(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT jsonb_build_object('id', id, 'color', color)
    INTO v_result
    FROM public.student_section_colors
    WHERE student_id = v_student_id
    AND section_id = p_section_id
    AND deleted_at IS NULL;

    RETURN COALESCE(v_result, jsonb_build_object('color', NULL));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_student_transcript(p_student_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_student JSONB;
    v_program JSONB;
    v_institution JSONB;
    v_terms JSONB;
    v_total_units NUMERIC(8,2);
    v_cumulative_gwa NUMERIC(5,2);
    v_is_official BOOLEAN;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);
    v_is_official := public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar'];

    SELECT jsonb_build_object(
        'id', s.id,
        'student_number', s.student_number,
        'full_name', u.first_name || ' ' || u.last_name,
        'email', u.email,
        'year_level', s.year_level,
        'status', s.status,
        'admitted_at', s.admitted_at
    )
    INTO v_student
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'total_units', p.total_units
    )
    INTO v_program
    FROM public.students s
    INNER JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    SELECT jsonb_build_object(
        'name', ss.institution_name,
        'short_name', ss.institution_short_name,
        'address', ss.institution_address,
        'email', ss.institution_email,
        'phone', ss.institution_phone,
        'logo_url', ss.institution_logo_url
    )
    INTO v_institution
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    LIMIT 1;

    WITH attempts AS (
        SELECT a.*
        FROM public.fn_student_course_grades(v_student_id) a
        WHERE a.is_released
    ),
    term_rows AS (
        SELECT
            t.id AS term_id,
            tt.label || ' - ' || sy.label AS term_label,
            sy.label AS school_year_label,
            sy.start_date AS school_year_start,
            COALESCE(tt.sequence, 99) AS term_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'enrollment_id', a.enrollment_id,
                    'course_code', a.course_code,
                    'course_title', a.course_title,
                    'units', a.units,
                    'grade', a.grade,
                    'raw_grade', a.raw_grade,
                    'special_grade', a.special_grade,
                    'is_passing', a.is_passing
                )
                ORDER BY a.course_code
            ) AS courses,
            COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0) AS earned_units,
            COALESCE(SUM(a.units), 0) AS attempted_units,
            ROUND(
                SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
                / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
                2
            ) AS term_gwa
        FROM attempts a
        INNER JOIN public.terms t ON t.id = a.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        GROUP BY t.id, tt.label, sy.label, sy.start_date, tt.sequence
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'term_id', tr.term_id,
                'term_label', tr.term_label,
                'school_year_label', tr.school_year_label,
                'courses', tr.courses,
                'earned_units', tr.earned_units,
                'attempted_units', tr.attempted_units,
                'term_gwa', tr.term_gwa
            )
            ORDER BY tr.school_year_start, tr.term_sequence
        ),
        '[]'::jsonb
    )
    INTO v_terms
    FROM term_rows tr;

    SELECT
        COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0),
        ROUND(
            SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
            / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
            2
        )
    INTO v_total_units, v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released;

    RETURN jsonb_build_object(
        'success', true,
        'is_official', v_is_official,
        'generated_at', now(),
        'student', v_student,
        'program', v_program,
        'institution', COALESCE(v_institution, '{}'::jsonb),
        'terms', v_terms,
        'summary', jsonb_build_object(
            'total_units_earned', v_total_units,
            'cumulative_gwa', v_cumulative_gwa
        )
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_students()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             st.id,
                'student_number', st.student_number,
                'label',          st.student_number || ' — ' || u.first_name || ' ' || u.last_name
            )
            ORDER BY st.student_number ASC
        ), '[]'::JSONB)
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE st.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_subject_assessments(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',                       ai.id,
            'title',                    ai.title,
            'description',              ai.description,
            'assessment_type',          ai.assessment_type,
            'grading_period_id',        gp.id,
            'grading_period_name',      gp.name,
            'grading_period_sequence',  gp.sequence,
            'total_points',             ai.total_points,
            'passing_points',           ai.passing_points,
            'time_limit_minutes',       ai.time_limit_minutes,
            'max_attempts',             ai.max_attempts,
            'question_count', (
                SELECT COUNT(*)
                FROM public.assessment_questions aq
                WHERE aq.assessment_item_id = ai.id
                AND aq.deleted_at IS NULL
            ),
            'show_all_questions',       ai.show_all_questions,
            'questions_per_page',       ai.questions_per_page,
            'opens_at',                 ai.opens_at,
            'due_at',                   ai.due_at,
            'closes_at',                ai.closes_at,
            'scheduled_publish_at',     ai.scheduled_publish_at,
            'submission_status', (
                SELECT asub.status
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'submission_id', (
                SELECT asub.id
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'attempts_used', (
                SELECT COUNT(*)
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
            ),
            'attachments', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id',              aa.id,
                        'file_name',       aa.file_name,
                        'file_url',        aa.file_url,
                        'file_size_bytes', aa.file_size_bytes,
                        'mime_type',       aa.mime_type
                    )
                    ORDER BY aa.sequence ASC
                ), '[]'::JSONB)
                FROM public.assessment_attachments aa
                WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
            )
        )
        ORDER BY gp.sequence ASC NULLS LAST, ai.opens_at ASC NULLS LAST, ai.due_at ASC NULLS LAST
    ), '[]'::JSONB)
    INTO v_result
    FROM public.assessment_items ai
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.section_id = v_section_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_subject_detail(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT jsonb_build_object(
        'enrollment_id',     e.id,
        'section_id',        s.id,
        'section_code',      s.section_code,
        'course_code',       c.code,
        'course_title',      c.title,
        'term_label',        tt.label || ' - ' || sy.label,
        'faculty_name',      u.first_name || ' ' || u.last_name,
        'enrollment_status', e.status
    )
    INTO v_result
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            sfg.raw_grade,
            'final_grade',          sfg.final_grade,
            'transmuted_grade',     sfg.transmuted_grade,
            'special_grade',        sfg.special_grade,
            'status',               sfg.status,
            'is_visible',           sfg.status = 'Released',
            'evaluation_completed', COALESCE((
                SELECT epl.is_completed
                FROM public.evaluation_period_locks epl
                WHERE epl.enrollment_id = p_enrollment_id
                AND epl.grading_period_id = public.fn_resolve_evaluation_period(p_enrollment_id, gp.id)
                AND epl.deleted_at IS NULL
                LIMIT 1
            ), false)
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = p_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_submission_for_grading(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',            asub.id,
        'enrollment_id', asub.enrollment_id,
        'status',        asub.status,
        'raw_score',     asub.raw_score,
        'final_score',   asub.final_score,
        'feedback',      asub.feedback,
        'use_rubric_scoring', ai.use_rubric_scoring,
        'answers', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              sa.id,
                    'question_id',     sa.question_id,
                    'question_text',   aq.question_text,
                    'question_type',   aq.question_type,
                    'points',          aq.points,
                    'sequence',        aq.sequence,
                    'answer_text',     sa.answer_text,
                    'choice_id',       sa.choice_id,
                    'points_earned',   sa.points_earned,
                    'is_correct',      sa.is_correct,
                    'grader_notes',    sa.grader_notes,
                    'file_attachments', sa.file_attachments
                )
                ORDER BY aq.sequence ASC
            ), '[]'::JSONB)
            FROM public.student_answers sa
            INNER JOIN public.assessment_questions aq
                ON aq.id = sa.question_id AND aq.deleted_at IS NULL
            WHERE sa.submission_id = asub.id
            AND sa.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_submission_rubric(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_rubric_id  UUID;
    v_result     JSONB;
BEGIN
    v_section_id := public.fn_resolve_submission_section(p_submission_id);
    PERFORM public.fn_assert_section_staff(v_section_id);

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_item_rubrics air
        ON air.assessment_item_id = asub.assessment_item_id AND air.deleted_at IS NULL
    WHERE asub.id = p_submission_id AND asub.deleted_at IS NULL
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rubric attached to this assessment.');
    END IF;

    SELECT jsonb_build_object(
        'submission_id', p_submission_id,
        'rubric_id',     r.id,
        'title',         r.title,
        'total_points',  r.total_points,
        'criteria', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',            rc.id,
                    'title',         rc.title,
                    'description',   rc.description,
                    'max_points',    rc.max_points,
                    'sequence',      rc.sequence,
                    'points_earned', re.points_earned,
                    'feedback',      re.feedback
                )
                ORDER BY rc.sequence ASC
            ), '[]'::JSONB)
            FROM public.rubric_criteria rc
            LEFT JOIN public.rubric_evaluations re
                ON re.criteria_id = rc.id
                AND re.submission_id = p_submission_id
                AND re.deleted_at IS NULL
            WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.rubrics r
    WHERE r.id = v_rubric_id AND r.deleted_at IS NULL;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_system_settings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id',                        ss.id,
        'institution_name',          ss.institution_name,
        'institution_short_name',    ss.institution_short_name,
        'institution_address',       ss.institution_address,
        'institution_email',         ss.institution_email,
        'institution_phone',         ss.institution_phone,
        'institution_website',       ss.institution_website,
        'institution_logo_url',      ss.institution_logo_url,
        'academic_year_start_month', ss.academic_year_start_month,
        'max_units_per_term',        ss.max_units_per_term,
        'default_term_type_id',      ss.default_term_type_id,
        'default_evaluation_scope',  ss.default_evaluation_scope::TEXT
    )
    INTO v_result
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    ORDER BY ss.created_at ASC
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_term_by_id(p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', t.id,
        'school_year_id', t.school_year_id,
        'term_type_id', t.term_type_id,
        'status', t.status,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'enrollment_start_date', t.enrollment_start_date,
        'enrollment_end_date', t.enrollment_end_date,
        'grading_deadline', t.grading_deadline,
        'evaluation_scope', COALESCE(t.evaluation_scope::TEXT, ''),
        'effective_evaluation_scope', public.fn_get_evaluation_scope(t.id)::TEXT
    )
    INTO v_result
    FROM public.terms t
    WHERE t.id = p_term_id
    AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_term_type_by_id(p_term_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', tt.id,
        'code', tt.code,
        'label', tt.label,
        'sequence', tt.sequence,
        'description', tt.description
    )
    INTO v_result
    FROM public.term_types tt
    WHERE tt.id = p_term_type_id
    AND tt.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_term_types()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', tt.id,
                'code', tt.code,
                'label', tt.label,
                'sequence', tt.sequence
            )
            ORDER BY tt.sequence ASC
        ), '[]'::jsonb)
        FROM public.term_types tt
        WHERE tt.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_terms()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'label', tt.label || ' - ' || sy.label
            )
            ORDER BY t.start_date DESC
        ), '[]'::JSONB)
        FROM public.terms t
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_transmutation_table()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gtt.id,
                'label', gtt.label,
                'min_percentage', gtt.min_percentage,
                'max_percentage', gtt.max_percentage,
                'transmuted_grade', gtt.transmuted_grade,
                'description', gtt.description
            )
            ORDER BY gtt.transmuted_grade ASC
        ), '[]'::jsonb)
        FROM public.grade_transmutation_tables gtt
        WHERE gtt.deleted_at IS NULL
        AND gtt.program_id IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_unmet_prerequisites(p_student_id uuid, p_course_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT string_agg(unmet.label, ', ' ORDER BY unmet.label)
    FROM (
        SELECT CASE
            WHEN cp.prerequisite_kind = 'standing'
                THEN 'Year ' || cp.year_level_required::TEXT || ' standing'
            ELSE COALESCE(pc.code, 'Unknown course')
        END AS label
        FROM public.course_prerequisites cp
        LEFT JOIN public.courses pc ON pc.id = cp.prerequisite_id AND pc.deleted_at IS NULL
        WHERE cp.course_id = p_course_id
        AND cp.deleted_at IS NULL
        AND cp.prerequisite_type = 'Required'
        AND (
            (
                cp.prerequisite_kind = 'standing'
                AND EXISTS (
                    SELECT 1 FROM public.students st
                    WHERE st.id = p_student_id
                    AND st.deleted_at IS NULL
                    AND st.year_level < cp.year_level_required
                )
            )
            OR (
                cp.prerequisite_kind = 'course'
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status = 'Completed'
                    AND s.course_id = cp.prerequisite_id
                    AND (cp.minimum_grade IS NULL OR COALESCE(e.final_grade, 5.0) <= cp.minimum_grade)
                )
            )
        )
    ) unmet;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_unread_notification_count()
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_count INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RETURN 0;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.notifications n
    WHERE n.user_id = v_uid
      AND n.is_read = false
      AND n.deleted_at IS NULL;

    RETURN COALESCE(v_count, 0);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_user_by_id(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'email', u.email,
        'status', u.status,
        'role_codes', COALESCE((
            SELECT jsonb_agg(r.code ORDER BY r.code)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.users u
    WHERE u.id = p_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_get_users_by_roles(p_role_codes text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'full_name', u.first_name || ' ' || u.last_name,
                'role_label', r.label
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::jsonb)
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        AND (p_role_codes IS NULL OR r.code = ANY(p_role_codes))
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_grade_submission(p_submission_id uuid, p_feedback text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_answer      JSONB;
    v_total_score NUMERIC := 0;
    v_max_score   NUMERIC := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE asub.id = p_submission_id
        AND s.faculty_id = auth.uid()
        AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        UPDATE public.student_answers
        SET
            points_earned = (v_answer->>'points_earned')::NUMERIC,
            grader_notes  = NULLIF(trim(v_answer->>'grader_notes'), '')
        WHERE id = (v_answer->>'id')::UUID
        AND submission_id = p_submission_id
        AND deleted_at IS NULL;
    END LOOP;

    SELECT
        COALESCE(SUM(sa.points_earned), 0),
        COALESCE(SUM(aq.points), 0)
    INTO v_total_score, v_max_score
    FROM public.student_answers sa
    INNER JOIN public.assessment_questions aq ON aq.id = sa.question_id AND aq.deleted_at IS NULL
    WHERE sa.submission_id = p_submission_id
    AND sa.deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET
        raw_score  = v_total_score,
        final_score = v_total_score,
        feedback   = NULLIF(p_feedback, ''),
        status     = 'Graded'::public.submission_status_type,
        graded_at  = now(),
        graded_by  = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Submission graded successfully.',
        'raw_score', v_total_score,
        'max_score', v_max_score
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_grade_submission_rubric(p_submission_id uuid, p_feedback text, p_evaluations jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id  UUID;
    v_rubric_id   UUID;
    v_eval        JSONB;
    v_criteria_id UUID;
    v_points      NUMERIC;
    v_max_points  NUMERIC;
    v_total       NUMERIC := 0;
    v_updated     INTEGER;
BEGIN
    v_section_id := public.fn_resolve_submission_section(p_submission_id);
    PERFORM public.fn_assert_section_staff(v_section_id);

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_item_rubrics air
        ON air.assessment_item_id = asub.assessment_item_id AND air.deleted_at IS NULL
    WHERE asub.id = p_submission_id AND asub.deleted_at IS NULL
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rubric attached to this assessment.');
    END IF;

    FOR v_eval IN SELECT * FROM jsonb_array_elements(p_evaluations)
    LOOP
        v_criteria_id := (v_eval->>'criteria_id')::UUID;
        v_points := COALESCE((v_eval->>'points_earned')::NUMERIC, 0);

        SELECT rc.max_points INTO v_max_points
        FROM public.rubric_criteria rc
        WHERE rc.id = v_criteria_id
        AND rc.rubric_id = v_rubric_id
        AND rc.deleted_at IS NULL;

        IF v_max_points IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'A criterion does not belong to the attached rubric.');
        END IF;

        IF v_points < 0 OR v_points > v_max_points THEN
            RETURN jsonb_build_object('success', false, 'message', 'Points for a criterion exceed its maximum.');
        END IF;

        UPDATE public.rubric_evaluations
        SET
            points_earned = v_points,
            feedback      = NULLIF(trim(v_eval->>'feedback'), ''),
            evaluated_by  = auth.uid(),
            evaluated_at  = now()
        WHERE submission_id = p_submission_id
        AND criteria_id = v_criteria_id
        AND deleted_at IS NULL;

        GET DIAGNOSTICS v_updated = ROW_COUNT;

        IF v_updated = 0 THEN
            INSERT INTO public.rubric_evaluations (submission_id, criteria_id, points_earned, feedback, evaluated_by)
            VALUES (p_submission_id, v_criteria_id, v_points, NULLIF(trim(v_eval->>'feedback'), ''), auth.uid());
        END IF;

        v_total := v_total + v_points;
    END LOOP;

    UPDATE public.assessment_submissions
    SET
        raw_score   = v_total,
        final_score = v_total,
        feedback    = NULLIF(p_feedback, ''),
        status      = 'Graded'::public.submission_status_type,
        graded_at   = now(),
        graded_by   = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric grade saved.', 'raw_score', v_total);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_insert_discussion_attachments(p_thread_id uuid, p_post_id uuid, p_attachments jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.discussion_attachments (thread_id, post_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_thread_id,
        p_post_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_insert_evaluation_questions(p_template_id uuid, p_questions jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_question JSONB;
    v_sequence SMALLINT := 1;
    v_type public.evaluation_question_type;
BEGIN
    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
        v_type := (v_question->>'question_type')::public.evaluation_question_type;

        INSERT INTO public.evaluation_questions (
            template_id, question_text, question_type, sequence, is_required, min_rating, max_rating, created_by
        )
        VALUES (
            p_template_id,
            btrim(v_question->>'question_text'),
            v_type,
            v_sequence,
            COALESCE((v_question->>'is_required')::BOOLEAN, true),
            CASE WHEN v_type = 'Rating'
                THEN COALESCE((v_question->>'min_rating')::SMALLINT, 1)
                ELSE NULL
            END,
            CASE WHEN v_type = 'Rating'
                THEN COALESCE((v_question->>'max_rating')::SMALLINT, 5)
                ELSE NULL
            END,
            auth.uid()
        );

        v_sequence := v_sequence + 1;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_is_readable_hex_color(p_color text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_hex TEXT;
    v_index INT;
    v_channel NUMERIC;
    v_channels NUMERIC[] := ARRAY[]::NUMERIC[];
    v_luminance NUMERIC;
BEGIN
    IF p_color IS NULL THEN
        RETURN FALSE;
    END IF;

    v_hex := lower(replace(btrim(p_color), '#', ''));

    IF v_hex !~ '^[0-9a-f]{6}$' THEN
        RETURN FALSE;
    END IF;

    FOR v_index IN 0..2 LOOP
        v_channel := (('x' || substr(v_hex, v_index * 2 + 1, 2))::bit(8)::int) / 255.0;

        IF v_channel <= 0.03928 THEN
            v_channel := v_channel / 12.92;
        ELSE
            v_channel := power((v_channel + 0.055) / 1.055, 2.4);
        END IF;

        v_channels := array_append(v_channels, v_channel);
    END LOOP;

    v_luminance := 0.2126 * v_channels[1] + 0.7152 * v_channels[2] + 0.0722 * v_channels[3];

    RETURN v_luminance >= 0.05 AND v_luminance <= 0.62;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_is_section_faculty(p_section_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id
          AND s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
    );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_is_section_grading_locked(p_section_id uuid, p_grading_period_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.section_final_grades sfg
        INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at IS NULL
    );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_announcements_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_audience text DEFAULT NULL::text, p_is_pinned boolean DEFAULT NULL::boolean, p_mine_only boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE a.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_mine_only THEN
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_audience IS NOT NULL AND p_audience <> '' THEN
        v_where := v_where || format(' AND a.target_audience = %L', p_audience);
    END IF;

    IF p_is_pinned IS NOT NULL THEN
        v_where := v_where || format(' AND a.is_pinned = %L', p_is_pinned::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.expires_at,
            a.created_at,
            a.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ) AS section_count,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'a.is_pinned DESC, a.created_at DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_applicable_evaluation_templates(p_student_id uuid)
 RETURNS TABLE(id uuid, title text, description text, sequence smallint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT t.id, t.title, t.description, t.sequence
    FROM public.evaluation_templates t
    WHERE t.is_active = true
    AND t.deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.evaluation_questions q
        WHERE q.template_id = t.id AND q.deleted_at IS NULL
    )
    AND (
        NOT EXISTS (
            SELECT 1 FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        )
        OR EXISTS (
            SELECT 1
            FROM public.evaluation_template_programs tp
            INNER JOIN public.students s
                ON s.id = p_student_id
                AND s.deleted_at IS NULL
                AND s.program_id = tp.program_id
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        )
    )
    ORDER BY t.sequence ASC, t.created_at ASC;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_assessments(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',                    ai.id,
                'title',                 ai.title,
                'description',           ai.description,
                'assessment_type',       ai.assessment_type,
                'total_points',          ai.total_points,
                'passing_points',        ai.passing_points,
                'time_limit_minutes',    ai.time_limit_minutes,
                'max_attempts',          ai.max_attempts,
                'is_published',          ai.is_published,
                'published_at',          ai.published_at,
                'opens_at',              ai.opens_at,
                'due_at',                ai.due_at,
                'closes_at',             ai.closes_at,
                'show_results_at',       ai.show_results_at,
                'scheduled_publish_at',  ai.scheduled_publish_at,
                'shuffle_questions',     ai.shuffle_questions,
                'shuffle_choices',       ai.shuffle_choices,
                'show_all_questions',    ai.show_all_questions,
                'questions_per_page',    ai.questions_per_page,
                'grading_component_id',  ai.grading_component_id,
                'question_count', (
                    SELECT COUNT(*) FROM public.assessment_questions aq
                    WHERE aq.assessment_item_id = ai.id AND aq.deleted_at IS NULL
                ),
                'submission_count', (
                    SELECT COUNT(*) FROM public.assessment_submissions asub
                    WHERE asub.assessment_item_id = ai.id AND asub.deleted_at IS NULL
                ),
                'attachments', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',              aa.id,
                            'file_name',       aa.file_name,
                            'file_url',        aa.file_url,
                            'file_size_bytes', aa.file_size_bytes,
                            'mime_type',       aa.mime_type,
                            'sequence',        aa.sequence
                        )
                        ORDER BY aa.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.assessment_attachments aa
                    WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
                )
            )
            ORDER BY ai.created_at DESC
        ), '[]'::JSONB)
        FROM public.assessment_items ai
        WHERE ai.section_id = p_section_id
        AND ai.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_attendance_sessions(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT public.fn_can_access_section_staff(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           ats.id,
                'session_date', ats.session_date,
                'notes',        ats.notes
            )
            ORDER BY ats.session_date DESC
        ), '[]'::JSONB)
        FROM public.attendance_sessions ats
        WHERE ats.section_id = p_section_id
        AND ats.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_competencies_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_program_ids uuid[] DEFAULT NULL::uuid[], p_course_ids uuid[] DEFAULT NULL::uuid[], p_scope text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE cm.deleted_at IS NULL';
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (cm.code ILIKE %L OR cm.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND cm.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND cm.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_scope = 'Course' THEN
        v_where := v_where || ' AND cm.course_id IS NOT NULL';
    ELSIF p_scope = 'Program' THEN
        v_where := v_where || ' AND cm.course_id IS NULL';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND cm.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            cm.id,
            cm.program_id,
            p.code AS program_code,
            p.name AS program_name,
            cm.course_id,
            c.code AS course_code,
            c.title AS course_title,
            CASE WHEN cm.course_id IS NOT NULL THEN ''Course'' ELSE ''Program'' END AS scope,
            cm.code,
            cm.title,
            cm.description,
            cm.bloom_level,
            cm.sort_order,
            cm.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.competencies cm
        LEFT JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
        LEFT JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'cm.code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_course_types_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            ct.id,
            ct.code,
            ct.label,
            ct.description,
            COUNT(*) OVER() AS total_count
        FROM public.course_types ct
        WHERE ct.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (ct.label ILIKE %L OR ct.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'ct.created_at ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_courses_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_department_ids uuid[] DEFAULT NULL::uuid[], p_course_type_ids uuid[] DEFAULT NULL::uuid[], p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE c.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_type_ids IS NOT NULL AND array_length(p_course_type_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.course_type_id = ANY(' || quote_literal(p_course_type_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND c.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.code,
            c.title,
            c.description,
            c.department_id,
            d.name AS department_name,
            c.course_type_id,
            ct.label AS course_type_label,
            c.lecture_units,
            c.laboratory_units,
            c.total_units,
            c.credit_hours,
            c.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.courses c
        JOIN public.departments d ON d.id = c.department_id AND d.deleted_at IS NULL
        JOIN public.course_types ct ON ct.id = c.course_type_id AND ct.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'c.code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_departments_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_has_head boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE d.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (d.code ILIKE %L OR d.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_has_head IS NOT NULL THEN
        IF p_has_head THEN
            v_where := v_where || ' AND d.head_user_id IS NOT NULL';
        ELSE
            v_where := v_where || ' AND d.head_user_id IS NULL';
        END IF;
    END IF;

    v_base_query := format(
        'SELECT
            d.id,
            d.code,
            d.name,
            d.description,
            d.head_user_id,
            CASE
                WHEN d.head_user_id IS NOT NULL
                THEN u.first_name || '' '' || u.last_name
                ELSE NULL
            END AS head_full_name,
            CASE
                WHEN d.head_user_id IS NOT NULL
                THEN r.label
                ELSE NULL
            END AS head_role_label,
            COUNT(*) OVER() AS total_count
        FROM public.departments d
        LEFT JOIN public.users u ON u.id = d.head_user_id AND u.deleted_at IS NULL
        LEFT JOIN public.user_roles ur ON ur.user_id = d.head_user_id AND ur.deleted_at IS NULL
        LEFT JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'd.code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_eligible_sections(p_student_id uuid, p_term_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_scope text DEFAULT 'recommended'::text, p_year_levels smallint[] DEFAULT NULL::smallint[], p_include_full boolean DEFAULT true, p_include_prerequisite_gaps boolean DEFAULT true, p_include_conflicts boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id     UUID := p_term_id;
    v_program_id  UUID;
    v_year_level  SMALLINT;
    v_term_type   UUID;
    v_scope       TEXT := COALESCE(NULLIF(lower(p_scope), ''), 'recommended');
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_scope NOT IN ('recommended', 'all') THEN
        v_scope := 'recommended';
    END IF;

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT program_id, year_level INTO v_program_id, v_year_level
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL OR v_term_id IS NULL THEN
        RETURN jsonb_build_object(
            'scope', v_scope,
            'recommended_count', 0,
            'available_count', 0,
            'total_count', 0,
            'rows', '[]'::JSONB
        );
    END IF;

    SELECT term_type_id INTO v_term_type
    FROM public.terms
    WHERE id = v_term_id AND deleted_at IS NULL;

    RETURN (
        WITH candidates AS (
            SELECT
                x.*,
                (x.slots_taken >= x.max_slots) AS is_full
            FROM (
                SELECT
                    s.id AS section_id,
                    s.section_code,
                    s.status::TEXT AS section_status,
                    c.id AS course_id,
                    c.code AS course_code,
                    c.title AS course_title,
                    c.total_units AS units,
                    COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned') AS faculty_name,
                    COALESCE(s.room, '—') AS room,
                    s.max_slots::INT AS max_slots,
                    (
                        SELECT COUNT(*)::INT
                        FROM public.enrollments e2
                        WHERE e2.section_id = s.id
                        AND e2.deleted_at IS NULL
                        AND e2.status NOT IN ('Dropped', 'Withdrawn')
                    ) AS slots_taken,
                    cm.year_level::INT AS curriculum_year_level,
                    cm.is_elective,
                    (
                        cm.year_level = v_year_level
                        AND (cm.term_type_id IS NULL OR cm.term_type_id = v_term_type)
                    ) AS is_recommended,
                    public.fn_get_schedule_conflicts(p_student_id, s.id) AS conflict_with,
                    public.fn_get_unmet_prerequisites(p_student_id, c.id) AS unmet_prerequisites,
                    COALESCE((
                        SELECT string_agg(
                            ss.day_of_week::TEXT || ' ' ||
                            to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                            to_char(ss.time_end, 'HH12:MI AM'),
                            ', ' ORDER BY ss.day_of_week, ss.time_start
                        )
                        FROM public.section_schedules ss
                        WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                    ), 'No schedule set') AS schedule_label
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                INNER JOIN LATERAL (
                    SELECT cmi.year_level, cmi.sequence, cmi.is_elective, cmi.term_type_id
                    FROM public.curriculum_maps cmi
                    WHERE cmi.course_id = c.id
                    AND cmi.program_id = v_program_id
                    AND cmi.deleted_at IS NULL
                    ORDER BY cmi.year_level, cmi.sequence
                    LIMIT 1
                ) cm ON TRUE
                LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
                WHERE s.deleted_at IS NULL
                AND s.term_id = v_term_id
                AND s.status NOT IN ('Closed', 'Cancelled')
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s3 ON s3.id = e.section_id AND s3.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status IN ('Enrolled', 'Completed')
                    AND s3.course_id = c.id
                )
                AND (
                    p_search IS NULL
                    OR p_search = ''
                    OR c.code ILIKE '%' || p_search || '%'
                    OR c.title ILIKE '%' || p_search || '%'
                    OR s.section_code ILIKE '%' || p_search || '%'
                )
            ) x
        ),
        visible AS (
            SELECT *
            FROM candidates
            WHERE (v_scope = 'all' OR is_recommended)
            AND (p_year_levels IS NULL OR curriculum_year_level = ANY (p_year_levels))
            AND (COALESCE(p_include_full, TRUE) OR NOT is_full)
            AND (COALESCE(p_include_prerequisite_gaps, TRUE) OR unmet_prerequisites IS NULL)
            AND (COALESCE(p_include_conflicts, TRUE) OR conflict_with IS NULL)
        )
        SELECT jsonb_build_object(
            'scope', v_scope,
            'recommended_count', (
                SELECT COUNT(*)::INT FROM candidates WHERE is_recommended
            ),
            'available_count', (
                SELECT COUNT(*)::INT FROM candidates WHERE is_recommended AND NOT is_full
            ),
            'total_count', (SELECT COUNT(*)::INT FROM candidates),
            'rows', COALESCE((
                SELECT jsonb_agg(
                    to_jsonb(v) ORDER BY
                        v.is_recommended DESC,
                        v.is_full ASC,
                        v.curriculum_year_level,
                        v.course_code,
                        v.section_code
                )
                FROM visible v
            ), '[]'::JSONB)
        )
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_enrollment_students_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels integer[] DEFAULT NULL::integer[], p_statuses text[] DEFAULT NULL::text[], p_enrollment_states text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id    UUID := p_term_id;
    v_term_lit   TEXT;
    v_base_query TEXT;
    v_where      TEXT := 'WHERE st.deleted_at IS NULL';
    v_load_exists TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    v_term_lit := COALESCE(quote_literal(v_term_id::TEXT), quote_literal('00000000-0000-0000-0000-000000000000'));

    v_load_exists := format(
        'EXISTS (
            SELECT 1 FROM public.enrollments le
            INNER JOIN public.sections ls ON ls.id = le.section_id AND ls.deleted_at IS NULL
            WHERE le.student_id = st.id
            AND le.deleted_at IS NULL
            AND le.status = ''Enrolled''
            AND ls.term_id = %s::uuid
        )',
        v_term_lit
    );

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND st.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_year_levels IS NOT NULL AND array_length(p_year_levels, 1) > 0 THEN
        v_where := v_where || ' AND st.year_level = ANY(' || quote_literal(p_year_levels::TEXT) || '::int[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND st.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.student_status_type[])';
    END IF;

    IF p_enrollment_states IS NOT NULL AND array_length(p_enrollment_states, 1) = 1 THEN
        IF p_enrollment_states[1] = 'Enrolled' THEN
            v_where := v_where || ' AND ' || v_load_exists;
        ELSIF p_enrollment_states[1] = 'Not Enrolled' THEN
            v_where := v_where || ' AND NOT ' || v_load_exists;
        END IF;
    END IF;

    v_base_query := format(
        'SELECT
            st.id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS student_name,
            u.email,
            st.year_level,
            st.status,
            st.program_id,
            COALESCE(p.code, ''—'') AS program_code,
            COALESCE(p.name, ''No program assigned'') AS program_name,
            COALESCE(ld.enrolled_count, 0)::INT AS enrolled_count,
            COALESCE(ld.enrolled_units, 0)::NUMERIC AS enrolled_units,
            CASE WHEN COALESCE(ld.enrolled_count, 0) > 0 THEN ''Enrolled'' ELSE ''Not Enrolled'' END AS enrollment_state,
            COUNT(*) OVER() AS total_count
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) AS enrolled_count,
                COALESCE(SUM(c.total_units), 0) AS enrolled_units
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE e.student_id = st.id
            AND e.deleted_at IS NULL
            AND e.status = ''Enrolled''
            AND s.term_id = %s::uuid
        ) ld ON TRUE
        %s',
        v_term_lit,
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'student_number ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_enrollments_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_ids uuid[] DEFAULT NULL::uuid[], p_section_ids uuid[] DEFAULT NULL::uuid[], p_statuses text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_section_ids IS NOT NULL AND array_length(p_section_ids, 1) > 0 THEN
        v_where := v_where || ' AND e.section_id = ANY(' || quote_literal(p_section_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND e.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.enrollment_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            e.id,
            e.student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS student_name,
            e.section_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            e.status,
            e.enrolled_at,
            e.final_grade,
            e.is_grade_visible,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.enrolled_at DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_evaluation_templates_json(p_page integer DEFAULT 1, p_size integer DEFAULT 10, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (t.title ILIKE %L OR t.description ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.title,
            t.description,
            t.is_active,
            t.sequence,
            COALESCE((
                SELECT jsonb_agg(tp.program_id)
                FROM public.evaluation_template_programs tp
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            ), ''[]''::JSONB) AS program_ids,
            (
                SELECT count(*)
                FROM public.evaluation_questions q
                WHERE q.template_id = t.id AND q.deleted_at IS NULL
            ) AS question_count,
            COUNT(*) OVER() AS total_count
        FROM public.evaluation_templates t
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.sequence ASC, t.created_at ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_events_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_audience text DEFAULT NULL::text, p_upcoming_only boolean DEFAULT false, p_mine_only boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_mine_only THEN
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (e.title ILIKE %L OR e.description ILIKE %L OR e.location ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_audience IS NOT NULL AND p_audience <> '' THEN
        v_where := v_where || format(' AND e.target_audience = %L', p_audience);
    END IF;

    IF p_upcoming_only THEN
        v_where := v_where || ' AND (e.end_at >= now() OR (e.end_at IS NULL AND e.start_at >= now()))';
    END IF;

    v_base_query := format(
        'SELECT
            e.id,
            e.title,
            e.description,
            e.location,
            e.target_audience,
            e.start_at,
            e.end_at,
            e.all_day,
            e.created_at,
            e.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.event_sections esx
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ) AS section_count,
            COUNT(*) OVER() AS total_count
        FROM public.events e
        LEFT JOIN public.users u ON u.id = e.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.start_at ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_faculty_load_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'u.deleted_at IS NULL';
    v_term_clause  TEXT := '';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            u.email,
            (
                SELECT COUNT(*)
                FROM public.sections s
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
            ) AS section_count,
            (
                SELECT COALESCE(SUM(c.total_units), 0)
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
            ) AS total_units,
            (
                SELECT COUNT(*)
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND e.deleted_at IS NULL
                  AND e.status = ''Enrolled''::public.enrollment_status_type
                  %1$s
            ) AS student_count,
            (
                SELECT COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (sch.time_end - sch.time_start)) / 3600.0)::NUMERIC, 2), 0)
                FROM public.section_schedules sch
                INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND sch.deleted_at IS NULL
                  %1$s
            ) AS weekly_hours,
            (
                SELECT COUNT(*)
                FROM public.section_schedules a
                INNER JOIN public.sections s ON s.id = a.section_id AND s.deleted_at IS NULL
                INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
                INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
                WHERE a.deleted_at IS NULL
                  AND s.faculty_id = u.id
                  AND sb.faculty_id = u.id
                  AND sb.id <> s.id
                  AND sb.term_id = s.term_id
                  AND a.day_of_week = b.day_of_week
                  AND a.time_start < b.time_end
                  AND b.time_start < a.time_end
                  %1$s
            ) AS conflict_count,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        WHERE EXISTS (
            SELECT 1
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
              AND r.code = ''Faculty''
        )
        AND %2$s',
        v_term_clause,
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_grade_audit_logs_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_action text DEFAULT NULL::text, p_table_name text DEFAULT NULL::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE gal.deleted_at IS NULL';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (cu.first_name ILIKE %L
                OR cu.last_name ILIKE %L
                OR gal.field_changed ILIKE %L
                OR gal.change_reason ILIKE %L
                OR su.first_name ILIKE %L
                OR su.last_name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND gal.action = %L::public.audit_action_type', p_action);
    END IF;

    IF p_table_name IS NOT NULL AND p_table_name <> 'All' AND p_table_name <> '' THEN
        v_where_clause := v_where_clause || format(' AND gal.table_name = %L', p_table_name);
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND gal.changed_at >= %L::DATE', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND gal.changed_at < (%L::DATE + 1)', p_date_to);
    END IF;

    v_base_query := format(
        'SELECT
            gal.id,
            gal.action::TEXT AS action,
            gal.table_name,
            gal.field_changed,
            gal.old_value,
            gal.new_value,
            gal.change_reason,
            gal.changed_at,
            COALESCE(cu.first_name || '' '' || cu.last_name, ''System'') AS changed_by_name,
            COALESCE(su.first_name || '' '' || su.last_name, '''') AS student_name,
            COALESCE(sec.section_code, '''') AS section_code,
            COALESCE(gp.name, '''') AS grading_period_name,
            COUNT(*) OVER () AS total_count
        FROM public.grade_audit_logs gal
        LEFT JOIN public.users cu ON cu.id = gal.changed_by
        LEFT JOIN public.enrollments e ON e.id = gal.enrollment_id AND e.deleted_at IS NULL
        LEFT JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        LEFT JOIN public.users su ON su.id = st.user_id AND su.deleted_at IS NULL
        LEFT JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp ON gp.id = gal.grading_period_id AND gp.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'gal.changed_at DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_grade_release_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'WITH grading_period_stats AS (
            SELECT
                gp.id AS grading_period_id,
                gp.term_id,
                gp.name AS grading_period_name,
                gp.sequence,
                e.section_id,
                COUNT(sfg.id) AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Released'') AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Approved'') AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Draft'') AS draft_count
            FROM public.grading_periods gp
            LEFT JOIN public.enrollments e
                ON e.section_id IN (
                    SELECT id FROM public.sections WHERE term_id = gp.term_id AND deleted_at IS NULL
                )
                AND e.deleted_at IS NULL
            LEFT JOIN public.section_final_grades sfg
                ON sfg.grading_period_id = gp.id
                AND sfg.enrollment_id = e.id
                AND sfg.deleted_at IS NULL
            WHERE gp.deleted_at IS NULL
            GROUP BY gp.id, gp.term_id, gp.name, gp.sequence, e.section_id
        ),
        grading_period_agg AS (
            SELECT
                section_id,
                jsonb_agg(jsonb_build_object(
                    ''grading_period_id'', grading_period_id,
                    ''grading_period_name'', grading_period_name,
                    ''sequence'', sequence,
                    ''total_grades'', total_grades,
                    ''released_count'', released_count,
                    ''approved_count'', approved_count,
                    ''draft_count'', draft_count
                ) ORDER BY sequence ASC) AS grading_periods
            FROM grading_period_stats
            WHERE section_id IS NOT NULL
            GROUP BY section_id
        )
        SELECT
            s.id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            u.first_name || '' '' || u.last_name AS faculty_name,
            tt.label || '' - '' || sy.label AS term_label,
            s.status AS section_status,
            gpa.grading_periods,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN grading_period_agg gpa ON gpa.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_grade_release_schedule(p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'grading_period_id',   gp.id,
                'grading_period_name', gp.name,
                'sequence',            gp.sequence,
                'start_date',          gp.start_date,
                'end_date',            gp.end_date,
                'release_at',          gp.release_at,
                'total_grades',        stats.total_grades,
                'released_count',      stats.released_count,
                'approved_count',      stats.approved_count,
                'draft_count',         stats.draft_count,
                'blocked_count',       stats.blocked_count
            ) ORDER BY gp.sequence ASC
        )
        FROM public.grading_periods gp
        LEFT JOIN LATERAL (
            SELECT
                COUNT(sfg.id)                                                    AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Released')             AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Approved')             AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Draft')                AS draft_count,
                COUNT(sfg.id) FILTER (
                    WHERE sfg.status <> 'Released'
                      AND NOT public.fn_check_evaluation_completion(sfg.enrollment_id, gp.id)
                )                                                                AS blocked_count
            FROM public.section_final_grades sfg
            WHERE sfg.grading_period_id = gp.id
              AND sfg.deleted_at        IS NULL
        ) stats ON true
        WHERE gp.term_id    = p_term_id
          AND gp.deleted_at IS NULL
    ), '[]'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_grade_sheet(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = p_section_id
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
        )
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section grade sheet.'
            USING ERRCODE = '42501';
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'enrollment_id',   e.id,
                'student_number',  st.student_number,
                'full_name',       u.first_name || ' ' || u.last_name,
                'raw_grade',       sfg.raw_grade,
                'final_grade',     sfg.final_grade,
                'transmuted_grade', sfg.transmuted_grade,
                'status',          sfg.status,
                'special_grade',   sfg.special_grade
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id
            AND sfg.grading_period_id = p_grading_period_id
            AND sfg.deleted_at IS NULL
        WHERE e.section_id = p_section_id
        AND e.status NOT IN ('Dropped', 'Withdrawn')
        AND e.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_grading_components(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',     gc.id,
                'name',   gc.name,
                'weight', gc.weight
            )
            ORDER BY gc.name ASC
        ), '[]'::JSONB)
        FROM public.grading_components gc
        WHERE gc.section_id = p_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_grading_periods_by_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',         gp.id,
                'name',       gp.name,
                'sequence',   gp.sequence,
                'weight',     gp.weight,
                'start_date', gp.start_date,
                'end_date',   gp.end_date
            )
            ORDER BY gp.sequence ASC
        ), '[]'::JSONB)
        FROM public.grading_periods gp
        INNER JOIN public.sections s ON s.term_id = gp.term_id
        WHERE s.id = p_section_id
        AND s.deleted_at IS NULL
        AND gp.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_announcements_feed(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_where := format(
        'WHERE a.deleted_at IS NULL
           AND (a.published_at IS NULL OR a.published_at <= now())
           AND (a.expires_at IS NULL OR a.expires_at > now())
           AND (
                a.created_by = %L
                OR a.target_audience = ''Global''
                OR (a.target_audience IN (''Faculty'', ''Student'')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = a.target_audience::text
                    ))
                OR (a.target_audience = ''Section''
                    AND EXISTS (
                        SELECT 1 FROM public.announcement_sections asx
                        WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.enrollments e
                                  JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = %L AND e.section_id = asx.section_id
                                    AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.sections s
                                  WHERE s.id = asx.section_id AND s.faculty_id = %L AND s.deleted_at IS NULL
                              )
                          )
                    ))
           )',
        v_uid, v_uid, v_uid, v_uid
    );

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.created_at,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_evaluations_json(p_page integer DEFAULT 1, p_size integer DEFAULT 10, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE true';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_status = 'Pending' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = false';
    END IF;

    IF p_status = 'Completed' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = true';
    END IF;

    v_base_query := format(
        'SELECT
            target.enrollment_id,
            target.grading_period_id,
            CASE WHEN target.evaluation_scope = ''Term''
                THEN ''Whole Term''
                ELSE gp.name
            END AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            target.evaluation_scope::TEXT AS evaluation_scope,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS is_completed,
            epl.completed_at,
            COUNT(*) OVER() AS total_count
        FROM (
            SELECT DISTINCT
                e.id AS enrollment_id,
                public.fn_resolve_evaluation_period(e.id, sfg.grading_period_id) AS grading_period_id,
                public.fn_get_enrollment_evaluation_scope(e.id) AS evaluation_scope
            FROM public.enrollments e
            INNER JOIN public.section_final_grades sfg
                ON sfg.enrollment_id = e.id
                AND sfg.deleted_at IS NULL
                AND sfg.status = ''Released''
            WHERE e.student_id = %L
            AND e.deleted_at IS NULL
        ) target
        INNER JOIN public.enrollments e ON e.id = target.enrollment_id
        INNER JOIN public.grading_periods gp ON gp.id = target.grading_period_id AND gp.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = target.enrollment_id
            AND epl.grading_period_id = target.grading_period_id
            AND epl.deleted_at IS NULL
        %s',
        v_student_id,
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'is_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_events_feed(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_result JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.start_at), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            e.id,
            e.title,
            e.description,
            e.location,
            e.target_audience,
            e.start_at,
            e.end_at,
            e.all_day
        FROM public.events e
        WHERE e.deleted_at IS NULL
          AND e.start_at < p_to
          AND (COALESCE(e.end_at, e.start_at) >= p_from)
          AND (
                e.target_audience = 'Global'
                OR (e.target_audience IN ('Faculty', 'Student')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = e.target_audience::text
                    ))
                OR (e.target_audience = 'Section'
                    AND EXISTS (
                        SELECT 1 FROM public.event_sections esx
                        WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.enrollments en
                                  JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = v_uid AND en.section_id = esx.section_id
                                    AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.sections s
                                  WHERE s.id = esx.section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
                              )
                          )
                    ))
          )
    ) t;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_grades(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id)
        || ' AND e.deleted_at IS NULL'
        || ' AND sfg.status = ''Released'''
        || ' AND sfg.deleted_at IS NULL';

    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.id = %L', p_term_id);
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            gp.id AS grading_period_id,
            public.fn_resolve_evaluation_period(e.id, gp.id) AS evaluation_period_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            gp.name AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS evaluation_completed,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.raw_grade END AS raw_grade,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.final_grade END AS final_grade,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.transmuted_grade END AS transmuted_grade,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.special_grade END AS special_grade,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = e.id
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(e.id, gp.id)
            AND epl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'evaluation_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_notifications_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_unread_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_where := format('WHERE n.deleted_at IS NULL AND n.user_id = %L', v_uid);

    IF p_unread_only THEN
        v_where := v_where || ' AND n.is_read = false';
    END IF;

    v_base_query := format(
        'SELECT
            n.id,
            n.title,
            n.message,
            n.is_read,
            n.read_at,
            n.action_url,
            n.notification_type,
            n.created_at,
            COUNT(*) OVER() AS total_count
        FROM public.notifications n
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'n.created_at DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_section_colors()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'section_id', c.section_id,
        'color', c.color
    )), '[]'::jsonb)
    INTO v_result
    FROM public.student_section_colors c
    WHERE c.student_id = v_student_id
      AND c.deleted_at IS NULL;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_sections(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL AND s.faculty_id = auth.uid()';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'WITH enrolled_counts AS (
            SELECT
                e.section_id,
                COUNT(*) AS enrolled_count
            FROM public.enrollments e
            WHERE e.status NOT IN (''Dropped'', ''Withdrawn'')
            AND e.deleted_at IS NULL
            GROUP BY e.section_id
        )
        SELECT
            s.id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            s.status,
            s.max_slots,
            COALESCE(ec.enrolled_count, 0) AS enrolled_count,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN enrolled_counts ec ON ec.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_subjects(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id) || ' AND e.deleted_at IS NULL';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            s.id AS section_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            c.lecture_units,
            c.laboratory_units,
            tt.label || '' - '' || sy.label AS term_label,
            u.first_name || '' '' || u.last_name AS faculty_name,
            e.status AS enrollment_status,
            e.final_grade,
            e.is_grade_visible,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'term_label DESC, c.code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_my_teaching_sections(p_exclude_section_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'term_label', tt.label || ' - ' || sy.label
            )
            ORDER BY sy.label DESC, tt.label, c.code, s.section_code
        ), '[]'::jsonb)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
          AND (p_exclude_section_id IS NULL OR s.id <> p_exclude_section_id)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_program_levels_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            pl.id,
            pl.code,
            pl.label,
            pl.description,
            COUNT(*) OVER() AS total_count
        FROM public.program_levels pl
        WHERE pl.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (pl.label ILIKE %L OR pl.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'pl.created_at ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_programs_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_department_id uuid DEFAULT NULL::uuid, p_program_level_id uuid DEFAULT NULL::uuid, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE p.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (p.code ILIKE %L OR p.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_department_id IS NOT NULL THEN
        v_where := v_where || format(' AND p.department_id = %L', p_department_id);
    END IF;

    IF p_program_level_id IS NOT NULL THEN
        v_where := v_where || format(' AND p.program_level_id = %L', p_program_level_id);
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND p.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            p.id,
            p.code,
            p.name,
            p.description,
            p.department_id,
            d.name AS department_name,
            p.program_level_id,
            pl.label AS program_level_label,
            p.total_units,
            p.years_duration,
            p.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.programs p
        JOIN public.departments d ON d.id = p.department_id AND d.deleted_at IS NULL
        JOIN public.program_levels pl ON pl.id = p.program_level_id AND pl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'p.code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_programs_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_department_ids uuid[] DEFAULT NULL::uuid[], p_program_level_ids uuid[] DEFAULT NULL::uuid[], p_is_active boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE p.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (p.code ILIKE %L OR p.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND p.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_program_level_ids IS NOT NULL AND array_length(p_program_level_ids, 1) > 0 THEN
        v_where := v_where || ' AND p.program_level_id = ANY(' || quote_literal(p_program_level_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND p.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            p.id,
            p.code,
            p.name,
            p.description,
            p.department_id,
            d.name AS department_name,
            p.program_level_id,
            pl.label AS program_level_label,
            p.total_units,
            p.years_duration,
            p.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.programs p
        JOIN public.departments d ON d.id = p.department_id AND d.deleted_at IS NULL
        JOIN public.program_levels pl ON pl.id = p.program_level_id AND pl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'p.code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_progression_candidates(p_term_id uuid, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels smallint[] DEFAULT NULL::smallint[], p_student_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(student_id uuid, student_number text, student_name text, program_id uuid, program_code text, current_year_level smallint, proposed_year_level smallint, is_promoted boolean, blocker_code text, blocker_message text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH target AS (
        SELECT t.id, t.school_year_id, t.term_type_id
        FROM public.terms t
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
    ),
    base AS (
        SELECT
            st.id,
            st.student_number,
            u.first_name || ' ' || u.last_name AS student_name,
            st.program_id,
            p.code AS program_code,
            LEAST(COALESCE(p.years_duration, 6), 6)::SMALLINT AS max_year_level,
            st.year_level,
            st.status
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        WHERE st.deleted_at IS NULL
          AND (p_program_ids IS NULL OR st.program_id = ANY (p_program_ids))
          AND (p_year_levels IS NULL OR st.year_level = ANY (p_year_levels))
          AND (p_student_ids IS NULL OR st.id = ANY (p_student_ids))
    ),
    history AS (
        SELECT
            b.id AS student_id,
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                INNER JOIN public.terms t2 ON t2.id = s.term_id AND t2.deleted_at IS NULL
                CROSS JOIN target tg
                WHERE e.student_id = b.id
                  AND e.deleted_at IS NULL
                  AND e.status <> 'Dropped'
                  AND t2.school_year_id <> tg.school_year_id
            ) AS has_earlier_history,
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                INNER JOIN public.terms t2 ON t2.id = s.term_id AND t2.deleted_at IS NULL
                CROSS JOIN target tg
                WHERE e.student_id = b.id
                  AND e.deleted_at IS NULL
                  AND e.status <> 'Dropped'
                  AND t2.school_year_id = tg.school_year_id
            ) AS has_target_year_history,
            EXISTS (
                SELECT 1
                FROM public.student_lifecycle_events le
                INNER JOIN public.terms t3 ON t3.id = le.term_id AND t3.deleted_at IS NULL
                CROSS JOIN target tg
                WHERE le.student_id = b.id
                  AND le.deleted_at IS NULL
                  AND le.event_type = 'Year Level Progression'
                  AND t3.school_year_id = tg.school_year_id
            ) AS is_already_progressed
        FROM base b
    ),
    resolved AS (
        SELECT
            b.*,
            h.has_earlier_history,
            h.has_target_year_history,
            h.is_already_progressed,
            (
                b.status = 'Active'
                AND b.program_id IS NOT NULL
                AND h.has_earlier_history
                AND NOT h.has_target_year_history
                AND NOT h.is_already_progressed
            ) AS advances_year
        FROM base b
        INNER JOIN history h ON h.student_id = b.id
    )
    SELECT
        r.id,
        r.student_number,
        r.student_name,
        r.program_id,
        r.program_code,
        r.year_level,
        CASE
            WHEN r.advances_year AND r.year_level < r.max_year_level
                THEN (r.year_level + 1)::SMALLINT
            ELSE r.year_level
        END,
        r.advances_year AND r.year_level < r.max_year_level,
        CASE
            WHEN r.status <> 'Active' THEN 'INACTIVE'
            WHEN r.program_id IS NULL THEN 'NO_PROGRAM'
            WHEN r.advances_year AND r.year_level >= r.max_year_level THEN 'PROGRAM_COMPLETE'
            ELSE NULL
        END,
        CASE
            WHEN r.status <> 'Active'
                THEN 'Student status is ' || r.status::TEXT || ' — only active students are progressed.'
            WHEN r.program_id IS NULL
                THEN 'Student has no program assigned.'
            WHEN r.advances_year AND r.year_level >= r.max_year_level
                THEN 'Student is already in the final year level of the program — handle graduation manually.'
            ELSE NULL
        END
    FROM resolved r
    CROSS JOIN target tg
    ORDER BY r.program_code NULLS LAST, r.year_level, r.student_number;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_roles_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    v_base_query := '
        SELECT
            r.id,
            r.code,
            r.label,
            r.description,
            COUNT(*) OVER() AS total_count
        FROM public.roles r
        WHERE r.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || ' AND (r.label ILIKE ' || quote_literal('%' || p_search || '%') || ' OR r.code ILIKE ' || quote_literal('%' || p_search || '%') || ')';
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_rubrics(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             r.id,
                'title',          r.title,
                'description',    r.description,
                'total_points',   r.total_points,
                'is_active',      r.is_active,
                'criteria_count', (
                    SELECT COUNT(*)
                    FROM public.rubric_criteria rc
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                ),
                'attached_count', (
                    SELECT COUNT(*)
                    FROM public.assessment_item_rubrics air
                    WHERE air.rubric_id = r.id AND air.deleted_at IS NULL
                )
            )
            ORDER BY r.title ASC
        ), '[]'::JSONB)
        FROM public.rubrics r
        WHERE r.section_id = p_section_id
        AND r.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_schedule_conflicts(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty JSONB;
    v_rooms   JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'faculty_name', x->>'day_of_week', x->>'time_start'), '[]'::JSONB)
    INTO v_faculty
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', 'Faculty',
            'faculty_name', fu.first_name || ' ' || fu.last_name,
            'subject_label', fu.first_name || ' ' || fu.last_name,
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a', sa.section_code,
            'section_b', sb.section_code,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM')
        ) AS x
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sa.faculty_id IS NOT NULL
          AND sb.faculty_id = sa.faculty_id
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
    ) faculty_conflicts;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'subject_label', x->>'day_of_week', x->>'time_start'), '[]'::JSONB)
    INTO v_rooms
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', 'Room',
            'faculty_name', COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned'),
            'subject_label', COALESCE(a.room, sa.room),
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a', sa.section_code,
            'section_b', sb.section_code,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM')
        ) AS x
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND COALESCE(a.room, sa.room) IS NOT NULL
          AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
    ) room_conflicts;

    RETURN jsonb_build_object(
        'faculty_conflicts', v_faculty,
        'room_conflicts', v_rooms,
        'faculty_conflict_count', jsonb_array_length(v_faculty),
        'room_conflict_count', jsonb_array_length(v_rooms)
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_schedule_conflicts_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid, p_conflict_types text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_clause    TEXT := '';
    v_type_clause    TEXT := '';
    v_search_clause  TEXT := '';
    v_base_query     TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND sa.term_id = %L', p_term_id);
    END IF;

    IF p_conflict_types IS NOT NULL AND array_length(p_conflict_types, 1) > 0 THEN
        v_type_clause := format(' WHERE c.conflict_type = ANY (%L::TEXT[])', p_conflict_types);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_search_clause := format(
            ' %1$s (c.faculty_name ILIKE %2$L OR c.subject_label ILIKE %2$L OR c.section_a ILIKE %2$L OR c.section_b ILIKE %2$L)',
            CASE WHEN v_type_clause = '' THEN 'WHERE' ELSE 'AND' END,
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.conflict_type,
            c.faculty_name,
            c.subject_label,
            c.day_of_week,
            c.time_start,
            c.time_end,
            c.section_a,
            c.section_b,
            c.overlap_start,
            c.overlap_end,
            COUNT(*) OVER () AS total_count
        FROM (
            SELECT
                md5(a.id::TEXT || b.id::TEXT || ''Faculty'') AS id,
                ''Faculty'' AS conflict_type,
                fu.first_name || '' '' || fu.last_name AS faculty_name,
                fu.first_name || '' '' || fu.last_name AS subject_label,
                a.day_of_week::TEXT AS day_of_week,
                to_char(a.time_start, ''HH12:MI AM'') AS time_start,
                to_char(a.time_end, ''HH12:MI AM'') AS time_end,
                sa.section_code AS section_a,
                sb.section_code AS section_b,
                to_char(GREATEST(a.time_start, b.time_start), ''HH12:MI AM'') AS overlap_start,
                to_char(LEAST(a.time_end, b.time_end), ''HH12:MI AM'') AS overlap_end,
                GREATEST(a.time_start, b.time_start) AS overlap_start_raw
            FROM public.section_schedules a
            INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
            INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
            INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
            INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
            WHERE a.deleted_at IS NULL
              AND sa.faculty_id IS NOT NULL
              AND sb.faculty_id = sa.faculty_id
              AND sb.id <> sa.id
              AND sb.term_id = sa.term_id
              AND a.day_of_week = b.day_of_week
              AND a.time_start < b.time_end
              AND b.time_start < a.time_end
              %1$s
            UNION ALL
            SELECT
                md5(a.id::TEXT || b.id::TEXT || ''Room'') AS id,
                ''Room'' AS conflict_type,
                COALESCE(fu.first_name || '' '' || fu.last_name, ''Unassigned'') AS faculty_name,
                COALESCE(a.room, sa.room) AS subject_label,
                a.day_of_week::TEXT AS day_of_week,
                to_char(a.time_start, ''HH12:MI AM'') AS time_start,
                to_char(a.time_end, ''HH12:MI AM'') AS time_end,
                sa.section_code AS section_a,
                sb.section_code AS section_b,
                to_char(GREATEST(a.time_start, b.time_start), ''HH12:MI AM'') AS overlap_start,
                to_char(LEAST(a.time_end, b.time_end), ''HH12:MI AM'') AS overlap_end,
                GREATEST(a.time_start, b.time_start) AS overlap_start_raw
            FROM public.section_schedules a
            INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
            INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
            INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
            LEFT JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
            WHERE a.deleted_at IS NULL
              AND sb.id <> sa.id
              AND sb.term_id = sa.term_id
              AND a.day_of_week = b.day_of_week
              AND a.time_start < b.time_end
              AND b.time_start < a.time_end
              AND COALESCE(a.room, sa.room) IS NOT NULL
              AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
              %1$s
        ) c
        %2$s
        %3$s',
        v_term_clause,
        v_type_clause,
        v_search_clause
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'conflict_type ASC, faculty_name ASC, day_of_week ASC, overlap_start_raw ASC'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_school_years_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_is_active boolean DEFAULT NULL::boolean, p_year integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE sy.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (sy.code ILIKE %L OR sy.label ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND sy.is_active = %L', p_is_active::TEXT);
    END IF;

    IF p_year IS NOT NULL THEN
        v_where := v_where || format(
            ' AND EXTRACT(YEAR FROM sy.start_date) <= %s AND EXTRACT(YEAR FROM sy.end_date) >= %s',
            p_year,
            p_year
        );
    END IF;

    v_base_query := format(
        'SELECT
            sy.id,
            sy.code,
            sy.label,
            sy.start_date,
            sy.end_date,
            sy.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.school_years sy
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'sy.start_date DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_section_students(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.section_id = ' || quote_literal(p_section_id) || ' AND e.deleted_at IS NULL';
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = p_section_id
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
        )
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section roster.'
            USING ERRCODE = '42501';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            st.id AS student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS full_name,
            u.email,
            st.year_level,
            e.status,
            e.enrolled_at,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC, u.first_name ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_section_threads_json(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    v_where := format('WHERE t.deleted_at IS NULL AND t.section_id = %L', p_section_id);

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (t.title ILIKE %L OR t.body ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.title,
            t.body,
            t.is_resolved,
            t.is_pinned,
            t.created_at,
            t.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.discussion_posts p
                WHERE p.thread_id = t.id AND p.deleted_at IS NULL
            ) AS reply_count,
            COUNT(*) OVER() AS total_count
        FROM public.discussion_threads t
        LEFT JOIN public.users u ON u.id = t.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.is_pinned DESC, t.created_at DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_sections_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_ids uuid[] DEFAULT NULL::uuid[], p_course_ids uuid[] DEFAULT NULL::uuid[], p_statuses text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND s.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.section_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            s.id,
            s.section_code,
            s.term_id,
            tt.label || '' - '' || sy.label AS term_label,
            s.course_id,
            c.code AS course_code,
            c.title AS course_title,
            s.faculty_id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            s.room,
            s.max_slots,
            s.status,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_student_lifecycle_events(p_student_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', e.id,
                'event_type', e.event_type,
                'from_status', e.from_status,
                'to_status', e.to_status,
                'from_program_code', fp.code,
                'to_program_code', tp.code,
                'from_year_level', e.from_year_level,
                'to_year_level', e.to_year_level,
                'reason', e.reason,
                'effective_date', e.effective_date,
                'created_at', e.created_at,
                'created_by_name', u.first_name || ' ' || u.last_name
            )
            ORDER BY e.effective_date DESC, e.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_result
    FROM public.student_lifecycle_events e
    LEFT JOIN public.programs fp ON fp.id = e.from_program_id
    LEFT JOIN public.programs tp ON tp.id = e.to_program_id
    LEFT JOIN public.users u ON u.id = e.created_by
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_students_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels smallint[] DEFAULT NULL::smallint[], p_statuses text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE st.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND st.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_year_levels IS NOT NULL AND array_length(p_year_levels, 1) > 0 THEN
        v_where := v_where || ' AND st.year_level = ANY(' || quote_literal(p_year_levels::TEXT) || '::smallint[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND st.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.student_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            st.id,
            st.student_number,
            st.year_level,
            st.status,
            st.admitted_at,
            st.program_id,
            p.code AS program_code,
            p.name AS program_name,
            st.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.status AS user_status,
            COUNT(*) OVER() AS total_count
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'st.student_number ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_submissions(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             asub.id,
                'enrollment_id',  asub.enrollment_id,
                'student_number', st.student_number,
                'full_name',      u.first_name || ' ' || u.last_name,
                'attempt_number', asub.attempt_number,
                'status',         asub.status,
                'started_at',     asub.started_at,
                'submitted_at',   asub.submitted_at,
                'raw_score',      asub.raw_score,
                'final_score',    asub.final_score,
                'is_late',        asub.is_late,
                'feedback',       asub.feedback
            )
            ORDER BY asub.submitted_at DESC NULLS LAST
        ), '[]'::JSONB)
        FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE asub.assessment_item_id = p_assessment_id
        AND asub.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_term_types_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            tt.id,
            tt.code,
            tt.label,
            tt.description,
            tt.sequence,
            COUNT(*) OVER() AS total_count
        FROM public.term_types tt
        WHERE tt.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (tt.label ILIKE %L OR tt.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'tt.sequence ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_terms_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_school_year_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    IF p_school_year_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.school_year_id = %L', p_school_year_id);
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where := v_where || format(' AND t.status = %L', p_status);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (sy.label ILIKE %L OR tt.label ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.school_year_id,
            sy.label AS school_year_label,
            t.term_type_id,
            tt.label AS term_type_label,
            t.status,
            t.start_date,
            t.end_date,
            t.enrollment_start_date,
            t.enrollment_end_date,
            t.grading_deadline,
            COALESCE(t.evaluation_scope::TEXT, '''') AS evaluation_scope,
            public.fn_get_evaluation_scope(t.id)::TEXT AS effective_evaluation_scope,
            COUNT(*) OVER() AS total_count
        FROM public.terms t
        JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.start_date DESC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_list_users_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_role_code text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_province text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE u.deleted_at IS NULL';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_role_code IS NOT NULL AND p_role_code <> 'All' THEN
        v_where_clause := v_where_clause || format(
            ' AND EXISTS (
                SELECT 1
                FROM public.user_roles fur
                INNER JOIN public.roles fr ON fr.id = fur.role_id AND fr.deleted_at IS NULL
                WHERE fur.user_id = u.id
                  AND fur.deleted_at IS NULL
                  AND fur.revoked_at IS NULL
                  AND fr.code = %L
            )',
            p_role_code
        );
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where_clause := v_where_clause || format(' AND u.status = %L', p_status);
    END IF;

    IF p_city IS NOT NULL AND p_city <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.city ILIKE %L', '%' || p_city || '%');
    END IF;

    IF p_province IS NOT NULL AND p_province <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.province ILIKE %L', '%' || p_province || '%');
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            COALESCE(ra.role_code, ''No role'') AS role_code,
            u.status,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        LEFT JOIN LATERAL (
            SELECT string_agg(r.code::TEXT, '', '' ORDER BY r.code) AS role_code
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) ra ON TRUE
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.created_at ASC');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_mark_material_complete(p_material_id uuid, p_is_complete boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_enrollment_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id
      AND cm.deleted_at IS NULL
      AND cm.is_published;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    SELECT e.id INTO v_enrollment_id
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.section_id = v_section_id
      AND st.user_id = auth.uid()
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: you are not enrolled in this section.'
            USING ERRCODE = '42501';
    END IF;

    IF COALESCE(p_is_complete, true) THEN
        INSERT INTO public.material_completions (material_id, enrollment_id)
        VALUES (p_material_id, v_enrollment_id)
        ON CONFLICT (material_id, enrollment_id) WHERE deleted_at IS NULL
        DO NOTHING;
    ELSE
        UPDATE public.material_completions
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE material_id = p_material_id
          AND enrollment_id = v_enrollment_id
          AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'is_completed', COALESCE(p_is_complete, true));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_mark_my_notifications_read(p_notification_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_updated INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id = v_uid
      AND is_read = false
      AND deleted_at IS NULL
      AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids));

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'marked', v_updated);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_mark_my_notifications_unread(p_notification_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_updated INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No notification was selected.');
    END IF;

    UPDATE public.notifications
    SET is_read = false, read_at = NULL
    WHERE user_id = v_uid
      AND is_read = true
      AND deleted_at IS NULL
      AND id = ANY(p_notification_ids);

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'marked', v_updated);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_mark_notifications_read(p_user_id uuid, p_notification_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

  IF p_notification_ids IS NULL THEN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = auth.uid()
      AND is_read     = false
      AND deleted_at  IS NULL;
  ELSE
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = auth.uid()
      AND id          = ANY(p_notification_ids)
      AND is_read     = false
      AND deleted_at  IS NULL;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',  true,
    'marked',   v_updated
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_notify_user(p_user_id uuid, p_title text, p_message text, p_action_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, action_url)
  VALUES (p_user_id, p_title, p_message, p_action_url);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_owns_submission(p_submission_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.assessment_submissions sub
        INNER JOIN public.enrollments e ON e.id = sub.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE sub.id = p_submission_id
          AND st.user_id = auth.uid()
          AND sub.deleted_at IS NULL
    );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_plan_progression_sections(p_student_id uuid, p_program_id uuid, p_year_level smallint, p_term_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH target AS (
        SELECT t.id, t.school_year_id, t.term_type_id
        FROM public.terms t
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
    ),
    planned AS (
        SELECT
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units,
            MIN(cm.sequence) AS sequence
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        CROSS JOIN target tg
        WHERE cm.program_id = p_program_id
          AND cm.year_level = p_year_level
          AND cm.is_elective = FALSE
          AND cm.deleted_at IS NULL
          AND c.is_active = TRUE
          AND (cm.term_type_id IS NULL OR cm.term_type_id = tg.term_type_id)
          AND (cm.school_year_id IS NULL OR cm.school_year_id = tg.school_year_id)
        GROUP BY c.id, c.code, c.title, c.total_units
    ),
    evaluated AS (
        SELECT
            pl.course_id,
            pl.course_code,
            pl.course_title,
            pl.total_units,
            pl.sequence,
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s2 ON s2.id = e.section_id AND s2.deleted_at IS NULL
                WHERE e.student_id = p_student_id
                  AND e.deleted_at IS NULL
                  AND e.status IN ('Enrolled', 'Completed')
                  AND s2.course_id = pl.course_id
            ) AS is_taken,
            pick.section_id,
            pick.section_code,
            pick.has_conflict
        FROM planned pl
        LEFT JOIN LATERAL (
            SELECT
                s.id AS section_id,
                s.section_code,
                public.fn_get_schedule_conflicts(p_student_id, s.id) IS NOT NULL AS has_conflict
            FROM public.sections s
            WHERE s.term_id = p_term_id
              AND s.course_id = pl.course_id
              AND s.deleted_at IS NULL
              AND s.status NOT IN ('Closed', 'Cancelled')
              AND (
                  SELECT COUNT(*)
                  FROM public.enrollments e2
                  WHERE e2.section_id = s.id
                    AND e2.deleted_at IS NULL
                    AND e2.status NOT IN ('Dropped', 'Withdrawn')
              ) < s.max_slots
            ORDER BY
                public.fn_get_schedule_conflicts(p_student_id, s.id) IS NULL DESC,
                s.section_code ASC
            LIMIT 1
        ) pick ON TRUE
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'course_id', ev.course_id,
                'course_code', ev.course_code,
                'course_title', ev.course_title,
                'total_units', ev.total_units,
                'section_id', CASE WHEN ev.is_taken THEN NULL ELSE ev.section_id END,
                'section_code', CASE WHEN ev.is_taken THEN NULL ELSE ev.section_code END,
                'issue_code', CASE
                    WHEN ev.is_taken THEN 'ALREADY_TAKEN'
                    WHEN ev.section_id IS NULL THEN 'NO_SECTION'
                    WHEN ev.has_conflict THEN 'SCHEDULE_CONFLICT'
                    ELSE NULL
                END,
                'issue_message', CASE
                    WHEN ev.is_taken
                        THEN ev.course_code || ' is already enrolled or completed.'
                    WHEN ev.section_id IS NULL
                        THEN 'No open section for ' || ev.course_code || ' in the selected term.'
                    WHEN ev.has_conflict
                        THEN ev.course_code || ' only has sections that conflict with the current schedule.'
                    ELSE NULL
                END
            )
            ORDER BY ev.sequence, ev.course_code
        ),
        '[]'::jsonb
    )
    FROM evaluated ev;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_preview_audience(p_audience announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_recipient_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_audience = 'Section' AND (p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one section for a section-targeted audience.');
    END IF;

    SELECT count(*) INTO v_recipient_count
    FROM public.fn_resolve_audience(p_audience, p_section_ids);

    RETURN jsonb_build_object(
        'success', true,
        'audience', p_audience,
        'section_count', COALESCE(array_length(p_section_ids, 1), 0),
        'recipient_count', v_recipient_count
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_preview_batch_progression(p_term_id uuid, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels smallint[] DEFAULT NULL::smallint[], p_student_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term        RECORD;
    v_rows        JSONB := '[]'::JSONB;
    v_candidate   RECORD;
    v_plan        JSONB;
    v_total       INTEGER := 0;
    v_promoted    INTEGER := 0;
    v_blocked     INTEGER := 0;
    v_enrollable  INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT
        t.id,
        sy.label || ' — ' || tt.label AS label
    INTO v_term
    FROM public.terms t
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    WHERE t.id = p_term_id
      AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target term not found.');
    END IF;

    FOR v_candidate IN
        SELECT *
        FROM public.fn_list_progression_candidates(p_term_id, p_program_ids, p_year_levels, p_student_ids)
    LOOP
        v_total := v_total + 1;

        IF v_candidate.blocker_code IS NOT NULL THEN
            v_blocked := v_blocked + 1;
            v_plan := '[]'::JSONB;
        ELSE
            IF v_candidate.is_promoted THEN
                v_promoted := v_promoted + 1;
            END IF;

            v_plan := public.fn_plan_progression_sections(
                v_candidate.student_id,
                v_candidate.program_id,
                v_candidate.proposed_year_level,
                p_term_id
            );

            v_enrollable := v_enrollable + (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_plan) AS item
                WHERE item->>'section_id' IS NOT NULL
            );
        END IF;

        v_rows := v_rows || jsonb_build_object(
            'student_id', v_candidate.student_id,
            'student_number', v_candidate.student_number,
            'student_name', v_candidate.student_name,
            'program_code', v_candidate.program_code,
            'current_year_level', v_candidate.current_year_level,
            'proposed_year_level', v_candidate.proposed_year_level,
            'is_promoted', v_candidate.is_promoted,
            'blocker_code', v_candidate.blocker_code,
            'blocker_message', v_candidate.blocker_message,
            'planned_courses', v_plan,
            'enrollable_count', (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_plan) AS item
                WHERE item->>'section_id' IS NOT NULL
            ),
            'issue_count', (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_plan) AS item
                WHERE item->>'issue_code' IS NOT NULL
            )
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'term_id', v_term.id,
        'term_label', v_term.label,
        'total_count', v_total,
        'promote_count', v_promoted,
        'blocked_count', v_blocked,
        'enrollable_count', v_enrollable,
        'rows', v_rows
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_provision_single_user(p_auth_id uuid, p_email text, p_first_name text, p_last_name text, p_role_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_role_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = p_role_code
    AND deleted_at IS NULL;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role code: ' || p_role_code);
    END IF;

    INSERT INTO public.users (id, email, first_name, last_name, status)
    VALUES (p_auth_id, p_email, p_first_name, p_last_name, 'Invited')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role_id, created_by)
    VALUES (p_auth_id, v_role_id, p_auth_id)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'User provisioned successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_publish_assessment(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions
        WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot publish an assessment with no questions.');
    END IF;

    UPDATE public.assessment_items
    SET
        is_published = true,
        published_at = now()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment published successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_record_focus_event(p_submission_id uuid, p_event_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session_id  UUID;
    v_status      submission_timer_status;
    v_event       public.proctor_event_type;
    v_event_count INT;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

    IF p_event_type NOT IN ('Focus Lost', 'Focus Restored') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unsupported event type.');
    END IF;

    v_event := p_event_type::public.proctor_event_type;

    SELECT id, status
    INTO v_session_id, v_status
    FROM public.assessment_timer_sessions
    WHERE submission_id = p_submission_id
      AND deleted_at IS NULL;

    IF v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer session not found.');
    END IF;

    IF v_status != 'Active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer session is no longer active.');
    END IF;

    SELECT COUNT(*)
    INTO v_event_count
    FROM public.assessment_timer_heartbeats
    WHERE session_id = v_session_id
      AND event_type <> 'Heartbeat'
      AND deleted_at IS NULL;

    IF v_event_count >= 500 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Focus event limit reached for this session.');
    END IF;

    INSERT INTO public.assessment_timer_heartbeats (session_id, recorded_at, client_ip, event_type)
    VALUES (v_session_id, now(), inet_client_addr(), v_event);

    RETURN jsonb_build_object(
        'success',     true,
        'event_type',  v_event,
        'recorded_at', now()
    );

EXCEPTION
    WHEN sqlstate '42501' THEN
        RAISE;
    WHEN sqlstate '28000' THEN
        RAISE;
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_record_heartbeat(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id  UUID;
  v_expires_at  TIMESTAMPTZ;
  v_status      submission_timer_status;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

  SELECT id, server_expires_at, status
  INTO v_session_id, v_expires_at, v_status
  FROM public.assessment_timer_sessions
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session not found.');
  END IF;

  IF v_status != 'Active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session is no longer active.', 'status', v_status);
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    PERFORM fn_expire_overdue_submissions();
    RETURN jsonb_build_object('success', false, 'message', 'Session has expired.', 'expired_at', v_expires_at);
  END IF;

  INSERT INTO public.assessment_timer_heartbeats (session_id, recorded_at, client_ip)
  VALUES (v_session_id, now(), inet_client_addr());

  UPDATE public.assessment_timer_sessions
  SET last_activity_at = now()
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'success',      true,
    'session_id',   v_session_id,
    'expires_at',   v_expires_at,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_expires_at - now()))::INTEGER,
    'recorded_at',  now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_release_grades_after_evaluation(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_completed BOOLEAN;
  v_grade_count  INTEGER;
BEGIN
  SELECT fn_check_evaluation_completion(p_enrollment_id, p_grading_period_id)
  INTO v_is_completed;

  IF NOT v_is_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Evaluation not yet completed for this grading period.'
    );
  END IF;

  UPDATE public.enrollments
  SET is_grade_visible = true
  WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_grade_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Grades released successfully.',
    'rows_updated', v_grade_count
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_release_grading_period_grades(p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_grade    RECORD;
    v_approved INTEGER := 0;
    v_released INTEGER := 0;
    v_blocked  INTEGER := 0;
BEGIN
    FOR v_grade IN
        SELECT sfg.id, sfg.enrollment_id, sfg.status
        FROM public.section_final_grades sfg
        WHERE sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at        IS NULL
          AND sfg.status            IN ('Draft', 'Approved')
    LOOP
        IF v_grade.status = 'Draft' THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Approved',
                approved_by = auth.uid(),
                approved_at = now()
            WHERE id = v_grade.id;

            v_approved := v_approved + 1;
        END IF;

        IF public.fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Released',
                released_at = now()
            WHERE id = v_grade.id;

            UPDATE public.enrollments
            SET is_grade_visible = true
            WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

            v_released := v_released + 1;
        ELSE
            v_blocked := v_blocked + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'approved',              v_approved,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_release_grading_period_now(p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_registrar BOOLEAN;
    v_outcome      jsonb;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id    = auth.uid()
          AND r.code        = 'Registrar'
          AND ur.deleted_at IS NULL
    ) INTO v_is_registrar;

    IF NOT v_is_registrar THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Registrar can release grades.');
    END IF;

    v_outcome := public.fn_release_grading_period_grades(p_grading_period_id);

    RETURN jsonb_build_object(
        'success',               true,
        'released',              v_outcome ->> 'released',
        'blocked_by_evaluation', v_outcome ->> 'blocked_by_evaluation',
        'message',               format(
            '%s grade(s) released. %s still blocked by pending evaluations.',
            v_outcome ->> 'released',
            v_outcome ->> 'blocked_by_evaluation'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_reply_to_thread(p_thread_id uuid, p_body text, p_attachments jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
    v_id UUID;
BEGIN
    SELECT section_id, created_by INTO v_section_id, v_author_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF NOT public.fn_can_access_section(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_body IS NULL OR btrim(p_body) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A reply message is required.');
    END IF;

    INSERT INTO public.discussion_posts (thread_id, body)
    VALUES (p_thread_id, btrim(p_body))
    RETURNING id INTO v_id;

    PERFORM public.fn_insert_discussion_attachments(NULL, v_id, p_attachments);

    IF v_author_id IS NOT NULL AND v_author_id <> auth.uid() THEN
        PERFORM public.fn_notify_user(
            v_author_id,
            'New reply to your discussion',
            btrim(p_body),
            '/faculty/sections/' || v_section_id::text || '?tab=discussion'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Reply posted.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_reseed_section_grading(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[];
    v_faculty_id UUID;
    v_term_id UUID;
    v_result JSONB;
    v_seeded INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in to perform this action.');
    END IF;

    SELECT faculty_id, term_id INTO v_faculty_id, v_term_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF NOT (v_roles && ARRAY['Admin', 'Dean']) AND v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: you may only reset grading for your own section.');
    END IF;

    v_result := public.fn_seed_section_grading(p_section_id);

    IF NOT (v_result->>'success')::BOOLEAN THEN
        RETURN v_result;
    END IF;

    v_seeded := COALESCE((v_result->>'seeded_periods')::INTEGER, 0);

    IF v_seeded = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nothing to seed: every grading period already has components or is locked by recorded grades.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', format('Grading schema seeded from the institutional template for %s period(s).', v_seeded));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_resolve_audience(p_audience announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT DISTINCT u.id
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.status = 'Active'
      AND (
          p_audience = 'Global'
          OR (
              p_audience IN ('Faculty', 'Student')
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = p_audience::text
              )
          )
          OR (
              p_audience = 'Section'
              AND p_section_ids IS NOT NULL
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.enrollments e
                      INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND e.section_id = ANY(p_section_ids)
                        AND e.status = 'Enrolled'
                        AND e.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.sections s
                      WHERE s.faculty_id = u.id
                        AND s.id = ANY(p_section_ids)
                        AND s.deleted_at IS NULL
                  )
              )
          )
      );
$function$
;

CREATE OR REPLACE FUNCTION public.fn_resolve_evaluation_period(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_scope public.evaluation_scope_type;
    v_anchor_id UUID;
BEGIN
    IF p_grading_period_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT s.term_id INTO v_term_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        SELECT gp.term_id INTO v_term_id
        FROM public.grading_periods gp
        WHERE gp.id = p_grading_period_id AND gp.deleted_at IS NULL;
    END IF;

    IF v_term_id IS NULL THEN
        RETURN p_grading_period_id;
    END IF;

    v_scope := public.fn_get_evaluation_scope(v_term_id);

    IF v_scope <> 'Term' THEN
        RETURN p_grading_period_id;
    END IF;

    SELECT gp.id INTO v_anchor_id
    FROM public.grading_periods gp
    WHERE gp.term_id = v_term_id AND gp.deleted_at IS NULL
    ORDER BY gp.sequence ASC, gp.created_at ASC
    LIMIT 1;

    RETURN COALESCE(v_anchor_id, p_grading_period_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_resolve_record_student(p_student_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_student_id IS NULL THEN
        SELECT s.id
        INTO v_student_id
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.deleted_at IS NULL
        LIMIT 1;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'Forbidden: no student profile is linked to your account.'
                USING ERRCODE = '42501';
        END IF;

        RETURN v_student_id;
    END IF;

    IF public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar', 'Dean'] THEN
        RETURN p_student_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = p_student_id
          AND s.user_id = auth.uid()
          AND s.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Forbidden: you may only view your own academic records.'
            USING ERRCODE = '42501';
    END IF;

    RETURN p_student_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_resolve_rubric_section(p_rubric_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT r.section_id
    FROM public.rubrics r
    WHERE r.id = p_rubric_id
      AND r.deleted_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_resolve_submission_section(p_submission_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT ai.section_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id AND ai.deleted_at IS NULL
    WHERE asub.id = p_submission_id
      AND asub.deleted_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_run_batch_progression(p_term_id uuid, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels smallint[] DEFAULT NULL::smallint[], p_student_ids uuid[] DEFAULT NULL::uuid[], p_auto_enroll boolean DEFAULT true, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term         RECORD;
    v_candidate    RECORD;
    v_plan         JSONB;
    v_item         JSONB;
    v_outcome      JSONB;
    v_results      JSONB := '[]'::JSONB;
    v_issues       JSONB;
    v_enrolled     INTEGER;
    v_total        INTEGER := 0;
    v_promoted     INTEGER := 0;
    v_blocked      INTEGER := 0;
    v_enrolled_all INTEGER := 0;
    v_limit        CONSTANT INTEGER := 500;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT
        t.id,
        sy.label || ' — ' || tt.label AS label
    INTO v_term
    FROM public.terms t
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    WHERE t.id = p_term_id
      AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target term not found.');
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public.fn_list_progression_candidates(p_term_id, p_program_ids, p_year_levels, p_student_ids)
    ) > v_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Batch is larger than ' || v_limit || ' students. Narrow the program or year level filters and run again.'
        );
    END IF;

    FOR v_candidate IN
        SELECT *
        FROM public.fn_list_progression_candidates(p_term_id, p_program_ids, p_year_levels, p_student_ids)
    LOOP
        v_total := v_total + 1;

        IF v_candidate.blocker_code IS NOT NULL THEN
            v_blocked := v_blocked + 1;
            v_results := v_results || jsonb_build_object(
                'student_number', v_candidate.student_number,
                'student_name', v_candidate.student_name,
                'from_year_level', v_candidate.current_year_level,
                'to_year_level', v_candidate.current_year_level,
                'is_promoted', false,
                'enrolled_count', 0,
                'issues', jsonb_build_array(v_candidate.blocker_message)
            );
            CONTINUE;
        END IF;

        IF v_candidate.is_promoted THEN
            UPDATE public.students
            SET year_level = v_candidate.proposed_year_level
            WHERE id = v_candidate.student_id
              AND deleted_at IS NULL;

            INSERT INTO public.student_lifecycle_events (
                student_id,
                event_type,
                from_year_level,
                to_year_level,
                term_id,
                reason,
                effective_date
            ) VALUES (
                v_candidate.student_id,
                'Year Level Progression',
                v_candidate.current_year_level,
                v_candidate.proposed_year_level,
                p_term_id,
                COALESCE(
                    NULLIF(btrim(COALESCE(p_reason, '')), ''),
                    'Batch progression into ' || v_term.label || '.'
                ),
                CURRENT_DATE
            );

            v_promoted := v_promoted + 1;
        END IF;

        v_enrolled := 0;
        v_issues := '[]'::JSONB;

        IF p_auto_enroll THEN
            v_plan := public.fn_plan_progression_sections(
                v_candidate.student_id,
                v_candidate.program_id,
                v_candidate.proposed_year_level,
                p_term_id
            );

            FOR v_item IN SELECT * FROM jsonb_array_elements(v_plan)
            LOOP
                IF v_item->>'section_id' IS NULL THEN
                    IF v_item->>'issue_code' <> 'ALREADY_TAKEN' THEN
                        v_issues := v_issues || to_jsonb(v_item->>'issue_message');
                    END IF;

                    CONTINUE;
                END IF;

                v_outcome := public.fn_enroll_student_section(
                    v_candidate.student_id,
                    (v_item->>'section_id')::UUID,
                    FALSE,
                    NULL,
                    FALSE
                );

                IF COALESCE((v_outcome->>'success')::BOOLEAN, FALSE) THEN
                    v_enrolled := v_enrolled + 1;
                ELSIF v_outcome->>'code' <> 'ALREADY_TAKEN' THEN
                    v_issues := v_issues || to_jsonb(v_outcome->>'message');
                END IF;
            END LOOP;
        END IF;

        v_enrolled_all := v_enrolled_all + v_enrolled;

        v_results := v_results || jsonb_build_object(
            'student_number', v_candidate.student_number,
            'student_name', v_candidate.student_name,
            'from_year_level', v_candidate.current_year_level,
            'to_year_level', v_candidate.proposed_year_level,
            'is_promoted', v_candidate.is_promoted,
            'enrolled_count', v_enrolled,
            'issues', v_issues
        );
    END LOOP;

    IF v_total = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No students matched the selected cohort.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_promoted || ' promoted, ' || v_enrolled_all || ' enrollments created, '
            || v_blocked || ' skipped.',
        'term_label', v_term.label,
        'total_count', v_total,
        'promoted_count', v_promoted,
        'blocked_count', v_blocked,
        'enrolled_count', v_enrolled_all,
        'results', v_results
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_save_attendance_records(p_session_id uuid, p_records jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_record JSONB;
BEGIN
    SELECT ats.section_id
    INTO v_section_id
    FROM public.attendance_sessions ats
    WHERE ats.id = p_session_id
    AND ats.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_is_section_faculty(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        UPDATE public.attendance_records
        SET
            status  = (v_record->>'status')::public.attendance_status_type,
            remarks = NULLIF(trim(v_record->>'remarks'), '')
        WHERE id = (v_record->>'id')::UUID
        AND attendance_session_id = p_session_id
        AND deleted_at IS NULL;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance saved successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_save_grading_period_templates(p_periods jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_period JSONB;
    v_component JSONB;
    v_period_id UUID;
    v_total_weight NUMERIC := 0;
BEGIN
    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        v_total_weight := v_total_weight + (v_period->>'weight')::NUMERIC;
    END LOOP;

    IF round(v_total_weight::NUMERIC, 2) <> 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weights must sum to exactly 100%. Current total: ' || v_total_weight || '%');
    END IF;

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        DECLARE
            v_comp_total NUMERIC := 0;
        BEGIN
            FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
            LOOP
                v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
            END LOOP;

            IF round(v_comp_total::NUMERIC, 2) <> 100 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'message', 'Component weights for ' || (v_period->>'name') || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
                );
            END IF;
        END;
    END LOOP;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id IN (
        SELECT id FROM public.grading_period_templates WHERE deleted_at IS NULL
    )
    AND deleted_at IS NULL;

    UPDATE public.grading_period_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL;

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        INSERT INTO public.grading_period_templates (name, sequence, weight, created_by)
        VALUES (
            v_period->>'name',
            (v_period->>'sequence')::SMALLINT,
            (v_period->>'weight')::NUMERIC,
            auth.uid()
        )
        RETURNING id INTO v_period_id;

        FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
        LOOP
            INSERT INTO public.grading_component_templates (
                grading_period_template_id, name, weight, created_by
            )
            VALUES (
                v_period_id,
                v_component->>'name',
                (v_component->>'weight')::NUMERIC,
                auth.uid()
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period templates saved successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_config JSONB;
    v_id UUID;
    v_code TEXT;
    v_label TEXT;
    v_description TEXT;
BEGIN
    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'code')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade codes must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'label')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade labels must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(*)
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) <> (
        SELECT COUNT(DISTINCT lower(btrim(c->>'description')))
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade descriptions must be unique within your changes.');
    END IF;

    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        v_id := NULLIF(v_config->>'id', '')::UUID;
        v_code := btrim(v_config->>'code');
        v_label := btrim(v_config->>'label');
        v_description := NULLIF(btrim(coalesce(v_config->>'description', '')), '');

        IF v_code IS NULL OR v_code = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade code is required.');
        END IF;

        IF v_label IS NULL OR v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade label is required.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(code)) = lower(v_code)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with code "' || v_code || '" already exists.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(label)) = lower(v_label)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with label "' || v_label || '" already exists.');
        END IF;

        IF v_description IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(description)) = lower(v_description)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with description "' || v_description || '" already exists.');
        END IF;

        IF v_id IS NOT NULL THEN
            UPDATE public.special_grade_configs
            SET
                code = v_code,
                label = v_label,
                description = v_description,
                min_absence_percentage = (v_config->>'min_absence_percentage')::NUMERIC,
                requires_completion = (v_config->>'requires_completion')::BOOLEAN,
                completion_deadline_days = (v_config->>'completion_deadline_days')::SMALLINT,
                is_passing = (v_config->>'is_passing')::BOOLEAN,
                is_active = (v_config->>'is_active')::BOOLEAN,
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;
        ELSE
            INSERT INTO public.special_grade_configs (
                code, label, description, min_absence_percentage,
                requires_completion, completion_deadline_days,
                is_passing, is_active, created_by
            )
            VALUES (
                v_code,
                v_label,
                v_description,
                (v_config->>'min_absence_percentage')::NUMERIC,
                (v_config->>'requires_completion')::BOOLEAN,
                (v_config->>'completion_deadline_days')::SMALLINT,
                (v_config->>'is_passing')::BOOLEAN,
                (v_config->>'is_active')::BOOLEAN,
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_save_student_answer(p_submission_id uuid, p_question_id uuid, p_answer_text text, p_choice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_correct BOOLEAN := NULL;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
        INNER JOIN public.students st ON st.id = e.student_id
        WHERE asub.id = p_submission_id
        AND st.user_id = auth.uid()
        AND asub.status IN ('In Progress', 'Not Started')
        AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or not in progress.');
    END IF;

    IF p_choice_id IS NOT NULL THEN
        SELECT is_correct INTO v_is_correct
        FROM public.assessment_question_choices
        WHERE id = p_choice_id AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.student_answers (
        submission_id,
        question_id,
        answer_text,
        choice_id,
        is_correct,
        points_earned,
        created_by
    ) VALUES (
        p_submission_id,
        p_question_id,
        NULLIF(p_answer_text, ''),
        p_choice_id,
        v_is_correct,
        CASE
            WHEN v_is_correct = true THEN (
                SELECT points FROM public.assessment_questions
                WHERE id = p_question_id AND deleted_at IS NULL
            )
            WHEN v_is_correct = false THEN 0
            ELSE NULL
        END,
        auth.uid()
    )
    ON CONFLICT (submission_id, question_id)
    DO UPDATE SET
        answer_text   = NULLIF(p_answer_text, ''),
        choice_id     = p_choice_id,
        is_correct    = v_is_correct,
        points_earned = CASE
            WHEN v_is_correct = true THEN (
                SELECT points FROM public.assessment_questions
                WHERE id = p_question_id AND deleted_at IS NULL
            )
            WHEN v_is_correct = false THEN 0
            ELSE NULL
        END;

    RETURN jsonb_build_object('success', true, 'message', 'Answer saved.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_save_student_answer_files(p_submission_id uuid, p_question_id uuid, p_files jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
        INNER JOIN public.students st ON st.id = e.student_id
        WHERE asub.id = p_submission_id
          AND st.user_id = auth.uid()
          AND asub.status IN ('In Progress', 'Not Started')
          AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or not in progress.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        INNER JOIN public.assessment_submissions asub ON asub.assessment_item_id = aq.assessment_item_id
        WHERE aq.id = p_question_id
          AND asub.id = p_submission_id
          AND aq.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question does not belong to this assessment.');
    END IF;

    INSERT INTO public.student_answers (
        submission_id,
        question_id,
        file_attachments,
        created_by
    ) VALUES (
        p_submission_id,
        p_question_id,
        COALESCE(p_files, '[]'::jsonb),
        auth.uid()
    )
    ON CONFLICT (submission_id, question_id)
    DO UPDATE SET
        file_attachments = COALESCE(p_files, '[]'::jsonb),
        answer_text = NULL,
        choice_id = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Files saved.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_save_transmutation_table(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_expected_grades NUMERIC[] := ARRAY[1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00];
    v_actual_grades   NUMERIC[];
    v_row             JSONB;
    v_grade           NUMERIC;
    v_floor           NUMERIC;
    v_prev_floor      NUMERIC;
    v_max             NUMERIC;
    v_first           BOOLEAN := TRUE;
BEGIN
    IF jsonb_array_length(p_rows) <> 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'The transmutation table must contain exactly 10 grade rows');
    END IF;

    SELECT array_agg((elem->>'transmuted_grade')::NUMERIC ORDER BY (elem->>'transmuted_grade')::NUMERIC)
    INTO v_actual_grades
    FROM jsonb_array_elements(p_rows) AS elem;

    IF v_actual_grades IS DISTINCT FROM v_expected_grades THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grade rungs must be exactly 1.00 to 3.00 in 0.25 steps plus 5.00');
    END IF;

    FOR v_row IN
        SELECT elem
        FROM jsonb_array_elements(p_rows) AS elem
        ORDER BY (elem->>'transmuted_grade')::NUMERIC ASC
    LOOP
        v_grade := (v_row->>'transmuted_grade')::NUMERIC;
        v_floor := (v_row->>'min_percentage')::NUMERIC;

        IF v_floor IS NULL OR v_floor < 0 OR v_floor > 100 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each minimum percentage must be between 0 and 100');
        END IF;

        IF v_floor <> trunc(v_floor) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each minimum percentage must be a whole number');
        END IF;

        IF v_grade = 5.00 AND v_floor <> 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'The 5.00 (Failed) floor must be 0');
        END IF;

        IF NOT v_first AND v_floor >= v_prev_floor THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each higher grade must have a strictly higher minimum percentage than the grade below it');
        END IF;

        v_prev_floor := v_floor;
        v_first := FALSE;
    END LOOP;

    UPDATE public.grade_transmutation_tables
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE program_id IS NULL
    AND deleted_at IS NULL;

    v_first := TRUE;

    FOR v_row IN
        SELECT elem
        FROM jsonb_array_elements(p_rows) AS elem
        ORDER BY (elem->>'transmuted_grade')::NUMERIC ASC
    LOOP
        v_grade := (v_row->>'transmuted_grade')::NUMERIC;
        v_floor := (v_row->>'min_percentage')::NUMERIC;

        IF v_first THEN
            v_max := 100;
        ELSE
            v_max := v_prev_floor - 1;
        END IF;

        INSERT INTO public.grade_transmutation_tables (
            label, min_percentage, max_percentage,
            transmuted_grade, description, created_by
        )
        VALUES (
            'Default',
            v_floor,
            v_max,
            v_grade,
            v_row->>'description',
            auth.uid()
        );

        v_prev_floor := v_floor;
        v_first := FALSE;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grade transmutation table saved successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_seed_section_grading(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_period RECORD;
    v_seeded INTEGER := 0;
BEGIN
    SELECT term_id INTO v_term_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    FOR v_period IN
        SELECT gp.id AS period_id, gp.sequence AS seq
        FROM public.grading_periods gp
        WHERE gp.term_id = v_term_id
          AND gp.deleted_at IS NULL
    LOOP
        IF public.fn_is_section_grading_locked(p_section_id, v_period.period_id) THEN
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.grading_components gc
            WHERE gc.section_id = p_section_id
              AND gc.grading_period_id = v_period.period_id
              AND gc.deleted_at IS NULL
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
        SELECT p_section_id, v_period.period_id, gct.name, gct.weight, auth.uid()
        FROM public.grading_component_templates gct
        INNER JOIN public.grading_period_templates gpt
            ON gpt.id = gct.grading_period_template_id
           AND gpt.deleted_at IS NULL
        WHERE gpt.sequence = v_period.seq
          AND gct.deleted_at IS NULL;

        IF FOUND THEN
            v_seeded := v_seeded + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'seeded_periods', v_seeded);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_seed_term_grading_periods(p_term_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_inserted INTEGER := 0;
BEGIN
    INSERT INTO public.grading_periods (term_id, name, sequence, weight, created_by)
    SELECT p_term_id, gpt.name, gpt.sequence, gpt.weight, auth.uid()
    FROM public.grading_period_templates gpt
    WHERE gpt.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.grading_periods gp
          WHERE gp.term_id = p_term_id
            AND gp.deleted_at IS NULL
            AND (gp.sequence = gpt.sequence OR gp.name = gpt.name)
      );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_assessment_rubric(p_assessment_id uuid, p_rubric_id uuid, p_use_scoring boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT ai.section_id INTO v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.');
    END IF;

    PERFORM public.fn_assert_section_staff(v_section_id);

    IF p_use_scoring AND p_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attach a rubric before enabling rubric scoring.');
    END IF;

    IF p_rubric_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.rubrics r
            WHERE r.id = p_rubric_id
            AND r.section_id = v_section_id
            AND r.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Rubric does not belong to this section.');
        END IF;
    END IF;

    UPDATE public.assessment_item_rubrics
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL;

    IF p_rubric_id IS NOT NULL THEN
        INSERT INTO public.assessment_item_rubrics (assessment_item_id, rubric_id)
        VALUES (p_assessment_id, p_rubric_id);
    END IF;

    UPDATE public.assessment_items
    SET use_rubric_scoring = (p_rubric_id IS NOT NULL AND p_use_scoring)
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric settings saved.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_competency_alignments(p_competency_id uuid, p_parent_competency_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_parent_id UUID;
    v_valid INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF NOT EXISTS (
        SELECT 1 FROM public.competencies cm
        WHERE cm.id = p_competency_id
          AND cm.course_id IS NOT NULL
          AND cm.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only course-level competencies can be aligned to a program outcome.');
    END IF;

    IF p_parent_competency_ids IS NOT NULL AND array_length(p_parent_competency_ids, 1) > 0 THEN
        IF p_competency_id = ANY(p_parent_competency_ids) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A competency cannot be aligned to itself.');
        END IF;

        SELECT COUNT(*)
        INTO v_valid
        FROM public.competencies cm
        WHERE cm.id = ANY(p_parent_competency_ids)
          AND cm.course_id IS NULL
          AND cm.deleted_at IS NULL;

        IF v_valid <> array_length(p_parent_competency_ids, 1) THEN
            RETURN jsonb_build_object('success', false, 'message', 'One or more program outcomes are invalid.');
        END IF;
    END IF;

    UPDATE public.competency_alignments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE competency_id = p_competency_id
      AND deleted_at IS NULL
      AND (p_parent_competency_ids IS NULL OR NOT (parent_competency_id = ANY(p_parent_competency_ids)));

    IF p_parent_competency_ids IS NOT NULL AND array_length(p_parent_competency_ids, 1) > 0 THEN
        FOREACH v_parent_id IN ARRAY p_parent_competency_ids
        LOOP
            INSERT INTO public.competency_alignments (competency_id, parent_competency_id)
            VALUES (p_competency_id, v_parent_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Competency alignment updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_evaluation_template_programs(p_template_id uuid, p_program_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.evaluation_template_programs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_template_id
    AND deleted_at IS NULL
    AND (p_program_ids IS NULL OR NOT (program_id = ANY(p_program_ids)));

    IF p_program_ids IS NULL OR array_length(p_program_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.evaluation_template_programs (template_id, program_id, created_by)
    SELECT p_template_id, pid, auth.uid()
    FROM unnest(p_program_ids) AS pid
    WHERE NOT EXISTS (
        SELECT 1 FROM public.evaluation_template_programs tp
        WHERE tp.template_id = p_template_id
        AND tp.program_id = pid
        AND tp.deleted_at IS NULL
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_grading_period_release_at(p_grading_period_id uuid, p_release_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_registrar BOOLEAN;
    v_exists       BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id    = auth.uid()
          AND r.code        = 'Registrar'
          AND ur.deleted_at IS NULL
    ) INTO v_is_registrar;

    IF NOT v_is_registrar THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Registrar can configure grade release schedules.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.grading_periods
        WHERE id = p_grading_period_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    UPDATE public.grading_periods
    SET release_at = p_release_at
    WHERE id = p_grading_period_id AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN p_release_at IS NULL
                THEN 'Automatic release cancelled.'
            ELSE 'Grade release scheduled.'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_material_published(p_material_id uuid, p_is_published boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id AND cm.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can publish materials.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.course_materials
    SET is_published = COALESCE(p_is_published, false)
    WHERE id = p_material_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Material updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_module_published(p_module_id uuid, p_is_published boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can publish content.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.modules
    SET is_published = COALESCE(p_is_published, false),
        published_at = CASE WHEN COALESCE(p_is_published, false) THEN now() ELSE NULL END
    WHERE id = p_module_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_post_answer(p_post_id uuid, p_is_answer boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_thread_author UUID;
    v_thread_id UUID;
BEGIN
    SELECT t.section_id, t.created_by, t.id INTO v_section_id, v_thread_author, v_thread_id
    FROM public.discussion_posts p
    JOIN public.discussion_threads t ON t.id = p.thread_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found.');
    END IF;

    IF v_thread_author <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can mark an answer.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_posts
    SET is_answer = false
    WHERE thread_id = v_thread_id AND deleted_at IS NULL;

    IF COALESCE(p_is_answer, false) THEN
        UPDATE public.discussion_posts
        SET is_answer = true
        WHERE id = p_post_id AND deleted_at IS NULL;

        UPDATE public.discussion_threads
        SET is_resolved = true
        WHERE id = v_thread_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Answer updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_thread_pinned(p_thread_id uuid, p_is_pinned boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can pin a discussion.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_threads
    SET is_pinned = COALESCE(p_is_pinned, false)
    WHERE id = p_thread_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_thread_resolved(p_thread_id uuid, p_is_resolved boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
BEGIN
    SELECT section_id, created_by INTO v_section_id, v_author_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can resolve this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_threads
    SET is_resolved = COALESCE(p_is_resolved, false)
    WHERE id = p_thread_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_updated_at_assessment_attachments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_updated_at_student_section_colors()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_set_updated_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid(); -- Supabase injects the authenticated user's UUID
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_shift_student_program(p_student_id uuid, p_program_id uuid, p_year_level smallint DEFAULT NULL::smallint, p_reason text DEFAULT NULL::text, p_effective_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_current_program UUID;
    v_current_year SMALLINT;
    v_target_year SMALLINT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.program_id, s.year_level
    INTO v_current_program, v_current_year
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = p_program_id
          AND p.is_active
          AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program not found or inactive.');
    END IF;

    v_target_year := COALESCE(p_year_level, v_current_year);

    IF v_target_year < 1 OR v_target_year > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6.');
    END IF;

    IF v_current_program IS NOT DISTINCT FROM p_program_id AND v_current_year = v_target_year THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The student is already in this program and year level.'
        );
    END IF;

    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year
    WHERE id = p_student_id;

    INSERT INTO public.student_lifecycle_events (
        student_id,
        event_type,
        from_program_id,
        to_program_id,
        from_year_level,
        to_year_level,
        reason,
        effective_date
    ) VALUES (
        p_student_id,
        'Program Shift',
        v_current_program,
        p_program_id,
        v_current_year,
        v_target_year,
        NULLIF(btrim(COALESCE(p_reason, '')), ''),
        COALESCE(p_effective_date, CURRENT_DATE)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student program updated.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_start_assessment_timer(p_enrollment_id uuid, p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_submission_id           UUID;
    v_time_limit              SMALLINT;
    v_closes_at               TIMESTAMPTZ;
    v_opens_at                TIMESTAMPTZ;
    v_attempt_number          SMALLINT;
    v_max_attempts            SMALLINT;
    v_expires_at              TIMESTAMPTZ;
    v_section_id              UUID;
    v_is_enrolled             BOOLEAN;
    v_existing_submission_id  UUID;
    v_existing_expires_at     TIMESTAMPTZ;
BEGIN
    SELECT
        ai.time_limit_minutes,
        ai.closes_at,
        ai.opens_at,
        ai.max_attempts,
        ai.section_id
    INTO v_time_limit, v_closes_at, v_opens_at, v_max_attempts, v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
    AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
    AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or not published.');
    END IF;

    IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment is not yet open.');
    END IF;

    IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment window has closed.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = p_enrollment_id
        AND e.section_id = v_section_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not enrolled in this section.');
    END IF;

    SELECT id, time_limit_expires_at
    INTO v_existing_submission_id, v_existing_expires_at
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = p_enrollment_id
    AND status = 'In Progress'
    AND deleted_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_submission_id IS NOT NULL THEN
        IF v_existing_expires_at IS NOT NULL AND now() > v_existing_expires_at THEN
            UPDATE public.assessment_submissions
            SET status = 'Submitted',
                submitted_at = v_existing_expires_at,
                updated_at = now()
            WHERE id = v_existing_submission_id;

            UPDATE public.assessment_timer_sessions
            SET status = 'Expired',
                updated_at = now()
            WHERE submission_id = v_existing_submission_id;

            RETURN jsonb_build_object('success', false, 'message', 'Time limit has expired.');
        END IF;

        UPDATE public.assessment_timer_sessions
        SET last_activity_at = now(),
            updated_at = now()
        WHERE submission_id = v_existing_submission_id;

        RETURN jsonb_build_object(
            'success',       true,
            'submission_id', v_existing_submission_id,
            'expires_at',    v_existing_expires_at
        );
    END IF;

    SELECT COUNT(*) INTO v_attempt_number
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = p_enrollment_id
    AND status != 'In Progress'
    AND deleted_at IS NULL;

    IF v_attempt_number >= v_max_attempts THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum attempts reached.');
    END IF;

    v_expires_at := CASE
        WHEN v_time_limit IS NOT NULL THEN now() + (v_time_limit || ' minutes')::INTERVAL
        ELSE NULL
    END;

    INSERT INTO public.assessment_submissions (
        assessment_item_id, enrollment_id, attempt_number,
        status, started_at, time_limit_expires_at, created_by
    ) VALUES (
        p_assessment_id, p_enrollment_id, v_attempt_number + 1,
        'In Progress', now(), v_expires_at, auth.uid()
    )
    RETURNING id INTO v_submission_id;

    INSERT INTO public.assessment_timer_sessions (
        submission_id, enrollment_id, assessment_item_id,
        server_started_at, server_expires_at,
        status, last_activity_at, created_by
    ) VALUES (
        v_submission_id, p_enrollment_id, p_assessment_id,
        now(), v_expires_at,
        'Active', now(), auth.uid()
    );

    RETURN jsonb_build_object(
        'success',       true,
        'submission_id', v_submission_id,
        'expires_at',    v_expires_at
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_student_course_grades(p_student_id uuid)
 RETURNS TABLE(enrollment_id uuid, term_id uuid, course_id uuid, course_code text, course_title text, units numeric, grade numeric, raw_grade numeric, special_grade text, enrollment_status text, is_released boolean, is_passing boolean, completed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        g.enrollment_id,
        g.term_id,
        g.course_id,
        g.course_code,
        g.course_title,
        g.units,
        g.grade,
        g.raw_grade,
        g.special_grade,
        g.enrollment_status,
        g.is_released,
        CASE
            WHEN g.special_grade IS NOT NULL
                THEN COALESCE(sgc.is_passing, false)
            WHEN g.is_released AND g.grade IS NOT NULL
                THEN g.grade <= 3.00
            ELSE NULL
        END AS is_passing,
        g.completed_at
    FROM (
        SELECT
            e.id AS enrollment_id,
            sec.term_id AS term_id,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units AS units,
            ROUND(
                SUM(COALESCE(sfg.transmuted_grade, sfg.final_grade) * gp.weight)
                    FILTER (WHERE sfg.status = 'Released')
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released'), 0),
                2
            ) AS grade,
            ROUND(
                SUM(sfg.final_grade * gp.weight) FILTER (WHERE sfg.status = 'Released')
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released'), 0),
                2
            ) AS raw_grade,
            MAX(sfg.special_grade) FILTER (WHERE sfg.status = 'Released') AS special_grade,
            e.status::TEXT AS enrollment_status,
            COALESCE(bool_or(sfg.status = 'Released'), false) AS is_released,
            MAX(sfg.released_at) FILTER (WHERE sfg.status = 'Released') AS completed_at
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id AND sfg.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp
            ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        WHERE e.student_id = p_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
        GROUP BY e.id, sec.term_id, c.id, c.code, c.title, c.total_units, e.status
    ) g
    LEFT JOIN public.special_grade_configs sgc
        ON sgc.code = g.special_grade AND sgc.deleted_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_submit_assessment(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id    UUID;
  v_assessment_id    UUID;
  v_status           submission_status_type;
  v_expires_at       TIMESTAMPTZ;
  v_due_at           TIMESTAMPTZ;
  v_is_late          BOOLEAN := false;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

  SELECT
    asub.enrollment_id,
    asub.assessment_item_id,
    asub.status,
    asub.time_limit_expires_at
  INTO v_enrollment_id, v_assessment_id, v_status, v_expires_at
  FROM public.assessment_submissions asub
  WHERE asub.id         = p_submission_id
    AND asub.deleted_at IS NULL;

  IF v_enrollment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission not found.');
  END IF;

  IF v_status NOT IN ('In Progress', 'Not Started') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission is not in a submittable state.');
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission window has expired.');
  END IF;

  SELECT ai.due_at INTO v_due_at
  FROM public.assessment_items ai
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  UPDATE public.assessment_submissions
  SET
    status       = CASE WHEN v_is_late THEN 'Late' ELSE 'Submitted' END,
    submitted_at = now(),
    is_late      = v_is_late
  WHERE id = p_submission_id;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted',
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'success',       true,
    'submission_id', p_submission_id,
    'submitted_at',  now(),
    'is_late',       v_is_late,
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(p_enrollment_id uuid, p_grading_period_id uuid, p_responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_template_ids UUID[];
    v_resolved_period_id UUID;
    v_scope public.evaluation_scope_type;
    v_is_completed BOOLEAN;
    v_response JSONB;
    v_required_count INTEGER;
    v_answered_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id
        AND student_id = v_student_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    v_resolved_period_id := public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id);
    v_scope := public.fn_get_enrollment_evaluation_scope(p_enrollment_id);

    IF v_resolved_period_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    SELECT is_completed INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = v_resolved_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF COALESCE(v_is_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already completed this evaluation.');
    END IF;

    SELECT array_agg(t.id ORDER BY t.sequence ASC) INTO v_template_ids
    FROM public.fn_list_applicable_evaluation_templates(v_student_id) t;

    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available.');
    END IF;

    SELECT COUNT(*) INTO v_required_count
    FROM public.evaluation_questions
    WHERE template_id = ANY(v_template_ids)
    AND is_required = true
    AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT q.id) INTO v_answered_count
    FROM jsonb_array_elements(p_responses) r
    INNER JOIN public.evaluation_questions q
        ON q.id = (r->>'question_id')::UUID
        AND q.template_id = ANY(v_template_ids)
        AND q.is_required = true
        AND q.deleted_at IS NULL
    WHERE COALESCE(NULLIF(btrim(COALESCE(r->>'response_text', '')), ''), NULLIF(btrim(COALESCE(r->>'rating_value', '')), '')) IS NOT NULL;

    IF v_answered_count < v_required_count THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please answer all required questions before submitting.');
    END IF;

    INSERT INTO public.evaluation_period_locks (enrollment_id, grading_period_id, template_id, template_ids, created_by)
    VALUES (p_enrollment_id, v_resolved_period_id, v_template_ids[1], v_template_ids, auth.uid())
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        template_id  = EXCLUDED.template_id,
        template_ids = EXCLUDED.template_ids,
        updated_by   = auth.uid();

    UPDATE public.evaluation_responses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = v_resolved_period_id
    AND deleted_at IS NULL;

    FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
    LOOP
        IF EXISTS (
            SELECT 1 FROM public.evaluation_questions
            WHERE id = (v_response->>'question_id')::UUID
            AND template_id = ANY(v_template_ids)
            AND deleted_at IS NULL
        ) THEN
            INSERT INTO public.evaluation_responses (
                question_id, enrollment_id, grading_period_id, rating_value, response_text, created_by
            )
            VALUES (
                (v_response->>'question_id')::UUID,
                p_enrollment_id,
                v_resolved_period_id,
                NULLIF(btrim(COALESCE(v_response->>'rating_value', '')), '')::SMALLINT,
                NULLIF(btrim(COALESCE(v_response->>'response_text', '')), ''),
                auth.uid()
            );
        END IF;
    END LOOP;

    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, v_resolved_period_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN v_scope = 'Term'
            THEN 'Evaluation submitted. Your grades for this term are now available.'
            ELSE 'Evaluation submitted. Your grade is now available.'
        END
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_sweep_expired_assessment_sessions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_swept_count INTEGER := 0;
BEGIN
    WITH expired_subs AS (
        UPDATE public.assessment_submissions
        SET status = 'Submitted',
            submitted_at = time_limit_expires_at,
            updated_at = now()
        WHERE status = 'In Progress'
        AND time_limit_expires_at IS NOT NULL
        AND time_limit_expires_at < now()
        AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_swept_count FROM expired_subs;

    UPDATE public.assessment_timer_sessions
    SET status = 'Expired',
        updated_at = now()
    WHERE status = 'Active'
    AND server_expires_at IS NOT NULL
    AND server_expires_at < now()
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'swept_count', v_swept_count,
        'message', 'Swept expired assessment sessions.'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_sweep_scheduled_grade_releases()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_period   RECORD;
    v_outcome  jsonb;
    v_periods  INTEGER := 0;
    v_released INTEGER := 0;
    v_blocked  INTEGER := 0;
BEGIN
    FOR v_period IN
        SELECT gp.id
        FROM public.grading_periods gp
        WHERE gp.deleted_at IS NULL
          AND gp.release_at IS NOT NULL
          AND gp.release_at <= now()
        ORDER BY gp.release_at ASC
    LOOP
        v_outcome  := public.fn_release_grading_period_grades(v_period.id);
        v_periods  := v_periods + 1;
        v_released := v_released + (v_outcome ->> 'released')::INTEGER;
        v_blocked  := v_blocked + (v_outcome ->> 'blocked_by_evaluation')::INTEGER;
    END LOOP;

    RETURN jsonb_build_object(
        'success',               true,
        'periods_processed',     v_periods,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_tag_question_competencies(p_question_id uuid, p_competency_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_course_id UUID;
    v_competency_id UUID;
    v_valid INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT sec.id, sec.course_id
    INTO v_section_id, v_course_id
    FROM public.assessment_questions aq
    JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id AND ai.deleted_at IS NULL
    JOIN public.sections sec ON sec.id = ai.section_id AND sec.deleted_at IS NULL
    WHERE aq.id = p_question_id
      AND aq.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.sections sec
        WHERE sec.id = v_section_id
          AND sec.faculty_id = auth.uid()
          AND sec.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Forbidden: you may only tag questions in sections you teach.'
            USING ERRCODE = '42501';
    END IF;

    IF p_competency_ids IS NOT NULL AND array_length(p_competency_ids, 1) > 0 THEN
        SELECT COUNT(*)
        INTO v_valid
        FROM public.competencies cm
        WHERE cm.id = ANY(p_competency_ids)
          AND cm.is_active
          AND cm.deleted_at IS NULL
          AND (cm.course_id = v_course_id OR cm.course_id IS NULL);

        IF v_valid <> array_length(p_competency_ids, 1) THEN
            RETURN jsonb_build_object('success', false, 'message', 'One or more competencies are invalid or do not belong to this course.');
        END IF;
    END IF;

    UPDATE public.assessment_question_competencies
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE question_id = p_question_id
      AND deleted_at IS NULL
      AND (p_competency_ids IS NULL OR NOT (competency_id = ANY(p_competency_ids)));

    IF p_competency_ids IS NOT NULL AND array_length(p_competency_ids, 1) > 0 THEN
        FOREACH v_competency_id IN ARRAY p_competency_ids
        LOOP
            INSERT INTO public.assessment_question_competencies (question_id, competency_id)
            VALUES (p_question_id, v_competency_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Question competencies updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_unpublish_assessment(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    UPDATE public.assessment_items
    SET is_published = false
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment unpublished successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_academic_thresholds(p_thresholds jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_item JSONB;
    v_id UUID;
    v_min_gwa NUMERIC(4,2);
    v_max_gwa NUMERIC(4,2);
    v_updated INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF jsonb_typeof(p_thresholds) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid payload: an array of thresholds is required.');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_thresholds)
    LOOP
        v_id := (v_item->>'id')::UUID;
        v_min_gwa := NULLIF(v_item->>'min_gwa', '')::NUMERIC(4,2);
        v_max_gwa := (v_item->>'max_gwa')::NUMERIC(4,2);

        IF v_max_gwa IS NULL OR v_max_gwa < 1.00 OR v_max_gwa > 5.00 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each threshold must have a passing grade ceiling between 1.00 and 5.00.');
        END IF;

        IF v_min_gwa IS NOT NULL AND v_min_gwa > v_max_gwa THEN
            RETURN jsonb_build_object('success', false, 'message', 'A threshold minimum cannot be greater than its maximum.');
        END IF;

        UPDATE public.academic_thresholds
        SET
            min_gwa = v_min_gwa,
            max_gwa = v_max_gwa,
            requires_no_failing = COALESCE((v_item->>'requires_no_failing')::BOOLEAN, requires_no_failing),
            scholarship_discount_pct = NULLIF(v_item->>'scholarship_discount_pct', '')::NUMERIC(5,2),
            is_active = COALESCE((v_item->>'is_active')::BOOLEAN, is_active)
        WHERE id = v_id
          AND deleted_at IS NULL;

        IF FOUND THEN
            v_updated := v_updated + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', format('Updated %s academic threshold(s).', v_updated));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_announcement(p_id uuid, p_title text, p_content text, p_audience announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[], p_is_pinned boolean DEFAULT false, p_published_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_owner UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement title is required.');
    END IF;

    IF p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement content is required.');
    END IF;

    SELECT created_by INTO v_owner
    FROM public.announcements
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only edit announcements you posted.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    UPDATE public.announcements
    SET title = btrim(p_title),
        content = btrim(p_content),
        target_audience = p_audience,
        section_id = CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        is_pinned = COALESCE(p_is_pinned, false),
        published_at = p_published_at,
        expires_at = p_expires_at
    WHERE id = p_id
      AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE announcement_id = p_id
      AND deleted_at IS NULL
      AND (p_audience <> 'Section' OR p_section_ids IS NULL OR NOT (section_id = ANY(p_section_ids)));

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.announcement_sections (announcement_id, section_id)
            VALUES (p_id, v_section_id)
            ON CONFLICT (announcement_id, section_id) WHERE deleted_at IS NULL DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement updated.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_assessment(p_assessment_id uuid, p_title text, p_description text, p_assessment_type assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint, p_allow_student_review boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_opens_at >= p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before due date.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_opens_at >= p_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before closing date.');
    END IF;

    IF p_due_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_closes_at < p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be on or after due date.');
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND p_opens_at IS NOT NULL AND p_scheduled_publish_at > p_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scheduled publish date must be on or before the opens date.');
    END IF;

    IF NOT COALESCE(p_show_all_questions, true) AND (p_questions_per_page IS NULL OR p_questions_per_page < 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Questions per page must be at least 1 when not showing all questions.');
    END IF;

    UPDATE public.assessment_items
    SET
        title                = p_title,
        description          = NULLIF(p_description, ''),
        assessment_type      = p_assessment_type,
        grading_component_id = p_grading_component_id,
        total_points         = p_total_points,
        passing_points       = p_passing_points,
        time_limit_minutes   = p_time_limit_minutes,
        max_attempts         = COALESCE(p_max_attempts, 1),
        opens_at             = p_opens_at,
        due_at               = p_due_at,
        closes_at            = p_closes_at,
        show_results_at      = p_show_results_at,
        scheduled_publish_at = p_scheduled_publish_at,
        shuffle_questions    = COALESCE(p_shuffle_questions, false),
        shuffle_choices      = COALESCE(p_shuffle_choices, false),
        show_all_questions   = COALESCE(p_show_all_questions, true),
        questions_per_page   = CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
        allow_student_review = COALESCE(p_allow_student_review, true)
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_competency(p_id uuid, p_code text, p_title text, p_description text DEFAULT NULL::text, p_bloom_level text DEFAULT NULL::text, p_sort_order integer DEFAULT 0, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency code is required.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency title is required.');
    END IF;

    UPDATE public.competencies
    SET
        code = btrim(p_code),
        title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        bloom_level = NULLIF(btrim(p_bloom_level), ''),
        sort_order = COALESCE(p_sort_order, 0),
        is_active = COALESCE(p_is_active, true)
    WHERE id = p_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Competency updated.');

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'A competency with this code already exists in the same scope.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_course(p_course_id uuid, p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_prereq JSONB;
BEGIN
    IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lecture units must be between 0 and 10');
    END IF;

    IF p_laboratory_units IS NOT NULL AND (p_laboratory_units < 0 OR p_laboratory_units > 10) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Laboratory units must be between 0 and 10');
    END IF;

    IF p_credit_hours IS NOT NULL AND (p_credit_hours < 0 OR p_credit_hours > 20) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credit hours must be between 0 and 20');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.courses
        WHERE code = p_code
        AND id <> p_course_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code);
    END IF;

    UPDATE public.courses
    SET
        title = p_title,
        department_id = p_department_id,
        course_type_id = p_course_type_id,
        lecture_units = p_lecture_units,
        laboratory_units = COALESCE(p_laboratory_units, 0),
        credit_hours = p_credit_hours,
        description = NULLIF(p_description, ''),
        is_active = p_is_active
    WHERE id = p_course_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                END IF;
                IF (v_prereq->>'course_id')::UUID = p_course_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
            END IF;

            IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                END IF;
            END IF;

            IF (v_prereq->>'prerequisite_type') = 'Co-requisite' AND
               (v_prereq->>'minimum_grade') IS NOT NULL AND
               (v_prereq->>'minimum_grade') <> '' THEN
                RETURN jsonb_build_object('success', false, 'message', 'Co-requisite courses cannot have a minimum grade requirement');
            END IF;

            INSERT INTO public.course_prerequisites (
                course_id, prerequisite_id, prerequisite_type,
                prerequisite_kind, year_level_required, minimum_grade, created_by
            )
            VALUES (
                p_course_id,
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                    THEN (v_prereq->>'course_id')::UUID
                    ELSE NULL END,
                (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                    THEN (v_prereq->>'year_level_required')::SMALLINT
                    ELSE NULL END,
                CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                     ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_course_type(p_course_type_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE code = p_code
        AND id <> p_course_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type code already exists: ' || p_code);
    END IF;

    UPDATE public.course_types
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(p_curriculum_map_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = v_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND id <> p_curriculum_map_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    UPDATE public.curriculum_maps
    SET
        course_id = p_course_id,
        year_level = p_year_level,
        term_type_id = p_term_type_id,
        school_year_id = p_school_year_id,
        sequence = p_sequence,
        is_elective = p_is_elective
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_department(p_department_id uuid, p_code text, p_name text, p_description text DEFAULT NULL::text, p_head_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND id <> p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    IF p_head_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_head_user_id
            AND r.code IN ('Faculty', 'Dean')
            AND ur.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Department head must have a Faculty or Dean role');
        END IF;
    END IF;

    UPDATE public.departments
    SET
        code = p_code,
        name = p_name,
        description = NULLIF(p_description, ''),
        head_user_id = p_head_user_id
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_enrollment(p_enrollment_id uuid, p_status enrollment_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET status = p_status
    WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollment updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_evaluation_template(p_id uuid, p_title text, p_description text, p_is_active boolean, p_sequence smallint, p_program_ids uuid[], p_questions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_error TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND id <> p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    v_error := public.fn_validate_evaluation_programs(p_program_ids);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    UPDATE public.evaluation_templates
    SET
        title       = btrim(p_title),
        description = NULLIF(btrim(COALESCE(p_description, '')), ''),
        is_active   = COALESCE(p_is_active, true),
        sequence    = GREATEST(COALESCE(p_sequence, 1), 1),
        updated_by  = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    PERFORM public.fn_insert_evaluation_questions(p_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(p_id, p_program_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_event(p_id uuid, p_title text, p_start_at timestamp with time zone, p_audience announcement_audience_type, p_end_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_all_day boolean DEFAULT false, p_location text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_section_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_owner UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event title is required.');
    END IF;

    IF p_start_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event start date is required.');
    END IF;

    IF p_end_at IS NOT NULL AND p_end_at < p_start_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date cannot be before the start date.');
    END IF;

    SELECT created_by INTO v_owner
    FROM public.events
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only edit events you created.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    UPDATE public.events
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        location = NULLIF(btrim(p_location), ''),
        target_audience = p_audience,
        section_id = CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        start_at = p_start_at,
        end_at = p_end_at,
        all_day = COALESCE(p_all_day, false)
    WHERE id = p_id
      AND deleted_at IS NULL;

    UPDATE public.event_sections
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE event_id = p_id
      AND deleted_at IS NULL
      AND (p_audience <> 'Section' OR p_section_ids IS NULL OR NOT (section_id = ANY(p_section_ids)));

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.event_sections (event_id, section_id)
            VALUES (p_id, v_section_id)
            ON CONFLICT (event_id, section_id) WHERE deleted_at IS NULL DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Event updated.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_grading_component(p_component_id uuid, p_name text, p_weight numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id        UUID;
    v_grading_period_id UUID;
    v_old_name          TEXT;
    v_old_weight        NUMERIC;
    v_total_weight      NUMERIC;
BEGIN
    SELECT gc.section_id, gc.grading_period_id, gc.name, gc.weight
    INTO v_section_id, v_grading_period_id, v_old_name, v_old_weight
    FROM public.grading_components gc
    INNER JOIN public.sections s ON s.id = gc.section_id
    WHERE gc.id = p_component_id
    AND s.faculty_id = auth.uid()
    AND gc.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component not found or access denied.');
    END IF;

    IF public.fn_is_section_grading_locked(v_section_id, v_grading_period_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grading period is locked because grades have already been recorded. Components can no longer be changed.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.grading_components
    WHERE section_id = v_section_id
    AND grading_period_id = v_grading_period_id
    AND id <> p_component_id
    AND deleted_at IS NULL;

    IF v_total_weight + p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total weight of grading components cannot exceed 100%.');
    END IF;

    UPDATE public.grading_components
    SET name = p_name, weight = p_weight
    WHERE id = p_component_id
    AND deleted_at IS NULL;

    IF v_old_name IS DISTINCT FROM p_name THEN
        INSERT INTO public.grade_audit_logs (
            action, table_name, record_id, enrollment_id, grading_period_id,
            field_changed, old_value, new_value, change_reason, changed_by, ip_address
        ) VALUES (
            'Update', 'grading_components', p_component_id, NULL, v_grading_period_id,
            'name', v_old_name, p_name,
            'Grading component renamed', auth.uid(), inet_client_addr()
        );
    END IF;

    IF v_old_weight IS DISTINCT FROM p_weight THEN
        INSERT INTO public.grade_audit_logs (
            action, table_name, record_id, enrollment_id, grading_period_id,
            field_changed, old_value, new_value, change_reason, changed_by, ip_address
        ) VALUES (
            'Update', 'grading_components', p_component_id, NULL, v_grading_period_id,
            'weight', v_old_weight::TEXT, p_weight::TEXT,
            'Grading component weight changed', auth.uid(), inet_client_addr()
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Grading component updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_grading_config(p_passing_grade numeric, p_max_absence_percentage numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_passing_grade < 1.0 OR p_passing_grade > 5.0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Passing grade must be between 1.0 and 5.0');
    END IF;

    IF p_max_absence_percentage <= 0 OR p_max_absence_percentage > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max absence percentage must be between 1 and 100');
    END IF;

    UPDATE public.grading_config
    SET
        passing_grade = p_passing_grade,
        max_absence_percentage = p_max_absence_percentage
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading config not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Grading configuration updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_grading_period_template(p_id uuid, p_name text, p_weight numeric, p_components jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_component JSONB;
    v_comp_total NUMERIC := 0;
    v_others_total NUMERIC := 0;
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.grading_period_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period name is required.');
    END IF;

    IF p_weight IS NULL OR p_weight <= 0 OR p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weight must be greater than 0 and at most 100.');
    END IF;

    IF jsonb_array_length(p_components) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one component is required.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'name')))
        FROM jsonb_array_elements(p_components) c
    ) <> jsonb_array_length(p_components) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component names within a grading period must be unique.');
    END IF;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
    END LOOP;

    IF round(v_comp_total, 2) <> 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Component weights for ' || p_name || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.grading_period_templates
        WHERE lower(name) = lower(btrim(p_name)) AND id <> p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A grading period named "' || btrim(p_name) || '" already exists.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_others_total
    FROM public.grading_period_templates
    WHERE deleted_at IS NULL AND id <> p_id;

    IF v_others_total + p_weight > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This weight would make the total exceed 100%. Only ' || (100 - v_others_total) || '% is available for this period.'
        );
    END IF;

    UPDATE public.grading_period_templates
    SET name = btrim(p_name), weight = p_weight, updated_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id = p_id AND deleted_at IS NULL;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        INSERT INTO public.grading_component_templates (
            grading_period_template_id, name, weight, created_by
        )
        VALUES (
            p_id,
            btrim(v_component->>'name'),
            (v_component->>'weight')::NUMERIC,
            auth.uid()
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_material(p_material_id uuid, p_title text, p_description text DEFAULT NULL::text, p_external_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id AND cm.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can edit materials.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A material title is required.');
    END IF;

    UPDATE public.course_materials
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        external_url = COALESCE(NULLIF(btrim(p_external_url), ''), external_url)
    WHERE id = p_material_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Material updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_module(p_module_id uuid, p_title text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can edit content.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A module title is required.');
    END IF;

    UPDATE public.modules
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), '')
    WHERE id = p_module_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_my_avatar(p_avatar_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_url     TEXT := NULLIF(btrim(COALESCE(p_avatar_url, '')), '');
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your photo.');
    END IF;

    IF v_url IS NOT NULL AND v_url !~* '^https?://' THEN
        RETURN jsonb_build_object('success', false, 'message', 'The photo location is not a valid URL.');
    END IF;

    UPDATE public.users
    SET avatar_url = v_url
    WHERE id = v_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN v_url IS NULL THEN 'Your profile photo has been removed.'
            ELSE 'Your profile photo has been updated.'
        END
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_my_profile(p_first_name text, p_middle_name text, p_last_name text, p_suffix text, p_preferred_name text, p_mobile_number text, p_address_line1 text, p_address_line2 text, p_city text, p_province text, p_postal_code text, p_date_of_birth date, p_gender text, p_civil_status text, p_nationality text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, '')), ''),
        last_name = btrim(p_last_name),
        suffix = NULLIF(btrim(COALESCE(p_suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = NULLIF(btrim(COALESCE(p_gender, '')), '')::public.gender_type,
        civil_status = NULLIF(btrim(COALESCE(p_civil_status, '')), '')::public.civil_status_type,
        nationality = NULLIF(btrim(COALESCE(p_nationality, '')), '')
    WHERE id = v_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Your profile has been updated.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_program(p_program_id uuid, p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE code = p_code
        AND id <> p_program_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program code already exists: ' || p_code);
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    UPDATE public.programs
    SET
        code = p_code,
        name = p_name,
        department_id = p_department_id,
        program_level_id = p_program_level_id,
        years_duration = p_years_duration,
        total_units = p_total_units,
        description = NULLIF(p_description, ''),
        is_active = p_is_active
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program updated successfully');
END;$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_program_level(p_program_level_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_program_level_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No program level was selected.');
    END IF;

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code is required.');
    END IF;

    IF p_label IS NULL OR btrim(p_label) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE code = btrim(p_code)
        AND id <> p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level code already exists: ' || btrim(p_code));
    END IF;

    UPDATE public.program_levels
    SET
        code = btrim(p_code),
        label = btrim(p_label),
        description = NULLIF(btrim(coalesce(p_description, '')), '')
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_role(p_role_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_code TEXT := btrim(p_code);
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.roles
        WHERE id = p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    IF v_code IS NULL OR v_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role code is required.');
    END IF;

    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(code)) = lower(v_code) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with code "' || v_code || '" already exists.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    UPDATE public.roles
    SET
        code = v_code,
        label = v_label,
        description = v_description,
        updated_by = auth.uid()
    WHERE id = p_role_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_rubric(p_rubric_id uuid, p_title text, p_description text, p_criteria jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_criterion  JSONB;
    v_total      NUMERIC := 0;
    v_seq        SMALLINT := 0;
    v_kept_ids   UUID[] := ARRAY[]::UUID[];
    v_criterion_id UUID;
BEGIN
    PERFORM public.fn_assert_section_staff(public.fn_resolve_rubric_section(p_rubric_id));

    IF NOT EXISTS (
        SELECT 1 FROM public.rubrics WHERE id = p_rubric_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric not found.');
    END IF;

    IF COALESCE(trim(p_title), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric title is required.');
    END IF;

    IF p_criteria IS NULL OR jsonb_array_length(p_criteria) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Add at least one criterion.');
    END IF;

    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        v_seq := v_seq + 1;

        IF (v_criterion->>'max_points')::NUMERIC <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each criterion must have points greater than zero.');
        END IF;

        IF NULLIF(v_criterion->>'id', '') IS NOT NULL THEN
            v_criterion_id := (v_criterion->>'id')::UUID;

            UPDATE public.rubric_criteria
            SET
                title       = trim(v_criterion->>'title'),
                description = NULLIF(trim(v_criterion->>'description'), ''),
                max_points  = (v_criterion->>'max_points')::NUMERIC,
                sequence    = v_seq
            WHERE id = v_criterion_id
            AND rubric_id = p_rubric_id
            AND deleted_at IS NULL;
        ELSE
            INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
            VALUES (
                p_rubric_id,
                trim(v_criterion->>'title'),
                NULLIF(trim(v_criterion->>'description'), ''),
                (v_criterion->>'max_points')::NUMERIC,
                v_seq
            )
            RETURNING id INTO v_criterion_id;
        END IF;

        v_kept_ids := array_append(v_kept_ids, v_criterion_id);
        v_total := v_total + (v_criterion->>'max_points')::NUMERIC;
    END LOOP;

    UPDATE public.rubric_criteria
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE rubric_id = p_rubric_id
    AND deleted_at IS NULL
    AND NOT (id = ANY(v_kept_ids));

    UPDATE public.rubrics
    SET
        title        = trim(p_title),
        description  = NULLIF(trim(p_description), ''),
        total_points = v_total
    WHERE id = p_rubric_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_school_year(p_school_year_id uuid, p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = p_code
        AND id <> p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || p_code);
    END IF;

    IF p_is_active THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
        AND id <> p_school_year_id
        AND deleted_at IS NULL;
    END IF;

    UPDATE public.school_years
    SET
        code = p_code,
        label = p_label,
        start_date = p_start_date,
        end_date = p_end_date,
        is_active = p_is_active
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_section(p_section_id uuid, p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status section_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND id <> p_section_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    UPDATE public.sections
    SET
        term_id      = p_term_id,
        course_id    = p_course_id,
        faculty_id   = p_faculty_id,
        section_code = p_section_code,
        room         = p_room,
        max_slots    = p_max_slots,
        status       = p_status
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_student(p_student_id uuid, p_student_number text, p_program_id uuid, p_year_level smallint, p_admitted_at date, p_status student_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE student_number = p_student_number
        AND id <> p_student_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student number already exists.');
    END IF;

    UPDATE public.students
    SET
        student_number = p_student_number,
        program_id     = p_program_id,
        year_level     = p_year_level,
        admitted_at    = p_admitted_at,
        status         = p_status
    WHERE id = p_student_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_system_settings(p_institution_name text, p_institution_short_name text, p_institution_address text, p_institution_email text, p_institution_phone text, p_institution_website text, p_institution_logo_url text, p_academic_year_start_month smallint, p_max_units_per_term smallint, p_default_term_type_id uuid DEFAULT NULL::uuid, p_default_evaluation_scope text DEFAULT 'Period'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF COALESCE(NULLIF(p_default_evaluation_scope, ''), 'Period') NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    IF p_max_units_per_term < 1 OR p_max_units_per_term > 60 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max units per term must be between 1 and 60');
    END IF;

    UPDATE public.system_settings
    SET
        institution_name = p_institution_name,
        institution_short_name = p_institution_short_name,
        institution_address = p_institution_address,
        institution_email = p_institution_email,
        institution_phone = p_institution_phone,
        institution_website = p_institution_website,
        institution_logo_url = p_institution_logo_url,
        academic_year_start_month = p_academic_year_start_month,
        max_units_per_term = p_max_units_per_term,
        default_term_type_id = p_default_term_type_id,
        default_evaluation_scope = COALESCE(NULLIF(p_default_evaluation_scope, ''), 'Period')::public.evaluation_scope_type
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_term(p_term_id uuid, p_school_year_id uuid, p_term_type_id uuid, p_start_date date, p_end_date date, p_enrollment_start_date date DEFAULT NULL::date, p_enrollment_end_date date DEFAULT NULL::date, p_grading_deadline date DEFAULT NULL::date, p_evaluation_scope text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_current_status TEXT;
    v_locked_count INTEGER;
    v_current_scope public.evaluation_scope_type;
    v_next_scope public.evaluation_scope_type;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_evaluation_scope IS NOT NULL AND p_evaluation_scope <> '' AND p_evaluation_scope NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    SELECT status INTO v_current_status
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    IF v_current_status = 'Closed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closed terms cannot be edited');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND id <> p_term_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    v_current_scope := public.fn_get_evaluation_scope(p_term_id);
    v_next_scope := COALESCE(
        NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type,
        (
            SELECT ss.default_evaluation_scope
            FROM public.system_settings ss
            WHERE ss.deleted_at IS NULL
            ORDER BY ss.created_at ASC
            LIMIT 1
        ),
        'Period'::public.evaluation_scope_type
    );

    IF v_next_scope <> v_current_scope THEN
        SELECT COUNT(*)
        INTO v_locked_count
        FROM public.evaluation_period_locks epl
        INNER JOIN public.grading_periods gp ON gp.id = epl.grading_period_id AND gp.deleted_at IS NULL
        WHERE gp.term_id = p_term_id
        AND epl.deleted_at IS NULL;

        IF v_locked_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Evaluation scope cannot be changed: students have already submitted evaluations for this term'
            );
        END IF;
    END IF;

    UPDATE public.terms
    SET
        school_year_id        = p_school_year_id,
        term_type_id          = p_term_type_id,
        start_date            = p_start_date,
        end_date              = p_end_date,
        enrollment_start_date = p_enrollment_start_date,
        enrollment_end_date   = p_enrollment_end_date,
        grading_deadline      = p_grading_deadline,
        evaluation_scope      = NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Term updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_term_type(p_term_type_id uuid, p_code text, p_label text, p_sequence smallint, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE sequence = p_sequence
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sequence ' || p_sequence || ' is already taken by another term type');
    END IF;

    UPDATE public.term_types
    SET
        code = p_code,
        label = p_label,
        sequence = p_sequence,
        description = NULLIF(p_description, '')
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type updated successfully');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_update_user(p_user_id uuid, p_first_name text, p_last_name text, p_role_codes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_user_id = auth.uid() AND NOT ('Admin' = ANY (COALESCE(p_role_codes, ARRAY[]::TEXT[]))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot remove the Admin role from your own account.'
        );
    END IF;

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name)
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    v_result := public.fn_apply_user_roles(p_user_id, p_role_codes);

    IF NOT (v_result->>'success')::BOOLEAN THEN
        RETURN v_result;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_upsert_question(p_assessment_id uuid, p_question_id uuid, p_question_text text, p_question_type question_type, p_points numeric, p_sequence smallint, p_explanation text, p_is_required boolean, p_allowed_file_types text[], p_max_file_size_mb integer, p_max_file_count smallint, p_choices jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_question_id UUID;
    v_choice JSONB;
    v_sequence SMALLINT := 1;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    IF p_question_id IS NOT NULL THEN
        UPDATE public.assessment_questions
        SET
            question_text      = p_question_text,
            question_type      = p_question_type,
            points             = p_points,
            sequence           = p_sequence,
            explanation        = NULLIF(p_explanation, ''),
            is_required        = p_is_required,
            allowed_file_types = p_allowed_file_types,
            max_file_size_mb   = p_max_file_size_mb,
            max_file_count     = p_max_file_count
        WHERE id = p_question_id
        AND assessment_item_id = p_assessment_id
        AND deleted_at IS NULL;

        v_question_id := p_question_id;
    ELSE
        INSERT INTO public.assessment_questions (
            assessment_item_id,
            question_text,
            question_type,
            points,
            sequence,
            explanation,
            is_required,
            allowed_file_types,
            max_file_size_mb,
            max_file_count,
            created_by
        ) VALUES (
            p_assessment_id,
            p_question_text,
            p_question_type,
            p_points,
            p_sequence,
            NULLIF(p_explanation, ''),
            p_is_required,
            p_allowed_file_types,
            p_max_file_size_mb,
            p_max_file_count,
            auth.uid()
        )
        RETURNING id INTO v_question_id;
    END IF;

    IF p_choices IS NOT NULL AND p_question_type IN ('Multiple Choice', 'True or False', 'Matching') THEN
        UPDATE public.assessment_question_choices
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE question_id = v_question_id AND deleted_at IS NULL;

        FOR v_choice IN SELECT * FROM jsonb_array_elements(p_choices)
        LOOP
            INSERT INTO public.assessment_question_choices (
                question_id,
                choice_text,
                is_correct,
                sequence,
                created_by
            ) VALUES (
                v_question_id,
                trim(v_choice->>'choice_text'),
                COALESCE((v_choice->>'is_correct')::BOOLEAN, false),
                v_sequence,
                auth.uid()
            );
            v_sequence := v_sequence + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Question saved successfully.', 'id', v_question_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_upsert_student_section_color(p_section_id uuid, p_color text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_color TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_color := '#' || lower(replace(btrim(coalesce(p_color, '')), '#', ''));

    IF NOT public.fn_is_readable_hex_color(v_color) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Pick a color that is not white, black, or too close to either. It would be unreadable on the schedule.'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.enrollments e
        WHERE e.student_id = v_student_id
          AND e.section_id = p_section_id
          AND e.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not enrolled in this section.');
    END IF;

    INSERT INTO public.student_section_colors (
        student_id,
        section_id,
        color,
        created_by
    ) VALUES (
        v_student_id,
        p_section_id,
        v_color,
        auth.uid()
    )
    ON CONFLICT (student_id, section_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        color = v_color,
        updated_at = now(),
        updated_by = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Color saved successfully.');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_validate_evaluation_programs(p_program_ids uuid[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_missing INTEGER;
BEGIN
    IF p_program_ids IS NULL OR array_length(p_program_ids, 1) IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO v_missing
    FROM unnest(p_program_ids) AS pid
    WHERE NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = pid AND p.deleted_at IS NULL
    );

    IF v_missing > 0 THEN
        RETURN 'One or more selected programs no longer exist.';
    END IF;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_validate_evaluation_questions(p_questions jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_question JSONB;
    v_type public.evaluation_question_type;
    v_min SMALLINT;
    v_max SMALLINT;
BEGIN
    IF p_questions IS NULL OR jsonb_array_length(p_questions) = 0 THEN
        RETURN 'At least one question is required.';
    END IF;

    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
        IF btrim(COALESCE(v_question->>'question_text', '')) = '' THEN
            RETURN 'Every question must have text.';
        END IF;

        v_type := (v_question->>'question_type')::public.evaluation_question_type;

        IF v_type = 'Rating' THEN
            v_min := COALESCE((v_question->>'min_rating')::SMALLINT, 1);
            v_max := COALESCE((v_question->>'max_rating')::SMALLINT, 5);

            IF v_min < 1 OR v_max > 10 OR v_min >= v_max THEN
                RETURN 'Rating questions require min rating >= 1, max rating <= 10, and min below max.';
            END IF;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$function$
;


-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "academic_thresholds_insert" ON public.academic_thresholds;
CREATE POLICY "academic_thresholds_insert" ON public.academic_thresholds FOR INSERT TO authenticated WITH CHECK (('Admin'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "academic_thresholds_select" ON public.academic_thresholds;
CREATE POLICY "academic_thresholds_select" ON public.academic_thresholds FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "academic_thresholds_update" ON public.academic_thresholds;
CREATE POLICY "academic_thresholds_update" ON public.academic_thresholds FOR UPDATE TO authenticated USING (('Admin'::text = ANY (fn_current_user_role_codes()))) WITH CHECK (('Admin'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "announcement_sections_insert" ON public.announcement_sections;
CREATE POLICY "announcement_sections_insert" ON public.announcement_sections FOR INSERT TO authenticated WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "announcement_sections_select" ON public.announcement_sections;
CREATE POLICY "announcement_sections_select" ON public.announcement_sections FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "announcement_sections_update" ON public.announcement_sections;
CREATE POLICY "announcement_sections_update" ON public.announcement_sections FOR UPDATE TO authenticated USING ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text])) WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO authenticated WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE TO authenticated USING ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text])) WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "Faculty can manage their assessment attachments" ON public.assessment_attachments;
CREATE POLICY "Faculty can manage their assessment attachments" ON public.assessment_attachments FOR ALL TO public USING (((assessment_item_id IN ( SELECT ai.id
   FROM (assessment_items ai
     JOIN sections s ON ((s.id = ai.section_id)))
  WHERE ((s.faculty_id = auth.uid()) AND (ai.deleted_at IS NULL)))) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "Students can view attachments of visible assessments" ON public.assessment_attachments;
CREATE POLICY "Students can view attachments of visible assessments" ON public.assessment_attachments FOR SELECT TO public USING (((deleted_at IS NULL) AND (assessment_item_id IN ( SELECT ai.id
   FROM (((assessment_items ai
     JOIN sections s ON ((s.id = ai.section_id)))
     JOIN enrollments e ON ((e.section_id = s.id)))
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND ((ai.is_published = true) OR ((ai.scheduled_publish_at IS NOT NULL) AND (ai.scheduled_publish_at <= now()))) AND (ai.deleted_at IS NULL) AND (e.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "assessment_item_rubrics_insert" ON public.assessment_item_rubrics;
CREATE POLICY "assessment_item_rubrics_insert" ON public.assessment_item_rubrics FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "assessment_item_rubrics_select" ON public.assessment_item_rubrics;
CREATE POLICY "assessment_item_rubrics_select" ON public.assessment_item_rubrics FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "assessment_item_rubrics_update" ON public.assessment_item_rubrics;
CREATE POLICY "assessment_item_rubrics_update" ON public.assessment_item_rubrics FOR UPDATE TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "assessment_question_choices_select" ON public.assessment_question_choices;
CREATE POLICY "assessment_question_choices_select" ON public.assessment_question_choices FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "aqc_insert" ON public.assessment_question_competencies;
CREATE POLICY "aqc_insert" ON public.assessment_question_competencies FOR INSERT TO authenticated WITH CHECK (('Faculty'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "aqc_select" ON public.assessment_question_competencies;
CREATE POLICY "aqc_select" ON public.assessment_question_competencies FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "aqc_update" ON public.assessment_question_competencies;
CREATE POLICY "aqc_update" ON public.assessment_question_competencies FOR UPDATE TO authenticated USING (('Faculty'::text = ANY (fn_current_user_role_codes()))) WITH CHECK (('Faculty'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "assessment_questions_select" ON public.assessment_questions;
CREATE POLICY "assessment_questions_select" ON public.assessment_questions FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (assessment_item_id IN ( SELECT assessment_items.id
   FROM assessment_items
  WHERE (assessment_items.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "assessment_submissions_insert" ON public.assessment_submissions;
CREATE POLICY "assessment_submissions_insert" ON public.assessment_submissions FOR INSERT TO authenticated WITH CHECK ((enrollment_id IN ( SELECT e.id
   FROM (enrollments e
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "timer_heartbeats_insert" ON public.assessment_timer_heartbeats;
CREATE POLICY "timer_heartbeats_insert" ON public.assessment_timer_heartbeats FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "timer_heartbeats_select" ON public.assessment_timer_heartbeats;
CREATE POLICY "timer_heartbeats_select" ON public.assessment_timer_heartbeats FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (assessment_timer_sessions ts
     JOIN assessment_items ai ON (((ai.id = ts.assessment_item_id) AND (ai.deleted_at IS NULL))))
  WHERE ((ts.id = assessment_timer_heartbeats.session_id) AND (ts.deleted_at IS NULL) AND (fn_owns_submission(ts.submission_id) OR fn_is_section_faculty(ai.section_id) OR (fn_current_user_role_codes() && ARRAY['Dean'::text, 'Registrar'::text, 'Admin'::text])))))));

DROP POLICY IF EXISTS "timer_heartbeats_update" ON public.assessment_timer_heartbeats;
CREATE POLICY "timer_heartbeats_update" ON public.assessment_timer_heartbeats FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "timer_sessions_insert" ON public.assessment_timer_sessions;
CREATE POLICY "timer_sessions_insert" ON public.assessment_timer_sessions FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "timer_sessions_update" ON public.assessment_timer_sessions;
CREATE POLICY "timer_sessions_update" ON public.assessment_timer_sessions FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "clearance_requirements_insert" ON public.clearance_requirements;
CREATE POLICY "clearance_requirements_insert" ON public.clearance_requirements FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "clearance_requirements_select" ON public.clearance_requirements;
CREATE POLICY "clearance_requirements_select" ON public.clearance_requirements FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "clearance_requirements_update" ON public.clearance_requirements;
CREATE POLICY "clearance_requirements_update" ON public.clearance_requirements FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "competencies_insert" ON public.competencies;
CREATE POLICY "competencies_insert" ON public.competencies FOR INSERT TO authenticated WITH CHECK (('Dean'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "competencies_select" ON public.competencies;
CREATE POLICY "competencies_select" ON public.competencies FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "competencies_update" ON public.competencies;
CREATE POLICY "competencies_update" ON public.competencies FOR UPDATE TO authenticated USING (('Dean'::text = ANY (fn_current_user_role_codes()))) WITH CHECK (('Dean'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "competency_alignments_insert" ON public.competency_alignments;
CREATE POLICY "competency_alignments_insert" ON public.competency_alignments FOR INSERT TO authenticated WITH CHECK (('Dean'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "competency_alignments_select" ON public.competency_alignments;
CREATE POLICY "competency_alignments_select" ON public.competency_alignments FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "competency_alignments_update" ON public.competency_alignments;
CREATE POLICY "competency_alignments_update" ON public.competency_alignments FOR UPDATE TO authenticated USING (('Dean'::text = ANY (fn_current_user_role_codes()))) WITH CHECK (('Dean'::text = ANY (fn_current_user_role_codes())));

DROP POLICY IF EXISTS "course_materials_insert" ON public.course_materials;
CREATE POLICY "course_materials_insert" ON public.course_materials FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM modules m
  WHERE ((m.id = course_materials.module_id) AND (m.deleted_at IS NULL) AND fn_is_section_faculty(m.section_id)))));

DROP POLICY IF EXISTS "course_materials_select" ON public.course_materials;
CREATE POLICY "course_materials_select" ON public.course_materials FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM modules m
  WHERE ((m.id = course_materials.module_id) AND (m.deleted_at IS NULL) AND fn_can_access_section(m.section_id))))));

DROP POLICY IF EXISTS "course_materials_update" ON public.course_materials;
CREATE POLICY "course_materials_update" ON public.course_materials FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM modules m
  WHERE ((m.id = course_materials.module_id) AND (m.deleted_at IS NULL) AND fn_is_section_faculty(m.section_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM modules m
  WHERE ((m.id = course_materials.module_id) AND (m.deleted_at IS NULL) AND fn_is_section_faculty(m.section_id)))));

DROP POLICY IF EXISTS "course_prerequisites_insert" ON public.course_prerequisites;
CREATE POLICY "course_prerequisites_insert" ON public.course_prerequisites FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "course_prerequisites_select" ON public.course_prerequisites;
CREATE POLICY "course_prerequisites_select" ON public.course_prerequisites FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "course_prerequisites_update" ON public.course_prerequisites;
CREATE POLICY "course_prerequisites_update" ON public.course_prerequisites FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "course_types_insert" ON public.course_types;
CREATE POLICY "course_types_insert" ON public.course_types FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "course_types_select" ON public.course_types;
CREATE POLICY "course_types_select" ON public.course_types FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "course_types_soft_delete" ON public.course_types;
CREATE POLICY "course_types_soft_delete" ON public.course_types FOR UPDATE TO public USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));

DROP POLICY IF EXISTS "course_types_update" ON public.course_types;
CREATE POLICY "course_types_update" ON public.course_types FOR UPDATE TO public USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "courses_insert" ON public.courses;
CREATE POLICY "courses_insert" ON public.courses FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "courses_select" ON public.courses;
CREATE POLICY "courses_select" ON public.courses FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "courses_update" ON public.courses;
CREATE POLICY "courses_update" ON public.courses FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "curriculum_maps_insert" ON public.curriculum_maps;
CREATE POLICY "curriculum_maps_insert" ON public.curriculum_maps FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "curriculum_maps_select" ON public.curriculum_maps;
CREATE POLICY "curriculum_maps_select" ON public.curriculum_maps FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "curriculum_maps_update" ON public.curriculum_maps;
CREATE POLICY "curriculum_maps_update" ON public.curriculum_maps FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "departments_insert" ON public.departments;
CREATE POLICY "departments_insert" ON public.departments FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "departments_select" ON public.departments;
CREATE POLICY "departments_select" ON public.departments FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "departments_update" ON public.departments;
CREATE POLICY "departments_update" ON public.departments FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "discussion_attachments_insert" ON public.discussion_attachments;
CREATE POLICY "discussion_attachments_insert" ON public.discussion_attachments FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM discussion_threads t
  WHERE ((t.id = discussion_attachments.thread_id) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id)))) OR (EXISTS ( SELECT 1
   FROM (discussion_posts p
     JOIN discussion_threads t ON ((t.id = p.thread_id)))
  WHERE ((p.id = discussion_attachments.post_id) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id))))));

DROP POLICY IF EXISTS "discussion_attachments_select" ON public.discussion_attachments;
CREATE POLICY "discussion_attachments_select" ON public.discussion_attachments FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((EXISTS ( SELECT 1
   FROM discussion_threads t
  WHERE ((t.id = discussion_attachments.thread_id) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id)))) OR (EXISTS ( SELECT 1
   FROM (discussion_posts p
     JOIN discussion_threads t ON ((t.id = p.thread_id)))
  WHERE ((p.id = discussion_attachments.post_id) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id)))))));

DROP POLICY IF EXISTS "discussion_attachments_update" ON public.discussion_attachments;
CREATE POLICY "discussion_attachments_update" ON public.discussion_attachments FOR UPDATE TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));

DROP POLICY IF EXISTS "discussion_posts_insert" ON public.discussion_posts;
CREATE POLICY "discussion_posts_insert" ON public.discussion_posts FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM discussion_threads t
  WHERE ((t.id = discussion_posts.thread_id) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id)))));

DROP POLICY IF EXISTS "discussion_posts_select" ON public.discussion_posts;
CREATE POLICY "discussion_posts_select" ON public.discussion_posts FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM discussion_threads t
  WHERE ((t.id = discussion_posts.thread_id) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id))))));

DROP POLICY IF EXISTS "discussion_posts_update" ON public.discussion_posts;
CREATE POLICY "discussion_posts_update" ON public.discussion_posts FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM discussion_threads t
  WHERE ((t.id = discussion_posts.thread_id) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM discussion_threads t
  WHERE ((t.id = discussion_posts.thread_id) AND (t.deleted_at IS NULL) AND fn_can_access_section(t.section_id)))));

DROP POLICY IF EXISTS "discussion_threads_insert" ON public.discussion_threads;
CREATE POLICY "discussion_threads_insert" ON public.discussion_threads FOR INSERT TO authenticated WITH CHECK (fn_can_access_section(section_id));

DROP POLICY IF EXISTS "discussion_threads_select" ON public.discussion_threads;
CREATE POLICY "discussion_threads_select" ON public.discussion_threads FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND fn_can_access_section(section_id)));

DROP POLICY IF EXISTS "discussion_threads_update" ON public.discussion_threads;
CREATE POLICY "discussion_threads_update" ON public.discussion_threads FOR UPDATE TO authenticated USING (fn_can_access_section(section_id)) WITH CHECK (fn_can_access_section(section_id));

DROP POLICY IF EXISTS "enrollments_insert" ON public.enrollments;
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "enrollments_update" ON public.enrollments;
CREATE POLICY "enrollments_update" ON public.enrollments FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "evaluation_period_locks_insert" ON public.evaluation_period_locks;
CREATE POLICY "evaluation_period_locks_insert" ON public.evaluation_period_locks FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "evaluation_period_locks_update" ON public.evaluation_period_locks;
CREATE POLICY "evaluation_period_locks_update" ON public.evaluation_period_locks FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "evaluation_questions_insert" ON public.evaluation_questions;
CREATE POLICY "evaluation_questions_insert" ON public.evaluation_questions FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "evaluation_questions_select" ON public.evaluation_questions;
CREATE POLICY "evaluation_questions_select" ON public.evaluation_questions FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "evaluation_questions_update" ON public.evaluation_questions;
CREATE POLICY "evaluation_questions_update" ON public.evaluation_questions FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "evaluation_responses_insert" ON public.evaluation_responses;
CREATE POLICY "evaluation_responses_insert" ON public.evaluation_responses FOR INSERT TO authenticated WITH CHECK (((enrollment_id IN ( SELECT e.id
   FROM (enrollments e
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL)))) AND (enrollment_id IN ( SELECT epl.enrollment_id
   FROM evaluation_period_locks epl
  WHERE ((epl.grading_period_id = epl.grading_period_id) AND (epl.is_completed = false) AND (epl.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "evaluation_responses_select" ON public.evaluation_responses;
CREATE POLICY "evaluation_responses_select" ON public.evaluation_responses FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (enrollment_id IN ( SELECT e.id
   FROM (enrollments e
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "evaluation_responses_update" ON public.evaluation_responses;
CREATE POLICY "evaluation_responses_update" ON public.evaluation_responses FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (enrollment_id IN ( SELECT e.id
   FROM (enrollments e
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "evaluation_template_programs_insert" ON public.evaluation_template_programs;
CREATE POLICY "evaluation_template_programs_insert" ON public.evaluation_template_programs FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "evaluation_template_programs_select" ON public.evaluation_template_programs;
CREATE POLICY "evaluation_template_programs_select" ON public.evaluation_template_programs FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "evaluation_template_programs_update" ON public.evaluation_template_programs;
CREATE POLICY "evaluation_template_programs_update" ON public.evaluation_template_programs FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "evaluation_templates_insert" ON public.evaluation_templates;
CREATE POLICY "evaluation_templates_insert" ON public.evaluation_templates FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "evaluation_templates_select" ON public.evaluation_templates;
CREATE POLICY "evaluation_templates_select" ON public.evaluation_templates FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "evaluation_templates_update" ON public.evaluation_templates;
CREATE POLICY "evaluation_templates_update" ON public.evaluation_templates FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "event_sections_insert" ON public.event_sections;
CREATE POLICY "event_sections_insert" ON public.event_sections FOR INSERT TO authenticated WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "event_sections_select" ON public.event_sections;
CREATE POLICY "event_sections_select" ON public.event_sections FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "event_sections_update" ON public.event_sections;
CREATE POLICY "event_sections_update" ON public.event_sections FOR UPDATE TO authenticated USING ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text])) WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert" ON public.events FOR INSERT TO authenticated WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select" ON public.events FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update" ON public.events FOR UPDATE TO authenticated USING ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text])) WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Dean'::text, 'Registrar'::text, 'Faculty'::text]));

DROP POLICY IF EXISTS "grade_audit_logs_insert" ON public.grade_audit_logs;
CREATE POLICY "grade_audit_logs_insert" ON public.grade_audit_logs FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "grade_audit_logs_update" ON public.grade_audit_logs;
CREATE POLICY "grade_audit_logs_update" ON public.grade_audit_logs FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "grade_transmutation_tables_insert" ON public.grade_transmutation_tables;
CREATE POLICY "grade_transmutation_tables_insert" ON public.grade_transmutation_tables FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "grade_transmutation_tables_select" ON public.grade_transmutation_tables;
CREATE POLICY "grade_transmutation_tables_select" ON public.grade_transmutation_tables FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "grade_transmutation_tables_update" ON public.grade_transmutation_tables;
CREATE POLICY "grade_transmutation_tables_update" ON public.grade_transmutation_tables FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "grading_component_templates_insert" ON public.grading_component_templates;
CREATE POLICY "grading_component_templates_insert" ON public.grading_component_templates FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "grading_component_templates_select" ON public.grading_component_templates;
CREATE POLICY "grading_component_templates_select" ON public.grading_component_templates FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "grading_component_templates_soft_delete" ON public.grading_component_templates;
CREATE POLICY "grading_component_templates_soft_delete" ON public.grading_component_templates FOR UPDATE TO public USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));

DROP POLICY IF EXISTS "grading_component_templates_update" ON public.grading_component_templates;
CREATE POLICY "grading_component_templates_update" ON public.grading_component_templates FOR UPDATE TO public USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "grading_components_select" ON public.grading_components;
CREATE POLICY "grading_components_select" ON public.grading_components FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "grading_config_insert" ON public.grading_config;
CREATE POLICY "grading_config_insert" ON public.grading_config FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "grading_config_select" ON public.grading_config;
CREATE POLICY "grading_config_select" ON public.grading_config FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "grading_config_update" ON public.grading_config;
CREATE POLICY "grading_config_update" ON public.grading_config FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "grading_period_templates_insert" ON public.grading_period_templates;
CREATE POLICY "grading_period_templates_insert" ON public.grading_period_templates FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "grading_period_templates_select" ON public.grading_period_templates;
CREATE POLICY "grading_period_templates_select" ON public.grading_period_templates FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "grading_period_templates_soft_delete" ON public.grading_period_templates;
CREATE POLICY "grading_period_templates_soft_delete" ON public.grading_period_templates FOR UPDATE TO public USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));

DROP POLICY IF EXISTS "grading_period_templates_update" ON public.grading_period_templates;
CREATE POLICY "grading_period_templates_update" ON public.grading_period_templates FOR UPDATE TO public USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "grading_periods_insert" ON public.grading_periods;
CREATE POLICY "grading_periods_insert" ON public.grading_periods FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "grading_periods_select" ON public.grading_periods;
CREATE POLICY "grading_periods_select" ON public.grading_periods FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "grading_periods_update" ON public.grading_periods;
CREATE POLICY "grading_periods_update" ON public.grading_periods FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "material_completions_insert" ON public.material_completions;
CREATE POLICY "material_completions_insert" ON public.material_completions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM (enrollments e
     JOIN students st ON (((st.id = e.student_id) AND (st.deleted_at IS NULL))))
  WHERE ((e.id = material_completions.enrollment_id) AND (st.user_id = auth.uid()) AND (e.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "material_completions_select" ON public.material_completions;
CREATE POLICY "material_completions_select" ON public.material_completions FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (enrollments e
     JOIN students st ON (((st.id = e.student_id) AND (st.deleted_at IS NULL))))
  WHERE ((e.id = material_completions.enrollment_id) AND (st.user_id = auth.uid()) AND (e.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "material_completions_update" ON public.material_completions;
CREATE POLICY "material_completions_update" ON public.material_completions FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (enrollments e
     JOIN students st ON (((st.id = e.student_id) AND (st.deleted_at IS NULL))))
  WHERE ((e.id = material_completions.enrollment_id) AND (st.user_id = auth.uid()) AND (e.deleted_at IS NULL))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (enrollments e
     JOIN students st ON (((st.id = e.student_id) AND (st.deleted_at IS NULL))))
  WHERE ((e.id = material_completions.enrollment_id) AND (st.user_id = auth.uid()) AND (e.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "modules_insert" ON public.modules;
CREATE POLICY "modules_insert" ON public.modules FOR INSERT TO authenticated WITH CHECK (fn_is_section_faculty(section_id));

DROP POLICY IF EXISTS "modules_select" ON public.modules;
CREATE POLICY "modules_select" ON public.modules FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND fn_can_access_section(section_id)));

DROP POLICY IF EXISTS "modules_update" ON public.modules;
CREATE POLICY "modules_update" ON public.modules FOR UPDATE TO authenticated USING (fn_is_section_faculty(section_id)) WITH CHECK (fn_is_section_faculty(section_id));

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "program_levels_insert" ON public.program_levels;
CREATE POLICY "program_levels_insert" ON public.program_levels FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "program_levels_select" ON public.program_levels;
CREATE POLICY "program_levels_select" ON public.program_levels FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "program_levels_soft_delete" ON public.program_levels;
CREATE POLICY "program_levels_soft_delete" ON public.program_levels FOR UPDATE TO public USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));

DROP POLICY IF EXISTS "program_levels_update" ON public.program_levels;
CREATE POLICY "program_levels_update" ON public.program_levels FOR UPDATE TO public USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "programs_insert" ON public.programs;
CREATE POLICY "programs_insert" ON public.programs FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "programs_select" ON public.programs;
CREATE POLICY "programs_select" ON public.programs FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "programs_update" ON public.programs;
CREATE POLICY "programs_update" ON public.programs FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "roles_insert" ON public.roles;
CREATE POLICY "roles_insert" ON public.roles FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "roles_select" ON public.roles;
CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "roles_update" ON public.roles;
CREATE POLICY "roles_update" ON public.roles FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "rubric_criteria_insert" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_insert" ON public.rubric_criteria FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "rubric_criteria_select" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_select" ON public.rubric_criteria FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "rubric_criteria_update" ON public.rubric_criteria;
CREATE POLICY "rubric_criteria_update" ON public.rubric_criteria FOR UPDATE TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "rubric_evaluations_insert" ON public.rubric_evaluations;
CREATE POLICY "rubric_evaluations_insert" ON public.rubric_evaluations FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "rubric_evaluations_select" ON public.rubric_evaluations;
CREATE POLICY "rubric_evaluations_select" ON public.rubric_evaluations FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((evaluated_by = auth.uid()) OR (submission_id IN ( SELECT asub.id
   FROM ((assessment_submissions asub
     JOIN enrollments e ON ((e.id = asub.enrollment_id)))
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (asub.deleted_at IS NULL) AND (st.deleted_at IS NULL)))))));

DROP POLICY IF EXISTS "rubric_evaluations_update" ON public.rubric_evaluations;
CREATE POLICY "rubric_evaluations_update" ON public.rubric_evaluations FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (evaluated_by = auth.uid())));

DROP POLICY IF EXISTS "rubrics_insert" ON public.rubrics;
CREATE POLICY "rubrics_insert" ON public.rubrics FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "rubrics_select" ON public.rubrics;
CREATE POLICY "rubrics_select" ON public.rubrics FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "rubrics_update" ON public.rubrics;
CREATE POLICY "rubrics_update" ON public.rubrics FOR UPDATE TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "school_years_insert" ON public.school_years;
CREATE POLICY "school_years_insert" ON public.school_years FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "school_years_select" ON public.school_years;
CREATE POLICY "school_years_select" ON public.school_years FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "school_years_update" ON public.school_years;
CREATE POLICY "school_years_update" ON public.school_years FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "section_schedules_insert" ON public.section_schedules;
CREATE POLICY "section_schedules_insert" ON public.section_schedules FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "section_schedules_select" ON public.section_schedules;
CREATE POLICY "section_schedules_select" ON public.section_schedules FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "section_schedules_update" ON public.section_schedules;
CREATE POLICY "section_schedules_update" ON public.section_schedules FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "sections_insert" ON public.sections;
CREATE POLICY "sections_insert" ON public.sections FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "sections_select" ON public.sections;
CREATE POLICY "sections_select" ON public.sections FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "special_grade_configs_insert" ON public.special_grade_configs;
CREATE POLICY "special_grade_configs_insert" ON public.special_grade_configs FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "special_grade_configs_select" ON public.special_grade_configs;
CREATE POLICY "special_grade_configs_select" ON public.special_grade_configs FOR SELECT TO public USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "special_grade_configs_update" ON public.special_grade_configs;
CREATE POLICY "special_grade_configs_update" ON public.special_grade_configs FOR UPDATE TO public USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));

DROP POLICY IF EXISTS "student_answers_insert" ON public.student_answers;
CREATE POLICY "student_answers_insert" ON public.student_answers FOR INSERT TO authenticated WITH CHECK ((submission_id IN ( SELECT asub.id
   FROM ((assessment_submissions asub
     JOIN enrollments e ON ((e.id = asub.enrollment_id)))
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (asub.deleted_at IS NULL) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL) AND (asub.status = 'In Progress'::submission_status_type) AND ((asub.time_limit_expires_at IS NULL) OR (asub.time_limit_expires_at > now()))))));

DROP POLICY IF EXISTS "student_answers_select" ON public.student_answers;
CREATE POLICY "student_answers_select" ON public.student_answers FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (submission_id IN ( SELECT assessment_submissions.id
   FROM assessment_submissions
  WHERE (assessment_submissions.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "student_answers_update" ON public.student_answers;
CREATE POLICY "student_answers_update" ON public.student_answers FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (submission_id IN ( SELECT asub.id
   FROM ((assessment_submissions asub
     JOIN enrollments e ON ((e.id = asub.enrollment_id)))
     JOIN students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (asub.deleted_at IS NULL) AND (st.deleted_at IS NULL) AND (asub.status = 'In Progress'::submission_status_type) AND ((asub.time_limit_expires_at IS NULL) OR (asub.time_limit_expires_at > now())))))));

DROP POLICY IF EXISTS "student_clearances_insert" ON public.student_clearances;
CREATE POLICY "student_clearances_insert" ON public.student_clearances FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "student_clearances_select" ON public.student_clearances;
CREATE POLICY "student_clearances_select" ON public.student_clearances FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((student_id IN ( SELECT students.id
   FROM students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))) OR (cleared_by = auth.uid()))));

DROP POLICY IF EXISTS "student_clearances_update" ON public.student_clearances;
CREATE POLICY "student_clearances_update" ON public.student_clearances FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "student_lifecycle_events_insert" ON public.student_lifecycle_events;
CREATE POLICY "student_lifecycle_events_insert" ON public.student_lifecycle_events FOR INSERT TO authenticated WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Registrar'::text]));

DROP POLICY IF EXISTS "student_lifecycle_events_select" ON public.student_lifecycle_events;
CREATE POLICY "student_lifecycle_events_select" ON public.student_lifecycle_events FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Registrar'::text, 'Dean'::text]) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_lifecycle_events.student_id) AND (s.user_id = auth.uid()) AND (s.deleted_at IS NULL)))))));

DROP POLICY IF EXISTS "student_lifecycle_events_update" ON public.student_lifecycle_events;
CREATE POLICY "student_lifecycle_events_update" ON public.student_lifecycle_events FOR UPDATE TO authenticated USING ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Registrar'::text])) WITH CHECK ((fn_current_user_role_codes() && ARRAY['Admin'::text, 'Registrar'::text]));

DROP POLICY IF EXISTS "Students can insert their own section colors" ON public.student_section_colors;
CREATE POLICY "Students can insert their own section colors" ON public.student_section_colors FOR INSERT TO public WITH CHECK ((student_id IN ( SELECT students.id
   FROM students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "Students can update their own section colors" ON public.student_section_colors;
CREATE POLICY "Students can update their own section colors" ON public.student_section_colors FOR UPDATE TO public USING (((student_id IN ( SELECT students.id
   FROM students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "Students can view their own section colors" ON public.student_section_colors;
CREATE POLICY "Students can view their own section colors" ON public.student_section_colors FOR SELECT TO public USING (((student_id IN ( SELECT students.id
   FROM students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))) AND (deleted_at IS NULL)));

DROP POLICY IF EXISTS "students_insert" ON public.students;
CREATE POLICY "students_insert" ON public.students FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "students_select" ON public.students;
CREATE POLICY "students_select" ON public.students FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "students_update" ON public.students;
CREATE POLICY "students_update" ON public.students FOR UPDATE TO authenticated USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "system_settings_insert" ON public.system_settings;
CREATE POLICY "system_settings_insert" ON public.system_settings FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));

DROP POLICY IF EXISTS "system_settings_update" ON public.system_settings;
CREATE POLICY "system_settings_update" ON public.system_settings FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));

DROP POLICY IF EXISTS "term_types_insert" ON public.term_types;
CREATE POLICY "term_types_insert" ON public.term_types FOR INSERT TO public WITH CHECK ((auth.uid() = created_by));

DROP POLICY IF EXISTS "term_types_select" ON public.term_types;
CREATE POLICY "term_types_select" ON public.term_types FOR SELECT TO public USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "term_types_soft_delete" ON public.term_types;
CREATE POLICY "term_types_soft_delete" ON public.term_types FOR UPDATE TO public USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));

DROP POLICY IF EXISTS "term_types_update" ON public.term_types;
CREATE POLICY "term_types_update" ON public.term_types FOR UPDATE TO public USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "terms_insert" ON public.terms;
CREATE POLICY "terms_insert" ON public.terms FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "terms_select" ON public.terms;
CREATE POLICY "terms_select" ON public.terms FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "terms_update" ON public.terms;
CREATE POLICY "terms_update" ON public.terms FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));

DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING ((deleted_at IS NULL));

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid()));


-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS trg_academic_thresholds_updated_audit ON public.academic_thresholds;
CREATE TRIGGER trg_academic_thresholds_updated_audit BEFORE UPDATE ON public.academic_thresholds FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_announcement_sections_updated_audit ON public.announcement_sections;
CREATE TRIGGER trg_announcement_sections_updated_audit BEFORE UPDATE ON public.announcement_sections FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_announcements_updated_audit ON public.announcements;
CREATE TRIGGER trg_announcements_updated_audit BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS set_updated_at_assessment_attachments ON public.assessment_attachments;
CREATE TRIGGER set_updated_at_assessment_attachments BEFORE UPDATE ON public.assessment_attachments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at_assessment_attachments();

DROP TRIGGER IF EXISTS trg_assessment_item_rubrics_updated_audit ON public.assessment_item_rubrics;
CREATE TRIGGER trg_assessment_item_rubrics_updated_audit BEFORE UPDATE ON public.assessment_item_rubrics FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_assessment_items_updated_audit ON public.assessment_items;
CREATE TRIGGER trg_assessment_items_updated_audit BEFORE UPDATE ON public.assessment_items FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_assessment_question_choices_updated_audit ON public.assessment_question_choices;
CREATE TRIGGER trg_assessment_question_choices_updated_audit BEFORE UPDATE ON public.assessment_question_choices FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_aqc_updated_audit ON public.assessment_question_competencies;
CREATE TRIGGER trg_aqc_updated_audit BEFORE UPDATE ON public.assessment_question_competencies FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_assessment_questions_updated_audit ON public.assessment_questions;
CREATE TRIGGER trg_assessment_questions_updated_audit BEFORE UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_assessment_submissions_audit_log ON public.assessment_submissions;
CREATE TRIGGER trg_assessment_submissions_audit_log AFTER UPDATE ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION fn_audit_assessment_submissions_score();

DROP TRIGGER IF EXISTS trg_assessment_submissions_updated_audit ON public.assessment_submissions;
CREATE TRIGGER trg_assessment_submissions_updated_audit BEFORE UPDATE ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_assessment_timer_heartbeats_updated_audit ON public.assessment_timer_heartbeats;
CREATE TRIGGER trg_assessment_timer_heartbeats_updated_audit BEFORE UPDATE ON public.assessment_timer_heartbeats FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_assessment_timer_sessions_updated_audit ON public.assessment_timer_sessions;
CREATE TRIGGER trg_assessment_timer_sessions_updated_audit BEFORE UPDATE ON public.assessment_timer_sessions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_attendance_records_updated_audit ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_audit BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_attendance_sessions_updated_audit ON public.attendance_sessions;
CREATE TRIGGER trg_attendance_sessions_updated_audit BEFORE UPDATE ON public.attendance_sessions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_clearance_requirements_updated_audit ON public.clearance_requirements;
CREATE TRIGGER trg_clearance_requirements_updated_audit BEFORE UPDATE ON public.clearance_requirements FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_competencies_updated_audit ON public.competencies;
CREATE TRIGGER trg_competencies_updated_audit BEFORE UPDATE ON public.competencies FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_competency_alignments_updated_audit ON public.competency_alignments;
CREATE TRIGGER trg_competency_alignments_updated_audit BEFORE UPDATE ON public.competency_alignments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_course_materials_updated_audit ON public.course_materials;
CREATE TRIGGER trg_course_materials_updated_audit BEFORE UPDATE ON public.course_materials FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_course_prerequisites_updated_audit ON public.course_prerequisites;
CREATE TRIGGER trg_course_prerequisites_updated_audit BEFORE UPDATE ON public.course_prerequisites FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_course_types_updated_audit ON public.course_types;
CREATE TRIGGER trg_course_types_updated_audit BEFORE UPDATE ON public.course_types FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_courses_updated_audit ON public.courses;
CREATE TRIGGER trg_courses_updated_audit BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_curriculum_maps_updated_audit ON public.curriculum_maps;
CREATE TRIGGER trg_curriculum_maps_updated_audit BEFORE UPDATE ON public.curriculum_maps FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_departments_updated_audit ON public.departments;
CREATE TRIGGER trg_departments_updated_audit BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_discussion_attachments_updated_audit ON public.discussion_attachments;
CREATE TRIGGER trg_discussion_attachments_updated_audit BEFORE UPDATE ON public.discussion_attachments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_discussion_posts_updated_audit ON public.discussion_posts;
CREATE TRIGGER trg_discussion_posts_updated_audit BEFORE UPDATE ON public.discussion_posts FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_discussion_threads_updated_audit ON public.discussion_threads;
CREATE TRIGGER trg_discussion_threads_updated_audit BEFORE UPDATE ON public.discussion_threads FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_enrollments_updated_audit ON public.enrollments;
CREATE TRIGGER trg_enrollments_updated_audit BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_evaluation_period_locks_updated_audit ON public.evaluation_period_locks;
CREATE TRIGGER trg_evaluation_period_locks_updated_audit BEFORE UPDATE ON public.evaluation_period_locks FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_evaluation_questions_updated_audit ON public.evaluation_questions;
CREATE TRIGGER trg_evaluation_questions_updated_audit BEFORE UPDATE ON public.evaluation_questions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_auto_complete_evaluation_lock ON public.evaluation_responses;
CREATE TRIGGER trg_auto_complete_evaluation_lock AFTER INSERT OR UPDATE ON public.evaluation_responses FOR EACH ROW EXECUTE FUNCTION fn_auto_complete_evaluation_lock();

DROP TRIGGER IF EXISTS trg_evaluation_responses_updated_audit ON public.evaluation_responses;
CREATE TRIGGER trg_evaluation_responses_updated_audit BEFORE UPDATE ON public.evaluation_responses FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_evaluation_template_programs_updated_audit ON public.evaluation_template_programs;
CREATE TRIGGER trg_evaluation_template_programs_updated_audit BEFORE UPDATE ON public.evaluation_template_programs FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_evaluation_templates_updated_audit ON public.evaluation_templates;
CREATE TRIGGER trg_evaluation_templates_updated_audit BEFORE UPDATE ON public.evaluation_templates FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_event_sections_updated_audit ON public.event_sections;
CREATE TRIGGER trg_event_sections_updated_audit BEFORE UPDATE ON public.event_sections FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_events_updated_audit ON public.events;
CREATE TRIGGER trg_events_updated_audit BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grade_audit_logs_updated_audit ON public.grade_audit_logs;
CREATE TRIGGER trg_grade_audit_logs_updated_audit BEFORE UPDATE ON public.grade_audit_logs FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grade_transmutation_updated_audit ON public.grade_transmutation_tables;
CREATE TRIGGER trg_grade_transmutation_updated_audit BEFORE UPDATE ON public.grade_transmutation_tables FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grading_component_templates_updated_audit ON public.grading_component_templates;
CREATE TRIGGER trg_grading_component_templates_updated_audit BEFORE UPDATE ON public.grading_component_templates FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grading_components_updated_audit ON public.grading_components;
CREATE TRIGGER trg_grading_components_updated_audit BEFORE UPDATE ON public.grading_components FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grading_config_updated_audit ON public.grading_config;
CREATE TRIGGER trg_grading_config_updated_audit BEFORE UPDATE ON public.grading_config FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grading_period_templates_updated_audit ON public.grading_period_templates;
CREATE TRIGGER trg_grading_period_templates_updated_audit BEFORE UPDATE ON public.grading_period_templates FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_grading_periods_updated_audit ON public.grading_periods;
CREATE TRIGGER trg_grading_periods_updated_audit BEFORE UPDATE ON public.grading_periods FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_material_completions_updated_audit ON public.material_completions;
CREATE TRIGGER trg_material_completions_updated_audit BEFORE UPDATE ON public.material_completions FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_modules_updated_audit ON public.modules;
CREATE TRIGGER trg_modules_updated_audit BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_notifications_updated_audit ON public.notifications;
CREATE TRIGGER trg_notifications_updated_audit BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_program_levels_updated_audit ON public.program_levels;
CREATE TRIGGER trg_program_levels_updated_audit BEFORE UPDATE ON public.program_levels FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_programs_updated_audit ON public.programs;
CREATE TRIGGER trg_programs_updated_audit BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_roles_updated_audit ON public.roles;
CREATE TRIGGER trg_roles_updated_audit BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_rubric_criteria_updated_audit ON public.rubric_criteria;
CREATE TRIGGER trg_rubric_criteria_updated_audit BEFORE UPDATE ON public.rubric_criteria FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_rubric_evaluations_updated_audit ON public.rubric_evaluations;
CREATE TRIGGER trg_rubric_evaluations_updated_audit BEFORE UPDATE ON public.rubric_evaluations FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_rubrics_updated_audit ON public.rubrics;
CREATE TRIGGER trg_rubrics_updated_audit BEFORE UPDATE ON public.rubrics FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_school_years_updated_audit ON public.school_years;
CREATE TRIGGER trg_school_years_updated_audit BEFORE UPDATE ON public.school_years FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_section_final_grades_audit_log ON public.section_final_grades;
CREATE TRIGGER trg_section_final_grades_audit_log AFTER UPDATE ON public.section_final_grades FOR EACH ROW EXECUTE FUNCTION fn_audit_section_final_grades();

DROP TRIGGER IF EXISTS trg_section_final_grades_updated_audit ON public.section_final_grades;
CREATE TRIGGER trg_section_final_grades_updated_audit BEFORE UPDATE ON public.section_final_grades FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_section_schedules_updated_audit ON public.section_schedules;
CREATE TRIGGER trg_section_schedules_updated_audit BEFORE UPDATE ON public.section_schedules FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_sections_updated_audit ON public.sections;
CREATE TRIGGER trg_sections_updated_audit BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_special_grade_configs_updated_audit ON public.special_grade_configs;
CREATE TRIGGER trg_special_grade_configs_updated_audit BEFORE UPDATE ON public.special_grade_configs FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_student_answers_updated_audit ON public.student_answers;
CREATE TRIGGER trg_student_answers_updated_audit BEFORE UPDATE ON public.student_answers FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_student_clearances_updated_audit ON public.student_clearances;
CREATE TRIGGER trg_student_clearances_updated_audit BEFORE UPDATE ON public.student_clearances FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_student_lifecycle_events_updated_audit ON public.student_lifecycle_events;
CREATE TRIGGER trg_student_lifecycle_events_updated_audit BEFORE UPDATE ON public.student_lifecycle_events FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS set_updated_at_student_section_colors ON public.student_section_colors;
CREATE TRIGGER set_updated_at_student_section_colors BEFORE UPDATE ON public.student_section_colors FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at_student_section_colors();

DROP TRIGGER IF EXISTS trg_students_updated_audit ON public.students;
CREATE TRIGGER trg_students_updated_audit BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_system_settings_updated_audit ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_audit BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_term_types_updated_audit ON public.term_types;
CREATE TRIGGER trg_term_types_updated_audit BEFORE UPDATE ON public.term_types FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_terms_updated_audit ON public.terms;
CREATE TRIGGER trg_terms_updated_audit BEFORE UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_user_roles_updated_audit ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_audit BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP TRIGGER IF EXISTS trg_users_updated_audit ON public.users;
CREATE TRIGGER trg_users_updated_audit BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

-- RPC for student profile creation with system-generated student number
CREATE OR REPLACE FUNCTION public.fn_create_my_student_profile(
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT 1::smallint,
    p_first_name text DEFAULT NULL::text,
    p_middle_name text DEFAULT NULL::text,
    p_last_name text DEFAULT NULL::text,
    p_suffix text DEFAULT NULL::text,
    p_preferred_name text DEFAULT NULL::text,
    p_mobile_number text DEFAULT NULL::text,
    p_address_line1 text DEFAULT NULL::text,
    p_address_line2 text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_province text DEFAULT NULL::text,
    p_postal_code text DEFAULT NULL::text,
    p_date_of_birth date DEFAULT NULL::date,
    p_gender text DEFAULT NULL::text,
    p_civil_status text DEFAULT NULL::text,
    p_nationality text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_student_id UUID;
    v_student_number TEXT;
    v_seq_num INT;
    v_role_id UUID;
    v_eff_year SMALLINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(p_first_name), ''), first_name),
        middle_name = COALESCE(p_middle_name, middle_name),
        last_name = COALESCE(NULLIF(btrim(p_last_name), ''), last_name),
        suffix = COALESCE(p_suffix, suffix),
        preferred_name = COALESCE(p_preferred_name, preferred_name),
        mobile_number = COALESCE(p_mobile_number, mobile_number),
        address_line1 = COALESCE(p_address_line1, address_line1),
        address_line2 = COALESCE(p_address_line2, address_line2),
        city = COALESCE(p_city, city),
        province = COALESCE(p_province, province),
        postal_code = COALESCE(p_postal_code, postal_code),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        gender = CASE WHEN p_gender IS NOT NULL AND p_gender <> '' THEN p_gender::public.gender_type ELSE gender END,
        civil_status = CASE WHEN p_civil_status IS NOT NULL AND p_civil_status <> '' THEN p_civil_status::public.civil_status_type ELSE civil_status END,
        nationality = COALESCE(p_nationality, nationality),
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    SELECT id INTO v_role_id FROM public.roles WHERE code = 'Student' AND deleted_at IS NULL;
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
        VALUES (v_user_id, v_role_id, v_user_id, 'Student')
        ON CONFLICT DO NOTHING;
    END IF;

    SELECT id, student_number INTO v_student_id, v_student_number
    FROM public.students
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    v_eff_year := COALESCE(p_year_level, 1);
    IF v_eff_year < 1 OR v_eff_year > 6 THEN
        v_eff_year := 1;
    END IF;

    IF v_student_id IS NULL THEN
        SELECT count(*) + 1 INTO v_seq_num FROM public.students;
        v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        END LOOP;

        INSERT INTO public.students (
            user_id,
            student_number,
            program_id,
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            v_user_id,
            v_student_number,
            p_program_id,
            v_eff_year,
            'Active'::public.student_status_type,
            CURRENT_DATE,
            v_user_id
        )
        RETURNING id INTO v_student_id;

        IF p_program_id IS NOT NULL THEN
            INSERT INTO public.student_lifecycle_events (
                student_id,
                event_type,
                from_program_id,
                to_program_id,
                from_year_level,
                to_year_level,
                reason,
                effective_date,
                created_by
            ) VALUES (
                v_student_id,
                'Initial Setup',
                NULL,
                p_program_id,
                NULL,
                v_eff_year,
                'Initial student profile creation',
                CURRENT_DATE,
                v_user_id
            );
        END IF;
    ELSE
        UPDATE public.students
        SET program_id = COALESCE(p_program_id, program_id),
            year_level = COALESCE(p_year_level, year_level),
            updated_at = now(),
            updated_by = v_user_id
        WHERE id = v_student_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student profile updated successfully.',
        'student_number', v_student_number
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;-- Migration: 20261001030000_student_profile_verification_and_registrar_logs.sql
-- Description: Student profile verification workflow, registrar approval & editing, registrar audit logs, and student alerts

-- 1. Create table for student profile change requests
CREATE TABLE IF NOT EXISTS public.student_profile_change_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Approved with Edits', 'Rejected', 'Cancelled')),
    current_values jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
    approved_changes jsonb,
    reviewed_by uuid REFERENCES public.users(id),
    reviewed_at timestamptz,
    rejection_reason text,
    registrar_notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_status ON public.student_profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_user ON public.student_profile_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_student ON public.student_profile_change_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_created_at ON public.student_profile_change_requests(created_at DESC);

-- 2. Create table for registrar logs
CREATE TABLE IF NOT EXISTS public.registrar_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    student_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    student_name text,
    student_number text,
    performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    performed_by_name text,
    details text,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registrar_logs_created_at ON public.registrar_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrar_logs_action ON public.registrar_logs(action);
CREATE INDEX IF NOT EXISTS idx_registrar_logs_student ON public.registrar_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_registrar_logs_user ON public.registrar_logs(student_user_id);

-- Enable RLS and setup policies
ALTER TABLE public.student_profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrar_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "student_profile_requests_all" ON public.student_profile_change_requests;
    CREATE POLICY "student_profile_requests_all" ON public.student_profile_change_requests
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "registrar_logs_all" ON public.registrar_logs;
    CREATE POLICY "registrar_logs_all" ON public.registrar_logs
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.student_profile_change_requests TO authenticated, service_role;
GRANT ALL ON public.registrar_logs TO authenticated, service_role;

-- 3. Update fn_update_my_profile: students route to approval queue; others update immediately
CREATE OR REPLACE FUNCTION public.fn_update_my_profile(
    p_first_name text,
    p_middle_name text,
    p_last_name text,
    p_suffix text,
    p_preferred_name text,
    p_mobile_number text,
    p_address_line1 text,
    p_address_line2 text,
    p_city text,
    p_province text,
    p_postal_code text,
    p_date_of_birth date,
    p_gender text,
    p_civil_status text,
    p_nationality text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_student_id UUID;
    v_student_number TEXT;
    v_is_student BOOLEAN := false;
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_user_full_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    -- Fetch current user record
    SELECT * INTO v_curr_record
    FROM public.users
    WHERE id = v_user_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    v_user_full_name := btrim(COALESCE(v_curr_record.first_name, '') || ' ' || COALESCE(v_curr_record.last_name, ''));

    -- Check if user is a student
    SELECT s.id, s.student_number INTO v_student_id, v_student_number
    FROM public.students s
    WHERE s.user_id = v_user_id AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
        v_is_student := true;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = v_user_id
              AND r.code = 'Student'
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) THEN
            v_is_student := true;
        END IF;
    END IF;

    -- Assemble current values JSON
    v_curr_values := jsonb_build_object(
        'first_name', COALESCE(v_curr_record.first_name, ''),
        'middle_name', COALESCE(v_curr_record.middle_name, ''),
        'last_name', COALESCE(v_curr_record.last_name, ''),
        'suffix', COALESCE(v_curr_record.suffix, ''),
        'preferred_name', COALESCE(v_curr_record.preferred_name, ''),
        'mobile_number', COALESCE(v_curr_record.mobile_number, ''),
        'address_line1', COALESCE(v_curr_record.address_line1, ''),
        'address_line2', COALESCE(v_curr_record.address_line2, ''),
        'city', COALESCE(v_curr_record.city, ''),
        'province', COALESCE(v_curr_record.province, ''),
        'postal_code', COALESCE(v_curr_record.postal_code, ''),
        'date_of_birth', CASE WHEN v_curr_record.date_of_birth IS NOT NULL THEN v_curr_record.date_of_birth::text ELSE '' END,
        'gender', COALESCE(v_curr_record.gender::text, ''),
        'civil_status', COALESCE(v_curr_record.civil_status::text, ''),
        'nationality', COALESCE(v_curr_record.nationality, '')
    );

    -- Assemble requested changes JSON
    v_requested_changes := jsonb_build_object(
        'first_name', btrim(p_first_name),
        'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), ''),
        'last_name', btrim(p_last_name),
        'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), ''),
        'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), ''),
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), ''),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), ''),
        'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), ''),
        'city', COALESCE(NULLIF(btrim(p_city), ''), ''),
        'province', COALESCE(NULLIF(btrim(p_province), ''), ''),
        'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), ''),
        'date_of_birth', CASE WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text ELSE '' END,
        'gender', COALESCE(NULLIF(btrim(p_gender), ''), ''),
        'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), ''),
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), '')
    );

    -- If student: create or update pending change request
    IF v_is_student THEN
        -- Check if there's already a pending request
        SELECT id INTO v_existing_request_id
        FROM public.student_profile_change_requests
        WHERE user_id = v_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.student_profile_change_requests
            SET requested_changes = v_requested_changes,
                current_values = v_curr_values,
                student_id = COALESCE(student_id, v_student_id),
                updated_at = now()
            WHERE id = v_existing_request_id;
        ELSE
            INSERT INTO public.student_profile_change_requests (
                student_id,
                user_id,
                status,
                current_values,
                requested_changes
            ) VALUES (
                v_student_id,
                v_user_id,
                'Pending',
                v_curr_values,
                v_requested_changes
            ) RETURNING id INTO v_existing_request_id;
        END IF;

        -- Record into registrar_logs
        INSERT INTO public.registrar_logs (
            action,
            student_id,
            student_user_id,
            student_name,
            student_number,
            performed_by,
            performed_by_name,
            details,
            old_values,
            new_values,
            metadata
        ) VALUES (
            'PROFILE_CHANGE_REQUESTED',
            v_student_id,
            v_user_id,
            v_user_full_name,
            COALESCE(v_student_number, 'Pending Setup'),
            v_user_id,
            v_user_full_name,
            'Student submitted profile change request for Registrar verification.',
            v_curr_values,
            v_requested_changes,
            jsonb_build_object('request_id', v_existing_request_id)
        );

        RETURN jsonb_build_object(
            'success', true,
            'pending_approval', true,
            'message', 'Your profile change request has been submitted for Registrar verification and approval.'
        );
    END IF;

    -- For non-students (Admin, Dean, Faculty, Registrar): apply updates immediately
    UPDATE public.users
    SET first_name = btrim(p_first_name),
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, '')), ''),
        last_name = btrim(p_last_name),
        suffix = NULLIF(btrim(COALESCE(p_suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = NULLIF(btrim(COALESCE(p_gender, '')), '')::public.gender_type,
        civil_status = NULLIF(btrim(COALESCE(p_civil_status, '')), '')::public.civil_status_type,
        nationality = NULLIF(btrim(COALESCE(p_nationality, '')), ''),
        updated_at = now()
    WHERE id = v_user_id
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'pending_approval', false, 'message', 'Your profile has been updated.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile TO authenticated, service_role;

-- 4. Update fn_get_my_profile to return pending_profile_request
CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'middle_name', COALESCE(u.middle_name, ''),
        'last_name', u.last_name,
        'suffix', COALESCE(u.suffix, ''),
        'preferred_name', COALESCE(u.preferred_name, ''),
        'email', u.email,
        'mobile_number', COALESCE(u.mobile_number, ''),
        'address_line1', COALESCE(u.address_line1, ''),
        'address_line2', COALESCE(u.address_line2, ''),
        'city', COALESCE(u.city, ''),
        'province', COALESCE(u.province, ''),
        'postal_code', COALESCE(u.postal_code, ''),
        'date_of_birth', u.date_of_birth,
        'gender', COALESCE(u.gender::TEXT, ''),
        'civil_status', COALESCE(u.civil_status::TEXT, ''),
        'nationality', COALESCE(u.nationality, ''),
        'avatar_url', u.avatar_url,
        'status', u.status,
        'role_labels', COALESCE((
            SELECT jsonb_agg(r.label ORDER BY r.label)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB),
        'student', (
            SELECT jsonb_build_object(
                'id', s.id,
                'student_number', s.student_number,
                'year_level', s.year_level,
                'status', s.status,
                'program_id', s.program_id,
                'program_code', p.code,
                'program_name', p.name
            )
            FROM public.students s
            LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
            WHERE s.user_id = u.id AND s.deleted_at IS NULL
            LIMIT 1
        ),
        'pending_profile_request', (
            SELECT jsonb_build_object(
                'id', req.id,
                'status', req.status,
                'requested_changes', req.requested_changes,
                'current_values', req.current_values,
                'created_at', req.created_at,
                'rejection_reason', req.rejection_reason,
                'registrar_notes', req.registrar_notes
            )
            FROM public.student_profile_change_requests req
            WHERE req.user_id = u.id AND req.status = 'Pending'
            ORDER BY req.created_at DESC
            LIMIT 1
        )
    )
    INTO v_result
    FROM public.users u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_my_profile TO authenticated, service_role;

-- 5. RPC: List student profile change requests for registrar
CREATE OR REPLACE FUNCTION public.fn_list_student_profile_requests(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_status text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_status IS NOT NULL AND p_status <> 'All' AND p_status <> '' THEN
        v_where_clause := v_where_clause || format(' AND req.status = %L', p_status);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                u.first_name ILIKE %L
                OR u.last_name ILIKE %L
                OR u.email ILIKE %L
                OR COALESCE(s.student_number, '''') ILIKE %L
                OR COALESCE(p.code, '''') ILIKE %L
                OR COALESCE(p.name, '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            req.id,
            req.student_id,
            req.user_id,
            req.status,
            req.current_values,
            req.requested_changes,
            req.approved_changes,
            req.reviewed_by,
            req.reviewed_at,
            req.rejection_reason,
            req.registrar_notes,
            req.created_at,
            req.updated_at,
            btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')) AS student_name,
            u.email AS student_email,
            COALESCE(s.student_number, ''N/A'') AS student_number,
            COALESCE(s.year_level, 1) AS year_level,
            COALESCE(p.code, ''N/A'') AS program_code,
            COALESCE(p.name, ''Unassigned'') AS program_name,
            COALESCE(btrim(ru.first_name || '' '' || ru.last_name), ''—'') AS reviewer_name,
            COUNT(*) OVER () AS total_count
        FROM public.student_profile_change_requests req
        INNER JOIN public.users u ON u.id = req.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.students s ON s.id = req.student_id AND s.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
        LEFT JOIN public.users ru ON ru.id = req.reviewed_by AND ru.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'req.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_student_profile_requests TO authenticated, service_role;

-- 6. RPC: Get single request details by ID
CREATE OR REPLACE FUNCTION public.fn_get_student_profile_request_by_id(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT jsonb_build_object(
        'id', req.id,
        'student_id', req.student_id,
        'user_id', req.user_id,
        'status', req.status,
        'current_values', req.current_values,
        'requested_changes', req.requested_changes,
        'approved_changes', req.approved_changes,
        'reviewed_by', req.reviewed_by,
        'reviewed_at', req.reviewed_at,
        'rejection_reason', req.rejection_reason,
        'registrar_notes', req.registrar_notes,
        'created_at', req.created_at,
        'updated_at', req.updated_at,
        'student_name', btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
        'student_email', u.email,
        'student_number', COALESCE(s.student_number, 'N/A'),
        'year_level', COALESCE(s.year_level, 1),
        'program_id', s.program_id,
        'program_code', COALESCE(p.code, 'N/A'),
        'program_name', COALESCE(p.name, 'Unassigned'),
        'reviewer_name', COALESCE(btrim(ru.first_name || ' ' || ru.last_name), '—')
    )
    INTO v_result
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.students s ON s.id = req.student_id AND s.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    LEFT JOIN public.users ru ON ru.id = req.reviewed_by AND ru.deleted_at IS NULL
    WHERE req.id = p_request_id;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_student_profile_request_by_id TO authenticated, service_role;

-- 7. RPC: Approve student profile change request (with optional registrar edits)
CREATE OR REPLACE FUNCTION public.fn_approve_student_profile_request(
    p_request_id uuid,
    p_edited_changes jsonb DEFAULT NULL::jsonb,
    p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_action TEXT;
    v_status TEXT;
    v_notif_msg TEXT;
    v_date_of_birth DATE;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           s.student_number
    INTO v_req
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.students s ON s.id = req.student_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    -- Determine effective changes: either registrar edited or original requested
    IF p_edited_changes IS NOT NULL AND p_edited_changes <> '{}'::jsonb AND p_edited_changes <> v_req.requested_changes THEN
        v_effective_changes := p_edited_changes;
        v_is_edited := true;
        v_action := 'PROFILE_CHANGE_EDITED_APPROVED';
        v_status := 'Approved with Edits';
        v_notif_msg := 'Your profile changes have been reviewed, adjusted by the Registrar, and approved.';
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_action := 'PROFILE_CHANGE_APPROVED';
        v_status := 'Approved';
        v_notif_msg := 'Your student profile update has been verified and approved by the Registrar.';
    END IF;

    -- Parse date of birth if present
    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND (v_effective_changes->>'date_of_birth') <> '' THEN
        v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Apply approved changes to public.users
    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(v_effective_changes->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(v_effective_changes->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(v_effective_changes->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(v_effective_changes->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(v_effective_changes->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(v_effective_changes->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(v_effective_changes->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(v_effective_changes->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(v_effective_changes->>'postal_code', '')), ''),
        date_of_birth = v_date_of_birth,
        gender = CASE WHEN (v_effective_changes->>'gender') IS NOT NULL AND (v_effective_changes->>'gender') <> '' 
                      THEN (v_effective_changes->>'gender')::public.gender_type 
                      ELSE gender END,
        civil_status = CASE WHEN (v_effective_changes->>'civil_status') IS NOT NULL AND (v_effective_changes->>'civil_status') <> '' 
                            THEN (v_effective_changes->>'civil_status')::public.civil_status_type 
                            ELSE civil_status END,
        nationality = NULLIF(btrim(COALESCE(v_effective_changes->>'nationality', '')), ''),
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Update request record
    UPDATE public.student_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        registrar_notes = p_notes,
        reviewed_by = v_registrar_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Insert into registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        old_values,
        new_values,
        metadata
    ) VALUES (
        v_action,
        v_req.student_id,
        v_req.user_id,
        v_req.student_name,
        v_req.student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        CASE WHEN v_is_edited 
             THEN 'Registrar corrected and approved student profile change request.' || COALESCE(' Note: ' || p_notes, '')
             ELSE 'Registrar verified and approved student profile change request.' || COALESCE(' Note: ' || p_notes, '')
        END,
        v_req.current_values,
        v_effective_changes,
        jsonb_build_object(
            'request_id', p_request_id,
            'is_edited', v_is_edited,
            'registrar_notes', p_notes
        )
    );

    -- Emit notification to the student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_req.user_id,
        'Profile Verification Approved',
        v_notif_msg || COALESCE(' Note from Registrar: ' || p_notes, ''),
        'Account',
        '/student/profile'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student profile change request approved successfully.',
        'status', v_status
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_approve_student_profile_request TO authenticated, service_role;

-- 8. RPC: Reject student profile change request
CREATE OR REPLACE FUNCTION public.fn_reject_student_profile_request(
    p_request_id uuid,
    p_reason text,
    p_is_false_info boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_action TEXT;
    v_notif_title TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF btrim(COALESCE(p_reason, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A rejection reason is required.');
    END IF;

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           s.student_number
    INTO v_req
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.students s ON s.id = req.student_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    v_action := CASE WHEN p_is_false_info THEN 'PROFILE_REJECTED_FALSE_INFO' ELSE 'PROFILE_CHANGE_REJECTED' END;
    v_notif_title := CASE WHEN p_is_false_info THEN 'Profile Verification: False Information Detected' ELSE 'Profile Change Request Rejected' END;

    UPDATE public.student_profile_change_requests
    SET status = 'Rejected',
        rejection_reason = p_reason,
        reviewed_by = v_registrar_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Record in registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        old_values,
        new_values,
        metadata
    ) VALUES (
        v_action,
        v_req.student_id,
        v_req.user_id,
        v_req.student_name,
        v_req.student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar rejected student profile change request. Reason: ' || p_reason,
        v_req.current_values,
        v_req.requested_changes,
        jsonb_build_object(
            'request_id', p_request_id,
            'is_false_info', p_is_false_info,
            'reason', p_reason
        )
    );

    -- Emit notification to student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_req.user_id,
        v_notif_title,
        'Your profile change request was rejected by the Registrar. Reason: ' || p_reason,
        'Account',
        '/student/profile'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile change request rejected and student notified.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_reject_student_profile_request TO authenticated, service_role;

-- 9. RPC: Send direct student notification (e.g. warning on false information)
CREATE OR REPLACE FUNCTION public.fn_send_student_profile_notification(
    p_student_id uuid,
    p_title text,
    p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_student_number TEXT;
    v_student_name TEXT;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF btrim(COALESCE(p_title, '')) = '' OR btrim(COALESCE(p_message, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Title and message are required.');
    END IF;

    SELECT s.user_id, s.student_number, btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    -- Send notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_user_id,
        btrim(p_title),
        btrim(p_message),
        'Account',
        '/student/profile'
    );

    -- Log in registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        metadata
    ) VALUES (
        'FALSE_INFO_NOTIFICATION_SENT',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar sent alert to student: ' || p_title || ' - ' || p_message,
        jsonb_build_object('title', p_title, 'message', p_message)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Notification sent to student and recorded in Registrar Log.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_send_student_profile_notification TO authenticated, service_role;

-- 10. RPC: List registrar logs with filters and pagination
CREATE OR REPLACE FUNCTION public.fn_list_registrar_logs(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_action text DEFAULT NULL::text,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND rl.action = %L', p_action);
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at >= %L::date', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at < (%L::date + 1)', p_date_to);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                COALESCE(rl.student_name, '''') ILIKE %L
                OR COALESCE(rl.student_number, '''') ILIKE %L
                OR COALESCE(rl.performed_by_name, '''') ILIKE %L
                OR COALESCE(rl.details, '''') ILIKE %L
                OR COALESCE(rl.action, '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            rl.id,
            rl.action,
            rl.student_id,
            rl.student_user_id,
            COALESCE(rl.student_name, ''—'') AS student_name,
            COALESCE(rl.student_number, ''—'') AS student_number,
            rl.performed_by,
            COALESCE(rl.performed_by_name, ''System'') AS performed_by_name,
            rl.details,
            rl.old_values,
            rl.new_values,
            rl.metadata,
            rl.created_at,
            COUNT(*) OVER () AS total_count
        FROM public.registrar_logs rl
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'rl.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_registrar_logs TO authenticated, service_role;

-- 11. RPC: Registrar directly edit student profile (with audit logging and notification)
CREATE OR REPLACE FUNCTION public.fn_registrar_update_student_profile(
    p_student_id uuid,
    p_profile_values jsonb,
    p_reason text DEFAULT NULL::text,
    p_notify_student boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_student_number TEXT;
    v_student_name TEXT;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_date_of_birth DATE;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.user_id, s.student_number, btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id;

    v_curr_values := jsonb_build_object(
        'first_name', COALESCE(v_curr_record.first_name, ''),
        'middle_name', COALESCE(v_curr_record.middle_name, ''),
        'last_name', COALESCE(v_curr_record.last_name, ''),
        'suffix', COALESCE(v_curr_record.suffix, ''),
        'preferred_name', COALESCE(v_curr_record.preferred_name, ''),
        'mobile_number', COALESCE(v_curr_record.mobile_number, ''),
        'address_line1', COALESCE(v_curr_record.address_line1, ''),
        'address_line2', COALESCE(v_curr_record.address_line2, ''),
        'city', COALESCE(v_curr_record.city, ''),
        'province', COALESCE(v_curr_record.province, ''),
        'postal_code', COALESCE(v_curr_record.postal_code, ''),
        'date_of_birth', CASE WHEN v_curr_record.date_of_birth IS NOT NULL THEN v_curr_record.date_of_birth::text ELSE '' END,
        'gender', COALESCE(v_curr_record.gender::text, ''),
        'civil_status', COALESCE(v_curr_record.civil_status::text, ''),
        'nationality', COALESCE(v_curr_record.nationality, '')
    );

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    IF (p_profile_values->>'date_of_birth') IS NOT NULL AND (p_profile_values->>'date_of_birth') <> '' THEN
        v_date_of_birth := (p_profile_values->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(p_profile_values->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(p_profile_values->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(p_profile_values->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(p_profile_values->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_profile_values->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_profile_values->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_profile_values->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_profile_values->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(p_profile_values->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(p_profile_values->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_profile_values->>'postal_code', '')), ''),
        date_of_birth = v_date_of_birth,
        gender = CASE WHEN (p_profile_values->>'gender') IS NOT NULL AND (p_profile_values->>'gender') <> '' 
                      THEN (p_profile_values->>'gender')::public.gender_type 
                      ELSE gender END,
        civil_status = CASE WHEN (p_profile_values->>'civil_status') IS NOT NULL AND (p_profile_values->>'civil_status') <> '' 
                            THEN (p_profile_values->>'civil_status')::public.civil_status_type 
                            ELSE civil_status END,
        nationality = NULLIF(btrim(COALESCE(p_profile_values->>'nationality', '')), ''),
        updated_at = now()
    WHERE id = v_user_id;

    -- Log to registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        old_values,
        new_values,
        metadata
    ) VALUES (
        'PROFILE_MANUALLY_EDITED',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar edited student profile.' || COALESCE(' Reason: ' || p_reason, ''),
        v_curr_values,
        p_profile_values,
        jsonb_build_object('reason', p_reason)
    );

    IF p_notify_student THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url
        ) VALUES (
            v_user_id,
            'Profile Updated by Registrar',
            'Your student profile has been updated by the Registrar office.' || COALESCE(' Reason: ' || p_reason, ''),
            'Account',
            '/student/profile'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile updated successfully by Registrar.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_update_student_profile TO authenticated, service_role;

-- 12. RPC: Cancel my pending profile request
CREATE OR REPLACE FUNCTION public.fn_cancel_my_profile_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_req RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    SELECT * INTO v_req
    FROM public.student_profile_change_requests
    WHERE id = p_request_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only pending requests can be cancelled.');
    END IF;

    UPDATE public.student_profile_change_requests
    SET status = 'Cancelled',
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_my_profile_request TO authenticated, service_role;
