-- Migration: 20261001070000_student_program_verification_and_logs.sql
-- Description: Route student academic program assignments and shifts through Registrar Verification and record all program changes in Registrar Logs.

-- 1. Update fn_shift_student_program to require Registrar Verification for students and audit all changes in registrar_logs
CREATE OR REPLACE FUNCTION public.fn_shift_student_program(
    p_student_id uuid DEFAULT NULL::uuid,
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT NULL::smallint,
    p_reason text DEFAULT NULL::text,
    p_effective_date date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_target_student_id UUID;
    v_target_user_id UUID;
    v_student_number TEXT;
    v_student_name TEXT;
    v_current_program_id UUID;
    v_curr_program_code TEXT;
    v_curr_program_name TEXT;
    v_current_year SMALLINT;
    v_target_year SMALLINT;
    v_target_program_code TEXT;
    v_target_program_name TEXT;
    v_is_staff BOOLEAN;
    v_seq_num INT;
    v_existing_request_id UUID;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_performed_by_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Registrar', 'Admin'];

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_performed_by_name
    FROM public.users WHERE id = v_user_id;

    IF p_student_id IS NULL THEN
        SELECT s.id, s.user_id, s.student_number
        INTO v_target_student_id, v_target_user_id, v_student_number
        FROM public.students s
        WHERE s.user_id = v_user_id
          AND s.deleted_at IS NULL
        LIMIT 1;

        -- Auto-provision basic student record if needed
        IF v_target_student_id IS NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = v_user_id
                  AND r.code = 'Student'
                  AND ur.deleted_at IS NULL
            ) THEN
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
                RETURNING id, user_id INTO v_target_student_id, v_target_user_id;
            END IF;
        END IF;
    ELSE
        SELECT s.id, s.user_id, s.student_number
        INTO v_target_student_id, v_target_user_id, v_student_number
        FROM public.students s
        WHERE s.id = p_student_id
          AND s.deleted_at IS NULL;
    END IF;

    IF v_target_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) INTO v_student_name
    FROM public.users u WHERE u.id = v_target_user_id;

    -- Ensure non-staff only update their own student profile
    IF NOT v_is_staff THEN
        IF v_target_user_id <> v_user_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you can only update your own program.');
        END IF;
    END IF;

    -- Get current student program info
    SELECT s.program_id, s.year_level, p.code, p.name
    INTO v_current_program_id, v_current_year, v_curr_program_code, v_curr_program_name
    FROM public.students s
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = v_target_student_id;

    -- Validate target program
    IF p_program_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = p_program_id
          AND p.is_active
          AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program not found or inactive.');
    END IF;

    SELECT code, name INTO v_target_program_code, v_target_program_name
    FROM public.programs WHERE id = p_program_id;

    v_target_year := COALESCE(p_year_level, v_current_year, 1);
    IF v_target_year < 1 OR v_target_year > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6.');
    END IF;

    IF v_current_program_id IS NOT DISTINCT FROM p_program_id AND v_current_year = v_target_year THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The student is already in this program and year level.'
        );
    END IF;

    v_curr_values := jsonb_build_object(
        'program_id', COALESCE(v_current_program_id::text, ''),
        'program_code', COALESCE(v_curr_program_code, 'Unassigned'),
        'program_name', COALESCE(v_curr_program_name, 'Unassigned'),
        'year_level', COALESCE(v_current_year, 1)
    );

    v_requested_changes := jsonb_build_object(
        'program_id', p_program_id::text,
        'program_code', v_target_program_code,
        'program_name', v_target_program_name,
        'year_level', v_target_year
    );

    -- IF STUDENT (Non-staff): Route to Student Profile Verification queue and log request
    IF NOT v_is_staff THEN
        SELECT id INTO v_existing_request_id
        FROM public.student_profile_change_requests
        WHERE user_id = v_target_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.student_profile_change_requests
            SET requested_changes = requested_changes || v_requested_changes,
                current_values = current_values || v_curr_values,
                student_id = v_target_student_id,
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
                v_target_student_id,
                v_target_user_id,
                'Pending',
                v_curr_values,
                v_requested_changes
            ) RETURNING id INTO v_existing_request_id;
        END IF;

        -- Record into registrar_logs
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
            'PROGRAM_ASSIGNMENT_REQUESTED',
            v_target_student_id,
            v_target_user_id,
            v_student_name,
            COALESCE(v_student_number, 'N/A'),
            v_user_id,
            v_performed_by_name,
            'Student requested academic program assignment/shift for Registrar verification.',
            v_curr_values,
            v_requested_changes,
            jsonb_build_object('request_id', v_existing_request_id, 'reason', p_reason)
        );

        RETURN jsonb_build_object(
            'success', true,
            'pending_approval', true,
            'message', 'Your academic program assignment request has been submitted for Registrar verification and approval.'
        );
    END IF;

    -- IF STAFF (Registrar / Admin): Apply program change immediately and log to registrar_logs
    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year,
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = v_target_student_id;

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
        v_target_student_id,
        'Program Shift',
        v_current_program_id,
        p_program_id,
        v_current_year,
        v_target_year,
        NULLIF(btrim(COALESCE(p_reason, CASE WHEN v_current_program_id IS NULL THEN 'Initial program assignment' ELSE 'Program shift' END)), ''),
        COALESCE(p_effective_date, CURRENT_DATE),
        v_user_id
    );

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
        'STUDENT_PROGRAM_ASSIGNED',
        v_target_student_id,
        v_target_user_id,
        v_student_name,
        COALESCE(v_student_number, 'N/A'),
        v_user_id,
        v_performed_by_name,
        'Registrar assigned academic program to student (' || v_target_program_code || ').',
        v_curr_values,
        v_requested_changes,
        jsonb_build_object('reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'pending_approval', false,
        'message', 'Academic program assigned successfully.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 2. Update fn_create_my_student_profile to include program in requested changes and registrar logs
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
    v_user_full_name := btrim(COALESCE(v_curr_record.first_name, '') || ' ' || COALESCE(v_curr_record.last_name, ''));

    -- Ensure Student role is assigned
    SELECT id INTO v_role_id FROM public.roles WHERE code = 'Student' AND deleted_at IS NULL;
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
        SELECT code, name INTO v_prog_code, v_prog_name FROM public.programs WHERE id = p_program_id;
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
        'first_name', COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name),
        'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), COALESCE(v_curr_record.middle_name, '')),
        'last_name', COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name),
        'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), COALESCE(v_curr_record.suffix, '')),
        'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), COALESCE(v_curr_record.preferred_name, '')),
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), COALESCE(v_curr_record.mobile_number, '')),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), COALESCE(v_curr_record.address_line1, '')),
        'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), COALESCE(v_curr_record.address_line2, '')),
        'city', COALESCE(NULLIF(btrim(p_city), ''), COALESCE(v_curr_record.city, '')),
        'province', COALESCE(NULLIF(btrim(p_province), ''), COALESCE(v_curr_record.province, '')),
        'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), COALESCE(v_curr_record.postal_code, '')),
        'date_of_birth', CASE WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text ELSE COALESCE(v_curr_record.date_of_birth::text, '') END,
        'gender', COALESCE(NULLIF(btrim(p_gender), ''), COALESCE(v_curr_record.gender::text, '')),
        'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), COALESCE(v_curr_record.civil_status::text, '')),
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), COALESCE(v_curr_record.nationality, '')),
        'program_id', COALESCE(p_program_id::text, ''),
        'program_code', COALESCE(v_prog_code, ''),
        'program_name', COALESCE(v_prog_name, ''),
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
        'Student submitted initial profile details and program selection for Registrar verification.',
        v_curr_values,
        v_requested_changes,
        jsonb_build_object('request_id', v_existing_request_id)
    );

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

