-- Migration: 20261015030000_sync_user_email_and_fix_update_user.sql
-- Description:
-- 1. Update fn_update_user to validate email uniqueness against public.users and auth.users,
--    and keep public.users, auth.users, and auth.identities fully synchronized when email changes.
-- 2. Add trigger fn_sync_user_email_to_auth on public.users to ensure auth records are always in sync.

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

        -- Keep auth.identities in sync
        UPDATE auth.identities
        SET email = NEW.email,
            identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(NEW.email)),
            updated_at = now()
        WHERE user_id = NEW.id
          AND (email IS NULL OR lower(email) <> lower(NEW.email));
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_user_email_to_auth ON public.users;
CREATE TRIGGER trg_sync_user_email_to_auth
    AFTER UPDATE OF email ON public.users
    FOR EACH ROW
    WHEN (OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.fn_sync_user_email_to_auth();

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
    v_result JSONB;
    v_trimmed_email TEXT;
    v_is_dean BOOLEAN;
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
        -- Check email uniqueness in public.users and auth.users
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

        -- Update auth.users and auth.identities
        UPDATE auth.users
        SET email = v_trimmed_email,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = p_user_id;

        UPDATE auth.identities
        SET email = v_trimmed_email,
            identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_trimmed_email)),
            updated_at = now()
        WHERE user_id = p_user_id;
    END IF;

    v_is_dean := 'Dean' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[]));

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name),
        email = COALESCE(v_trimmed_email, email),
        department_id = CASE WHEN v_is_dean THEN p_department_id ELSE COALESCE(p_department_id, department_id) END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    -- Update roles
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

GRANT EXECUTE ON FUNCTION public.fn_sync_user_email_to_auth() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[], text, uuid) TO authenticated, service_role;
