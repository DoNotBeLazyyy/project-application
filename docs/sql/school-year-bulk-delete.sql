CREATE OR REPLACE FUNCTION public.fn_bulk_delete_school_years(p_school_year_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_active_count INTEGER;
    v_term_ref_count INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT COUNT(*) INTO v_active_count
    FROM public.school_years
    WHERE id = ANY(p_school_year_ids)
    AND is_active = TRUE
    AND deleted_at IS NULL;

    IF v_active_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete active school year(s). Please deactivate them first.'
        );
    END IF;

    SELECT COUNT(*) INTO v_term_ref_count
    FROM public.terms
    WHERE school_year_id = ANY(p_school_year_ids)
    AND deleted_at IS NULL;

    IF v_term_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected school year(s). ' || v_term_ref_count || ' term(s) are referencing them.'
        );
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_school_year_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Selected school year(s) deleted successfully.'
    );
END;
$$;

