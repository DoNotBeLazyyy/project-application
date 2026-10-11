-- Migration: 20261011020000_system_generated_unique_entity_codes.sql
-- Description: Enforce system-generated unique codes across entities (courses, departments, programs,
--              sections, course_types, program_levels, term_types, roles, special_grade_configs, school_years).
--              Codes are auto-generated on create and immutable on update.

-- 1. Helper function to generate clean acronyms
CREATE OR REPLACE FUNCTION public.fn_generate_acronym(p_text text, p_default text DEFAULT 'GEN')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    v_words text[];
    v_word text;
    v_result text := '';
BEGIN
    IF p_text IS NULL OR btrim(p_text) = '' THEN
        RETURN p_default;
    END IF;

    v_words := regexp_split_to_array(btrim(regexp_replace(upper(p_text), '[^A-Z0-9]+', ' ', 'g')), '\s+');
    
    IF array_length(v_words, 1) > 1 THEN
        FOREACH v_word IN ARRAY v_words
        LOOP
            IF v_word NOT IN ('AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'A', 'AN', 'THE', 'ON', 'AT', 'BY', 'FROM') THEN
                v_result := v_result || substring(v_word from 1 for 1);
            END IF;
        END LOOP;
    END IF;

    IF v_result = '' AND array_length(v_words, 1) >= 1 THEN
        IF array_length(v_words, 1) = 1 THEN
            v_result := substring(v_words[1] from 1 for 4);
        ELSE
            FOREACH v_word IN ARRAY v_words
            LOOP
                v_result := v_result || substring(v_word from 1 for 1);
            END LOOP;
        END IF;
    END IF;

    IF v_result = '' THEN
        v_result := p_default;
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_generate_acronym(text, text) TO authenticated, anon, service_role;


-- 2. DEPARTMENTS
-- fn_create_department: auto-generate unique code if blank or colliding
CREATE OR REPLACE FUNCTION public.fn_create_department(
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_name, 'DEP');
    END IF;

    -- Ensure uniqueness
    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.departments
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.departments (code, name, description, created_by)
    VALUES (v_final_code, p_name, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Department created successfully', 'code', v_final_code);
END;
$function$;

-- fn_update_department: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_department(
    p_department_id uuid,
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    UPDATE public.departments
    SET
        name = p_name,
        description = NULLIF(p_description, '')
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_department(text, text, text, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_department(uuid, text, text, text, uuid) TO authenticated, anon, service_role;


-- 3. PROGRAMS
-- fn_create_program: auto-generate unique code if blank or colliding
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
        v_final_code := public.fn_generate_acronym(p_name, 'PRG');
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
    );

    RETURN jsonb_build_object('success', true, 'message', 'Program created successfully', 'code', v_final_code);
END;
$function$;

-- fn_update_program: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_program(
    p_program_id uuid,
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
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    UPDATE public.programs
    SET
        name = p_name,
        department_id = p_department_id,
        program_level_id = p_program_level_id,
        years_duration = p_years_duration,
        total_units = p_total_units,
        description = NULLIF(p_description, ''),
        is_active = p_is_active
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_program(text, text, uuid, uuid, smallint, numeric, text, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_program(uuid, text, text, uuid, uuid, smallint, numeric, text, boolean) TO authenticated, anon, service_role;


-- 4. COURSES
-- fn_create_course: auto-generate unique code / child codes
CREATE OR REPLACE FUNCTION public.fn_create_course(
    p_code text,
    p_title text,
    p_department_id uuid,
    p_course_type_id uuid,
    p_is_split boolean DEFAULT false,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_credit_hours numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true,
    p_prerequisites jsonb DEFAULT NULL::jsonb,
    p_course_types jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_type_count INTEGER := 0;
    v_type_elem JSONB;
    v_ct_record RECORD;
    v_dept_code TEXT;
    v_base_code TEXT;
    v_child_code TEXT;
    v_child_title TEXT;
    v_child_units NUMERIC;
    v_child_credit NUMERIC;
    v_child_lec NUMERIC;
    v_child_lab NUMERIC;
    v_created_id UUID;
    v_prereq JSONB;
    v_created_ids UUID[] := '{}';
    v_seq INT := 1;
BEGIN
    SELECT code INTO v_dept_code FROM public.departments
    WHERE id = p_department_id AND deleted_at IS NULL;

    IF v_dept_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    v_base_code := btrim(COALESCE(p_code, ''));
    IF v_base_code = '' THEN
        v_base_code := v_dept_code || public.fn_generate_acronym(p_title, 'CRS');
    END IF;

    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 1 THEN
        -- Multi-course creation: create a course record for each course type
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = (v_type_elem->>'course_type_id')::uuid
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            v_child_code := v_base_code || '_' || UPPER(TRIM(v_ct_record.code));
            v_child_title := p_title || ' (' || TRIM(v_ct_record.label) || ')';
            v_child_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_child_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_child_units);

            IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                v_child_lec := 0;
                v_child_lab := v_child_units;
            ELSE
                v_child_lec := v_child_units;
                v_child_lab := 0;
            END IF;

            -- Auto-resolve collision if code exists
            IF EXISTS (
                SELECT 1 FROM public.courses
                WHERE lower(code) = lower(v_child_code) AND deleted_at IS NULL
            ) THEN
                v_seq := 2;
                WHILE EXISTS (
                    SELECT 1 FROM public.courses
                    WHERE lower(code) = lower(v_child_code || '-' || v_seq::text) AND deleted_at IS NULL
                ) LOOP
                    v_seq := v_seq + 1;
                END LOOP;
                v_child_code := v_child_code || '-' || v_seq::text;
            END IF;

            INSERT INTO public.courses (
                code, title, department_id, course_type_id,
                lecture_units, laboratory_units, credit_hours,
                description, is_active, base_code, created_by
            )
            VALUES (
                v_child_code, v_child_title, p_department_id, v_ct_record.id,
                v_child_lec, v_child_lab, v_child_credit,
                NULLIF(p_description, ''), p_is_active, v_base_code, auth.uid()
            )
            RETURNING id INTO v_created_id;

            v_created_ids := array_append(v_created_ids, v_created_id);

            IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
                FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
                LOOP
                    INSERT INTO public.course_prerequisites (
                        course_id, prerequisite_id, prerequisite_type,
                        prerequisite_kind, year_level_required, minimum_grade, created_by
                    )
                    VALUES (
                        v_created_id,
                        CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                            THEN (v_prereq->>'course_id')::UUID
                            ELSE NULL END,
                        (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                        COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                        CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                            THEN (v_prereq->>'year_level_required')::SMALLINT
                            ELSE NULL END,
                        CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                             ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                        auth.uid()
                    );
                END LOOP;
            END IF;
        END LOOP;

        RETURN jsonb_build_object('success', true, 'message', v_type_count || ' courses created successfully with their respective types');
    ELSE
        -- Single course creation
        IF v_type_count = 1 THEN
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = (p_course_types->0->>'course_type_id')::uuid
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NOT NULL THEN
                p_course_type_id := v_ct_record.id;
                v_child_units := COALESCE((p_course_types->0->>'units')::numeric, p_lecture_units, 0);
                p_credit_hours := COALESCE((p_course_types->0->>'credit_hours')::numeric, p_credit_hours, v_child_units);
                IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                    p_lecture_units := 0;
                    p_laboratory_units := v_child_units;
                ELSE
                    p_lecture_units := v_child_units;
                    p_laboratory_units := 0;
                END IF;
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.course_types
            WHERE id = p_course_type_id AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE lower(code) = lower(v_base_code) AND deleted_at IS NULL
        ) THEN
            v_seq := 2;
            WHILE EXISTS (
                SELECT 1 FROM public.courses
                WHERE lower(code) = lower(v_base_code || '-' || v_seq::text) AND deleted_at IS NULL
            ) LOOP
                v_seq := v_seq + 1;
            END LOOP;
            v_base_code := v_base_code || '-' || v_seq::text;
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, base_code, created_by
        )
        VALUES (
            v_base_code, p_title, p_department_id, p_course_type_id,
            COALESCE(p_lecture_units, 0), COALESCE(p_laboratory_units, 0), p_credit_hours,
            NULLIF(p_description, ''), p_is_active, v_base_code, auth.uid()
        )
        RETURNING id INTO v_created_id;

        IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
            FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
            LOOP
                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_created_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Course created successfully', 'code', v_base_code);
    END IF;
END;
$function$;

-- fn_update_course: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_course(
    p_course_id uuid,
    p_code text,
    p_title text,
    p_department_id uuid,
    p_course_type_id uuid,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_credit_hours numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true,
    p_prerequisites jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_prereq JSONB;
BEGIN
    IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lecture units must be between 0 and 10');
    END IF;

    IF p_laboratory_units IS NOT NULL AND (p_laboratory_units < 0 OR p_laboratory_units > 10) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Laboratory units must be between 0 and 10');
    END IF;

    IF p_credit_hours IS NOT NULL AND (p_credit_hours < 0 OR p_credit_hours > 20) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credit hours must be between 0 and 20');
    END IF;

    -- Update course fields while leaving code immutable
    UPDATE public.courses
    SET
        title = p_title,
        department_id = p_department_id,
        course_type_id = p_course_type_id,
        lecture_units = p_lecture_units,
        laboratory_units = COALESCE(p_laboratory_units, 0),
        credit_hours = p_credit_hours,
        description = NULLIF(p_description, ''),
        is_active = p_is_active
    WHERE id = p_course_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                END IF;
                IF (v_prereq->>'course_id')::UUID = p_course_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
            END IF;

            IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                END IF;
            END IF;

            INSERT INTO public.course_prerequisites (
                course_id, prerequisite_id, prerequisite_type,
                prerequisite_kind, year_level_required, minimum_grade, created_by
            )
            VALUES (
                p_course_id,
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                    THEN (v_prereq->>'course_id')::UUID
                    ELSE NULL END,
                (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                    THEN (v_prereq->>'year_level_required')::SMALLINT
                    ELSE NULL END,
                CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                     ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_course(text, text, uuid, uuid, boolean, numeric, numeric, numeric, text, boolean, jsonb, jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_course(uuid, text, text, uuid, uuid, numeric, numeric, numeric, text, boolean, jsonb) TO authenticated, anon, service_role;


-- 5. SECTIONS
-- fn_create_section: auto-generate unique section code
CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text DEFAULT NULL,
    p_room text DEFAULT NULL,
    p_max_slots smallint DEFAULT 40,
    p_status public.section_status_type DEFAULT 'Open'::public.section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_final_code TEXT;
    v_course_prefix TEXT;
    v_seq INT := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sections can only be created for the active academic year.');
    END IF;

    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    -- Resolve section code (always deterministic unique generation)
    v_final_code := btrim(COALESCE(p_section_code, ''));
    IF v_final_code = '' THEN
        SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
        INTO v_course_prefix
        FROM public.courses
        WHERE id = p_course_id;

        IF v_course_prefix IS NULL THEN
            v_course_prefix := 'SEC';
        END IF;

        v_final_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
        WHILE EXISTS (
            SELECT 1 FROM public.sections
            WHERE term_id = p_term_id
              AND lower(section_code) = lower(v_final_code)
              AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
            v_final_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
        END LOOP;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.sections
            WHERE term_id = p_term_id
              AND lower(btrim(section_code)) = lower(v_final_code)
              AND deleted_at IS NULL
        ) THEN
            v_seq := 2;
            WHILE EXISTS (
                SELECT 1 FROM public.sections
                WHERE term_id = p_term_id
                  AND lower(btrim(section_code)) = lower(v_final_code || '-' || v_seq::text)
                  AND deleted_at IS NULL
            ) LOOP
                v_seq := v_seq + 1;
            END LOOP;
            v_final_code := v_final_code || '-' || v_seq::text;
        END IF;
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
        v_final_code,
        NULLIF(btrim(p_room), ''),
        COALESCE(p_max_slots, 40),
        COALESCE(p_status, 'Open'::public.section_status_type),
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section created successfully.',
        'id', v_section_id,
        'section_code', v_final_code
    );
END;
$function$;

-- fn_update_section: section_code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_section(
    p_section_id uuid,
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status public.section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be modified.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot move a section to a term outside the active academic year.');
    END IF;

    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND id <> p_section_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    -- Update fields without touching section_code
    UPDATE public.sections
    SET term_id = p_term_id,
        course_id = p_course_id,
        faculty_id = p_faculty_id,
        room = NULLIF(btrim(p_room), ''),
        max_slots = COALESCE(p_max_slots, 40),
        status = COALESCE(p_status, 'Open'::public.section_status_type),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section updated successfully.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_section(uuid, uuid, uuid, uuid, text, text, smallint, public.section_status_type) TO authenticated, anon, service_role;


-- 6. COURSE TYPES
-- fn_create_course_type: auto-generate unique code
CREATE OR REPLACE FUNCTION public.fn_create_course_type(
    p_code text,
    p_label text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_label, 'CT');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.course_types
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.course_types (code, label, description, created_by)
    VALUES (v_final_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Course type created successfully', 'code', v_final_code);
END;
$function$;

-- fn_update_course_type: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_course_type(
    p_course_type_id uuid,
    p_code text,
    p_label text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    UPDATE public.course_types
    SET
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_course_type(text, text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_course_type(uuid, text, text, text) TO authenticated, anon, service_role;


-- 7. PROGRAM LEVELS
-- fn_create_program_level: auto-generate unique code
CREATE OR REPLACE FUNCTION public.fn_create_program_level(
    p_code text,
    p_label text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_label, 'LVL');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.program_levels
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.program_levels (code, label, description, created_by)
    VALUES (v_final_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Program level created successfully', 'code', v_final_code);
END;
$function$;

-- fn_update_program_level: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_program_level(
    p_program_level_id uuid,
    p_code text,
    p_label text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_program_level_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No program level was selected.');
    END IF;

    IF p_label IS NULL OR btrim(p_label) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Label is required.');
    END IF;

    UPDATE public.program_levels
    SET
        label = btrim(p_label),
        description = NULLIF(btrim(coalesce(p_description, '')), '')
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_program_level(text, text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_program_level(uuid, text, text, text) TO authenticated, anon, service_role;


-- 8. TERM TYPES
-- fn_create_term_type: auto-generate unique code
CREATE OR REPLACE FUNCTION public.fn_create_term_type(
    p_code text,
    p_label text,
    p_sequence smallint,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_label, 'TERM');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.term_types
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE sequence = p_sequence
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sequence ' || p_sequence || ' is already taken by another term type');
    END IF;

    INSERT INTO public.term_types (code, label, sequence, description, created_by)
    VALUES (v_final_code, p_label, p_sequence, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Term type created successfully', 'code', v_final_code);
END;
$function$;

-- fn_update_term_type: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_term_type(
    p_term_type_id uuid,
    p_code text,
    p_label text,
    p_sequence smallint,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE sequence = p_sequence
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sequence ' || p_sequence || ' is already taken by another term type');
    END IF;

    UPDATE public.term_types
    SET
        label = p_label,
        sequence = p_sequence,
        description = NULLIF(p_description, '')
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_term_type(text, text, smallint, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_term_type(uuid, text, text, smallint, text) TO authenticated, anon, service_role;


-- 9. ROLES
-- fn_create_role: auto-generate unique code
CREATE OR REPLACE FUNCTION public.fn_create_role(
    p_code text,
    p_label text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_code TEXT := btrim(COALESCE(p_code, ''));
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
    v_seq INT := 1;
BEGIN
    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF v_code = '' THEN
        v_code := upper(regexp_replace(v_label, '[^A-Za-z0-9]+', '_', 'g'));
        v_code := regexp_replace(v_code, '^_+|_+$', '', 'g');
        IF v_code = '' THEN
            v_code := 'ROLE';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(code)) = lower(v_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.roles
            WHERE lower(btrim(code)) = lower(v_code || '_' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_code := v_code || '_' || v_seq::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    INSERT INTO public.roles (code, label, description, created_by)
    VALUES (v_code, v_label, v_description, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Role created successfully', 'code', v_code);
END;
$function$;

-- fn_update_role: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_role(
    p_role_id uuid,
    p_code text,
    p_label text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.roles
        WHERE id = p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    UPDATE public.roles
    SET
        label = v_label,
        description = v_description
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_role(text, text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_role(uuid, text, text, text) TO authenticated, anon, service_role;


-- 10. SPECIAL GRADE CONFIGS
-- fn_save_special_grade_configs: code auto-generated on insert, immutable on update
CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_config      JSONB;
    v_id          UUID;
    v_code        TEXT;
    v_label       TEXT;
    v_description TEXT;
    v_conditions  JSONB;
    v_prev        JSONB;
    v_allows      BOOLEAN;
    v_seq         INT := 1;
BEGIN
    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'label')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade labels must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(*)
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) <> (
        SELECT COUNT(DISTINCT lower(btrim(c->>'description')))
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade descriptions must be unique within your changes.');
    END IF;

    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        v_id          := NULLIF(v_config->>'id', '')::UUID;
        v_code        := btrim(COALESCE(v_config->>'code', ''));
        v_label       := btrim(v_config->>'label');
        v_description := NULLIF(btrim(coalesce(v_config->>'description', '')), '');
        v_conditions  := COALESCE(v_config->'conditions', '{"all": []}'::jsonb);
        v_allows      := COALESCE((v_config->>'allows_section_override')::BOOLEAN, false);

        IF v_label IS NULL OR v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade label is required.');
        END IF;

        IF jsonb_typeof(v_conditions) <> 'object' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Conditions for "' || v_label || '" are malformed.');
        END IF;

        IF COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false)
           AND NOT (
               jsonb_typeof(v_conditions->'all') = 'array' AND jsonb_array_length(v_conditions->'all') > 0
               OR jsonb_typeof(v_conditions->'any') = 'array' AND jsonb_array_length(v_conditions->'any') > 0
               OR jsonb_exists(v_conditions, 'not')
           ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Add at least one condition before enabling auto-detection for "' || v_label || '".'
            );
        END IF;

        IF v_allows AND NOT COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Turn on auto-detect for "' || v_label || '" before allowing section overrides. There is no threshold to override otherwise.'
            );
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(label)) = lower(v_label)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with label "' || v_label || '" already exists.');
        END IF;

        IF v_description IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(description)) = lower(v_description)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with description "' || v_description || '" already exists.');
        END IF;

        IF v_id IS NOT NULL THEN
            -- Update: code is immutable
            SELECT conditions INTO v_prev
            FROM public.special_grade_configs
            WHERE id = v_id AND deleted_at IS NULL;

            UPDATE public.special_grade_configs
            SET
                label = v_label,
                description = v_description,
                min_absence_percentage = (v_config->>'min_absence_percentage')::NUMERIC,
                requires_completion = (v_config->>'requires_completion')::BOOLEAN,
                completion_deadline_days = (v_config->>'completion_deadline_days')::SMALLINT,
                is_passing = (v_config->>'is_passing')::BOOLEAN,
                is_active = (v_config->>'is_active')::BOOLEAN,
                conditions = v_conditions,
                priority = COALESCE((v_config->>'priority')::SMALLINT, 100),
                is_auto_detected = COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                allows_section_override = v_allows,
                rule_version = CASE
                    WHEN v_prev IS DISTINCT FROM v_conditions THEN rule_version + 1
                    ELSE rule_version
                END,
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;

            UPDATE public.special_grade_section_overrides o
            SET deleted_at = now(),
                deleted_by = auth.uid()
            WHERE o.special_grade_config_id = v_id
              AND o.deleted_at IS NULL
              AND (
                  NOT v_allows
                  OR NOT EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(
                          COALESCE(v_conditions->'all', v_conditions->'any', '[]'::jsonb)
                      ) c
                      WHERE c->>'signal_key' = 'absence_percentage'
                  )
              );
        ELSE
            -- Insert: generate unique code
            IF v_code = '' THEN
                v_code := public.fn_generate_acronym(v_label, 'SPG');
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.special_grade_configs
                WHERE lower(btrim(code)) = lower(v_code) AND deleted_at IS NULL
            ) THEN
                v_seq := 2;
                WHILE EXISTS (
                    SELECT 1 FROM public.special_grade_configs
                    WHERE lower(btrim(code)) = lower(v_code || '-' || v_seq::text) AND deleted_at IS NULL
                ) LOOP
                    v_seq := v_seq + 1;
                END LOOP;
                v_code := v_code || '-' || v_seq::text;
            END IF;

            INSERT INTO public.special_grade_configs (
                code,
                label,
                description,
                min_absence_percentage,
                requires_completion,
                completion_deadline_days,
                is_passing,
                is_active,
                conditions,
                priority,
                is_auto_detected,
                allows_section_override,
                created_by
            ) VALUES (
                v_code,
                v_label,
                v_description,
                (v_config->>'min_absence_percentage')::NUMERIC,
                (v_config->>'requires_completion')::BOOLEAN,
                (v_config->>'completion_deadline_days')::SMALLINT,
                (v_config->>'is_passing')::BOOLEAN,
                (v_config->>'is_active')::BOOLEAN,
                v_conditions,
                COALESCE((v_config->>'priority')::SMALLINT, 100),
                COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                v_allows,
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully.');
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.fn_save_special_grade_configs(jsonb) TO authenticated, anon, service_role;


-- 11. SCHOOL YEARS
-- fn_create_school_year: auto-generate unique code
CREATE OR REPLACE FUNCTION public.fn_create_school_year(
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_conflicting_sy RECORD;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    IF v_clean_code = '' THEN
        v_clean_code := 'AY-' || to_char(p_start_date, 'YYYY') || '-' || to_char(p_end_date, 'YYYY');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.school_years
            WHERE lower(btrim(code)) = lower(v_clean_code || '-' || v_seq::text)
              AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_clean_code := v_clean_code || '-' || v_seq::text;
    END IF;

    -- Check duplicate label (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    IF COALESCE(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
          AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.school_years (code, label, start_date, end_date, is_active, created_by)
    VALUES (v_clean_code, v_clean_label, p_start_date, p_end_date, COALESCE(p_is_active, false), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'School year created successfully.', 'code', v_clean_code);
END;
$function$;

-- fn_update_school_year: code is immutable
CREATE OR REPLACE FUNCTION public.fn_update_school_year(
    p_school_year_id uuid,
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_conflicting_sy RECORD;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    -- Check duplicate label (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND id <> p_school_year_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE id <> p_school_year_id
          AND deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE id <> p_school_year_id
      AND deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    IF COALESCE(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
          AND id <> p_school_year_id
          AND deleted_at IS NULL;
    END IF;

    -- Update school year without modifying code
    UPDATE public.school_years
    SET
        label = v_clean_label,
        start_date = p_start_date,
        end_date = p_end_date,
        is_active = COALESCE(p_is_active, false),
        updated_at = now()
    WHERE id = p_school_year_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year updated successfully.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_school_year(text, text, date, date, boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_school_year(uuid, text, text, date, date, boolean) TO authenticated, anon, service_role;
