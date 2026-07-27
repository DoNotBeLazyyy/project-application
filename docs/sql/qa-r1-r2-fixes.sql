DROP FUNCTION IF EXISTS public.fn_list_school_years_json(integer, integer, text, jsonb, boolean);

DROP FUNCTION IF EXISTS public.fn_create_school_year(text, text, date, date);

CREATE OR REPLACE FUNCTION public.fn_create_school_year(p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code is required.');
    END IF;

    IF p_label IS NULL OR btrim(p_label) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = btrim(p_code)
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || btrim(p_code));
    END IF;

    IF coalesce(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
        AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.school_years (code, label, start_date, end_date, is_active, created_by)
    VALUES (btrim(p_code), btrim(p_label), p_start_date, p_end_date, coalesce(p_is_active, false), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'School year created successfully');
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_program_level(uuid, text, text);

CREATE OR REPLACE FUNCTION public.fn_update_program_level(p_program_level_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_program_level_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No program level was selected.');
    END IF;

    IF p_code IS NULL OR btrim(p_code) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code is required.');
    END IF;

    IF p_label IS NULL OR btrim(p_label) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE code = btrim(p_code)
        AND id <> p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level code already exists: ' || btrim(p_code));
    END IF;

    UPDATE public.program_levels
    SET
        code = btrim(p_code),
        label = btrim(p_label),
        description = NULLIF(btrim(coalesce(p_description, '')), '')
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level updated successfully');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_create_school_year(text, text, date, date, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_program_level(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_create_school_year(text, text, date, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_program_level(uuid, text, text, text) TO authenticated;
