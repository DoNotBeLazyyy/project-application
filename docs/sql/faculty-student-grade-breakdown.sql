CREATE OR REPLACE FUNCTION public.fn_get_faculty_student_grade_breakdown(
    p_enrollment_id UUID,
    p_grading_period_id UUID
)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid                  UUID := auth.uid();
    v_student_name         TEXT;
    v_student_number       TEXT;
    v_section_id           UUID;
    v_context              JSONB;
    v_period               JSONB;
    v_totals               JSONB;
    v_components           JSONB;
    v_total_weight         NUMERIC(8,2);
    v_passing_grade        NUMERIC(5,2);
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT
        s.id,
        trim(concat(st_u.first_name, ' ', st_u.last_name)),
        st.student_number,
        jsonb_build_object(
            'enrollment_id', e.id,
            'student_id',    st.id,
            'student_name',  trim(concat(st_u.first_name, ' ', st_u.last_name)),
            'student_number', st.student_number,
            'section_id',    s.id,
            'section_code',  s.section_code,
            'course_code',   c.code,
            'course_title',  c.title,
            'term_label',    tt.label || ' - ' || sy.label
        )
    INTO v_section_id, v_student_name, v_student_number, v_context
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    INNER JOIN public.users st_u ON st_u.id = st.user_id AND st_u.deleted_at IS NULL
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
      AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment record not found.');
    END IF;

    IF NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = v_section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Access Denied: You are not assigned to manage this section.'
                USING ERRCODE = '42501';
        END IF;
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
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found for this section.');
    END IF;

    SELECT jsonb_build_object(
        'raw_grade',        COALESCE(sfg.raw_grade, 0),
        'final_grade',      COALESCE(sfg.final_grade, 0),
        'transmuted_grade', COALESCE(sfg.transmuted_grade, '—'),
        'special_grade',    sfg.special_grade,
        'status',           COALESCE(sfg.status::TEXT, 'Draft')
    )
    INTO v_totals
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = p_enrollment_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    IF v_totals IS NULL THEN
        v_totals := jsonb_build_object(
            'raw_grade', 0,
            'final_grade', 0,
            'transmuted_grade', '—',
            'special_grade', NULL,
            'status', 'Draft'
        );
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
            'passing_grade', COALESCE(v_passing_grade, 75)
        );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_faculty_student_grade_breakdown(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_faculty_student_grade_breakdown(UUID, UUID) TO authenticated;
