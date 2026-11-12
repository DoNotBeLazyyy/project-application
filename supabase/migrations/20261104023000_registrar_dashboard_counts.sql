-- ====================================================================
-- Migration: 20261104023000_registrar_dashboard_counts.sql
--   * fn_get_registrar_dashboard: two new stats
--       - students_enrolled_this_term: distinct students with at least one subject this term
--       - enrolled_students_with_program: the same, limited to students with a program; the
--         Enrollment Distribution percentages use it, so the top-6 list no longer adds to 100%
--         by itself
-- Idempotent: CREATE OR REPLACE keeps the signature and grants.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_registrar_dashboard(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_term JSONB;
    v_stats JSONB;
    v_pending_releases JSONB;
    v_program_distribution JSONB;
    v_recent_enrollments JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);

    v_stats := jsonb_build_object(
        'active_students', (
            SELECT COUNT(*)
            FROM public.students s
            WHERE s.deleted_at IS NULL
              AND s.status = 'Active'
        ),
        'students_on_loa', (
            SELECT COUNT(*)
            FROM public.students s
            WHERE s.deleted_at IS NULL
              AND s.status = 'LOA'
        ),
        'graduated_students', (
            SELECT COUNT(*)
            FROM public.students s
            WHERE s.deleted_at IS NULL
              AND s.status = 'Graduated'
        ),
        'enrollments_this_term', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
        ),
        'students_enrolled_this_term', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
        ),
        'enrolled_students_with_program', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
            INNER JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
        ),
        'dropped_this_term', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status IN ('Dropped', 'Withdrawn')
              AND s.term_id = v_term_id
        ),
        'pending_grade_releases', (
            SELECT COUNT(*)
            FROM public.section_final_grades sfg
            INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE sfg.deleted_at IS NULL
              AND sfg.status IN ('Submitted', 'Approved')
              AND s.term_id = v_term_id
        ),
        'incomplete_grades', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Incomplete'
              AND s.term_id = v_term_id
        )
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'pending_count')::INTEGER DESC, x->>'section_code'), '[]'::JSONB)
    INTO v_pending_releases
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'faculty_name', CASE
                WHEN fu.id IS NULL THEN NULL
                ELSE fu.first_name || ' ' || fu.last_name
            END,
            'pending_count', COUNT(*),
            'grading_period', gp.name
        ) AS x
        FROM public.section_final_grades sfg
        INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
        WHERE sfg.deleted_at IS NULL
          AND sfg.status IN ('Submitted', 'Approved')
          AND s.term_id = v_term_id
        GROUP BY s.id, s.section_code, c.code, c.title, fu.id, fu.first_name, fu.last_name, gp.id, gp.name
        ORDER BY COUNT(*) DESC
        LIMIT 8
    ) pending;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'student_count')::INTEGER DESC), '[]'::JSONB)
    INTO v_program_distribution
    FROM (
        SELECT jsonb_build_object(
            'program_code', p.code,
            'program_name', p.name,
            'student_count', COUNT(DISTINCT e.student_id)
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
          AND e.status = 'Enrolled'
          AND s.term_id = v_term_id
        GROUP BY p.id, p.code, p.name
        ORDER BY COUNT(DISTINCT e.student_id) DESC
        LIMIT 6
    ) distribution;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'enrolled_at' DESC), '[]'::JSONB)
    INTO v_recent_enrollments
    FROM (
        SELECT jsonb_build_object(
            'enrollment_id', e.id,
            'student_id', st.id,
            'student_number', st.student_number,
            'student_name', u.first_name || ' ' || u.last_name,
            'section_code', s.section_code,
            'course_code', c.code,
            'enrolled_at', e.enrolled_at
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE e.deleted_at IS NULL
          AND e.status = 'Enrolled'
          AND s.term_id = v_term_id
        ORDER BY e.enrolled_at DESC
        LIMIT 8
    ) recent;

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'pending_releases', v_pending_releases,
        'program_distribution', v_program_distribution,
        'recent_enrollments', v_recent_enrollments
    );
END;
$function$;

COMMIT;
