-- ====================================================================
-- Migration: 20260104000000_academic_thresholds_and_history.sql
-- Description: Associate academic thresholds with academic years and record change history
-- ====================================================================

-- 1. Extend academic_thresholds with school_year_id
ALTER TABLE public.academic_thresholds
    ADD COLUMN IF NOT EXISTS school_year_id uuid REFERENCES public.school_years(id) ON DELETE CASCADE;

-- Update unique constraint so code is unique per school year (or global if null)
DROP INDEX IF EXISTS public.uidx_academic_thresholds_code;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_academic_thresholds_sy_code 
    ON public.academic_thresholds (COALESCE(school_year_id, '00000000-0000-0000-0000-000000000000'::uuid), code) 
    WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_academic_thresholds_school_year_id
    ON public.academic_thresholds(school_year_id)
    WHERE deleted_at IS NULL;

-- 2. Create school_year_histories table
CREATE TABLE IF NOT EXISTS public.school_year_histories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    school_year_id uuid NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
    action text NOT NULL, -- 'CREATED', 'UPDATED'
    changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    change_summary text,
    snapshot jsonb NOT NULL,
    changes jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_school_year_histories_sy_id 
    ON public.school_year_histories(school_year_id, changed_at DESC);

ALTER TABLE public.school_year_histories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_year_histories_select" ON public.school_year_histories;
CREATE POLICY "school_year_histories_select" ON public.school_year_histories 
    FOR SELECT TO authenticated USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "school_year_histories_insert" ON public.school_year_histories;
CREATE POLICY "school_year_histories_insert" ON public.school_year_histories 
    FOR INSERT TO authenticated WITH CHECK ('Admin'::text = ANY (fn_current_user_role_codes()));

DROP POLICY IF EXISTS "school_year_histories_update" ON public.school_year_histories;
CREATE POLICY "school_year_histories_update" ON public.school_year_histories 
    FOR UPDATE TO authenticated USING ('Admin'::text = ANY (fn_current_user_role_codes()));

-- 3. RPC: fn_get_academic_year_history
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
            'snapshot', h.snapshot,
            'changes', h.changes,
            'changed_by', h.changed_by,
            'changed_by_name', NULLIF(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
            'changed_by_email', u.email,
            'changed_by_role', COALESCE(ur.role_code, 'Admin')
        ) ORDER BY h.changed_at DESC
    ), '[]'::jsonb)
    INTO v_histories
    FROM public.school_year_histories h
    LEFT JOIN public.users u ON u.id = h.changed_by
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
    WHERE h.school_year_id = p_school_year_id AND h.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'data', v_histories
    );
END;
$$;

-- 4. Update fn_get_academic_year_calendar_details to include thresholds
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
    JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = p_school_year_id AND t.deleted_at IS NULL;

    -- Collect transmutation rows for this school year (fallback to global if none defined)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', gtt.id,
            'label', gtt.label,
            'min_percentage', gtt.min_percentage,
            'max_percentage', gtt.max_percentage,
            'transmuted_grade', gtt.transmuted_grade,
            'is_passing', gtt.is_passing,
            'special_code', gtt.special_code,
            'description', gtt.description
        ) ORDER BY gtt.transmuted_grade ASC NULLS LAST, gtt.label ASC
    ), '[]'::jsonb)
    INTO v_transmutation
    FROM public.grade_transmutation_tables gtt
    WHERE gtt.school_year_id = p_school_year_id AND gtt.deleted_at IS NULL;

    IF v_transmutation = '[]'::jsonb THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gtt.id,
                'label', gtt.label,
                'min_percentage', gtt.min_percentage,
                'max_percentage', gtt.max_percentage,
                'transmuted_grade', gtt.transmuted_grade,
                'is_passing', gtt.is_passing,
                'special_code', gtt.special_code,
                'description', gtt.description
            ) ORDER BY gtt.transmuted_grade ASC NULLS LAST, gtt.label ASC
        ), '[]'::jsonb)
        INTO v_transmutation
        FROM public.grade_transmutation_tables gtt
        WHERE gtt.school_year_id IS NULL AND gtt.program_id IS NULL AND gtt.deleted_at IS NULL;
    END IF;

    -- Collect academic thresholds for this school year (fallback to global if none defined)
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
        ) ORDER BY ath.category ASC, ath.sort_order ASC, ath.max_gwa ASC
    ), '[]'::jsonb)
    INTO v_thresholds
    FROM public.academic_thresholds ath
    WHERE ath.school_year_id = p_school_year_id AND ath.deleted_at IS NULL;

    IF v_thresholds = '[]'::jsonb THEN
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
            ) ORDER BY ath.category ASC, ath.sort_order ASC, ath.max_gwa ASC
        ), '[]'::jsonb)
        INTO v_thresholds
        FROM public.academic_thresholds ath
        WHERE ath.school_year_id IS NULL AND ath.deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', v_sy.id,
            'code', v_sy.code,
            'label', v_sy.label,
            'start_date', v_sy.start_date,
            'end_date', v_sy.end_date,
            'is_active', v_sy.is_active,
            'terms', v_terms,
            'transmutation_rows', v_transmutation,
            'thresholds', v_thresholds
        )
    );
END;
$$;

-- 5. Update fn_save_academic_year_calendar to handle thresholds and record history
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
                                sequence = (v_gp_elem->>'sequence')::smallint,
                                start_date = NULLIF(v_gp_elem->>'start_date', '')::date,
                                end_date = NULLIF(v_gp_elem->>'end_date', '')::date,
                                weight = COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 0),
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
                                COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 0)
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
                btrim(v_row_elem->>'label'),
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
                COALESCE(NULLIF(btrim(v_thresh_elem->>'code'), ''), lower(regexp_replace(btrim(v_thresh_elem->>'label'), '[^a-zA-Z0-9]+', '_', 'g'))),
                btrim(v_thresh_elem->>'label'),
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

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_get_academic_year_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_year_calendar_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb, jsonb) TO authenticated;
