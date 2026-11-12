-- ====================================================================
-- Migration: 20261104025000_course_import_and_type_checks.sql
--   * fn_bulk_create_courses:
--       - a dean can only import into their own department
--       - a code that already belongs to another department is refused instead of being
--         overwritten and moved
--       - prerequisites are linked after every course in the file is saved, so a row can
--         point at a course further down
--       - a missing or invalid prerequisite no longer counts the row as an error: the course
--         is saved and the row comes back in "warnings" (and in "saved_rows" with the warning)
--   * fn_delete_course_type: refuses while any course uses the type ("N course(s) use this
--     type."); the success message no longer says "marked inactive"
-- Idempotent: CREATE OR REPLACE keeps both signatures and grants.
-- ====================================================================
BEGIN;

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
    v_dean_department_id UUID := public.fn_get_dean_department_id();
    v_existing_department_id UUID;
    v_existing_department_code TEXT;
    -- Saved rows whose prerequisites are linked after every course in the file exists
    v_saved JSONB := '[]'::JSONB;
    v_saved_row JSONB;
    v_warnings JSONB := '[]'::JSONB;
    v_row_warnings TEXT[];
    v_saved_rows JSONB := '[]'::JSONB;
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

        -- Deans import only into their own department (NULL = Admin, unscoped)
        IF v_dean_department_id IS NOT NULL AND v_department_id IS DISTINCT FROM v_dean_department_id THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'You can only import courses into your own department.'));
            CONTINUE;
        END IF;

        -- An existing code from another department is never overwritten or moved
        v_existing_department_id := NULL;
        v_existing_department_code := NULL;
        SELECT c.department_id, d.code INTO v_existing_department_id, v_existing_department_code
        FROM public.courses c
        LEFT JOIN public.departments d ON d.id = c.department_id
        WHERE c.code = v_code AND c.deleted_at IS NULL
        LIMIT 1;

        IF v_existing_department_id IS NOT NULL AND v_existing_department_id IS DISTINCT FROM v_department_id THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', format('Course code %s already belongs to department %s. Use a different code.', v_code, COALESCE(v_existing_department_code, 'another department'))));
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

            -- Prerequisites are linked after the loop, so they may point at courses later in the file
            v_saved := v_saved || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'course_id', v_course_id,
                'prerequisites', COALESCE(v_course->>'prerequisites', '')
            ));

            v_success_count := v_success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', SQLERRM));
        END;
    END LOOP;

    FOR v_saved_row IN SELECT * FROM jsonb_array_elements(v_saved)
    LOOP
        v_row_num := (v_saved_row->>'row')::INTEGER;
        v_code := v_saved_row->>'code';
        v_course_id := (v_saved_row->>'course_id')::UUID;
        v_row_warnings := ARRAY[]::TEXT[];

        IF TRIM(v_saved_row->>'prerequisites') <> '' THEN
            FOREACH v_prereq_entry IN ARRAY string_to_array(v_saved_row->>'prerequisites', '|')
            LOOP
                IF TRIM(v_prereq_entry) = '' THEN
                    CONTINUE;
                END IF;

                v_prereq_parts := string_to_array(TRIM(v_prereq_entry), ':');
                v_prereq_code := TRIM(v_prereq_parts[1]);
                v_prereq_type := COALESCE(NULLIF(TRIM(v_prereq_parts[2]), ''), 'Required');
                v_prereq_grade := NULLIF(TRIM(COALESCE(v_prereq_parts[3], '')), '');

                IF v_prereq_type NOT IN (SELECT unnest(enum_range(NULL::public.prerequisite_type))::text) THEN
                    v_row_warnings := array_append(v_row_warnings, 'prerequisite ' || v_prereq_code || ' skipped: invalid type "' || v_prereq_type || '" (use Required, Co-requisite or Recommended)');
                    CONTINUE;
                END IF;

                v_prereq_id := NULL;
                SELECT id INTO v_prereq_id
                FROM public.courses
                WHERE code = v_prereq_code AND deleted_at IS NULL;

                IF v_prereq_id IS NULL THEN
                    v_row_warnings := array_append(v_row_warnings, 'prerequisite ' || v_prereq_code || ' not found, so it was not linked');
                    CONTINUE;
                END IF;

                IF v_prereq_id = v_course_id THEN
                    v_row_warnings := array_append(v_row_warnings, 'a course cannot be a prerequisite of itself');
                    CONTINUE;
                END IF;

                BEGIN
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
                EXCEPTION WHEN OTHERS THEN
                    v_row_warnings := array_append(v_row_warnings, 'prerequisite ' || v_prereq_code || ' not linked: ' || SQLERRM);
                END;
            END LOOP;
        END IF;

        IF array_length(v_row_warnings, 1) IS NOT NULL THEN
            v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Course saved, but ' || array_to_string(v_row_warnings, '; ') || '.'
            ));
        END IF;

        v_saved_rows := v_saved_rows || jsonb_build_array(jsonb_build_object(
            'row', v_row_num,
            'code', v_code,
            'message', CASE
                WHEN array_length(v_row_warnings, 1) IS NULL THEN 'Saved'
                ELSE 'Saved with a warning: ' || array_to_string(v_row_warnings, '; ') || '.'
            END
        ));
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' course(s) processed successfully'
            || CASE WHEN jsonb_array_length(v_warnings) > 0
                    THEN ', ' || jsonb_array_length(v_warnings) || ' with prerequisite warnings'
                    ELSE '' END,
        'provisioned_count', v_success_count,
        'saved_rows', v_saved_rows,
        'warnings', v_warnings,
        'errors', v_errors
    );
END;
$function$;

-- fn_delete_course_type
CREATE OR REPLACE FUNCTION public.fn_delete_course_type(p_course_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_in_use INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF NOT EXISTS (
        SELECT 1 FROM public.course_types
        WHERE id = p_course_type_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    -- Courses that still use the type, directly or through course_course_types
    SELECT COUNT(DISTINCT c.id) INTO v_in_use
    FROM public.courses c
    WHERE c.deleted_at IS NULL
      AND (
          c.course_type_id = p_course_type_id
          OR EXISTS (
              SELECT 1 FROM public.course_course_types cct
              WHERE cct.course_id = c.id
                AND cct.course_type_id = p_course_type_id
                AND cct.deleted_at IS NULL
          )
      );

    IF v_in_use > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Cannot delete: %s course(s) use this type.', v_in_use)
        );
    END IF;

    UPDATE public.course_types
    SET
        is_active = false,
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_course_type_id;

    RETURN jsonb_build_object('success', true, 'message', 'Course type deleted successfully');
END;
$function$;

COMMIT;
