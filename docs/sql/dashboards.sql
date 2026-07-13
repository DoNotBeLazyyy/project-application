CREATE OR REPLACE FUNCTION public.fn_dashboard_active_term()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT t.id
    FROM public.terms t
    WHERE t.deleted_at IS NULL
    ORDER BY
        (t.status IN ('Ongoing', 'Grading Period')) DESC,
        (t.status = 'Enrollment Open') DESC,
        t.start_date DESC
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_dashboard_active_term() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_dashboard_active_term() FROM anon;
REVOKE ALL ON FUNCTION public.fn_dashboard_active_term() FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_dashboard_term_label(p_term_id uuid)
    RETURNS jsonb
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT jsonb_build_object(
        'term_id', t.id,
        'term_label', tt.label || ' - ' || sy.label,
        'status', t.status
    )
    FROM public.terms t
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.id = p_term_id
      AND t.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.fn_dashboard_term_label(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_dashboard_term_label(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_dashboard_term_label(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_dashboard_enrollment_risk(p_enrollment_ids uuid[])
    RETURNS TABLE (
        enrollment_id uuid,
        section_id uuid,
        student_id uuid,
        avg_score_pct numeric,
        attendance_rate numeric,
        missing_count integer,
        risk_score numeric,
        risk_level text,
        is_at_risk boolean
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    WITH scores AS (
        SELECT
            s.enrollment_id,
            ROUND(AVG(s.score_pct), 2) AS avg_score_pct
        FROM public.fn_analytics_submission_scores(p_enrollment_ids) s
        GROUP BY s.enrollment_id
    ),
    engagement AS (
        SELECT
            e.enrollment_id,
            e.attendance_rate,
            e.missing_count
        FROM public.fn_analytics_engagement(p_enrollment_ids) e
    ),
    computed AS (
        SELECT
            en.id AS enrollment_id,
            en.section_id,
            en.student_id,
            sc.avg_score_pct,
            eg.attendance_rate,
            COALESCE(eg.missing_count, 0) AS missing_count,
            public.fn_analytics_risk_score(
                eg.attendance_rate,
                sc.avg_score_pct,
                COALESCE(eg.missing_count, 0),
                0
            ) AS risk_score
        FROM public.enrollments en
        LEFT JOIN scores sc ON sc.enrollment_id = en.id
        LEFT JOIN engagement eg ON eg.enrollment_id = en.id
        WHERE en.id = ANY (p_enrollment_ids)
          AND en.deleted_at IS NULL
    )
    SELECT
        c.enrollment_id,
        c.section_id,
        c.student_id,
        c.avg_score_pct,
        c.attendance_rate,
        c.missing_count,
        c.risk_score,
        public.fn_analytics_risk_level(c.risk_score) AS risk_level,
        c.risk_score >= 30 AS is_at_risk
    FROM computed c;
$$;

REVOKE ALL ON FUNCTION public.fn_dashboard_enrollment_risk(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_dashboard_enrollment_risk(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.fn_dashboard_enrollment_risk(uuid[]) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_dean_dashboard(p_term_id uuid DEFAULT NULL::uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_conflicts := public.fn_list_schedule_conflicts(v_term_id);

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.deleted_at IS NULL
      AND e.status = 'Enrolled'
      AND s.term_id = v_term_id;

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'total_departments', (
            SELECT COUNT(*)
            FROM public.departments d
            WHERE d.deleted_at IS NULL
        ),
        'total_programs', (
            SELECT COUNT(*)
            FROM public.programs p
            WHERE p.deleted_at IS NULL
        ),
        'total_courses', (
            SELECT COUNT(*)
            FROM public.courses c
            WHERE c.deleted_at IS NULL
        ),
        'total_faculty', (
            SELECT COUNT(DISTINCT ur.user_id)
            FROM public.user_roles ur
            INNER JOIN public.roles ro ON ro.id = ur.role_id AND ro.deleted_at IS NULL
            WHERE ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
              AND ro.code = 'Faculty'
        ),
        'sections_this_term', (
            SELECT COUNT(*)
            FROM public.sections s
            WHERE s.deleted_at IS NULL
              AND s.term_id = v_term_id
        ),
        'unassigned_sections', (
            SELECT COUNT(*)
            FROM public.sections s
            WHERE s.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND s.faculty_id IS NULL
        ),
        'enrolled_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
        ),
        'schedule_conflicts',
            COALESCE((v_conflicts->>'faculty_conflict_count')::INTEGER, 0)
            + COALESCE((v_conflicts->>'room_conflict_count')::INTEGER, 0),
        'at_risk_students', COALESCE(v_at_risk_total, 0)
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'course_code', x->>'section_code'), '[]'::JSONB)
    INTO v_unassigned
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'enrolled_count', (
                SELECT COUNT(*)
                FROM public.enrollments e
                WHERE e.section_id = s.id
                  AND e.deleted_at IS NULL
                  AND e.status = 'Enrolled'
            )
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
          AND s.term_id = v_term_id
          AND s.faculty_id IS NULL
        LIMIT 8
    ) unassigned;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'at_risk_count')::INTEGER DESC, x->>'section_code'), '[]'::JSONB)
    INTO v_at_risk_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'faculty_name', CASE
                WHEN fu.id IS NULL THEN NULL
                ELSE fu.first_name || ' ' || fu.last_name
            END,
            'enrolled_count', COUNT(r.enrollment_id),
            'at_risk_count', COUNT(*) FILTER (WHERE r.is_at_risk),
            'avg_score_pct', ROUND(AVG(r.avg_score_pct), 2)
        ) AS x
        FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
        INNER JOIN public.sections s ON s.id = r.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
        GROUP BY s.id, s.section_code, c.code, fu.id, fu.first_name, fu.last_name
        HAVING COUNT(*) FILTER (WHERE r.is_at_risk) > 0
        ORDER BY COUNT(*) FILTER (WHERE r.is_at_risk) DESC
        LIMIT 5
    ) at_risk;

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

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'unassigned_sections', v_unassigned,
        'at_risk_sections', v_at_risk_sections,
        'program_distribution', v_program_distribution
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_registrar_dashboard(p_term_id uuid DEFAULT NULL::uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_dashboard(p_term_id uuid DEFAULT NULL::uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_faculty_id UUID;
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
BEGIN
    PERFORM public.fn_assert_role('Faculty', 'Admin');

    v_faculty_id := auth.uid();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_today := to_char(now(), 'FMDay')::public.day_of_week_type;

    SELECT COALESCE(array_agg(s.id), ARRAY[]::UUID[])
    INTO v_section_ids
    FROM public.sections s
    WHERE s.deleted_at IS NULL
      AND s.faculty_id = v_faculty_id
      AND s.term_id = v_term_id;

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.deleted_at IS NULL
      AND e.status = 'Enrolled'
      AND e.section_id = ANY (v_section_ids);

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'my_sections', COALESCE(array_length(v_section_ids, 1), 0),
        'total_students', COALESCE(array_length(v_enrollment_ids, 1), 0),
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
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_dean_dashboard(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_registrar_dashboard(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_faculty_dashboard(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_dean_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_registrar_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_faculty_dashboard(uuid) TO authenticated;
