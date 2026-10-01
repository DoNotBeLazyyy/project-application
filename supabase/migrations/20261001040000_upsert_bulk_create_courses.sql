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
    FOR v_course IN SELECT * FROM jsonb_array_elements(p_courses)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_course->>'code') IS NULL OR TRIM(v_course->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', '', 'message', 'Code is required'));
            CONTINUE;
        END IF;

        IF (v_course->>'title') IS NULL OR TRIM(v_course->>'title') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Title is required'));
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE code = v_course->>'department_code' AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Department code not found: ' || COALESCE(v_course->>'department_code', 'empty')));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_type_id
        FROM public.course_types
        WHERE code = v_course->>'course_type_code' AND deleted_at IS NULL;

        IF v_course_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Course type code not found: ' || COALESCE(v_course->>'course_type_code', 'empty')));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC < 0 OR (v_course->>'lecture_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Lecture units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'laboratory_units')::NUMERIC < 0 OR (v_course->>'laboratory_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Laboratory units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC = 0 AND (v_course->>'laboratory_units')::NUMERIC = 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'At least one of lecture units or laboratory units must be greater than 0'));
            CONTINUE;
        END IF;

        -- Check if course code already exists
        SELECT id INTO v_course_id
        FROM public.courses
        WHERE code = TRIM(v_course->>'code') AND deleted_at IS NULL;

        IF v_course_id IS NOT NULL THEN
            -- Update existing course with bulk upload data
            UPDATE public.courses
            SET title = TRIM(v_course->>'title'),
                department_id = v_department_id,
                course_type_id = v_course_type_id,
                lecture_units = (v_course->>'lecture_units')::NUMERIC,
                laboratory_units = (v_course->>'laboratory_units')::NUMERIC,
                credit_hours = CASE WHEN v_course->>'credit_hours' = '' THEN NULL
                                     ELSE (v_course->>'credit_hours')::NUMERIC END,
                description = NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                is_active = COALESCE((v_course->>'is_active')::BOOLEAN, TRUE),
                updated_at = NOW(),
                updated_by = auth.uid()
            WHERE id = v_course_id;

            -- Clear existing prerequisites for re-linking
            DELETE FROM public.course_prerequisites WHERE course_id = v_course_id;
        ELSE
            -- Insert new course
            INSERT INTO public.courses (
                code, title, department_id, course_type_id,
                lecture_units, laboratory_units, credit_hours,
                description, is_active, created_by
            )
            VALUES (
                TRIM(v_course->>'code'),
                TRIM(v_course->>'title'),
                v_department_id,
                v_course_type_id,
                (v_course->>'lecture_units')::NUMERIC,
                (v_course->>'laboratory_units')::NUMERIC,
                CASE WHEN v_course->>'credit_hours' = '' THEN NULL
                     ELSE (v_course->>'credit_hours')::NUMERIC END,
                NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                COALESCE((v_course->>'is_active')::BOOLEAN, TRUE),
                auth.uid()
            )
            RETURNING id INTO v_course_id;
        END IF;

        IF v_course->>'prerequisites' IS NOT NULL AND v_course->>'prerequisites' <> '' THEN
            FOREACH v_prereq_entry IN ARRAY string_to_array(v_course->>'prerequisites', '|')
            LOOP
                v_prereq_parts := string_to_array(v_prereq_entry, ':');
                v_prereq_code := TRIM(v_prereq_parts[1]);
                v_prereq_type := TRIM(COALESCE(v_prereq_parts[2], 'Required'));
                v_prereq_grade := TRIM(COALESCE(v_prereq_parts[3], ''));

                SELECT id INTO v_prereq_id
                FROM public.courses
                WHERE code = v_prereq_code AND deleted_at IS NULL;

                IF v_prereq_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Prerequisite course code not found: ' || v_prereq_code));
                    CONTINUE;
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type, minimum_grade, created_by
                )
                VALUES (
                    v_course_id,
                    v_prereq_id,
                    v_prereq_type::public.prerequisite_type,
                    CASE WHEN v_prereq_grade = '' THEN NULL ELSE v_prereq_grade::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' course(s) processed successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;
