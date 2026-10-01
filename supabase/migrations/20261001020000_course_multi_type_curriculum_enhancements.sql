-- Migration: 20261001020000_course_multi_type_curriculum_enhancements.sql
-- Description: Supports creating multiple courses from multiple course types, inactive status for course types, and dynamic course type units in curriculum maps.

-- 1. Ensure course_types has is_active column
ALTER TABLE public.course_types ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- 2. Update fn_delete_course_type to soft-delete / deactivate course type
CREATE OR REPLACE FUNCTION public.fn_delete_course_type(p_course_type_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.course_types
        WHERE id = p_course_type_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    -- Instead of physically deleting or failing when courses exist, mark inactive
    UPDATE public.course_types
    SET
        is_active = false,
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_course_type_id;

    RETURN jsonb_build_object('success', true, 'message', 'Course type marked inactive successfully');
END;
$function$;

-- 3. Update fn_get_course_types to only return active course types for creation
CREATE OR REPLACE FUNCTION public.fn_get_course_types()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ct.id,
                'code', ct.code,
                'label', ct.label
            )
            ORDER BY ct.label ASC
        ), '[]'::jsonb)
        FROM public.course_types ct
        WHERE ct.deleted_at IS NULL
        AND ct.is_active = TRUE
    );
END;
$function$;

-- 4. Update fn_list_course_types_json to include is_active
CREATE OR REPLACE FUNCTION public.fn_list_course_types_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            ct.id,
            ct.code,
            ct.label,
            ct.description,
            ct.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.course_types ct
        WHERE ct.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (ct.label ILIKE %L OR ct.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'ct.created_at ASC');
END;
$function$;

-- 5. Ensure courses has base_code column
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS base_code text DEFAULT NULL;
UPDATE public.courses SET base_code = code WHERE base_code IS NULL;

-- 6. Update fn_create_course to support multiple course types creation
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
    v_child_code TEXT;
    v_child_title TEXT;
    v_child_units NUMERIC;
    v_child_credit NUMERIC;
    v_child_lec NUMERIC;
    v_child_lab NUMERIC;
    v_created_id UUID;
    v_prereq JSONB;
    v_created_ids UUID[] := '{}';
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    -- Check if multiple course types are provided
    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 1 THEN
        -- Multi-course creation: create a course record for each course type
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = (v_type_elem->>'course_type_id')::uuid
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            v_child_code := p_code || '_' || UPPER(TRIM(v_ct_record.code));
            v_child_title := p_title || ' (' || TRIM(v_ct_record.label) || ')';
            v_child_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_child_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_child_units);

            IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                v_child_lec := 0;
                v_child_lab := v_child_units;
            ELSE
                v_child_lec := v_child_units;
                v_child_lab := 0;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.courses
                WHERE code = v_child_code AND deleted_at IS NULL
            ) THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || v_child_code);
            END IF;

            INSERT INTO public.courses (
                code, title, department_id, course_type_id,
                lecture_units, laboratory_units, credit_hours,
                description, is_active, base_code, created_by
            )
            VALUES (
                v_child_code, v_child_title, p_department_id, v_ct_record.id,
                v_child_lec, v_child_lab, v_child_credit,
                NULLIF(p_description, ''), p_is_active, p_code, auth.uid()
            )
            RETURNING id INTO v_created_id;

            v_created_ids := array_append(v_created_ids, v_created_id);

            -- Attach prerequisites to each created course
            IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
                FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
                LOOP
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
        END LOOP;

        RETURN jsonb_build_object('success', true, 'message', v_type_count || ' courses created successfully with their respective types');
    ELSE
        -- Single course creation
        IF v_type_count = 1 THEN
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = (p_course_types->0->>'course_type_id')::uuid
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NOT NULL THEN
                p_course_type_id := v_ct_record.id;
                v_child_units := COALESCE((p_course_types->0->>'units')::numeric, p_lecture_units, 0);
                p_credit_hours := COALESCE((p_course_types->0->>'credit_hours')::numeric, p_credit_hours, v_child_units);
                IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                    p_lecture_units := 0;
                    p_laboratory_units := v_child_units;
                ELSE
                    p_lecture_units := v_child_units;
                    p_laboratory_units := 0;
                END IF;
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.course_types
            WHERE id = p_course_type_id AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code);
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, base_code, created_by
        )
        VALUES (
            p_code, p_title, p_department_id, p_course_type_id,
            COALESCE(p_lecture_units, 0), COALESCE(p_laboratory_units, 0), p_credit_hours,
            NULLIF(p_description, ''), p_is_active, p_code, auth.uid()
        )
        RETURNING id INTO v_created_id;

        IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
            FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
            LOOP
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

        RETURN jsonb_build_object('success', true, 'message', 'Course created successfully');
    END IF;
END;
$function$;

