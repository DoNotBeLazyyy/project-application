-- ============================================================================
-- Migration: 20261019130000_prevent_duplicate_grade_release.sql
-- Description: Prevent duplicate grade release and duplicate student notifications
--              in fn_approve_and_release_grades when grades are already released.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_grade                  RECORD;
  v_approved_count         INTEGER := 0;
  v_released_count         INTEGER := 0;
  v_eval_blocked           INTEGER := 0;
  v_pending_flags          INTEGER := 0;
  v_already_released_count INTEGER := 0;
  v_pending_to_process     INTEGER := 0;
  v_student_rec            RECORD;
  v_course_code            TEXT;
  v_section_code           TEXT;
BEGIN
  PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT COUNT(*)
  INTO v_pending_flags
  FROM public.special_grade_flags f
  INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
  WHERE e.section_id        = p_section_id
    AND f.grading_period_id = p_grading_period_id
    AND f.status            = 'Pending'
    AND f.deleted_at        IS NULL;

  IF v_pending_flags > 0 THEN
    RETURN jsonb_build_object(
      'success',            false,
      'pending_flag_count', v_pending_flags,
      'message',            v_pending_flags || ' student(s) have an unresolved special grade flag. '
                         || 'Apply or dismiss each one before approving this period.'
    );
  END IF;

  SELECT c.code, s.section_code
  INTO v_course_code, v_section_code
  FROM public.sections s
  LEFT JOIN public.courses c ON c.id = s.course_id
  WHERE s.id = p_section_id;

  -- Guard against already-released or empty pending submissions
  SELECT
    COUNT(*) FILTER (WHERE sfg.status = 'Released'),
    COUNT(*) FILTER (WHERE sfg.status IN ('Submitted', 'Draft', 'Approved'))
  INTO v_already_released_count, v_pending_to_process
  FROM public.section_final_grades sfg
  WHERE sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at        IS NULL
    AND sfg.enrollment_id IN (
      SELECT e.id FROM public.enrollments e
      WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
    );

  IF v_pending_to_process = 0 THEN
    IF v_already_released_count > 0 THEN
      RETURN jsonb_build_object(
        'success',          true,
        'approved_count',   0,
        'released_count',   0,
        'eval_blocked',     0,
        'already_released', true,
        'message',          'All grades for this section have already been released.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'message', 'No pending or submitted grades found for this section in the selected grading period.'
      );
    END IF;
  END IF;

  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            IN ('Submitted', 'Draft', 'Approved')
      AND sfg.enrollment_id IN (
        SELECT e.id FROM public.enrollments e
        WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
      )
  LOOP
    UPDATE public.section_final_grades
    SET
      status      = 'Approved',
      approved_by = auth.uid(),
      approved_at = now(),
      remarks     = 'Approved via fn_approve_and_release_grades'
    WHERE id = v_grade.id;

    v_approved_count := v_approved_count + 1;

    IF fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
      UPDATE public.section_final_grades
      SET status = 'Released', released_at = now()
      WHERE id = v_grade.id;

      v_released_count := v_released_count + 1;
    ELSE
      v_eval_blocked := v_eval_blocked + 1;
    END IF;
  END LOOP;

  -- Synchronize student year levels with curriculum progression for released grades
  FOR v_student_rec IN
    SELECT DISTINCT e.student_id
    FROM public.enrollments e
    WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
  LOOP
    PERFORM public.fn_sync_student_year_level(v_student_rec.student_id);
  END LOOP;

  -- Notify enrolled students in real time ONLY if new grades were actually released
  IF v_released_count > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT DISTINCT
      st.user_id,
      'Grades Released',
      format('Grades for %s (%s) have been officially approved and released.', COALESCE(v_course_code, 'your course'), COALESCE(v_section_code, 'Section')),
      '/student/grade',
      'Grade'::public.notification_category_type
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id AND sfg.grading_period_id = p_grading_period_id AND sfg.status = 'Released'
    WHERE e.section_id = p_section_id
      AND e.deleted_at IS NULL
      AND st.user_id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'approved_count', v_approved_count,
    'released_count', v_released_count,
    'eval_blocked',   v_eval_blocked,
    'message',        'Grades approved. ' || v_released_count || ' released immediately; '
                   || v_eval_blocked || ' pending student evaluation completion.'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_approve_and_release_grades(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_approve_and_release_grades(uuid, uuid) FROM anon;
