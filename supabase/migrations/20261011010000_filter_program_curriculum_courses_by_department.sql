-- 1. Drop old fn_get_courses signature to prevent overload ambiguity
DROP FUNCTION IF EXISTS public.fn_get_courses(uuid[]);

-- 2. Create updated fn_get_courses supporting optional p_department_id and returning department_id
CREATE OR REPLACE FUNCTION public.fn_get_courses(
    p_exclude_ids uuid[] DEFAULT NULL::uuid[],
    p_department_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'base_code', COALESCE(c.base_code, c.code),
                'label', c.code || ' — ' || c.title,
                'department_id', c.department_id,
                'course_type_id', c.course_type_id,
                'course_type_code', ct.code,
                'course_type_label', ct.label,
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'credit_hours', c.credit_hours
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
        AND (p_department_id IS NULL OR c.department_id = p_department_id)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_courses(uuid[], uuid) TO authenticated, anon, service_role;

-- 3. Update fn_get_programs to also return department_id
CREATE OR REPLACE FUNCTION public.fn_get_programs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'code', p.code,
                'label', p.name,
                'department_id', p.department_id
            )
            ORDER BY p.name ASC
        ), '[]'::jsonb)
        FROM public.programs p
        WHERE p.deleted_at IS NULL
        AND p.is_active = TRUE
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_programs() TO authenticated, anon, service_role;

-- Drop legacy 7-parameter overloads of curriculum map functions
DROP FUNCTION IF EXISTS public.fn_create_curriculum_map_entry(uuid, uuid, smallint, uuid, uuid, smallint, boolean);
DROP FUNCTION IF EXISTS public.fn_update_curriculum_map_entry(uuid, uuid, smallint, uuid, uuid, smallint, boolean);

-- 4. Update fn_create_curriculum_map_entry (11 params) to enforce department match
CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(
    p_program_id uuid,
    p_course_id uuid,
    p_year_level smallint,
    p_term_type_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_sequence smallint DEFAULT 1,
    p_is_elective boolean DEFAULT false,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_units numeric DEFAULT NULL::numeric,
    p_type_units jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    -- Enforce department match: program and course must belong to the same department
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.programs p ON p.id = p_program_id
        WHERE c.id = p_course_id
        AND c.department_id = p.department_id
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course does not belong to the department of this program');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course already exists in curriculum for this program and school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective,
        lecture_units, laboratory_units, units, type_units,
        created_by
    )
    VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective,
        p_lecture_units, p_laboratory_units, p_units, COALESCE(p_type_units, '{}'::jsonb),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_curriculum_map_entry(uuid, uuid, smallint, uuid, uuid, smallint, boolean, numeric, numeric, numeric, jsonb) TO authenticated, anon, service_role;

-- 5. Update fn_update_curriculum_map_entry (11 params) to enforce department match
CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(
    p_curriculum_map_id uuid,
    p_course_id uuid,
    p_year_level smallint,
    p_term_type_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_sequence smallint DEFAULT 1,
    p_is_elective boolean DEFAULT false,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_units numeric DEFAULT NULL::numeric,
    p_type_units jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
BEGIN
    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    -- Enforce department match
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.programs p ON p.id = v_program_id
        WHERE c.id = p_course_id
        AND c.department_id = p.department_id
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course does not belong to the department of this program');
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
        lecture_units = p_lecture_units,
        laboratory_units = p_laboratory_units,
        units = p_units,
        type_units = COALESCE(p_type_units, type_units, '{}'::jsonb),
        updated_at = clock_timestamp(),
        updated_by = auth.uid()
    WHERE id = p_curriculum_map_id;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_curriculum_map_entry(uuid, uuid, smallint, uuid, uuid, smallint, boolean, numeric, numeric, numeric, jsonb) TO authenticated, anon, service_role;

-- 6. Update fn_bulk_create_curriculum_map to enforce department match
CREATE OR REPLACE FUNCTION public.fn_bulk_create_curriculum_map(p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_entry JSONB;
    v_program_id UUID;
    v_course_id UUID;
    v_term_type_id UUID;
    v_school_year_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
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

        SELECT id INTO v_course_id
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

        -- Check department matching
        IF NOT EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = v_course_id
            AND c.department_id = (SELECT department_id FROM public.programs WHERE id = v_program_id AND deleted_at IS NULL)
            AND c.deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course does not belong to the department of program ' || (v_entry->>'program_code')
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

        IF v_entry->>'school_year_code' IS NOT NULL AND v_entry->>'school_year_code' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE code = v_entry->>'school_year_code' AND deleted_at IS NULL;

            IF v_school_year_id IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num,
                    'code', v_entry->>'course_code',
                    'message', 'School year code not found: ' || (v_entry->>'school_year_code')
                ));
                CONTINUE;
            END IF;
        ELSE
            v_school_year_id := NULL;
        END IF;

        IF (v_entry->>'year_level')::SMALLINT < 1 OR (v_entry->>'year_level')::SMALLINT > 6 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Year level must be between 1 and 6'
            ));
            CONTINUE;
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
                'message', 'Course already exists in curriculum for this program and school year'
            ));
            CONTINUE;
        END IF;

        INSERT INTO public.curriculum_maps (
            program_id, course_id, year_level, term_type_id,
            school_year_id, sequence, is_elective,
            lecture_units, laboratory_units, units, type_units,
            created_by
        )
        VALUES (
            v_program_id,
            v_course_id,
            (v_entry->>'year_level')::SMALLINT,
            v_term_type_id,
            v_school_year_id,
            COALESCE((v_entry->>'sequence')::SMALLINT, 1),
            COALESCE((v_entry->>'is_elective')::BOOLEAN, FALSE),
            (v_entry->>'lecture_units')::NUMERIC,
            (v_entry->>'laboratory_units')::NUMERIC,
            (v_entry->>'units')::NUMERIC,
            COALESCE((v_entry->>'type_units')::JSONB, '{}'::jsonb),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', v_errors = '[]'::JSONB,
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_create_curriculum_map(jsonb) TO authenticated, anon, service_role;
