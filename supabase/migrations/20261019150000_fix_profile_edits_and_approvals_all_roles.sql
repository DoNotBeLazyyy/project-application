-- Migration: 20261019150000_fix_profile_edits_and_approvals_all_roles.sql
-- Description:
-- 1. Update fn_update_my_profile with DEFAULT NULL on all parameters to prevent PGRST202 schema cache mismatch
--    regardless of which subset of parameters is passed by callers.
-- 2. Add safe enum parsing (gender_type, civil_status_type) and safe date parsing in fn_update_my_profile and fn_complete_user_profile.
-- 3. Notify Registrars upon student profile submission, and notify Admins upon staff profile submission.
-- 4. Update fn_get_my_profile to return role_codes alongside role_labels and correct approver_role.
-- 5. Fix fn_approve_student_profile_request and fn_reject_student_profile_request with safe enum casting,
--    setting profile_completed = true upon approval, and casting notification_type to notification_category_type.

-- ============================================================================
-- 1. DROP ALL OVERLOADS OF fn_update_my_profile
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint, uuid);

-- ============================================================================
-- 2. RECREATE fn_update_my_profile WITH UNIVERSAL DEFAULTS & SAFE ENUMS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_update_my_profile(
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
    p_nationality text DEFAULT NULL::text,
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

    v_requested_changes := jsonb_build_object(
        'first_name', v_eff_first_name,
        'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), COALESCE(v_curr_record.middle_name, ''), ''),
        'last_name', v_eff_last_name,
        'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), COALESCE(v_curr_record.suffix, ''), ''),
        'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), COALESCE(v_curr_record.preferred_name, ''), ''),
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), COALESCE(v_curr_record.mobile_number, ''), ''),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), COALESCE(v_curr_record.address_line1, ''), ''),
        'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), COALESCE(v_curr_record.address_line2, ''), ''),
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

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint, uuid) TO authenticated, service_role;

-- ============================================================================
-- 3. UPDATE fn_get_my_profile TO RETURN role_codes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
    v_pending JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    -- Look up pending request from student queue first, then staff queue
    SELECT jsonb_build_object(
        'id', req.id,
        'status', req.status,
        'requested_changes', req.requested_changes,
        'current_values', req.current_values,
        'created_at', req.created_at,
        'rejection_reason', req.rejection_reason,
        'registrar_notes', req.registrar_notes,
        'approver_role', 'Registrar'
    )
    INTO v_pending
    FROM public.student_profile_change_requests req
    WHERE req.user_id = v_user_id AND req.status = 'Pending'
    ORDER BY req.created_at DESC
    LIMIT 1;

    IF v_pending IS NULL THEN
        SELECT jsonb_build_object(
            'id', req.id,
            'status', req.status,
            'requested_changes', req.requested_changes,
            'current_values', req.current_values,
            'created_at', req.created_at,
            'rejection_reason', req.rejection_reason,
            'registrar_notes', req.admin_notes,
            'approver_role', 'Administrator'
        )
        INTO v_pending
        FROM public.staff_profile_change_requests req
        WHERE req.user_id = v_user_id AND req.status = 'Pending'
        ORDER BY req.created_at DESC
        LIMIT 1;
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'middle_name', COALESCE(u.middle_name, ''),
        'last_name', u.last_name,
        'suffix', COALESCE(u.suffix, ''),
        'preferred_name', COALESCE(u.preferred_name, ''),
        'email', u.email,
        'mobile_number', COALESCE(u.mobile_number, ''),
        'address_line1', COALESCE(u.address_line1, ''),
        'address_line2', COALESCE(u.address_line2, ''),
        'city', COALESCE(u.city, ''),
        'province', COALESCE(u.province, ''),
        'postal_code', COALESCE(u.postal_code, ''),
        'date_of_birth', u.date_of_birth,
        'gender', COALESCE(u.gender::TEXT, ''),
        'civil_status', COALESCE(u.civil_status::TEXT, ''),
        'nationality', COALESCE(u.nationality, ''),
        'avatar_url', u.avatar_url,
        'status', u.status,
        'department_id', u.department_id,
        'department_code', dept.code,
        'department_name', dept.name,
        'profile_completed', u.profile_completed,
        'role_codes', COALESCE((
            SELECT jsonb_agg(r.code ORDER BY r.code)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB),
        'role_labels', COALESCE((
            SELECT jsonb_agg(r.label ORDER BY r.label)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB),
        'student', (
            SELECT jsonb_build_object(
                'id', s.id,
                'student_number', s.student_number,
                'year_level', s.year_level,
                'year_level_overridden', COALESCE(s.year_level_overridden, false),
                'status', s.status,
                'program_id', s.program_id,
                'program_code', p.code,
                'program_name', p.name
            )
            FROM public.students s
            LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
            WHERE s.user_id = u.id AND s.deleted_at IS NULL
            LIMIT 1
        ),
        'pending_profile_request', v_pending
    )
    INTO v_result
    FROM public.users u
    LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_my_profile() TO authenticated, service_role;

-- ============================================================================
-- 4. FIX fn_approve_student_profile_request & fn_reject_student_profile_request
-- ============================================================================
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

    -- Apply approved program_id and year_level to public.students table if present
    IF (v_effective_changes->>'program_id') IS NOT NULL AND (v_effective_changes->>'program_id') <> '' THEN
        BEGIN
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
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Ignore malformed program_id UUID
        END;
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

GRANT EXECUTE ON FUNCTION public.fn_approve_student_profile_request(uuid, jsonb, text) TO authenticated, service_role;

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

    -- Update existing log card in registrar_logs
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
    END IF;

    -- Emit notification to student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_req.user_id,
        v_notif_title,
        'Your profile change request was reviewed and rejected. Reason: ' || p_reason,
        'Account'::public.notification_category_type,
        '/student/profile',
        v_registrar_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'Rejected',
        'message', 'Profile change request rejected successfully.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_reject_student_profile_request(uuid, text, boolean) TO authenticated, service_role;

-- ============================================================================
-- 5. FIX fn_complete_user_profile SAFE ENUMS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_complete_user_profile(
    p_first_name text,
    p_last_name text,
    p_middle_name text DEFAULT NULL::text,
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
    p_nationality text DEFAULT NULL::text,
    p_department_id uuid DEFAULT NULL::uuid,
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT 1::smallint
)
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
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
                v_seq_num := v_seq_num + 1;
                v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
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

GRANT EXECUTE ON FUNCTION public.fn_complete_user_profile TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
