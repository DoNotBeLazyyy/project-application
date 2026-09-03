BEGIN;

ALTER TABLE public.special_grade_configs
    ADD COLUMN IF NOT EXISTS allows_section_override BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.special_grade_configs.allows_section_override IS
    'When true, section staff may tighten or loosen the numeric threshold of this rule for their own section only. Signals and operators stay owned by the admin.';

CREATE TABLE IF NOT EXISTS public.special_grade_section_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    special_grade_config_id uuid NOT NULL,
    signal text NOT NULL,
    value numeric NOT NULL,
    value_max numeric,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT special_grade_section_overrides_pkey PRIMARY KEY (id)
);

DO $$ BEGIN
    ALTER TABLE public.special_grade_section_overrides
        ADD CONSTRAINT special_grade_section_overrides_section_id_fkey
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.special_grade_section_overrides
        ADD CONSTRAINT special_grade_section_overrides_config_id_fkey
        FOREIGN KEY (special_grade_config_id) REFERENCES special_grade_configs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_section_overrides_scope
    ON public.special_grade_section_overrides (section_id, special_grade_config_id, signal)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_special_grade_section_overrides_section
    ON public.special_grade_section_overrides (section_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.special_grade_section_overrides ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_special_grade_section_overrides_updated_audit
    ON public.special_grade_section_overrides;
CREATE TRIGGER trg_special_grade_section_overrides_updated_audit
    BEFORE UPDATE ON public.special_grade_section_overrides
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "special_grade_section_overrides_select"
    ON public.special_grade_section_overrides;
CREATE POLICY "special_grade_section_overrides_select"
    ON public.special_grade_section_overrides
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
            OR EXISTS (
                SELECT 1
                FROM public.sections s
                WHERE s.id = special_grade_section_overrides.section_id
                  AND s.deleted_at IS NULL
                  AND s.faculty_id = auth.uid()
            )
        )
    );

