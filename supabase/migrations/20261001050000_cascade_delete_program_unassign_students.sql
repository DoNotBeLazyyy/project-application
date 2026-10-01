CREATE OR REPLACE FUNCTION public.fn_delete_program(p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Check if program exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    -- 1. Soft-delete associated curriculum maps
    UPDATE public.curriculum_maps
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE program_id = p_program_id
    AND deleted_at IS NULL;

    -- 2. Unassign students from this program (preserve students and enrollments)
    UPDATE public.students
    SET program_id = NULL,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE program_id = p_program_id
    AND deleted_at IS NULL;

    -- 3. Remove program linkage from evaluation templates if any
    DELETE FROM public.evaluation_template_programs
    WHERE program_id = p_program_id;

    -- 4. Soft-delete the program record
    UPDATE public.programs
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Program deleted successfully and associated students unassigned');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_programs(p_program_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- 1. Soft-delete associated curriculum maps
    UPDATE public.curriculum_maps
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE program_id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    -- 2. Unassign students from selected programs
    UPDATE public.students
    SET program_id = NULL,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE program_id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    -- 3. Remove program linkages from evaluation templates
    DELETE FROM public.evaluation_template_programs
    WHERE program_id = ANY(p_program_ids);

    -- 4. Soft-delete the programs
    UPDATE public.programs
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Selected programs deleted successfully and associated students unassigned');
END;
$function$;
