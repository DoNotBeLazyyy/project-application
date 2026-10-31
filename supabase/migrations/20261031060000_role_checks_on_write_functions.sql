-- ====================================================================
-- Migration: 20261031060000_role_checks_on_write_functions.sql
--   * 22 write functions had no role check: any signed-in user, a student included,
--     could delete programs, sections, school years, curriculum entries and more. Each now
--     requires the role that owns the page (Admin and/or Dean)
--   * fn_delete_program / fn_bulk_delete_programs: a program that still has students can no
--     longer be deleted (it used to silently remove the program from every student)
--   * 10 functions that no page calls are no longer executable by signed-in users
-- Rollback: supabase/rollback/20261031060000_role_checks_on_write_functions.down.sql
-- ====================================================================
BEGIN;

-- fn_delete_program
CREATE OR REPLACE FUNCTION public.fn_delete_program(p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    -- Check if program exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    -- Students keep their program: a program that still has students cannot be deleted
    SELECT COUNT(*) INTO v_student_count
    FROM public.students
    WHERE program_id = p_program_id
    AND deleted_at IS NULL;

    IF v_student_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete: ' || v_student_count || ' student(s) still belong to this program. Move them to another program first.'
        );
    END IF;

    -- 1. Soft-delete associated curriculum maps
    UPDATE public.curriculum_maps
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE program_id = p_program_id
    AND deleted_at IS NULL;

    -- 3. Remove program linkage from evaluation templates if any
    DELETE FROM public.evaluation_template_programs
    WHERE program_id = p_program_id;

    -- 4. Soft-delete the program record
    UPDATE public.programs
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Program deleted successfully');
END;
$function$;

-- fn_bulk_delete_programs
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_programs(p_program_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    -- Students keep their program: a program that still has students cannot be deleted
    SELECT COUNT(*) INTO v_student_count
    FROM public.students
    WHERE program_id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    IF v_student_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete: ' || v_student_count || ' student(s) still belong to the selected programs. Move them to another program first.'
        );
    END IF;

    -- 1. Soft-delete associated curriculum maps
    UPDATE public.curriculum_maps
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE program_id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    -- 3. Remove program linkages from evaluation templates
    DELETE FROM public.evaluation_template_programs
    WHERE program_id = ANY(p_program_ids);

    -- 4. Soft-delete the programs
    UPDATE public.programs
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Selected programs deleted successfully');
END;
$function$;

