-- Consolidated Migration fixing issues reported in erika bug.md and hubilla bug.md

-- 1. Fix Academic Year History snapshot holidays condition so empty [] does not query live table
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
                'terms', CASE
                    WHEN h.snapshot ? 'terms' AND jsonb_typeof(h.snapshot->'terms') = 'array'
                    THEN h.snapshot->'terms'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', t.id,
                                'code', t.code,
                                'name', t.name,
                                'start_date', t.start_date,
                                'end_date', t.end_date,
                                'enrollment_start_date', t.enrollment_start_date,
                                'enrollment_end_date', t.enrollment_end_date,
                                'grades_due_date', t.grades_due_date,
                                'is_active', t.is_active,
                                'grading_periods_count', (SELECT count(*)::int FROM public.grading_periods WHERE term_id = t.id AND deleted_at IS NULL)
                            ) ORDER BY t.start_date ASC
                        ), '[]'::jsonb)
                        FROM public.terms t
                        WHERE t.school_year_id = h.school_year_id AND t.deleted_at IS NULL
                    )
                END,
                'transmutations', CASE
                    WHEN h.snapshot ? 'transmutations' AND jsonb_typeof(h.snapshot->'transmutations') = 'array'
                    THEN h.snapshot->'transmutations'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', g.id,
                                'min_percentage', g.min_percentage,
                                'transmuted_grade', g.transmuted_grade,
                                'numeric_grade', g.numeric_grade,
                                'grade_status', g.grade_status,
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
    ), '[]'::jsonb) INTO v_histories
    FROM public.school_year_histories h
    LEFT JOIN public.school_years sy ON sy.id = h.school_year_id
    LEFT JOIN public.users u ON u.id = h.changed_by
    LEFT JOIN LATERAL (
        SELECT r.code as role_code
        FROM public.user_roles usr
        JOIN public.roles r ON r.id = usr.role_id
        WHERE usr.user_id = u.id AND usr.deleted_at IS NULL
        LIMIT 1
    ) ur ON TRUE
    WHERE h.school_year_id = p_school_year_id;

    RETURN v_histories;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_year_history(uuid) TO authenticated, anon, service_role;

-- 2. Fix fn_create_rubric check constraint violation by calculating total_points before insert
CREATE OR REPLACE FUNCTION public.fn_create_rubric(p_section_id uuid, p_title text, p_description text, p_criteria jsonb)
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

    -- Pre-calculate total points and validate
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

