-- Migration: 20261019100000_unify_course_multi_type.sql
-- Description: Prevent course creation from splitting into multiple courses when multiple course types are specified.
--              Create course_course_types table to connect multiple course types to a single course.
--              Update fn_create_course, fn_update_course, fn_get_course_by_id, fn_list_courses_json, fn_get_courses,
--              fn_delete_course, and fn_bulk_delete_courses.

-- 1. Create course_course_types table
CREATE TABLE IF NOT EXISTS public.course_course_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    course_type_id uuid NOT NULL REFERENCES public.course_types(id) ON DELETE RESTRICT,
    units numeric(4,2) NOT NULL DEFAULT 0,
    credit_hours numeric(4,2) NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_course_course_types_course_id ON public.course_course_types(course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_course_course_types_course_type_id ON public.course_course_types(course_type_id) WHERE deleted_at IS NULL;

ALTER TABLE public.course_course_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'course_course_types' AND policyname = 'course_course_types_select'
    ) THEN
        CREATE POLICY course_course_types_select ON public.course_course_types FOR SELECT TO authenticated, anon USING (deleted_at IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'course_course_types' AND policyname = 'course_course_types_all'
    ) THEN
        CREATE POLICY course_course_types_all ON public.course_course_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Merge previously split courses if present (e.g. COCS102_LECTURE & COCS102_LABORATORY)
DO $$
DECLARE
    v_lec_id UUID := '5a9721c1-2fbd-48e2-b9ff-1ae33946456f';
    v_lab_id UUID := '6b9b4d7e-5cb0-44c6-a255-f1b85bd1acc3';
BEGIN
    IF EXISTS (SELECT 1 FROM public.courses WHERE id = v_lec_id) AND EXISTS (SELECT 1 FROM public.courses WHERE id = v_lab_id) THEN
        UPDATE public.courses
        SET
            code = 'COCS102',
            title = 'IT101 - Computer Programming 1',
            lecture_units = 2.00,
            laboratory_units = 1.00,
            credit_hours = 3.00,
            base_code = 'COCS102'
        WHERE id = v_lec_id;

        DELETE FROM public.courses WHERE id = v_lab_id;

        INSERT INTO public.course_course_types (course_id, course_type_id, units, credit_hours)
        VALUES
            (v_lec_id, 'c31836db-5435-4d09-9fca-a1cfd62a7fb9', 2.00, 2.00),
            (v_lec_id, 'aca6ba36-25a8-45c2-a872-721905f90130', 1.00, 1.00)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 3. Backfill course_course_types for existing courses
INSERT INTO public.course_course_types (course_id, course_type_id, units, credit_hours)
SELECT
    c.id,
    c.course_type_id,
    COALESCE(NULLIF(c.lecture_units, 0), NULLIF(c.laboratory_units, 0), c.total_units, 0),
    COALESCE(c.credit_hours, c.total_units, 0)
FROM public.courses c
WHERE c.course_type_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.course_course_types cct WHERE cct.course_id = c.id
  );

