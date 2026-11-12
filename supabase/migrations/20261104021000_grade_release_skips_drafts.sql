-- ====================================================================
-- Migration: 20261104021000_grade_release_skips_drafts.sql
--   * fn_approve_and_release_grades: only Submitted or Approved grades are approved and
--     released. Faculty drafts are left alone and counted in the message; a section with only
--     drafts is refused
--   * fn_release_grading_period_grades (Release All and the scheduled sweep): same rule. It
--     used to release Draft grades and skip Submitted ones
--   * fn_release_grading_period_now: the message says how many drafts were skipped
--   * fn_set_grading_period_release_at: a release time in the past is refused
-- Idempotent: CREATE OR REPLACE keeps each function's signature and grants.
-- ====================================================================
BEGIN;

-- fn_approve_and_release_grades
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
  v_draft_count            INTEGER := 0;
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

  -- Drafts are still the faculty's and are never released here
  SELECT
    COUNT(*) FILTER (WHERE sfg.status = 'Released'),
    COUNT(*) FILTER (WHERE sfg.status IN ('Submitted', 'Approved')),
    COUNT(*) FILTER (WHERE sfg.status = 'Draft')
  INTO v_already_released_count, v_pending_to_process, v_draft_count
  FROM public.section_final_grades sfg
  WHERE sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at        IS NULL
    AND sfg.enrollment_id IN (
      SELECT e.id FROM public.enrollments e
      WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
    );

  IF v_pending_to_process = 0 THEN
    IF v_draft_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'draft_count', v_draft_count,
        'message', v_draft_count || ' grade(s) in this section are still faculty drafts. The faculty must submit them before they can be released.'
      );
    ELSIF v_already_released_count > 0 THEN
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
        'message', 'No submitted grades found for this section in the selected grading period.'
      );
    END IF;
  END IF;

  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            IN ('Submitted', 'Approved')
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
    'draft_count',    v_draft_count,
    'message',        'Grades approved. ' || v_released_count || ' released immediately; '
                   || v_eval_blocked || ' pending student evaluation completion.'
                   || CASE WHEN v_draft_count > 0
                           THEN ' ' || v_draft_count || ' faculty draft(s) were skipped.'
                           ELSE '' END
  );
END;
$function$;

-- fn_release_grading_period_grades (Release All and the scheduled sweep)
CREATE OR REPLACE FUNCTION public.fn_release_grading_period_grades(p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_grade    RECORD;
    v_approved INTEGER := 0;
    v_released INTEGER := 0;
    v_blocked  INTEGER := 0;
    v_drafts   INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO v_drafts
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            = 'Draft';

    -- Drafts are still the faculty's and are never released
    FOR v_grade IN
        SELECT sfg.id, sfg.enrollment_id, sfg.status
        FROM public.section_final_grades sfg
        WHERE sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at        IS NULL
          AND sfg.status            IN ('Submitted', 'Approved')
    LOOP
        IF v_grade.status = 'Submitted' THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Approved',
                approved_by = auth.uid(),
                approved_at = now()
            WHERE id = v_grade.id;

            v_approved := v_approved + 1;
        END IF;

        IF public.fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Released',
                released_at = now()
            WHERE id = v_grade.id;

            UPDATE public.enrollments
            SET is_grade_visible = true
            WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

            v_released := v_released + 1;
        ELSE
            v_blocked := v_blocked + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'approved',              v_approved,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked,
        'skipped_drafts',        v_drafts
    );
END;
$function$;

-- fn_release_grading_period_now
CREATE OR REPLACE FUNCTION public.fn_release_grading_period_now(p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_registrar BOOLEAN;
    v_outcome      jsonb;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id    = auth.uid()
          AND r.code        = 'Registrar'
          AND ur.deleted_at IS NULL
    ) INTO v_is_registrar;

    IF NOT v_is_registrar THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Registrar can release grades.');
    END IF;

    v_outcome := public.fn_release_grading_period_grades(p_grading_period_id);

    RETURN jsonb_build_object(
        'success',               true,
        'released',              v_outcome ->> 'released',
        'blocked_by_evaluation', v_outcome ->> 'blocked_by_evaluation',
        'skipped_drafts',        v_outcome ->> 'skipped_drafts',
        'message',               format(
            '%s grade(s) released. %s still blocked by pending evaluations. %s faculty draft(s) skipped (not yet submitted).',
            v_outcome ->> 'released',
            v_outcome ->> 'blocked_by_evaluation',
            v_outcome ->> 'skipped_drafts'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- fn_set_grading_period_release_at
CREATE OR REPLACE FUNCTION public.fn_set_grading_period_release_at(p_grading_period_id uuid, p_release_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_registrar BOOLEAN;
    v_exists       BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id    = auth.uid()
          AND r.code        = 'Registrar'
          AND ur.deleted_at IS NULL
    ) INTO v_is_registrar;

    IF NOT v_is_registrar THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Registrar can configure grade release schedules.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.grading_periods
        WHERE id = p_grading_period_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    -- A minute of slack for the time it takes to submit the form
    IF p_release_at IS NOT NULL AND p_release_at < now() - interval '1 minute' THEN
        RETURN jsonb_build_object('success', false, 'message', 'The release time cannot be in the past. Use Release All to release now.');
    END IF;

    UPDATE public.grading_periods
    SET release_at = p_release_at
    WHERE id = p_grading_period_id AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN p_release_at IS NULL
                THEN 'Automatic release cancelled.'
            ELSE 'Grade release scheduled.'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

COMMIT;
