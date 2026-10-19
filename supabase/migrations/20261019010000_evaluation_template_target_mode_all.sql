-- Migration: 20261019010000_evaluation_template_target_mode_all.sql
-- Description: Support 'ALL' target mode for evaluation templates, ensuring templates can target all programs without selecting any programs.

-- 0. Update check constraint on evaluation_templates
ALTER TABLE public.evaluation_templates DROP CONSTRAINT IF EXISTS evaluation_templates_target_mode_check;
ALTER TABLE public.evaluation_templates ADD CONSTRAINT evaluation_templates_target_mode_check CHECK (target_mode = ANY (ARRAY['ALL'::text, 'INCLUDE'::text, 'EXCLUDE'::text]));

-- 1. fn_create_evaluation_template
CREATE OR REPLACE FUNCTION public.fn_create_evaluation_template(
    p_title text,
    p_description text,
    p_is_active boolean,
    p_sequence smallint,
    p_program_ids uuid[],
    p_questions jsonb,
    p_target_mode text DEFAULT 'ALL'::text,
    p_suggestion_placeholder text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_error TEXT;
    v_template_id UUID;
    v_mode TEXT;
    v_target_programs UUID[];
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'ALL'));
    IF v_mode NOT IN ('ALL', 'INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be ALL, INCLUDE, or EXCLUDE.');
    END IF;

    IF v_mode = 'ALL' THEN
        v_target_programs := NULL;
    ELSE
        v_target_programs := p_program_ids;
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    IF v_target_programs IS NOT NULL AND array_length(v_target_programs, 1) > 0 THEN
        v_error := public.fn_validate_evaluation_programs(v_target_programs);
        IF v_error IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'message', v_error);
        END IF;
    END IF;

    INSERT INTO public.evaluation_templates (
        title, description, is_active, sequence, target_mode, suggestion_placeholder, created_by
    )
    VALUES (
        btrim(p_title),
        NULLIF(btrim(COALESCE(p_description, '')), ''),
        COALESCE(p_is_active, true),
        GREATEST(COALESCE(p_sequence, 1), 1),
        v_mode,
        NULLIF(btrim(COALESCE(p_suggestion_placeholder, '')), ''),
        auth.uid()
    )
    RETURNING id INTO v_template_id;

    PERFORM public.fn_insert_evaluation_questions(v_template_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(v_template_id, v_target_programs);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section created successfully.', 'id', v_template_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_evaluation_template(text, text, boolean, smallint, uuid[], jsonb, text, text) TO authenticated, service_role;

-- 2. fn_update_evaluation_template
CREATE OR REPLACE FUNCTION public.fn_update_evaluation_template(
    p_id uuid,
    p_title text,
    p_description text,
    p_is_active boolean,
    p_sequence smallint,
    p_program_ids uuid[],
    p_questions jsonb,
    p_target_mode text DEFAULT 'ALL'::text,
    p_suggestion_placeholder text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_error TEXT;
    v_mode TEXT;
    v_target_programs UUID[];
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'ALL'));
    IF v_mode NOT IN ('ALL', 'INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be ALL, INCLUDE, or EXCLUDE.');
    END IF;

    IF v_mode = 'ALL' THEN
        v_target_programs := NULL;
    ELSE
        v_target_programs := p_program_ids;
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    IF v_target_programs IS NOT NULL AND array_length(v_target_programs, 1) > 0 THEN
        v_error := public.fn_validate_evaluation_programs(v_target_programs);
        IF v_error IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'message', v_error);
        END IF;
    END IF;

    UPDATE public.evaluation_templates
    SET
        title                  = btrim(p_title),
        description            = NULLIF(btrim(COALESCE(p_description, '')), ''),
        is_active              = COALESCE(p_is_active, true),
        sequence               = GREATEST(COALESCE(p_sequence, 1), 1),
        target_mode            = v_mode,
        suggestion_placeholder = NULLIF(btrim(COALESCE(p_suggestion_placeholder, '')), ''),
        updated_by             = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    PERFORM public.fn_insert_evaluation_questions(p_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(p_id, v_target_programs);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section updated successfully.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_evaluation_template(uuid, text, text, boolean, smallint, uuid[], jsonb, text, text) TO authenticated, service_role;

-- 3. fn_list_applicable_evaluation_templates
CREATE OR REPLACE FUNCTION public.fn_list_applicable_evaluation_templates(p_student_id uuid)
 RETURNS TABLE(id uuid, title text, description text, sequence smallint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT t.id, t.title, t.description, t.sequence
    FROM public.evaluation_templates t
    WHERE t.is_active = true
    AND t.deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.evaluation_questions q
        WHERE q.template_id = t.id AND q.deleted_at IS NULL
    )
    AND (
        COALESCE(t.target_mode, 'ALL') = 'ALL'
        OR NOT EXISTS (
            SELECT 1 FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        )
        OR (
            t.target_mode = 'INCLUDE'
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
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_applicable_evaluation_templates(uuid) TO authenticated, service_role;

-- 4. Update fn_get_evaluation_template_by_id
CREATE OR REPLACE FUNCTION public.fn_get_evaluation_template_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT jsonb_build_object(
        'id',                     t.id,
        'title',                  t.title,
        'description',            t.description,
        'is_active',              t.is_active,
        'sequence',               t.sequence,
        'target_mode',            COALESCE(t.target_mode, 'ALL'),
        'suggestion_placeholder', t.suggestion_placeholder,
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
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_evaluation_template_by_id(uuid) TO authenticated, service_role;

-- 5. Update fn_list_evaluation_templates_json
CREATE OR REPLACE FUNCTION public.fn_list_evaluation_templates_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 10,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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
            COALESCE(t.target_mode, ''ALL'') AS target_mode,
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
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_evaluation_templates_json(integer, integer, text, jsonb) TO authenticated, service_role;
