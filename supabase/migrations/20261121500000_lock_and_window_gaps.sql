-- ====================================================================
-- Migration: 20261121500000_lock_and_window_gaps.sql
-- Gaps found by the 2026-11-21 write-path test run (every planned scenario passed):
--   * Policy 7: once a period's grades are submitted, questions can't be added or removed
--     either (fn_delete_question, fn_bulk_import_questions, new questions in fn_upsert_question).
--   * Policy 8: fn_calculate_final_grade (one student) skipped the encoding window. The app
--     never calls it directly; only fn_calculate_all_grades_for_period does, and that checks
--     the window. Direct calls from app roles are now revoked.
--   * Removing a grading period in fn_save_academic_year_calendar also soft-deletes that
--     period's grading components.
-- Every function is the live definition with only these changes. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_delete_question(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_assessment_id   UUID;
    v_message         TEXT := 'Question deleted successfully.';
    v_is_live         BOOLEAN;
    v_total_points    NUMERIC;
    v_question_points NUMERIC;
    v_remaining       NUMERIC;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        INNER JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE aq.id = p_question_id
        AND s.faculty_id = auth.uid()
        AND aq.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question not found or access denied.');
    END IF;

    SELECT
        ai.id,
        ai.is_published OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()),
        ai.total_points,
        aq.points
    INTO v_assessment_id, v_is_live, v_total_points, v_question_points
    FROM public.assessment_questions aq
    INNER JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id
    WHERE aq.id = p_question_id;

    -- Policy 7 (gap found 2026-11-21): no removing questions once the period's grades were submitted
    IF public.fn_is_assessment_grading_locked(v_assessment_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so questions can no longer be added or removed. Ask the Registrar to return the grades to you first.');
    END IF;

    -- #27: a published assessment's questions must keep adding up to Total Points
    IF COALESCE(v_is_live, false) THEN
        SELECT COALESCE(SUM(aq.points), 0) INTO v_remaining
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = v_assessment_id
          AND aq.deleted_at IS NULL
          AND aq.id <> p_question_id;

        IF v_remaining IS DISTINCT FROM v_total_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format(
                    'This assessment is already published, so its questions must still add up to Total Points (%s pts). Deleting this question would leave %s pts. Unpublish the assessment first.',
                    trim_scale(v_total_points), trim_scale(v_remaining)
                )
            );
        END IF;
    END IF;

    UPDATE public.assessment_question_choices
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE question_id = p_question_id AND deleted_at IS NULL;

    UPDATE public.assessment_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_question_id AND deleted_at IS NULL;

    IF public.fn_clear_unready_schedule(v_assessment_id) THEN
        v_message := v_message || ' The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object('success', true, 'message', v_message);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_import_questions(p_assessment_id uuid, p_questions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_is_live         BOOLEAN;
    v_message         TEXT;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT section_id, is_published OR (scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= now())
    INTO v_section_id, v_is_live
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.', 'provisioned_count', 0, 'errors', '[]'::jsonb);
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can import questions.'
            USING ERRCODE = '42501';
    END IF;

    -- Policy 7 (gap found 2026-11-21): no adding questions once the period's grades were submitted
    IF public.fn_is_assessment_grading_locked(p_assessment_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so questions can no longer be added or removed. Ask the Registrar to return the grades to you first.', 'provisioned_count', 0, 'errors', '[]'::jsonb);
    END IF;

    -- #27: new questions would no longer add up to Total Points on a published assessment
    IF COALESCE(v_is_live, false) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This assessment is already published, so its questions must still add up to Total Points. Unpublish it first, then import the questions and update Total Points.',
            'provisioned_count', 0,
            'errors', '[]'::jsonb
        );
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

    -- Same as the single-question functions: a future schedule that no longer passes is removed
    IF v_success_count > 0 AND public.fn_clear_unready_schedule(p_assessment_id) THEN
        v_message := 'The scheduled publish time was removed because the questions no longer match Total Points. Set it again after fixing them.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'provisioned_count', v_success_count,
        'errors', v_errors
    ) || CASE WHEN v_message IS NOT NULL THEN jsonb_build_object('schedule_message', v_message) ELSE '{}'::jsonb END;
