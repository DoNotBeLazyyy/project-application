-- ====================================================================
-- Migration: 20261031090000_protect_student_record_reads.sql
--   A signed-in student could read other people's data:
--   * fn_get_student_curriculum_for_crediting (any student's courses and grades): Registrar
--     and Admin only (the transferee crediting dialog)
--   * fn_get_users_by_roles (every account's name and email): Admin, Dean and Registrar only
--     (faculty pickers, department head picker)
--   * fn_list_progression_candidates, fn_get_student_evaluation_status,
--     fn_list_applicable_evaluation_templates: only called by other database functions
--     (batch progression, evaluation form and submit), no longer callable directly
-- Rollback: supabase/rollback/20261031090000_protect_student_record_reads.down.sql
-- ====================================================================
BEGIN;

-- fn_get_student_curriculum_for_crediting
CREATE OR REPLACE FUNCTION public.fn_get_student_curriculum_for_crediting(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_user_id UUID;
    v_student_num TEXT;
    v_student_name TEXT;
    v_program_id UUID;
    v_program_code TEXT;
    v_program_name TEXT;
    v_year_level SMALLINT;
    v_total_curriculum_units NUMERIC(8,2) := 0;
    v_credited_units NUMERIC(8,2) := 0;
    v_credited_count INT := 0;
    v_courses JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.id, s.user_id, s.student_number, s.program_id, s.year_level,
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
           p.code, p.name
    INTO v_student_id, v_user_id, v_student_num, v_program_id, v_year_level,
         v_student_name, v_program_code, v_program_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not yet assigned to an academic program. Please assign a program first.');
    END IF;

    -- Build list of curriculum courses and crediting status
    WITH curr_list AS (
        SELECT
            cm.id AS curriculum_map_id,
            cm.year_level,
            cm.sequence,
            COALESCE(tt.label, 'Term ' || cm.term_type_id::text) AS term_label,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            COALESCE(cm.units, c.total_units) AS units,
            COALESCE(cm.lecture_units, c.lecture_units, 0) AS lecture_units,
            COALESCE(cm.laboratory_units, c.laboratory_units, 0) AS laboratory_units,
            COALESCE(cm.is_elective, false) AS is_elective,
            scc.id AS credited_id,
            (scc.id IS NOT NULL) AS is_credited,
            scc.previous_school,
            scc.previous_course_code,
            scc.previous_course_title,
            scc.grade_display,
            scc.grade_numeric,
            scc.units_credited,
            scc.remarks,
            scc.created_at AS credited_at,
            btrim(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')) AS credited_by_name,
            -- Check if passed locally
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
                WHERE e.student_id = v_student_id
                  AND sec.course_id = c.id
                  AND e.deleted_at IS NULL
                  AND e.status = 'Completed'
            ) AS is_passed_locally
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN public.student_credited_courses scc
            ON scc.student_id = v_student_id
           AND scc.course_id = c.id
           AND scc.deleted_at IS NULL
        LEFT JOIN public.users cu ON cu.id = scc.credited_by
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
        ORDER BY cm.year_level ASC, COALESCE(tt.sequence, 99) ASC, cm.sequence ASC, c.code ASC
    )
    SELECT
        COALESCE(SUM(units), 0),
        COALESCE(SUM(units) FILTER (WHERE is_credited IS TRUE), 0),
        COUNT(*) FILTER (WHERE is_credited IS TRUE),
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'curriculum_map_id', curriculum_map_id,
                'year_level', year_level,
                'term_label', term_label,
                'course_id', course_id,
                'course_code', course_code,
                'course_title', course_title,
                'units', units,
                'lecture_units', lecture_units,
                'laboratory_units', laboratory_units,
                'is_elective', is_elective,
                'is_credited', is_credited,
                'credited_id', credited_id,
                'previous_school', previous_school,
                'previous_course_code', previous_course_code,
                'previous_course_title', previous_course_title,
                'grade_display', grade_display,
                'grade_numeric', grade_numeric,
                'units_credited', units_credited,
                'remarks', remarks,
                'credited_at', credited_at,
                'credited_by_name', credited_by_name,
                'is_passed_locally', is_passed_locally
            )
        ), '[]'::jsonb)
    INTO v_total_curriculum_units, v_credited_units, v_credited_count, v_courses
    FROM curr_list;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'id', v_student_id,
            'student_number', v_student_num,
            'full_name', v_student_name,
            'year_level', v_year_level,
            'program_id', v_program_id,
            'program_code', v_program_code,
            'program_name', v_program_name
        ),
        'summary', jsonb_build_object(
            'total_curriculum_units', v_total_curriculum_units,
            'credited_units', v_credited_units,
            'credited_count', v_credited_count
        ),
        'courses', v_courses
    );
END;
$function$;

-- fn_get_users_by_roles
CREATE OR REPLACE FUNCTION public.fn_get_users_by_roles(p_role_codes text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_scoped_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    v_scoped_dept_id := public.fn_get_scoped_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'full_name', sub.full_name,
                'first_name', sub.first_name,
                'last_name', sub.last_name,
                'email', sub.email,
                'status', sub.status,
                'role_code', sub.role_code,
                'role_label', sub.role_label,
                'department_id', sub.department_id,
                'department_code', sub.department_code,
                'department_name', sub.department_name
            )
            ORDER BY sub.last_name ASC, sub.first_name ASC
        ), '[]'::jsonb)
        FROM (
            SELECT DISTINCT ON (u.id)
                u.id,
                btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
                u.first_name,
                u.last_name,
                u.email,
                u.status::text AS status,
                r.code AS role_code,
                r.label AS role_label,
                u.department_id,
                dept.code AS department_code,
                dept.name AS department_name
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
              AND u.status <> 'Inactive'
              AND (p_role_codes IS NULL OR r.code = ANY(p_role_codes))
              AND (v_scoped_dept_id IS NULL OR u.department_id = v_scoped_dept_id)
            ORDER BY u.id, r.code ASC
        ) sub
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_list_progression_candidates(uuid, uuid[], smallint[], uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_get_student_evaluation_status(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_list_applicable_evaluation_templates(uuid) FROM authenticated;

COMMIT;
