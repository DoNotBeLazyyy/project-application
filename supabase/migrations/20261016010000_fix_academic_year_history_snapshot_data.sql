-- Migration: 20261016010000_fix_academic_year_history_snapshot_data.sql
-- Description: Fix academic year history snapshot data to include terms (with grading periods),
-- transmutation rows, thresholds, and holidays, and backfill existing history records.

-- 1. Backfill existing school_year_histories snapshots
DO $$
DECLARE
    v_rec RECORD;
    v_terms jsonb;
    v_trans jsonb;
    v_thresh jsonb;
    v_holidays jsonb;
    v_terms_count int;
    v_trans_count int;
    v_thresh_count int;
    v_holidays_count int;
    v_snap jsonb;
BEGIN
    FOR v_rec IN SELECT id, school_year_id, snapshot FROM public.school_year_histories LOOP
        -- Build terms with grading periods
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
                'evaluation_scope', t.evaluation_scope,
                'grading_periods', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', gp.id,
                            'name', gp.name,
                            'sequence', gp.sequence,
                            'start_date', gp.start_date,
                            'end_date', gp.end_date,
                            'weight', gp.weight
                        ) ORDER BY gp.sequence ASC
                    ), '[]'::jsonb)
                    FROM public.grading_periods gp
                    WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
                )
            ) ORDER BY t.start_date ASC
        ), '[]'::jsonb)
        INTO v_terms
        FROM public.terms t
        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
        WHERE t.school_year_id = v_rec.school_year_id AND t.deleted_at IS NULL;

        -- Build transmutation rows
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', g.id,
                'label', g.label,
                'min_percentage', g.min_percentage,
                'max_percentage', g.max_percentage,
                'transmuted_grade', g.transmuted_grade,
                'is_passing', g.is_passing,
                'special_code', g.special_code,
                'description', g.description
            ) ORDER BY g.min_percentage DESC NULLS LAST
        ), '[]'::jsonb)
        INTO v_trans
        FROM public.grade_transmutation_tables g
        WHERE g.school_year_id = v_rec.school_year_id;

        -- Build thresholds
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
        INTO v_thresh
        FROM public.academic_thresholds a
        WHERE a.school_year_id = v_rec.school_year_id;

        -- Build holidays
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
        INTO v_holidays
        FROM public.school_year_calendar_exceptions e
        WHERE e.school_year_id = v_rec.school_year_id;

        v_terms_count := jsonb_array_length(v_terms);
        v_trans_count := jsonb_array_length(v_trans);
        v_thresh_count := jsonb_array_length(v_thresh);
        v_holidays_count := jsonb_array_length(v_holidays);

        v_snap := COALESCE(v_rec.snapshot, '{}'::jsonb);

        -- Merge into snapshot if arrays were missing
        IF NOT (v_snap ? 'terms') OR jsonb_array_length(COALESCE(v_snap->'terms', '[]'::jsonb)) = 0 THEN
            v_snap := jsonb_set(v_snap, '{terms}', v_terms, true);
            v_snap := jsonb_set(v_snap, '{terms_count}', to_jsonb(v_terms_count), true);
        END IF;

        IF NOT (v_snap ? 'transmutation_rows') OR jsonb_array_length(COALESCE(v_snap->'transmutation_rows', '[]'::jsonb)) = 0 THEN
            v_snap := jsonb_set(v_snap, '{transmutation_rows}', v_trans, true);
            v_snap := jsonb_set(v_snap, '{transmutation_rows_count}', to_jsonb(v_trans_count), true);
        END IF;

        IF NOT (v_snap ? 'thresholds') OR jsonb_array_length(COALESCE(v_snap->'thresholds', '[]'::jsonb)) = 0 THEN
            v_snap := jsonb_set(v_snap, '{thresholds}', v_thresh, true);
            v_snap := jsonb_set(v_snap, '{thresholds_count}', to_jsonb(v_thresh_count), true);
        END IF;

        IF NOT (v_snap ? 'holidays') OR jsonb_array_length(COALESCE(v_snap->'holidays', '[]'::jsonb)) = 0 THEN
            v_snap := jsonb_set(v_snap, '{holidays}', v_holidays, true);
            v_snap := jsonb_set(v_snap, '{holidays_count}', to_jsonb(v_holidays_count), true);
        END IF;

        UPDATE public.school_year_histories
        SET snapshot = v_snap
        WHERE id = v_rec.id;
    END LOOP;
