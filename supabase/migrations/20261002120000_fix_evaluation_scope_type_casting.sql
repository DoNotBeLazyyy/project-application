-- Migration: 20261002120000_fix_evaluation_scope_type_casting.sql
-- Description: Fix Postgres 42804 datatype mismatch by explicitly casting v_clean_eval_scope text to public.evaluation_scope_type enum

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
    v_incoming_term_ids uuid[] := ARRAY[]::uuid[];
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_clean_eval_scope text := COALESCE(NULLIF(btrim(p_evaluation_scope), ''), 'Period');
    v_units smallint := COALESCE(p_max_units_per_term, 24);
    v_current_user_id uuid := auth.uid();
    v_is_new boolean := false;
    v_action text := 'UPDATE';
    v_terms_count integer := 0;
    v_trans_count integer := 0;
    v_thresh_count integer := 0;
    v_holidays_count integer := 0;
    v_summary text;
    v_snapshot jsonb;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code is required.');
    END IF;

    IF v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    -- Validate max_units_per_term against system setting bounds
    IF v_units < 1 OR v_units > 60 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum units per term must be between 1 and 60.');
    END IF;

    -- Validate evaluation scope
    IF v_clean_eval_scope NOT IN ('Period', 'Term') THEN
        v_clean_eval_scope := 'Period';
    END IF;

    -- Check duplicate code / label
    IF EXISTS (
        SELECT 1
        FROM public.school_years
        WHERE (LOWER(code) = LOWER(v_clean_code) OR LOWER(label) = LOWER(v_clean_label))
        AND deleted_at IS NULL
        AND (p_school_year_id IS NULL OR id <> p_school_year_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the same code or label already exists.');
    END IF;

    -- Check overlapping active dates with other school years
    IF EXISTS (
        SELECT 1
        FROM public.school_years
        WHERE deleted_at IS NULL
        AND (p_school_year_id IS NULL OR id <> p_school_year_id)
        AND (p_start_date <= end_date AND p_end_date >= start_date)
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'The school year dates overlap with an existing school year.');
    END IF;

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

    -- 5. Create or Update School Year
    IF p_school_year_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.school_years WHERE id = p_school_year_id AND deleted_at IS NULL) THEN
        v_sy_id := p_school_year_id;
        v_action := 'UPDATE';

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
    ELSE
        v_action := 'CREATE';

        INSERT INTO public.school_years (
            code,
            label,
            start_date,
            end_date,
            is_active,
            max_units_per_term,
            evaluation_scope,
            created_at,
            created_by
        ) VALUES (
            v_clean_code,
            v_clean_label,
            p_start_date,
            p_end_date,
            COALESCE(p_is_active, false),
            v_units,
            v_clean_eval_scope::public.evaluation_scope_type,
            now(),
            v_current_user_id
        )
        RETURNING id INTO v_sy_id;
    END IF;

    -- If active, deactivate other school years
    IF COALESCE(p_is_active, false) = true THEN
        UPDATE public.school_years
        SET is_active = false
        WHERE id <> v_sy_id
        AND deleted_at IS NULL;
    END IF;

    -- 6. Synchronize Terms
    IF p_terms IS NOT NULL AND jsonb_array_length(p_terms) > 0 THEN
        FOR v_term_elem IN SELECT * FROM jsonb_array_elements(p_terms) LOOP
            v_term_id := NULL;
            IF (v_term_elem->>'id') IS NOT NULL AND (v_term_elem->>'id') <> '' THEN
                BEGIN
                    v_term_id := (v_term_elem->>'id')::uuid;
                EXCEPTION WHEN OTHERS THEN
                    v_term_id := NULL;
                END;
            END IF;

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id AND school_year_id = v_sy_id) THEN
                UPDATE public.terms
                SET name = btrim(v_term_elem->>'name'),
                    term_type_id = (v_term_elem->>'term_type_id')::uuid,
                    term_order = (v_term_elem->>'term_order')::smallint,
                    start_date = (v_term_elem->>'start_date')::date,
                    end_date = (v_term_elem->>'end_date')::date,
                    is_active = COALESCE((v_term_elem->>'is_active')::boolean, false),
                    deleted_at = NULL,
                    updated_at = now(),
                    updated_by = v_current_user_id
                WHERE id = v_term_id;
            ELSE
                INSERT INTO public.terms (
                    school_year_id,
                    term_type_id,
                    name,
                    term_order,
                    start_date,
                    end_date,
                    is_active,
                    created_at,
                    created_by
                ) VALUES (
                    v_sy_id,
                    (v_term_elem->>'term_type_id')::uuid,
                    btrim(v_term_elem->>'name'),
                    (v_term_elem->>'term_order')::smallint,
                    (v_term_elem->>'start_date')::date,
                    (v_term_elem->>'end_date')::date,
                    COALESCE((v_term_elem->>'is_active')::boolean, false),
                    now(),
                    v_current_user_id
                )
                RETURNING id INTO v_term_id;
            END IF;

            v_incoming_term_ids := array_append(v_incoming_term_ids, v_term_id);

            -- Synchronize Grading Periods for this Term
            IF (v_term_elem->'grading_periods') IS NOT NULL AND jsonb_array_length(v_term_elem->'grading_periods') > 0 THEN
                FOR v_gp_elem IN SELECT * FROM jsonb_array_elements(v_term_elem->'grading_periods') LOOP
                    DECLARE
                        v_gp_id uuid := NULL;
                    BEGIN
                        IF (v_gp_elem->>'id') IS NOT NULL AND (v_gp_elem->>'id') <> '' THEN
                            BEGIN
                                v_gp_id := (v_gp_elem->>'id')::uuid;
                            EXCEPTION WHEN OTHERS THEN
                                v_gp_id := NULL;
                            END;
                        END IF;

                        IF v_gp_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.grading_periods WHERE id = v_gp_id AND term_id = v_term_id) THEN
                            UPDATE public.grading_periods
                            SET grading_period_order = (v_gp_elem->>'grading_period_order')::smallint,
                                title = btrim(v_gp_elem->>'title'),
                                weight_percentage = (v_gp_elem->>'weight_percentage')::numeric,
                                start_date = (v_gp_elem->>'start_date')::date,
                                end_date = (v_gp_elem->>'end_date')::date,
                                exam_date = NULLIF(v_gp_elem->>'exam_date', '')::date,
                                encoding_deadline = NULLIF(v_gp_elem->>'encoding_deadline', '')::date,
                                written_work_pct = NULLIF(v_gp_elem->>'written_work_pct', '')::numeric,
                                performance_task_pct = NULLIF(v_gp_elem->>'performance_task_pct', '')::numeric,
                                quarterly_exam_pct = NULLIF(v_gp_elem->>'quarterly_exam_pct', '')::numeric,
                                components = COALESCE(v_gp_elem->'components', '[]'::jsonb),
                                deleted_at = NULL,
                                updated_at = now(),
                                updated_by = v_current_user_id
                            WHERE id = v_gp_id;
                        ELSE
                            INSERT INTO public.grading_periods (
                                term_id,
                                grading_period_order,
                                title,
                                weight_percentage,
                                start_date,
                                end_date,
                                exam_date,
                                encoding_deadline,
                                written_work_pct,
                                performance_task_pct,
                                quarterly_exam_pct,
                                components,
                                created_at,
                                created_by
                            ) VALUES (
                                v_term_id,
                                (v_gp_elem->>'grading_period_order')::smallint,
                                btrim(v_gp_elem->>'title'),
                                (v_gp_elem->>'weight_percentage')::numeric,
                                (v_gp_elem->>'start_date')::date,
                                (v_gp_elem->>'end_date')::date,
                                NULLIF(v_gp_elem->>'exam_date', '')::date,
                                NULLIF(v_gp_elem->>'encoding_deadline', '')::date,
                                NULLIF(v_gp_elem->>'written_work_pct', '')::numeric,
                                NULLIF(v_gp_elem->>'performance_task_pct', '')::numeric,
                                NULLIF(v_gp_elem->>'quarterly_exam_pct', '')::numeric,
                                COALESCE(v_gp_elem->'components', '[]'::jsonb),
                                now(),
                                v_current_user_id
                            );
                        END IF;
                    END;
                END LOOP;
            END IF;
        END LOOP;

        -- Soft delete omitted terms for this school year
        UPDATE public.terms
        SET deleted_at = now(),
            deleted_by = v_current_user_id
        WHERE school_year_id = v_sy_id
        AND deleted_at IS NULL
        AND id <> ALL(v_incoming_term_ids);
    END IF;

    -- 7. Synchronize Transmutation Table (Grade Scale Rows)
    IF p_transmutation_rows IS NOT NULL AND jsonb_array_length(p_transmutation_rows) > 0 THEN
        DELETE FROM public.grade_scale_rows
        WHERE school_year_id = v_sy_id;

        FOR v_row_elem IN SELECT * FROM jsonb_array_elements(p_transmutation_rows) LOOP
            INSERT INTO public.grade_scale_rows (
                school_year_id,
                grade_scale_id,
                raw_min_score,
                raw_max_score,
                transmuted_grade,
                is_passing,
                special_code,
                description
            ) VALUES (
                v_sy_id,
                (SELECT id FROM public.grade_scales LIMIT 1),
                (v_row_elem->>'raw_min_score')::numeric,
                (v_row_elem->>'raw_max_score')::numeric,
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

GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb, jsonb, smallint, text, jsonb) TO authenticated, anon, service_role;
