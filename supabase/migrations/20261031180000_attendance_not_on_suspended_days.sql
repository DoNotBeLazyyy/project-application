-- ====================================================================
-- Migration: 20261031180000_attendance_not_on_suspended_days.sql
--   * fn_create_attendance_session: refuses a date covered by a holiday or exception marked
--     "Class Suspended" in the section's academic year (absences there would count toward DRP)
-- Rollback: supabase/rollback/20261031180000_attendance_not_on_suspended_days.down.sql
-- ====================================================================
BEGIN;

-- fn_create_attendance_session
CREATE OR REPLACE FUNCTION public.fn_create_attendance_session(p_section_id uuid, p_session_date date, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_session_id UUID;
BEGIN
    IF NOT public.fn_can_access_section_staff(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the assigned faculty can record attendance for this section.');
    END IF;

    -- No classes are held on a class-suspended holiday, so no attendance either
    IF EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id
        INNER JOIN public.school_year_calendar_exceptions ex ON ex.school_year_id = t.school_year_id
        WHERE s.id = p_section_id
          AND ex.affects_attendance
          AND p_session_date BETWEEN ex.start_date AND ex.end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Classes are suspended on this date (holiday), so no attendance can be recorded.');
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
$function$;

COMMIT;
