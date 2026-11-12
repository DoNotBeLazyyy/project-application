-- ====================================================================
-- Migration: 20261104011000_school_year_bulk_delete_same_rule.sql
--   * fn_bulk_delete_school_years now uses the same rule as fn_delete_school_year
--     (20261031120000): an active year, or a year whose sections hold student
--     enrollments, cannot be deleted. Years that only have terms can be deleted.
--     Nothing is deleted when any selected year is blocked; the message names the years.
--   * fn_discard_unused_term_types: new helper for the academic year wizard. When a save
--     fails after the wizard registered new term types, it removes those types again,
--     but only types the caller created in the last hour that no term uses.
-- Signatures and grants of existing functions are unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_school_years(p_school_year_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_labels TEXT;
    v_record_labels TEXT;
    v_deleted_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT string_agg(sy.label, ', ' ORDER BY sy.label) INTO v_active_labels
    FROM public.school_years sy
    WHERE sy.id = ANY(p_school_year_ids)
      AND sy.is_active = TRUE
      AND sy.deleted_at IS NULL;

    IF v_active_labels IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete an active school year (' || v_active_labels || '). Deactivate it first before deleting.'
        );
    END IF;

    -- Same rule as a single delete: years whose sections hold student records stay
    SELECT string_agg(DISTINCT sy.label, ', ') INTO v_record_labels
    FROM public.school_years sy
    INNER JOIN public.terms t ON t.school_year_id = sy.id
    INNER JOIN public.sections s ON s.term_id = t.id AND s.deleted_at IS NULL
    INNER JOIN public.enrollments e ON e.section_id = s.id AND e.deleted_at IS NULL
    WHERE sy.id = ANY(p_school_year_ids)
      AND sy.deleted_at IS NULL;

    IF v_record_labels IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete: sections in ' || v_record_labels || ' hold student records.'
        );
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_school_year_ids)
      AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'No school years were found to delete.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_deleted_count || ' school year(s) deleted successfully.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_discard_unused_term_types(p_term_type_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_removed_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    -- Only fresh types made by this admin, and only when no term (even a deleted one) points to them
    DELETE FROM public.term_types tt
    WHERE tt.id = ANY(COALESCE(p_term_type_ids, ARRAY[]::uuid[]))
      AND tt.created_by = auth.uid()
      AND tt.created_at > now() - interval '1 hour'
      AND NOT EXISTS (
          SELECT 1 FROM public.terms t WHERE t.term_type_id = tt.id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.curriculum_maps cm WHERE cm.term_type_id = tt.id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.system_settings ss WHERE ss.default_term_type_id = tt.id
      );

    GET DIAGNOSTICS v_removed_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'count', v_removed_count);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_discard_unused_term_types(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_discard_unused_term_types(uuid[]) TO authenticated, service_role;

COMMIT;