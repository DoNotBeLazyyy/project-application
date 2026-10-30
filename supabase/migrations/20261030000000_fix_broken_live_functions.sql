-- ====================================================================
-- Migration: 20261030000000_fix_broken_live_functions.sql
-- Fixes live functions that failed at runtime (found with plpgsql_check
-- against production) plus timed-assessment grading gaps:
--   * fn_bulk_create_courses      course CSV import (bad column names, response key)
--   * fn_update_course            prerequisite columns / enum cast
--   * fn_get_calendar_*           referenced departments.dean_id (failed for every role)
--   * fn_get_academic_year_history bad term/transmutation columns, lost {success,data},
--                                 empty snapshot arrays fell back to live data
--   * fn_approve_staff_profile_request  users.bio does not exist
--   * fn_credit_student_course    courses.units / audit_logs columns
--   * fn_save_special_grade_configs overrides have no is_active
--   * fn_get_grade_report         nested aggregate
--   * fn_create_my_student_profile missing from live DB
--   * fn_submit_assessment / fn_start_assessment_timer / fn_sweep_expired_assessment_sessions
--     expired timed attempts were rejected or never graded; Fill in the Blank was auto-scored 0
-- Rollback: supabase/rollback/20261030000000_fix_broken_live_functions.down.sql
-- ====================================================================
BEGIN;

-- fn_autograde_submission (new)
-- Shared by the timer-expiry paths, which previously moved attempts to
-- 'Submitted' without scoring them. Fills unanswered questions with 0 points
-- and, when every question is choice-based, marks the attempt Graded.
CREATE OR REPLACE FUNCTION public.fn_autograde_submission(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_assessment_id UUID;
    v_has_manual BOOLEAN;
    v_score NUMERIC;
BEGIN
    SELECT assessment_item_id INTO v_assessment_id
    FROM public.assessment_submissions
    WHERE id = p_submission_id AND deleted_at IS NULL;

    IF v_assessment_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.student_answers (submission_id, question_id, answer_text, choice_id, is_correct, points_earned)
    SELECT p_submission_id, aq.id, NULL, NULL, false, 0
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = v_assessment_id
      AND aq.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.student_answers sa
          WHERE sa.submission_id = p_submission_id AND sa.question_id = aq.id
      );

    SELECT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = v_assessment_id
          AND aq.deleted_at IS NULL
          AND aq.question_type NOT IN ('Multiple Choice', 'True or False', 'Matching')
    ) INTO v_has_manual;

    IF v_has_manual THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(points_earned), 0) INTO v_score
    FROM public.student_answers
    WHERE submission_id = p_submission_id AND deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET status = 'Graded',
        raw_score = v_score,
        final_score = v_score,
        graded_at = now(),
        feedback = COALESCE(feedback, 'Auto-graded when the time limit expired.'),
        updated_at = now()
    WHERE id = p_submission_id
      AND status = 'Submitted';
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_autograde_submission(uuid) FROM PUBLIC, anon, authenticated;