-- 4. Update fn_create_course to NEVER split into multiple courses
CREATE OR REPLACE FUNCTION public.fn_create_course(
    p_code text,
    p_title text,
    p_department_id uuid,
    p_course_type_id uuid,
    p_is_split boolean DEFAULT false,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_credit_hours numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true,
    p_prerequisites jsonb DEFAULT NULL::jsonb,
    p_course_types jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_type_count INTEGER := 0;
    v_type_elem JSONB;
    v_ct_record RECORD;
    v_dept_code TEXT;
    v_base_code TEXT;
    v_created_id UUID;
    v_prereq JSONB;
    v_next_course_num INT := 101;
    v_sum_lec NUMERIC := 0;
    v_sum_lab NUMERIC := 0;
    v_sum_units NUMERIC := 0;
    v_sum_credit NUMERIC := 0;
    v_elem_units NUMERIC := 0;
    v_elem_credit NUMERIC := 0;
    v_elem_type_id UUID;
    v_primary_course_type_id UUID := NULL;
BEGIN
    SELECT code INTO v_dept_code FROM public.departments
    WHERE id = p_department_id AND deleted_at IS NULL;

    IF v_dept_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    v_base_code := btrim(COALESCE(p_code, ''));
    IF v_base_code = '' THEN
        IF v_dept_code LIKE '%GAS%' OR v_dept_code LIKE '%GEN%' THEN
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(code, '^' || v_dept_code || '([0-9]+).*$', '\1'), code)::int), 0
            ) + 1
            INTO v_next_course_num
            FROM public.courses
            WHERE department_id = p_department_id AND deleted_at IS NULL AND code ~ ('^' || v_dept_code || '[0-9]+');

            v_base_code := v_dept_code || lpad(v_next_course_num::text, 2, '0');
        ELSE
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(code, '^' || v_dept_code || '([0-9]+).*$', '\1'), code)::int), 100
            ) + 1
            INTO v_next_course_num
            FROM public.courses
            WHERE department_id = p_department_id AND deleted_at IS NULL AND code ~ ('^' || v_dept_code || '[0-9]+');

            IF v_next_course_num < 101 THEN
                v_next_course_num := 101;
            END IF;

            v_base_code := v_dept_code || v_next_course_num::text;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.courses
        WHERE lower(code) = lower(v_base_code) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || v_base_code);
    END IF;

    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            v_elem_type_id := (v_type_elem->>'course_type_id')::uuid;
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = v_elem_type_id
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            IF v_primary_course_type_id IS NULL THEN
                v_primary_course_type_id := v_ct_record.id;
            END IF;

            v_elem_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_elem_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_elem_units);

            v_sum_units := v_sum_units + v_elem_units;
            v_sum_credit := v_sum_credit + v_elem_credit;

            IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                v_sum_lab := v_sum_lab + v_elem_units;
            ELSIF UPPER(TRIM(v_ct_record.code)) IN ('LEC', 'LECTURE') THEN
                v_sum_lec := v_sum_lec + v_elem_units;
            ELSE
                v_sum_lec := v_sum_lec + v_elem_units;
            END IF;
        END LOOP;
    ELSE
        v_primary_course_type_id := p_course_type_id;
        v_sum_lec := COALESCE(p_lecture_units, 0);
        v_sum_lab := COALESCE(p_laboratory_units, 0);
        v_sum_units := v_sum_lec + v_sum_lab;
        v_sum_credit := COALESCE(p_credit_hours, v_sum_units);

        IF v_primary_course_type_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.course_types
            WHERE id = v_primary_course_type_id AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
        END IF;
    END IF;

    -- Create single unified course (total_units is generated automatically)
    INSERT INTO public.courses (
        code, title, department_id, course_type_id,
        lecture_units, laboratory_units, credit_hours,
        description, is_active, base_code, created_by
    )
    VALUES (
        v_base_code, p_title, p_department_id, v_primary_course_type_id,
        v_sum_lec, v_sum_lab, v_sum_credit,
        NULLIF(p_description, ''), p_is_active, v_base_code, auth.uid()
    )
    RETURNING id INTO v_created_id;

    -- Insert course types breakdown into course_course_types
    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                v_created_id,
                (v_type_elem->>'course_type_id')::uuid,
                COALESCE((v_type_elem->>'units')::numeric, 0),
                COALESCE((v_type_elem->>'credit_hours')::numeric, (v_type_elem->>'units')::numeric, 0),
                auth.uid()
            );
        END LOOP;
    ELSIF v_primary_course_type_id IS NOT NULL THEN
        INSERT INTO public.course_course_types (
            course_id, course_type_id, units, credit_hours, created_by
        )
        VALUES (
            v_created_id,
            v_primary_course_type_id,
            v_sum_units,
            v_sum_credit,
            auth.uid()
        );
    END IF;

    -- Attach prerequisites
    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    CONTINUE;
                END IF;
                IF (v_prereq->>'course_id')::UUID = v_created_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
            END IF;

            INSERT INTO public.course_prerequisites (
                course_id, prerequisite_id, prerequisite_type,
                prerequisite_kind, year_level_required, minimum_grade, created_by
            )
            VALUES (
                v_created_id,
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                    THEN (v_prereq->>'course_id')::UUID
                    ELSE NULL END,
                (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                    THEN (v_prereq->>'year_level_required')::SMALLINT
                    ELSE NULL END,
                CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                     ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course created successfully', 'id', v_created_id);
END;
$function$;

-- 5. Update fn_update_course to accept p_course_types and update course_course_types
DROP FUNCTION IF EXISTS public.fn_update_course(uuid, text, text, uuid, uuid, numeric, numeric, numeric, text, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.fn_update_course(
    p_course_id uuid,
    p_code text,
    p_title text,
    p_department_id uuid,
    p_course_type_id uuid,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_credit_hours numeric DEFAULT NULL::numeric,
    p_description text DEFAULT NULL::text,
    p_is_active boolean DEFAULT true,
    p_prerequisites jsonb DEFAULT NULL::jsonb,
    p_course_types jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_prereq JSONB;
    v_type_count INTEGER := 0;
    v_type_elem JSONB;
    v_ct_record RECORD;
    v_sum_lec NUMERIC := 0;
    v_sum_lab NUMERIC := 0;
    v_sum_units NUMERIC := 0;
    v_sum_credit NUMERIC := 0;
    v_elem_units NUMERIC := 0;
    v_elem_credit NUMERIC := 0;
    v_elem_type_id UUID;
    v_primary_course_type_id UUID := NULL;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            v_elem_type_id := (v_type_elem->>'course_type_id')::uuid;
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = v_elem_type_id
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            IF v_primary_course_type_id IS NULL THEN
                v_primary_course_type_id := v_ct_record.id;
            END IF;

            v_elem_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_elem_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_elem_units);

            v_sum_units := v_sum_units + v_elem_units;
            v_sum_credit := v_sum_credit + v_elem_credit;

            IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                v_sum_lab := v_sum_lab + v_elem_units;
            ELSIF UPPER(TRIM(v_ct_record.code)) IN ('LEC', 'LECTURE') THEN
                v_sum_lec := v_sum_lec + v_elem_units;
            ELSE
                v_sum_lec := v_sum_lec + v_elem_units;
            END IF;
        END LOOP;
    ELSE
        v_primary_course_type_id := p_course_type_id;
        v_sum_lec := COALESCE(p_lecture_units, 0);
        v_sum_lab := COALESCE(p_laboratory_units, 0);
        v_sum_units := v_sum_lec + v_sum_lab;
        v_sum_credit := COALESCE(p_credit_hours, v_sum_units);
    END IF;

    -- Update courses table (code remains immutable, total_units is generated automatically)
    UPDATE public.courses
    SET
        title = p_title,
        department_id = p_department_id,
        course_type_id = COALESCE(v_primary_course_type_id, p_course_type_id, course_type_id),
        lecture_units = v_sum_lec,
        laboratory_units = v_sum_lab,
        credit_hours = v_sum_credit,
        description = NULLIF(p_description, ''),
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_course_id
    AND deleted_at IS NULL;

    -- Update course types in course_course_types
    IF v_type_count > 0 THEN
        UPDATE public.course_course_types
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE course_id = p_course_id AND deleted_at IS NULL;

        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                p_course_id,
                (v_type_elem->>'course_type_id')::uuid,
                COALESCE((v_type_elem->>'units')::numeric, 0),
                COALESCE((v_type_elem->>'credit_hours')::numeric, (v_type_elem->>'units')::numeric, 0),
                auth.uid()
            );
        END LOOP;
    END IF;

    -- Update prerequisites
    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                END IF;
                IF (v_prereq->>'course_id')::UUID = p_course_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
            END IF;

            IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                END IF;
            END IF;

            INSERT INTO public.course_prerequisites (
                course_id, prerequisite_id, prerequisite_type,
                prerequisite_kind, year_level_required, minimum_grade, created_by
            )
            VALUES (
                p_course_id,
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                    THEN (v_prereq->>'course_id')::UUID
                    ELSE NULL END,
                (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                    THEN (v_prereq->>'year_level_required')::SMALLINT
                    ELSE NULL END,
                CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                     ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course updated successfully');
END;
$function$;

-- 6. Update fn_get_course_by_id to return course_types
CREATE OR REPLACE FUNCTION public.fn_get_course_by_id(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
    v_prerequisites JSONB;
    v_course_types JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'title', c.title,
        'description', c.description,
        'department_id', c.department_id,
        'course_type_id', c.course_type_id,
        'lecture_units', c.lecture_units,
        'laboratory_units', c.laboratory_units,
        'total_units', c.total_units,
        'credit_hours', c.credit_hours,
        'is_active', c.is_active
    )
    INTO v_result
    FROM public.courses c
    WHERE c.id = p_course_id
    AND c.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'course_id', COALESCE(cp.prerequisite_id::TEXT, ''),
            'prerequisite_type', cp.prerequisite_type::TEXT,
            'prerequisite_kind', cp.prerequisite_kind,
            'year_level_required', COALESCE(cp.year_level_required::TEXT, ''),
            'minimum_grade', COALESCE(cp.minimum_grade::TEXT, '')
        )
        ORDER BY cp.created_at ASC
    ), '[]'::JSONB)
    INTO v_prerequisites
    FROM public.course_prerequisites cp
    WHERE cp.course_id = p_course_id
    AND cp.deleted_at IS NULL;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'course_type_id', cct.course_type_id,
            'course_type_code', ct.code,
            'course_type_label', ct.label,
            'units', cct.units,
            'credit_hours', cct.credit_hours
        )
        ORDER BY cct.created_at ASC
    ), '[]'::JSONB)
    INTO v_course_types
    FROM public.course_course_types cct
    JOIN public.course_types ct ON ct.id = cct.course_type_id AND ct.deleted_at IS NULL
    WHERE cct.course_id = p_course_id
    AND cct.deleted_at IS NULL;

    -- Fallback for legacy courses if no rows in course_course_types
    IF (v_course_types IS NULL OR jsonb_array_length(v_course_types) = 0) AND (v_result->>'course_type_id') IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'course_type_id', ct.id,
                'course_type_code', ct.code,
                'course_type_label', ct.label,
                'units', COALESCE(NULLIF((v_result->>'lecture_units')::numeric, 0), NULLIF((v_result->>'laboratory_units')::numeric, 0), (v_result->>'total_units')::numeric, 0),
                'credit_hours', COALESCE((v_result->>'credit_hours')::numeric, (v_result->>'total_units')::numeric, 0)
            )
        ), '[]'::JSONB)
        INTO v_course_types
        FROM public.course_types ct
        WHERE ct.id = (v_result->>'course_type_id')::uuid;
    END IF;

    RETURN v_result || jsonb_build_object(
        'prerequisites', v_prerequisites,
        'course_types', v_course_types
    );
