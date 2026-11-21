-- ====================================================================
-- Migration: 20261121200200_grade_encoding_window.sql
-- Audit 2026-11-21, policy 8: grade encoding dates are enforced by the database for
-- faculty, not only hidden in the UI. Registrar and Admin can still act outside the window.
--   * fn_grade_encoding_problem (new, internal): NULL when the caller may encode grades for
--     the period today (Manila date), otherwise the reason. Like the faculty grade sheet, the
--     window only applies when both the start and the end date are set.
--   * fn_calculate_all_grades_for_period, fn_submit_section_grades,
--     fn_set_enrollment_special_grade: return {success:false,message} outside the window.
-- Every function below is the live definition with only this check added.
-- Idempotent: CREATE OR REPLACE only, same signatures and return shapes.
-- ====================================================================
BEGIN;

-- fn_grade_encoding_problem (internal helper)
CREATE OR REPLACE FUNCTION public.fn_grade_encoding_problem(p_grading_period_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_name  TEXT;
    v_start DATE;
    v_end   DATE;
    v_today DATE := (now() AT TIME ZONE 'Asia/Manila')::date;
BEGIN
    IF public.fn_current_user_role_codes() && ARRAY['Registrar', 'Admin'] THEN
        RETURN NULL;
    END IF;

    SELECT gp.name, gp.grade_encoding_start_date, gp.grade_encoding_end_date
    INTO v_name, v_start, v_end
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id;

    IF v_start IS NULL OR v_end IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_today < v_start THEN
        RETURN format('Grade encoding for %s opens on %s.', COALESCE(v_name, 'this period'), to_char(v_start, 'FMMonth FMDD, YYYY'));
    END IF;

    IF v_today > v_end THEN
        RETURN format('Grade encoding for %s closed on %s. Ask the Registrar for help with late grades.', COALESCE(v_name, 'this period'), to_char(v_end, 'FMMonth FMDD, YYYY'));
    END IF;

    RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_grade_encoding_problem(uuid) FROM PUBLIC, anon, authenticated;

-- fn_calculate_all_grades_for_period: encoding window
CREATE OR REPLACE FUNCTION public.fn_calculate_all_grades_for_period(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_window_problem  TEXT;
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

    -- Policy 8: faculty encode grades only inside the period's encoding window
    v_window_problem := public.fn_grade_encoding_problem(p_grading_period_id);
    IF v_window_problem IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_window_problem);
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
$function$;

-- fn_submit_section_grades: encoding window
CREATE OR REPLACE FUNCTION public.fn_submit_section_grades(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_missing INTEGER := 0;
  v_course_code TEXT;
  v_section_code TEXT;
  v_period_name TEXT;
  v_faculty_name TEXT;
  v_window_problem TEXT;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    -- Policy 8: faculty submit grades only inside the period's encoding window
    v_window_problem := public.fn_grade_encoding_problem(p_grading_period_id);
    IF v_window_problem IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_window_problem);
    END IF;

    SELECT c.code, s.section_code
    INTO v_course_code, v_section_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id;

    SELECT u.first_name || ' ' || u.last_name INTO v_faculty_name
    FROM public.users u
    WHERE u.id = auth.uid();

    -- Every enrolled student needs a calculated grade before anything is sent to the Registrar
    SELECT COUNT(*) INTO v_missing
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.section_id = p_section_id
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.section_final_grades sfg
          WHERE sfg.enrollment_id = e.id
            AND sfg.grading_period_id = p_grading_period_id
            AND sfg.deleted_at IS NULL
      );

    IF v_missing > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', v_missing || ' enrolled student(s) have no calculated grade for this period yet. Click "Calculate" first, then submit.'
        );
    END IF;

    -- Only Draft rows move; Submitted, Approved and Released rows keep their status
    WITH moved AS (
        UPDATE public.section_final_grades sfg
        SET status = 'Submitted'::public.grade_status_type,
            updated_at = now(),
            updated_by = auth.uid()
        FROM public.enrollments e
        WHERE e.id = sfg.enrollment_id
          AND e.section_id = p_section_id
          AND sfg.grading_period_id = p_grading_period_id
          AND sfg.status = 'Draft'
          AND sfg.deleted_at IS NULL
        RETURNING sfg.id
    )
    SELECT COUNT(*) INTO v_count FROM moved;

    IF v_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'There are no Draft grades to submit. Grades for this period are already submitted.'
        );
    END IF;

    -- Notify all active Registrars in real time
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        u.id,
        'Grade Submission for Review',
        format('%s submitted %s grades for %s (%s) - %s student(s).',
            COALESCE(v_faculty_name, 'Faculty'),
            COALESCE(v_period_name, 'Period'),
            COALESCE(v_course_code, 'Course'),
            COALESCE(v_section_code, 'Section'),
            v_count
        ),
        '/registrar/grade-release',
        'Grade'::public.notification_category_type
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL AND u.status = 'Active' AND r.code = 'Registrar';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Officially submitted ' || v_count || ' student grade(s) to the Registrar.',
        'submitted_count', v_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- fn_set_enrollment_special_grade: encoding window
CREATE OR REPLACE FUNCTION public.fn_set_enrollment_special_grade(p_enrollment_id uuid, p_grading_period_id uuid, p_special_grade text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id     UUID;
    v_grade_id       UUID;
    v_grade_status   TEXT;
    v_old_special    TEXT;
    v_clean_code     TEXT;
    v_window_problem TEXT;
BEGIN
    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    PERFORM public.fn_assert_section_staff(v_section_id);

    -- Policy 8: faculty set special grades only inside the period's encoding window
    v_window_problem := public.fn_grade_encoding_problem(p_grading_period_id);
    IF v_window_problem IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', v_window_problem);
    END IF;

    v_clean_code := NULLIF(btrim(COALESCE(p_special_grade, '')), '');

    SELECT sfg.id, sfg.status::TEXT, sfg.special_grade
    INTO v_grade_id, v_grade_status, v_old_special
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id     = p_enrollment_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL;

    IF v_grade_id IS NOT NULL AND v_grade_status <> 'Draft' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Grades for this period are already ' || v_grade_status || ' and locked.'
        );
    END IF;

    IF v_grade_id IS NULL THEN
        IF v_clean_code IS NOT NULL THEN
            INSERT INTO public.section_final_grades (
                enrollment_id, grading_period_id, raw_grade, final_grade,
                special_grade, status, remarks, created_by
            ) VALUES (
                p_enrollment_id, p_grading_period_id, 0, 0,
                v_clean_code, 'Draft', 'Special grade assigned by faculty', auth.uid()
            )
            RETURNING id INTO v_grade_id;
        END IF;
    ELSE
        UPDATE public.section_final_grades
        SET special_grade = v_clean_code,
            updated_by    = auth.uid()
        WHERE id = v_grade_id;
    END IF;

    IF v_grade_id IS NOT NULL THEN
        INSERT INTO public.grade_audit_logs (
            action, table_name, record_id, enrollment_id, grading_period_id,
            field_changed, old_value, new_value, change_reason, changed_by, ip_address
        ) VALUES (
            'Update', 'section_final_grades', v_grade_id,
            p_enrollment_id, p_grading_period_id,
            'special_grade', v_old_special, v_clean_code,
            COALESCE('Faculty updated special grade to ' || v_clean_code, 'Cleared special grade'),
            auth.uid(), inet_client_addr()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN v_clean_code IS NOT NULL THEN 'Special grade set to ' || v_clean_code || '.' ELSE 'Special grade cleared.' END,
        'special_grade', v_clean_code
    );
END;
$function$;

COMMIT;
