-- Rollback of 20261031020000_protect_builtin_roles: exact live definitions captured before apply
BEGIN;

-- fn_delete_role
CREATE OR REPLACE FUNCTION public.fn_delete_role(p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_users INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT COUNT(*) INTO v_active_users
    FROM public.user_roles
    WHERE role_id = p_role_id
    AND deleted_at IS NULL;

    IF v_active_users > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete role. ' || v_active_users || ' user(s) are currently assigned to this role.'
        );
    END IF;

    UPDATE public.roles
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role deleted successfully');
END;
$function$;

-- fn_update_role
CREATE OR REPLACE FUNCTION public.fn_update_role(p_role_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := regexp_replace(upper(btrim(p_label)), '[^A-Z0-9]+', '_', 'g');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(code) = lower(v_final_code) AND id <> p_role_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.roles
            WHERE lower(code) = lower(v_final_code || '_' || v_seq::text) AND id <> p_role_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '_' || v_seq::text;
    END IF;

    UPDATE public.roles
    SET
        code = v_final_code,
        label = p_label,
        description = NULLIF(p_description, ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully', 'code', v_final_code);
END;
$function$;

COMMIT;
