CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(
    p_program_id uuid,
    p_course_id uuid,
    p_year_level smallint,
    p_term_type_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_sequence smallint DEFAULT 1,
    p_is_elective boolean DEFAULT false
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_total_units NUMERIC;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    SELECT total_units INTO v_total_units
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_total_units IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF COALESCE(v_total_units, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot add course without credit units (total units must be greater than 0) to a curriculum map');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective, created_by
    ) VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(
    p_curriculum_map_id uuid,
    p_course_id uuid,
    p_year_level smallint,
    p_term_type_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_sequence smallint DEFAULT 1,
    p_is_elective boolean DEFAULT false
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_program_id UUID;
    v_total_units NUMERIC;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    SELECT total_units INTO v_total_units
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_total_units IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF COALESCE(v_total_units, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot add course without credit units (total units must be greater than 0) to a curriculum map');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = v_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND id <> p_curriculum_map_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    UPDATE public.curriculum_maps
    SET
        course_id = p_course_id,
        year_level = p_year_level,
        term_type_id = p_term_type_id,
        school_year_id = p_school_year_id,
        sequence = p_sequence,
        is_elective = p_is_elective,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_curriculum_map(p_entries jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_entry JSONB;
    v_program_id UUID;
    v_course_id UUID;
    v_total_units NUMERIC;
    v_term_type_id UUID;
    v_school_year_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_row_num := v_row_num + 1;

        SELECT id INTO v_program_id
        FROM public.programs
        WHERE code = v_entry->>'program_code' AND deleted_at IS NULL;

        IF v_program_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Program code not found: ' || COALESCE(v_entry->>'program_code', 'empty')
            ));
            CONTINUE;
        END IF;

        SELECT id, total_units INTO v_course_id, v_total_units
        FROM public.courses
        WHERE code = v_entry->>'course_code' AND deleted_at IS NULL;

        IF v_course_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course code not found: ' || COALESCE(v_entry->>'course_code', 'empty')
            ));
            CONTINUE;
        END IF;

        IF COALESCE(v_total_units, 0) <= 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course has no credit units (total units must be greater than 0)'
            ));
            CONTINUE;
        END IF;

        SELECT id INTO v_term_type_id
        FROM public.term_types
        WHERE code = v_entry->>'term_type_code' AND deleted_at IS NULL;

        IF v_term_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Term type code not found: ' || COALESCE(v_entry->>'term_type_code', 'empty')
            ));
            CONTINUE;
        END IF;

        v_school_year_id := NULL;
        IF v_entry->>'school_year_code' IS NOT NULL AND v_entry->>'school_year_code' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE code = v_entry->>'school_year_code' AND deleted_at IS NULL;

            IF v_school_year_id IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num,
                    'code', v_entry->>'course_code',
                    'message', 'School year code not found: ' || v_entry->>'school_year_code'
                ));
                CONTINUE;
            END IF;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.curriculum_maps
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course already exists in program curriculum map'
            ));
            CONTINUE;
        END IF;

        INSERT INTO public.curriculum_maps (
            program_id, course_id, year_level, term_type_id,
            school_year_id, sequence, is_elective, created_by
        ) VALUES (
            v_program_id, v_course_id, (v_entry->>'year_level')::SMALLINT, v_term_type_id,
            v_school_year_id, COALESCE((v_entry->>'sequence')::SMALLINT, 1),
            COALESCE((v_entry->>'is_elective')::BOOLEAN, false), auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status public.section_status_type DEFAULT 'Open'::public.section_status_type
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    INSERT INTO public.sections (
        term_id, course_id, faculty_id, section_code,
        room, max_slots, status, created_by
    ) VALUES (
        p_term_id, p_course_id, p_faculty_id, p_section_code,
        p_room, p_max_slots, p_status, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.');
END;
$$;