-- fn_approve_staff_profile_request
CREATE OR REPLACE FUNCTION public.fn_approve_staff_profile_request(p_request_id uuid, p_edited_changes jsonb DEFAULT NULL::jsonb, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_req RECORD;
    v_admin_id UUID := auth.uid();
    v_effective_changes JSONB;
    v_is_edited BOOLEAN := false;
    v_status TEXT := 'Approved';
    v_date_of_birth DATE := NULL;
    v_target_role TEXT;
    v_profile_url TEXT := '/profile';
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT req.*, 
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS user_name,
           u.email AS user_email
    INTO v_req
    FROM public.staff_profile_change_requests req
    INNER JOIN public.users u ON u.id = req.user_id
    WHERE req.id = p_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile change request not found.');
    END IF;

    IF v_req.status <> 'Pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This request has already been processed (status: ' || v_req.status || ').');
    END IF;

    IF p_edited_changes IS NOT NULL AND p_edited_changes <> '{}'::jsonb AND p_edited_changes <> v_req.requested_changes THEN
        v_effective_changes := p_edited_changes;
        v_is_edited := true;
        v_status := 'Approved with Edits';
    ELSE
        v_effective_changes := v_req.requested_changes;
        v_is_edited := false;
        v_status := 'Approved';
    END IF;

    -- Safe date parsing
    IF (v_effective_changes->>'date_of_birth') IS NOT NULL AND btrim(v_effective_changes->>'date_of_birth') <> '' THEN
        BEGIN
            v_date_of_birth := (v_effective_changes->>'date_of_birth')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_date_of_birth := NULL;
        END;
    ELSE
        v_date_of_birth := NULL;
    END IF;

    -- Apply approved user fields to public.users
    UPDATE public.users
    SET first_name = COALESCE(NULLIF(btrim(v_effective_changes->>'first_name'), ''), first_name),
        middle_name = NULLIF(btrim(COALESCE(v_effective_changes->>'middle_name', '')), ''),
        last_name = COALESCE(NULLIF(btrim(v_effective_changes->>'last_name'), ''), last_name),
        suffix = NULLIF(btrim(COALESCE(v_effective_changes->>'suffix', '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(v_effective_changes->>'preferred_name', '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(v_effective_changes->>'mobile_number', '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line1', '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(v_effective_changes->>'address_line2', '')), ''),
        city = NULLIF(btrim(COALESCE(v_effective_changes->>'city', '')), ''),
        province = NULLIF(btrim(COALESCE(v_effective_changes->>'province', '')), ''),
        postal_code = NULLIF(btrim(COALESCE(v_effective_changes->>'postal_code', '')), ''),
        date_of_birth = COALESCE(v_date_of_birth, date_of_birth),
        gender = CASE 
            WHEN (v_effective_changes->>'gender') IN ('Male', 'Female', 'Prefer not to say') 
            THEN (v_effective_changes->>'gender')::public.gender_type 
            ELSE gender 
        END,
        civil_status = CASE 
            WHEN (v_effective_changes->>'civil_status') IN ('Single', 'Married', 'Widowed', 'Separated') 
            THEN (v_effective_changes->>'civil_status')::public.civil_status_type 
            ELSE civil_status 
        END,
        nationality = NULLIF(btrim(COALESCE(v_effective_changes->>'nationality', '')), ''),
        profile_completed = true,
        updated_at = now()
    WHERE id = v_req.user_id;

    -- Update request record
    UPDATE public.staff_profile_change_requests
    SET status = v_status,
        approved_changes = v_effective_changes,
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes,
        updated_at = now()
    WHERE id = p_request_id;

    -- Determine role-scoped profile route for notification action URL
    SELECT r.code INTO v_target_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_req.user_id
    ORDER BY CASE 
        WHEN r.code = 'Dean' THEN 1
        WHEN r.code = 'Faculty' THEN 2
        WHEN r.code = 'Registrar' THEN 3
        WHEN r.code = 'Admin' THEN 4
        ELSE 5
    END
    LIMIT 1;

    IF v_target_role = 'Dean' THEN
        v_profile_url := '/dean/profile';
    ELSIF v_target_role = 'Faculty' THEN
        v_profile_url := '/faculty/profile';
    ELSIF v_target_role = 'Registrar' THEN
        v_profile_url := '/registrar/profile';
    ELSE
        v_profile_url := '/admin/profile';
    END IF;

    -- Notify staff member
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url,
        created_by
    ) VALUES (
        v_req.user_id,
        'Profile Changes Approved',
        CASE 
            WHEN v_is_edited THEN 'Your profile changes were approved with modifications by the Administrator.'
            ELSE 'Your profile changes have been verified and approved by the Administrator.'
        END,
        'Account'::public.notification_category_type,
        v_profile_url,
        v_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', v_status,
        'message', 'Staff profile request successfully approved.'
    );
END;
$function$;

-- fn_credit_student_course
CREATE OR REPLACE FUNCTION public.fn_credit_student_course(p_student_id uuid, p_course_id uuid, p_previous_school text, p_previous_course_code text DEFAULT NULL::text, p_previous_course_title text DEFAULT NULL::text, p_grade_display text DEFAULT 'Passed'::text, p_grade_numeric numeric DEFAULT NULL::numeric, p_units_credited numeric DEFAULT NULL::numeric, p_remarks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id     UUID;
    v_caller_name   TEXT;
    v_roles         TEXT[];
    v_user_id       UUID;
    v_student_num   TEXT;
    v_student_name  TEXT;
    v_course_code   TEXT;
    v_course_title  TEXT;
    v_default_units NUMERIC;
    v_final_units   NUMERIC;
    v_inserted_id   UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You must be logged in.');
    END IF;

    SELECT array_agg(r.code) INTO v_roles
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = v_caller_id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL;

    IF NOT ('Registrar' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Only Registrar or Admin can credit courses.');
    END IF;

    SELECT first_name || ' ' || last_name INTO v_caller_name
    FROM public.users WHERE id = v_caller_id;

    SELECT st.user_id, st.student_number, u.first_name || ' ' || u.last_name
    INTO v_user_id, v_student_num, v_student_name
    FROM public.students st
    JOIN public.users u ON u.id = st.user_id
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT code, title, total_units
    INTO v_course_code, v_course_title, v_default_units
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_course_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found.');
    END IF;

    IF p_previous_school IS NULL OR trim(p_previous_school) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Previous school/institution name is required.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.student_credited_courses
        WHERE student_id = p_student_id AND course_id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course ' || v_course_code || ' is already credited for this student.');
    END IF;

    v_final_units := COALESCE(p_units_credited, v_default_units, 3.0);

    INSERT INTO public.student_credited_courses (
        student_id, course_id, previous_school, previous_course_code, previous_course_title,
        grade_display, grade_numeric, units_credited, remarks, credited_by
    ) VALUES (
        p_student_id, p_course_id, trim(p_previous_school),
        NULLIF(trim(p_previous_course_code), ''), NULLIF(trim(p_previous_course_title), ''),
        COALESCE(NULLIF(trim(p_grade_display), ''), 'Passed'), p_grade_numeric,
        v_final_units, NULLIF(trim(p_remarks), ''), v_caller_id
    )
    RETURNING id INTO v_inserted_id;

    -- Audit Log
    INSERT INTO public.audit_logs (changed_by, changed_by_name, action, event_name, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id, v_caller_name, 'INSERT', 'COURSE_CREDITED', 'student_credited_courses', v_inserted_id::text,
        NULL,
        jsonb_build_object(
            'student_id', p_student_id, 'student_number', v_student_num, 'student_name', v_student_name,
            'course_id', p_course_id, 'course_code', v_course_code, 'course_title', v_course_title,
            'previous_school', p_previous_school, 'units_credited', v_final_units, 'credited_by_name', v_caller_name
        )
    );

    -- Notify the student in real time
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
        v_user_id,
        'Course Credited',
        format('Course %s (%s) has been credited from %s.', v_course_code, v_course_title, trim(p_previous_school)),
        '/student/curriculum',
        'Account'::public.notification_category_type
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Course ' || v_course_code || ' credited successfully.',
        'credited_course_id', v_inserted_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- fn_save_special_grade_configs
CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_config JSONB;
    v_id UUID;
    v_code TEXT;
    v_label TEXT;
    v_description TEXT;
    v_conditions JSONB;
    v_allows BOOLEAN;
    v_prev JSONB;
    v_count INT := 0;
    v_seq INT := 1;
    v_auto_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_configs IS NULL OR jsonb_typeof(p_configs) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Expected an array of configs');
    END IF;

    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        v_id := NULLIF(v_config->>'id', '')::UUID;
        v_code := btrim(COALESCE(v_config->>'code', ''));
        v_label := btrim(COALESCE(v_config->>'label', ''));
        v_description := NULLIF(btrim(COALESCE(v_config->>'description', '')), '');
        v_conditions := COALESCE(v_config->'conditions', '{"all": []}'::JSONB);
        v_allows := COALESCE((v_config->>'allows_section_override')::BOOLEAN, false);

        IF v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grade label is required.');
        END IF;

        IF v_description IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grade description is required.');
        END IF;

        IF v_code = '' THEN
            v_auto_code := public.fn_generate_acronym(v_label, 'SPG');
        ELSE
            v_auto_code := v_code;
        END IF;

        -- Uniqueness checks
        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(code) = lower(v_auto_code)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            v_seq := 2;
            WHILE EXISTS (
                SELECT 1 FROM public.special_grade_configs
                WHERE lower(code) = lower(v_auto_code || '-' || v_seq::text)
                AND deleted_at IS NULL
                AND (v_id IS NULL OR id <> v_id)
            ) LOOP
                v_seq := v_seq + 1;
            END LOOP;
            v_auto_code := v_auto_code || '-' || v_seq::text;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(label) = lower(v_label)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with label "' || v_label || '" already exists.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(description) = lower(v_description)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with description "' || v_description || '" already exists.');
        END IF;

        IF v_id IS NOT NULL THEN
            SELECT conditions INTO v_prev
            FROM public.special_grade_configs
            WHERE id = v_id AND deleted_at IS NULL;

            UPDATE public.special_grade_configs
            SET
                code = v_auto_code,
                label = v_label,
                description = v_description,
                min_absence_percentage = (v_config->>'min_absence_percentage')::NUMERIC,
                requires_completion = (v_config->>'requires_completion')::BOOLEAN,
                completion_deadline_days = (v_config->>'completion_deadline_days')::SMALLINT,
                is_passing = (v_config->>'is_passing')::BOOLEAN,
                is_active = (v_config->>'is_active')::BOOLEAN,
                conditions = v_conditions,
                priority = COALESCE((v_config->>'priority')::SMALLINT, 100),
                is_auto_detected = COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                allows_section_override = v_allows,
                rule_version = CASE
                    WHEN v_prev IS DISTINCT FROM v_conditions THEN rule_version + 1
                    ELSE rule_version
                END,
                updated_at = now(),
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;

            IF v_allows = false THEN
                -- Overrides have no is_active flag; retire them via soft delete
                UPDATE public.special_grade_section_overrides o
                SET deleted_at = now(), deleted_by = auth.uid(), updated_at = now(), updated_by = auth.uid()
                WHERE o.special_grade_config_id = v_id
                AND o.deleted_at IS NULL;
            END IF;
        ELSE
            INSERT INTO public.special_grade_configs (
                code,
                label,
                description,
                min_absence_percentage,
                requires_completion,
                completion_deadline_days,
                is_passing,
                is_active,
                conditions,
                priority,
                is_auto_detected,
                allows_section_override,
                created_by
            )
            VALUES (
                v_auto_code,
                v_label,
                v_description,
                (v_config->>'min_absence_percentage')::NUMERIC,
                (v_config->>'requires_completion')::BOOLEAN,
                (v_config->>'completion_deadline_days')::SMALLINT,
                (v_config->>'is_passing')::BOOLEAN,
                (v_config->>'is_active')::BOOLEAN,
                v_conditions,
                COALESCE((v_config->>'priority')::SMALLINT, 100),
                COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                v_allows,
                auth.uid()
            );
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully', 'count', v_count);
END;
$function$;

-- fn_get_calendar_section_schedules
CREATE OR REPLACE FUNCTION public.fn_get_calendar_section_schedules()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[] := public.fn_current_user_role_codes();
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'section_id', s.id,
        'section_code', s.section_code,
        'course_code', c.code,
        'course_title', c.title,
        'faculty_name', TRIM(u.first_name || ' ' || u.last_name),
        'room', COALESCE(sch.room, s.room),
        'day_of_week', sch.day_of_week::text,
        'time_start', sch.time_start::text,
        'time_end', sch.time_end::text
    )), '[]'::jsonb) INTO v_result
    FROM public.section_schedules sch
    JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
    JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id
    WHERE sch.deleted_at IS NULL
      AND (
          'Admin' = ANY(v_roles)
          OR ('Dean' = ANY(v_roles) AND c.department_id = public.fn_get_dean_department_id())
          OR ('Faculty' = ANY(v_roles) AND s.faculty_id = auth.uid())
          OR ('Student' = ANY(v_roles) AND EXISTS (
              SELECT 1 FROM public.enrollments e
              JOIN public.students st ON st.id = e.student_id
              WHERE e.section_id = s.id AND st.user_id = auth.uid() AND e.deleted_at IS NULL
          ))
      );

    RETURN v_result;
END;
$function$;

-- fn_get_calendar_due_activities
CREATE OR REPLACE FUNCTION public.fn_get_calendar_due_activities()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[] := public.fn_current_user_role_codes();
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ai.id,
        'title', ai.title,
        'assessment_type', ai.assessment_type,
        'due_at', ai.due_at,
        'section_id', s.id,
        'section_code', s.section_code,
        'course_code', c.code,
        'course_title', c.title
    ) ORDER BY ai.due_at ASC), '[]'::jsonb) INTO v_result
    FROM public.assessment_items ai
    JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
    JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE ai.deleted_at IS NULL
      AND ai.due_at IS NOT NULL
      AND (
          'Admin' = ANY(v_roles)
          OR ('Dean' = ANY(v_roles) AND c.department_id = public.fn_get_dean_department_id())
          OR ('Faculty' = ANY(v_roles) AND s.faculty_id = auth.uid())
      );

    RETURN v_result;
