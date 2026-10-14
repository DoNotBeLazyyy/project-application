-- Migration: 20261015020000_complete_targeted_notification_suite.sql
-- Description:
--   Comprehensive, targeted real-time notification suite across the academic lifecycle:
--   1. Assessments:
--      - fn_create_assessment & fn_publish_assessment: Notify enrolled students of published assessments.
--      - fn_submit_assessment: Notify section faculty when a student turns in an assessment.
--      - fn_grade_submission & fn_grade_submission_rubric: Notify student with score when their submission is graded.
--   2. Course Content:
--      - fn_create_module: Notify enrolled students when new learning modules are posted.
--   3. Faculty Load:
--      - fn_assign_section_faculty: Notify faculty when assigned to teach a section.
--   4. Enrollment:
--      - fn_enroll_student_section: Notify student upon successful section enrollment.
--   5. Grades & Evaluation:
--      - fn_submit_section_grades: Notify Registrars when faculty submits grades for review.
--      - fn_approve_and_release_grades: Notify enrolled students when section grades are approved and released.
--      - fn_release_grades_after_evaluation: Notify student when grades are unlocked following evaluation.
--   6. Attendance:
--      - fn_save_attendance_records: Notify students marked Absent or Excused.
--   7. Transferee Course Crediting:
--      - fn_credit_student_course: Notify student when courses are credited to their curriculum.

-- ============================================================================
-- 1. ASSESSMENTS: CREATION, PUBLISHING, SUBMISSION & GRADING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_create_assessment(
    p_section_id uuid,
    p_title text,
    p_description text,
    p_assessment_type assessment_type,
    p_grading_component_id uuid,
    p_total_points numeric,
    p_passing_points numeric,
    p_time_limit_minutes smallint,
    p_max_attempts smallint,
    p_opens_at timestamp with time zone,
    p_due_at timestamp with time zone,
    p_closes_at timestamp with time zone,
    p_show_results_at timestamp with time zone,
    p_scheduled_publish_at timestamp with time zone,
    p_shuffle_questions boolean,
    p_shuffle_choices boolean,
    p_show_all_questions boolean DEFAULT true,
    p_questions_per_page smallint DEFAULT NULL::smallint,
    p_allow_student_review boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_is_published BOOLEAN;
    v_course_code TEXT;
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

    v_is_published := CASE
        WHEN p_scheduled_publish_at IS NOT NULL AND p_scheduled_publish_at > now() THEN false
        ELSE true
    END;

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
        v_is_published, auth.uid()
    )
    RETURNING id INTO v_id;

    -- If published immediately, notify all enrolled students
    IF v_is_published THEN
        SELECT c.code INTO v_course_code
        FROM public.sections s
        LEFT JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = p_section_id;

        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        SELECT
            st.user_id,
            'New Assessment Posted',
            format('%s: %s (%s pts)', COALESCE(v_course_code, 'Assessment'), btrim(p_title), p_total_points),
            format('/student/subjects/%s', p_section_id::text),
            'Assessment'::public.notification_category_type
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
          AND st.user_id IS NOT NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment created successfully.', 'id', v_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_publish_assessment(p_assessment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_title TEXT;
    v_course_code TEXT;
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
    AND deleted_at IS NULL
    RETURNING section_id, title INTO v_section_id, v_title;

    -- Notify enrolled students
    SELECT c.code INTO v_course_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = v_section_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        st.user_id,
        'Assessment Published',
        format('%s: %s is now available to take.', COALESCE(v_course_code, 'Assessment'), v_title),
        format('/student/subjects/%s', v_section_id::text),
        'Assessment'::public.notification_category_type
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.section_id = v_section_id
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
      AND st.user_id IS NOT NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment published successfully.');
