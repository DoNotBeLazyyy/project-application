CREATE TABLE IF NOT EXISTS public.competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs (id) ON DELETE RESTRICT,
    course_id UUID REFERENCES public.courses (id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    bloom_level TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_competencies_scope CHECK (program_id IS NOT NULL OR course_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_competencies_course_code
    ON public.competencies (course_id, code)
    WHERE deleted_at IS NULL AND course_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_competencies_program_code
    ON public.competencies (program_id, code)
    WHERE deleted_at IS NULL AND course_id IS NULL;

ALTER TABLE public.competencies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_competencies_updated_audit ON public.competencies;
CREATE TRIGGER trg_competencies_updated_audit
    BEFORE UPDATE ON public.competencies
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "competencies_select" ON public.competencies;
CREATE POLICY "competencies_select"
    ON public.competencies
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "competencies_insert" ON public.competencies;
CREATE POLICY "competencies_insert"
    ON public.competencies
    FOR INSERT
    TO authenticated
    WITH CHECK ('Dean' = ANY (public.fn_current_user_role_codes()));

DROP POLICY IF EXISTS "competencies_update" ON public.competencies;
CREATE POLICY "competencies_update"
    ON public.competencies
    FOR UPDATE
    TO authenticated
    USING ('Dean' = ANY (public.fn_current_user_role_codes()))
    WITH CHECK ('Dean' = ANY (public.fn_current_user_role_codes()));

CREATE TABLE IF NOT EXISTS public.assessment_question_competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.assessment_questions (id) ON DELETE RESTRICT,
    competency_id UUID NOT NULL REFERENCES public.competencies (id) ON DELETE RESTRICT,
    weight NUMERIC(5,2) NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_aqc_weight CHECK (weight > 0 AND weight <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_aqc_question_competency
    ON public.assessment_question_competencies (question_id, competency_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_aqc_competency
    ON public.assessment_question_competencies (competency_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.assessment_question_competencies ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_aqc_updated_audit ON public.assessment_question_competencies;
CREATE TRIGGER trg_aqc_updated_audit
    BEFORE UPDATE ON public.assessment_question_competencies
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "aqc_select" ON public.assessment_question_competencies;
CREATE POLICY "aqc_select"
    ON public.assessment_question_competencies
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "aqc_insert" ON public.assessment_question_competencies;
CREATE POLICY "aqc_insert"
    ON public.assessment_question_competencies
    FOR INSERT
    TO authenticated
    WITH CHECK ('Faculty' = ANY (public.fn_current_user_role_codes()));

DROP POLICY IF EXISTS "aqc_update" ON public.assessment_question_competencies;
CREATE POLICY "aqc_update"
    ON public.assessment_question_competencies
    FOR UPDATE
    TO authenticated
    USING ('Faculty' = ANY (public.fn_current_user_role_codes()))
    WITH CHECK ('Faculty' = ANY (public.fn_current_user_role_codes()));

CREATE TABLE IF NOT EXISTS public.competency_alignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competency_id UUID NOT NULL REFERENCES public.competencies (id) ON DELETE RESTRICT,
    parent_competency_id UUID NOT NULL REFERENCES public.competencies (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_alignment_distinct CHECK (competency_id <> parent_competency_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_competency_alignment_pair
    ON public.competency_alignments (competency_id, parent_competency_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.competency_alignments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_competency_alignments_updated_audit ON public.competency_alignments;
CREATE TRIGGER trg_competency_alignments_updated_audit
    BEFORE UPDATE ON public.competency_alignments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "competency_alignments_select" ON public.competency_alignments;
CREATE POLICY "competency_alignments_select"
    ON public.competency_alignments
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "competency_alignments_insert" ON public.competency_alignments;
CREATE POLICY "competency_alignments_insert"
    ON public.competency_alignments
    FOR INSERT
    TO authenticated
    WITH CHECK ('Dean' = ANY (public.fn_current_user_role_codes()));

DROP POLICY IF EXISTS "competency_alignments_update" ON public.competency_alignments;
CREATE POLICY "competency_alignments_update"
    ON public.competency_alignments
    FOR UPDATE
    TO authenticated
    USING ('Dean' = ANY (public.fn_current_user_role_codes()))
    WITH CHECK ('Dean' = ANY (public.fn_current_user_role_codes()));

CREATE OR REPLACE FUNCTION public.fn_list_competencies_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_program_ids uuid[] DEFAULT NULL::uuid[], p_course_ids uuid[] DEFAULT NULL::uuid[], p_scope text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE cm.deleted_at IS NULL';
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (cm.code ILIKE %L OR cm.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND cm.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND cm.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_scope = 'Course' THEN
        v_where := v_where || ' AND cm.course_id IS NOT NULL';
    ELSIF p_scope = 'Program' THEN
        v_where := v_where || ' AND cm.course_id IS NULL';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND cm.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            cm.id,
            cm.program_id,
            p.code AS program_code,
            p.name AS program_name,
            cm.course_id,
            c.code AS course_code,
            c.title AS course_title,
            CASE WHEN cm.course_id IS NOT NULL THEN ''Course'' ELSE ''Program'' END AS scope,
            cm.code,
            cm.title,
            cm.description,
            cm.bloom_level,
            cm.sort_order,
            cm.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.competencies cm
        LEFT JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
        LEFT JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'cm.code ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_competency_by_id(p_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', cm.id,
        'program_id', cm.program_id,
        'program_code', p.code,
        'program_name', p.name,
        'course_id', cm.course_id,
        'course_code', c.code,
        'course_title', c.title,
        'scope', CASE WHEN cm.course_id IS NOT NULL THEN 'Course' ELSE 'Program' END,
        'code', cm.code,
        'title', cm.title,
        'description', cm.description,
        'bloom_level', cm.bloom_level,
        'sort_order', cm.sort_order,
        'is_active', cm.is_active
    )
    INTO v_result
    FROM public.competencies cm
    LEFT JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
    LEFT JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
    WHERE cm.id = p_id
      AND cm.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_course_competencies(p_course_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.sort_order, t.code), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            cm.id,
            cm.code,
            cm.title,
            cm.description,
            cm.bloom_level,
            cm.sort_order
        FROM public.competencies cm
        WHERE cm.course_id = p_course_id
          AND cm.is_active
          AND cm.deleted_at IS NULL
    ) t;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_competency(p_program_id uuid, p_course_id uuid, p_code text, p_title text, p_description text DEFAULT NULL::text, p_bloom_level text DEFAULT NULL::text, p_sort_order integer DEFAULT 0)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF p_program_id IS NULL AND p_course_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'A competency must be tied to a program or a course.');
    END IF;

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency code is required.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency title is required.');
    END IF;

    INSERT INTO public.competencies (program_id, course_id, code, title, description, bloom_level, sort_order)
    VALUES (p_program_id, p_course_id, btrim(p_code), btrim(p_title), NULLIF(btrim(p_description), ''), NULLIF(btrim(p_bloom_level), ''), COALESCE(p_sort_order, 0))
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Competency created.', 'id', v_id);

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'A competency with this code already exists in the same scope.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_competency(p_id uuid, p_code text, p_title text, p_description text DEFAULT NULL::text, p_bloom_level text DEFAULT NULL::text, p_sort_order integer DEFAULT 0, p_is_active boolean DEFAULT true)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency code is required.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency title is required.');
    END IF;

    UPDATE public.competencies
    SET
        code = btrim(p_code),
        title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        bloom_level = NULLIF(btrim(p_bloom_level), ''),
        sort_order = COALESCE(p_sort_order, 0),
        is_active = COALESCE(p_is_active, true)
    WHERE id = p_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Competency updated.');

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'A competency with this code already exists in the same scope.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_competency(p_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF EXISTS (
        SELECT 1 FROM public.assessment_question_competencies aqc
        WHERE aqc.competency_id = p_id
          AND aqc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This competency is tagged on assessment questions and cannot be deleted.');
    END IF;

    UPDATE public.competencies
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Competency not found.');
    END IF;

    UPDATE public.competency_alignments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE (competency_id = p_id OR parent_competency_id = p_id)
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Competency deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_competencies(p_items jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_item JSONB;
    v_program_code TEXT;
    v_course_code TEXT;
    v_program_id UUID;
    v_course_id UUID;
    v_row INTEGER := 0;
    v_created INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF jsonb_typeof(p_items) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid payload: an array of competencies is required.');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_row := v_row + 1;
        v_program_id := NULL;
        v_course_id := NULL;
        v_program_code := NULLIF(btrim(v_item->>'program_code'), '');
        v_course_code := NULLIF(btrim(v_item->>'course_code'), '');

        IF v_program_code IS NOT NULL THEN
            SELECT id INTO v_program_id
            FROM public.programs
            WHERE code = v_program_code AND deleted_at IS NULL
            LIMIT 1;

            IF v_program_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', format('Row %s: program code "%s" was not found.', v_row, v_program_code));
            END IF;
        END IF;

        IF v_course_code IS NOT NULL THEN
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = v_course_code AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', format('Row %s: course code "%s" was not found.', v_row, v_course_code));
            END IF;
        END IF;

        IF v_program_id IS NULL AND v_course_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', format('Row %s: a program code or course code is required.', v_row));
        END IF;

        IF NULLIF(btrim(v_item->>'code'), '') IS NULL OR NULLIF(btrim(v_item->>'title'), '') IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', format('Row %s: code and title are required.', v_row));
        END IF;

        INSERT INTO public.competencies (program_id, course_id, code, title, description, bloom_level, sort_order)
        VALUES (
            v_program_id,
            v_course_id,
            btrim(v_item->>'code'),
            btrim(v_item->>'title'),
            NULLIF(btrim(v_item->>'description'), ''),
            NULLIF(btrim(v_item->>'bloom_level'), ''),
            COALESCE((v_item->>'sort_order')::INTEGER, 0)
        );

        v_created := v_created + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', format('Created %s competenc(ies).', v_created));

EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'message', 'One or more competencies duplicate an existing code in the same scope.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_competencies(p_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No competencies were selected.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.assessment_question_competencies aqc
        WHERE aqc.competency_id = ANY(p_ids)
          AND aqc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'One or more selected competencies are tagged on assessment questions and cannot be deleted.');
    END IF;

    UPDATE public.competencies
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.competency_alignments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE (competency_id = ANY(p_ids) OR parent_competency_id = ANY(p_ids))
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s competenc(ies).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_question_competencies(p_question_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.code), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            cm.id AS competency_id,
            cm.code,
            cm.title,
            cm.bloom_level,
            aqc.weight
        FROM public.assessment_question_competencies aqc
        JOIN public.competencies cm ON cm.id = aqc.competency_id AND cm.deleted_at IS NULL
        WHERE aqc.question_id = p_question_id
          AND aqc.deleted_at IS NULL
    ) t;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_tag_question_competencies(p_question_id uuid, p_competency_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_course_id UUID;
    v_competency_id UUID;
    v_valid INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT sec.id, sec.course_id
    INTO v_section_id, v_course_id
    FROM public.assessment_questions aq
    JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id AND ai.deleted_at IS NULL
    JOIN public.sections sec ON sec.id = ai.section_id AND sec.deleted_at IS NULL
    WHERE aq.id = p_question_id
      AND aq.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.sections sec
        WHERE sec.id = v_section_id
          AND sec.faculty_id = auth.uid()
          AND sec.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Forbidden: you may only tag questions in sections you teach.'
            USING ERRCODE = '42501';
    END IF;

    IF p_competency_ids IS NOT NULL AND array_length(p_competency_ids, 1) > 0 THEN
        SELECT COUNT(*)
        INTO v_valid
        FROM public.competencies cm
        WHERE cm.id = ANY(p_competency_ids)
          AND cm.is_active
          AND cm.deleted_at IS NULL
          AND (cm.course_id = v_course_id OR cm.course_id IS NULL);

        IF v_valid <> array_length(p_competency_ids, 1) THEN
            RETURN jsonb_build_object('success', false, 'message', 'One or more competencies are invalid or do not belong to this course.');
        END IF;
    END IF;

    UPDATE public.assessment_question_competencies
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE question_id = p_question_id
      AND deleted_at IS NULL
      AND (p_competency_ids IS NULL OR NOT (competency_id = ANY(p_competency_ids)));

    IF p_competency_ids IS NOT NULL AND array_length(p_competency_ids, 1) > 0 THEN
        FOREACH v_competency_id IN ARRAY p_competency_ids
        LOOP
            INSERT INTO public.assessment_question_competencies (question_id, competency_id)
            VALUES (p_question_id, v_competency_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Question competencies updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_competency_alignments(p_competency_id uuid, p_parent_competency_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_parent_id UUID;
    v_valid INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean');

    IF NOT EXISTS (
        SELECT 1 FROM public.competencies cm
        WHERE cm.id = p_competency_id
          AND cm.course_id IS NOT NULL
          AND cm.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only course-level competencies can be aligned to a program outcome.');
    END IF;

    IF p_parent_competency_ids IS NOT NULL AND array_length(p_parent_competency_ids, 1) > 0 THEN
        IF p_competency_id = ANY(p_parent_competency_ids) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A competency cannot be aligned to itself.');
        END IF;

        SELECT COUNT(*)
        INTO v_valid
        FROM public.competencies cm
        WHERE cm.id = ANY(p_parent_competency_ids)
          AND cm.course_id IS NULL
          AND cm.deleted_at IS NULL;

        IF v_valid <> array_length(p_parent_competency_ids, 1) THEN
            RETURN jsonb_build_object('success', false, 'message', 'One or more program outcomes are invalid.');
        END IF;
    END IF;

    UPDATE public.competency_alignments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE competency_id = p_competency_id
      AND deleted_at IS NULL
      AND (p_parent_competency_ids IS NULL OR NOT (parent_competency_id = ANY(p_parent_competency_ids)));

    IF p_parent_competency_ids IS NOT NULL AND array_length(p_parent_competency_ids, 1) > 0 THEN
        FOREACH v_parent_id IN ARRAY p_parent_competency_ids
        LOOP
            INSERT INTO public.competency_alignments (competency_id, parent_competency_id)
            VALUES (p_competency_id, v_parent_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Competency alignment updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_competencies_json(integer, integer, text, jsonb, uuid[], uuid[], text, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_competency_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_course_competencies(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_competency(uuid, uuid, text, text, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_competency(uuid, text, text, text, text, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_competency(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_create_competencies(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_delete_competencies(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_question_competencies(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_tag_question_competencies(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_competency_alignments(uuid, uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_competencies_json(integer, integer, text, jsonb, uuid[], uuid[], text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_competency_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_course_competencies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_competency(uuid, uuid, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_competency(uuid, text, text, text, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_competency(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bulk_create_competencies(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_competencies(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_question_competencies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_tag_question_competencies(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_competency_alignments(uuid, uuid[]) TO authenticated;