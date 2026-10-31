-- Rollback of 20261031010000_calendar_schedule_term_dates: exact live definitions captured before apply
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
        'time_end', sch.time_end::text
    )), '[]'::jsonb) INTO v_result
    FROM public.section_schedules sch
    JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
    JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id
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
AS E'\r
DECLARE\r
    v_student_id UUID;\r
BEGIN\r
    SELECT id INTO v_student_id\r
    FROM public.students\r
    WHERE user_id = auth.uid() AND deleted_at IS NULL\r
    LIMIT 1;\r
\r
    IF v_student_id IS NULL THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Student profile not found.'');\r
    END IF;\r
\r
    RETURN (\r
        SELECT COALESCE(jsonb_agg(\r
            jsonb_build_object(\r
                ''section_id'',    s.id,\r
                ''section_code'',  s.section_code,\r
                ''course_code'',   c.code,\r
                ''course_title'',  c.title,\r
                ''faculty_name'',  u.first_name || '' '' || u.last_name,\r
                ''enrollment_id'', e.id,\r
                ''is_conflict_authorized'', e.is_conflict_authorized,\r
                ''conflict_reason'', e.conflict_reason,\r
                ''schedules'', (\r
                    SELECT COALESCE(jsonb_agg(\r
                        jsonb_build_object(\r
                            ''id'',         ss.id,\r
                            ''day_of_week'', ss.day_of_week,\r
                            ''time_start'', ss.time_start,\r
                            ''time_end'',   ss.time_end,\r
                            ''room'',       ss.room\r
                        )\r
                        ORDER BY ss.day_of_week ASC, ss.time_start ASC\r
                    ), ''[]''::JSONB)\r
                    FROM public.section_schedules ss\r
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL\r
                )\r
            )\r
        ), ''[]''::JSONB)\r
        FROM public.enrollments e\r
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL\r
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL\r
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL\r
        WHERE e.student_id = v_student_id\r
        AND e.status = ''Enrolled''\r
        AND e.deleted_at IS NULL\r
    );\r
END;\r
';

COMMIT;
