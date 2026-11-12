-- Gradebook fixes
-- 1. fn_calculate_final_grade no longer overwrites a grade that is already Submitted, Approved
--    or Released. Before, "Calculate" set those rows back to Draft. It also keeps the raw grade
--    inside 0..100 so the section_final_grades_raw_grade_check can never fail.
-- 2. fn_submit_section_grades only moves Draft rows to Submitted (Approved and Released rows
--    stay as they are) and refuses while any enrolled student has no calculated grade yet.
-- Both functions keep their signatures, so their existing grants stay in place.

CREATE OR REPLACE FUNCTION public.fn_calculate_final_grade(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_section_id          UUID;
  v_component           RECORD;
  v_component_score     NUMERIC(8,2);
  v_component_max       NUMERIC(8,2);
  v_component_weighted  NUMERIC(8,2);
  v_total_weight        NUMERIC(8,2) := 0;
  v_total_weighted      NUMERIC(8,2) := 0;
  v_raw_grade           NUMERIC(5,2);
  v_transmuted_grade    NUMERIC(5,2);
  v_existing_grade_id   UUID;
  v_existing_status     TEXT;
  v_program_id          UUID;
  v_school_year_id      UUID;
BEGIN
  SELECT s.id, t.school_year_id INTO v_section_id, v_school_year_id
  FROM public.enrollments e
  INNER JOIN public.sections s ON s.id = e.section_id
  LEFT JOIN public.terms t ON t.id = s.term_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  IF v_section_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
  END IF;

  SELECT id, status::TEXT INTO v_existing_grade_id, v_existing_status
  FROM public.section_final_grades
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL;

  -- A grade that has left Draft is locked; recalculating it would silently undo the submission
  IF v_existing_grade_id IS NOT NULL AND v_existing_status <> 'Draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Grade is already ' || v_existing_status || ' and locked, so it was not recalculated.'
    );
  END IF;

  FOR v_component IN
    SELECT gc.id, gc.name, gc.weight
    FROM public.grading_components gc
    WHERE gc.section_id        = v_section_id
      AND gc.grading_period_id = p_grading_period_id
      AND gc.deleted_at        IS NULL
  LOOP
    -- Same counting rules as the grade breakdowns (see fn_component_item_scores)
    SELECT
      COALESCE(SUM(i.counted_points), 0),
      COALESCE(SUM(i.counted_max),    0)
    INTO v_component_score, v_component_max
    FROM public.fn_component_item_scores(p_enrollment_id, v_component.id) i;

    IF v_component_max > 0 THEN
      v_component_weighted := (v_component_score / v_component_max) * v_component.weight;
    ELSE
      v_component_weighted := 0;
    END IF;

    v_total_weight   := v_total_weight   + v_component.weight;
    v_total_weighted := v_total_weighted + v_component_weighted;
  END LOOP;

  IF v_total_weight = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No grading components found for this period.');
  END IF;

  -- Keep the result inside 0..100 even if a score is out of range
  v_raw_grade := LEAST(100, GREATEST(0, ROUND((v_total_weighted / v_total_weight) * 100, 2)));

  SELECT st.program_id INTO v_program_id
  FROM public.enrollments e
  INNER JOIN public.students st ON st.id = e.student_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  -- Pick numeric transmuted grade matching the score range
  -- Use the section's own academic-year scale (global rows only as a fallback) and
  -- never a special-grade row such as INC/DRP
  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND (gtt.school_year_id = v_school_year_id OR gtt.school_year_id IS NULL)
    AND gtt.special_code IS NULL
    AND v_raw_grade    >= gtt.min_percentage
    AND gtt.transmuted_grade IS NOT NULL
    AND gtt.deleted_at IS NULL
  ORDER BY (gtt.school_year_id IS NOT NULL) DESC, (gtt.program_id IS NOT NULL) DESC, gtt.min_percentage DESC
  LIMIT 1;

  IF v_existing_grade_id IS NOT NULL THEN
    UPDATE public.section_final_grades
    SET
      raw_grade        = v_raw_grade,
      final_grade      = v_raw_grade,
      transmuted_grade = v_transmuted_grade,
      remarks          = 'Auto-calculated via fn_calculate_final_grade'
    WHERE id = v_existing_grade_id
      AND status = 'Draft';
  ELSE
    INSERT INTO public.section_final_grades (
      enrollment_id,
      grading_period_id,
      raw_grade,
      final_grade,
      transmuted_grade,
      status,
      remarks
    ) VALUES (
      p_enrollment_id,
      p_grading_period_id,
      v_raw_grade,
      v_raw_grade,
      v_transmuted_grade,
      'Draft',
      'Auto-calculated via fn_calculate_final_grade'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'enrollment_id',    p_enrollment_id,
    'grading_period_id', p_grading_period_id,
    'raw_grade',        v_raw_grade,
    'transmuted_grade', v_transmuted_grade,
    'total_weight_used', v_total_weight,
    'message',          'Grade calculated and saved successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$function$;

-- Internal helper: only called by other functions (same as 20261030010000)
REVOKE EXECUTE ON FUNCTION public.fn_calculate_final_grade(uuid, uuid) FROM PUBLIC, anon, authenticated;

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

REVOKE EXECUTE ON FUNCTION public.fn_submit_section_grades(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_submit_section_grades(uuid, uuid) TO authenticated;
