CREATE OR REPLACE FUNCTION public.fn_get_evaluation_templates() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',          t.id,
                'title',       t.title,
                'description', t.description,
                'is_active',   t.is_active,
                'questions', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id',            q.id,
                            'question_text', q.question_text,
                            'question_type', q.question_type,
                            'sequence',      q.sequence,
                            'is_required',   q.is_required,
                            'min_rating',    q.min_rating,
                            'max_rating',    q.max_rating
                        )
                        ORDER BY q.sequence ASC
                    )
                    FROM public.evaluation_questions q
                    WHERE q.template_id = t.id AND q.deleted_at IS NULL
                ), '[]'::JSONB)
            )
            ORDER BY t.created_at ASC
        )
        FROM public.evaluation_templates t
        WHERE t.deleted_at IS NULL
    ), '[]'::JSONB);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_evaluation_questions(p_questions jsonb) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    v_question JSONB;
    v_type public.evaluation_question_type;
    v_min SMALLINT;
    v_max SMALLINT;
BEGIN
    IF p_questions IS NULL OR jsonb_array_length(p_questions) = 0 THEN
        RETURN 'At least one question is required.';
    END IF;

    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
        IF btrim(COALESCE(v_question->>'question_text', '')) = '' THEN
            RETURN 'Every question must have text.';
        END IF;

        v_type := (v_question->>'question_type')::public.evaluation_question_type;

        IF v_type = 'Rating' THEN
            v_min := COALESCE((v_question->>'min_rating')::SMALLINT, 1);
            v_max := COALESCE((v_question->>'max_rating')::SMALLINT, 5);

            IF v_min < 1 OR v_max > 10 OR v_min >= v_max THEN
                RETURN 'Rating questions require min rating >= 1, max rating <= 10, and min below max.';
            END IF;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_insert_evaluation_questions(p_template_id uuid, p_questions jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_question JSONB;
    v_sequence SMALLINT := 1;
    v_type public.evaluation_question_type;
BEGIN
    FOR v_question IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
        v_type := (v_question->>'question_type')::public.evaluation_question_type;

        INSERT INTO public.evaluation_questions (
            template_id, question_text, question_type, sequence, is_required, min_rating, max_rating, created_by
        )
        VALUES (
            p_template_id,
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

        v_sequence := v_sequence + 1;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_evaluation_template(
    p_title text,
    p_description text,
    p_is_active boolean,
    p_questions jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error TEXT;
    v_template_id UUID;
BEGIN
    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Template title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A template named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    INSERT INTO public.evaluation_templates (title, description, is_active, created_by)
    VALUES (btrim(p_title), NULLIF(btrim(COALESCE(p_description, '')), ''), COALESCE(p_is_active, true), auth.uid())
    RETURNING id INTO v_template_id;

    PERFORM public.fn_insert_evaluation_questions(v_template_id, p_questions);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation template created successfully.', 'id', v_template_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_evaluation_template(
    p_id uuid,
    p_title text,
    p_description text,
    p_is_active boolean,
    p_questions jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation template not found.');
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Template title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND id <> p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A template named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    UPDATE public.evaluation_templates
    SET
        title       = btrim(p_title),
        description = NULLIF(btrim(COALESCE(p_description, '')), ''),
        is_active   = COALESCE(p_is_active, true),
        updated_by  = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    PERFORM public.fn_insert_evaluation_questions(p_id, p_questions);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation template updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_evaluation_template(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation template not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_period_locks
        WHERE template_id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This template is already in use by student evaluations and cannot be deleted.');
    END IF;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation template deleted successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_form(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_faculty_name TEXT;
    v_period_name TEXT;
    v_template RECORD;
    v_is_completed BOOLEAN;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT
        COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned')
    INTO v_faculty_name
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_faculty_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id AND gp.deleted_at IS NULL;

    IF v_period_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    SELECT is_completed INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF COALESCE(v_is_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already completed this evaluation.');
    END IF;

    SELECT id, title, description INTO v_template
    FROM public.evaluation_templates
    WHERE is_active = true AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_template.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available. Please contact your administrator.');
    END IF;

    SELECT jsonb_build_object(
        'template_id',         v_template.id,
        'title',               v_template.title,
        'description',         v_template.description,
        'faculty_name',        v_faculty_name,
        'grading_period_id',   p_grading_period_id,
        'grading_period_name', v_period_name,
        'questions', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id',            q.id,
                    'question_text', q.question_text,
                    'question_type', q.question_type,
                    'sequence',      q.sequence,
                    'is_required',   q.is_required,
                    'min_rating',    q.min_rating,
                    'max_rating',    q.max_rating
                )
                ORDER BY q.sequence ASC
            )
            FROM public.evaluation_questions q
            WHERE q.template_id = v_template.id AND q.deleted_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(
    p_enrollment_id uuid,
    p_grading_period_id uuid,
    p_responses jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_template_id UUID;
    v_lock_id UUID;
    v_is_completed BOOLEAN;
    v_response JSONB;
    v_required_count INTEGER;
    v_answered_count INTEGER;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id
        AND student_id = v_student_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT is_completed INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF COALESCE(v_is_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already completed this evaluation.');
    END IF;

    SELECT id INTO v_template_id
    FROM public.evaluation_templates
    WHERE is_active = true AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_template_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available.');
    END IF;

    SELECT COUNT(*) INTO v_required_count
    FROM public.evaluation_questions
    WHERE template_id = v_template_id AND is_required = true AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_answered_count
    FROM jsonb_array_elements(p_responses) r
    INNER JOIN public.evaluation_questions q
        ON q.id = (r->>'question_id')::UUID
        AND q.template_id = v_template_id
        AND q.is_required = true
        AND q.deleted_at IS NULL
    WHERE COALESCE(NULLIF(btrim(COALESCE(r->>'response_text', '')), ''), (r->>'rating_value')) IS NOT NULL;

    IF v_answered_count < v_required_count THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please answer all required questions before submitting.');
    END IF;

    INSERT INTO public.evaluation_period_locks (enrollment_id, grading_period_id, template_id, created_by)
    VALUES (p_enrollment_id, p_grading_period_id, v_template_id, auth.uid())
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET template_id = EXCLUDED.template_id, updated_by = auth.uid()
    RETURNING id INTO v_lock_id;

    UPDATE public.evaluation_responses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL;

    FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
    LOOP
        IF EXISTS (
            SELECT 1 FROM public.evaluation_questions
            WHERE id = (v_response->>'question_id')::UUID
            AND template_id = v_template_id
            AND deleted_at IS NULL
        ) THEN
            INSERT INTO public.evaluation_responses (
                question_id, enrollment_id, grading_period_id, rating_value, response_text, created_by
            )
            VALUES (
                (v_response->>'question_id')::UUID,
                p_enrollment_id,
                p_grading_period_id,
                NULLIF(v_response->>'rating_value', '')::SMALLINT,
                NULLIF(btrim(COALESCE(v_response->>'response_text', '')), ''),
                auth.uid()
            );
        END IF;
    END LOOP;

    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, p_grading_period_id);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation submitted. Your grade is now available.');
END;
$$;
