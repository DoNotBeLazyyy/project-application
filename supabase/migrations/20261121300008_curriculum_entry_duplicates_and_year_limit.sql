-- ====================================================================
-- Migration: 20261121300008_curriculum_entry_duplicates_and_year_limit.sql
-- Audit 2026-11-21 (Tier 2 curriculum):
--   * fn_create_curriculum_map_entry / fn_update_curriculum_map_entry: a course could be in a
--     program twice, once as a general row (no school year) and once for a school year. A
--     general row and a school-year row for the same course now count as duplicates.
--   * The year level is now limited to the program's length (programs.years_duration),
--     not just 1 to 6.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(p_program_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_units numeric DEFAULT NULL::numeric, p_type_units jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    -- Enforce department match: program and course must belong to the same department
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.programs p ON p.id = p_program_id
        WHERE c.id = p_course_id
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course does not belong to the department of this program');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        -- A general row (no school year) applies to every school year, so it clashes with any row
        AND (school_year_id IS NULL OR p_school_year_id IS NULL OR school_year_id = p_school_year_id)
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course already exists in curriculum for this program and school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id
          AND years_duration IS NOT NULL
          AND p_year_level > years_duration
    ) THEN
        RETURN jsonb_build_object('success', false, 'message',
            'Year level ' || p_year_level || ' is beyond this program''s length of '
            || (SELECT years_duration FROM public.programs WHERE id = p_program_id) || ' year(s).');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective,
        lecture_units, laboratory_units, units, type_units,
        created_by
    )
    VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective,
        p_lecture_units, p_laboratory_units, p_units, COALESCE(p_type_units, '{}'::jsonb),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(p_curriculum_map_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_units numeric DEFAULT NULL::numeric, p_type_units jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    -- Enforce department match
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.programs p ON p.id = v_program_id
        WHERE c.id = p_course_id
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course does not belong to the department of this program');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = v_program_id
        AND course_id = p_course_id
        -- A general row (no school year) applies to every school year, so it clashes with any row
        AND (school_year_id IS NULL OR p_school_year_id IS NULL OR school_year_id = p_school_year_id)
        AND id <> p_curriculum_map_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = v_program_id
          AND years_duration IS NOT NULL
          AND p_year_level > years_duration
    ) THEN
        RETURN jsonb_build_object('success', false, 'message',
            'Year level ' || p_year_level || ' is beyond this program''s length of '
            || (SELECT years_duration FROM public.programs WHERE id = v_program_id) || ' year(s).');
    END IF;

    UPDATE public.curriculum_maps
    SET
        course_id = p_course_id,
        year_level = p_year_level,
        term_type_id = p_term_type_id,
        school_year_id = p_school_year_id,
        sequence = p_sequence,
        is_elective = p_is_elective,
        lecture_units = p_lecture_units,
        laboratory_units = p_laboratory_units,
        units = p_units,
        type_units = COALESCE(p_type_units, type_units, '{}'::jsonb),
        updated_at = clock_timestamp(),
        updated_by = auth.uid()
    WHERE id = p_curriculum_map_id;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$function$;

COMMIT;
