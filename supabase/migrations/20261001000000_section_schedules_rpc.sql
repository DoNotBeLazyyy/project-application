-- Migration: Add fn_save_section_schedules and enhance fn_get_section_by_id with schedules
CREATE OR REPLACE FUNCTION public.fn_save_section_schedules(
    p_section_id UUID,
    p_schedules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_item JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    -- Soft delete existing section schedule slots
    UPDATE public.section_schedules
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE section_id = p_section_id
      AND deleted_at IS NULL;

    IF p_schedules IS NOT NULL AND jsonb_array_length(p_schedules) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_schedules) LOOP
            INSERT INTO public.section_schedules (
                section_id,
                day_of_week,
                time_start,
                time_end,
                room,
                created_by
            ) VALUES (
                p_section_id,
                (v_item->>'day_of_week')::public.day_of_week_type,
                (v_item->>'time_start')::TIME,
                (v_item->>'time_end')::TIME,
                NULLIF(v_item->>'room', ''),
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Enhance fn_get_section_by_id to include section_schedules
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
        'is_active_academic_year', (
            SELECT ay.is_active
            FROM public.terms t
            JOIN public.academic_years ay ON ay.id = t.academic_year_id AND ay.deleted_at IS NULL
            WHERE t.id = s.term_id AND t.deleted_at IS NULL
        ),
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

-- Enhance fn_create_section to return section id
CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status section_status_type DEFAULT 'Open'::section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    INSERT INTO public.sections (
        term_id,
        course_id,
        faculty_id,
        section_code,
        room,
        max_slots,
        status,
        created_by
    ) VALUES (
        p_term_id,
        p_course_id,
        p_faculty_id,
        p_section_code,
        p_room,
        p_max_slots,
        p_status,
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.', 'id', v_section_id);
END;
$function$;

