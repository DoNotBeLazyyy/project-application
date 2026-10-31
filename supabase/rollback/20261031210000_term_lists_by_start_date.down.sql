-- Rollback of 20261031210000_term_lists_by_start_date: exact live definitions captured before apply
BEGIN;

-- fn_list_my_evaluations_json
CREATE OR REPLACE FUNCTION public.fn_list_my_evaluations_json(p_page integer DEFAULT 1, p_size integer DEFAULT 10, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_status text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE true';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_status = 'Pending' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = false';
    END IF;

    IF p_status = 'Completed' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = true';
    END IF;

    v_base_query := format(
        'SELECT
            target.enrollment_id,
            target.grading_period_id,
            CASE WHEN target.evaluation_scope = ''Term''
                THEN ''Whole Term''
                ELSE gp.name
            END AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            target.evaluation_scope::TEXT AS evaluation_scope,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS is_completed,
            epl.completed_at,
            COUNT(*) OVER() AS total_count
        FROM (
            SELECT DISTINCT
                e.id AS enrollment_id,
                public.fn_resolve_evaluation_period(e.id, gp.id) AS grading_period_id,
                public.fn_get_enrollment_evaluation_scope(e.id) AS evaluation_scope
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.grading_periods gp ON gp.term_id = s.term_id AND gp.deleted_at IS NULL
            WHERE e.student_id = %L
            AND e.deleted_at IS NULL
            AND e.status = ''Enrolled''
        ) target
        INNER JOIN public.enrollments e ON e.id = target.enrollment_id
        INNER JOIN public.grading_periods gp ON gp.id = target.grading_period_id AND gp.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = target.enrollment_id
            AND epl.grading_period_id = target.grading_period_id
            AND epl.deleted_at IS NULL
        %s',
        v_student_id,
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'is_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC'
    );
END;
$function$;

-- fn_list_my_teaching_sections
CREATE OR REPLACE FUNCTION public.fn_list_my_teaching_sections(p_exclude_section_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    v_faculty_dept_id := public.fn_get_faculty_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'term_label', tt.label || ' - ' || sy.label
            )
            ORDER BY sy.label DESC, tt.label, c.code, s.section_code
        ), '[]'::jsonb)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
          AND (p_exclude_section_id IS NULL OR s.id <> p_exclude_section_id)
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
    );
END;
$function$;

COMMIT;
