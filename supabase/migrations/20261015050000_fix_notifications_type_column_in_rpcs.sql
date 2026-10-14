-- Migration: 20261015050000_fix_notifications_type_column_in_rpcs.sql
-- Description: Fix invalid column name 'type' to 'notification_type' and cast to notification_category_type
--              in fn_sync_student_year_level, fn_registrar_assign_student_program_and_year,
--              fn_update_my_profile, fn_approve_staff_profile_request, and fn_reject_staff_profile_request.

-- ============================================================================
-- 1. fn_sync_student_year_level
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_student_year_level(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_curr_year SMALLINT;
    v_calculated_year SMALLINT;
    v_is_overridden BOOLEAN;
    v_user_id UUID;
    v_student_num TEXT;
    v_student_name TEXT;
BEGIN
    SELECT s.year_level, COALESCE(s.year_level_overridden, false), s.user_id, s.student_number,
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_curr_year, v_is_overridden, v_user_id, v_student_num, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    v_calculated_year := public.fn_calculate_student_curriculum_year_level(p_student_id);

    -- If overridden by registrar, only auto-advance if the student has naturally surpassed the overridden year
    IF v_is_overridden AND v_calculated_year <= v_curr_year THEN
        RETURN jsonb_build_object(
            'success', true,
            'updated', false,
            'year_level', v_curr_year,
            'calculated_year_level', v_calculated_year,
            'overridden', true
        );
    END IF;

    -- If calculated year level is higher than current year level, advance automatically!
    IF v_calculated_year > v_curr_year THEN
        UPDATE public.students
        SET year_level = v_calculated_year,
            year_level_overridden = false,
            updated_at = now()
        WHERE id = p_student_id;

        -- Record lifecycle event
        INSERT INTO public.student_lifecycle_events (
            student_id,
            event_type,
            from_year_level,
            to_year_level,
            reason,
            effective_date,
            created_by
        ) VALUES (
            p_student_id,
            'Year Level Progression',
            v_curr_year,
            v_calculated_year,
            format('Automatically advanced to Year %s based on curriculum completion', v_calculated_year),
            CURRENT_DATE,
            coalesce(auth.uid(), v_user_id)
        );

        -- Send notification to student
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url,
            created_by
        ) VALUES (
            v_user_id,
            'Year Level Advanced',
            format('Congratulations! You have completed all required courses for Year %s and have advanced to Year %s.', v_curr_year, v_calculated_year),
            'Enrollment'::public.notification_category_type,
            '/profile',
            coalesce(auth.uid(), v_user_id)
        );

        -- Log to registrar logs
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
            new_values
        ) VALUES (
            'YEAR_LEVEL_AUTO_ADVANCED',
            p_student_id,
            v_user_id,
            v_student_name,
            v_student_num,
            auth.uid(),
            'System Curriculum Sync',
            format('Student automatically advanced from Year %s to Year %s based on curriculum progression.', v_curr_year, v_calculated_year),
            jsonb_build_object('year_level', v_curr_year),
            jsonb_build_object('year_level', v_calculated_year)
        );

        RETURN jsonb_build_object(
            'success', true,
            'updated', true,
            'year_level', v_calculated_year,
            'previous_year_level', v_curr_year,
            'calculated_year_level', v_calculated_year
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'updated', false,
        'year_level', v_curr_year,
        'calculated_year_level', v_calculated_year,
        'overridden', v_is_overridden
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_sync_student_year_level(uuid) TO authenticated, service_role;

-- ============================================================================
-- 2. fn_registrar_assign_student_program_and_year
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_registrar_assign_student_program_and_year(
    p_student_id uuid,
    p_program_id uuid,
    p_year_level smallint DEFAULT NULL::smallint,
    p_is_override boolean DEFAULT false,
    p_reason text DEFAULT NULL::text
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
    v_curr_program_id UUID;
    v_curr_year SMALLINT;
    v_curr_overridden BOOLEAN;
    v_target_year SMALLINT;
    v_program_name TEXT;
    v_program_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.user_id, s.student_number, s.program_id, s.year_level, COALESCE(s.year_level_overridden, false),
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_curr_program_id, v_curr_year, v_curr_overridden, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT code, name INTO v_program_code, v_program_name
    FROM public.programs
    WHERE id = p_program_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found or inactive.');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    IF p_year_level IS NOT NULL AND p_year_level >= 1 AND p_year_level <= 6 THEN
        v_target_year := p_year_level;
    ELSE
        -- Default to curriculum calculation or existing year
        v_target_year := COALESCE(v_curr_year, 1);
    END IF;

    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year,
        year_level_overridden = p_is_override,
        updated_at = now(),
        updated_by = v_registrar_id
    WHERE id = p_student_id;

    -- Lifecycle event
    IF v_curr_program_id IS DISTINCT FROM p_program_id THEN
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
            p_student_id,
            'Program Shift',
            v_curr_program_id,
            p_program_id,
            v_curr_year,
            v_target_year,
            COALESCE(p_reason, 'Assigned by Registrar'),
            CURRENT_DATE,
            v_registrar_id
        );
    ELSIF v_curr_year IS DISTINCT FROM v_target_year THEN
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
            p_student_id,
            'Year Level Progression',
            p_program_id,
            p_program_id,
            v_curr_year,
            v_target_year,
            COALESCE(p_reason, CASE WHEN p_is_override THEN 'Manual year level override by Registrar' ELSE 'Updated by Registrar' END),
            CURRENT_DATE,
            v_registrar_id
        );
    END IF;

    -- Registrar log
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
        new_values
    ) VALUES (
        'STUDENT_ACADEMIC_ASSIGNMENT',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        format('Registrar assigned program %s and Year %s%s.', v_program_code, v_target_year, CASE WHEN p_is_override THEN ' (Manual Override)' ELSE '' END) || COALESCE(' Reason: ' || p_reason, ''),
        jsonb_build_object('program_id', v_curr_program_id, 'year_level', v_curr_year, 'overridden', v_curr_overridden),
        jsonb_build_object('program_id', p_program_id, 'program_code', v_program_code, 'year_level', v_target_year, 'overridden', p_is_override)
    );

    -- Notification to student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_user_id,
        'Program & Year Level Assigned',
        format('Your academic program has been set to %s (%s), Year Level %s by the Registrar.', v_program_name, v_program_code, v_target_year),
        'Enrollment'::public.notification_category_type,
        '/profile',
        v_registrar_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully assigned %s (Year %s) to student.', v_program_code, v_target_year),
        'year_level', v_target_year,
        'program_id', p_program_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_assign_student_program_and_year(uuid, uuid, smallint, boolean, text) TO authenticated, service_role;

