-- Migration: 20261012010000_update_entity_code_formulas.sql
-- Description: Implement standardized 4/5-letter root formulas for departments (e.g. COEDU, COENG, DEEDU, DEENG, CS, IT)
--              and catalog course code formulas (e.g. CS101, GCAS01, COENG101).

-- 1. Helper function for department code generation
CREATE OR REPLACE FUNCTION public.fn_generate_department_code(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    v_clean text;
    v_words text[];
    v_filtered text[] := '{}';
    v_w text;
    v_first text;
    v_org_prefix text := NULL;
    v_code text := '';
    v_disc_words text[];
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN 'DEP';
    END IF;

    v_clean := btrim(regexp_replace(upper(p_name), '[^A-Z0-9]+', ' ', 'g'));
    v_words := regexp_split_to_array(v_clean, '\s+');

    FOREACH v_w IN ARRAY v_words
    LOOP
        IF v_w NOT IN ('AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'THE', 'A', 'AN', 'AT', 'BY') THEN
            v_filtered := array_append(v_filtered, v_w);
        END IF;
    END LOOP;

    IF array_length(v_filtered, 1) IS NULL OR array_length(v_filtered, 1) = 0 THEN
        RETURN 'DEP';
    END IF;

    v_first := v_filtered[1];
    IF v_first = 'COLLEGE' THEN v_org_prefix := 'CO';
    ELSIF v_first = 'DEPARTMENT' THEN v_org_prefix := 'DE';
    ELSIF v_first = 'SCHOOL' THEN v_org_prefix := 'SC';
    ELSIF v_first = 'FACULTY' THEN v_org_prefix := 'FA';
    ELSIF v_first = 'INSTITUTE' THEN v_org_prefix := 'IN';
    ELSIF v_first = 'DIVISION' THEN v_org_prefix := 'DI';
    END IF;

    IF v_org_prefix IS NOT NULL AND array_length(v_filtered, 1) > 1 THEN
        v_disc_words := v_filtered[2:array_length(v_filtered, 1)];
        IF array_length(v_disc_words, 1) = 1 THEN
            v_code := v_org_prefix || substring(v_disc_words[1] from 1 for 3);
        ELSE
            v_code := v_org_prefix;
            FOREACH v_w IN ARRAY v_disc_words
            LOOP
                v_code := v_code || substring(v_w from 1 for 1);
            END LOOP;
        END IF;
    ELSIF array_length(v_filtered, 1) = 1 THEN
        v_code := substring(v_filtered[1] from 1 for 4);
    ELSIF array_length(v_filtered, 1) = 2 THEN
        v_code := substring(v_filtered[1] from 1 for 1) || substring(v_filtered[2] from 1 for 1);
    ELSE
        FOREACH v_w IN ARRAY v_filtered
        LOOP
            v_code := v_code || substring(v_w from 1 for 1);
        END LOOP;
        v_code := substring(v_code from 1 for 5);
    END IF;

    RETURN v_code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_generate_department_code(text) TO authenticated, anon, service_role;


-- 2. Helper function for program code generation
CREATE OR REPLACE FUNCTION public.fn_generate_program_code(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
    v_clean text;
    v_words text[];
    v_filtered text[] := '{}';
    v_w text;
    v_first text;
    v_second text;
    v_degree text := '';
    v_major_words text[] := '{}';
    v_code text := '';
    v_mw1 text;
    v_mw2 text;
BEGIN
    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RETURN 'PRG';
    END IF;

    v_clean := btrim(regexp_replace(upper(p_name), '[^A-Z0-9]+', ' ', 'g'));
    v_words := regexp_split_to_array(v_clean, '\s+');

    FOREACH v_w IN ARRAY v_words
    LOOP
        IF v_w NOT IN ('AND', 'OR', 'OF', 'TO', 'IN', 'FOR', 'WITH', 'THE', 'A', 'AN', 'AT', 'BY') THEN
            v_filtered := array_append(v_filtered, v_w);
        END IF;
    END LOOP;

    IF array_length(v_filtered, 1) IS NULL OR array_length(v_filtered, 1) = 0 THEN
        RETURN 'PRG';
    END IF;

    v_first := v_filtered[1];
    v_second := CASE WHEN array_length(v_filtered, 1) > 1 THEN v_filtered[2] ELSE '' END;

    IF v_first LIKE 'BACHELOR%' THEN
        IF v_second LIKE 'ARTS%' THEN
            v_degree := 'BA';
            v_major_words := v_filtered[3:array_length(v_filtered, 1)];
        ELSE
            v_degree := 'BS';
            IF v_second LIKE 'SCIENCE%' THEN
                v_major_words := v_filtered[3:array_length(v_filtered, 1)];
            ELSE
                v_major_words := v_filtered[2:array_length(v_filtered, 1)];
            END IF;
        END IF;
    ELSIF v_first LIKE 'MASTER%' THEN
        IF v_second LIKE 'ARTS%' THEN
            v_degree := 'MA';
            v_major_words := v_filtered[3:array_length(v_filtered, 1)];
        ELSE
            v_degree := 'MS';
            IF v_second LIKE 'SCIENCE%' THEN
                v_major_words := v_filtered[3:array_length(v_filtered, 1)];
            ELSE
                v_major_words := v_filtered[2:array_length(v_filtered, 1)];
            END IF;
        END IF;
    ELSIF v_first LIKE 'DOCTOR%' THEN
        v_degree := 'PHD';
        v_major_words := v_filtered[2:array_length(v_filtered, 1)];
    ELSIF v_first LIKE 'ASSOCIATE%' THEN
        v_degree := 'ACT';
        v_major_words := v_filtered[2:array_length(v_filtered, 1)];
    ELSE
        v_major_words := v_filtered;
    END IF;

    IF array_length(v_major_words, 1) IS NULL OR array_length(v_major_words, 1) = 0 THEN
        v_code := v_degree;
    ELSIF array_length(v_major_words, 1) = 1 THEN
        v_code := v_degree || substring(v_major_words[1] from 1 for 4);
    ELSIF array_length(v_major_words, 1) = 2 THEN
        v_mw1 := v_major_words[1];
        v_mw2 := v_major_words[2];
        IF v_mw1 = 'COMPUTER' AND v_mw2 LIKE 'ENG%' THEN
            v_code := v_degree || 'CPE';
        ELSIF v_mw1 = 'INDUSTRIAL' THEN
            v_code := v_degree || 'INDT';
        ELSIF v_mw1 = 'ELECTRICAL' THEN
            v_code := v_degree || 'EE';
        ELSIF v_mw1 = 'ELECTRONICS' THEN
            v_code := v_degree || 'ECE';
        ELSIF v_mw1 = 'MECHANICAL' THEN
            v_code := v_degree || 'ME';
        ELSIF v_mw1 = 'CHEMICAL' THEN
            v_code := v_degree || 'CHE';
        ELSE
            v_code := v_degree || substring(v_mw1 from 1 for 1) || substring(v_mw2 from 1 for 1);
        END IF;
    ELSE
        v_code := v_degree;
        FOREACH v_w IN ARRAY v_major_words
        LOOP
            v_code := v_code || substring(v_w from 1 for 1);
        END LOOP;
    END IF;

    RETURN v_code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_generate_program_code(text) TO authenticated, anon, service_role;


-- 3. Update fn_create_department
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
        v_final_code := public.fn_generate_department_code(p_name);
    END IF;

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


-- 4. Update fn_create_program
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
    );

    RETURN jsonb_build_object('success', true, 'message', 'Program created successfully', 'code', v_final_code);
END;
$function$;


-- 5. Update fn_create_course
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
    v_next_course_num INT := 101;
    v_seq INT := 1;
BEGIN
    SELECT code INTO v_dept_code FROM public.departments
    WHERE id = p_department_id AND deleted_at IS NULL;

    IF v_dept_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    v_base_code := btrim(COALESCE(p_code, ''));
    IF v_base_code = '' THEN
        IF v_dept_code LIKE '%GAS%' OR v_dept_code LIKE '%GEN%' THEN
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(code, '^' || v_dept_code || '([0-9]+).*$', '\1'), code)::int), 0
            ) + 1
            INTO v_next_course_num
            FROM public.courses
            WHERE department_id = p_department_id AND deleted_at IS NULL AND code ~ ('^' || v_dept_code || '[0-9]+');

            v_base_code := v_dept_code || lpad(v_next_course_num::text, 2, '0');
        ELSE
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(code, '^' || v_dept_code || '([0-9]+).*$', '\1'), code)::int), 100
            ) + 1
            INTO v_next_course_num
            FROM public.courses
            WHERE department_id = p_department_id AND deleted_at IS NULL AND code ~ ('^' || v_dept_code || '[0-9]+');

            IF v_next_course_num < 101 THEN
                v_next_course_num := 101;
            END IF;

            v_base_code := v_dept_code || v_next_course_num::text;
        END IF;
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
