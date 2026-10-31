-- ====================================================================
-- Migration: 20261031220000_evaluation_submit_message.sql
--   * fn_submit_evaluation: always answered "Your grade is now available", even when no grade
--     had been released yet. The message now depends on whether a released grade exists
-- Rollback: supabase/rollback/20261031220000_evaluation_submit_message.down.sql
-- ====================================================================
BEGIN;

-- fn_submit_evaluation
CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(p_enrollment_id uuid, p_grading_period_id uuid, p_responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_student_id UUID;
    v_template_ids UUID[];
    v_is_completed BOOLEAN;
    v_response JSONB;
    v_required_count INTEGER;
    v_answered_count INTEGER;
BEGIN
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

    SELECT is_completed INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
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

    INSERT INTO public.evaluation_period_locks (
        enrollment_id, grading_period_id, template_id, template_ids,
        is_completed, completed_at, created_by
    )
    VALUES (
        p_enrollment_id, p_grading_period_id, v_template_ids[1], v_template_ids,
        true, now(), auth.uid()
    )
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        template_id  = EXCLUDED.template_id,
        template_ids = EXCLUDED.template_ids,
        is_completed = true,
        completed_at = now(),
        updated_by   = auth.uid();

    UPDATE public.evaluation_responses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
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
                p_grading_period_id,
                NULLIF(btrim(COALESCE(v_response->>'rating_value', '')), '')::SMALLINT,
                NULLIF(btrim(COALESCE(v_response->>'response_text', '')), ''),
                auth.uid()
            );
        END IF;
    END LOOP;

    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, p_grading_period_id);

    IF EXISTS (
        SELECT 1 FROM public.section_final_grades sfg
        WHERE sfg.enrollment_id = p_enrollment_id
          AND sfg.status = 'Released'
          AND sfg.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Evaluation submitted. Your released grade is now visible in My Grades.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation submitted. Your grade will appear in My Grades once it is released.');
END;
$function$;

COMMIT;
