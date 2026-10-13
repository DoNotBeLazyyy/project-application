-- Migration: 20261013020000_hierarchical_assignments_and_profile_approvals.sql
-- Description:
--   1. Hierarchy & Supervision:
--      - Students cannot assign themselves a program or year level. Registrar assigns both.
--      - Dean cannot assign themselves a department. Admin assigns department.
--   2. Student Year Level & Curriculum Progression:
--      - Add year_level_overridden column to public.students table.
--      - fn_calculate_student_curriculum_year_level calculates eligible year level based on completed required courses.
--      - fn_sync_student_year_level auto-advances year level when student finishes all required curriculum subjects.
--      - Registrar can manually assign/override student's year level whenever needed.
--      - Grade release hooks call fn_sync_student_year_level.
--   3. Profile Verification & Approval:
--      - Create public.staff_profile_change_requests for Dean, Faculty, and Registrar profile updates.
--      - Admin oversees verification and approval for Dean, Faculty, and Registrar profile changes.
--      - Registrar oversees verification and approval for Student profile changes.
--      - Avatar (profile picture) is updated directly without approval for all users.

-- ============================================================================
-- 1. SCHEMA CHANGES
-- ============================================================================

-- Add year_level_overridden to students
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS year_level_overridden boolean NOT NULL DEFAULT false;

-- Create staff_profile_change_requests table
CREATE TABLE IF NOT EXISTS public.staff_profile_change_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_code text NOT NULL,
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Approved with Edits', 'Rejected', 'Cancelled')),
    current_values jsonb NOT NULL DEFAULT '{}'::jsonb,
    requested_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
    approved_changes jsonb,
    reviewed_by uuid REFERENCES public.users(id),
    reviewed_at timestamptz,
    rejection_reason text,
    admin_notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_profile_change_requests_status ON public.staff_profile_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_staff_profile_change_requests_user ON public.staff_profile_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profile_change_requests_role ON public.staff_profile_change_requests(role_code);
CREATE INDEX IF NOT EXISTS idx_staff_profile_change_requests_created_at ON public.staff_profile_change_requests(created_at DESC);

ALTER TABLE public.staff_profile_change_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "staff_profile_requests_all" ON public.staff_profile_change_requests;
    CREATE POLICY "staff_profile_requests_all" ON public.staff_profile_change_requests
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.staff_profile_change_requests TO authenticated, service_role;

-- Enable Supabase Realtime publication on staff_profile_change_requests
ALTER TABLE public.staff_profile_change_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'staff_profile_change_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_profile_change_requests;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================================
-- 2. CURRICULUM-BASED YEAR LEVEL CALCULATION & PROGRESSION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_calculate_student_curriculum_year_level(p_student_id uuid)
RETURNS smallint
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
    v_target_year SMALLINT := 1;
    v_max_year SMALLINT := 1;
    v_y SMALLINT;
    v_all_passed BOOLEAN;
    v_has_courses BOOLEAN;