-- 3. Update fn_update_my_profile to include program_id parameter and profile change log
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
    p_program_id uuid DEFAULT NULL::uuid
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

    v_user_full_name := btrim(COALESCE(v_curr_record.first_name, '') || ' ' || COALESCE(v_curr_record.last_name, ''));

    SELECT s.id, s.student_number, s.program_id, s.year_level, p.code, p.name
    INTO v_student_id, v_student_number, v_curr_prog_id, v_curr_year, v_curr_prog_code, v_curr_prog_name
    FROM public.students s
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.user_id = v_user_id AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
        v_is_student := true;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = v_user_id
              AND r.code = 'Student'
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) THEN
            v_is_student := true;
        END IF;
    END IF;

    IF p_program_id IS NOT NULL THEN
        SELECT code, name INTO v_target_prog_code, v_target_prog_name
        FROM public.programs WHERE id = p_program_id AND deleted_at IS NULL;
    ELSE
        v_target_prog_code := v_curr_prog_code;
        v_target_prog_name := v_curr_prog_name;
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
        'program_code', COALESCE(v_target_prog_code, COALESCE(v_curr_prog_code, '')),
        'program_name', COALESCE(v_target_prog_name, COALESCE(v_curr_prog_name, '')),
        'year_level', COALESCE(v_curr_year, 1)
    );

    IF v_is_student THEN
        SELECT id INTO v_existing_request_id
        FROM public.student_profile_change_requests
        WHERE user_id = v_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.student_profile_change_requests
            SET requested_changes = v_requested_changes,
                current_values = v_curr_values,
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
            jsonb_build_object('request_id', v_existing_request_id)
        );

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
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = NULLIF(btrim(COALESCE(p_gender, '')), '')::public.gender_type,
        civil_status = NULLIF(btrim(COALESCE(p_civil_status, '')), '')::public.civil_status_type,
        nationality = NULLIF(btrim(COALESCE(p_nationality, '')), ''),
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'pending_approval', false, 'message', 'Your profile has been updated.');
END;
$function$;

