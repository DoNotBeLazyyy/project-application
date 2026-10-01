-- Migration: 20261001160000_fix_fn_get_section_by_id_school_years.sql
-- Description: Fix table name from public.academic_years to public.school_years in fn_get_section_by_id

CREATE OR REPLACE FUNCTION public.fn_get_section_by_id(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',          s.id,
        'term_id',     s.term_id,
        'course_id',   s.course_id,
        'faculty_id',  s.faculty_id,
        'section_code', s.section_code,
        'room',        s.room,
        'max_slots',   s.max_slots,
        'status',      s.status,
        'is_active_academic_year', COALESCE((
            SELECT sy.is_active
            FROM public.terms t
            JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE t.id = s.term_id AND t.deleted_at IS NULL
        ), false),
        'schedules', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', sch.id,
                'day_of_week', sch.day_of_week,
                'time_start', sch.time_start::text,
                'time_end', sch.time_end::text,
                'room', sch.room
            ) ORDER BY CASE sch.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
            END, sch.time_start)
            FROM public.section_schedules sch
            WHERE sch.section_id = s.id AND sch.deleted_at IS NULL
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.sections s
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_section_by_id(uuid) TO authenticated, service_role;
