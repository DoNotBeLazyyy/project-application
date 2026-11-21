-- ====================================================================
-- Migration: 20261121300001_department_delete_fix.sql
-- Audit 2026-11-21:
--   * #35 fn_delete_department / fn_bulk_delete_departments read the dropped column
--     departments.head_user_id, so every delete failed. The Dean is a user whose
--     department_id points at the department, so the users check already covers them.
--   * T4 "department delete would ignore its courses": both now also refuse while
--     active courses still belong to the department.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shape unchanged.
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
    v_active_courses INTEGER;
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

    SELECT COUNT(*) INTO v_active_courses
    FROM public.courses
    WHERE department_id = p_department_id
    AND deleted_at IS NULL;

    IF v_active_courses > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete department. ' || v_active_courses || ' course(s) still belong to this department. Move or delete them first.'
        );
    END IF;

    -- The Dean and faculty members must be moved or unassigned first
    SELECT COUNT(DISTINCT u.id) INTO v_assigned_users
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.department_id = p_department_id;

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
    v_blocked_courses INTEGER;
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

    SELECT COUNT(*) INTO v_blocked_courses
    FROM public.courses
    WHERE department_id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    IF v_blocked_courses > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected departments. ' || v_blocked_courses || ' course(s) still belong to them. Move or delete them first.'
        );
    END IF;

    SELECT COUNT(DISTINCT u.id) INTO v_assigned_users
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.department_id = ANY(p_department_ids);

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
