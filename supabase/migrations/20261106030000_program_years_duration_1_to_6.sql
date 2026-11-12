-- ====================================================================
-- Migration: 20261106030000_program_years_duration_1_to_6.sql
--   * fn_create_program, fn_update_program: years duration must be 1-6 (was 1-8), to match
--     the programs.years_duration check added in 20261104024000
--   * fn_bulk_create_programs: each row's years duration must be a whole number from 1 to 6;
--     a bad row is reported instead of failing the whole import
-- Idempotent: functions are CREATE OR REPLACE with the same signatures and grants.
-- ====================================================================
BEGIN;

-- fn_create_program
CREATE OR REPLACE FUNCTION public.fn_create_program(
    p_code text,
    p_name text,
    p_department_id uuid,
    p_program_level_id uuid,
    p_years_duration smallint,
    p_total_units numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
    v_program_id uuid;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE id = p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 6');
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_program_code(p_name);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.programs
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.programs (
        code, name, department_id, program_level_id,
        years_duration, total_units, description, is_active, created_by
    )
    VALUES (
        v_final_code, p_name, p_department_id, p_program_level_id,
        p_years_duration, p_total_units, NULLIF(p_description, ''), p_is_active, auth.uid()
    )
    RETURNING id INTO v_program_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Program created successfully',
        'code', v_final_code,
        'id', v_program_id,
        'program_id', v_program_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_program(text, text, uuid, uuid, smallint, numeric, text, boolean) TO authenticated, anon, service_role;

-- fn_update_program
CREATE OR REPLACE FUNCTION public.fn_update_program(
    p_program_id uuid,
    p_code text,
    p_name text,
    p_department_id uuid,
    p_program_level_id uuid,
    p_years_duration smallint,
    p_total_units numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_years_duration < 1 OR p_years_duration > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 6');
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_name, 'PRG');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE lower(code) = lower(v_final_code) AND id <> p_program_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.programs
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_program_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.programs
    SET
        code = v_final_code,
        name = p_name,
        department_id = p_department_id,
        program_level_id = p_program_level_id,
        years_duration = p_years_duration,
        total_units = p_total_units,
        description = NULLIF(p_description, ''),
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program updated successfully', 'code', v_final_code);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_program(uuid, text, text, uuid, uuid, smallint, numeric, text, boolean) TO authenticated, anon, service_role;

-- fn_bulk_create_programs
CREATE OR REPLACE FUNCTION public.fn_bulk_create_programs(p_programs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program JSONB;
    v_department_id UUID;
    v_program_level_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_program IN SELECT * FROM jsonb_array_elements(p_programs)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_program->>'code') IS NULL OR TRIM(v_program->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Code is required'
            );
            CONTINUE;
        END IF;

        IF (v_program->>'name') IS NULL OR TRIM(v_program->>'name') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Name is required'
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.programs
            WHERE code = v_program->>'code'
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program code already exists: ' || (v_program->>'code')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE code = v_program->>'department_code'
        AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Department code not found: ' || COALESCE(v_program->>'department_code', 'empty')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_program_level_id
        FROM public.program_levels
        WHERE code = v_program->>'program_level_code'
        AND deleted_at IS NULL;

        IF v_program_level_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program level code not found: ' || COALESCE(v_program->>'program_level_code', 'empty')
            );
            CONTINUE;
        END IF;

        IF (v_program->>'years_duration') IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Years duration is required'
            );
            CONTINUE;
        END IF;

        -- Check the format first so a bad value never reaches the cast.
        IF CASE
            WHEN (v_program->>'years_duration') ~ '^\s*[0-9]{1,3}\s*$'
                THEN btrim(v_program->>'years_duration')::INTEGER NOT BETWEEN 1 AND 6
            ELSE TRUE
        END THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Years duration must be between 1 and 6'
            );
            CONTINUE;
        END IF;

        INSERT INTO public.programs (
            code, name, department_id, program_level_id,
            years_duration, total_units, description, is_active, created_by
        )
        VALUES (
            TRIM(v_program->>'code'),
            TRIM(v_program->>'name'),
            v_department_id,
            v_program_level_id,
            btrim(v_program->>'years_duration')::SMALLINT,
            CASE WHEN v_program->>'total_units' = '' THEN NULL
                 ELSE (v_program->>'total_units')::NUMERIC END,
            NULLIF(TRIM(COALESCE(v_program->>'description', '')), ''),
            COALESCE((v_program->>'is_active')::BOOLEAN, TRUE),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' program(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;

COMMIT;
