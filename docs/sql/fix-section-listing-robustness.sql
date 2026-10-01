CREATE OR REPLACE FUNCTION public.fn_list_sections_json_dummy(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_ids uuid[] DEFAULT NULL::uuid[],
    p_course_ids uuid[] DEFAULT NULL::uuid[],
    p_statuses text[] DEFAULT NULL::text[]
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR COALESCE(c.code, '''') ILIKE %L OR COALESCE(c.title, '''') ILIKE %L OR COALESCE(u.first_name || '' '' || u.last_name, '''') ILIKE %L)',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND s.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.section_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            s.id,
            s.section_code,
            s.term_id,
            COALESCE(tt.label || '' - '' || sy.label, ''—'') AS term_label,
            s.course_id,
            COALESCE(c.code, ''—'') AS course_code,
            COALESCE(c.title, ''Untitled Course'') AS course_title,
            s.faculty_id,
            COALESCE(u.first_name || '' '' || u.last_name, ''Unassigned'') AS faculty_name,
            s.room,
            s.max_slots,
            s.status,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        LEFT JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_my_sections(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL AND s.faculty_id = auth.uid()';
BEGIN
    IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR COALESCE(c.code, '''') ILIKE %L OR COALESCE(c.title, '''') ILIKE %L)',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%'
        );
    END IF;

    v_base_query := format(
        'WITH enrolled_counts AS (
            SELECT
                e.section_id,
                COUNT(*) AS enrolled_count
            FROM public.enrollments e
            WHERE e.status NOT IN (''Dropped'', ''Withdrawn'')
            AND e.deleted_at IS NULL
            GROUP BY e.section_id
        )
        SELECT
            s.id,
            s.section_code,
            COALESCE(c.code, ''—'') AS course_code,
            COALESCE(c.title, ''Untitled Course'') AS course_title,
            COALESCE(tt.label || '' - '' || sy.label, ''—'') AS term_label,
            s.status,
            s.max_slots,
            COALESCE(ec.enrolled_count, 0) AS enrolled_count,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN enrolled_counts ec ON ec.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_my_subjects(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object(
            'content', '[]'::JSONB,
            'empty', true,
            'first', true,
            'last', true,
            'number', 0,
            'numberOfElements', 0,
            'size', p_size,
            'totalElements', 0,
            'totalPages', 0
        );
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id) || ' AND e.deleted_at IS NULL';

    IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR COALESCE(c.code, '''') ILIKE %L OR COALESCE(c.title, '''') ILIKE %L)',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            s.id AS section_id,
            s.section_code,
            COALESCE(c.code, ''—'') AS course_code,
            COALESCE(c.title, ''Untitled Course'') AS course_title,
            COALESCE(c.lecture_units, 0) AS lecture_units,
            COALESCE(c.laboratory_units, 0) AS laboratory_units,
            COALESCE(tt.label || '' - '' || sy.label, ''—'') AS term_label,
            COALESCE(u.first_name || '' '' || u.last_name, ''Unassigned'') AS faculty_name,
            e.status AS enrollment_status,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'c.code ASC');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_sections_json_dummy(integer, integer, text, jsonb, uuid[], uuid[], text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_my_sections(integer, integer, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_my_subjects(integer, integer, text, jsonb) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_sections_json_dummy(integer, integer, text, jsonb, uuid[], uuid[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_my_sections(integer, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_my_subjects(integer, integer, text, jsonb) TO authenticated;
