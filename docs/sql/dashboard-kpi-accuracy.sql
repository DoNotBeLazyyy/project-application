CREATE OR REPLACE FUNCTION public.fn_get_active_term()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_id UUID;
    v_term JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_term_id := public.fn_dashboard_active_term();

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'term_id', NULL,
            'term_label', NULL,
            'status', NULL
        );
    END IF;

    v_term := public.fn_dashboard_term_label(v_term_id);

    RETURN COALESCE(v_term, jsonb_build_object(
        'term_id', v_term_id,
        'term_label', NULL,
        'status', NULL
    )) || jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_active_term() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_active_term() TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_student_dashboard()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_upcoming_count INTEGER;
    v_upcoming JSONB;
    v_released_grades_count INTEGER;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT COUNT(*)
    INTO v_upcoming_count
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.assessment_items ai ON ai.section_id = s.id
        AND ai.is_published = true
        AND ai.deleted_at IS NULL
        AND (ai.closes_at IS NULL OR ai.closes_at > now())
    WHERE e.student_id = v_student_id
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.assessment_submissions asub
          WHERE asub.assessment_item_id = ai.id
            AND asub.enrollment_id = e.id
            AND asub.status IN ('Submitted', 'Late', 'Graded')
            AND asub.deleted_at IS NULL
      );

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'due_at') IS NULL, x->>'due_at'), '[]'::JSONB)
    INTO v_upcoming
    FROM (
        SELECT jsonb_build_object(
            'id',              ai.id,
            'title',           ai.title,
            'assessment_type', ai.assessment_type,
            'opens_at',        ai.opens_at,
            'due_at',          ai.due_at,
            'section_code',    s.section_code,
            'course_code',     c.code,
            'enrollment_id',   e.id
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.assessment_items ai ON ai.section_id = s.id
            AND ai.is_published = true
            AND ai.deleted_at IS NULL
            AND (ai.closes_at IS NULL OR ai.closes_at > now())
        WHERE e.student_id = v_student_id
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.assessment_submissions asub
              WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = e.id
                AND asub.status IN ('Submitted', 'Late', 'Graded')
                AND asub.deleted_at IS NULL
          )
        ORDER BY ai.due_at ASC NULLS LAST
        LIMIT 5
    ) upcoming;

    SELECT COUNT(*)
    INTO v_released_grades_count
    FROM public.enrollments e
    INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        AND sfg.status = 'Released'
        AND sfg.deleted_at IS NULL
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'enrolled_count', (
            SELECT COUNT(*)
            FROM public.enrollments e
            WHERE e.student_id = v_student_id
              AND e.status = 'Enrolled'
              AND e.deleted_at IS NULL
        ),
        'upcoming_count', COALESCE(v_upcoming_count, 0),
        'upcoming_assessments', v_upcoming,
        'released_grades_count', COALESCE(v_released_grades_count, 0)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_student_dashboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_student_dashboard() TO authenticated;

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
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_faculty_term(v_faculty_id));
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_today := to_char(now() AT TIME ZONE 'Asia/Manila', 'FMDay')::public.day_of_week_type;

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

REVOKE EXECUTE ON FUNCTION public.fn_get_faculty_dashboard(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_faculty_dashboard(uuid) TO authenticated;