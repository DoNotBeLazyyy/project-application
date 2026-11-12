-- Answer key changes keep student answers linked and re-score them
-- fn_upsert_question used to soft-delete every choice and insert new ones on each save, so
-- student_answers.choice_id pointed at deleted rows. Now:
--   * a choice sent with an "id" of this question is updated in place,
--   * a choice without a known id is inserted,
--   * only choices left out of the list are soft-deleted.
-- When the correct choice(s) or the points of an existing question change, the saved
-- auto-graded answers for that question get new is_correct / points_earned values, and every
-- affected Graded submission gets its raw_score and final_score summed again (manual points on
-- other questions stay as they are). Submitted (not yet graded) attempts only get the answer
-- update; the score is summed when the faculty grades them.
-- The reply has "rescored_submissions" so the page can say how many scores changed.
-- A future scheduled publish that no longer passes the publish checks is removed
-- (fn_clear_unready_schedule from 20261106010500).
-- Signature is unchanged, so grants stay in place.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_upsert_question(p_assessment_id uuid, p_question_id uuid, p_question_text text, p_question_type question_type, p_points numeric, p_sequence smallint, p_explanation text, p_is_required boolean, p_allowed_file_types text[], p_max_file_size_mb integer, p_max_file_count smallint, p_choices jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_question_id      UUID;
    v_choice           JSONB;
    v_choice_id        UUID;
    v_sequence         SMALLINT := 1;
    v_kept_ids         UUID[] := ARRAY[]::UUID[];
    v_is_existing      BOOLEAN := false;
    v_old_points       NUMERIC;
    v_old_correct      UUID[];
    v_new_correct      UUID[];
    v_is_objective     BOOLEAN;
    v_rescored         INTEGER := 0;
    v_message          TEXT := 'Question saved successfully.';
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    v_is_objective := p_question_type IN ('Multiple Choice', 'True or False', 'Matching');

    IF p_question_id IS NOT NULL THEN
        SELECT aq.points INTO v_old_points
        FROM public.assessment_questions aq
        WHERE aq.id = p_question_id
          AND aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL;

        v_is_existing := FOUND;

        SELECT COALESCE(array_agg(c.id ORDER BY c.id), ARRAY[]::UUID[]) INTO v_old_correct
        FROM public.assessment_question_choices c
        WHERE c.question_id = p_question_id
          AND c.is_correct
          AND c.deleted_at IS NULL;

        UPDATE public.assessment_questions
        SET
            question_text      = p_question_text,
            question_type      = p_question_type,
            points             = p_points,
            sequence           = p_sequence,
            explanation        = NULLIF(p_explanation, ''),
            is_required        = p_is_required,
            allowed_file_types = p_allowed_file_types,
            max_file_size_mb   = p_max_file_size_mb,
            max_file_count     = p_max_file_count
        WHERE id = p_question_id
        AND assessment_item_id = p_assessment_id
        AND deleted_at IS NULL;

        v_question_id := p_question_id;
    ELSE
        INSERT INTO public.assessment_questions (
            assessment_item_id,
            question_text,
            question_type,
            points,
            sequence,
            explanation,
            is_required,
            allowed_file_types,
            max_file_size_mb,
            max_file_count,
            created_by
        ) VALUES (
            p_assessment_id,
            p_question_text,
            p_question_type,
            p_points,
            p_sequence,
            NULLIF(p_explanation, ''),
            p_is_required,
            p_allowed_file_types,
            p_max_file_size_mb,
            p_max_file_count,
            auth.uid()
        )
        RETURNING id INTO v_question_id;
    END IF;

    IF p_choices IS NOT NULL AND v_is_objective THEN
        FOR v_choice IN SELECT * FROM jsonb_array_elements(p_choices)
        LOOP
            v_choice_id := NULL;

            -- Only reuse an id that already belongs to this question
            IF NULLIF(v_choice->>'id', '') IS NOT NULL THEN
                UPDATE public.assessment_question_choices
                SET
                    choice_text = trim(v_choice->>'choice_text'),
                    is_correct  = COALESCE((v_choice->>'is_correct')::BOOLEAN, false),
                    sequence    = v_sequence,
                    updated_at  = now(),
                    updated_by  = auth.uid()
                WHERE id = (v_choice->>'id')::UUID
                  AND question_id = v_question_id
                  AND deleted_at IS NULL
                RETURNING id INTO v_choice_id;
            END IF;

            IF v_choice_id IS NULL THEN
                INSERT INTO public.assessment_question_choices (
                    question_id,
                    choice_text,
                    is_correct,
                    sequence,
                    created_by
                ) VALUES (
                    v_question_id,
                    trim(v_choice->>'choice_text'),
                    COALESCE((v_choice->>'is_correct')::BOOLEAN, false),
                    v_sequence,
                    auth.uid()
                )
                RETURNING id INTO v_choice_id;
            END IF;

            v_kept_ids := v_kept_ids || v_choice_id;
            v_sequence := v_sequence + 1;
        END LOOP;

        -- Remove only the choices that were taken out
        UPDATE public.assessment_question_choices
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE question_id = v_question_id
          AND deleted_at IS NULL
          AND NOT (id = ANY(v_kept_ids));
    END IF;

    -- Re-score saved answers when the answer key or the points changed
    IF v_is_existing AND v_is_objective THEN
        SELECT COALESCE(array_agg(c.id ORDER BY c.id), ARRAY[]::UUID[]) INTO v_new_correct
        FROM public.assessment_question_choices c
        WHERE c.question_id = v_question_id
          AND c.is_correct
          AND c.deleted_at IS NULL;

        IF v_new_correct IS DISTINCT FROM v_old_correct OR p_points IS DISTINCT FROM v_old_points THEN
            WITH changed AS (
                UPDATE public.student_answers sa
                SET
                    is_correct    = s.is_correct,
                    points_earned = CASE WHEN s.is_correct THEN p_points ELSE 0 END,
                    updated_at    = now(),
                    updated_by    = auth.uid()
                FROM (
                    SELECT
                        sa2.id,
                        COALESCE(c.is_correct AND c.deleted_at IS NULL, false) AS is_correct
                    FROM public.student_answers sa2
                    INNER JOIN public.assessment_submissions asub
                        ON asub.id = sa2.submission_id
                        AND asub.deleted_at IS NULL
                        AND asub.status NOT IN ('Not Started', 'In Progress')
                    LEFT JOIN public.assessment_question_choices c ON c.id = sa2.choice_id
                    WHERE sa2.question_id = v_question_id
                      AND sa2.deleted_at IS NULL
                ) s
                WHERE sa.id = s.id
                  AND (
                      sa.is_correct IS DISTINCT FROM s.is_correct
                      OR sa.points_earned IS DISTINCT FROM CASE WHEN s.is_correct THEN p_points ELSE 0 END
                  )
                RETURNING sa.submission_id
            ),
            totals AS (
                SELECT sa.submission_id, COALESCE(SUM(sa.points_earned), 0) AS total
                FROM public.student_answers sa
                WHERE sa.submission_id IN (SELECT DISTINCT submission_id FROM changed)
                  AND sa.deleted_at IS NULL
                  AND sa.question_id <> v_question_id
                GROUP BY sa.submission_id
            ),
            new_scores AS (
                -- The changed answers are not visible to this statement yet, so add them here
                SELECT
                    ch.submission_id,
                    COALESCE(t.total, 0) + (
                        SELECT COALESCE(SUM(CASE WHEN COALESCE(c.is_correct AND c.deleted_at IS NULL, false) THEN p_points ELSE 0 END), 0)
                        FROM public.student_answers sa
                        LEFT JOIN public.assessment_question_choices c ON c.id = sa.choice_id
                        WHERE sa.submission_id = ch.submission_id
                          AND sa.question_id = v_question_id
                          AND sa.deleted_at IS NULL
                    ) AS total
                FROM (SELECT DISTINCT submission_id FROM changed) ch
                LEFT JOIN totals t ON t.submission_id = ch.submission_id
            ),
            graded AS (
                UPDATE public.assessment_submissions asub
                SET
                    raw_score   = ns.total,
                    final_score = ns.total,
                    updated_at  = now(),
                    updated_by  = auth.uid()
                FROM new_scores ns
                WHERE asub.id = ns.submission_id
                  AND asub.status = 'Graded'
                RETURNING asub.id
            )
            SELECT COUNT(*) INTO v_rescored FROM (SELECT DISTINCT submission_id FROM changed) x;

            IF v_rescored > 0 THEN
                v_message := format('Question saved. %s submitted attempt(s) were re-scored with the new answer key.', v_rescored);
            END IF;
        END IF;
    END IF;

    -- A future scheduled publish is removed when the questions no longer pass the publish checks
    IF public.fn_clear_unready_schedule(p_assessment_id) THEN
        v_message := v_message || ' The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_message,
        'id', v_question_id,
        'rescored_submissions', v_rescored
    );
END;
$function$;

COMMIT;