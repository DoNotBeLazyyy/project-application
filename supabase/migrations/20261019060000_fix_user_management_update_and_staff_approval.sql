-- Migration: 20261019060000_fix_user_management_update_and_staff_approval.sql
-- Description:
-- 1. Drop legacy overloaded fn_update_user(uuid, text, text, text[]) to eliminate PGRST203 ambiguity.
-- 2. Fix fn_update_user and fn_sync_user_email_to_auth to avoid updating auth.identities.email directly
--    (which is a GENERATED column and throws 428C9 "column email can only be updated to DEFAULT"),
--    only updating identity_data and updated_at.
-- 3. Enhance fn_approve_staff_profile_request with safe date_of_birth / enum parsing,
--    setting profile_completed = true, and directing notification action_url to the appropriate role-based profile path.

-- ============================================================================
-- 1. DROP OVERLOADED fn_update_user SIGNATURES
-- ============================================================================
DROP FUNCTION IF EXISTS public.fn_update_user(uuid, text, text, text[]);

-- ============================================================================
-- 2. FIX fn_sync_user_email_to_auth TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_user_email_to_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.email IS NOT NULL AND (OLD.email IS NULL OR lower(NEW.email) <> lower(OLD.email)) THEN
        -- Keep auth.users in sync
        UPDATE auth.users
        SET email = NEW.email,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = NEW.id
          AND (email IS NULL OR lower(email) <> lower(NEW.email));

        -- Keep auth.identities in sync (identity_data only, email is ALWAYS GENERATED)
        UPDATE auth.identities
        SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(NEW.email)),
            updated_at = now()
        WHERE user_id = NEW.id
          AND (identity_data->>'email' IS NULL OR lower(identity_data->>'email') <> lower(NEW.email));
    END IF;
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_sync_user_email_to_auth() TO authenticated, service_role;

-- ============================================================================
-- 3. FIX fn_update_user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_update_user(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_role_codes text[],
    p_email text DEFAULT NULL::text,
    p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_trimmed_email TEXT;
    v_has_dept_role BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_user_id = auth.uid() AND NOT ('Admin' = ANY (COALESCE(p_role_codes, ARRAY[]::TEXT[]))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot remove the Admin role from your own account.'
        );
    END IF;

    v_trimmed_email := NULLIF(btrim(p_email), '');
    IF v_trimmed_email IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.users
            WHERE lower(email) = lower(v_trimmed_email)
              AND id <> p_user_id
              AND deleted_at IS NULL
        ) OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE lower(email) = lower(v_trimmed_email)
              AND id <> p_user_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'The email address "' || v_trimmed_email || '" is already in use by another account.'
            );
        END IF;

        UPDATE auth.users
        SET email = v_trimmed_email,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = p_user_id;

        -- Update auth.identities identity_data (email is GENERATED)
        UPDATE auth.identities
        SET identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_trimmed_email)),
            updated_at = now()
        WHERE user_id = p_user_id;
    END IF;

    v_has_dept_role := ('Dean' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[])))
                    OR ('Faculty' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[])));

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name),
        email = COALESCE(v_trimmed_email, email),
        department_id = CASE
            WHEN v_has_dept_role THEN COALESCE(p_department_id, department_id)
            ELSE NULL
        END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = p_user_id;

    INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
    SELECT p_user_id, r.id, auth.uid(), r.code
    FROM public.roles r
    WHERE r.code = ANY(p_role_codes)
      AND r.deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[], text, uuid) TO authenticated, service_role;

-- ============================================================================
-- 4. FIX fn_approve_staff_profile_request
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
        v_profile_url := '/profile';
    END IF;

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

GRANT EXECUTE ON FUNCTION public.fn_approve_staff_profile_request(uuid, jsonb, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