CREATE OR REPLACE FUNCTION public.fn_apply_special_grade_overrides(
    p_node jsonb,
    p_overrides jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $fn$
DECLARE
    v_child    JSONB;
    v_mapped   JSONB;
    v_override JSONB;
    v_signal   TEXT;
BEGIN
    IF p_node IS NULL OR jsonb_typeof(p_node) <> 'object' THEN
        RETURN p_node;
    END IF;

    IF p_overrides IS NULL OR p_overrides = '{}'::jsonb THEN
        RETURN p_node;
    END IF;

    IF jsonb_typeof(p_node->'all') = 'array' THEN
        v_mapped := '[]'::jsonb;
        FOR v_child IN SELECT * FROM jsonb_array_elements(p_node->'all')
        LOOP
            v_mapped := v_mapped || jsonb_build_array(
                public.fn_apply_special_grade_overrides(v_child, p_overrides)
            );
        END LOOP;
        RETURN jsonb_set(p_node, '{all}', v_mapped);
    END IF;

    IF jsonb_typeof(p_node->'any') = 'array' THEN
        v_mapped := '[]'::jsonb;
        FOR v_child IN SELECT * FROM jsonb_array_elements(p_node->'any')
        LOOP
            v_mapped := v_mapped || jsonb_build_array(
                public.fn_apply_special_grade_overrides(v_child, p_overrides)
            );
        END LOOP;
        RETURN jsonb_set(p_node, '{any}', v_mapped);
    END IF;

    IF jsonb_exists(p_node, 'not') THEN
        RETURN jsonb_set(
            p_node,
            '{not}',
            public.fn_apply_special_grade_overrides(p_node->'not', p_overrides)
        );
    END IF;

    v_signal := p_node->>'signal';

    IF v_signal IS NULL THEN
        RETURN p_node;
    END IF;

    v_override := p_overrides->v_signal;

    IF v_override IS NULL THEN
        RETURN p_node;
    END IF;

    IF p_node->>'op' = 'between' THEN
        RETURN jsonb_set(
            p_node,
            '{value}',
            jsonb_build_array(
                COALESCE((v_override->>'value')::NUMERIC, 0),
                COALESCE(
                    (v_override->>'value_max')::NUMERIC,
                    (v_override->>'value')::NUMERIC,
                    0
                )
            )
        );
    END IF;

    IF p_node->>'op' IN ('is_null', 'not_null') THEN
        RETURN p_node;
    END IF;

    RETURN jsonb_set(
        p_node,
        '{value}',
        to_jsonb(COALESCE((v_override->>'value')::NUMERIC, 0))
    );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_section_special_grade_override_map(p_section_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
    SELECT COALESCE(
        jsonb_object_agg(
            o.special_grade_config_id::TEXT,
            o.signal_map
        ),
        '{}'::jsonb
    )
    FROM (
        SELECT
            sgso.special_grade_config_id,
            jsonb_object_agg(
                sgso.signal,
                jsonb_build_object('value', sgso.value, 'value_max', sgso.value_max)
            ) AS signal_map
        FROM public.special_grade_section_overrides sgso
        INNER JOIN public.special_grade_configs sgc
            ON sgc.id = sgso.special_grade_config_id
            AND sgc.deleted_at IS NULL
            AND sgc.allows_section_override
        WHERE sgso.section_id = p_section_id
          AND sgso.deleted_at IS NULL
        GROUP BY sgso.special_grade_config_id
    ) o;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_get_section_special_grade_overrides(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'special_grade_config_id', sgc.id,
                'code', sgc.code,
                'label', sgc.label,
                'description', sgc.description,
                'is_passing', sgc.is_passing,
                'priority', sgc.priority,
                'conditions', sgc.conditions,
                'overrides', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', o.id,
                            'signal', o.signal,
                            'value', o.value,
                            'value_max', o.value_max,
                            'note', o.note,
                            'updated_at', COALESCE(o.updated_at, o.created_at)
                        )
                        ORDER BY o.signal
                    ), '[]'::jsonb)
                    FROM public.special_grade_section_overrides o
                    WHERE o.special_grade_config_id = sgc.id
                      AND o.section_id = p_section_id
                      AND o.deleted_at IS NULL
                )
            )
            ORDER BY sgc.priority ASC, sgc.code ASC
        ), '[]'::jsonb)
        FROM public.special_grade_configs sgc
        WHERE sgc.deleted_at IS NULL
          AND sgc.is_active
          AND sgc.is_auto_detected
          AND sgc.allows_section_override
    );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_save_section_special_grade_override(
    p_section_id uuid,
    p_special_grade_config_id uuid,
    p_signal text,
    p_value numeric,
    p_value_max numeric DEFAULT NULL,
    p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_rule       RECORD;
    v_has_signal BOOLEAN;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    SELECT sgc.id, sgc.code, sgc.conditions, sgc.allows_section_override
    INTO v_rule
    FROM public.special_grade_configs sgc
    WHERE sgc.id = p_special_grade_config_id
      AND sgc.deleted_at IS NULL;

    IF v_rule.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'That special grade rule no longer exists.');
    END IF;

    IF NOT v_rule.allows_section_override THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The administrator has locked "' || v_rule.code || '" to its institution-wide threshold.'
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
            COALESCE(v_rule.conditions->'all', v_rule.conditions->'any', '[]'::jsonb)
        ) leaf
        WHERE leaf->>'signal' = p_signal
    ) INTO v_has_signal;

    IF NOT v_has_signal THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Rule "' || v_rule.code || '" does not test that signal, so it cannot be overridden.'
        );
    END IF;

    IF p_value IS NULL OR p_value < 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'An override threshold must be zero or greater.');
    END IF;

    IF p_value_max IS NOT NULL AND p_value_max < p_value THEN
        RETURN jsonb_build_object('success', false, 'message', 'The upper bound must not be lower than the lower bound.');
    END IF;

    INSERT INTO public.special_grade_section_overrides (
        section_id, special_grade_config_id, signal, value, value_max, note, created_by
    )
    VALUES (
        p_section_id, p_special_grade_config_id, p_signal, p_value, p_value_max,
        NULLIF(btrim(COALESCE(p_note, '')), ''), auth.uid()
    )
    ON CONFLICT (section_id, special_grade_config_id, signal) WHERE deleted_at IS NULL
    DO UPDATE SET
        value      = EXCLUDED.value,
        value_max  = EXCLUDED.value_max,
        note       = EXCLUDED.note,
        updated_by = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Section threshold saved.');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_clear_section_special_grade_override(
    p_section_id uuid,
    p_special_grade_config_id uuid,
    p_signal text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    UPDATE public.special_grade_section_overrides
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE section_id              = p_section_id
      AND special_grade_config_id = p_special_grade_config_id
      AND signal                  = p_signal
      AND deleted_at              IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section threshold reset to the institution default.');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_detect_special_grade_flags_core(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_enrollment_ids  UUID[];
    v_overrides       JSONB;
    v_sig             RECORD;
    v_rule            RECORD;
    v_conditions      JSONB;
    v_matched         BOOLEAN;
    v_evidence        JSONB;
    v_existing_id     UUID;
    v_existing_status TEXT;
    v_created         INTEGER := 0;
    v_refreshed       INTEGER := 0;
    v_superseded      INTEGER := 0;
