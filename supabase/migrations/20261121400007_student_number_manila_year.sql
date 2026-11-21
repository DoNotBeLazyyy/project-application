-- ====================================================================
-- Migration: 20261121400007_student_number_manila_year.sql
-- Student number year (audit 2026-11-21, Tier 4):
--   * fn_complete_user_profile, fn_create_my_student_profile, fn_assign_my_program,
--     fn_provision_single_user: the year in a new student number ("2027-0001") is the Manila
--     year, so a record made on Jan 1 before 8:00 AM no longer gets last year's number.
-- Bodies are the live definitions with only this edit. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_complete_user_profile(p_first_name text, p_last_name text, p_middle_name text DEFAULT NULL::text, p_suffix text DEFAULT NULL::text, p_preferred_name text DEFAULT NULL::text, p_mobile_number text DEFAULT NULL::text, p_address_line1 text DEFAULT NULL::text, p_address_line2 text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_province text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_gender text DEFAULT NULL::text, p_civil_status text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_department_id uuid DEFAULT NULL::uuid, p_program_id uuid DEFAULT NULL::uuid, p_year_level smallint DEFAULT (1)::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_student BOOLEAN;
    v_student_id UUID;
    v_student_number TEXT;
    v_seq_num BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    v_is_student := public.fn_current_user_role_codes() && ARRAY['Student'];

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, '')), ''),
        last_name = btrim(p_last_name),
        suffix = NULLIF(btrim(COALESCE(p_suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = CASE 
            WHEN btrim(COALESCE(p_gender, '')) IN ('Male', 'Female', 'Prefer not to say') 
            THEN btrim(p_gender)::public.gender_type 
            ELSE gender 
        END,
        civil_status = CASE 
            WHEN btrim(COALESCE(p_civil_status, '')) IN ('Single', 'Married', 'Widowed', 'Separated') 
            THEN btrim(p_civil_status)::public.civil_status_type 
            ELSE civil_status 
        END,
        nationality = COALESCE(NULLIF(btrim(p_nationality), ''), nationality, 'Filipino'),
        profile_completed = true,
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    IF v_is_student THEN
        SELECT id, student_number INTO v_student_id, v_student_number
        FROM public.students
        WHERE user_id = v_user_id AND deleted_at IS NULL
        LIMIT 1;

        IF v_student_id IS NULL THEN
            SELECT count(*) + 1 INTO v_seq_num FROM public.students;
            v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
                v_seq_num := v_seq_num + 1;
                v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            END LOOP;

            INSERT INTO public.students (
                user_id,
                student_number,
                program_id,
                year_level,
                status,
                admitted_at,
                created_by
            ) VALUES (
                v_user_id,
                v_student_number,
                NULL,
                1,
                'Active'::public.student_status_type,
                CURRENT_DATE,
                v_user_id
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User profile information completed successfully.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_my_student_profile(p_program_id uuid DEFAULT NULL::uuid, p_year_level smallint DEFAULT (1)::smallint, p_first_name text DEFAULT NULL::text, p_middle_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_suffix text DEFAULT NULL::text, p_preferred_name text DEFAULT NULL::text, p_mobile_number text DEFAULT NULL::text, p_address_line1 text DEFAULT NULL::text, p_address_line2 text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_province text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_gender text DEFAULT NULL::text, p_civil_status text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_student_id UUID;
    v_student_number TEXT;
    v_seq_num INT;
    v_role_id UUID;
    v_eff_year SMALLINT;
    v_curr_record RECORD;
    v_user_full_name TEXT;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_prog_code TEXT := '';
    v_prog_name TEXT := '';
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id AND deleted_at IS NULL;
    
    -- Construct full name with fallback to input parameters and email
    v_user_full_name := btrim(COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name, '') || ' ' || COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name, ''));
    IF v_user_full_name = '' THEN
        v_user_full_name := COALESCE(v_curr_record.email, 'Student');
    END IF;

    -- Ensure Student role is assigned
    SELECT id INTO v_role_id FROM public.roles WHERE lower(code) = 'student' AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
        VALUES (v_user_id, v_role_id, v_user_id, 'Student')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Provision student row if needed
    SELECT id, student_number INTO v_student_id, v_student_number
    FROM public.students
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    v_eff_year := COALESCE(p_year_level, 1);
    IF v_eff_year < 1 OR v_eff_year > 6 THEN v_eff_year := 1; END IF;

    IF v_student_id IS NULL THEN
        SELECT count(*) + 1 INTO v_seq_num FROM public.students;
        v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        END LOOP;

        INSERT INTO public.students (
            user_id,
            student_number,
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            v_user_id,
            v_student_number,
            v_eff_year,
            'Active'::public.student_status_type,
            CURRENT_DATE,
            v_user_id
        )
        RETURNING id INTO v_student_id;
    END IF;

    IF p_program_id IS NOT NULL THEN
        SELECT code, name INTO v_prog_code, v_prog_name FROM public.programs WHERE id = p_program_id AND deleted_at IS NULL;
    END IF;

    v_curr_values := jsonb_build_object(
        'first_name', COALESCE(v_curr_record.first_name, ''),
        'middle_name', COALESCE(v_curr_record.middle_name, ''),
        'last_name', COALESCE(v_curr_record.last_name, ''),
        'suffix', COALESCE(v_curr_record.suffix, ''),
        'preferred_name', COALESCE(v_curr_record.preferred_name, ''),
        'mobile_number', COALESCE(v_curr_record.mobile_number, ''),
        'address_line1', COALESCE(v_curr_record.address_line1, ''),
        'address_line2', COALESCE(v_curr_record.address_line2, ''),
        'city', COALESCE(v_curr_record.city, ''),
        'province', COALESCE(v_curr_record.province, ''),
        'postal_code', COALESCE(v_curr_record.postal_code, ''),
        'date_of_birth', CASE WHEN v_curr_record.date_of_birth IS NOT NULL THEN v_curr_record.date_of_birth::text ELSE '' END,
        'gender', COALESCE(v_curr_record.gender::text, ''),
        'civil_status', COALESCE(v_curr_record.civil_status::text, ''),
        'nationality', COALESCE(v_curr_record.nationality, ''),
        'program_id', '',
        'program_code', 'Unassigned',
        'program_name', 'Unassigned',
        'year_level', v_eff_year
    );

    v_requested_changes := jsonb_build_object(
        'first_name', COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name, ''),
        'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), COALESCE(v_curr_record.middle_name, ''), ''),
        'last_name', COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name, ''),
        'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), COALESCE(v_curr_record.suffix, ''), ''),
        'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), COALESCE(v_curr_record.preferred_name, ''), ''),
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), COALESCE(v_curr_record.mobile_number, ''), ''),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), COALESCE(v_curr_record.address_line1, ''), ''),
        'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), COALESCE(v_curr_record.address_line2, ''), ''),
        'city', COALESCE(NULLIF(btrim(p_city), ''), COALESCE(v_curr_record.city, ''), ''),
        'province', COALESCE(NULLIF(btrim(p_province), ''), COALESCE(v_curr_record.province, ''), ''),
        'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), COALESCE(v_curr_record.postal_code, ''), ''),
        'date_of_birth', CASE WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text ELSE COALESCE(v_curr_record.date_of_birth::text, '') END,
        'gender', COALESCE(NULLIF(btrim(p_gender), ''), COALESCE(v_curr_record.gender::text, ''), ''),
        'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), COALESCE(v_curr_record.civil_status::text, ''), ''),
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), COALESCE(v_curr_record.nationality, ''), ''),
        'program_id', COALESCE(p_program_id::text, ''),
        'program_code', COALESCE(v_prog_code, 'Unassigned'),
        'program_name', COALESCE(v_prog_name, 'Unassigned'),
        'year_level', v_eff_year
    );

    -- Insert or update pending request
    SELECT id INTO v_existing_request_id
    FROM public.student_profile_change_requests
    WHERE user_id = v_user_id AND status = 'Pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_request_id IS NOT NULL THEN
        UPDATE public.student_profile_change_requests
        SET requested_changes = v_requested_changes,
            current_values = v_curr_values,
            student_id = v_student_id,
            updated_at = now()
        WHERE id = v_existing_request_id;
    ELSE
        INSERT INTO public.student_profile_change_requests (
            student_id,
            user_id,
            status,
            current_values,
            requested_changes
        ) VALUES (
            v_student_id,
            v_user_id,
            'Pending',
            v_curr_values,
            v_requested_changes
        ) RETURNING id INTO v_existing_request_id;
    END IF;

    -- Record into registrar_logs
    IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = v_existing_request_id) THEN
        UPDATE public.registrar_logs
        SET action = 'PROFILE_CHANGE_REQUESTED',
            student_id = v_student_id,
            student_name = v_user_full_name,
            student_number = v_student_number,
            details = 'Student submitted profile details and program selection for Registrar verification.',
            old_values = v_curr_values,
            new_values = v_requested_changes,
            metadata = jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending'),
            created_at = now()
        WHERE (metadata->>'request_id')::uuid = v_existing_request_id;
    ELSE
        INSERT INTO public.registrar_logs (
            action,
            student_id,
            student_user_id,
            student_name,
            student_number,
            performed_by,
            performed_by_name,
            details,
            old_values,
            new_values,
            metadata
        ) VALUES (
            'PROFILE_CHANGE_REQUESTED',
            v_student_id,
            v_user_id,
            v_user_full_name,
            v_student_number,
            v_user_id,
            v_user_full_name,
            'Student submitted profile details and program selection for Registrar verification.',
            v_curr_values,
            v_requested_changes,
            jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending')
        );
    END IF;

    -- Send notifications to all Registrars
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    )
    SELECT DISTINCT ur.user_id,
           'New Student Setup Request',
           'Student ' || v_user_full_name || ' (' || COALESCE(v_student_number, 'N/A') || ') completed profile setup and requested program verification.',
           'Account'::public.notification_category_type,
           '/registrar/student-verification'
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE lower(r.code) = 'registrar'
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'pending_approval', true,
        'message', 'Your student profile and program selection have been submitted for Registrar verification and approval.',
        'student_number', v_student_number
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_assign_my_program(p_program_id uuid, p_year_level smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id          UUID := auth.uid();
    v_student_id       UUID;
    v_seq_num          INT;
    v_student_number   TEXT;
    v_target_year      SMALLINT;
    v_current_program  UUID;
    v_current_year     SMALLINT;
    v_prog_code        TEXT;
    v_prog_name        TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    PERFORM public.fn_assert_role('Student');

    -- Ensure student record exists
    SELECT s.id, s.program_id, s.year_level
    INTO v_student_id, v_current_program, v_current_year
    FROM public.students s
    WHERE s.user_id = v_user_id
      AND s.deleted_at IS NULL
    LIMIT 1;

    -- A program already on record is changed by the Registrar, not by the student
    IF v_current_program IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Your program is already set. Program shifts are handled by the Registrar.'
        );
    END IF;

    IF v_student_id IS NULL THEN
        SELECT count(*) + 1 INTO v_seq_num FROM public.students;
        v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        END LOOP;

        INSERT INTO public.students (
            user_id,
            student_number,
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            v_user_id,
            v_student_number,
            COALESCE(p_year_level, 1),
            'Active'::public.student_status_type,
            CURRENT_DATE,
            v_user_id
        )
        RETURNING id INTO v_student_id;
    END IF;

    -- Validate target program
    SELECT p.code, p.name
    INTO v_prog_code, v_prog_name
    FROM public.programs p
    WHERE p.id = p_program_id
      AND p.is_active
      AND p.deleted_at IS NULL;

    IF v_prog_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program not found or inactive.');
    END IF;

    v_target_year := COALESCE(p_year_level, v_current_year, 1);
    IF v_target_year < 1 OR v_target_year > 6 THEN
        v_target_year := 1;
    END IF;

    -- Update student program and year level
    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year,
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = v_student_id;

    -- Log lifecycle event
    INSERT INTO public.student_lifecycle_events (
        student_id,
        event_type,
        from_program_id,
        to_program_id,
        from_year_level,
        to_year_level,
        reason,
        effective_date,
        created_by
    ) VALUES (
        v_student_id,
        'Program Shift',
        v_current_program,
        p_program_id,
        v_current_year,
        v_target_year,
        CASE WHEN v_current_program IS NULL THEN 'Initial program assignment' ELSE 'Student program selection' END,
        CURRENT_DATE,
        v_user_id
    );

    -- Also update any pending student profile change requests
    UPDATE public.student_profile_change_requests
    SET requested_changes = requested_changes || jsonb_build_object(
            'program_id', p_program_id::text,
            'program_code', v_prog_code,
            'program_name', v_prog_name,
            'year_level', v_target_year
        ),
        updated_at = now()
    WHERE user_id = v_user_id AND status = 'Pending';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Program assigned successfully.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_provision_single_user(p_auth_id uuid, p_email text, p_first_name text, p_last_name text, p_role_code text, p_department_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_role_id UUID;
    v_seq_num BIGINT;
    v_student_number TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = p_role_code
    AND deleted_at IS NULL;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role code: ' || p_role_code);
    END IF;

    INSERT INTO public.users (id, email, first_name, last_name, status, department_id, profile_completed, created_by)
    VALUES (p_auth_id, p_email, p_first_name, p_last_name, 'Invited', p_department_id, false, coalesce(auth.uid(), p_auth_id))
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        deleted_at = NULL,
        status = 'Invited',
        department_id = COALESCE(EXCLUDED.department_id, users.department_id),
        profile_completed = false;

    INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
    VALUES (p_auth_id, v_role_id, coalesce(auth.uid(), p_auth_id), p_role_code)
    ON CONFLICT DO NOTHING;

    -- If student role, ensure students profile is created
    IF p_role_code = 'Student' THEN
        SELECT count(*) + 1 INTO v_seq_num FROM public.students;
        v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        END LOOP;

        INSERT INTO public.students (
            user_id,
            student_number,
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            p_auth_id,
            v_student_number,
            1,
            'Active',
            CURRENT_DATE,
            coalesce(auth.uid(), p_auth_id)
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$function$;

COMMIT;