BEGIN
    SELECT program_id INTO v_program_id
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN 1;
    END IF;

    -- Find maximum year level in this curriculum
    SELECT COALESCE(MAX(year_level), 1) INTO v_max_year
    FROM public.curriculum_maps
    WHERE program_id = v_program_id AND deleted_at IS NULL;

    IF v_max_year < 1 THEN
        v_max_year := 1;
    END IF;

    -- To reach year level Y+1, ALL required non-elective courses for year level Y must be completed (passed & released)
    FOR v_y IN 1..LEAST(v_max_year, 5::smallint) LOOP
        -- Check if there are required curriculum courses for year level v_y
        SELECT EXISTS (
            SELECT 1
            FROM public.curriculum_maps cm
            INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
            WHERE cm.program_id = v_program_id
              AND cm.year_level = v_y
              AND cm.deleted_at IS NULL
              AND COALESCE(cm.is_elective, false) = false
        ) INTO v_has_courses;

        IF NOT v_has_courses THEN
            -- No required courses configured for this year level, stop auto-advancing past it
            EXIT;
        END IF;

        -- Check if student has passed all required courses for year level v_y
        SELECT NOT EXISTS (
            SELECT 1
            FROM public.curriculum_maps cm
            INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
            WHERE cm.program_id = v_program_id
              AND cm.year_level = v_y
              AND cm.deleted_at IS NULL
              AND COALESCE(cm.is_elective, false) = false
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.fn_student_course_grades(p_student_id) scg
                  WHERE scg.course_id = cm.course_id
                    AND scg.is_passing IS TRUE
              )
        ) INTO v_all_passed;

        IF v_all_passed THEN
            v_target_year := v_y + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;

    RETURN LEAST(v_target_year, 6::smallint);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_calculate_student_curriculum_year_level(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_sync_student_year_level(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_curr_year SMALLINT;
    v_calculated_year SMALLINT;
    v_is_overridden BOOLEAN;
    v_user_id UUID;
    v_student_num TEXT;
    v_student_name TEXT;
BEGIN
    SELECT s.year_level, COALESCE(s.year_level_overridden, false), s.user_id, s.student_number,
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_curr_year, v_is_overridden, v_user_id, v_student_num, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    v_calculated_year := public.fn_calculate_student_curriculum_year_level(p_student_id);

    -- If overridden by registrar, only auto-advance if the student has naturally surpassed the overridden year
    IF v_is_overridden AND v_calculated_year <= v_curr_year THEN
        RETURN jsonb_build_object(
            'success', true,
            'updated', false,
            'year_level', v_curr_year,
            'calculated_year_level', v_calculated_year,
            'overridden', true
        );
    END IF;

    -- If calculated year level is higher than current year level, advance automatically!
    IF v_calculated_year > v_curr_year THEN
        UPDATE public.students
        SET year_level = v_calculated_year,
            year_level_overridden = false,
            updated_at = now()
        WHERE id = p_student_id;

        -- Record lifecycle event
        INSERT INTO public.student_lifecycle_events (
            student_id,
            event_type,
            from_year_level,
            to_year_level,
            reason,
            effective_date,
            created_by
        ) VALUES (
            p_student_id,
            'Year Level Progression',
            v_curr_year,
            v_calculated_year,
            format('Automatically advanced to Year %s based on curriculum completion', v_calculated_year),
            CURRENT_DATE,
            coalesce(auth.uid(), v_user_id)
        );

        -- Send notification to student
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            created_by
        ) VALUES (
            v_user_id,
            'Year Level Advanced',
            format('Congratulations! You have completed all required courses for Year %s and have advanced to Year %s.', v_curr_year, v_calculated_year),
            'Academic',
            coalesce(auth.uid(), v_user_id)
        );

        -- Log to registrar logs
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
            new_values
        ) VALUES (
            'YEAR_LEVEL_AUTO_ADVANCED',
            p_student_id,
            v_user_id,
            v_student_name,
            v_student_num,
            auth.uid(),
            'System Curriculum Sync',
            format('Student automatically advanced from Year %s to Year %s based on curriculum progression.', v_curr_year, v_calculated_year),
            jsonb_build_object('year_level', v_curr_year),
            jsonb_build_object('year_level', v_calculated_year)
        );

        RETURN jsonb_build_object(
            'success', true,
            'updated', true,
            'year_level', v_calculated_year,
            'previous_year_level', v_curr_year,
            'calculated_year_level', v_calculated_year
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'updated', false,
        'year_level', v_curr_year,
        'calculated_year_level', v_calculated_year,
        'overridden', v_is_overridden
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_sync_student_year_level(uuid) TO authenticated, service_role;

-- ============================================================================
-- 3. REGISTRAR ASSIGNMENT OF STUDENT PROGRAM & YEAR LEVEL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_registrar_assign_student_program_and_year(
    p_student_id uuid,
    p_program_id uuid,
    p_year_level smallint DEFAULT NULL::smallint,
    p_is_override boolean DEFAULT false,
    p_reason text DEFAULT NULL::text
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
    v_curr_program_id UUID;
    v_curr_year SMALLINT;
    v_curr_overridden BOOLEAN;
    v_target_year SMALLINT;
    v_program_name TEXT;
    v_program_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.user_id, s.student_number, s.program_id, s.year_level, COALESCE(s.year_level_overridden, false),
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_number, v_curr_program_id, v_curr_year, v_curr_overridden, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT code, name INTO v_program_code, v_program_name
    FROM public.programs
    WHERE id = p_program_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found or inactive.');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_registrar_name
    FROM public.users WHERE id = v_registrar_id;

    IF p_year_level IS NOT NULL AND p_year_level >= 1 AND p_year_level <= 6 THEN
        v_target_year := p_year_level;
    ELSE
        -- Default to curriculum calculation or existing year
        v_target_year := COALESCE(v_curr_year, 1);
    END IF;

    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year,
        year_level_overridden = p_is_override,
        updated_at = now(),
        updated_by = v_registrar_id
    WHERE id = p_student_id;

    -- Lifecycle event
    IF v_curr_program_id IS DISTINCT FROM p_program_id THEN
        INSERT INTO public.student_lifecycle_events (
            student_id,
            event_type,
            from_program_id,
            to_program_id,
            from_year_level,
            to_year_level,
            reason,
            effective_date,
            created_by
        ) VALUES (
            p_student_id,
            'Program Shift',
            v_curr_program_id,
            p_program_id,
            v_curr_year,
            v_target_year,
            COALESCE(p_reason, 'Assigned by Registrar'),
            CURRENT_DATE,
            v_registrar_id
        );
    ELSIF v_curr_year IS DISTINCT FROM v_target_year THEN
        INSERT INTO public.student_lifecycle_events (
            student_id,
            event_type,
            from_program_id,
            to_program_id,
            from_year_level,
            to_year_level,
            reason,
            effective_date,
            created_by
        ) VALUES (
            p_student_id,
            'Year Level Progression',
            p_program_id,
            p_program_id,
            v_curr_year,
            v_target_year,
            COALESCE(p_reason, CASE WHEN p_is_override THEN 'Manual year level override by Registrar' ELSE 'Updated by Registrar' END),
            CURRENT_DATE,
            v_registrar_id
        );
    END IF;

    -- Registrar log
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
        new_values
    ) VALUES (
        'STUDENT_ACADEMIC_ASSIGNMENT',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_number,
        v_registrar_id,
        COALESCE(v_registrar_name, 'Registrar'),
        format('Registrar assigned program %s and Year %s%s.', v_program_code, v_target_year, CASE WHEN p_is_override THEN ' (Manual Override)' ELSE '' END) || COALESCE(' Reason: ' || p_reason, ''),
        jsonb_build_object('program_id', v_curr_program_id, 'year_level', v_curr_year, 'overridden', v_curr_overridden),
        jsonb_build_object('program_id', p_program_id, 'program_code', v_program_code, 'year_level', v_target_year, 'overridden', p_is_override)
    );

    -- Notification to student
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        created_by
    ) VALUES (
        v_user_id,
        'Program & Year Level Assigned',
        format('Your academic program has been set to %s (%s), Year Level %s by the Registrar.', v_program_name, v_program_code, v_target_year),
        'Academic',
        v_registrar_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully assigned %s (Year %s) to student.', v_program_code, v_target_year),
        'year_level', v_target_year,
        'program_id', p_program_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_registrar_assign_student_program_and_year(uuid, uuid, smallint, boolean, text) TO authenticated, service_role;

-- Update fn_shift_student_program to restrict self-assignment by student
CREATE OR REPLACE FUNCTION public.fn_shift_student_program(
    p_student_id uuid DEFAULT NULL::uuid,
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT NULL::smallint,
    p_reason text DEFAULT NULL::text,
    p_effective_date date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Supervised action: ONLY Registrar or Admin can assign or shift student program/year
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student ID is required.');
    END IF;

    IF p_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program ID is required.');
    END IF;

    RETURN public.fn_registrar_assign_student_program_and_year(
        p_student_id,
        p_program_id,
        p_year_level,
        true,
        p_reason
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_shift_student_program(uuid, uuid, smallint, text, date) TO authenticated, service_role;

-- ============================================================================
-- 4. ONBOARDING & PROFILE COMPLETION: RESTRICT STUDENT & DEAN SELF-ASSIGNMENT
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
    v_is_student BOOLEAN;
    v_student_id UUID;
    v_student_number TEXT;
    v_seq_num BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    v_is_student := public.fn_current_user_role_codes() && ARRAY['Student'];

    -- Personal profile: Update personal attributes.
    -- Note: Dean cannot assign themselves a department. Admin assigns department.
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
        profile_completed = true,
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    -- If Student role, ensure student record setup with student number.
    -- Note: Program and Year Level are assigned by Registrar, not self-assigned by student!
    IF v_is_student THEN
        SELECT id, student_number INTO v_student_id, v_student_number
        FROM public.students
        WHERE user_id = v_user_id AND deleted_at IS NULL
        LIMIT 1;

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
                NULL,
                1,
                'Active'::public.student_status_type,
                CURRENT_DATE,
                v_user_id
            );
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
-- 5. PROFILE UPDATE & APPROVAL WORKFLOW
--    - Dean, Faculty, Registrar -> staff_profile_change_requests (Admin approves)
--    - Student -> student_profile_change_requests (Registrar approves, except avatar)
--    - Admin -> Direct update
-- ============================================================================

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
    v_curr_record RECORD;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_user_full_name TEXT;
    v_role_codes TEXT[];
    v_is_admin BOOLEAN := false;
    v_is_student BOOLEAN := false;
    v_is_dean BOOLEAN := false;
    v_is_faculty BOOLEAN := false;
    v_is_registrar BOOLEAN := false;
    v_student_id UUID;
    v_student_number TEXT;
    v_staff_role TEXT;
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
    v_role_codes := public.fn_current_user_role_codes();

    v_is_admin := 'Admin' = ANY (v_role_codes);
    v_is_student := 'Student' = ANY (v_role_codes);
    v_is_dean := 'Dean' = ANY (v_role_codes);
    v_is_faculty := 'Faculty' = ANY (v_role_codes);
    v_is_registrar := 'Registrar' = ANY (v_role_codes);

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

    -- 1. STUDENT WORKFLOW -> REGISTRAR VERIFICATION & APPROVAL
    IF v_is_student AND NOT v_is_admin THEN
        SELECT id, student_number INTO v_student_id, v_student_number
        FROM public.students
        WHERE user_id = v_user_id AND deleted_at IS NULL
        LIMIT 1;

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

    -- 2. STAFF WORKFLOW (DEAN, FACULTY, REGISTRAR) -> ADMIN VERIFICATION & APPROVAL
    IF (v_is_dean OR v_is_faculty OR v_is_registrar) AND NOT v_is_admin THEN
        v_staff_role := CASE
            WHEN v_is_dean THEN 'Dean'
            WHEN v_is_faculty THEN 'Faculty'
            ELSE 'Registrar'
        END;

        SELECT id INTO v_existing_request_id
        FROM public.staff_profile_change_requests
        WHERE user_id = v_user_id AND status = 'Pending'
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_request_id IS NOT NULL THEN
            UPDATE public.staff_profile_change_requests
            SET requested_changes = v_requested_changes,
                current_values = v_curr_values,
                role_code = v_staff_role,
                updated_at = now()
            WHERE id = v_existing_request_id;
        ELSE
            INSERT INTO public.staff_profile_change_requests (
                user_id,
                role_code,
                status,
                current_values,
                requested_changes
            ) VALUES (
                v_user_id,
                v_staff_role,
                'Pending',
                v_curr_values,
                v_requested_changes
            ) RETURNING id INTO v_existing_request_id;
        END IF;

        -- Notify Admins
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            created_by
        )
        SELECT u.id,
               format('%s Profile Change Request', v_staff_role),
               format('%s (%s) submitted profile updates requiring Admin approval.', v_user_full_name, v_staff_role),
               'Administrative',
               v_user_id
        FROM public.users u
        INNER JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE r.code = 'Admin' AND u.deleted_at IS NULL;

        RETURN jsonb_build_object(
            'success', true,
            'pending_approval', true,
            'message', 'Your profile change request has been submitted for Administrator verification and approval.'
        );
    END IF;

    -- 3. ADMIN DIRECT UPDATE
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
        profile_completed = true,
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'pending_approval', false,
        'message', 'Your profile has been updated.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text, uuid, smallint, uuid) TO authenticated, service_role;

-- Update fn_get_my_profile to return pending request from staff or student queue
CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
    v_pending JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    -- Look up pending request from student queue first, then staff queue
    SELECT jsonb_build_object(
        'id', req.id,
        'status', req.status,
        'requested_changes', req.requested_changes,
        'current_values', req.current_values,
        'created_at', req.created_at,
        'rejection_reason', req.rejection_reason,
        'registrar_notes', req.registrar_notes,
        'approver_role', 'Registrar'
    )
    INTO v_pending
    FROM public.student_profile_change_requests req
    WHERE req.user_id = v_user_id AND req.status = 'Pending'
    ORDER BY req.created_at DESC
    LIMIT 1;

    IF v_pending IS NULL THEN
        SELECT jsonb_build_object(
            'id', req.id,
            'status', req.status,
            'requested_changes', req.requested_changes,
            'current_values', req.current_values,
            'created_at', req.created_at,
            'rejection_reason', req.rejection_reason,
            'registrar_notes', req.admin_notes,
            'approver_role', 'Administrator'
        )
        INTO v_pending
        FROM public.staff_profile_change_requests req
        WHERE req.user_id = v_user_id AND req.status = 'Pending'
        ORDER BY req.created_at DESC
        LIMIT 1;
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
                'year_level_overridden', COALESCE(s.year_level_overridden, false),
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
        'pending_profile_request', v_pending
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

-- Cancel profile change request helper for either student or staff
CREATE OR REPLACE FUNCTION public.fn_cancel_my_profile_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    UPDATE public.student_profile_change_requests
    SET status = 'Cancelled', updated_at = now()
    WHERE id = p_request_id AND user_id = v_user_id AND status = 'Pending';

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
    END IF;

    UPDATE public.staff_profile_change_requests
    SET status = 'Cancelled', updated_at = now()
    WHERE id = p_request_id AND user_id = v_user_id AND status = 'Pending';

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'message', 'Profile change request cancelled.');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'No pending request found with this ID.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_my_profile_request(uuid) TO authenticated, service_role;

