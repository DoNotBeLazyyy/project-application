-- ====================================================================
-- Migration: 20261121200000_assessment_score_lock.sql
-- Audit 2026-11-21, assessments (faculty side). Every function below is the live
-- definition with only the listed change.
--   * fn_is_assessment_grading_locked (new, internal): true when the assessment's grading
--     period already has Submitted, Approved or Released grades in its section.
--   * #10 / policy 7: once a period's grades are Submitted, faculty can't change scores in it.
--       fn_grade_submission, fn_grade_submission_rubric, fn_delete_assessment and the
--       fn_upsert_question re-score return {success:false,message}. fn_update_assessment also
--       refuses to change Total Points or move the assessment into or out of a locked period.
--   * #6 / policy 6: fn_grade_submission_rubric scales the rubric score to Total Points
--       (18/20 on a 100-point essay = 90 points).
--   * #11: fn_delete_grading_component refuses to delete a component that still has
--       assessments, so their scores are not dropped from the grade.
--   * #26: fn_upsert_question re-scores in-progress attempts too (their saved answers keep
--       the new key), and no longer overwrites the score of rubric-scored submissions.
--   * #27: once an assessment is published (or its scheduled publish time has passed), its
--       question points must keep adding up to Total Points: fn_update_assessment,
--       fn_upsert_question, fn_delete_question and fn_bulk_import_questions refuse a change
--       that breaks this. fn_bulk_import_questions also clears an unready scheduled publish,
--       like the other question functions already do.
-- Idempotent: CREATE OR REPLACE only, same signatures and return shapes.
-- ====================================================================
BEGIN;

-- fn_is_assessment_grading_locked (internal helper)
CREATE OR REPLACE FUNCTION public.fn_is_assessment_grading_locked(p_assessment_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.assessment_items ai
        INNER JOIN public.grading_components gc ON gc.id = ai.grading_component_id
        WHERE ai.id = p_assessment_id
          AND public.fn_is_section_grading_locked(ai.section_id, gc.grading_period_id)
    );
$function$;

REVOKE ALL ON FUNCTION public.fn_is_assessment_grading_locked(uuid) FROM PUBLIC, anon, authenticated;

-- fn_grade_submission: #10 lock check
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
    v_old_raw_score   NUMERIC;
    v_old_final_score NUMERIC;
    v_old_feedback    TEXT;
    v_is_changed      BOOLEAN;
    v_assessment_id   UUID;
