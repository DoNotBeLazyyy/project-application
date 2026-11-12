-- ====================================================================
-- Migration: 20261104010000_block_self_deactivation.sql
--   * fn_bulk_delete_users: an admin can no longer deactivate their own account
--     (alone or inside a bulk selection); nothing is changed when the list holds the caller
-- Signature and grants are unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_users(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_updated_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    -- The signed-in admin would lock themselves out
    IF auth.uid() = ANY(COALESCE(p_user_ids, ARRAY[]::uuid[])) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot deactivate your own account.'
        );
    END IF;

    UPDATE public.users
    SET status = 'Inactive',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = ANY(p_user_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully deactivated %s user(s).', v_updated_count),
        'count', v_updated_count
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_users(uuid[]) TO authenticated, service_role;

COMMIT;