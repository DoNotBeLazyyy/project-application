-- ====================================================================
-- Migration: 20261121300007_course_lookup_and_delete.sql
-- Audit 2026-11-21:
--   * #44 fn_get_courses forced the dean's own department, so a dean could not add another
--     department's course (e.g. GE) to a curriculum or as a prerequisite. The department
--     filter is now only what the caller passes; the dean's section form passes the dean's
--     department itself (front end).
--   * #50 fn_delete_course / fn_bulk_delete_courses: deleting a course also removes the
--     prerequisite links that point at it, so other courses no longer list it as unmet.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_courses(p_exclude_ids uuid[] DEFAULT NULL::uuid[], p_department_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_eff_dept_id UUID;
BEGIN
    -- Curricula and prerequisites may use another department's course (e.g. General
    -- Education), so the dean's department is no longer forced here (#44)
    v_eff_dept_id := p_department_id;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'base_code', COALESCE(c.base_code, c.code),
                'label', c.code || ' — ' || c.title,
                'department_id', c.department_id,
                'department_code', (SELECT d.code FROM public.departments d WHERE d.id = c.department_id),
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

CREATE OR REPLACE FUNCTION public.fn_delete_course(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

    -- Its own prerequisites, and the links where other courses require it (#50)
    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE (course_id = p_course_id OR prerequisite_id = p_course_id) AND deleted_at IS NULL;

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

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_courses(p_course_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_ref_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

    -- Their own prerequisites, and the links where other courses require them (#50)
    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE (course_id = ANY(p_course_ids) OR prerequisite_id = ANY(p_course_ids)) AND deleted_at IS NULL;

    UPDATE public.course_course_types
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_course_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Courses deleted successfully');
END;
$function$;

COMMIT;
