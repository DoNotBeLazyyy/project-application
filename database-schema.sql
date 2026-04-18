


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."announcement_audience_type" AS ENUM (
    'Global',
    'Faculty',
    'Student',
    'Section'
);


ALTER TYPE "public"."announcement_audience_type" OWNER TO "postgres";


CREATE TYPE "public"."assessment_type" AS ENUM (
    'Quiz',
    'Exam',
    'Activity',
    'Assignment',
    'Project',
    'Lab Report'
);


ALTER TYPE "public"."assessment_type" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status_type" AS ENUM (
    'Present',
    'Absent',
    'Late',
    'Excused'
);


ALTER TYPE "public"."attendance_status_type" OWNER TO "postgres";


CREATE TYPE "public"."audit_action_type" AS ENUM (
    'Insert',
    'Update',
    'Delete'
);


ALTER TYPE "public"."audit_action_type" OWNER TO "postgres";


CREATE TYPE "public"."civil_status_type" AS ENUM (
    'Single',
    'Married',
    'Widowed',
    'Separated'
);


ALTER TYPE "public"."civil_status_type" OWNER TO "postgres";


CREATE TYPE "public"."clearance_status_type" AS ENUM (
    'Pending',
    'Cleared',
    'Flagged'
);


ALTER TYPE "public"."clearance_status_type" OWNER TO "postgres";


CREATE TYPE "public"."course_type" AS ENUM (
    'Lecture',
    'Laboratory',
    'Lecture/Laboratory',
    'Thesis',
    'OJT',
    'PE',
    'NSTP'
);


ALTER TYPE "public"."course_type" OWNER TO "postgres";


CREATE TYPE "public"."curriculum_term_type" AS ENUM (
    '1st Semester',
    '2nd Semester',
    'Summer'
);


ALTER TYPE "public"."curriculum_term_type" OWNER TO "postgres";


CREATE TYPE "public"."day_of_week_type" AS ENUM (
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
);


ALTER TYPE "public"."day_of_week_type" OWNER TO "postgres";


CREATE TYPE "public"."enrollment_status_type" AS ENUM (
    'Enrolled',
    'Dropped',
    'Withdrawn',
    'Completed',
    'Failed',
    'Incomplete'
);


ALTER TYPE "public"."enrollment_status_type" OWNER TO "postgres";


CREATE TYPE "public"."evaluation_question_type" AS ENUM (
    'Rating',
    'Multiple Choice',
    'Open Ended'
);


ALTER TYPE "public"."evaluation_question_type" OWNER TO "postgres";


CREATE TYPE "public"."faculty_status_type" AS ENUM (
    'Active',
    'Inactive',
    'On Leave',
    'Retired'
);


ALTER TYPE "public"."faculty_status_type" OWNER TO "postgres";


CREATE TYPE "public"."gender_type" AS ENUM (
    'Male',
    'Female',
    'Prefer not to say'
);


ALTER TYPE "public"."gender_type" OWNER TO "postgres";


CREATE TYPE "public"."grade_status_type" AS ENUM (
    'Draft',
    'Submitted',
    'Approved',
    'Released'
);


ALTER TYPE "public"."grade_status_type" OWNER TO "postgres";


CREATE TYPE "public"."material_type" AS ENUM (
    'File',
    'Link',
    'Video',
    'Document',
    'Slide',
    'Other'
);


ALTER TYPE "public"."material_type" OWNER TO "postgres";


CREATE TYPE "public"."prerequisite_type" AS ENUM (
    'Required',
    'Co-requisite'
);


ALTER TYPE "public"."prerequisite_type" OWNER TO "postgres";


CREATE TYPE "public"."program_level_type" AS ENUM (
    'Undergraduate',
    'Graduate',
    'Doctorate',
    'TVET'
);


ALTER TYPE "public"."program_level_type" OWNER TO "postgres";


