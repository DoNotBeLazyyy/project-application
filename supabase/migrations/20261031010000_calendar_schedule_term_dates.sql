-- ====================================================================
-- Migration: 20261031010000_calendar_schedule_term_dates.sql
--   * fn_get_calendar_section_schedules / fn_get_student_schedule return each section's term
--     dates, so the calendar only repeats a weekly class inside its own term (it repeated every
--     section of every year on every date, including breaks)
-- Rollback: supabase/rollback/20261031010000_calendar_schedule_term_dates.down.sql
-- ====================================================================
BEGIN;

-- fn_get_calendar_section_schedules
CREATE OR REPLACE FUNCTION public.fn_get_calendar_section_schedules()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[] := public.fn_current_user_role_codes();
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'section_id', s.id,
        'section_code', s.section_code,
        'course_code', c.code,
        'course_title', c.title,
        'faculty_name', TRIM(u.first_name || ' ' || u.last_name),
        'room', COALESCE(sch.room, s.room),
        'day_of_week', sch.day_of_week::text,
        'time_start', sch.time_start::text,
        'time_end', sch.time_end::text,
        'term_start_date', t.start_date,
        'term_end_date', t.end_date
    )), '[]'::jsonb) INTO v_result
    FROM public.section_schedules sch
    JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
    JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id
    LEFT JOIN public.terms t ON t.id = s.term_id
    WHERE sch.deleted_at IS NULL
      AND (
          'Admin' = ANY(v_roles)
          OR ('Dean' = ANY(v_roles) AND c.department_id = public.fn_get_dean_department_id())
          OR ('Faculty' = ANY(v_roles) AND s.faculty_id = auth.uid())
          OR ('Student' = ANY(v_roles) AND EXISTS (
              SELECT 1 FROM public.enrollments e
              JOIN public.students st ON st.id = e.student_id
              WHERE e.section_id = s.id AND st.user_id = auth.uid() AND e.deleted_at IS NULL
          ))
      );

    RETURN v_result;
END;
$function$;

-- fn_get_student_schedule
CREATE OR REPLACE FUNCTION public.fn_get_student_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'section_id',    s.id,
                'section_code',  s.section_code,
                'course_code',   c.code,
                'course_title',  c.title,
                'faculty_name',  u.first_name || ' ' || u.last_name,
                'enrollment_id', e.id,
                'term_start_date', t.start_date,
                'term_end_date', t.end_date,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'schedules', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',         ss.id,
                            'day_of_week', ss.day_of_week,
                            'time_start', ss.time_start,
                            'time_end',   ss.time_end,
                            'room',       ss.room
                        )
                        ORDER BY ss.day_of_week ASC, ss.time_start ASC
                    ), '[]'::JSONB)
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                )
            )
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.terms t ON t.id = s.term_id
        WHERE e.student_id = v_student_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    );
END;
$function$;

COMMIT;
