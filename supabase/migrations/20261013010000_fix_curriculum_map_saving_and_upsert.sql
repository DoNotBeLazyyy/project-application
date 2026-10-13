-- Migration: Fix curriculum map saving and upsert resilience
-- Description:
-- 1. Updates fn_bulk_create_curriculum_map to:
--    - Match term types case-insensitively and support standard aliases (1ST_SEM, 1st_sem, 1st_semester, 1st Semester, 2ND_SEM, etc.)
--    - Allow direct matching by program_id, course_id, term_type_id, school_year_id if provided
--    - Allow courses with department_id IS NULL (general education)
--    - Perform an UPSERT if course already exists in the program and school year instead of failing
--    - Preserve lecture_units, laboratory_units, units, and type_units
-- 2. Updates fn_create_program to return the newly generated program UUID (id / program_id) in addition to code.

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

        -- 1. Resolve Program ID
        IF v_entry->>'program_id' IS NOT NULL AND v_entry->>'program_id' <> '' THEN
            SELECT id INTO v_program_id
            FROM public.programs
            WHERE id = (v_entry->>'program_id')::UUID AND deleted_at IS NULL;
        ELSE
            SELECT id INTO v_program_id
            FROM public.programs
            WHERE lower(code) = lower(btrim(COALESCE(v_entry->>'program_code', ''))) AND deleted_at IS NULL;
        END IF;

        IF v_program_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Program not found: ' || COALESCE(v_entry->>'program_code', v_entry->>'program_id', 'empty')
            ));
            CONTINUE;
        END IF;

        -- 2. Resolve Course ID
        IF v_entry->>'course_id' IS NOT NULL AND v_entry->>'course_id' <> '' THEN
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE id = (v_entry->>'course_id')::UUID AND deleted_at IS NULL;
        ELSE
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE upper(code) = upper(btrim(COALESCE(v_entry->>'course_code', ''))) AND deleted_at IS NULL;
        END IF;

        IF v_course_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Course not found: ' || COALESCE(v_entry->>'course_code', v_entry->>'course_id', 'empty')
            ));
            CONTINUE;
        END IF;

        -- 3. Check department matching (allow null department for universal/GE courses)
        IF NOT EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.programs p ON p.id = v_program_id
            WHERE c.id = v_course_id
            AND (c.department_id IS NULL OR c.department_id = p.department_id)
            AND c.deleted_at IS NULL
            AND p.deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Course does not belong to the department of program ' || COALESCE(v_entry->>'program_code', v_program_id::text)
            ));
            CONTINUE;
        END IF;

        -- 4. Resolve Term Type ID (support UUID, code, label, and common aliases)
        IF v_entry->>'term_type_id' IS NOT NULL AND v_entry->>'term_type_id' <> '' THEN
            SELECT id INTO v_term_type_id
            FROM public.term_types
            WHERE id = (v_entry->>'term_type_id')::UUID AND deleted_at IS NULL;
        ELSE
            SELECT id INTO v_term_type_id
            FROM public.term_types
            WHERE (
                upper(code) = upper(btrim(COALESCE(v_entry->>'term_type_code', '')))
                OR lower(label) = lower(btrim(COALESCE(v_entry->>'term_type_code', '')))
                OR (upper(btrim(COALESCE(v_entry->>'term_type_code', ''))) IN ('1ST_SEM', '1ST_SEMESTER', '1ST SEMESTER', 'FIRST SEMESTER', '1ST-SEM') AND upper(code) = '1ST_SEM')
                OR (upper(btrim(COALESCE(v_entry->>'term_type_code', ''))) IN ('2ND_SEM', '2ND_SEMESTER', '2ND SEMESTER', 'SECOND SEMESTER', '2ND-SEM') AND upper(code) = '2ND_SEM')
                OR (upper(btrim(COALESCE(v_entry->>'term_type_code', ''))) IN ('SUMMER', 'SUMMER_TERM', 'SUMMER TERM') AND upper(code) = 'SUMMER')
            )
            AND deleted_at IS NULL
            LIMIT 1;
        END IF;

        IF v_term_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Term type code not found: ' || COALESCE(v_entry->>'term_type_code', v_entry->>'term_type_id', 'empty')
            ));
            CONTINUE;
        END IF;

        -- 5. Resolve School Year ID
        IF v_entry->>'school_year_id' IS NOT NULL AND v_entry->>'school_year_id' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE id = (v_entry->>'school_year_id')::UUID AND deleted_at IS NULL;
        ELSIF v_entry->>'school_year_code' IS NOT NULL AND v_entry->>'school_year_code' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE code = v_entry->>'school_year_code' AND deleted_at IS NULL;

            IF v_school_year_id IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num,
                    'code', COALESCE(v_entry->>'course_code', 'unknown'),
                    'message', 'School year code not found: ' || (v_entry->>'school_year_code')
                ));
                CONTINUE;
            END IF;
        ELSE
            v_school_year_id := NULL;
        END IF;

        IF (v_entry->>'year_level')::SMALLINT < 1 OR (v_entry->>'year_level')::SMALLINT > 8 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Year level must be between 1 and 8'
            ));
            CONTINUE;
        END IF;

        -- 6. Upsert into curriculum_maps: if already exists, update properties
        IF EXISTS (
            SELECT 1 FROM public.curriculum_maps
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL
        ) THEN
            UPDATE public.curriculum_maps
            SET
                year_level = (v_entry->>'year_level')::SMALLINT,
                term_type_id = v_term_type_id,
                sequence = COALESCE((v_entry->>'sequence')::SMALLINT, sequence, 1),
                is_elective = COALESCE((v_entry->>'is_elective')::BOOLEAN, is_elective, FALSE),
                lecture_units = COALESCE((v_entry->>'lecture_units')::NUMERIC, lecture_units),
                laboratory_units = COALESCE((v_entry->>'laboratory_units')::NUMERIC, laboratory_units),
                units = COALESCE((v_entry->>'units')::NUMERIC, units),
                type_units = COALESCE(NULLIF((v_entry->>'type_units')::JSONB, '{}'::jsonb), type_units, '{}'::jsonb),
                updated_at = clock_timestamp(),
                updated_by = auth.uid()
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL;

            v_success_count := v_success_count + 1;
            CONTINUE;
        END IF;

        -- 7. Insert new curriculum_map record
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

-- Update fn_create_program to return ID and program_id
CREATE OR REPLACE FUNCTION public.fn_create_program(
    p_code text,
    p_name text,
    p_department_id uuid,
    p_program_level_id uuid,
    p_years_duration smallint,
    p_total_units numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
    v_program_id uuid;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE id = p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_program_code(p_name);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.programs
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.programs (
        code, name, department_id, program_level_id,
        years_duration, total_units, description, is_active, created_by
    )
    VALUES (
        v_final_code, p_name, p_department_id, p_program_level_id,
        p_years_duration, p_total_units, NULLIF(p_description, ''), p_is_active, auth.uid()
    )
    RETURNING id INTO v_program_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Program created successfully',
        'code', v_final_code,
        'id', v_program_id,
        'program_id', v_program_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_create_curriculum_map(jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_create_program(text, text, uuid, uuid, smallint, numeric, text, boolean) TO authenticated, anon, service_role;