-- 7. Ensure curriculum_maps has unit columns for overriding units in curriculum
ALTER TABLE public.curriculum_maps ADD COLUMN IF NOT EXISTS lecture_units numeric(4,2) DEFAULT NULL;
ALTER TABLE public.curriculum_maps ADD COLUMN IF NOT EXISTS laboratory_units numeric(4,2) DEFAULT NULL;
ALTER TABLE public.curriculum_maps ADD COLUMN IF NOT EXISTS units numeric(4,2) DEFAULT NULL;
ALTER TABLE public.curriculum_maps ADD COLUMN IF NOT EXISTS type_units jsonb DEFAULT '{}'::jsonb;

-- 8. Update fn_create_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(
    p_program_id uuid,
    p_course_id uuid,
    p_year_level smallint,
    p_term_type_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_sequence smallint DEFAULT 1,
    p_is_elective boolean DEFAULT false,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_units numeric DEFAULT NULL::numeric,
    p_type_units jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_c_record RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    SELECT * INTO v_c_record FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_c_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course already exists in curriculum for this program and school year');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective,
        lecture_units, laboratory_units, units, type_units,
        created_by
    )
    VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective,
        p_lecture_units, p_laboratory_units, p_units, COALESCE(p_type_units, '{}'::jsonb),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$function$;

-- 9. Update fn_update_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(
    p_curriculum_map_id uuid,
    p_course_id uuid,
    p_year_level smallint,
    p_term_type_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid,
    p_sequence smallint DEFAULT 1,
    p_is_elective boolean DEFAULT false,
    p_lecture_units numeric DEFAULT NULL::numeric,
    p_laboratory_units numeric DEFAULT NULL::numeric,
    p_units numeric DEFAULT NULL::numeric,
    p_type_units jsonb DEFAULT NULL::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE id = p_curriculum_map_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    UPDATE public.curriculum_maps
    SET
        course_id = p_course_id,
        year_level = p_year_level,
        term_type_id = p_term_type_id,
        school_year_id = p_school_year_id,
        sequence = p_sequence,
        is_elective = p_is_elective,
        lecture_units = p_lecture_units,
        laboratory_units = p_laboratory_units,
        units = p_units,
        type_units = COALESCE(p_type_units, type_units, '{}'::jsonb),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_curriculum_map_id;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$function$;

-- 10. Update fn_get_curriculum_map to return type_units and course type details
CREATE OR REPLACE FUNCTION public.fn_get_curriculum_map(p_program_id uuid, p_school_year_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', cm.id,
                'course_id', cm.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'base_code', COALESCE(c.base_code, c.code),
                'course_type_id', c.course_type_id,
                'course_type_code', ct.code,
                'course_type_label', ct.label,
                'lecture_units', COALESCE(cm.lecture_units, c.lecture_units),
                'laboratory_units', COALESCE(cm.laboratory_units, c.laboratory_units),
                'type_units', COALESCE(NULLIF(cm.type_units, '{}'::jsonb), 
                    CASE 
                        WHEN ct.code IS NOT NULL THEN 
                            jsonb_build_object(ct.code, COALESCE(cm.units, c.total_units, c.lecture_units, 0))
                        ELSE 
                            jsonb_build_object('LEC', COALESCE(cm.lecture_units, c.lecture_units, 0), 'LAB', COALESCE(cm.laboratory_units, c.laboratory_units, 0))
                    END
                ),
                'total_units', COALESCE(
                    cm.units, 
                    COALESCE(cm.lecture_units, c.lecture_units, 0) + COALESCE(cm.laboratory_units, c.laboratory_units, 0)
                ),
                'year_level', cm.year_level,
                'term_type_id', cm.term_type_id,
                'term_type_label', tt.label,
                'term_type_code', tt.code,
                'term_type_sequence', tt.sequence,
                'school_year_id', cm.school_year_id,
                'sequence', cm.sequence,
                'is_elective', cm.is_elective,
                'prerequisites', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'code', CASE
                                WHEN cp.prerequisite_kind = 'standing'
                                THEN 'Year ' || cp.year_level_required || ' Standing'
                                ELSE req_c.code
                            END
                        )
                    ), '[]'::jsonb)
                    FROM public.course_prerequisites cp
                    LEFT JOIN public.courses req_c ON req_c.id = cp.prerequisite_id
                    WHERE cp.course_id = c.id
                    AND cp.deleted_at IS NULL
                )
            )
            ORDER BY cm.year_level ASC, tt.sequence ASC, cm.sequence ASC
        ), '[]'::jsonb)
        FROM public.curriculum_maps cm
        JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id
        JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        WHERE cm.program_id = p_program_id
        AND cm.deleted_at IS NULL
        AND (p_school_year_id IS NULL OR cm.school_year_id IS NULL OR cm.school_year_id = p_school_year_id)
    );
END;
$function$;

-- 11. Update fn_get_courses to return rich course info
CREATE OR REPLACE FUNCTION public.fn_get_courses(p_exclude_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'base_code', COALESCE(c.base_code, c.code),
                'label', c.code || ' — ' || c.title,
                'course_type_id', c.course_type_id,
                'course_type_code', ct.code,
                'course_type_label', ct.label,
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'credit_hours', c.credit_hours
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
    );
END;
$function$;
