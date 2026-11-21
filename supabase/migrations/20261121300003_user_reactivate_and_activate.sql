-- ====================================================================
-- Migration: 20261121300003_user_reactivate_and_activate.sql
-- Audit 2026-11-21:
--   * #38 fn_bulk_reactivate_users set every selected user to Active, so Invited users
--     lost "Resend Invite". It now touches only Inactive users. A user who never signed
--     in (no sign-in and no password yet) goes back to Invited, so they can still be
--     re-invited; everyone else goes back to Active.
--   * #38 fn_activate_user (called by the set-password page) re-activated deactivated
--     users through an old invite link. It now moves only Invited users to Active.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_bulk_reactivate_users(p_user_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_updated_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    UPDATE public.users u
    SET status = CASE
            WHEN EXISTS (
                SELECT 1 FROM auth.users au
                WHERE au.id = u.id
                  AND au.last_sign_in_at IS NOT NULL
                  AND COALESCE(au.encrypted_password, '') <> ''
            )
            THEN 'Active'
            ELSE 'Invited'
        END,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE u.id = ANY(p_user_ids)
      AND u.deleted_at IS NULL
      AND u.status = 'Inactive';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully reactivated %s user(s).', v_updated_count),
        'count', v_updated_count
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_activate_user()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only an invitation is completed here; a deactivated account stays deactivated
    UPDATE public.users
    SET
        status     = 'Active',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id         = auth.uid()
      AND status     = 'Invited'
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

COMMIT;
