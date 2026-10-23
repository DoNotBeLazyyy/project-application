-- Migration: 20261023010000_update_entity_codes_on_name_change.sql
-- Description: Allow and enforce updating system-generated codes when entity names/labels change across
--              departments, programs, program_levels, course_types, term_types, roles, courses, and special grades.

-- 1. DEPARTMENTS
CREATE OR REPLACE FUNCTION public.fn_update_department(
    p_department_id uuid,
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid,
    p_faculty_ids uuid[] DEFAULT NULL::uuid[],
    p_sync_personnel boolean DEFAULT false
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

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'Department name is required' USING ERRCODE = '23502';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(name) = lower(btrim(p_name))
          AND id <> p_department_id
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'A department named "%" already exists. Please choose a different name.', btrim(p_name)
            USING ERRCODE = '23505';
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_department_code(p_name);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(code) = lower(v_final_code) AND id <> p_department_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.departments
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_department_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.departments
    SET
        code = v_final_code,
        name = btrim(p_name),
        description = NULLIF(btrim(p_description), ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_department_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF p_sync_personnel THEN
        PERFORM public.fn_sync_department_personnel(p_department_id, p_head_user_id, p_faculty_ids);
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_department(uuid, text, text, text, uuid, uuid[], boolean) TO authenticated, anon, service_role;


-- 2. PROGRAMS
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
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_name, 'PRG');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE lower(code) = lower(v_final_code) AND id <> p_program_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.programs
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_program_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.programs
    SET
        code = v_final_code,
        name = p_name,
        department_id = p_department_id,
        program_level_id = p_program_level_id,
        years_duration = p_years_duration,
        total_units = p_total_units,
        description = NULLIF(p_description, ''),
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_program(uuid, text, text, uuid, uuid, smallint, numeric, text, boolean) TO authenticated, anon, service_role;


-- 3. PROGRAM LEVELS
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
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_label, 'LVL');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE lower(code) = lower(v_final_code) AND id <> p_program_level_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.program_levels
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_program_level_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.program_levels
    SET
        code = v_final_code,
        label = p_label,
        description = NULLIF(p_description, ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_program_level(uuid, text, text, text) TO authenticated, anon, service_role;


-- 4. COURSE TYPES
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
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_label, 'CT');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE lower(code) = lower(v_final_code) AND id <> p_course_type_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.course_types
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_course_type_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.course_types
    SET
        code = v_final_code,
        label = p_label,
        description = NULLIF(p_description, ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_course_type(uuid, text, text, text) TO authenticated, anon, service_role;


-- 5. TERM TYPES
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
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_label, 'TERM');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE lower(code) = lower(v_final_code) AND id <> p_term_type_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.term_types
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_term_type_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.term_types
    SET
        code = v_final_code,
        label = p_label,
        description = NULLIF(p_description, ''),
        sequence = p_sequence,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_term_type(uuid, text, text, smallint, text) TO authenticated, anon, service_role;


