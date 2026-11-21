-- ====================================================================
-- Migration: 20261121100000_course_grades_final_only.sql
-- Audit 2026-11-21 (BUG-AUDIT-20261121.md), policies 1, 3, 4:
--   #1  fn_student_course_grades: a special grade (INC, DRP, W, NFE) has no numeric grade,
--       so it never counts in a GWA; fn_get_student_insight also leaves credited courses
--       out of the GWA, like the transcript
--   #2  fn_compute_student_gwa (roster GWA, Dean's List badge): period-weighted final course
--       grades, units-weighted across courses; no raw percentages
--   #3  fn_student_course_grades: a course is final (is_released) only when every grading
--       period of its term is Released; until then grade/special/is_passing are NULL. This
--       feeds GWA, transcript, curriculum audit, failing count, honors and year level.
--   #8  fn_get_student_insight: honor/scholarship targets from the school year of the term
--       shown (global thresholds as fallback), not every school year
--   #16 fn_calculate_student_curriculum_year_level, fn_evaluate_student_year_level: never
--       above the program's years_duration
--   T2  fn_get_student_transcript: credited courses are listed (their units were counted)
-- Bodies are based on the live definitions read on 2026-11-21. Idempotent (CREATE OR REPLACE).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_student_course_grades(p_student_id uuid)
 RETURNS TABLE(enrollment_id uuid, term_id uuid, course_id uuid, course_code text, course_title text, units numeric, grade numeric, raw_grade numeric, special_grade text, enrollment_status text, is_released boolean, is_passing boolean, completed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- A course grade is final only when every grading period of its term is Released
    -- (is_released). Until then grade, special_grade and is_passing stay NULL, so the
    -- course reads "In progress" everywhere. A special grade (INC, DRP, W, NFE) is not a
    -- number: grade and raw_grade stay NULL for it, so it never counts in a GWA.
    SELECT
        g.enrollment_id,
        g.term_id,
        g.course_id,
        g.course_code,
        g.course_title,
        g.units,
        CASE WHEN g.is_final AND g.special_grade IS NULL THEN g.grade END AS grade,
        CASE WHEN g.is_final AND g.special_grade IS NULL THEN g.raw_grade END AS raw_grade,
        CASE WHEN g.is_final THEN g.special_grade END AS special_grade,
        g.enrollment_status,
        g.is_final AS is_released,
        CASE
            WHEN NOT g.is_final
                THEN NULL
            WHEN g.special_grade IS NOT NULL
                THEN COALESCE(sgc.is_passing, false)
            WHEN g.grade IS NOT NULL
                THEN g.grade <= 3.00
            ELSE NULL
        END AS is_passing,
        CASE WHEN g.is_final THEN g.completed_at END AS completed_at
    FROM (
        SELECT
            e.id AS enrollment_id,
            sec.term_id AS term_id,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units AS units,
            -- Transmuted grades only: a raw percentage is never a grade on the 1.00-5.00 scale
            CASE
                WHEN COUNT(*) FILTER (
                    WHERE sfg.status = 'Released' AND sfg.special_grade IS NULL AND sfg.transmuted_grade IS NULL
                ) = 0
                THEN ROUND(
                    SUM(sfg.transmuted_grade * gp.weight)
                        FILTER (WHERE sfg.status = 'Released' AND sfg.special_grade IS NULL)
                    / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released' AND sfg.special_grade IS NULL), 0),
                    2
                )
            END AS grade,
            ROUND(
                SUM(sfg.final_grade * gp.weight) FILTER (WHERE sfg.status = 'Released' AND sfg.special_grade IS NULL)
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released' AND sfg.special_grade IS NULL), 0),
                2
            ) AS raw_grade,
            (array_agg(sfg.special_grade ORDER BY CASE upper(sfg.special_grade) WHEN 'W' THEN 4 WHEN 'DRP' THEN 3 WHEN 'NFE' THEN 2 WHEN 'INC' THEN 1 ELSE 0 END DESC)
                FILTER (WHERE sfg.status = 'Released' AND sfg.special_grade IS NOT NULL))[1] AS special_grade,
            e.status::TEXT AS enrollment_status,
            (
                tp.period_count > 0
                AND COUNT(DISTINCT sfg.grading_period_id) FILTER (WHERE sfg.status = 'Released') >= tp.period_count
            ) AS is_final,
            MAX(sfg.released_at) FILTER (WHERE sfg.status = 'Released') AS completed_at
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
        CROSS JOIN LATERAL (
            SELECT COUNT(*) AS period_count
            FROM public.grading_periods tgp
            WHERE tgp.term_id = sec.term_id
              AND tgp.deleted_at IS NULL
        ) tp
        LEFT JOIN (
            public.section_final_grades sfg
            INNER JOIN public.grading_periods gp
                ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        )
            ON sfg.enrollment_id = e.id
           AND sfg.deleted_at IS NULL
           AND gp.term_id = sec.term_id
        WHERE e.student_id = p_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
        GROUP BY e.id, sec.term_id, c.id, c.code, c.title, c.total_units, e.status, tp.period_count
    ) g
    LEFT JOIN public.terms gt ON gt.id = g.term_id
    LEFT JOIN public.special_grade_configs sgc
        ON upper(sgc.code) = upper(g.special_grade)
       AND sgc.school_year_id = gt.school_year_id
       AND sgc.deleted_at IS NULL

    UNION ALL

    -- Credited courses from previous institution (Transferee)
    SELECT
        scc.id AS enrollment_id,
        NULL::uuid AS term_id,
        scc.course_id AS course_id,
        c.code AS course_code,
        c.title AS course_title,
        COALESCE(scc.units_credited, c.total_units) AS units,
        scc.grade_numeric AS grade,
        scc.grade_numeric AS raw_grade,
        COALESCE(scc.grade_display, 'Credited') AS special_grade,
        'Credited'::text AS enrollment_status,
        true AS is_released,
        true AS is_passing,
        scc.created_at AS completed_at
    FROM public.student_credited_courses scc
    INNER JOIN public.courses c ON c.id = scc.course_id AND c.deleted_at IS NULL
    WHERE scc.student_id = p_student_id
      AND scc.deleted_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.fn_compute_student_gwa(p_student_id uuid, p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_units   NUMERIC(8,2) := 0;
  v_gwa           NUMERIC(5,2);
BEGIN
  -- One GWA formula everywhere: period-weighted final course grades (fn_student_course_grades),
  -- then weighted by units across courses. Special grades and unfinished courses stay out.
  SELECT
    ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 4),
    COALESCE(SUM(g.units), 0)
  INTO v_gwa, v_total_units
  FROM public.fn_student_course_grades(p_student_id) g
  WHERE g.term_id = p_term_id
    AND g.is_released
    AND g.grade IS NOT NULL
    AND g.special_grade IS NULL;

  IF COALESCE(v_total_units, 0) = 0 OR v_gwa IS NULL THEN
    RETURN jsonb_build_object(
      'success',    false,
      'student_id', p_student_id,
      'term_id',    p_term_id,
      'message',    'No released grades found for this term.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'student_id',   p_student_id,
    'term_id',      p_term_id,
    'gwa',          v_gwa,
    'total_units',  v_total_units
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

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
    v_school_year_id UUID;
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

    -- Special grades (INC, DRP, W, NFE) and credited courses are not numbers in the GWA;
    -- earned units count every passed final course, like the transcript
    SELECT
        ROUND(
            SUM(g.grade * g.units) FILTER (WHERE g.grade IS NOT NULL AND g.special_grade IS NULL)
            / NULLIF(SUM(g.units) FILTER (WHERE g.grade IS NOT NULL AND g.special_grade IS NULL), 0),
            2
        ),
        COALESCE(SUM(g.units) FILTER (WHERE g.is_passing IS TRUE), 0),
        COALESCE(SUM(g.units) FILTER (WHERE g.grade IS NOT NULL AND g.special_grade IS NULL), 0),
        COUNT(*) FILTER (WHERE g.is_passing IS FALSE AND g.grade IS NOT NULL AND g.special_grade IS NULL)
    INTO v_cumulative_gwa, v_earned_units, v_gwa_units, v_failing_count
    FROM public.fn_student_course_grades(v_student_id) g
    WHERE g.is_released;

    v_failing_count := COALESCE(v_failing_count, 0);
    v_earned_units := COALESCE(v_earned_units, 0);
    v_gwa_units := COALESCE(v_gwa_units, 0);

    SELECT ROUND(SUM(g.grade * g.units) / NULLIF(SUM(g.units), 0), 2)
    INTO v_term_gwa
    FROM public.fn_student_course_grades(v_student_id) g
    WHERE g.is_released
      AND g.grade IS NOT NULL
      AND g.special_grade IS NULL
      AND g.term_id = v_term_id;

    SELECT COALESCE(SUM(c.total_units), 0)
    INTO v_required_units
    FROM public.curriculum_maps cm
    INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
    WHERE cm.program_id = v_program_id
      AND cm.deleted_at IS NULL;

    v_remaining_units := GREATEST(COALESCE(v_required_units, 0) - v_earned_units, 0);

    SELECT COALESCE(
        (SELECT t.school_year_id FROM public.terms t WHERE t.id = v_term_id AND t.deleted_at IS NULL),
        (
            SELECT t.school_year_id
            FROM public.terms t
            WHERE t.deleted_at IS NULL
              AND t.status = 'Ongoing'
            ORDER BY t.start_date DESC
            LIMIT 1
        )
    )
    INTO v_school_year_id;

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
          AND g.special_grade IS NULL
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
          AND th.school_year_id IS NOT DISTINCT FROM (
              SELECT th2.school_year_id
              FROM public.academic_thresholds th2
              WHERE th2.category IN ('Honor', 'Scholarship')
                AND th2.is_active
                AND th2.deleted_at IS NULL
                AND (th2.school_year_id = v_school_year_id OR th2.school_year_id IS NULL)
              ORDER BY (th2.school_year_id IS NOT NULL) DESC
              LIMIT 1
          )
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
                SELECT scg.grade
                FROM public.fn_student_course_grades(v_student_id) scg
                WHERE scg.enrollment_id = e.id
                  AND scg.is_released
                  AND scg.special_grade IS NULL
                LIMIT 1
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

CREATE OR REPLACE FUNCTION public.fn_calculate_student_curriculum_year_level(p_student_id uuid)
 RETURNS smallint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
    v_target_year SMALLINT := 1;
    v_max_year SMALLINT := 1;
    v_y SMALLINT;
    v_all_passed BOOLEAN;
    v_has_courses BOOLEAN;
    v_years_duration SMALLINT;
BEGIN
    SELECT s.program_id, p.years_duration INTO v_program_id, v_years_duration
    FROM public.students s
    LEFT JOIN public.programs p ON p.id = s.program_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN 1;
    END IF;

    -- Find maximum year level in this curriculum
    SELECT COALESCE(MAX(year_level), 1) INTO v_max_year
    FROM public.curriculum_maps
    WHERE program_id = v_program_id AND deleted_at IS NULL;

    IF v_max_year < 1 THEN
        v_max_year := 1;
    END IF;

    -- To reach year level Y+1, ALL required non-elective courses for year level Y must be completed (passed & released)
    FOR v_y IN 1..LEAST(v_max_year, 5::smallint) LOOP
        -- Check if there are required curriculum courses for year level v_y
        SELECT EXISTS (
            SELECT 1
            FROM public.curriculum_maps cm
            INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
            WHERE cm.program_id = v_program_id
              AND cm.year_level = v_y
              AND cm.deleted_at IS NULL
              AND COALESCE(cm.is_elective, false) = false
        ) INTO v_has_courses;

        IF NOT v_has_courses THEN
            -- No required courses configured for this year level, stop auto-advancing past it
            EXIT;
        END IF;

        -- Check if student has passed all required courses for year level v_y
        SELECT NOT EXISTS (
            SELECT 1
            FROM public.curriculum_maps cm
            INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
            WHERE cm.program_id = v_program_id
              AND cm.year_level = v_y
              AND cm.deleted_at IS NULL
              AND COALESCE(cm.is_elective, false) = false
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.fn_student_course_grades(p_student_id) scg
                  WHERE scg.course_id = cm.course_id
                    AND scg.is_passing IS TRUE
              )
        ) INTO v_all_passed;

        IF v_all_passed THEN
            v_target_year := v_y + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    -- Never above the program length (a 4-year program has no Year 5)
    RETURN LEAST(v_target_year, COALESCE(NULLIF(v_years_duration, 0), 6::smallint), 6::smallint);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_evaluate_student_year_level(p_student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id      UUID;
    v_current_year    SMALLINT;
    v_new_year        SMALLINT;
    v_check_year      SMALLINT;
    v_required_count  INTEGER;
    v_completed_count INTEGER;
    v_years_duration  SMALLINT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.program_id, s.year_level, p.years_duration
    INTO v_program_id, v_current_year, v_years_duration
    FROM public.students s
    LEFT JOIN public.programs p ON p.id = s.program_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found or has no program assigned.');
    END IF;

    v_new_year := v_current_year;

    FOR v_check_year IN 1..5 LOOP
        SELECT COUNT(*)
        INTO v_required_count
        FROM public.curriculum_maps cm
        WHERE cm.program_id = v_program_id
        AND cm.year_level = v_check_year
        AND cm.is_elective = false
        AND cm.deleted_at IS NULL;

        IF v_required_count = 0 THEN
            CONTINUE;
        END IF;

        SELECT COUNT(DISTINCT e.id)
        INTO v_completed_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.curriculum_maps cm ON cm.course_id = s.course_id
            AND cm.program_id = v_program_id
            AND cm.year_level = v_check_year
            AND cm.is_elective = false
            AND cm.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.status = 'Completed'
        AND e.deleted_at IS NULL;

        IF v_completed_count >= v_required_count THEN
            -- Never above the program length (a 4-year program has no Year 5)
            v_new_year := LEAST(v_check_year + 1, COALESCE(NULLIF(v_years_duration, 0), 6), 6);
        ELSE
            EXIT;
        END IF;
    END LOOP;

    IF v_new_year <> v_current_year THEN
        UPDATE public.students
        SET year_level = v_new_year
        WHERE id = p_student_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Year level evaluated successfully.',
        'previous_year_level', v_current_year,
        'new_year_level', v_new_year
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_student_transcript(p_student_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_student JSONB;
    v_program JSONB;
    v_institution JSONB;
    v_terms JSONB;
    v_total_units NUMERIC(8,2);
    v_cumulative_gwa NUMERIC(5,2);
    v_is_official BOOLEAN;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);
    v_is_official := public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar'];

    SELECT jsonb_build_object(
        'id', s.id,
        'student_number', s.student_number,
        'full_name', u.first_name || ' ' || u.last_name,
        'email', u.email,
        'year_level', s.year_level,
        'status', s.status,
        'admitted_at', s.admitted_at
    )
    INTO v_student
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'total_units', p.total_units
    )
    INTO v_program
    FROM public.students s
    INNER JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    SELECT jsonb_build_object(
        'name', ss.institution_name,
        'short_name', ss.institution_short_name,
        'address', ss.institution_address,
        'email', ss.institution_email,
        'phone', ss.institution_phone,
        'logo_url', ss.institution_logo_url
    )
    INTO v_institution
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    LIMIT 1;

    WITH attempts AS (
        SELECT a.*
        FROM public.fn_student_course_grades(v_student_id) a
        WHERE a.is_released
    ),
    term_rows AS (
        SELECT
            t.id AS term_id,
            tt.label || ' - ' || sy.label AS term_label,
            sy.label AS school_year_label,
            sy.start_date AS school_year_start,
            COALESCE(tt.sequence, 99) AS term_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'enrollment_id', a.enrollment_id,
                    'course_code', a.course_code,
                    'course_title', a.course_title,
                    'units', a.units,
                    'grade', a.grade,
                    'raw_grade', a.raw_grade,
                    'special_grade', a.special_grade,
                    'is_passing', a.is_passing
                )
                ORDER BY a.course_code
            ) AS courses,
            COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0) AS earned_units,
            COALESCE(SUM(a.units), 0) AS attempted_units,
            ROUND(
                SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
                / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
                2
            ) AS term_gwa
        FROM attempts a
        INNER JOIN public.terms t ON t.id = a.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        GROUP BY t.id, tt.label, sy.label, sy.start_date, tt.sequence
    ),
    -- Credited (transferred) courses have no term; they come first in their own block so
    -- the list shows every course whose units are counted in the summary
    credited_rows AS (
        SELECT
            NULL::uuid AS term_id,
            'Credited Courses (Transferred)'::text AS term_label,
            NULL::text AS school_year_label,
            NULL::date AS school_year_start,
            -1 AS term_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'enrollment_id', a.enrollment_id,
                    'course_code', a.course_code,
                    'course_title', a.course_title,
                    'units', a.units,
                    'grade', a.grade,
                    'raw_grade', a.raw_grade,
                    'special_grade', a.special_grade,
                    'is_passing', a.is_passing
                )
                ORDER BY a.course_code
            ) AS courses,
            COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0) AS earned_units,
            COALESCE(SUM(a.units), 0) AS attempted_units,
            NULL::numeric AS term_gwa
        FROM attempts a
        WHERE a.term_id IS NULL
          AND a.enrollment_status = 'Credited'
        HAVING COUNT(*) > 0
    ),
    all_rows AS (
        SELECT * FROM credited_rows
        UNION ALL
        SELECT * FROM term_rows
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'term_id', COALESCE(tr.term_id::text, 'credited'),
                'term_label', tr.term_label,
                'school_year_label', tr.school_year_label,
                'courses', tr.courses,
                'earned_units', tr.earned_units,
                'attempted_units', tr.attempted_units,
                'term_gwa', tr.term_gwa
            )
            ORDER BY tr.school_year_start NULLS FIRST, tr.term_sequence
        ),
        '[]'::jsonb
    )
    INTO v_terms
    FROM all_rows tr;

    SELECT
        COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0),
        ROUND(
            SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
            / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
            2
        )
    INTO v_total_units, v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released;

    RETURN jsonb_build_object(
        'success', true,
        'is_official', v_is_official,
        'generated_at', now(),
        'student', v_student,
        'program', v_program,
        'institution', COALESCE(v_institution, '{}'::jsonb),
        'terms', v_terms,
        'summary', jsonb_build_object(
            'total_units_earned', v_total_units,
            'cumulative_gwa', v_cumulative_gwa
        )
    );
END;
$function$;

COMMIT;
