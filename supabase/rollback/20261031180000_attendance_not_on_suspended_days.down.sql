-- Rollback of 20261031180000_attendance_not_on_suspended_days: exact live definitions captured before apply
BEGIN;

-- fn_create_attendance_session
CREATE OR REPLACE FUNCTION public.fn_create_attendance_session(p_section_id uuid, p_session_date date, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS E'\r
DECLARE\r
    v_session_id UUID;\r
BEGIN\r
    IF NOT public.fn_can_access_section_staff(p_section_id) THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Section not found or access denied.'');\r
    END IF;\r
\r
    IF NOT public.fn_is_section_faculty(p_section_id) THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Only the assigned faculty can record attendance for this section.'');\r
    END IF;\r
\r
    IF EXISTS (\r
        SELECT 1 FROM public.attendance_sessions\r
        WHERE section_id = p_section_id\r
        AND session_date = p_session_date\r
        AND deleted_at IS NULL\r
    ) THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''An attendance session already exists for this date.'');\r
    END IF;\r
\r
    INSERT INTO public.attendance_sessions (\r
        section_id,\r
        session_date,\r
        notes,\r
        created_by\r
    ) VALUES (\r
        p_section_id,\r
        p_session_date,\r
        p_notes,\r
        auth.uid()\r
    )\r
    RETURNING id INTO v_session_id;\r
\r
    INSERT INTO public.attendance_records (\r
        attendance_session_id,\r
        enrollment_id,\r
        status,\r
        recorded_by,\r
        created_by\r
    )\r
    SELECT\r
        v_session_id,\r
        e.id,\r
        ''Present''::public.attendance_status_type,\r
        auth.uid(),\r
        auth.uid()\r
    FROM public.enrollments e\r
    WHERE e.section_id = p_section_id\r
    AND e.status NOT IN (''Dropped'', ''Withdrawn'')\r
    AND e.deleted_at IS NULL;\r
\r
    RETURN jsonb_build_object(''success'', true, ''message'', ''Attendance session created successfully.'');\r
END;\r
';

COMMIT;
