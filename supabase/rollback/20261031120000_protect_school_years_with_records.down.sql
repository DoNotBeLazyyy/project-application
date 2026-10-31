-- Rollback of 20261031120000_protect_school_years_with_records: exact live definitions captured before apply
BEGIN;

-- fn_delete_school_year
CREATE OR REPLACE FUNCTION public.fn_delete_school_year(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
