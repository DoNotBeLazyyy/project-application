CREATE OR REPLACE FUNCTION public.fn_get_subject_attendance(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'record_id',    ar.id,
                'session_id',   asx.id,
                'session_date', asx.session_date,
                'notes',        asx.notes,
                'status',       ar.status,
                'remarks',      ar.remarks
            )
            ORDER BY asx.session_date DESC
        ), '[]'::jsonb)
        FROM public.attendance_records ar
        INNER JOIN public.attendance_sessions asx ON asx.id = ar.attendance_session_id AND asx.deleted_at IS NULL
        WHERE ar.enrollment_id = p_enrollment_id
        AND ar.deleted_at IS NULL
    );
END;
$$;
