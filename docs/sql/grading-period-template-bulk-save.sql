CREATE OR REPLACE FUNCTION public.fn_save_grading_period_templates_dummy(
    p_periods jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_period JSONB;
    v_component JSONB;
    v_period_total NUMERIC := 0;
    v_comp_total NUMERIC;
    v_period_id UUID;
    v_seq SMALLINT := 0;
    v_submitted_ids UUID[] := ARRAY[]::UUID[];
    v_period_name TEXT;
    v_comp_name TEXT;
BEGIN
    IF jsonb_array_length(p_periods) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one grading period is required.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(p->>'name')))
        FROM jsonb_array_elements(p_periods) p
    ) <> jsonb_array_length(p_periods) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period names must be unique.');
    END IF;

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        v_period_name := btrim(COALESCE(v_period->>'name', ''));
        IF v_period_name = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Period name cannot be blank.');
        END IF;

        IF (v_period->>'weight')::NUMERIC <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Period weight must be greater than 0.');
        END IF;

        v_period_total := v_period_total + (v_period->>'weight')::NUMERIC;

        IF jsonb_array_length(COALESCE(v_period->'components', '[]'::jsonb)) = 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Period "' || v_period_name || '" must have at least one component.');
        END IF;

        IF (
            SELECT COUNT(DISTINCT lower(btrim(c->>'name')))
            FROM jsonb_array_elements(v_period->'components') c
        ) <> jsonb_array_length(v_period->'components') THEN
            RETURN jsonb_build_object('success', false, 'message', 'Component names within "' || v_period_name || '" must be unique.');
        END IF;

        v_comp_total := 0;
        FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
        LOOP
            v_comp_name := btrim(COALESCE(v_component->>'name', ''));
            IF v_comp_name = '' THEN
                RETURN jsonb_build_object('success', false, 'message', 'Component name cannot be blank in period "' || v_period_name || '".');
            END IF;

            IF (v_component->>'weight')::NUMERIC <= 0 THEN
                RETURN jsonb_build_object('success', false, 'message', 'Component weight must be greater than 0 in period "' || v_period_name || '".');
            END IF;

            v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
        END LOOP;

        IF round(v_comp_total, 2) <> 100 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Component weights for ' || v_period_name || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
            );
        END IF;
    END LOOP;

    IF round(v_period_total, 2) <> 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Grading period weights must sum to exactly 100%. Current total: ' || v_period_total || '%'
        );
    END IF;

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        IF (v_period->>'id') IS NOT NULL AND (v_period->>'id') <> '' THEN
            v_submitted_ids := array_append(v_submitted_ids, (v_period->>'id')::UUID);
        END IF;
    END LOOP;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id IN (
        SELECT id FROM public.grading_period_templates
        WHERE deleted_at IS NULL
          AND NOT (id = ANY(v_submitted_ids))
    ) AND deleted_at IS NULL;

    UPDATE public.grading_period_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL
      AND NOT (id = ANY(v_submitted_ids));

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        v_seq := v_seq + 1;
        v_period_name := btrim(v_period->>'name');

        IF (v_period->>'id') IS NOT NULL AND (v_period->>'id') <> '' AND EXISTS (
            SELECT 1 FROM public.grading_period_templates WHERE id = (v_period->>'id')::UUID AND deleted_at IS NULL
        ) THEN
            v_period_id := (v_period->>'id')::UUID;
            UPDATE public.grading_period_templates
            SET name = v_period_name,
                sequence = v_seq,
                weight = (v_period->>'weight')::NUMERIC,
                updated_at = now(),
                updated_by = auth.uid()
            WHERE id = v_period_id;
        ELSE
            INSERT INTO public.grading_period_templates (
                name, sequence, weight, created_by
            ) VALUES (
                v_period_name,
                v_seq,
                (v_period->>'weight')::NUMERIC,
                auth.uid()
            ) RETURNING id INTO v_period_id;
        END IF;

        UPDATE public.grading_component_templates
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE grading_period_template_id = v_period_id
          AND deleted_at IS NULL;

        FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
        LOOP
            INSERT INTO public.grading_component_templates (
                grading_period_template_id, name, weight, created_by
            ) VALUES (
                v_period_id,
                btrim(v_component->>'name'),
                (v_component->>'weight')::NUMERIC,
                auth.uid()
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period templates saved successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_grading_period_template(
    p_name text,
    p_weight numeric,
    p_components jsonb,
    p_sequence smallint DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_component JSONB;
    v_comp_total NUMERIC := 0;
    v_existing_total NUMERIC := 0;
    v_sequence SMALLINT;
    v_period_id UUID;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period name is required.');
    END IF;

    IF p_weight IS NULL OR p_weight <= 0 OR p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weight must be greater than 0 and at most 100.');
    END IF;

    IF jsonb_array_length(p_components) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one component is required.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'name')))
        FROM jsonb_array_elements(p_components) c
    ) <> jsonb_array_length(p_components) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component names within a grading period must be unique.');
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

    IF EXISTS (
        SELECT 1 FROM public.grading_period_templates
        WHERE lower(name) = lower(btrim(p_name)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A grading period named "' || btrim(p_name) || '" already exists.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_existing_total
    FROM public.grading_period_templates
    WHERE deleted_at IS NULL;

    IF v_existing_total >= 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading periods already total 100%. You cannot add another period.');
    END IF;

    IF v_existing_total + p_weight > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Adding this period (' || p_weight || '%) would exceed 100%. Only ' || (100 - v_existing_total) || '% remaining.'
        );
    END IF;

    IF p_sequence IS NOT NULL AND p_sequence > 0 THEN
        v_sequence := p_sequence;
    ELSE
        SELECT COALESCE(MAX(sequence), 0) + 1 INTO v_sequence
        FROM public.grading_period_templates
        WHERE deleted_at IS NULL;
    END IF;

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
    p_components jsonb,
    p_sequence smallint DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_component JSONB;
    v_comp_total NUMERIC := 0;
    v_others_total NUMERIC := 0;
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

    IF jsonb_array_length(p_components) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one component is required.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'name')))
        FROM jsonb_array_elements(p_components) c
    ) <> jsonb_array_length(p_components) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component names within a grading period must be unique.');
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

    IF EXISTS (
        SELECT 1 FROM public.grading_period_templates
        WHERE lower(name) = lower(btrim(p_name)) AND id <> p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A grading period named "' || btrim(p_name) || '" already exists.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_others_total
    FROM public.grading_period_templates
    WHERE deleted_at IS NULL AND id <> p_id;

    IF v_others_total + p_weight > 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This weight would make the total exceed 100%. Only ' || (100 - v_others_total) || '% is available for this period.'
        );
    END IF;

    UPDATE public.grading_period_templates
    SET name = btrim(p_name),
        weight = p_weight,
        sequence = COALESCE(p_sequence, sequence),
        updated_at = now(),
        updated_by = auth.uid()
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

GRANT EXECUTE ON FUNCTION public.fn_save_grading_period_templates_dummy(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_grading_period_template(text, numeric, jsonb, smallint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_grading_period_template(uuid, text, numeric, jsonb, smallint) TO authenticated;
