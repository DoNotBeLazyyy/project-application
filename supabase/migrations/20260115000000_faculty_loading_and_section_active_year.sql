-- Migration: 20260115000000_faculty_loading_and_section_active_year.sql
-- Description: Prioritize active school year in active term selection and enforce active academic year read-only constraints on sections

-- 1. Prioritize active school year in fn_dashboard_active_term
CREATE OR REPLACE FUNCTION public.fn_dashboard_active_term()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT t.id
    FROM public.terms t
    LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
    ORDER BY
        COALESCE(sy.is_active, false) DESC,
        (t.status IN ('Ongoing', 'Grading Period')) DESC,
        (t.status = 'Enrollment Open') DESC,
        t.start_date DESC
    LIMIT 1;
$function$;

-- 2. Include is_active_academic_year in fn_get_terms
CREATE OR REPLACE FUNCTION public.fn_get_terms()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'label', tt.label || ' - ' || sy.label,
                'is_active_academic_year', COALESCE(sy.is_active, false)
            )
            ORDER BY COALESCE(sy.is_active, false) DESC, t.start_date DESC
        ), '[]'::JSONB)
        FROM public.terms t
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
    );
END;
$function$;

-- 3. Include is_active_academic_year in fn_list_sections_json
CREATE OR REPLACE FUNCTION public.fn_list_sections_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_ids uuid[] DEFAULT NULL::uuid[],
    p_course_ids uuid[] DEFAULT NULL::uuid[],
    p_statuses text[] DEFAULT NULL::text[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND s.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.section_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            s.id,
            s.section_code,
            s.term_id,
            tt.label || '' - '' || sy.label AS term_label,
            s.course_id,
            c.code AS course_code,
            c.title AS course_title,
            s.faculty_id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            s.room,
            s.max_slots,
            s.status,
            COALESCE(sy.is_active, false) AS is_active_academic_year,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.created_at DESC');
END;
$function$;

-- 4. Include is_active_academic_year in fn_get_section_by_id
CREATE OR REPLACE FUNCTION public.fn_get_section_by_id(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',                      s.id,
        'term_id',                 s.term_id,
        'course_id',               s.course_id,
        'faculty_id',              s.faculty_id,
        'section_code',            s.section_code,
        'room',                    s.room,
        'max_slots',               s.max_slots,
        'status',                  s.status,
        'is_active_academic_year', COALESCE(sy.is_active, false)
    )
    INTO v_result
    FROM public.sections s
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN v_result;
END;
$function$;

-- 5. Enforce active academic year check in fn_create_section
CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status section_status_type DEFAULT 'Open'::section_status_type
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sections can only be created for the active academic year.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    INSERT INTO public.sections (
        term_id,
        course_id,
        faculty_id,
        section_code,
        room,
        max_slots,
        status,
        created_by
    ) VALUES (
        p_term_id,
        p_course_id,
        p_faculty_id,
        p_section_code,
        p_room,
        p_max_slots,
        p_status,
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.');
END;
$function$;

-- 6. Enforce active academic year check in fn_update_section
CREATE OR REPLACE FUNCTION public.fn_update_section(
    p_section_id uuid,
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status section_status_type
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be modified.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot move a section to a term outside the active academic year.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND id <> p_section_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    UPDATE public.sections
    SET
        term_id      = p_term_id,
        course_id    = p_course_id,
        faculty_id   = p_faculty_id,
        section_code = p_section_code,
        room         = p_room,
        max_slots    = p_max_slots,
        status       = p_status
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section updated successfully.');
END;
$function$;

-- 7. Enforce active academic year check in fn_delete_section
CREATE OR REPLACE FUNCTION public.fn_delete_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be deleted.');
    END IF;

    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section deleted successfully.');
END;
$function$;

-- 8. Enforce active academic year check in fn_bulk_delete_sections
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_sections(p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = ANY(p_section_ids)
          AND s.deleted_at IS NULL
          AND COALESCE(sy.is_active, false) = false
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be deleted.');
    END IF;

    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_section_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Sections deleted successfully.');
END;
$function$;

-- 9. Enforce active academic year check in fn_bulk_create_sections
CREATE OR REPLACE FUNCTION public.fn_bulk_create_sections(p_sections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_term_id UUID;
    v_is_active BOOLEAN;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
    v_section_id UUID;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            IF NOT v_is_active THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'INACTIVE_ACADEMIC_YEAR',
                    'message', 'Sections can only be imported for the active academic year.'
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = trim(v_row->>'course_code') AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'COURSE_NOT_FOUND',
                    'message', 'Course not found: ' || coalesce(v_row->>'course_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_faculty_id := NULL;
            IF (v_row->>'faculty_email') IS NOT NULL AND trim(v_row->>'faculty_email') <> '' THEN
                SELECT u.id INTO v_faculty_id
                FROM public.users u
                WHERE u.email = trim(v_row->>'faculty_email') AND u.deleted_at IS NULL
                LIMIT 1;

                IF v_faculty_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'FACULTY_NOT_FOUND',
                        'message', 'Faculty email not found: ' || (v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            IF (v_row->>'section_code') IS NULL OR trim(v_row->>'section_code') = '' THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'MISSING_SECTION_CODE',
                    'message', 'Section code is required.'
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.sections
                WHERE term_id = v_term_id
                AND section_code = trim(v_row->>'section_code')
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'DUPLICATE_SECTION_CODE',
                    'message', 'Section code "' || (v_row->>'section_code') || '" already exists in this term.'
                );
                CONTINUE;
            END IF;

            v_max_slots := 40;
            IF (v_row->>'max_slots') IS NOT NULL AND trim(v_row->>'max_slots') <> '' THEN
                v_max_slots := (v_row->>'max_slots')::SMALLINT;
                IF v_max_slots < 1 OR v_max_slots > 999 THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'INVALID_MAX_SLOTS',
                        'message', 'Max slots must be between 1 and 999.'
                    );
                    CONTINUE;
                END IF;
            END IF;

            INSERT INTO public.sections (
                term_id,
                course_id,
                faculty_id,
                section_code,
                room,
                max_slots,
                status,
                created_by
            ) VALUES (
                v_term_id,
                v_course_id,
                v_faculty_id,
                trim(v_row->>'section_code'),
                nullif(trim(v_row->>'room'), ''),
                v_max_slots,
                'Open'::public.section_status_type,
                auth.uid()
            )
            RETURNING id INTO v_section_id;

            PERFORM public.fn_seed_section_grading(v_section_id);

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'DB_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_index,
        'provisioned', v_provisioned,
        'skipped', jsonb_array_length(v_errors),
        'errors', v_errors
    );
END;
$function$;
