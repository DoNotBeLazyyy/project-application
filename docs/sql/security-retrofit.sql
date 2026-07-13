CREATE OR REPLACE FUNCTION public.fn_assert_section_staff(p_section_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_section_id IS NULL OR NOT (
        public.fn_is_section_faculty(p_section_id)
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_owns_submission(p_submission_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.assessment_submissions sub
        INNER JOIN public.enrollments e ON e.id = sub.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE sub.id = p_submission_id
          AND st.user_id = auth.uid()
          AND sub.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_enrollment_access(p_enrollment_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT e.section_id, (st.user_id = auth.uid())
    INTO v_section_id, v_is_owner
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
      AND e.deleted_at IS NULL;

    IF COALESCE(v_is_owner, false) THEN
        RETURN;
    END IF;

    IF v_section_id IS NULL OR NOT (
        public.fn_is_section_faculty(v_section_id)
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this enrollment.'
            USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_provision_single_user(p_auth_id uuid, p_email text, p_first_name text, p_last_name text, p_role_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_role_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = p_role_code
    AND deleted_at IS NULL;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role code: ' || p_role_code);
    END IF;

    INSERT INTO public.users (id, email, first_name, last_name, status)
    VALUES (p_auth_id, p_email, p_first_name, p_last_name, 'Invited')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role_id, created_by)
    VALUES (p_auth_id, v_role_id, p_auth_id)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'User provisioned successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_provision_users(p_users jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_entry          JSONB;
    v_provisioned    INTEGER := 0;
    v_errors         TEXT[]  := ARRAY[]::TEXT[];
    v_result         JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_users)
    LOOP
        v_result := public.fn_provision_single_user(
            (v_entry->>'auth_id')::UUID,
            v_entry->>'email',
            v_entry->>'first_name',
            v_entry->>'last_name',
            v_entry->>'role_code'
        );

        IF (v_result->>'success')::BOOLEAN THEN
            v_provisioned := v_provisioned + 1;
        ELSE
            v_errors := array_append(v_errors, v_entry->>'email' || ': ' || (v_result->>'message'));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',           array_length(v_errors, 1) IS NULL,
        'provisioned_count', v_provisioned,
        'errors',            to_jsonb(v_errors)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_system_settings(p_institution_name text, p_institution_short_name text, p_institution_address text, p_institution_email text, p_institution_phone text, p_institution_website text, p_institution_logo_url text, p_academic_year_start_month smallint, p_max_units_per_term smallint, p_default_term_type_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    IF p_max_units_per_term < 1 OR p_max_units_per_term > 60 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max units per term must be between 1 and 60');
    END IF;

    UPDATE public.system_settings
    SET
        institution_name = p_institution_name,
        institution_short_name = p_institution_short_name,
        institution_address = p_institution_address,
        institution_email = p_institution_email,
        institution_phone = p_institution_phone,
        institution_website = p_institution_website,
        institution_logo_url = p_institution_logo_url,
        academic_year_start_month = p_academic_year_start_month,
        max_units_per_term = p_max_units_per_term,
        default_term_type_id = p_default_term_type_id
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_system_settings() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id', ss.id,
        'institution_name', ss.institution_name,
        'institution_short_name', ss.institution_short_name,
        'institution_address', ss.institution_address,
        'institution_email', ss.institution_email,
        'institution_phone', ss.institution_phone,
        'institution_website', ss.institution_website,
        'institution_logo_url', ss.institution_logo_url,
        'academic_year_start_month', ss.academic_year_start_month,
        'max_units_per_term', ss.max_units_per_term,
        'default_term_type_id', ss.default_term_type_id
    )
    INTO v_result
    FROM public.system_settings ss
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_school_year(p_school_year_id uuid, p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = p_code
        AND id <> p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || p_code);
    END IF;

    IF p_is_active THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
        AND id <> p_school_year_id
        AND deleted_at IS NULL;
    END IF;

    UPDATE public.school_years
    SET
        code = p_code,
        label = p_label,
        start_date = p_start_date,
        end_date = p_end_date,
        is_active = p_is_active
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_term(p_term_id uuid, p_school_year_id uuid, p_term_type_id uuid, p_start_date date, p_end_date date, p_enrollment_start_date date DEFAULT NULL::date, p_enrollment_end_date date DEFAULT NULL::date, p_grading_deadline date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT status INTO v_current_status
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    IF v_current_status = 'Closed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closed terms cannot be edited');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND id <> p_term_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    UPDATE public.terms
    SET
        school_year_id = p_school_year_id,
        term_type_id = p_term_type_id,
        start_date = p_start_date,
        end_date = p_end_date,
        enrollment_start_date = p_enrollment_start_date,
        enrollment_end_date = p_enrollment_end_date,
        grading_deadline = p_grading_deadline
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Term updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_term_type(p_term_type_id uuid, p_code text, p_label text, p_sequence smallint, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

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
        code = p_code,
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
$$;

CREATE OR REPLACE FUNCTION public.fn_advance_term_status(p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_status TEXT;
    v_next_status TEXT;
    v_school_year_id UUID;
    v_start_date DATE;
    v_end_date DATE;
    v_grading_deadline DATE;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT status, school_year_id, start_date, end_date, grading_deadline
    INTO v_current_status, v_school_year_id, v_start_date, v_end_date, v_grading_deadline
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    v_next_status := CASE v_current_status
        WHEN 'Upcoming' THEN 'Enrollment Open'
        WHEN 'Enrollment Open' THEN 'Ongoing'
        WHEN 'Ongoing' THEN 'Grading Period'
        WHEN 'Grading Period' THEN 'Closed'
        ELSE NULL
    END;

    IF v_next_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term is already closed and cannot be advanced');
    END IF;

    IF v_next_status = 'Ongoing' THEN
        IF EXISTS (
            SELECT 1 FROM public.terms
            WHERE school_year_id = v_school_year_id
            AND status IN ('Ongoing', 'Grading Period')
            AND id <> p_term_id
            AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Another term in this school year is already Ongoing or in Grading Period');
        END IF;
    END IF;

    UPDATE public.terms
    SET status = v_next_status
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Term status advanced to ' || v_next_status,
        'next_status', v_next_status,
        'previous_status', v_current_status
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_roles() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'code', r.code,
                'label', r.label
            )
            ORDER BY r.label ASC
        )
        FROM public.roles r
        WHERE r.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_role_by_id(p_role_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'label', r.label,
        'description', r.description
    )
    INTO v_result
    FROM public.roles r
    WHERE r.id = p_role_id
    AND r.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_roles_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    v_base_query := '
        SELECT
            r.id,
            r.code,
            r.label,
            r.description,
            COUNT(*) OVER() AS total_count
        FROM public.roles r
        WHERE r.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || ' AND (r.label ILIKE ' || quote_literal('%' || p_search || '%') || ' OR r.code ILIKE ' || quote_literal('%' || p_search || '%') || ')';
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_grading_config(p_passing_grade numeric, p_max_absence_percentage numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_passing_grade < 1.0 OR p_passing_grade > 5.0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Passing grade must be between 1.0 and 5.0');
    END IF;

    IF p_max_absence_percentage <= 0 OR p_max_absence_percentage > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max absence percentage must be between 1 and 100');
    END IF;

    UPDATE public.grading_config
    SET
        passing_grade = p_passing_grade,
        max_absence_percentage = p_max_absence_percentage
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading config not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Grading configuration updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_department(p_department_id uuid, p_code text, p_name text, p_description text DEFAULT NULL::text, p_head_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND id <> p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    IF p_head_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_head_user_id
            AND r.code IN ('Faculty', 'Dean')
            AND ur.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Department head must have a Faculty or Dean role');
        END IF;
    END IF;

    UPDATE public.departments
    SET
        code = p_code,
        name = p_name,
        description = NULLIF(p_description, ''),
        head_user_id = p_head_user_id
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_program(p_program_id uuid, p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE code = p_code
        AND id <> p_program_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program code already exists: ' || p_code);
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    UPDATE public.programs
    SET
        code = p_code,
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
END;$$;

CREATE OR REPLACE FUNCTION public.fn_update_program_level(p_program_level_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE code = p_code
        AND id <> p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level code already exists: ' || p_code);
    END IF;

    UPDATE public.program_levels
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_course_type(p_course_type_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE code = p_code
        AND id <> p_course_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type code already exists: ' || p_code);
    END IF;

    UPDATE public.course_types
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(p_curriculum_map_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_program_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
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
        is_elective = p_is_elective
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_section(p_section_id uuid, p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status public.section_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND id <> p_section_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    UPDATE public.sections
    SET
        term_id      = p_term_id,
        course_id    = p_course_id,
        faculty_id   = p_faculty_id,
        section_code = p_section_code,
        room         = p_room,
        max_slots    = p_max_slots,
        status       = p_status
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_student(p_student_id uuid, p_student_number text, p_program_id uuid, p_year_level smallint, p_admitted_at date, p_status public.student_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE student_number = p_student_number
        AND id <> p_student_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student number already exists.');
    END IF;

    UPDATE public.students
    SET
        student_number = p_student_number,
        program_id     = p_program_id,
        year_level     = p_year_level,
        admitted_at    = p_admitted_at,
        status         = p_status
    WHERE id = p_student_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_enrollment(p_enrollment_id uuid, p_status public.enrollment_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET status = p_status
    WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollment updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_student(
    p_student_id uuid,
    p_section_ids uuid[],
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL,
    p_override_prerequisites boolean DEFAULT false
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_section_id UUID;
    v_outcome    JSONB;
    v_enrolled   INTEGER := 0;
    v_errors     JSONB := '[]'::JSONB;
    v_total      INTEGER := COALESCE(array_length(p_section_ids, 1), 0);
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_total = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Select at least one section to enroll.',
            'enrolled_count', 0,
            'errors', v_errors
        );
    END IF;

    FOREACH v_section_id IN ARRAY p_section_ids
    LOOP
        BEGIN
            v_outcome := public.fn_enroll_student_section(
                p_student_id,
                v_section_id,
                p_allow_conflict,
                p_conflict_reason,
                p_override_prerequisites
            );

            IF (v_outcome->>'success')::BOOLEAN THEN
                v_enrolled := v_enrolled + 1;
            ELSE
                v_errors := v_errors || jsonb_build_object(
                    'section_id', v_section_id,
                    'code', v_outcome->>'code',
                    'message', v_outcome->>'message'
                );
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'section_id', v_section_id,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    IF v_enrolled = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No sections were enrolled. ' || (v_errors->0->>'message'),
            'enrolled_count', 0,
            'errors', v_errors
        );
    END IF;

    IF jsonb_array_length(v_errors) > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', v_enrolled || ' of ' || v_total || ' sections enrolled. ' ||
                jsonb_array_length(v_errors) || ' were skipped.',
            'enrolled_count', v_enrolled,
            'errors', v_errors
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student enrolled in ' || v_enrolled || ' section(s).',
        'enrolled_count', v_enrolled,
        'errors', v_errors
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_students(p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_row        JSONB;
    v_index      INTEGER := 0;
    v_errors     JSONB := '[]'::JSONB;
    v_enrolled   INTEGER := 0;
    v_student_id UUID;
    v_term_id    UUID;
    v_section_id UUID;
    v_code       TEXT;
    v_codes      TEXT[];
    v_outcome    JSONB;
    v_allow      BOOLEAN;
    v_override   BOOLEAN;
    v_reason     TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE student_number = trim(v_row->>'student_number')
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_student_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'STUDENT_NOT_FOUND',
                    'message', 'Student not found: ' || COALESCE(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            IF COALESCE(trim(v_row->>'term_label'), '') = '' THEN
                v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
            ELSE
                SELECT t.id INTO v_term_id
                FROM public.terms t
                INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
                AND t.deleted_at IS NULL
                LIMIT 1;
            END IF;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || COALESCE(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT array_agg(trimmed)
            INTO v_codes
            FROM (
                SELECT trim(raw) AS trimmed
                FROM unnest(string_to_array(COALESCE(v_row->>'section_codes', ''), '|')) AS raw
                WHERE trim(raw) <> ''
            ) parsed;

            IF v_codes IS NULL OR array_length(v_codes, 1) = 0 THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'NO_SECTIONS',
                    'message', 'No section codes provided for ' || COALESCE(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            v_allow    := lower(COALESCE(trim(v_row->>'allow_conflict'), '')) IN ('true', 't', 'yes', '1');
            v_override := lower(COALESCE(trim(v_row->>'override_prerequisites'), '')) IN ('true', 't', 'yes', '1');
            v_reason   := NULLIF(trim(COALESCE(v_row->>'conflict_reason', '')), '');

            FOREACH v_code IN ARRAY v_codes
            LOOP
                SELECT id INTO v_section_id
                FROM public.sections
                WHERE section_code = v_code
                AND term_id = v_term_id
                AND deleted_at IS NULL
                LIMIT 1;

                IF v_section_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'SECTION_NOT_FOUND',
                        'message', 'Section not found in term: ' || v_code
                    );
                    CONTINUE;
                END IF;

                v_outcome := public.fn_enroll_student_section(
                    v_student_id,
                    v_section_id,
                    v_allow,
                    v_reason,
                    v_override
                );

                IF (v_outcome->>'success')::BOOLEAN THEN
                    v_enrolled := v_enrolled + 1;
                ELSE
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', v_outcome->>'code',
                        'message', (v_row->>'student_number') || ': ' || (v_outcome->>'message')
                    );
                END IF;
            END LOOP;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_enrolled,
        'errors', v_errors
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_evaluate_student_year_level(p_student_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_program_id      UUID;
    v_current_year    SMALLINT;
    v_new_year        SMALLINT;
    v_check_year      SMALLINT;
    v_required_count  INTEGER;
    v_completed_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT program_id, year_level
    INTO v_program_id, v_current_year
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found or has no program assigned.');
    END IF;

    v_new_year := v_current_year;

    FOR v_check_year IN 1..5 LOOP
        SELECT COUNT(*)
        INTO v_required_count
        FROM public.curriculum_maps cm
        WHERE cm.program_id = v_program_id
        AND cm.year_level = v_check_year
        AND cm.is_elective = false
        AND cm.deleted_at IS NULL;

        IF v_required_count = 0 THEN
            CONTINUE;
        END IF;

        SELECT COUNT(DISTINCT e.id)
        INTO v_completed_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.curriculum_maps cm ON cm.course_id = s.course_id
            AND cm.program_id = v_program_id
            AND cm.year_level = v_check_year
            AND cm.is_elective = false
            AND cm.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.status = 'Completed'
        AND e.deleted_at IS NULL;

        IF v_completed_count >= v_required_count THEN
            v_new_year := LEAST(v_check_year + 1, 6);
        ELSE
            EXIT;
        END IF;
    END LOOP;

    IF v_new_year <> v_current_year THEN
        UPDATE public.students
        SET year_level = v_new_year
        WHERE id = p_student_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Year level evaluated successfully.',
        'previous_year_level', v_current_year,
        'new_year_level', v_new_year
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_student_by_id(p_student_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT jsonb_build_object(
        'id',             st.id,
        'user_id',        st.user_id,
        'student_number', st.student_number,
        'year_level',     st.year_level,
        'program_id',     st.program_id,
        'status',         st.status,
        'admitted_at',    st.admitted_at
    )
    INTO v_result
    FROM public.students st
    WHERE st.id = p_student_id
    AND st.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_students() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             st.id,
                'student_number', st.student_number,
                'label',          st.student_number || ' — ' || u.first_name || ' ' || u.last_name
            )
            ORDER BY st.student_number ASC
        ), '[]'::JSONB)
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE st.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_students_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels smallint[] DEFAULT NULL::smallint[], p_statuses text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE st.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND st.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_year_levels IS NOT NULL AND array_length(p_year_levels, 1) > 0 THEN
        v_where := v_where || ' AND st.year_level = ANY(' || quote_literal(p_year_levels::TEXT) || '::smallint[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND st.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.student_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            st.id,
            st.student_number,
            st.year_level,
            st.status,
            st.admitted_at,
            st.program_id,
            p.code AS program_code,
            p.name AS program_name,
            st.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.status AS user_status,
            COUNT(*) OVER() AS total_count
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'st.student_number ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_by_id(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT jsonb_build_object(
        'id',         e.id,
        'student_id', e.student_id,
        'section_id', e.section_id,
        'status',     e.status
    )
    INTO v_result
    FROM public.enrollments e
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_enrollments_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_ids uuid[] DEFAULT NULL::uuid[], p_section_ids uuid[] DEFAULT NULL::uuid[], p_statuses text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_section_ids IS NOT NULL AND array_length(p_section_ids, 1) > 0 THEN
        v_where := v_where || ' AND e.section_id = ANY(' || quote_literal(p_section_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND e.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.enrollment_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            e.id,
            e.student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS student_name,
            e.section_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            e.status,
            e.enrolled_at,
            e.final_grade,
            e.is_grade_visible,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.enrolled_at DESC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_student_detail(
    p_student_id uuid,
    p_term_id uuid DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_term_id UUID := p_term_id;
    v_result  JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT jsonb_build_object(
        'id', st.id,
        'student_number', st.student_number,
        'student_name', u.first_name || ' ' || u.last_name,
        'email', u.email,
        'year_level', st.year_level,
        'status', st.status,
        'admitted_at', st.admitted_at,
        'program_id', st.program_id,
        'program_code', COALESCE(p.code, '—'),
        'program_name', COALESCE(p.name, 'No program assigned'),
        'term_id', v_term_id,
        'term_label', COALESCE((
            SELECT tt.label || ' - ' || sy.label
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE t.id = v_term_id AND t.deleted_at IS NULL
        ), 'No active term'),
        'current_load', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'enrollment_id', e.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'status', e.status,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'faculty_name', COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned'),
                'schedule_label', COALESCE((
                    SELECT string_agg(
                        ss.day_of_week::TEXT || ' ' ||
                        to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                        to_char(ss.time_end, 'HH12:MI AM'),
                        ', ' ORDER BY ss.day_of_week, ss.time_start
                    )
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                ), 'No schedule set')
            ) ORDER BY c.code)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
            WHERE e.student_id = st.id
            AND e.deleted_at IS NULL
            AND e.status NOT IN ('Dropped', 'Withdrawn')
            AND s.term_id = v_term_id
        ), '[]'::JSONB)
    ) INTO v_result
    FROM public.students st
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_enrollment_students_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL,
    p_sort jsonb DEFAULT NULL,
    p_term_id uuid DEFAULT NULL,
    p_program_ids uuid[] DEFAULT NULL,
    p_year_levels integer[] DEFAULT NULL,
    p_statuses text[] DEFAULT NULL,
    p_enrollment_states text[] DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_term_id    UUID := p_term_id;
    v_term_lit   TEXT;
    v_base_query TEXT;
    v_where      TEXT := 'WHERE st.deleted_at IS NULL';
    v_load_exists TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    v_term_lit := COALESCE(quote_literal(v_term_id::TEXT), quote_literal('00000000-0000-0000-0000-000000000000'));

    v_load_exists := format(
        'EXISTS (
            SELECT 1 FROM public.enrollments le
            INNER JOIN public.sections ls ON ls.id = le.section_id AND ls.deleted_at IS NULL
            WHERE le.student_id = st.id
            AND le.deleted_at IS NULL
            AND le.status = ''Enrolled''
            AND ls.term_id = %s::uuid
        )',
        v_term_lit
    );

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND st.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_year_levels IS NOT NULL AND array_length(p_year_levels, 1) > 0 THEN
        v_where := v_where || ' AND st.year_level = ANY(' || quote_literal(p_year_levels::TEXT) || '::int[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND st.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.student_status_type[])';
    END IF;

    IF p_enrollment_states IS NOT NULL AND array_length(p_enrollment_states, 1) = 1 THEN
        IF p_enrollment_states[1] = 'Enrolled' THEN
            v_where := v_where || ' AND ' || v_load_exists;
        ELSIF p_enrollment_states[1] = 'Not Enrolled' THEN
            v_where := v_where || ' AND NOT ' || v_load_exists;
        END IF;
    END IF;

    v_base_query := format(
        'SELECT
            st.id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS student_name,
            u.email,
            st.year_level,
            st.status,
            st.program_id,
            COALESCE(p.code, ''—'') AS program_code,
            COALESCE(p.name, ''No program assigned'') AS program_name,
            COALESCE(ld.enrolled_count, 0)::INT AS enrolled_count,
            COALESCE(ld.enrolled_units, 0)::NUMERIC AS enrolled_units,
            CASE WHEN COALESCE(ld.enrolled_count, 0) > 0 THEN ''Enrolled'' ELSE ''Not Enrolled'' END AS enrollment_state,
            COUNT(*) OVER() AS total_count
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) AS enrolled_count,
                COALESCE(SUM(c.total_units), 0) AS enrolled_units
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE e.student_id = st.id
            AND e.deleted_at IS NULL
            AND e.status = ''Enrolled''
            AND s.term_id = %s::uuid
        ) ld ON TRUE
        %s',
        v_term_lit,
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'student_number ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_eligible_sections(
    p_student_id uuid,
    p_term_id uuid DEFAULT NULL,
    p_search text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_term_id     UUID := p_term_id;
    v_program_id  UUID;
    v_year_level  SMALLINT;
    v_term_type   UUID;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT program_id, year_level INTO v_program_id, v_year_level
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL OR v_term_id IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    SELECT term_type_id INTO v_term_type
    FROM public.terms
    WHERE id = v_term_id AND deleted_at IS NULL;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            to_jsonb(y) ORDER BY y.is_recommended DESC, y.course_code, y.section_code
        ), '[]'::JSONB)
        FROM (
            SELECT
                x.*,
                (x.slots_taken >= x.max_slots) AS is_full
            FROM (
                SELECT
                    s.id AS section_id,
                    s.section_code,
                    s.status::TEXT AS section_status,
                    c.id AS course_id,
                    c.code AS course_code,
                    c.title AS course_title,
                    c.total_units AS units,
                    COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned') AS faculty_name,
                    COALESCE(s.room, '—') AS room,
                    s.max_slots::INT AS max_slots,
                    (
                        SELECT COUNT(*)::INT
                        FROM public.enrollments e2
                        WHERE e2.section_id = s.id
                        AND e2.deleted_at IS NULL
                        AND e2.status NOT IN ('Dropped', 'Withdrawn')
                    ) AS slots_taken,
                    cm.year_level::INT AS curriculum_year_level,
                    cm.is_elective,
                    (
                        cm.year_level = v_year_level
                        AND (cm.term_type_id IS NULL OR cm.term_type_id = v_term_type)
                    ) AS is_recommended,
                    public.fn_get_schedule_conflicts(p_student_id, s.id) AS conflict_with,
                    public.fn_get_unmet_prerequisites(p_student_id, c.id) AS unmet_prerequisites,
                    COALESCE((
                        SELECT string_agg(
                            ss.day_of_week::TEXT || ' ' ||
                            to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                            to_char(ss.time_end, 'HH12:MI AM'),
                            ', ' ORDER BY ss.day_of_week, ss.time_start
                        )
                        FROM public.section_schedules ss
                        WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                    ), 'No schedule set') AS schedule_label
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                INNER JOIN LATERAL (
                    SELECT cmi.year_level, cmi.sequence, cmi.is_elective, cmi.term_type_id
                    FROM public.curriculum_maps cmi
                    WHERE cmi.course_id = c.id
                    AND cmi.program_id = v_program_id
                    AND cmi.deleted_at IS NULL
                    ORDER BY cmi.year_level, cmi.sequence
                    LIMIT 1
                ) cm ON TRUE
                LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
                WHERE s.deleted_at IS NULL
                AND s.term_id = v_term_id
                AND s.status NOT IN ('Closed', 'Cancelled')
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s3 ON s3.id = e.section_id AND s3.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status IN ('Enrolled', 'Completed')
                    AND s3.course_id = c.id
                )
                AND (
                    p_search IS NULL
                    OR p_search = ''
                    OR c.code ILIKE '%' || p_search || '%'
                    OR c.title ILIKE '%' || p_search || '%'
                    OR s.section_code ILIKE '%' || p_search || '%'
                )
            ) x
        ) y
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_grade_release_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'WITH grading_period_stats AS (
            SELECT
                gp.id AS grading_period_id,
                gp.term_id,
                gp.name AS grading_period_name,
                gp.sequence,
                e.section_id,
                COUNT(sfg.id) AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Released'') AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Approved'') AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Draft'') AS draft_count
            FROM public.grading_periods gp
            LEFT JOIN public.enrollments e
                ON e.section_id IN (
                    SELECT id FROM public.sections WHERE term_id = gp.term_id AND deleted_at IS NULL
                )
                AND e.deleted_at IS NULL
            LEFT JOIN public.section_final_grades sfg
                ON sfg.grading_period_id = gp.id
                AND sfg.enrollment_id = e.id
                AND sfg.deleted_at IS NULL
            WHERE gp.deleted_at IS NULL
            GROUP BY gp.id, gp.term_id, gp.name, gp.sequence, e.section_id
        ),
        grading_period_agg AS (
            SELECT
                section_id,
                jsonb_agg(jsonb_build_object(
                    ''grading_period_id'', grading_period_id,
                    ''grading_period_name'', grading_period_name,
                    ''sequence'', sequence,
                    ''total_grades'', total_grades,
                    ''released_count'', released_count,
                    ''approved_count'', approved_count,
                    ''draft_count'', draft_count
                ) ORDER BY sequence ASC) AS grading_periods
            FROM grading_period_stats
            WHERE section_id IS NOT NULL
            GROUP BY section_id
        )
        SELECT
            s.id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            u.first_name || '' '' || u.last_name AS faculty_name,
            tt.label || '' - '' || sy.label AS term_label,
            s.status AS section_status,
            gpa.grading_periods,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN grading_period_agg gpa ON gpa.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_grade_release_schedule(p_term_id UUID) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $fn$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'grading_period_id',   gp.id,
                'grading_period_name', gp.name,
                'sequence',            gp.sequence,
                'start_date',          gp.start_date,
                'end_date',            gp.end_date,
                'release_at',          gp.release_at,
                'total_grades',        stats.total_grades,
                'released_count',      stats.released_count,
                'approved_count',      stats.approved_count,
                'draft_count',         stats.draft_count,
                'blocked_count',       stats.blocked_count
            ) ORDER BY gp.sequence ASC
        )
        FROM public.grading_periods gp
        LEFT JOIN LATERAL (
            SELECT
                COUNT(sfg.id)                                                    AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Released')             AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Approved')             AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Draft')                AS draft_count,
                COUNT(sfg.id) FILTER (
                    WHERE sfg.status <> 'Released'
                      AND NOT public.fn_check_evaluation_completion(sfg.enrollment_id, gp.id)
                )                                                                AS blocked_count
            FROM public.section_final_grades sfg
            WHERE sfg.grading_period_id = gp.id
              AND sfg.deleted_at        IS NULL
        ) stats ON true
        WHERE gp.term_id    = p_term_id
          AND gp.deleted_at IS NULL
    ), '[]'::jsonb);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_get_grade_report(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT jsonb_agg(
    jsonb_build_object(
      'grading_period_id',   sfg.grading_period_id,
      'grading_period_name', gp.name,
      'grading_period_seq',  gp.sequence,
      'raw_grade',           sfg.raw_grade,
      'final_grade',         sfg.final_grade,
      'transmuted_grade',    sfg.transmuted_grade,
      'status',              sfg.status,
      'remarks',             sfg.remarks,
      'approved_at',         sfg.approved_at,
      'released_at',         sfg.released_at,
      'is_grade_visible',    e.is_grade_visible,
      'components', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'component_name',   gc.name,
            'weight',           gc.weight,
            'earned_score',     COALESCE(SUM(asub.final_score), 0),
            'total_points',     COALESCE(SUM(ai.total_points),  0)
          )
        )
        FROM public.grading_components gc
        LEFT JOIN public.assessment_items ai
          ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
        LEFT JOIN public.assessment_submissions asub
          ON asub.assessment_item_id = ai.id
          AND asub.enrollment_id     = p_enrollment_id
          AND asub.status            = 'Graded'
          AND asub.deleted_at        IS NULL
        WHERE gc.section_id        = e.section_id
          AND gc.grading_period_id = sfg.grading_period_id
          AND gc.deleted_at        IS NULL
        GROUP BY gc.id, gc.name, gc.weight
      )
    )
    ORDER BY gp.sequence
  )
  INTO v_result
  FROM public.section_final_grades sfg
  INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id
  INNER JOIN public.enrollments e      ON e.id  = sfg.enrollment_id
  WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.deleted_at    IS NULL
    AND gp.deleted_at     IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'grades',        COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_deans_list(p_term_id uuid, p_min_gwa numeric DEFAULT 1.75) RETURNS TABLE(student_id uuid, student_number text, full_name text, program_code text, program_name text, gwa numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  RETURN QUERY
  WITH student_gwas AS (
    SELECT
      e.student_id                                              AS sid,
      ROUND(
        SUM(
          COALESCE(sfg.transmuted_grade, sfg.final_grade) * c.total_units
        ) / NULLIF(SUM(c.total_units), 0),
        4
      )                                                         AS computed_gwa,
      SUM(c.total_units)                                        AS units
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e     ON e.id   = sfg.enrollment_id
    INNER JOIN public.sections sec      ON sec.id  = e.section_id
    INNER JOIN public.courses c         ON c.id    = sec.course_id
    WHERE sec.term_id     = p_term_id
      AND sfg.status      = 'Released'
      AND e.deleted_at    IS NULL
      AND sfg.deleted_at  IS NULL
      AND c.deleted_at    IS NULL
    GROUP BY e.student_id
    HAVING SUM(c.total_units) > 0
  )
  SELECT
    st.id                                                       AS student_id,
    st.student_number                                           AS student_number,
    TRIM(u.first_name || ' ' ||
      COALESCE(u.middle_name || ' ', '') ||
      u.last_name)                                              AS full_name,
    p.code                                                      AS program_code,
    p.name                                                      AS program_name,
    sg.computed_gwa                                             AS gwa
  FROM student_gwas sg
  INNER JOIN public.students st  ON st.id  = sg.sid
  INNER JOIN public.users u      ON u.id   = st.user_id
  INNER JOIN public.programs p   ON p.id   = st.program_id
  WHERE sg.computed_gwa          <= p_min_gwa
    AND st.deleted_at            IS NULL
    AND u.deleted_at             IS NULL
    AND p.deleted_at             IS NULL
  ORDER BY sg.computed_gwa ASC;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_student_clearance_summary(p_student_id uuid, p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total    INTEGER;
  v_cleared  INTEGER;
  v_pending  INTEGER;
  v_flagged  INTEGER;
  v_details  JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT
    COUNT(*)                                            AS total,
    COUNT(*) FILTER (WHERE sc.status = 'Cleared')      AS cleared,
    COUNT(*) FILTER (WHERE sc.status = 'Pending')      AS pending,
    COUNT(*) FILTER (WHERE sc.status = 'Flagged')      AS flagged
  INTO v_total, v_cleared, v_pending, v_flagged
  FROM public.student_clearances sc
  WHERE sc.student_id = p_student_id
    AND sc.term_id    = p_term_id
    AND sc.deleted_at IS NULL;

  SELECT jsonb_agg(
    jsonb_build_object(
      'requirement_id',   sc.requirement_id,
      'requirement_code', cr.code,
      'requirement_name', cr.name,
      'status',           sc.status,
      'remarks',          sc.remarks,
      'flagged_reason',   sc.flagged_reason,
      'cleared_at',       sc.cleared_at
    )
  )
  INTO v_details
  FROM public.student_clearances sc
  INNER JOIN public.clearance_requirements cr ON cr.id = sc.requirement_id
  WHERE sc.student_id = p_student_id
    AND sc.term_id    = p_term_id
    AND sc.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'student_id',    p_student_id,
    'term_id',       p_term_id,
    'total',         v_total,
    'cleared',       v_cleared,
    'pending',       v_pending,
    'flagged',       v_flagged,
    'is_fully_cleared', (v_total > 0 AND v_flagged = 0 AND v_pending = 0),
    'requirements',  COALESCE(v_details, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_users_by_roles(p_role_codes text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'full_name', u.first_name || ' ' || u.last_name,
                'role_label', r.label
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::jsonb)
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        AND (p_role_codes IS NULL OR r.code = ANY(p_role_codes))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_attendance_sessions(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           ats.id,
                'session_date', ats.session_date,
                'notes',        ats.notes
            )
            ORDER BY ats.session_date DESC
        ), '[]'::JSONB)
        FROM public.attendance_sessions ats
        WHERE ats.section_id = p_section_id
        AND ats.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_grading_components(p_section_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',     gc.id,
                'name',   gc.name,
                'weight', gc.weight
            )
            ORDER BY gc.name ASC
        ), '[]'::JSONB)
        FROM public.grading_components gc
        WHERE gc.section_id = p_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_grading_periods_by_section(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',         gp.id,
                'name',       gp.name,
                'sequence',   gp.sequence,
                'weight',     gp.weight,
                'start_date', gp.start_date,
                'end_date',   gp.end_date
            )
            ORDER BY gp.sequence ASC
        ), '[]'::JSONB)
        FROM public.grading_periods gp
        INNER JOIN public.sections s ON s.term_id = gp.term_id
        WHERE s.id = p_section_id
        AND s.deleted_at IS NULL
        AND gp.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_calculate_all_grades_for_period(p_section_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment      RECORD;
  v_result          JSONB;
  v_success_count   INTEGER := 0;
  v_failure_count   INTEGER := 0;
  v_failures        JSONB   := '[]'::jsonb;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

  FOR v_enrollment IN
    SELECT e.id
    FROM public.enrollments e
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
  LOOP
    v_result := fn_calculate_final_grade(v_enrollment.id, p_grading_period_id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failure_count := v_failure_count + 1;
      v_failures := v_failures || jsonb_build_object(
        'enrollment_id', v_enrollment.id,
        'reason',        v_result->>'message'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',       true,
    'section_id',    p_section_id,
    'period_id',     p_grading_period_id,
    'processed',     v_success_count + v_failure_count,
    'succeeded',     v_success_count,
    'failed',        v_failure_count,
    'failures',      v_failures
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_attendance_records(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff((
        SELECT ase.section_id
        FROM public.attendance_sessions ase
        WHERE ase.id = p_session_id
          AND ase.deleted_at IS NULL
    ));

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            ar.id,
                'enrollment_id', ar.enrollment_id,
                'student_number', st.student_number,
                'full_name',     u.first_name || ' ' || u.last_name,
                'status',        ar.status,
                'remarks',       ar.remarks
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.attendance_records ar
        INNER JOIN public.enrollments e ON e.id = ar.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE ar.attendance_session_id = p_session_id
        AND ar.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    PERFORM public.fn_assert_section_staff((
        SELECT ai.section_id
        FROM public.assessment_items ai
        WHERE ai.id = p_assessment_id
          AND ai.deleted_at IS NULL
    ));

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             aq.id,
                'question_text',  aq.question_text,
                'question_type',  aq.question_type,
                'points',         aq.points,
                'sequence',       aq.sequence,
                'explanation',    aq.explanation,
                'is_required',    aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'choices', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          ac.id,
                            'choice_text', ac.choice_text,
                            'is_correct',  ac.is_correct,
                            'sequence',    ac.sequence
                        )
                        ORDER BY ac.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY aq.sequence ASC
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
        AND aq.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_attendance_summary(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total    INTEGER;
  v_present  INTEGER;
  v_absent   INTEGER;
  v_late     INTEGER;
  v_excused  INTEGER;
BEGIN
    PERFORM public.fn_assert_enrollment_access(p_enrollment_id);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ar.status = 'Present'),
    COUNT(*) FILTER (WHERE ar.status = 'Absent'),
    COUNT(*) FILTER (WHERE ar.status = 'Late'),
    COUNT(*) FILTER (WHERE ar.status = 'Excused')
  INTO v_total, v_present, v_absent, v_late, v_excused
  FROM public.attendance_records ar
  WHERE ar.enrollment_id = p_enrollment_id
    AND ar.deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id',      p_enrollment_id,
    'total_sessions',     v_total,
    'present',            v_present,
    'absent',             v_absent,
    'late',               v_late,
    'excused',            v_excused,
    'attendance_rate',    CASE WHEN v_total > 0
                            THEN ROUND(((v_present + v_late + v_excused)::NUMERIC / v_total) * 100, 2)
                            ELSE 0 END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_submit_assessment(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment_id    UUID;
  v_assessment_id    UUID;
  v_status           submission_status_type;
  v_expires_at       TIMESTAMPTZ;
  v_due_at           TIMESTAMPTZ;
  v_is_late          BOOLEAN := false;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

  SELECT
    asub.enrollment_id,
    asub.assessment_item_id,
    asub.status,
    asub.time_limit_expires_at
  INTO v_enrollment_id, v_assessment_id, v_status, v_expires_at
  FROM public.assessment_submissions asub
  WHERE asub.id         = p_submission_id
    AND asub.deleted_at IS NULL;

  IF v_enrollment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission not found.');
  END IF;

  IF v_status NOT IN ('In Progress', 'Not Started') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission is not in a submittable state.');
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission window has expired.');
  END IF;

  SELECT ai.due_at INTO v_due_at
  FROM public.assessment_items ai
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  UPDATE public.assessment_submissions
  SET
    status       = CASE WHEN v_is_late THEN 'Late' ELSE 'Submitted' END,
    submitted_at = now(),
    is_late      = v_is_late
  WHERE id = p_submission_id;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted',
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'success',       true,
    'submission_id', p_submission_id,
    'submitted_at',  now(),
    'is_late',       v_is_late,
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_record_heartbeat(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id  UUID;
  v_expires_at  TIMESTAMPTZ;
  v_status      submission_timer_status;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

  SELECT id, server_expires_at, status
  INTO v_session_id, v_expires_at, v_status
  FROM public.assessment_timer_sessions
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session not found.');
  END IF;

  IF v_status != 'Active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session is no longer active.', 'status', v_status);
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    PERFORM fn_expire_overdue_submissions();
    RETURN jsonb_build_object('success', false, 'message', 'Session has expired.', 'expired_at', v_expires_at);
  END IF;

  INSERT INTO public.assessment_timer_heartbeats (session_id, recorded_at, client_ip)
  VALUES (v_session_id, now(), inet_client_addr());

  UPDATE public.assessment_timer_sessions
  SET last_activity_at = now()
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'success',      true,
    'session_id',   v_session_id,
    'expires_at',   v_expires_at,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_expires_at - now()))::INTEGER,
    'recorded_at',  now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_notifications_read(p_user_id uuid, p_notification_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_updated INTEGER;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

  IF p_notification_ids IS NULL THEN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = auth.uid()
      AND is_read     = false
      AND deleted_at  IS NULL;
  ELSE
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = auth.uid()
      AND id          = ANY(p_notification_ids)
      AND is_read     = false
      AND deleted_at  IS NULL;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',  true,
    'marked',   v_updated
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) c
              WHERE c LIKE 'search_path=%'
          )
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND p.proname LIKE 'fn\_%'
          AND p.prorettype <> 'pg_catalog.trigger'::regtype
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
    v_internal TEXT[] := ARRAY[
        'fn_analytics_resolve_student',
        'fn_analytics_assert_section',
        'fn_analytics_submission_scores',
        'fn_analytics_engagement',
        'fn_analytics_item_submissions',
        'fn_analytics_risk_score',
        'fn_analytics_risk_level',
        'fn_dashboard_active_term',
        'fn_dashboard_term_label',
        'fn_dashboard_enrollment_risk',
        'fn_build_pageable_dto',
        'fn_notify_user',
        'fn_broadcast_section_notification',
        'fn_compute_student_gwa',
        'fn_student_course_grades',
        'fn_expire_overdue_submissions',
        'fn_release_grades_after_evaluation',
        'fn_sweep_scheduled_grade_releases',
        'fn_resolve_audience',
        'fn_apply_user_roles',
        'fn_seed_section_grading',
        'fn_seed_term_grading_periods',
        'fn_emit_announcement_notifications',
        'fn_emit_event_notifications',
        'fn_assert_announcement_sections',
        'fn_validate_evaluation_programs',
        'fn_validate_evaluation_questions',
        'fn_check_evaluation_completion',
        'fn_get_enrollment_target_term',
        'fn_get_schedule_conflicts',
        'fn_get_unmet_prerequisites',
        'fn_get_student_evaluation_status',
        'fn_list_applicable_evaluation_templates'
    ];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY (v_internal)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