BEGIN
    SELECT asub.status::text, asub.raw_score, asub.final_score, asub.feedback, asub.assessment_item_id
    INTO v_status, v_old_raw_score, v_old_final_score, v_old_feedback, v_assessment_id
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

    -- Policy 7: scores in a period whose grades were submitted stay as they are
    IF public.fn_is_assessment_grading_locked(v_assessment_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so scores can no longer be changed. Ask the Registrar to return the grades to you first.');
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

    -- Only tell the student when this is the first grade or the score/feedback changed
    v_is_changed := v_status <> 'Graded'
        OR v_old_raw_score IS DISTINCT FROM v_total_score
        OR v_old_final_score IS DISTINCT FROM v_total_score
        OR v_old_feedback IS DISTINCT FROM NULLIF(p_feedback, '');

    IF v_student_user_id IS NOT NULL AND v_is_changed THEN
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

-- fn_grade_submission_rubric: #10 lock check, #6 score scaled to Total Points
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
    v_assessment_id   UUID;
    v_total_points    NUMERIC;
    v_rubric_max      NUMERIC;
    v_score           NUMERIC;
BEGIN
    SELECT ai.section_id, ai.title, e.id, st.user_id, asub.status::text, ai.id, ai.total_points
    INTO v_section_id, v_assessment_title, v_enrollment_id, v_student_user_id, v_status, v_assessment_id, v_total_points
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

    -- Policy 7: scores in a period whose grades were submitted stay as they are
    IF public.fn_is_assessment_grading_locked(v_assessment_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so scores can no longer be changed. Ask the Registrar to return the grades to you first.');
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

    -- Policy 6: the rubric score is scaled to the assessment's Total Points
    SELECT COALESCE(SUM(rc.max_points), 0) INTO v_rubric_max
    FROM public.rubric_criteria rc
    WHERE rc.rubric_id = v_rubric_id
      AND rc.deleted_at IS NULL;

    IF v_rubric_max > 0 AND COALESCE(v_total_points, 0) > 0 THEN
        v_score := ROUND(v_total / v_rubric_max * v_total_points, 2);
    ELSE
        v_score := v_total;
    END IF;

    UPDATE public.assessment_submissions
    SET
        raw_score   = v_score,
        final_score = v_score,
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
            format('Your submission for "%s" has been evaluated with rubric (Score: %s/%s pts).',
                v_assessment_title, trim_scale(v_score), trim_scale(COALESCE(v_total_points, v_rubric_max))),
            format('/student/subjects/%s', v_enrollment_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rubric evaluation saved successfully.',
        'raw_score', v_score,
        'total_score', v_score,
        'rubric_score', v_total,
        'rubric_max', v_rubric_max
    );
END;
$function$;

-- fn_delete_assessment: #10 lock check
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

    -- Policy 7: deleting it would drop its scores from a submitted grade
    IF public.fn_is_assessment_grading_locked(p_assessment_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so this assessment can no longer be deleted. Ask the Registrar to return the grades to you first.');
    END IF;

    UPDATE public.assessment_items
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment deleted successfully.');
END;
$function$;

-- fn_delete_grading_component: #11 refuse while assessments still use the component
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
    v_assessment_count  INTEGER;
    v_assessment_titles TEXT;
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

    -- Deleting it would silently drop these assessments' scores from the grade
    SELECT COUNT(*), string_agg(format('"%s"', t.title), ', ')
    INTO v_assessment_count, v_assessment_titles
    FROM (
        SELECT ai.title
        FROM public.assessment_items ai
        WHERE ai.grading_component_id = p_component_id
          AND ai.deleted_at IS NULL
        ORDER BY ai.created_at
    ) t;

    IF v_assessment_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format(
                '"%s" still has %s assessment(s): %s. Move them to another component or delete them first, so their scores are not dropped from the grade.',
                v_name, v_assessment_count, v_assessment_titles
            )
        );
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
$function$;

-- fn_update_assessment: #10 lock on Total Points / component moves, #27 published points must match
CREATE OR REPLACE FUNCTION public.fn_update_assessment(p_assessment_id uuid, p_title text, p_description text, p_assessment_type assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint, p_allow_student_review boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_published     BOOLEAN;
    v_problem          TEXT;
    v_is_live          BOOLEAN;
    v_old_total        NUMERIC;
    v_old_component_id UUID;
    v_question_points  NUMERIC;
    v_section_id       UUID;
    v_new_period_id    UUID;
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

    -- A scheduled publish makes the assessment visible without fn_publish_assessment, so the
    -- same checks run here before the time is saved
    SELECT
        ai.is_published,
        ai.is_published OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()),
        ai.total_points,
        ai.grading_component_id,
        ai.section_id
    INTO v_is_published, v_is_live, v_old_total, v_old_component_id, v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id;

    -- Policy 7: Total Points and the component decide how scores count, so they stay put
    -- while either the old or the new grading period has submitted grades
    IF p_total_points IS DISTINCT FROM v_old_total
       OR p_grading_component_id IS DISTINCT FROM v_old_component_id THEN
        SELECT gc.grading_period_id INTO v_new_period_id
        FROM public.grading_components gc
        WHERE gc.id = p_grading_component_id;

        IF public.fn_is_assessment_grading_locked(p_assessment_id)
           OR (v_new_period_id IS NOT NULL AND public.fn_is_section_grading_locked(v_section_id, v_new_period_id)) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so Total Points and the grading component can no longer be changed. Ask the Registrar to return the grades to you first.');
        END IF;
    END IF;

    -- #27: a published assessment's questions must keep adding up to Total Points
    IF COALESCE(v_is_live, false) AND p_total_points IS DISTINCT FROM v_old_total THEN
        SELECT COALESCE(SUM(aq.points), 0) INTO v_question_points
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL;

        IF v_question_points IS DISTINCT FROM p_total_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format(
                    'This assessment is already published and its questions add up to %s pts, so Total Points must stay %s pts. Unpublish it first to change the points.',
                    trim_scale(v_question_points), trim_scale(v_question_points)
                )
            );
        END IF;
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND NOT COALESCE(v_is_published, false) THEN
        v_problem := public.fn_assessment_publish_problem(p_assessment_id, p_total_points);
        IF v_problem IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Cannot schedule publishing: ' || v_problem
            );
        END IF;
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
$function$;