END;
$function$;

-- fn_get_grade_report
CREATE OR REPLACE FUNCTION public.fn_get_grade_report(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT jsonb_agg(
    jsonb_build_object(
      'grading_period_id',   sfg.grading_period_id,
      'grading_period_name', gp.name,
      'grading_period_seq',  gp.sequence,
      'raw_grade',           sfg.raw_grade,
      'final_grade',         sfg.final_grade,
      'transmuted_grade',    sfg.transmuted_grade,
      'status',              sfg.status,
      'remarks',             sfg.remarks,
      'approved_at',         sfg.approved_at,
      'released_at',         sfg.released_at,
      'is_grade_visible',    e.is_grade_visible,
      'components', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'component_name',   comp.name,
            'weight',           comp.weight,
            'earned_score',     comp.earned_score,
            'total_points',     comp.total_points
          )
        )
        FROM (
        SELECT gc.name, gc.weight,
               COALESCE(SUM(asub.final_score), 0) AS earned_score,
               COALESCE(SUM(ai.total_points),  0) AS total_points
        FROM public.grading_components gc
        LEFT JOIN public.assessment_items ai
          ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
        LEFT JOIN public.assessment_submissions asub
          ON asub.assessment_item_id = ai.id
          AND asub.enrollment_id     = p_enrollment_id
          AND asub.status            = 'Graded'
          AND asub.deleted_at        IS NULL
        WHERE gc.section_id        = e.section_id
          AND gc.grading_period_id = sfg.grading_period_id
          AND gc.deleted_at        IS NULL
        GROUP BY gc.id, gc.name, gc.weight
        ) comp
      )
    )
    ORDER BY gp.sequence
  )
  INTO v_result
  FROM public.section_final_grades sfg
  INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id
  INNER JOIN public.enrollments e      ON e.id  = sfg.enrollment_id
  WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.deleted_at    IS NULL
    AND gp.deleted_at     IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'grades',        COALESCE(v_result, '[]'::jsonb)
  );
END;
$function$;

