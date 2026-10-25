-- Migration: 20261025000000_fix_faculty_student_eval_calendar_rubric_gradebook.sql
-- Description: Fixes 12 reported bugs across faculty and student portals:
-- 1. Dual-key evaluation listing without requiring pre-approved grades (fn_list_my_evaluations_json)
-- 2. Assessment auto-grading submission fixing table reference to student_answers (fn_submit_assessment)
-- 3. Calendar section schedules role function fix & department scoping for Dean (fn_get_calendar_section_schedules)
-- 4. Calendar faculty due activities endpoint (fn_get_calendar_due_activities)
-- 5. Rubric creation constraint fix pre-computing total_points (fn_create_rubric)
-- 6. Manual Special Grade Flag assignment for Gradebook (fn_set_enrollment_special_grade)
-- 7. Section content permission enforcement (fn_get_section_content)

-- 1. Dual-Key Evaluation Listing
CREATE OR REPLACE FUNCTION public.fn_list_my_evaluations_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 10,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_status text DEFAULT NULL::text
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE true';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_status = 'Pending' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = false';
    END IF;

    IF p_status = 'Completed' THEN
        v_where := v_where || ' AND COALESCE(epl.is_completed, false) = true';
    END IF;

    v_base_query := format(
        'SELECT
            target.enrollment_id,
            target.grading_period_id,
            CASE WHEN target.evaluation_scope = ''Term''
                THEN ''Whole Term''
                ELSE gp.name
            END AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            target.evaluation_scope::TEXT AS evaluation_scope,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            COALESCE(NULLIF(btrim(concat(u.first_name, '' '', u.last_name)), ''''), ''Unassigned'') AS faculty_name,
            COALESCE(epl.is_completed, false) AS is_completed,
            epl.completed_at,
            COUNT(*) OVER() AS total_count
        FROM (
            SELECT DISTINCT
                e.id AS enrollment_id,
                public.fn_resolve_evaluation_period(e.id, gp.id) AS grading_period_id,
                public.fn_get_enrollment_evaluation_scope(e.id) AS evaluation_scope
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.grading_periods gp ON gp.term_id = s.term_id AND gp.deleted_at IS NULL
            WHERE e.student_id = %L
            AND e.deleted_at IS NULL
            AND e.status = ''Enrolled''
        ) target
        INNER JOIN public.enrollments e ON e.id = target.enrollment_id
        INNER JOIN public.grading_periods gp ON gp.id = target.grading_period_id AND gp.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = target.enrollment_id
            AND epl.grading_period_id = target.grading_period_id
            AND epl.deleted_at IS NULL
        %s',
        v_student_id,
        v_where
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'is_completed ASC, term_label DESC, c.code ASC, gp.sequence ASC'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_list_my_evaluations_json(integer, integer, text, jsonb, text) TO authenticated;

-- 2. Assessment Auto-Grading & Submission Fix
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

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission window has expired.');
  END IF;

  SELECT ai.due_at, ai.title, s.id, s.faculty_id
  INTO v_due_at, v_assessment_title, v_section_id, v_faculty_id
  FROM public.assessment_items ai
  JOIN public.sections s ON s.id = ai.section_id
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  -- Ensure all questions have answer records in public.student_answers
  FOR v_question_rec IN
    SELECT aq.id, aq.question_type, aq.points
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = v_assessment_id AND aq.deleted_at IS NULL
  LOOP
    IF v_question_rec.question_type IN ('Essay', 'Short Answer', 'File Upload') THEN
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
      score         = v_total_earned_score,
      graded_at     = now(),
      submitted_at  = now(),
      is_late       = v_is_late,
      feedback      = 'Auto-graded upon submission.',
      updated_by    = auth.uid()
    WHERE id = p_submission_id;
  ELSE
    UPDATE public.assessment_submissions
    SET
      status       = 'Submitted',
      submitted_at = now(),
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
    'submitted_at',  now(),
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
GRANT EXECUTE ON FUNCTION public.fn_submit_assessment(uuid) TO authenticated;

-- 3. Calendar Section Schedules Query (Fixing fn_current_user_role runtime error)
CREATE OR REPLACE FUNCTION public.fn_get_calendar_section_schedules()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    LEFT JOIN public.departments d ON d.id = c.department_id AND d.deleted_at IS NULL
    WHERE sch.deleted_at IS NULL
      AND (
          'Admin' = ANY(v_roles)
          OR ('Dean' = ANY(v_roles) AND d.dean_id = auth.uid())
          OR ('Faculty' = ANY(v_roles) AND s.faculty_id = auth.uid())
          OR ('Student' = ANY(v_roles) AND EXISTS (
              SELECT 1 FROM public.enrollments e
              JOIN public.students st ON st.id = e.student_id
              WHERE e.section_id = s.id AND st.user_id = auth.uid() AND e.deleted_at IS NULL
          ))
      );

    RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_calendar_section_schedules() TO authenticated;

-- 4. Calendar Faculty & Staff Due Activities
CREATE OR REPLACE FUNCTION public.fn_get_calendar_due_activities()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    LEFT JOIN public.departments d ON d.id = c.department_id AND d.deleted_at IS NULL
    WHERE ai.deleted_at IS NULL
      AND ai.due_at IS NOT NULL
      AND (
          'Admin' = ANY(v_roles)
          OR ('Dean' = ANY(v_roles) AND d.dean_id = auth.uid())
          OR ('Faculty' = ANY(v_roles) AND s.faculty_id = auth.uid())
      );

    RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_calendar_due_activities() TO authenticated;

-- 5. Rubric Creation With Pre-calculated Total Points
CREATE OR REPLACE FUNCTION public.fn_create_rubric(
    p_section_id uuid,
    p_title text,
    p_description text,
    p_criteria jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_rubric_id  UUID;
    v_criterion  JSONB;
    v_total      NUMERIC := 0;
    v_seq        SMALLINT := 0;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    IF COALESCE(trim(p_title), '') = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rubric title is required.');
    END IF;

    IF p_criteria IS NULL OR jsonb_array_length(p_criteria) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Add at least one criterion.');
    END IF;

    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        IF (v_criterion->>'max_points')::NUMERIC <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each criterion must have points greater than zero.');
        END IF;
        v_total := v_total + (v_criterion->>'max_points')::NUMERIC;
    END LOOP;

    IF v_total <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total points must be greater than zero.');
    END IF;

    INSERT INTO public.rubrics (section_id, title, description, total_points)
    VALUES (p_section_id, trim(p_title), NULLIF(trim(p_description), ''), v_total)
    RETURNING id INTO v_rubric_id;

    FOR v_criterion IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        v_seq := v_seq + 1;
        INSERT INTO public.rubric_criteria (rubric_id, title, description, max_points, sequence)
        VALUES (
            v_rubric_id,
            trim(v_criterion->>'title'),
            NULLIF(trim(v_criterion->>'description'), ''),
            (v_criterion->>'max_points')::NUMERIC,
            v_seq
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'id', v_rubric_id);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_create_rubric(uuid, text, text, jsonb) TO authenticated;

-- 6. Manual Special Grade Flag Assignment on Gradebook
CREATE OR REPLACE FUNCTION public.fn_set_enrollment_special_grade(
    p_enrollment_id uuid,
    p_grading_period_id uuid,
    p_special_grade text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_section_id   UUID;
    v_grade_id     UUID;
    v_grade_status TEXT;
    v_old_special  TEXT;
    v_clean_code   TEXT;
BEGIN
    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    PERFORM public.fn_assert_section_staff(v_section_id);

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
$$;
GRANT EXECUTE ON FUNCTION public.fn_set_enrollment_special_grade(uuid, uuid, text) TO authenticated;

-- 7. Section Content Permissions
CREATE OR REPLACE FUNCTION public.fn_get_section_content(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[] := public.fn_current_user_role_codes();
    v_can_manage BOOLEAN;
    v_enrollment_id UUID;
    v_modules JSONB;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF 'Student' = ANY(v_roles) AND NOT ('Faculty' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        v_can_manage := false;
    ELSE
        v_can_manage := public.fn_is_section_faculty(p_section_id);
    END IF;

    IF NOT v_can_manage THEN
        SELECT e.id INTO v_enrollment_id
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
        LIMIT 1;
    END IF;

    SELECT COALESCE(jsonb_agg(mod_row ORDER BY mod_row_sequence, mod_row_created), '[]'::jsonb)
    INTO v_modules
    FROM (
        SELECT
            m.sequence AS mod_row_sequence,
            m.created_at AS mod_row_created,
            jsonb_build_object(
                'id', m.id,
                'title', m.title,
                'description', m.description,
                'sequence', m.sequence,
                'is_published', m.is_published,
                'material_count', (
                    SELECT count(*)
                    FROM public.section_materials sm
                    WHERE sm.module_id = m.id
                      AND sm.deleted_at IS NULL
                      AND (v_can_manage OR sm.is_published)
                ),
                'materials', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', sm.id,
                        'title', sm.title,
                        'description', sm.description,
                        'material_type', sm.material_type,
                        'file_url', sm.file_url,
                        'file_name', sm.file_name,
                        'file_size_bytes', sm.file_size_bytes,
                        'sequence', sm.sequence,
                        'is_published', sm.is_published,
                        'created_at', sm.created_at
                    ) ORDER BY sm.sequence ASC, sm.created_at ASC)
                    FROM public.section_materials sm
                    WHERE sm.module_id = m.id
                      AND sm.deleted_at IS NULL
                      AND (v_can_manage OR sm.is_published)
                ), '[]'::jsonb)
            ) AS mod_row
        FROM public.section_modules m
        WHERE m.section_id = p_section_id
          AND m.deleted_at IS NULL
          AND (v_can_manage OR m.is_published)
    ) sub;

    RETURN jsonb_build_object(
        'section_id', p_section_id,
        'can_manage', v_can_manage,
        'modules', v_modules
    );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_get_section_content(uuid) TO authenticated;


-- 8. Student Subject Assessments Visibility
CREATE OR REPLACE FUNCTION public.fn_get_subject_assessments(p_enrollment_id uuid)
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
    AND (
        v_student_id IS NULL
        OR e.student_id = v_student_id
        OR EXISTS (
            SELECT 1 FROM public.students st
            WHERE st.id = e.student_id AND st.user_id = auth.uid() AND st.deleted_at IS NULL
        )
    )
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',                       ai.id,
            'title',                    ai.title,
            'description',              ai.description,
            'assessment_type',          ai.assessment_type,
            'grading_period_id',        gp.id,
            'grading_period_name',      gp.name,
            'grading_period_sequence',  gp.sequence,
            'total_points',             ai.total_points,
            'passing_points',           ai.passing_points,
            'time_limit_minutes',       ai.time_limit_minutes,
            'max_attempts',             ai.max_attempts,
            'question_count', (
                SELECT COUNT(*)
                FROM public.assessment_questions aq
                WHERE aq.assessment_item_id = ai.id
                AND aq.deleted_at IS NULL
            ),
            'show_all_questions',       ai.show_all_questions,
            'questions_per_page',       ai.questions_per_page,
            'opens_at',                 ai.opens_at,
            'due_at',                   ai.due_at,
            'closes_at',                ai.closes_at,
            'scheduled_publish_at',     ai.scheduled_publish_at,
            'submission_status', (
                SELECT asub.status::text
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = v_actual_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'submission_id', (
                SELECT asub.id
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = v_actual_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'attempts_used', (
                SELECT COUNT(*)::int
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = v_actual_enrollment_id
                AND asub.status != 'In Progress'
                AND asub.deleted_at IS NULL
            ),
            'attachments', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id',              aa.id,
                        'file_name',       aa.file_name,
                        'file_url',        aa.file_url,
                        'file_size_bytes', aa.file_size_bytes,
                        'mime_type',       aa.mime_type,
                        'sequence',        aa.sequence
                    )
                    ORDER BY aa.sequence ASC
                ), '[]'::JSONB)
                FROM public.assessment_attachments aa
                WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
            )
        )
        ORDER BY ai.created_at ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.assessment_items ai
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.section_id = v_section_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
        OR ai.is_published IS NULL
    );

    RETURN v_result;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_get_subject_assessments(uuid) TO authenticated;
