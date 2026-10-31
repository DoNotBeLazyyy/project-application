-- Rollback of 20261031220000_evaluation_submit_message: exact live definitions captured before apply
BEGIN;

-- fn_submit_evaluation
CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(p_enrollment_id uuid, p_grading_period_id uuid, p_responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS E'\r
DECLARE\r
    v_student_id UUID;\r
    v_template_ids UUID[];\r
    v_is_completed BOOLEAN;\r
    v_response JSONB;\r
    v_required_count INTEGER;\r
    v_answered_count INTEGER;\r
BEGIN\r
    SELECT id INTO v_student_id\r
    FROM public.students\r
    WHERE user_id = auth.uid() AND deleted_at IS NULL\r
    LIMIT 1;\r
\r
    IF v_student_id IS NULL THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Student profile not found.'');\r
    END IF;\r
\r
    IF NOT EXISTS (\r
        SELECT 1 FROM public.enrollments\r
        WHERE id = p_enrollment_id\r
        AND student_id = v_student_id\r
        AND deleted_at IS NULL\r
    ) THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Enrollment not found or access denied.'');\r
    END IF;\r
\r
    SELECT is_completed INTO v_is_completed\r
    FROM public.evaluation_period_locks\r
    WHERE enrollment_id = p_enrollment_id\r
    AND grading_period_id = p_grading_period_id\r
    AND deleted_at IS NULL\r
    LIMIT 1;\r
\r
    IF COALESCE(v_is_completed, false) THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''You have already completed this evaluation.'');\r
    END IF;\r
\r
    SELECT array_agg(t.id ORDER BY t.sequence ASC) INTO v_template_ids\r
    FROM public.fn_list_applicable_evaluation_templates(v_student_id) t;\r
\r
    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''No active evaluation form is available.'');\r
    END IF;\r
\r
    SELECT COUNT(*) INTO v_required_count\r
    FROM public.evaluation_questions\r
    WHERE template_id = ANY(v_template_ids)\r
    AND is_required = true\r
    AND deleted_at IS NULL;\r
\r
    SELECT COUNT(DISTINCT q.id) INTO v_answered_count\r
    FROM jsonb_array_elements(p_responses) r\r
    INNER JOIN public.evaluation_questions q\r
        ON q.id = (r->>''question_id'')::UUID\r
        AND q.template_id = ANY(v_template_ids)\r
        AND q.is_required = true\r
        AND q.deleted_at IS NULL\r
    WHERE COALESCE(NULLIF(btrim(COALESCE(r->>''response_text'', '''')), ''''), NULLIF(btrim(COALESCE(r->>''rating_value'', '''')), '''')) IS NOT NULL;\r
\r
    IF v_answered_count < v_required_count THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Please answer all required questions before submitting.'');\r
    END IF;\r
\r
    INSERT INTO public.evaluation_period_locks (\r
        enrollment_id, grading_period_id, template_id, template_ids,\r
        is_completed, completed_at, created_by\r
    )\r
    VALUES (\r
        p_enrollment_id, p_grading_period_id, v_template_ids[1], v_template_ids,\r
        true, now(), auth.uid()\r
    )\r
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL\r
    DO UPDATE SET\r
        template_id  = EXCLUDED.template_id,\r
        template_ids = EXCLUDED.template_ids,\r
        is_completed = true,\r
        completed_at = now(),\r
        updated_by   = auth.uid();\r
\r
    UPDATE public.evaluation_responses\r
    SET deleted_at = now(), deleted_by = auth.uid()\r
    WHERE enrollment_id = p_enrollment_id\r
    AND grading_period_id = p_grading_period_id\r
    AND deleted_at IS NULL;\r
\r
    FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)\r
    LOOP\r
        IF EXISTS (\r
            SELECT 1 FROM public.evaluation_questions\r
            WHERE id = (v_response->>''question_id'')::UUID\r
            AND template_id = ANY(v_template_ids)\r
            AND deleted_at IS NULL\r
        ) THEN\r
            INSERT INTO public.evaluation_responses (\r
                question_id, enrollment_id, grading_period_id, rating_value, response_text, created_by\r
            )\r
            VALUES (\r
                (v_response->>''question_id'')::UUID,\r
                p_enrollment_id,\r
                p_grading_period_id,\r
                NULLIF(btrim(COALESCE(v_response->>''rating_value'', '''')), '''')::SMALLINT,\r
                NULLIF(btrim(COALESCE(v_response->>''response_text'', '''')), ''''),\r
                auth.uid()\r
            );\r
        END IF;\r
    END LOOP;\r
\r
    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, p_grading_period_id);\r
\r
    RETURN jsonb_build_object(''success'', true, ''message'', ''Evaluation submitted. Your grade is now available.'');\r
END;\r
';

COMMIT;
