-- ====================================================================
-- Migration: 20261121400006_dashboards_schedule_lists.sql
-- Dashboards, schedule and lists (audit 2026-11-21):
--   * T2 fn_get_student_dashboard: "Enrolled Subjects" counts the current term only; new
--     calendar_assessments lists every open due date (upcoming_assessments stays at 5 for
--     the dashboard card).
--   * T2 fn_get_faculty_dashboard: "today's classes" and sessions today only between the
--     term's start and end dates.
--   * T2 fn_get_student_schedule: a slot without a room shows the section's room.
--   * T4 fn_list_my_subjects: newest term first by start date; new term_start_date column so
--     the Term sort uses the date, not the label.
--   * T2 fn_list_registrar_logs: the date filter uses Manila days.
-- Bodies are the live definitions with only these edits. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_student_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_upcoming_count INTEGER;
    v_upcoming JSONB;
    v_released_grades_count INTEGER;
    v_calendar JSONB;
    v_current_term_id UUID;
    v_today DATE := (now() AT TIME ZONE 'Asia/Manila')::date;
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
        AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
        AND ai.deleted_at IS NULL
        AND (ai.closes_at IS NULL OR ai.closes_at > now())
    WHERE e.student_id = v_student_id
      AND e.status::TEXT = 'Enrolled'
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
            AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
            AND ai.deleted_at IS NULL
            AND (ai.closes_at IS NULL OR ai.closes_at > now())
        WHERE e.student_id = v_student_id
          AND e.status::TEXT = 'Enrolled'
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

    -- The calendar shows every due date, not only the five above
    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'due_at'), '[]'::JSONB)
    INTO v_calendar
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
            AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
            AND ai.deleted_at IS NULL
            AND (ai.closes_at IS NULL OR ai.closes_at > now())
            AND ai.due_at IS NOT NULL
        WHERE e.student_id = v_student_id
          AND e.status::TEXT = 'Enrolled'
          AND e.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.assessment_submissions asub
              WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = e.id
                AND asub.status IN ('Submitted', 'Late', 'Graded')
                AND asub.deleted_at IS NULL
          )
    ) calendar_items;

    -- The current term: today's term, else the latest one already started, else the next one
    SELECT t.id
    INTO v_current_term_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.status::TEXT = 'Enrolled'
      AND e.deleted_at IS NULL
    ORDER BY
        (v_today BETWEEN t.start_date AND t.end_date) DESC NULLS LAST,
        (t.start_date <= v_today) DESC NULLS LAST,
        CASE WHEN t.start_date <= v_today THEN t.start_date END DESC NULLS LAST,
        t.start_date ASC
    LIMIT 1;

    SELECT COUNT(*)
    INTO v_released_grades_count
    FROM public.enrollments e
    INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        AND sfg.status = 'Released'
        AND sfg.deleted_at IS NULL
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.status::TEXT = 'Enrolled'
      AND e.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        -- Subjects of the current term only, not every term ever enrolled
        'enrolled_count', (
            SELECT COUNT(*)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            WHERE e.student_id = v_student_id
              AND e.status::TEXT = 'Enrolled'
              AND e.deleted_at IS NULL
              AND s.term_id = v_current_term_id
        ),
        'upcoming_count', COALESCE(v_upcoming_count, 0),
        'upcoming_assessments', v_upcoming,
        'calendar_assessments', v_calendar,
        'released_grades_count', COALESCE(v_released_grades_count, 0)
    );
