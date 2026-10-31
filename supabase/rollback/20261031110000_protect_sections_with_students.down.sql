-- Rollback of 20261031110000_protect_sections_with_students: exact live definitions captured before apply
BEGIN;

-- fn_delete_section
CREATE OR REPLACE FUNCTION public.fn_delete_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
