-- ====================================================================
-- Migration: 20261002080000_fix_fn_create_section_overload.sql
-- Description: Drop all overloaded versions of fn_create_section to
--              resolve PGRST203 function ambiguity in PostgREST.
-- ====================================================================

-- 1. Drop all previous overloaded function signatures
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type, uuid);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, text, uuid);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, text);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint);

-- 2. Create canonical single fn_create_section returning JSONB with section id
CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status public.section_status_type DEFAULT 'Open'::public.section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    -- Validate active academic year
    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sections can only be created for the active academic year.');
    END IF;

    -- Validate unique section code within term
    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND lower(btrim(section_code)) = lower(btrim(p_section_code))
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
        btrim(p_section_code),
        NULLIF(btrim(p_room), ''),
        p_max_slots,
        COALESCE(p_status, 'Open'::public.section_status_type),
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    -- Seed grading configuration
    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section created successfully.',
        'id', v_section_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type) TO authenticated, anon, service_role;
