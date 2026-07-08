CREATE UNIQUE INDEX IF NOT EXISTS uidx_roles_label
    ON public.roles (lower(btrim(label)))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_roles_description
    ON public.roles (lower(btrim(description)))
    WHERE deleted_at IS NULL AND btrim(coalesce(description, '')) <> '';

CREATE OR REPLACE FUNCTION public.fn_create_role(p_code text, p_label text, p_description text DEFAULT NULL::text)
    RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_code TEXT := btrim(p_code);
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
BEGIN
    IF v_code IS NULL OR v_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role code is required.');
    END IF;

    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(code)) = lower(v_code) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with code "' || v_code || '" already exists.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    INSERT INTO public.roles (code, label, description, created_by)
    VALUES (v_code, v_label, v_description, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Role created successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_role(p_role_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text)
    RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_code TEXT := btrim(p_code);
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.roles
        WHERE id = p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    IF v_code IS NULL OR v_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role code is required.');
    END IF;

    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(code)) = lower(v_code) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with code "' || v_code || '" already exists.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    UPDATE public.roles
    SET
        code = v_code,
        label = v_label,
        description = v_description,
        updated_by = auth.uid()
    WHERE id = p_role_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
END;
$$;
