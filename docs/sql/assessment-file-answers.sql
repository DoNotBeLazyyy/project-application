CREATE OR REPLACE FUNCTION public.fn_save_student_answer_files(p_submission_id uuid, p_question_id uuid, p_files jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
    ON CONFLICT (submission_id, question_id)
    DO UPDATE SET
        file_attachments = COALESCE(p_files, '[]'::jsonb),
        answer_text = NULL,
        choice_id = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Files saved.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions_for_student(p_assessment_id uuid, p_enrollment_id uuid, p_submission_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id    UUID;
    v_shuffle_q     BOOLEAN;
    v_shuffle_c     BOOLEAN;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        INNER JOIN public.assessment_items ai ON ai.section_id = e.section_id
        WHERE e.id = p_enrollment_id
          AND e.student_id = v_student_id
          AND ai.id = p_assessment_id
          AND ai.is_published = true
          AND ai.deleted_at IS NULL
          AND e.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    SELECT shuffle_questions, shuffle_choices
    INTO v_shuffle_q, v_shuffle_c
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            aq.id,
                'question_text', aq.question_text,
                'question_type', aq.question_type,
                'points',        aq.points,
                'sequence',      aq.sequence,
                'is_required',   aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'saved_answer', (
                    SELECT jsonb_build_object(
                        'id',               sa.id,
                        'answer_text',      sa.answer_text,
                        'choice_id',        sa.choice_id,
                        'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb)
                    )
                    FROM public.student_answers sa
                    WHERE sa.question_id = aq.id
                      AND sa.submission_id = p_submission_id
                      AND sa.deleted_at IS NULL
                    LIMIT 1
                ),
                'choices', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          ac.id,
                            'choice_text', ac.choice_text,
                            'sequence',    ac.sequence
                        )
                        ORDER BY CASE WHEN v_shuffle_c THEN random() ELSE ac.sequence::float END
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY CASE WHEN v_shuffle_q THEN random() ELSE aq.sequence::float END
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_save_student_answer_files(uuid, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_save_student_answer_files(uuid, uuid, jsonb) TO authenticated;
