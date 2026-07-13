CREATE OR REPLACE FUNCTION public.fn_analytics_resolve_student(p_student_id uuid)
    RETURNS uuid
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_roles TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_student_id IS NULL THEN
        SELECT s.id
        INTO v_student_id
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.deleted_at IS NULL
        LIMIT 1;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'Forbidden: no student profile is linked to your account.'
                USING ERRCODE = '42501';
        END IF;

        RETURN v_student_id;
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF v_roles && ARRAY['Admin', 'Registrar', 'Dean'] THEN
        RETURN p_student_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = p_student_id
          AND s.user_id = auth.uid()
          AND s.deleted_at IS NULL
    ) THEN
        RETURN p_student_id;
    END IF;

    IF 'Faculty' = ANY (v_roles) AND EXISTS (
        SELECT 1
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        WHERE e.student_id = p_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
          AND sec.faculty_id = auth.uid()
    ) THEN
        RETURN p_student_id;
    END IF;

    RAISE EXCEPTION 'Forbidden: you may only view insight for your own record or for students you teach.'
        USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_resolve_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_resolve_student(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_analytics_resolve_student(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_analytics_assert_section(p_section_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar', 'Dean'] THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id
          AND s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
    ) THEN
        RETURN;
    END IF;

    RAISE EXCEPTION 'Forbidden: you may only view insight for sections you teach.'
        USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_assert_section(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_assert_section(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_analytics_assert_section(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_analytics_submission_scores(p_enrollment_ids uuid[])
    RETURNS TABLE (
        enrollment_id uuid,
        assessment_item_id uuid,
        section_id uuid,
        assessment_type text,
        grading_component_id uuid,
        title text,
        due_at timestamptz,
        total_points numeric,
        score numeric,
        score_pct numeric,
        is_late boolean,
        submitted_at timestamptz
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT DISTINCT ON (sub.enrollment_id, sub.assessment_item_id)
        sub.enrollment_id,
        sub.assessment_item_id,
        ai.section_id,
        ai.assessment_type::TEXT,
        ai.grading_component_id,
        ai.title,
        ai.due_at,
        ai.total_points,
        COALESCE(sub.final_score, sub.raw_score) AS score,
        ROUND(COALESCE(sub.final_score, sub.raw_score) / NULLIF(ai.total_points, 0) * 100, 2) AS score_pct,
        sub.is_late,
        sub.submitted_at
    FROM public.assessment_submissions sub
    INNER JOIN public.assessment_items ai
        ON ai.id = sub.assessment_item_id
        AND ai.deleted_at IS NULL
        AND ai.is_published
    WHERE sub.enrollment_id = ANY (p_enrollment_ids)
      AND sub.deleted_at IS NULL
      AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
      AND COALESCE(sub.final_score, sub.raw_score) IS NOT NULL
    ORDER BY
        sub.enrollment_id,
        sub.assessment_item_id,
        COALESCE(sub.final_score, sub.raw_score) DESC;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_submission_scores(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_submission_scores(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.fn_analytics_submission_scores(uuid[]) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_analytics_engagement(p_enrollment_ids uuid[])
    RETURNS TABLE (
        enrollment_id uuid,
        sessions_total integer,
        present_count integer,
        late_count integer,
        excused_count integer,
        absent_count integer,
        attendance_rate numeric,
        due_count integer,
        submitted_count integer,
        on_time_count integer,
        late_submission_count integer,
        missing_count integer,
        submission_rate numeric,
        materials_total integer,
        materials_completed integer
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    WITH targets AS (
        SELECT
            e.id AS enrollment_id,
            e.section_id
        FROM public.enrollments e
        WHERE e.id = ANY (p_enrollment_ids)
          AND e.deleted_at IS NULL
    ),
    marked AS (
        SELECT
            ar.enrollment_id,
            ar.id,
            ar.status
        FROM public.attendance_records ar
        INNER JOIN public.attendance_sessions asx
            ON asx.id = ar.attendance_session_id
            AND asx.deleted_at IS NULL
        WHERE ar.deleted_at IS NULL
          AND ar.enrollment_id = ANY (p_enrollment_ids)
    ),
    attendance AS (
        SELECT
            t.enrollment_id,
            COUNT(ar.id)::INTEGER AS sessions_total,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Present')::INTEGER AS present_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Late')::INTEGER AS late_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Excused')::INTEGER AS excused_count,
            COUNT(ar.id) FILTER (WHERE ar.status = 'Absent')::INTEGER AS absent_count
        FROM targets t
        LEFT JOIN marked ar ON ar.enrollment_id = t.enrollment_id
        GROUP BY t.enrollment_id
    ),
    due_items AS (
        SELECT
            t.enrollment_id,
            ai.id AS assessment_item_id
        FROM targets t
        INNER JOIN public.assessment_items ai
            ON ai.section_id = t.section_id
            AND ai.deleted_at IS NULL
            AND ai.is_published
            AND ai.due_at IS NOT NULL
            AND ai.due_at < now()
    ),
    submissions AS (
        SELECT
            d.enrollment_id,
            d.assessment_item_id,
            bool_or(sub.id IS NOT NULL) AS has_submission,
            bool_or(sub.id IS NOT NULL AND NOT sub.is_late) AS has_on_time
        FROM due_items d
        LEFT JOIN public.assessment_submissions sub
            ON sub.assessment_item_id = d.assessment_item_id
            AND sub.enrollment_id = d.enrollment_id
            AND sub.deleted_at IS NULL
            AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
        GROUP BY d.enrollment_id, d.assessment_item_id
    ),
    submission_totals AS (
        SELECT
            t.enrollment_id,
            COUNT(s.assessment_item_id)::INTEGER AS due_count,
            COUNT(s.assessment_item_id) FILTER (WHERE s.has_submission)::INTEGER AS submitted_count,
            COUNT(s.assessment_item_id) FILTER (WHERE s.has_on_time)::INTEGER AS on_time_count,
            COUNT(s.assessment_item_id) FILTER (WHERE s.has_submission AND NOT s.has_on_time)::INTEGER AS late_submission_count,
            COUNT(s.assessment_item_id) FILTER (WHERE NOT s.has_submission)::INTEGER AS missing_count
        FROM targets t
        LEFT JOIN submissions s ON s.enrollment_id = t.enrollment_id
        GROUP BY t.enrollment_id
    ),
    materials AS (
        SELECT
            t.enrollment_id,
            COUNT(cm.id)::INTEGER AS materials_total,
            COUNT(mc.id)::INTEGER AS materials_completed
        FROM targets t
        LEFT JOIN public.modules m
            ON m.section_id = t.section_id
            AND m.deleted_at IS NULL
            AND m.is_published
        LEFT JOIN public.course_materials cm
            ON cm.module_id = m.id
            AND cm.deleted_at IS NULL
        LEFT JOIN public.material_completions mc
            ON mc.material_id = cm.id
            AND mc.enrollment_id = t.enrollment_id
            AND mc.deleted_at IS NULL
        GROUP BY t.enrollment_id
    )
    SELECT
        t.enrollment_id,
        COALESCE(a.sessions_total, 0),
        COALESCE(a.present_count, 0),
        COALESCE(a.late_count, 0),
        COALESCE(a.excused_count, 0),
        COALESCE(a.absent_count, 0),
        CASE
            WHEN COALESCE(a.sessions_total, 0) = 0
                THEN NULL
            ELSE ROUND((a.sessions_total - a.absent_count)::NUMERIC / a.sessions_total * 100, 2)
        END,
        COALESCE(st.due_count, 0),
        COALESCE(st.submitted_count, 0),
        COALESCE(st.on_time_count, 0),
        COALESCE(st.late_submission_count, 0),
        COALESCE(st.missing_count, 0),
        CASE
            WHEN COALESCE(st.due_count, 0) = 0
                THEN NULL
            ELSE ROUND(st.submitted_count::NUMERIC / st.due_count * 100, 2)
        END,
        COALESCE(mt.materials_total, 0),
        COALESCE(mt.materials_completed, 0)
    FROM targets t
    LEFT JOIN attendance a ON a.enrollment_id = t.enrollment_id
    LEFT JOIN submission_totals st ON st.enrollment_id = t.enrollment_id
    LEFT JOIN materials mt ON mt.enrollment_id = t.enrollment_id;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_engagement(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_engagement(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.fn_analytics_engagement(uuid[]) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_analytics_risk_score(
    p_attendance_rate numeric,
    p_avg_score_pct numeric,
    p_missing_count integer,
    p_failing_count integer
)
    RETURNS numeric
    LANGUAGE sql
    IMMUTABLE
    AS $$
    SELECT LEAST(
        100,
        ROUND(
            CASE
                WHEN p_attendance_rate IS NULL OR p_attendance_rate >= 75
                    THEN 0
                ELSE LEAST((75 - p_attendance_rate) * 0.8, 40)
            END
            + CASE
                WHEN p_avg_score_pct IS NULL OR p_avg_score_pct >= 75
                    THEN 0
                ELSE LEAST((75 - p_avg_score_pct) * 0.6, 40)
            END
            + LEAST(COALESCE(p_missing_count, 0) * 8, 30)
            + CASE
                WHEN COALESCE(p_failing_count, 0) > 0
                    THEN 20
                ELSE 0
            END,
            2
        )
    );
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_risk_score(numeric, numeric, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_analytics_risk_score(numeric, numeric, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_analytics_risk_level(p_risk_score numeric)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    AS $$
    SELECT CASE
        WHEN COALESCE(p_risk_score, 0) >= 60 THEN 'High'
        WHEN COALESCE(p_risk_score, 0) >= 30 THEN 'Moderate'
        ELSE 'Low'
    END;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_risk_level(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_analytics_risk_level(numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_student_insight(
    p_student_id uuid DEFAULT NULL,
    p_term_id uuid DEFAULT NULL
)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_term_id UUID;
    v_program_id UUID;
    v_student JSONB;
    v_term JSONB;
    v_enrollment_ids UUID[];
    v_cumulative_gwa NUMERIC;
    v_earned_units NUMERIC;
    v_gwa_units NUMERIC;
    v_failing_count INTEGER;
    v_required_units NUMERIC;
    v_remaining_units NUMERIC;
    v_term_gwa NUMERIC;
    v_trend JSONB;
    v_trajectory JSONB;
    v_courses JSONB;
    v_by_type JSONB;
    v_by_competency JSONB;
    v_granularity TEXT;
    v_avg_score_pct NUMERIC;
    v_attendance_rate NUMERIC;
    v_missing_count INTEGER;
    v_engagement JSONB;
    v_risk_score NUMERIC;
    v_reasons JSONB;
    v_focus JSONB;
    v_strengths JSONB;
    v_weaknesses JSONB;
BEGIN
    v_student_id := public.fn_analytics_resolve_student(p_student_id);

    SELECT
        jsonb_build_object(
            'student_id', s.id,
            'student_number', s.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'year_level', s.year_level,
            'status', s.status,
            'program_code', p.code,
            'program_name', p.name
        ),
        s.program_id
    INTO v_student, v_program_id
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record was not found.');
    END IF;

    IF p_term_id IS NOT NULL THEN
        v_term_id := p_term_id;
    ELSE
        SELECT t.id
        INTO v_term_id
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = sec.term_id AND t.deleted_at IS NULL
        WHERE e.student_id = v_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
        ORDER BY (t.status = 'Ongoing') DESC, t.start_date DESC
        LIMIT 1;
    END IF;

    SELECT jsonb_build_object(
        'term_id', t.id,
        'term_label', tt.label || ' - ' || sy.label,
        'status', t.status
    )
    INTO v_term
    FROM public.terms t
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.id = v_term_id
      AND t.deleted_at IS NULL;

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL
      AND e.status <> 'Dropped'
      AND sec.term_id = v_term_id;

    SELECT
        ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2),
        COALESCE(SUM(g.units) FILTER (WHERE g.is_passing), 0),
        COALESCE(SUM(g.units), 0),
        COUNT(*) FILTER (WHERE g.is_passing IS FALSE)
    INTO v_cumulative_gwa, v_earned_units, v_gwa_units, v_failing_count
    FROM public.fn_student_course_grades(v_student_id) g
    WHERE g.is_released
      AND g.grade IS NOT NULL;

    v_failing_count := COALESCE(v_failing_count, 0);
    v_earned_units := COALESCE(v_earned_units, 0);
    v_gwa_units := COALESCE(v_gwa_units, 0);

    SELECT ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2)
    INTO v_term_gwa
    FROM public.fn_student_course_grades(v_student_id) g
    WHERE g.is_released
      AND g.grade IS NOT NULL
      AND g.term_id = v_term_id;

    SELECT COALESCE(SUM(c.total_units), 0)
    INTO v_required_units
    FROM public.curriculum_maps cm
    INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
    WHERE cm.program_id = v_program_id
      AND cm.deleted_at IS NULL;

    v_remaining_units := GREATEST(COALESCE(v_required_units, 0) - v_earned_units, 0);

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'term_id', x.term_id,
                'term_label', x.term_label,
                'gwa', x.gwa,
                'units', x.units
            )
            ORDER BY x.school_year_start, x.sequence
        ),
        '[]'::jsonb
    )
    INTO v_trend
    FROM (
        SELECT
            t.id AS term_id,
            tt.label || ' - ' || sy.label AS term_label,
            sy.start_date AS school_year_start,
            tt.sequence AS sequence,
            ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2) AS gwa,
            SUM(g.units) AS units
        FROM public.fn_student_course_grades(v_student_id) g
        INNER JOIN public.terms t ON t.id = g.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE g.is_released
          AND g.grade IS NOT NULL
        GROUP BY t.id, tt.label, sy.label, sy.start_date, tt.sequence
    ) x;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'code', y.code,
                'label', y.label,
                'category', y.category,
                'target_gwa', y.max_gwa,
                'discount_pct', y.scholarship_discount_pct,
                'is_currently_qualified', y.is_currently_qualified,
                'is_blocked_by_failing', y.is_blocked_by_failing,
                'gwa_gap', y.gwa_gap,
                'required_avg_on_remaining', y.required_avg,
                'is_attainable', y.is_attainable
            )
            ORDER BY y.category, y.sort_order
        ),
        '[]'::jsonb
    )
    INTO v_trajectory
    FROM (
        SELECT
            th.code,
            th.label,
            th.category,
            th.max_gwa,
            th.scholarship_discount_pct,
            th.sort_order,
            (
                v_cumulative_gwa IS NOT NULL
                AND v_cumulative_gwa <= th.max_gwa
                AND (NOT th.requires_no_failing OR v_failing_count = 0)
            ) AS is_currently_qualified,
            (th.requires_no_failing AND v_failing_count > 0) AS is_blocked_by_failing,
            CASE
                WHEN v_cumulative_gwa IS NULL
                    THEN NULL
                ELSE ROUND(v_cumulative_gwa - th.max_gwa, 2)
            END AS gwa_gap,
            CASE
                WHEN v_cumulative_gwa IS NULL OR v_remaining_units <= 0 OR v_gwa_units <= 0
                    THEN NULL
                ELSE ROUND(
                    (th.max_gwa * (v_gwa_units + v_remaining_units) - v_cumulative_gwa * v_gwa_units)
                        / v_remaining_units,
                    2
                )
            END AS required_avg,
            CASE
                WHEN th.requires_no_failing AND v_failing_count > 0
                    THEN false
                WHEN v_cumulative_gwa IS NULL
                    THEN NULL
                WHEN v_cumulative_gwa <= th.max_gwa
                    THEN true
                WHEN v_remaining_units <= 0 OR v_gwa_units <= 0
                    THEN false
                ELSE (
                    (th.max_gwa * (v_gwa_units + v_remaining_units) - v_cumulative_gwa * v_gwa_units)
                        / v_remaining_units
                ) >= 1.00
            END AS is_attainable
        FROM public.academic_thresholds th
        WHERE th.category IN ('Honor', 'Scholarship')
          AND th.is_active
          AND th.deleted_at IS NULL
    ) y;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'enrollment_id', c.enrollment_id,
                'section_id', c.section_id,
                'section_code', c.section_code,
                'course_code', c.course_code,
                'course_title', c.course_title,
                'avg_score_pct', c.avg_score_pct,
                'attendance_rate', c.attendance_rate,
                'missing_count', c.missing_count,
                'graded_count', c.graded_count,
                'released_grade', c.released_grade
            )
            ORDER BY c.course_code
        ),
        '[]'::jsonb
    )
    INTO v_courses
    FROM (
        SELECT
            e.id AS enrollment_id,
            sec.id AS section_id,
            sec.section_code,
            co.code AS course_code,
            co.title AS course_title,
            sc.avg_score_pct,
            en.attendance_rate,
            en.missing_count,
            COALESCE(sc.graded_count, 0) AS graded_count,
            (
                SELECT ROUND(
                    SUM(COALESCE(sfg.transmuted_grade, sfg.final_grade) * gp.weight)
                        / NULLIF(SUM(gp.weight), 0),
                    2
                )
                FROM public.section_final_grades sfg
                INNER JOIN public.grading_periods gp
                    ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
                WHERE sfg.enrollment_id = e.id
                  AND sfg.status = 'Released'
                  AND sfg.deleted_at IS NULL
            ) AS released_grade
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.courses co ON co.id = sec.course_id AND co.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                s.enrollment_id,
                ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS avg_score_pct,
                COUNT(*)::INTEGER AS graded_count
            FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
            GROUP BY s.enrollment_id
        ) sc ON sc.enrollment_id = e.id
        LEFT JOIN public.fn_analytics_engagement(v_enrollment_ids) en ON en.enrollment_id = e.id
        WHERE e.id = ANY (v_enrollment_ids)
    ) c;

    SELECT
        ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2)
    INTO v_avg_score_pct
    FROM public.fn_analytics_submission_scores(v_enrollment_ids) s;

    SELECT
        ROUND(
            SUM(en.sessions_total - en.absent_count)::NUMERIC
                / NULLIF(SUM(en.sessions_total), 0) * 100,
            2
        ),
        COALESCE(SUM(en.missing_count), 0)
    INTO v_attendance_rate, v_missing_count
    FROM public.fn_analytics_engagement(v_enrollment_ids) en;

    SELECT jsonb_build_object(
        'sessions_total', COALESCE(SUM(en.sessions_total), 0),
        'present_count', COALESCE(SUM(en.present_count), 0),
        'late_count', COALESCE(SUM(en.late_count), 0),
        'excused_count', COALESCE(SUM(en.excused_count), 0),
        'absent_count', COALESCE(SUM(en.absent_count), 0),
        'attendance_rate', v_attendance_rate,
        'due_count', COALESCE(SUM(en.due_count), 0),
        'submitted_count', COALESCE(SUM(en.submitted_count), 0),
        'on_time_count', COALESCE(SUM(en.on_time_count), 0),
        'late_submission_count', COALESCE(SUM(en.late_submission_count), 0),
        'missing_count', COALESCE(SUM(en.missing_count), 0),
        'submission_rate', CASE
            WHEN COALESCE(SUM(en.due_count), 0) = 0
                THEN NULL
            ELSE ROUND(SUM(en.submitted_count)::NUMERIC / SUM(en.due_count) * 100, 2)
        END,
        'on_time_rate', CASE
            WHEN COALESCE(SUM(en.due_count), 0) = 0
                THEN NULL
            ELSE ROUND(SUM(en.on_time_count)::NUMERIC / SUM(en.due_count) * 100, 2)
        END,
        'materials_total', COALESCE(SUM(en.materials_total), 0),
        'materials_completed', COALESCE(SUM(en.materials_completed), 0),
        'materials_rate', CASE
            WHEN COALESCE(SUM(en.materials_total), 0) = 0
                THEN NULL
            ELSE ROUND(SUM(en.materials_completed)::NUMERIC / SUM(en.materials_total) * 100, 2)
        END
    )
    INTO v_engagement
    FROM public.fn_analytics_engagement(v_enrollment_ids) en;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', t.assessment_type,
                'label', t.assessment_type,
                'score_pct', t.score_pct,
                'item_count', t.item_count
            )
            ORDER BY t.score_pct DESC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_type
    FROM (
        SELECT
            s.assessment_type,
            ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS score_pct,
            COUNT(*)::INTEGER AS item_count
        FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
        GROUP BY s.assessment_type
    ) t;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', k.competency_id,
                'label', k.code || ' - ' || k.title,
                'code', k.code,
                'title', k.title,
                'bloom_level', k.bloom_level,
                'score_pct', k.score_pct,
                'item_count', k.item_count
            )
            ORDER BY k.score_pct DESC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_competency
    FROM (
        SELECT
            cp.id AS competency_id,
            cp.code,
            cp.title,
            cp.bloom_level,
            ROUND(
                SUM(COALESCE(sa.points_earned, 0) * aqc.weight / 100)
                    / NULLIF(SUM(q.points * aqc.weight / 100), 0) * 100,
                2
            ) AS score_pct,
            COUNT(DISTINCT q.id)::INTEGER AS item_count
        FROM public.student_answers sa
        INNER JOIN public.assessment_submissions sub
            ON sub.id = sa.submission_id
            AND sub.deleted_at IS NULL
            AND sub.enrollment_id = ANY (v_enrollment_ids)
        INNER JOIN public.assessment_questions q
            ON q.id = sa.question_id
            AND q.deleted_at IS NULL
        INNER JOIN public.assessment_question_competencies aqc
            ON aqc.question_id = q.id
            AND aqc.deleted_at IS NULL
        INNER JOIN public.competencies cp
            ON cp.id = aqc.competency_id
            AND cp.deleted_at IS NULL
        WHERE sa.deleted_at IS NULL
          AND sa.points_earned IS NOT NULL
        GROUP BY cp.id, cp.code, cp.title, cp.bloom_level
    ) k;

    v_granularity := CASE
        WHEN jsonb_array_length(v_by_competency) > 0
            THEN 'fine'
        ELSE 'medium'
    END;

    SELECT
        COALESCE(
            jsonb_agg(z.entry ORDER BY (z.entry->>'score_pct')::NUMERIC DESC)
                FILTER (WHERE (z.entry->>'score_pct')::NUMERIC >= 80),
            '[]'::jsonb
        ),
        COALESCE(
            jsonb_agg(z.entry ORDER BY (z.entry->>'score_pct')::NUMERIC ASC)
                FILTER (WHERE (z.entry->>'score_pct')::NUMERIC < 75),
            '[]'::jsonb
        )
    INTO v_strengths, v_weaknesses
    FROM (
        SELECT entry
        FROM jsonb_array_elements(
            CASE
                WHEN v_granularity = 'fine'
                    THEN v_by_competency
                ELSE v_by_type
            END
        ) AS entry
        WHERE entry->>'score_pct' IS NOT NULL
    ) z;

    v_risk_score := public.fn_analytics_risk_score(
        v_attendance_rate,
        v_avg_score_pct,
        v_missing_count,
        v_failing_count
    );

    SELECT COALESCE(jsonb_agg(r.reason), '[]'::jsonb)
    INTO v_reasons
    FROM (
        SELECT 'Attendance is ' || ROUND(v_attendance_rate)::TEXT || '%, below the 75% threshold.' AS reason
        WHERE v_attendance_rate IS NOT NULL AND v_attendance_rate < 75
        UNION ALL
        SELECT 'Average assessment score is ' || ROUND(v_avg_score_pct)::TEXT || '%, below the 75% threshold.'
        WHERE v_avg_score_pct IS NOT NULL AND v_avg_score_pct < 75
        UNION ALL
        SELECT v_missing_count::TEXT || ' past-due assessment(s) were never submitted.'
        WHERE v_missing_count > 0
        UNION ALL
        SELECT v_failing_count::TEXT || ' released course grade(s) are failing.'
        WHERE v_failing_count > 0
    ) r;

    SELECT COALESCE(jsonb_agg(f.item ORDER BY f.priority), '[]'::jsonb)
    INTO v_focus
    FROM (
        SELECT
            1 AS priority,
            jsonb_build_object(
                'priority', 1,
                'title', 'Submit the ' || v_missing_count::TEXT || ' missing assessment(s)',
                'detail', 'Unsubmitted past-due work scores zero and is the fastest drag on your grade to reverse.'
            ) AS item
        WHERE v_missing_count > 0
        UNION ALL
        SELECT
            2,
            jsonb_build_object(
                'priority', 2,
                'title', 'Raise attendance above 75%',
                'detail', 'You have attended ' || ROUND(COALESCE(v_attendance_rate, 0))::TEXT
                    || '% of sessions. Attendance strongly tracks with assessment performance.'
            )
        WHERE v_attendance_rate IS NOT NULL AND v_attendance_rate < 75
        UNION ALL
        SELECT
            3,
            jsonb_build_object(
                'priority', 3,
                'title', 'Focus on ' || (w.entry->>'label'),
                'detail', 'Your weakest area at ' || ROUND((w.entry->>'score_pct')::NUMERIC)::TEXT
                    || '%. Review this before the next assessment.'
            )
        FROM (
            SELECT e.entry
            FROM jsonb_array_elements(v_weaknesses) AS e(entry)
            LIMIT 3
        ) w
    ) f;

    RETURN jsonb_build_object(
        'success', true,
        'student', v_student,
        'term', v_term,
        'academic', jsonb_build_object(
            'cumulative_gwa', v_cumulative_gwa,
            'term_gwa', v_term_gwa,
            'earned_units', v_earned_units,
            'required_units', v_required_units,
            'remaining_units', v_remaining_units,
            'failing_count', v_failing_count
        ),
        'gwa_trend', v_trend,
        'trajectory', v_trajectory,
        'courses', v_courses,
        'performance', jsonb_build_object(
            'granularity', v_granularity,
            'avg_score_pct', v_avg_score_pct,
            'by_assessment_type', v_by_type,
            'by_competency', v_by_competency,
            'strengths', v_strengths,
            'weaknesses', v_weaknesses
        ),
        'engagement', v_engagement,
        'risk', jsonb_build_object(
            'risk_score', v_risk_score,
            'risk_level', public.fn_analytics_risk_level(v_risk_score),
            'is_at_risk', v_risk_score >= 30,
            'reasons', v_reasons
        ),
        'recommended_focus', v_focus
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_section_insight(p_section_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section JSONB;
    v_enrollment_ids UUID[];
    v_students JSONB;
    v_summary JSONB;
    v_assessments JSONB;
    v_distribution JSONB;
    v_by_type JSONB;
    v_by_competency JSONB;
    v_granularity TEXT;
BEGIN
    PERFORM public.fn_analytics_assert_section(p_section_id);

    SELECT jsonb_build_object(
        'section_id', sec.id,
        'section_code', sec.section_code,
        'course_code', c.code,
        'course_title', c.title,
        'term_label', tt.label || ' - ' || sy.label
    )
    INTO v_section
    FROM public.sections sec
    INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = sec.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE sec.id = p_section_id
      AND sec.deleted_at IS NULL;

    IF v_section IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section was not found.');
    END IF;

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.deleted_at IS NULL
      AND e.status <> 'Dropped';

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'student_id', r.student_id,
                'enrollment_id', r.enrollment_id,
                'student_number', r.student_number,
                'full_name', r.full_name,
                'avg_score_pct', r.avg_score_pct,
                'attendance_rate', r.attendance_rate,
                'missing_count', r.missing_count,
                'graded_count', r.graded_count,
                'risk_score', r.risk_score,
                'risk_level', public.fn_analytics_risk_level(r.risk_score),
                'is_at_risk', r.risk_score >= 30
            )
            ORDER BY r.risk_score DESC, r.full_name
        ),
        '[]'::jsonb
    )
    INTO v_students
    FROM (
        SELECT
            st.id AS student_id,
            e.id AS enrollment_id,
            st.student_number,
            u.first_name || ' ' || u.last_name AS full_name,
            sc.avg_score_pct,
            en.attendance_rate,
            COALESCE(en.missing_count, 0) AS missing_count,
            COALESCE(sc.graded_count, 0) AS graded_count,
            public.fn_analytics_risk_score(
                en.attendance_rate,
                sc.avg_score_pct,
                COALESCE(en.missing_count, 0),
                0
            ) AS risk_score
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                s.enrollment_id,
                ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS avg_score_pct,
                COUNT(*)::INTEGER AS graded_count
            FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
            GROUP BY s.enrollment_id
        ) sc ON sc.enrollment_id = e.id
        LEFT JOIN public.fn_analytics_engagement(v_enrollment_ids) en ON en.enrollment_id = e.id
        WHERE e.id = ANY (v_enrollment_ids)
    ) r;

    SELECT jsonb_build_object(
        'enrolled_count', jsonb_array_length(v_students),
        'at_risk_count', (
            SELECT COUNT(*)
            FROM jsonb_array_elements(v_students) AS s(entry)
            WHERE (s.entry->>'is_at_risk')::BOOLEAN
        ),
        'avg_score_pct', (
            SELECT ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2)
            FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
        ),
        'avg_attendance_rate', (
            SELECT ROUND(
                SUM(en.sessions_total - en.absent_count)::NUMERIC
                    / NULLIF(SUM(en.sessions_total), 0) * 100,
                2
            )
            FROM public.fn_analytics_engagement(v_enrollment_ids) en
        ),
        'submission_rate', (
            SELECT ROUND(SUM(en.submitted_count)::NUMERIC / NULLIF(SUM(en.due_count), 0) * 100, 2)
            FROM public.fn_analytics_engagement(v_enrollment_ids) en
        )
    )
    INTO v_summary;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'assessment_id', a.assessment_item_id,
                'title', a.title,
                'assessment_type', a.assessment_type,
                'due_at', a.due_at,
                'total_points', a.total_points,
                'avg_score_pct', a.avg_score_pct,
                'highest_pct', a.highest_pct,
                'lowest_pct', a.lowest_pct,
                'graded_count', a.graded_count,
                'submission_rate', a.submission_rate
            )
            ORDER BY a.due_at NULLS LAST, a.title
        ),
        '[]'::jsonb
    )
    INTO v_assessments
    FROM (
        SELECT
            ai.id AS assessment_item_id,
            ai.title,
            ai.assessment_type::TEXT AS assessment_type,
            ai.due_at,
            ai.total_points,
            ROUND(AVG(s.score_pct), 2) AS avg_score_pct,
            ROUND(MAX(s.score_pct), 2) AS highest_pct,
            ROUND(MIN(s.score_pct), 2) AS lowest_pct,
            COUNT(s.enrollment_id)::INTEGER AS graded_count,
            CASE
                WHEN COALESCE(array_length(v_enrollment_ids, 1), 0) = 0
                    THEN NULL
                ELSE ROUND(
                    COUNT(s.enrollment_id)::NUMERIC / array_length(v_enrollment_ids, 1) * 100,
                    2
                )
            END AS submission_rate
        FROM public.assessment_items ai
        LEFT JOIN public.fn_analytics_submission_scores(v_enrollment_ids) s
            ON s.assessment_item_id = ai.id
        WHERE ai.section_id = p_section_id
          AND ai.deleted_at IS NULL
          AND ai.is_published
        GROUP BY ai.id, ai.title, ai.assessment_type, ai.due_at, ai.total_points
    ) a;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object('bucket', b.bucket, 'student_count', b.student_count)
            ORDER BY b.sort_order
        ),
        '[]'::jsonb
    )
    INTO v_distribution
    FROM (
        SELECT
            bk.bucket,
            bk.sort_order,
            (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_students) AS s(entry)
                WHERE (s.entry->>'avg_score_pct') IS NOT NULL
                  AND (s.entry->>'avg_score_pct')::NUMERIC >= bk.min_pct
                  AND (s.entry->>'avg_score_pct')::NUMERIC < bk.max_pct
            )::INTEGER AS student_count
        FROM (VALUES
            ('Below 60', 1, 0::NUMERIC, 60::NUMERIC),
            ('60 - 69', 2, 60::NUMERIC, 70::NUMERIC),
            ('70 - 79', 3, 70::NUMERIC, 80::NUMERIC),
            ('80 - 89', 4, 80::NUMERIC, 90::NUMERIC),
            ('90 - 100', 5, 90::NUMERIC, 100.01::NUMERIC)
        ) AS bk(bucket, sort_order, min_pct, max_pct)
    ) b;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', t.assessment_type,
                'label', t.assessment_type,
                'score_pct', t.score_pct,
                'item_count', t.item_count
            )
            ORDER BY t.score_pct ASC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_type
    FROM (
        SELECT
            s.assessment_type,
            ROUND(SUM(s.score) / NULLIF(SUM(s.total_points), 0) * 100, 2) AS score_pct,
            COUNT(DISTINCT s.assessment_item_id)::INTEGER AS item_count
        FROM public.fn_analytics_submission_scores(v_enrollment_ids) s
        GROUP BY s.assessment_type
    ) t;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'key', k.competency_id,
                'label', k.code || ' - ' || k.title,
                'code', k.code,
                'title', k.title,
                'bloom_level', k.bloom_level,
                'score_pct', k.score_pct,
                'item_count', k.item_count,
                'student_count', k.student_count
            )
            ORDER BY k.score_pct ASC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO v_by_competency
    FROM (
        SELECT
            cp.id AS competency_id,
            cp.code,
            cp.title,
            cp.bloom_level,
            ROUND(
                SUM(COALESCE(sa.points_earned, 0) * aqc.weight / 100)
                    / NULLIF(SUM(q.points * aqc.weight / 100), 0) * 100,
                2
            ) AS score_pct,
            COUNT(DISTINCT q.id)::INTEGER AS item_count,
            COUNT(DISTINCT sub.enrollment_id)::INTEGER AS student_count
        FROM public.student_answers sa
        INNER JOIN public.assessment_submissions sub
            ON sub.id = sa.submission_id
            AND sub.deleted_at IS NULL
            AND sub.enrollment_id = ANY (v_enrollment_ids)
        INNER JOIN public.assessment_questions q
            ON q.id = sa.question_id
            AND q.deleted_at IS NULL
        INNER JOIN public.assessment_question_competencies aqc
            ON aqc.question_id = q.id
            AND aqc.deleted_at IS NULL
        INNER JOIN public.competencies cp
            ON cp.id = aqc.competency_id
            AND cp.deleted_at IS NULL
        WHERE sa.deleted_at IS NULL
          AND sa.points_earned IS NOT NULL
        GROUP BY cp.id, cp.code, cp.title, cp.bloom_level
    ) k;

    v_granularity := CASE
        WHEN jsonb_array_length(v_by_competency) > 0
            THEN 'fine'
        ELSE 'medium'
    END;

    RETURN jsonb_build_object(
        'success', true,
        'section', v_section,
        'summary', v_summary,
        'students', v_students,
        'assessments', v_assessments,
        'score_distribution', v_distribution,
        'mastery', jsonb_build_object(
            'granularity', v_granularity,
            'by_assessment_type', v_by_type,
            'by_competency', v_by_competency,
            'gaps', (
                SELECT COALESCE(jsonb_agg(g.entry), '[]'::jsonb)
                FROM jsonb_array_elements(
                    CASE
                        WHEN v_granularity = 'fine'
                            THEN v_by_competency
                        ELSE v_by_type
                    END
                ) AS g(entry)
                WHERE (g.entry->>'score_pct') IS NOT NULL
                  AND (g.entry->>'score_pct')::NUMERIC < 75
            )
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_analytics_item_submissions(p_assessment_id uuid)
    RETURNS TABLE (
        submission_id uuid,
        score numeric,
        score_pct numeric,
        rank_asc bigint,
        rank_desc bigint
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT
        b.submission_id,
        b.score,
        b.score_pct,
        ROW_NUMBER() OVER (ORDER BY b.score ASC),
        ROW_NUMBER() OVER (ORDER BY b.score DESC)
    FROM (
        SELECT DISTINCT ON (sub.enrollment_id)
            sub.id AS submission_id,
            COALESCE(sub.final_score, sub.raw_score) AS score,
            ROUND(COALESCE(sub.final_score, sub.raw_score) / NULLIF(ai.total_points, 0) * 100, 2) AS score_pct
        FROM public.assessment_submissions sub
        INNER JOIN public.assessment_items ai
            ON ai.id = sub.assessment_item_id
            AND ai.deleted_at IS NULL
        INNER JOIN public.enrollments e
            ON e.id = sub.enrollment_id
            AND e.deleted_at IS NULL
        WHERE sub.assessment_item_id = p_assessment_id
          AND sub.deleted_at IS NULL
          AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
          AND COALESCE(sub.final_score, sub.raw_score) IS NOT NULL
          AND e.status <> 'Dropped'
        ORDER BY sub.enrollment_id, COALESCE(sub.final_score, sub.raw_score) DESC
    ) b;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_item_submissions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_item_submissions(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_analytics_item_submissions(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_item_analysis(p_assessment_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_assessment JSONB;
    v_summary JSONB;
    v_questions JSONB;
    v_group_size INTEGER;
    v_submission_count INTEGER;
BEGIN
    SELECT ai.section_id
    INTO v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
      AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment was not found.');
    END IF;

    PERFORM public.fn_analytics_assert_section(v_section_id);

    SELECT jsonb_build_object(
        'assessment_id', ai.id,
        'title', ai.title,
        'assessment_type', ai.assessment_type,
        'total_points', ai.total_points,
        'section_id', ai.section_id,
        'section_code', sec.section_code,
        'course_code', c.code
    )
    INTO v_assessment
    FROM public.assessment_items ai
    INNER JOIN public.sections sec ON sec.id = ai.section_id AND sec.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
    WHERE ai.id = p_assessment_id;

    SELECT COUNT(*)
    INTO v_submission_count
    FROM public.fn_analytics_item_submissions(p_assessment_id);

    v_group_size := GREATEST(1, FLOOR(v_submission_count * 0.27)::INTEGER);

    SELECT jsonb_build_object(
        'submission_count', v_submission_count,
        'mean_pct', ROUND(AVG(s.score_pct), 2),
        'median_pct', ROUND(
            CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score_pct) AS NUMERIC),
            2
        ),
        'highest_pct', ROUND(MAX(s.score_pct), 2),
        'lowest_pct', ROUND(MIN(s.score_pct), 2),
        'std_dev_pct', ROUND(STDDEV_POP(s.score_pct), 2),
        'group_size', v_group_size
    )
    INTO v_summary
    FROM public.fn_analytics_item_submissions(p_assessment_id) s;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'question_id', q.question_id,
                'sequence', q.sequence,
                'question_text', q.question_text,
                'question_type', q.question_type,
                'points', q.points,
                'answered_count', q.answered_count,
                'correct_count', q.correct_count,
                'difficulty_index', q.difficulty_index,
                'difficulty_label', CASE
                    WHEN q.difficulty_index IS NULL THEN NULL
                    WHEN q.difficulty_index >= 0.80 THEN 'Easy'
                    WHEN q.difficulty_index >= 0.40 THEN 'Moderate'
                    ELSE 'Difficult'
                END,
                'discrimination_index', q.discrimination_index,
                'discrimination_label', CASE
                    WHEN q.discrimination_index IS NULL THEN NULL
                    WHEN q.discrimination_index >= 0.40 THEN 'Excellent'
                    WHEN q.discrimination_index >= 0.30 THEN 'Good'
                    WHEN q.discrimination_index >= 0.20 THEN 'Fair'
                    ELSE 'Poor'
                END,
                'competencies', q.competencies,
                'choices', q.choices
            )
            ORDER BY q.sequence
        ),
        '[]'::jsonb
    )
    INTO v_questions
    FROM (
        SELECT
            aq.id AS question_id,
            aq.sequence,
            aq.question_text,
            aq.question_type::TEXT AS question_type,
            aq.points,
            COUNT(sa.id)::INTEGER AS answered_count,
            COUNT(sa.id) FILTER (WHERE sa.is_correct)::INTEGER AS correct_count,
            ROUND(
                AVG(COALESCE(sa.points_earned, 0)) / NULLIF(aq.points, 0),
                2
            ) AS difficulty_index,
            CASE
                WHEN v_submission_count < 2
                    THEN NULL
                ELSE ROUND(
                    (
                        AVG(COALESCE(sa.points_earned, 0)) FILTER (WHERE sa.rank_desc <= v_group_size)
                        - AVG(COALESCE(sa.points_earned, 0)) FILTER (WHERE sa.rank_asc <= v_group_size)
                    ) / NULLIF(aq.points, 0),
                    2
                )
            END AS discrimination_index,
            (
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object('code', cp.code, 'title', cp.title)
                        ORDER BY cp.code
                    ),
                    '[]'::jsonb
                )
                FROM public.assessment_question_competencies aqc
                INNER JOIN public.competencies cp
                    ON cp.id = aqc.competency_id
                    AND cp.deleted_at IS NULL
                WHERE aqc.question_id = aq.id
                  AND aqc.deleted_at IS NULL
            ) AS competencies,
            (
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'choice_id', ch.id,
                            'choice_text', ch.choice_text,
                            'is_correct', ch.is_correct,
                            'selected_count', (
                                SELECT COUNT(*)
                                FROM public.student_answers sa2
                                INNER JOIN public.fn_analytics_item_submissions(p_assessment_id) ts2
                                    ON ts2.submission_id = sa2.submission_id
                                WHERE sa2.choice_id = ch.id
                                  AND sa2.deleted_at IS NULL
                            )
                        )
                        ORDER BY ch.sequence
                    ),
                    '[]'::jsonb
                )
                FROM public.assessment_question_choices ch
                WHERE ch.question_id = aq.id
                  AND ch.deleted_at IS NULL
            ) AS choices
        FROM public.assessment_questions aq
        LEFT JOIN (
            SELECT
                sa.question_id,
                sa.id,
                sa.points_earned,
                sa.is_correct,
                ts.rank_asc,
                ts.rank_desc
            FROM public.student_answers sa
            INNER JOIN public.fn_analytics_item_submissions(p_assessment_id) ts
                ON ts.submission_id = sa.submission_id
            WHERE sa.deleted_at IS NULL
        ) sa ON sa.question_id = aq.id
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
        GROUP BY aq.id, aq.sequence, aq.question_text, aq.question_type, aq.points
    ) q;

    RETURN jsonb_build_object(
        'success', true,
        'assessment', v_assessment,
        'summary', v_summary,
        'questions', v_questions
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_student_insight(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_section_insight(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_assessment_item_analysis(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_student_insight(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_section_insight(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_assessment_item_analysis(uuid) TO authenticated;