-- 3. Case-insensitive department and course type lookups in fn_bulk_create_courses
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

        IF (v_course->>'code') IS NULL OR TRIM(v_course->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', '', 'message', 'Code is required'));
            CONTINUE;
        END IF;

        IF (v_course->>'title') IS NULL OR TRIM(v_course->>'title') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Title is required'));
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE (LOWER(TRIM(code)) = LOWER(TRIM(v_course->>'department_code'))
            OR LOWER(TRIM(name)) = LOWER(TRIM(v_course->>'department_code')))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Department code not found: ' || COALESCE(v_course->>'department_code', 'empty')));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_type_id
        FROM public.course_types
        WHERE (LOWER(TRIM(code)) = LOWER(TRIM(v_course->>'course_type_code'))
            OR LOWER(TRIM(name)) = LOWER(TRIM(v_course->>'course_type_code')))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_course_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Course type code not found: ' || COALESCE(v_course->>'course_type_code', 'empty')));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC < 0 OR (v_course->>'lecture_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Lecture units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'laboratory_units')::NUMERIC < 0 OR (v_course->>'laboratory_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Laboratory units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC = 0 AND (v_course->>'laboratory_units')::NUMERIC = 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'At least one of lecture units or laboratory units must be greater than 0'));
            CONTINUE;
        END IF;

        -- Check if course code already exists
        SELECT id INTO v_course_id
        FROM public.courses
        WHERE code = TRIM(v_course->>'code') AND deleted_at IS NULL;

        IF v_course_id IS NOT NULL THEN
            -- Update existing course with bulk upload data
            UPDATE public.courses
            SET title = TRIM(v_course->>'title'),
                department_id = v_department_id,
                course_type_id = v_course_type_id,
                lecture_units = (v_course->>'lecture_units')::NUMERIC,
                laboratory_units = (v_course->>'laboratory_units')::NUMERIC,
                credit_hours = CASE WHEN v_course->>'credit_hours' = '' THEN NULL
                                     ELSE (v_course->>'credit_hours')::NUMERIC END,
                description = NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                is_active = COALESCE((v_course->>'is_active')::BOOLEAN, TRUE),
                updated_at = NOW(),
                updated_by = auth.uid()
            WHERE id = v_course_id;

            -- Clear existing prerequisites for re-linking
            DELETE FROM public.course_prerequisites WHERE course_id = v_course_id;
        ELSE
            -- Insert new course
            INSERT INTO public.courses (
                code, title, department_id, course_type_id,
                lecture_units, laboratory_units, credit_hours,
                description, is_active, created_by
            )
            VALUES (
                TRIM(v_course->>'code'),
                TRIM(v_course->>'title'),
                v_department_id,
                v_course_type_id,
                (v_course->>'lecture_units')::NUMERIC,
                (v_course->>'laboratory_units')::NUMERIC,
                CASE WHEN v_course->>'credit_hours' = '' THEN NULL
                     ELSE (v_course->>'credit_hours')::NUMERIC END,
                NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
                COALESCE((v_course->>'is_active')::BOOLEAN, TRUE),
                auth.uid()
            )
            RETURNING id INTO v_course_id;
        END IF;

        -- Process prerequisites if present
        IF v_course->>'prerequisites' IS NOT NULL AND TRIM(v_course->>'prerequisites') != '' THEN
            FOR v_prereq_entry IN SELECT unnest(string_to_array(v_course->>'prerequisites', '|'))
            LOOP
                v_prereq_parts := string_to_array(TRIM(v_prereq_entry), ':');
                v_prereq_code := TRIM(v_prereq_parts[1]);
                v_prereq_type := COALESCE(NULLIF(TRIM(v_prereq_parts[2]), ''), 'Required');
                v_prereq_grade := NULLIF(TRIM(v_prereq_parts[3]), '');

                SELECT id INTO v_prereq_id
                FROM public.courses
                WHERE code = v_prereq_code AND deleted_at IS NULL;

                IF v_prereq_id IS NOT NULL THEN
                    INSERT INTO public.course_prerequisites (
                        course_id, prerequisite_course_id, prerequisite_type, min_grade, created_by
                    )
                    VALUES (
                        v_course_id,
                        v_prereq_id,
                        v_prereq_type::public.prerequisite_type,
                        v_prereq_grade,
                        auth.uid()
                    )
                    ON CONFLICT (course_id, prerequisite_course_id) DO NOTHING;
                END IF;
            END LOOP;
        END IF;

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', jsonb_array_length(v_errors) = 0,
        'count', v_success_count,
        'errors', v_errors
    );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_bulk_create_courses(jsonb) TO authenticated;

-- 4. Auto-grading support in fn_submit_assessment
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

  -- Ensure all questions have answer records (record 0 for unanswered questions)
  FOR v_question_rec IN
    SELECT aq.id, aq.question_type, aq.points
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = v_assessment_id AND aq.deleted_at IS NULL
  LOOP
    IF v_question_rec.question_type IN ('Essay', 'Short Answer', 'File Upload') THEN
      v_has_manual_questions := true;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.assessment_answers
      WHERE submission_id = p_submission_id AND question_id = v_question_rec.id
    ) THEN
      INSERT INTO public.assessment_answers (
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
    FROM public.assessment_answers
    WHERE submission_id = p_submission_id AND deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET
      status       = 'Graded'::public.submission_status_type,
      raw_score    = v_total_earned_score,
      final_score  = v_total_earned_score,
      submitted_at = now(),
      is_late      = v_is_late
    WHERE id = p_submission_id;
  ELSE
    UPDATE public.assessment_submissions
    SET
      status       = (CASE WHEN v_is_late THEN 'Late'::public.submission_status_type ELSE 'Submitted'::public.submission_status_type END),
      submitted_at = now(),
      is_late      = v_is_late
    WHERE id = p_submission_id;
  END IF;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted'::public.submission_timer_status,
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  -- Notify the assigned faculty member directly to the submissions page
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

-- 5. Section schedules query for Calendar timetable (Dean, Faculty, Admin, Student)
CREATE OR REPLACE FUNCTION public.fn_get_calendar_section_schedules()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role TEXT := public.fn_current_user_role();
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
          v_role = 'Admin'
          OR (v_role = 'Dean' AND d.dean_id = auth.uid())
          OR (v_role = 'Faculty' AND s.faculty_id = auth.uid())
          OR (v_role = 'Student' AND s.id IN (
              SELECT e.section_id FROM public.enrollments e
              JOIN public.students st ON st.id = e.student_id
              WHERE st.user_id = auth.uid() AND e.status = 'Enrolled' AND e.deleted_at IS NULL
          ))
      );

    RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_get_calendar_section_schedules() TO authenticated;
