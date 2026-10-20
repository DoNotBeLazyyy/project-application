-- ============================================================================
-- Migration: 20261019160000_fix_department_bulk_and_name_uniqueness_errors.sql
-- Description: Improve department bulk import and single-entity creation/update
--              to return user-friendly, non-technical error messages when duplicate
--              department names or codes occur, and prevent entire bulk batch
--              failure when individual rows violate unique constraints.
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
    v_seen_codes TEXT[] := ARRAY[]::TEXT[];
    v_seen_names TEXT[] := ARRAY[]::TEXT[];
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

        IF v_name = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department name is required'
            );
            CONTINUE;
        END IF;

        IF v_code = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', '',
                'message', 'Department code is required'
            );
            CONTINUE;
        END IF;

        -- 1. Check duplicate within the same uploaded CSV batch
        IF LOWER(v_name) = ANY(v_seen_names) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department name is duplicated within this import file: ' || v_name
            );
            CONTINUE;
        END IF;

        IF LOWER(v_code) = ANY(v_seen_codes) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department code is duplicated within this import file: ' || v_code
            );
            CONTINUE;
        END IF;

        -- 2. Check existing records in the database (deleted_at IS NULL)
        IF EXISTS (
            SELECT 1 FROM public.departments
            WHERE LOWER(name) = LOWER(v_name)
              AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department name already exists: ' || v_name
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.departments
            WHERE LOWER(code) = LOWER(v_code)
              AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_code,
                'message', 'Department code already exists: ' || v_code
            );
            CONTINUE;
        END IF;

        -- 3. Isolated insert block with error trapping to prevent batch aborts
        BEGIN
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
            v_seen_codes := array_append(v_seen_codes, LOWER(v_code));
            v_seen_names := array_append(v_seen_names, LOWER(v_name));
        EXCEPTION
            WHEN unique_violation THEN
                IF SQLERRM ILIKE '%uidx_departments_name%' OR SQLERRM ILIKE '%(name)%' THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_row_num,
                        'code', v_code,
                        'message', 'Department name already exists: ' || v_name
                    );
                ELSIF SQLERRM ILIKE '%uidx_departments_code%' OR SQLERRM ILIKE '%(code)%' THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_row_num,
                        'code', v_code,
                        'message', 'Department code already exists: ' || v_code
                    );
                ELSE
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_row_num,
                        'code', v_code,
                        'message', 'A department with this code or name already exists: ' || COALESCE(v_name, v_code)
                    );
                END IF;
            WHEN OTHERS THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_row_num,
                    'code', v_code,
                    'message', 'Unable to import department: ' || SQLERRM
                );
        END;
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

-- Update fn_create_department to cleanly validate unique department name
CREATE OR REPLACE FUNCTION public.fn_create_department(
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid,
    p_faculty_ids uuid[] DEFAULT NULL::uuid[],
    p_sync_personnel boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
    v_new_dept_id uuid;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'Department name is required' USING ERRCODE = '23502';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(name) = lower(btrim(p_name)) AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'A department named "%" already exists. Please choose a different name.', btrim(p_name)
            USING ERRCODE = '23505';
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_department_code(p_name);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.departments
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.departments (code, name, description, created_by)
    VALUES (v_final_code, btrim(p_name), NULLIF(btrim(p_description), ''), auth.uid())
    RETURNING id INTO v_new_dept_id;

    IF p_sync_personnel OR p_head_user_id IS NOT NULL OR (p_faculty_ids IS NOT NULL AND array_length(p_faculty_ids, 1) > 0) THEN
        PERFORM public.fn_sync_department_personnel(v_new_dept_id, p_head_user_id, p_faculty_ids);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Department created successfully',
        'id', v_new_dept_id,
        'code', v_final_code
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_department(text, text, text, uuid, uuid[], boolean) TO authenticated, anon, service_role;

-- Update fn_update_department to cleanly validate unique department name
CREATE OR REPLACE FUNCTION public.fn_update_department(
    p_department_id uuid,
    p_code text,
    p_name text,
    p_description text DEFAULT NULL::text,
    p_head_user_id uuid DEFAULT NULL::uuid,
    p_faculty_ids uuid[] DEFAULT NULL::uuid[],
    p_sync_personnel boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    IF p_name IS NULL OR btrim(p_name) = '' THEN
        RAISE EXCEPTION 'Department name is required' USING ERRCODE = '23502';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE lower(name) = lower(btrim(p_name))
          AND id <> p_department_id
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'A department named "%" already exists. Please choose a different name.', btrim(p_name)
            USING ERRCODE = '23505';
    END IF;

    UPDATE public.departments
    SET
        name = btrim(p_name),
        description = NULLIF(btrim(p_description), ''),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_department_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF p_sync_personnel THEN
        PERFORM public.fn_sync_department_personnel(p_department_id, p_head_user_id, p_faculty_ids);
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_department(uuid, text, text, text, uuid, uuid[], boolean) TO authenticated, anon, service_role;
