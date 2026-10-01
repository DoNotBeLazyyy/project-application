-- Migration: 20261001030000_student_profile_verification_and_registrar_logs.sql
-- Description: Student profile verification workflow, registrar approval & editing, registrar audit logs, and student alerts

-- 1. Create table for student profile change requests
CREATE TABLE IF NOT EXISTS public.student_profile_change_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Approved with Edits', 'Rejected', 'Cancelled')),
    current_values jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
    approved_changes jsonb,
    reviewed_by uuid REFERENCES public.users(id),
    reviewed_at timestamptz,
    rejection_reason text,
    registrar_notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_status ON public.student_profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_user ON public.student_profile_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_student ON public.student_profile_change_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profile_change_requests_created_at ON public.student_profile_change_requests(created_at DESC);

-- 2. Create table for registrar logs
CREATE TABLE IF NOT EXISTS public.registrar_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    student_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    student_name text,
    student_number text,
    performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    performed_by_name text,
    details text,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registrar_logs_created_at ON public.registrar_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrar_logs_action ON public.registrar_logs(action);
CREATE INDEX IF NOT EXISTS idx_registrar_logs_student ON public.registrar_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_registrar_logs_user ON public.registrar_logs(student_user_id);

-- Enable RLS and setup policies
ALTER TABLE public.student_profile_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrar_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "student_profile_requests_all" ON public.student_profile_change_requests;
    CREATE POLICY "student_profile_requests_all" ON public.student_profile_change_requests
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "registrar_logs_all" ON public.registrar_logs;
    CREATE POLICY "registrar_logs_all" ON public.registrar_logs
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.student_profile_change_requests TO authenticated, service_role;
GRANT ALL ON public.registrar_logs TO authenticated, service_role;

-- 3. Update fn_update_my_profile: students route to approval queue; others update immediately
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
    p_nationality text
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
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_user_full_name TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    -- Fetch current user record
    SELECT * INTO v_curr_record
    FROM public.users
    WHERE id = v_user_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    v_user_full_name := btrim(COALESCE(v_curr_record.first_name, '') || ' ' || COALESCE(v_curr_record.last_name, ''));

    -- Check if user is a student
    SELECT s.id, s.student_number INTO v_student_id, v_student_number
    FROM public.students s
    WHERE s.user_id = v_user_id AND s.deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NOT NULL THEN
        v_is_student := true;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = v_user_id
              AND r.code = 'Student'
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) THEN
            v_is_student := true;
        END IF;
    END IF;

    -- Assemble current values JSON
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
        'nationality', COALESCE(v_curr_record.nationality, '')
    );

    -- Assemble requested changes JSON
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
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), '')
    );

    -- If student: create or update pending change request
    IF v_is_student THEN
        -- Check if there's already a pending request
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

        -- Record into registrar_logs
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
            'Student submitted profile change request for Registrar verification.',
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

    -- For non-students (Admin, Dean, Faculty, Registrar): apply updates immediately
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
        nationality = NULLIF(btrim(COALESCE(p_nationality, '')), ''),
        updated_at = now()
    WHERE id = v_user_id
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'pending_approval', false, 'message', 'Your profile has been updated.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile TO authenticated, service_role;

-- 4. Update fn_get_my_profile to return pending_profile_request
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

