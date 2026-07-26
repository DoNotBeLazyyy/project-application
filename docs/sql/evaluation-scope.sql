DO $$ BEGIN
    CREATE TYPE public.evaluation_scope_type AS ENUM ('Period', 'Term');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS default_evaluation_scope public.evaluation_scope_type NOT NULL DEFAULT 'Period';

ALTER TABLE public.terms
    ADD COLUMN IF NOT EXISTS evaluation_scope public.evaluation_scope_type;

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_scope(p_term_id uuid) RETURNS public.evaluation_scope_type
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT COALESCE(
        (
            SELECT t.evaluation_scope
            FROM public.terms t
            WHERE t.id = p_term_id AND t.deleted_at IS NULL
        ),
        (
            SELECT ss.default_evaluation_scope
            FROM public.system_settings ss
            WHERE ss.deleted_at IS NULL
            ORDER BY ss.created_at ASC
            LIMIT 1
        ),
        'Period'::public.evaluation_scope_type
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_evaluation_period(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_id UUID;
    v_scope public.evaluation_scope_type;
    v_anchor_id UUID;
BEGIN
    IF p_grading_period_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT s.term_id INTO v_term_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        SELECT gp.term_id INTO v_term_id
        FROM public.grading_periods gp
        WHERE gp.id = p_grading_period_id AND gp.deleted_at IS NULL;
    END IF;

    IF v_term_id IS NULL THEN
        RETURN p_grading_period_id;
    END IF;

    v_scope := public.fn_get_evaluation_scope(v_term_id);

    IF v_scope <> 'Term' THEN
        RETURN p_grading_period_id;
    END IF;

    SELECT gp.id INTO v_anchor_id
    FROM public.grading_periods gp
    WHERE gp.term_id = v_term_id AND gp.deleted_at IS NULL
    ORDER BY gp.sequence ASC, gp.created_at ASC
    LIMIT 1;

    RETURN COALESCE(v_anchor_id, p_grading_period_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_evaluation_scope(p_enrollment_id uuid) RETURNS public.evaluation_scope_type
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT public.fn_get_evaluation_scope(s.term_id)
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_my_evaluations_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 10,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_status text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
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
                AND sfg.status = ''Released''
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

CREATE OR REPLACE FUNCTION public.fn_get_evaluation_form(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(
    p_enrollment_id uuid,
    p_grading_period_id uuid,
    p_responses jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_template_ids UUID[];
    v_resolved_period_id UUID;
    v_scope public.evaluation_scope_type;
    v_is_completed BOOLEAN;
    v_response JSONB;
    v_required_count INTEGER;
    v_answered_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Student');

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

    v_resolved_period_id := public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id);
    v_scope := public.fn_get_enrollment_evaluation_scope(p_enrollment_id);

    IF v_resolved_period_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    SELECT is_completed INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = v_resolved_period_id
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
    VALUES (p_enrollment_id, v_resolved_period_id, v_template_ids[1], v_template_ids, auth.uid())
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        template_id  = EXCLUDED.template_id,
        template_ids = EXCLUDED.template_ids,
        updated_by   = auth.uid();

    UPDATE public.evaluation_responses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = v_resolved_period_id
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
                v_resolved_period_id,
                NULLIF(btrim(COALESCE(v_response->>'rating_value', '')), '')::SMALLINT,
                NULLIF(btrim(COALESCE(v_response->>'response_text', '')), ''),
                auth.uid()
            );
        END IF;
    END LOOP;

    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, v_resolved_period_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN v_scope = 'Term'
            THEN 'Evaluation submitted. Your grades for this term are now available.'
            ELSE 'Evaluation submitted. Your grade is now available.'
        END
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_my_grades(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
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
        || ' AND sfg.status = ''Released'''
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

CREATE OR REPLACE FUNCTION public.fn_get_system_settings() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id',                        ss.id,
        'institution_name',          ss.institution_name,
        'institution_short_name',    ss.institution_short_name,
        'institution_address',       ss.institution_address,
        'institution_email',         ss.institution_email,
        'institution_phone',         ss.institution_phone,
        'institution_website',       ss.institution_website,
        'institution_logo_url',      ss.institution_logo_url,
        'academic_year_start_month', ss.academic_year_start_month,
        'max_units_per_term',        ss.max_units_per_term,
        'default_term_type_id',      ss.default_term_type_id,
        'default_evaluation_scope',  ss.default_evaluation_scope::TEXT
    )
    INTO v_result
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    ORDER BY ss.created_at ASC
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_system_settings(text, text, text, text, text, text, text, smallint, smallint, uuid);

CREATE OR REPLACE FUNCTION public.fn_update_system_settings(
    p_institution_name text,
    p_institution_short_name text,
    p_institution_address text,
    p_institution_email text,
    p_institution_phone text,
    p_institution_website text,
    p_institution_logo_url text,
    p_academic_year_start_month smallint,
    p_max_units_per_term smallint,
    p_default_term_type_id uuid DEFAULT NULL::uuid,
    p_default_evaluation_scope text DEFAULT 'Period'
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF COALESCE(NULLIF(p_default_evaluation_scope, ''), 'Period') NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    IF p_max_units_per_term < 1 OR p_max_units_per_term > 60 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max units per term must be between 1 and 60');
    END IF;

    UPDATE public.system_settings
    SET
        institution_name = p_institution_name,
        institution_short_name = p_institution_short_name,
        institution_address = p_institution_address,
        institution_email = p_institution_email,
        institution_phone = p_institution_phone,
        institution_website = p_institution_website,
        institution_logo_url = p_institution_logo_url,
        academic_year_start_month = p_academic_year_start_month,
        max_units_per_term = p_max_units_per_term,
        default_term_type_id = p_default_term_type_id,
        default_evaluation_scope = COALESCE(NULLIF(p_default_evaluation_scope, ''), 'Period')::public.evaluation_scope_type
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$$;

DROP FUNCTION IF EXISTS public.fn_create_term(uuid, uuid, date, date, date, date, date);

CREATE OR REPLACE FUNCTION public.fn_create_term(
    p_school_year_id uuid,
    p_term_type_id uuid,
    p_start_date date,
    p_end_date date,
    p_enrollment_start_date date DEFAULT NULL::date,
    p_enrollment_end_date date DEFAULT NULL::date,
    p_grading_deadline date DEFAULT NULL::date,
    p_evaluation_scope text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_evaluation_scope IS NOT NULL AND p_evaluation_scope <> '' AND p_evaluation_scope NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    INSERT INTO public.terms (
        school_year_id, term_type_id, start_date, end_date,
        enrollment_start_date, enrollment_end_date, grading_deadline,
        status, evaluation_scope, created_by
    )
    VALUES (
        p_school_year_id, p_term_type_id, p_start_date, p_end_date,
        p_enrollment_start_date, p_enrollment_end_date, p_grading_deadline,
        'Upcoming', NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type, auth.uid()
    )
    RETURNING id INTO v_term_id;

    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    RETURN jsonb_build_object('success', true, 'message', 'Term created successfully');
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_term(uuid, uuid, uuid, date, date, date, date, date);

CREATE OR REPLACE FUNCTION public.fn_update_term(
    p_term_id uuid,
    p_school_year_id uuid,
    p_term_type_id uuid,
    p_start_date date,
    p_end_date date,
    p_enrollment_start_date date DEFAULT NULL::date,
    p_enrollment_end_date date DEFAULT NULL::date,
    p_grading_deadline date DEFAULT NULL::date,
    p_evaluation_scope text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_current_status TEXT;
    v_locked_count INTEGER;
    v_current_scope public.evaluation_scope_type;
    v_next_scope public.evaluation_scope_type;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_evaluation_scope IS NOT NULL AND p_evaluation_scope <> '' AND p_evaluation_scope NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    SELECT status INTO v_current_status
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    IF v_current_status = 'Closed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closed terms cannot be edited');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND id <> p_term_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    v_current_scope := public.fn_get_evaluation_scope(p_term_id);
    v_next_scope := COALESCE(
        NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type,
        (
            SELECT ss.default_evaluation_scope
            FROM public.system_settings ss
            WHERE ss.deleted_at IS NULL
            ORDER BY ss.created_at ASC
            LIMIT 1
        ),
        'Period'::public.evaluation_scope_type
    );

    IF v_next_scope <> v_current_scope THEN
        SELECT COUNT(*)
        INTO v_locked_count
        FROM public.evaluation_period_locks epl
        INNER JOIN public.grading_periods gp ON gp.id = epl.grading_period_id AND gp.deleted_at IS NULL
        WHERE gp.term_id = p_term_id
        AND epl.deleted_at IS NULL;

        IF v_locked_count > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Evaluation scope cannot be changed: students have already submitted evaluations for this term'
            );
        END IF;
    END IF;

    UPDATE public.terms
    SET
        school_year_id        = p_school_year_id,
        term_type_id          = p_term_type_id,
        start_date            = p_start_date,
        end_date              = p_end_date,
        enrollment_start_date = p_enrollment_start_date,
        enrollment_end_date   = p_enrollment_end_date,
        grading_deadline      = p_grading_deadline,
        evaluation_scope      = NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Term updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_term_by_id(p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', t.id,
        'school_year_id', t.school_year_id,
        'term_type_id', t.term_type_id,
        'status', t.status,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'enrollment_start_date', t.enrollment_start_date,
        'enrollment_end_date', t.enrollment_end_date,
        'grading_deadline', t.grading_deadline,
        'evaluation_scope', COALESCE(t.evaluation_scope::TEXT, ''),
        'effective_evaluation_scope', public.fn_get_evaluation_scope(t.id)::TEXT
    )
    INTO v_result
    FROM public.terms t
    WHERE t.id = p_term_id
    AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_terms_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_status text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    IF p_school_year_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.school_year_id = %L', p_school_year_id);
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where := v_where || format(' AND t.status = %L', p_status);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (sy.label ILIKE %L OR tt.label ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.school_year_id,
            sy.label AS school_year_label,
            t.term_type_id,
            tt.label AS term_type_label,
            t.status,
            t.start_date,
            t.end_date,
            t.enrollment_start_date,
            t.enrollment_end_date,
            t.grading_deadline,
            COALESCE(t.evaluation_scope::TEXT, '''') AS evaluation_scope,
            public.fn_get_evaluation_scope(t.id)::TEXT AS effective_evaluation_scope,
            COUNT(*) OVER() AS total_count
        FROM public.terms t
        JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.start_date DESC');
END;
$$;

DO $$
DECLARE
    r RECORD;
    v_fns TEXT[] := ARRAY[
        'fn_get_evaluation_scope',
        'fn_resolve_evaluation_period',
        'fn_get_enrollment_evaluation_scope',
        'fn_list_my_evaluations_json',
        'fn_get_evaluation_form',
        'fn_submit_evaluation',
        'fn_list_my_grades',
        'fn_get_system_settings',
        'fn_update_system_settings',
        'fn_create_term',
        'fn_update_term',
        'fn_list_terms_json',
        'fn_get_term_by_id'
    ];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig, p.proname
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = ANY (v_fns)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);

        IF r.proname IN ('fn_get_evaluation_scope', 'fn_resolve_evaluation_period', 'fn_get_enrollment_evaluation_scope') THEN
            EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
        ELSE
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
        END IF;
    END LOOP;
END $$;