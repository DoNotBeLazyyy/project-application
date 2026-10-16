-- Migration: 20261016020000_department_stepper_dean_faculty_assignment.sql
-- Description:
--   1. Enhance fn_get_users_by_roles to return email, status, role_code, department_id, department_code, and department_name.
--   2. Enhance fn_list_departments_json to return assigned Dean and Faculty count/details and support searching by Dean/Faculty name.
--   3. Enhance fn_get_department_by_id to return assigned dean_id, faculty_ids, deans, and faculties.
--   4. Enhance fn_create_department and fn_update_department to assign/unassign Dean and Faculty members for the department.
--   5. Fix fn_update_user so editing a Dean or Faculty user in User Management preserves their department_id.

-- ============================================================================
-- 1. ENHANCE fn_get_users_by_roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_users_by_roles(p_role_codes text[] DEFAULT NULL::text[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'full_name', sub.full_name,
                'first_name', sub.first_name,
                'last_name', sub.last_name,
                'email', sub.email,
                'status', sub.status,
                'role_code', sub.role_code,
                'role_label', sub.role_label,
                'department_id', sub.department_id,
                'department_code', sub.department_code,
                'department_name', sub.department_name
            )
            ORDER BY sub.last_name ASC, sub.first_name ASC
        ), '[]'::jsonb)
        FROM (
            SELECT DISTINCT ON (u.id)
                u.id,
                btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
                u.first_name,
                u.last_name,
                u.email,
                u.status::text AS status,
                r.code AS role_code,
                r.label AS role_label,
                u.department_id,
                dept.code AS department_code,
                dept.name AS department_name
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
              AND u.status <> 'Inactive'
              AND (p_role_codes IS NULL OR r.code = ANY(p_role_codes))
              AND (
                  v_dean_dept_id IS NULL
                  OR u.department_id = v_dean_dept_id
                  OR EXISTS (
                      SELECT 1
                      FROM public.sections s
                      INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                      WHERE s.faculty_id = u.id
                        AND s.deleted_at IS NULL
                        AND c.department_id = v_dean_dept_id
                  )
              )
            ORDER BY u.id, r.code ASC
        ) sub
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_users_by_roles(text[]) TO authenticated, anon, service_role;

