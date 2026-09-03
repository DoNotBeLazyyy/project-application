ALTER TABLE public.evaluation_templates
    ADD COLUMN IF NOT EXISTS target_mode TEXT NOT NULL DEFAULT 'INCLUDE';

DO $$
BEGIN
    ALTER TABLE public.evaluation_templates
        ADD CONSTRAINT evaluation_templates_target_mode_check
        CHECK (target_mode IN ('INCLUDE', 'EXCLUDE'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.fn_list_applicable_evaluation_templates(p_student_id uuid)
RETURNS TABLE (id uuid, title text, description text, sequence smallint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT t.id, t.title, t.description, t.sequence
    FROM public.evaluation_templates t
    WHERE t.is_active = true
    AND t.deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.evaluation_questions q
        WHERE q.template_id = t.id AND q.deleted_at IS NULL
    )
    AND (
        NOT EXISTS (
            SELECT 1 FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        )
        OR (
            COALESCE(t.target_mode, 'INCLUDE') = 'INCLUDE'
            AND EXISTS (
                SELECT 1
                FROM public.evaluation_template_programs tp
                INNER JOIN public.students s
                    ON s.id = p_student_id
                    AND s.deleted_at IS NULL
                    AND s.program_id = tp.program_id
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            )
        )
        OR (
            t.target_mode = 'EXCLUDE'
            AND NOT EXISTS (
                SELECT 1
                FROM public.evaluation_template_programs tp
                INNER JOIN public.students s
                    ON s.id = p_student_id
                    AND s.deleted_at IS NULL
                    AND s.program_id = tp.program_id
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            )
        )
    )
    ORDER BY t.sequence ASC, t.created_at ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_applicable_evaluation_templates(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_create_evaluation_template(
    p_title text,
    p_description text,
    p_is_active boolean,
    p_sequence smallint,
    p_program_ids uuid[],
    p_questions jsonb,
    p_target_mode text DEFAULT 'INCLUDE'
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error TEXT;
    v_template_id UUID;
    v_mode TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'INCLUDE'));
    IF v_mode NOT IN ('INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be INCLUDE or EXCLUDE.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    v_error := public.fn_validate_evaluation_programs(p_program_ids);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    INSERT INTO public.evaluation_templates (title, description, is_active, sequence, target_mode, created_by)
    VALUES (
        btrim(p_title),
        NULLIF(btrim(COALESCE(p_description, '')), ''),
        COALESCE(p_is_active, true),
        GREATEST(COALESCE(p_sequence, 1), 1),
        v_mode,
        auth.uid()
    )
    RETURNING id INTO v_template_id;

    PERFORM public.fn_insert_evaluation_questions(v_template_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(v_template_id, p_program_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section created successfully.', 'id', v_template_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_evaluation_template(
    p_id uuid,
    p_title text,
    p_description text,
    p_is_active boolean,
    p_sequence smallint,
    p_program_ids uuid[],
    p_questions jsonb,
    p_target_mode text DEFAULT 'INCLUDE'
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error TEXT;
    v_mode TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND id <> p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'INCLUDE'));
    IF v_mode NOT IN ('INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be INCLUDE or EXCLUDE.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    v_error := public.fn_validate_evaluation_programs(p_program_ids);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    UPDATE public.evaluation_templates
    SET
        title       = btrim(p_title),
        description = NULLIF(btrim(COALESCE(p_description, '')), ''),
        is_active   = COALESCE(p_is_active, true),
        sequence    = GREATEST(COALESCE(p_sequence, 1), 1),
        target_mode = v_mode,
        updated_by  = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    PERFORM public.fn_insert_evaluation_questions(p_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(p_id, p_program_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_template_by_id(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id',          t.id,
        'title',       t.title,
        'description', t.description,
        'is_active',   t.is_active,
        'sequence',    t.sequence,
        'target_mode', COALESCE(t.target_mode, 'INCLUDE'),
        'program_ids', COALESCE((
            SELECT jsonb_agg(tp.program_id)
            FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        ), '[]'::JSONB),
        'questions', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id',            q.id,
                    'question_text', q.question_text,
                    'question_type', q.question_type,
                    'sequence',      q.sequence,
                    'is_required',   q.is_required,
                    'min_rating',    q.min_rating,
                    'max_rating',    q.max_rating
                )
                ORDER BY q.sequence ASC
            )
            FROM public.evaluation_questions q
            WHERE q.template_id = t.id AND q.deleted_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.evaluation_templates t
    WHERE t.id = p_id AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_evaluation_templates_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (t.title ILIKE %L OR t.description ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.title,
            t.description,
            t.is_active,
            t.sequence,
            COALESCE(t.target_mode, ''INCLUDE'') AS target_mode,
            COALESCE((
                SELECT jsonb_agg(tp.program_id)
                FROM public.evaluation_template_programs tp
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            ), ''[]''::JSONB) AS program_ids,
            (
                SELECT count(*)
                FROM public.evaluation_questions q
                WHERE q.template_id = t.id AND q.deleted_at IS NULL
            ) AS question_count,
            COUNT(*) OVER() AS total_count
        FROM public.evaluation_templates t
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.sequence ASC, t.created_at ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_templates() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',          t.id,
                'title',       t.title,
                'description', t.description,
                'is_active',   t.is_active,
                'sequence',    t.sequence,
                'target_mode', COALESCE(t.target_mode, 'INCLUDE'),
                'program_ids', COALESCE((
                    SELECT jsonb_agg(tp.program_id)
                    FROM public.evaluation_template_programs tp
                    WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
                ), '[]'::JSONB),
                'questions', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id',            q.id,
                            'question_text', q.question_text,
                            'question_type', q.question_type,
                            'sequence',      q.sequence,
                            'is_required',   q.is_required,
                            'min_rating',    q.min_rating,
                            'max_rating',    q.max_rating
                        )
                        ORDER BY q.sequence ASC
                    )
                    FROM public.evaluation_questions q
                    WHERE q.template_id = t.id AND q.deleted_at IS NULL
                ), '[]'::JSONB)
            )
            ORDER BY t.sequence ASC, t.created_at ASC
        )
        FROM public.evaluation_templates t
        WHERE t.deleted_at IS NULL
    ), '[]'::JSONB);
END;
$$;

DO $$
DECLARE
    r RECORD;
    v_fns TEXT[] := ARRAY[
        'fn_list_applicable_evaluation_templates',
        'fn_create_evaluation_template',
        'fn_update_evaluation_template',
        'fn_get_evaluation_template_by_id',
        'fn_list_evaluation_templates_json',
        'fn_get_evaluation_templates'
    ];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY(v_fns)
    LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', r.sig);
    END LOOP;
END $$;

