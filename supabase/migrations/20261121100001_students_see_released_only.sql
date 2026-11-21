-- ====================================================================
-- Migration: 20261121100001_students_see_released_only.sql
-- Audit 2026-11-21 (BUG-AUDIT-20261121.md), policy 2:
--   #4  fn_list_my_grades, fn_get_subject_grades: a student sees grade values only once the
--       grade is Released (and the evaluation is done). Approved rows are still listed so the
--       "Evaluate" prompt stays, but without values. fn_list_my_grades also returns the row
--       status so the screen can tell "Locked" (evaluate first) from "Pending release".
-- Bodies are based on the live definitions read on 2026-11-21. Idempotent (CREATE OR REPLACE).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_list_my_grades(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id)
        || ' AND e.deleted_at IS NULL'
        || ' AND sfg.status IN (''Approved'', ''Released'')'
        || ' AND sfg.deleted_at IS NULL';

    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.id = %L', p_term_id);
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            gp.id AS grading_period_id,
            public.fn_resolve_evaluation_period(e.id, gp.id) AS evaluation_period_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            gp.name AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS evaluation_completed,
            sfg.status::text AS status,
            CASE WHEN COALESCE(epl.is_completed, false) AND sfg.status = ''Released'' THEN sfg.raw_grade END AS raw_grade,
            CASE WHEN COALESCE(epl.is_completed, false) AND sfg.status = ''Released'' THEN sfg.final_grade END AS final_grade,
            CASE WHEN COALESCE(epl.is_completed, false) AND sfg.status = ''Released'' THEN sfg.transmuted_grade END AS transmuted_grade,
            CASE WHEN COALESCE(epl.is_completed, false) AND sfg.status = ''Released'' THEN sfg.special_grade END AS special_grade,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = e.id
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(e.id, gp.id)
            AND epl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'evaluation_completed ASC, t.start_date DESC, c.code ASC, gp.sequence ASC'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_actual_enrollment_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            CASE WHEN vis.is_released THEN sfg.raw_grade ELSE NULL END,
            'final_grade',          CASE WHEN vis.is_released THEN sfg.final_grade ELSE NULL END,
            'transmuted_grade',     CASE WHEN vis.is_released THEN sfg.transmuted_grade ELSE NULL END,
            'special_grade',        CASE WHEN vis.is_released THEN sfg.special_grade ELSE NULL END,
            'status',               sfg.status,
            'is_visible',           sfg.status IN ('Approved', 'Released'),
            'evaluation_completed', eval.is_completed
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = v_actual_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    CROSS JOIN LATERAL (
        SELECT COALESCE((
            SELECT epl.is_completed
            FROM public.evaluation_period_locks epl
            WHERE epl.enrollment_id = v_actual_enrollment_id
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(v_actual_enrollment_id, gp.id)
            AND epl.deleted_at IS NULL
            LIMIT 1
        ), false) AS is_completed
    ) eval
    CROSS JOIN LATERAL (
        -- Only a Released grade is shown; an Approved one still waits for the Registrar
        SELECT COALESCE(sfg.status = 'Released', false) AND eval.is_completed AS is_released
    ) vis
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$function$;

COMMIT;
