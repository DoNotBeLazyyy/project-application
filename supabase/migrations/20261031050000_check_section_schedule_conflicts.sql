-- ====================================================================
-- Migration: 20261031050000_check_section_schedule_conflicts.sql
--   * fn_check_section_schedule_conflicts: lists the faculty and room clashes a set of
--     schedule slots would create in a term, before the section is saved. The section wizard
--     calls it so a double-booked instructor or room is caught on save instead of only
--     showing up later on the Schedule Conflicts report
-- Rollback: supabase/rollback/20261031050000_check_section_schedule_conflicts.down.sql
-- ====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_check_section_schedule_conflicts(
    p_term_id uuid,
    p_faculty_id uuid,
    p_section_room text,
    p_slots jsonb,
    p_section_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_conflicts JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_term_id IS NULL OR p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' THEN
        RETURN '[]'::JSONB;
    END IF;

    WITH slots AS (
        SELECT
            (slot->>'day_of_week')::public.day_of_week_type AS day_of_week,
            (slot->>'time_start')::TIME AS time_start,
            (slot->>'time_end')::TIME AS time_end,
            upper(btrim(COALESCE(NULLIF(slot->>'room', ''), NULLIF(p_section_room, '')))) AS room
        FROM jsonb_array_elements(p_slots) slot
    ),
    existing AS (
        SELECT
            s.section_code,
            s.faculty_id,
            ss.day_of_week,
            ss.time_start,
            ss.time_end,
            upper(btrim(COALESCE(ss.room, s.room))) AS room
        FROM public.section_schedules ss
        INNER JOIN public.sections s ON s.id = ss.section_id AND s.deleted_at IS NULL
        WHERE ss.deleted_at IS NULL
          AND s.term_id = p_term_id
          AND (p_section_id IS NULL OR s.id <> p_section_id)
    )
    SELECT COALESCE(jsonb_agg(DISTINCT c), '[]'::JSONB)
    INTO v_conflicts
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', CASE WHEN p_faculty_id IS NOT NULL AND e.faculty_id = p_faculty_id THEN 'Faculty' ELSE 'Room' END,
            'section_code', e.section_code,
            'day_of_week', e.day_of_week::TEXT,
            'time_start', to_char(e.time_start, 'HH12:MI AM'),
            'time_end', to_char(e.time_end, 'HH12:MI AM'),
            'room', e.room
        ) AS c
        FROM slots n
        INNER JOIN existing e
            ON e.day_of_week = n.day_of_week
           AND e.time_start < n.time_end
           AND n.time_start < e.time_end
        WHERE (p_faculty_id IS NOT NULL AND e.faculty_id = p_faculty_id)
           OR (n.room IS NOT NULL AND n.room <> '' AND e.room = n.room)
    ) conflicts;

    RETURN v_conflicts;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_check_section_schedule_conflicts(uuid, uuid, text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_check_section_schedule_conflicts(uuid, uuid, text, jsonb, uuid) TO authenticated;

COMMIT;
