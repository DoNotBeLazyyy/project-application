-- ====================================================================
-- Migration: 20260110000000_fix_transmuted_grade_nullable.sql
-- Description: Allow NULL transmuted_grade in grade_transmutation_tables for non-numeric special grades (e.g. DRP, INC)
--              and harden fn_save_academic_year_calendar and fn_calculate_final_grade.
-- ====================================================================

-- 1. Drop NOT NULL constraint on transmuted_grade in grade_transmutation_tables
ALTER TABLE public.grade_transmutation_tables
    ALTER COLUMN transmuted_grade DROP NOT NULL;

-- 2. Update fn_save_academic_year_calendar with resilient field handling
CREATE OR REPLACE FUNCTION public.fn_save_academic_year_calendar(
    p_school_year_id uuid,
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean,
    p_terms jsonb,
    p_transmutation_rows jsonb,
    p_thresholds jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_sy_id uuid;
    v_term_elem jsonb;
    v_term_id uuid;
    v_gp_elem jsonb;
    v_row_elem jsonb;
    v_thresh_elem jsonb;
    v_incoming_term_ids uuid[] := '{}';
    v_incoming_gp_ids uuid[] := '{}';
    v_clean_code text := btrim(p_code);
    v_clean_label text := btrim(p_label);
    v_current_user_id uuid := auth.uid();
    v_is_new boolean := (p_school_year_id IS NULL);
    v_action text;
    v_terms_count int := COALESCE(jsonb_array_length(p_terms), 0);
    v_trans_count int := COALESCE(jsonb_array_length(p_transmutation_rows), 0);
    v_thresh_count int := COALESCE(jsonb_array_length(p_thresholds), 0);
    v_summary text;
    v_snapshot jsonb;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code is required.');
    END IF;

    IF v_clean_label IS NULL OR v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    -- Check duplicate code
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = v_clean_code
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || v_clean_code);
    END IF;

    -- 1. Create or Update School Year
    IF v_is_new THEN
        IF p_is_active THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true;
        END IF;

        INSERT INTO public.school_years (code, label, start_date, end_date, is_active)
        VALUES (v_clean_code, v_clean_label, p_start_date, p_end_date, COALESCE(p_is_active, false))
        RETURNING id INTO v_sy_id;
        
        v_action := 'CREATED';
    ELSE
        v_sy_id := p_school_year_id;

        IF p_is_active THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND id <> v_sy_id;
        END IF;

        UPDATE public.school_years
        SET code = v_clean_code,
            label = v_clean_label,
            start_date = p_start_date,
            end_date = p_end_date,
            is_active = COALESCE(p_is_active, false),
            updated_at = now()
        WHERE id = v_sy_id;

        v_action := 'UPDATED';
    END IF;

    -- 2. Synchronize Terms
    IF p_terms IS NOT NULL AND jsonb_array_length(p_terms) > 0 THEN
        FOR v_term_elem IN SELECT * FROM jsonb_array_elements(p_terms) LOOP
            v_term_id := NULL;
            IF v_term_elem ? 'id' AND (v_term_elem->>'id') IS NOT NULL AND (v_term_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                v_term_id := (v_term_elem->>'id')::uuid;
            END IF;

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id AND school_year_id = v_sy_id) THEN
                UPDATE public.terms
                SET term_type_id = (v_term_elem->>'term_type_id')::uuid,
                    start_date = (v_term_elem->>'start_date')::date,
                    end_date = (v_term_elem->>'end_date')::date,
                    enrollment_start_date = NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    enrollment_end_date = NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    grading_deadline = NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    updated_at = now()
                WHERE id = v_term_id;
            ELSE
                INSERT INTO public.terms (
                    school_year_id,
                    term_type_id,
                    start_date,
                    end_date,
                    enrollment_start_date,
                    enrollment_end_date,
                    grading_deadline,
                    status
                ) VALUES (
                    v_sy_id,
                    (v_term_elem->>'term_type_id')::uuid,
                    (v_term_elem->>'start_date')::date,
                    (v_term_elem->>'end_date')::date,
                    NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    COALESCE(v_term_elem->>'status', 'Upcoming')
                )
                RETURNING id INTO v_term_id;
            END IF;

            v_incoming_term_ids := array_append(v_incoming_term_ids, v_term_id);

            -- 3. Synchronize Grading Periods for this term
            IF v_term_elem ? 'grading_periods' AND jsonb_array_length(v_term_elem->'grading_periods') > 0 THEN
                FOR v_gp_elem IN SELECT * FROM jsonb_array_elements(v_term_elem->'grading_periods') LOOP
                    DECLARE
                        v_gp_id uuid := NULL;
                    BEGIN
                        IF v_gp_elem ? 'id' AND (v_gp_elem->>'id') IS NOT NULL AND (v_gp_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                            v_gp_id := (v_gp_elem->>'id')::uuid;
                        END IF;

                        IF v_gp_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.grading_periods WHERE id = v_gp_id AND term_id = v_term_id) THEN
                            UPDATE public.grading_periods
                            SET name = btrim(v_gp_elem->>'name'),
                                sequence = COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                start_date = NULLIF(v_gp_elem->>'start_date', '')::date,
                                end_date = NULLIF(v_gp_elem->>'end_date', '')::date,
                                weight = COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25),
                                updated_at = now()
                            WHERE id = v_gp_id;
                        ELSE
                            INSERT INTO public.grading_periods (
                                term_id,
                                name,
                                sequence,
                                start_date,
                                end_date,
                                weight
                            ) VALUES (
                                v_term_id,
                                btrim(v_gp_elem->>'name'),
                                COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                NULLIF(v_gp_elem->>'start_date', '')::date,
                                NULLIF(v_gp_elem->>'end_date', '')::date,
                                COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25)
                            )
                            RETURNING id INTO v_gp_id;
                        END IF;

                        v_incoming_gp_ids := array_append(v_incoming_gp_ids, v_gp_id);
                    END;
                END LOOP;

                -- Soft-delete grading periods for this term that were removed
                UPDATE public.grading_periods
                SET deleted_at = now()
                WHERE term_id = v_term_id
                  AND deleted_at IS NULL
                  AND NOT (id = ANY(v_incoming_gp_ids));
            END IF;
        END LOOP;

        -- Soft-delete terms for this school year that were removed
        UPDATE public.terms
        SET deleted_at = now()
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL
          AND NOT (id = ANY(v_incoming_term_ids));
    END IF;

    -- 4. Synchronize Transmutation Rows for this school year
    IF p_transmutation_rows IS NOT NULL AND jsonb_array_length(p_transmutation_rows) > 0 THEN
        DELETE FROM public.grade_transmutation_tables
        WHERE school_year_id = v_sy_id;

        FOR v_row_elem IN SELECT * FROM jsonb_array_elements(p_transmutation_rows) LOOP
            INSERT INTO public.grade_transmutation_tables (
                school_year_id,
                label,
                min_percentage,
                max_percentage,
                transmuted_grade,
                is_passing,
                special_code,
                description
            ) VALUES (
                v_sy_id,
                COALESCE(NULLIF(btrim(v_row_elem->>'label'), ''), 'Grade'),
                COALESCE(NULLIF(v_row_elem->>'min_percentage', '')::numeric, 0),
                COALESCE(NULLIF(v_row_elem->>'max_percentage', '')::numeric, 0),
                NULLIF(v_row_elem->>'transmuted_grade', '')::numeric,
                COALESCE((v_row_elem->>'is_passing')::boolean, true),
                NULLIF(btrim(v_row_elem->>'special_code'), ''),
                NULLIF(btrim(v_row_elem->>'description'), '')
            );
        END LOOP;
    END IF;

    -- 5. Synchronize Academic Thresholds for this school year
    IF p_thresholds IS NOT NULL AND jsonb_array_length(p_thresholds) > 0 THEN
        DELETE FROM public.academic_thresholds
        WHERE school_year_id = v_sy_id;

        FOR v_thresh_elem IN SELECT * FROM jsonb_array_elements(p_thresholds) LOOP
            INSERT INTO public.academic_thresholds (
                school_year_id,
                category,
                code,
                label,
                min_gwa,
                max_gwa,
                min_subject_grade,
                requires_no_failing,
                scholarship_discount_pct,
                sort_order,
                is_active
            ) VALUES (
                v_sy_id,
                COALESCE(btrim(v_thresh_elem->>'category'), 'Honor'),
                COALESCE(NULLIF(btrim(v_thresh_elem->>'code'), ''), lower(regexp_replace(COALESCE(btrim(v_thresh_elem->>'label'), 'thresh'), '[^a-zA-Z0-9]+', '_', 'g'))),
                COALESCE(NULLIF(btrim(v_thresh_elem->>'label'), ''), 'Academic Threshold'),
                NULLIF(v_thresh_elem->>'min_gwa', '')::numeric,
                COALESCE(NULLIF(v_thresh_elem->>'max_gwa', '')::numeric, 1.75),
                NULLIF(v_thresh_elem->>'min_subject_grade', '')::numeric,
                COALESCE((v_thresh_elem->>'requires_no_failing')::boolean, true),
                NULLIF(v_thresh_elem->>'scholarship_discount_pct', '')::numeric,
                COALESCE((v_thresh_elem->>'sort_order')::integer, 0),
                COALESCE((v_thresh_elem->>'is_active')::boolean, true)
            );
        END LOOP;
    END IF;

    -- 6. Record School Year Change History
    IF v_action = 'CREATED' THEN
        v_summary := 'Created academic year "' || v_clean_label || '" (' || v_clean_code || ') with ' 
                     || v_terms_count || ' term(s), ' 
                     || v_trans_count || ' grade rung(s), and ' 
                     || v_thresh_count || ' academic threshold(s).';
    ELSE
        v_summary := 'Updated academic year "' || v_clean_label || '" (' || v_clean_code || ') configuration with '
                     || v_terms_count || ' term(s), ' 
                     || v_trans_count || ' grade rung(s), and ' 
                     || v_thresh_count || ' academic threshold(s).';
    END IF;

    v_snapshot := jsonb_build_object(
        'id', v_sy_id,
        'code', v_clean_code,
        'label', v_clean_label,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'is_active', COALESCE(p_is_active, false),
        'terms_count', v_terms_count,
        'transmutation_rows_count', v_trans_count,
        'thresholds_count', v_thresh_count,
        'terms', COALESCE(p_terms, '[]'::jsonb),
        'transmutation_rows', COALESCE(p_transmutation_rows, '[]'::jsonb),
        'thresholds', COALESCE(p_thresholds, '[]'::jsonb)
    );

    INSERT INTO public.school_year_histories (
        school_year_id,
        action,
        changed_by,
        changed_at,
        change_summary,
        snapshot
    ) VALUES (
        v_sy_id,
        v_action,
        v_current_user_id,
        now(),
        v_summary,
        v_snapshot
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Academic Year, Calendar, and Thresholds saved successfully.',
        'school_year_id', v_sy_id
    );
END;
$$;

-- 3. Update fn_calculate_final_grade to ignore non-numeric special grades without numeric transmuted_grade
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

  -- Pick numeric transmuted grade matching the score range
  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND v_raw_grade    >= gtt.min_percentage
    AND gtt.transmuted_grade IS NOT NULL
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
$function$;

GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb, jsonb) TO authenticated;
