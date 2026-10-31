-- ====================================================================
-- Migration: 20261031230000_grading_shows_chosen_option.sql
--   * fn_get_submission_for_grading: multiple-choice and true/false answers are stored as a
--     choice id with no text, so the grading screen showed "No answer provided" for them.
--     answer_text now falls back to the text of the chosen option
-- Rollback: supabase/rollback/20261031230000_grading_shows_chosen_option.down.sql
-- ====================================================================
BEGIN;

-- fn_get_submission_for_grading
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
                    'answer_text',     COALESCE(sa.answer_text, (
                        SELECT aqc.choice_text
                        FROM public.assessment_question_choices aqc
                        WHERE aqc.id = sa.choice_id
                    )),
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
$function$;

COMMIT;
