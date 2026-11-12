-- Scheduled publish uses the same checks as Publish
-- An assessment with scheduled_publish_at <= now() is shown to students by every student-side
-- query, without the checks fn_publish_assessment does (has questions, question points add up
-- to Total Points). Rather than repeat the checks in each of those queries, a schedule is now
-- only stored when it would pass them:
--   * fn_assessment_publish_problem (new, internal): returns why an assessment cannot be
--     published, or NULL when it can. Same rules as fn_publish_assessment.
--   * fn_create_assessment: the new (empty) draft never stores a schedule; the builder's final
--     save (fn_update_assessment) stores it once the questions are in.
--   * fn_update_assessment: refuses a scheduled publish time on an unpublished assessment
--     that would fail the checks.
--   * fn_clear_unready_schedule (new, internal): removes a future schedule from an unpublished
--     assessment whose questions no longer pass; used after a question is saved or deleted.
--   * fn_delete_question: uses it and says so in its reply.
-- fn_upsert_question uses fn_clear_unready_schedule too (20261106011000).
-- Signatures of existing functions are unchanged, so grants stay in place.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_assessment_publish_problem(p_assessment_id uuid, p_total_points numeric DEFAULT NULL::numeric)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_points    NUMERIC;
    v_question_points NUMERIC;
    v_question_count  INTEGER;
BEGIN
    SELECT COALESCE(p_total_points, ai.total_points) INTO v_total_points
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id;

    SELECT COUNT(*), COALESCE(SUM(aq.points), 0)
    INTO v_question_count, v_question_points
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = p_assessment_id
      AND aq.deleted_at IS NULL;

    IF v_question_count = 0 THEN
        RETURN 'the assessment has no questions yet. Add questions first.';
    END IF;

    IF v_question_points IS DISTINCT FROM v_total_points THEN
        RETURN format(
            'the questions add up to %s pts but Total Points is %s pts. Make them match in the builder (or use "Sync") first.',
            trim_scale(v_question_points), trim_scale(v_total_points)
        );
    END IF;

    RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_assessment_publish_problem(uuid, numeric) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_clear_unready_schedule(p_assessment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_assessment_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE public.assessment_items ai
    SET scheduled_publish_at = NULL,
        updated_at = now()
    WHERE ai.id = p_assessment_id
      AND ai.deleted_at IS NULL
      AND NOT ai.is_published
      AND ai.scheduled_publish_at IS NOT NULL
      AND ai.scheduled_publish_at > now()
      AND public.fn_assessment_publish_problem(ai.id) IS NOT NULL;

    RETURN FOUND;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_clear_unready_schedule(uuid) FROM PUBLIC, anon, authenticated;

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
    -- The scheduled publish time is not stored yet: the draft has no questions, so it would
    -- appear to students empty. It is saved by fn_update_assessment once the questions are in.
    INSERT INTO public.assessment_items (
        section_id, grading_component_id, title, description, assessment_type,
        total_points, passing_points, time_limit_minutes, max_attempts,
        opens_at, due_at, closes_at, show_results_at, scheduled_publish_at,
        shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
        allow_student_review, is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, p_title, NULLIF(p_description, ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, NULL,
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

-- fn_update_assessment
CREATE OR REPLACE FUNCTION public.fn_update_assessment(p_assessment_id uuid, p_title text, p_description text, p_assessment_type assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint, p_allow_student_review boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_published BOOLEAN;
    v_problem      TEXT;
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
    SELECT ai.is_published INTO v_is_published
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id;

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

-- fn_delete_question
CREATE OR REPLACE FUNCTION public.fn_delete_question(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_assessment_id UUID;
    v_message       TEXT := 'Question deleted successfully.';
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

    SELECT assessment_item_id INTO v_assessment_id
    FROM public.assessment_questions
    WHERE id = p_question_id;

    IF public.fn_clear_unready_schedule(v_assessment_id) THEN
        v_message := v_message || ' The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object('success', true, 'message', v_message);
END;
$function$;

COMMIT;