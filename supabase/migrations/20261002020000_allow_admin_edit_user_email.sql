-- Migration: 20261002020000_allow_admin_edit_user_email.sql
-- Description: Update fn_update_user to support email editing by Admins with uniqueness checks on public.users and auth.users

CREATE OR REPLACE FUNCTION public.fn_update_user(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_role_codes text[],
    p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_trimmed_email TEXT;
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
        -- Verify email uniqueness against other active users
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

        -- Update auth.users email
        UPDATE auth.users
        SET email = v_trimmed_email,
            updated_at = now()
        WHERE id = p_user_id;

        -- Update public.users email, first_name, last_name
        UPDATE public.users
        SET first_name = btrim(p_first_name),
            last_name = btrim(p_last_name),
            email = v_trimmed_email,
            updated_at = now()
        WHERE id = p_user_id
          AND deleted_at IS NULL;
    ELSE
        UPDATE public.users
        SET first_name = btrim(p_first_name),
            last_name = btrim(p_last_name),
            updated_at = now()
        WHERE id = p_user_id
          AND deleted_at IS NULL;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    v_result := public.fn_apply_user_roles(p_user_id, p_role_codes);

    IF NOT (v_result->>'success')::BOOLEAN THEN
        RETURN v_result;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$function$;