-- fn_bulk_create_programs
CREATE OR REPLACE FUNCTION public.fn_bulk_create_programs(p_programs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program JSONB;
    v_department_id UUID;
    v_program_level_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_program IN SELECT * FROM jsonb_array_elements(p_programs)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_program->>'code') IS NULL OR TRIM(v_program->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Code is required'
            );
            CONTINUE;
        END IF;

        IF (v_program->>'name') IS NULL OR TRIM(v_program->>'name') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Name is required'
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.programs
            WHERE code = v_program->>'code'
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program code already exists: ' || (v_program->>'code')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE code = v_program->>'department_code'
        AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Department code not found: ' || COALESCE(v_program->>'department_code', 'empty')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_program_level_id
        FROM public.program_levels
        WHERE code = v_program->>'program_level_code'
        AND deleted_at IS NULL;

        IF v_program_level_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program level code not found: ' || COALESCE(v_program->>'program_level_code', 'empty')
            );
            CONTINUE;
        END IF;

        IF (v_program->>'years_duration') IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Years duration is required'
            );
            CONTINUE;
        END IF;

        INSERT INTO public.programs (
            code, name, department_id, program_level_id,
            years_duration, total_units, description, is_active, created_by
        )
        VALUES (
            TRIM(v_program->>'code'),
            TRIM(v_program->>'name'),
            v_department_id,
            v_program_level_id,
            (v_program->>'years_duration')::SMALLINT,
            CASE WHEN v_program->>'total_units' = '' THEN NULL
                 ELSE (v_program->>'total_units')::NUMERIC END,
            NULLIF(TRIM(COALESCE(v_program->>'description', '')), ''),
            COALESCE((v_program->>'is_active')::BOOLEAN, TRUE),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' program(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;

-- fn_delete_program_level
CREATE OR REPLACE FUNCTION public.fn_delete_program_level(p_program_level_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_programs INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE program_level_id = p_program_level_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete program level. ' || v_active_programs || ' program(s) are currently using this level.'
        );
    END IF;

    UPDATE public.program_levels
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level deleted successfully');
END;
$function$;

-- fn_delete_course_type
CREATE OR REPLACE FUNCTION public.fn_delete_course_type(p_course_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF NOT EXISTS (
        SELECT 1 FROM public.course_types
        WHERE id = p_course_type_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    -- Instead of physically deleting or failing when courses exist, mark inactive
    UPDATE public.course_types
    SET
        is_active = false,
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_course_type_id;

    RETURN jsonb_build_object('success', true, 'message', 'Course type marked inactive successfully');
END;
$function$;

-- fn_delete_course
CREATE OR REPLACE FUNCTION public.fn_delete_course(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = p_course_id AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete course. It is referenced by existing curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    UPDATE public.course_course_types
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course deleted successfully');
END;
$function$;

-- fn_bulk_delete_courses
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_courses(p_course_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected courses. Some are referenced by curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.course_course_types
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_course_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Courses deleted successfully');
END;
$function$;

-- fn_bulk_create_courses
CREATE OR REPLACE FUNCTION public.fn_bulk_create_courses(p_courses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_course JSONB;
    v_course_id UUID;
    v_department_id UUID;
    v_course_type_id UUID;
    v_code TEXT;
    v_lec NUMERIC;
    v_lab NUMERIC;
    v_credit NUMERIC;
    v_is_active BOOLEAN;
    v_prereq_code TEXT;
    v_prereq_type TEXT;
    v_prereq_grade TEXT;
    v_prereq_id UUID;
    v_prereq_parts TEXT[];
    v_prereq_entry TEXT;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_course IN SELECT * FROM jsonb_array_elements(p_courses)
    LOOP
        v_row_num := v_row_num + 1;
        v_code := TRIM(COALESCE(v_course->>'code', ''));

        IF v_code = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', '', 'message', 'Code is required'));
            CONTINUE;
        END IF;

        IF TRIM(COALESCE(v_course->>'title', '')) = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Title is required'));
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE (LOWER(TRIM(code)) = LOWER(TRIM(v_course->>'department_code'))
            OR LOWER(TRIM(name)) = LOWER(TRIM(v_course->>'department_code')))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Department code not found: ' || COALESCE(NULLIF(TRIM(v_course->>'department_code'), ''), 'empty')));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_type_id
        FROM public.course_types
        WHERE (LOWER(TRIM(code)) = LOWER(TRIM(v_course->>'course_type_code'))
            OR LOWER(TRIM(label)) = LOWER(TRIM(v_course->>'course_type_code')))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_course_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Course type code not found: ' || COALESCE(NULLIF(TRIM(v_course->>'course_type_code'), ''), 'empty')));
            CONTINUE;
        END IF;

        BEGIN
            v_lec := COALESCE(NULLIF(TRIM(v_course->>'lecture_units'), '')::NUMERIC, 0);
            v_lab := COALESCE(NULLIF(TRIM(v_course->>'laboratory_units'), '')::NUMERIC, 0);
            v_credit := NULLIF(TRIM(COALESCE(v_course->>'credit_hours', '')), '')::NUMERIC;
        EXCEPTION WHEN invalid_text_representation THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Units and credit hours must be numbers'));
            CONTINUE;
        END;

        IF v_lec < 0 OR v_lec > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Lecture units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF v_lab < 0 OR v_lab > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Laboratory units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF v_lec = 0 AND v_lab = 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'At least one of lecture units or laboratory units must be greater than 0'));
            CONTINUE;
        END IF;

        v_is_active := CASE
            WHEN LOWER(TRIM(COALESCE(v_course->>'is_active', ''))) IN ('false', 'f', 'no', 'n', '0', 'inactive') THEN FALSE
            ELSE TRUE
        END;

        BEGIN
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = v_code AND deleted_at IS NULL;

            IF v_course_id IS NOT NULL THEN
                UPDATE public.courses
                SET title = TRIM(v_course->>'title'),
                    department_id = v_department_id,
                    course_type_id = v_course_type_id,
                    lecture_units = v_lec,
                    laboratory_units = v_lab,
                    credit_hours = v_credit,
                    description = NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                    is_active = v_is_active,
                    updated_at = NOW(),
                    updated_by = auth.uid()
                WHERE id = v_course_id;

                UPDATE public.course_course_types
                SET deleted_at = NOW(), deleted_by = auth.uid()
                WHERE course_id = v_course_id AND deleted_at IS NULL;

                UPDATE public.course_prerequisites
                SET deleted_at = NOW(), deleted_by = auth.uid()
                WHERE course_id = v_course_id AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.courses (
                    code, title, department_id, course_type_id,
                    lecture_units, laboratory_units, credit_hours,
                    description, is_active, base_code, created_by
                )
                VALUES (
                    v_code,
                    TRIM(v_course->>'title'),
                    v_department_id,
                    v_course_type_id,
                    v_lec,
                    v_lab,
                    v_credit,
                    NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                    v_is_active,
                    v_code,
                    auth.uid()
                )
                RETURNING id INTO v_course_id;
            END IF;

            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                v_course_id, v_course_type_id, v_lec + v_lab, COALESCE(v_credit, v_lec + v_lab), auth.uid()
            );

            IF TRIM(COALESCE(v_course->>'prerequisites', '')) <> '' THEN
                FOREACH v_prereq_entry IN ARRAY string_to_array(v_course->>'prerequisites', '|')
                LOOP
                    IF TRIM(v_prereq_entry) = '' THEN
                        CONTINUE;
                    END IF;

                    v_prereq_parts := string_to_array(TRIM(v_prereq_entry), ':');
                    v_prereq_code := TRIM(v_prereq_parts[1]);
                    v_prereq_type := COALESCE(NULLIF(TRIM(v_prereq_parts[2]), ''), 'Required');
                    v_prereq_grade := NULLIF(TRIM(COALESCE(v_prereq_parts[3], '')), '');

                    IF v_prereq_type NOT IN (SELECT unnest(enum_range(NULL::public.prerequisite_type))::text) THEN
                        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Invalid prerequisite type "' || v_prereq_type || '" (use Required, Co-requisite or Recommended)'));
                        CONTINUE;
                    END IF;

                    SELECT id INTO v_prereq_id
                    FROM public.courses
                    WHERE code = v_prereq_code AND deleted_at IS NULL;

                    IF v_prereq_id IS NULL THEN
                        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Prerequisite course code not found: ' || v_prereq_code));
                        CONTINUE;
                    END IF;

                    IF v_prereq_id = v_course_id THEN
                        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'A course cannot be a prerequisite of itself'));
                        CONTINUE;
                    END IF;

                    INSERT INTO public.course_prerequisites (
                        course_id, prerequisite_id, prerequisite_type, prerequisite_kind, minimum_grade, created_by
                    )
                    VALUES (
                        v_course_id,
                        v_prereq_id,
                        v_prereq_type::public.prerequisite_type,
                        'course',
                        v_prereq_grade::NUMERIC,
                        auth.uid()
                    )
                    ON CONFLICT (course_id, prerequisite_id) WHERE deleted_at IS NULL DO NOTHING;
                END LOOP;
            END IF;

            v_success_count := v_success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' course(s) processed successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;

-- fn_update_course
CREATE OR REPLACE FUNCTION public.fn_update_course(p_course_id uuid, p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb, p_course_types jsonb DEFAULT NULL::jsonb)
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
    PERFORM public.fn_assert_role('Admin', 'Dean');

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
                IF (v_prereq->>'course_id')::uuid = p_course_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type, prerequisite_kind, minimum_grade, created_by
                )
                VALUES (
                    p_course_id,
                    (v_prereq->>'course_id')::uuid,
                    COALESCE(NULLIF(v_prereq->>'prerequisite_type', ''), 'Required')::public.prerequisite_type,
                    'course',
                    NULLIF(COALESCE(v_prereq->>'minimum_grade', v_prereq->>'min_grade_numeric'), '')::numeric,
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
                    COALESCE(NULLIF(v_prereq->>'prerequisite_type', ''), 'Required')::public.prerequisite_type,
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

-- fn_delete_section
CREATE OR REPLACE FUNCTION public.fn_delete_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be deleted.');
    END IF;

    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section deleted successfully.');
END;
$function$;

-- fn_bulk_delete_sections
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_sections(p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = ANY(p_section_ids)
          AND s.deleted_at IS NULL
          AND COALESCE(sy.is_active, false) = false
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be deleted.');
    END IF;

    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_section_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Sections deleted successfully.');
END;
$function$;

-- fn_bulk_create_sections
CREATE OR REPLACE FUNCTION public.fn_bulk_create_sections(p_sections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_created_rows JSONB := '[]'::JSONB;
    v_updated_rows JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_created_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_term_id UUID;
    v_is_active BOOLEAN;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
    v_section_id UUID;
    v_section_code TEXT;
    v_course_prefix TEXT;
    v_seq INTEGER;
    v_term_input TEXT;

    -- Old state for diff tracking
    v_old_room TEXT;
    v_old_max_slots SMALLINT;
    v_old_faculty_email TEXT;
    v_old_course_code TEXT;
    v_changes JSONB;

    -- Schedule processing
    v_sched_days TEXT;
    v_start_time TIME;
    v_end_time TIME;
    v_sched_room TEXT;
    v_day_token TEXT;
    v_day_name public.day_of_week_type;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;

        BEGIN
            v_term_input := trim(COALESCE(v_row->>'term_label', ''));
            v_term_id := NULL;
            v_is_active := FALSE;

            IF v_term_input = '' THEN
                SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
                FROM public.terms t
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE sy.is_active = TRUE AND t.deleted_at IS NULL
                ORDER BY t.created_at ASC
                LIMIT 1;
            ELSE
                SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
                FROM public.terms t
                INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE t.deleted_at IS NULL AND (
                    (tt.label || ' - ' || sy.label) = v_term_input
                    OR (tt.label || ' ' || sy.label) = v_term_input
                    OR (tt.label || ' - ' || replace(sy.label, 'Academic Year ', '')) = v_term_input
                    OR (tt.label || ' ' || replace(sy.label, 'Academic Year ', '')) = v_term_input
                    OR LOWER(tt.label || ' - ' || sy.label) = LOWER(v_term_input)
                )
                LIMIT 1;
            END IF;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            IF NOT v_is_active THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'INACTIVE_ACADEMIC_YEAR',
                    'message', 'Sections can only be imported for the active academic year.'
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
                        'message', 'Faculty email not found: ' || (v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            v_section_code := trim(COALESCE(v_row->>'section_code', ''));
            IF v_section_code = '' THEN
                SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
                INTO v_course_prefix
                FROM public.courses WHERE id = v_course_id;

                v_seq := 1;
                v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                WHILE EXISTS (
                    SELECT 1 FROM public.sections
                    WHERE term_id = v_term_id
                    AND section_code = v_section_code
                    AND deleted_at IS NULL
                ) LOOP
                    v_seq := v_seq + 1;
                    v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                END LOOP;
            END IF;

            v_max_slots := 40;
            IF (v_row->>'max_slots') IS NOT NULL AND trim(v_row->>'max_slots') <> '' THEN
                v_max_slots := (v_row->>'max_slots')::SMALLINT;
                IF v_max_slots < 1 OR v_max_slots > 999 THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'INVALID_MAX_SLOTS',
                        'message', 'Max slots must be between 1 and 999.'
                    );
                    CONTINUE;
                END IF;
            END IF;

            -- Match existing section by (term, course, faculty) OR section_code
            SELECT id INTO v_section_id
            FROM public.sections
            WHERE term_id = v_term_id
            AND course_id = v_course_id
            AND (
                section_code = v_section_code
                OR (v_faculty_id IS NOT NULL AND faculty_id = v_faculty_id)
            )
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_section_id IS NOT NULL THEN
                -- Fetch old state for diffing
                SELECT s.room, s.max_slots, c.code, u.email
                INTO v_old_room, v_old_max_slots, v_old_course_code, v_old_faculty_email
                FROM public.sections s
                LEFT JOIN public.courses c ON c.id = s.course_id
                LEFT JOIN public.users u ON u.id = s.faculty_id
                WHERE s.id = v_section_id;

                v_changes := '[]'::JSONB;

                IF COALESCE(v_old_room, '') <> COALESCE(trim(v_row->>'room'), '') AND trim(COALESCE(v_row->>'room', '')) <> '' THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Room',
                        'previous', COALESCE(v_old_room, 'None'),
                        'changed', trim(v_row->>'room')
                    );
                END IF;

                IF v_old_max_slots IS DISTINCT FROM v_max_slots THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Max Slots',
                        'previous', COALESCE(v_old_max_slots::text, '40'),
                        'changed', v_max_slots::text
                    );
                END IF;

                IF COALESCE(v_old_faculty_email, '') <> COALESCE(trim(v_row->>'faculty_email'), '') AND trim(COALESCE(v_row->>'faculty_email', '')) <> '' THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Faculty Email',
                        'previous', COALESCE(v_old_faculty_email, 'Unassigned'),
                        'changed', trim(v_row->>'faculty_email')
                    );
                END IF;

                UPDATE public.sections
                SET course_id = v_course_id,
                    faculty_id = COALESCE(v_faculty_id, faculty_id),
                    room = COALESCE(nullif(trim(v_row->>'room'), ''), room),
                    max_slots = v_max_slots,
                    updated_at = NOW(),
                    updated_by = auth.uid()
                WHERE id = v_section_id;

                v_updated_count := v_updated_count + 1;
                v_updated_rows := v_updated_rows || jsonb_build_object(
                    'row', v_index,
                    'section_code', v_section_code,
                    'course_code', trim(v_row->>'course_code'),
                    'faculty_email', coalesce(trim(v_row->>'faculty_email'), ''),
                    'room', coalesce(trim(v_row->>'room'), ''),
                    'max_slots', v_max_slots,
                    'changes', v_changes,
                    'message', 'Updated existing section offering'
                );
            ELSE
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
                    v_section_code,
                    nullif(trim(v_row->>'room'), ''),
                    v_max_slots,
                    'Open'::public.section_status_type,
                    auth.uid()
                )
                RETURNING id INTO v_section_id;

                PERFORM public.fn_seed_section_grading(v_section_id);

                v_created_count := v_created_count + 1;
                v_created_rows := v_created_rows || jsonb_build_object(
                    'row', v_index,
                    'section_code', v_section_code,
                    'course_code', trim(v_row->>'course_code'),
                    'faculty_email', coalesce(trim(v_row->>'faculty_email'), ''),
                    'room', coalesce(trim(v_row->>'room'), ''),
                    'max_slots', v_max_slots,
                    'message', 'Created new section offering'
                );
            END IF;

            -- Direct Schedule Slots persistence into public.section_schedules
            v_sched_days := COALESCE(v_row->>'schedule_days', '');
            IF v_sched_days <> '' AND (v_row->>'schedule_time_start') IS NOT NULL AND (v_row->>'schedule_time_end') IS NOT NULL THEN
                v_start_time := (v_row->>'schedule_time_start')::TIME;
                v_end_time := (v_row->>'schedule_time_end')::TIME;
                v_sched_room := COALESCE(NULLIF(trim(v_row->>'schedule_room'), ''), NULLIF(trim(v_row->>'room'), ''));

                -- Soft delete any previous schedules for this section
                UPDATE public.section_schedules
                SET deleted_at = NOW(),
                    deleted_by = auth.uid()
                WHERE section_id = v_section_id AND deleted_at IS NULL;

                -- Insert each day token
                FOR v_day_token IN SELECT trim(d) FROM regexp_split_to_table(v_sched_days, '[,;]+') d LOOP
                    v_day_name := NULL;
                    IF lower(v_day_token) IN ('mon', 'monday') THEN v_day_name := 'Monday'::public.day_of_week_type;
                    ELSIF lower(v_day_token) IN ('tue', 'tues', 'tuesday') THEN v_day_name := 'Tuesday'::public.day_of_week_type;
                    ELSIF lower(v_day_token) IN ('wed', 'wednesday') THEN v_day_name := 'Wednesday'::public.day_of_week_type;
                    ELSIF lower(v_day_token) IN ('thu', 'thur', 'thurs', 'thursday') THEN v_day_name := 'Thursday'::public.day_of_week_type;
                    ELSIF lower(v_day_token) IN ('fri', 'friday') THEN v_day_name := 'Friday'::public.day_of_week_type;
                    ELSIF lower(v_day_token) IN ('sat', 'saturday') THEN v_day_name := 'Saturday'::public.day_of_week_type;
                    ELSIF lower(v_day_token) IN ('sun', 'sunday') THEN v_day_name := 'Sunday'::public.day_of_week_type;
                    END IF;

                    IF v_day_name IS NOT NULL THEN
                        INSERT INTO public.section_schedules (
                            section_id,
                            day_of_week,
                            time_start,
                            time_end,
                            room,
                            created_by
                        ) VALUES (
                            v_section_id,
                            v_day_name,
                            v_start_time,
                            v_end_time,
                            v_sched_room,
                            auth.uid()
                        );
                    END IF;
                END LOOP;
            END IF;

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'DB_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_index,
        'provisioned', v_provisioned,
        'created_count', v_created_count,
        'updated_count', v_updated_count,
        'created_rows', v_created_rows,
        'updated_rows', v_updated_rows,
        'skipped', jsonb_array_length(v_errors),
        'errors', v_errors
    );
