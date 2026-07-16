ALTER TABLE public.assessment_items
    ADD COLUMN IF NOT EXISTS use_rubric_scoring boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_assessment_item_rubrics_item
    ON public.assessment_item_rubrics (assessment_item_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_rubric_evaluations_submission_criteria
    ON public.rubric_evaluations (submission_id, criteria_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rubrics_section
    ON public.rubrics (section_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric
    ON public.rubric_criteria (rubric_id)
    WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS rubrics_insert ON public.rubrics;
CREATE POLICY rubrics_insert ON public.rubrics
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS rubrics_update ON public.rubrics;
CREATE POLICY rubrics_update ON public.rubrics
    FOR UPDATE TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS rubric_criteria_insert ON public.rubric_criteria;
CREATE POLICY rubric_criteria_insert ON public.rubric_criteria
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS rubric_criteria_update ON public.rubric_criteria;
CREATE POLICY rubric_criteria_update ON public.rubric_criteria
    FOR UPDATE TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS assessment_item_rubrics_insert ON public.assessment_item_rubrics;
CREATE POLICY assessment_item_rubrics_insert ON public.assessment_item_rubrics
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS assessment_item_rubrics_update ON public.assessment_item_rubrics;
CREATE POLICY assessment_item_rubrics_update ON public.assessment_item_rubrics
    FOR UPDATE TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS rubric_evaluations_insert ON public.rubric_evaluations;
CREATE POLICY rubric_evaluations_insert ON public.rubric_evaluations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.fn_resolve_rubric_section(p_rubric_id uuid) RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT r.section_id
    FROM public.rubrics r
    WHERE r.id = p_rubric_id
      AND r.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_submission_section(p_submission_id uuid) RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT ai.section_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id AND ai.deleted_at IS NULL
    WHERE asub.id = p_submission_id
      AND asub.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_rubrics(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             r.id,
                'title',          r.title,
                'description',    r.description,
                'total_points',   r.total_points,
                'is_active',      r.is_active,
                'criteria_count', (
                    SELECT COUNT(*)
                    FROM public.rubric_criteria rc
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                ),
                'attached_count', (
                    SELECT COUNT(*)
                    FROM public.assessment_item_rubrics air
                    WHERE air.rubric_id = r.id AND air.deleted_at IS NULL
                )
            )
            ORDER BY r.title ASC
        ), '[]'::JSONB)
        FROM public.rubrics r
        WHERE r.section_id = p_section_id
        AND r.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_rubric(p_rubric_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_section_staff(public.fn_resolve_rubric_section(p_rubric_id));

    SELECT jsonb_build_object(
        'id',           r.id,
        'section_id',   r.section_id,
        'title',        r.title,
        'description',  r.description,
        'total_points', r.total_points,
        'is_active',    r.is_active,
        'criteria', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',          rc.id,
                    'title',       rc.title,
                    'description', rc.description,
                    'max_points',  rc.max_points,
                    'sequence',    rc.sequence
                )
                ORDER BY rc.sequence ASC
            ), '[]'::JSONB)
            FROM public.rubric_criteria rc
            WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.rubrics r
    WHERE r.id = p_rubric_id
    AND r.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_rubric(p_section_id uuid, p_title text, p_description text, p_criteria jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_rubric_id  UUID;
    v_criterion  JSONB;
    v_total      NUMERIC := 0;
    v_seq        SMALLINT := 0;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    IF COALESCE(trim(p_title), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric title is required.');
    END IF;

    IF p_criteria IS NULL OR jsonb_array_length(p_criteria) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Add at least one criterion.');
    END IF;

    INSERT INTO public.rubrics (section_id, title, description, total_points)
    VALUES (p_section_id, trim(p_title), NULLIF(trim(p_description), ''), 0)
    RETURNING id INTO v_rubric_id;

    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        v_seq := v_seq + 1;

        IF (v_criterion->>'max_points')::NUMERIC <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each criterion must have points greater than zero.');
        END IF;

        INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
        VALUES (
            v_rubric_id,
            trim(v_criterion->>'title'),
            NULLIF(trim(v_criterion->>'description'), ''),
            (v_criterion->>'max_points')::NUMERIC,
            v_seq
        );

        v_total := v_total + (v_criterion->>'max_points')::NUMERIC;
    END LOOP;

    UPDATE public.rubrics SET total_points = v_total WHERE id = v_rubric_id;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric created successfully.', 'id', v_rubric_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_rubric(p_rubric_id uuid, p_title text, p_description text, p_criteria jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_criterion  JSONB;
    v_total      NUMERIC := 0;
    v_seq        SMALLINT := 0;
    v_kept_ids   UUID[] := ARRAY[]::UUID[];
    v_criterion_id UUID;
BEGIN
    PERFORM public.fn_assert_section_staff(public.fn_resolve_rubric_section(p_rubric_id));

    IF NOT EXISTS (
        SELECT 1 FROM public.rubrics WHERE id = p_rubric_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric not found.');
    END IF;

    IF COALESCE(trim(p_title), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric title is required.');
    END IF;

    IF p_criteria IS NULL OR jsonb_array_length(p_criteria) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Add at least one criterion.');
    END IF;

    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        v_seq := v_seq + 1;

        IF (v_criterion->>'max_points')::NUMERIC <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each criterion must have points greater than zero.');
        END IF;

        IF NULLIF(v_criterion->>'id', '') IS NOT NULL THEN
            v_criterion_id := (v_criterion->>'id')::UUID;

            UPDATE public.rubric_criteria
            SET
                title       = trim(v_criterion->>'title'),
                description = NULLIF(trim(v_criterion->>'description'), ''),
                max_points  = (v_criterion->>'max_points')::NUMERIC,
                sequence    = v_seq
            WHERE id = v_criterion_id
            AND rubric_id = p_rubric_id
            AND deleted_at IS NULL;
        ELSE
            INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
            VALUES (
                p_rubric_id,
                trim(v_criterion->>'title'),
                NULLIF(trim(v_criterion->>'description'), ''),
                (v_criterion->>'max_points')::NUMERIC,
                v_seq
            )
            RETURNING id INTO v_criterion_id;
        END IF;

        v_kept_ids := array_append(v_kept_ids, v_criterion_id);
        v_total := v_total + (v_criterion->>'max_points')::NUMERIC;
    END LOOP;

    UPDATE public.rubric_criteria
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE rubric_id = p_rubric_id
    AND deleted_at IS NULL
    AND NOT (id = ANY(v_kept_ids));

    UPDATE public.rubrics
    SET
        title        = trim(p_title),
        description  = NULLIF(trim(p_description), ''),
        total_points = v_total
    WHERE id = p_rubric_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_rubric(p_rubric_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff(public.fn_resolve_rubric_section(p_rubric_id));

    IF EXISTS (
        SELECT 1 FROM public.assessment_item_rubrics air
        WHERE air.rubric_id = p_rubric_id AND air.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Detach this rubric from its assessments before deleting.');
    END IF;

    UPDATE public.rubric_criteria
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE rubric_id = p_rubric_id AND deleted_at IS NULL;

    UPDATE public.rubrics
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_rubric_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric deleted successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_copy_rubric_to_sections(p_rubric_id uuid, p_section_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_source_section UUID;
    v_target         UUID;
    v_new_rubric_id  UUID;
    v_copied         INTEGER := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_source_section := public.fn_resolve_rubric_section(p_rubric_id);

    IF v_source_section IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Source rubric not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_source_section) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target IN ARRAY p_section_ids
    LOOP
        IF v_target = v_source_section THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach every target section.'
                USING ERRCODE = '42501';
        END IF;

        INSERT INTO public.rubrics (section_id, title, description, total_points, is_active)
        SELECT v_target, r.title, r.description, r.total_points, r.is_active
        FROM public.rubrics r
        WHERE r.id = p_rubric_id AND r.deleted_at IS NULL
        RETURNING id INTO v_new_rubric_id;

        INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
        SELECT v_new_rubric_id, rc.title, rc.description, rc.max_points, rc.sequence
        FROM public.rubric_criteria rc
        WHERE rc.rubric_id = p_rubric_id AND rc.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rubric copied to ' || v_copied || ' section(s).',
        'copied_count', v_copied
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_rubric(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_rubric_id  UUID;
    v_use_scoring BOOLEAN;
BEGIN
    SELECT ai.section_id, ai.use_rubric_scoring
    INTO v_section_id, v_use_scoring
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id AND ai.deleted_at IS NULL;

    PERFORM public.fn_assert_section_staff(v_section_id);

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_item_rubrics air
    WHERE air.assessment_item_id = p_assessment_id AND air.deleted_at IS NULL
    LIMIT 1;

    RETURN jsonb_build_object(
        'assessment_id',      p_assessment_id,
        'use_rubric_scoring', COALESCE(v_use_scoring, false),
        'rubric_id',          v_rubric_id,
        'rubric', CASE WHEN v_rubric_id IS NULL THEN NULL ELSE (
            SELECT jsonb_build_object(
                'id',           r.id,
                'title',        r.title,
                'total_points', r.total_points,
                'criteria', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          rc.id,
                            'title',       rc.title,
                            'description', rc.description,
                            'max_points',  rc.max_points,
                            'sequence',    rc.sequence
                        )
                        ORDER BY rc.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.rubric_criteria rc
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                )
            )
            FROM public.rubrics r
            WHERE r.id = v_rubric_id AND r.deleted_at IS NULL
        ) END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_assessment_rubric(p_assessment_id uuid, p_rubric_id uuid, p_use_scoring boolean) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT ai.section_id INTO v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.');
    END IF;

    PERFORM public.fn_assert_section_staff(v_section_id);

    IF p_use_scoring AND p_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attach a rubric before enabling rubric scoring.');
    END IF;

    IF p_rubric_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.rubrics r
            WHERE r.id = p_rubric_id
            AND r.section_id = v_section_id
            AND r.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Rubric does not belong to this section.');
        END IF;
    END IF;

    UPDATE public.assessment_item_rubrics
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL;

    IF p_rubric_id IS NOT NULL THEN
        INSERT INTO public.assessment_item_rubrics (assessment_item_id, rubric_id)
        VALUES (p_assessment_id, p_rubric_id);
    END IF;

    UPDATE public.assessment_items
    SET use_rubric_scoring = (p_rubric_id IS NOT NULL AND p_use_scoring)
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric settings saved.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_submission_rubric(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_rubric_id  UUID;
    v_result     JSONB;
BEGIN
    v_section_id := public.fn_resolve_submission_section(p_submission_id);
    PERFORM public.fn_assert_section_staff(v_section_id);

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_item_rubrics air
        ON air.assessment_item_id = asub.assessment_item_id AND air.deleted_at IS NULL
    WHERE asub.id = p_submission_id AND asub.deleted_at IS NULL
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rubric attached to this assessment.');
    END IF;

    SELECT jsonb_build_object(
        'submission_id', p_submission_id,
        'rubric_id',     r.id,
        'title',         r.title,
        'total_points',  r.total_points,
        'criteria', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',            rc.id,
                    'title',         rc.title,
                    'description',   rc.description,
                    'max_points',    rc.max_points,
                    'sequence',      rc.sequence,
                    'points_earned', re.points_earned,
                    'feedback',      re.feedback
                )
                ORDER BY rc.sequence ASC
            ), '[]'::JSONB)
            FROM public.rubric_criteria rc
            LEFT JOIN public.rubric_evaluations re
                ON re.criteria_id = rc.id
                AND re.submission_id = p_submission_id
                AND re.deleted_at IS NULL
            WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.rubrics r
    WHERE r.id = v_rubric_id AND r.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_grade_submission_rubric(p_submission_id uuid, p_feedback text, p_evaluations jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id  UUID;
    v_rubric_id   UUID;
    v_eval        JSONB;
    v_criteria_id UUID;
    v_points      NUMERIC;
    v_max_points  NUMERIC;
    v_total       NUMERIC := 0;
    v_updated     INTEGER;
BEGIN
    v_section_id := public.fn_resolve_submission_section(p_submission_id);
    PERFORM public.fn_assert_section_staff(v_section_id);

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_item_rubrics air
        ON air.assessment_item_id = asub.assessment_item_id AND air.deleted_at IS NULL
    WHERE asub.id = p_submission_id AND asub.deleted_at IS NULL
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rubric attached to this assessment.');
    END IF;

    FOR v_eval IN SELECT * FROM jsonb_array_elements(p_evaluations)
    LOOP
        v_criteria_id := (v_eval->>'criteria_id')::UUID;
        v_points := COALESCE((v_eval->>'points_earned')::NUMERIC, 0);

        SELECT rc.max_points INTO v_max_points
        FROM public.rubric_criteria rc
        WHERE rc.id = v_criteria_id
        AND rc.rubric_id = v_rubric_id
        AND rc.deleted_at IS NULL;

        IF v_max_points IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'A criterion does not belong to the attached rubric.');
        END IF;

        IF v_points < 0 OR v_points > v_max_points THEN
            RETURN jsonb_build_object('success', false, 'message', 'Points for a criterion exceed its maximum.');
        END IF;

        UPDATE public.rubric_evaluations
        SET
            points_earned = v_points,
            feedback      = NULLIF(trim(v_eval->>'feedback'), ''),
            evaluated_by  = auth.uid(),
            evaluated_at  = now()
        WHERE submission_id = p_submission_id
        AND criteria_id = v_criteria_id
        AND deleted_at IS NULL;

        GET DIAGNOSTICS v_updated = ROW_COUNT;

        IF v_updated = 0 THEN
            INSERT INTO public.rubric_evaluations (submission_id, criteria_id, points_earned, feedback, evaluated_by)
            VALUES (p_submission_id, v_criteria_id, v_points, NULLIF(trim(v_eval->>'feedback'), ''), auth.uid());
        END IF;

        v_total := v_total + v_points;
    END LOOP;

    UPDATE public.assessment_submissions
    SET
        raw_score   = v_total,
        final_score = v_total,
        feedback    = NULLIF(p_feedback, ''),
        status      = 'Graded'::public.submission_status_type,
        graded_at   = now(),
        graded_by   = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Rubric grade saved.', 'raw_score', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_submission_for_grading(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',            asub.id,
        'enrollment_id', asub.enrollment_id,
        'status',        asub.status,
        'raw_score',     asub.raw_score,
        'final_score',   asub.final_score,
        'feedback',      asub.feedback,
        'use_rubric_scoring', ai.use_rubric_scoring,
        'answers', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              sa.id,
                    'question_id',     sa.question_id,
                    'question_text',   aq.question_text,
                    'question_type',   aq.question_type,
                    'points',          aq.points,
                    'sequence',        aq.sequence,
                    'answer_text',     sa.answer_text,
                    'choice_id',       sa.choice_id,
                    'points_earned',   sa.points_earned,
                    'is_correct',      sa.is_correct,
                    'grader_notes',    sa.grader_notes,
                    'file_attachments', sa.file_attachments
                )
                ORDER BY aq.sequence ASC
            ), '[]'::JSONB)
            FROM public.student_answers sa
            INNER JOIN public.assessment_questions aq
                ON aq.id = sa.question_id AND aq.deleted_at IS NULL
            WHERE sa.submission_id = asub.id
            AND sa.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_my_assessment_result(p_enrollment_id uuid, p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_student_id UUID;
    v_submission RECORD;
    v_item RECORD;
    v_results_available BOOLEAN;
    v_rubric_id UUID;
    v_result JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = v_uid AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT ai.id, ai.title, ai.description, ai.assessment_type, ai.total_points,
           ai.passing_points, ai.show_results_at, ai.max_attempts, ai.use_rubric_scoring
    INTO v_item
    FROM public.assessment_items ai
    INNER JOIN public.enrollments e ON e.section_id = ai.section_id
    WHERE ai.id = p_assessment_id
    AND e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND ai.deleted_at IS NULL
    AND e.deleted_at IS NULL;

    IF v_item.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    SELECT asub.id, asub.status, asub.attempt_number, asub.submitted_at, asub.graded_at,
           asub.is_late, asub.raw_score, asub.final_score, asub.feedback
    INTO v_submission
    FROM public.assessment_submissions asub
    WHERE asub.assessment_item_id = p_assessment_id
    AND asub.enrollment_id = p_enrollment_id
    AND asub.deleted_at IS NULL
    ORDER BY asub.attempt_number DESC
    LIMIT 1;

    IF v_submission.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No submission found for this assessment.');
    END IF;

    v_results_available := v_submission.status IN ('Graded', 'Returned')
        AND (v_item.show_results_at IS NULL OR v_item.show_results_at <= now());

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_item_rubrics air
    WHERE air.assessment_item_id = p_assessment_id AND air.deleted_at IS NULL
    LIMIT 1;

    v_result := jsonb_build_object(
        'submission_id',      v_submission.id,
        'assessment_id',      v_item.id,
        'title',              v_item.title,
        'description',        v_item.description,
        'assessment_type',    v_item.assessment_type,
        'status',             v_submission.status,
        'attempt_number',     v_submission.attempt_number,
        'max_attempts',       v_item.max_attempts,
        'submitted_at',       v_submission.submitted_at,
        'graded_at',          v_submission.graded_at,
        'is_late',            v_submission.is_late,
        'total_points',       v_item.total_points,
        'passing_points',     v_item.passing_points,
        'show_results_at',    v_item.show_results_at,
        'results_available',  v_results_available,
        'use_rubric_scoring', COALESCE(v_item.use_rubric_scoring, false),
        'raw_score',          CASE WHEN v_results_available THEN v_submission.raw_score ELSE NULL END,
        'final_score',        CASE WHEN v_results_available THEN v_submission.final_score ELSE NULL END,
        'feedback',           CASE WHEN v_results_available THEN v_submission.feedback ELSE NULL END,
        'rubric', CASE WHEN v_rubric_id IS NULL THEN NULL ELSE (
            SELECT jsonb_build_object(
                'title',        r.title,
                'total_points', r.total_points,
                'criteria', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',            rc.id,
                            'title',         rc.title,
                            'description',   rc.description,
                            'max_points',    rc.max_points,
                            'sequence',      rc.sequence,
                            'points_earned', CASE WHEN v_results_available THEN re.points_earned ELSE NULL END,
                            'feedback',      CASE WHEN v_results_available THEN re.feedback ELSE NULL END
                        )
                        ORDER BY rc.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.rubric_criteria rc
                    LEFT JOIN public.rubric_evaluations re
                        ON re.criteria_id = rc.id
                        AND re.submission_id = v_submission.id
                        AND re.deleted_at IS NULL
                    WHERE rc.rubric_id = r.id AND rc.deleted_at IS NULL
                )
            )
            FROM public.rubrics r
            WHERE r.id = v_rubric_id AND r.deleted_at IS NULL
        ) END,
        'answers', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',               aq.id,
                    'question_text',    aq.question_text,
                    'question_type',    aq.question_type,
                    'points',           aq.points,
                    'sequence',         aq.sequence,
                    'explanation',      CASE WHEN v_results_available THEN aq.explanation ELSE NULL END,
                    'answer_text',      sa.answer_text,
                    'choice_id',        sa.choice_id,
                    'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb),
                    'points_earned',    CASE WHEN v_results_available THEN sa.points_earned ELSE NULL END,
                    'is_correct',       CASE WHEN v_results_available THEN sa.is_correct ELSE NULL END,
                    'grader_notes',     CASE WHEN v_results_available THEN sa.grader_notes ELSE NULL END,
                    'choices', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',          aqc.id,
                                'choice_text', aqc.choice_text,
                                'sequence',    aqc.sequence,
                                'is_correct',  CASE WHEN v_results_available THEN aqc.is_correct ELSE NULL END
                            )
                            ORDER BY aqc.sequence ASC
                        ), '[]'::jsonb)
                        FROM public.assessment_question_choices aqc
                        WHERE aqc.question_id = aq.id AND aqc.deleted_at IS NULL
                    )
                )
                ORDER BY aq.sequence ASC
            ), '[]'::jsonb)
            FROM public.assessment_questions aq
            LEFT JOIN public.student_answers sa
                ON sa.question_id = aq.id
                AND sa.submission_id = v_submission.id
                AND sa.deleted_at IS NULL
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        )
    );

    RETURN v_result;
END;
$$;

DO $$
DECLARE
    r RECORD;
    v_fns TEXT[] := ARRAY[
        'fn_list_rubrics',
        'fn_get_rubric',
        'fn_create_rubric',
        'fn_update_rubric',
        'fn_delete_rubric',
        'fn_copy_rubric_to_sections',
        'fn_get_assessment_rubric',
        'fn_set_assessment_rubric',
        'fn_get_submission_rubric',
        'fn_grade_submission_rubric',
        'fn_get_submission_for_grading',
        'fn_get_my_assessment_result'
    ];
    v_internal TEXT[] := ARRAY[
        'fn_resolve_rubric_section',
        'fn_resolve_submission_section'
    ];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY (v_fns)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END LOOP;

    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY (v_internal)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    END LOOP;
END $$;
