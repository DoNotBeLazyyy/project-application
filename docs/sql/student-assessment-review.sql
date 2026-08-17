ALTER TABLE public.assessment_items
    ADD COLUMN IF NOT EXISTS allow_student_review boolean DEFAULT true NOT NULL;

DROP FUNCTION IF EXISTS public.fn_create_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint);
DROP FUNCTION IF EXISTS public.fn_update_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint);

CREATE OR REPLACE FUNCTION public.fn_create_assessment(
    p_section_id uuid,
    p_title text,
    p_description text,
    p_assessment_type public.assessment_type,
    p_grading_component_id uuid,
    p_total_points numeric,
    p_passing_points numeric,
    p_time_limit_minutes smallint,
    p_max_attempts smallint,
    p_opens_at timestamp with time zone,
    p_due_at timestamp with time zone,
    p_closes_at timestamp with time zone,
    p_show_results_at timestamp with time zone,
    p_scheduled_publish_at timestamp with time zone,
    p_shuffle_questions boolean,
    p_shuffle_choices boolean,
    p_show_all_questions boolean DEFAULT true,
    p_questions_per_page smallint DEFAULT NULL::smallint,
    p_allow_student_review boolean DEFAULT true
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
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

    RETURN jsonb_build_object('success', true, 'message', 'Assessment created successfully.', 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_assessment(
    p_assessment_id uuid,
    p_title text,
    p_description text,
    p_assessment_type public.assessment_type,
    p_grading_component_id uuid,
    p_total_points numeric,
    p_passing_points numeric,
    p_time_limit_minutes smallint,
    p_max_attempts smallint,
    p_opens_at timestamp with time zone,
    p_due_at timestamp with time zone,
    p_closes_at timestamp with time zone,
    p_show_results_at timestamp with time zone,
    p_scheduled_publish_at timestamp with time zone,
    p_shuffle_questions boolean,
    p_shuffle_choices boolean,
    p_show_all_questions boolean DEFAULT true,
    p_questions_per_page smallint DEFAULT NULL::smallint,
    p_allow_student_review boolean DEFAULT true
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_by_id(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',                   ai.id,
        'section_id',           ai.section_id,
        'grading_component_id', ai.grading_component_id,
        'title',                ai.title,
        'description',          ai.description,
        'assessment_type',      ai.assessment_type,
        'total_points',         ai.total_points,
        'passing_points',       ai.passing_points,
        'time_limit_minutes',   ai.time_limit_minutes,
        'max_attempts',         ai.max_attempts,
        'is_published',         ai.is_published,
        'opens_at',             ai.opens_at,
        'due_at',               ai.due_at,
        'closes_at',            ai.closes_at,
        'show_results_at',      ai.show_results_at,
        'scheduled_publish_at', ai.scheduled_publish_at,
        'shuffle_questions',    ai.shuffle_questions,
        'shuffle_choices',      ai.shuffle_choices,
        'show_all_questions',   ai.show_all_questions,
        'questions_per_page',   ai.questions_per_page,
        'allow_student_review', ai.allow_student_review
    )
    INTO v_result
    FROM public.assessment_items ai
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE ai.id = p_assessment_id
    AND s.faculty_id = auth.uid()
    AND ai.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;

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
    v_review_available BOOLEAN;
    v_review_blocked_reason TEXT := NULL;
    v_window_over BOOLEAN;
    v_rubric_id UUID;
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
           ai.passing_points, ai.show_results_at, ai.max_attempts, ai.use_rubric_scoring,
           ai.allow_student_review, ai.opens_at, ai.due_at, ai.closes_at,
           gp.name AS grading_period_name
    INTO v_item
    FROM public.assessment_items ai
    INNER JOIN public.enrollments e ON e.section_id = ai.section_id
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.id = p_assessment_id
    AND e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND ai.deleted_at IS NULL
    AND e.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

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

    v_window_over := (v_item.closes_at IS NOT NULL AND v_item.closes_at <= now())
        OR (v_item.closes_at IS NULL AND v_item.due_at IS NOT NULL AND v_item.due_at <= now());

    IF v_submission.id IS NULL THEN
        v_results_available := v_item.show_results_at IS NOT NULL AND v_item.show_results_at <= now();
    ELSE
        v_results_available := v_submission.status IN ('Graded', 'Returned')
            AND (v_item.show_results_at IS NULL OR v_item.show_results_at <= now());
    END IF;

    v_review_available := COALESCE(v_item.allow_student_review, true);

    IF NOT v_review_available THEN
        v_review_blocked_reason := 'Your instructor has turned off question review for this assessment.';
    ELSIF v_submission.id IS NOT NULL AND v_submission.status = 'In Progress' THEN
        v_review_available := false;
        v_review_blocked_reason := 'Finish and submit your current attempt to review this assessment.';
    ELSIF v_submission.id IS NULL AND NOT v_window_over THEN
        v_review_available := false;
        v_review_blocked_reason := 'Questions open for review once the assessment closes.';
    END IF;

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_item_rubrics air
    WHERE air.assessment_item_id = p_assessment_id AND air.deleted_at IS NULL
    LIMIT 1;

    v_result := jsonb_build_object(
        'submission_id',         v_submission.id,
        'assessment_id',         v_item.id,
        'title',                 v_item.title,
        'description',           v_item.description,
        'assessment_type',       v_item.assessment_type,
        'grading_period_name',   v_item.grading_period_name,
        'has_submission',        v_submission.id IS NOT NULL,
        'status',                v_submission.status,
        'attempt_number',        v_submission.attempt_number,
        'max_attempts',          v_item.max_attempts,
        'submitted_at',          v_submission.submitted_at,
        'graded_at',             v_submission.graded_at,
        'is_late',               COALESCE(v_submission.is_late, false),
        'total_points',          v_item.total_points,
        'passing_points',        v_item.passing_points,
        'question_count', (
            SELECT COUNT(*)
            FROM public.assessment_questions aq
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        ),
        'opens_at',              v_item.opens_at,
        'due_at',                v_item.due_at,
        'closes_at',             v_item.closes_at,
        'show_results_at',       v_item.show_results_at,
        'results_available',     v_results_available,
        'review_available',      v_review_available,
        'review_blocked_reason', v_review_blocked_reason,
        'use_rubric_scoring',    COALESCE(v_item.use_rubric_scoring, false),
        'raw_score',             CASE WHEN v_results_available THEN v_submission.raw_score ELSE NULL END,
        'final_score',           CASE WHEN v_results_available THEN v_submission.final_score ELSE NULL END,
        'feedback',              CASE WHEN v_results_available THEN v_submission.feedback ELSE NULL END,
        'attachments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              aa.id,
                    'file_name',       aa.file_name,
                    'file_url',        aa.file_url,
                    'file_size_bytes', aa.file_size_bytes,
                    'mime_type',       aa.mime_type,
                    'sequence',        aa.sequence
                )
                ORDER BY aa.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_attachments aa
            WHERE aa.assessment_item_id = p_assessment_id AND aa.deleted_at IS NULL
        ),
        'rubric', CASE WHEN v_rubric_id IS NULL OR NOT v_review_available THEN NULL ELSE (
            SELECT jsonb_build_object(
                'title',        r.title,
                'total_points', r.total_points,
                'criteria', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',            rc.id,
                            'title',         rc.title,
                            'description',   rc.description,
                            'max_points',    rc.max_points,
                            'sequence',      rc.sequence,
                            'points_earned', CASE WHEN v_results_available THEN re.points_earned ELSE NULL END,
                            'feedback',      CASE WHEN v_results_available THEN re.feedback ELSE NULL END
                        )
                        ORDER BY rc.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.rubric_criteria rc
                    LEFT JOIN public.rubric_evaluations re
                        ON re.criteria_id = rc.id
                        AND re.submission_id = v_submission.id
                        AND re.deleted_at IS NULL
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                )
            )
            FROM public.rubrics r
            WHERE r.id = v_rubric_id AND r.deleted_at IS NULL
        ) END,
        'answers', CASE WHEN NOT v_review_available THEN '[]'::JSONB ELSE (
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
        ) END
    );

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.fn_update_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.fn_get_assessment_by_id(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_get_my_assessment_result(uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_create_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_assessment_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_my_assessment_result(uuid, uuid) TO authenticated;