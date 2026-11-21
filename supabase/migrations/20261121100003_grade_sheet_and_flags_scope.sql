-- ====================================================================
-- Migration: 20261121100003_grade_sheet_and_flags_scope.sql
-- Audit 2026-11-21 (BUG-AUDIT-20261121.md):
--   #12 (narrowed) fn_calculate_all_grades_for_period, fn_submit_section_grades: include the
--       students the grade sheet lists (every status except Dropped/Withdrawn), so a grading
--       period added to a term with finalized outcomes can be calculated and submitted
--   #13 fn_detect_special_grade_flags_core: skip students whose grade for the period already
--       left Draft, so the hourly sweep no longer blocks approval of finished periods
-- Bodies are based on the live definitions read on 2026-11-21. Idempotent (CREATE OR REPLACE).
-- ====================================================================
BEGIN;

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
      -- Same students as the grade sheet: a finalized outcome (Completed, Failed,
      -- Incomplete) still needs a grade for a period added later
      AND e.status NOT IN ('Dropped', 'Withdrawn')
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
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

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
      -- Same students as the grade sheet and Calculate
      AND e.status NOT IN ('Dropped', 'Withdrawn')
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

CREATE OR REPLACE FUNCTION public.fn_detect_special_grade_flags_core(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_enrollment_ids  UUID[];
    v_overrides       JSONB;
    v_sig             RECORD;
    v_rule            RECORD;
    v_conditions      JSONB;
    v_matched         BOOLEAN;
    v_evidence        JSONB;
    v_existing_id     UUID;
    v_existing_status TEXT;
    v_created         INTEGER := 0;
    v_refreshed       INTEGER := 0;
    v_superseded      INTEGER := 0;
BEGIN
    SELECT array_agg(e.id)
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.status     = 'Enrolled'
      AND e.deleted_at IS NULL
      -- A grade that left Draft (Submitted, Approved, Released) is done for this period:
      -- no new or refreshed flag may block its approval
      AND NOT EXISTS (
          SELECT 1
          FROM public.section_final_grades sfg
          WHERE sfg.enrollment_id     = e.id
            AND sfg.grading_period_id = p_grading_period_id
            AND sfg.status            <> 'Draft'
            AND sfg.deleted_at        IS NULL
      );

    IF v_enrollment_ids IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'created', 0, 'refreshed', 0, 'superseded', 0
        );
    END IF;

    v_overrides := public.fn_section_special_grade_override_map(p_section_id);

    FOR v_sig IN
        SELECT * FROM public.fn_special_grade_signals(v_enrollment_ids)
    LOOP
        FOR v_rule IN
            SELECT sgc.*
            FROM public.special_grade_configs sgc
            WHERE sgc.deleted_at IS NULL
              AND sgc.is_active
              AND sgc.is_auto_detected
              AND sgc.school_year_id = public.fn_section_school_year_id(p_section_id)
            ORDER BY sgc.priority ASC, sgc.code ASC
        LOOP
            v_conditions := public.fn_apply_special_grade_overrides(
                v_rule.conditions,
                COALESCE(v_overrides->(v_rule.id::TEXT), '{}'::jsonb)
            );

            v_matched := public.fn_eval_special_grade_condition(v_conditions, v_sig.signals);

            SELECT f.id, f.status::TEXT
            INTO v_existing_id, v_existing_status
            FROM public.special_grade_flags f
            WHERE f.enrollment_id           = v_sig.enrollment_id
              AND f.grading_period_id       = p_grading_period_id
              AND f.special_grade_config_id = v_rule.id
              AND f.deleted_at              IS NULL;

            IF v_matched THEN
                v_evidence := public.fn_special_grade_evidence(v_conditions, v_sig.signals);

                IF v_existing_id IS NULL THEN
                    INSERT INTO public.special_grade_flags (
                        special_grade_config_id, enrollment_id, grading_period_id,
                        status, rule_version, rule_snapshot, evidence
                    ) VALUES (
                        v_rule.id, v_sig.enrollment_id, p_grading_period_id,
                        'Pending', v_rule.rule_version,
                        jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        v_evidence
                    );
                    v_created := v_created + 1;

                ELSIF v_existing_status IN ('Pending', 'Superseded') THEN
                    UPDATE public.special_grade_flags
                    SET status        = 'Pending',
                        rule_version  = v_rule.rule_version,
                        rule_snapshot = jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        evidence      = v_evidence,
                        detected_at   = now()
                    WHERE id = v_existing_id;
                    v_refreshed := v_refreshed + 1;
                END IF;

            ELSIF v_existing_id IS NOT NULL AND v_existing_status = 'Pending' THEN
                UPDATE public.special_grade_flags
                SET status = 'Superseded'
                WHERE id = v_existing_id;
                v_superseded := v_superseded + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success',    true,
        'created',    v_created,
        'refreshed',  v_refreshed,
        'superseded', v_superseded
    );
END;
$function$;

COMMIT;
