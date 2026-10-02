-- Migration: 20261002040000_fix_faculty_load_visibility.sql
-- Description: Fix faculty load visibility by handling missing relations gracefully and ensuring assigned section loads display regardless of role revocation or missing term filter match.

CREATE OR REPLACE FUNCTION public.fn_list_faculty_load_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'u.deleted_at IS NULL';
    v_term_clause  TEXT := '';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            u.email,
            (
                SELECT COUNT(*)
                FROM public.sections s
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
            ) AS section_count,
            (
                SELECT COALESCE(SUM(c.total_units), 0)
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
            ) AS total_units,
            (
                SELECT COUNT(*)
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND e.deleted_at IS NULL
                  AND e.status = ''Enrolled''::public.enrollment_status_type
                  %1$s
            ) AS student_count,
            (
                SELECT COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (sch.time_end - sch.time_start)) / 3600.0)::NUMERIC, 2), 0)
                FROM public.section_schedules sch
                INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND sch.deleted_at IS NULL
                  %1$s
            ) AS weekly_hours,
            (
                SELECT COUNT(*)
                FROM public.section_schedules a
                INNER JOIN public.sections s ON s.id = a.section_id AND s.deleted_at IS NULL
                INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
                INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
                WHERE a.deleted_at IS NULL
                  AND s.faculty_id = u.id
                  AND sb.faculty_id = u.id
                  AND sb.id <> s.id
                  AND sb.term_id = s.term_id
                  AND a.day_of_week = b.day_of_week
                  AND a.time_start < b.time_end
                  AND b.time_start < a.time_end
                  %1$s
            ) AS conflict_count,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        WHERE (
            EXISTS (
                SELECT 1
                FROM public.user_roles ur
                INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                WHERE ur.user_id = u.id
                  AND ur.deleted_at IS NULL
                  AND ur.revoked_at IS NULL
                  AND r.code = ''Faculty''
            )
            OR EXISTS (
                SELECT 1
                FROM public.sections s
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
            )
        )
        AND %2$s',
        v_term_clause,
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC');
END;
$function$;

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
    v_faculty   JSONB;
    v_sections  JSONB;
    v_conflicts JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin', 'Registrar');

    SELECT jsonb_build_object(
        'id', u.id,
        'faculty_name', u.first_name || ' ' || u.last_name,
        'email', u.email
    )
    INTO v_faculty
    FROM public.users u
    WHERE u.id = p_faculty_id
      AND u.deleted_at IS NULL;

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty member not found.');
    END IF;

    -- Retrieve all sections with complete detail
    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'section_code'), '[]'::JSONB)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'term_id', s.term_id,
            'term_label', COALESCE(tt.label || ' - ' || sy.label, 'Unspecified Term'),
            'course_id', c.id,
            'course_code', c.code,
            'course_title', c.title,
            'lecture_units', COALESCE(c.lecture_units, 0),
            'lab_units', COALESCE(c.laboratory_units, 0),
            'units', c.total_units,
            'program_id', prog.id,
            'program_code', prog.code,
            'program_name', prog.name,
            'faculty_id', s.faculty_id,
            'faculty_name', u.first_name || ' ' || u.last_name,
            'room', s.room,
            'max_slots', s.max_slots,
            'status', s.status,
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
                SELECT jsonb_agg(jsonb_build_object(
                    'id', sch.id,
                    'day_of_week', sch.day_of_week::TEXT,
                    'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                    'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                    'room', COALESCE(sch.room, s.room, '')
                ) ORDER BY sch.day_of_week, sch.time_start)
                FROM public.section_schedules sch
                WHERE sch.section_id = s.id
                  AND sch.deleted_at IS NULL
            ), '[]'::JSONB)
        ) AS x
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
          AND s.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
    ) sections;

    -- Schedule Conflicts
    SELECT COALESCE(jsonb_agg(conf ORDER BY conf->>'day_of_week', conf->>'time_start'), '[]'::JSONB)
    INTO v_conflicts
    FROM (
        SELECT jsonb_build_object(
            'id', md5(a.id::TEXT || b.id::TEXT || 'Faculty'),
            'conflict_type', 'Faculty',
            'faculty_id', p_faculty_id,
            'faculty_name', fu.first_name || ' ' || fu.last_name,
            'subject_label', fu.first_name || ' ' || fu.last_name,
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a_id', sa.id,
            'section_a', sa.section_code,
            'course_a', ca.code || ' - ' || ca.title,
            'section_b_id', sb.id,
            'section_b', sb.section_code,
            'course_b', cb.code || ' - ' || cb.title,
            'description', 'Faculty ' || fu.first_name || ' ' || fu.last_name || ' is assigned to overlapping sections ' || sa.section_code || ' and ' || sb.section_code
        ) AS conf
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE sa.faculty_id = p_faculty_id
          AND sb.faculty_id = p_faculty_id
          AND sa.id <> sb.id
          AND sa.term_id = sb.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)

        UNION ALL

        SELECT jsonb_build_object(
            'id', md5(a.id::TEXT || b.id::TEXT || 'Room'),
            'conflict_type', 'Room',
            'faculty_id', p_faculty_id,
            'faculty_name', fu.first_name || ' ' || fu.last_name,
            'subject_label', COALESCE(a.room, sa.room, 'Unknown Room'),
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a_id', sa.id,
            'section_a', sa.section_code,
            'course_a', ca.code || ' - ' || ca.title,
            'section_b_id', sb.id,
            'section_b', sb.section_code,
            'course_b', cb.code || ' - ' || cb.title,
            'description', 'Room ' || COALESCE(a.room, sa.room) || ' is double-booked by section ' || sa.section_code || ' and section ' || sb.section_code
        ) AS conf
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE (sa.faculty_id = p_faculty_id OR sb.faculty_id = p_faculty_id)
          AND sa.id <> sb.id
          AND sa.term_id = sb.term_id
          AND COALESCE(a.room, sa.room) IS NOT NULL
          AND COALESCE(a.room, sa.room) = COALESCE(b.room, sb.room)
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
    ) conflicts;

    RETURN jsonb_build_object(
        'success', true,
        'faculty', v_faculty,
        'sections', v_sections,
        'conflicts', v_conflicts
    );
END;
$function$;
