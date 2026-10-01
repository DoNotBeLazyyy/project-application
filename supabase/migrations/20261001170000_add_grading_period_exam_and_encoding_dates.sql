-- Migration: 20261001170000_add_grading_period_exam_and_encoding_dates.sql
-- Description: Add major examination day(s) and grade encoding range fields to grading_periods table and update calendar RPCs.

ALTER TABLE public.grading_periods
  ADD COLUMN IF NOT EXISTS major_exam_start_date DATE,
  ADD COLUMN IF NOT EXISTS major_exam_end_date DATE,
  ADD COLUMN IF NOT EXISTS grade_encoding_start_date DATE,
  ADD COLUMN IF NOT EXISTS grade_encoding_end_date DATE;

-- Update fn_get_academic_year_calendar_details to include the new fields
CREATE OR REPLACE FUNCTION public.fn_get_academic_year_calendar_details(p_school_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_sy record;
    v_terms jsonb;
    v_transmutation jsonb;
    v_thresholds jsonb;
    v_holidays jsonb;
BEGIN
    SELECT * INTO v_sy
    FROM public.school_years
    WHERE id = p_school_year_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found.');
    END IF;

    -- Collect terms and nested grading periods for this school year
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
            'evaluation_scope', COALESCE(t.evaluation_scope::TEXT, v_sy.evaluation_scope::TEXT, 'Period'),
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
                        'grade_encoding_end_date', gp.grade_encoding_end_date
                    ) ORDER BY gp.sequence ASC
                ), '[]'::jsonb)
                FROM public.grading_periods gp
                WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
            )
        ) ORDER BY t.start_date ASC
    ), '[]'::jsonb)
    INTO v_terms
    FROM public.terms t
    JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = p_school_year_id AND t.deleted_at IS NULL;

    -- Collect transmutation rows for this school year
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', gtt.id,
            'label', gtt.label,
            'min_percentage', gtt.min_percentage,
            'max_percentage', gtt.max_percentage,
            'transmuted_grade', gtt.transmuted_grade,
            'is_passing', gtt.is_passing,
            'special_code', gtt.special_code,
            'description', gtt.description,
            'is_conditional', (gtt.min_percentage IS NULL OR gtt.special_code IS NOT NULL)
        ) ORDER BY gtt.min_percentage DESC NULLS LAST
    ), '[]'::jsonb)
    INTO v_transmutation
    FROM public.grade_transmutation_tables gtt
    WHERE gtt.school_year_id = p_school_year_id AND gtt.deleted_at IS NULL;

    IF v_transmutation IS NULL OR jsonb_array_length(v_transmutation) = 0 THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gtt.id,
                'label', gtt.label,
                'min_percentage', gtt.min_percentage,
                'max_percentage', gtt.max_percentage,
                'transmuted_grade', gtt.transmuted_grade,
                'is_passing', gtt.is_passing,
                'special_code', gtt.special_code,
                'description', gtt.description,
                'is_conditional', (gtt.min_percentage IS NULL OR gtt.special_code IS NOT NULL)
            ) ORDER BY gtt.min_percentage DESC NULLS LAST
        ), '[]'::jsonb)
        INTO v_transmutation
        FROM public.grade_transmutation_tables gtt
        WHERE gtt.school_year_id IS NULL AND gtt.deleted_at IS NULL;
    END IF;

    -- Collect academic thresholds
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', ath.id,
            'category', ath.category,
            'code', ath.code,
            'label', ath.label,
            'min_gwa', ath.min_gwa,
            'max_gwa', ath.max_gwa,
            'min_subject_grade', ath.min_subject_grade,
            'requires_no_failing', ath.requires_no_failing,
            'scholarship_discount_pct', ath.scholarship_discount_pct,
            'sort_order', ath.sort_order,
            'is_active', ath.is_active
        ) ORDER BY ath.category ASC, ath.sort_order ASC
    ), '[]'::jsonb)
    INTO v_thresholds
    FROM public.academic_thresholds ath
    WHERE ath.school_year_id = p_school_year_id AND ath.deleted_at IS NULL;

    IF v_thresholds IS NULL OR jsonb_array_length(v_thresholds) = 0 THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ath.id,
                'category', ath.category,
                'code', ath.code,
                'label', ath.label,
                'min_gwa', ath.min_gwa,
                'max_gwa', ath.max_gwa,
                'min_subject_grade', ath.min_subject_grade,
                'requires_no_failing', ath.requires_no_failing,
                'scholarship_discount_pct', ath.scholarship_discount_pct,
                'sort_order', ath.sort_order,
                'is_active', ath.is_active
            ) ORDER BY ath.category ASC, ath.sort_order ASC
        ), '[]'::jsonb)
        INTO v_thresholds
        FROM public.academic_thresholds ath
        WHERE ath.school_year_id IS NULL AND ath.deleted_at IS NULL;
    END IF;

    -- Collect calendar exceptions / holidays
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', h.id,
            'title', h.title,
            'exception_type', h.exception_type,
            'start_date', h.start_date,
            'end_date', h.end_date,
            'affects_attendance', h.affects_attendance,
            'description', h.description
        ) ORDER BY h.start_date ASC
    ), '[]'::jsonb)
    INTO v_holidays
    FROM public.school_year_calendar_exceptions h
    WHERE h.school_year_id = p_school_year_id AND h.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_sy.id,
            'code', v_sy.code,
            'label', v_sy.label,
            'start_date', v_sy.start_date,
            'end_date', v_sy.end_date,
            'is_active', v_sy.is_active,
            'max_units_per_term', COALESCE(v_sy.max_units_per_term, 24),
            'evaluation_scope', COALESCE(v_sy.evaluation_scope::TEXT, 'Period'),
            'terms', v_terms,
            'transmutation_rows', v_transmutation,
            'thresholds', v_thresholds,
            'holidays', v_holidays
        )
    );
