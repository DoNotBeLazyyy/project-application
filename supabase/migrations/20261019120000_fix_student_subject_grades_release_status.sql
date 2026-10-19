-- ============================================================================
-- Migration: 20261019120000_fix_student_subject_grades_release_status.sql
-- Description: Fix fn_get_subject_grades so grade release status is accurately
--              projected for students. When grades are approved and released by
--              the Registrar, is_visible is set to true (status IN ('Approved', 'Released')).
--              If student evaluation is incomplete, raw/final grades are redacted
--              as NULL and marked evaluation_completed = false (matching /student/grade).
--              When evaluation is completed (or grades are Released), grades are viewable.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_actual_enrollment_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            CASE WHEN (eval.is_completed OR sfg.status = 'Released') THEN sfg.raw_grade ELSE NULL END,
            'final_grade',          CASE WHEN (eval.is_completed OR sfg.status = 'Released') THEN sfg.final_grade ELSE NULL END,
            'transmuted_grade',     CASE WHEN (eval.is_completed OR sfg.status = 'Released') THEN sfg.transmuted_grade ELSE NULL END,
            'special_grade',        CASE WHEN (eval.is_completed OR sfg.status = 'Released') THEN sfg.special_grade ELSE NULL END,
            'status',               sfg.status,
            'is_visible',           sfg.status IN ('Approved', 'Released'),
            'evaluation_completed', eval.is_completed OR sfg.status = 'Released'
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = v_actual_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    CROSS JOIN LATERAL (
        SELECT COALESCE((
            SELECT epl.is_completed
            FROM public.evaluation_period_locks epl
            WHERE epl.enrollment_id = v_actual_enrollment_id
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(v_actual_enrollment_id, gp.id)
            AND epl.deleted_at IS NULL
            LIMIT 1
        ), false) AS is_completed
    ) eval
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_subject_grades(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_get_subject_grades(uuid) FROM anon;
