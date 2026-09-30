-- ============================================================================
-- Migration: 20260109000000_bulk_create_departments.sql
-- Description: Add fn_bulk_create_departments for CSV bulk import of departments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_bulk_create_departments(p_departments jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_dept JSONB;
    v_code TEXT;
    v_name TEXT;
    v_description TEXT;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        PERFORM public.fn_assert_role('Admin', 'Dean');
    END IF;

    FOR v_dept IN SELECT * FROM jsonb_array_elements(p_departments)
    LOOP
        v_row_num := v_row_num + 1;
        v_code := TRIM(COALESCE(v_dept->>'code', ''));
        v_name := TRIM(COALESCE(v_dept->>'name', ''));
        v_description := NULLIF(TRIM(COALESCE(v_dept->>'description', '')), '');

        IF v_code = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', '',
                'message', 'Department code is required'
            );
            CONTINUE;
        END IF;

        IF v_name = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department name is required'
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.departments
            WHERE code = v_code
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department code already exists: ' || v_code
            );
            CONTINUE;
        END IF;

        INSERT INTO public.departments (
            code,
            name,
            description,
            created_by
        )
        VALUES (
            v_code,
            v_name,
            v_description,
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' department(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_bulk_create_departments(jsonb) TO authenticated, service_role, anon;