END;
$function$;

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
  v_faculty_id       UUID;
  v_section_id       UUID;
  v_assessment_title TEXT;
  v_student_name     TEXT;
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

  SELECT ai.due_at, ai.title, s.id, s.faculty_id
  INTO v_due_at, v_assessment_title, v_section_id, v_faculty_id
  FROM public.assessment_items ai
  JOIN public.sections s ON s.id = ai.section_id
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  UPDATE public.assessment_submissions
  SET
    status       = (CASE WHEN v_is_late THEN 'Late'::public.submission_status_type ELSE 'Submitted'::public.submission_status_type END),
    submitted_at = now(),
    is_late      = v_is_late
  WHERE id = p_submission_id;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted'::public.submission_timer_status,
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  -- Notify the assigned faculty member
  IF v_faculty_id IS NOT NULL THEN
    SELECT u.first_name || ' ' || u.last_name INTO v_student_name
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id
    JOIN public.users u ON u.id = st.user_id
    WHERE e.id = v_enrollment_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
      v_faculty_id,
      'Assessment Submitted',
      format('%s submitted "%s"%s.', COALESCE(v_student_name, 'A student'), v_assessment_title, CASE WHEN v_is_late THEN ' (Late)' ELSE '' END),
      format('/faculty/sections/%s', v_section_id::text),
      'Assessment'::public.notification_category_type
    );
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.fn_grade_submission(p_submission_id uuid, p_feedback text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_answer          JSONB;
    v_total_score     NUMERIC := 0;
    v_max_score       NUMERIC := 0;
    v_student_user_id UUID;
    v_assessment_title TEXT;
    v_section_id      UUID;
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
        raw_score   = v_total_score,
        final_score = v_total_score,
        feedback    = NULLIF(p_feedback, ''),
        status      = 'Graded'::public.submission_status_type,
        graded_at   = now(),
        graded_by   = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    -- Notify the student with their grade
    SELECT st.user_id, ai.title, ai.section_id
    INTO v_student_user_id, v_assessment_title, v_section_id
    FROM public.assessment_submissions asub
    JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    JOIN public.enrollments e ON e.id = asub.enrollment_id
    JOIN public.students st ON st.id = e.student_id
    WHERE asub.id = p_submission_id;

    IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student_user_id,
            'Assessment Graded',
            format('Your submission for "%s" has been graded: %s/%s pts.', v_assessment_title, v_total_score, v_max_score),
            format('/student/subjects/%s', v_section_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Submission graded successfully.',
        'raw_score', v_total_score,
        'max_score', v_max_score
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_grade_submission_rubric(p_submission_id uuid, p_feedback text, p_evaluations jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id      UUID;
    v_rubric_id       UUID;
    v_eval            JSONB;
    v_criteria_id     UUID;
    v_points          NUMERIC;
    v_max_points      NUMERIC;
    v_total           NUMERIC := 0;
    v_updated         INTEGER;
    v_student_user_id UUID;
    v_assessment_title TEXT;
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
        v_points      := (v_eval->>'points_earned')::NUMERIC;

        SELECT points INTO v_max_points
        FROM public.rubric_criterias
        WHERE id = v_criteria_id AND rubric_id = v_rubric_id AND deleted_at IS NULL;

        IF v_max_points IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Invalid criteria ID.');
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

    -- Notify the student
    SELECT st.user_id, ai.title INTO v_student_user_id, v_assessment_title
    FROM public.assessment_submissions asub
    JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    JOIN public.enrollments e ON e.id = asub.enrollment_id
    JOIN public.students st ON st.id = e.student_id
    WHERE asub.id = p_submission_id;

    IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student_user_id,
            'Assessment Graded',
            format('Your submission for "%s" has been evaluated with rubric (Score: %s pts).', v_assessment_title, v_total),
            format('/student/subjects/%s', v_section_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rubric evaluation saved successfully.',
        'total_score', v_total
    );
END;
$function$;

-- ============================================================================
-- 2. COURSE CONTENT & MODULES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_create_module(
    p_section_id uuid,
    p_title text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_sequence SMALLINT;
    v_course_code TEXT;
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

    INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
    VALUES (p_section_id, btrim(p_title), NULLIF(btrim(p_description), ''), v_sequence, true, now())
    RETURNING id INTO v_id;

    -- Notify enrolled students of new learning module
    SELECT c.code INTO v_course_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        st.user_id,
        'New Course Material',
        format('%s: New learning module "%s" has been posted.', COALESCE(v_course_code, 'Course'), btrim(p_title)),
        format('/student/subjects/%s', p_section_id::text),
        'General'::public.notification_category_type
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.section_id = p_section_id
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
      AND st.user_id IS NOT NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module created successfully.', 'id', v_id);
END;
$function$;

-- ============================================================================
-- 3. FACULTY TEACHING LOAD ASSIGNMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_assign_section_faculty(
    p_section_id uuid,
    p_faculty_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_course_code TEXT;
    v_section_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin', 'Registrar');

    SELECT c.code, s.section_code
    INTO v_course_code, v_section_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    IF v_section_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF p_faculty_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.id = p_faculty_id AND u.deleted_at IS NULL AND r.code = 'Faculty'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Selected user is not an active faculty member.');
    END IF;

    UPDATE public.sections
    SET faculty_id = p_faculty_id,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_section_id;

    -- Notify faculty member if newly assigned
    IF p_faculty_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            p_faculty_id,
            'Teaching Load Assignment',
            format('You have been assigned to teach %s - Section %s.', COALESCE(v_course_code, 'Course'), v_section_code),
            format('/faculty/sections/%s', p_section_id::text),
            'Account'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Faculty assignment updated successfully.');
END;
$function$;

-- ============================================================================
-- 4. STUDENT SECTION ENROLLMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(
    p_student_id uuid,
    p_section_id uuid,
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL::text,
    p_override_prerequisites boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student         RECORD;
    v_section         RECORD;
    v_term            RECORD;
    v_taken           INTEGER;
    v_conflicts       TEXT;
    v_unmet           TEXT;
    v_student_user_id UUID;
BEGIN
    SELECT st.id, st.program_id, st.status, st.user_id
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

    SELECT t.id, t.is_active, t.enrollment_start_date, t.enrollment_end_date
    INTO v_term
    FROM public.terms t
    WHERE t.id = v_section.term_id AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_NOT_FOUND', 'message', 'Term not found.');
    END IF;

    IF NOT v_term.is_active THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_INACTIVE', 'message', 'Term is not active for enrollment.');
    END IF;

    IF v_term.enrollment_start_date IS NOT NULL AND CURRENT_DATE < v_term.enrollment_start_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_NOT_STARTED', 'message', 'Enrollment has not started yet.');
    END IF;

    IF v_term.enrollment_end_date IS NOT NULL AND CURRENT_DATE > v_term.enrollment_end_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_CLOSED', 'message', 'Enrollment is already closed.');
    END IF;

    -- Strict curriculum check
    IF NOT EXISTS (
        SELECT 1
        FROM public.curriculum_maps cm
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

    -- Check if student already enrolled or completed locally
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

    -- Check if course has already been credited from previous institution (Transferee)
    IF EXISTS (
        SELECT 1
        FROM public.student_credited_courses scc
        WHERE scc.student_id = p_student_id
        AND scc.course_id = v_section.course_id
        AND scc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CREDITED',
            'message', 'Course ' || v_section.course_code || ' has already been credited from a previous institution.'
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

    IF EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND deleted_at IS NULL
    ) THEN
        UPDATE public.enrollments
        SET status = 'Enrolled'::public.enrollment_status_type,
            enrolled_at = now(),
            dropped_at = NULL,
            updated_at = now()
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND deleted_at IS NULL;
    ELSE
        INSERT INTO public.enrollments (
            student_id,
            section_id,
            status,
            enrolled_at
        ) VALUES (
            p_student_id,
            p_section_id,
            'Enrolled'::public.enrollment_status_type,
            now()
        );
    END IF;

    -- Notify the student in real time
    IF v_student.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student.user_id,
            'Enrollment Confirmed',
            format('You have been officially enrolled in %s (%s).', v_section.course_code, v_section.section_code),
            '/student/subjects',
            'Enrollment'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully enrolled in ' || v_section.section_code || '.'
    );
END;
$function$;

-- ============================================================================
-- 5. GRADES & EVALUATION RELEASES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_submit_section_grades(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_course_code TEXT;
  v_section_code TEXT;
  v_period_name TEXT;
  v_faculty_name TEXT;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    SELECT c.code, s.section_code
    INTO v_course_code, v_section_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id;

    SELECT u.first_name || ' ' || u.last_name INTO v_faculty_name
    FROM public.users u
    WHERE u.id = auth.uid();

    SELECT COUNT(*) INTO v_count
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
    WHERE e.section_id = p_section_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    IF v_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No calculated grades found to submit. Calculate grades first.'
        );
    END IF;

    UPDATE public.section_final_grades sfg
    SET status = 'Submitted'::public.grade_status_type,
        updated_at = now(),
        updated_by = auth.uid()
    FROM public.enrollments e
    WHERE e.id = sfg.enrollment_id
      AND e.section_id = p_section_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    -- Notify all active Registrars in real time
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        u.id,
        'Grade Submission for Review',
        format('%s submitted %s grades for %s (%s) - %s student(s).',
            COALESCE(v_faculty_name, 'Faculty'),
            COALESCE(v_period_name, 'Period'),
            COALESCE(v_course_code, 'Course'),
            COALESCE(v_section_code, 'Section'),
            v_count
        ),
        '/registrar/grades',
        'Grade'::public.notification_category_type
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL AND u.status = 'Active' AND r.code = 'Registrar';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Officially submitted ' || v_count || ' student grade(s) to the Registrar.',
        'submitted_count', v_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(
    p_section_id uuid,
    p_grading_period_id uuid
)
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
  v_pending_flags   INTEGER := 0;
  v_student_rec     RECORD;
  v_course_code     TEXT;
  v_section_code    TEXT;
BEGIN
  PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT COUNT(*)
  INTO v_pending_flags
  FROM public.special_grade_flags f
  INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
  WHERE e.section_id        = p_section_id
    AND f.grading_period_id = p_grading_period_id
    AND f.status            = 'Pending'
    AND f.deleted_at        IS NULL;

  IF v_pending_flags > 0 THEN
    RETURN jsonb_build_object(
      'success',            false,
      'pending_flag_count', v_pending_flags,
      'message',            v_pending_flags || ' student(s) have an unresolved special grade flag. '
                         || 'Apply or dismiss each one before approving this period.'
    );
  END IF;

  SELECT c.code, s.section_code
  INTO v_course_code, v_section_code
  FROM public.sections s
  LEFT JOIN public.courses c ON c.id = s.course_id
  WHERE s.id = p_section_id;

  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            IN ('Submitted', 'Draft', 'Approved')
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

      v_released_count := v_released_count + 1;
    ELSE
      v_eval_blocked := v_eval_blocked + 1;
    END IF;
  END LOOP;

  -- Synchronize student year levels with curriculum progression for released grades
  FOR v_student_rec IN
    SELECT DISTINCT e.student_id
    FROM public.enrollments e
    WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
  LOOP
    PERFORM public.fn_sync_student_year_level(v_student_rec.student_id);
  END LOOP;

  -- Notify enrolled students in real time
  INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
  SELECT
    st.user_id,
    'Grades Released',
    format('Grades for %s (%s) have been officially approved and released.', COALESCE(v_course_code, 'your course'), COALESCE(v_section_code, 'Section')),
    '/student/grade',
    'Grade'::public.notification_category_type
  FROM public.enrollments e
  JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
  WHERE e.section_id = p_section_id
    AND e.deleted_at IS NULL
    AND st.user_id IS NOT NULL;

  RETURN jsonb_build_object(
    'success',        true,
    'approved_count', v_approved_count,
    'released_count', v_released_count,
    'eval_blocked',   v_eval_blocked,
    'message',        'Grades approved. ' || v_released_count || ' released immediately; '
                   || v_eval_blocked || ' pending student evaluation completion.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_release_grades_after_evaluation(
    p_enrollment_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_completed BOOLEAN;
  v_grade_count  INTEGER;
  v_student_user_id UUID;
  v_course_code TEXT;
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

  UPDATE public.section_final_grades
  SET status = 'Released', released_at = now()
  WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND status = 'Approved'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_grade_count = ROW_COUNT;

  -- Notify the student that grades are now unlocked
  SELECT st.user_id, c.code
  INTO v_student_user_id, v_course_code
  FROM public.enrollments e
  JOIN public.students st ON st.id = e.student_id
  JOIN public.sections s ON s.id = e.section_id
  LEFT JOIN public.courses c ON c.id = s.course_id
  WHERE e.id = p_enrollment_id;

  IF v_student_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
      v_student_user_id,
      'Grades Unlocked',
      format('Evaluation completed! Your %s grades are now unlocked and viewable.', COALESCE(v_course_code, 'course')),
      '/student/grade',
      'Grade'::public.notification_category_type
    );
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Grades released successfully.',
    'rows_updated', v_grade_count
  );
END;
$function$;

-- ============================================================================
-- 6. ATTENDANCE ABSENCE NOTICES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_save_attendance_records(
    p_session_id uuid,
    p_records jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id      UUID;
    v_session_date    DATE;
    v_record          JSONB;
    v_status          public.attendance_status_type;
    v_student_user_id UUID;
    v_course_code     TEXT;
BEGIN
    SELECT ats.section_id, ats.session_date, c.code
    INTO v_section_id, v_session_date, v_course_code
    FROM public.attendance_sessions ats
    JOIN public.sections s ON s.id = ats.section_id
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE ats.id = p_session_id
    AND ats.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_is_section_faculty(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        v_status := (v_record->>'status')::public.attendance_status_type;

        UPDATE public.attendance_records
        SET
            status  = v_status,
            remarks = NULLIF(trim(v_record->>'remarks'), '')
        WHERE id = (v_record->>'id')::UUID
        AND attendance_session_id = p_session_id
        AND deleted_at IS NULL;

        -- If student was marked Absent or Excused, notify the student
        IF v_status IN ('Absent', 'Excused') THEN
            SELECT st.user_id INTO v_student_user_id
            FROM public.attendance_records ar
            JOIN public.enrollments e ON e.id = ar.enrollment_id
            JOIN public.students st ON st.id = e.student_id
            WHERE ar.id = (v_record->>'id')::UUID;

            IF v_student_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
                VALUES (
                    v_student_user_id,
                    'Attendance Notice',
                    format('You were marked %s in %s on %s.', v_status, COALESCE(v_course_code, 'class'), to_char(v_session_date, 'Mon DD, YYYY')),
                    format('/student/subjects/%s', v_section_id::text),
                    'Attendance'::public.notification_category_type
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance saved successfully.');
END;
$function$;

-- ============================================================================
-- 7. TRANSFEREE COURSE CREDITING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_credit_student_course(
    p_student_id uuid,
    p_course_id uuid,
    p_previous_school text,
    p_previous_course_code text DEFAULT NULL,
    p_previous_course_title text DEFAULT NULL,
    p_grade_display text DEFAULT 'Passed',
    p_grade_numeric numeric DEFAULT NULL,
    p_units_credited numeric DEFAULT NULL,
    p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id     UUID;
    v_caller_name   TEXT;
    v_roles         TEXT[];
    v_user_id       UUID;
    v_student_num   TEXT;
    v_student_name  TEXT;
    v_course_code   TEXT;
    v_course_title  TEXT;
    v_default_units NUMERIC;
    v_final_units   NUMERIC;
    v_inserted_id   UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You must be logged in.');
    END IF;

    SELECT array_agg(r.code) INTO v_roles
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = v_caller_id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL;

    IF NOT ('Registrar' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Only Registrar or Admin can credit courses.');
    END IF;

    SELECT first_name || ' ' || last_name INTO v_caller_name
    FROM public.users WHERE id = v_caller_id;

    SELECT st.user_id, st.student_number, u.first_name || ' ' || u.last_name
    INTO v_user_id, v_student_num, v_student_name
    FROM public.students st
    JOIN public.users u ON u.id = st.user_id
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT code, title, units
    INTO v_course_code, v_course_title, v_default_units
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_course_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found.');
    END IF;

    IF p_previous_school IS NULL OR trim(p_previous_school) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Previous school/institution name is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.student_credited_courses
        WHERE student_id = p_student_id AND course_id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course ' || v_course_code || ' is already credited for this student.');
    END IF;

    v_final_units := COALESCE(p_units_credited, v_default_units, 3.0);

    INSERT INTO public.student_credited_courses (
        student_id, course_id, previous_school, previous_course_code, previous_course_title,
        grade_display, grade_numeric, units_credited, remarks, credited_by
    ) VALUES (
        p_student_id, p_course_id, trim(p_previous_school),
        NULLIF(trim(p_previous_course_code), ''), NULLIF(trim(p_previous_course_title), ''),
        COALESCE(NULLIF(trim(p_grade_display), ''), 'Passed'), p_grade_numeric,
        v_final_units, NULLIF(trim(p_remarks), ''), v_caller_id
    )
    RETURNING id INTO v_inserted_id;

    -- Audit Log
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id, 'CREDIT_COURSE', 'student_credited_courses', v_inserted_id,
        NULL,
        jsonb_build_object(
            'student_id', p_student_id, 'student_number', v_student_num, 'student_name', v_student_name,
            'course_id', p_course_id, 'course_code', v_course_code, 'course_title', v_course_title,
            'previous_school', p_previous_school, 'units_credited', v_final_units, 'credited_by_name', v_caller_name
        )
    );

    -- Notify the student in real time
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
        v_user_id,
        'Course Credited',
        format('Course %s (%s) has been credited from %s.', v_course_code, v_course_title, trim(p_previous_school)),
        '/student/curriculum',
        'Account'::public.notification_category_type
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Course ' || v_course_code || ' credited successfully.',
        'credited_course_id', v_inserted_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
