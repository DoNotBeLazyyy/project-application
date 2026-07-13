CREATE OR REPLACE FUNCTION public.fn_get_my_assessment_result(p_enrollment_id uuid, p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_student_id UUID;
    v_submission RECORD;
    v_item RECORD;
    v_results_available BOOLEAN;
    v_result JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = v_uid AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT ai.id, ai.title, ai.description, ai.assessment_type, ai.total_points,
           ai.passing_points, ai.show_results_at, ai.max_attempts
    INTO v_item
    FROM public.assessment_items ai
    INNER JOIN public.enrollments e ON e.section_id = ai.section_id
    WHERE ai.id = p_assessment_id
    AND e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND ai.deleted_at IS NULL
    AND e.deleted_at IS NULL;

    IF v_item.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    SELECT asub.id, asub.status, asub.attempt_number, asub.submitted_at, asub.graded_at,
           asub.is_late, asub.raw_score, asub.final_score, asub.feedback
    INTO v_submission
    FROM public.assessment_submissions asub
    WHERE asub.assessment_item_id = p_assessment_id
    AND asub.enrollment_id = p_enrollment_id
    AND asub.deleted_at IS NULL
    ORDER BY asub.attempt_number DESC
    LIMIT 1;

    IF v_submission.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No submission found for this assessment.');
    END IF;

    v_results_available := v_submission.status IN ('Graded', 'Returned')
        AND (v_item.show_results_at IS NULL OR v_item.show_results_at <= now());

    v_result := jsonb_build_object(
        'submission_id',      v_submission.id,
        'assessment_id',      v_item.id,
        'title',              v_item.title,
        'description',        v_item.description,
        'assessment_type',    v_item.assessment_type,
        'status',             v_submission.status,
        'attempt_number',     v_submission.attempt_number,
        'max_attempts',       v_item.max_attempts,
        'submitted_at',       v_submission.submitted_at,
        'graded_at',          v_submission.graded_at,
        'is_late',            v_submission.is_late,
        'total_points',       v_item.total_points,
        'passing_points',     v_item.passing_points,
        'show_results_at',    v_item.show_results_at,
        'results_available',  v_results_available,
        'raw_score',          CASE WHEN v_results_available THEN v_submission.raw_score ELSE NULL END,
        'final_score',        CASE WHEN v_results_available THEN v_submission.final_score ELSE NULL END,
        'feedback',           CASE WHEN v_results_available THEN v_submission.feedback ELSE NULL END,
        'answers', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',               aq.id,
                    'question_text',    aq.question_text,
                    'question_type',    aq.question_type,
                    'points',           aq.points,
                    'sequence',         aq.sequence,
                    'explanation',      CASE WHEN v_results_available THEN aq.explanation ELSE NULL END,
                    'answer_text',      sa.answer_text,
                    'choice_id',        sa.choice_id,
                    'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb),
                    'points_earned',    CASE WHEN v_results_available THEN sa.points_earned ELSE NULL END,
                    'is_correct',       CASE WHEN v_results_available THEN sa.is_correct ELSE NULL END,
                    'grader_notes',     CASE WHEN v_results_available THEN sa.grader_notes ELSE NULL END,
                    'choices', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',          aqc.id,
                                'choice_text', aqc.choice_text,
                                'sequence',    aqc.sequence,
                                'is_correct',  CASE WHEN v_results_available THEN aqc.is_correct ELSE NULL END
                            )
                            ORDER BY aqc.sequence ASC
                        ), '[]'::jsonb)
                        FROM public.assessment_question_choices aqc
                        WHERE aqc.question_id = aq.id AND aqc.deleted_at IS NULL
                    )
                )
                ORDER BY aq.sequence ASC
            ), '[]'::jsonb)
            FROM public.assessment_questions aq
            LEFT JOIN public.student_answers sa
                ON sa.question_id = aq.id
                AND sa.submission_id = v_submission.id
                AND sa.deleted_at IS NULL
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        )
    );

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_my_assessment_result(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_my_assessment_result(uuid, uuid) TO authenticated;