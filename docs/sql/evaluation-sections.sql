ALTER TABLE public.evaluation_templates
    ADD COLUMN IF NOT EXISTS sequence SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.evaluation_templates
    ADD COLUMN IF NOT EXISTS target_mode TEXT NOT NULL DEFAULT 'INCLUDE';

ALTER TABLE public.evaluation_templates
    ADD COLUMN IF NOT EXISTS suggestion_placeholder TEXT;

DO $$
BEGIN
    ALTER TABLE public.evaluation_templates
        ADD CONSTRAINT evaluation_templates_target_mode_check
        CHECK (target_mode IN ('INCLUDE', 'EXCLUDE'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF (
        SELECT COUNT(*) FROM public.evaluation_templates
        WHERE deleted_at IS NULL AND sequence <> 1
    ) = 0 THEN
        WITH ordered AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
            FROM public.evaluation_templates
            WHERE deleted_at IS NULL
        )
        UPDATE public.evaluation_templates t
        SET sequence = ordered.rn
        FROM ordered
        WHERE t.id = ordered.id;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.evaluation_template_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    program_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

DO $$
BEGIN
    ALTER TABLE public.evaluation_template_programs
        ADD CONSTRAINT evaluation_template_programs_template_id_fkey
        FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.evaluation_template_programs
        ADD CONSTRAINT evaluation_template_programs_program_id_fkey
        FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_evaluation_template_programs_template_program
    ON public.evaluation_template_programs (template_id, program_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.evaluation_template_programs ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_evaluation_template_programs_updated_audit ON public.evaluation_template_programs;
CREATE TRIGGER trg_evaluation_template_programs_updated_audit
    BEFORE UPDATE ON public.evaluation_template_programs
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "evaluation_template_programs_select" ON public.evaluation_template_programs;
CREATE POLICY "evaluation_template_programs_select" ON public.evaluation_template_programs
    FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "evaluation_template_programs_insert" ON public.evaluation_template_programs;
CREATE POLICY "evaluation_template_programs_insert" ON public.evaluation_template_programs
    FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "evaluation_template_programs_update" ON public.evaluation_template_programs;
CREATE POLICY "evaluation_template_programs_update" ON public.evaluation_template_programs
    FOR UPDATE TO authenticated USING (false);

ALTER TABLE public.evaluation_period_locks
    ADD COLUMN IF NOT EXISTS template_ids UUID[];

CREATE OR REPLACE FUNCTION public.fn_list_applicable_evaluation_templates(p_student_id uuid)
RETURNS TABLE (id uuid, title text, description text, sequence smallint)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT t.id, t.title, t.description, t.sequence
    FROM public.evaluation_templates t
    WHERE t.is_active = true
    AND t.deleted_at IS NULL
    AND EXISTS (
        SELECT 1 FROM public.evaluation_questions q
        WHERE q.template_id = t.id AND q.deleted_at IS NULL
    )
    AND (
        NOT EXISTS (
            SELECT 1 FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        )
        OR (
            COALESCE(t.target_mode, 'INCLUDE') = 'INCLUDE'
            AND EXISTS (
                SELECT 1
                FROM public.evaluation_template_programs tp
                INNER JOIN public.students s
                    ON s.id = p_student_id
                    AND s.deleted_at IS NULL
                    AND s.program_id = tp.program_id
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            )
        )
        OR (
            t.target_mode = 'EXCLUDE'
            AND NOT EXISTS (
                SELECT 1
                FROM public.evaluation_template_programs tp
                INNER JOIN public.students s
                    ON s.id = p_student_id
                    AND s.deleted_at IS NULL
                    AND s.program_id = tp.program_id
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            )
        )
    )
    ORDER BY t.sequence ASC, t.created_at ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_applicable_evaluation_templates(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_set_evaluation_template_programs(p_template_id uuid, p_program_ids uuid[]) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE public.evaluation_template_programs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_template_id
    AND deleted_at IS NULL
    AND (p_program_ids IS NULL OR NOT (program_id = ANY(p_program_ids)));

    IF p_program_ids IS NULL OR array_length(p_program_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.evaluation_template_programs (template_id, program_id, created_by)
    SELECT p_template_id, pid, auth.uid()
    FROM unnest(p_program_ids) AS pid
    WHERE NOT EXISTS (
        SELECT 1 FROM public.evaluation_template_programs tp
        WHERE tp.template_id = p_template_id
        AND tp.program_id = pid
        AND tp.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_evaluation_programs(p_program_ids uuid[]) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_missing INTEGER;
BEGIN
    IF p_program_ids IS NULL OR array_length(p_program_ids, 1) IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*) INTO v_missing
    FROM unnest(p_program_ids) AS pid
    WHERE NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = pid AND p.deleted_at IS NULL
    );

    IF v_missing > 0 THEN
        RETURN 'One or more selected programs no longer exist.';
    END IF;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_templates() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',                     t.id,
                'title',                  t.title,
                'description',            t.description,
                'is_active',              t.is_active,
                'sequence',               t.sequence,
                'target_mode',            COALESCE(t.target_mode, 'INCLUDE'),
                'suggestion_placeholder', t.suggestion_placeholder,
                'program_ids', COALESCE((
                    SELECT jsonb_agg(tp.program_id)
                    FROM public.evaluation_template_programs tp
                    WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
                ), '[]'::JSONB),
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
            ORDER BY t.sequence ASC, t.created_at ASC
        )
        FROM public.evaluation_templates t
        WHERE t.deleted_at IS NULL
    ), '[]'::JSONB);
