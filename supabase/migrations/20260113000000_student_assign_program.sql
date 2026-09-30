-- Migration: Allow students to assign and shift their academic program
-- Update fn_shift_student_program to permit self-assignment for students and auto-provision if needed
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
DECLARE
    v_target_student_id UUID;
    v_current_program UUID;
    v_current_year SMALLINT;
    v_target_year SMALLINT;
    v_is_staff BOOLEAN;
    v_student_number TEXT;
    v_seq_num INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Registrar', 'Admin'];

    IF p_student_id IS NULL THEN
        SELECT s.id
        INTO v_target_student_id
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.deleted_at IS NULL
        LIMIT 1;

        -- If student record doesn't exist yet, auto-provision if user has Student role
        IF v_target_student_id IS NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.code = 'Student'
                  AND ur.deleted_at IS NULL
            ) THEN
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
                    auth.uid(),
                    v_student_number,
                    COALESCE(p_year_level, 1),
                    'Active'::public.student_status_type,
                    CURRENT_DATE,
                    auth.uid()
                )
                RETURNING id INTO v_target_student_id;
            END IF;
        END IF;
    ELSE
        v_target_student_id := p_student_id;
    END IF;

    IF v_target_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    -- If not staff (Admin or Registrar), ensure the target student belongs to the signed-in user
    IF NOT v_is_staff THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = v_target_student_id
              AND s.user_id = auth.uid()
              AND s.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you can only update your own program.');
        END IF;
    END IF;

    SELECT s.program_id, s.year_level
    INTO v_current_program, v_current_year
    FROM public.students s
    WHERE s.id = v_target_student_id
      AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF p_program_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = p_program_id
          AND p.is_active
          AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program not found or inactive.');
    END IF;

    v_target_year := COALESCE(p_year_level, v_current_year, 1);

    IF v_target_year < 1 OR v_target_year > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6.');
    END IF;

    IF v_current_program IS NOT DISTINCT FROM p_program_id AND v_current_year = v_target_year THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The student is already in this program and year level.'
        );
    END IF;

    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = v_target_student_id;

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
        v_target_student_id,
        'Program Shift',
        v_current_program,
        p_program_id,
        v_current_year,
        v_target_year,
        NULLIF(btrim(COALESCE(p_reason, CASE WHEN v_current_program IS NULL THEN 'Initial program assignment' ELSE 'Program shift' END)), ''),
        COALESCE(p_effective_date, CURRENT_DATE),
        auth.uid()
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Program assigned successfully.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- Convenience RPC specifically for assigning/updating the student's program
CREATE OR REPLACE FUNCTION public.fn_assign_my_program(
    p_program_id uuid,
    p_year_level smallint DEFAULT NULL::smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN public.fn_shift_student_program(
        NULL,
        p_program_id,
        p_year_level,
        'Self-assigned academic program',
        CURRENT_DATE
    );
END;
$function$;

-- Update fn_get_my_profile to include student details
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
