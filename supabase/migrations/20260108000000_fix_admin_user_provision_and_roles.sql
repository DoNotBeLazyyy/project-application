-- ============================================================================
-- Migration: 20260108000000_fix_admin_user_provision_and_roles.sql
-- Description: Fix user provisioning authorization and role verification.
--              1. Support service_role bypass in fn_assert_role for Edge Functions.
--              2. Add fn_assert_role(p_role_code text) overload for PostgREST RPC resolution.
--              3. Ensure fn_provision_single_user generates student profile on student creation.
--              4. Grant execute permissions to authenticated and service_role.
-- ============================================================================

-- 1. Base fn_assert_role supporting VARIADIC p_roles text[]
CREATE OR REPLACE FUNCTION public.fn_assert_role(VARIADIC p_roles text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_roles TEXT[];
BEGIN
    -- Allow service_role to bypass role check (trusted server / edge function caller)
    IF (current_user = 'service_role' OR session_user = 'service_role' OR (auth.jwt() ->> 'role') = 'service_role') THEN
        RETURN;
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF NOT EXISTS (
        SELECT 1
        FROM unnest(v_roles) AS held(code)
        JOIN unnest(p_roles) AS required(code)
            ON lower(btrim(held.code)) = lower(btrim(required.code))
    ) THEN
        RAISE EXCEPTION 'Forbidden: this action requires one of the following roles: %.',
            array_to_string(p_roles, ', ')
            USING ERRCODE = '42501';
    END IF;
END;
$$;

-- 2. Overload for single role code parameter: p_role_code (used by admin-user-provision Edge Function)
CREATE OR REPLACE FUNCTION public.fn_assert_role(p_role_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.fn_assert_role(VARIADIC ARRAY[p_role_code]);
END;
$$;

-- 3. Update fn_provision_single_user
CREATE OR REPLACE FUNCTION public.fn_provision_single_user(
    p_auth_id uuid,
    p_email text,
    p_first_name text,
    p_last_name text,
    p_role_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    INSERT INTO public.users (id, email, first_name, last_name, status, created_by)
    VALUES (p_auth_id, p_email, p_first_name, p_last_name, 'Invited', coalesce(auth.uid(), p_auth_id))
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        deleted_at = NULL,
        status = 'Invited';

    INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
    VALUES (p_auth_id, v_role_id, coalesce(auth.uid(), p_auth_id), p_role_code)
    ON CONFLICT DO NOTHING;

    -- If student role, ensure students profile is created
    IF p_role_code = 'Student' THEN
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
            p_auth_id,
            v_student_number,
            1,
            'Active'::public.student_status_type,
            CURRENT_DATE,
            coalesce(auth.uid(), p_auth_id)
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'User provisioned successfully');
END;
$$;

-- 4. Update fn_bulk_provision_users
CREATE OR REPLACE FUNCTION public.fn_bulk_provision_users(p_users jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry          JSONB;
    v_provisioned    INTEGER := 0;
    v_errors         TEXT[]  := ARRAY[]::TEXT[];
    v_failed_ids     UUID[]  := ARRAY[]::UUID[];
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
            v_errors := array_append(v_errors, (v_entry->>'email') || ': ' || (v_result->>'message'));
            v_failed_ids := array_append(v_failed_ids, (v_entry->>'auth_id')::UUID);
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',           array_length(v_errors, 1) IS NULL,
        'provisioned_count', v_provisioned,
        'errors',            to_jsonb(v_errors),
        'failed_auth_ids',   to_jsonb(v_failed_ids)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION public.fn_assert_role(VARIADIC text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_role(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_provision_single_user(uuid, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_bulk_provision_users(jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
