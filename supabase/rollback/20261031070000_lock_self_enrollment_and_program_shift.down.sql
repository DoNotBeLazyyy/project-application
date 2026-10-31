-- Rollback of 20261031070000_lock_self_enrollment_and_program_shift: exact live definitions captured before apply
BEGIN;

-- fn_assign_my_program
CREATE OR REPLACE FUNCTION public.fn_assign_my_program(p_program_id uuid, p_year_level smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id          UUID := auth.uid();
    v_student_id       UUID;
    v_seq_num          INT;
    v_student_number   TEXT;
    v_target_year      SMALLINT;
    v_current_program  UUID;
    v_current_year     SMALLINT;
    v_prog_code        TEXT;
    v_prog_name        TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    -- Ensure student record exists
    SELECT s.id, s.program_id, s.year_level
    INTO v_student_id, v_current_program, v_current_year
    FROM public.students s
    WHERE s.user_id = v_user_id
      AND s.deleted_at IS NULL
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
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            v_user_id,
            v_student_number,
            COALESCE(p_year_level, 1),
            'Active'::public.student_status_type,
            CURRENT_DATE,
            v_user_id
        )
        RETURNING id INTO v_student_id;
    END IF;

    -- Validate target program
    SELECT p.code, p.name
    INTO v_prog_code, v_prog_name
    FROM public.programs p
    WHERE p.id = p_program_id
      AND p.is_active
      AND p.deleted_at IS NULL;

    IF v_prog_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program not found or inactive.');
    END IF;

    v_target_year := COALESCE(p_year_level, v_current_year, 1);
    IF v_target_year < 1 OR v_target_year > 6 THEN
        v_target_year := 1;
    END IF;

    -- Update student program and year level
    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year,
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = v_student_id;

    -- Log lifecycle event
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
        'Program Shift',
        v_current_program,
        p_program_id,
        v_current_year,
        v_target_year,
        CASE WHEN v_current_program IS NULL THEN 'Initial program assignment' ELSE 'Student program selection' END,
        CURRENT_DATE,
        v_user_id
    );

    -- Also update any pending student profile change requests
    UPDATE public.student_profile_change_requests
    SET requested_changes = requested_changes || jsonb_build_object(
            'program_id', p_program_id::text,
            'program_code', v_prog_code,
            'program_name', v_prog_name,
            'year_level', v_target_year
        ),
        updated_at = now()
    WHERE user_id = v_user_id AND status = 'Pending';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Program assigned successfully.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_enrollment(uuid, uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_student(uuid, text, uuid, smallint, date) TO authenticated;

COMMIT;
