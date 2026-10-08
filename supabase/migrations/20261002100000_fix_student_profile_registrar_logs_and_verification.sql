-- ====================================================================
-- Migration: 20261002100000_fix_student_profile_registrar_logs_and_verification.sql
-- Description: Ensure student profile setup (fn_create_my_student_profile)
--              and updates (fn_update_my_profile) reliably record pending
--              requests in student_profile_change_requests, log into
--              registrar_logs, notify Registrars, and render accurately
--              in fn_list_student_profile_requests and fn_list_registrar_logs.
-- ====================================================================

-- 1. Ensure student profile creation creates verification request, registrar logs, and notifications
CREATE OR REPLACE FUNCTION public.fn_create_my_student_profile(
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT 1::smallint,
    p_first_name text DEFAULT NULL::text,
    p_middle_name text DEFAULT NULL::text,
    p_last_name text DEFAULT NULL::text,
    p_suffix text DEFAULT NULL::text,
    p_preferred_name text DEFAULT NULL::text,
    p_mobile_number text DEFAULT NULL::text,
    p_address_line1 text DEFAULT NULL::text,
    p_address_line2 text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_province text DEFAULT NULL::text,
    p_postal_code text DEFAULT NULL::text,
    p_date_of_birth date DEFAULT NULL::date,
    p_gender text DEFAULT NULL::text,
    p_civil_status text DEFAULT NULL::text,
    p_nationality text DEFAULT NULL::text
)
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
        v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
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

GRANT EXECUTE ON FUNCTION public.fn_create_my_student_profile TO authenticated, service_role;

-- 2. Update fn_update_my_profile with comprehensive student detection, full name fallback, and notification
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint);

