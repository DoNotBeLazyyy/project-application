CREATE OR REPLACE FUNCTION public.fn_get_auth_context()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_profile jsonb;
    v_roles jsonb;
    v_role_codes text[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to load your session.'
            USING ERRCODE = '28000';
    END IF;

    SELECT to_jsonb(p) INTO v_profile
    FROM (
        SELECT u.id,
               u.first_name,
               u.middle_name,
               u.last_name,
               u.suffix,
               u.preferred_name,
               u.email,
               u.mobile_number,
               u.avatar_url,
               u.status
        FROM public.users u
        WHERE u.id = v_user_id
          AND u.deleted_at IS NULL
    ) p;

    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT coalesce(
               jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'code', r.code, 'label', r.label)),
               '[]'::jsonb
           ),
           coalesce(array_agg(DISTINCT r.code), ARRAY[]::text[])
    INTO v_roles, v_role_codes
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = v_user_id
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'profile', v_profile,
        'roles', v_roles,
        'role_codes', to_jsonb(v_role_codes)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_active_role(p_active_role text)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_role_codes text[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to select a role.'
            USING ERRCODE = '28000';
    END IF;

    IF p_active_role IS NULL OR btrim(p_active_role) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active role was provided.');
    END IF;

    v_role_codes := public.fn_current_user_role_codes();

    IF NOT EXISTS (
        SELECT 1
        FROM unnest(v_role_codes) AS held(code)
        WHERE lower(btrim(held.code)) = lower(btrim(p_active_role))
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You do not currently hold the selected role.');
    END IF;

    RETURN jsonb_build_object('success', true, 'active_role', p_active_role);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_auth_context() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_assert_active_role(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assert_active_role(text) TO authenticated;