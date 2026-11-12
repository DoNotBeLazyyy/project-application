-- ====================================================================
-- Migration: 20261106032000_faculty_load_room_conflicts.sql
--   * fn_get_faculty_load_detail: the conflicts list now also has room clashes - one of the
--     faculty member's classes and another instructor's class in the same room at overlapping
--     times in the same term. Rooms are matched like fn_check_section_schedule_conflicts
--     (a slot without a room uses the section's room; trimmed, case-insensitive). Room rows
--     also carry faculty_b_name, the other class's instructor. Everything else is unchanged.
-- Idempotent: CREATE OR REPLACE with the same signature and grants.
-- ====================================================================
BEGIN;

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
    WHERE u.id = p_faculty_id
      AND u.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR u.department_id = v_dean_dept_id);

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty user not found in your department.');
    END IF;

    -- Assigned sections for this faculty in the term (scoped to Dean's department if Dean)
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
      AND s.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id);

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

    -- Schedule conflicts for this faculty (scoped to Dean's department if Dean):
    --   Faculty: two of their own classes meet at the same time
    --   Room: one of their classes and another instructor's class use the same room at the same
    --         time. Same rule as fn_check_section_schedule_conflicts: a slot without a room uses
    --         the section's room, compared trimmed and case-insensitive.
    WITH slots AS (
        SELECT
            ss.id AS slot_id,
            ss.day_of_week,
            ss.time_start,
            ss.time_end,
            COALESCE(NULLIF(btrim(ss.room), ''), s.room, '') AS room_label,
            upper(btrim(COALESCE(NULLIF(btrim(ss.room), ''), s.room, ''))) AS room_key,
            s.id AS section_id,
            s.section_code,
            s.faculty_id,
            c.code || ' - ' || c.title AS course_label,
            c.department_id,
            NULLIF(btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), '') AS faculty_name
        FROM public.section_schedules ss
        INNER JOIN public.sections s ON s.id = ss.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        WHERE ss.deleted_at IS NULL
          AND s.term_id = v_term_id
    ),
    faculty_clashes AS (
        SELECT 'Faculty'::TEXT AS conflict_type, a.*, b.slot_id AS b_slot_id, b.section_id AS b_section_id,
               b.section_code AS b_section_code, b.course_label AS b_course_label,
               b.department_id AS b_department_id, b.faculty_name AS b_faculty_name,
               b.time_start AS b_time_start, b.time_end AS b_time_end
        FROM slots a
        INNER JOIN slots b
            ON b.slot_id > a.slot_id
           AND b.section_id <> a.section_id
           AND b.day_of_week = a.day_of_week
           AND a.time_start < b.time_end
           AND b.time_start < a.time_end
        WHERE a.faculty_id = p_faculty_id
          AND b.faculty_id = p_faculty_id
    ),
    room_clashes AS (
        SELECT 'Room'::TEXT AS conflict_type, a.*, b.slot_id AS b_slot_id, b.section_id AS b_section_id,
               b.section_code AS b_section_code, b.course_label AS b_course_label,
               b.department_id AS b_department_id, b.faculty_name AS b_faculty_name,
               b.time_start AS b_time_start, b.time_end AS b_time_end
        FROM slots a
        INNER JOIN slots b
            ON b.section_id <> a.section_id
           AND b.day_of_week = a.day_of_week
           AND a.time_start < b.time_end
           AND b.time_start < a.time_end
           AND b.room_key = a.room_key
        WHERE a.faculty_id = p_faculty_id
          AND b.faculty_id IS DISTINCT FROM p_faculty_id
          AND a.room_key <> ''
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', x.slot_id::TEXT || '-' || x.b_slot_id::TEXT,
                'conflict_type', x.conflict_type,
                'section_a_id', x.section_id,
                'section_a', x.section_code,
                'course_a', x.course_label,
                'section_b_id', x.b_section_id,
                'section_b', x.b_section_code,
                'course_b', x.b_course_label,
                'faculty_b_name', x.b_faculty_name,
                'day_of_week', x.day_of_week::TEXT,
                'time_start', to_char(x.time_start, 'HH12:MI AM'),
                'time_end', to_char(x.time_end, 'HH12:MI AM'),
                'overlap_start', to_char(GREATEST(x.time_start, x.b_time_start), 'HH12:MI AM'),
                'overlap_end', to_char(LEAST(x.time_end, x.b_time_end), 'HH12:MI AM'),
                'room', x.room_label
            )
            ORDER BY x.conflict_type, x.day_of_week, x.time_start
        ),
        '[]'::jsonb
    )
    INTO v_conflicts
    FROM (
        SELECT * FROM faculty_clashes
        UNION ALL
        SELECT * FROM room_clashes
    ) x
    WHERE v_dean_dept_id IS NULL
       OR x.department_id = v_dean_dept_id
       OR x.b_department_id = v_dean_dept_id;

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'sections', v_assigned,
        'assigned_sections', v_assigned,
        'available_sections', v_available,
        'conflicts', v_conflicts
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_load_detail(uuid, uuid) TO authenticated, service_role;

COMMIT;
