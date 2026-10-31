-- ====================================================================
-- Migration: 20261031120000_protect_school_years_with_records.sql
--   * fn_delete_school_year: an academic year whose sections hold student enrollments can no
--     longer be deleted; deleting it hid that year's grades from transcripts and the GWA
-- Rollback: supabase/rollback/20261031120000_protect_school_years_with_records.down.sql
-- ====================================================================
BEGIN;

-- fn_delete_school_year
CREATE OR REPLACE FUNCTION public.fn_delete_school_year(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE id = p_school_year_id
        AND is_active = TRUE
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot delete an active school year. Deactivate it first before deleting.');
    END IF;

    -- Past years carry students' grades: a year with enrolled sections stays
    SELECT COUNT(DISTINCT s.id) INTO v_section_count
    FROM public.sections s
    INNER JOIN public.terms t ON t.id = s.term_id
    INNER JOIN public.enrollments e ON e.section_id = s.id AND e.deleted_at IS NULL
    WHERE t.school_year_id = p_school_year_id
      AND s.deleted_at IS NULL;

    IF v_section_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete: ' || v_section_count || ' section(s) in this academic year hold student records.'
        );
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year deleted successfully');
END;
$function$;

COMMIT;