-- fn_submit_assessment
CREATE OR REPLACE FUNCTION public.fn_submit_assessment(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id    UUID;
  v_assessment_id    UUID;
  v_status           submission_status_type;
  v_expires_at       TIMESTAMPTZ;
  v_due_at           TIMESTAMPTZ;
  v_is_late          BOOLEAN := false;
  v_faculty_id       UUID;
  v_section_id       UUID;
  v_assessment_title TEXT;
  v_student_name     TEXT;
  v_has_manual_questions BOOLEAN := false;
  v_total_earned_score NUMERIC := 0;
  v_question_rec     RECORD;
  v_submitted_at     TIMESTAMPTZ := now();
BEGIN
  IF NOT public.fn_owns_submission(p_submission_id) THEN
      RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
          USING ERRCODE = '42501';
  END IF;

  SELECT
    asub.enrollment_id,
    asub.assessment_item_id,
    asub.status,
    asub.time_limit_expires_at
  INTO v_enrollment_id, v_assessment_id, v_status, v_expires_at
  FROM public.assessment_submissions asub
  WHERE asub.id         = p_submission_id
    AND asub.deleted_at IS NULL;

  IF v_enrollment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission not found.');
  END IF;

  IF v_status NOT IN ('In Progress', 'Not Started') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission is not in a submittable state.');
  END IF;

  -- The client auto-submits when the timer runs out, which always lands just
  -- after v_expires_at. Finalize the attempt as of expiry instead of rejecting
  -- it, otherwise timed attempts are never graded.
  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    v_submitted_at := v_expires_at;
  END IF;

  SELECT ai.due_at, ai.title, s.id, s.faculty_id
  INTO v_due_at, v_assessment_title, v_section_id, v_faculty_id
  FROM public.assessment_items ai
  JOIN public.sections s ON s.id = ai.section_id
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND v_submitted_at > v_due_at THEN
    v_is_late := true;
  END IF;

  -- Ensure all questions have answer records in public.student_answers
  FOR v_question_rec IN
    SELECT aq.id, aq.question_type, aq.points
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = v_assessment_id AND aq.deleted_at IS NULL
  LOOP
    IF v_question_rec.question_type NOT IN ('Multiple Choice', 'True or False', 'Matching') THEN
      v_has_manual_questions := true;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.student_answers
      WHERE submission_id = p_submission_id AND question_id = v_question_rec.id
    ) THEN
      INSERT INTO public.student_answers (
        submission_id, question_id, answer_text, choice_id, is_correct, points_earned, created_by
      ) VALUES (
        p_submission_id, v_question_rec.id, NULL, NULL, false, 0, auth.uid()
      );
    END IF;
  END LOOP;

  -- If assessment consists entirely of auto-gradable questions, compute final score & mark Graded
  IF NOT v_has_manual_questions THEN
    SELECT COALESCE(SUM(points_earned), 0)
    INTO v_total_earned_score
    FROM public.student_answers
    WHERE submission_id = p_submission_id AND deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET
      status        = 'Graded',
      raw_score     = v_total_earned_score,
      final_score   = v_total_earned_score,
      graded_at     = now(),
      submitted_at  = v_submitted_at,
      is_late       = v_is_late,
      feedback      = 'Auto-graded upon submission.',
      updated_by    = auth.uid()
    WHERE id = p_submission_id;
  ELSE
    UPDATE public.assessment_submissions
    SET
      status       = 'Submitted',
      submitted_at = v_submitted_at,
      is_late      = v_is_late,
      updated_by   = auth.uid()
    WHERE id = p_submission_id;
  END IF;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted',
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  -- Notify assigned faculty member
  IF v_faculty_id IS NOT NULL THEN
    SELECT u.first_name || ' ' || u.last_name INTO v_student_name
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id
    JOIN public.users u ON u.id = st.user_id
    WHERE e.id = v_enrollment_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
      v_faculty_id,
      'Assessment Submitted',
      format('%s submitted "%s"%s.', COALESCE(v_student_name, 'A student'), v_assessment_title, CASE WHEN v_is_late THEN ' (Late)' ELSE '' END),
      format('/faculty/sections/%s/assessments/%s/submissions', v_section_id::text, v_assessment_id::text),
      'Assessment'::public.notification_category_type
    );
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'submission_id', p_submission_id,
    'submitted_at',  v_submitted_at,
    'is_late',       v_is_late,
    'is_auto_graded', NOT v_has_manual_questions,
    'score',         CASE WHEN NOT v_has_manual_questions THEN v_total_earned_score ELSE NULL END,
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$function$;

-- fn_start_assessment_timer
CREATE OR REPLACE FUNCTION public.fn_start_assessment_timer(p_enrollment_id uuid, p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_submission_id           UUID;
    v_time_limit              SMALLINT;
    v_closes_at               TIMESTAMPTZ;
    v_opens_at                TIMESTAMPTZ;
    v_attempt_number          SMALLINT;
    v_max_attempts            SMALLINT;
    v_expires_at              TIMESTAMPTZ;
    v_section_id              UUID;
    v_student_id              UUID;
    v_actual_enrollment_id    UUID;
    v_existing_submission_id  UUID;
    v_existing_expires_at     TIMESTAMPTZ;
BEGIN
    SELECT
        ai.time_limit_minutes,
        ai.closes_at,
        ai.opens_at,
        ai.max_attempts,
        ai.section_id
    INTO v_time_limit, v_closes_at, v_opens_at, v_max_attempts, v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
    AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
    AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or not published.');
    END IF;

    IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment is not yet open.');
    END IF;

    IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment window has closed.');
    END IF;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT e.id INTO v_actual_enrollment_id
    FROM public.enrollments e
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.section_id = v_section_id
    AND (v_student_id IS NULL OR e.student_id = v_student_id)
    AND e.status = 'Enrolled'
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_actual_enrollment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not enrolled in this section.');
    END IF;

    SELECT id, time_limit_expires_at
    INTO v_existing_submission_id, v_existing_expires_at
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = v_actual_enrollment_id
    AND status = 'In Progress'
    AND deleted_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_submission_id IS NOT NULL THEN
        IF v_existing_expires_at IS NOT NULL AND now() > v_existing_expires_at THEN
            UPDATE public.assessment_submissions
            SET status = 'Submitted', submitted_at = v_existing_expires_at
            WHERE id = v_existing_submission_id;

            PERFORM public.fn_autograde_submission(v_existing_submission_id);

            UPDATE public.assessment_timer_sessions
            SET status = 'Expired', last_activity_at = now()
            WHERE submission_id = v_existing_submission_id
            AND status = 'Active';
        ELSE
            RETURN jsonb_build_object(
                'success',          true,
                'submission_id',    v_existing_submission_id,
                'enrollment_id',    v_actual_enrollment_id,
                'expires_at',       v_existing_expires_at,
                'is_resumed',       true
            );
        END IF;
    END IF;

    SELECT COUNT(*)::SMALLINT
    INTO v_attempt_number
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = v_actual_enrollment_id
    AND status != 'In Progress'
    AND deleted_at IS NULL;

    IF v_attempt_number >= v_max_attempts THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Maximum attempts (%s) reached for this assessment.', v_max_attempts)
        );
    END IF;

    IF v_time_limit IS NOT NULL AND v_time_limit > 0 THEN
        v_expires_at := now() + (v_time_limit || ' minutes')::INTERVAL;
        IF v_closes_at IS NOT NULL AND v_expires_at > v_closes_at THEN
            v_expires_at := v_closes_at;
        END IF;
    ELSE
        v_expires_at := v_closes_at;
    END IF;

    INSERT INTO public.assessment_submissions (
        assessment_item_id, enrollment_id, attempt_number,
        status, started_at, time_limit_expires_at, created_by
    ) VALUES (
        p_assessment_id, v_actual_enrollment_id, v_attempt_number + 1,
        'In Progress', now(), v_expires_at, auth.uid()
    )
    RETURNING id INTO v_submission_id;

    INSERT INTO public.assessment_timer_sessions (
        submission_id, enrollment_id, assessment_item_id,
        server_started_at, server_expires_at,
        status, last_activity_at, created_by
    ) VALUES (
        v_submission_id, v_actual_enrollment_id, p_assessment_id,
        now(), v_expires_at,
        'Active', now(), auth.uid()
    );

    RETURN jsonb_build_object(
        'success',          true,
        'submission_id',    v_submission_id,
        'enrollment_id',    v_actual_enrollment_id,
        'expires_at',       v_expires_at,
        'attempt_number',   v_attempt_number + 1,
        'is_resumed',       false
    );
END;
$function$;

-- fn_sweep_expired_assessment_sessions
CREATE OR REPLACE FUNCTION public.fn_sweep_expired_assessment_sessions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_swept_count INTEGER := 0;
    v_swept_ids UUID[];
BEGIN
    WITH expired_subs AS (
        UPDATE public.assessment_submissions
        SET status = 'Submitted',
            submitted_at = time_limit_expires_at,
            updated_at = now()
        WHERE status = 'In Progress'
        AND time_limit_expires_at IS NOT NULL
        AND time_limit_expires_at < now()
        AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*), COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_swept_count, v_swept_ids FROM expired_subs;

    PERFORM public.fn_autograde_submission(sid) FROM unnest(v_swept_ids) AS sid;

    UPDATE public.assessment_timer_sessions
    SET status = 'Expired',
        updated_at = now()
    WHERE status = 'Active'
    AND server_expires_at IS NOT NULL
    AND server_expires_at < now()
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'swept_count', v_swept_count,
        'message', 'Swept expired assessment sessions.'
    );
