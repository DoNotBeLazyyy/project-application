-- Migration: 20261001100000_single_log_card_and_deferred_program_assignment.sql
-- Description: 
-- 1. Ensure academic program and year level changes NEVER apply immediately for self-edits, remaining pending until Registrar approval.
-- 2. Consolidate Registrar Log entries into a single updating record per request (preventing duplicate/redundant request + rejected cards) and store rejection reason, review timestamp, and false info flags.

-- 1. Update fn_shift_student_program
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
    v_is_self_edit BOOLEAN := false;
    v_has_student_role BOOLEAN := false;
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

        -- Auto-provision student profile row if missing
        IF v_target_student_id IS NULL THEN
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

    v_is_self_edit := (v_target_user_id = v_user_id);
    v_has_student_role := (v_target_student_id IS NOT NULL);

    IF NOT v_is_staff AND NOT v_is_self_edit THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you can only update your own program.');
    END IF;

    -- Fetch current student program info
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

    -- SELF-EDIT: DO NOT update public.students table immediately. Route to student_profile_change_requests queue.
    IF v_is_self_edit AND v_has_student_role THEN
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

        -- Single log card update or insert
        IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = v_existing_request_id) THEN
            UPDATE public.registrar_logs
            SET action = 'PROGRAM_ASSIGNMENT_REQUESTED',
                details = 'User requested academic program assignment/shift for Registrar verification.',
                old_values = v_curr_values,
                new_values = v_requested_changes,
                metadata = jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending', 'reason', p_reason),
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
                'PROGRAM_ASSIGNMENT_REQUESTED',
                v_target_student_id,
                v_target_user_id,
                v_student_name,
                COALESCE(v_student_number, 'N/A'),
                v_user_id,
                v_performed_by_name,
                'User requested academic program assignment/shift for Registrar verification.',
                v_curr_values,
                v_requested_changes,
                jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending', 'reason', p_reason)
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'pending_approval', true,
            'message', 'Your academic program assignment request has been submitted for Registrar verification and approval.'
        );
    END IF;

    -- STAFF EDITING ANOTHER STUDENT DIRECTLY (p_student_id is another student)
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

-- 2. Update fn_approve_student_profile_request to update existing log entry instead of inserting duplicate
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
    v_details TEXT;
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

    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND (v_effective_changes->>'date_of_birth') <> '' THEN
        v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
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

    -- Apply approved program_id and year_level to public.students table NOW upon approval
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

    -- UPDATE EXISTING LOG CARD IN REGISTRAR_LOGS (Prevent duplicate log cards!)
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
            v_action,
            v_req.student_id,
            v_req.user_id,
            v_req.student_name,
            v_req.student_number,
            v_registrar_id,
            COALESCE(v_registrar_name, 'Registrar'),
            v_details,
            v_req.current_values,
            v_effective_changes,
            jsonb_build_object(
                'request_id', p_request_id,
                'status', v_status,
                'is_edited', v_is_edited,
                'registrar_notes', p_notes,
                'reviewed_at', now(),
                'reviewed_by_name', COALESCE(v_registrar_name, 'Registrar')
            )
        );
    END IF;

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

-- 3. Update fn_reject_student_profile_request to update existing log entry instead of inserting duplicate
CREATE OR REPLACE FUNCTION public.fn_reject_student_profile_request(
    p_request_id uuid,
    p_reason text,
    p_is_false_info boolean DEFAULT false
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
    v_action TEXT;
    v_notif_title TEXT;
    v_details TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF btrim(COALESCE(p_reason, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A rejection reason is required.');
    END IF;

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           s.student_number
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

    v_action := CASE WHEN p_is_false_info THEN 'PROFILE_REJECTED_FALSE_INFO' ELSE 'PROFILE_CHANGE_REJECTED' END;
    v_notif_title := CASE WHEN p_is_false_info THEN 'Profile Verification: False Information Detected' ELSE 'Profile Change Request Rejected' END;
    v_details := 'Registrar rejected student profile change request. Rejection Reason: ' || p_reason;

    UPDATE public.student_profile_change_requests
    SET status = 'Rejected',
        rejection_reason = p_reason,
        reviewed_by = v_registrar_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- UPDATE EXISTING LOG CARD IN REGISTRAR_LOGS (Prevent duplicate log cards!)
    IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = p_request_id) THEN
        UPDATE public.registrar_logs
        SET action = v_action,
            performed_by = v_registrar_id,
            performed_by_name = COALESCE(v_registrar_name, 'Registrar'),
            details = v_details,
            metadata = metadata || jsonb_build_object(
                'status', 'Rejected',
                'rejection_reason', p_reason,
                'is_false_info', p_is_false_info,
                'reviewed_at', now(),
                'reviewed_by_name', COALESCE(v_registrar_name, 'Registrar')
            )
        WHERE (metadata->>'request_id')::uuid = p_request_id;
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
            v_action,
            v_req.student_id,
            v_req.user_id,
            v_req.student_name,
            v_req.student_number,
            v_registrar_id,
            COALESCE(v_registrar_name, 'Registrar'),
            v_details,
            v_req.current_values,
            v_req.requested_changes,
            jsonb_build_object(
                'request_id', p_request_id,
                'status', 'Rejected',
                'rejection_reason', p_reason,
                'is_false_info', p_is_false_info,
                'reviewed_at', now(),
                'reviewed_by_name', COALESCE(v_registrar_name, 'Registrar')
            )
        );
    END IF;

    -- Emit notification to student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_req.user_id,
        v_notif_title,
        'Your profile change request was reviewed and rejected. Reason: ' || p_reason,
        'Account',
        '/student/profile'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile change request rejected successfully.'
    );
END;
$function$;

-- 4. Update fn_cancel_my_profile_request to update existing log entry instead of inserting duplicate
CREATE OR REPLACE FUNCTION public.fn_cancel_my_profile_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_req RECORD;
    v_user_full_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           COALESCE(s.student_number, 'N/A') AS student_number
    INTO v_req
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.students s ON s.id = req.student_id
    WHERE req.id = p_request_id AND req.user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only pending requests can be cancelled.');
    END IF;

    UPDATE public.student_profile_change_requests
    SET status = 'Cancelled',
        updated_at = now()
    WHERE id = p_request_id;

    -- UPDATE EXISTING LOG CARD IN REGISTRAR_LOGS
    IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = p_request_id) THEN
        UPDATE public.registrar_logs
        SET action = 'PROFILE_CHANGE_CANCELLED',
            details = 'User cancelled their pending profile & program change request.',
            metadata = metadata || jsonb_build_object('status', 'Cancelled', 'cancelled_at', now())
        WHERE (metadata->>'request_id')::uuid = p_request_id;
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
            'PROFILE_CHANGE_CANCELLED',
            v_req.student_id,
            v_user_id,
            v_req.student_name,
            v_req.student_number,
            v_user_id,
            v_req.student_name,
            'User cancelled their pending profile & program change request.',
            v_req.current_values,
            v_req.requested_changes,
            jsonb_build_object('request_id', p_request_id, 'status', 'Cancelled', 'cancelled_at', now())
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
END;
$function$;