END;
$$;

-- Update fn_save_academic_year_calendar to store major_exam and grade_encoding dates
CREATE OR REPLACE FUNCTION public.fn_save_academic_year_calendar(
    p_school_year_id uuid,
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean,
    p_terms jsonb,
    p_transmutation_rows jsonb,
    p_thresholds jsonb DEFAULT '[]'::jsonb,
    p_max_units_per_term smallint DEFAULT 24,
    p_evaluation_scope text DEFAULT 'Period',
    p_holidays jsonb DEFAULT '[]'::jsonb
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
    v_holiday_elem jsonb;
    v_incoming_term_ids uuid[] := '{}';
    v_incoming_gp_ids uuid[] := '{}';
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_clean_eval_scope text := COALESCE(NULLIF(btrim(p_evaluation_scope), ''), 'Period');
    v_units smallint := COALESCE(p_max_units_per_term, 24);
    v_current_user_id uuid := auth.uid();
    v_is_new boolean := (p_school_year_id IS NULL);
    v_action text;
    v_terms_count int := COALESCE(jsonb_array_length(p_terms), 0);
    v_trans_count int := COALESCE(jsonb_array_length(p_transmutation_rows), 0);
    v_thresh_count int := COALESCE(jsonb_array_length(p_thresholds), 0);
    v_holidays_count int := COALESCE(jsonb_array_length(p_holidays), 0);
    v_summary text;
    v_snapshot jsonb;
    v_conflicting_sy RECORD;
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

    IF v_units < 1 OR v_units > 60 THEN
        v_units := 24;
    END IF;

    IF v_clean_eval_scope NOT IN ('Period', 'Term') THEN
        v_clean_eval_scope := 'Period';
    END IF;

    -- 1. Check duplicate code
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code already exists: ' || v_clean_code);
    END IF;

    -- 2. Check duplicate label
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- 3. Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- 4. Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE (p_school_year_id IS NULL OR id <> p_school_year_id)
      AND deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    -- 5. Create or Update School Year
    IF v_is_new THEN
        IF p_is_active THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true;
        END IF;

        INSERT INTO public.school_years (
            code,
            label,
            start_date,
            end_date,
            is_active,
            max_units_per_term,
            evaluation_scope
        ) VALUES (
            v_clean_code,
            v_clean_label,
            p_start_date,
            p_end_date,
            COALESCE(p_is_active, false),
            v_units,
            v_clean_eval_scope::public.evaluation_scope_type
        )
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
            max_units_per_term = v_units,
            evaluation_scope = v_clean_eval_scope::public.evaluation_scope_type,
            updated_at = now()
        WHERE id = v_sy_id;

        v_action := 'UPDATED';
    END IF;

    -- 6. Synchronize Terms
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
                    evaluation_scope = COALESCE(
                        NULLIF(v_term_elem->>'evaluation_scope', '')::public.evaluation_scope_type,
                        v_clean_eval_scope::public.evaluation_scope_type
                    ),
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
                    status,
                    evaluation_scope
                ) VALUES (
                    v_sy_id,
                    (v_term_elem->>'term_type_id')::uuid,
                    (v_term_elem->>'start_date')::date,
                    (v_term_elem->>'end_date')::date,
                    NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    COALESCE(v_term_elem->>'status', 'Upcoming'),
                    COALESCE(
                        NULLIF(v_term_elem->>'evaluation_scope', '')::public.evaluation_scope_type,
                        v_clean_eval_scope::public.evaluation_scope_type
                    )
                )
                RETURNING id INTO v_term_id;
            END IF;

            v_incoming_term_ids := array_append(v_incoming_term_ids, v_term_id);

            -- Synchronize Grading Periods for this term
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
                                major_exam_start_date = NULLIF(v_gp_elem->>'major_exam_start_date', '')::date,
                                major_exam_end_date = NULLIF(v_gp_elem->>'major_exam_end_date', '')::date,
                                grade_encoding_start_date = NULLIF(v_gp_elem->>'grade_encoding_start_date', '')::date,
                                grade_encoding_end_date = NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date,
                                updated_at = now()
                            WHERE id = v_gp_id;
                        ELSE
                            INSERT INTO public.grading_periods (
                                term_id,
                                name,
                                sequence,
                                start_date,
                                end_date,
                                weight,
                                major_exam_start_date,
                                major_exam_end_date,
                                grade_encoding_start_date,
                                grade_encoding_end_date
                            ) VALUES (
                                v_term_id,
                                btrim(v_gp_elem->>'name'),
                                COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                NULLIF(v_gp_elem->>'start_date', '')::date,
                                NULLIF(v_gp_elem->>'end_date', '')::date,
                                COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25),
                                NULLIF(v_gp_elem->>'major_exam_start_date', '')::date,
                                NULLIF(v_gp_elem->>'major_exam_end_date', '')::date,
                                NULLIF(v_gp_elem->>'grade_encoding_start_date', '')::date,
                                NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date
                            )
                            RETURNING id INTO v_gp_id;
                        END IF;

                        v_incoming_gp_ids := array_append(v_incoming_gp_ids, v_gp_id);
                    END;
                END LOOP;
            END IF;

            -- Soft delete removed grading periods for this term
            UPDATE public.grading_periods
            SET deleted_at = now()
            WHERE term_id = v_term_id
              AND deleted_at IS NULL
              AND NOT (id = ANY(v_incoming_gp_ids));
        END LOOP;
    END IF;

    -- Soft delete removed terms for this school year
    UPDATE public.terms
    SET deleted_at = now()
    WHERE school_year_id = v_sy_id
      AND deleted_at IS NULL
      AND NOT (id = ANY(v_incoming_term_ids));

    -- 7. Synchronize Transmutation Table Rows
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
                btrim(v_row_elem->>'label'),
                NULLIF(v_row_elem->>'min_percentage', '')::numeric,
                NULLIF(v_row_elem->>'max_percentage', '')::numeric,
                NULLIF(v_row_elem->>'transmuted_grade', '')::numeric,
                COALESCE((v_row_elem->>'is_passing')::boolean, true),
                NULLIF(btrim(v_row_elem->>'special_code'), ''),
                NULLIF(btrim(v_row_elem->>'description'), '')
            );
        END LOOP;
    END IF;

    -- 8. Synchronize Academic Thresholds
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
                (v_thresh_elem->>'category')::public.academic_threshold_category,
                btrim(v_thresh_elem->>'code'),
                btrim(v_thresh_elem->>'label'),
                NULLIF(v_thresh_elem->>'min_gwa', '')::numeric,
                (v_thresh_elem->>'max_gwa')::numeric,
                NULLIF(v_thresh_elem->>'min_subject_grade', '')::numeric,
                COALESCE((v_thresh_elem->>'requires_no_failing')::boolean, false),
                NULLIF(v_thresh_elem->>'scholarship_discount_pct', '')::numeric,
                COALESCE((v_thresh_elem->>'sort_order')::smallint, 1),
                COALESCE((v_thresh_elem->>'is_active')::boolean, true)
            );
        END LOOP;
    END IF;

    -- 9. Synchronize Holidays / Exceptions
    IF p_holidays IS NOT NULL THEN
        DELETE FROM public.school_year_calendar_exceptions
        WHERE school_year_id = v_sy_id;

        FOR v_holiday_elem IN SELECT * FROM jsonb_array_elements(p_holidays) LOOP
            INSERT INTO public.school_year_calendar_exceptions (
                school_year_id,
                title,
                exception_type,
                start_date,
                end_date,
                affects_attendance,
                description
            ) VALUES (
                v_sy_id,
                btrim(v_holiday_elem->>'title'),
                (v_holiday_elem->>'exception_type')::public.calendar_exception_type,
                (v_holiday_elem->>'start_date')::date,
                (v_holiday_elem->>'end_date')::date,
                COALESCE((v_holiday_elem->>'affects_attendance')::boolean, true),
                NULLIF(btrim(v_holiday_elem->>'description'), '')
            );
        END LOOP;
    END IF;

    -- 10. Record School Year Audit History
    v_summary := CASE 
        WHEN v_is_new THEN 'Created new academic year "' || v_clean_label || '" with ' || v_terms_count || ' terms, ' || v_trans_count || ' grade schema rules, ' || v_thresh_count || ' thresholds, and ' || v_holidays_count || ' holidays.'
        ELSE 'Updated academic year "' || v_clean_label || '" configuration (' || v_terms_count || ' terms, ' || v_trans_count || ' grade schema rules, ' || v_thresh_count || ' thresholds, ' || v_holidays_count || ' holidays).'
    END;

    SELECT jsonb_build_object(
        'id', v_sy_id,
        'code', v_clean_code,
        'label', v_clean_label,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'is_active', COALESCE(p_is_active, false),
        'max_units_per_term', v_units,
        'evaluation_scope', v_clean_eval_scope,
        'terms_count', v_terms_count,
        'transmutation_rows_count', v_trans_count,
        'thresholds_count', v_thresh_count,
        'holidays_count', v_holidays_count
    ) INTO v_snapshot;

    INSERT INTO public.school_year_histories (
        school_year_id,
        action,
        changed_by,
        change_summary,
        snapshot
    ) VALUES (
        v_sy_id,
        v_action,
        v_current_user_id,
        v_summary,
        v_snapshot
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Academic year calendar saved successfully.',
        'school_year_id', v_sy_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb, jsonb, smallint, text, jsonb) TO authenticated, anon, service_role;

-- Update fn_list_grading_periods_by_section to include major_exam and grade_encoding dates
CREATE OR REPLACE FUNCTION public.fn_list_grading_periods_by_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',                        gp.id,
                'name',                      gp.name,
                'sequence',                  gp.sequence,
                'weight',                    gp.weight,
                'start_date',                gp.start_date,
                'end_date',                  gp.end_date,
                'major_exam_start_date',     gp.major_exam_start_date,
                'major_exam_end_date',       gp.major_exam_end_date,
                'grade_encoding_start_date', gp.grade_encoding_start_date,
                'grade_encoding_end_date',   gp.grade_encoding_end_date
            )
            ORDER BY gp.sequence ASC
        ), '[]'::JSONB)
        FROM public.grading_periods gp
        INNER JOIN public.sections s ON s.term_id = gp.term_id
        WHERE s.id = p_section_id
        AND s.deleted_at IS NULL
        AND gp.deleted_at IS NULL
    );
END;
$$;