-- fn_upsert_question: #10 lock on re-scoring, #26 in-progress attempts and rubric scores,
-- #27 published points must match
CREATE OR REPLACE FUNCTION public.fn_upsert_question(p_assessment_id uuid, p_question_id uuid, p_question_text text, p_question_type question_type, p_points numeric, p_sequence smallint, p_explanation text, p_is_required boolean, p_allowed_file_types text[], p_max_file_size_mb integer, p_max_file_count smallint, p_choices jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_question_id      UUID;
    v_choice           JSONB;
    v_choice_id        UUID;
    v_sequence         SMALLINT := 1;
    v_kept_ids         UUID[] := ARRAY[]::UUID[];
    v_is_existing      BOOLEAN := false;
    v_old_points       NUMERIC;
    v_old_type         TEXT;
    v_old_correct      UUID[];
    v_new_correct      UUID[];
    v_is_objective     BOOLEAN;
    v_rescored         INTEGER := 0;
    v_message          TEXT := 'Question saved successfully.';
    v_is_live          BOOLEAN;
    v_total_points     NUMERIC;
    v_use_rubric       BOOLEAN;
    v_other_points     NUMERIC;
    v_intended_correct UUID[];
    v_has_new_correct  BOOLEAN := false;
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

    v_is_objective := p_question_type IN ('Multiple Choice', 'True or False', 'Matching');

    SELECT
        ai.is_published OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()),
        ai.total_points,
        COALESCE(ai.use_rubric_scoring, false)
    INTO v_is_live, v_total_points, v_use_rubric
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id;

    IF p_question_id IS NOT NULL THEN
        SELECT aq.points, aq.question_type::text INTO v_old_points, v_old_type
        FROM public.assessment_questions aq
        WHERE aq.id = p_question_id
          AND aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL;

        v_is_existing := FOUND;

        SELECT COALESCE(array_agg(c.id ORDER BY c.id), ARRAY[]::UUID[]) INTO v_old_correct
        FROM public.assessment_question_choices c
        WHERE c.question_id = p_question_id
          AND c.is_correct
          AND c.deleted_at IS NULL;
    END IF;

    -- #27: a published assessment's questions must keep adding up to Total Points
    IF COALESCE(v_is_live, false) AND (NOT v_is_existing OR p_points IS DISTINCT FROM v_old_points) THEN
        SELECT COALESCE(SUM(aq.points), 0) INTO v_other_points
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
          AND (NOT v_is_existing OR aq.id <> p_question_id);

        IF (v_other_points + COALESCE(p_points, 0)) IS DISTINCT FROM v_total_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format(
                    'This assessment is already published, so its questions must still add up to Total Points (%s pts). This change would make them %s pts. Unpublish the assessment first to change points.',
                    trim_scale(v_total_points), trim_scale(v_other_points + COALESCE(p_points, 0))
                )
            );
        END IF;
    END IF;

    -- Policy 7: no re-scoring once the period's grades were submitted
    IF v_is_existing AND public.fn_is_assessment_grading_locked(p_assessment_id) THEN
        IF v_is_objective AND p_choices IS NOT NULL THEN
            SELECT COALESCE(array_agg(c.id ORDER BY c.id), ARRAY[]::UUID[]) INTO v_intended_correct
            FROM jsonb_array_elements(p_choices) e
            INNER JOIN public.assessment_question_choices c
                ON c.id::text = e->>'id'
               AND c.question_id = p_question_id
               AND c.deleted_at IS NULL
            WHERE COALESCE((e->>'is_correct')::BOOLEAN, false);

            SELECT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(p_choices) e
                WHERE COALESCE((e->>'is_correct')::BOOLEAN, false)
                  AND NOT EXISTS (
                      SELECT 1 FROM public.assessment_question_choices c
                      WHERE c.id::text = e->>'id'
                        AND c.question_id = p_question_id
                        AND c.deleted_at IS NULL
                  )
            ) INTO v_has_new_correct;
        ELSE
            v_intended_correct := v_old_correct;
        END IF;

        IF p_points IS DISTINCT FROM v_old_points
           OR p_question_type::text IS DISTINCT FROM v_old_type
           OR v_has_new_correct
           OR v_intended_correct IS DISTINCT FROM v_old_correct THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so the points, type and answer key of this question can no longer be changed. Ask the Registrar to return the grades to you first.');
        END IF;
    END IF;

    IF v_is_existing THEN
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
    ELSIF p_question_id IS NOT NULL THEN
        -- Same as before: an id that is not one of this assessment's questions saves nothing
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

    IF p_choices IS NOT NULL AND v_is_objective THEN
        FOR v_choice IN SELECT * FROM jsonb_array_elements(p_choices)
        LOOP
            v_choice_id := NULL;

            -- Only reuse an id that already belongs to this question
            IF NULLIF(v_choice->>'id', '') IS NOT NULL THEN
                UPDATE public.assessment_question_choices
                SET
                    choice_text = trim(v_choice->>'choice_text'),
                    is_correct  = COALESCE((v_choice->>'is_correct')::BOOLEAN, false),
                    sequence    = v_sequence,
                    updated_at  = now(),
                    updated_by  = auth.uid()
                WHERE id = (v_choice->>'id')::UUID
                  AND question_id = v_question_id
                  AND deleted_at IS NULL
                RETURNING id INTO v_choice_id;
            END IF;

            IF v_choice_id IS NULL THEN
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
                )
                RETURNING id INTO v_choice_id;
            END IF;

            v_kept_ids := v_kept_ids || v_choice_id;
            v_sequence := v_sequence + 1;
        END LOOP;

        -- Remove only the choices that were taken out
        UPDATE public.assessment_question_choices
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE question_id = v_question_id
          AND deleted_at IS NULL
          AND NOT (id = ANY(v_kept_ids));
    END IF;

    -- Re-score saved answers when the answer key or the points changed. In-progress attempts
    -- are included, so their saved answers follow the new key when they are submitted.
    IF v_is_existing AND v_is_objective THEN
        SELECT COALESCE(array_agg(c.id ORDER BY c.id), ARRAY[]::UUID[]) INTO v_new_correct
        FROM public.assessment_question_choices c
        WHERE c.question_id = v_question_id
          AND c.is_correct
          AND c.deleted_at IS NULL;

        IF v_new_correct IS DISTINCT FROM v_old_correct OR p_points IS DISTINCT FROM v_old_points THEN
            WITH changed AS (
                UPDATE public.student_answers sa
                SET
                    is_correct    = s.is_correct,
                    points_earned = CASE WHEN s.is_correct THEN p_points ELSE 0 END,
                    updated_at    = now(),
                    updated_by    = auth.uid()
                FROM (
                    SELECT
                        sa2.id,
                        COALESCE(c.is_correct AND c.deleted_at IS NULL, false) AS is_correct
                    FROM public.student_answers sa2
                    INNER JOIN public.assessment_submissions asub
                        ON asub.id = sa2.submission_id
                        AND asub.deleted_at IS NULL
                    LEFT JOIN public.assessment_question_choices c ON c.id = sa2.choice_id
                    WHERE sa2.question_id = v_question_id
                      AND sa2.deleted_at IS NULL
                      -- An in-progress answer with no choice picked stays unscored
                      AND (sa2.choice_id IS NOT NULL OR asub.status NOT IN ('Not Started', 'In Progress'))
                ) s
                WHERE sa.id = s.id
                  AND (
                      sa.is_correct IS DISTINCT FROM s.is_correct
                      OR sa.points_earned IS DISTINCT FROM CASE WHEN s.is_correct THEN p_points ELSE 0 END
                  )
                RETURNING sa.submission_id
            ),
            totals AS (
                SELECT sa.submission_id, COALESCE(SUM(sa.points_earned), 0) AS total
                FROM public.student_answers sa
                WHERE sa.submission_id IN (SELECT DISTINCT submission_id FROM changed)
                  AND sa.deleted_at IS NULL
                  AND sa.question_id <> v_question_id
                GROUP BY sa.submission_id
            ),
            new_scores AS (
                -- The changed answers are not visible to this statement yet, so add them here
                SELECT
                    ch.submission_id,
                    COALESCE(t.total, 0) + (
                        SELECT COALESCE(SUM(CASE WHEN COALESCE(c.is_correct AND c.deleted_at IS NULL, false) THEN p_points ELSE 0 END), 0)
                        FROM public.student_answers sa
                        LEFT JOIN public.assessment_question_choices c ON c.id = sa.choice_id
                        WHERE sa.submission_id = ch.submission_id
                          AND sa.question_id = v_question_id
                          AND sa.deleted_at IS NULL
                    ) AS total
                FROM (SELECT DISTINCT submission_id FROM changed) ch
                LEFT JOIN totals t ON t.submission_id = ch.submission_id
            ),
            graded AS (
                -- A rubric-scored submission keeps its rubric score
                UPDATE public.assessment_submissions asub
                SET
                    raw_score   = ns.total,
                    final_score = ns.total,
                    updated_at  = now(),
                    updated_by  = auth.uid()
                FROM new_scores ns
                WHERE asub.id = ns.submission_id
                  AND asub.status = 'Graded'
                  AND NOT v_use_rubric
                RETURNING asub.id
            )
            SELECT COUNT(*) INTO v_rescored FROM (SELECT DISTINCT submission_id FROM changed) x;

            IF v_rescored > 0 THEN
                v_message := format('Question saved. %s attempt(s) were re-scored with the new answer key.', v_rescored);
            END IF;
        END IF;
    END IF;

    -- A future scheduled publish is removed when the questions no longer pass the publish checks
    IF public.fn_clear_unready_schedule(p_assessment_id) THEN
        v_message := v_message || ' The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_message,
        'id', v_question_id,
        'rescored_submissions', v_rescored
    );
