CREATE OR REPLACE FUNCTION public.fn_create_grading_period_template(
    p_name text,
    p_weight numeric,
    p_components jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_component JSONB;
    v_comp_total NUMERIC := 0;
    v_sequence SMALLINT;
    v_period_id UUID;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period name is required.');
    END IF;

    IF p_weight IS NULL OR p_weight <= 0 OR p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weight must be greater than 0 and at most 100.');
    END IF;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
    END LOOP;

    IF round(v_comp_total, 2) <> 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Component weights for ' || p_name || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
        );
    END IF;

    SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
    FROM public.grading_period_templates
    WHERE deleted_at IS NULL;

    INSERT INTO public.grading_period_templates (name, sequence, weight, created_by)
    VALUES (btrim(p_name), v_sequence, p_weight, auth.uid())
    RETURNING id INTO v_period_id;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        INSERT INTO public.grading_component_templates (
            grading_period_template_id, name, weight, created_by
        )
        VALUES (
            v_period_id,
            btrim(v_component->>'name'),
            (v_component->>'weight')::NUMERIC,
            auth.uid()
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period created successfully', 'id', v_period_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_update_grading_period_template(
    p_id uuid,
    p_name text,
    p_weight numeric,
    p_components jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_component JSONB;
    v_comp_total NUMERIC := 0;
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.grading_period_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period name is required.');
    END IF;

    IF p_weight IS NULL OR p_weight <= 0 OR p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weight must be greater than 0 and at most 100.');
    END IF;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
    END LOOP;

    IF round(v_comp_total, 2) <> 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Component weights for ' || p_name || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
        );
    END IF;

    UPDATE public.grading_period_templates
    SET name = btrim(p_name), weight = p_weight, updated_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id = p_id AND deleted_at IS NULL;

    FOR v_component IN SELECT * FROM jsonb_array_elements(p_components)
    LOOP
        INSERT INTO public.grading_component_templates (
            grading_period_template_id, name, weight, created_by
        )
        VALUES (
            p_id,
            btrim(v_component->>'name'),
            (v_component->>'weight')::NUMERIC,
            auth.uid()
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period updated successfully');
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_delete_grading_period_template(
    p_id uuid
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.grading_period_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id = p_id AND deleted_at IS NULL;

    UPDATE public.grading_period_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period deleted successfully');
END;
$$;