END;
$function$;

-- fn_update_course
CREATE OR REPLACE FUNCTION public.fn_update_course(p_course_id uuid, p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb, p_course_types jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_prereq JSONB;
    v_type_count INTEGER := 0;
    v_type_elem JSONB;
    v_ct_record RECORD;
    v_sum_lec NUMERIC := 0;
    v_sum_lab NUMERIC := 0;
    v_sum_units NUMERIC := 0;
    v_sum_credit NUMERIC := 0;
    v_elem_units NUMERIC := 0;
    v_elem_credit NUMERIC := 0;
    v_elem_type_id UUID;
    v_primary_course_type_id UUID := NULL;
    v_final_code TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            v_elem_type_id := (v_type_elem->>'course_type_id')::uuid;
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = v_elem_type_id
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            IF v_primary_course_type_id IS NULL THEN
                v_primary_course_type_id := v_ct_record.id;
            END IF;

            v_elem_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_elem_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_elem_units);

            IF v_ct_record.code = 'LEC' OR v_ct_record.label ILIKE '%lecture%' THEN
                v_sum_lec := v_sum_lec + v_elem_units;
            ELSIF v_ct_record.code = 'LAB' OR v_ct_record.label ILIKE '%lab%' THEN
                v_sum_lab := v_sum_lab + v_elem_units;
            ELSE
                v_sum_lec := v_sum_lec + v_elem_units;
            END IF;

            v_sum_credit := v_sum_credit + v_elem_credit;
        END LOOP;

        v_sum_units := v_sum_lec + v_sum_lab;
    ELSE
        v_sum_lec := COALESCE(p_lecture_units, 0);
        v_sum_lab := COALESCE(p_laboratory_units, 0);
        v_sum_units := v_sum_lec + v_sum_lab;
        v_sum_credit := COALESCE(p_credit_hours, v_sum_units);
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));

    -- Update courses table including system-generated code
    UPDATE public.courses
    SET
        code = CASE WHEN v_final_code <> '' THEN v_final_code ELSE code END,
        title = p_title,
        department_id = p_department_id,
        course_type_id = COALESCE(v_primary_course_type_id, p_course_type_id, course_type_id),
        lecture_units = v_sum_lec,
        laboratory_units = v_sum_lab,
        credit_hours = v_sum_credit,
        description = NULLIF(p_description, ''),
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_course_id
    AND deleted_at IS NULL;

    -- Update course types in course_course_types
    IF v_type_count > 0 THEN
        UPDATE public.course_course_types
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE course_id = p_course_id AND deleted_at IS NULL;

        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                p_course_id,
                (v_type_elem->>'course_type_id')::uuid,
                COALESCE((v_type_elem->>'units')::numeric, 0),
                COALESCE((v_type_elem->>'credit_hours')::numeric, (v_type_elem->>'units')::numeric, 0),
                auth.uid()
            );
        END LOOP;
    END IF;

    -- Update prerequisites
    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    CONTINUE;
                END IF;
                IF (v_prereq->>'course_id')::uuid = p_course_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type, prerequisite_kind, minimum_grade, created_by
                )
                VALUES (
                    p_course_id,
                    (v_prereq->>'course_id')::uuid,
                    COALESCE(NULLIF(v_prereq->>'prerequisite_type', ''), 'Required')::public.prerequisite_type,
                    'course',
                    NULLIF(COALESCE(v_prereq->>'minimum_grade', v_prereq->>'min_grade_numeric'), '')::numeric,
                    auth.uid()
                );
            ELSIF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                    CONTINUE;
                END IF;
                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_type, prerequisite_kind, year_level_required, created_by
                )
                VALUES (
                    p_course_id,
                    COALESCE(NULLIF(v_prereq->>'prerequisite_type', ''), 'Required')::public.prerequisite_type,
                    'standing',
                    (v_prereq->>'year_level_required')::smallint,
                    auth.uid()
                );
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course updated successfully');
END;
$function$;

