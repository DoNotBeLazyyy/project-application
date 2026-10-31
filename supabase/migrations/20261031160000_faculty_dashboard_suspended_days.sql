-- ====================================================================
-- Migration: 20261031160000_faculty_dashboard_suspended_days.sql
--   * fn_get_faculty_dashboard: "Today's Classes" and the sessions-today count matched the
--     weekday only, so classes showed on holidays marked "Class Suspended" (e.g. Undas,
--     Oct 31). Today counts as a class day only when no class-suspending exception covers it
-- Rollback: supabase/rollback/20261031160000_faculty_dashboard_suspended_days.down.sql
-- ====================================================================
BEGIN;

-- fn_get_faculty_dashboard
CREATE OR REPLACE FUNCTION public.fn_get_faculty_dashboard(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty_id UUID;
    v_faculty_dept_id UUID;
    v_term_id UUID;
    v_term JSONB;
    v_section_ids UUID[];
    v_enrollment_ids UUID[];
    v_stats JSONB;
    v_sections JSONB;
    v_pending_grading JSONB;
    v_todays_classes JSONB;
    v_at_risk_students JSONB;
    v_at_risk_total INTEGER;
    v_today public.day_of_week_type;
    v_is_class_day BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Faculty', 'Admin');

    v_faculty_id := auth.uid();
    v_faculty_dept_id := public.fn_get_faculty_department_id();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_faculty_term(v_faculty_id));
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_today := to_char(now() AT TIME ZONE 'Asia/Manila', 'FMDay')::public.day_of_week_type;

    -- Holidays marked "Class Suspended" have no classes
    v_is_class_day := NOT EXISTS (
        SELECT 1
        FROM public.school_year_calendar_exceptions ex
        INNER JOIN public.terms t ON t.school_year_id = ex.school_year_id
        WHERE t.id = v_term_id
          AND ex.affects_attendance
          AND (now() AT TIME ZONE 'Asia/Manila')::DATE BETWEEN ex.start_date AND ex.end_date
    );

    SELECT COALESCE(array_agg(s.id), ARRAY[]::UUID[])
    INTO v_section_ids
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
      AND s.faculty_id = v_faculty_id
      AND s.term_id = v_term_id
      AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id);

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn')
      AND e.section_id = ANY (v_section_ids);

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'my_sections', COALESCE(array_length(v_section_ids, 1), 0),
        'total_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            WHERE e.deleted_at IS NULL
              AND e.status NOT IN ('Dropped', 'Withdrawn')
              AND e.section_id = ANY (v_section_ids)
        ),
        'at_risk_students', COALESCE(v_at_risk_total, 0),
        'pending_grading', (
            SELECT COUNT(*)
            FROM public.assessment_submissions sub
            INNER JOIN public.assessment_items ai
                ON ai.id = sub.assessment_item_id
                AND ai.deleted_at IS NULL
            WHERE sub.deleted_at IS NULL
              AND ai.section_id = ANY (v_section_ids)
              AND sub.status IN ('Submitted', 'Late')
        ),
        'published_assessments', (
            SELECT COUNT(*)
            FROM public.assessment_items ai
            WHERE ai.deleted_at IS NULL
              AND ai.is_published
              AND ai.section_id = ANY (v_section_ids)
        ),
        'sessions_today', (
            SELECT COUNT(*)
            FROM public.section_schedules sch
            WHERE sch.deleted_at IS NULL
              AND sch.section_id = ANY (v_section_ids)
              AND sch.day_of_week = v_today
              AND v_is_class_day
        )
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'course_code', x->>'section_code'), '[]'::JSONB)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'room', s.room,
            'enrolled_count', COALESCE(agg.enrolled_count, 0),
            'at_risk_count', COALESCE(agg.at_risk_count, 0),
            'avg_score_pct', agg.avg_score_pct
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                r.section_id,
                COUNT(*) AS enrolled_count,
                COUNT(*) FILTER (WHERE r.is_at_risk) AS at_risk_count,
                ROUND(AVG(r.avg_score_pct), 2) AS avg_score_pct
            FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
            GROUP BY r.section_id
        ) agg ON agg.section_id = s.id
        WHERE s.id = ANY (v_section_ids)
    ) my_sections;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'ungraded_count')::INTEGER DESC, x->>'title'), '[]'::JSONB)
    INTO v_pending_grading
    FROM (
        SELECT jsonb_build_object(
            'assessment_id', ai.id,
            'section_id', ai.section_id,
            'title', ai.title,
            'assessment_type', ai.assessment_type::TEXT,
            'section_code', s.section_code,
            'course_code', c.code,
            'due_at', ai.due_at,
            'ungraded_count', COUNT(*)
        ) AS x
        FROM public.assessment_submissions sub
        INNER JOIN public.assessment_items ai
            ON ai.id = sub.assessment_item_id
            AND ai.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE sub.deleted_at IS NULL
          AND ai.section_id = ANY (v_section_ids)
          AND sub.status IN ('Submitted', 'Late')
        GROUP BY ai.id, ai.section_id, ai.title, ai.assessment_type, s.section_code, c.code, ai.due_at
        ORDER BY COUNT(*) DESC
        LIMIT 8
    ) pending;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'time_start'), '[]'::JSONB)
    INTO v_todays_classes
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'time_start', sch.time_start,
            'time_end', sch.time_end,
            'room', COALESCE(sch.room, s.room)
        ) AS x
        FROM public.section_schedules sch
        INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE sch.deleted_at IS NULL
          AND sch.section_id = ANY (v_section_ids)
          AND sch.day_of_week = v_today
          AND v_is_class_day
    ) today;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'risk_score')::NUMERIC DESC), '[]'::JSONB)
    INTO v_at_risk_students
    FROM (
        SELECT jsonb_build_object(
            'student_id', r.student_id,
            'enrollment_id', r.enrollment_id,
            'section_id', r.section_id,
            'student_number', st.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'section_code', s.section_code,
            'course_code', c.code,
            'avg_score_pct', r.avg_score_pct,
            'attendance_rate', r.attendance_rate,
            'missing_count', r.missing_count,
            'risk_score', r.risk_score,
            'risk_level', r.risk_level
        ) AS x
        FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
        INNER JOIN public.students st ON st.id = r.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = r.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE r.is_at_risk
        ORDER BY r.risk_score DESC
        LIMIT 8
    ) at_risk;

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'sections', v_sections,
        'pending_grading', v_pending_grading,
        'todays_classes', v_todays_classes,
        'at_risk_students', v_at_risk_students
    );
END;
$function$;

COMMIT;
