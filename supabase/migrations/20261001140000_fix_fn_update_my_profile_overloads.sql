-- Migration: 20261001140000_fix_fn_update_my_profile_overloads.sql
-- Description: Explicitly drop legacy signatures of fn_update_my_profile to ensure clean overload resolution in PostgREST schema cache.

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

    v_user_full_name := btrim(COALESCE(v_curr_record.first_name, '') || ' ' || COALESCE(v_curr_record.last_name, ''));

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
              AND r.code = 'Student'
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
                1,
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
        'program_code', COALESCE(v_target_prog_code, COALESCE(v_curr_prog_code, '')),
        'program_name', COALESCE(v_target_prog_name, COALESCE(v_curr_prog_name, '')),
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
                details = 'User submitted profile change request for Registrar verification.',
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
                'User submitted profile change request for Registrar verification.',
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
               'Account',
               '/registrar/student-verification'
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE r.code = 'Registrar'
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

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile TO authenticated, service_role;
