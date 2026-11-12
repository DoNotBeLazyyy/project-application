-- ====================================================================
-- Migration: 20261104041000_student_answer_upsert_partial_index.sql
--   * fn_save_student_answer, fn_save_student_answer_files: the ON CONFLICT target now
--     names the predicate of the partial unique index uidx_student_answers_submission_question
--     (WHERE deleted_at IS NULL). Without it Postgres can only use the full constraint
--     uq_student_answers (added in 20261002030000); a database that has only the partial
--     index rejects every save with "no unique or exclusion constraint matching". With the
--     predicate both kinds of index match, so saving works either way. A matched row is also
--     un-deleted so a saved answer never stays hidden.
--   Bodies copied from the latest definitions (20260101000000_baseline_schema.sql).
--   Signatures and grants unchanged.
-- ====================================================================
BEGIN;

-- fn_save_student_answer
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
    ON CONFLICT (submission_id, question_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        deleted_at    = NULL,
        updated_at    = now(),
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
$function$;

-- fn_save_student_answer_files
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
    ON CONFLICT (submission_id, question_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        deleted_at = NULL,
        updated_at = now(),
        file_attachments = COALESCE(p_files, '[]'::jsonb),
        answer_text = NULL,
        choice_id = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Files saved.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

COMMIT;