CREATE TYPE "public"."question_type" AS ENUM (
    'Multiple Choice',
    'True or False',
    'Short Answer',
    'Essay',
    'Fill in the Blank',
    'Matching',
    'File Upload'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."role_code_type" AS ENUM (
    'Admin',
    'Faculty',
    'Student',
    'Registrar',
    'Dean'
);


ALTER TYPE "public"."role_code_type" OWNER TO "postgres";


CREATE TYPE "public"."section_status_type" AS ENUM (
    'Open',
    'Full',
    'Ongoing',
    'Closed',
    'Cancelled'
);


ALTER TYPE "public"."section_status_type" OWNER TO "postgres";


CREATE TYPE "public"."student_status_type" AS ENUM (
    'Active',
    'Inactive',
    'LOA',
    'Graduated',
    'Expelled'
);


ALTER TYPE "public"."student_status_type" OWNER TO "postgres";


CREATE TYPE "public"."submission_status_type" AS ENUM (
    'Not Started',
    'In Progress',
    'Submitted',
    'Late',
    'Graded',
    'Returned'
);


ALTER TYPE "public"."submission_status_type" OWNER TO "postgres";


CREATE TYPE "public"."submission_timer_status" AS ENUM (
    'Pending',
    'Active',
    'Expired',
    'Submitted'
);


ALTER TYPE "public"."submission_timer_status" OWNER TO "postgres";


CREATE TYPE "public"."term_status_type" AS ENUM (
    'Upcoming',
    'Enrollment Open',
    'Ongoing',
    'Grading Period',
    'Closed'
);


ALTER TYPE "public"."term_status_type" OWNER TO "postgres";


CREATE TYPE "public"."term_type" AS ENUM (
    '1st Semester',
    '2nd Semester',
    'Summer'
);


ALTER TYPE "public"."term_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_approve_and_release_grades"("p_section_id" "uuid", "p_grading_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_approve_and_release_grades"("p_section_id" "uuid", "p_grading_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_audit_assessment_submissions_score"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_audit_assessment_submissions_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_audit_section_final_grades"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_audit_section_final_grades"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_auto_complete_evaluation_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_auto_complete_evaluation_lock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_broadcast_section_notification"("p_section_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_broadcast_section_notification"("p_section_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_calculate_all_grades_for_period"("p_section_id" "uuid", "p_grading_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment      RECORD;
  v_result          JSONB;
  v_success_count   INTEGER := 0;
  v_failure_count   INTEGER := 0;
  v_failures        JSONB   := '[]'::jsonb;
BEGIN
  FOR v_enrollment IN
    SELECT e.id
    FROM public.enrollments e
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
  LOOP
    v_result := fn_calculate_final_grade(v_enrollment.id, p_grading_period_id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failure_count := v_failure_count + 1;
      v_failures := v_failures || jsonb_build_object(
        'enrollment_id', v_enrollment.id,
        'reason',        v_result->>'message'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',       true,
    'section_id',    p_section_id,
    'period_id',     p_grading_period_id,
    'processed',     v_success_count + v_failure_count,
    'succeeded',     v_success_count,
    'failed',        v_failure_count,
    'failures',      v_failures
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."fn_calculate_all_grades_for_period"("p_section_id" "uuid", "p_grading_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_calculate_final_grade"("p_enrollment_id" "uuid", "p_grading_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  WHERE gtt.program_id    = v_program_id
    AND v_raw_grade       >= gtt.min_percentage
    AND v_raw_grade       <= gtt.max_percentage
    AND gtt.deleted_at    IS NULL
  ORDER BY gtt.min_percentage DESC
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
$$;


ALTER FUNCTION "public"."fn_calculate_final_grade"("p_enrollment_id" "uuid", "p_grading_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_check_evaluation_completion"("p_enrollment_id" "uuid", "p_grading_period_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_lock_exists     BOOLEAN;
  v_is_completed    BOOLEAN;
  v_template_id     UUID;
  v_required_count  INTEGER;
  v_answered_count  INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.evaluation_period_locks
    WHERE enrollment_id     = p_enrollment_id
      AND grading_period_id = p_grading_period_id
      AND deleted_at        IS NULL
  ) INTO v_lock_exists;

  IF NOT v_lock_exists THEN
    RETURN false;
  END IF;

  SELECT is_completed, template_id
  INTO v_is_completed, v_template_id
  FROM public.evaluation_period_locks
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL;

  IF v_is_completed THEN
    RETURN true;
  END IF;

  SELECT COUNT(*)
  INTO v_required_count
  FROM public.evaluation_questions
  WHERE template_id  = v_template_id
    AND is_required  = true
    AND deleted_at   IS NULL;

  SELECT COUNT(*)
  INTO v_answered_count
  FROM public.evaluation_responses
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL
    AND question_id IN (
      SELECT id FROM public.evaluation_questions
      WHERE template_id = v_template_id
        AND is_required = true
        AND deleted_at  IS NULL
    );

  RETURN v_answered_count >= v_required_count;
END;
$$;


ALTER FUNCTION "public"."fn_check_evaluation_completion"("p_enrollment_id" "uuid", "p_grading_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_compute_student_gwa"("p_student_id" "uuid", "p_term_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_compute_student_gwa"("p_student_id" "uuid", "p_term_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_expire_overdue_submissions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_expire_overdue_submissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_academic_standing"("p_student_id" "uuid", "p_term_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_gwa_result  JSONB;
  v_gwa         NUMERIC;
  v_standing    TEXT;
  v_total_units NUMERIC;
  v_failed      INTEGER;
BEGIN
  v_gwa_result  := fn_compute_student_gwa(p_student_id, p_term_id);

  IF NOT (v_gwa_result->>'success')::BOOLEAN THEN
    RETURN v_gwa_result;
  END IF;

  v_gwa         := (v_gwa_result->>'gwa')::NUMERIC;
  v_total_units := (v_gwa_result->>'total_units')::NUMERIC;

  SELECT COUNT(*)
  INTO v_failed
  FROM public.section_final_grades sfg
  INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id
  INNER JOIN public.sections sec  ON sec.id = e.section_id
  WHERE e.student_id   = p_student_id
    AND sec.term_id    = p_term_id
    AND sfg.status     = 'Released'
    AND COALESCE(sfg.transmuted_grade, sfg.final_grade) > 3.0
    AND e.deleted_at   IS NULL
    AND sfg.deleted_at IS NULL;

  v_standing := CASE
    WHEN v_failed > 0        THEN 'Probation'
    WHEN v_gwa <= 1.25       THEN 'Summa Cum Laude Track'
    WHEN v_gwa <= 1.50       THEN 'Magna Cum Laude Track'
    WHEN v_gwa <= 1.75       THEN "Dean's List"
    WHEN v_gwa <= 3.00       THEN 'Good Standing'
    ELSE                          'Probation'
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'student_id',    p_student_id,
    'term_id',       p_term_id,
    'gwa',           v_gwa,
    'total_units',   v_total_units,
    'failed_count',  v_failed,
    'standing',      v_standing
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."fn_get_academic_standing"("p_student_id" "uuid", "p_term_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_attendance_summary"("p_enrollment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total    INTEGER;
  v_present  INTEGER;
  v_absent   INTEGER;
  v_late     INTEGER;
  v_excused  INTEGER;
BEGIN
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
$$;


ALTER FUNCTION "public"."fn_get_attendance_summary"("p_enrollment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_deans_list"("p_term_id" "uuid", "p_min_gwa" numeric DEFAULT 1.75) RETURNS TABLE("student_id" "uuid", "student_number" "text", "full_name" "text", "program_code" "text", "program_name" "text", "gwa" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
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
$$;


ALTER FUNCTION "public"."fn_get_deans_list"("p_term_id" "uuid", "p_min_gwa" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_grade_report"("p_enrollment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
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
$$;


ALTER FUNCTION "public"."fn_get_grade_report"("p_enrollment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_student_clearance_summary"("p_student_id" "uuid", "p_term_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total    INTEGER;
  v_cleared  INTEGER;
  v_pending  INTEGER;
  v_flagged  INTEGER;
  v_details  JSONB;
BEGIN
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
$$;


ALTER FUNCTION "public"."fn_get_student_clearance_summary"("p_student_id" "uuid", "p_term_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_get_student_evaluation_status"("p_student_id" "uuid", "p_term_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_get_student_evaluation_status"("p_student_id" "uuid", "p_term_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_mark_notifications_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = p_user_id
      AND is_read     = false
      AND deleted_at  IS NULL;
  ELSE
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = p_user_id
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
$$;


ALTER FUNCTION "public"."fn_mark_notifications_read"("p_user_id" "uuid", "p_notification_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_notify_user"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, action_url)
  VALUES (p_user_id, p_title, p_message, p_action_url);
END;
$$;


ALTER FUNCTION "public"."fn_notify_user"("p_user_id" "uuid", "p_title" "text", "p_message" "text", "p_action_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_record_heartbeat"("p_submission_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_session_id  UUID;
  v_expires_at  TIMESTAMPTZ;
  v_status      submission_timer_status;
BEGIN
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
$$;


ALTER FUNCTION "public"."fn_record_heartbeat"("p_submission_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_release_grades_after_evaluation"("p_enrollment_id" "uuid", "p_grading_period_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_release_grades_after_evaluation"("p_enrollment_id" "uuid", "p_grading_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_updated_audit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid(); -- Supabase injects the authenticated user's UUID
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_set_updated_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_start_assessment_timer"("p_enrollment_id" "uuid", "p_assessment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_submission_id       UUID;
  v_time_limit          SMALLINT;
  v_closes_at           TIMESTAMPTZ;
  v_attempt_number      SMALLINT;
  v_max_attempts        SMALLINT;
  v_existing_session_id UUID;
  v_expires_at          TIMESTAMPTZ;
  v_section_id          UUID;
  v_is_enrolled         BOOLEAN;
BEGIN
  SELECT
    ai.time_limit_minutes,
    ai.closes_at,
    ai.max_attempts,
    ai.section_id
  INTO v_time_limit, v_closes_at, v_max_attempts, v_section_id
  FROM public.assessment_items ai
  WHERE ai.id          = p_assessment_id
    AND ai.is_published = true
    AND ai.deleted_at   IS NULL;

  IF v_section_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or not published.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id         = p_enrollment_id
      AND e.section_id = v_section_id
      AND e.status     = 'Enrolled'
      AND e.deleted_at IS NULL
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
    RETURN jsonb_build_object('success', false, 'message', 'Student is not enrolled in this section.');
  END IF;

  IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Assessment window has closed.');
  END IF;

  SELECT COUNT(*) INTO v_attempt_number
  FROM public.assessment_submissions
  WHERE assessment_item_id = p_assessment_id
    AND enrollment_id      = p_enrollment_id
    AND deleted_at         IS NULL;

  IF v_attempt_number >= v_max_attempts THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum attempts reached.');
  END IF;

  v_attempt_number := v_attempt_number + 1;

  IF v_time_limit IS NOT NULL THEN
    v_expires_at := now() + (v_time_limit || ' minutes')::INTERVAL;
    IF v_closes_at IS NOT NULL AND v_expires_at > v_closes_at THEN
      v_expires_at := v_closes_at;
    END IF;
  ELSE
    v_expires_at := v_closes_at;
  END IF;

  INSERT INTO public.assessment_submissions (
    assessment_item_id,
    enrollment_id,
    attempt_number,
    status,
    started_at,
    time_limit_expires_at,
    ip_address
  ) VALUES (
    p_assessment_id,
    p_enrollment_id,
    v_attempt_number,
    'In Progress',
    now(),
    v_expires_at,
    inet_client_addr()
  )
  RETURNING id INTO v_submission_id;

  INSERT INTO public.assessment_timer_sessions (
    submission_id,
    enrollment_id,
    assessment_item_id,
    status,
    server_started_at,
    server_expires_at,
    last_activity_at,
    client_ip
  ) VALUES (
    v_submission_id,
    p_enrollment_id,
    p_assessment_id,
    'Active',
    now(),
    v_expires_at,
    now(),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success',        true,
    'submission_id',  v_submission_id,
    'attempt_number', v_attempt_number,
    'started_at',     now(),
    'expires_at',     v_expires_at,
    'time_limit_minutes', v_time_limit,
    'message',        'Timer started. Submission created.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."fn_start_assessment_timer"("p_enrollment_id" "uuid", "p_assessment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_submit_assessment"("p_submission_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment_id    UUID;
  v_assessment_id    UUID;
  v_status           submission_status_type;
  v_expires_at       TIMESTAMPTZ;
  v_due_at           TIMESTAMPTZ;
  v_is_late          BOOLEAN := false;
BEGIN
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
$$;


ALTER FUNCTION "public"."fn_submit_assessment"("p_submission_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "target_audience" "public"."announcement_audience_type" DEFAULT 'Global'::"public"."announcement_audience_type" NOT NULL,
    "section_id" "uuid",
    "is_pinned" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_item_rubrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_item_id" "uuid" NOT NULL,
    "rubric_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."assessment_item_rubrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "grading_component_id" "uuid",
    "module_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "assessment_type" "public"."assessment_type" DEFAULT 'Quiz'::"public"."assessment_type" NOT NULL,
    "total_points" numeric(8,2) DEFAULT 100 NOT NULL,
    "passing_points" numeric(8,2),
    "time_limit_minutes" smallint,
    "max_attempts" smallint DEFAULT 1 NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "due_at" timestamp with time zone,
    "closes_at" timestamp with time zone,
    "show_results_at" timestamp with time zone,
    "shuffle_questions" boolean DEFAULT false NOT NULL,
    "shuffle_choices" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    "max_file_count_per_question" smallint,
    CONSTRAINT "assessment_items_max_attempts_check" CHECK (("max_attempts" > 0)),
    CONSTRAINT "assessment_items_max_file_count_per_question_check" CHECK (("max_file_count_per_question" > 0)),
    CONSTRAINT "assessment_items_time_limit_minutes_check" CHECK (("time_limit_minutes" > 0)),
    CONSTRAINT "assessment_items_total_points_check" CHECK (("total_points" > (0)::numeric)),
    CONSTRAINT "chk_assessment_window" CHECK ((("closes_at" IS NULL) OR ("due_at" IS NULL) OR ("closes_at" >= "due_at")))
);


ALTER TABLE "public"."assessment_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_question_choices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "choice_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "sequence" smallint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."assessment_question_choices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_item_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "public"."question_type" DEFAULT 'Multiple Choice'::"public"."question_type" NOT NULL,
    "points" numeric(6,2) DEFAULT 1 NOT NULL,
    "sequence" smallint DEFAULT 1 NOT NULL,
    "explanation" "text",
    "is_required" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    "allowed_file_types" "text"[],
    "max_file_size_mb" integer,
    "max_file_count" smallint,
    CONSTRAINT "assessment_questions_max_file_count_check" CHECK (("max_file_count" > 0)),
    CONSTRAINT "assessment_questions_max_file_size_mb_check" CHECK (("max_file_size_mb" > 0)),
    CONSTRAINT "assessment_questions_points_check" CHECK (("points" > (0)::numeric))
);


ALTER TABLE "public"."assessment_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_item_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "attempt_number" smallint DEFAULT 1 NOT NULL,
    "status" "public"."submission_status_type" DEFAULT 'Not Started'::"public"."submission_status_type" NOT NULL,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "time_limit_expires_at" timestamp with time zone,
    "raw_score" numeric(8,2),
    "final_score" numeric(8,2),
    "graded_at" timestamp with time zone,
    "graded_by" "uuid",
    "feedback" "text",
    "is_late" boolean DEFAULT false NOT NULL,
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "assessment_submissions_attempt_number_check" CHECK (("attempt_number" > 0)),
    CONSTRAINT "chk_submission_attempt_window" CHECK ((("submitted_at" IS NULL) OR ("started_at" IS NULL) OR ("submitted_at" >= "started_at")))
);


ALTER TABLE "public"."assessment_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_timer_heartbeats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_ip" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."assessment_timer_heartbeats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessment_timer_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "assessment_item_id" "uuid" NOT NULL,
    "status" "public"."submission_timer_status" DEFAULT 'Pending'::"public"."submission_timer_status" NOT NULL,
    "server_started_at" timestamp with time zone,
    "server_expires_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    "forced_submit_at" timestamp with time zone,
    "client_ip" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."assessment_timer_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attendance_session_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "status" "public"."attendance_status_type" DEFAULT 'Present'::"public"."attendance_status_type" NOT NULL,
    "remarks" "text",
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "session_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."attendance_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clearance_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "department_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."clearance_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "material_type" "public"."material_type" DEFAULT 'File'::"public"."material_type" NOT NULL,
    "file_url" "text",
    "external_url" "text",
    "sequence" smallint DEFAULT 1 NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "available_from" timestamp with time zone,
    "available_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    "file_name" "text",
    "mime_type" "text",
    "file_size_bytes" integer,
    CONSTRAINT "chk_material_availability" CHECK ((("available_until" IS NULL) OR ("available_from" IS NULL) OR ("available_until" > "available_from"))),
    CONSTRAINT "course_materials_file_size_bytes_check" CHECK (("file_size_bytes" > 0))
);


ALTER TABLE "public"."course_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_prerequisites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "prerequisite_id" "uuid" NOT NULL,
    "prerequisite_type" "public"."prerequisite_type" DEFAULT 'Required'::"public"."prerequisite_type" NOT NULL,
    "minimum_grade" numeric(5,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "chk_no_self_prerequisite" CHECK (("course_id" <> "prerequisite_id"))
);


ALTER TABLE "public"."course_prerequisites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "course_type" "public"."course_type" DEFAULT 'Lecture'::"public"."course_type" NOT NULL,
    "lecture_units" numeric(4,2) DEFAULT 0 NOT NULL,
    "laboratory_units" numeric(4,2) DEFAULT 0 NOT NULL,
    "total_units" numeric(4,2) GENERATED ALWAYS AS (("lecture_units" + "laboratory_units")) STORED,
    "credit_hours" numeric(4,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_maps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "year_level" smallint NOT NULL,
    "term" "public"."curriculum_term_type" NOT NULL,
    "sequence" smallint DEFAULT 1 NOT NULL,
    "is_elective" boolean DEFAULT false NOT NULL,
    "effective_sy" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "curriculum_maps_year_level_check" CHECK ((("year_level" >= 1) AND ("year_level" <= 6)))
);


ALTER TABLE "public"."curriculum_maps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "head_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "status" "public"."enrollment_status_type" DEFAULT 'Enrolled'::"public"."enrollment_status_type" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dropped_at" timestamp with time zone,
    "drop_reason" "text",
    "final_grade" numeric(5,2),
    "is_grade_visible" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_period_locks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "grading_period_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."evaluation_period_locks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "question_type" "public"."evaluation_question_type" DEFAULT 'Rating'::"public"."evaluation_question_type" NOT NULL,
    "sequence" smallint DEFAULT 1 NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL,
    "min_rating" smallint DEFAULT 1,
    "max_rating" smallint DEFAULT 5,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."evaluation_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "grading_period_id" "uuid" NOT NULL,
    "rating_value" smallint,
    "response_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."evaluation_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."evaluation_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faculty" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "employee_number" "text" NOT NULL,
    "primary_department_id" "uuid",
    "status" "public"."faculty_status_type" DEFAULT 'Active'::"public"."faculty_status_type" NOT NULL,
    "hired_at" "date",
    "specialization" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."faculty" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grade_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "public"."audit_action_type" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "enrollment_id" "uuid",
    "grading_period_id" "uuid",
    "field_changed" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "change_reason" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."grade_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grade_transmutation_tables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid",
    "label" "text" NOT NULL,
    "min_percentage" numeric(5,2) NOT NULL,
    "max_percentage" numeric(5,2) NOT NULL,
    "transmuted_grade" numeric(5,2) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "chk_transmutation_range" CHECK (("max_percentage" >= "min_percentage")),
    CONSTRAINT "grade_transmutation_tables_max_percentage_check" CHECK ((("max_percentage" >= (0)::numeric) AND ("max_percentage" <= (100)::numeric))),
    CONSTRAINT "grade_transmutation_tables_min_percentage_check" CHECK ((("min_percentage" >= (0)::numeric) AND ("min_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."grade_transmutation_tables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grading_components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "grading_period_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "weight" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "grading_components_weight_check" CHECK ((("weight" > (0)::numeric) AND ("weight" <= (100)::numeric)))
);


ALTER TABLE "public"."grading_components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grading_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sequence" smallint DEFAULT 1 NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "chk_grading_period_dates" CHECK ((("end_date" IS NULL) OR ("start_date" IS NULL) OR ("end_date" > "start_date")))
);


ALTER TABLE "public"."grading_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "sequence" smallint DEFAULT 1 NOT NULL,
    "is_published" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "action_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "level" "public"."program_level_type" DEFAULT 'Undergraduate'::"public"."program_level_type" NOT NULL,
    "total_units" numeric(5,2),
    "years_duration" smallint DEFAULT 4 NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "programs_years_duration_check" CHECK ((("years_duration" >= 1) AND ("years_duration" <= 8)))
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "public"."role_code_type" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rubric_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rubric_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "max_points" numeric(6,2) NOT NULL,
    "sequence" smallint DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "rubric_criteria_max_points_check" CHECK (("max_points" > (0)::numeric))
);


ALTER TABLE "public"."rubric_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rubric_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "criteria_id" "uuid" NOT NULL,
    "points_earned" numeric(6,2) NOT NULL,
    "feedback" "text",
    "evaluated_by" "uuid" NOT NULL,
    "evaluated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "rubric_evaluations_points_earned_check" CHECK (("points_earned" >= (0)::numeric))
);


ALTER TABLE "public"."rubric_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rubrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "total_points" numeric(8,2) DEFAULT 100 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "rubrics_total_points_check" CHECK (("total_points" > (0)::numeric))
);


ALTER TABLE "public"."rubrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."school_years" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "chk_school_year_dates" CHECK (("end_date" > "start_date"))
);


ALTER TABLE "public"."school_years" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."section_final_grades" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "grading_period_id" "uuid" NOT NULL,
    "raw_grade" numeric(5,2) NOT NULL,
    "final_grade" numeric(5,2) NOT NULL,
    "transmuted_grade" numeric(5,2),
    "status" "public"."grade_status_type" DEFAULT 'Draft'::"public"."grade_status_type" NOT NULL,
    "remarks" "text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "released_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "section_final_grades_final_grade_check" CHECK ((("final_grade" >= (0)::numeric) AND ("final_grade" <= (100)::numeric))),
    CONSTRAINT "section_final_grades_raw_grade_check" CHECK ((("raw_grade" >= (0)::numeric) AND ("raw_grade" <= (100)::numeric)))
);


ALTER TABLE "public"."section_final_grades" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."section_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "day_of_week" "public"."day_of_week_type" NOT NULL,
    "time_start" time without time zone NOT NULL,
    "time_end" time without time zone NOT NULL,
    "room" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "chk_schedule_times" CHECK (("time_end" > "time_start"))
);


ALTER TABLE "public"."section_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "faculty_id" "uuid",
    "section_code" "text" NOT NULL,
    "room" "text",
    "max_slots" smallint DEFAULT 40 NOT NULL,
    "status" "public"."section_status_type" DEFAULT 'Open'::"public"."section_status_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "sections_max_slots_check" CHECK (("max_slots" > 0))
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "choice_id" "uuid",
    "answer_text" "text",
    "points_earned" numeric(6,2),
    "is_correct" boolean,
    "grader_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    "file_attachments" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."student_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_clearances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "requirement_id" "uuid" NOT NULL,
    "term_id" "uuid" NOT NULL,
    "status" "public"."clearance_status_type" DEFAULT 'Pending'::"public"."clearance_status_type" NOT NULL,
    "remarks" "text",
    "cleared_by" "uuid",
    "cleared_at" timestamp with time zone,
    "flagged_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."student_clearances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "student_number" "text" NOT NULL,
    "year_level" smallint NOT NULL,
    "program_id" "uuid",
    "status" "public"."student_status_type" DEFAULT 'Active'::"public"."student_status_type" NOT NULL,
    "admitted_at" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "students_year_level_check" CHECK ((("year_level" >= 1) AND ("year_level" <= 6)))
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_year_id" "uuid" NOT NULL,
    "term_type" "public"."term_type" NOT NULL,
    "status" "public"."term_status_type" DEFAULT 'Upcoming'::"public"."term_status_type" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "enrollment_start_date" "date",
    "enrollment_end_date" "date",
    "grading_deadline" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid",
    CONSTRAINT "chk_term_dates" CHECK (("end_date" > "start_date"))
);


ALTER TABLE "public"."terms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "first_name" "text" NOT NULL,
    "middle_name" "text",
    "last_name" "text" NOT NULL,
    "suffix" "text",
    "preferred_name" "text",
    "email" "text" NOT NULL,
    "mobile_number" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "province" "text",
    "postal_code" "text",
    "date_of_birth" "date",
    "gender" "public"."gender_type",
    "civil_status" "public"."civil_status_type",
    "nationality" "text" DEFAULT 'Filipino'::"text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "updated_by" "uuid",
    "deleted_by" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_item_rubrics"
    ADD CONSTRAINT "assessment_item_rubrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_items"
    ADD CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_question_choices"
    ADD CONSTRAINT "assessment_question_choices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_timer_heartbeats"
    ADD CONSTRAINT "assessment_timer_heartbeats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assessment_timer_sessions"
    ADD CONSTRAINT "assessment_timer_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clearance_requirements"
    ADD CONSTRAINT "clearance_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_materials"
    ADD CONSTRAINT "course_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_prerequisites"
    ADD CONSTRAINT "course_prerequisites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_maps"
    ADD CONSTRAINT "curriculum_maps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_period_locks"
    ADD CONSTRAINT "evaluation_period_locks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_questions"
    ADD CONSTRAINT "evaluation_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_responses"
    ADD CONSTRAINT "evaluation_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faculty"
    ADD CONSTRAINT "faculty_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grade_audit_logs"
    ADD CONSTRAINT "grade_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grade_transmutation_tables"
    ADD CONSTRAINT "grade_transmutation_tables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grading_components"
    ADD CONSTRAINT "grading_components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grading_periods"
    ADD CONSTRAINT "grading_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rubric_evaluations"
    ADD CONSTRAINT "rubric_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rubrics"
    ADD CONSTRAINT "rubrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_years"
    ADD CONSTRAINT "school_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."section_final_grades"
    ADD CONSTRAINT "section_final_grades_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."section_schedules"
    ADD CONSTRAINT "section_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_clearances"
    ADD CONSTRAINT "student_clearances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_announcements_audience" ON "public"."announcements" USING "btree" ("target_audience") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_announcements_section" ON "public"."announcements" USING "btree" ("section_id") WHERE (("deleted_at" IS NULL) AND ("section_id" IS NOT NULL));



CREATE INDEX "idx_attendance_records_enrollment" ON "public"."attendance_records" USING "btree" ("enrollment_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_grade_audit_logs_changed_at" ON "public"."grade_audit_logs" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_grade_audit_logs_enrollment_id" ON "public"."grade_audit_logs" USING "btree" ("enrollment_id");



CREATE INDEX "idx_grade_audit_logs_record_id" ON "public"."grade_audit_logs" USING "btree" ("record_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC) WHERE (("is_read" = false) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_student_answers_file_attachments" ON "public"."student_answers" USING "gin" ("file_attachments");



CREATE INDEX "idx_timer_heartbeats_session" ON "public"."assessment_timer_heartbeats" USING "btree" ("session_id", "recorded_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_timer_sessions_expires" ON "public"."assessment_timer_sessions" USING "btree" ("server_expires_at") WHERE (("status" = 'Active'::"public"."submission_timer_status") AND ("deleted_at" IS NULL));



CREATE UNIQUE INDEX "uidx_assessment_item_rubrics" ON "public"."assessment_item_rubrics" USING "btree" ("assessment_item_id", "rubric_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_assessment_questions_sequence" ON "public"."assessment_questions" USING "btree" ("assessment_item_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_attendance_records_session_enrollment" ON "public"."attendance_records" USING "btree" ("attendance_session_id", "enrollment_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_attendance_sessions_section_date" ON "public"."attendance_sessions" USING "btree" ("section_id", "session_date") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_clearance_requirements_code" ON "public"."clearance_requirements" USING "btree" ("code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_course_materials_module_sequence" ON "public"."course_materials" USING "btree" ("module_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_course_prerequisites_pair" ON "public"."course_prerequisites" USING "btree" ("course_id", "prerequisite_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_courses_code" ON "public"."courses" USING "btree" ("code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_curriculum_maps_slot" ON "public"."curriculum_maps" USING "btree" ("program_id", "course_id", "year_level", "term") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_departments_code" ON "public"."departments" USING "btree" ("code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_departments_name" ON "public"."departments" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_enrollments_student_section" ON "public"."enrollments" USING "btree" ("student_id", "section_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_evaluation_period_locks_enrollment_period" ON "public"."evaluation_period_locks" USING "btree" ("enrollment_id", "grading_period_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_evaluation_questions_sequence" ON "public"."evaluation_questions" USING "btree" ("template_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_evaluation_responses_question_enrollment_period" ON "public"."evaluation_responses" USING "btree" ("question_id", "enrollment_id", "grading_period_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_evaluation_templates_title" ON "public"."evaluation_templates" USING "btree" ("title") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_faculty_employee_number" ON "public"."faculty" USING "btree" ("employee_number") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_faculty_user_id" ON "public"."faculty" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_grade_transmutation_program_range" ON "public"."grade_transmutation_tables" USING "btree" ("program_id", "min_percentage", "max_percentage") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_grading_components_section_period_name" ON "public"."grading_components" USING "btree" ("section_id", "grading_period_id", "name") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_grading_periods_term_name" ON "public"."grading_periods" USING "btree" ("term_id", "name") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_grading_periods_term_sequence" ON "public"."grading_periods" USING "btree" ("term_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_modules_section_sequence" ON "public"."modules" USING "btree" ("section_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_programs_code_dept" ON "public"."programs" USING "btree" ("code", "department_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_question_choices_sequence" ON "public"."assessment_question_choices" USING "btree" ("question_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_roles_code" ON "public"."roles" USING "btree" ("code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_rubric_criteria_sequence" ON "public"."rubric_criteria" USING "btree" ("rubric_id", "sequence") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_rubric_evaluations_submission_criteria" ON "public"."rubric_evaluations" USING "btree" ("submission_id", "criteria_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_rubrics_section_title" ON "public"."rubrics" USING "btree" ("section_id", "title") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_school_years_code" ON "public"."school_years" USING "btree" ("code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_section_final_grades_enrollment_period" ON "public"."section_final_grades" USING "btree" ("enrollment_id", "grading_period_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_section_schedules_slot" ON "public"."section_schedules" USING "btree" ("section_id", "day_of_week", "time_start") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_sections_code_term" ON "public"."sections" USING "btree" ("section_code", "term_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_student_answers_submission_question" ON "public"."student_answers" USING "btree" ("submission_id", "question_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_student_clearances_student_requirement_term" ON "public"."student_clearances" USING "btree" ("student_id", "requirement_id", "term_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_students_student_number" ON "public"."students" USING "btree" ("student_number") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_students_user_id" ON "public"."students" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_submissions_enrollment_attempt" ON "public"."assessment_submissions" USING "btree" ("assessment_item_id", "enrollment_id", "attempt_number") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_terms_sy_type" ON "public"."terms" USING "btree" ("school_year_id", "term_type") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_timer_sessions_submission" ON "public"."assessment_timer_sessions" USING "btree" ("submission_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_user_roles_user_role" ON "public"."user_roles" USING "btree" ("user_id", "role_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uidx_users_email" ON "public"."users" USING "btree" ("email") WHERE ("deleted_at" IS NULL);



CREATE OR REPLACE TRIGGER "trg_announcements_updated_audit" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_item_rubrics_updated_audit" BEFORE UPDATE ON "public"."assessment_item_rubrics" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_items_updated_audit" BEFORE UPDATE ON "public"."assessment_items" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_question_choices_updated_audit" BEFORE UPDATE ON "public"."assessment_question_choices" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_questions_updated_audit" BEFORE UPDATE ON "public"."assessment_questions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_submissions_audit_log" AFTER UPDATE ON "public"."assessment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_audit_assessment_submissions_score"();



CREATE OR REPLACE TRIGGER "trg_assessment_submissions_updated_audit" BEFORE UPDATE ON "public"."assessment_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_timer_heartbeats_updated_audit" BEFORE UPDATE ON "public"."assessment_timer_heartbeats" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_assessment_timer_sessions_updated_audit" BEFORE UPDATE ON "public"."assessment_timer_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_attendance_records_updated_audit" BEFORE UPDATE ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_attendance_sessions_updated_audit" BEFORE UPDATE ON "public"."attendance_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_auto_complete_evaluation_lock" AFTER INSERT OR UPDATE ON "public"."evaluation_responses" FOR EACH ROW EXECUTE FUNCTION "public"."fn_auto_complete_evaluation_lock"();



CREATE OR REPLACE TRIGGER "trg_clearance_requirements_updated_audit" BEFORE UPDATE ON "public"."clearance_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_course_materials_updated_audit" BEFORE UPDATE ON "public"."course_materials" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_course_prerequisites_updated_audit" BEFORE UPDATE ON "public"."course_prerequisites" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_courses_updated_audit" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_curriculum_maps_updated_audit" BEFORE UPDATE ON "public"."curriculum_maps" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_departments_updated_audit" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_enrollments_updated_audit" BEFORE UPDATE ON "public"."enrollments" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_evaluation_period_locks_updated_audit" BEFORE UPDATE ON "public"."evaluation_period_locks" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_evaluation_questions_updated_audit" BEFORE UPDATE ON "public"."evaluation_questions" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_evaluation_responses_updated_audit" BEFORE UPDATE ON "public"."evaluation_responses" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_evaluation_templates_updated_audit" BEFORE UPDATE ON "public"."evaluation_templates" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_faculty_updated_audit" BEFORE UPDATE ON "public"."faculty" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_grade_audit_logs_updated_audit" BEFORE UPDATE ON "public"."grade_audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_grade_transmutation_updated_audit" BEFORE UPDATE ON "public"."grade_transmutation_tables" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_grading_components_updated_audit" BEFORE UPDATE ON "public"."grading_components" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_grading_periods_updated_audit" BEFORE UPDATE ON "public"."grading_periods" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_modules_updated_audit" BEFORE UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_notifications_updated_audit" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_programs_updated_audit" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_roles_updated_audit" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_rubric_criteria_updated_audit" BEFORE UPDATE ON "public"."rubric_criteria" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_rubric_evaluations_updated_audit" BEFORE UPDATE ON "public"."rubric_evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_rubrics_updated_audit" BEFORE UPDATE ON "public"."rubrics" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_school_years_updated_audit" BEFORE UPDATE ON "public"."school_years" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_section_final_grades_audit_log" AFTER UPDATE ON "public"."section_final_grades" FOR EACH ROW EXECUTE FUNCTION "public"."fn_audit_section_final_grades"();



CREATE OR REPLACE TRIGGER "trg_section_final_grades_updated_audit" BEFORE UPDATE ON "public"."section_final_grades" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_section_schedules_updated_audit" BEFORE UPDATE ON "public"."section_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_sections_updated_audit" BEFORE UPDATE ON "public"."sections" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_student_answers_updated_audit" BEFORE UPDATE ON "public"."student_answers" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_student_clearances_updated_audit" BEFORE UPDATE ON "public"."student_clearances" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_students_updated_audit" BEFORE UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_terms_updated_audit" BEFORE UPDATE ON "public"."terms" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_user_roles_updated_audit" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



CREATE OR REPLACE TRIGGER "trg_users_updated_audit" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_audit"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_item_rubrics"
    ADD CONSTRAINT "assessment_item_rubrics_assessment_item_id_fkey" FOREIGN KEY ("assessment_item_id") REFERENCES "public"."assessment_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_item_rubrics"
    ADD CONSTRAINT "assessment_item_rubrics_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_items"
    ADD CONSTRAINT "assessment_items_grading_component_id_fkey" FOREIGN KEY ("grading_component_id") REFERENCES "public"."grading_components"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_items"
    ADD CONSTRAINT "assessment_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_items"
    ADD CONSTRAINT "assessment_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_question_choices"
    ADD CONSTRAINT "assessment_question_choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_questions"
    ADD CONSTRAINT "assessment_questions_assessment_item_id_fkey" FOREIGN KEY ("assessment_item_id") REFERENCES "public"."assessment_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_assessment_item_id_fkey" FOREIGN KEY ("assessment_item_id") REFERENCES "public"."assessment_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_submissions"
    ADD CONSTRAINT "assessment_submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_timer_heartbeats"
    ADD CONSTRAINT "assessment_timer_heartbeats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."assessment_timer_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_timer_sessions"
    ADD CONSTRAINT "assessment_timer_sessions_assessment_item_id_fkey" FOREIGN KEY ("assessment_item_id") REFERENCES "public"."assessment_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_timer_sessions"
    ADD CONSTRAINT "assessment_timer_sessions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assessment_timer_sessions"
    ADD CONSTRAINT "assessment_timer_sessions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."assessment_submissions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_attendance_session_id_fkey" FOREIGN KEY ("attendance_session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clearance_requirements"
    ADD CONSTRAINT "clearance_requirements_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."course_materials"
    ADD CONSTRAINT "course_materials_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."course_prerequisites"
    ADD CONSTRAINT "course_prerequisites_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."course_prerequisites"
    ADD CONSTRAINT "course_prerequisites_prerequisite_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."curriculum_maps"
    ADD CONSTRAINT "curriculum_maps_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."curriculum_maps"
    ADD CONSTRAINT "curriculum_maps_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_period_locks"
    ADD CONSTRAINT "evaluation_period_locks_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_period_locks"
    ADD CONSTRAINT "evaluation_period_locks_grading_period_id_fkey" FOREIGN KEY ("grading_period_id") REFERENCES "public"."grading_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_period_locks"
    ADD CONSTRAINT "evaluation_period_locks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_questions"
    ADD CONSTRAINT "evaluation_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_responses"
    ADD CONSTRAINT "evaluation_responses_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_responses"
    ADD CONSTRAINT "evaluation_responses_grading_period_id_fkey" FOREIGN KEY ("grading_period_id") REFERENCES "public"."grading_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."evaluation_responses"
    ADD CONSTRAINT "evaluation_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."evaluation_questions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."faculty"
    ADD CONSTRAINT "faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."faculty"
    ADD CONSTRAINT "fk_faculty_primary_department_id" FOREIGN KEY ("primary_department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "fk_students_program_id" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grade_audit_logs"
    ADD CONSTRAINT "grade_audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grade_audit_logs"
    ADD CONSTRAINT "grade_audit_logs_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grade_audit_logs"
    ADD CONSTRAINT "grade_audit_logs_grading_period_id_fkey" FOREIGN KEY ("grading_period_id") REFERENCES "public"."grading_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grade_transmutation_tables"
    ADD CONSTRAINT "grade_transmutation_tables_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grading_components"
    ADD CONSTRAINT "grading_components_grading_period_id_fkey" FOREIGN KEY ("grading_period_id") REFERENCES "public"."grading_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grading_components"
    ADD CONSTRAINT "grading_components_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."grading_periods"
    ADD CONSTRAINT "grading_periods_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rubric_criteria"
    ADD CONSTRAINT "rubric_criteria_rubric_id_fkey" FOREIGN KEY ("rubric_id") REFERENCES "public"."rubrics"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rubric_evaluations"
    ADD CONSTRAINT "rubric_evaluations_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "public"."rubric_criteria"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rubric_evaluations"
    ADD CONSTRAINT "rubric_evaluations_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rubric_evaluations"
    ADD CONSTRAINT "rubric_evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."assessment_submissions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."rubrics"
    ADD CONSTRAINT "rubrics_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."section_final_grades"
    ADD CONSTRAINT "section_final_grades_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."section_final_grades"
    ADD CONSTRAINT "section_final_grades_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."section_final_grades"
    ADD CONSTRAINT "section_final_grades_grading_period_id_fkey" FOREIGN KEY ("grading_period_id") REFERENCES "public"."grading_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."section_schedules"
    ADD CONSTRAINT "section_schedules_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_choice_id_fkey" FOREIGN KEY ("choice_id") REFERENCES "public"."assessment_question_choices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_answers"
    ADD CONSTRAINT "student_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."assessment_submissions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_clearances"
    ADD CONSTRAINT "student_clearances_cleared_by_fkey" FOREIGN KEY ("cleared_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_clearances"
    ADD CONSTRAINT "student_clearances_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "public"."clearance_requirements"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_clearances"
    ADD CONSTRAINT "student_clearances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_clearances"
    ADD CONSTRAINT "student_clearances_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "public"."school_years"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements_insert" ON "public"."announcements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."faculty" "f"
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "announcements_select" ON "public"."announcements" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND (("target_audience" = 'Global'::"public"."announcement_audience_type") OR (("target_audience" = 'Student'::"public"."announcement_audience_type") AND (EXISTS ( SELECT 1
   FROM "public"."students" "st"
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("st"."deleted_at" IS NULL))))) OR (("target_audience" = 'Faculty'::"public"."announcement_audience_type") AND (EXISTS ( SELECT 1
   FROM "public"."faculty" "f"
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("f"."deleted_at" IS NULL))))) OR (("target_audience" = 'Section'::"public"."announcement_audience_type") AND ("section_id" IN ( SELECT "e"."section_id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL))
UNION
 SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))))));



CREATE POLICY "announcements_update" ON "public"."announcements" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("created_by" = "auth"."uid"())));



ALTER TABLE "public"."assessment_item_rubrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_item_rubrics_insert" ON "public"."assessment_item_rubrics" FOR INSERT TO "authenticated" WITH CHECK (("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "assessment_item_rubrics_select" ON "public"."assessment_item_rubrics" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "assessment_item_rubrics_update" ON "public"."assessment_item_rubrics" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."assessment_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_items_insert" ON "public"."assessment_items" FOR INSERT TO "authenticated" WITH CHECK (("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "assessment_items_select" ON "public"."assessment_items" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ((("is_published" = true) AND (COALESCE("published_at", "now"()) <= "now"())) OR ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "assessment_items_update" ON "public"."assessment_items" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."assessment_question_choices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_question_choices_insert" ON "public"."assessment_question_choices" FOR INSERT TO "authenticated" WITH CHECK (("question_id" IN ( SELECT "aq"."id"
   FROM ((("public"."assessment_questions" "aq"
     JOIN "public"."assessment_items" "ai" ON (("ai"."id" = "aq"."assessment_item_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("aq"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "assessment_question_choices_select" ON "public"."assessment_question_choices" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "assessment_question_choices_update" ON "public"."assessment_question_choices" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("question_id" IN ( SELECT "aq"."id"
   FROM ((("public"."assessment_questions" "aq"
     JOIN "public"."assessment_items" "ai" ON (("ai"."id" = "aq"."assessment_item_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("aq"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."assessment_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_questions_insert" ON "public"."assessment_questions" FOR INSERT TO "authenticated" WITH CHECK (("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "assessment_questions_select" ON "public"."assessment_questions" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("assessment_item_id" IN ( SELECT "assessment_items"."id"
   FROM "public"."assessment_items"
  WHERE ("assessment_items"."deleted_at" IS NULL)))));



CREATE POLICY "assessment_questions_update" ON "public"."assessment_questions" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."assessment_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessment_submissions_insert" ON "public"."assessment_submissions" FOR INSERT TO "authenticated" WITH CHECK (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))));



CREATE POLICY "assessment_submissions_select" ON "public"."assessment_submissions" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) OR ("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "assessment_submissions_update" ON "public"."assessment_submissions" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) OR ("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



ALTER TABLE "public"."assessment_timer_heartbeats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessment_timer_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_records_insert" ON "public"."attendance_records" FOR INSERT TO "authenticated" WITH CHECK (("attendance_session_id" IN ( SELECT "ats"."id"
   FROM (("public"."attendance_sessions" "ats"
     JOIN "public"."sections" "s" ON (("s"."id" = "ats"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ats"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "attendance_records_select" ON "public"."attendance_records" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) OR ("attendance_session_id" IN ( SELECT "ats"."id"
   FROM (("public"."attendance_sessions" "ats"
     JOIN "public"."sections" "s" ON (("s"."id" = "ats"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ats"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "attendance_records_update" ON "public"."attendance_records" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("attendance_session_id" IN ( SELECT "ats"."id"
   FROM (("public"."attendance_sessions" "ats"
     JOIN "public"."sections" "s" ON (("s"."id" = "ats"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ats"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."attendance_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_sessions_insert" ON "public"."attendance_sessions" FOR INSERT TO "authenticated" WITH CHECK (("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "attendance_sessions_select" ON "public"."attendance_sessions" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("section_id" IN ( SELECT "e"."section_id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) OR ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "attendance_sessions_update" ON "public"."attendance_sessions" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."clearance_requirements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clearance_requirements_insert" ON "public"."clearance_requirements" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "clearance_requirements_select" ON "public"."clearance_requirements" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "clearance_requirements_update" ON "public"."clearance_requirements" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."course_materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_materials_insert" ON "public"."course_materials" FOR INSERT TO "authenticated" WITH CHECK (("module_id" IN ( SELECT "m"."id"
   FROM (("public"."modules" "m"
     JOIN "public"."sections" "s" ON (("s"."id" = "m"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("m"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "course_materials_select" ON "public"."course_materials" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ((("now"() >= COALESCE("available_from", '-infinity'::timestamp with time zone)) AND ("now"() <= COALESCE("available_until", 'infinity'::timestamp with time zone))) OR ("module_id" IN ( SELECT "m"."id"
   FROM (("public"."modules" "m"
     JOIN "public"."sections" "s" ON (("s"."id" = "m"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("m"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "course_materials_update" ON "public"."course_materials" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("module_id" IN ( SELECT "m"."id"
   FROM (("public"."modules" "m"
     JOIN "public"."sections" "s" ON (("s"."id" = "m"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("m"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."course_prerequisites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_prerequisites_insert" ON "public"."course_prerequisites" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "course_prerequisites_select" ON "public"."course_prerequisites" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "course_prerequisites_update" ON "public"."course_prerequisites" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_insert" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "courses_select" ON "public"."courses" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "courses_update" ON "public"."courses" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."curriculum_maps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "curriculum_maps_insert" ON "public"."curriculum_maps" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "curriculum_maps_select" ON "public"."curriculum_maps" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "curriculum_maps_update" ON "public"."curriculum_maps" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departments_insert" ON "public"."departments" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "departments_select" ON "public"."departments" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "departments_update" ON "public"."departments" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollments_insert" ON "public"."enrollments" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "enrollments_select" ON "public"."enrollments" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE (("students"."user_id" = "auth"."uid"()) AND ("students"."deleted_at" IS NULL)))) OR ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "enrollments_update" ON "public"."enrollments" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."evaluation_period_locks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_period_locks_insert" ON "public"."evaluation_period_locks" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "evaluation_period_locks_select" ON "public"."evaluation_period_locks" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) OR ("enrollment_id" IN ( SELECT "e"."id"
   FROM (("public"."enrollments" "e"
     JOIN "public"."sections" "s" ON (("s"."id" = "e"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "evaluation_period_locks_update" ON "public"."evaluation_period_locks" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."evaluation_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_questions_insert" ON "public"."evaluation_questions" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "evaluation_questions_select" ON "public"."evaluation_questions" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "evaluation_questions_update" ON "public"."evaluation_questions" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."evaluation_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_responses_insert" ON "public"."evaluation_responses" FOR INSERT TO "authenticated" WITH CHECK ((("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) AND ("enrollment_id" IN ( SELECT "epl"."enrollment_id"
   FROM "public"."evaluation_period_locks" "epl"
  WHERE (("epl"."grading_period_id" = "epl"."grading_period_id") AND ("epl"."is_completed" = false) AND ("epl"."deleted_at" IS NULL))))));



CREATE POLICY "evaluation_responses_select" ON "public"."evaluation_responses" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL))))));



CREATE POLICY "evaluation_responses_update" ON "public"."evaluation_responses" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL))))));



ALTER TABLE "public"."evaluation_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_templates_insert" ON "public"."evaluation_templates" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "evaluation_templates_select" ON "public"."evaluation_templates" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "evaluation_templates_update" ON "public"."evaluation_templates" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."faculty" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "faculty_insert" ON "public"."faculty" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "faculty_select" ON "public"."faculty" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "faculty_update" ON "public"."faculty" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."grade_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grade_audit_logs_insert" ON "public"."grade_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "grade_audit_logs_select" ON "public"."grade_audit_logs" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("changed_by" = "auth"."uid"()) OR ("enrollment_id" IN ( SELECT "e"."id"
   FROM (("public"."enrollments" "e"
     JOIN "public"."sections" "s" ON (("s"."id" = "e"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "grade_audit_logs_update" ON "public"."grade_audit_logs" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."grade_transmutation_tables" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grade_transmutation_tables_insert" ON "public"."grade_transmutation_tables" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "grade_transmutation_tables_select" ON "public"."grade_transmutation_tables" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "grade_transmutation_tables_update" ON "public"."grade_transmutation_tables" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."grading_components" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grading_components_insert" ON "public"."grading_components" FOR INSERT TO "authenticated" WITH CHECK (("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "grading_components_select" ON "public"."grading_components" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "grading_components_update" ON "public"."grading_components" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."grading_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "grading_periods_insert" ON "public"."grading_periods" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "grading_periods_select" ON "public"."grading_periods" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "grading_periods_update" ON "public"."grading_periods" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules_insert" ON "public"."modules" FOR INSERT TO "authenticated" WITH CHECK (("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "modules_select" ON "public"."modules" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("is_published" = true) OR ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "modules_update" ON "public"."modules" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "programs_insert" ON "public"."programs" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "programs_select" ON "public"."programs" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "programs_update" ON "public"."programs" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_insert" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "roles_select" ON "public"."roles" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "roles_update" ON "public"."roles" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."rubric_criteria" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rubric_criteria_insert" ON "public"."rubric_criteria" FOR INSERT TO "authenticated" WITH CHECK (("rubric_id" IN ( SELECT "r"."id"
   FROM (("public"."rubrics" "r"
     JOIN "public"."sections" "s" ON (("s"."id" = "r"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("r"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "rubric_criteria_select" ON "public"."rubric_criteria" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "rubric_criteria_update" ON "public"."rubric_criteria" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("rubric_id" IN ( SELECT "r"."id"
   FROM (("public"."rubrics" "r"
     JOIN "public"."sections" "s" ON (("s"."id" = "r"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("r"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."rubric_evaluations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rubric_evaluations_insert" ON "public"."rubric_evaluations" FOR INSERT TO "authenticated" WITH CHECK ((("evaluated_by" = "auth"."uid"()) AND ("submission_id" IN ( SELECT "asub"."id"
   FROM ((("public"."assessment_submissions" "asub"
     JOIN "public"."assessment_items" "ai" ON (("ai"."id" = "asub"."assessment_item_id")))
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("asub"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



CREATE POLICY "rubric_evaluations_select" ON "public"."rubric_evaluations" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("evaluated_by" = "auth"."uid"()) OR ("submission_id" IN ( SELECT "asub"."id"
   FROM (("public"."assessment_submissions" "asub"
     JOIN "public"."enrollments" "e" ON (("e"."id" = "asub"."enrollment_id")))
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("asub"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))))));



CREATE POLICY "rubric_evaluations_update" ON "public"."rubric_evaluations" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("evaluated_by" = "auth"."uid"())));



ALTER TABLE "public"."rubrics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rubrics_insert" ON "public"."rubrics" FOR INSERT TO "authenticated" WITH CHECK (("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "rubrics_select" ON "public"."rubrics" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "rubrics_update" ON "public"."rubrics" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("section_id" IN ( SELECT "s"."id"
   FROM ("public"."sections" "s"
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("s"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."school_years" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_years_insert" ON "public"."school_years" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "school_years_select" ON "public"."school_years" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "school_years_update" ON "public"."school_years" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."section_final_grades" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "section_final_grades_insert" ON "public"."section_final_grades" FOR INSERT TO "authenticated" WITH CHECK (("enrollment_id" IN ( SELECT "e"."id"
   FROM (("public"."enrollments" "e"
     JOIN "public"."sections" "s" ON (("s"."id" = "e"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))));



CREATE POLICY "section_final_grades_select" ON "public"."section_final_grades" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL) AND ("e"."is_grade_visible" = true)))) OR ("enrollment_id" IN ( SELECT "e"."id"
   FROM (("public"."enrollments" "e"
     JOIN "public"."sections" "s" ON (("s"."id" = "e"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "section_final_grades_update" ON "public"."section_final_grades" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("enrollment_id" IN ( SELECT "e"."id"
   FROM (("public"."enrollments" "e"
     JOIN "public"."sections" "s" ON (("s"."id" = "e"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL))))));



ALTER TABLE "public"."section_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "section_schedules_insert" ON "public"."section_schedules" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "section_schedules_select" ON "public"."section_schedules" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "section_schedules_update" ON "public"."section_schedules" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sections_insert" ON "public"."sections" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "sections_select" ON "public"."sections" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "sections_update" ON "public"."sections" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("faculty_id" IN ( SELECT "faculty"."id"
   FROM "public"."faculty"
  WHERE (("faculty"."user_id" = "auth"."uid"()) AND ("faculty"."deleted_at" IS NULL))))));



ALTER TABLE "public"."student_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_answers_insert" ON "public"."student_answers" FOR INSERT TO "authenticated" WITH CHECK (("submission_id" IN ( SELECT "asub"."id"
   FROM (("public"."assessment_submissions" "asub"
     JOIN "public"."enrollments" "e" ON (("e"."id" = "asub"."enrollment_id")))
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("asub"."deleted_at" IS NULL) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL) AND ("asub"."status" = 'In Progress'::"public"."submission_status_type") AND (("asub"."time_limit_expires_at" IS NULL) OR ("asub"."time_limit_expires_at" > "now"()))))));



CREATE POLICY "student_answers_select" ON "public"."student_answers" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("submission_id" IN ( SELECT "assessment_submissions"."id"
   FROM "public"."assessment_submissions"
  WHERE ("assessment_submissions"."deleted_at" IS NULL)))));



CREATE POLICY "student_answers_update" ON "public"."student_answers" FOR UPDATE TO "authenticated" USING ((("deleted_at" IS NULL) AND ("submission_id" IN ( SELECT "asub"."id"
   FROM (("public"."assessment_submissions" "asub"
     JOIN "public"."enrollments" "e" ON (("e"."id" = "asub"."enrollment_id")))
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("asub"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL) AND ("asub"."status" = 'In Progress'::"public"."submission_status_type") AND (("asub"."time_limit_expires_at" IS NULL) OR ("asub"."time_limit_expires_at" > "now"())))))));



ALTER TABLE "public"."student_clearances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_clearances_insert" ON "public"."student_clearances" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "student_clearances_select" ON "public"."student_clearances" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("student_id" IN ( SELECT "students"."id"
   FROM "public"."students"
  WHERE (("students"."user_id" = "auth"."uid"()) AND ("students"."deleted_at" IS NULL)))) OR ("cleared_by" = "auth"."uid"()))));



CREATE POLICY "student_clearances_update" ON "public"."student_clearances" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_insert" ON "public"."students" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "students_select" ON "public"."students" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "students_update" ON "public"."students" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."terms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "terms_insert" ON "public"."terms" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "terms_select" ON "public"."terms" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "terms_update" ON "public"."terms" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "timer_heartbeats_insert" ON "public"."assessment_timer_heartbeats" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "timer_heartbeats_select" ON "public"."assessment_timer_heartbeats" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("session_id" IN ( SELECT "assessment_timer_sessions"."id"
   FROM "public"."assessment_timer_sessions"
  WHERE ("assessment_timer_sessions"."deleted_at" IS NULL)))));



CREATE POLICY "timer_heartbeats_update" ON "public"."assessment_timer_heartbeats" FOR UPDATE TO "authenticated" USING (false);



CREATE POLICY "timer_sessions_insert" ON "public"."assessment_timer_sessions" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "timer_sessions_select" ON "public"."assessment_timer_sessions" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND (("enrollment_id" IN ( SELECT "e"."id"
   FROM ("public"."enrollments" "e"
     JOIN "public"."students" "st" ON (("st"."id" = "e"."student_id")))
  WHERE (("st"."user_id" = "auth"."uid"()) AND ("e"."deleted_at" IS NULL) AND ("st"."deleted_at" IS NULL)))) OR ("assessment_item_id" IN ( SELECT "ai"."id"
   FROM (("public"."assessment_items" "ai"
     JOIN "public"."sections" "s" ON (("s"."id" = "ai"."section_id")))
     JOIN "public"."faculty" "f" ON (("f"."id" = "s"."faculty_id")))
  WHERE (("f"."user_id" = "auth"."uid"()) AND ("ai"."deleted_at" IS NULL) AND ("f"."deleted_at" IS NULL)))))));



CREATE POLICY "timer_sessions_update" ON "public"."assessment_timer_sessions" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_insert" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "user_roles_select" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("deleted_at" IS NULL) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "user_roles_update" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING (false);



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_select" ON "public"."users" FOR SELECT TO "authenticated" USING (("deleted_at" IS NULL));



CREATE POLICY "users_update" ON "public"."users" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;







































































































































































































