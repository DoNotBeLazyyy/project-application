-- Migration: 20261002010000_fix_academic_threshold_category_type_enum.sql
-- Description: Fix "type public.academic_threshold_category_type does not exist" error by alias domain and updating fn_save_school_year_wizard

DO $$
BEGIN
    -- 1. Ensure public.academic_threshold_category enum type exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academic_threshold_category') THEN
        CREATE TYPE public.academic_threshold_category AS ENUM ('Honor', 'Scholarship', 'Standing');
    END IF;

    -- 2. Create public.academic_threshold_category_type as alias domain if missing to prevent 42704 errors
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academic_threshold_category_type') THEN
        CREATE DOMAIN public.academic_threshold_category_type AS public.academic_threshold_category;
    END IF;
END $$;

-- 3. Replace fn_save_school_year_wizard with fixed type casting
CREATE OR REPLACE FUNCTION public.fn_save_school_year_wizard(
    p_school_year_id uuid,
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean,
    p_max_units_per_term numeric,
    p_evaluation_scope text,
    p_terms jsonb,
    p_transmutation_rows jsonb,
    p_thresholds jsonb,
    p_holidays jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sy_id uuid;
    v_clean_code text;
    v_clean_label text;
    v_clean_eval_scope text;
    v_units numeric;
    v_is_new boolean := false;
    v_action text;
    v_current_user_id uuid;
    v_term_elem jsonb;
    v_gp_elem jsonb;
    v_row_elem jsonb;
    v_thresh_elem jsonb;
    v_holiday_elem jsonb;
    v_incoming_term_ids uuid[] := '{}';
    v_incoming_gp_ids uuid[] := '{}';
    v_term_id uuid;
    v_terms_count integer := 0;
    v_trans_count integer := 0;
    v_thresh_count integer := 0;
    v_holidays_count integer := 0;
    v_summary text;
    v_snapshot jsonb;
BEGIN
    -- 1. Authorization check: Admin only
    IF NOT ('Admin'::text = ANY (public.fn_current_user_role_codes())) THEN
        RAISE EXCEPTION 'Access denied. Admin role required to configure school year calendar wizard.';
    END IF;

    v_current_user_id := auth.uid();
    v_clean_code := btrim(COALESCE(p_code, ''));
    v_clean_label := btrim(COALESCE(p_label, ''));
    v_clean_eval_scope := btrim(COALESCE(p_evaluation_scope, 'By Term'));
    v_units := COALESCE(p_max_units_per_term, 24);

    -- 2. Input Validations
    IF v_clean_code = '' THEN
        RAISE EXCEPTION 'School year code is required.';
    END IF;
    IF v_clean_label = '' THEN
        RAISE EXCEPTION 'School year label is required.';
    END IF;
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RAISE EXCEPTION 'School year start and end dates are required.';
    END IF;
    IF p_end_date <= p_start_date THEN
        RAISE EXCEPTION 'School year end date must be strictly after start date.';
    END IF;

    -- 3. Check code uniqueness
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(code) = lower(v_clean_code)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'School year code "%" is already in use by another academic year.', v_clean_code;
    END IF;

    -- 4. Create or Update School Year Header
    IF p_school_year_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.school_years WHERE id = p_school_year_id AND deleted_at IS NULL) THEN
        v_sy_id := p_school_year_id;
        v_action := 'UPDATE';

        UPDATE public.school_years
        SET code = v_clean_code,
            label = v_clean_label,
            start_date = p_start_date,
            end_date = p_end_date,
            is_active = COALESCE(p_is_active, is_active),
            max_units_per_term = v_units,
            evaluation_scope = v_clean_eval_scope,
            updated_at = now()
        WHERE id = v_sy_id;
    ELSE
        v_is_new := true;
        v_action := 'CREATE';

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
            v_clean_eval_scope
        )
        RETURNING id INTO v_sy_id;
    END IF;

    -- If activating this school year, deactivate all others
    IF COALESCE(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = false
        WHERE id <> v_sy_id AND is_active = true AND deleted_at IS NULL;
    END IF;

    -- Counts for audit snapshot
    IF p_terms IS NOT NULL THEN
        v_terms_count := jsonb_array_length(p_terms);
    END IF;
    IF p_transmutation_rows IS NOT NULL THEN
        v_trans_count := jsonb_array_length(p_transmutation_rows);
    END IF;
    IF p_thresholds IS NOT NULL THEN
        v_thresh_count := jsonb_array_length(p_thresholds);
    END IF;
    IF p_holidays IS NOT NULL THEN
        v_holidays_count := jsonb_array_length(p_holidays);
    END IF;

    -- 5 & 6. Synchronize Terms & Grading Periods
    IF p_terms IS NOT NULL AND jsonb_array_length(p_terms) > 0 THEN
        FOR v_term_elem IN SELECT * FROM jsonb_array_elements(p_terms) LOOP
            v_term_id := NULL;

            IF v_term_elem ? 'id' AND (v_term_elem->>'id') IS NOT NULL AND (v_term_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                v_term_id := (v_term_elem->>'id')::uuid;
            END IF;

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id AND school_year_id = v_sy_id) THEN
                UPDATE public.terms
                SET term_type_id = NULLIF(v_term_elem->>'term_type_id', '')::uuid,
                    term_type_code = btrim(v_term_elem->>'term_type_code'),
                    term_type_label = btrim(v_term_elem->>'term_type_label'),
                    start_date = NULLIF(v_term_elem->>'start_date', '')::date,
                    end_date = NULLIF(v_term_elem->>'end_date', '')::date,
                    max_units = COALESCE(NULLIF(v_term_elem->>'max_units', '')::numeric, v_units),
                    enrollment_start_date = NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    enrollment_end_date = NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    grading_deadline = NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    updated_at = now()
                WHERE id = v_term_id;
            ELSE
                INSERT INTO public.terms (
                    school_year_id,
                    term_type_id,
                    term_type_code,
                    term_type_label,
                    start_date,
                    end_date,
                    max_units,
                    enrollment_start_date,
                    enrollment_end_date,
                    grading_deadline
                ) VALUES (
                    v_sy_id,
                    NULLIF(v_term_elem->>'term_type_id', '')::uuid,
                    btrim(v_term_elem->>'term_type_code'),
                    btrim(v_term_elem->>'term_type_label'),
                    NULLIF(v_term_elem->>'start_date', '')::date,
                    NULLIF(v_term_elem->>'end_date', '')::date,
                    COALESCE(NULLIF(v_term_elem->>'max_units', '')::numeric, v_units),
                    NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    NULLIF(v_term_elem->>'grading_deadline', '')::date
                )
                RETURNING id INTO v_term_id;
            END IF;

            v_incoming_term_ids := array_append(v_incoming_term_ids, v_term_id);

            -- Synchronize grading periods within this term
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
                                components = COALESCE(v_gp_elem->'components', '[]'::jsonb),
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
                                grade_encoding_end_date,
                                components
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
                                NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date,
                                COALESCE(v_gp_elem->'components', '[]'::jsonb)
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
                COALESCE(NULLIF(btrim(v_thresh_elem->>'category'), ''), 'Honor'),
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
                COALESCE(NULLIF(btrim(v_holiday_elem->>'exception_type'), ''), 'Holiday'),
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
