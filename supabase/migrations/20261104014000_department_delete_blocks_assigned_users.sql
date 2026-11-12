-- ====================================================================
-- Migration: 20261104014000_department_delete_blocks_assigned_users.sql
--   * fn_delete_department / fn_bulk_delete_departments: a department that still has a
--     Dean or faculty members assigned can no longer be deleted (before, only programs
--     blocked it, and the assigned users were left pointing at a deleted department).
--     The program check is unchanged.
-- Signatures and grants are unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_delete_department(p_department_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_programs INTEGER;
    v_assigned_users INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE department_id = p_department_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete department. ' || v_active_programs || ' program(s) are currently under this department.'
        );
    END IF;

    -- The Dean and faculty members must be moved or unassigned first
    SELECT COUNT(DISTINCT u.id) INTO v_assigned_users
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND (
          u.department_id = p_department_id
          OR u.id = (SELECT d.head_user_id FROM public.departments d WHERE d.id = p_department_id)
      );

    IF v_assigned_users > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete department. ' || v_assigned_users || ' user(s) (Dean or faculty) are still assigned to it. Remove them from the department first.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department deleted successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_departments(p_department_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_blocked INTEGER;
    v_assigned_users INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT COUNT(*) INTO v_blocked
    FROM public.programs
    WHERE department_id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    IF v_blocked > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected departments. ' || v_blocked || ' program(s) are still referencing them.'
        );
    END IF;

    SELECT COUNT(DISTINCT u.id) INTO v_assigned_users
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND (
          u.department_id = ANY(p_department_ids)
          OR u.id IN (
              SELECT d.head_user_id FROM public.departments d
              WHERE d.id = ANY(p_department_ids) AND d.head_user_id IS NOT NULL
          )
      );

    IF v_assigned_users > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected departments. ' || v_assigned_users || ' user(s) (Dean or faculty) are still assigned to them. Remove them from the departments first.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Departments deleted successfully');
END;
$function$;

COMMIT;