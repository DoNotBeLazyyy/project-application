CREATE OR REPLACE FUNCTION public.fn_current_user_role_codes()
    RETURNS text[]
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT coalesce(array_agg(DISTINCT r.code), ARRAY[]::text[])
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = auth.uid()
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_role(VARIADIC p_roles text[])
    RETURNS void
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_roles TEXT[];
BEGIN
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

REVOKE EXECUTE ON FUNCTION public.fn_current_user_role_codes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_assert_role(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_current_user_role_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assert_role(text[]) TO authenticated;
