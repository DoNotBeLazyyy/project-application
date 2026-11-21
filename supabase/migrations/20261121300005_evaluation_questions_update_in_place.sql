-- ====================================================================
-- Migration: 20261121300005_evaluation_questions_update_in_place.sql
-- Audit 2026-11-21:
--   * #42 fn_update_evaluation_template soft-deleted every question and inserted new ones, so
--     the per-question breakdown and in-progress forms lost their answers. Questions sent with
--     their id are now updated in place; only questions left out are removed and only new
--     ones (no id) are inserted.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_update_evaluation_template(p_id uuid, p_title text, p_description text, p_is_active boolean, p_sequence smallint, p_program_ids uuid[], p_questions jsonb, p_target_mode text DEFAULT 'ALL'::text, p_suggestion_placeholder text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_error TEXT;
    v_mode TEXT;
    v_target_programs UUID[];
    v_question JSONB;
    v_question_id UUID;
    v_type public.evaluation_question_type;
    v_sequence SMALLINT := 1;
    v_kept_ids UUID[];
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND id <> p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'ALL'));
    IF v_mode NOT IN ('ALL', 'INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be ALL, INCLUDE, or EXCLUDE.');
    END IF;

    IF v_mode = 'ALL' THEN
        v_target_programs := NULL;
    ELSE
        v_target_programs := p_program_ids;
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    IF v_target_programs IS NOT NULL AND array_length(v_target_programs, 1) > 0 THEN
        v_error := public.fn_validate_evaluation_programs(v_target_programs);
        IF v_error IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'message', v_error);
        END IF;
    END IF;

    UPDATE public.evaluation_templates
    SET
        title                  = btrim(p_title),
        description            = NULLIF(btrim(COALESCE(p_description, '')), ''),
        is_active              = COALESCE(p_is_active, true),
        sequence               = GREATEST(COALESCE(p_sequence, 1), 1),
        target_mode            = v_mode,
        suggestion_placeholder = NULLIF(btrim(COALESCE(p_suggestion_placeholder, '')), ''),
        updated_by             = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    -- Questions sent with their id keep that id, so their answers stay attached (#42)
    v_kept_ids := ARRAY(
        SELECT q.id
        FROM public.evaluation_questions q
        WHERE q.template_id = p_id
          AND q.deleted_at IS NULL
          AND q.id IN (
              SELECT (e->>'id')::uuid
              FROM jsonb_array_elements(p_questions) e
              WHERE (e->>'id') ~ '^[0-9a-fA-F-]{36}$'
          )
    );

    -- Only questions left out of the list are removed
    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id
      AND deleted_at IS NULL
      AND NOT (id = ANY(v_kept_ids));

    -- Kept questions step aside so reordering never hits the (template, sequence) unique index
    UPDATE public.evaluation_questions
    SET sequence = -1000 - sequence
    WHERE id = ANY(v_kept_ids);

    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
        v_type := (v_question->>'question_type')::public.evaluation_question_type;
        v_question_id := NULL;
        IF (v_question->>'id') ~ '^[0-9a-fA-F-]{36}$'
           AND (v_question->>'id')::uuid = ANY(v_kept_ids) THEN
            v_question_id := (v_question->>'id')::uuid;
            -- The same id listed twice is kept once; the repeat becomes a new question
            v_kept_ids := array_remove(v_kept_ids, v_question_id);
        END IF;

        IF v_question_id IS NOT NULL THEN
            UPDATE public.evaluation_questions
            SET question_text = btrim(v_question->>'question_text'),
                question_type = v_type,
                sequence      = v_sequence,
                is_required   = COALESCE((v_question->>'is_required')::BOOLEAN, true),
                min_rating    = CASE WHEN v_type = 'Rating'
                                    THEN COALESCE((v_question->>'min_rating')::SMALLINT, 1)
                                    ELSE NULL
                                END,
                max_rating    = CASE WHEN v_type = 'Rating'
                                    THEN COALESCE((v_question->>'max_rating')::SMALLINT, 5)
                                    ELSE NULL
                                END,
                updated_at    = now(),
                updated_by    = auth.uid()
            WHERE id = v_question_id;
        ELSE
            INSERT INTO public.evaluation_questions (
                template_id, question_text, question_type, sequence, is_required, min_rating, max_rating, created_by
            )
            VALUES (
                p_id,
                btrim(v_question->>'question_text'),
                v_type,
                v_sequence,
                COALESCE((v_question->>'is_required')::BOOLEAN, true),
                CASE WHEN v_type = 'Rating'
                    THEN COALESCE((v_question->>'min_rating')::SMALLINT, 1)
                    ELSE NULL
                END,
                CASE WHEN v_type = 'Rating'
                    THEN COALESCE((v_question->>'max_rating')::SMALLINT, 5)
                    ELSE NULL
                END,
                auth.uid()
            );
        END IF;

        v_sequence := v_sequence + 1;
    END LOOP;

    PERFORM public.fn_set_evaluation_template_programs(p_id, v_target_programs);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section updated successfully.');
END;
$function$;

COMMIT;
