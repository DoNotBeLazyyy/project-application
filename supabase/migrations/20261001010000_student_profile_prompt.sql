-- Migration: Add RPC for student self-profile completion with system-generated student number
CREATE OR REPLACE FUNCTION public.fn_create_my_student_profile(
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT 1::smallint,
    p_first_name text DEFAULT NULL::text,
    p_middle_name text DEFAULT NULL::text,
    p_last_name text DEFAULT NULL::text,
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
    p_nationality text DEFAULT NULL::text
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
    v_seq_num INT;
    v_role_id UUID;
    v_eff_year SMALLINT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    -- Update personal profile information if provided
    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(p_first_name), ''), first_name),
        middle_name = COALESCE(p_middle_name, middle_name),
        last_name = COALESCE(NULLIF(btrim(p_last_name), ''), last_name),
        suffix = COALESCE(p_suffix, suffix),
        preferred_name = COALESCE(p_preferred_name, preferred_name),
        mobile_number = COALESCE(p_mobile_number, mobile_number),
        address_line1 = COALESCE(p_address_line1, address_line1),
        address_line2 = COALESCE(p_address_line2, address_line2),
        city = COALESCE(p_city, city),
        province = COALESCE(p_province, province),
        postal_code = COALESCE(p_postal_code, postal_code),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        gender = CASE WHEN p_gender IS NOT NULL AND p_gender <> '' THEN p_gender::public.gender_type ELSE gender END,
        civil_status = CASE WHEN p_civil_status IS NOT NULL AND p_civil_status <> '' THEN p_civil_status::public.civil_status_type ELSE civil_status END,
        nationality = COALESCE(p_nationality, nationality),
        updated_at = now()
    WHERE id = v_user_id AND deleted_at IS NULL;

    -- Ensure Student role is assigned to the user
    SELECT id INTO v_role_id FROM public.roles WHERE code = 'Student' AND deleted_at IS NULL;
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
        VALUES (v_user_id, v_role_id, v_user_id, 'Student')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Check if student profile already exists
    SELECT id, student_number INTO v_student_id, v_student_number
    FROM public.students
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    v_eff_year := COALESCE(p_year_level, 1);
    IF v_eff_year < 1 OR v_eff_year > 6 THEN
        v_eff_year := 1;
    END IF;

    IF v_student_id IS NULL THEN
        -- System generate student number (Format: YYYY-XXXX)
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
        )
        RETURNING id INTO v_student_id;

        IF p_program_id IS NOT NULL THEN
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
                v_student_id,
                'Initial Setup',
                NULL,
                p_program_id,
                NULL,
                v_eff_year,
                'Initial student profile creation',
                CURRENT_DATE,
                v_user_id
            );
        END IF;
    ELSE
        -- Update existing student record if program or year level provided
        UPDATE public.students
        SET program_id = COALESCE(p_program_id, program_id),
            year_level = COALESCE(p_year_level, year_level),
            updated_at = now(),
            updated_by = v_user_id
        WHERE id = v_student_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student profile updated successfully.',
        'student_number', v_student_number
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_my_student_profile TO authenticated, service_role;