END;
$function$;

-- fn_create_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(p_program_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_units numeric DEFAULT NULL::numeric, p_type_units jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

-- fn_update_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(p_curriculum_map_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_units numeric DEFAULT NULL::numeric, p_type_units jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

-- fn_delete_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_delete_curriculum_map_entry(p_curriculum_map_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    UPDATE public.curriculum_maps
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry deleted successfully');
END;
$function$;

-- fn_bulk_create_curriculum_map
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
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

-- fn_delete_department
CREATE OR REPLACE FUNCTION public.fn_delete_department(p_department_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_programs INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE department_id = p_department_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete department. ' || v_active_programs || ' program(s) are currently under this department.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department deleted successfully');
END;
$function$;

-- fn_bulk_delete_departments
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_departments(p_department_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_blocked INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_blocked
    FROM public.programs
    WHERE department_id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    IF v_blocked > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected departments. ' || v_blocked || ' program(s) are still referencing them.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Departments deleted successfully');
END;
$function$;

-- fn_delete_school_year
CREATE OR REPLACE FUNCTION public.fn_delete_school_year(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE id = p_school_year_id
        AND is_active = TRUE
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot delete an active school year. Deactivate it first before deleting.');
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year deleted successfully');
END;
$function$;

-- fn_create_term_type
CREATE OR REPLACE FUNCTION public.fn_create_term_type(p_code text, p_label text, p_sequence smallint, p_description text DEFAULT NULL::text)
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

-- fn_delete_evaluation_template
CREATE OR REPLACE FUNCTION public.fn_delete_evaluation_template(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.evaluation_templates
        WHERE id = p_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.evaluation_responses r
        INNER JOIN public.evaluation_questions q ON q.id = r.question_id
        WHERE q.template_id = p_id AND r.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This section is already in use by student evaluations and cannot be deleted.');
    END IF;

    UPDATE public.evaluation_template_programs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE template_id = p_id AND deleted_at IS NULL;

    UPDATE public.evaluation_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation section deleted successfully.');
END;
$function$;

-- fn_bulk_create_evaluation_templates
CREATE OR REPLACE FUNCTION public.fn_bulk_create_evaluation_templates(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_provisioned INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_group RECORD;
    v_first JSONB;
    v_questions JSONB;
    v_program_ids UUID[];
    v_missing_codes TEXT[];
    v_error TEXT;
    v_template_id UUID;
    v_sequence SMALLINT;
    v_next_sequence SMALLINT;
    v_is_active BOOLEAN;
    v_mode TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
        RETURN jsonb_build_object('provisioned_count', 0, 'errors', '[]'::JSONB);
    END IF;

    SELECT COALESCE(MAX(sequence), 0) INTO v_next_sequence
    FROM public.evaluation_templates
    WHERE deleted_at IS NULL;

    FOR v_group IN
        WITH rows AS (
            SELECT r.value AS row, r.ordinality AS rn
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        )
        SELECT
            lower(btrim(row->>'section_title')) AS group_key,
            MIN(rn) AS first_rn
        FROM rows
        WHERE btrim(COALESCE(row->>'section_title', '')) <> ''
        GROUP BY lower(btrim(row->>'section_title'))
        ORDER BY MIN(rn)
    LOOP
        BEGIN
            SELECT r.value INTO v_first
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE r.ordinality = v_group.first_rn;

            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_text', btrim(COALESCE(r.value->>'question_text', '')),
                    'question_type', btrim(COALESCE(r.value->>'question_type', '')),
                    'is_required',   COALESCE(NULLIF(btrim(COALESCE(r.value->>'is_required', '')), '')::BOOLEAN, true),
                    'min_rating',    NULLIF(btrim(COALESCE(r.value->>'min_rating', '')), ''),
                    'max_rating',    NULLIF(btrim(COALESCE(r.value->>'max_rating', '')), '')
                )
                ORDER BY r.ordinality
            )
            INTO v_questions
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE lower(btrim(r.value->>'section_title')) = v_group.group_key
            AND btrim(COALESCE(r.value->>'question_text', '')) <> '';

            v_error := public.fn_validate_evaluation_questions(v_questions);
            IF v_error IS NOT NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', v_error
                ));
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.evaluation_templates
                WHERE lower(title) = v_group.group_key AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'A section named "' || btrim(v_first->>'section_title') || '" already exists.'
                ));
                CONTINUE;
            END IF;

            v_program_ids := NULL;
            v_missing_codes := NULL;

            IF NULLIF(btrim(COALESCE(v_first->>'program_codes', '')), '') IS NOT NULL THEN
                SELECT
                    array_agg(p.id),
                    array_agg(codes.code) FILTER (WHERE p.id IS NULL)
                INTO v_program_ids, v_missing_codes
                FROM (
                    SELECT DISTINCT btrim(c) AS code
                    FROM unnest(string_to_array(v_first->>'program_codes', '|')) AS c
                    WHERE btrim(c) <> ''
                ) codes
                LEFT JOIN public.programs p
                    ON p.code = codes.code AND p.deleted_at IS NULL;

                IF v_missing_codes IS NOT NULL AND array_length(v_missing_codes, 1) > 0 THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                        'row', v_group.first_rn,
                        'code', btrim(v_first->>'section_title'),
                        'message', 'Program code(s) not found: ' || array_to_string(v_missing_codes, ', ')
                    ));
                    CONTINUE;
                END IF;
            END IF;

            -- Target mode: blank => INCLUDE when program codes are given (the previous implicit
            -- behaviour), else ALL. INCLUDE/EXCLUDE need at least one program (same as the UI wizard).
            v_mode := upper(NULLIF(btrim(COALESCE(v_first->>'target_mode', '')), ''));
            IF v_mode IS NULL THEN
                v_mode := CASE WHEN v_program_ids IS NULL THEN 'ALL' ELSE 'INCLUDE' END;
            END IF;

            IF v_mode NOT IN ('ALL', 'INCLUDE', 'EXCLUDE') THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'Invalid target mode "' || (v_first->>'target_mode') || '". Must be ALL, INCLUDE, or EXCLUDE.'
                ));
                CONTINUE;
            END IF;

            IF v_mode = 'ALL' THEN
                v_program_ids := NULL;
            ELSIF v_program_ids IS NULL OR array_length(v_program_ids, 1) IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'Target mode ' || v_mode || ' requires at least one program code.'
                ));
                CONTINUE;
            END IF;

            v_is_active := COALESCE(NULLIF(btrim(COALESCE(v_first->>'is_active', '')), '')::BOOLEAN, true);

            IF NULLIF(btrim(COALESCE(v_first->>'section_sequence', '')), '') IS NOT NULL THEN
                v_sequence := GREATEST((v_first->>'section_sequence')::SMALLINT, 1);
            ELSE
                v_next_sequence := v_next_sequence + 1;
                v_sequence := v_next_sequence;
            END IF;

            INSERT INTO public.evaluation_templates (
                title, description, is_active, sequence, target_mode, suggestion_placeholder, created_by
            )
            VALUES (
                btrim(v_first->>'section_title'),
                NULLIF(btrim(COALESCE(v_first->>'section_description', '')), ''),
                v_is_active,
                v_sequence,
                v_mode,
                NULLIF(btrim(COALESCE(v_first->>'suggestion_placeholder', '')), ''),
                auth.uid()
            )
            RETURNING id INTO v_template_id;

            PERFORM public.fn_insert_evaluation_questions(v_template_id, v_questions);
            PERFORM public.fn_set_evaluation_template_programs(v_template_id, v_program_ids);

            v_provisioned := v_provisioned + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_group.first_rn,
                'code', btrim(COALESCE(v_first->>'section_title', '')),
                'message', SQLERRM
            ));
        END;
    END LOOP;

    FOR v_first IN
        SELECT r.value
        FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        WHERE btrim(COALESCE(r.value->>'section_title', '')) = ''
    LOOP
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'row', 0,
            'code', 'MISSING_TITLE',
            'message', 'Row skipped: section title is required.'
        ));
    END LOOP;

    RETURN jsonb_build_object('provisioned_count', v_provisioned, 'errors', v_errors);
END;
$function$;

-- Not called by any page or edge function
REVOKE EXECUTE ON FUNCTION public.fn_delete_term(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_delete_term_type(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_delete_special_grade_config(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_save_transmutation_table(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_delete_student(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_delete_students(uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_create_students(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_delete_enrollment(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_delete_enrollments(uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_create_enrollments(jsonb) FROM authenticated;

COMMIT;
