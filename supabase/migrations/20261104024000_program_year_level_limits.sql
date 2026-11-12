-- ====================================================================
-- Migration: 20261104024000_program_year_level_limits.sql
--   * fn_get_programs: also returns years_duration, so year level pickers can stop at the
--     program's length
--   * fn_registrar_assign_student_program_and_year: refuses a year level above the program's
--     years_duration
--   * programs.years_duration: limited to 1-6 to match curriculum_maps.year_level and
--     students.year_level (both 1-6). Only applied when no program is longer than 6 years
-- Idempotent: functions are CREATE OR REPLACE with the same signatures and grants; the check
-- constraint is dropped and re-added.
-- ====================================================================
BEGIN;

-- fn_get_programs
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
                'department_id', p.department_id,
                'years_duration', p.years_duration
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

-- fn_registrar_assign_student_program_and_year
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
    v_years_duration SMALLINT;
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

    SELECT code, name, years_duration INTO v_program_code, v_program_name, v_years_duration
    FROM public.programs
    WHERE id = p_program_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found or inactive.');
    END IF;

    -- The year level cannot go past the program's length
    IF p_year_level IS NOT NULL AND v_years_duration IS NOT NULL AND p_year_level > v_years_duration THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('%s is a %s-year program, so the year level must be from 1 to %s.', v_program_code, v_years_duration, v_years_duration)
        );
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
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_user_id,
        'Program & Year Level Assigned',
        format('Your academic program has been set to %s (%s), Year Level %s by the Registrar.', v_program_name, v_program_code, v_target_year),
        'Enrollment'::public.notification_category_type,
        '/profile',
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

-- programs.years_duration: 1-6, like the curriculum year levels
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.programs WHERE years_duration > 6) THEN
        RAISE NOTICE 'programs.years_duration check left at 1-8: some programs are longer than 6 years.';
    ELSE
        ALTER TABLE public.programs DROP CONSTRAINT IF EXISTS programs_years_duration_check;
        ALTER TABLE public.programs ADD CONSTRAINT programs_years_duration_check CHECK (years_duration >= 1 AND years_duration <= 6);
    END IF;
END $$;

COMMIT;
