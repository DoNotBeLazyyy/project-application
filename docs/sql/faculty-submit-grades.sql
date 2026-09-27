CREATE OR REPLACE FUNCTION public.fn_submit_section_grades(p_section_id uuid, p_grading_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_count INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    SELECT COUNT(*) INTO v_count
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
    WHERE e.section_id = p_section_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    IF v_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No calculated grades found to submit. Calculate grades first.'
        );
    END IF;

    UPDATE public.section_final_grades sfg
    SET status = 'Submitted'::public.grade_status_type,
        updated_at = now(),
        updated_by = auth.uid()
    FROM public.enrollments e
    WHERE e.id = sfg.enrollment_id
      AND e.section_id = p_section_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Officially submitted ' || v_count || ' student grade(s) to the Registrar.',
        'submitted_count', v_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.fn_submit_section_grades(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_submit_section_grades(uuid, uuid) TO authenticated;
