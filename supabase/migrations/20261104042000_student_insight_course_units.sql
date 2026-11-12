-- ====================================================================
-- Migration: 20261104042000_student_insight_course_units.sql
--   * fn_get_student_insight: each course now carries its real units ('units', from
--     courses.total_units) and the academic block carries 'gwa_units' (units behind the
--     cumulative GWA). The What-If simulator used a flat 3 units per course and could not
--     take this term's already-released grades out of the cumulative GWA before adding the
--     simulated ones, so it counted them twice.
--   Body copied from the latest definition (20260101000000_baseline_schema.sql); only
--   fields are added. Signature and grants unchanged.
-- ====================================================================
BEGIN;

-- fn_get_student_insight
CREATE OR REPLACE FUNCTION public.fn_get_student_insight(p_student_id uuid DEFAULT NULL::uuid, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                'released_grade', c.released_grade,
                'units', c.units
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
            co.total_units AS units,
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
            'gwa_units', v_gwa_units,
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
$function$;

COMMIT;
