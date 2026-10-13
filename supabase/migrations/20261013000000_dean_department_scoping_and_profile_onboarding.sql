-- Migration: 20261013000000_dean_department_scoping_and_profile_onboarding.sql
-- Description: 
--   1. Add department_id and profile_completed to users table.
--   2. Enforce department-level isolation for Dean (programs, courses, sections, faculty loading, dashboard).
--   3. Add onboarding profile completion RPC for newly created accounts.

-- ============================================================================
-- 1. SCHEMA CHANGES
-- ============================================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false;

-- Backfill active existing users with non-empty names so existing accounts aren't unexpectedly blocked
UPDATE public.users
SET profile_completed = true
WHERE status = 'Active'
  AND COALESCE(NULLIF(btrim(first_name), ''), '') <> ''
  AND COALESCE(NULLIF(btrim(last_name), ''), '') <> '';

-- Backfill known seed deans to test departments
UPDATE public.users
SET department_id = (SELECT id FROM public.departments WHERE code = 'COCS' LIMIT 1)
WHERE lower(email) = 'dean@example.com';

UPDATE public.users
SET department_id = (SELECT id FROM public.departments WHERE code = 'COEDU' LIMIT 1)
WHERE lower(email) = 'erika.dean@example.com';

-- ============================================================================
-- 2. HELPER FUNCTION: fn_get_dean_department_id
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
    v_is_dean boolean;
    v_is_admin boolean;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Admins are NOT restricted to a single department
    v_is_admin := public.fn_current_user_role_codes() && ARRAY['Admin'];
    IF v_is_admin THEN
        RETURN NULL;
    END IF;

    -- Non-deans are not scoped by this helper
    v_is_dean := public.fn_current_user_role_codes() && ARRAY['Dean'];
    IF NOT v_is_dean THEN
        RETURN NULL;
    END IF;

    SELECT department_id INTO v_dept_id
    FROM public.users
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN v_dept_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_dean_department_id TO authenticated, anon, service_role;