-- 6. ROLES
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
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := regexp_replace(upper(btrim(p_label)), '[^A-Z0-9]+', '_', 'g');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(code) = lower(v_final_code) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.roles
            WHERE lower(code) = lower(v_final_code || '_' || v_seq::text) AND id <> p_role_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '_' || v_seq::text;
    END IF;

    UPDATE public.roles
    SET
        code = v_final_code,
        label = p_label,
        description = NULLIF(p_description, ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_role(uuid, text, text, text) TO authenticated, anon, service_role;


-- 7. COURSES (Update courses table to update code when provided)
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
    p_prerequisites jsonb DEFAULT NULL::jsonb,
    p_course_types jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_prereq JSONB;
    v_type_count INTEGER := 0;
    v_type_elem JSONB;
    v_ct_record RECORD;
    v_sum_lec NUMERIC := 0;
    v_sum_lab NUMERIC := 0;
    v_sum_units NUMERIC := 0;
    v_sum_credit NUMERIC := 0;
    v_elem_units NUMERIC := 0;
    v_elem_credit NUMERIC := 0;
    v_elem_type_id UUID;
    v_primary_course_type_id UUID := NULL;
    v_final_code TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            v_elem_type_id := (v_type_elem->>'course_type_id')::uuid;
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = v_elem_type_id
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            IF v_primary_course_type_id IS NULL THEN
                v_primary_course_type_id := v_ct_record.id;
            END IF;

            v_elem_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_elem_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_elem_units);

            IF v_ct_record.code = 'LEC' OR v_ct_record.label ILIKE '%lecture%' THEN
                v_sum_lec := v_sum_lec + v_elem_units;
            ELSIF v_ct_record.code = 'LAB' OR v_ct_record.label ILIKE '%lab%' THEN
                v_sum_lab := v_sum_lab + v_elem_units;
            ELSE
                v_sum_lec := v_sum_lec + v_elem_units;
            END IF;

            v_sum_credit := v_sum_credit + v_elem_credit;
        END LOOP;

        v_sum_units := v_sum_lec + v_sum_lab;
    ELSE
        v_sum_lec := COALESCE(p_lecture_units, 0);
        v_sum_lab := COALESCE(p_laboratory_units, 0);
        v_sum_units := v_sum_lec + v_sum_lab;
        v_sum_credit := COALESCE(p_credit_hours, v_sum_units);
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));

    -- Update courses table including system-generated code
    UPDATE public.courses
    SET
        code = CASE WHEN v_final_code <> '' THEN v_final_code ELSE code END,
        title = p_title,
        department_id = p_department_id,
        course_type_id = COALESCE(v_primary_course_type_id, p_course_type_id, course_type_id),
        lecture_units = v_sum_lec,
        laboratory_units = v_sum_lab,
        credit_hours = v_sum_credit,
        description = NULLIF(p_description, ''),
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_course_id
    AND deleted_at IS NULL;

    -- Update course types in course_course_types
    IF v_type_count > 0 THEN
        UPDATE public.course_course_types
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE course_id = p_course_id AND deleted_at IS NULL;

        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                p_course_id,
                (v_type_elem->>'course_type_id')::uuid,
                COALESCE((v_type_elem->>'units')::numeric, 0),
                COALESCE((v_type_elem->>'credit_hours')::numeric, (v_type_elem->>'units')::numeric, 0),
                auth.uid()
            );
        END LOOP;
    END IF;

    -- Update prerequisites
    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    CONTINUE;
                END IF;
                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_course_id, prerequisite_type, prerequisite_kind, min_grade_numeric, created_by
                )
                VALUES (
                    p_course_id,
                    (v_prereq->>'course_id')::uuid,
                    COALESCE(v_prereq->>'prerequisite_type', 'Hard Prerequisite'),
                    'course',
                    (v_prereq->>'min_grade_numeric')::numeric,
                    auth.uid()
                );
            ELSIF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                    CONTINUE;
                END IF;
                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_type, prerequisite_kind, year_level_required, created_by
                )
                VALUES (
                    p_course_id,
                    COALESCE(v_prereq->>'prerequisite_type', 'Hard Prerequisite'),
                    'standing',
                    (v_prereq->>'year_level_required')::smallint,
                    auth.uid()
                );
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_course(uuid, text, text, uuid, uuid, numeric, numeric, numeric, text, boolean, jsonb, jsonb) TO authenticated, anon, service_role;


-- 8. SPECIAL GRADES (Update special_grade_configs table to update code on edit)
CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_config JSONB;
    v_id UUID;
    v_code TEXT;
    v_label TEXT;
    v_description TEXT;
    v_conditions JSONB;
    v_allows BOOLEAN;
    v_prev JSONB;
    v_count INT := 0;
    v_seq INT := 1;
    v_auto_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_configs IS NULL OR jsonb_typeof(p_configs) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Expected an array of configs');
    END IF;

    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        v_id := NULLIF(v_config->>'id', '')::UUID;
        v_code := btrim(COALESCE(v_config->>'code', ''));
        v_label := btrim(COALESCE(v_config->>'label', ''));
        v_description := NULLIF(btrim(COALESCE(v_config->>'description', '')), '');
        v_conditions := COALESCE(v_config->'conditions', '{"all": []}'::JSONB);
        v_allows := COALESCE((v_config->>'allows_section_override')::BOOLEAN, false);

        IF v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grade label is required.');
        END IF;

        IF v_description IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grade description is required.');
        END IF;

        IF v_code = '' THEN
            v_auto_code := public.fn_generate_acronym(v_label, 'SPG');
        ELSE
            v_auto_code := v_code;
        END IF;

        -- Uniqueness checks
        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(code) = lower(v_auto_code)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            v_seq := 2;
            WHILE EXISTS (
                SELECT 1 FROM public.special_grade_configs
                WHERE lower(code) = lower(v_auto_code || '-' || v_seq::text)
                AND deleted_at IS NULL
                AND (v_id IS NULL OR id <> v_id)
            ) LOOP
                v_seq := v_seq + 1;
            END LOOP;
            v_auto_code := v_auto_code || '-' || v_seq::text;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(label) = lower(v_label)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with label "' || v_label || '" already exists.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(description) = lower(v_description)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with description "' || v_description || '" already exists.');
        END IF;

        IF v_id IS NOT NULL THEN
            SELECT conditions INTO v_prev
            FROM public.special_grade_configs
            WHERE id = v_id AND deleted_at IS NULL;

            UPDATE public.special_grade_configs
            SET
                code = v_auto_code,
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
                updated_at = now(),
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;

            IF v_allows = false THEN
                UPDATE public.special_grade_section_overrides o
                SET is_active = false, updated_at = now(), updated_by = auth.uid()
                WHERE o.special_grade_config_id = v_id
                AND o.is_active = true
                AND o.deleted_at IS NULL;
            END IF;
        ELSE
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
            )
            VALUES (
                v_auto_code,
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

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully', 'count', v_count);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_save_special_grade_configs(jsonb) TO authenticated, anon, service_role;
