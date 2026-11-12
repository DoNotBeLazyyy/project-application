-- ====================================================================
-- Migration: 20261106031000_deactivate_ends_sessions.sql
--   * fn_end_user_sessions (new, internal): removes the given users' sign-in sessions and
--     refresh tokens, so a deactivated user cannot renew their login. A login that is already
--     open keeps working until its access token expires; the app's own status check covers that.
--   * fn_bulk_delete_users: after marking users Inactive, ends their sessions
-- Idempotent: CREATE OR REPLACE; fn_bulk_delete_users keeps its signature and grants.
-- ====================================================================
BEGIN;

-- fn_end_user_sessions
CREATE OR REPLACE FUNCTION public.fn_end_user_sessions(p_user_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
    v_session_count INTEGER := 0;
BEGIN
    IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
        RETURN 0;
    END IF;

    BEGIN
        IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
            DELETE FROM auth.refresh_tokens
            WHERE user_id::text = ANY(SELECT unnest(p_user_ids)::text);
        END IF;

        IF to_regclass('auth.sessions') IS NOT NULL THEN
            DELETE FROM auth.sessions
            WHERE user_id = ANY(p_user_ids);
            GET DIAGNOSTICS v_session_count = ROW_COUNT;
        END IF;
    EXCEPTION
        WHEN insufficient_privilege OR undefined_table OR undefined_column THEN
            -- Deactivation still counts; the user is just not signed out right away.
            RAISE WARNING 'fn_end_user_sessions: sessions were not removed (%).', SQLERRM;
            RETURN 0;
    END;

    RETURN v_session_count;
END;
$function$;

-- Only other database functions call this one
REVOKE ALL ON FUNCTION public.fn_end_user_sessions(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_end_user_sessions(uuid[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_end_user_sessions(uuid[]) TO service_role;

-- fn_bulk_delete_users
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_users(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_updated_count INTEGER;
    v_updated_ids UUID[];
BEGIN
    PERFORM public.fn_assert_role('Admin');

    -- The signed-in admin would lock themselves out
    IF auth.uid() = ANY(COALESCE(p_user_ids, ARRAY[]::uuid[])) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot deactivate your own account.'
        );
    END IF;

    WITH updated AS (
        UPDATE public.users
        SET status = 'Inactive',
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = ANY(p_user_ids)
          AND deleted_at IS NULL
        RETURNING id
    )
    SELECT array_agg(id), count(*)::INTEGER
    INTO v_updated_ids, v_updated_count
    FROM updated;

    -- Signs the deactivated users out so their login cannot be renewed
    PERFORM public.fn_end_user_sessions(COALESCE(v_updated_ids, ARRAY[]::uuid[]));

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully deactivated %s user(s).', v_updated_count),
        'count', v_updated_count
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_users(uuid[]) TO authenticated, service_role;

COMMIT;