-- ============================================================================
-- 2. ENHANCE fn_list_departments_json
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_list_departments_json(integer, integer, text, jsonb, boolean);

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
            ' AND (
                d.code ILIKE %1$L
                OR d.name ILIKE %1$L
                OR EXISTS (
                    SELECT 1
                    FROM public.users u
                    INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                    INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                    WHERE u.department_id = d.id
                      AND u.deleted_at IS NULL
                      AND r.code IN (''Dean'', ''Faculty'')
                      AND (
                          u.first_name ILIKE %1$L
                          OR u.last_name ILIKE %1$L
                          OR (u.first_name || '' '' || u.last_name) ILIKE %1$L
                          OR u.email ILIKE %1$L
                      )
                )
            )',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            d.id,
            d.code,
            d.name,
            d.description,
            dean_agg.dean_id,
            dean_agg.dean_name,
            dean_agg.dean_email,
            COALESCE(dean_agg.dean_count, 0) AS dean_count,
            COALESCE(fac_agg.faculty_count, 0) AS faculty_count,
            COALESCE(fac_agg.faculty_names, '''') AS faculty_names,
            COUNT(*) OVER() AS total_count
        FROM public.departments d
        LEFT JOIN LATERAL (
            SELECT
                (array_agg(u.id ORDER BY u.last_name ASC, u.first_name ASC))[1] AS dean_id,
                string_agg(btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')), '', '' ORDER BY u.last_name ASC, u.first_name ASC) AS dean_name,
                (array_agg(u.email ORDER BY u.last_name ASC, u.first_name ASC))[1] AS dean_email,
                COUNT(DISTINCT u.id)::int AS dean_count
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE u.department_id = d.id
              AND u.deleted_at IS NULL
              AND u.status <> ''Inactive''
              AND r.code = ''Dean''
        ) dean_agg ON TRUE
        LEFT JOIN LATERAL (
            SELECT
                COUNT(DISTINCT u.id)::int AS faculty_count,
                string_agg(btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')), '', '' ORDER BY u.last_name ASC, u.first_name ASC) AS faculty_names
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE u.department_id = d.id
              AND u.deleted_at IS NULL
              AND u.status <> ''Inactive''
              AND r.code = ''Faculty''
        ) fac_agg ON TRUE
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'd.code ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_departments_json(integer, integer, text, jsonb, boolean) TO authenticated, anon, service_role;

-- ============================================================================
-- 3. ENHANCE fn_get_department_by_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_department_by_id(p_department_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_deans JSONB;
    v_faculties JSONB;
    v_dean_id UUID;
    v_dean_ids JSONB;
    v_faculty_ids JSONB;
BEGIN
    SELECT
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'first_name', sub.first_name,
                'last_name', sub.last_name,
                'full_name', sub.full_name,
                'email', sub.email,
                'status', sub.status
            )
            ORDER BY sub.last_name ASC, sub.first_name ASC
        ), '[]'::jsonb),
        COALESCE(jsonb_agg(sub.id ORDER BY sub.last_name ASC, sub.first_name ASC), '[]'::jsonb),
        (array_agg(sub.id ORDER BY sub.last_name ASC, sub.first_name ASC))[1]
    INTO v_deans, v_dean_ids, v_dean_id
    FROM (
        SELECT DISTINCT ON (u.id)
            u.id,
            u.first_name,
            u.last_name,
            btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
            u.email,
            u.status::text AS status
        FROM public.users u
        INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
        INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.department_id = p_department_id
          AND u.deleted_at IS NULL
          AND u.status <> 'Inactive'
          AND r.code = 'Dean'
        ORDER BY u.id
    ) sub;

    SELECT
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'first_name', sub.first_name,
                'last_name', sub.last_name,
                'full_name', sub.full_name,
                'email', sub.email,
                'status', sub.status
            )
            ORDER BY sub.last_name ASC, sub.first_name ASC
        ), '[]'::jsonb),
        COALESCE(jsonb_agg(sub.id ORDER BY sub.last_name ASC, sub.first_name ASC), '[]'::jsonb)
    INTO v_faculties, v_faculty_ids
    FROM (
        SELECT DISTINCT ON (u.id)
            u.id,
            u.first_name,
            u.last_name,
            btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
            u.email,
            u.status::text AS status
        FROM public.users u
        INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
        INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.department_id = p_department_id
          AND u.deleted_at IS NULL
          AND u.status <> 'Inactive'
          AND r.code = 'Faculty'
        ORDER BY u.id
    ) sub;

    SELECT jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'description', d.description,
        'dean_id', v_dean_id,
        'dean_ids', v_dean_ids,
        'faculty_ids', v_faculty_ids,
        'deans', v_deans,
        'faculties', v_faculties
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

GRANT EXECUTE ON FUNCTION public.fn_get_department_by_id(uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- 4. HELPER & RPC UPDATES FOR DEPARTMENT DEAN & FACULTY ASSIGNMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_department_personnel(
    p_department_id uuid,
    p_dean_id uuid DEFAULT NULL::uuid,
    p_faculty_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_eff_faculty_ids uuid[] := COALESCE(p_faculty_ids, ARRAY[]::uuid[]);
BEGIN
    -- 1. Unassign any previous Dean of this department who is no longer the assigned Dean (and not in faculty list)
    UPDATE public.users u
    SET department_id = NULL,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE u.department_id = p_department_id
      AND u.deleted_at IS NULL
      AND (p_dean_id IS NULL OR u.id <> p_dean_id)
      AND NOT (u.id = ANY(v_eff_faculty_ids))
      AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
          WHERE ur.user_id = u.id
            AND ur.deleted_at IS NULL
            AND ur.revoked_at IS NULL
            AND r.code = 'Dean'
      );

    -- 2. Assign the selected Dean to this department
    IF p_dean_id IS NOT NULL THEN
        UPDATE public.users
        SET department_id = p_department_id,
            updated_at = now(),
            updated_by = auth.uid()
        WHERE id = p_dean_id
          AND deleted_at IS NULL;
    END IF;

    -- 3. Unassign any previous Faculty of this department who are no longer in p_faculty_ids (and not the assigned Dean)
    UPDATE public.users u
    SET department_id = NULL,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE u.department_id = p_department_id
      AND u.deleted_at IS NULL
      AND (p_dean_id IS NULL OR u.id <> p_dean_id)
      AND NOT (u.id = ANY(v_eff_faculty_ids))
      AND EXISTS (
          SELECT 1
          FROM public.user_roles ur
          INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
          WHERE ur.user_id = u.id
            AND ur.deleted_at IS NULL
            AND ur.revoked_at IS NULL
            AND r.code = 'Faculty'
      );

    -- 4. Assign all selected Faculty members to this department
    IF array_length(v_eff_faculty_ids, 1) IS NOT NULL AND array_length(v_eff_faculty_ids, 1) > 0 THEN
        UPDATE public.users
        SET department_id = p_department_id,
            updated_at = now(),
            updated_by = auth.uid()
        WHERE id = ANY(v_eff_faculty_ids)
          AND deleted_at IS NULL;
    END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_sync_department_personnel(uuid, uuid, uuid[]) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.fn_create_department(text, text, text, uuid);
DROP FUNCTION IF EXISTS public.fn_create_department(text, text, text, uuid, uuid[], boolean);

CREATE OR REPLACE FUNCTION public.fn_create_department(
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid,
    p_faculty_ids uuid[] DEFAULT NULL::uuid[],
    p_sync_personnel boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
    v_new_dept_id uuid;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_department_code(p_name);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.departments
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.departments (code, name, description, created_by)
    VALUES (v_final_code, p_name, NULLIF(p_description, ''), auth.uid())
    RETURNING id INTO v_new_dept_id;

    IF p_sync_personnel OR p_head_user_id IS NOT NULL OR (p_faculty_ids IS NOT NULL AND array_length(p_faculty_ids, 1) > 0) THEN
        PERFORM public.fn_sync_department_personnel(v_new_dept_id, p_head_user_id, p_faculty_ids);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Department created successfully',
        'id', v_new_dept_id,
        'code', v_final_code
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_department(text, text, text, uuid, uuid[], boolean) TO authenticated, anon, service_role;

DROP FUNCTION IF EXISTS public.fn_update_department(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.fn_update_department(uuid, text, text, text, uuid, uuid[], boolean);

CREATE OR REPLACE FUNCTION public.fn_update_department(
    p_department_id uuid,
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid,
    p_faculty_ids uuid[] DEFAULT NULL::uuid[],
    p_sync_personnel boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    UPDATE public.departments
    SET
        name = p_name,
        description = NULLIF(p_description, ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_department_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF p_sync_personnel THEN
        PERFORM public.fn_sync_department_personnel(p_department_id, p_head_user_id, p_faculty_ids);
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_department(uuid, text, text, text, uuid, uuid[], boolean) TO authenticated, anon, service_role;

-- ============================================================================
-- 5. FIX fn_update_user TO PRESERVE DEPARTMENT ASSIGNMENT FROM DEPARTMENT STEPPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_user(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_role_codes text[],
    p_email text DEFAULT NULL::text,
    p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_trimmed_email TEXT;
    v_has_dept_role BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_user_id = auth.uid() AND NOT ('Admin' = ANY (COALESCE(p_role_codes, ARRAY[]::TEXT[]))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot remove the Admin role from your own account.'
        );
    END IF;

    v_trimmed_email := NULLIF(btrim(p_email), '');
    IF v_trimmed_email IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.users
            WHERE lower(email) = lower(v_trimmed_email)
              AND id <> p_user_id
              AND deleted_at IS NULL
        ) OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE lower(email) = lower(v_trimmed_email)
              AND id <> p_user_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'The email address "' || v_trimmed_email || '" is already in use by another account.'
            );
        END IF;

        UPDATE auth.users
        SET email = v_trimmed_email,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = p_user_id;

        UPDATE auth.identities
        SET email = v_trimmed_email,
            identity_data = jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_trimmed_email)),
            updated_at = now()
        WHERE user_id = p_user_id;
    END IF;

    v_has_dept_role := ('Dean' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[])))
                    OR ('Faculty' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[])));

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name),
        email = COALESCE(v_trimmed_email, email),
        department_id = CASE
            WHEN v_has_dept_role THEN COALESCE(p_department_id, department_id)
            ELSE NULL
        END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = p_user_id;

    INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
    SELECT p_user_id, r.id, auth.uid(), r.code
    FROM public.roles r
    WHERE r.code = ANY(p_role_codes)
      AND r.deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[], text, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 6. BACKFILL EXISTING FACULTY DEPARTMENT ASSIGNMENTS FROM TAUGHT SECTIONS
-- ============================================================================

UPDATE public.users u
SET department_id = sub.department_id
FROM (
    SELECT DISTINCT ON (s.faculty_id)
        s.faculty_id,
        c.department_id
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.faculty_id IS NOT NULL
      AND s.deleted_at IS NULL
      AND c.department_id IS NOT NULL
    ORDER BY s.faculty_id, s.created_at DESC
) sub
WHERE u.id = sub.faculty_id
  AND u.department_id IS NULL
  AND u.deleted_at IS NULL;

-- ============================================================================
-- 7. STRICT DEPARTMENT SCOPING HELPERS FOR DEAN AND FACULTY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_dean_department_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_dept_id uuid;
    v_roles text[];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_roles := public.fn_current_user_role_codes();

    -- Admins are NOT restricted to a single department
    IF v_roles && ARRAY['Admin'] THEN
        RETURN NULL;
    END IF;

    -- Non-deans are not scoped by this helper
    IF NOT (v_roles && ARRAY['Dean']) THEN
        RETURN NULL;
    END IF;

    SELECT department_id INTO v_dept_id
    FROM public.users
    WHERE id = v_user_id AND deleted_at IS NULL;

    -- If a Dean has not yet been assigned a department by Admin, return sentinel UUID so they see 0 records
    RETURN COALESCE(v_dept_id, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_dean_department_id() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_department_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_dept_id uuid;
    v_roles text[];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_roles := public.fn_current_user_role_codes();

    -- Admins and Registrars are not restricted by faculty department helper
    IF v_roles && ARRAY['Admin', 'Registrar'] THEN
        RETURN NULL;
    END IF;

    IF NOT (v_roles && ARRAY['Faculty']) THEN
        RETURN NULL;
    END IF;

    SELECT department_id INTO v_dept_id
    FROM public.users
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN COALESCE(v_dept_id, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_department_id() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_scoped_department_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_dept_id uuid;
    v_roles text[];
BEGIN
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    v_roles := public.fn_current_user_role_codes();

    -- Admins, Registrars, and Students are not department-scoped via this helper
    IF v_roles && ARRAY['Admin', 'Registrar', 'Student'] THEN
        RETURN NULL;
    END IF;

    IF NOT (v_roles && ARRAY['Dean', 'Faculty']) THEN
        RETURN NULL;
    END IF;

    SELECT department_id INTO v_dept_id
    FROM public.users
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN COALESCE(v_dept_id, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_scoped_department_id() TO authenticated, anon, service_role;

-- ============================================================================
-- 8. STRICT SCOPING FOR fn_get_users_by_roles & fn_get_departments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_users_by_roles(p_role_codes text[] DEFAULT NULL::text[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_scoped_dept_id UUID;
BEGIN
    v_scoped_dept_id := public.fn_get_scoped_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sub.id,
                'full_name', sub.full_name,
                'first_name', sub.first_name,
                'last_name', sub.last_name,
                'email', sub.email,
                'status', sub.status,
                'role_code', sub.role_code,
                'role_label', sub.role_label,
                'department_id', sub.department_id,
                'department_code', sub.department_code,
                'department_name', sub.department_name
            )
            ORDER BY sub.last_name ASC, sub.first_name ASC
        ), '[]'::jsonb)
        FROM (
            SELECT DISTINCT ON (u.id)
                u.id,
                btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS full_name,
                u.first_name,
                u.last_name,
                u.email,
                u.status::text AS status,
                r.code AS role_code,
                r.label AS role_label,
                u.department_id,
                dept.code AS department_code,
                dept.name AS department_name
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
            WHERE u.deleted_at IS NULL
              AND u.status <> 'Inactive'
              AND (p_role_codes IS NULL OR r.code = ANY(p_role_codes))
              AND (v_scoped_dept_id IS NULL OR u.department_id = v_scoped_dept_id)
            ORDER BY u.id, r.code ASC
        ) sub
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_users_by_roles(text[]) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_departments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_scoped_dept_id UUID;
BEGIN
    v_scoped_dept_id := public.fn_get_scoped_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', d.id,
                'code', d.code,
                'label', d.name
            )
            ORDER BY d.name ASC
        ), '[]'::jsonb)
        FROM public.departments d
        WHERE d.deleted_at IS NULL
          AND (v_scoped_dept_id IS NULL OR d.id = v_scoped_dept_id)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_departments() TO authenticated, anon, service_role;

-- ============================================================================
-- 9. STRICT SCOPING FOR SECTIONS, SCHEDULE CONFLICTS, AND DEAN DASHBOARD
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_sections()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_dept_id UUID;
    v_faculty_dept_id UUID;
    v_is_faculty_only BOOLEAN;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_faculty_dept_id := public.fn_get_faculty_department_id();
    v_is_faculty_only := NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           s.id,
                'section_code', s.section_code,
                'label',        s.section_code || ' — ' || c.code
            )
            ORDER BY s.section_code ASC
        ), '[]'::JSONB)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
          AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
          AND (NOT v_is_faculty_only OR (s.faculty_id = auth.uid() AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)))
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_sections() TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_announcement_section_options()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_is_staff BOOLEAN;
    v_dean_dept_id UUID;
    v_faculty_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar'];
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_faculty_dept_id := public.fn_get_faculty_department_id();

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.label), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            s.id,
            s.section_code,
            trim(concat(c.code, ' - ', s.section_code)) AS label
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
          AND (v_is_staff OR (s.faculty_id = auth.uid() AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)))
          AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
    ) t;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_announcement_section_options() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_schedule_conflicts(p_term_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty JSONB;
    v_rooms   JSONB;
    v_dean_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_dean_dept_id := public.fn_get_dean_department_id();

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'faculty_name', x->>'day_of_week', x->>'time_start'), '[]'::JSONB)
    INTO v_faculty
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', 'Faculty',
            'faculty_name', fu.first_name || ' ' || fu.last_name,
            'subject_label', fu.first_name || ' ' || fu.last_name,
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a', sa.section_code,
            'section_b', sb.section_code,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM')
        ) AS x
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sa.faculty_id IS NOT NULL
          AND sb.faculty_id = sa.faculty_id
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
          AND (v_dean_dept_id IS NULL OR ca.department_id = v_dean_dept_id OR cb.department_id = v_dean_dept_id)
    ) faculty_conflicts;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'subject_label', x->>'day_of_week', x->>'time_start'), '[]'::JSONB)
    INTO v_rooms
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', 'Room',
            'faculty_name', COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned'),
            'subject_label', COALESCE(a.room, sa.room),
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a', sa.section_code,
            'section_b', sb.section_code,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM')
        ) AS x
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND COALESCE(a.room, sa.room) IS NOT NULL
          AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
          AND (v_dean_dept_id IS NULL OR ca.department_id = v_dean_dept_id OR cb.department_id = v_dean_dept_id)
    ) room_conflicts;

    RETURN jsonb_build_object(
        'faculty_conflicts', v_faculty,
        'room_conflicts', v_rooms,
        'faculty_conflict_count', jsonb_array_length(v_faculty),
        'room_conflict_count', jsonb_array_length(v_rooms)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_schedule_conflicts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_schedule_conflicts_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid,
    p_conflict_types text[] DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_term_clause    TEXT := '';
    v_dept_clause    TEXT := '';
    v_type_clause    TEXT := '';
    v_search_clause  TEXT := '';
    v_base_query     TEXT;
    v_dean_dept_id   UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_dept_clause := format(' AND (ca.department_id = %1$L OR cb.department_id = %1$L)', v_dean_dept_id);
    END IF;

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND sa.term_id = %L', p_term_id);
    END IF;

    IF p_conflict_types IS NOT NULL AND array_length(p_conflict_types, 1) > 0 THEN
        v_type_clause := format(' WHERE c.conflict_type = ANY (%L::TEXT[])', p_conflict_types);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_search_clause := format(
            ' %1$s (c.faculty_name ILIKE %2$L OR c.subject_label ILIKE %2$L OR c.section_a ILIKE %2$L OR c.section_b ILIKE %2$L)',
            CASE WHEN v_type_clause = '' THEN 'WHERE' ELSE 'AND' END,
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.conflict_type,
            c.faculty_name,
            c.subject_label,
            c.day_of_week,
            c.time_start,
            c.time_end,
            c.section_a,
            c.section_b,
            c.overlap_start,
            c.overlap_end,
            COUNT(*) OVER () AS total_count
        FROM (
            SELECT
                md5(a.id::TEXT || b.id::TEXT || ''Faculty'') AS id,
                ''Faculty'' AS conflict_type,
                fu.first_name || '' '' || fu.last_name AS faculty_name,
                fu.first_name || '' '' || fu.last_name AS subject_label,
                a.day_of_week::TEXT AS day_of_week,
                to_char(a.time_start, ''HH12:MI AM'') AS time_start,
                to_char(a.time_end, ''HH12:MI AM'') AS time_end,
                sa.section_code AS section_a,
                sb.section_code AS section_b,
                to_char(GREATEST(a.time_start, b.time_start), ''HH12:MI AM'') AS overlap_start,
                to_char(LEAST(a.time_end, b.time_end), ''HH12:MI AM'') AS overlap_end,
                GREATEST(a.time_start, b.time_start) AS overlap_start_raw
            FROM public.section_schedules a
            INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
            INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
            INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
            INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
            INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
            INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
            WHERE a.deleted_at IS NULL
              AND sa.faculty_id IS NOT NULL
              AND sb.faculty_id = sa.faculty_id
              AND sb.id <> sa.id
              AND sb.term_id = sa.term_id
              AND a.day_of_week = b.day_of_week
              AND a.time_start < b.time_end
              AND b.time_start < a.time_end
              %1$s
              %4$s
            UNION ALL
            SELECT
                md5(a.id::TEXT || b.id::TEXT || ''Room'') AS id,
                ''Room'' AS conflict_type,
                COALESCE(fu.first_name || '' '' || fu.last_name, ''Unassigned'') AS faculty_name,
                COALESCE(a.room, sa.room) AS subject_label,
                a.day_of_week::TEXT AS day_of_week,
                to_char(a.time_start, ''HH12:MI AM'') AS time_start,
                to_char(a.time_end, ''HH12:MI AM'') AS time_end,
                sa.section_code AS section_a,
                sb.section_code AS section_b,
                to_char(GREATEST(a.time_start, b.time_start), ''HH12:MI AM'') AS overlap_start,
                to_char(LEAST(a.time_end, b.time_end), ''HH12:MI AM'') AS overlap_end,
                GREATEST(a.time_start, b.time_start) AS overlap_start_raw
            FROM public.section_schedules a
            INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
            INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
            INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
            INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
            INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
            LEFT JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
            WHERE a.deleted_at IS NULL
              AND sb.id <> sa.id
              AND sb.term_id = sa.term_id
              AND a.day_of_week = b.day_of_week
              AND a.time_start < b.time_end
              AND b.time_start < a.time_end
              AND COALESCE(a.room, sa.room) IS NOT NULL
              AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
              %1$s
              %4$s
        ) c
        %2$s
        %3$s',
        v_term_clause,
        v_type_clause,
        v_search_clause,
        v_dept_clause
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'conflict_type ASC, faculty_name ASC, day_of_week ASC, overlap_start_raw ASC'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_schedule_conflicts_json(integer, integer, text, jsonb, uuid, text[]) TO authenticated, service_role;

-- Update fn_get_dean_dashboard so total_faculty reflects faculty assigned to the department
CREATE OR REPLACE FUNCTION public.fn_get_dean_dashboard(p_term_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_term JSONB;
    v_conflicts JSONB;
    v_enrollment_ids UUID[];
    v_stats JSONB;
    v_unassigned JSONB;
    v_at_risk_sections JSONB;
    v_program_distribution JSONB;
    v_at_risk_total INTEGER;
    v_dean_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_dean_dept_id := public.fn_get_dean_department_id();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());
    v_term := public.fn_dashboard_term_label(v_term_id);

    v_conflicts := public.fn_list_schedule_conflicts(v_term_id);

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE e.deleted_at IS NULL
      AND e.status = 'Enrolled'
      AND s.term_id = v_term_id
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id);

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'total_departments', (
            SELECT COUNT(*)
            FROM public.departments d
            WHERE d.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR d.id = v_dean_dept_id)
        ),
        'total_programs', (
            SELECT COUNT(*)
            FROM public.programs p
            WHERE p.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR p.department_id = v_dean_dept_id)
        ),
        'total_courses', (
            SELECT COUNT(*)
            FROM public.courses c
            WHERE c.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'sections_this_term', (
            SELECT COUNT(*)
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'enrolled_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE e.deleted_at IS NULL
              AND e.status = 'Enrolled'
              AND s.term_id = v_term_id
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'total_faculty', (
            SELECT COUNT(DISTINCT u.id)
            FROM public.users u
            INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.code = 'Faculty'
            WHERE u.deleted_at IS NULL
              AND u.status <> 'Inactive'
              AND (v_dean_dept_id IS NULL OR u.department_id = v_dean_dept_id)
        ),
        'unassigned_sections', (
            SELECT COUNT(*)
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.faculty_id IS NULL
              AND s.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        ),
        'schedule_conflicts', (
            SELECT COUNT(*)
            FROM (
                SELECT a.id
                FROM public.section_schedules a
                INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
                INNER JOIN public.courses ca ON ca.id = sa.course_id AND ca.deleted_at IS NULL
                INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
                INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
                INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
                WHERE a.deleted_at IS NULL
                  AND sa.term_id = v_term_id
                  AND sb.term_id = v_term_id
                  AND a.day_of_week = b.day_of_week
                  AND a.time_start < b.time_end
                  AND b.time_start < a.time_end
                  AND (
                      (sa.room IS NOT NULL AND sa.room = sb.room)
                      OR (sa.faculty_id IS NOT NULL AND sa.faculty_id = sb.faculty_id)
                  )
                  AND (
                      v_dean_dept_id IS NULL 
                      OR ca.department_id = v_dean_dept_id 
                      OR cb.department_id = v_dean_dept_id
                  )
            ) c_sub
        ),
        'at_risk_students', COALESCE(v_at_risk_total, 0)
    );

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'enrolled_count', (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    WHERE e.section_id = s.id
                      AND e.status = 'Enrolled'
                      AND e.deleted_at IS NULL
                )
            )
            ORDER BY c.code, s.section_code
        ),
        '[]'::jsonb
    )
    INTO v_unassigned
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.faculty_id IS NULL
      AND s.deleted_at IS NULL
      AND s.term_id = v_term_id
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
    LIMIT 10;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_id', row.section_id,
                'section_code', row.section_code,
                'course_code', row.course_code,
                'course_title', row.course_title,
                'faculty_name', row.faculty_name,
                'at_risk_count', row.at_risk_count,
                'enrolled_count', row.enrolled_count,
                'avg_score_pct', row.avg_score_pct
            )
            ORDER BY row.at_risk_count DESC
        ),
        '[]'::jsonb
    )
    INTO v_at_risk_sections
    FROM (
        SELECT s.id AS section_id,
               s.section_code,
               c.code AS course_code,
               c.title AS course_title,
               COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') AS faculty_name,
               COUNT(*) FILTER (WHERE r.is_at_risk) AS at_risk_count,
               COUNT(e.id) AS enrolled_count,
               ROUND(AVG(r.avg_score_pct)::numeric, 1) AS avg_score_pct
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.section_id = s.id AND e.deleted_at IS NULL AND e.status = 'Enrolled'
        LEFT JOIN public.fn_dashboard_enrollment_risk(v_enrollment_ids) r ON r.enrollment_id = e.id
        WHERE s.deleted_at IS NULL
          AND s.term_id = v_term_id
          AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
        GROUP BY s.id, s.section_code, c.code, c.title, u.first_name, u.last_name
        HAVING COUNT(*) FILTER (WHERE r.is_at_risk) > 0
        ORDER BY COUNT(*) FILTER (WHERE r.is_at_risk) DESC
        LIMIT 10
    ) row;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'program_id', p.id,
                'code', p.code,
                'name', p.name,
                'enrolled_count', (
                    SELECT COUNT(DISTINCT st.id)
                    FROM public.students st
                    INNER JOIN public.enrollments e ON e.student_id = st.id AND e.deleted_at IS NULL AND e.status = 'Enrolled'
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE st.program_id = p.id
                      AND st.deleted_at IS NULL
                      AND s.term_id = v_term_id
                )
            )
            ORDER BY p.code
        ),
        '[]'::jsonb
    )
    INTO v_program_distribution
    FROM public.programs p
    WHERE p.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR p.department_id = v_dean_dept_id);

    RETURN jsonb_build_object(
        'term', v_term,
        'stats', v_stats,
        'unassigned_sections', v_unassigned,
        'at_risk_sections', v_at_risk_sections,
        'program_distribution', v_program_distribution
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_dean_dashboard(uuid) TO authenticated, service_role;

-- ============================================================================
-- 10. STRICT SCOPING FOR FACULTY LOADING (fn_list_faculty_load_json & fn_get_faculty_load_detail)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_list_faculty_load_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'u.deleted_at IS NULL AND u.status <> ''Inactive''';
    v_term_clause  TEXT := '';
    v_base_query   TEXT;
    v_dean_dept_id UUID;
    v_dept_clause  TEXT := '';
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_dept_clause := format(' AND c.department_id = %L', v_dean_dept_id);
        v_where_clause := v_where_clause || format(' AND u.department_id = %L', v_dean_dept_id);
    END IF;

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            u.email,
            (
                SELECT COUNT(*)
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
                  %2$s
            ) AS section_count,
            (
                SELECT COALESCE(SUM(c.total_units), 0)
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
                  %2$s
            ) AS total_units,
            (
                SELECT COUNT(*)
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND e.deleted_at IS NULL
                  AND e.status = ''Enrolled''::public.enrollment_status_type
                  %1$s
                  %2$s
            ) AS student_count,
            (
                SELECT COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (sch.time_end - sch.time_start)) / 3600.0)::NUMERIC, 2), 0)
                FROM public.section_schedules sch
                INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND sch.deleted_at IS NULL
                  %1$s
                  %2$s
            ) AS weekly_hours,
            (
                SELECT COUNT(*)
                FROM public.section_schedules a
                INNER JOIN public.sections s ON s.id = a.section_id AND s.deleted_at IS NULL
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
                INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
                INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
                WHERE a.deleted_at IS NULL
                  AND s.faculty_id = u.id
                  AND sb.faculty_id = u.id
                  AND sb.id <> s.id
                  AND sb.term_id = s.term_id
                  AND a.day_of_week = b.day_of_week
                  AND a.time_start < b.time_end
                  AND b.time_start < a.time_end
                  %1$s
                  %2$s
            ) AS conflict_count,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        WHERE EXISTS (
            SELECT 1
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
              AND r.code = ''Faculty''
        )
        AND %3$s',
        v_term_clause,
        v_dept_clause,
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_faculty_load_json(integer, integer, text, jsonb, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_load_detail(
    p_faculty_id uuid,
    p_term_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty          JSONB;
    v_assigned         JSONB;
    v_available        JSONB;
    v_conflicts        JSONB;
    v_term_id          UUID;
    v_dean_dept_id     UUID;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin', 'Registrar');

    v_dean_dept_id := public.fn_get_dean_department_id();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());

    SELECT jsonb_build_object(
        'id', u.id,
        'faculty_name', u.first_name || ' ' || u.last_name,
        'email', u.email
    )
    INTO v_faculty
    FROM public.users u
    WHERE u.id = p_faculty_id
      AND u.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR u.department_id = v_dean_dept_id);

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty user not found in your department.');
    END IF;

    -- Assigned sections for this faculty in the term (scoped to Dean's department if Dean)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_id', s.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'total_units', c.total_units,
                'lecture_units', COALESCE(c.lecture_units, 0),
                'lab_units', COALESCE(c.laboratory_units, 0),
                'room', s.room,
                'max_slots', s.max_slots,
                'status', s.status,
                'term_id', s.term_id,
                'term_label', COALESCE(tt.label || ' - ' || sy.label, 'Active Term'),
                'program_id', prog.id,
                'program_code', prog.code,
                'program_name', prog.name,
                'faculty_id', s.faculty_id,
                'faculty_name', u.first_name || ' ' || u.last_name,
                'is_active_academic_year', COALESCE(sy.is_active, false),
                'enrolled_count', (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    WHERE e.section_id = s.id
                      AND e.deleted_at IS NULL
                      AND e.status = 'Enrolled'::public.enrollment_status_type
                ),
                'available_slots', GREATEST(0, s.max_slots - (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    WHERE e.section_id = s.id
                      AND e.deleted_at IS NULL
                      AND e.status = 'Enrolled'::public.enrollment_status_type
                )),
                'schedules', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', sch.id,
                            'day_of_week', sch.day_of_week::TEXT,
                            'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                            'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                            'room', COALESCE(sch.room, s.room, '')
                        )
                        ORDER BY sch.day_of_week, sch.time_start
                    )
                    FROM public.section_schedules sch
                    WHERE sch.section_id = s.id AND sch.deleted_at IS NULL
                ), '[]'::jsonb)
            )
            ORDER BY c.code, s.section_code
        ),
        '[]'::jsonb
    )
    INTO v_assigned
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    LEFT JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    LEFT JOIN LATERAL (
        SELECT p.id, p.code, p.name
        FROM public.curriculum_maps cm
        INNER JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
        WHERE cm.course_id = s.course_id AND cm.deleted_at IS NULL
        LIMIT 1
    ) prog ON TRUE
    WHERE s.faculty_id = p_faculty_id
      AND s.term_id = v_term_id
      AND s.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id);

    -- Available unassigned sections (scoped to Dean's department if Dean)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_id', s.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'total_units', c.total_units,
                'room', s.room,
                'max_slots', s.max_slots,
                'status', s.status,
                'schedules', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', sch.id,
                            'day_of_week', sch.day_of_week::TEXT,
                            'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                            'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                            'room', COALESCE(sch.room, s.room, '')
                        )
                        ORDER BY sch.day_of_week, sch.time_start
                    )
                    FROM public.section_schedules sch
                    WHERE sch.section_id = s.id AND sch.deleted_at IS NULL
                ), '[]'::jsonb)
            )
            ORDER BY c.code, s.section_code
        ),
        '[]'::jsonb
    )
    INTO v_available
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.faculty_id IS NULL
      AND s.term_id = v_term_id
      AND s.deleted_at IS NULL
      AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id);

    -- Schedule conflicts for this faculty (scoped to Dean's department if Dean)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', a.id::TEXT || '-' || b.id::TEXT,
                'conflict_type', 'Faculty',
                'section_a_id', s.id,
                'section_a', s.section_code,
                'course_a', ca.code || ' - ' || ca.title,
                'section_b_id', sb.id,
                'section_b', sb.section_code,
                'course_b', cb.code || ' - ' || cb.title,
                'day_of_week', a.day_of_week::TEXT,
                'time_start', to_char(a.time_start, 'HH12:MI AM'),
                'time_end', to_char(a.time_end, 'HH12:MI AM'),
                'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
                'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM'),
                'room', COALESCE(a.room, s.room, '')
            )
        ),
        '[]'::jsonb
    )
    INTO v_conflicts
    FROM public.section_schedules a
    INNER JOIN public.sections s ON s.id = a.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses ca ON ca.id = s.course_id AND ca.deleted_at IS NULL
    INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
    INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
    INNER JOIN public.courses cb ON cb.id = sb.course_id AND cb.deleted_at IS NULL
    WHERE a.deleted_at IS NULL
      AND s.faculty_id = p_faculty_id
      AND sb.faculty_id = p_faculty_id
      AND sb.id <> s.id
      AND s.term_id = v_term_id
      AND sb.term_id = v_term_id
      AND a.day_of_week = b.day_of_week
      AND a.time_start < b.time_end
      AND b.time_start < a.time_end
      AND (v_dean_dept_id IS NULL OR ca.department_id = v_dean_dept_id OR cb.department_id = v_dean_dept_id);

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'sections', v_assigned,
        'assigned_sections', v_assigned,
        'available_sections', v_available,
        'conflicts', v_conflicts
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_load_detail(uuid, uuid) TO authenticated, service_role;

