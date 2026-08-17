CREATE OR REPLACE FUNCTION public.fn_get_my_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
        sfg.status::TEXT,
        jsonb_build_object(
            'raw_grade',        sfg.raw_grade,
            'final_grade',      sfg.final_grade,
            'transmuted_grade', sfg.transmuted_grade,
            'special_grade',    sfg.special_grade,
            'status',           sfg.status
        )
    INTO v_status, v_totals
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
                    'due_at',            i.due_at,
                    'graded_at',         i.graded_at
                )
                ORDER BY i.due_at ASC NULLS LAST, i.title ASC
            ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM public.grading_components gc
        LEFT JOIN LATERAL (
            SELECT
                ai.id,
                ai.title,
                ai.assessment_type,
                ai.due_at,
                ai.total_points AS max_points,
                sub.final_score AS graded_points,
                sub.graded_at,
                latest.status AS submission_status,
                latest.is_late,
                sub.final_score IS NOT NULL AS is_counted,
                CASE WHEN sub.final_score IS NOT NULL THEN sub.final_score ELSE 0 END AS counted_points,
                CASE WHEN sub.final_score IS NOT NULL THEN ai.total_points ELSE 0 END AS counted_max
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
            WHERE ai.grading_component_id = gc.id
            AND ai.deleted_at IS NULL
        ) i ON true
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
$$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'fn_get_my_grade_breakdown'
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END LOOP;
END $$;