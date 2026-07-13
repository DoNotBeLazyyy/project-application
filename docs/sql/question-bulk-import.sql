CREATE OR REPLACE FUNCTION public.fn_bulk_import_questions(p_assessment_id uuid, p_questions jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id      UUID;
    v_row             JSONB;
    v_row_num         INTEGER := 0;
    v_success_count   INTEGER := 0;
    v_errors          JSONB := '[]'::JSONB;
    v_sequence        SMALLINT;
    v_text            TEXT;
    v_type            TEXT;
    v_points          NUMERIC(6,2);
    v_is_required     BOOLEAN;
    v_explanation     TEXT;
    v_choice_raw      TEXT;
    v_choices         TEXT[];
    v_choice          TEXT;
    v_choice_text     TEXT;
    v_is_correct      BOOLEAN;
    v_choice_seq      SMALLINT;
    v_correct_count   SMALLINT;
    v_question_id     UUID;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT section_id INTO v_section_id
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.', 'provisioned_count', 0, 'errors', '[]'::jsonb);
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can import questions.'
            USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(max(sequence), 0) INTO v_sequence
    FROM public.assessment_questions
    WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL;

    FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(p_questions, '[]'::jsonb))
    LOOP
        v_row_num := v_row_num + 1;
        v_text := btrim(COALESCE(v_row->>'question_text', ''));
        v_type := btrim(COALESCE(v_row->>'question_type', ''));

        IF v_text = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', '', 'message', 'Question text is required'));
            CONTINUE;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM unnest(enum_range(NULL::public.question_type)) AS t(label)
            WHERE t.label::text = v_type
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', left(v_text, 40),
                'message', 'Invalid question type: ' || COALESCE(NULLIF(v_type, ''), '(blank)')));
            CONTINUE;
        END IF;

        BEGIN
            v_points := COALESCE(NULLIF(btrim(COALESCE(v_row->>'points', '')), '')::numeric, 1);
        EXCEPTION WHEN OTHERS THEN
            v_points := NULL;
        END;

        IF v_points IS NULL OR v_points <= 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', left(v_text, 40), 'message', 'Points must be a number greater than 0'));
            CONTINUE;
        END IF;

        v_is_required := upper(btrim(COALESCE(v_row->>'is_required', 'TRUE'))) NOT IN ('FALSE', 'NO', '0', 'N');
        v_explanation := NULLIF(btrim(COALESCE(v_row->>'explanation', '')), '');
        v_choice_raw := btrim(COALESCE(v_row->>'choices', ''));
        v_choices := NULL;
        v_correct_count := 0;

        IF v_type IN ('Multiple Choice', 'True or False', 'Matching') THEN
            IF v_choice_raw = '' THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num, 'code', left(v_text, 40),
                    'message', 'Choices are required for ' || v_type || ' (separate with | and mark the correct one with *)'));
                CONTINUE;
            END IF;

            v_choices := string_to_array(v_choice_raw, '|');

            FOREACH v_choice IN ARRAY v_choices
            LOOP
                IF btrim(v_choice) LIKE '*%' OR btrim(v_choice) LIKE '%*' THEN
                    v_correct_count := v_correct_count + 1;
                END IF;
            END LOOP;

            IF v_correct_count = 0 THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num, 'code', left(v_text, 40),
                    'message', 'Mark the correct choice with * (e.g. Paris*|London|Rome)'));
                CONTINUE;
            END IF;
        END IF;

        v_sequence := v_sequence + 1;

        BEGIN
            INSERT INTO public.assessment_questions (
                assessment_item_id, question_text, question_type, points, sequence, explanation, is_required
            )
            VALUES (
                p_assessment_id, v_text, v_type::public.question_type, v_points, v_sequence, v_explanation, v_is_required
            )
            RETURNING id INTO v_question_id;

            IF v_choices IS NOT NULL THEN
                v_choice_seq := 0;

                FOREACH v_choice IN ARRAY v_choices
                LOOP
                    v_choice_text := btrim(v_choice);
                    v_is_correct := v_choice_text LIKE '*%' OR v_choice_text LIKE '%*';
                    v_choice_text := btrim(btrim(v_choice_text, '*'));

                    IF v_choice_text = '' THEN
                        CONTINUE;
                    END IF;

                    v_choice_seq := v_choice_seq + 1;

                    INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence)
                    VALUES (v_question_id, v_choice_text, v_is_correct, v_choice_seq);
                END LOOP;
            END IF;

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num, 'code', left(v_text, 40), 'message', SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_bulk_import_questions(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_bulk_import_questions(uuid, jsonb) TO authenticated;
