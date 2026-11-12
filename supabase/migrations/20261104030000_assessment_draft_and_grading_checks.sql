-- ====================================================================
-- Migration: 20261104030000_assessment_draft_and_grading_checks.sql
--   * fn_create_assessment: a new assessment is always saved as a Draft and students are not
--     notified. The builder creates the row on step 1 (before any questions exist), so the old
--     "publish now unless scheduled" rule told students about an empty assessment. Publishing
--     stays an explicit action (fn_publish_assessment). A scheduled publish date still works.
--   * fn_publish_assessment: also refuses when the question points do not add up to the
--     assessment's Total Points, since scores are counted out of Total Points
--   * fn_component_item_scores: an item's earned points are kept between 0 and its Total
--     Points, so a component (and the period grade) can never go above 100%
--   * fn_grade_submission: refuses attempts that were never submitted (Not Started /
--     In Progress), and points outside 0..question points or left empty
--   * fn_grade_submission_rubric: same refusal for attempts that were never submitted
-- ====================================================================
BEGIN;

-- fn_create_assessment
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

    -- Always a Draft: it has no questions yet. Students are told when it is published.
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

    RETURN jsonb_build_object('success', true, 'message', 'Draft assessment created.', 'id', v_id);
END;
$function$;

-- fn_publish_assessment
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
    v_total_points NUMERIC;
    v_question_points NUMERIC;
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

    -- Scores are counted out of Total Points, so the questions must add up to it
    SELECT ai.total_points INTO v_total_points
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id;

    SELECT COALESCE(SUM(aq.points), 0) INTO v_question_points
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = p_assessment_id
    AND aq.deleted_at IS NULL;

    IF v_question_points <> v_total_points THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format(
                'Cannot publish: the questions add up to %s pts but Total Points is %s pts. Make them match in the builder (or use "Sync") first.',
                trim_scale(v_question_points), trim_scale(v_total_points)
            )
        );
    END IF;

    UPDATE public.assessment_items
    SET
        is_published = true,
        published_at = now()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL
    RETURNING section_id, title INTO v_section_id, v_title;

    -- Notify enrolled students using their real enrollment IDs and tab=assessments query
    SELECT c.code INTO v_course_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = v_section_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        st.user_id,
        'Assessment Published',
        format('%s: %s is now available to take.', COALESCE(v_course_code, 'Assessment'), v_title),
        format('/student/subjects/%s?tab=assessments', e.id::text),
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

GRANT EXECUTE ON FUNCTION public.fn_publish_assessment(uuid) TO authenticated;