END;
$function$;

-- 7. Update fn_list_courses_json to show aggregated course types and filter properly
CREATE OR REPLACE FUNCTION public.fn_list_courses_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_department_ids uuid[] DEFAULT NULL::uuid[],
    p_course_type_ids uuid[] DEFAULT NULL::uuid[],
    p_is_active boolean DEFAULT NULL::boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE c.deleted_at IS NULL';
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND c.department_id = %L', v_dean_dept_id);
    ELSIF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_course_type_ids IS NOT NULL AND array_length(p_course_type_ids, 1) > 0 THEN
        v_where := v_where || ' AND (c.course_type_id = ANY(' || quote_literal(p_course_type_ids::TEXT) || '::uuid[]) OR EXISTS (SELECT 1 FROM public.course_course_types cct WHERE cct.course_id = c.id AND cct.deleted_at IS NULL AND cct.course_type_id = ANY(' || quote_literal(p_course_type_ids::TEXT) || '::uuid[])))';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND c.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.code,
            c.title,
            c.description,
            c.department_id,
            d.name AS department_name,
            c.course_type_id,
            COALESCE(
                NULLIF((
                    SELECT string_agg(DISTINCT ct_sub.label, '', '' ORDER BY ct_sub.label)
                    FROM public.course_course_types cct
                    JOIN public.course_types ct_sub ON ct_sub.id = cct.course_type_id AND ct_sub.deleted_at IS NULL
                    WHERE cct.course_id = c.id AND cct.deleted_at IS NULL
                ), ''''),
                ct.label,
                ''N/A''
            ) AS course_type_label,
            c.lecture_units,
            c.laboratory_units,
            c.total_units,
            c.credit_hours,
            c.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.courses c
        JOIN public.departments d ON d.id = c.department_id AND d.deleted_at IS NULL
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id AND ct.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'c.code ASC');
END;
$function$;

-- 8. Update fn_get_courses to return course_types and aggregated course_type_label
CREATE OR REPLACE FUNCTION public.fn_get_courses(
    p_exclude_ids uuid[] DEFAULT NULL::uuid[],
    p_department_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_dept_id UUID;
    v_eff_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_eff_dept_id := COALESCE(v_dean_dept_id, p_department_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'base_code', COALESCE(c.base_code, c.code),
                'label', c.code || ' — ' || c.title,
                'department_id', c.department_id,
                'course_type_id', c.course_type_id,
                'course_type_code', ct.code,
                'course_type_label', COALESCE(
                    NULLIF((
                        SELECT string_agg(DISTINCT ct_sub.label, ', ' ORDER BY ct_sub.label)
                        FROM public.course_course_types cct
                        JOIN public.course_types ct_sub ON ct_sub.id = cct.course_type_id AND ct_sub.deleted_at IS NULL
                        WHERE cct.course_id = c.id AND cct.deleted_at IS NULL
                    ), ''),
                    ct.label
                ),
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'credit_hours', c.credit_hours,
                'course_types', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'course_type_id', cct.course_type_id,
                        'course_type_code', ct2.code,
                        'course_type_label', ct2.label,
                        'units', cct.units,
                        'credit_hours', cct.credit_hours
                    ) ORDER BY cct.created_at ASC)
                    FROM public.course_course_types cct
                    JOIN public.course_types ct2 ON ct2.id = cct.course_type_id AND ct2.deleted_at IS NULL
                    WHERE cct.course_id = c.id AND cct.deleted_at IS NULL
                ), '[]'::jsonb)
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
        AND (v_eff_dept_id IS NULL OR c.department_id = v_eff_dept_id)
    );
END;
$function$;

-- 9. Update fn_delete_course to soft-delete course_course_types
CREATE OR REPLACE FUNCTION public.fn_delete_course(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = p_course_id AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete course. It is referenced by existing curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    UPDATE public.course_course_types
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course deleted successfully');
END;
$function$;

-- 10. Update fn_bulk_delete_courses to soft-delete course_course_types
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_courses(p_course_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected courses. Some are referenced by curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.course_course_types
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_course_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Courses deleted successfully');
END;
$function$;

-- Permissions
GRANT ALL ON public.course_course_types TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_create_course(text, text, uuid, uuid, boolean, numeric, numeric, numeric, text, boolean, jsonb, jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_update_course(uuid, text, text, uuid, uuid, numeric, numeric, numeric, text, boolean, jsonb, jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_course_by_id(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_courses_json(integer, integer, text, jsonb, uuid[], uuid[], boolean) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_courses(uuid[], uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_delete_course(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_courses(uuid[]) TO authenticated, anon, service_role;
