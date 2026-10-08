-- Phase 4: Student Portal - Grades & Faculty Evaluations Interlock
-- Fixes locked/released status, evaluation workflow, and evaluation form response shape

-- 1. fn_submit_evaluation
CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(
    p_enrollment_id UUID,
    p_grading_period_id UUID,
    p_responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

    INSERT INTO public.evaluation_period_locks (
        enrollment_id, grading_period_id, template_id, template_ids,
        is_completed, completed_at, created_by
    )
    VALUES (
        p_enrollment_id, p_grading_period_id, v_template_ids[1], v_template_ids,
        true, now(), auth.uid()
    )
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        template_id  = EXCLUDED.template_id,
        template_ids = EXCLUDED.template_ids,
        is_completed = true,
        completed_at = now(),
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

-- 2. fn_release_grades_after_evaluation
CREATE OR REPLACE FUNCTION public.fn_release_grades_after_evaluation(
  p_enrollment_id UUID,
  p_grading_period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_completed BOOLEAN;
  v_grade_count  INTEGER;
BEGIN
  SELECT fn_check_evaluation_completion(p_enrollment_id, p_grading_period_id)
  INTO v_is_completed;

  IF NOT v_is_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Evaluation not yet completed for this grading period.'
    );
  END IF;

  UPDATE public.enrollments
  SET is_grade_visible = true
  WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

  UPDATE public.section_final_grades
  SET status = 'Released', released_at = now()
  WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND status = 'Approved'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_grade_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Grades released successfully.',
    'rows_updated', v_grade_count
  );
END;
$$;

-- 3. fn_list_my_evaluations_json
CREATE OR REPLACE FUNCTION public.fn_list_my_evaluations_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 10,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_status text DEFAULT NULL::text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE true';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_status = 'Pending' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = false';
    END IF;

    IF p_status = 'Completed' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = true';
    END IF;

    v_base_query := format(
        'SELECT
            target.enrollment_id,
            target.grading_period_id,
            CASE WHEN target.evaluation_scope = ''Term''
                THEN ''Whole Term''
                ELSE gp.name
            END AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            target.evaluation_scope::TEXT AS evaluation_scope,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS is_completed,
            epl.completed_at,
            COUNT(*) OVER() AS total_count
        FROM (
            SELECT DISTINCT
                e.id AS enrollment_id,
                public.fn_resolve_evaluation_period(e.id, sfg.grading_period_id) AS grading_period_id,
                public.fn_get_enrollment_evaluation_scope(e.id) AS evaluation_scope
            FROM public.enrollments e
            INNER JOIN public.section_final_grades sfg
                ON sfg.enrollment_id = e.id
                AND sfg.deleted_at IS NULL
                AND sfg.status IN (''Approved'', ''Released'')
            WHERE e.student_id = %L
            AND e.deleted_at IS NULL
        ) target
        INNER JOIN public.enrollments e ON e.id = target.enrollment_id
        INNER JOIN public.grading_periods gp ON gp.id = target.grading_period_id AND gp.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = target.enrollment_id
            AND epl.grading_period_id = target.grading_period_id
            AND epl.deleted_at IS NULL
        %s',
        v_student_id,
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'is_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC'
    );
END;
$$;

-- 4. fn_list_my_grades
CREATE OR REPLACE FUNCTION public.fn_list_my_grades(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id)
        || ' AND e.deleted_at IS NULL'
        || ' AND sfg.status IN (''Approved'', ''Released'')'
        || ' AND sfg.deleted_at IS NULL';

    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.id = %L', p_term_id);
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            gp.id AS grading_period_id,
            public.fn_resolve_evaluation_period(e.id, gp.id) AS evaluation_period_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            gp.name AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS evaluation_completed,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.raw_grade END AS raw_grade,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.final_grade END AS final_grade,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.transmuted_grade END AS transmuted_grade,
            CASE WHEN COALESCE(epl.is_completed, false) THEN sfg.special_grade END AS special_grade,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = e.id
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(e.id, gp.id)
            AND epl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'evaluation_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC'
    );
END;
$$;

-- 5. fn_get_subject_grades
CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(
    p_enrollment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            sfg.raw_grade,
            'final_grade',          sfg.final_grade,
            'transmuted_grade',     sfg.transmuted_grade,
            'special_grade',        sfg.special_grade,
            'status',               sfg.status,
            'is_visible',           sfg.status IN ('Approved', 'Released'),
            'evaluation_completed', COALESCE((
                SELECT epl.is_completed
                FROM public.evaluation_period_locks epl
                WHERE epl.enrollment_id = p_enrollment_id
                AND epl.grading_period_id = public.fn_resolve_evaluation_period(p_enrollment_id, gp.id)
                AND epl.deleted_at IS NULL
                LIMIT 1
            ), false)
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = p_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

-- 6. fn_get_evaluation_form
CREATE OR REPLACE FUNCTION public.fn_get_evaluation_form(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_context RECORD;
    v_scope public.evaluation_scope_type;
    v_resolved_period_id UUID;
    v_period_name TEXT;
    v_is_completed BOOLEAN;
    v_sections JSONB;
    v_answers JSONB;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT
        COALESCE(NULLIF(btrim(concat(u.first_name, ' ', u.last_name)), ''), 'Unassigned') AS faculty_name,
        c.code AS course_code,
        c.title AS course_title,
        s.section_code AS section_code,
        tt.label || ' - ' || sy.label AS term_label
    INTO v_context
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    v_resolved_period_id := public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id);
    v_scope := public.fn_get_enrollment_evaluation_scope(p_enrollment_id);

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = v_resolved_period_id AND gp.deleted_at IS NULL;

    IF v_period_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    IF v_scope = 'Term' THEN
        v_period_name := 'Whole Term';
    END IF;

    SELECT COALESCE(is_completed, false) INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = v_resolved_period_id
    AND deleted_at IS NULL
    LIMIT 1;

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

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'question_id',   r.question_id,
            'rating_value',  r.rating_value,
            'response_text', r.response_text
        )
    ), '[]'::JSONB)
    INTO v_answers
    FROM public.evaluation_responses r
    WHERE r.enrollment_id = p_enrollment_id
    AND r.grading_period_id = v_resolved_period_id
    AND r.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'enrollment_id',       p_enrollment_id,
        'faculty_name',        v_context.faculty_name,
        'course_code',         v_context.course_code,
        'course_title',        v_context.course_title,
        'section_code',        v_context.section_code,
        'term_label',          v_context.term_label,
        'grading_period_id',   v_resolved_period_id,
        'grading_period_name', v_period_name,
        'evaluation_scope',    v_scope::TEXT,
        'is_completed',        COALESCE(v_is_completed, false),
        'answers',             v_answers,
        'sections',            v_sections
    );
END;
$function$;
