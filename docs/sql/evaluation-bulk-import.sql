CREATE OR REPLACE FUNCTION public.fn_bulk_create_evaluation_templates(p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_provisioned INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_group RECORD;
    v_first JSONB;
    v_questions JSONB;
    v_program_ids UUID[];
    v_missing_codes TEXT[];
    v_error TEXT;
    v_template_id UUID;
    v_sequence SMALLINT;
    v_next_sequence SMALLINT;
    v_is_active BOOLEAN;
BEGIN
    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
        RETURN jsonb_build_object('provisioned_count', 0, 'errors', '[]'::JSONB);
    END IF;

    SELECT COALESCE(MAX(sequence), 0) INTO v_next_sequence
    FROM public.evaluation_templates
    WHERE deleted_at IS NULL;

    FOR v_group IN
        WITH rows AS (
            SELECT r.value AS row, r.ordinality AS rn
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        )
        SELECT
            lower(btrim(row->>'section_title')) AS group_key,
            MIN(rn) AS first_rn
        FROM rows
        WHERE btrim(COALESCE(row->>'section_title', '')) <> ''
        GROUP BY lower(btrim(row->>'section_title'))
        ORDER BY MIN(rn)
    LOOP
        BEGIN
            SELECT r.value INTO v_first
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE r.ordinality = v_group.first_rn;

            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_text', btrim(COALESCE(r.value->>'question_text', '')),
                    'question_type', btrim(COALESCE(r.value->>'question_type', '')),
                    'is_required',   COALESCE(NULLIF(btrim(COALESCE(r.value->>'is_required', '')), '')::BOOLEAN, true),
                    'min_rating',    NULLIF(btrim(COALESCE(r.value->>'min_rating', '')), ''),
                    'max_rating',    NULLIF(btrim(COALESCE(r.value->>'max_rating', '')), '')
                )
                ORDER BY r.ordinality
            )
            INTO v_questions
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE lower(btrim(r.value->>'section_title')) = v_group.group_key
            AND btrim(COALESCE(r.value->>'question_text', '')) <> '';

            v_error := public.fn_validate_evaluation_questions(v_questions);
            IF v_error IS NOT NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', v_error
                ));
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.evaluation_templates
                WHERE lower(title) = v_group.group_key AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'A section named "' || btrim(v_first->>'section_title') || '" already exists.'
                ));
                CONTINUE;
            END IF;

            v_program_ids := NULL;
            v_missing_codes := NULL;

            IF NULLIF(btrim(COALESCE(v_first->>'program_codes', '')), '') IS NOT NULL THEN
                SELECT
                    array_agg(p.id),
                    array_agg(codes.code) FILTER (WHERE p.id IS NULL)
                INTO v_program_ids, v_missing_codes
                FROM (
                    SELECT DISTINCT btrim(c) AS code
                    FROM unnest(string_to_array(v_first->>'program_codes', '|')) AS c
                    WHERE btrim(c) <> ''
                ) codes
                LEFT JOIN public.programs p
                    ON p.code = codes.code AND p.deleted_at IS NULL;

                IF v_missing_codes IS NOT NULL AND array_length(v_missing_codes, 1) > 0 THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                        'row', v_group.first_rn,
                        'code', btrim(v_first->>'section_title'),
                        'message', 'Program code(s) not found: ' || array_to_string(v_missing_codes, ', ')
                    ));
                    CONTINUE;
                END IF;
            END IF;

            v_is_active := COALESCE(NULLIF(btrim(COALESCE(v_first->>'is_active', '')), '')::BOOLEAN, true);

            IF NULLIF(btrim(COALESCE(v_first->>'section_sequence', '')), '') IS NOT NULL THEN
                v_sequence := GREATEST((v_first->>'section_sequence')::SMALLINT, 1);
            ELSE
                v_next_sequence := v_next_sequence + 1;
                v_sequence := v_next_sequence;
            END IF;

            INSERT INTO public.evaluation_templates (title, description, is_active, sequence, created_by)
            VALUES (
                btrim(v_first->>'section_title'),
                NULLIF(btrim(COALESCE(v_first->>'section_description', '')), ''),
                v_is_active,
                v_sequence,
                auth.uid()
            )
            RETURNING id INTO v_template_id;

            PERFORM public.fn_insert_evaluation_questions(v_template_id, v_questions);
            PERFORM public.fn_set_evaluation_template_programs(v_template_id, v_program_ids);

            v_provisioned := v_provisioned + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_group.first_rn,
                'code', btrim(COALESCE(v_first->>'section_title', '')),
                'message', SQLERRM
            ));
        END;
    END LOOP;

    FOR v_first IN
        SELECT r.value
        FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        WHERE btrim(COALESCE(r.value->>'section_title', '')) = ''
    LOOP
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'row', 0,
            'code', 'MISSING_TITLE',
            'message', 'Row skipped: section title is required.'
        ));
    END LOOP;

    RETURN jsonb_build_object('provisioned_count', v_provisioned, 'errors', v_errors);
END;
$$;
