-- Migration: 20260105000000_remove_department_head.sql
-- Description: Remove department head attribute from departments to keep LMS focused strictly on academic taxonomy.

-- 1. Drop foreign key constraint and column from departments
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_head_user_id_fkey;
ALTER TABLE public.departments DROP COLUMN IF EXISTS head_user_id;

-- 2. Update fn_create_department
CREATE OR REPLACE FUNCTION public.fn_create_department(
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid -- optional fallback parameter for backwards compatibility
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    INSERT INTO public.departments (code, name, description, created_by)
    VALUES (p_code, p_name, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Department created successfully');
END;
$function$;

-- 3. Update fn_update_department
CREATE OR REPLACE FUNCTION public.fn_update_department(
    p_department_id uuid,
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid -- optional fallback parameter for backwards compatibility
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND id <> p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    UPDATE public.departments
    SET
        code = p_code,
        name = p_name,
        description = NULLIF(p_description, '')
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$function$;

-- 4. Update fn_list_departments_json
CREATE OR REPLACE FUNCTION public.fn_list_departments_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_has_head boolean DEFAULT NULL::boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE d.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (d.code ILIKE %L OR d.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            d.id,
            d.code,
            d.name,
            d.description,
            COUNT(*) OVER() AS total_count
        FROM public.departments d
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'd.code ASC');
END;
$function$;

-- 5. Update fn_get_department_by_id
CREATE OR REPLACE FUNCTION public.fn_get_department_by_id(p_department_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'description', d.description
    )
    INTO v_result
    FROM public.departments d
    WHERE d.id = p_department_id
    AND d.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN v_result;
END;
$function$;