-- ============================================================================
-- 3. fn_update_my_profile
-- ============================================================================
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
    p_year_level smallint DEFAULT NULL::smallint,
    p_department_id uuid DEFAULT NULL::uuid
)
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
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), '')
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
        nationality = NULLIF(btrim(COALESCE(p_nationality), ''), ''),
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

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint, uuid) TO authenticated, service_role;

-- ============================================================================
-- 4. fn_approve_staff_profile_request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_approve_staff_profile_request(
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
    v_admin_id UUID := auth.uid();
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_status TEXT := 'Approved';
    v_date_of_birth DATE;
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

    -- Update request record
    UPDATE public.staff_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id;

    -- Notification to user
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
        CASE WHEN v_is_edited 
             THEN 'Your profile changes have been reviewed, adjusted by the Administrator, and approved.'
             ELSE 'Your profile change request has been verified and approved by the Administrator.'
        END,
        'Account'::public.notification_category_type,
        '/profile',
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'message', 'Staff profile request successfully approved.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_approve_staff_profile_request(uuid, jsonb, text) TO authenticated, service_role;

-- ============================================================================
-- 5. fn_reject_staff_profile_request
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_reject_staff_profile_request(
    p_request_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_admin_id UUID := auth.uid();
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF btrim(COALESCE(p_reason, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A reason is required when rejecting a profile change request.');
    END IF;

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name
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

    UPDATE public.staff_profile_change_requests
    SET status = 'Rejected',
        rejection_reason = btrim(p_reason),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Notification to user
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_req.user_id,
        'Profile Changes Rejected',
        format('Your profile change request was rejected by the Administrator. Reason: %s', btrim(p_reason)),
        'Account'::public.notification_category_type,
        '/profile',
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'Rejected',
        'message', 'Staff profile request has been rejected.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_reject_staff_profile_request(uuid, text) TO authenticated, service_role;