END;
$function$;

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
    v_old_type         TEXT;
    v_old_correct      UUID[];
    v_new_correct      UUID[];
    v_is_objective     BOOLEAN;
    v_rescored         INTEGER := 0;
    v_message          TEXT := 'Question saved successfully.';
    v_is_live          BOOLEAN;
    v_total_points     NUMERIC;
    v_use_rubric       BOOLEAN;
    v_other_points     NUMERIC;
    v_intended_correct UUID[];
    v_has_new_correct  BOOLEAN := false;
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

    SELECT
        ai.is_published OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()),
        ai.total_points,
        COALESCE(ai.use_rubric_scoring, false)
    INTO v_is_live, v_total_points, v_use_rubric
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id;

    IF p_question_id IS NOT NULL THEN
        SELECT aq.points, aq.question_type::text INTO v_old_points, v_old_type
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
    END IF;

    -- #27: a published assessment's questions must keep adding up to Total Points
    IF COALESCE(v_is_live, false) AND (NOT v_is_existing OR p_points IS DISTINCT FROM v_old_points) THEN
        SELECT COALESCE(SUM(aq.points), 0) INTO v_other_points
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
          AND (NOT v_is_existing OR aq.id <> p_question_id);

        IF (v_other_points + COALESCE(p_points, 0)) IS DISTINCT FROM v_total_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format(
                    'This assessment is already published, so its questions must still add up to Total Points (%s pts). This change would make them %s pts. Unpublish the assessment first to change points.',
                    trim_scale(v_total_points), trim_scale(v_other_points + COALESCE(p_points, 0))
                )
            );
        END IF;
    END IF;

    -- Policy 7 (gap found 2026-11-21): no new questions once the period's grades were submitted
    IF NOT COALESCE(v_is_existing, false) AND public.fn_is_assessment_grading_locked(p_assessment_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so questions can no longer be added or removed. Ask the Registrar to return the grades to you first.');
    END IF;

    -- Policy 7: no re-scoring once the period's grades were submitted
    IF v_is_existing AND public.fn_is_assessment_grading_locked(p_assessment_id) THEN
        IF v_is_objective AND p_choices IS NOT NULL THEN
            SELECT COALESCE(array_agg(c.id ORDER BY c.id), ARRAY[]::UUID[]) INTO v_intended_correct
            FROM jsonb_array_elements(p_choices) e
            INNER JOIN public.assessment_question_choices c
                ON c.id::text = e->>'id'
               AND c.question_id = p_question_id
               AND c.deleted_at IS NULL
            WHERE COALESCE((e->>'is_correct')::BOOLEAN, false);

            SELECT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(p_choices) e
                WHERE COALESCE((e->>'is_correct')::BOOLEAN, false)
                  AND NOT EXISTS (
                      SELECT 1 FROM public.assessment_question_choices c
                      WHERE c.id::text = e->>'id'
                        AND c.question_id = p_question_id
                        AND c.deleted_at IS NULL
                  )
            ) INTO v_has_new_correct;
        ELSE
            v_intended_correct := v_old_correct;
        END IF;

        IF p_points IS DISTINCT FROM v_old_points
           OR p_question_type::text IS DISTINCT FROM v_old_type
           OR v_has_new_correct
           OR v_intended_correct IS DISTINCT FROM v_old_correct THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grades for this grading period have already been submitted, so the points, type and answer key of this question can no longer be changed. Ask the Registrar to return the grades to you first.');
        END IF;
    END IF;

    IF v_is_existing THEN
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
    ELSIF p_question_id IS NOT NULL THEN
        -- Same as before: an id that is not one of this assessment's questions saves nothing
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

    -- Re-score saved answers when the answer key or the points changed. In-progress attempts
    -- are included, so their saved answers follow the new key when they are submitted.
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
                    LEFT JOIN public.assessment_question_choices c ON c.id = sa2.choice_id
                    WHERE sa2.question_id = v_question_id
                      AND sa2.deleted_at IS NULL
                      -- An in-progress answer with no choice picked stays unscored
                      AND (sa2.choice_id IS NOT NULL OR asub.status NOT IN ('Not Started', 'In Progress'))
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
                -- A rubric-scored submission keeps its rubric score
                UPDATE public.assessment_submissions asub
                SET
                    raw_score   = ns.total,
                    final_score = ns.total,
                    updated_at  = now(),
                    updated_by  = auth.uid()
                FROM new_scores ns
                WHERE asub.id = ns.submission_id
                  AND asub.status = 'Graded'
                  AND NOT v_use_rubric
                RETURNING asub.id
            )
            SELECT COUNT(*) INTO v_rescored FROM (SELECT DISTINCT submission_id FROM changed) x;

            IF v_rescored > 0 THEN
                v_message := format('Question saved. %s attempt(s) were re-scored with the new answer key.', v_rescored);
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

