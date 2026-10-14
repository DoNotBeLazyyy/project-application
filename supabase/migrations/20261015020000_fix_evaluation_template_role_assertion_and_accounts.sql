-- Migration: 20261015020000_fix_evaluation_template_role_assertion_and_accounts.sql
-- Description: Fix evaluation template role assertion to allow Admin and Dean, include missing target_mode and suggestion_placeholder in template lookup, and restore admin user profile & role mapping.

-- 1. Update fn_get_evaluation_template_by_id
CREATE OR REPLACE FUNCTION public.fn_get_evaluation_template_by_id(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    -- Allow both Admin and Dean to inspect evaluation templates
    PERFORM public.fn_assert_role('Admin', 'Dean');

    SELECT jsonb_build_object(
        'id',                     t.id,
        'title',                  t.title,
        'description',            t.description,
        'is_active',              t.is_active,
        'sequence',               t.sequence,
        'target_mode',            COALESCE(t.target_mode, 'INCLUDE'),
        'suggestion_placeholder', t.suggestion_placeholder,
        'program_ids', COALESCE((
            SELECT jsonb_agg(tp.program_id)
            FROM public.evaluation_template_programs tp
            WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
        ), '[]'::JSONB),
        'questions', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id',            q.id,
                    'question_text', q.question_text,
                    'question_type', q.question_type,
                    'sequence',      q.sequence,
                    'is_required',   q.is_required,
                    'min_rating',    q.min_rating,
                    'max_rating',    q.max_rating
                )
                ORDER BY q.sequence ASC
            )
            FROM public.evaluation_questions q
            WHERE q.template_id = t.id AND q.deleted_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.evaluation_templates t
    WHERE t.id = p_id AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation section not found.');
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_evaluation_template_by_id(uuid) TO authenticated, service_role;

-- 2. Update fn_list_evaluation_templates_json
CREATE OR REPLACE FUNCTION public.fn_list_evaluation_templates_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 10,
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
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (t.title ILIKE %L OR t.description ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.title,
            t.description,
            t.is_active,
            t.sequence,
            COALESCE((
                SELECT jsonb_agg(tp.program_id)
                FROM public.evaluation_template_programs tp
                WHERE tp.template_id = t.id AND tp.deleted_at IS NULL
            ), ''[]''::JSONB) AS program_ids,
            (
                SELECT count(*)
                FROM public.evaluation_questions q
                WHERE q.template_id = t.id AND q.deleted_at IS NULL
            ) AS question_count,
            COUNT(*) OVER() AS total_count
        FROM public.evaluation_templates t
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.sequence ASC, t.created_at ASC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_evaluation_templates_json(integer, integer, text, jsonb) TO authenticated, service_role;

-- 3. Restore Julius Tolentino profile in public.users and assign Admin & Faculty roles
DO $$
DECLARE
    v_user_id UUID;
    v_admin_role_id UUID;
    v_faculty_role_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'juliustolentino.diamond@gmail.com';
    SELECT id INTO v_admin_role_id FROM public.roles WHERE lower(code) = 'admin' AND deleted_at IS NULL;
    SELECT id INTO v_faculty_role_id FROM public.roles WHERE lower(code) = 'faculty' AND deleted_at IS NULL;

    IF v_user_id IS NOT NULL THEN
        -- Upsert public.users
        INSERT INTO public.users (
            id, email, first_name, last_name, status, profile_completed, created_at, updated_at
        ) VALUES (
            v_user_id,
            'juliustolentino.diamond@gmail.com',
            'Julius',
            'Tolentino',
            'Active',
            true,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            status = 'Active',
            profile_completed = true,
            deleted_at = NULL,
            updated_at = now();

        -- Assign Admin role
        IF v_admin_role_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = v_user_id AND role_id = v_admin_role_id AND deleted_at IS NULL AND revoked_at IS NULL
        ) THEN
            INSERT INTO public.user_roles (user_id, role_id) VALUES (v_user_id, v_admin_role_id);
        END IF;

        -- Assign Faculty role
        IF v_faculty_role_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = v_user_id AND role_id = v_faculty_role_id AND deleted_at IS NULL AND revoked_at IS NULL
        ) THEN
            INSERT INTO public.user_roles (user_id, role_id) VALUES (v_user_id, v_faculty_role_id);
        END IF;
    END IF;
END $$;

-- 4. Restore Hanma Baki profile in public.users, student role, and students table
DO $$
DECLARE
    v_user_id UUID;
    v_student_role_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'hbaki386@gmail.com';
    SELECT id INTO v_student_role_id FROM public.roles WHERE lower(code) = 'student' AND deleted_at IS NULL;

    IF v_user_id IS NOT NULL THEN
        -- Upsert public.users
        INSERT INTO public.users (
            id, email, first_name, last_name, status, profile_completed, created_at, updated_at
        ) VALUES (
            v_user_id,
            'hbaki386@gmail.com',
            'Baki',
            'Hanma',
            'Active',
            true,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            status = 'Active',
            profile_completed = true,
            deleted_at = NULL,
            updated_at = now();

        -- Assign Student role
        IF v_student_role_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = v_user_id AND role_id = v_student_role_id AND deleted_at IS NULL AND revoked_at IS NULL
        ) THEN
            INSERT INTO public.user_roles (user_id, role_id) VALUES (v_user_id, v_student_role_id);
        END IF;

        -- Ensure student row
        IF NOT EXISTS (SELECT 1 FROM public.students WHERE user_id = v_user_id) THEN
            INSERT INTO public.students (id, user_id, student_number, year_level, status, admitted_at)
            VALUES (gen_random_uuid(), v_user_id, '2026-00002', 1, 'Active', now());
        ELSE
            UPDATE public.students
            SET status = 'Active', deleted_at = NULL
            WHERE user_id = v_user_id;
        END IF;
    END IF;
END $$;
