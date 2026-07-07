CREATE OR REPLACE FUNCTION public.fn_save_transmutation_table(p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_expected_grades NUMERIC[] := ARRAY[1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00];
    v_actual_grades   NUMERIC[];
    v_row             JSONB;
    v_grade           NUMERIC;
    v_floor           NUMERIC;
    v_prev_floor      NUMERIC;
    v_max             NUMERIC;
    v_first           BOOLEAN := TRUE;
BEGIN
    IF jsonb_array_length(p_rows) <> 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'The transmutation table must contain exactly 10 grade rows');
    END IF;

    SELECT array_agg((elem->>'transmuted_grade')::NUMERIC ORDER BY (elem->>'transmuted_grade')::NUMERIC)
    INTO v_actual_grades
    FROM jsonb_array_elements(p_rows) AS elem;

    IF v_actual_grades IS DISTINCT FROM v_expected_grades THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grade rungs must be exactly 1.00 to 3.00 in 0.25 steps plus 5.00');
    END IF;

    FOR v_row IN
        SELECT elem
        FROM jsonb_array_elements(p_rows) AS elem
        ORDER BY (elem->>'transmuted_grade')::NUMERIC ASC
    LOOP
        v_grade := (v_row->>'transmuted_grade')::NUMERIC;
        v_floor := (v_row->>'min_percentage')::NUMERIC;

        IF v_floor IS NULL OR v_floor < 0 OR v_floor > 100 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each minimum percentage must be between 0 and 100');
        END IF;

        IF v_floor <> trunc(v_floor) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each minimum percentage must be a whole number');
        END IF;

        IF v_grade = 5.00 AND v_floor <> 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'The 5.00 (Failed) floor must be 0');
        END IF;

        IF NOT v_first AND v_floor >= v_prev_floor THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each higher grade must have a strictly higher minimum percentage than the grade below it');
        END IF;

        v_prev_floor := v_floor;
        v_first := FALSE;
    END LOOP;

    UPDATE public.grade_transmutation_tables
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE program_id IS NULL
    AND deleted_at IS NULL;

    v_first := TRUE;

    FOR v_row IN
        SELECT elem
        FROM jsonb_array_elements(p_rows) AS elem
        ORDER BY (elem->>'transmuted_grade')::NUMERIC ASC
    LOOP
        v_grade := (v_row->>'transmuted_grade')::NUMERIC;
        v_floor := (v_row->>'min_percentage')::NUMERIC;

        IF v_first THEN
            v_max := 100;
        ELSE
            v_max := v_prev_floor - 1;
        END IF;

        INSERT INTO public.grade_transmutation_tables (
            label, min_percentage, max_percentage,
            transmuted_grade, description, created_by
        )
        VALUES (
            'Default',
            v_floor,
            v_max,
            v_grade,
            v_row->>'description',
            auth.uid()
        );

        v_prev_floor := v_floor;
        v_first := FALSE;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grade transmutation table saved successfully');
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_calculate_final_grade(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
  v_program_id          UUID;
BEGIN
  SELECT s.id INTO v_section_id
  FROM public.enrollments e
  INNER JOIN public.sections s ON s.id = e.section_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  IF v_section_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
  END IF;

  FOR v_component IN
    SELECT gc.id, gc.name, gc.weight
    FROM public.grading_components gc
    WHERE gc.section_id        = v_section_id
      AND gc.grading_period_id = p_grading_period_id
      AND gc.deleted_at        IS NULL
  LOOP
    SELECT
      COALESCE(SUM(asub.final_score), 0),
      COALESCE(SUM(ai.total_points),  0)
    INTO v_component_score, v_component_max
    FROM public.assessment_items ai
    INNER JOIN public.assessment_submissions asub
      ON asub.assessment_item_id = ai.id
      AND asub.enrollment_id     = p_enrollment_id
      AND asub.deleted_at        IS NULL
      AND asub.status            = 'Graded'
    WHERE ai.grading_component_id = v_component.id
      AND ai.deleted_at           IS NULL;

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

  v_raw_grade := ROUND((v_total_weighted / v_total_weight) * 100, 2);

  SELECT st.program_id INTO v_program_id
  FROM public.enrollments e
  INNER JOIN public.students st ON st.id = e.student_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND v_raw_grade    >= gtt.min_percentage
    AND gtt.deleted_at IS NULL
  ORDER BY (gtt.program_id IS NOT NULL) DESC, gtt.min_percentage DESC
  LIMIT 1;

  SELECT id INTO v_existing_grade_id
  FROM public.section_final_grades
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL;

  IF v_existing_grade_id IS NOT NULL THEN
    UPDATE public.section_final_grades
    SET
      raw_grade        = v_raw_grade,
      final_grade      = v_raw_grade,
      transmuted_grade = v_transmuted_grade,
      status           = 'Draft',
      remarks          = 'Auto-calculated via fn_calculate_final_grade'
    WHERE id = v_existing_grade_id;
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
$$;


UPDATE public.grade_transmutation_tables
SET deleted_at = now(), deleted_by = auth.uid()
WHERE program_id IS NULL
AND deleted_at IS NULL;

INSERT INTO public.grade_transmutation_tables (
    label, min_percentage, max_percentage, transmuted_grade, description
)
VALUES
    ('Default', 98, 100, 1.00, 'Excellent'),
    ('Default', 95, 97, 1.25, 'Superior'),
    ('Default', 92, 94, 1.50, 'Very Good'),
    ('Default', 89, 91, 1.75, 'Good'),
    ('Default', 86, 88, 2.00, 'Meritorious'),
    ('Default', 83, 85, 2.25, 'Very Satisfactory'),
    ('Default', 80, 82, 2.50, 'Satisfactory'),
    ('Default', 77, 79, 2.75, 'Fairly Satisfactory'),
    ('Default', 75, 76, 3.00, 'Passing'),
    ('Default', 0, 74, 5.00, 'Failed');