END;
$function$;

-- fn_delete_question: #27 published points must match
CREATE OR REPLACE FUNCTION public.fn_delete_question(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_assessment_id   UUID;
    v_message         TEXT := 'Question deleted successfully.';
    v_is_live         BOOLEAN;
    v_total_points    NUMERIC;
    v_question_points NUMERIC;
    v_remaining       NUMERIC;
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

    SELECT
        ai.id,
        ai.is_published OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()),
        ai.total_points,
        aq.points
    INTO v_assessment_id, v_is_live, v_total_points, v_question_points
    FROM public.assessment_questions aq
    INNER JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id
    WHERE aq.id = p_question_id;

    -- #27: a published assessment's questions must keep adding up to Total Points
    IF COALESCE(v_is_live, false) THEN
        SELECT COALESCE(SUM(aq.points), 0) INTO v_remaining
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = v_assessment_id
          AND aq.deleted_at IS NULL
          AND aq.id <> p_question_id;

        IF v_remaining IS DISTINCT FROM v_total_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format(
                    'This assessment is already published, so its questions must still add up to Total Points (%s pts). Deleting this question would leave %s pts. Unpublish the assessment first.',
                    trim_scale(v_total_points), trim_scale(v_remaining)
                )
            );
        END IF;
    END IF;

    UPDATE public.assessment_question_choices
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE question_id = p_question_id AND deleted_at IS NULL;

    UPDATE public.assessment_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_question_id AND deleted_at IS NULL;

    IF public.fn_clear_unready_schedule(v_assessment_id) THEN
        v_message := v_message || ' The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object('success', true, 'message', v_message);
END;
$function$;

-- fn_bulk_import_questions: #27 no import into a published assessment; unready schedule cleared
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
    v_is_live         BOOLEAN;
    v_message         TEXT;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT section_id, is_published OR (scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= now())
    INTO v_section_id, v_is_live
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.', 'provisioned_count', 0, 'errors', '[]'::jsonb);
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can import questions.'
            USING ERRCODE = '42501';
    END IF;

    -- #27: new questions would no longer add up to Total Points on a published assessment
    IF COALESCE(v_is_live, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This assessment is already published, so its questions must still add up to Total Points. Unpublish it first, then import the questions and update Total Points.',
            'provisioned_count', 0,
            'errors', '[]'::jsonb
        );
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

    -- Same as the single-question functions: a future schedule that no longer passes is removed
    IF v_success_count > 0 AND public.fn_clear_unready_schedule(p_assessment_id) THEN
        v_message := 'The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'provisioned_count', v_success_count,
        'errors', v_errors
    ) || CASE WHEN v_message IS NOT NULL THEN jsonb_build_object('schedule_message', v_message) ELSE '{}'::jsonb END;
END;
$function$;

COMMIT;
