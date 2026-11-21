-- ====================================================================
-- Migration: 20261121100002_grade_release_flow.sql
-- Audit 2026-11-21 (BUG-AUDIT-20261121.md), policy 9 (registrar review is mandatory):
--   #5  fn_release_grades_after_evaluation: one term-scope evaluation releases every Approved
--       period that shares it (not only the anchor period); a future release date still
--       waits; year level is synced after the release
--   #14 fn_release_grading_period_grades ("Release now" and the scheduled sweep): sections
--       with a pending special grade flag wait, and released students are notified
--   #15 fn_release_grading_period_grades, fn_approve_and_release_grades,
--       fn_release_grades_after_evaluation: dropped/withdrawn students are never released
--   T2  fn_release_grading_period_grades: releases only registrar-Approved grades and never
--       auto-approves Submitted ones (policy 9); fn_release_grading_period_now reports them
--   T2  fn_approve_and_release_grades: respects a future release_at (approves now, the sweep
--       releases on the date); notifies only the students released by this call, so approving
--       one returned grade no longer re-notifies the whole period
--   T2  fn_list_grade_release_schedule: blocked_count leaves out faculty drafts and counts students
--   T2  fn_audit_section_final_grades: the grade-release-sweep cron job has no signed-in user, so
--       its grade_audit_logs insert (changed_by NOT NULL) failed and rolled back every scheduled
--       release; the trigger now falls back to the approving registrar / last editor
-- Bodies are based on the live definitions read on 2026-11-21. Idempotent (CREATE OR REPLACE).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_audit_section_final_grades()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  -- The scheduled release runs from cron with no signed-in user, and changed_by is
  -- required: fall back to the registrar who approved the grade, then the last editor
  v_actor UUID := COALESCE(auth.uid(), NEW.approved_by, OLD.updated_by, NEW.created_by);
BEGIN
  IF OLD.raw_grade IS DISTINCT FROM NEW.raw_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'raw_grade', OLD.raw_grade::TEXT, NEW.raw_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), v_actor, inet_client_addr()
    );
  END IF;

  IF OLD.final_grade IS DISTINCT FROM NEW.final_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'final_grade', OLD.final_grade::TEXT, NEW.final_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), v_actor, inet_client_addr()
    );
  END IF;

  IF OLD.transmuted_grade IS DISTINCT FROM NEW.transmuted_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'transmuted_grade', OLD.transmuted_grade::TEXT, NEW.transmuted_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), v_actor, inet_client_addr()
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'status', OLD.status::TEXT, NEW.status::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), v_actor, inet_client_addr()
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_release_grades_after_evaluation(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_completed BOOLEAN;
  v_grade_count  INTEGER;
  v_student_user_id UUID;
  v_course_code TEXT;
  v_eval_period_id UUID;
  v_student_id UUID;
BEGIN
  SELECT fn_check_evaluation_completion(p_enrollment_id, p_grading_period_id)
  INTO v_is_completed;

  IF NOT v_is_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Evaluation not yet completed for this grading period.'
    );
  END IF;

  UPDATE public.enrollments
  SET is_grade_visible = true
  WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

  -- With term-scope evaluation one evaluation unlocks every period of the term, so
  -- release every Approved period that shares this evaluation, not only this one.
  -- A period with a future release date keeps waiting for it (the sweep releases it),
  -- and a dropped student's grades are never released.
  v_eval_period_id := public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id);

  UPDATE public.section_final_grades sfg
  SET status = 'Released', released_at = now()
  FROM public.grading_periods gp, public.enrollments e
  WHERE gp.id = sfg.grading_period_id
    AND e.id = sfg.enrollment_id
    AND e.status NOT IN ('Dropped', 'Withdrawn')
    AND sfg.enrollment_id = p_enrollment_id
    AND (
        sfg.grading_period_id = p_grading_period_id
        OR public.fn_resolve_evaluation_period(sfg.enrollment_id, sfg.grading_period_id) = v_eval_period_id
    )
    AND (gp.release_at IS NULL OR gp.release_at <= now())
    AND sfg.status = 'Approved'
    AND sfg.deleted_at IS NULL;

  GET DIAGNOSTICS v_grade_count = ROW_COUNT;

  -- Notify the student that grades are now unlocked
  SELECT st.user_id, c.code, st.id
  INTO v_student_user_id, v_course_code, v_student_id
  FROM public.enrollments e
  JOIN public.students st ON st.id = e.student_id
  JOIN public.sections s ON s.id = e.section_id
  LEFT JOIN public.courses c ON c.id = s.course_id
  WHERE e.id = p_enrollment_id;

  IF v_student_user_id IS NOT NULL AND v_grade_count > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
      v_student_user_id,
      'Grades Unlocked',
      format('Evaluation completed! Your %s grades are now unlocked and viewable.', COALESCE(v_course_code, 'course')),
      '/student/grade',
      'Grade'::public.notification_category_type
    );
  END IF;

  -- A fully released course can finish a year level
  IF v_student_id IS NOT NULL AND v_grade_count > 0 THEN
    PERFORM public.fn_sync_student_year_level(v_student_id);
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Grades released successfully.',
    'rows_updated', v_grade_count
  );