-- fn_bulk_create_courses
-- Restores the pre-2026-10-24 column names (prerequisite_id, minimum_grade,
-- course_types.label) and the provisioned_count key the frontend reads, keeps
-- course_course_types in sync like fn_create_course, and isolates each row in
-- its own sub-transaction so one bad row is reported instead of aborting all.
CREATE OR REPLACE FUNCTION public.fn_bulk_create_courses(p_courses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_course JSONB;
    v_course_id UUID;
    v_department_id UUID;
    v_course_type_id UUID;
    v_code TEXT;
    v_lec NUMERIC;
    v_lab NUMERIC;
    v_credit NUMERIC;
    v_is_active BOOLEAN;
    v_prereq_code TEXT;
    v_prereq_type TEXT;
    v_prereq_grade TEXT;
    v_prereq_id UUID;
    v_prereq_parts TEXT[];
    v_prereq_entry TEXT;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_course IN SELECT * FROM jsonb_array_elements(p_courses)
    LOOP
        v_row_num := v_row_num + 1;
        v_code := TRIM(COALESCE(v_course->>'code', ''));

        IF v_code = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', '', 'message', 'Code is required'));
            CONTINUE;
        END IF;

        IF TRIM(COALESCE(v_course->>'title', '')) = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Title is required'));
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE (LOWER(TRIM(code)) = LOWER(TRIM(v_course->>'department_code'))
            OR LOWER(TRIM(name)) = LOWER(TRIM(v_course->>'department_code')))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Department code not found: ' || COALESCE(NULLIF(TRIM(v_course->>'department_code'), ''), 'empty')));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_type_id
        FROM public.course_types
        WHERE (LOWER(TRIM(code)) = LOWER(TRIM(v_course->>'course_type_code'))
            OR LOWER(TRIM(label)) = LOWER(TRIM(v_course->>'course_type_code')))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_course_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Course type code not found: ' || COALESCE(NULLIF(TRIM(v_course->>'course_type_code'), ''), 'empty')));
            CONTINUE;
        END IF;

        BEGIN
            v_lec := COALESCE(NULLIF(TRIM(v_course->>'lecture_units'), '')::NUMERIC, 0);
            v_lab := COALESCE(NULLIF(TRIM(v_course->>'laboratory_units'), '')::NUMERIC, 0);
            v_credit := NULLIF(TRIM(COALESCE(v_course->>'credit_hours', '')), '')::NUMERIC;
        EXCEPTION WHEN invalid_text_representation THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Units and credit hours must be numbers'));
            CONTINUE;
        END;

        IF v_lec < 0 OR v_lec > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Lecture units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF v_lab < 0 OR v_lab > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Laboratory units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF v_lec = 0 AND v_lab = 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'At least one of lecture units or laboratory units must be greater than 0'));
            CONTINUE;
        END IF;

        v_is_active := CASE
            WHEN LOWER(TRIM(COALESCE(v_course->>'is_active', ''))) IN ('false', 'f', 'no', 'n', '0', 'inactive') THEN FALSE
            ELSE TRUE
        END;

        BEGIN
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = v_code AND deleted_at IS NULL;

            IF v_course_id IS NOT NULL THEN
                UPDATE public.courses
                SET title = TRIM(v_course->>'title'),
                    department_id = v_department_id,
                    course_type_id = v_course_type_id,
                    lecture_units = v_lec,
                    laboratory_units = v_lab,
                    credit_hours = v_credit,
                    description = NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                    is_active = v_is_active,
                    updated_at = NOW(),
                    updated_by = auth.uid()
                WHERE id = v_course_id;

                UPDATE public.course_course_types
                SET deleted_at = NOW(), deleted_by = auth.uid()
                WHERE course_id = v_course_id AND deleted_at IS NULL;

                UPDATE public.course_prerequisites
                SET deleted_at = NOW(), deleted_by = auth.uid()
                WHERE course_id = v_course_id AND deleted_at IS NULL;
            ELSE
                INSERT INTO public.courses (
                    code, title, department_id, course_type_id,
                    lecture_units, laboratory_units, credit_hours,
                    description, is_active, base_code, created_by
                )
                VALUES (
                    v_code,
                    TRIM(v_course->>'title'),
                    v_department_id,
                    v_course_type_id,
                    v_lec,
                    v_lab,
                    v_credit,
                    NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                    v_is_active,
                    v_code,
                    auth.uid()
                )
                RETURNING id INTO v_course_id;
            END IF;

            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                v_course_id, v_course_type_id, v_lec + v_lab, COALESCE(v_credit, v_lec + v_lab), auth.uid()
            );

            IF TRIM(COALESCE(v_course->>'prerequisites', '')) <> '' THEN
                FOREACH v_prereq_entry IN ARRAY string_to_array(v_course->>'prerequisites', '|')
                LOOP
                    IF TRIM(v_prereq_entry) = '' THEN
                        CONTINUE;
                    END IF;

                    v_prereq_parts := string_to_array(TRIM(v_prereq_entry), ':');
                    v_prereq_code := TRIM(v_prereq_parts[1]);
                    v_prereq_type := COALESCE(NULLIF(TRIM(v_prereq_parts[2]), ''), 'Required');
                    v_prereq_grade := NULLIF(TRIM(COALESCE(v_prereq_parts[3], '')), '');

                    IF v_prereq_type NOT IN (SELECT unnest(enum_range(NULL::public.prerequisite_type))::text) THEN
                        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Invalid prerequisite type "' || v_prereq_type || '" (use Required, Co-requisite or Recommended)'));
                        CONTINUE;
                    END IF;

                    SELECT id INTO v_prereq_id
                    FROM public.courses
                    WHERE code = v_prereq_code AND deleted_at IS NULL;

                    IF v_prereq_id IS NULL THEN
                        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'Prerequisite course code not found: ' || v_prereq_code));
                        CONTINUE;
                    END IF;

                    IF v_prereq_id = v_course_id THEN
                        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', 'A course cannot be a prerequisite of itself'));
                        CONTINUE;
                    END IF;

                    INSERT INTO public.course_prerequisites (
                        course_id, prerequisite_id, prerequisite_type, prerequisite_kind, minimum_grade, created_by
                    )
                    VALUES (
                        v_course_id,
                        v_prereq_id,
                        v_prereq_type::public.prerequisite_type,
                        'course',
                        v_prereq_grade::NUMERIC,
                        auth.uid()
                    )
                    ON CONFLICT (course_id, prerequisite_id) WHERE deleted_at IS NULL DO NOTHING;
                END LOOP;
            END IF;

            v_success_count := v_success_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_code, 'message', SQLERRM));
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' course(s) processed successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;
-- fn_get_academic_year_history
-- Based on the 2026-10-16 definition (the 10-24 rewrite referenced non-existent
-- term/transmutation columns and dropped the {success,data} envelope). A snapshot
-- array that is present but empty is now taken as-is instead of falling back to
-- the live tables, so earlier versions no longer show holidays added later.
CREATE OR REPLACE FUNCTION public.fn_get_academic_year_history(p_school_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_histories jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', h.id,
            'school_year_id', h.school_year_id,
            'action', h.action,
            'changed_at', h.changed_at,
            'change_summary', h.change_summary,
            'is_active_version', COALESCE(h.is_active_version, (h.changes->>'is_active_version')::boolean, false),
            'snapshot', jsonb_build_object(
                'id', COALESCE(h.snapshot->>'id', h.school_year_id::text),
                'code', COALESCE(h.snapshot->>'code', sy.code),
                'label', COALESCE(h.snapshot->>'label', sy.label),
                'start_date', COALESCE(h.snapshot->>'start_date', sy.start_date::text),
                'end_date', COALESCE(h.snapshot->>'end_date', sy.end_date::text),
                'is_active', COALESCE((h.snapshot->>'is_active')::boolean, sy.is_active),
                'max_units_per_term', COALESCE((h.snapshot->>'max_units_per_term')::numeric, sy.max_units_per_term, 24),
                'evaluation_scope', COALESCE(h.snapshot->>'evaluation_scope', sy.evaluation_scope::text, 'Period'),
                'terms_count', COALESCE(
                    (h.snapshot->>'terms_count')::int,
                    CASE WHEN h.snapshot ? 'terms' THEN jsonb_array_length(h.snapshot->'terms') ELSE NULL END,
                    (SELECT count(*)::int FROM public.terms WHERE school_year_id = h.school_year_id AND deleted_at IS NULL)
                ),
                'transmutation_rows_count', COALESCE(
                    (h.snapshot->>'transmutation_rows_count')::int,
                    CASE WHEN h.snapshot ? 'transmutation_rows' THEN jsonb_array_length(h.snapshot->'transmutation_rows') ELSE NULL END,
                    (SELECT count(*)::int FROM public.grade_transmutation_tables WHERE school_year_id = h.school_year_id)
                ),
                'thresholds_count', COALESCE(
                    (h.snapshot->>'thresholds_count')::int,
                    CASE WHEN h.snapshot ? 'thresholds' THEN jsonb_array_length(h.snapshot->'thresholds') ELSE NULL END,
                    (SELECT count(*)::int FROM public.academic_thresholds WHERE school_year_id = h.school_year_id)
                ),
                'holidays_count', COALESCE(
                    (h.snapshot->>'holidays_count')::int,
                    CASE WHEN h.snapshot ? 'holidays' THEN jsonb_array_length(h.snapshot->'holidays') ELSE NULL END,
                    (SELECT count(*)::int FROM public.school_year_calendar_exceptions WHERE school_year_id = h.school_year_id)
                ),
                'terms', CASE
                    WHEN h.snapshot ? 'terms' AND jsonb_typeof(h.snapshot->'terms') = 'array'
                    THEN h.snapshot->'terms'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', t.id,
                                'term_type_id', t.term_type_id,
                                'term_type_label', tt.label,
                                'term_type_code', tt.code,
                                'start_date', t.start_date,
                                'end_date', t.end_date,
                                'enrollment_start_date', t.enrollment_start_date,
                                'enrollment_end_date', t.enrollment_end_date,
                                'grading_deadline', t.grading_deadline,
                                'status', t.status,
                                'evaluation_scope', t.evaluation_scope,
                                'grading_periods', (
                                    SELECT COALESCE(jsonb_agg(
                                        jsonb_build_object(
                                            'id', gp.id,
                                            'name', gp.name,
                                            'sequence', gp.sequence,
                                            'start_date', gp.start_date,
                                            'end_date', gp.end_date,
                                            'weight', gp.weight,
                                            'major_exam_start_date', gp.major_exam_start_date,
                                            'major_exam_end_date', gp.major_exam_end_date,
                                            'grade_encoding_start_date', gp.grade_encoding_start_date,
                                            'grade_encoding_end_date', gp.grade_encoding_end_date,
                                            'components', COALESCE(gp.components, '[]'::jsonb)
                                        ) ORDER BY gp.sequence ASC
                                    ), '[]'::jsonb)
                                    FROM public.grading_periods gp
                                    WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
                                )
                            ) ORDER BY t.start_date ASC
                        ), '[]'::jsonb)
                        FROM public.terms t
                        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
                        WHERE t.school_year_id = h.school_year_id AND t.deleted_at IS NULL
                    )
                END,
                'transmutation_rows', CASE
                    WHEN h.snapshot ? 'transmutation_rows' AND jsonb_typeof(h.snapshot->'transmutation_rows') = 'array'
                    THEN h.snapshot->'transmutation_rows'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', g.id,
                                'label', g.label,
                                'min_percentage', g.min_percentage,
                                'max_percentage', g.max_percentage,
                                'transmuted_grade', g.transmuted_grade,
                                'is_passing', g.is_passing,
                                'special_code', g.special_code,
                                'description', g.description
                            ) ORDER BY g.min_percentage DESC NULLS LAST
                        ), '[]'::jsonb)
                        FROM public.grade_transmutation_tables g
                        WHERE g.school_year_id = h.school_year_id
                    )
                END,
                'thresholds', CASE
                    WHEN h.snapshot ? 'thresholds' AND jsonb_typeof(h.snapshot->'thresholds') = 'array'
                    THEN h.snapshot->'thresholds'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', a.id,
                                'category', a.category,
                                'code', a.code,
                                'label', a.label,
                                'min_gwa', a.min_gwa,
                                'max_gwa', a.max_gwa,
                                'min_subject_grade', a.min_subject_grade,
                                'requires_no_failing', a.requires_no_failing,
                                'scholarship_discount_pct', a.scholarship_discount_pct,
                                'sort_order', a.sort_order,
                                'is_active', a.is_active
                            ) ORDER BY a.sort_order ASC
                        ), '[]'::jsonb)
                        FROM public.academic_thresholds a
                        WHERE a.school_year_id = h.school_year_id
                    )
                END,
                'holidays', CASE
                    WHEN h.snapshot ? 'holidays' AND jsonb_typeof(h.snapshot->'holidays') = 'array'
                    THEN h.snapshot->'holidays'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', e.id,
                                'title', e.title,
                                'exception_type', e.exception_type,
                                'start_date', e.start_date,
                                'end_date', e.end_date,
                                'affects_attendance', e.affects_attendance,
                                'description', e.description
                            ) ORDER BY e.start_date ASC
                        ), '[]'::jsonb)
                        FROM public.school_year_calendar_exceptions e
                        WHERE e.school_year_id = h.school_year_id
                    )
                END
            ),
            'changes', h.changes,
            'changed_by', h.changed_by,
            'changed_by_name', NULLIF(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
            'changed_by_email', u.email,
            'changed_by_role', COALESCE(ur.role_code, 'Admin')
        ) ORDER BY h.changed_at DESC
    ), '[]'::jsonb)
    INTO v_histories
    FROM public.school_year_histories h
    LEFT JOIN public.school_years sy ON sy.id = h.school_year_id
    LEFT JOIN public.users u ON u.id = h.changed_by
    LEFT JOIN LATERAL (
        SELECT r.code AS role_code
        FROM public.user_roles usr
        JOIN public.roles r ON r.id = usr.role_id
        WHERE usr.user_id = u.id AND usr.deleted_at IS NULL AND usr.revoked_at IS NULL
        ORDER BY usr.granted_at ASC NULLS LAST
        LIMIT 1
    ) ur ON TRUE
    WHERE h.school_year_id = p_school_year_id AND h.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'data', v_histories
    );