END;
$function$;

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

    -- Classes meet only between the term's start and end dates, and holidays marked
    -- "Class Suspended" have none
    v_is_class_day := EXISTS (
        SELECT 1
        FROM public.terms tm
        WHERE tm.id = v_term_id
          AND (now() AT TIME ZONE 'Asia/Manila')::DATE
              BETWEEN COALESCE(tm.start_date, '-infinity'::DATE) AND COALESCE(tm.end_date, 'infinity'::DATE)
    ) AND NOT EXISTS (
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

CREATE OR REPLACE FUNCTION public.fn_get_student_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'section_id',    s.id,
                'section_code',  s.section_code,
                'course_code',   c.code,
                'course_title',  c.title,
                'faculty_name',  u.first_name || ' ' || u.last_name,
                'enrollment_id', e.id,
                'term_start_date', t.start_date,
                'term_end_date', t.end_date,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'schedules', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',         ss.id,
                            'day_of_week', ss.day_of_week,
                            'time_start', ss.time_start,
                            'time_end',   ss.time_end,
                            -- A slot without its own room uses the section's room
                            'room',       COALESCE(NULLIF(btrim(ss.room), ''), s.room)
                        )
                        ORDER BY ss.day_of_week ASC, ss.time_start ASC
                    ), '[]'::JSONB)
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                )
            )
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.terms t ON t.id = s.term_id
        WHERE e.student_id = v_student_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_my_subjects(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
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
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object(
            'content', '[]'::JSONB,
            'empty', true,
            'first', true,
            'last', true,
            'number', 0,
            'numberOfElements', 0,
            'size', p_size,
            'totalElements', 0,
            'totalPages', 0
        );
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id) || ' AND e.deleted_at IS NULL';

    IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR COALESCE(c.code, '''') ILIKE %L OR COALESCE(c.title, '''') ILIKE %L)',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%',
            '%' || btrim(p_search) || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            s.id AS section_id,
            s.section_code,
            COALESCE(c.code, ''—'') AS course_code,
            COALESCE(c.title, ''Untitled Course'') AS course_title,
            COALESCE(c.lecture_units, 0) AS lecture_units,
            COALESCE(c.laboratory_units, 0) AS laboratory_units,
            COALESCE(tt.label || '' - '' || sy.label, ''—'') AS term_label,
            t.start_date AS term_start_date,
            COALESCE(u.first_name || '' '' || u.last_name, ''Unassigned'') AS faculty_name,
            e.status AS enrollment_status,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    -- Newest term first, then by course code
    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.start_date DESC NULLS LAST, c.code ASC');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_registrar_logs(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_action text DEFAULT NULL::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND rl.action = %L', p_action);
    END IF;

    -- The dates are Manila calendar days, not UTC days
    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at >= (%L::date::timestamp AT TIME ZONE ''Asia/Manila'')', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at < ((%L::date + 1)::timestamp AT TIME ZONE ''Asia/Manila'')', p_date_to);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                COALESCE(rl.student_name, '''') ILIKE %L
                OR COALESCE(rl.student_number, '''') ILIKE %L
                OR COALESCE(rl.performed_by_name, '''') ILIKE %L
                OR COALESCE(rl.details, '''') ILIKE %L
                OR COALESCE(rl.action, '''') ILIKE %L
                OR COALESCE(u.email, '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            rl.id,
            rl.action,
            rl.student_id,
            rl.student_user_id,
            COALESCE(
                NULLIF(btrim(rl.student_name), ''''),
                NULLIF(btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')), ''''),
                NULLIF(btrim(COALESCE(rl.new_values->>''first_name'', '''') || '' '' || COALESCE(rl.new_values->>''last_name'', '''')), ''''),
                u.email,
                ''—''
            ) AS student_name,
            COALESCE(NULLIF(btrim(rl.student_number), ''''), s.student_number, ''—'') AS student_number,
            rl.performed_by,
            COALESCE(rl.performed_by_name, ''System'') AS performed_by_name,
            rl.details,
            rl.old_values,
            rl.new_values,
            rl.metadata,
            rl.created_at,
            COUNT(*) OVER () AS total_count
        FROM public.registrar_logs rl
        LEFT JOIN public.users u ON u.id = rl.student_user_id AND u.deleted_at IS NULL
        LEFT JOIN public.students s ON (s.id = rl.student_id OR s.user_id = rl.student_user_id) AND s.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'rl.created_at DESC');
END;
$function$;

COMMIT;