END;
$function$;

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
    v_awaiting INTEGER := 0;
    v_flagged  INTEGER := 0;
    v_released_enrollments UUID[] := ARRAY[]::UUID[];
    v_student_rec RECORD;
BEGIN
    SELECT
        COUNT(*) FILTER (WHERE sfg.status = 'Draft'),
        COUNT(*) FILTER (WHERE sfg.status = 'Submitted')
    INTO v_drafts, v_awaiting
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn');

    -- Sections with an unresolved special grade flag wait, as Approve & Release does
    SELECT COUNT(*) INTO v_flagged
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            = 'Approved'
      AND e.status NOT IN ('Dropped', 'Withdrawn')
      AND EXISTS (
          SELECT 1
          FROM public.special_grade_flags f
          INNER JOIN public.enrollments fe ON fe.id = f.enrollment_id AND fe.deleted_at IS NULL
          WHERE fe.section_id        = e.section_id
            AND f.grading_period_id  = p_grading_period_id
            AND f.status             = 'Pending'
            AND f.deleted_at         IS NULL
      );

    -- Registrar review is mandatory: only grades the Registrar Approved are released.
    -- Drafts and Submitted grades are never touched, and dropped students are skipped.
    FOR v_grade IN
        SELECT sfg.id, sfg.enrollment_id
        FROM public.section_final_grades sfg
        INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
        WHERE sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at        IS NULL
          AND sfg.status            = 'Approved'
          AND e.status NOT IN ('Dropped', 'Withdrawn')
          AND NOT EXISTS (
              SELECT 1
              FROM public.special_grade_flags f
              INNER JOIN public.enrollments fe ON fe.id = f.enrollment_id AND fe.deleted_at IS NULL
              WHERE fe.section_id        = e.section_id
                AND f.grading_period_id  = p_grading_period_id
                AND f.status             = 'Pending'
                AND f.deleted_at         IS NULL
          )
    LOOP
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
            v_released_enrollments := v_released_enrollments || v_grade.enrollment_id;
        ELSE
            v_blocked := v_blocked + 1;
        END IF;
    END LOOP;

    IF v_released > 0 THEN
        -- Tell each student whose grade was just released, once per section
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        SELECT DISTINCT
            st.user_id,
            'Grades Released',
            format('Grades for %s (%s) have been officially approved and released.',
                COALESCE(c.code, 'your course'), COALESCE(s.section_code, 'Section')),
            '/student/grade',
            'Grade'::public.notification_category_type
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id
        LEFT JOIN public.courses c ON c.id = s.course_id
        WHERE e.id = ANY (v_released_enrollments)
          AND st.user_id IS NOT NULL;

        -- A fully released course can finish a year level
        FOR v_student_rec IN
            SELECT DISTINCT e.student_id
            FROM public.enrollments e
            WHERE e.id = ANY (v_released_enrollments)
        LOOP
            PERFORM public.fn_sync_student_year_level(v_student_rec.student_id);
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'approved',              v_approved,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked,
        'blocked_by_flags',      v_flagged,
        'awaiting_approval',     v_awaiting,
        'skipped_drafts',        v_drafts
    );