END;
$$;

-- 2. Update fn_save_academic_year_calendar to store full snapshot
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
    v_full_terms jsonb;
    v_full_trans jsonb;
    v_full_thresh jsonb;
    v_full_holidays jsonb;
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

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id AND school_year_id = v_sy_id) THEN
                UPDATE public.terms
                SET term_type_id = (v_term_elem->>'term_type_id')::uuid,
                    start_date = (v_term_elem->>'start_date')::date,
                    end_date = (v_term_elem->>'end_date')::date,
                    enrollment_start_date = NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    enrollment_end_date = NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    grading_deadline = NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    status = COALESCE(v_term_elem->>'status', 'Upcoming'),
                    evaluation_scope = CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END,
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
                CASE 
                    WHEN (v_thresh_elem->>'category') IN ('Latin Honors', 'Scholarship', 'Standing', 'Honor', 'Custom')
                    THEN (v_thresh_elem->>'category')::public.academic_threshold_category_type
                    ELSE 'Honor'::public.academic_threshold_category_type
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

    -- 9. Synchronize Calendar Exceptions & Holidays
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

    -- Query full synchronized terms with grading periods
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
            'evaluation_scope', t.evaluation_scope,
            'grading_periods', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', gp.id,
                        'name', gp.name,
                        'sequence', gp.sequence,
                        'start_date', gp.start_date,
                        'end_date', gp.end_date,
                        'weight', gp.weight
                    ) ORDER BY gp.sequence ASC
                ), '[]'::jsonb)
                FROM public.grading_periods gp
                WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
            )
        ) ORDER BY t.start_date ASC
    ), '[]'::jsonb)
    INTO v_full_terms
    FROM public.terms t
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = v_sy_id AND t.deleted_at IS NULL;

    -- Query full transmutation rows
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', g.id,
            'label', g.label,
            'min_percentage', g.min_percentage,
            'max_percentage', g.max_percentage,
            'transmuted_grade', g.transmuted_grade,
            'is_passing', g.is_passing,
            'special_code', g.special_code,
            'description', g.description
        ) ORDER BY g.min_percentage DESC NULLS LAST
    ), '[]'::jsonb)
    INTO v_full_trans
    FROM public.grade_transmutation_tables g
    WHERE g.school_year_id = v_sy_id;

    -- Query full thresholds
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
    INTO v_full_thresh
    FROM public.academic_thresholds a
    WHERE a.school_year_id = v_sy_id;

    -- Query full holidays
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
    INTO v_full_holidays
    FROM public.school_year_calendar_exceptions e
    WHERE e.school_year_id = v_sy_id;

    -- 10. Record School Year Audit History
    v_summary := CASE 
        WHEN v_is_new THEN 'Created new academic year "' || v_clean_label || '" with ' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, and ' || jsonb_array_length(v_full_holidays) || ' holidays.'
        ELSE 'Updated academic year "' || v_clean_label || '" configuration (' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, ' || jsonb_array_length(v_full_holidays) || ' holidays).'
    END;

    v_snapshot := jsonb_build_object(
        'id', v_sy_id,
        'code', v_clean_code,
        'label', v_clean_label,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'is_active', COALESCE(p_is_active, false),
        'max_units_per_term', v_units,
        'evaluation_scope', v_clean_eval_scope,
        'terms_count', jsonb_array_length(v_full_terms),
        'transmutation_rows_count', jsonb_array_length(v_full_trans),
        'thresholds_count', jsonb_array_length(v_full_thresh),
        'holidays_count', jsonb_array_length(v_full_holidays),
        'terms', v_full_terms,
        'transmutation_rows', v_full_trans,
        'thresholds', v_full_thresh,
        'holidays', v_full_holidays
    );

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

