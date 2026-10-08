-- Migration: 20261002120000_fix_evaluation_scope_type_casting.sql
-- Description: Fix Postgres 42804 datatype mismatch by explicitly casting evaluation_scope and exception_type to their respective enums, ensure created_by column safety on school_year_calendar_exceptions, and maintain schema-aligned column inserts.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'evaluation_scope_type') THEN
        CREATE TYPE public.evaluation_scope_type AS ENUM ('Period', 'Term');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_exception_type') THEN
        CREATE TYPE public.calendar_exception_type AS ENUM ('Holiday', 'Break', 'Suspension', 'Special Class', 'Exam Day');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academic_threshold_category') THEN
        CREATE TYPE public.academic_threshold_category AS ENUM ('Honor', 'Scholarship', 'Standing');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'academic_threshold_category_type') THEN
        CREATE DOMAIN public.academic_threshold_category_type AS public.academic_threshold_category;
    END IF;
END $$;

ALTER TABLE public.school_year_calendar_exceptions
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

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

    -- 5. Create or Update School Year Header
    IF v_is_new THEN
        IF COALESCE(p_is_active, false) THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND deleted_at IS NULL;
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

        IF COALESCE(p_is_active, false) THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND id <> v_sy_id AND deleted_at IS NULL;
        END IF;

        UPDATE public.school_years
        SET code = v_clean_code,
            label = v_clean_label,
            start_date = p_start_date,
            end_date = p_end_date,
            is_active = COALESCE(p_is_active, false),
            max_units_per_term = v_units,
            evaluation_scope = v_clean_eval_scope::public.evaluation_scope_type,
            updated_at = now(),
            updated_by = v_current_user_id
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

            IF v_term_id IS NULL AND (v_term_elem ? 'term_type_id') AND (v_term_elem->>'term_type_id') IS NOT NULL AND (v_term_elem->>'term_type_id') ~ '^[0-9a-fA-F-]{36}$' THEN
                SELECT id INTO v_term_id
                FROM public.terms
                WHERE school_year_id = v_sy_id
                  AND term_type_id = (v_term_elem->>'term_type_id')::uuid
                LIMIT 1;
            END IF;

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id) THEN
                UPDATE public.terms
                SET school_year_id = v_sy_id,
                    term_type_id = (v_term_elem->>'term_type_id')::uuid,
                    start_date = (v_term_elem->>'start_date')::date,
                    end_date = (v_term_elem->>'end_date')::date,
                    enrollment_start_date = NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    enrollment_end_date = NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    grading_deadline = NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    status = COALESCE(v_term_elem->>'status', status, 'Upcoming'),
                    evaluation_scope = CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = now(),
                    updated_by = v_current_user_id
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
                    CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END
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

                        IF v_gp_id IS NULL THEN
                            SELECT id INTO v_gp_id
                            FROM public.grading_periods
                            WHERE term_id = v_term_id
                              AND (
                                  (sequence = COALESCE((v_gp_elem->>'sequence')::smallint, 1))
                                  OR (lower(name) = lower(btrim(v_gp_elem->>'name')))
                              )
                            LIMIT 1;
                        END IF;

                        IF v_gp_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.grading_periods WHERE id = v_gp_id) THEN
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
                                deleted_at = NULL,
                                deleted_by = NULL,
                                updated_at = now(),
                                updated_by = v_current_user_id
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
            SET deleted_at = now(),
                deleted_by = v_current_user_id
            WHERE term_id = v_term_id
              AND deleted_at IS NULL
              AND NOT (id = ANY(v_incoming_gp_ids));
        END LOOP;
    END IF;

    -- Soft delete removed terms for this school year
    UPDATE public.terms
    SET deleted_at = now(),
        deleted_by = v_current_user_id
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
                CASE 
                    WHEN btrim(COALESCE(v_thresh_elem->>'category', '')) IN ('Honor', 'Scholarship', 'Standing')
                    THEN btrim(v_thresh_elem->>'category')
                    ELSE 'Honor'
                END,
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
                CASE 
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Break' THEN 'Break'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Suspension' THEN 'Suspension'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) IN ('Exam', 'Exam Day') THEN 'Exam'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) IN ('Event', 'Special Class') THEN 'Event'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Other' THEN 'Other'::public.calendar_exception_type
                    ELSE 'Holiday'::public.calendar_exception_type
                END,
                COALESCE(NULLIF(v_holiday_elem->>'start_date', '')::date, p_start_date),
                COALESCE(NULLIF(v_holiday_elem->>'end_date', '')::date, NULLIF(v_holiday_elem->>'start_date', '')::date, p_start_date),
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
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.fn_save_academic_year_calendar(
        p_school_year_id => p_school_year_id,
        p_code => p_code,
        p_label => p_label,
        p_start_date => p_start_date,
        p_end_date => p_end_date,
        p_is_active => p_is_active,
        p_terms => p_terms,
        p_transmutation_rows => p_transmutation_rows,
        p_thresholds => p_thresholds,
        p_max_units_per_term => COALESCE(p_max_units_per_term, 24)::smallint,
        p_evaluation_scope => p_evaluation_scope,
        p_holidays => p_holidays
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_save_school_year_wizard(uuid, text, text, date, date, boolean, numeric, text, jsonb, jsonb, jsonb, jsonb) TO authenticated, anon, service_role;
