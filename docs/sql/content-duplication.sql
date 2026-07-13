CREATE OR REPLACE FUNCTION public.fn_list_my_teaching_sections(p_exclude_section_id uuid DEFAULT NULL::uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'term_label', tt.label || ' - ' || sy.label
            )
            ORDER BY sy.label DESC, tt.label, c.code, s.section_code
        ), '[]'::jsonb)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
          AND (p_exclude_section_id IS NULL OR s.id <> p_exclude_section_id)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_duplicate_assessment_to_sections(p_assessment_id uuid, p_section_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_src               public.assessment_items%ROWTYPE;
    v_target_id         UUID;
    v_new_assessment_id UUID;
    v_component_id      UUID;
    v_module_id         UUID;
    v_new_question_id   UUID;
    v_question          RECORD;
    v_copied            INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT * INTO v_src
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_src.section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target_id IN ARRAY p_section_ids
    LOOP
        IF v_target_id = v_src.section_id THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target_id) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach one of the selected sections.'
                USING ERRCODE = '42501';
        END IF;

        v_component_id := NULL;

        IF v_src.grading_component_id IS NOT NULL THEN
            SELECT tgc.id INTO v_component_id
            FROM public.grading_components sgc
            INNER JOIN public.grading_periods sgp
                ON sgp.id = sgc.grading_period_id AND sgp.deleted_at IS NULL
            INNER JOIN public.grading_periods tgp
                ON tgp.name = sgp.name AND tgp.deleted_at IS NULL
            INNER JOIN public.grading_components tgc
                ON tgc.grading_period_id = tgp.id
                AND tgc.section_id = v_target_id
                AND tgc.name = sgc.name
                AND tgc.deleted_at IS NULL
            WHERE sgc.id = v_src.grading_component_id
              AND sgc.deleted_at IS NULL
            LIMIT 1;
        END IF;

        v_module_id := NULL;

        IF v_src.module_id IS NOT NULL THEN
            SELECT tm.id INTO v_module_id
            FROM public.modules sm
            INNER JOIN public.modules tm
                ON tm.section_id = v_target_id
                AND tm.title = sm.title
                AND tm.deleted_at IS NULL
            WHERE sm.id = v_src.module_id
              AND sm.deleted_at IS NULL
            LIMIT 1;
        END IF;

        INSERT INTO public.assessment_items (
            section_id, grading_component_id, module_id, title, description, assessment_type,
            total_points, passing_points, time_limit_minutes, max_attempts,
            is_published, published_at, scheduled_publish_at,
            opens_at, due_at, closes_at, show_results_at,
            shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
            max_file_count_per_question
        )
        VALUES (
            v_target_id, v_component_id, v_module_id, v_src.title, v_src.description, v_src.assessment_type,
            v_src.total_points, v_src.passing_points, v_src.time_limit_minutes, v_src.max_attempts,
            false, NULL, NULL,
            v_src.opens_at, v_src.due_at, v_src.closes_at, v_src.show_results_at,
            v_src.shuffle_questions, v_src.shuffle_choices, v_src.show_all_questions, v_src.questions_per_page,
            v_src.max_file_count_per_question
        )
        RETURNING id INTO v_new_assessment_id;

        FOR v_question IN
            SELECT *
            FROM public.assessment_questions
            WHERE assessment_item_id = p_assessment_id
              AND deleted_at IS NULL
            ORDER BY sequence, created_at
        LOOP
            INSERT INTO public.assessment_questions (
                assessment_item_id, question_text, question_type, points, sequence,
                explanation, is_required, allowed_file_types, max_file_size_mb, max_file_count
            )
            VALUES (
                v_new_assessment_id, v_question.question_text, v_question.question_type,
                v_question.points, v_question.sequence, v_question.explanation, v_question.is_required,
                v_question.allowed_file_types, v_question.max_file_size_mb, v_question.max_file_count
            )
            RETURNING id INTO v_new_question_id;

            INSERT INTO public.assessment_question_choices (question_id, choice_text, is_correct, sequence)
            SELECT v_new_question_id, c.choice_text, c.is_correct, c.sequence
            FROM public.assessment_question_choices c
            WHERE c.question_id = v_question.id
              AND c.deleted_at IS NULL;

            IF to_regclass('public.assessment_question_competencies') IS NOT NULL THEN
                EXECUTE format(
                    'INSERT INTO public.assessment_question_competencies (question_id, competency_id, weight)
                     SELECT %L::uuid, aqc.competency_id, aqc.weight
                     FROM public.assessment_question_competencies aqc
                     WHERE aqc.question_id = %L::uuid AND aqc.deleted_at IS NULL',
                    v_new_question_id, v_question.id
                );
            END IF;
        END LOOP;

        INSERT INTO public.assessment_attachments (
            assessment_item_id, file_name, file_url, file_size_bytes, mime_type, sequence
        )
        SELECT v_new_assessment_id, a.file_name, a.file_url, a.file_size_bytes, a.mime_type, a.sequence
        FROM public.assessment_attachments a
        WHERE a.assessment_item_id = p_assessment_id
          AND a.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Assessment copied to %s section(s) as an unpublished draft.', v_copied),
        'copied_count', v_copied
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_duplicate_module_to_sections(p_module_id uuid, p_section_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_src           public.modules%ROWTYPE;
    v_target_id     UUID;
    v_new_module_id UUID;
    v_sequence      SMALLINT;
    v_copied        INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT * INTO v_src
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_src.section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target_id IN ARRAY p_section_ids
    LOOP
        IF v_target_id = v_src.section_id THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target_id) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach one of the selected sections.'
                USING ERRCODE = '42501';
        END IF;

        SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
        FROM public.modules
        WHERE section_id = v_target_id AND deleted_at IS NULL;

        INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
        VALUES (v_target_id, v_src.title, v_src.description, v_sequence, false, NULL)
        RETURNING id INTO v_new_module_id;

        INSERT INTO public.course_materials (
            module_id, title, description, material_type,
            file_url, external_url, file_name, mime_type, file_size_bytes,
            sequence, is_published, available_from, available_until
        )
        SELECT
            v_new_module_id, cm.title, cm.description, cm.material_type,
            cm.file_url, cm.external_url, cm.file_name, cm.mime_type, cm.file_size_bytes,
            cm.sequence, false, cm.available_from, cm.available_until
        FROM public.course_materials cm
        WHERE cm.module_id = p_module_id
          AND cm.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Module copied to %s section(s) as an unpublished draft.', v_copied),
        'copied_count', v_copied
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_my_teaching_sections(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_duplicate_assessment_to_sections(uuid, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_duplicate_module_to_sections(uuid, uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_my_teaching_sections(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_duplicate_assessment_to_sections(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_duplicate_module_to_sections(uuid, uuid[]) TO authenticated;