CREATE OR REPLACE FUNCTION public.fn_update_my_profile(
    p_first_name text,
    p_middle_name text,
    p_last_name text,
    p_suffix text,
    p_preferred_name text,
    p_mobile_number text,
    p_address_line1 text,
    p_address_line2 text,
    p_city text,
    p_province text,
    p_postal_code text,
    p_date_of_birth date,
    p_gender text,
    p_civil_status text,
    p_nationality text,
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT NULL::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_student_id UUID;
    v_student_number TEXT;
    v_is_student BOOLEAN := false;
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_user_full_name TEXT;
    v_curr_prog_id UUID;
    v_curr_prog_code TEXT;
    v_curr_prog_name TEXT;
    v_curr_year SMALLINT;
    v_target_prog_code TEXT;
    v_target_prog_name TEXT;
    v_target_year SMALLINT;
    v_seq_num INT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    -- Full name resolution
    v_user_full_name := btrim(COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name, '') || ' ' || COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name, ''));
    IF v_user_full_name = '' THEN
        v_user_full_name := COALESCE(v_curr_record.email, 'Student');
    END IF;

    SELECT s.id, s.student_number, s.program_id, s.year_level, p.code, p.name
    INTO v_student_id, v_student_number, v_curr_prog_id, v_curr_year, v_curr_prog_code, v_curr_prog_name
    FROM public.students s
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.user_id = v_user_id AND s.deleted_at IS NULL
    LIMIT 1;

    -- Check if user has a student record or student role
    IF v_student_id IS NOT NULL THEN
        v_is_student := true;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = v_user_id
              AND lower(r.code) = 'student'
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) THEN
            v_is_student := true;

            -- Auto-provision student profile row
            SELECT count(*) + 1 INTO v_seq_num FROM public.students;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
                v_seq_num := v_seq_num + 1;
                v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
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
    END IF;

    IF p_program_id IS NOT NULL THEN
        SELECT code, name INTO v_target_prog_code, v_target_prog_name
        FROM public.programs WHERE id = p_program_id AND deleted_at IS NULL;
    ELSE
        v_target_prog_code := v_curr_prog_code;
        v_target_prog_name := v_curr_prog_name;
    END IF;

    v_target_year := COALESCE(p_year_level, v_curr_year, 1);

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
        'program_id', COALESCE(v_curr_prog_id::text, ''),
        'program_code', COALESCE(v_curr_prog_code, 'Unassigned'),
        'program_name', COALESCE(v_curr_prog_name, 'Unassigned'),
        'year_level', COALESCE(v_curr_year, 1)
    );

    v_requested_changes := jsonb_build_object(
        'first_name', btrim(p_first_name),
        'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), ''),
        'last_name', btrim(p_last_name),
        'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), ''),
        'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), ''),
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), ''),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), ''),
        'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), ''),
        'city', COALESCE(NULLIF(btrim(p_city), ''), ''),
        'province', COALESCE(NULLIF(btrim(p_province), ''), ''),
        'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), ''),
        'date_of_birth', CASE WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text ELSE '' END,
        'gender', COALESCE(NULLIF(btrim(p_gender), ''), ''),
        'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), ''),
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), ''),
        'program_id', COALESCE(p_program_id::text, COALESCE(v_curr_prog_id::text, '')),
        'program_code', COALESCE(v_target_prog_code, COALESCE(v_curr_prog_code, 'Unassigned')),
        'program_name', COALESCE(v_target_prog_name, COALESCE(v_curr_prog_name, 'Unassigned')),
        'year_level', v_target_year
    );

    -- Route ALL self profile edits for accounts with Student role/profile to Registrar Verification Queue & Registrar Logs
    IF v_is_student THEN
        SELECT id INTO v_existing_request_id
        FROM public.student_profile_change_requests
        WHERE user_id = v_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.student_profile_change_requests
            SET requested_changes = requested_changes || v_requested_changes,
                current_values = current_values || v_curr_values,
                student_id = COALESCE(student_id, v_student_id),
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

        IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = v_existing_request_id) THEN
            UPDATE public.registrar_logs
            SET action = 'PROFILE_CHANGE_REQUESTED',
                student_id = v_student_id,
                student_name = v_user_full_name,
                student_number = COALESCE(v_student_number, 'Pending Setup'),
                details = 'Student submitted profile change request for Registrar verification.',
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
                COALESCE(v_student_number, 'Pending Setup'),
                v_user_id,
                v_user_full_name,
                'Student submitted profile change request for Registrar verification.',
                v_curr_values,
                v_requested_changes,
                jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending')
            );
        END IF;

        -- Dispatch in-app notifications to all Registrars
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url
        )
        SELECT DISTINCT ur.user_id,
               'New Student Verification Request',
               'Student ' || v_user_full_name || ' (' || COALESCE(v_student_number, 'N/A') || ') submitted a profile update request for Registrar verification.',
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
            'message', 'Your profile change request has been submitted for Registrar verification and approval.'
        );
    END IF;

    -- Non-student direct update
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
        postal_code = NULLIF(btrim(COALESCE(p_postal_code), ''), ''),
        date_of_birth = p_date_of_birth,
        gender = NULLIF(btrim(COALESCE(p_gender, '')), '')::public.gender_type,
        civil_status = NULLIF(btrim(COALESCE(p_civil_status, '')), '')::public.civil_status_type,
        nationality = NULLIF(btrim(COALESCE(p_nationality, '')), ''),
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'pending_approval', false, 'message', 'Your profile has been updated.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile TO authenticated, service_role;