-- ============================================================================
-- 6. ADMIN STAFF PROFILE VERIFICATION RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_list_staff_profile_requests(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_role_code text DEFAULT NULL::text,
    p_status text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE TRUE';
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
        v_where_clause := v_where_clause || format(' AND req.role_code = %L', p_role_code);
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where_clause := v_where_clause || format(' AND req.status = %L', p_status);
    END IF;

    v_base_query := format(
        'SELECT
            req.id,
            req.user_id,
            req.role_code,
            req.status,
            req.current_values,
            req.requested_changes,
            req.approved_changes,
            req.rejection_reason,
            req.admin_notes,
            req.created_at,
            req.updated_at,
            req.reviewed_at,
            btrim(COALESCE(u.first_name, '''') || '' '' || COALESCE(u.last_name, '''')) AS user_name,
            u.email AS user_email,
            dept.name AS department_name,
            dept.code AS department_code,
            btrim(COALESCE(rev.first_name, '''') || '' '' || COALESCE(rev.last_name, '''')) AS reviewer_name,
            COUNT(*) OVER () AS total_count
        FROM public.staff_profile_change_requests req
        INNER JOIN public.users u ON u.id = req.user_id
        LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
        LEFT JOIN public.users rev ON rev.id = req.reviewed_by
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'req.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_staff_profile_requests TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_staff_profile_request_by_id(p_request_id uuid)
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
        'id', req.id,
        'user_id', req.user_id,
        'role_code', req.role_code,
        'status', req.status,
        'current_values', req.current_values,
        'requested_changes', req.requested_changes,
        'approved_changes', req.approved_changes,
        'rejection_reason', req.rejection_reason,
        'admin_notes', req.admin_notes,
        'created_at', req.created_at,
        'updated_at', req.updated_at,
        'reviewed_at', req.reviewed_at,
        'user_name', btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
        'user_email', u.email,
        'department_name', dept.name,
        'department_code', dept.code,
        'reviewer_name', btrim(COALESCE(rev.first_name, '') || ' ' || COALESCE(rev.last_name, ''))
    )
    INTO v_result
    FROM public.staff_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    LEFT JOIN public.departments dept ON dept.id = u.department_id AND dept.deleted_at IS NULL
    LEFT JOIN public.users rev ON rev.id = req.reviewed_by
    WHERE req.id = p_request_id;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Staff profile request not found.');
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_staff_profile_request_by_id(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_approve_staff_profile_request(
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
    v_admin_id UUID := auth.uid();
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_status TEXT;
    v_date_of_birth DATE;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
           u.email AS user_email
    INTO v_req
    FROM public.staff_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    IF p_edited_changes IS NOT NULL AND p_edited_changes <> '{}'::jsonb AND p_edited_changes <> v_req.requested_changes THEN
        v_effective_changes := p_edited_changes;
        v_is_edited := true;
        v_status := 'Approved with Edits';
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_status := 'Approved';
    END IF;

    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND (v_effective_changes->>'date_of_birth') <> '' THEN
        v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Apply approved user fields to public.users
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
    UPDATE public.staff_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id;

    -- Notification to user
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        created_by
    ) VALUES (
        v_req.user_id,
        'Profile Changes Approved',
        CASE WHEN v_is_edited 
             THEN 'Your profile changes have been reviewed, adjusted by the Administrator, and approved.'
             ELSE 'Your profile change request has been verified and approved by the Administrator.'
        END,
        'Administrative',
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'message', 'Staff profile request successfully approved.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_approve_staff_profile_request(uuid, jsonb, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_reject_staff_profile_request(
    p_request_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_admin_id UUID := auth.uid();
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF btrim(COALESCE(p_reason, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A reason is required when rejecting a profile change request.');
    END IF;

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name
    INTO v_req
    FROM public.staff_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    UPDATE public.staff_profile_change_requests
    SET status = 'Rejected',
        rejection_reason = btrim(p_reason),
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id;

    -- Notification to user
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        created_by
    ) VALUES (
        v_req.user_id,
        'Profile Changes Rejected',
        format('Your profile change request was rejected by the Administrator. Reason: %s', btrim(p_reason)),
        'Administrative',
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'Rejected',
        'message', 'Staff profile request has been rejected.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_reject_staff_profile_request(uuid, text) TO authenticated, service_role;

-- ============================================================================
-- 7. GRADE RELEASE HOOKS FOR AUTOMATIC YEAR LEVEL PROGRESSION
-- ============================================================================

-- Hook into fn_approve_and_release_grades
CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_grade           RECORD;
  v_approved_count  INTEGER := 0;
  v_released_count  INTEGER := 0;
  v_eval_blocked    INTEGER := 0;
  v_pending_flags   INTEGER := 0;
  v_student_rec     RECORD;
BEGIN
  PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT COUNT(*)
  INTO v_pending_flags
  FROM public.special_grade_flags f
  INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
  WHERE e.section_id        = p_section_id
    AND f.grading_period_id = p_grading_period_id
    AND f.status            = 'Pending'
    AND f.deleted_at        IS NULL;

  IF v_pending_flags > 0 THEN
    RETURN jsonb_build_object(
      'success',            false,
      'pending_flag_count', v_pending_flags,
      'message',            v_pending_flags || ' student(s) have an unresolved special grade flag. '
                         || 'Apply or dismiss each one before approving this period.'
    );
  END IF;

  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            IN ('Submitted', 'Draft', 'Approved')
      AND sfg.enrollment_id IN (
        SELECT e.id FROM public.enrollments e
        WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
      )
  LOOP
    UPDATE public.section_final_grades
    SET
      status      = 'Approved',
      approved_by = auth.uid(),
      approved_at = now(),
      remarks     = 'Approved via fn_approve_and_release_grades'
    WHERE id = v_grade.id;

    v_approved_count := v_approved_count + 1;

    IF fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
      UPDATE public.section_final_grades
      SET status = 'Released', released_at = now()
      WHERE id = v_grade.id;

      v_released_count := v_released_count + 1;
    ELSE
      v_eval_blocked := v_eval_blocked + 1;
    END IF;
  END LOOP;

  -- Synchronize student year levels with curriculum progression for released grades
  FOR v_student_rec IN
    SELECT DISTINCT e.student_id
    FROM public.enrollments e
    WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
  LOOP
    PERFORM public.fn_sync_student_year_level(v_student_rec.student_id);
  END LOOP;

  RETURN jsonb_build_object(
    'success',        true,
    'approved_count', v_approved_count,
    'released_count', v_released_count,
    'eval_blocked',   v_eval_blocked,
    'message',        'Grades approved. ' || v_released_count || ' released immediately; '
                   || v_eval_blocked || ' pending student evaluation completion.'
  );
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.fn_approve_and_release_grades(uuid, uuid) TO authenticated, service_role;
