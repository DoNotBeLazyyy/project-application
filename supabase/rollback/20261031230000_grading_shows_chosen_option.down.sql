-- Rollback of 20261031230000_grading_shows_chosen_option: exact live definitions captured before apply
BEGIN;

-- fn_get_submission_for_grading
CREATE OR REPLACE FUNCTION public.fn_get_submission_for_grading(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS E'\r
DECLARE\r
    v_result JSONB;\r
BEGIN\r
    SELECT jsonb_build_object(\r
        ''id'',            asub.id,\r
        ''enrollment_id'', asub.enrollment_id,\r
        ''status'',        asub.status,\r
        ''raw_score'',     asub.raw_score,\r
        ''final_score'',   asub.final_score,\r
        ''feedback'',      asub.feedback,\r
        ''use_rubric_scoring'', ai.use_rubric_scoring,\r
        ''answers'', (\r
            SELECT COALESCE(jsonb_agg(\r
                jsonb_build_object(\r
                    ''id'',              sa.id,\r
                    ''question_id'',     sa.question_id,\r
                    ''question_text'',   aq.question_text,\r
                    ''question_type'',   aq.question_type,\r
                    ''points'',          aq.points,\r
                    ''sequence'',        aq.sequence,\r
                    ''answer_text'',     sa.answer_text,\r
                    ''choice_id'',       sa.choice_id,\r
                    ''points_earned'',   sa.points_earned,\r
                    ''is_correct'',      sa.is_correct,\r
                    ''grader_notes'',    sa.grader_notes,\r
                    ''file_attachments'', sa.file_attachments\r
                )\r
                ORDER BY aq.sequence ASC\r
            ), ''[]''::JSONB)\r
            FROM public.student_answers sa\r
            INNER JOIN public.assessment_questions aq\r
                ON aq.id = sa.question_id AND aq.deleted_at IS NULL\r
            WHERE sa.submission_id = asub.id\r
            AND sa.deleted_at IS NULL\r
        )\r
    )\r
    INTO v_result\r
    FROM public.assessment_submissions asub\r
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id\r
    INNER JOIN public.sections s ON s.id = ai.section_id\r
    WHERE asub.id = p_submission_id\r
    AND s.faculty_id = auth.uid()\r
    AND asub.deleted_at IS NULL;\r
\r
    IF v_result IS NULL THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Submission not found or access denied.'');\r
    END IF;\r
\r
    RETURN v_result;\r
END;\r
';

COMMIT;