-- 3. Update fn_get_academic_year_history to return full enriched snapshot
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
                'transmutation_rows_count', COALESCE(
                    (h.snapshot->>'transmutation_rows_count')::int,
                    CASE WHEN h.snapshot ? 'transmutation_rows' THEN jsonb_array_length(h.snapshot->'transmutation_rows') ELSE NULL END,
                    (SELECT count(*)::int FROM public.grade_transmutation_tables WHERE school_year_id = h.school_year_id)
                ),
                'thresholds_count', COALESCE(
                    (h.snapshot->>'thresholds_count')::int,
                    CASE WHEN h.snapshot ? 'thresholds' THEN jsonb_array_length(h.snapshot->'thresholds') ELSE NULL END,
                    (SELECT count(*)::int FROM public.academic_thresholds WHERE school_year_id = h.school_year_id)
                ),
                'holidays_count', COALESCE(
                    (h.snapshot->>'holidays_count')::int,
                    CASE WHEN h.snapshot ? 'holidays' THEN jsonb_array_length(h.snapshot->'holidays') ELSE NULL END,
                    (SELECT count(*)::int FROM public.school_year_calendar_exceptions WHERE school_year_id = h.school_year_id)
                ),
                'terms', CASE
                    WHEN h.snapshot ? 'terms' AND jsonb_typeof(h.snapshot->'terms') = 'array' AND jsonb_array_length(h.snapshot->'terms') > 0
                    THEN h.snapshot->'terms'
                    ELSE (
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
                                'evaluation_scope', t.evaluation_scope,
                                'grading_periods', (
                                    SELECT COALESCE(jsonb_agg(
                                        jsonb_build_object(
                                            'id', gp.id,
                                            'name', gp.name,
                                            'sequence', gp.sequence,
                                            'start_date', gp.start_date,
                                            'end_date', gp.end_date,
                                            'weight', gp.weight
                                        ) ORDER BY gp.sequence ASC
                                    ), '[]'::jsonb)
                                    FROM public.grading_periods gp
                                    WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
                                )
                            ) ORDER BY t.start_date ASC
                        ), '[]'::jsonb)
                        FROM public.terms t
                        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
                        WHERE t.school_year_id = h.school_year_id AND t.deleted_at IS NULL
                    )
                END,
                'transmutation_rows', CASE
                    WHEN h.snapshot ? 'transmutation_rows' AND jsonb_typeof(h.snapshot->'transmutation_rows') = 'array' AND jsonb_array_length(h.snapshot->'transmutation_rows') > 0
                    THEN h.snapshot->'transmutation_rows'
                    ELSE (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', g.id,
                                'label', g.label,
                                'min_percentage', g.min_percentage,
                                'max_percentage', g.max_percentage,
                                'transmuted_grade', g.transmuted_grade,
                                'is_passing', g.is_passing,
                                'special_code', g.special_code,
                                'description', g.description
                            ) ORDER BY g.min_percentage DESC NULLS LAST
                        ), '[]'::jsonb)
                        FROM public.grade_transmutation_tables g
                        WHERE g.school_year_id = h.school_year_id
                    )
                END,
                'thresholds', CASE
                    WHEN h.snapshot ? 'thresholds' AND jsonb_typeof(h.snapshot->'thresholds') = 'array' AND jsonb_array_length(h.snapshot->'thresholds') > 0
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
                    WHEN h.snapshot ? 'holidays' AND jsonb_typeof(h.snapshot->'holidays') = 'array' AND jsonb_array_length(h.snapshot->'holidays') > 0
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
    ), '[]'::jsonb)
    INTO v_histories
    FROM public.school_year_histories h
    LEFT JOIN public.school_years sy ON sy.id = h.school_year_id
    LEFT JOIN public.users u ON u.id = h.changed_by
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
    WHERE h.school_year_id = p_school_year_id AND h.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'data', v_histories
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb, jsonb, smallint, text, jsonb) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_year_history(uuid) TO authenticated, anon, service_role;