END;
$$;

DROP FUNCTION IF EXISTS public.fn_create_evaluation_template(text, text, boolean, jsonb);
DROP FUNCTION IF EXISTS public.fn_create_evaluation_template(text, text, boolean, smallint, uuid[], jsonb);
DROP FUNCTION IF EXISTS public.fn_create_evaluation_template(text, text, boolean, smallint, uuid[], jsonb, text);
DROP FUNCTION IF EXISTS public.fn_create_evaluation_template(text, text, boolean, smallint, uuid[], jsonb, text, text);

CREATE OR REPLACE FUNCTION public.fn_create_evaluation_template(
    p_title text,
    p_description text,
    p_is_active boolean,
    p_sequence smallint,
    p_program_ids uuid[],
    p_questions jsonb,
    p_target_mode text DEFAULT 'INCLUDE',
    p_suggestion_placeholder text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error TEXT;
    v_template_id UUID;
    v_mode TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section title is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE lower(title) = lower(btrim(p_title)) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section named "' || btrim(p_title) || '" already exists.');
    END IF;

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'INCLUDE'));
    IF v_mode NOT IN ('INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be INCLUDE or EXCLUDE.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    v_error := public.fn_validate_evaluation_programs(p_program_ids);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    INSERT INTO public.evaluation_templates (
        title, description, is_active, sequence, target_mode, suggestion_placeholder, created_by
    )
    VALUES (
        btrim(p_title),
        NULLIF(btrim(COALESCE(p_description, '')), ''),
        COALESCE(p_is_active, true),
        GREATEST(COALESCE(p_sequence, 1), 1),
        v_mode,
        NULLIF(btrim(COALESCE(p_suggestion_placeholder, '')), ''),
        auth.uid()
    )
    RETURNING id INTO v_template_id;

    PERFORM public.fn_insert_evaluation_questions(v_template_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(v_template_id, p_program_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section created successfully.', 'id', v_template_id);
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_evaluation_template(uuid, text, text, boolean, jsonb);
DROP FUNCTION IF EXISTS public.fn_update_evaluation_template(uuid, text, text, boolean, smallint, uuid[], jsonb);
DROP FUNCTION IF EXISTS public.fn_update_evaluation_template(uuid, text, text, boolean, smallint, uuid[], jsonb, text);
DROP FUNCTION IF EXISTS public.fn_update_evaluation_template(uuid, text, text, boolean, smallint, uuid[], jsonb, text, text);

CREATE OR REPLACE FUNCTION public.fn_update_evaluation_template(
    p_id uuid,
    p_title text,
    p_description text,
    p_is_active boolean,
    p_sequence smallint,
    p_program_ids uuid[],
    p_questions jsonb,
    p_target_mode text DEFAULT 'INCLUDE',
    p_suggestion_placeholder text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_error TEXT;
    v_mode TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

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

    v_mode := upper(COALESCE(NULLIF(btrim(p_target_mode), ''), 'INCLUDE'));
    IF v_mode NOT IN ('INCLUDE', 'EXCLUDE') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid target mode. Must be INCLUDE or EXCLUDE.');
    END IF;

    v_error := public.fn_validate_evaluation_questions(p_questions);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
    END IF;

    v_error := public.fn_validate_evaluation_programs(p_program_ids);
    IF v_error IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_error);
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

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    PERFORM public.fn_insert_evaluation_questions(p_id, p_questions);
    PERFORM public.fn_set_evaluation_template_programs(p_id, p_program_ids);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section updated successfully.');
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
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.evaluation_responses r
        INNER JOIN public.evaluation_questions q ON q.id = r.question_id
        WHERE q.template_id = p_id AND r.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This section is already in use by student evaluations and cannot be deleted.');
    END IF;

    UPDATE public.evaluation_template_programs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section deleted successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_form(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_faculty_name TEXT;
    v_period_name TEXT;
    v_is_completed BOOLEAN;
    v_sections JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned')
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

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'template_id', t.id,
            'title',       t.title,
            'description', t.description,
            'sequence',    t.sequence,
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
        ORDER BY t.sequence ASC
    ), '[]'::JSONB)
    INTO v_sections
    FROM public.fn_list_applicable_evaluation_templates(v_student_id) t;

    IF jsonb_array_length(v_sections) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available. Please contact your administrator.');
    END IF;

    RETURN jsonb_build_object(
        'faculty_name',        v_faculty_name,
        'grading_period_id',   p_grading_period_id,
        'grading_period_name', v_period_name,
        'sections',            v_sections
    );
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
    v_template_ids UUID[];
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

    SELECT array_agg(t.id ORDER BY t.sequence ASC) INTO v_template_ids
    FROM public.fn_list_applicable_evaluation_templates(v_student_id) t;

    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available.');
    END IF;

    SELECT COUNT(*) INTO v_required_count
    FROM public.evaluation_questions
    WHERE template_id = ANY(v_template_ids)
    AND is_required = true
    AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT q.id) INTO v_answered_count
    FROM jsonb_array_elements(p_responses) r
    INNER JOIN public.evaluation_questions q
        ON q.id = (r->>'question_id')::UUID
        AND q.template_id = ANY(v_template_ids)
        AND q.is_required = true
        AND q.deleted_at IS NULL
    WHERE COALESCE(NULLIF(btrim(COALESCE(r->>'response_text', '')), ''), NULLIF(btrim(COALESCE(r->>'rating_value', '')), '')) IS NOT NULL;

    IF v_answered_count < v_required_count THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please answer all required questions before submitting.');
    END IF;

    INSERT INTO public.evaluation_period_locks (enrollment_id, grading_period_id, template_id, template_ids, created_by)
    VALUES (p_enrollment_id, p_grading_period_id, v_template_ids[1], v_template_ids, auth.uid())
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        template_id  = EXCLUDED.template_id,
        template_ids = EXCLUDED.template_ids,
        updated_by   = auth.uid();

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
            AND template_id = ANY(v_template_ids)
            AND deleted_at IS NULL
        ) THEN
            INSERT INTO public.evaluation_responses (
                question_id, enrollment_id, grading_period_id, rating_value, response_text, created_by
            )
            VALUES (
                (v_response->>'question_id')::UUID,
                p_enrollment_id,
                p_grading_period_id,
                NULLIF(btrim(COALESCE(v_response->>'rating_value', '')), '')::SMALLINT,
                NULLIF(btrim(COALESCE(v_response->>'response_text', '')), ''),
                auth.uid()
            );
        END IF;
    END LOOP;

    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, p_grading_period_id);

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation submitted. Your grade is now available.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_check_evaluation_completion(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_is_completed BOOLEAN;
    v_template_ids UUID[];
    v_required_count INTEGER;
    v_answered_count INTEGER;
BEGIN
    SELECT is_completed, COALESCE(template_ids, ARRAY[template_id])
    INTO v_is_completed, v_template_ids
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF v_is_completed IS NULL THEN
        RETURN false;
    END IF;

    IF v_is_completed THEN
        RETURN true;
    END IF;

    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
        RETURN false;
    END IF;

    SELECT COUNT(*) INTO v_required_count
    FROM public.evaluation_questions
    WHERE template_id = ANY(v_template_ids)
    AND is_required = true
    AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT r.question_id) INTO v_answered_count
    FROM public.evaluation_responses r
    INNER JOIN public.evaluation_questions q
        ON q.id = r.question_id
        AND q.template_id = ANY(v_template_ids)
        AND q.is_required = true
        AND q.deleted_at IS NULL
    WHERE r.enrollment_id = p_enrollment_id
    AND r.grading_period_id = p_grading_period_id
    AND r.deleted_at IS NULL;

    RETURN v_answered_count >= v_required_count;
END;
$$;