-- 4. Update fn_approve_student_profile_request to apply approved program_id to students table
CREATE OR REPLACE FUNCTION public.fn_approve_student_profile_request(
    p_request_id uuid,
    p_edited_changes jsonb DEFAULT NULL::jsonb,
    p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_action TEXT;
    v_status TEXT;
    v_notif_msg TEXT;
    v_date_of_birth DATE;
    v_app_program_id UUID;
    v_app_year_level SMALLINT;
    v_current_program_id UUID;
    v_current_year SMALLINT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           s.student_number,
           s.program_id AS curr_program_id,
           s.year_level AS curr_year_level
    INTO v_req
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.students s ON s.id = req.student_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    IF p_edited_changes IS NOT NULL AND p_edited_changes <> '{}'::jsonb AND p_edited_changes <> v_req.requested_changes THEN
        v_effective_changes := p_edited_changes;
        v_is_edited := true;
        v_action := 'PROFILE_CHANGE_EDITED_APPROVED';
        v_status := 'Approved with Edits';
        v_notif_msg := 'Your profile changes have been reviewed, adjusted by the Registrar, and approved.';
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_action := 'PROFILE_CHANGE_APPROVED';
        v_status := 'Approved';
        v_notif_msg := 'Your student profile update has been verified and approved by the Registrar.';
    END IF;

    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND (v_effective_changes->>'date_of_birth') <> '' THEN
        v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Update users table with personal information
    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(v_effective_changes->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(v_effective_changes->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(v_effective_changes->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(v_effective_changes->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(v_effective_changes->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(v_effective_changes->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(v_effective_changes->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(v_effective_changes->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(v_effective_changes->>'postal_code', '')), ''),
        date_of_birth = v_date_of_birth,
        gender = CASE WHEN (v_effective_changes->>'gender') IS NOT NULL AND (v_effective_changes->>'gender') <> '' 
                      THEN (v_effective_changes->>'gender')::public.gender_type 
                      ELSE gender END,
        civil_status = CASE WHEN (v_effective_changes->>'civil_status') IS NOT NULL AND (v_effective_changes->>'civil_status') <> '' 
                            THEN (v_effective_changes->>'civil_status')::public.civil_status_type 
                            ELSE civil_status END,
        nationality = NULLIF(btrim(COALESCE(v_effective_changes->>'nationality', '')), ''),
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Apply approved program_id and year_level to public.students table if present in changes
    IF (v_effective_changes->>'program_id') IS NOT NULL AND (v_effective_changes->>'program_id') <> '' THEN
        v_app_program_id := (v_effective_changes->>'program_id')::UUID;
        v_app_year_level := COALESCE((v_effective_changes->>'year_level')::SMALLINT, v_req.curr_year_level, 1);

        IF v_req.student_id IS NOT NULL THEN
            UPDATE public.students
            SET program_id = v_app_program_id,
                year_level = v_app_year_level,
                updated_at = now(),
                updated_by = v_registrar_id
            WHERE id = v_req.student_id;

            IF v_req.curr_program_id IS DISTINCT FROM v_app_program_id THEN
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
                    v_req.student_id,
                    'Program Shift',
                    v_req.curr_program_id,
                    v_app_program_id,
                    v_req.curr_year_level,
                    v_app_year_level,
                    'Approved student program assignment by Registrar',
                    CURRENT_DATE,
                    v_registrar_id
                );
            END IF;
        END IF;
    END IF;

    -- Update request record
    UPDATE public.student_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        registrar_notes = p_notes,
        reviewed_by = v_registrar_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Record into registrar_logs
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
        v_action,
        v_req.student_id,
        v_req.user_id,
        v_req.student_name,
        v_req.student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        CASE WHEN v_is_edited 
             THEN 'Registrar corrected and approved student profile & program request.' || COALESCE(' Note: ' || p_notes, '')
             ELSE 'Registrar verified and approved student profile & program request.' || COALESCE(' Note: ' || p_notes, '')
        END,
        v_req.current_values,
        v_effective_changes,
        jsonb_build_object(
            'request_id', p_request_id,
            'is_edited', v_is_edited,
            'registrar_notes', p_notes
        )
    );

    -- Notify student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_req.user_id,
        'Profile Verification Approved',
        v_notif_msg || COALESCE(' Note from Registrar: ' || p_notes, ''),
        'Account',
        '/student/profile'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student profile change request approved successfully.',
        'status', v_status
    );
END;
$function$;

-- 5. Update fn_registrar_update_student_profile to handle program updates by Registrar directly
CREATE OR REPLACE FUNCTION public.fn_registrar_update_student_profile(
    p_student_id uuid,
    p_profile_values jsonb,
    p_reason text DEFAULT NULL::text,
    p_notify_student boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_student_number TEXT;
    v_student_name TEXT;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_date_of_birth DATE;
    v_prog_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.user_id, s.student_number, btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id;

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
        'nationality', COALESCE(v_curr_record.nationality, '')
    );

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    IF (p_profile_values->>'date_of_birth') IS NOT NULL AND (p_profile_values->>'date_of_birth') <> '' THEN
        v_date_of_birth := (p_profile_values->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(p_profile_values->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(p_profile_values->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(p_profile_values->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(p_profile_values->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_profile_values->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_profile_values->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_profile_values->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_profile_values->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(p_profile_values->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(p_profile_values->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_profile_values->>'postal_code', '')), ''),
        date_of_birth = v_date_of_birth,
        gender = CASE WHEN (p_profile_values->>'gender') IS NOT NULL AND (p_profile_values->>'gender') <> '' 
                      THEN (p_profile_values->>'gender')::public.gender_type 
                      ELSE gender END,
        civil_status = CASE WHEN (p_profile_values->>'civil_status') IS NOT NULL AND (p_profile_values->>'civil_status') <> '' 
                            THEN (p_profile_values->>'civil_status')::public.civil_status_type 
                            ELSE civil_status END,
        nationality = NULLIF(btrim(COALESCE(p_profile_values->>'nationality', '')), ''),
        updated_at = now()
    WHERE id = v_user_id;

    IF (p_profile_values->>'program_id') IS NOT NULL AND (p_profile_values->>'program_id') <> '' THEN
        v_prog_id := (p_profile_values->>'program_id')::UUID;
        UPDATE public.students
        SET program_id = v_prog_id,
            year_level = COALESCE((p_profile_values->>'year_level')::SMALLINT, year_level),
            updated_at = now(),
            updated_by = v_registrar_id
        WHERE id = p_student_id;
    END IF;

    -- Log to registrar_logs
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
        'STUDENT_PROFILE_UPDATED',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar directly updated student profile & program details.' || COALESCE(' Reason: ' || p_reason, ''),
        v_curr_values,
        p_profile_values,
        jsonb_build_object('reason', p_reason, 'notify_student', p_notify_student)
    );

    IF p_notify_student THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url
        ) VALUES (
            v_user_id,
            'Student Profile Updated',
            'Your student profile has been updated by the Registrar.' || COALESCE(' Reason: ' || p_reason, ''),
            'Account',
            '/student/profile'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile updated and recorded in Registrar Log.');
END;
$function$;
