CREATE OR REPLACE FUNCTION public.fn_seed_term_grading_periods(p_term_id uuid)
    RETURNS integer
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_inserted INTEGER := 0;
BEGIN
    INSERT INTO public.grading_periods (term_id, name, sequence, weight, created_by)
    SELECT p_term_id, gpt.name, gpt.sequence, gpt.weight, auth.uid()
    FROM public.grading_period_templates gpt
    WHERE gpt.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.grading_periods gp
          WHERE gp.term_id = p_term_id
            AND gp.deleted_at IS NULL
            AND (gp.sequence = gpt.sequence OR gp.name = gpt.name)
      );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_section_grading_locked(p_section_id uuid, p_grading_period_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.section_final_grades sfg
        INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_seed_section_grading(p_section_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_id UUID;
    v_period RECORD;
    v_seeded INTEGER := 0;
BEGIN
    SELECT term_id INTO v_term_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    FOR v_period IN
        SELECT gp.id AS period_id, gp.sequence AS seq
        FROM public.grading_periods gp
        WHERE gp.term_id = v_term_id
          AND gp.deleted_at IS NULL
    LOOP
        IF public.fn_is_section_grading_locked(p_section_id, v_period.period_id) THEN
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.grading_components gc
            WHERE gc.section_id = p_section_id
              AND gc.grading_period_id = v_period.period_id
              AND gc.deleted_at IS NULL
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
        SELECT p_section_id, v_period.period_id, gct.name, gct.weight, auth.uid()
        FROM public.grading_component_templates gct
        INNER JOIN public.grading_period_templates gpt
            ON gpt.id = gct.grading_period_template_id
           AND gpt.deleted_at IS NULL
        WHERE gpt.sequence = v_period.seq
          AND gct.deleted_at IS NULL;

        IF FOUND THEN
            v_seeded := v_seeded + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'seeded_periods', v_seeded);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reseed_section_grading(p_section_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_roles TEXT[];
    v_faculty_id UUID;
    v_term_id UUID;
    v_result JSONB;
    v_seeded INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in to perform this action.');
    END IF;

    SELECT faculty_id, term_id INTO v_faculty_id, v_term_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF NOT (v_roles && ARRAY['Admin', 'Dean']) AND v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: you may only reset grading for your own section.');
    END IF;

    v_result := public.fn_seed_section_grading(p_section_id);

    IF NOT (v_result->>'success')::BOOLEAN THEN
        RETURN v_result;
    END IF;

    v_seeded := COALESCE((v_result->>'seeded_periods')::INTEGER, 0);

    IF v_seeded = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nothing to seed: every grading period already has components or is locked by recorded grades.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', format('Grading schema seeded from the institutional template for %s period(s).', v_seeded));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_grading_component(p_section_id uuid, p_grading_period_id uuid, p_name text, p_weight numeric)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_total_weight NUMERIC;
    v_new_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF public.fn_is_section_grading_locked(p_section_id, p_grading_period_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grading period is locked because grades have already been recorded. Components can no longer be changed.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.grading_components
    WHERE section_id = p_section_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL;

    IF v_total_weight + p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total weight of grading components cannot exceed 100%.');
    END IF;

    INSERT INTO public.grading_components (
        section_id,
        grading_period_id,
        name,
        weight,
        created_by
    ) VALUES (
        p_section_id,
        p_grading_period_id,
        p_name,
        p_weight,
        auth.uid()
    )
    RETURNING id INTO v_new_id;

    INSERT INTO public.grade_audit_logs (
        action, table_name, record_id, enrollment_id, grading_period_id,
        field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
        'Insert', 'grading_components', v_new_id, NULL, p_grading_period_id,
        'component', NULL, format('%s (%s%%)', p_name, p_weight),
        'Grading component created', auth.uid(), inet_client_addr()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Grading component created successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_grading_component(p_component_id uuid, p_name text, p_weight numeric)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id        UUID;
    v_grading_period_id UUID;
    v_old_name          TEXT;
    v_old_weight        NUMERIC;
    v_total_weight      NUMERIC;
BEGIN
    SELECT gc.section_id, gc.grading_period_id, gc.name, gc.weight
    INTO v_section_id, v_grading_period_id, v_old_name, v_old_weight
    FROM public.grading_components gc
    INNER JOIN public.sections s ON s.id = gc.section_id
    WHERE gc.id = p_component_id
    AND s.faculty_id = auth.uid()
    AND gc.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component not found or access denied.');
    END IF;

    IF public.fn_is_section_grading_locked(v_section_id, v_grading_period_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grading period is locked because grades have already been recorded. Components can no longer be changed.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.grading_components
    WHERE section_id = v_section_id
    AND grading_period_id = v_grading_period_id
    AND id <> p_component_id
    AND deleted_at IS NULL;

    IF v_total_weight + p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total weight of grading components cannot exceed 100%.');
    END IF;

    UPDATE public.grading_components
    SET name = p_name, weight = p_weight
    WHERE id = p_component_id
    AND deleted_at IS NULL;

    IF v_old_name IS DISTINCT FROM p_name THEN
        INSERT INTO public.grade_audit_logs (
            action, table_name, record_id, enrollment_id, grading_period_id,
            field_changed, old_value, new_value, change_reason, changed_by, ip_address
        ) VALUES (
            'Update', 'grading_components', p_component_id, NULL, v_grading_period_id,
            'name', v_old_name, p_name,
            'Grading component renamed', auth.uid(), inet_client_addr()
        );
    END IF;

    IF v_old_weight IS DISTINCT FROM p_weight THEN
        INSERT INTO public.grade_audit_logs (
            action, table_name, record_id, enrollment_id, grading_period_id,
            field_changed, old_value, new_value, change_reason, changed_by, ip_address
        ) VALUES (
            'Update', 'grading_components', p_component_id, NULL, v_grading_period_id,
            'weight', v_old_weight::TEXT, p_weight::TEXT,
            'Grading component weight changed', auth.uid(), inet_client_addr()
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Grading component updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_grading_component(p_component_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id        UUID;
    v_grading_period_id UUID;
    v_name              TEXT;
    v_weight            NUMERIC;
BEGIN
    SELECT gc.section_id, gc.grading_period_id, gc.name, gc.weight
    INTO v_section_id, v_grading_period_id, v_name, v_weight
    FROM public.grading_components gc
    INNER JOIN public.sections s ON s.id = gc.section_id
    WHERE gc.id = p_component_id
    AND s.faculty_id = auth.uid()
    AND gc.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component not found or access denied.');
    END IF;

    IF public.fn_is_section_grading_locked(v_section_id, v_grading_period_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grading period is locked because grades have already been recorded. Components can no longer be changed.');
    END IF;

    UPDATE public.grading_components
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_component_id
    AND deleted_at IS NULL;

    INSERT INTO public.grade_audit_logs (
        action, table_name, record_id, enrollment_id, grading_period_id,
        field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
        'Delete', 'grading_components', p_component_id, NULL, v_grading_period_id,
        'component', format('%s (%s%%)', v_name, v_weight), NULL,
        'Grading component deleted', auth.uid(), inet_client_addr()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Grading component deleted successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_section(p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status public.section_status_type DEFAULT 'Open'::public.section_status_type)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    INSERT INTO public.sections (
        term_id,
        course_id,
        faculty_id,
        section_code,
        room,
        max_slots,
        status,
        created_by
    ) VALUES (
        p_term_id,
        p_course_id,
        p_faculty_id,
        p_section_code,
        p_room,
        p_max_slots,
        p_status,
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_sections(p_sections jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_term_id UUID;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
    v_section_id UUID;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT t.id INTO v_term_id
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = trim(v_row->>'course_code') AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'COURSE_NOT_FOUND',
                    'message', 'Course not found: ' || coalesce(v_row->>'course_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_faculty_id := NULL;
            IF (v_row->>'faculty_email') IS NOT NULL AND trim(v_row->>'faculty_email') <> '' THEN
                SELECT u.id INTO v_faculty_id
                FROM public.users u
                WHERE u.email = trim(v_row->>'faculty_email') AND u.deleted_at IS NULL
                LIMIT 1;

                IF v_faculty_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'FACULTY_NOT_FOUND',
                        'message', 'Faculty not found: ' || trim(v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.sections
                WHERE term_id = v_term_id
                AND section_code = trim(v_row->>'section_code')
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'DUPLICATE_SECTION_CODE',
                    'message', 'Section code already exists for this term: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_max_slots := COALESCE(NULLIF(trim(v_row->>'max_slots'), '')::SMALLINT, 40);

            INSERT INTO public.sections (
                term_id,
                course_id,
                faculty_id,
                section_code,
                room,
                max_slots,
                status,
                created_by
            ) VALUES (
                v_term_id,
                v_course_id,
                v_faculty_id,
                trim(v_row->>'section_code'),
                NULLIF(trim(v_row->>'room'), ''),
                v_max_slots,
                'Open'::public.section_status_type,
                auth.uid()
            )
            RETURNING id INTO v_section_id;

            PERFORM public.fn_seed_section_grading(v_section_id);

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_seed_term_grading_periods(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_seed_section_grading(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_reseed_section_grading(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_is_section_grading_locked(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_reseed_section_grading(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_section_grading_locked(uuid, uuid) TO authenticated;