BEGIN
    SELECT array_agg(e.id)
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.status     = 'Enrolled'
      AND e.deleted_at IS NULL;

    IF v_enrollment_ids IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'created', 0, 'refreshed', 0, 'superseded', 0
        );
    END IF;

    v_overrides := public.fn_section_special_grade_override_map(p_section_id);

    FOR v_sig IN
        SELECT * FROM public.fn_special_grade_signals(v_enrollment_ids)
    LOOP
        FOR v_rule IN
            SELECT sgc.*
            FROM public.special_grade_configs sgc
            WHERE sgc.deleted_at IS NULL
              AND sgc.is_active
              AND sgc.is_auto_detected
            ORDER BY sgc.priority ASC, sgc.code ASC
        LOOP
            v_conditions := public.fn_apply_special_grade_overrides(
                v_rule.conditions,
                COALESCE(v_overrides->(v_rule.id::TEXT), '{}'::jsonb)
            );

            v_matched := public.fn_eval_special_grade_condition(v_conditions, v_sig.signals);

            SELECT f.id, f.status::TEXT
            INTO v_existing_id, v_existing_status
            FROM public.special_grade_flags f
            WHERE f.enrollment_id           = v_sig.enrollment_id
              AND f.grading_period_id       = p_grading_period_id
              AND f.special_grade_config_id = v_rule.id
              AND f.deleted_at              IS NULL;

            IF v_matched THEN
                v_evidence := public.fn_special_grade_evidence(v_conditions, v_sig.signals);

                IF v_existing_id IS NULL THEN
                    INSERT INTO public.special_grade_flags (
                        special_grade_config_id, enrollment_id, grading_period_id,
                        status, rule_version, rule_snapshot, evidence
                    ) VALUES (
                        v_rule.id, v_sig.enrollment_id, p_grading_period_id,
                        'Pending', v_rule.rule_version,
                        jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        v_evidence
                    );
                    v_created := v_created + 1;

                ELSIF v_existing_status IN ('Pending', 'Superseded') THEN
                    UPDATE public.special_grade_flags
                    SET status        = 'Pending',
                        rule_version  = v_rule.rule_version,
                        rule_snapshot = jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        evidence      = v_evidence,
                        detected_at   = now()
                    WHERE id = v_existing_id;
                    v_refreshed := v_refreshed + 1;
                END IF;

            ELSIF v_existing_id IS NOT NULL AND v_existing_status = 'Pending' THEN
                UPDATE public.special_grade_flags
                SET status = 'Superseded'
                WHERE id = v_existing_id;
                v_superseded := v_superseded + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success',    true,
        'created',    v_created,
        'refreshed',  v_refreshed,
        'superseded', v_superseded
    );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_get_special_grade_configs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sgc.id,
                'code', sgc.code,
                'label', sgc.label,
                'description', sgc.description,
                'min_absence_percentage', sgc.min_absence_percentage,
                'requires_completion', sgc.requires_completion,
                'completion_deadline_days', sgc.completion_deadline_days,
                'is_passing', sgc.is_passing,
                'is_active', sgc.is_active,
                'conditions', sgc.conditions,
                'priority', sgc.priority,
                'is_auto_detected', sgc.is_auto_detected,
                'allows_section_override', sgc.allows_section_override,
                'rule_version', sgc.rule_version,
                'section_override_count', (
                    SELECT COUNT(*)
                    FROM public.special_grade_section_overrides o
                    WHERE o.special_grade_config_id = sgc.id
                      AND o.deleted_at IS NULL
                ),
                'pending_flag_count', (
                    SELECT COUNT(*)
                    FROM public.special_grade_flags f
                    WHERE f.special_grade_config_id = sgc.id
                      AND f.status     = 'Pending'
                      AND f.deleted_at IS NULL
                )
            )
            ORDER BY sgc.priority ASC, sgc.created_at ASC
        ), '[]'::jsonb)
        FROM public.special_grade_configs sgc
        WHERE sgc.deleted_at IS NULL
    );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_config      JSONB;
    v_id          UUID;
    v_code        TEXT;
    v_label       TEXT;
    v_description TEXT;
    v_conditions  JSONB;
    v_prev        JSONB;
    v_allows      BOOLEAN;
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
        v_id          := NULLIF(v_config->>'id', '')::UUID;
        v_code        := btrim(v_config->>'code');
        v_label       := btrim(v_config->>'label');
        v_description := NULLIF(btrim(coalesce(v_config->>'description', '')), '');
        v_conditions  := COALESCE(v_config->'conditions', '{"all": []}'::jsonb);
        v_allows      := COALESCE((v_config->>'allows_section_override')::BOOLEAN, false);

        IF v_code IS NULL OR v_code = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade code is required.');
        END IF;

        IF v_label IS NULL OR v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade label is required.');
        END IF;

        IF jsonb_typeof(v_conditions) <> 'object' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Conditions for "' || v_code || '" are malformed.');
        END IF;

        IF COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false)
           AND NOT (
               jsonb_typeof(v_conditions->'all') = 'array' AND jsonb_array_length(v_conditions->'all') > 0
               OR jsonb_typeof(v_conditions->'any') = 'array' AND jsonb_array_length(v_conditions->'any') > 0
               OR jsonb_exists(v_conditions, 'not')
           ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Add at least one condition before enabling auto-detection for "' || v_code || '".'
            );
        END IF;

        IF v_allows AND NOT COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Turn on auto-detect for "' || v_code || '" before allowing section overrides. There is no threshold to override otherwise.'
            );
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
            SELECT conditions INTO v_prev
            FROM public.special_grade_configs
            WHERE id = v_id AND deleted_at IS NULL;

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
                conditions = v_conditions,
                priority = COALESCE((v_config->>'priority')::SMALLINT, 100),
                is_auto_detected = COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                allows_section_override = v_allows,
                rule_version = CASE
                    WHEN v_prev IS DISTINCT FROM v_conditions THEN rule_version + 1
                    ELSE rule_version
                END,
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;

            UPDATE public.special_grade_section_overrides o
            SET deleted_at = now(),
                deleted_by = auth.uid()
            WHERE o.special_grade_config_id = v_id
              AND o.deleted_at IS NULL
              AND (
                  NOT v_allows
                  OR NOT EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(
                          COALESCE(v_conditions->'all', v_conditions->'any', '[]'::jsonb)
                      ) leaf
                      WHERE leaf->>'signal' = o.signal
                  )
              );
        ELSE
            INSERT INTO public.special_grade_configs (
                code, label, description, min_absence_percentage,
                requires_completion, completion_deadline_days,
                is_passing, is_active, conditions, priority,
                is_auto_detected, allows_section_override, rule_version, created_by
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
                v_conditions,
                COALESCE((v_config->>'priority')::SMALLINT, 100),
                COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                v_allows,
                1,
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully');
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.fn_apply_special_grade_overrides(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_section_special_grade_override_map(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_section_special_grade_overrides(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_section_special_grade_override(uuid, uuid, text, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_clear_section_special_grade_override(uuid, uuid, text) TO authenticated;

COMMIT;