-- 5. RPC: List student profile change requests for registrar
CREATE OR REPLACE FUNCTION public.fn_list_student_profile_requests(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_status text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_status IS NOT NULL AND p_status <> 'All' AND p_status <> '' THEN
        v_where_clause := v_where_clause || format(' AND req.status = %L', p_status);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                u.first_name ILIKE %L
                OR u.last_name ILIKE %L
                OR u.email ILIKE %L
                OR COALESCE(s.student_number, '''') ILIKE %L
                OR COALESCE(p.code, '''') ILIKE %L
                OR COALESCE(p.name, '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            req.id,
            req.student_id,
            req.user_id,
            req.status,
            req.current_values,
            req.requested_changes,
            req.approved_changes,
            req.reviewed_by,
            req.reviewed_at,
            req.rejection_reason,
            req.registrar_notes,
            req.created_at,
            req.updated_at,
            btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')) AS student_name,
            u.email AS student_email,
            COALESCE(s.student_number, ''N/A'') AS student_number,
            COALESCE(s.year_level, 1) AS year_level,
            COALESCE(p.code, ''N/A'') AS program_code,
            COALESCE(p.name, ''Unassigned'') AS program_name,
            COALESCE(btrim(ru.first_name || '' '' || ru.last_name), ''—'') AS reviewer_name,
            COUNT(*) OVER () AS total_count
        FROM public.student_profile_change_requests req
        INNER JOIN public.users u ON u.id = req.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.students s ON s.id = req.student_id AND s.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
        LEFT JOIN public.users ru ON ru.id = req.reviewed_by AND ru.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'req.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_student_profile_requests TO authenticated, service_role;

-- 6. RPC: Get single request details by ID
CREATE OR REPLACE FUNCTION public.fn_get_student_profile_request_by_id(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT jsonb_build_object(
        'id', req.id,
        'student_id', req.student_id,
        'user_id', req.user_id,
        'status', req.status,
        'current_values', req.current_values,
        'requested_changes', req.requested_changes,
        'approved_changes', req.approved_changes,
        'reviewed_by', req.reviewed_by,
        'reviewed_at', req.reviewed_at,
        'rejection_reason', req.rejection_reason,
        'registrar_notes', req.registrar_notes,
        'created_at', req.created_at,
        'updated_at', req.updated_at,
        'student_name', btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
        'student_email', u.email,
        'student_number', COALESCE(s.student_number, 'N/A'),
        'year_level', COALESCE(s.year_level, 1),
        'program_id', s.program_id,
        'program_code', COALESCE(p.code, 'N/A'),
        'program_name', COALESCE(p.name, 'Unassigned'),
        'reviewer_name', COALESCE(btrim(ru.first_name || ' ' || ru.last_name), '—')
    )
    INTO v_result
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.students s ON s.id = req.student_id AND s.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    LEFT JOIN public.users ru ON ru.id = req.reviewed_by AND ru.deleted_at IS NULL
    WHERE req.id = p_request_id;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_student_profile_request_by_id TO authenticated, service_role;

-- 7. RPC: Approve student profile change request (with optional registrar edits)
CREATE OR REPLACE FUNCTION public.fn_approve_student_profile_request(
    p_request_id uuid,
    p_edited_changes jsonb DEFAULT NULL::jsonb,
    p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_action TEXT;
    v_status TEXT;
    v_notif_msg TEXT;
    v_date_of_birth DATE;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           s.student_number
    INTO v_req
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.students s ON s.id = req.student_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    -- Determine effective changes: either registrar edited or original requested
    IF p_edited_changes IS NOT NULL AND p_edited_changes <> '{}'::jsonb AND p_edited_changes <> v_req.requested_changes THEN
        v_effective_changes := p_edited_changes;
        v_is_edited := true;
        v_action := 'PROFILE_CHANGE_EDITED_APPROVED';
        v_status := 'Approved with Edits';
        v_notif_msg := 'Your profile changes have been reviewed, adjusted by the Registrar, and approved.';
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_action := 'PROFILE_CHANGE_APPROVED';
        v_status := 'Approved';
        v_notif_msg := 'Your student profile update has been verified and approved by the Registrar.';
    END IF;

    -- Parse date of birth if present
    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND (v_effective_changes->>'date_of_birth') <> '' THEN
        v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Apply approved changes to public.users
    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(v_effective_changes->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(v_effective_changes->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(v_effective_changes->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(v_effective_changes->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(v_effective_changes->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(v_effective_changes->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(v_effective_changes->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(v_effective_changes->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(v_effective_changes->>'postal_code', '')), ''),
        date_of_birth = v_date_of_birth,
        gender = CASE WHEN (v_effective_changes->>'gender') IS NOT NULL AND (v_effective_changes->>'gender') <> '' 
                      THEN (v_effective_changes->>'gender')::public.gender_type 
                      ELSE gender END,
        civil_status = CASE WHEN (v_effective_changes->>'civil_status') IS NOT NULL AND (v_effective_changes->>'civil_status') <> '' 
                            THEN (v_effective_changes->>'civil_status')::public.civil_status_type 
                            ELSE civil_status END,
        nationality = NULLIF(btrim(COALESCE(v_effective_changes->>'nationality', '')), ''),
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Update request record
    UPDATE public.student_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        registrar_notes = p_notes,
        reviewed_by = v_registrar_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Insert into registrar_logs
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
        v_action,
        v_req.student_id,
        v_req.user_id,
        v_req.student_name,
        v_req.student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        CASE WHEN v_is_edited 
             THEN 'Registrar corrected and approved student profile change request.' || COALESCE(' Note: ' || p_notes, '')
             ELSE 'Registrar verified and approved student profile change request.' || COALESCE(' Note: ' || p_notes, '')
        END,
        v_req.current_values,
        v_effective_changes,
        jsonb_build_object(
            'request_id', p_request_id,
            'is_edited', v_is_edited,
            'registrar_notes', p_notes
        )
    );

    -- Emit notification to the student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_req.user_id,
        'Profile Verification Approved',
        v_notif_msg || COALESCE(' Note from Registrar: ' || p_notes, ''),
        'Account',
        '/student/profile'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student profile change request approved successfully.',
        'status', v_status
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_approve_student_profile_request TO authenticated, service_role;

-- 8. RPC: Reject student profile change request
CREATE OR REPLACE FUNCTION public.fn_reject_student_profile_request(
    p_request_id uuid,
    p_reason text,
    p_is_false_info boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_action TEXT;
    v_notif_title TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF btrim(COALESCE(p_reason, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A rejection reason is required.');
    END IF;

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS student_name,
           s.student_number
    INTO v_req
    FROM public.student_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.students s ON s.id = req.student_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    v_action := CASE WHEN p_is_false_info THEN 'PROFILE_REJECTED_FALSE_INFO' ELSE 'PROFILE_CHANGE_REJECTED' END;
    v_notif_title := CASE WHEN p_is_false_info THEN 'Profile Verification: False Information Detected' ELSE 'Profile Change Request Rejected' END;

    UPDATE public.student_profile_change_requests
    SET status = 'Rejected',
        rejection_reason = p_reason,
        reviewed_by = v_registrar_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Record in registrar_logs
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
        v_action,
        v_req.student_id,
        v_req.user_id,
        v_req.student_name,
        v_req.student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar rejected student profile change request. Reason: ' || p_reason,
        v_req.current_values,
        v_req.requested_changes,
        jsonb_build_object(
            'request_id', p_request_id,
            'is_false_info', p_is_false_info,
            'reason', p_reason
        )
    );

    -- Emit notification to student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_req.user_id,
        v_notif_title,
        'Your profile change request was rejected by the Registrar. Reason: ' || p_reason,
        'Account',
        '/student/profile'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Profile change request rejected and student notified.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_reject_student_profile_request TO authenticated, service_role;

-- 9. RPC: Send direct student notification (e.g. warning on false information)
CREATE OR REPLACE FUNCTION public.fn_send_student_profile_notification(
    p_student_id uuid,
    p_title text,
    p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_student_number TEXT;
    v_student_name TEXT;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF btrim(COALESCE(p_title, '')) = '' OR btrim(COALESCE(p_message, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Title and message are required.');
    END IF;

    SELECT s.user_id, s.student_number, btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    -- Send notification
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_user_id,
        btrim(p_title),
        btrim(p_message),
        'Account',
        '/student/profile'
    );

    -- Log in registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        metadata
    ) VALUES (
        'FALSE_INFO_NOTIFICATION_SENT',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar sent alert to student: ' || p_title || ' - ' || p_message,
        jsonb_build_object('title', p_title, 'message', p_message)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Notification sent to student and recorded in Registrar Log.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_send_student_profile_notification TO authenticated, service_role;

-- 10. RPC: List registrar logs with filters and pagination
CREATE OR REPLACE FUNCTION public.fn_list_registrar_logs(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_action text DEFAULT NULL::text,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date,
    p_sort jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND rl.action = %L', p_action);
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at >= %L::date', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND rl.created_at < (%L::date + 1)', p_date_to);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (
                COALESCE(rl.student_name, '''') ILIKE %L
                OR COALESCE(rl.student_number, '''') ILIKE %L
                OR COALESCE(rl.performed_by_name, '''') ILIKE %L
                OR COALESCE(rl.details, '''') ILIKE %L
                OR COALESCE(rl.action, '''') ILIKE %L
            )',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            rl.id,
            rl.action,
            rl.student_id,
            rl.student_user_id,
            COALESCE(rl.student_name, ''—'') AS student_name,
            COALESCE(rl.student_number, ''—'') AS student_number,
            rl.performed_by,
            COALESCE(rl.performed_by_name, ''System'') AS performed_by_name,
            rl.details,
            rl.old_values,
            rl.new_values,
            rl.metadata,
            rl.created_at,
            COUNT(*) OVER () AS total_count
        FROM public.registrar_logs rl
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'rl.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_registrar_logs TO authenticated, service_role;

-- 11. RPC: Registrar directly edit student profile (with audit logging and notification)
CREATE OR REPLACE FUNCTION public.fn_registrar_update_student_profile(
    p_student_id uuid,
    p_profile_values jsonb,
    p_reason text DEFAULT NULL::text,
    p_notify_student boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_student_number TEXT;
    v_student_name TEXT;
    v_registrar_id UUID := auth.uid();
    v_registrar_name TEXT;
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_date_of_birth DATE;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.user_id, s.student_number, btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id;

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
        'nationality', COALESCE(v_curr_record.nationality, '')
    );

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    IF (p_profile_values->>'date_of_birth') IS NOT NULL AND (p_profile_values->>'date_of_birth') <> '' THEN
        v_date_of_birth := (p_profile_values->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(p_profile_values->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(p_profile_values->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(p_profile_values->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(p_profile_values->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_profile_values->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_profile_values->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_profile_values->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_profile_values->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(p_profile_values->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(p_profile_values->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_profile_values->>'postal_code', '')), ''),
        date_of_birth = v_date_of_birth,
        gender = CASE WHEN (p_profile_values->>'gender') IS NOT NULL AND (p_profile_values->>'gender') <> '' 
                      THEN (p_profile_values->>'gender')::public.gender_type 
                      ELSE gender END,
        civil_status = CASE WHEN (p_profile_values->>'civil_status') IS NOT NULL AND (p_profile_values->>'civil_status') <> '' 
                            THEN (p_profile_values->>'civil_status')::public.civil_status_type 
                            ELSE civil_status END,
        nationality = NULLIF(btrim(COALESCE(p_profile_values->>'nationality', '')), ''),
        updated_at = now()
    WHERE id = v_user_id;

    -- Log to registrar_logs
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
        'PROFILE_MANUALLY_EDITED',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        'Registrar edited student profile.' || COALESCE(' Reason: ' || p_reason, ''),
        v_curr_values,
        p_profile_values,
        jsonb_build_object('reason', p_reason)
    );

    IF p_notify_student THEN
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            action_url
        ) VALUES (
            v_user_id,
            'Profile Updated by Registrar',
            'Your student profile has been updated by the Registrar office.' || COALESCE(' Reason: ' || p_reason, ''),
            'Account',
            '/student/profile'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile updated successfully by Registrar.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_update_student_profile TO authenticated, service_role;

-- 12. RPC: Cancel my pending profile request
CREATE OR REPLACE FUNCTION public.fn_cancel_my_profile_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_req RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    SELECT * INTO v_req
    FROM public.student_profile_change_requests
    WHERE id = p_request_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only pending requests can be cancelled.');
    END IF;

    UPDATE public.student_profile_change_requests
    SET status = 'Cancelled',
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_my_profile_request TO authenticated, service_role;
