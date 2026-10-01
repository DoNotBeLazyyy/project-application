-- Migration: 20261001140000_faculty_load_stepper_detail_and_conflicts.sql
-- Description: Expand fn_get_faculty_load_detail with comprehensive section details and conflicts, add batch assignment save RPC

-- 1. Update fn_assign_section_faculty to permit Registrar as well
CREATE OR REPLACE FUNCTION public.fn_assign_section_faculty(
    p_section_id UUID,
    p_faculty_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin', 'Registrar');

    IF NOT EXISTS (
        SELECT 1 FROM public.sections WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF p_faculty_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.id = p_faculty_id AND u.deleted_at IS NULL AND r.code = 'Faculty'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Selected user is not an active faculty member.');
    END IF;

    UPDATE public.sections
    SET faculty_id = p_faculty_id,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_section_id;

    RETURN jsonb_build_object('success', true, 'message', 'Faculty assignment updated successfully.');
END;
$$;

-- 2. Enhanced fn_get_faculty_load_detail with full section metadata and schedule conflicts
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
            'term_label', tt.label || ' - ' || sy.label,
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
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
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

    -- Schedule Conflicts (Faculty overlaps + Room overlaps for sections of this faculty)
    SELECT COALESCE(jsonb_agg(conf ORDER BY conf->>'day_of_week', conf->>'time_start'), '[]'::JSONB)
    INTO v_conflicts
    FROM (
        -- 1. Faculty schedule overlaps
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
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM'),
            'room', COALESCE(a.room, sa.room, '')
        ) AS conf
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sa.faculty_id = p_faculty_id
          AND sb.faculty_id = sa.faculty_id
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)

        UNION ALL

        -- 2. Room overlaps on any section assigned to this faculty
        SELECT jsonb_build_object(
            'id', md5(a.id::TEXT || b.id::TEXT || 'Room'),
            'conflict_type', 'Room',
            'faculty_id', p_faculty_id,
            'faculty_name', fu.first_name || ' ' || fu.last_name,
            'subject_label', COALESCE(a.room, sa.room),
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a_id', sa.id,
            'section_a', sa.section_code,
            'course_a', ca.code || ' - ' || ca.title,
            'section_b_id', sb.id,
            'section_b', sb.section_code,
            'course_b', cb.code || ' - ' || cb.title,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM'),
            'room', COALESCE(a.room, sa.room, '')
        ) AS conf
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = p_faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND (sa.faculty_id = p_faculty_id OR sb.faculty_id = p_faculty_id)
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND COALESCE(a.room, sa.room) IS NOT NULL
          AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
    ) c_all;

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'sections', v_sections,
        'conflicts', v_conflicts
    );
END;
$function$;

-- 3. Batch atomic save function for faculty load assignments
CREATE OR REPLACE FUNCTION public.fn_save_faculty_load_assignments(
    p_assignments jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_item JSONB;
    v_section_id UUID;
    v_faculty_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin', 'Registrar');

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_assignments)
    LOOP
        v_section_id := (v_item->>'section_id')::UUID;
        v_faculty_id := NULLIF(v_item->>'faculty_id', '')::UUID;

        IF v_section_id IS NOT NULL THEN
            UPDATE public.sections
            SET faculty_id = v_faculty_id,
                updated_at = NOW(),
                updated_by = auth.uid()
            WHERE id = v_section_id
              AND deleted_at IS NULL;

            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'message', 'Faculty load assignments saved successfully.'
    );
END;
$$;
