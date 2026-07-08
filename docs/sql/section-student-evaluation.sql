CREATE OR REPLACE FUNCTION public.fn_get_section_student_evaluation(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_section_id UUID;
    v_faculty_id UUID;
    v_profile JSONB;
    v_attendance JSONB;
    v_assessments JSONB;
    v_grades JSONB;
BEGIN
    SELECT s.id, s.faculty_id
    INTO v_section_id, v_faculty_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    IF v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not assigned to this section.');
    END IF;

    SELECT jsonb_build_object(
        'enrollment_id',     e.id,
        'student_id',        st.id,
        'student_number',    st.student_number,
        'full_name',         u.first_name || ' ' || u.last_name,
        'email',             u.email,
        'year_level',        st.year_level,
        'program_name',      p.name,
        'enrollment_status', e.status,
        'enrolled_at',       e.enrolled_at
    )
    INTO v_profile
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
    WHERE e.id = p_enrollment_id;

    SELECT jsonb_build_object(
        'total_sessions', (
            SELECT COUNT(*)
            FROM public.attendance_sessions asx
            WHERE asx.section_id = v_section_id
            AND asx.deleted_at IS NULL
        ),
        'present', COUNT(*) FILTER (WHERE ar.status = 'Present'),
        'absent',  COUNT(*) FILTER (WHERE ar.status = 'Absent'),
        'late',    COUNT(*) FILTER (WHERE ar.status = 'Late'),
        'excused', COUNT(*) FILTER (WHERE ar.status = 'Excused'),
        'recorded', COUNT(*)
    )
    INTO v_attendance
    FROM public.attendance_records ar
    INNER JOIN public.attendance_sessions asx ON asx.id = ar.attendance_session_id AND asx.deleted_at IS NULL
    WHERE asx.section_id = v_section_id
    AND ar.enrollment_id = p_enrollment_id
    AND ar.deleted_at IS NULL;

    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.grading_period_sequence ASC NULLS LAST, t.due_at ASC NULLS LAST), '[]'::jsonb)
    INTO v_assessments
    FROM (
        SELECT
            ai.id,
            ai.title,
            ai.assessment_type,
            ai.total_points,
            ai.passing_points,
            ai.due_at,
            gp.name AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            sub.status AS submission_status,
            sub.raw_score,
            sub.final_score,
            sub.is_late,
            sub.submitted_at,
            sub.graded_at
        FROM public.assessment_items ai
        LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT asub.status, asub.raw_score, asub.final_score, asub.is_late, asub.submitted_at, asub.graded_at
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
            AND asub.enrollment_id = p_enrollment_id
            AND asub.deleted_at IS NULL
            ORDER BY asub.attempt_number DESC
            LIMIT 1
        ) sub ON true
        WHERE ai.section_id = v_section_id
        AND ai.deleted_at IS NULL
    ) t;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',   gp.id,
            'grading_period_name', gp.name,
            'sequence',            gp.sequence,
            'weight',              gp.weight,
            'raw_grade',           sfg.raw_grade,
            'final_grade',         sfg.final_grade,
            'transmuted_grade',    sfg.transmuted_grade,
            'special_grade',       sfg.special_grade,
            'status',              sfg.status
        )
        ORDER BY gp.sequence ASC
    ), '[]'::jsonb)
    INTO v_grades
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = p_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    WHERE gp.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'profile',     v_profile,
        'attendance',  v_attendance,
        'assessments', v_assessments,
        'grades',      v_grades
    );
END;
$$;
