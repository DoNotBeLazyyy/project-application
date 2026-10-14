-- Migration: 20261015040000_reactivate_users_and_default_status_filter.sql
-- Description:
-- 1. Create fn_bulk_reactivate_users to reactivate inactive accounts to 'Active'.
-- 2. Update fn_bulk_delete_users to provide clear deactivation messages.
-- 3. Update fn_list_users_json to display 'Active' and 'Invited' users by default when no status filter is specified or when 'Active_Invited' is selected.

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

    UPDATE public.users
    SET status = 'Active',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = ANY(p_user_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully reactivated %s user(s).', v_updated_count),
        'count', v_updated_count
    );
END;
$function$;

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
        'message', format('Successfully deactivated %s user(s).', v_updated_count),
        'count', v_updated_count
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_users_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_role_code text DEFAULT NULL::text,
    p_status text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_province text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE u.deleted_at IS NULL';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_role_code IS NOT NULL AND p_role_code <> 'All' THEN
        v_where_clause := v_where_clause || format(
            ' AND EXISTS (
                SELECT 1
                FROM public.user_roles fur
                INNER JOIN public.roles fr ON fr.id = fur.role_id AND fr.deleted_at IS NULL
                WHERE fur.user_id = u.id
                  AND fur.deleted_at IS NULL
                  AND fur.revoked_at IS NULL
                  AND fr.code = %L
            )',
            p_role_code
        );
    END IF;

    -- Handle Status Filtering:
    -- Default or 'Active_Invited' -> display Active and Invited users (exclude Inactive)
    -- 'All' -> include all users (Active, Invited, and Inactive)
    -- specific status ('Active', 'Invited', 'Inactive') -> exact match
    IF p_status IS NOT NULL AND p_status <> '' THEN
        IF p_status = 'Active_Invited' OR p_status = 'Active,Invited' THEN
            v_where_clause := v_where_clause || ' AND u.status IN (''Active'', ''Invited'')';
        ELSIF p_status = 'All' THEN
            NULL; -- Show all statuses
        ELSE
            v_where_clause := v_where_clause || format(' AND u.status = %L', p_status);
        END IF;
    ELSE
        -- Default view excludes Inactive accounts
        v_where_clause := v_where_clause || ' AND u.status IN (''Active'', ''Invited'')';
    END IF;

    IF p_city IS NOT NULL AND p_city <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.city ILIKE %L', '%' || p_city || '%');
    END IF;

    IF p_province IS NOT NULL AND p_province <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.province ILIKE %L', '%' || p_province || '%');
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            COALESCE(ra.role_code, ''No role'') AS role_code,
            u.status,
            u.department_id,
            dept.name AS department_name,
            dept.code AS department_code,
            u.profile_completed,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT string_agg(r.code::TEXT, '', '' ORDER BY r.code) AS role_code
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) ra ON TRUE
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.created_at ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_reactivate_users(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_users(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_users_json TO authenticated, service_role;
