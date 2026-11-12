-- ====================================================================
-- Migration: 20261104026000_dean_dashboard_conflict_count.sql
--   * fn_get_dean_dashboard: the Schedule Conflicts count follows the section wizard's rule
--     (fn_check_section_schedule_conflicts): a section is never compared with itself, the
--     slot's own room is used before the section room, and rooms match without case or
--     surrounding spaces
-- Idempotent: CREATE OR REPLACE keeps the signature and grants.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_dean_dashboard(p_term_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_term JSONB;
    v_conflicts JSONB;
    v_enrollment_ids UUID[];
    v_stats JSONB;
    v_unassigned JSONB;
    v_at_risk_sections JSONB;
    v_program_distribution JSONB;
    v_at_risk_total INTEGER;
    v_dean_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_dean_dept_id := public.fn_get_dean_department_id();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);

    v_conflicts := public.fn_list_schedule_conflicts(v_term_id);

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE e.deleted_at IS NULL
      AND e.status = 'Enrolled'
      AND s.term_id = v_term_id
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id);

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'total_departments', (
            SELECT COUNT(*)
            FROM public.departments d
            WHERE d.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR d.id = v_dean_dept_id)
        ),
        'total_programs', (
            SELECT COUNT(*)
            FROM public.programs p
            WHERE p.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR p.department_id = v_dean_dept_id)
        ),
        'total_courses', (
            SELECT COUNT(*)
            FROM public.courses c
            WHERE c.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'sections_this_term', (
            SELECT COUNT(*)
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'enrolled_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'total_faculty', (
            SELECT COUNT(DISTINCT u.id)
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.code = 'Faculty'
            WHERE u.deleted_at IS NULL
              AND u.status <> 'Inactive'
              AND (v_dean_dept_id IS NULL OR u.department_id = v_dean_dept_id)
        ),
        'unassigned_sections', (
            SELECT COUNT(*)
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.faculty_id IS NULL
              AND s.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'schedule_conflicts', (
            -- Same rule as fn_check_section_schedule_conflicts: two different sections of the
            -- term meet at the same time with the same faculty, or in the same room (the slot's
            -- room, else the section's room, compared without case or spaces). Each clashing
            -- pair of slots counts once.
            SELECT COUNT(*)
            FROM (
                SELECT a.id
                FROM public.section_schedules a
                INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
                INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
                INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
                INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
                INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
                WHERE a.deleted_at IS NULL
                  AND sa.id <> sb.id
                  AND sa.term_id = v_term_id
                  AND sb.term_id = v_term_id
                  AND a.day_of_week = b.day_of_week
                  AND a.time_start < b.time_end
                  AND b.time_start < a.time_end
                  AND (
                      (sa.faculty_id IS NOT NULL AND sa.faculty_id = sb.faculty_id)
                      OR (
                          COALESCE(btrim(COALESCE(a.room, sa.room)), '') <> ''
                          AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
                      )
                  )
                  AND (
                      v_dean_dept_id IS NULL
                      OR ca.department_id = v_dean_dept_id
                      OR cb.department_id = v_dean_dept_id
                  )
            ) c_sub
        ),
        'at_risk_students', COALESCE(v_at_risk_total, 0)
    );

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'enrolled_count', (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    WHERE e.section_id = s.id
                      AND e.status = 'Enrolled'
                      AND e.deleted_at IS NULL
                )
            )
            ORDER BY c.code, s.section_code
        ),
        '[]'::jsonb
    )
    INTO v_unassigned
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.faculty_id IS NULL
      AND s.deleted_at IS NULL
      AND s.term_id = v_term_id
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
    LIMIT 10;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_id', row.section_id,
                'section_code', row.section_code,
                'course_code', row.course_code,
                'course_title', row.course_title,
                'faculty_name', row.faculty_name,
                'at_risk_count', row.at_risk_count,
                'enrolled_count', row.enrolled_count,
                'avg_score_pct', row.avg_score_pct
            )
            ORDER BY row.at_risk_count DESC
        ),
        '[]'::jsonb
    )
    INTO v_at_risk_sections
    FROM (
        SELECT s.id AS section_id,
               s.section_code,
               c.code AS course_code,
               c.title AS course_title,
               COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') AS faculty_name,
               COUNT(*) FILTER (WHERE r.is_at_risk) AS at_risk_count,
               COUNT(e.id) AS enrolled_count,
               ROUND(AVG(r.avg_score_pct)::numeric, 1) AS avg_score_pct
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.section_id = s.id AND e.deleted_at IS NULL AND e.status = 'Enrolled'
        LEFT JOIN public.fn_dashboard_enrollment_risk(v_enrollment_ids) r ON r.enrollment_id = e.id
        WHERE s.deleted_at IS NULL
          AND s.term_id = v_term_id
          AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        GROUP BY s.id, s.section_code, c.code, c.title, u.first_name, u.last_name
        HAVING COUNT(*) FILTER (WHERE r.is_at_risk) > 0
        ORDER BY COUNT(*) FILTER (WHERE r.is_at_risk) DESC
        LIMIT 10
    ) row;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'program_id', p.id,
                'code', p.code,
                'name', p.name,
                'enrolled_count', (
                    SELECT COUNT(DISTINCT st.id)
                    FROM public.students st
                    INNER JOIN public.enrollments e ON e.student_id = st.id AND e.deleted_at IS NULL AND e.status = 'Enrolled'
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE st.program_id = p.id
                      AND st.deleted_at IS NULL
                      AND s.term_id = v_term_id
                )
            )
            ORDER BY p.code
        ),
        '[]'::jsonb
    )
    INTO v_program_distribution
    FROM public.programs p
    WHERE p.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR p.department_id = v_dean_dept_id);

    RETURN jsonb_build_object(
        'term', v_term,
        'stats', v_stats,
        'unassigned_sections', v_unassigned,
        'at_risk_sections', v_at_risk_sections,
        'program_distribution', v_program_distribution
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_dean_dashboard(uuid) TO authenticated, service_role;

COMMIT;
