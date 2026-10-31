-- ====================================================================
-- Migration: 20261031110000_protect_sections_with_students.sql
--   * fn_delete_section / fn_bulk_delete_sections: a section that still has students (current
--     or completed, with released grades) can no longer be deleted; it used to disappear with
--     its students' grades from their records
-- Rollback: supabase/rollback/20261031110000_protect_sections_with_students.down.sql
-- ====================================================================
BEGIN;

-- fn_delete_section
CREATE OR REPLACE FUNCTION public.fn_delete_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

    -- A section with students (current or completed, with grades) cannot be deleted
    SELECT COUNT(*) INTO v_student_count
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn');

    IF v_student_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete: ' || v_student_count || ' student enrollment(s) belong to this section. Drop or move the students first.'
        );
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

-- fn_bulk_delete_sections
CREATE OR REPLACE FUNCTION public.fn_bulk_delete_sections(p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

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

    -- A section with students (current or completed, with grades) cannot be deleted
    SELECT COUNT(*) INTO v_student_count
    FROM public.enrollments e
    WHERE e.section_id = ANY(p_section_ids)
      AND e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn');

    IF v_student_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete: ' || v_student_count || ' student enrollment(s) belong to the selected sections. Drop or move the students first.'
        );
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

COMMIT;
