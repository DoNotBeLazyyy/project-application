-- Migration: 20261002110000_deactivate_users_instead_of_delete.sql
-- Update fn_bulk_delete_users to set status = 'Inactive' instead of setting deleted_at

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

    UPDATE public.users
    SET status = 'Inactive',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = ANY(p_user_ids)
    AND deleted_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully set %s user(s) to inactive.', v_updated_count),
        'count', v_updated_count
    );
END;
$function$;
