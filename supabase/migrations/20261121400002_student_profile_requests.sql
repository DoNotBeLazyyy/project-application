-- ====================================================================
-- Migration: 20261121400002_student_profile_requests.sql
-- Student profile requests (audit 2026-11-21):
--   * #53 fn_approve_student_profile_request: the year level is applied even when the request
--     has no program; a bad program or year level fails the approval (before anything is
--     saved) instead of reporting success without saving it.
--   * T2 fn_list_student_profile_requests: one student and one program per request, so a
--     request is no longer listed twice.
--   * T2 fn_update_my_profile: suffix, middle name, preferred name and address line 2 sent
--     empty are cleared in the request instead of keeping the old value.
--   * T2 fn_cancel_my_profile_request: cancelling updates the registrar log card
--     (PROFILE_CHANGE_CANCELLED) instead of leaving it Pending.
--   * T4 fn_approve_staff_profile_request: the notification link ignores revoked roles, so a
--     former Dean is not sent to /dean/profile.
-- Bodies are the live definitions with only these edits. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_approve_student_profile_request(p_request_id uuid, p_edited_changes jsonb DEFAULT NULL::jsonb, p_notes text DEFAULT NULL::text)
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
    v_details TEXT;
    v_student_id UUID;
    v_curr_program_id UUID;
    v_curr_year_level SMALLINT;
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
        v_details := 'Registrar corrected and approved student profile & program request.' || COALESCE(' Note: ' || p_notes, '');
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_action := 'PROFILE_CHANGE_APPROVED';
        v_status := 'Approved';
        v_notif_msg := 'Your student profile update has been verified and approved by the Registrar.';
        v_details := 'Registrar verified and approved student profile & program request.' || COALESCE(' Note: ' || p_notes, '');
    END IF;

    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND btrim(v_effective_changes->>'date_of_birth') <> '' THEN
        BEGIN
            v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_date_of_birth := NULL;
        END;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Check the program and year level before anything is saved, so a bad value fails the
    -- approval instead of reporting success without saving it (#53)
    v_student_id := COALESCE(v_req.student_id, (
        SELECT st.id FROM public.students st
        WHERE st.user_id = v_req.user_id AND st.deleted_at IS NULL
        ORDER BY st.created_at
        LIMIT 1
    ));

    IF NULLIF(btrim(COALESCE(v_effective_changes->>'program_id', '')), '') IS NOT NULL THEN
        BEGIN
            v_app_program_id := btrim(v_effective_changes->>'program_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_app_program_id := NULL;
        END;

        IF v_app_program_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.programs WHERE id = v_app_program_id AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'The selected program could not be found. Choose the program again, then approve.');
        END IF;
    END IF;

    IF NULLIF(btrim(COALESCE(v_effective_changes->>'year_level', '')), '') IS NOT NULL THEN
        BEGIN
            v_app_year_level := btrim(v_effective_changes->>'year_level')::SMALLINT;
        EXCEPTION WHEN OTHERS THEN
            v_app_year_level := NULL;
        END;

        IF v_app_year_level IS NULL OR v_app_year_level < 1 OR v_app_year_level > 6 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Year level must be a whole number from 1 to 6.');
        END IF;
    END IF;

    IF (v_app_program_id IS NOT NULL OR v_app_year_level IS NOT NULL) AND v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'This account has no student record yet, so its program and year level cannot be saved.');
    END IF;

    -- Apply approved user fields to public.users
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
        date_of_birth = COALESCE(v_date_of_birth, date_of_birth),
        gender = CASE 
            WHEN (v_effective_changes->>'gender') IN ('Male', 'Female', 'Prefer not to say') 
            THEN (v_effective_changes->>'gender')::public.gender_type 
            ELSE gender 
        END,
        civil_status = CASE 
            WHEN (v_effective_changes->>'civil_status') IN ('Single', 'Married', 'Widowed', 'Separated') 
            THEN (v_effective_changes->>'civil_status')::public.civil_status_type 
            ELSE civil_status 
        END,
        nationality = NULLIF(btrim(COALESCE(v_effective_changes->>'nationality', '')), ''),
        profile_completed = true,
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Apply the approved program and year level. A year level alone (no program) is applied too.
    IF v_app_program_id IS NOT NULL OR v_app_year_level IS NOT NULL THEN
        SELECT program_id, year_level INTO v_curr_program_id, v_curr_year_level
        FROM public.students
        WHERE id = v_student_id;

        v_app_year_level := COALESCE(v_app_year_level, v_curr_year_level, 1);

        UPDATE public.students
        SET program_id = COALESCE(v_app_program_id, program_id),
            year_level = v_app_year_level,
            updated_at = now(),
            updated_by = v_registrar_id
        WHERE id = v_student_id;

        IF v_app_program_id IS NOT NULL AND v_curr_program_id IS DISTINCT FROM v_app_program_id THEN
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
                v_curr_program_id,
                v_app_program_id,
                v_curr_year_level,
                v_app_year_level,
                'Approved student program assignment by Registrar',
                (now() AT TIME ZONE 'Asia/Manila')::date,
                v_registrar_id
            );
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

    -- UPDATE EXISTING LOG CARD IN REGISTRAR_LOGS
    IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = p_request_id) THEN
        UPDATE public.registrar_logs
        SET action = v_action,
            performed_by = v_registrar_id,
            performed_by_name = COALESCE(v_registrar_name, 'Registrar'),
            details = v_details,
            new_values = v_effective_changes,
            metadata = metadata || jsonb_build_object(
                'status', v_status,
                'is_edited', v_is_edited,
                'registrar_notes', p_notes,
                'reviewed_at', now(),
                'reviewed_by_name', COALESCE(v_registrar_name, 'Registrar')
            )
        WHERE (metadata->>'request_id')::uuid = p_request_id;
    END IF;

    -- Notify student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_req.user_id,
        'Profile Changes Approved',
        v_notif_msg,
        'Account'::public.notification_category_type,
        '/student/profile',
        v_registrar_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'message', 'Student profile request successfully approved.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_student_profile_requests(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
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
        LEFT JOIN LATERAL (
            -- One student and one program per request, so a request is never listed twice
            SELECT s1.*
            FROM public.students s1
            WHERE (s1.id = req.student_id OR s1.user_id = req.user_id) AND s1.deleted_at IS NULL
            ORDER BY (s1.id = req.student_id) DESC NULLS LAST, s1.created_at
            LIMIT 1
        ) s ON TRUE
        LEFT JOIN LATERAL (
            -- The requested program first, else the student''s current one
            SELECT p1.*
            FROM public.programs p1
            WHERE (p1.id = s.program_id OR p1.id = (NULLIF(req.requested_changes->>''program_id'', ''''))::uuid)
              AND p1.deleted_at IS NULL
            ORDER BY (p1.id = (NULLIF(req.requested_changes->>''program_id'', ''''))::uuid) DESC NULLS LAST
            LIMIT 1
        ) p ON TRUE
        LEFT JOIN public.users ru ON ru.id = req.reviewed_by AND ru.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'req.created_at DESC');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_my_profile(p_first_name text DEFAULT NULL::text, p_middle_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_suffix text DEFAULT NULL::text, p_preferred_name text DEFAULT NULL::text, p_mobile_number text DEFAULT NULL::text, p_address_line1 text DEFAULT NULL::text, p_address_line2 text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_province text DEFAULT NULL::text, p_postal_code text DEFAULT NULL::text, p_date_of_birth date DEFAULT NULL::date, p_gender text DEFAULT NULL::text, p_civil_status text DEFAULT NULL::text, p_nationality text DEFAULT NULL::text, p_program_id uuid DEFAULT NULL::uuid, p_year_level smallint DEFAULT NULL::smallint, p_department_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_user_full_name TEXT;
    v_role_codes TEXT[];
    v_is_admin BOOLEAN := false;
    v_is_student BOOLEAN := false;
    v_is_dean BOOLEAN := false;
    v_is_faculty BOOLEAN := false;
    v_is_registrar BOOLEAN := false;
    v_student_id UUID;
    v_student_number TEXT;
    v_staff_role TEXT;
    v_eff_first_name TEXT;
    v_eff_last_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    v_eff_first_name := COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name);
    v_eff_last_name := COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name);

    IF btrim(COALESCE(v_eff_first_name, '')) = '' OR btrim(COALESCE(v_eff_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    v_user_full_name := btrim(COALESCE(v_eff_first_name, '') || ' ' || COALESCE(v_eff_last_name, ''));
    v_role_codes := public.fn_current_user_role_codes();

    v_is_admin := 'Admin' = ANY (v_role_codes);
    v_is_student := 'Student' = ANY (v_role_codes);
    v_is_dean := 'Dean' = ANY (v_role_codes);
    v_is_faculty := 'Faculty' = ANY (v_role_codes);
    v_is_registrar := 'Registrar' = ANY (v_role_codes);

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

    -- Optional fields sent empty are cleared (a NULL argument keeps the current value)
    v_requested_changes := jsonb_build_object(
        'first_name', v_eff_first_name,
        'middle_name', CASE WHEN p_middle_name IS NOT NULL THEN btrim(p_middle_name) ELSE COALESCE(v_curr_record.middle_name, '') END,
        'last_name', v_eff_last_name,
        'suffix', CASE WHEN p_suffix IS NOT NULL THEN btrim(p_suffix) ELSE COALESCE(v_curr_record.suffix, '') END,
        'preferred_name', CASE WHEN p_preferred_name IS NOT NULL THEN btrim(p_preferred_name) ELSE COALESCE(v_curr_record.preferred_name, '') END,
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), COALESCE(v_curr_record.mobile_number, ''), ''),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), COALESCE(v_curr_record.address_line1, ''), ''),
        'address_line2', CASE WHEN p_address_line2 IS NOT NULL THEN btrim(p_address_line2) ELSE COALESCE(v_curr_record.address_line2, '') END,
        'city', COALESCE(NULLIF(btrim(p_city), ''), COALESCE(v_curr_record.city, ''), ''),
        'province', COALESCE(NULLIF(btrim(p_province), ''), COALESCE(v_curr_record.province, ''), ''),
        'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), COALESCE(v_curr_record.postal_code, ''), ''),
        'date_of_birth', CASE 
            WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text 
            WHEN v_curr_record.date_of_birth IS NOT NULL THEN v_curr_record.date_of_birth::text 
            ELSE '' 
        END,
        'gender', COALESCE(NULLIF(btrim(p_gender), ''), COALESCE(v_curr_record.gender::text, ''), ''),
        'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), COALESCE(v_curr_record.civil_status::text, ''), ''),
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), COALESCE(v_curr_record.nationality, ''), '')
    );

    -- 1. STUDENT WORKFLOW -> REGISTRAR VERIFICATION & APPROVAL
    IF v_is_student AND NOT v_is_admin THEN
        SELECT id, student_number INTO v_student_id, v_student_number
        FROM public.students
        WHERE user_id = v_user_id AND deleted_at IS NULL
        LIMIT 1;

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

        -- Registrar audit log
        IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = v_existing_request_id) THEN
            UPDATE public.registrar_logs
            SET action = 'PROFILE_CHANGE_REQUESTED',
                student_id = v_student_id,
                student_name = v_user_full_name,
                student_number = COALESCE(v_student_number, 'Pending Setup'),
                details = 'Student updated profile change request for Registrar verification.',
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

        -- Notify all Registrars
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url,
            created_by
        )
        SELECT DISTINCT ur.user_id,
               'Student Profile Change Request',
               format('Student %s (%s) submitted profile updates requiring Registrar verification.', v_user_full_name, COALESCE(v_student_number, 'N/A')),
               'Account'::public.notification_category_type,
               '/registrar/student-verification',
               v_user_id
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

    -- 2. STAFF WORKFLOW (DEAN, FACULTY, REGISTRAR) -> ADMIN VERIFICATION & APPROVAL
    IF (v_is_dean OR v_is_faculty OR v_is_registrar) AND NOT v_is_admin THEN
        v_staff_role := CASE
            WHEN v_is_dean THEN 'Dean'
            WHEN v_is_faculty THEN 'Faculty'
            ELSE 'Registrar'
        END;

        SELECT id INTO v_existing_request_id
        FROM public.staff_profile_change_requests
        WHERE user_id = v_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.staff_profile_change_requests
            SET requested_changes = v_requested_changes,
                current_values = v_curr_values,
                role_code = v_staff_role,
                updated_at = now()
            WHERE id = v_existing_request_id;
        ELSE
            INSERT INTO public.staff_profile_change_requests (
                user_id,
                role_code,
                status,
                current_values,
                requested_changes
            ) VALUES (
                v_user_id,
                v_staff_role,
                'Pending',
                v_curr_values,
                v_requested_changes
            ) RETURNING id INTO v_existing_request_id;
        END IF;

        -- Notify Admins
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url,
            created_by
        )
        SELECT u.id,
               format('%s Profile Change Request', v_staff_role),
               format('%s (%s) submitted profile updates requiring Admin approval.', v_user_full_name, v_staff_role),
               'Account'::public.notification_category_type,
               '/admin/profile-verifications',
               v_user_id
        FROM public.users u
        INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE r.code = 'Admin' AND u.deleted_at IS NULL;

        RETURN jsonb_build_object(
            'success', true,
            'pending_approval', true,
            'message', 'Your profile change request has been submitted for Administrator verification and approval.'
        );
    END IF;

    -- 3. ADMIN DIRECT UPDATE
    UPDATE public.users
    SET first_name = v_eff_first_name,
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, middle_name, '')), ''),
        last_name = v_eff_last_name,
        suffix = NULLIF(btrim(COALESCE(p_suffix, suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, postal_code, '')), ''),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        gender = CASE 
            WHEN btrim(COALESCE(p_gender, '')) IN ('Male', 'Female', 'Prefer not to say') 
            THEN btrim(p_gender)::public.gender_type 
            WHEN btrim(COALESCE(p_gender, '')) = '' AND p_gender IS NOT NULL THEN NULL
            ELSE gender 
        END,
        civil_status = CASE 
            WHEN btrim(COALESCE(p_civil_status, '')) IN ('Single', 'Married', 'Widowed', 'Separated') 
            THEN btrim(p_civil_status)::public.civil_status_type 
            WHEN btrim(COALESCE(p_civil_status, '')) = '' AND p_civil_status IS NOT NULL THEN NULL
            ELSE civil_status 
        END,
        nationality = COALESCE(NULLIF(btrim(p_nationality), ''), nationality, 'Filipino'),
        profile_completed = true,
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'pending_approval', false,
        'message', 'Your profile has been updated.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_cancel_my_profile_request(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    UPDATE public.student_profile_change_requests
    SET status = 'Cancelled', updated_at = now()
    WHERE id = p_request_id AND user_id = v_user_id AND status = 'Pending';

    IF FOUND THEN
        -- The registrar log card for this request shows it was cancelled, not still Pending
        UPDATE public.registrar_logs
        SET action = 'PROFILE_CHANGE_CANCELLED',
            details = 'Student cancelled the profile change request.',
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('status', 'Cancelled', 'cancelled_at', now())
        WHERE metadata->>'request_id' = p_request_id::text;

        RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
    END IF;

    UPDATE public.staff_profile_change_requests
    SET status = 'Cancelled', updated_at = now()
    WHERE id = p_request_id AND user_id = v_user_id AND status = 'Pending';

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'No pending request found with this ID.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_approve_staff_profile_request(p_request_id uuid, p_edited_changes jsonb DEFAULT NULL::jsonb, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_admin_id UUID := auth.uid();
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_status TEXT := 'Approved';
    v_date_of_birth DATE := NULL;
    v_target_role TEXT;
    v_profile_url TEXT := '/profile';
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
           u.email AS user_email
    INTO v_req
    FROM public.staff_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    IF p_edited_changes IS NOT NULL AND p_edited_changes <> '{}'::jsonb AND p_edited_changes <> v_req.requested_changes THEN
        v_effective_changes := p_edited_changes;
        v_is_edited := true;
        v_status := 'Approved with Edits';
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_status := 'Approved';
    END IF;

    -- Safe date parsing
    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND btrim(v_effective_changes->>'date_of_birth') <> '' THEN
        BEGIN
            v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_date_of_birth := NULL;
        END;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Apply approved user fields to public.users
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
        date_of_birth = COALESCE(v_date_of_birth, date_of_birth),
        gender = CASE 
            WHEN (v_effective_changes->>'gender') IN ('Male', 'Female', 'Prefer not to say') 
            THEN (v_effective_changes->>'gender')::public.gender_type 
            ELSE gender 
        END,
        civil_status = CASE 
            WHEN (v_effective_changes->>'civil_status') IN ('Single', 'Married', 'Widowed', 'Separated') 
            THEN (v_effective_changes->>'civil_status')::public.civil_status_type 
            ELSE civil_status 
        END,
        nationality = NULLIF(btrim(COALESCE(v_effective_changes->>'nationality', '')), ''),
        profile_completed = true,
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Update request record
    UPDATE public.staff_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id;

    -- Determine role-scoped profile route for notification action URL
    SELECT r.code INTO v_target_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_req.user_id
      -- A revoked role (e.g. a former Dean) must not decide the link
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL
    ORDER BY CASE 
        WHEN r.code = 'Dean' THEN 1
        WHEN r.code = 'Faculty' THEN 2
        WHEN r.code = 'Registrar' THEN 3
        WHEN r.code = 'Admin' THEN 4
        ELSE 5
    END
    LIMIT 1;

    IF v_target_role = 'Dean' THEN
        v_profile_url := '/dean/profile';
    ELSIF v_target_role = 'Faculty' THEN
        v_profile_url := '/faculty/profile';
    ELSIF v_target_role = 'Registrar' THEN
        v_profile_url := '/registrar/profile';
    ELSE
        v_profile_url := '/admin/profile';
    END IF;

    -- Notify staff member
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_req.user_id,
        'Profile Changes Approved',
        CASE 
            WHEN v_is_edited THEN 'Your profile changes were approved with modifications by the Administrator.'
            ELSE 'Your profile changes have been verified and approved by the Administrator.'
        END,
        'Account'::public.notification_category_type,
        v_profile_url,
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'message', 'Staff profile request successfully approved.'
    );
END;
$function$;

COMMIT;
