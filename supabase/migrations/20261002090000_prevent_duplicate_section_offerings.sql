-- ====================================================================
-- Migration: 20261002090000_prevent_duplicate_section_offerings.sql
-- Description: Disallow duplicate section offerings by enforcing:
--              1. Unique section_code per term
--              2. Unique (term_id, course_id, faculty_id) combination
--              3. Clean deterministic section code generation when blank
-- ====================================================================

-- 1. Drop existing overloaded functions
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type, uuid);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, text, uuid);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint, text);
DROP FUNCTION IF EXISTS public.fn_create_section(uuid, uuid, uuid, text, text, smallint);

-- 2. Create canonical fn_create_section with strict duplicate protection
CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text DEFAULT NULL,
    p_room text DEFAULT NULL,
    p_max_slots smallint DEFAULT 40,
    p_status public.section_status_type DEFAULT 'Open'::public.section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_final_code TEXT;
    v_course_prefix TEXT;
    v_seq INT := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    -- 1. Validate active academic year
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

    -- 2. Validate duplicate offering: same faculty teaching same course in the same term
    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    -- 3. Resolve section code (deterministic generation if blank)
    v_final_code := btrim(COALESCE(p_section_code, ''));
    IF v_final_code = '' THEN
        SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
        INTO v_course_prefix
        FROM public.courses
        WHERE id = p_course_id;

        IF v_course_prefix IS NULL THEN
            v_course_prefix := 'SEC';
        END IF;

        v_final_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
        WHILE EXISTS (
            SELECT 1 FROM public.sections
            WHERE term_id = p_term_id
              AND lower(section_code) = lower(v_final_code)
              AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
            v_final_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
        END LOOP;
    ELSE
        -- Validate section code uniqueness within term
        IF EXISTS (
            SELECT 1 FROM public.sections
            WHERE term_id = p_term_id
              AND lower(btrim(section_code)) = lower(v_final_code)
              AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'A section with code "' || v_final_code || '" already exists for the selected term.'
            );
        END IF;
    END IF;

    -- 4. Insert section
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
        v_final_code,
        NULLIF(btrim(p_room), ''),
        COALESCE(p_max_slots, 40),
        COALESCE(p_status, 'Open'::public.section_status_type),
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    -- 5. Seed grading configuration
    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section created successfully.',
        'id', v_section_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type) TO authenticated, anon, service_role;

-- 3. Update fn_update_section with identical duplicate protection
CREATE OR REPLACE FUNCTION public.fn_update_section(
    p_section_id uuid,
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status public.section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be modified.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot move a section to a term outside the active academic year.');
    END IF;

    v_final_code := btrim(COALESCE(p_section_code, ''));
    IF v_final_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section code cannot be empty.');
    END IF;

    -- Validate unique code within term (excluding self)
    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND lower(btrim(section_code)) = lower(v_final_code)
          AND id <> p_section_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with code "' || v_final_code || '" already exists for the selected term.');
    END IF;

    -- Validate duplicate offering: same faculty teaching same course in the same term (excluding self)
    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND id <> p_section_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    UPDATE public.sections
    SET term_id = p_term_id,
        course_id = p_course_id,
        faculty_id = p_faculty_id,
        section_code = v_final_code,
        room = NULLIF(btrim(p_room), ''),
        max_slots = COALESCE(p_max_slots, 40),
        status = COALESCE(p_status, 'Open'::public.section_status_type),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section updated successfully.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_section(uuid, uuid, uuid, uuid, text, text, smallint, public.section_status_type) TO authenticated, anon, service_role;