END;
$$;

-- fn_create_my_student_profile
-- Missing from the live database although the student profile prompt calls it;
-- recreated verbatim from 20261002100000.
CREATE OR REPLACE FUNCTION public.fn_create_my_student_profile(
    p_program_id uuid DEFAULT NULL::uuid,
    p_year_level smallint DEFAULT 1::smallint,
    p_first_name text DEFAULT NULL::text,
    p_middle_name text DEFAULT NULL::text,
    p_last_name text DEFAULT NULL::text,
    p_suffix text DEFAULT NULL::text,
    p_preferred_name text DEFAULT NULL::text,
    p_mobile_number text DEFAULT NULL::text,
    p_address_line1 text DEFAULT NULL::text,
    p_address_line2 text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_province text DEFAULT NULL::text,
    p_postal_code text DEFAULT NULL::text,
    p_date_of_birth date DEFAULT NULL::date,
    p_gender text DEFAULT NULL::text,
    p_civil_status text DEFAULT NULL::text,
    p_nationality text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_student_id UUID;
    v_student_number TEXT;
    v_seq_num INT;
    v_role_id UUID;
    v_eff_year SMALLINT;
    v_curr_record RECORD;
    v_user_full_name TEXT;
    v_curr_values JSONB;
    v_requested_changes JSONB;
    v_existing_request_id UUID;
    v_prog_code TEXT := '';
    v_prog_name TEXT := '';
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: you must be signed in.');
    END IF;

    SELECT * INTO v_curr_record FROM public.users WHERE id = v_user_id AND deleted_at IS NULL;
    
    -- Construct full name with fallback to input parameters and email
    v_user_full_name := btrim(COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name, '') || ' ' || COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name, ''));
    IF v_user_full_name = '' THEN
        v_user_full_name := COALESCE(v_curr_record.email, 'Student');
    END IF;

    -- Ensure Student role is assigned
    SELECT id INTO v_role_id FROM public.roles WHERE lower(code) = 'student' AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role_id, created_by, role_code)
        VALUES (v_user_id, v_role_id, v_user_id, 'Student')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Provision student row if needed
    SELECT id, student_number INTO v_student_id, v_student_number
    FROM public.students
    WHERE user_id = v_user_id AND deleted_at IS NULL
    LIMIT 1;

    v_eff_year := COALESCE(p_year_level, 1);
    IF v_eff_year < 1 OR v_eff_year > 6 THEN v_eff_year := 1; END IF;

    IF v_student_id IS NULL THEN
        SELECT count(*) + 1 INTO v_seq_num FROM public.students;
        v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        WHILE EXISTS (SELECT 1 FROM public.students WHERE student_number = v_student_number) LOOP
            v_seq_num := v_seq_num + 1;
            v_student_number := to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_seq_num::text, 4, '0');
        END LOOP;

        INSERT INTO public.students (
            user_id,
            student_number,
            year_level,
            status,
            admitted_at,
            created_by
        ) VALUES (
            v_user_id,
            v_student_number,
            v_eff_year,
            'Active'::public.student_status_type,
            CURRENT_DATE,
            v_user_id
        )
        RETURNING id INTO v_student_id;
    END IF;

    IF p_program_id IS NOT NULL THEN
        SELECT code, name INTO v_prog_code, v_prog_name FROM public.programs WHERE id = p_program_id AND deleted_at IS NULL;
    END IF;

    v_curr_values := jsonb_build_object(
        'first_name', COALESCE(v_curr_record.first_name, ''),
        'middle_name', COALESCE(v_curr_record.middle_name, ''),
        'last_name', COALESCE(v_curr_record.last_name, ''),
        'suffix', COALESCE(v_curr_record.suffix, ''),
        'preferred_name', COALESCE(v_curr_record.preferred_name, ''),
        'mobile_number', COALESCE(v_curr_record.mobile_number, ''),
        'address_line1', COALESCE(v_curr_record.address_line1, ''),
        'address_line2', COALESCE(v_curr_record.address_line2, ''),
        'city', COALESCE(v_curr_record.city, ''),
        'province', COALESCE(v_curr_record.province, ''),
        'postal_code', COALESCE(v_curr_record.postal_code, ''),
        'date_of_birth', CASE WHEN v_curr_record.date_of_birth IS NOT NULL THEN v_curr_record.date_of_birth::text ELSE '' END,
        'gender', COALESCE(v_curr_record.gender::text, ''),
        'civil_status', COALESCE(v_curr_record.civil_status::text, ''),
        'nationality', COALESCE(v_curr_record.nationality, ''),
        'program_id', '',
        'program_code', 'Unassigned',
        'program_name', 'Unassigned',
        'year_level', v_eff_year
    );

    v_requested_changes := jsonb_build_object(
        'first_name', COALESCE(NULLIF(btrim(p_first_name), ''), v_curr_record.first_name, ''),
        'middle_name', COALESCE(NULLIF(btrim(p_middle_name), ''), COALESCE(v_curr_record.middle_name, ''), ''),
        'last_name', COALESCE(NULLIF(btrim(p_last_name), ''), v_curr_record.last_name, ''),
        'suffix', COALESCE(NULLIF(btrim(p_suffix), ''), COALESCE(v_curr_record.suffix, ''), ''),
        'preferred_name', COALESCE(NULLIF(btrim(p_preferred_name), ''), COALESCE(v_curr_record.preferred_name, ''), ''),
        'mobile_number', COALESCE(NULLIF(btrim(p_mobile_number), ''), COALESCE(v_curr_record.mobile_number, ''), ''),
        'address_line1', COALESCE(NULLIF(btrim(p_address_line1), ''), COALESCE(v_curr_record.address_line1, ''), ''),
        'address_line2', COALESCE(NULLIF(btrim(p_address_line2), ''), COALESCE(v_curr_record.address_line2, ''), ''),
        'city', COALESCE(NULLIF(btrim(p_city), ''), COALESCE(v_curr_record.city, ''), ''),
        'province', COALESCE(NULLIF(btrim(p_province), ''), COALESCE(v_curr_record.province, ''), ''),
        'postal_code', COALESCE(NULLIF(btrim(p_postal_code), ''), COALESCE(v_curr_record.postal_code, ''), ''),
        'date_of_birth', CASE WHEN p_date_of_birth IS NOT NULL THEN p_date_of_birth::text ELSE COALESCE(v_curr_record.date_of_birth::text, '') END,
        'gender', COALESCE(NULLIF(btrim(p_gender), ''), COALESCE(v_curr_record.gender::text, ''), ''),
        'civil_status', COALESCE(NULLIF(btrim(p_civil_status), ''), COALESCE(v_curr_record.civil_status::text, ''), ''),
        'nationality', COALESCE(NULLIF(btrim(p_nationality), ''), COALESCE(v_curr_record.nationality, ''), ''),
        'program_id', COALESCE(p_program_id::text, ''),
        'program_code', COALESCE(v_prog_code, 'Unassigned'),
        'program_name', COALESCE(v_prog_name, 'Unassigned'),
        'year_level', v_eff_year
    );

    -- Insert or update pending request
    SELECT id INTO v_existing_request_id
    FROM public.student_profile_change_requests
    WHERE user_id = v_user_id AND status = 'Pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_request_id IS NOT NULL THEN
        UPDATE public.student_profile_change_requests
        SET requested_changes = v_requested_changes,
            current_values = v_curr_values,
            student_id = v_student_id,
            updated_at = now()
        WHERE id = v_existing_request_id;
    ELSE
        INSERT INTO public.student_profile_change_requests (
            student_id,
            user_id,
            status,
            current_values,
            requested_changes
        ) VALUES (
            v_student_id,
            v_user_id,
            'Pending',
            v_curr_values,
            v_requested_changes
        ) RETURNING id INTO v_existing_request_id;
    END IF;

    -- Record into registrar_logs
    IF EXISTS (SELECT 1 FROM public.registrar_logs WHERE (metadata->>'request_id')::uuid = v_existing_request_id) THEN
        UPDATE public.registrar_logs
        SET action = 'PROFILE_CHANGE_REQUESTED',
            student_id = v_student_id,
            student_name = v_user_full_name,
            student_number = v_student_number,
            details = 'Student submitted profile details and program selection for Registrar verification.',
            old_values = v_curr_values,
            new_values = v_requested_changes,
            metadata = jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending'),
            created_at = now()
        WHERE (metadata->>'request_id')::uuid = v_existing_request_id;
    ELSE
        INSERT INTO public.registrar_logs (
            action,
            student_id,
            student_user_id,
            student_name,
            student_number,
            performed_by,
            performed_by_name,
            details,
            old_values,
            new_values,
            metadata
        ) VALUES (
            'PROFILE_CHANGE_REQUESTED',
            v_student_id,
            v_user_id,
            v_user_full_name,
            v_student_number,
            v_user_id,
            v_user_full_name,
            'Student submitted profile details and program selection for Registrar verification.',
            v_curr_values,
            v_requested_changes,
            jsonb_build_object('request_id', v_existing_request_id, 'status', 'Pending')
        );
    END IF;

    -- Send notifications to all Registrars
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    )
    SELECT DISTINCT ur.user_id,
           'New Student Setup Request',
           'Student ' || v_user_full_name || ' (' || COALESCE(v_student_number, 'N/A') || ') completed profile setup and requested program verification.',
           'Account'::public.notification_category_type,
           '/registrar/student-verification'
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE lower(r.code) = 'registrar'
      AND ur.deleted_at IS NULL
      AND ur.revoked_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'pending_approval', true,
        'message', 'Your student profile and program selection have been submitted for Registrar verification and approval.',
        'student_number', v_student_number
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_create_my_student_profile TO authenticated, service_role;

-- Expired timed attempts were only finalized when the same student reopened the
-- assessment; fn_sweep_expired_assessment_sessions existed but was never scheduled.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'assessment-expiry-sweep';
SELECT cron.schedule('assessment-expiry-sweep', '*/5 * * * *', 'SELECT public.fn_sweep_expired_assessment_sessions();');

COMMIT;
