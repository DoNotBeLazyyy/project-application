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

        v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id)
            || ' AND e.deleted_at IS NULL'
            || ' AND sfg.deleted_at IS NULL'
            || ' AND sfg.status = ''Released''';

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
                e.id AS enrollment_id,
                gp.id AS grading_period_id,
                gp.name AS grading_period_name,
                gp.sequence AS grading_period_sequence,
                s.section_code,
                c.code AS course_code,
                c.title AS course_title,
                tt.label || '' - '' || sy.label AS term_label,
                COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
                COALESCE(epl.is_completed, false) AS is_completed,
                epl.completed_at,
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
                AND epl.grading_period_id = gp.id
                AND epl.deleted_at IS NULL
            %s',
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

        SELECT gp.name INTO v_period_name
        FROM public.grading_periods gp
        WHERE gp.id = p_grading_period_id AND gp.deleted_at IS NULL;

        IF v_period_name IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
        END IF;

        SELECT COALESCE(is_completed, false) INTO v_is_completed
        FROM public.evaluation_period_locks
        WHERE enrollment_id = p_enrollment_id
        AND grading_period_id = p_grading_period_id
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
        AND r.grading_period_id = p_grading_period_id
        AND r.deleted_at IS NULL;

        RETURN jsonb_build_object(
            'enrollment_id',       p_enrollment_id,
            'faculty_name',        v_context.faculty_name,
            'course_code',         v_context.course_code,
            'course_title',        v_context.course_title,
            'section_code',        v_context.section_code,
            'term_label',          v_context.term_label,
            'grading_period_id',   p_grading_period_id,
            'grading_period_name', v_period_name,
            'is_completed',        COALESCE(v_is_completed, false),
            'answers',             v_answers,
            'sections',            v_sections
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
                AND epl.grading_period_id = gp.id
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

    CREATE OR REPLACE FUNCTION public.fn_list_evaluation_templates_json(
        p_page integer DEFAULT 1,
        p_size integer DEFAULT 10,
        p_search text DEFAULT NULL::text,
        p_sort jsonb DEFAULT NULL::jsonb
    ) RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
    DECLARE
        v_base_query TEXT;
        v_where TEXT := 'WHERE t.deleted_at IS NULL';
    BEGIN
        PERFORM public.fn_assert_role('Admin');

        IF p_search IS NOT NULL AND p_search <> '' THEN
            v_where := v_where || format(
                ' AND (t.title ILIKE %L OR t.description ILIKE %L)',
                '%' || p_search || '%',
                '%' || p_search || '%'
            );
        END IF;

        v_base_query := format(
            'SELECT
                t.id,
                t.title,
                t.description,
                t.is_active,
                t.sequence,
                COALESCE((
                    SELECT jsonb_agg(tp.program_id)
                    FROM public.evaluation_template_programs tp
                    WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
                ), ''[]''::JSONB) AS program_ids,
                (
                    SELECT count(*)
                    FROM public.evaluation_questions q
                    WHERE q.template_id = t.id AND q.deleted_at IS NULL
                ) AS question_count,
                COUNT(*) OVER() AS total_count
            FROM public.evaluation_templates t
            %s',
            v_where
        );

        RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.sequence ASC, t.created_at ASC');
    END;
    $$;

    CREATE OR REPLACE FUNCTION public.fn_get_evaluation_template_by_id(p_id uuid) RETURNS jsonb
        LANGUAGE plpgsql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $$
    DECLARE
        v_result JSONB;
    BEGIN
        PERFORM public.fn_assert_role('Admin');

        SELECT jsonb_build_object(
            'id',          t.id,
            'title',       t.title,
            'description', t.description,
            'is_active',   t.is_active,
            'sequence',    t.sequence,
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
        INTO v_result
        FROM public.evaluation_templates t
        WHERE t.id = p_id AND t.deleted_at IS NULL;

        IF v_result IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
        END IF;

        RETURN v_result;
    END;
    $$;

    DO $$
    DECLARE
        r RECORD;
        v_fns TEXT[] := ARRAY[
            'fn_list_my_evaluations_json',
            'fn_get_evaluation_form',
            'fn_list_my_grades',
            'fn_list_evaluation_templates_json',
            'fn_get_evaluation_template_by_id'
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
    END $$;