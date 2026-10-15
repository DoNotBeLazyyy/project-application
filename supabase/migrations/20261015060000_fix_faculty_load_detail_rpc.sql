-- Description: Fix fn_get_faculty_load_detail RPC to return both sections and assigned_sections with complete field mappings and term details.

CREATE OR REPLACE FUNCTION public.fn_get_faculty_load_detail(
    p_faculty_id uuid,
    p_term_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty          JSONB;
    v_assigned         JSONB;
    v_available        JSONB;
    v_conflicts        JSONB;
    v_term_id          UUID;
    v_dean_dept_id     UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin', 'Registrar');

    v_dean_dept_id := public.fn_get_dean_department_id();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());

    SELECT jsonb_build_object(
        'id', u.id,
        'faculty_name', u.first_name || ' ' || u.last_name,
        'email', u.email
    )
    INTO v_faculty
    FROM public.users u
    WHERE u.id = p_faculty_id AND u.deleted_at IS NULL;

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty user not found.');
    END IF;

    -- Assigned sections for this faculty in the term
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_id', s.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'total_units', c.total_units,
                'lecture_units', COALESCE(c.lecture_units, 0),
                'lab_units', COALESCE(c.laboratory_units, 0),
                'room', s.room,
                'max_slots', s.max_slots,
                'status', s.status,
                'term_id', s.term_id,
                'term_label', COALESCE(tt.label || ' - ' || sy.label, 'Active Term'),
                'program_id', prog.id,
                'program_code', prog.code,
                'program_name', prog.name,
                'faculty_id', s.faculty_id,
                'faculty_name', u.first_name || ' ' || u.last_name,
                'is_active_academic_year', COALESCE(sy.is_active, false),
                'enrolled_count', (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    WHERE e.section_id = s.id
                      AND e.deleted_at IS NULL
                      AND e.status = 'Enrolled'::public.enrollment_status_type
                ),
                'available_slots', GREATEST(0, s.max_slots - (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    WHERE e.section_id = s.id
                      AND e.deleted_at IS NULL
                      AND e.status = 'Enrolled'::public.enrollment_status_type
                )),
                'schedules', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', sch.id,
                            'day_of_week', sch.day_of_week::TEXT,
                            'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                            'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                            'room', COALESCE(sch.room, s.room, '')
                        )
                        ORDER BY sch.day_of_week, sch.time_start
                    )
                    FROM public.section_schedules sch
                    WHERE sch.section_id = s.id AND sch.deleted_at IS NULL
                ), '[]'::jsonb)
            )
            ORDER BY c.code, s.section_code
        ),
        '[]'::jsonb
    )
    INTO v_assigned
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    LEFT JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    LEFT JOIN LATERAL (
        SELECT p.id, p.code, p.name
        FROM public.curriculum_maps cm
        INNER JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
        WHERE cm.course_id = s.course_id AND cm.deleted_at IS NULL
        LIMIT 1
    ) prog ON TRUE
    WHERE s.faculty_id = p_faculty_id
      AND s.term_id = v_term_id
      AND s.deleted_at IS NULL;

    -- Available unassigned sections (scoped to Dean's department if Dean)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_id', s.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'total_units', c.total_units,
                'room', s.room,
                'max_slots', s.max_slots,
                'status', s.status,
                'schedules', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', sch.id,
                            'day_of_week', sch.day_of_week::TEXT,
                            'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                            'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                            'room', COALESCE(sch.room, s.room, '')
                        )
                        ORDER BY sch.day_of_week, sch.time_start
                    )
                    FROM public.section_schedules sch
                    WHERE sch.section_id = s.id AND sch.deleted_at IS NULL
                ), '[]'::jsonb)
            )
            ORDER BY c.code, s.section_code
        ),
        '[]'::jsonb
    )
    INTO v_available
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.faculty_id IS NULL
      AND s.term_id = v_term_id
      AND s.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id);

    -- Schedule conflicts for this faculty
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', a.id::TEXT || '-' || b.id::TEXT,
                'conflict_type', 'Faculty',
                'section_a_id', s.id,
                'section_a', s.section_code,
                'course_a', ca.code || ' - ' || ca.title,
                'section_b_id', sb.id,
                'section_b', sb.section_code,
                'course_b', cb.code || ' - ' || cb.title,
                'day_of_week', a.day_of_week::TEXT,
                'time_start', to_char(a.time_start, 'HH12:MI AM'),
                'time_end', to_char(a.time_end, 'HH12:MI AM'),
                'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
                'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM'),
                'room', COALESCE(a.room, s.room, '')
            )
        ),
        '[]'::jsonb
    )
    INTO v_conflicts
    FROM public.section_schedules a
    INNER JOIN public.sections s ON s.id = a.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses ca ON ca.id = s.course_id AND ca.deleted_at IS NULL
    INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
    INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
    INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
    WHERE a.deleted_at IS NULL
      AND s.faculty_id = p_faculty_id
      AND sb.faculty_id = p_faculty_id
      AND sb.id <> s.id
      AND s.term_id = v_term_id
      AND sb.term_id = v_term_id
      AND a.day_of_week = b.day_of_week
      AND a.time_start < b.time_end
      AND b.time_start < a.time_end;

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'sections', v_assigned,
        'assigned_sections', v_assigned,
        'available_sections', v_available,
        'conflicts', v_conflicts
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_load_detail TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