CREATE OR REPLACE FUNCTION public.fn_save_academic_year_calendar(p_school_year_id uuid, p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean, p_terms jsonb, p_transmutation_rows jsonb, p_thresholds jsonb DEFAULT '[]'::jsonb, p_max_units_per_term smallint DEFAULT 24, p_evaluation_scope text DEFAULT 'Period'::text, p_holidays jsonb DEFAULT '[]'::jsonb, p_revert_history_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_sy_id uuid;
    v_term_elem jsonb;
    v_term_id uuid;
    v_gp_elem jsonb;
    v_row_elem jsonb;
    v_thresh_elem jsonb;
    v_holiday_elem jsonb;
    v_incoming_term_ids uuid[] := '{}';
    v_incoming_gp_ids uuid[] := '{}';
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_clean_eval_scope text := COALESCE(NULLIF(btrim(p_evaluation_scope), ''), 'Period');
    v_units smallint := COALESCE(p_max_units_per_term, 24);
    v_current_user_id uuid := auth.uid();
    v_is_new boolean := (p_school_year_id IS NULL);
    v_action text;
    v_summary text;
    v_snapshot jsonb;
    v_conflicting_sy RECORD;
    v_full_terms jsonb;
    v_full_trans jsonb;
    v_full_thresh jsonb;
    v_full_holidays jsonb;
    v_active_history_id uuid;
    v_active_snapshot jsonb;
    v_has_real_change boolean := false;
    v_header_matches boolean := false;
    v_terms_match boolean := false;
    v_trans_match boolean := false;
    v_thresh_match boolean := false;
    v_holidays_match boolean := false;
    v_blocked_name text;
    v_term_gp_ids uuid[] := '{}';
    v_term_has_gp_ids boolean := false;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code is required.');
    END IF;

    IF v_clean_label IS NULL OR v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    IF v_units < 1 OR v_units > 60 THEN
        v_units := 24;
    END IF;

    IF v_clean_eval_scope NOT IN ('Period', 'Term') THEN
        v_clean_eval_scope := 'Period';
    END IF;

    -- 1. Check duplicate code
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code already exists: ' || v_clean_code);
    END IF;

    -- 2. Check duplicate label
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- 3. Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- 4. Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE (p_school_year_id IS NULL OR id <> p_school_year_id)
      AND deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    -- 5. Create or Update School Year Header
    IF v_is_new THEN
        IF COALESCE(p_is_active, false) THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND deleted_at IS NULL;
        END IF;

        INSERT INTO public.school_years (
            code,
            label,
            start_date,
            end_date,
            is_active,
            max_units_per_term,
            evaluation_scope
        ) VALUES (
            v_clean_code,
            v_clean_label,
            p_start_date,
            p_end_date,
            COALESCE(p_is_active, false),
            v_units,
            v_clean_eval_scope::public.evaluation_scope_type
        )
        RETURNING id INTO v_sy_id;
        
        v_action := 'CREATED';
    ELSE
        v_sy_id := p_school_year_id;

        IF COALESCE(p_is_active, false) THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND id <> v_sy_id AND deleted_at IS NULL;
        END IF;

        UPDATE public.school_years
        SET code = v_clean_code,
            label = v_clean_label,
            start_date = p_start_date,
            end_date = p_end_date,
            is_active = COALESCE(p_is_active, false),
            max_units_per_term = v_units,
            evaluation_scope = v_clean_eval_scope::public.evaluation_scope_type,
            updated_at = now(),
            updated_by = v_current_user_id
        WHERE id = v_sy_id;

        v_action := 'UPDATED';
    END IF;

    -- 6. Synchronize Terms
    IF p_terms IS NOT NULL AND jsonb_array_length(p_terms) > 0 THEN
        FOR v_term_elem IN SELECT * FROM jsonb_array_elements(p_terms) LOOP
            v_term_id := NULL;
            IF v_term_elem ? 'id' AND (v_term_elem->>'id') IS NOT NULL AND (v_term_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                v_term_id := (v_term_elem->>'id')::uuid;
            END IF;

            IF v_term_id IS NULL AND (v_term_elem ? 'term_type_id') AND (v_term_elem->>'term_type_id') IS NOT NULL AND (v_term_elem->>'term_type_id') ~ '^[0-9a-fA-F-]{36}$' THEN
                SELECT id INTO v_term_id
                FROM public.terms
                WHERE school_year_id = v_sy_id
                  AND term_type_id = (v_term_elem->>'term_type_id')::uuid
                LIMIT 1;
            END IF;

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id AND school_year_id = v_sy_id) THEN
                UPDATE public.terms
                SET term_type_id = (v_term_elem->>'term_type_id')::uuid,
                    start_date = (v_term_elem->>'start_date')::date,
                    end_date = (v_term_elem->>'end_date')::date,
                    enrollment_start_date = NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    enrollment_end_date = NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    grading_deadline = NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    status = COALESCE(v_term_elem->>'status', 'Upcoming'),
                    evaluation_scope = CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = now(),
                    updated_by = v_current_user_id
                WHERE id = v_term_id;
            ELSE
                INSERT INTO public.terms (
                    school_year_id,
                    term_type_id,
                    start_date,
                    end_date,
                    enrollment_start_date,
                    enrollment_end_date,
                    grading_deadline,
                    status,
                    evaluation_scope
                ) VALUES (
                    v_sy_id,
                    (v_term_elem->>'term_type_id')::uuid,
                    (v_term_elem->>'start_date')::date,
                    (v_term_elem->>'end_date')::date,
                    NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    COALESCE(v_term_elem->>'status', 'Upcoming'),
                    CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END
                )
                RETURNING id INTO v_term_id;
            END IF;

            v_incoming_term_ids := array_append(v_incoming_term_ids, v_term_id);

            -- Ids of this term's existing periods that the payload keeps (#36)
            v_term_gp_ids := ARRAY(
                SELECT (gp->>'id')::uuid
                FROM jsonb_array_elements(COALESCE(v_term_elem->'grading_periods', '[]'::jsonb)) gp
                WHERE (gp->>'id') ~ '^[0-9a-fA-F-]{36}$'
            );
            v_term_has_gp_ids := COALESCE(array_length(v_term_gp_ids, 1), 0) > 0;

            IF v_term_has_gp_ids THEN
                -- A removed grading period that already holds grades or assessments must stay.
                SELECT gp.name INTO v_blocked_name
                FROM public.grading_periods gp
                WHERE gp.term_id = v_term_id
                  AND gp.deleted_at IS NULL
                  AND NOT (gp.id = ANY(v_term_gp_ids))
                  AND (
                      EXISTS (
                          SELECT 1 FROM public.section_final_grades sfg
                          WHERE sfg.grading_period_id = gp.id AND sfg.deleted_at IS NULL
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM public.grading_components gc
                          INNER JOIN public.assessment_items ai ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
                          WHERE gc.grading_period_id = gp.id AND gc.deleted_at IS NULL
                      )
                  )
                LIMIT 1;

                IF v_blocked_name IS NOT NULL THEN
                    RAISE EXCEPTION 'Cannot remove the grading period "%": it already has grades or assessments. Keep it, or remove those records first.', v_blocked_name
                        USING ERRCODE = 'P0001';
                END IF;

                -- Remove first, so a kept period can take over the removed one's sequence or name
                UPDATE public.grading_periods
                SET deleted_at = now(),
                    deleted_by = v_current_user_id
                WHERE term_id = v_term_id
                  AND deleted_at IS NULL
                  AND NOT (id = ANY(v_term_gp_ids));

                -- Their per-section grading components go with them (minor gap found 2026-11-21)
                UPDATE public.grading_components gc
                SET deleted_at = now(),
                    deleted_by = v_current_user_id
                FROM public.grading_periods gp
                WHERE gc.grading_period_id = gp.id
                  AND gp.term_id = v_term_id
                  AND gp.deleted_at IS NOT NULL
                  AND gc.deleted_at IS NULL;

                -- Kept periods that are renumbered or renamed step aside, so swapping two
                -- periods never hits the (term, sequence) or (term, name) unique index
                UPDATE public.grading_periods gp
                SET sequence = -1000 - gp.sequence,
                    name = '~' || gp.id::text
                FROM jsonb_array_elements(v_term_elem->'grading_periods') inc
                WHERE gp.term_id = v_term_id
                  AND gp.deleted_at IS NULL
                  AND (inc->>'id') ~ '^[0-9a-fA-F-]{36}$'
                  AND gp.id = (inc->>'id')::uuid
                  AND (
                      gp.sequence IS DISTINCT FROM COALESCE((inc->>'sequence')::smallint, 1)
                      OR gp.name IS DISTINCT FROM btrim(inc->>'name')
                  );
            END IF;

            -- Synchronize Grading Periods for this term
            IF v_term_elem ? 'grading_periods' AND jsonb_array_length(v_term_elem->'grading_periods') > 0 THEN
                FOR v_gp_elem IN SELECT * FROM jsonb_array_elements(v_term_elem->'grading_periods') LOOP
                    DECLARE
                        v_gp_id uuid := NULL;
                    BEGIN
                        IF v_gp_elem ? 'id' AND (v_gp_elem->>'id') IS NOT NULL AND (v_gp_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                            v_gp_id := (v_gp_elem->>'id')::uuid;
                        END IF;

                        -- Only older payloads without any period ids are matched by sequence/name;
                        -- otherwise a period without an id is new and must not take over another's grades
                        IF v_gp_id IS NULL AND NOT v_term_has_gp_ids THEN
                            SELECT id INTO v_gp_id
                            FROM public.grading_periods
                            WHERE term_id = v_term_id
                              AND deleted_at IS NULL
                              AND (
                                  (sequence = COALESCE((v_gp_elem->>'sequence')::smallint, 1))
                                  OR (lower(name) = lower(btrim(v_gp_elem->>'name')))
                              )
                            LIMIT 1;
                        END IF;

                        IF v_gp_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.grading_periods WHERE id = v_gp_id AND term_id = v_term_id) THEN
                            UPDATE public.grading_periods
                            SET name = btrim(v_gp_elem->>'name'),
                                sequence = COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                start_date = NULLIF(v_gp_elem->>'start_date', '')::date,
                                end_date = NULLIF(v_gp_elem->>'end_date', '')::date,
                                weight = COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25),
                                major_exam_start_date = NULLIF(v_gp_elem->>'major_exam_start_date', '')::date,
                                major_exam_end_date = NULLIF(v_gp_elem->>'major_exam_end_date', '')::date,
                                grade_encoding_start_date = NULLIF(v_gp_elem->>'grade_encoding_start_date', '')::date,
                                grade_encoding_end_date = NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date,
                                components = COALESCE(v_gp_elem->'components', '[]'::jsonb),
                                deleted_at = NULL,
                                deleted_by = NULL,
                                updated_at = now(),
                                updated_by = v_current_user_id
                            WHERE id = v_gp_id;
                        ELSE
                            INSERT INTO public.grading_periods (
                                term_id,
                                name,
                                sequence,
                                start_date,
                                end_date,
                                weight,
                                major_exam_start_date,
                                major_exam_end_date,
                                grade_encoding_start_date,
                                grade_encoding_end_date,
                                components
                            ) VALUES (
                                v_term_id,
                                btrim(v_gp_elem->>'name'),
                                COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                NULLIF(v_gp_elem->>'start_date', '')::date,
                                NULLIF(v_gp_elem->>'end_date', '')::date,
                                COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25),
                                NULLIF(v_gp_elem->>'major_exam_start_date', '')::date,
                                NULLIF(v_gp_elem->>'major_exam_end_date', '')::date,
                                NULLIF(v_gp_elem->>'grade_encoding_start_date', '')::date,
                                NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date,
                                COALESCE(v_gp_elem->'components', '[]'::jsonb)
                            )
                            RETURNING id INTO v_gp_id;
                        END IF;

                        v_incoming_gp_ids := array_append(v_incoming_gp_ids, v_gp_id);
                    END;
                END LOOP;
            END IF;

            -- A removed grading period that already holds grades or assessments must stay.
            -- RAISE undoes everything this call wrote, so nothing is half saved.
            SELECT gp.name INTO v_blocked_name
            FROM public.grading_periods gp
            WHERE gp.term_id = v_term_id
              AND gp.deleted_at IS NULL
              AND NOT (gp.id = ANY(v_incoming_gp_ids))
              AND (
                  EXISTS (
                      SELECT 1 FROM public.section_final_grades sfg
                      WHERE sfg.grading_period_id = gp.id AND sfg.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.grading_components gc
                      INNER JOIN public.assessment_items ai ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
                      WHERE gc.grading_period_id = gp.id AND gc.deleted_at IS NULL
                  )
              )
            LIMIT 1;

            IF v_blocked_name IS NOT NULL THEN
                RAISE EXCEPTION 'Cannot remove the grading period "%": it already has grades or assessments. Keep it, or remove those records first.', v_blocked_name
                    USING ERRCODE = 'P0001';
            END IF;

            -- Soft delete removed grading periods for this term
            UPDATE public.grading_periods
            SET deleted_at = now(),
                deleted_by = v_current_user_id
            WHERE term_id = v_term_id
              AND deleted_at IS NULL
              AND NOT (id = ANY(v_incoming_gp_ids));

            -- Their per-section grading components go with them (minor gap found 2026-11-21)
            UPDATE public.grading_components gc
            SET deleted_at = now(),
                deleted_by = v_current_user_id
            FROM public.grading_periods gp
            WHERE gc.grading_period_id = gp.id
              AND gp.term_id = v_term_id
              AND gp.deleted_at IS NOT NULL
              AND gc.deleted_at IS NULL;
        END LOOP;
    END IF;

    -- A removed term that already has sections must stay; RAISE undoes this whole save
    SELECT COALESCE(tt.label, 'term') INTO v_blocked_name
    FROM public.terms t
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = v_sy_id
      AND t.deleted_at IS NULL
      AND NOT (t.id = ANY(v_incoming_term_ids))
      AND EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.term_id = t.id AND s.deleted_at IS NULL
      )
    LIMIT 1;

    IF v_blocked_name IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot remove the term "%": it already has sections. Keep it, or remove its sections first.', v_blocked_name
            USING ERRCODE = 'P0001';
    END IF;

    -- Soft delete removed terms for this school year
    UPDATE public.terms
    SET deleted_at = now(),
        deleted_by = v_current_user_id
    WHERE school_year_id = v_sy_id
      AND deleted_at IS NULL
      AND NOT (id = ANY(v_incoming_term_ids));

    -- 7. Synchronize Transmutation Table Rows
    IF p_transmutation_rows IS NOT NULL AND jsonb_array_length(p_transmutation_rows) > 0 THEN
        DELETE FROM public.grade_transmutation_tables
        WHERE school_year_id = v_sy_id;

        FOR v_row_elem IN SELECT * FROM jsonb_array_elements(p_transmutation_rows) LOOP
            INSERT INTO public.grade_transmutation_tables (
                school_year_id,
                label,
                min_percentage,
                max_percentage,
                transmuted_grade,
                is_passing,
                special_code,
                description,
                is_auto_detected,
                conditions
            ) VALUES (
                v_sy_id,
                btrim(v_row_elem->>'label'),
                NULLIF(v_row_elem->>'min_percentage', '')::numeric,
                NULLIF(v_row_elem->>'max_percentage', '')::numeric,
                NULLIF(v_row_elem->>'transmuted_grade', '')::numeric,
                COALESCE((v_row_elem->>'is_passing')::boolean, true),
                NULLIF(btrim(v_row_elem->>'special_code'), ''),
                NULLIF(btrim(v_row_elem->>'description'), ''),
                NULLIF(btrim(v_row_elem->>'special_code'), '') IS NOT NULL
                    AND COALESCE((v_row_elem->>'is_auto_detected')::boolean, false),
                CASE WHEN jsonb_typeof(v_row_elem->'conditions') = 'object'
                          AND NULLIF(btrim(v_row_elem->>'special_code'), '') IS NOT NULL
                     THEN v_row_elem->'conditions' END
            );
        END LOOP;
    END IF;

    -- Special-grade rows drive the detection engine for this academic year
    PERFORM public.fn_sync_special_grade_configs(v_sy_id);

    -- 8. Synchronize Academic Thresholds (an empty list removes them all, #37)
    IF p_thresholds IS NOT NULL AND jsonb_typeof(p_thresholds) = 'array' THEN
        DELETE FROM public.academic_thresholds
        WHERE school_year_id = v_sy_id;

        FOR v_thresh_elem IN SELECT * FROM jsonb_array_elements(p_thresholds) LOOP
            INSERT INTO public.academic_thresholds (
                school_year_id,
                category,
                code,
                label,
                min_gwa,
                max_gwa,
                min_subject_grade,
                requires_no_failing,
                scholarship_discount_pct,
                sort_order,
                is_active
            ) VALUES (
                v_sy_id,
                CASE 
                    WHEN (v_thresh_elem->>'category') IN ('Latin Honors', 'Scholarship', 'Standing', 'Honor', 'Custom')
                    THEN (v_thresh_elem->>'category')::public.academic_threshold_category_type
                    ELSE 'Honor'::public.academic_threshold_category_type
                END,
                btrim(v_thresh_elem->>'code'),
                btrim(v_thresh_elem->>'label'),
                NULLIF(v_thresh_elem->>'min_gwa', '')::numeric,
                (v_thresh_elem->>'max_gwa')::numeric,
                NULLIF(v_thresh_elem->>'min_subject_grade', '')::numeric,
                COALESCE((v_thresh_elem->>'requires_no_failing')::boolean, false),
                NULLIF(v_thresh_elem->>'scholarship_discount_pct', '')::numeric,
                COALESCE((v_thresh_elem->>'sort_order')::smallint, 1),
                COALESCE((v_thresh_elem->>'is_active')::boolean, true)
            );
        END LOOP;
    END IF;

    -- 9. Synchronize Calendar Exceptions & Holidays
    IF p_holidays IS NOT NULL THEN
        DELETE FROM public.school_year_calendar_exceptions
        WHERE school_year_id = v_sy_id;

        FOR v_holiday_elem IN SELECT * FROM jsonb_array_elements(p_holidays) LOOP
            INSERT INTO public.school_year_calendar_exceptions (
                school_year_id,
                title,
                exception_type,
                start_date,
                end_date,
                affects_attendance,
                description
            ) VALUES (
                v_sy_id,
                btrim(v_holiday_elem->>'title'),
                CASE 
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Break' THEN 'Break'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Suspension' THEN 'Suspension'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) IN ('Exam', 'Exam Day') THEN 'Exam'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) IN ('Event', 'Special Class') THEN 'Event'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Other' THEN 'Other'::public.calendar_exception_type
                    ELSE 'Holiday'::public.calendar_exception_type
                END,
                COALESCE(NULLIF(v_holiday_elem->>'start_date', '')::date, p_start_date),
                COALESCE(NULLIF(v_holiday_elem->>'end_date', '')::date, NULLIF(v_holiday_elem->>'start_date', '')::date, p_start_date),
                COALESCE((v_holiday_elem->>'affects_attendance')::boolean, true),
                NULLIF(btrim(v_holiday_elem->>'description'), '')
            );
        END LOOP;
    END IF;

    -- Query full synchronized terms with grading periods
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'term_type_id', t.term_type_id,
            'term_type_label', tt.label,
            'term_type_code', tt.code,
            'start_date', t.start_date,
            'end_date', t.end_date,
            'enrollment_start_date', t.enrollment_start_date,
            'enrollment_end_date', t.enrollment_end_date,
            'grading_deadline', t.grading_deadline,
            'status', t.status,
            'evaluation_scope', t.evaluation_scope,
            'grading_periods', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', gp.id,
                        'name', gp.name,
                        'sequence', gp.sequence,
                        'start_date', gp.start_date,
                        'end_date', gp.end_date,
                        'weight', gp.weight,
                        'major_exam_start_date', gp.major_exam_start_date,
                        'major_exam_end_date', gp.major_exam_end_date,
                        'grade_encoding_start_date', gp.grade_encoding_start_date,
                        'grade_encoding_end_date', gp.grade_encoding_end_date,
                        'components', COALESCE(gp.components, '[]'::jsonb)
                    ) ORDER BY gp.sequence ASC
                ), '[]'::jsonb)
                FROM public.grading_periods gp
                WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
            )
        ) ORDER BY t.start_date ASC
    ), '[]'::jsonb)
    INTO v_full_terms
    FROM public.terms t
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = v_sy_id AND t.deleted_at IS NULL;

    -- Query full transmutation rows
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', g.id,
            'label', g.label,
            'min_percentage', g.min_percentage,
            'max_percentage', g.max_percentage,
            'transmuted_grade', g.transmuted_grade,
            'is_passing', g.is_passing,
            'special_code', g.special_code,
            'description', g.description,
            'is_auto_detected', g.is_auto_detected,
            'conditions', g.conditions
        ) ORDER BY g.min_percentage DESC NULLS LAST
    ), '[]'::jsonb)
    INTO v_full_trans
    FROM public.grade_transmutation_tables g
    WHERE g.school_year_id = v_sy_id;

    -- Query full thresholds
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'category', a.category,
            'code', a.code,
            'label', a.label,
            'min_gwa', a.min_gwa,
            'max_gwa', a.max_gwa,
            'min_subject_grade', a.min_subject_grade,
            'requires_no_failing', a.requires_no_failing,
            'scholarship_discount_pct', a.scholarship_discount_pct,
            'sort_order', a.sort_order,
            'is_active', a.is_active
        ) ORDER BY a.sort_order ASC
    ), '[]'::jsonb)
    INTO v_full_thresh
    FROM public.academic_thresholds a
    WHERE a.school_year_id = v_sy_id;

    -- Query full holidays
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'exception_type', e.exception_type,
            'start_date', e.start_date,
            'end_date', e.end_date,
            'affects_attendance', e.affects_attendance,
            'description', e.description
        ) ORDER BY e.start_date ASC
    ), '[]'::jsonb)
    INTO v_full_holidays
    FROM public.school_year_calendar_exceptions e
    WHERE e.school_year_id = v_sy_id;

    -- Snapshot of the synchronized configuration
    v_snapshot := jsonb_build_object(
        'id', v_sy_id,
        'code', v_clean_code,
        'label', v_clean_label,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'is_active', COALESCE(p_is_active, false),
        'max_units_per_term', v_units,
        'evaluation_scope', v_clean_eval_scope,
        'terms_count', jsonb_array_length(v_full_terms),
        'transmutation_rows_count', jsonb_array_length(v_full_trans),
        'thresholds_count', jsonb_array_length(v_full_thresh),
        'holidays_count', jsonb_array_length(v_full_holidays),
        'terms', v_full_terms,
        'transmutation_rows', v_full_trans,
        'thresholds', v_full_thresh,
        'holidays', v_full_holidays
    );

    -- 10. Handle Version History:
    -- A. When reverting back to an existing history version (p_revert_history_id IS NOT NULL),
    --    do NOT add a new version row. Mark the chosen reverted version as active.
    IF p_revert_history_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.school_year_histories
        WHERE id = p_revert_history_id
          AND school_year_id = v_sy_id
          AND deleted_at IS NULL
    ) THEN
        UPDATE public.school_year_histories
        SET is_active_version = (id = p_revert_history_id)
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Academic year calendar reverted successfully.',
            'school_year_id', v_sy_id,
            'has_real_change', false
        );

    -- B. When creating a new school year, always create version 1
    ELSIF v_is_new THEN
        v_summary := 'Created new academic year "' || v_clean_label || '" with ' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, and ' || jsonb_array_length(v_full_holidays) || ' holidays.';

        INSERT INTO public.school_year_histories (
            school_year_id,
            action,
            changed_by,
            change_summary,
            snapshot,
            is_active_version
        ) VALUES (
            v_sy_id,
            v_action,
            v_current_user_id,
            v_summary,
            v_snapshot,
            true
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Academic year calendar saved successfully.',
            'school_year_id', v_sy_id,
            'has_real_change', true
        );

    -- C. When saving an existing school year: ONLY add a new version when a real change occurs!
    ELSE
        -- Fetch active snapshot
        SELECT id, snapshot INTO v_active_history_id, v_active_snapshot
        FROM public.school_year_histories
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL
          AND is_active_version = true
        ORDER BY changed_at DESC
        LIMIT 1;

        IF v_active_history_id IS NULL THEN
            SELECT id, snapshot INTO v_active_history_id, v_active_snapshot
            FROM public.school_year_histories
            WHERE school_year_id = v_sy_id
              AND deleted_at IS NULL
            ORDER BY changed_at DESC
            LIMIT 1;
        END IF;

        IF v_active_snapshot IS NULL THEN
            v_has_real_change := true;
        ELSE
            -- 1. Compare header fields
            v_header_matches := (
                lower(btrim(COALESCE(v_active_snapshot->>'code', ''))) = lower(v_clean_code)
                AND btrim(COALESCE(v_active_snapshot->>'label', '')) = v_clean_label
                AND COALESCE(v_active_snapshot->>'start_date', '') = p_start_date::text
                AND COALESCE(v_active_snapshot->>'end_date', '') = p_end_date::text
                AND COALESCE((v_active_snapshot->>'is_active')::boolean, false) = COALESCE(p_is_active, false)
                AND COALESCE((v_active_snapshot->>'max_units_per_term')::smallint, 24::smallint) = v_units
                AND COALESCE(v_active_snapshot->>'evaluation_scope', 'Period') = v_clean_eval_scope
            );

            -- 2. Compare terms normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'term_type_label', lower(btrim(COALESCE(t->>'term_type_label', ''))),
                            'start_date', t->>'start_date',
                            'end_date', t->>'end_date',
                            'enrollment_start_date', COALESCE(t->>'enrollment_start_date', ''),
                            'enrollment_end_date', COALESCE(t->>'enrollment_end_date', ''),
                            'grading_deadline', COALESCE(t->>'grading_deadline', ''),
                            'status', COALESCE(t->>'status', 'Upcoming'),
                            'evaluation_scope', COALESCE(t->>'evaluation_scope', 'Period'),
                            'grading_periods', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', lower(btrim(COALESCE(gp->>'name', ''))),
                                        'sequence', COALESCE((gp->>'sequence')::int, 1),
                                        'start_date', COALESCE(gp->>'start_date', ''),
                                        'end_date', COALESCE(gp->>'end_date', ''),
                                        'weight', COALESCE((gp->>'weight')::numeric, 0),
                                        'major_exam_start_date', COALESCE(gp->>'major_exam_start_date', ''),
                                        'major_exam_end_date', COALESCE(gp->>'major_exam_end_date', ''),
                                        'grade_encoding_start_date', COALESCE(gp->>'grade_encoding_start_date', ''),
                                        'grade_encoding_end_date', COALESCE(gp->>'grade_encoding_end_date', ''),
                                        'components', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'name', lower(btrim(COALESCE(c->>'name', ''))),
                                                    'weight', COALESCE((c->>'weight')::numeric, 0)
                                                ) ORDER BY lower(btrim(COALESCE(c->>'name', '')))
                                            ), '[]'::jsonb)
                                            FROM jsonb_array_elements(COALESCE(gp->'components', '[]'::jsonb)) c
                                        )
                                    ) ORDER BY COALESCE((gp->>'sequence')::int, 1)
                                ), '[]'::jsonb)
                                FROM jsonb_array_elements(COALESCE(t->'grading_periods', '[]'::jsonb)) gp
                            )
                        ) ORDER BY t->>'start_date'
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'terms', '[]'::jsonb)) t
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'term_type_label', lower(btrim(COALESCE(t->>'term_type_label', ''))),
                            'start_date', t->>'start_date',
                            'end_date', t->>'end_date',
                            'enrollment_start_date', COALESCE(t->>'enrollment_start_date', ''),
                            'enrollment_end_date', COALESCE(t->>'enrollment_end_date', ''),
                            'grading_deadline', COALESCE(t->>'grading_deadline', ''),
                            'status', COALESCE(t->>'status', 'Upcoming'),
                            'evaluation_scope', COALESCE(t->>'evaluation_scope', 'Period'),
                            'grading_periods', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', lower(btrim(COALESCE(gp->>'name', ''))),
                                        'sequence', COALESCE((gp->>'sequence')::int, 1),
                                        'start_date', COALESCE(gp->>'start_date', ''),
                                        'end_date', COALESCE(gp->>'end_date', ''),
                                        'weight', COALESCE((gp->>'weight')::numeric, 0),
                                        'major_exam_start_date', COALESCE(gp->>'major_exam_start_date', ''),
                                        'major_exam_end_date', COALESCE(gp->>'major_exam_end_date', ''),
                                        'grade_encoding_start_date', COALESCE(gp->>'grade_encoding_start_date', ''),
                                        'grade_encoding_end_date', COALESCE(gp->>'grade_encoding_end_date', ''),
                                        'components', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'name', lower(btrim(COALESCE(c->>'name', ''))),
                                                    'weight', COALESCE((c->>'weight')::numeric, 0)
                                                ) ORDER BY lower(btrim(COALESCE(c->>'name', '')))
                                            ), '[]'::jsonb)
                                            FROM jsonb_array_elements(COALESCE(gp->'components', '[]'::jsonb)) c
                                        )
                                    ) ORDER BY COALESCE((gp->>'sequence')::int, 1)
                                ), '[]'::jsonb)
                                FROM jsonb_array_elements(COALESCE(t->'grading_periods', '[]'::jsonb)) gp
                            )
                        ) ORDER BY t->>'start_date'
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'terms', '[]'::jsonb)) t
                )
            ) INTO v_terms_match;

            -- 3. Compare transmutation normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'label', lower(btrim(COALESCE(r->>'label', ''))),
                            'min_percentage', COALESCE((r->>'min_percentage')::numeric, 0),
                            'max_percentage', COALESCE((r->>'max_percentage')::numeric, 0),
                            'transmuted_grade', (r->>'transmuted_grade')::numeric,
                            'is_passing', COALESCE((r->>'is_passing')::boolean, true),
                            'special_code', lower(btrim(COALESCE(r->>'special_code', ''))),
                            'description', btrim(COALESCE(r->>'description', '')),
                            'is_auto_detected', COALESCE((r->>'is_auto_detected')::boolean, false),
                            'conditions', CASE WHEN COALESCE((r->>'is_auto_detected')::boolean, false) THEN r->'conditions' END
                        ) ORDER BY COALESCE((r->>'min_percentage')::numeric, 0) DESC, lower(btrim(COALESCE(r->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'transmutation_rows', '[]'::jsonb)) r
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'label', lower(btrim(COALESCE(r->>'label', ''))),
                            'min_percentage', COALESCE((r->>'min_percentage')::numeric, 0),
                            'max_percentage', COALESCE((r->>'max_percentage')::numeric, 0),
                            'transmuted_grade', (r->>'transmuted_grade')::numeric,
                            'is_passing', COALESCE((r->>'is_passing')::boolean, true),
                            'special_code', lower(btrim(COALESCE(r->>'special_code', ''))),
                            'description', btrim(COALESCE(r->>'description', '')),
                            'is_auto_detected', COALESCE((r->>'is_auto_detected')::boolean, false),
                            'conditions', CASE WHEN COALESCE((r->>'is_auto_detected')::boolean, false) THEN r->'conditions' END
                        ) ORDER BY COALESCE((r->>'min_percentage')::numeric, 0) DESC, lower(btrim(COALESCE(r->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'transmutation_rows', '[]'::jsonb)) r
                )
            ) INTO v_trans_match;

            -- 4. Compare thresholds normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'category', COALESCE(th->>'category', 'Honor'),
                            'code', lower(btrim(COALESCE(th->>'code', ''))),
                            'label', lower(btrim(COALESCE(th->>'label', ''))),
                            'min_gwa', (th->>'min_gwa')::numeric,
                            'max_gwa', (th->>'max_gwa')::numeric,
                            'min_subject_grade', (th->>'min_subject_grade')::numeric,
                            'requires_no_failing', COALESCE((th->>'requires_no_failing')::boolean, false),
                            'scholarship_discount_pct', (th->>'scholarship_discount_pct')::numeric,
                            'sort_order', COALESCE((th->>'sort_order')::int, 1),
                            'is_active', COALESCE((th->>'is_active')::boolean, true)
                        ) ORDER BY COALESCE((th->>'sort_order')::int, 1), lower(btrim(COALESCE(th->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'thresholds', '[]'::jsonb)) th
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'category', COALESCE(th->>'category', 'Honor'),
                            'code', lower(btrim(COALESCE(th->>'code', ''))),
                            'label', lower(btrim(COALESCE(th->>'label', ''))),
                            'min_gwa', (th->>'min_gwa')::numeric,
                            'max_gwa', (th->>'max_gwa')::numeric,
                            'min_subject_grade', (th->>'min_subject_grade')::numeric,
                            'requires_no_failing', COALESCE((th->>'requires_no_failing')::boolean, false),
                            'scholarship_discount_pct', (th->>'scholarship_discount_pct')::numeric,
                            'sort_order', COALESCE((th->>'sort_order')::int, 1),
                            'is_active', COALESCE((th->>'is_active')::boolean, true)
                        ) ORDER BY COALESCE((th->>'sort_order')::int, 1), lower(btrim(COALESCE(th->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'thresholds', '[]'::jsonb)) th
                )
            ) INTO v_thresh_match;

            -- 5. Compare holidays normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', lower(btrim(COALESCE(h->>'title', ''))),
                            'exception_type', COALESCE(h->>'exception_type', 'Holiday'),
                            'start_date', h->>'start_date',
                            'end_date', h->>'end_date',
                            'affects_attendance', COALESCE((h->>'affects_attendance')::boolean, true),
                            'description', btrim(COALESCE(h->>'description', ''))
                        ) ORDER BY h->>'start_date', lower(btrim(COALESCE(h->>'title', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'holidays', '[]'::jsonb)) h
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', lower(btrim(COALESCE(h->>'title', ''))),
                            'exception_type', COALESCE(h->>'exception_type', 'Holiday'),
                            'start_date', h->>'start_date',
                            'end_date', h->>'end_date',
                            'affects_attendance', COALESCE((h->>'affects_attendance')::boolean, true),
                            'description', btrim(COALESCE(h->>'description', ''))
                        ) ORDER BY h->>'start_date', lower(btrim(COALESCE(h->>'title', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'holidays', '[]'::jsonb)) h
                )
            ) INTO v_holidays_match;

            v_has_real_change := NOT (
                v_header_matches 
                AND v_terms_match 
                AND v_trans_match 
                AND v_thresh_match 
                AND v_holidays_match
            );
        END IF;

        IF v_has_real_change THEN
            v_summary := 'Updated academic year "' || v_clean_label || '" configuration (' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, ' || jsonb_array_length(v_full_holidays) || ' holidays).';

            UPDATE public.school_year_histories
            SET is_active_version = false
            WHERE school_year_id = v_sy_id
              AND deleted_at IS NULL
              AND is_active_version = true;

            INSERT INTO public.school_year_histories (
                school_year_id,
                action,
                changed_by,
                change_summary,
                snapshot,
                is_active_version
            ) VALUES (
                v_sy_id,
                v_action,
                v_current_user_id,
                v_summary,
                v_snapshot,
                true
            );

            RETURN jsonb_build_object(
                'success', true,
                'message', 'Academic year calendar saved successfully.',
                'school_year_id', v_sy_id,
                'has_real_change', true
            );
        ELSE
            -- No real changes: keep active version, do not add new history row
            RETURN jsonb_build_object(
                'success', true,
                'message', 'No changes detected. Academic year calendar remains unchanged.',
                'school_year_id', v_sy_id,
                'has_real_change', false
            );
        END IF;
    END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_calculate_final_grade(uuid, uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
