-- Grading lock and "Calculate all"
--   * fn_is_section_grading_locked: a period is locked only once a grade row for it is
--     Submitted, Approved or Released. Before, any row (even a Draft from a trial Calculate,
--     or an INC flag row) locked the components for good.
--   * fn_calculate_all_grades_for_period: only the section's own faculty or an Admin may run
--     it (before, any Dean or Registrar could too). Rows that are locked because they were
--     submitted are counted apart, so the summary reads
--     "All N grades are locked because they were submitted." instead of "All N failed".
--     fn_calculate_final_grade itself stays revoked from authenticated users, so it is only
--     reached through this function.
-- Signatures are unchanged, so grants stay in place.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_is_section_grading_locked(p_section_id uuid, p_grading_period_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.section_final_grades sfg
        INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at IS NULL
          AND sfg.status IN ('Submitted', 'Approved', 'Released')
    );
$function$;

CREATE OR REPLACE FUNCTION public.fn_calculate_all_grades_for_period(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_enrollment      RECORD;
  v_result          JSONB;
  v_success_count   INTEGER := 0;
  v_failure_count   INTEGER := 0;
  v_failures        JSONB   := '[]'::jsonb;
  v_processed       INTEGER := 0;
  v_message         TEXT;
  v_flags           JSONB   := NULL;
  v_locked_count    INTEGER := 0;
  v_existing_status TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    -- Only the section's own faculty or an Admin may calculate grades
    IF NOT (
        public.fn_is_section_faculty(p_section_id)
        OR 'Admin' = ANY(public.fn_current_user_role_codes())
    ) THEN
        RAISE EXCEPTION 'Forbidden: only the section''s faculty or an Admin can calculate grades.'
            USING ERRCODE = '42501';
    END IF;

  FOR v_enrollment IN
    SELECT e.id,
           st.student_number,
           u.first_name || ' ' || u.last_name AS full_name
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
    ORDER BY u.last_name ASC, u.first_name ASC
  LOOP
    SELECT sfg.status::TEXT INTO v_existing_status
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = v_enrollment.id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    IF v_existing_status IS NOT NULL AND v_existing_status <> 'Draft' THEN
      v_locked_count := v_locked_count + 1;
    END IF;

    v_result := public.fn_calculate_final_grade(v_enrollment.id, p_grading_period_id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failure_count := v_failure_count + 1;
      v_failures := v_failures || jsonb_build_object(
        'enrollment_id',  v_enrollment.id,
        'student_number', v_enrollment.student_number,
        'full_name',      v_enrollment.full_name,
        'reason',         v_result->>'message'
      );
    END IF;
  END LOOP;

  v_processed := v_success_count + v_failure_count;

  IF v_processed = 0 THEN
    v_message := 'No enrolled students in this section to calculate.';
  ELSIF v_failure_count = 0 THEN
    v_message := 'Calculated grades for ' || v_success_count || ' student(s).';
  ELSIF v_success_count = 0 AND v_locked_count = v_failure_count THEN
    v_message := 'All ' || v_failure_count || ' grades are locked because they were submitted.';
  ELSIF v_success_count = 0 THEN
    v_message := 'No grades could be calculated for ' || v_failure_count || ' student(s)'
              || CASE WHEN v_locked_count > 0
                      THEN ' (' || v_locked_count || ' locked because they were submitted).'
                      ELSE '. See the list for the reasons.'
                 END;
  ELSE
    v_message := 'Calculated ' || v_success_count || ' of ' || v_processed || ' student(s). '
              || CASE WHEN v_locked_count > 0
                      THEN v_locked_count || ' locked because they were submitted'
                           || CASE WHEN v_failure_count > v_locked_count
                                   THEN ', ' || (v_failure_count - v_locked_count) || ' could not be computed.'
                                   ELSE '.'
                              END
                      ELSE v_failure_count || ' could not be computed.'
                 END;
  END IF;

  BEGIN
    v_flags := public.fn_detect_special_grade_flags_core(p_section_id, p_grading_period_id);
  EXCEPTION WHEN OTHERS THEN
    v_flags := jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'message',       v_message,
    'section_id',    p_section_id,
    'period_id',     p_grading_period_id,
    'processed',     v_processed,
    'succeeded',     v_success_count,
    'failed',        v_failure_count,
    'locked',        v_locked_count,
    'failures',      v_failures,
    'flags',         v_flags
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

COMMIT;