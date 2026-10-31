-- Rollback of 20261031170000_my_sections_current_term_first: exact live definitions captured before apply
BEGIN;

-- fn_list_my_sections
CREATE OR REPLACE FUNCTION public.fn_list_my_sections(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL AND s.faculty_id = auth.uid()';
    v_faculty_dept_id UUID;
BEGIN
    v_faculty_dept_id := public.fn_get_faculty_department_id();
    IF v_faculty_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND c.department_id = %L', v_faculty_dept_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
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
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            s.status,
            s.max_slots,
            COALESCE(ec.enrolled_count, 0) AS enrolled_count,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN enrolled_counts ec ON ec.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$function$;

COMMIT;
