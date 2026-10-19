-- ============================================================================
-- Migration: Verify User Email for Password Reset
-- Description: Creates fn_verify_user_email RPC to check whether an email exists
--              in the system before requesting password reset. Accessible to anon and authenticated.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_verify_user_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_clean_email text;
    v_user record;
    v_auth_user record;
BEGIN
    v_clean_email := lower(trim(coalesce(p_email, '')));

    IF v_clean_email = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'exists', false,
            'message', 'Please enter your email address.'
        );
    END IF;

    -- Look up user in public.users first (active or soft-deleted)
    SELECT id, email, status, deleted_at
    INTO v_user
    FROM public.users
    WHERE lower(trim(email)) = v_clean_email
    ORDER BY (deleted_at IS NULL) DESC, created_at DESC
    LIMIT 1;

    -- Also check auth.users
    SELECT id, email, banned_until, deleted_at
    INTO v_auth_user
    FROM auth.users
    WHERE lower(trim(email)) = v_clean_email
    LIMIT 1;

    -- If not found anywhere
    IF v_user.id IS NULL AND v_auth_user.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'exists', false,
            'message', 'This email address does not exist in our records.'
        );
    END IF;

    -- If soft-deleted in public.users (or auth.users deleted)
    IF (v_user.id IS NOT NULL AND v_user.deleted_at IS NOT NULL) OR (v_auth_user.id IS NOT NULL AND v_auth_user.deleted_at IS NOT NULL) THEN
        RETURN jsonb_build_object(
            'success', false,
            'exists', false,
            'message', 'This account has been removed or deleted.'
        );
    END IF;

    -- Check if suspended or inactive in public.users
    IF v_user.id IS NOT NULL THEN
        IF v_user.status = 'Suspended' THEN
            RETURN jsonb_build_object(
                'success', false,
                'exists', true,
                'status', 'Suspended',
                'message', 'Your account has been suspended. Please contact your administrator.'
            );
        ELSIF v_user.status = 'Inactive' THEN
            RETURN jsonb_build_object(
                'success', false,
                'exists', true,
                'status', 'Inactive',
                'message', 'Your account is currently inactive. Please contact your administrator.'
            );
        END IF;
    END IF;

    -- Check if banned in auth.users
    IF v_auth_user.id IS NOT NULL AND v_auth_user.banned_until IS NOT NULL AND v_auth_user.banned_until > now() THEN
        RETURN jsonb_build_object(
            'success', false,
            'exists', true,
            'status', 'Suspended',
            'message', 'Your account has been suspended. Please contact your administrator.'
        );
    END IF;

    -- Email exists and is active
    RETURN jsonb_build_object(
        'success', true,
        'exists', true,
        'status', coalesce(v_user.status, 'Active'),
        'message', 'Email address verified.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_verify_user_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verify_user_email(text) TO anon;
