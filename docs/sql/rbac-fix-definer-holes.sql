CREATE OR REPLACE FUNCTION public.fn_list_grade_sheet(p_section_id uuid, p_grading_period_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = p_section_id
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
        )
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section grade sheet.'
            USING ERRCODE = '42501';
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'enrollment_id',   e.id,
                'student_number',  st.student_number,
                'full_name',       u.first_name || ' ' || u.last_name,
                'raw_grade',       sfg.raw_grade,
                'final_grade',     sfg.final_grade,
                'transmuted_grade', sfg.transmuted_grade,
                'status',          sfg.status,
                'special_grade',   sfg.special_grade
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id
            AND sfg.grading_period_id = p_grading_period_id
            AND sfg.deleted_at IS NULL
        WHERE e.section_id = p_section_id
        AND e.status NOT IN ('Dropped', 'Withdrawn')
        AND e.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_section_students(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.section_id = ' || quote_literal(p_section_id) || ' AND e.deleted_at IS NULL';
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = p_section_id
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
        )
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section roster.'
            USING ERRCODE = '42501';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            st.id AS student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS full_name,
            u.email,
            st.year_level,
            e.status,
            e.enrolled_at,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC, u.first_name ASC');
END;
$$;