-- ============================================================================
-- 3. UPDATE fn_get_auth_context
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_auth_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_profile jsonb;
    v_roles jsonb;
    v_role_codes text[];
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to load your session.'
            USING ERRCODE = '28000';
    END IF;

    SELECT to_jsonb(p) INTO v_profile
    FROM (
        SELECT u.id,
               u.first_name,
               u.middle_name,
               u.last_name,
               u.suffix,
               u.preferred_name,
               u.email,
               u.mobile_number,
               u.avatar_url,
               u.status,
               u.department_id,
               dept.code AS department_code,
               dept.name AS department_name,
               u.profile_completed
        FROM public.users u
        LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
        WHERE u.id = v_user_id
          AND u.deleted_at IS NULL
    ) p;

    IF v_profile IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    SELECT coalesce(
               jsonb_agg(DISTINCT jsonb_build_object('id', r.id, 'code', r.code, 'label', r.label)),
               '[]'::jsonb
           ),
           coalesce(array_agg(DISTINCT r.code), ARRAY[]::text[])
    INTO v_roles, v_role_codes
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = v_user_id
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;

    RETURN jsonb_build_object(
        'user_id', v_user_id,
        'profile', v_profile,
        'roles', v_roles,
        'role_codes', to_jsonb(v_role_codes)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_auth_context TO authenticated, service_role;

-- ============================================================================
-- 4. UPDATE fn_get_my_profile
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'middle_name', COALESCE(u.middle_name, ''),
        'last_name', u.last_name,
        'suffix', COALESCE(u.suffix, ''),
        'preferred_name', COALESCE(u.preferred_name, ''),
        'email', u.email,
        'mobile_number', COALESCE(u.mobile_number, ''),
        'address_line1', COALESCE(u.address_line1, ''),
        'address_line2', COALESCE(u.address_line2, ''),
        'city', COALESCE(u.city, ''),
        'province', COALESCE(u.province, ''),
        'postal_code', COALESCE(u.postal_code, ''),
        'date_of_birth', u.date_of_birth,
        'gender', COALESCE(u.gender::TEXT, ''),
        'civil_status', COALESCE(u.civil_status::TEXT, ''),
        'nationality', COALESCE(u.nationality, ''),
        'avatar_url', u.avatar_url,
        'status', u.status,
        'department_id', u.department_id,
        'department_code', dept.code,
        'department_name', dept.name,
        'profile_completed', u.profile_completed,
        'role_labels', COALESCE((
            SELECT jsonb_agg(r.label ORDER BY r.label)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB),
        'student', (
            SELECT jsonb_build_object(
                'id', s.id,
                'student_number', s.student_number,
                'year_level', s.year_level,
                'status', s.status,
                'program_id', s.program_id,
                'program_code', p.code,
                'program_name', p.name
            )
            FROM public.students s
            LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
            WHERE s.user_id = u.id AND s.deleted_at IS NULL
            LIMIT 1
        ),
        'pending_profile_request', (
            SELECT jsonb_build_object(
                'id', req.id,
                'status', req.status,
                'requested_changes', req.requested_changes,
                'current_values', req.current_values,
                'created_at', req.created_at,
                'rejection_reason', req.rejection_reason,
                'registrar_notes', req.registrar_notes
            )
            FROM public.student_profile_change_requests req
            WHERE req.user_id = u.id AND req.status = 'Pending'
            ORDER BY req.created_at DESC
            LIMIT 1
        )
    )
    INTO v_result
    FROM public.users u
    LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_my_profile TO authenticated, service_role;

-- ============================================================================
-- 5. UPDATE fn_get_user_by_id
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_user_by_id(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'email', u.email,
        'status', u.status,
        'department_id', u.department_id,
        'department_code', dept.code,
        'department_name', dept.name,
        'profile_completed', u.profile_completed,
        'role_codes', COALESCE((
            SELECT jsonb_agg(r.code ORDER BY r.code)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.users u
    LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
    WHERE u.id = p_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_user_by_id TO authenticated, service_role;

-- ============================================================================
-- 6. UPDATE fn_list_users_json
-- ============================================================================

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

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where_clause := v_where_clause || format(' AND u.status = %L', p_status);
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

GRANT EXECUTE ON FUNCTION public.fn_list_users_json TO authenticated, service_role;

-- ============================================================================
-- 7. UPDATE fn_provision_single_user AND fn_update_user
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_provision_single_user(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.fn_provision_single_user(
    p_auth_id uuid,
    p_email text,
    p_first_name text,
    p_last_name text,
    p_role_code text,
    p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role_id UUID;
    v_seq_num BIGINT;
    v_student_number TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = p_role_code
    AND deleted_at IS NULL;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role code: ' || p_role_code);
    END IF;

    INSERT INTO public.users (id, email, first_name, last_name, status, department_id, profile_completed, created_by)
    VALUES (p_auth_id, p_email, p_first_name, p_last_name, 'Invited', p_department_id, false, coalesce(auth.uid(), p_auth_id))
    ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        deleted_at = NULL,
        status = 'Invited',
        department_id = COALESCE(EXCLUDED.department_id, users.department_id),
        profile_completed = false;

    INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
    VALUES (p_auth_id, v_role_id, coalesce(auth.uid(), p_auth_id), p_role_code)
    ON CONFLICT DO NOTHING;

    -- If student role, ensure students profile is created
    IF p_role_code = 'Student' THEN
        SELECT count(*) + 1 INTO v_seq_num FROM public.students;
        v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        END LOOP;

        INSERT INTO public.students (
            user_id,
            student_number,
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            p_auth_id,
            v_student_number,
            1,
            'Active',
            CURRENT_DATE,
            coalesce(auth.uid(), p_auth_id)
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_provision_single_user(uuid, text, text, text, text, uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.fn_update_user(uuid, text, text, text[], text);

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
    v_result JSONB;
    v_trimmed_email TEXT;
    v_is_dean BOOLEAN;
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
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'This email is already in use by another account.');
        END IF;
    END IF;

    v_is_dean := 'Dean' = ANY(COALESCE(p_role_codes, ARRAY[]::TEXT[]));

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name),
        email = COALESCE(v_trimmed_email, email),
        department_id = CASE WHEN v_is_dean THEN p_department_id ELSE COALESCE(p_department_id, department_id) END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    -- Update roles
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

-- ============================================================================
-- 8. ONBOARDING COMPLETION RPC: fn_complete_user_profile
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_complete_user_profile(
    p_first_name text,
    p_last_name text,
    p_middle_name text DEFAULT NULL::text,
    p_suffix text DEFAULT NULL::text,
    p_preferred_name text DEFAULT NULL::text,
    p_mobile_number text DEFAULT NULL::text,
    p_address_line1 text DEFAULT NULL::text,
    p_address_line2 text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_province text DEFAULT NULL::text,
    p_postal_code text DEFAULT NULL::text,
    p_date_of_birth date DEFAULT NULL::date,
    p_gender text DEFAULT NULL::text,
    p_civil_status text DEFAULT NULL::text,
    p_nationality text DEFAULT NULL::text,
    p_department_id uuid DEFAULT NULL::uuid,
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT 1::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_is_dean BOOLEAN;
    v_is_student BOOLEAN;
    v_student_id UUID;
    v_student_number TEXT;
    v_seq_num BIGINT;
    v_eff_year SMALLINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    v_is_dean := public.fn_current_user_role_codes() && ARRAY['Dean'];
    v_is_student := public.fn_current_user_role_codes() && ARRAY['Student'];

    -- For Dean: Department is mandatory
    IF v_is_dean AND p_department_id IS NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND department_id IS NOT NULL) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Department is required for Dean accounts.');
        END IF;
    END IF;

    -- Update personal profile
    UPDATE public.users
    SET first_name = btrim(p_first_name),
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, '')), ''),
        last_name = btrim(p_last_name),
        suffix = NULLIF(btrim(COALESCE(p_suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = CASE WHEN p_gender IS NOT NULL AND p_gender <> '' THEN p_gender::public.gender_type ELSE gender END,
        civil_status = CASE WHEN p_civil_status IS NOT NULL AND p_civil_status <> '' THEN p_civil_status::public.civil_status_type ELSE civil_status END,
        nationality = COALESCE(NULLIF(btrim(p_nationality), ''), nationality, 'Filipino'),
        department_id = CASE WHEN v_is_dean AND p_department_id IS NOT NULL THEN p_department_id ELSE department_id END,
        profile_completed = true,
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    -- If Student role, ensure student record setup
    IF v_is_student THEN
        SELECT id, student_number INTO v_student_id, v_student_number
        FROM public.students
        WHERE user_id = v_user_id AND deleted_at IS NULL
        LIMIT 1;

        v_eff_year := COALESCE(p_year_level, 1);
        IF v_eff_year < 1 OR v_eff_year > 6 THEN v_eff_year := 1; END IF;

        IF v_student_id IS NULL THEN
            SELECT count(*) + 1 INTO v_seq_num FROM public.students;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
                v_seq_num := v_seq_num + 1;
                v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
            END LOOP;

            INSERT INTO public.students (
                user_id,
                student_number,
                program_id,
                year_level,
                status,
                admitted_at,
                created_by
            ) VALUES (
                v_user_id,
                v_student_number,
                p_program_id,
                v_eff_year,
                'Active'::public.student_status_type,
                CURRENT_DATE,
                v_user_id
            );
        ELSE
            UPDATE public.students
            SET program_id = COALESCE(p_program_id, program_id),
                year_level = COALESCE(p_year_level, year_level),
                updated_at = now(),
                updated_by = v_user_id
            WHERE id = v_student_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'User profile information completed successfully.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_complete_user_profile TO authenticated, service_role;

-- ============================================================================
-- 9. UPDATE fn_update_my_profile (Support p_department_id)
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint);
DROP FUNCTION IF EXISTS public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint, uuid);

CREATE OR REPLACE FUNCTION public.fn_update_my_profile(
    p_first_name text,
    p_middle_name text,
    p_last_name text,
    p_suffix text,
    p_preferred_name text,
    p_mobile_number text,
    p_address_line1 text,
    p_address_line2 text,
    p_city text,
    p_province text,
    p_postal_code text,
    p_date_of_birth date,
    p_gender text,
    p_civil_status text,
    p_nationality text,
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT NULL::smallint,
    p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_student_id UUID;
    v_student_number TEXT;
    v_is_student BOOLEAN := false;
    v_is_dean BOOLEAN := false;
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_user_full_name TEXT;
    v_curr_prog_id UUID;
    v_curr_prog_code TEXT;
    v_curr_prog_name TEXT;
    v_curr_year SMALLINT;
    v_target_prog_code TEXT;
    v_target_prog_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    v_user_full_name := btrim(COALESCE(v_curr_record.first_name, '') || ' ' || COALESCE(v_curr_record.last_name, ''));

    v_is_dean := public.fn_current_user_role_codes() && ARRAY['Dean'];

    SELECT s.id, s.student_number, s.program_id, s.year_level, p.code, p.name
    INTO v_student_id, v_student_number, v_curr_prog_id, v_curr_year, v_curr_prog_code, v_curr_prog_name
    FROM public.students s
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.user_id = v_user_id AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NOT NULL OR (public.fn_current_user_role_codes() && ARRAY['Student']) THEN
        v_is_student := true;
    END IF;

    IF p_program_id IS NOT NULL THEN
        SELECT code, name INTO v_target_prog_code, v_target_prog_name
        FROM public.programs WHERE id = p_program_id AND deleted_at IS NULL;
    ELSE
        v_target_prog_code := v_curr_prog_code;
        v_target_prog_name := v_curr_prog_name;
    END IF;

    -- If student, changes must go through registrar verification
    IF v_is_student THEN
        v_curr_values := jsonb_build_object(
            'first_name', COALESCE(v_curr_record.first_name, ''),
            'middle_name', COALESCE(v_curr_record.middle_name, ''),
            'last_name', COALESCE(v_curr_record.last_name, ''),
            'suffix', COALESCE(v_curr_record.suffix, ''),
            'preferred_name', COALESCE(v_curr_record.preferred_name, ''),
            'mobile_number', COALESCE(v_curr_record.mobile_number, ''),
            'address_line1', COALESCE(v_curr_record.address_line1, ''),
            'address_line2', COALESCE(v_curr_record.address_line2, ''),
            'city', COALESCE(v_curr_record.city, ''),
            'province', COALESCE(v_curr_record.province, ''),
            'postal_code', COALESCE(v_curr_record.postal_code, ''),
            'date_of_birth', CASE WHEN v_curr_record.date_of_birth IS NOT NULL THEN v_curr_record.date_of_birth::text ELSE '' END,
            'gender', COALESCE(v_curr_record.gender::text, ''),
            'civil_status', COALESCE(v_curr_record.civil_status::text, ''),
            'nationality', COALESCE(v_curr_record.nationality, ''),
            'program_id', COALESCE(v_curr_prog_id::text, ''),
            'program_code', COALESCE(v_curr_prog_code, 'Unassigned'),
            'program_name', COALESCE(v_curr_prog_name, 'Unassigned'),
            'year_level', COALESCE(v_curr_year, 1)
        );

        v_requested_changes := jsonb_build_object(
            'first_name', btrim(p_first_name),
            'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), ''),
            'last_name', btrim(p_last_name),
            'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), ''),
            'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), ''),
            'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), ''),
            'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), ''),
            'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), ''),
            'city', COALESCE(NULLIF(btrim(p_city), ''), ''),
            'province', COALESCE(NULLIF(btrim(p_province), ''), ''),
            'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), ''),
            'date_of_birth', CASE WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text ELSE '' END,
            'gender', COALESCE(NULLIF(btrim(p_gender), ''), ''),
            'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), ''),
            'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), ''),
            'program_id', COALESCE(p_program_id::text, COALESCE(v_curr_prog_id::text, '')),
            'program_code', COALESCE(v_target_prog_code, COALESCE(v_curr_prog_code, '')),
            'program_name', COALESCE(v_target_prog_name, COALESCE(v_curr_prog_name, '')),
            'year_level', COALESCE(p_year_level, v_curr_year, 1)
        );

        SELECT id INTO v_existing_request_id
        FROM public.student_profile_change_requests
        WHERE user_id = v_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.student_profile_change_requests
            SET requested_changes = v_requested_changes,
                current_values = v_curr_values,
                student_id = COALESCE(student_id, v_student_id),
                updated_at = now()
            WHERE id = v_existing_request_id;
        ELSE
            INSERT INTO public.student_profile_change_requests (
                student_id,
                user_id,
                status,
                current_values,
                requested_changes
            ) VALUES (
                v_student_id,
                v_user_id,
                'Pending',
                v_curr_values,
                v_requested_changes
            ) RETURNING id INTO v_existing_request_id;
        END IF;

        INSERT INTO public.registrar_logs (
            action,
            student_id,
            student_user_id,
            student_name,
            student_number,
            performed_by,
            performed_by_name,
            details,
            old_values,
            new_values,
            metadata
        ) VALUES (
            'PROFILE_CHANGE_REQUESTED',
            v_student_id,
            v_user_id,
            v_user_full_name,
            COALESCE(v_student_number, 'Pending Setup'),
            v_user_id,
            v_user_full_name,
            'User submitted profile change request for Registrar verification.',
            v_curr_values,
            v_requested_changes,
            jsonb_build_object('request_id', v_existing_request_id)
        );

        RETURN jsonb_build_object(
            'success', true,
            'pending_approval', true,
            'message', 'Your profile change request has been submitted for Registrar verification and approval.'
        );
    END IF;

    -- Non-student direct update
    UPDATE public.users
    SET first_name = btrim(p_first_name),
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, '')), ''),
        last_name = btrim(p_last_name),
        suffix = NULLIF(btrim(COALESCE(p_suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = NULLIF(btrim(COALESCE(p_gender, '')), '')::public.gender_type,
        civil_status = NULLIF(btrim(COALESCE(p_civil_status, '')), '')::public.civil_status_type,
        nationality = NULLIF(btrim(COALESCE(p_nationality), ''), ''),
        department_id = CASE WHEN v_is_dean AND p_department_id IS NOT NULL THEN p_department_id ELSE department_id END,
        profile_completed = true,
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'pending_approval', false, 'message', 'Your profile has been updated.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint, uuid) TO authenticated, service_role;

-- ============================================================================
-- 10. DEAN SCOPING: fn_get_dean_dashboard
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_get_dean_dashboard(uuid);

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

    -- Schedule conflicts scoped by department if Dean
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
            SELECT COUNT(DISTINCT s.faculty_id)
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.faculty_id IS NOT NULL
              AND s.deleted_at IS NULL
              AND (v_dean_dept_id IS NULL OR c.department_id = v_dean_dept_id)
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

    -- Unassigned sections
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

    -- At-risk sections
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

    -- Program distribution
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

GRANT EXECUTE ON FUNCTION public.fn_get_dean_dashboard TO authenticated, service_role;

-- ============================================================================
-- 11. DEAN SCOPING: Programs (fn_list_programs_json, fn_get_programs)
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_list_programs_json(integer, integer, text, jsonb, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS public.fn_list_programs_json(integer, integer, text, jsonb, uuid[], uuid[], boolean);
DROP FUNCTION IF EXISTS public.fn_get_programs();

CREATE OR REPLACE FUNCTION public.fn_list_programs_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_department_ids uuid[] DEFAULT NULL::uuid[],
    p_program_level_ids uuid[] DEFAULT NULL::uuid[],
    p_is_active boolean DEFAULT NULL::boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE p.deleted_at IS NULL';
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND p.department_id = %L', v_dean_dept_id);
    ELSIF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND p.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (p.code ILIKE %L OR p.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_level_ids IS NOT NULL AND array_length(p_program_level_ids, 1) > 0 THEN
        v_where := v_where || ' AND p.program_level_id = ANY(' || quote_literal(p_program_level_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND p.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            p.id,
            p.code,
            p.name,
            p.description,
            p.department_id,
            d.name AS department_name,
            p.program_level_id,
            pl.label AS program_level_label,
            p.total_units,
            p.years_duration,
            p.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.programs p
        JOIN public.departments d ON d.id = p.department_id AND d.deleted_at IS NULL
        JOIN public.program_levels pl ON pl.id = p.program_level_id AND pl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'p.code ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_programs_json TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_programs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'code', p.code,
                'label', p.name,
                'department_id', p.department_id
            )
            ORDER BY p.name ASC
        ), '[]'::jsonb)
        FROM public.programs p
        WHERE p.deleted_at IS NULL
        AND p.is_active = TRUE
        AND (v_dean_dept_id IS NULL OR p.department_id = v_dean_dept_id)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_programs TO authenticated, anon, service_role;

-- ============================================================================
-- 12. DEAN SCOPING: Courses (fn_list_courses_json, fn_get_courses)
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_list_courses_json(integer, integer, text, jsonb, uuid[], uuid[], boolean);
DROP FUNCTION IF EXISTS public.fn_get_courses(uuid[], uuid);

CREATE OR REPLACE FUNCTION public.fn_list_courses_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_department_ids uuid[] DEFAULT NULL::uuid[],
    p_course_type_ids uuid[] DEFAULT NULL::uuid[],
    p_is_active boolean DEFAULT NULL::boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE c.deleted_at IS NULL';
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND c.department_id = %L', v_dean_dept_id);
    ELSIF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_course_type_ids IS NOT NULL AND array_length(p_course_type_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.course_type_id = ANY(' || quote_literal(p_course_type_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND c.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.code,
            c.title,
            c.description,
            c.department_id,
            d.name AS department_name,
            c.course_type_id,
            ct.label AS course_type_label,
            c.lecture_units,
            c.laboratory_units,
            c.total_units,
            c.credit_hours,
            c.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.courses c
        JOIN public.departments d ON d.id = c.department_id AND d.deleted_at IS NULL
        JOIN public.course_types ct ON ct.id = c.course_type_id AND ct.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'c.code ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_courses_json TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_courses(
    p_exclude_ids uuid[] DEFAULT NULL::uuid[],
    p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_dept_id UUID;
    v_eff_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_eff_dept_id := COALESCE(v_dean_dept_id, p_department_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'base_code', COALESCE(c.base_code, c.code),
                'label', c.code || ' — ' || c.title,
                'department_id', c.department_id,
                'course_type_id', c.course_type_id,
                'course_type_code', ct.code,
                'course_type_label', ct.label,
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'credit_hours', c.credit_hours
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
        AND (v_eff_dept_id IS NULL OR c.department_id = v_eff_dept_id)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_courses(uuid[], uuid) TO authenticated, anon, service_role;

-- ============================================================================
-- 13. DEAN SCOPING: Sections (fn_list_sections_json)
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_list_sections_json(integer, integer, text, jsonb, uuid[], uuid[], text[]);

CREATE OR REPLACE FUNCTION public.fn_list_sections_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_ids uuid[] DEFAULT NULL::uuid[],
    p_course_ids uuid[] DEFAULT NULL::uuid[],
    p_statuses text[] DEFAULT NULL::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND c.department_id = %L', v_dean_dept_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND s.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.section_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            s.id,
            s.section_code,
            s.term_id,
            tt.label || '' - '' || sy.label AS term_label,
            s.course_id,
            c.code AS course_code,
            c.title AS course_title,
            s.faculty_id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            s.room,
            s.max_slots,
            s.status,
            COALESCE(sy.is_active, false) AS is_active_academic_year,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_sections_json TO authenticated, service_role;

-- ============================================================================
-- 14. DEAN SCOPING: Faculty Loading (fn_list_faculty_load_json, fn_get_faculty_load_detail)
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_list_faculty_load_json(integer, integer, text, jsonb, uuid);
DROP FUNCTION IF EXISTS public.fn_get_faculty_load_detail(uuid, uuid);

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
    v_where_clause TEXT := 'u.deleted_at IS NULL';
    v_term_clause  TEXT := '';
    v_base_query   TEXT;
    v_dean_dept_id UUID;
    v_dept_clause  TEXT := '';
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_dept_clause := format(' AND c.department_id = %L', v_dean_dept_id);
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

    -- If Dean has department, scope faculty to those who teach sections in this dept or belong to this dept
    IF v_dean_dept_id IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND (
            u.department_id = %1$L 
            OR EXISTS (
                SELECT 1 FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id AND s.deleted_at IS NULL AND c.department_id = %1$L
            )
        )', v_dean_dept_id);
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
        WHERE (
            EXISTS (
                SELECT 1
                FROM public.user_roles ur
                INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                WHERE ur.user_id = u.id
                  AND ur.deleted_at IS NULL
                  AND ur.revoked_at IS NULL
                  AND r.code = ''Faculty''
            )
            OR EXISTS (
                SELECT 1
                FROM public.sections s
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
            )
        )
        AND %3$s',
        v_term_clause,
        v_dept_clause,
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_faculty_load_json TO authenticated, service_role;

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
    WHERE u.id = p_faculty_id AND u.deleted_at IS NULL;

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty user not found.');
    END IF;

    -- Assigned sections for this faculty in the term
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_code', s.section_code,
                'course_id', s.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'total_units', c.total_units,
                'room', s.room,
                'max_slots', s.max_slots,
                'status', s.status,
                'schedules', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', sch.id,
                            'day_of_week', sch.day_of_week,
                            'time_start', sch.time_start,
                            'time_end', sch.time_end
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
    WHERE s.faculty_id = p_faculty_id
      AND s.term_id = v_term_id
      AND s.deleted_at IS NULL;

    -- Available unassigned sections (scoped to Dean's department if Dean)
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', s.id,
                'section_code', s.section_code,
                'course_id', s.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'total_units', c.total_units,
                'room', s.room,
                'max_slots', s.max_slots,
                'status', s.status,
                'schedules', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', sch.id,
                            'day_of_week', sch.day_of_week,
                            'time_start', sch.time_start,
                            'time_end', sch.time_end
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

    -- Schedule conflicts for this faculty
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_a_id', s.id,
                'section_a_code', s.section_code,
                'course_a_code', ca.code,
                'section_b_id', sb.id,
                'section_b_code', sb.section_code,
                'course_b_code', cb.code,
                'day_of_week', a.day_of_week,
                'time_start', a.time_start,
                'time_end', a.time_end
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
      AND b.time_start < a.time_end;

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'assigned_sections', v_assigned,
        'available_sections', v_available,
        'conflicts', v_conflicts
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_faculty_load_detail TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
