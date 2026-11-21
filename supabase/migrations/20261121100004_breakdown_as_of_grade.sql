-- ====================================================================
-- Migration: 20261121100004_breakdown_as_of_grade.sql
-- Audit 2026-11-21 (BUG-AUDIT-20261121.md), policy 7:
--   #9  fn_get_my_grade_breakdown: the student's breakdown of a Released grade no longer
--       uses now() to decide which items were missed; it reads items as of the last time the
--       stored grade was calculated (fn_component_item_scores_as_of, new). Scores themselves
--       are frozen once Submitted (score locks are fixed separately, audit #10).
--   fn_component_item_scores is left unchanged (faculty and calculation still use it).
-- Bodies are based on the live definitions read on 2026-11-21. Idempotent (CREATE OR REPLACE).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_component_item_scores_as_of(p_enrollment_id uuid, p_component_id uuid, p_as_of timestamp with time zone)
 RETURNS TABLE(id uuid, title text, assessment_type text, due_at timestamp with time zone, max_points numeric, graded_points numeric, graded_at timestamp with time zone, submission_status text, is_late boolean, is_counted boolean, is_missed boolean, counted_points numeric, counted_max numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- Same counting rules as fn_component_item_scores, but an item counts as missed only if
    -- it closed before p_as_of (the moment the stored grade was calculated), so a released
    -- grade's breakdown keeps adding up to that grade after later close dates pass
    SELECT
        x.id, x.title, x.assessment_type, x.due_at, x.max_points,
        x.graded_points, x.graded_at, x.submission_status, x.is_late,
        (x.graded_points IS NOT NULL OR x.is_missed) AS is_counted,
        x.is_missed,
        CASE WHEN x.graded_points IS NOT NULL THEN x.graded_points ELSE 0 END AS counted_points,
        CASE WHEN x.graded_points IS NOT NULL OR x.is_missed THEN x.max_points ELSE 0 END AS counted_max
    FROM (
        SELECT
            ai.id,
            ai.title,
            ai.assessment_type::text AS assessment_type,
            ai.due_at,
            ai.total_points AS max_points,
            LEAST(GREATEST(sub.final_score, 0), ai.total_points) AS graded_points,
            sub.graded_at,
            latest.status::text AS submission_status,
            latest.is_late,
            (
                sub.final_score IS NULL
                AND ai.is_published
                AND COALESCE(ai.closes_at, ai.due_at) IS NOT NULL
                AND COALESCE(ai.closes_at, ai.due_at) < p_as_of
                AND COALESCE(latest.status::text, 'Not Started') IN ('Not Started', 'In Progress')
            ) AS is_missed
        FROM public.assessment_items ai
        LEFT JOIN LATERAL (
            SELECT asub.final_score, asub.graded_at
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = p_enrollment_id
              AND asub.status = 'Graded'
              AND asub.deleted_at IS NULL
            ORDER BY asub.attempt_number DESC
            LIMIT 1
        ) sub ON true
        LEFT JOIN LATERAL (
            SELECT asub.status, asub.is_late
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = p_enrollment_id
              AND asub.deleted_at IS NULL
            ORDER BY asub.attempt_number DESC
            LIMIT 1
        ) latest ON true
        WHERE ai.grading_component_id = p_component_id
          AND ai.deleted_at IS NULL
    ) x;
$function$;

-- Internal helper, like fn_component_item_scores: only SECURITY DEFINER functions call it
REVOKE ALL ON FUNCTION public.fn_component_item_scores_as_of(uuid, uuid, timestamp with time zone) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_my_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id           UUID;
    v_section_id           UUID;
    v_context              JSONB;
    v_period               JSONB;
    v_totals               JSONB;
    v_components           JSONB;
    v_status               TEXT;
    v_evaluation_completed BOOLEAN;
    v_total_weight         NUMERIC(8,2);
    v_passing_grade        NUMERIC(5,2);
    v_grade_id             UUID;
    v_as_of                TIMESTAMPTZ;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT
        s.id,
        jsonb_build_object(
            'enrollment_id', e.id,
            'section_id',    s.id,
            'section_code',  s.section_code,
            'course_code',   c.code,
            'course_title',  c.title,
            'term_label',    tt.label || ' - ' || sy.label,
            'faculty_name',  COALESCE(NULLIF(btrim(concat(u.first_name, ' ', u.last_name)), ''), 'Unassigned')
        )
    INTO v_section_id, v_context
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT jsonb_build_object(
        'grading_period_id',   gp.id,
        'grading_period_name', gp.name,
        'sequence',            gp.sequence,
        'weight',              gp.weight
    )
    INTO v_period
    FROM public.grading_periods gp
    INNER JOIN public.sections s ON s.term_id = gp.term_id AND s.id = v_section_id
    WHERE gp.id = p_grading_period_id
    AND gp.deleted_at IS NULL;

    IF v_period IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found for this subject.');
    END IF;

    SELECT
        sfg.id,
        sfg.status::TEXT,
        jsonb_build_object(
            'raw_grade',        sfg.raw_grade,
            'final_grade',      sfg.final_grade,
            'transmuted_grade', sfg.transmuted_grade,
            'special_grade',    sfg.special_grade,
            'status',           sfg.status
        )
    INTO v_grade_id, v_status, v_totals
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at IS NULL;

    IF v_status IS DISTINCT FROM 'Released' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grade has not been released yet.');
    END IF;

    SELECT COALESCE(epl.is_completed, false)
    INTO v_evaluation_completed
    FROM public.evaluation_period_locks epl
    WHERE epl.enrollment_id = p_enrollment_id
    AND epl.grading_period_id = public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id)
    AND epl.deleted_at IS NULL
    LIMIT 1;

    IF NOT COALESCE(v_evaluation_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Complete the faculty evaluation to view this grade breakdown.');
    END IF;

    -- Once Submitted, scores are frozen (policy 7), so the breakdown is read as of the last
    -- time the stored grade was calculated, not now(): it then adds up to the released grade
    SELECT GREATEST(sfg.created_at, COALESCE(MAX(gal.changed_at), sfg.created_at))
    INTO v_as_of
    FROM public.section_final_grades sfg
    LEFT JOIN public.grade_audit_logs gal
        ON gal.record_id = sfg.id
        AND gal.field_changed IN ('raw_grade', 'final_grade', 'transmuted_grade')
        AND gal.deleted_at IS NULL
    WHERE sfg.id = v_grade_id
    GROUP BY sfg.created_at;

    v_as_of := LEAST(COALESCE(v_as_of, now()), now());

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',              c.id,
            'name',            c.name,
            'weight',          c.weight,
            'earned_points',   c.earned_points,
            'max_points',      c.max_points,
            'percentage',      CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * 100, 2)
                ELSE NULL
            END,
            'weighted_score',  CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * c.weight, 2)
                ELSE 0
            END,
            'graded_count',    c.graded_count,
            'pending_count',   c.item_count - c.graded_count,
            'items',           c.items
        )
        ORDER BY c.name ASC
    ), '[]'::jsonb), COALESCE(SUM(c.weight), 0)
    INTO v_components, v_total_weight
    FROM (
        SELECT
            gc.id,
            gc.name,
            gc.weight,
            COALESCE(SUM(i.counted_points), 0) AS earned_points,
            COALESCE(SUM(i.counted_max), 0) AS max_points,
            COUNT(i.id) AS item_count,
            COUNT(i.id) FILTER (WHERE i.is_counted) AS graded_count,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',                i.id,
                    'title',             i.title,
                    'assessment_type',   i.assessment_type,
                    'earned_points',     i.graded_points,
                    'max_points',        i.max_points,
                    'submission_status', i.submission_status,
                    'is_late',           i.is_late,
                    'is_counted',        i.is_counted,
                    'is_missed',         i.is_missed,
                    'due_at',            i.due_at,
                    'graded_at',         i.graded_at
                )
                ORDER BY i.due_at ASC NULLS LAST, i.title ASC
            ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM public.grading_components gc
        LEFT JOIN LATERAL public.fn_component_item_scores_as_of(p_enrollment_id, gc.id, v_as_of) i ON true
        WHERE gc.section_id = v_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
        GROUP BY gc.id, gc.name, gc.weight
    ) c;

    SELECT gcfg.passing_grade
    INTO v_passing_grade
    FROM public.grading_config gcfg
    WHERE gcfg.deleted_at IS NULL
    ORDER BY gcfg.created_at ASC
    LIMIT 1;

    RETURN v_context
        || v_period
        || v_totals
        || jsonb_build_object(
            'components', v_components,
            'total_component_weight', v_total_weight,
            'passing_grade', v_passing_grade
        );
END;
$function$;

COMMIT;
