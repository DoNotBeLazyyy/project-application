DROP INDEX IF EXISTS public.uidx_special_grade_configs_code;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_configs_code
    ON public.special_grade_configs (lower(btrim(code)))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_configs_label
    ON public.special_grade_configs (lower(btrim(label)))
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_configs_description
    ON public.special_grade_configs (lower(btrim(description)))
    WHERE deleted_at IS NULL AND btrim(coalesce(description, '')) <> '';

CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_config JSONB;
    v_id UUID;
    v_code TEXT;
    v_label TEXT;
    v_description TEXT;
BEGIN
    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'code')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade codes must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'label')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade labels must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(*)
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) <> (
        SELECT COUNT(DISTINCT lower(btrim(c->>'description')))
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade descriptions must be unique within your changes.');
    END IF;

    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        v_id := NULLIF(v_config->>'id', '')::UUID;
        v_code := btrim(v_config->>'code');
        v_label := btrim(v_config->>'label');
        v_description := NULLIF(btrim(coalesce(v_config->>'description', '')), '');

        IF v_code IS NULL OR v_code = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade code is required.');
        END IF;

        IF v_label IS NULL OR v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade label is required.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(code)) = lower(v_code)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with code "' || v_code || '" already exists.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(label)) = lower(v_label)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with label "' || v_label || '" already exists.');
        END IF;

        IF v_description IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(description)) = lower(v_description)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with description "' || v_description || '" already exists.');
        END IF;

        IF v_id IS NOT NULL THEN
            UPDATE public.special_grade_configs
            SET
                code = v_code,
                label = v_label,
                description = v_description,
                min_absence_percentage = (v_config->>'min_absence_percentage')::NUMERIC,
                requires_completion = (v_config->>'requires_completion')::BOOLEAN,
                completion_deadline_days = (v_config->>'completion_deadline_days')::SMALLINT,
                is_passing = (v_config->>'is_passing')::BOOLEAN,
                is_active = (v_config->>'is_active')::BOOLEAN,
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;
        ELSE
            INSERT INTO public.special_grade_configs (
                code, label, description, min_absence_percentage,
                requires_completion, completion_deadline_days,
                is_passing, is_active, created_by
            )
            VALUES (
                v_code,
                v_label,
                v_description,
                (v_config->>'min_absence_percentage')::NUMERIC,
                (v_config->>'requires_completion')::BOOLEAN,
                (v_config->>'completion_deadline_days')::SMALLINT,
                (v_config->>'is_passing')::BOOLEAN,
                (v_config->>'is_active')::BOOLEAN,
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully');
END;
$$;
