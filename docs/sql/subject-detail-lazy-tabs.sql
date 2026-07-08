CREATE OR REPLACE FUNCTION public.fn_get_subject_detail(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT jsonb_build_object(
        'enrollment_id',     e.id,
        'section_id',        s.id,
        'section_code',      s.section_code,
        'course_code',       c.code,
        'course_title',      c.title,
        'term_label',        tt.label || ' - ' || sy.label,
        'faculty_name',      u.first_name || ' ' || u.last_name,
        'enrollment_status', e.status
    )
    INTO v_result
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

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_subject_assessments(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',                    ai.id,
            'title',                 ai.title,
            'assessment_type',       ai.assessment_type,
            'total_points',          ai.total_points,
            'passing_points',        ai.passing_points,
            'time_limit_minutes',    ai.time_limit_minutes,
            'max_attempts',          ai.max_attempts,
            'show_all_questions',    ai.show_all_questions,
            'questions_per_page',    ai.questions_per_page,
            'opens_at',              ai.opens_at,
            'due_at',                ai.due_at,
            'closes_at',             ai.closes_at,
            'scheduled_publish_at',  ai.scheduled_publish_at,
            'submission_status', (
                SELECT asub.status
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'submission_id', (
                SELECT asub.id
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'attempts_used', (
                SELECT COUNT(*)
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = p_enrollment_id
                AND asub.deleted_at IS NULL
            ),
            'attachments', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id',              aa.id,
                        'file_name',       aa.file_name,
                        'file_url',        aa.file_url,
                        'file_size_bytes', aa.file_size_bytes,
                        'mime_type',       aa.mime_type
                    )
                    ORDER BY aa.sequence ASC
                ), '[]'::JSONB)
                FROM public.assessment_attachments aa
                WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
            )
        )
        ORDER BY ai.opens_at ASC NULLS LAST, ai.due_at ASC NULLS LAST
    ), '[]'::JSONB)
    INTO v_result
    FROM public.assessment_items ai
    WHERE ai.section_id = v_section_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            sfg.raw_grade,
            'final_grade',          sfg.final_grade,
            'transmuted_grade',     sfg.transmuted_grade,
            'special_grade',        sfg.special_grade,
            'status',               sfg.status,
            'is_visible',           sfg.status = 'Released',
            'evaluation_completed', COALESCE((
                SELECT epl.is_completed
                FROM public.evaluation_period_locks epl
                WHERE epl.enrollment_id = p_enrollment_id
                AND epl.grading_period_id = gp.id
                AND epl.deleted_at IS NULL
                LIMIT 1
            ), false)
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = p_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$$;
