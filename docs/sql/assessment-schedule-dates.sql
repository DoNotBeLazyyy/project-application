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
    p_questions_per_page smallint DEFAULT NULL::smallint
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
        is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, p_title, NULLIF(p_description, ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, p_scheduled_publish_at,
        COALESCE(p_shuffle_questions, false), COALESCE(p_shuffle_choices, false),
        COALESCE(p_show_all_questions, true),
        CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
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
    p_questions_per_page smallint DEFAULT NULL::smallint
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
        questions_per_page   = CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment updated successfully.');
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.fn_update_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_create_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, boolean, boolean, boolean, smallint) TO authenticated;