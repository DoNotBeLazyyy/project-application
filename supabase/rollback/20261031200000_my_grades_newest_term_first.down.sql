-- Rollback of 20261031200000_my_grades_newest_term_first: exact live definitions captured before apply
BEGIN;

-- fn_list_my_grades
CREATE OR REPLACE FUNCTION public.fn_list_my_grades(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS E'\r
DECLARE\r
    v_student_id UUID;\r
    v_base_query TEXT;\r
    v_where TEXT;\r
BEGIN\r
    PERFORM public.fn_assert_role(''Student'');\r
\r
    SELECT id INTO v_student_id\r
    FROM public.students\r
    WHERE user_id = auth.uid() AND deleted_at IS NULL\r
    LIMIT 1;\r
\r
    IF v_student_id IS NULL THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Student profile not found.'');\r
    END IF;\r
\r
    v_where := ''WHERE e.student_id = '' || quote_literal(v_student_id)\r
        || '' AND e.deleted_at IS NULL''\r
        || '' AND sfg.status IN (''''Approved'''', ''''Released'''')''\r
        || '' AND sfg.deleted_at IS NULL'';\r
\r
    IF p_term_id IS NOT NULL THEN\r
        v_where := v_where || format('' AND t.id = %L'', p_term_id);\r
    END IF;\r
\r
    v_base_query := format(\r
        ''SELECT\r
            e.id AS enrollment_id,\r
            gp.id AS grading_period_id,\r
            public.fn_resolve_evaluation_period(e.id, gp.id) AS evaluation_period_id,\r
            s.section_code,\r
            c.code AS course_code,\r
            c.title AS course_title,\r
            tt.label || '''' - '''' || sy.label AS term_label,\r
            gp.name AS grading_period_name,\r
            gp.sequence AS grading_period_sequence,\r
            COALESCE(NULLIF(btrim(concat(u.first_name, '''' '''', u.last_name)), ''''''''), ''''Unassigned'''') AS faculty_name,\r
            COALESCE(epl.is_completed, false) AS evaluation_completed,\r
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.raw_grade END AS raw_grade,\r
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.final_grade END AS final_grade,\r
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.transmuted_grade END AS transmuted_grade,\r
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.special_grade END AS special_grade,\r
            COUNT(*) OVER() AS total_count\r
        FROM public.enrollments e\r
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL\r
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL\r
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL\r
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL\r
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL\r
        INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id\r
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL\r
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL\r
        LEFT JOIN public.evaluation_period_locks epl\r
            ON epl.enrollment_id = e.id\r
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(e.id, gp.id)\r
            AND epl.deleted_at IS NULL\r
        %s'',\r
        v_where\r
    );\r
\r
    RETURN public.fn_build_pageable_dto(\r
        v_base_query,\r
        p_page,\r
        p_size,\r
        p_sort,\r
        ''evaluation_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC''\r
    );\r
END;\r
';

COMMIT;