-- fn_component_item_scores
-- Same counting rules as before; an item's earned points are now kept within 0..total_points
-- so a score above the item's maximum can never push a component past 100%.
CREATE OR REPLACE FUNCTION public.fn_component_item_scores(p_enrollment_id uuid, p_component_id uuid)
 RETURNS TABLE (
    id uuid,
    title text,
    assessment_type text,
    due_at timestamptz,
    max_points numeric,
    graded_points numeric,
    graded_at timestamptz,
    submission_status text,
    is_late boolean,
    is_counted boolean,
    is_missed boolean,
    counted_points numeric,
    counted_max numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        x.id, x.title, x.assessment_type, x.due_at, x.max_points,
        x.graded_points, x.graded_at, x.submission_status, x.is_late,
        (x.graded_points IS NOT NULL OR x.is_missed) AS is_counted,
        x.is_missed,
        CASE WHEN x.graded_points IS NOT NULL THEN x.graded_points ELSE 0 END AS counted_points,
        CASE WHEN x.graded_points IS NOT NULL OR x.is_missed THEN x.max_points ELSE 0 END AS counted_max
    FROM (
        SELECT
            ai.id,
            ai.title,
            ai.assessment_type::text AS assessment_type,
            ai.due_at,
            ai.total_points AS max_points,
            LEAST(GREATEST(sub.final_score, 0), ai.total_points) AS graded_points,
            sub.graded_at,
            latest.status::text AS submission_status,
            latest.is_late,
            (
                sub.final_score IS NULL
                AND ai.is_published
                AND COALESCE(ai.closes_at, ai.due_at) IS NOT NULL
                AND COALESCE(ai.closes_at, ai.due_at) < now()
                AND COALESCE(latest.status::text, 'Not Started') IN ('Not Started', 'In Progress')
            ) AS is_missed
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
        WHERE ai.grading_component_id = p_component_id
          AND ai.deleted_at IS NULL
    ) x;
$function$;

REVOKE ALL ON FUNCTION public.fn_component_item_scores(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- fn_grade_submission
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
    v_enrollment_id   UUID;
    v_status          TEXT;
    v_points          NUMERIC;
    v_question_points NUMERIC;
    v_question_no     INTEGER;
BEGIN
    SELECT asub.status::text INTO v_status
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    IF v_status IN ('Not Started', 'In Progress') THEN
        RETURN jsonb_build_object('success', false, 'message', 'This attempt has not been submitted yet, so it cannot be graded.');
    END IF;

    -- Check every answer first so a bad value saves nothing
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        SELECT aq.points, aq.sequence INTO v_question_points, v_question_no
        FROM public.student_answers sa
        INNER JOIN public.assessment_questions aq ON aq.id = sa.question_id
        WHERE sa.id = (v_answer->>'id')::UUID
        AND sa.submission_id = p_submission_id
        AND sa.deleted_at IS NULL;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'An answer does not belong to this submission.');
        END IF;

        v_points := (v_answer->>'points_earned')::NUMERIC;

        IF v_points IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', format('Enter the points earned for question %s.', v_question_no));
        END IF;

        IF v_points < 0 OR v_points > v_question_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format('Points for question %s must be between 0 and %s.', v_question_no, trim_scale(v_question_points))
            );
        END IF;
    END LOOP;

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

    -- Notify the student with their grade using real enrollment ID
    SELECT st.user_id, ai.title, e.id
    INTO v_student_user_id, v_assessment_title, v_enrollment_id
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
            format('/student/subjects/%s', v_enrollment_id::text),
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

-- fn_grade_submission_rubric
CREATE OR REPLACE FUNCTION public.fn_grade_submission_rubric(p_submission_id uuid, p_feedback text, p_evaluations jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_eval            JSONB;
    v_total           NUMERIC := 0;
    v_student_user_id UUID;
    v_assessment_title TEXT;
    v_enrollment_id   UUID;
    v_section_id      UUID;
    v_rubric_id       UUID;
    v_criteria_id     UUID;
    v_points          NUMERIC;
    v_max_points      NUMERIC;
    v_updated         INTEGER;
    v_status          TEXT;
BEGIN
    SELECT ai.section_id, ai.title, e.id, st.user_id, asub.status::text
    INTO v_section_id, v_assessment_title, v_enrollment_id, v_student_user_id, v_status
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
    INNER JOIN public.students st ON st.id = e.student_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    IF v_status IN ('Not Started', 'In Progress') THEN
        RETURN jsonb_build_object('success', false, 'message', 'This attempt has not been submitted yet, so it cannot be graded.');
    END IF;

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
        v_criteria_id := COALESCE((v_eval->>'criteria_id')::UUID, (v_eval->>'criterion_id')::UUID);
        v_points      := COALESCE((v_eval->>'points_earned')::NUMERIC, 0);

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

    -- Notify the student with their real enrollment ID
    IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student_user_id,
            'Assessment Graded',
            format('Your submission for "%s" has been evaluated with rubric (Score: %s pts).', v_assessment_title, v_total),
            format('/student/subjects/%s', v_enrollment_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rubric evaluation saved successfully.',
        'raw_score', v_total,
        'total_score', v_total
    );
END;
$function$;

COMMIT;
