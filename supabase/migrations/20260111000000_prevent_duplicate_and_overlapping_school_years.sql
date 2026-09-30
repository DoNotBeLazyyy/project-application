-- Migration: 20260111000000_prevent_duplicate_and_overlapping_school_years.sql
-- Enforces uniqueness and disallows duplicate codes, duplicate labels, identical dates,
-- and overlapping academic calendar spans in public.school_years.

-- 1. Unique Indexes
DROP INDEX IF EXISTS public.uidx_school_years_code;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_school_years_code_lower 
    ON public.school_years (LOWER(btrim(code))) 
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_school_years_label_lower 
    ON public.school_years (LOWER(btrim(label))) 
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_school_years_dates 
    ON public.school_years (start_date, end_date) 
    WHERE deleted_at IS NULL;

-- 2. Update fn_create_school_year with strict uniqueness and date-collision checks
CREATE OR REPLACE FUNCTION public.fn_create_school_year(
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_conflicting_sy RECORD;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code is required.');
    END IF;

    IF v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    -- Check duplicate code (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code already exists: ' || v_clean_code);
    END IF;

    -- Check duplicate label (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    IF COALESCE(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
          AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.school_years (code, label, start_date, end_date, is_active, created_by)
    VALUES (v_clean_code, v_clean_label, p_start_date, p_end_date, COALESCE(p_is_active, false), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'School year created successfully.');
END;
$function$;

-- 3. Update fn_update_school_year with strict uniqueness and date-collision checks
CREATE OR REPLACE FUNCTION public.fn_update_school_year(
    p_school_year_id uuid,
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_conflicting_sy RECORD;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code is required.');
    END IF;

    IF v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    -- Check duplicate code (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND id <> p_school_year_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code already exists: ' || v_clean_code);
    END IF;

    -- Check duplicate label (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND id <> p_school_year_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE id <> p_school_year_id
          AND deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE id <> p_school_year_id
      AND deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    IF COALESCE(p_is_active, false) THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
          AND id <> p_school_year_id
          AND deleted_at IS NULL;
    END IF;

    UPDATE public.school_years
    SET
        code = v_clean_code,
        label = v_clean_label,
        start_date = p_start_date,
        end_date = p_end_date,
        is_active = COALESCE(p_is_active, false),
        updated_at = now()
    WHERE id = p_school_year_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year updated successfully.');
END;
$function$;

-- 4. Update fn_save_academic_year_calendar with strict uniqueness and date-collision checks
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
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_current_user_id uuid := auth.uid();
    v_is_new boolean := (p_school_year_id IS NULL);
    v_action text;
    v_terms_count int := COALESCE(jsonb_array_length(p_terms), 0);
    v_trans_count int := COALESCE(jsonb_array_length(p_transmutation_rows), 0);
    v_thresh_count int := COALESCE(jsonb_array_length(p_thresholds), 0);
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

    -- 1. Check duplicate code (case-insensitive)
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code already exists: ' || v_clean_code);
    END IF;

    -- 2. Check duplicate label (case-insensitive)
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

GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_school_year(text, text, date, date, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_school_year(uuid, text, text, date, date, boolean) TO authenticated;

-- 5. Update fn_get_school_years to include start_date and end_date
CREATE OR REPLACE FUNCTION public.fn_get_school_years()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', sy.id,
                'code', sy.code,
                'label', sy.label,
                'start_date', to_char(sy.start_date, 'YYYY-MM-DD'),
                'end_date', to_char(sy.end_date, 'YYYY-MM-DD')
            )
            ORDER BY sy.start_date DESC
        )
        FROM public.school_years sy
        WHERE sy.deleted_at IS NULL
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_school_years() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_school_years() TO anon;