-- 3. Update fn_list_student_profile_requests to render student names and requested programs even when users.first_name is still unapproved
CREATE OR REPLACE FUNCTION public.fn_list_student_profile_requests(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_status text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_status IS NOT NULL AND p_status <> 'All' AND p_status <> '' THEN
        v_where_clause := v_where_clause || format(' AND req.status = %L', p_status);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                u.first_name ILIKE %L
                OR u.last_name ILIKE %L
                OR u.email ILIKE %L
                OR COALESCE(req.requested_changes->>''first_name'', '''') ILIKE %L
                OR COALESCE(req.requested_changes->>''last_name'', '''') ILIKE %L
                OR COALESCE(s.student_number, '''') ILIKE %L
                OR COALESCE(p.code, req.requested_changes->>''program_code'', '''') ILIKE %L
                OR COALESCE(p.name, req.requested_changes->>''program_name'', '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            req.id,
            req.student_id,
            req.user_id,
            req.status,
            req.current_values,
            req.requested_changes,
            req.approved_changes,
            req.reviewed_by,
            req.reviewed_at,
            req.rejection_reason,
            req.registrar_notes,
            req.created_at,
            req.updated_at,
            COALESCE(
                NULLIF(btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')), ''''),
                NULLIF(btrim(COALESCE(req.requested_changes->>''first_name'', '''') || '' '' || COALESCE(req.requested_changes->>''last_name'', '''')), ''''),
                u.email
            ) AS student_name,
            u.email AS student_email,
            COALESCE(s.student_number, ''Pending Setup'') AS student_number,
            COALESCE((req.requested_changes->>''year_level'')::smallint, s.year_level, 1) AS year_level,
            COALESCE(p.code, NULLIF(req.requested_changes->>''program_code'', ''''), ''Unassigned'') AS program_code,
            COALESCE(p.name, NULLIF(req.requested_changes->>''program_name'', ''''), ''Unassigned'') AS program_name,
            COALESCE(btrim(ru.first_name || '' '' || ru.last_name), ''—'') AS reviewer_name,
            COUNT(*) OVER () AS total_count
        FROM public.student_profile_change_requests req
        INNER JOIN public.users u ON u.id = req.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.students s ON (s.id = req.student_id OR s.user_id = req.user_id) AND s.deleted_at IS NULL
        LEFT JOIN public.programs p ON (p.id = s.program_id OR (NULLIF(req.requested_changes->>''program_id'', ''''))::uuid = p.id) AND p.deleted_at IS NULL
        LEFT JOIN public.users ru ON ru.id = req.reviewed_by AND ru.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'req.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_student_profile_requests TO authenticated, service_role;

-- 4. Update fn_list_registrar_logs with resilient student name resolution
CREATE OR REPLACE FUNCTION public.fn_list_registrar_logs(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_action text DEFAULT NULL::text,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND rl.action = %L', p_action);
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at >= %L::date', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at < (%L::date + 1)', p_date_to);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                COALESCE(rl.student_name, '''') ILIKE %L
                OR COALESCE(rl.student_number, '''') ILIKE %L
                OR COALESCE(rl.performed_by_name, '''') ILIKE %L
                OR COALESCE(rl.details, '''') ILIKE %L
                OR COALESCE(rl.action, '''') ILIKE %L
                OR COALESCE(u.email, '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            rl.id,
            rl.action,
            rl.student_id,
            rl.student_user_id,
            COALESCE(
                NULLIF(btrim(rl.student_name), ''''),
                NULLIF(btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')), ''''),
                NULLIF(btrim(COALESCE(rl.new_values->>''first_name'', '''') || '' '' || COALESCE(rl.new_values->>''last_name'', '''')), ''''),
                u.email,
                ''—''
            ) AS student_name,
            COALESCE(NULLIF(btrim(rl.student_number), ''''), s.student_number, ''—'') AS student_number,
            rl.performed_by,
            COALESCE(rl.performed_by_name, ''System'') AS performed_by_name,
            rl.details,
            rl.old_values,
            rl.new_values,
            rl.metadata,
            rl.created_at,
            COUNT(*) OVER () AS total_count
        FROM public.registrar_logs rl
        LEFT JOIN public.users u ON u.id = rl.student_user_id AND u.deleted_at IS NULL
        LEFT JOIN public.students s ON (s.id = rl.student_id OR s.user_id = rl.student_user_id) AND s.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'rl.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_registrar_logs TO authenticated, service_role;
