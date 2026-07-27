CREATE OR REPLACE FUNCTION public.fn_can_access_section_staff(p_section_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT
        p_section_id IS NOT NULL
        AND auth.uid() IS NOT NULL
        AND (
            public.fn_is_section_faculty(p_section_id)
            OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
        );
$$;

CREATE OR REPLACE FUNCTION public.fn_list_attendance_sessions(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF NOT public.fn_can_access_section_staff(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           ats.id,
                'session_date', ats.session_date,
                'notes',        ats.notes
            )
            ORDER BY ats.session_date DESC
        ), '[]'::JSONB)
        FROM public.attendance_sessions ats
        WHERE ats.section_id = p_section_id
        AND ats.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_attendance_records(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT ase.section_id
    INTO v_section_id
    FROM public.attendance_sessions ase
    WHERE ase.id = p_session_id
    AND ase.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_can_access_section_staff(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            ar.id,
                'enrollment_id', ar.enrollment_id,
                'student_number', st.student_number,
                'full_name',     u.first_name || ' ' || u.last_name,
                'status',        ar.status,
                'remarks',       ar.remarks
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.attendance_records ar
        INNER JOIN public.enrollments e ON e.id = ar.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE ar.attendance_session_id = p_session_id
        AND ar.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_attendance_session(p_section_id uuid, p_session_date date, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_session_id UUID;
BEGIN
    IF NOT public.fn_can_access_section_staff(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the assigned faculty can record attendance for this section.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.attendance_sessions
        WHERE section_id = p_section_id
        AND session_date = p_session_date
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An attendance session already exists for this date.');
    END IF;

    INSERT INTO public.attendance_sessions (
        section_id,
        session_date,
        notes,
        created_by
    ) VALUES (
        p_section_id,
        p_session_date,
        p_notes,
        auth.uid()
    )
    RETURNING id INTO v_session_id;

    INSERT INTO public.attendance_records (
        attendance_session_id,
        enrollment_id,
        status,
        recorded_by,
        created_by
    )
    SELECT
        v_session_id,
        e.id,
        'Present'::public.attendance_status_type,
        auth.uid(),
        auth.uid()
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
    AND e.status NOT IN ('Dropped', 'Withdrawn')
    AND e.deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance session created successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_attendance_session(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT ats.section_id
    INTO v_section_id
    FROM public.attendance_sessions ats
    WHERE ats.id = p_session_id
    AND ats.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_is_section_faculty(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    UPDATE public.attendance_records
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE attendance_session_id = p_session_id
    AND deleted_at IS NULL;

    UPDATE public.attendance_sessions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_session_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance session deleted successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_save_attendance_records(p_session_id uuid, p_records jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_record JSONB;
BEGIN
    SELECT ats.section_id
    INTO v_section_id
    FROM public.attendance_sessions ats
    WHERE ats.id = p_session_id
    AND ats.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_is_section_faculty(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        UPDATE public.attendance_records
        SET
            status  = (v_record->>'status')::public.attendance_status_type,
            remarks = NULLIF(trim(v_record->>'remarks'), '')
        WHERE id = (v_record->>'id')::UUID
        AND attendance_session_id = p_session_id
        AND deleted_at IS NULL;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance saved successfully.');
END;
$$;