END;
$function$;

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
        'awaiting_approval',     v_outcome ->> 'awaiting_approval',
        'blocked_by_flags',      v_outcome ->> 'blocked_by_flags',
        'message',               format(
            '%s approved grade(s) released. %s still blocked by pending evaluations. %s in sections with an unresolved special grade flag. %s submitted grade(s) still need Registrar approval. %s faculty draft(s) skipped (not yet submitted).',
            v_outcome ->> 'released',
            v_outcome ->> 'blocked_by_evaluation',
            v_outcome ->> 'blocked_by_flags',
            v_outcome ->> 'awaiting_approval',
            v_outcome ->> 'skipped_drafts'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(p_section_id uuid, p_grading_period_id uuid)
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
  v_release_at             TIMESTAMPTZ;
  v_scheduled_count        INTEGER := 0;
  v_released_enrollments   UUID[] := ARRAY[]::UUID[];
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

  -- A scheduled release date is respected: grades are approved now and released by the
  -- scheduled sweep once the date arrives
  SELECT gp.release_at INTO v_release_at
  FROM public.grading_periods gp
  WHERE gp.id = p_grading_period_id;

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
        AND e.status NOT IN ('Dropped', 'Withdrawn')
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
          AND e.status NOT IN ('Dropped', 'Withdrawn')
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

    IF v_release_at IS NOT NULL AND v_release_at > now() THEN
      v_scheduled_count := v_scheduled_count + 1;
    ELSIF fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
      UPDATE public.section_final_grades
      SET status = 'Released', released_at = now()
      WHERE id = v_grade.id;

      v_released_count := v_released_count + 1;
      v_released_enrollments := v_released_enrollments || v_grade.enrollment_id;
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
    WHERE e.id = ANY (v_released_enrollments)
      AND st.user_id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'approved_count', v_approved_count,
    'released_count', v_released_count,
    'eval_blocked',   v_eval_blocked,
    'draft_count',    v_draft_count,
    'scheduled_count', v_scheduled_count,
    'message',        'Grades approved. '
                   || CASE WHEN v_scheduled_count > 0
                           THEN v_scheduled_count || ' will be released on the scheduled date ('
                                || to_char(v_release_at AT TIME ZONE 'Asia/Manila', 'Mon DD, YYYY HH12:MI AM') || ').'
                           ELSE v_released_count || ' released immediately; '
                                || v_eval_blocked || ' pending student evaluation completion.'
                      END
                   || CASE WHEN v_draft_count > 0
                           THEN ' ' || v_draft_count || ' faculty draft(s) were skipped.'
                           ELSE '' END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_grade_release_schedule(p_term_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'grading_period_id',   gp.id,
                'grading_period_name', gp.name,
                'sequence',            gp.sequence,
                'start_date',          gp.start_date,
                'end_date',            gp.end_date,
                'release_at',          gp.release_at,
                'total_grades',        stats.total_grades,
                'released_count',      stats.released_count,
                'approved_count',      stats.approved_count,
                'draft_count',         stats.draft_count,
                'blocked_count',       stats.blocked_count
            ) ORDER BY gp.sequence ASC
        )
        FROM public.grading_periods gp
        LEFT JOIN LATERAL (
            SELECT
                COUNT(sfg.id)                                                    AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Released')             AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Approved')             AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Draft')                AS draft_count,
                -- Students whose submitted or approved grade waits for their evaluation;
                -- faculty drafts are not waiting on the student
                COUNT(DISTINCT sfg.enrollment_id) FILTER (
                    WHERE sfg.status IN ('Submitted', 'Approved')
                      AND NOT public.fn_check_evaluation_completion(sfg.enrollment_id, gp.id)
                )                                                                AS blocked_count
            FROM public.section_final_grades sfg
            WHERE sfg.grading_period_id = gp.id
              AND sfg.deleted_at        IS NULL
        ) stats ON true
        WHERE gp.term_id    = p_term_id
          AND gp.deleted_at IS NULL
    ), '[]'::jsonb);
END;
$function$;

COMMIT;