-- ============================================================================
-- 11. STRICT DEPARTMENT SCOPING FOR FACULTY PORTAL RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_faculty_dashboard(p_term_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty_id UUID;
    v_faculty_dept_id UUID;
    v_term_id UUID;
    v_term JSONB;
    v_section_ids UUID[];
    v_enrollment_ids UUID[];
    v_stats JSONB;
    v_sections JSONB;
    v_pending_grading JSONB;
    v_todays_classes JSONB;
    v_at_risk_students JSONB;
    v_at_risk_total INTEGER;
    v_today public.day_of_week_type;
BEGIN
    PERFORM public.fn_assert_role('Faculty', 'Admin');

    v_faculty_id := auth.uid();
    v_faculty_dept_id := public.fn_get_faculty_department_id();
    v_term_id := COALESCE(p_term_id, public.fn_dashboard_faculty_term(v_faculty_id));
    v_term := public.fn_dashboard_term_label(v_term_id);
    v_today := to_char(now() AT TIME ZONE 'Asia/Manila', 'FMDay')::public.day_of_week_type;

    SELECT COALESCE(array_agg(s.id), ARRAY[]::UUID[])
    INTO v_section_ids
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.deleted_at IS NULL
      AND s.faculty_id = v_faculty_id
      AND s.term_id = v_term_id
      AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id);

    SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn')
      AND e.section_id = ANY (v_section_ids);

    SELECT COUNT(*) FILTER (WHERE r.is_at_risk)
    INTO v_at_risk_total
    FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r;

    v_stats := jsonb_build_object(
        'my_sections', COALESCE(array_length(v_section_ids, 1), 0),
        'total_students', (
            SELECT COUNT(DISTINCT e.student_id)
            FROM public.enrollments e
            WHERE e.deleted_at IS NULL
              AND e.status NOT IN ('Dropped', 'Withdrawn')
              AND e.section_id = ANY (v_section_ids)
        ),
        'at_risk_students', COALESCE(v_at_risk_total, 0),
        'pending_grading', (
            SELECT COUNT(*)
            FROM public.assessment_submissions sub
            INNER JOIN public.assessment_items ai
                ON ai.id = sub.assessment_item_id
                AND ai.deleted_at IS NULL
            WHERE sub.deleted_at IS NULL
              AND ai.section_id = ANY (v_section_ids)
              AND sub.status IN ('Submitted', 'Late')
        ),
        'published_assessments', (
            SELECT COUNT(*)
            FROM public.assessment_items ai
            WHERE ai.deleted_at IS NULL
              AND ai.is_published
              AND ai.section_id = ANY (v_section_ids)
        ),
        'sessions_today', (
            SELECT COUNT(*)
            FROM public.section_schedules sch
            WHERE sch.deleted_at IS NULL
              AND sch.section_id = ANY (v_section_ids)
              AND sch.day_of_week = v_today
        )
    );

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'course_code', x->>'section_code'), '[]'::JSONB)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'room', s.room,
            'enrolled_count', COALESCE(agg.enrolled_count, 0),
            'at_risk_count', COALESCE(agg.at_risk_count, 0),
            'avg_score_pct', agg.avg_score_pct
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN (
            SELECT
                r.section_id,
                COUNT(*) AS enrolled_count,
                COUNT(*) FILTER (WHERE r.is_at_risk) AS at_risk_count,
                ROUND(AVG(r.avg_score_pct), 2) AS avg_score_pct
            FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
            GROUP BY r.section_id
        ) agg ON agg.section_id = s.id
        WHERE s.id = ANY (v_section_ids)
    ) my_sections;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'ungraded_count')::INTEGER DESC, x->>'title'), '[]'::JSONB)
    INTO v_pending_grading
    FROM (
        SELECT jsonb_build_object(
            'assessment_id', ai.id,
            'section_id', ai.section_id,
            'title', ai.title,
            'assessment_type', ai.assessment_type::TEXT,
            'section_code', s.section_code,
            'course_code', c.code,
            'due_at', ai.due_at,
            'ungraded_count', COUNT(*)
        ) AS x
        FROM public.assessment_submissions sub
        INNER JOIN public.assessment_items ai
            ON ai.id = sub.assessment_item_id
            AND ai.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE sub.deleted_at IS NULL
          AND ai.section_id = ANY (v_section_ids)
          AND sub.status IN ('Submitted', 'Late')
        GROUP BY ai.id, ai.section_id, ai.title, ai.assessment_type, s.section_code, c.code, ai.due_at
        ORDER BY COUNT(*) DESC
        LIMIT 8
    ) pending;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'time_start'), '[]'::JSONB)
    INTO v_todays_classes
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'time_start', sch.time_start,
            'time_end', sch.time_end,
            'room', COALESCE(sch.room, s.room)
        ) AS x
        FROM public.section_schedules sch
        INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE sch.deleted_at IS NULL
          AND sch.section_id = ANY (v_section_ids)
          AND sch.day_of_week = v_today
    ) today;

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'risk_score')::NUMERIC DESC), '[]'::JSONB)
    INTO v_at_risk_students
    FROM (
        SELECT jsonb_build_object(
            'student_id', r.student_id,
            'enrollment_id', r.enrollment_id,
            'section_id', r.section_id,
            'student_number', st.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'section_code', s.section_code,
            'course_code', c.code,
            'avg_score_pct', r.avg_score_pct,
            'attendance_rate', r.attendance_rate,
            'missing_count', r.missing_count,
            'risk_score', r.risk_score,
            'risk_level', r.risk_level
        ) AS x
        FROM public.fn_dashboard_enrollment_risk(v_enrollment_ids) r
        INNER JOIN public.students st ON st.id = r.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = r.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE r.is_at_risk
        ORDER BY r.risk_score DESC
        LIMIT 8
    ) at_risk;

    RETURN jsonb_build_object(
        'success', true,
        'term', v_term,
        'stats', v_stats,
        'sections', v_sections,
        'pending_grading', v_pending_grading,
        'todays_classes', v_todays_classes,
        'at_risk_students', v_at_risk_students
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_dashboard(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_my_sections(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL AND s.faculty_id = auth.uid()';
    v_faculty_dept_id UUID;
BEGIN
    v_faculty_dept_id := public.fn_get_faculty_department_id();
    IF v_faculty_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND c.department_id = %L', v_faculty_dept_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'WITH enrolled_counts AS (
            SELECT
                e.section_id,
                COUNT(*) AS enrolled_count
            FROM public.enrollments e
            WHERE e.status NOT IN (''Dropped'', ''Withdrawn'')
            AND e.deleted_at IS NULL
            GROUP BY e.section_id
        )
        SELECT
            s.id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            s.status,
            s.max_slots,
            COALESCE(ec.enrolled_count, 0) AS enrolled_count,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN enrolled_counts ec ON ec.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_my_sections(integer, integer, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_my_teaching_sections(p_exclude_section_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_faculty_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    v_faculty_dept_id := public.fn_get_faculty_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'term_label', tt.label || ' - ' || sy.label
            )
            ORDER BY sy.label DESC, tt.label, c.code, s.section_code
        ), '[]'::jsonb)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
          AND (p_exclude_section_id IS NULL OR s.id <> p_exclude_section_id)
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_my_teaching_sections(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_section_detail(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_faculty_dept_id UUID;
BEGIN
    v_faculty_dept_id := public.fn_get_faculty_department_id();

    SELECT jsonb_build_object(
        'id',           s.id,
        'section_code', s.section_code,
        'course_code',  c.code,
        'course_title', c.title,
        'term_label',   tt.label || ' - ' || sy.label,
        'term_id',      t.id,
        'status',       s.status,
        'max_slots',    s.max_slots,
        'room',         s.room
    )
    INTO v_result
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE s.id = p_section_id
      AND s.deleted_at IS NULL
      AND s.faculty_id = auth.uid()
      AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id);

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_section_detail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_evaluation_summary(
    p_term_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_faculty_id             uuid := auth.uid();
  v_faculty_dept_id        uuid;
  v_overall_avg            numeric(3,2);
  v_total_evals            integer := 0;
  v_dist_5                 integer := 0;
  v_dist_4                 integer := 0;
  v_dist_3                 integer := 0;
  v_dist_2                 integer := 0;
  v_dist_1                 integer := 0;
  v_sections               jsonb   := '[]'::jsonb;
  v_questions              jsonb   := '[]'::jsonb;
  v_comments               jsonb   := '[]'::jsonb;
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = v_faculty_id
              AND r.code IN ('Faculty', 'Dean', 'Admin')
              AND ur.deleted_at IS NULL
        )
    ) THEN
        RAISE EXCEPTION 'Forbidden: Only faculty members or administrators can view evaluation summaries.'
            USING ERRCODE = '42501';
    END IF;

    v_faculty_dept_id := public.fn_get_scoped_department_id();

    SELECT
        ROUND(AVG(r.rating_value), 2),
        COUNT(DISTINCT r.enrollment_id),
        COUNT(*) FILTER (WHERE r.rating_value = 5),
        COUNT(*) FILTER (WHERE r.rating_value = 4),
        COUNT(*) FILTER (WHERE r.rating_value = 3),
        COUNT(*) FILTER (WHERE r.rating_value = 2),
        COUNT(*) FILTER (WHERE r.rating_value = 1)
    INTO
        v_overall_avg,
        v_total_evals,
        v_dist_5,
        v_dist_4,
        v_dist_3,
        v_dist_2,
        v_dist_1
    FROM public.evaluation_responses r
    INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.faculty_id = v_faculty_id
      AND r.rating_value IS NOT NULL
      AND r.deleted_at IS NULL
      AND (p_term_id IS NULL OR s.term_id = p_term_id)
      AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id);

    SELECT COALESCE(jsonb_agg(sec_row ORDER BY sec_row->>'course_code' ASC), '[]'::jsonb)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id',        s.id,
            'section_code',      s.section_code,
            'course_code',       c.code,
            'course_title',      c.title,
            'avg_rating',        ROUND(AVG(r.rating_value), 2),
            'evaluations_count', COUNT(DISTINCT r.enrollment_id)
        ) AS sec_row
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.section_id = s.id AND e.deleted_at IS NULL
        INNER JOIN public.evaluation_responses r ON r.enrollment_id = e.id AND r.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.rating_value IS NOT NULL
          AND s.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
        GROUP BY s.id, s.section_code, c.code, c.title
    ) sub_sec;

    SELECT COALESCE(jsonb_agg(q_row ORDER BY q_row->>'avg_rating' DESC), '[]'::jsonb)
    INTO v_questions
    FROM (
        SELECT jsonb_build_object(
            'question_id',     q.id,
            'question_text',   q.question_text,
            'question_type',   q.question_type,
            'avg_rating',      ROUND(AVG(r.rating_value), 2),
            'responses_count', COUNT(r.id)
        ) AS q_row
        FROM public.evaluation_responses r
        INNER JOIN public.evaluation_questions q ON q.id = r.question_id AND q.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.rating_value IS NOT NULL
          AND r.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
        GROUP BY q.id, q.question_text, q.question_type
    ) sub_q;

    SELECT COALESCE(jsonb_agg(cmt_row ORDER BY cmt_row->>'created_at' DESC), '[]'::jsonb)
    INTO v_comments
    FROM (
        SELECT jsonb_build_object(
            'response_id',   r.id,
            'section_code',  s.section_code,
            'course_code',   c.code,
            'response_text', r.response_text,
            'created_at',    r.created_at
        ) AS cmt_row
        FROM public.evaluation_responses r
        INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.response_text IS NOT NULL
          AND BTRIM(r.response_text) <> ''
          AND r.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
        LIMIT 100
    ) sub_cmt;

    RETURN jsonb_build_object(
        'success',                  true,
        'overall_avg_rating',       v_overall_avg,
        'total_evaluations_count',  v_total_evals,
        'rating_distribution',      jsonb_build_object(
            '5', v_dist_5,
            '4', v_dist_4,
            '3', v_dist_3,
            '2', v_dist_2,
            '1', v_dist_1
        ),
        'sections',                 v_sections,
        'questions',                v_questions,
        'comments',                 v_comments
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_evaluation_summary(uuid) TO authenticated;

-- ============================================================================
-- 12. STRICT DEPARTMENT SCOPING FOR ANNOUNCEMENTS & EVENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_assert_announcement_sections(p_audience announcement_audience_type, p_section_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_is_faculty_only BOOLEAN;
    v_dean_dept_id UUID;
    v_faculty_dept_id UUID;
    v_valid_count INTEGER;
BEGIN
    v_is_faculty_only := NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']);
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_faculty_dept_id := public.fn_get_faculty_department_id();

    IF p_audience = 'Section' THEN
        IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'Select at least one section for a section-targeted announcement.'
                USING ERRCODE = '22023';
        END IF;

        IF v_is_faculty_only THEN
            SELECT count(*) INTO v_valid_count
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.id = ANY(p_section_ids)
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
              AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id);

            IF v_valid_count <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only post to sections you teach in your assigned department.'
                    USING ERRCODE = '42501';
            END IF;
        ELSIF v_dean_dept_id IS NOT NULL THEN
            SELECT count(*) INTO v_valid_count
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.id = ANY(p_section_ids)
              AND s.deleted_at IS NULL
              AND c.department_id = v_dean_dept_id;

            IF v_valid_count <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only post to sections belonging to your assigned department.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    ELSIF v_is_faculty_only THEN
        RAISE EXCEPTION 'Faculty may only post section-targeted announcements.'
            USING ERRCODE = '42501';
    END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_assert_announcement_sections(announcement_audience_type, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_assert_event_sections(p_audience announcement_audience_type, p_section_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_is_faculty_only BOOLEAN;
    v_dean_dept_id UUID;
    v_faculty_dept_id UUID;
    v_valid_count INTEGER;
BEGIN
    v_is_faculty_only := NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']);
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_faculty_dept_id := public.fn_get_faculty_department_id();

    IF p_audience = 'Section' THEN
        IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'Select at least one section for a section-targeted event.'
                USING ERRCODE = '22023';
        END IF;

        IF v_is_faculty_only THEN
            SELECT count(*) INTO v_valid_count
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.id = ANY(p_section_ids)
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
              AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id);

            IF v_valid_count <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only schedule events for sections you teach in your assigned department.'
                    USING ERRCODE = '42501';
            END IF;
        ELSIF v_dean_dept_id IS NOT NULL THEN
            SELECT count(*) INTO v_valid_count
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.id = ANY(p_section_ids)
              AND s.deleted_at IS NULL
              AND c.department_id = v_dean_dept_id;

            IF v_valid_count <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only schedule events for sections belonging to your assigned department.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    ELSIF v_is_faculty_only THEN
        RAISE EXCEPTION 'Faculty may only schedule section-targeted events.'
            USING ERRCODE = '42501';
    END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_assert_event_sections(announcement_audience_type, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_resolve_audience(
    p_audience announcement_audience_type,
    p_section_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_scoped_dept_id UUID;
BEGIN
    v_scoped_dept_id := public.fn_get_scoped_department_id();

    RETURN QUERY
    SELECT DISTINCT u.id
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.status = 'Active'
      AND (
          (
              p_audience = 'Global'
              AND (
                  v_scoped_dept_id IS NULL
                  OR u.department_id = v_scoped_dept_id
                  OR EXISTS (
                      SELECT 1
                      FROM public.students st
                      INNER JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND st.deleted_at IS NULL
                        AND p.department_id = v_scoped_dept_id
                  )
              )
          )
          OR (
              p_audience = 'Faculty'
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = 'Faculty'
              )
              AND (v_scoped_dept_id IS NULL OR u.department_id = v_scoped_dept_id)
          )
          OR (
              p_audience = 'Student'
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = 'Student'
              )
              AND (
                  v_scoped_dept_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM public.students st
                      INNER JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND st.deleted_at IS NULL
                        AND p.department_id = v_scoped_dept_id
                  )
              )
          )
          OR (
              p_audience = 'Section'
              AND p_section_ids IS NOT NULL
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.enrollments e
                      INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND e.section_id = ANY(p_section_ids)
                        AND e.status = 'Enrolled'
                        AND e.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.sections s
                      WHERE s.faculty_id = u.id
                        AND s.id = ANY(p_section_ids)
                        AND s.deleted_at IS NULL
                  )
              )
          )
      );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_resolve_audience(announcement_audience_type, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_announcements_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_audience text DEFAULT NULL::text,
    p_is_pinned boolean DEFAULT NULL::boolean,
    p_mine_only boolean DEFAULT true,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE a.deleted_at IS NULL';
    v_is_admin BOOLEAN;
    v_scoped_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
          AND r.code = 'Admin'
    ) INTO v_is_admin;

    v_scoped_dept_id := public.fn_get_scoped_department_id();

    IF v_is_admin AND (p_role IS NULL OR p_role = 'Admin') THEN
        -- Admin management view sees all announcements
        NULL;
    ELSIF p_role IS NOT NULL AND p_role <> '' THEN
        v_where := v_where || format(' AND (a.created_by_role = %L OR a.target_audience = ''Global'')', p_role);
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR a.target_audience = ''Global''
                OR EXISTS (
                    SELECT 1 FROM public.user_roles creator_ur
                    JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
                    WHERE creator_ur.user_id = a.created_by
                      AND creator_ur.deleted_at IS NULL
                      AND creator_ur.revoked_at IS NULL
                      AND viewer_ur.user_id = %L
                      AND viewer_ur.deleted_at IS NULL
                      AND viewer_ur.revoked_at IS NULL
                )
            )',
            auth.uid(), auth.uid()
        );
    END IF;

    -- Department isolation for Dean & Faculty: only see announcements from their own department or institutional (Admin/Registrar)
    IF v_scoped_dept_id IS NOT NULL THEN
        v_where := v_where || format(
            ' AND (
                u.department_id = %1$L
                OR (u.department_id IS NULL AND COALESCE(a.created_by_role, '''') IN (''Admin'', ''Registrar''))
            )',
            v_scoped_dept_id
        );
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_audience IS NOT NULL AND p_audience <> '' THEN
        v_where := v_where || format(' AND a.target_audience = %L', p_audience);
    END IF;

    IF p_is_pinned IS NOT NULL THEN
        v_where := v_where || format(' AND a.is_pinned = %L', p_is_pinned::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.expires_at,
            a.created_at,
            a.created_by,
            a.created_by_role,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ) AS section_count,
            (
                SELECT count(*)
                FROM public.announcement_attachments aa
                WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
            ) AS attachment_count,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'a.is_pinned DESC, a.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_announcements_json(integer, integer, text, jsonb, text, boolean, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_events_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_audience text DEFAULT NULL::text,
    p_upcoming_only boolean DEFAULT false,
    p_mine_only boolean DEFAULT true,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
    v_is_admin BOOLEAN;
    v_scoped_dept_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
          AND r.code = 'Admin'
    ) INTO v_is_admin;

    v_scoped_dept_id := public.fn_get_scoped_department_id();

    IF v_is_admin AND (p_role IS NULL OR p_role = 'Admin') THEN
        -- Admin management view sees all events
        NULL;
    ELSIF p_role IS NOT NULL AND p_role <> '' THEN
        v_where := v_where || format(' AND (e.created_by_role = %L OR e.target_audience = ''Global'')', p_role);
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(
            ' AND (
                e.created_by = %L
                OR e.target_audience = ''Global''
                OR EXISTS (
                    SELECT 1 FROM public.user_roles creator_ur
                    JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
                    WHERE creator_ur.user_id = e.created_by
                      AND creator_ur.deleted_at IS NULL
                      AND creator_ur.revoked_at IS NULL
                      AND viewer_ur.user_id = %L
                      AND viewer_ur.deleted_at IS NULL
                      AND viewer_ur.revoked_at IS NULL
                )
            )',
            auth.uid(), auth.uid()
        );
    END IF;

    -- Department isolation for Dean & Faculty: only see events from their own department or institutional (Admin/Registrar)
    IF v_scoped_dept_id IS NOT NULL THEN
        v_where := v_where || format(
            ' AND (
                u.department_id = %1$L
                OR (u.department_id IS NULL AND COALESCE(e.created_by_role, '''') IN (''Admin'', ''Registrar''))
            )',
            v_scoped_dept_id
        );
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (e.title ILIKE %L OR e.description ILIKE %L OR e.location ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_audience IS NOT NULL AND p_audience <> '' THEN
        v_where := v_where || format(' AND e.target_audience = %L', p_audience);
    END IF;

    IF p_upcoming_only THEN
        v_where := v_where || ' AND (e.end_at >= now() OR (e.end_at IS NULL AND e.start_at >= now()))';
    END IF;

    v_base_query := format(
        'SELECT
            e.id,
            e.title,
            e.description,
            e.location,
            e.target_audience,
            e.start_at,
            e.end_at,
            e.all_day,
            e.created_at,
            e.created_by,
            e.created_by_role,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.event_sections esx
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ) AS section_count,
            (
                SELECT count(*)
                FROM public.event_attachments ea
                WHERE ea.event_id = e.id AND ea.deleted_at IS NULL
            ) AS attachment_count,
            COUNT(*) OVER() AS total_count
        FROM public.events e
        LEFT JOIN public.users u ON u.id = e.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.start_at ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_events_json(integer, integer, text, jsonb, text, boolean, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_my_announcements_feed(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_base_query TEXT;
    v_where TEXT;
    v_scoped_dept_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_scoped_dept_id := public.fn_get_scoped_department_id();

    v_where := format(
        'WHERE a.deleted_at IS NULL
           AND (a.published_at IS NULL OR a.published_at <= now())
           AND (a.expires_at IS NULL OR a.expires_at > now())'
    );

    IF p_role IS NOT NULL AND p_role <> '' THEN
        v_where := v_where || format(
            ' AND (
                a.created_by_role = %L
                OR a.target_audience = ''Global''
                OR (a.target_audience IN (''Faculty'', ''Student'') AND a.target_audience::text = %L)
                OR (a.target_audience = ''Section'' AND EXISTS (
                    SELECT 1 FROM public.announcement_sections asx
                    WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
                      AND (
                          EXISTS (
                              SELECT 1 FROM public.enrollments e
                              JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                              WHERE st.user_id = %L AND e.section_id = asx.section_id
                                AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.sections s
                              WHERE s.id = asx.section_id AND s.faculty_id = %L AND s.deleted_at IS NULL
                          )
                      )
                ))
            )',
            p_role, p_role, v_uid, v_uid
        );
    ELSE
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR a.target_audience = ''Global''
                OR (a.target_audience IN (''Faculty'', ''Student'')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = a.target_audience::text
                    ))
                OR (a.target_audience = ''Section''
                    AND EXISTS (
                        SELECT 1 FROM public.announcement_sections asx
                        WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.enrollments e
                                  JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = %L AND e.section_id = asx.section_id
                                    AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.sections s
                                  WHERE s.id = asx.section_id AND s.faculty_id = %L AND s.deleted_at IS NULL
                              )
                          )
                    ))
            )',
            v_uid, v_uid, v_uid, v_uid
        );
    END IF;

    -- Department isolation for Dean & Faculty in feed
    IF v_scoped_dept_id IS NOT NULL THEN
        v_where := v_where || format(
            ' AND (
                u.department_id = %1$L
                OR (u.department_id IS NULL AND COALESCE(a.created_by_role, '''') IN (''Admin'', ''Registrar''))
            )',
            v_scoped_dept_id
        );
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.created_at,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.announcement_attachments aa
                WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
            ) AS attachment_count,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            ''id'', aa.id,
                            ''file_name'', aa.file_name,
                            ''file_path'', aa.file_path,
                            ''mime_type'', aa.mime_type,
                            ''file_size'', aa.file_size
                        )
                        ORDER BY aa.created_at
                    )
                    FROM public.announcement_attachments aa
                    WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
                ),
                ''[]''::jsonb
            ) AS attachments,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_my_announcements_feed(integer, integer, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_list_my_events_feed(
    p_from timestamp with time zone,
    p_to timestamp with time zone,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_result JSONB;
    v_scoped_dept_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_scoped_dept_id := public.fn_get_scoped_department_id();

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.start_at), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            e.id,
            e.title,
            e.description,
            e.location,
            e.target_audience,
            e.start_at,
            e.end_at,
            e.all_day,
            (
                SELECT count(*)
                FROM public.event_attachments ea
                WHERE ea.event_id = e.id AND ea.deleted_at IS NULL
            ) AS attachment_count,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', ea.id,
                            'file_name', ea.file_name,
                            'file_path', ea.file_path,
                            'mime_type', ea.mime_type,
                            'file_size', ea.file_size
                        )
                        ORDER BY ea.created_at
                    )
                    FROM public.event_attachments ea
                    WHERE ea.event_id = e.id AND ea.deleted_at IS NULL
                ),
                '[]'::jsonb
            ) AS attachments
        FROM public.events e
        LEFT JOIN public.users u ON u.id = e.created_by
        WHERE e.deleted_at IS NULL
          AND e.start_at < p_to
          AND (COALESCE(e.end_at, e.start_at) >= p_from)
          AND (
              v_scoped_dept_id IS NULL
              OR u.department_id = v_scoped_dept_id
              OR (u.department_id IS NULL AND COALESCE(e.created_by_role, '') IN ('Admin', 'Registrar'))
          )
          AND (
              CASE
                  WHEN p_role IS NOT NULL AND p_role <> '' THEN
                      e.created_by_role = p_role
                      OR e.target_audience = 'Global'
                      OR (e.target_audience IN ('Faculty', 'Student') AND e.target_audience::text = p_role)
                      OR (e.target_audience = 'Section' AND EXISTS (
                          SELECT 1 FROM public.event_sections esx
                          WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
                            AND (
                                EXISTS (
                                    SELECT 1 FROM public.enrollments en
                                    JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                    WHERE st.user_id = v_uid AND en.section_id = esx.section_id
                                      AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                                )
                                OR EXISTS (
                                    SELECT 1 FROM public.sections s
                                    WHERE s.id = esx.section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
                                )
                            )
                      ))
                  ELSE
                      e.target_audience = 'Global'
                      OR (e.target_audience IN ('Faculty', 'Student')
                          AND EXISTS (
                              SELECT 1 FROM public.user_roles ur
                              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                              WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                AND r.code = e.target_audience::text
                          ))
                      OR (e.target_audience = 'Section'
                          AND EXISTS (
                              SELECT 1 FROM public.event_sections esx
                              WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
                                AND (
                                    EXISTS (
                                        SELECT 1 FROM public.enrollments en
                                        JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                        WHERE st.user_id = v_uid AND en.section_id = esx.section_id
                                          AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                                    )
                                    OR EXISTS (
                                        SELECT 1 FROM public.sections s
                                        WHERE s.id = esx.section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
                                    )
                                )
                          ))
              END
          )
    ) t;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_my_events_feed(timestamp with time zone, timestamp with time zone, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
