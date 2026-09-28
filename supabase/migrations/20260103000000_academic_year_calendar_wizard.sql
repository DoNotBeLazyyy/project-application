-- ====================================================================
-- Migration: 20260103000000_academic_year_calendar_wizard.sql
-- Description: Supports unified, mobile-friendly Academic Year & Calendar Wizard
-- ====================================================================

-- 1. Extend grade_transmutation_tables with school_year_id, is_passing, and special_code
ALTER TABLE public.grade_transmutation_tables
    ADD COLUMN IF NOT EXISTS school_year_id uuid REFERENCES public.school_years(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_passing boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS special_code text;

CREATE INDEX IF NOT EXISTS idx_grade_transmutation_school_year_id
    ON public.grade_transmutation_tables(school_year_id)
    WHERE deleted_at IS NULL;

-- 2. RPC: fn_get_academic_year_calendar_details
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

    -- If no year-specific transmutation, check for global default
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
            'transmutation_rows', v_transmutation
        )
    );
END;
$$;

-- 3. RPC: fn_save_academic_year_calendar
CREATE OR REPLACE FUNCTION public.fn_save_academic_year_calendar(
    p_school_year_id uuid,
    p_code text,
    p_label text,
    p_start_date date,
    p_end_date date,
    p_is_active boolean,
    p_terms jsonb,
    p_transmutation_rows jsonb
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
    v_existing_term_ids uuid[];
    v_incoming_term_ids uuid[] := '{}';
    v_existing_gp_ids uuid[];
    v_incoming_gp_ids uuid[] := '{}';
    v_clean_code text := btrim(p_code);
    v_clean_label text := btrim(p_label);
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
    IF p_school_year_id IS NULL THEN
        IF p_is_active THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true;
        END IF;

        INSERT INTO public.school_years (code, label, start_date, end_date, is_active)
        VALUES (v_clean_code, v_clean_label, p_start_date, p_end_date, COALESCE(p_is_active, false))
        RETURNING id INTO v_sy_id;
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
        -- Delete previous year-specific rows before inserting fresh ones
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

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Academic Year and Calendar saved successfully.',
        'school_year_id', v_sy_id
    );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_get_academic_year_calendar_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_academic_year_calendar(uuid, text, text, date, date, boolean, jsonb, jsonb) TO authenticated;
