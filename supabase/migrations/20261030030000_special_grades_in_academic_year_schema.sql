-- ====================================================================
-- Migration: 20261030030000_special_grades_in_academic_year_schema.sql
-- Special-grade detection rules become part of each academic year's grading schema.
-- The AY wizard edits them on its special-grade rows (grade_transmutation_tables.conditions /
-- is_auto_detected); saving the year mirrors them into special_grade_configs for that year,
-- keeping rule ids stable for existing flags. The engine only applies a section's own year's rules.
-- Rollback: supabase/rollback/20261030030000_special_grades_in_academic_year_schema.down.sql
-- ====================================================================
BEGIN;

-- 1. Schema: rules live on the AY grading-schema rows; the engine table is a per-year mirror
ALTER TABLE public.grade_transmutation_tables
    ADD COLUMN IF NOT EXISTS conditions jsonb,
    ADD COLUMN IF NOT EXISTS is_auto_detected boolean NOT NULL DEFAULT false;

ALTER TABLE public.special_grade_configs
    ADD COLUMN IF NOT EXISTS school_year_id uuid REFERENCES public.school_years(id);

-- The same code (e.g. INC) exists once per academic year, not once globally
DROP INDEX IF EXISTS public.uidx_special_grade_configs_code;
DROP INDEX IF EXISTS public.uidx_special_grade_configs_label;
DROP INDEX IF EXISTS public.uidx_special_grade_configs_description;
CREATE UNIQUE INDEX uidx_special_grade_configs_code ON public.special_grade_configs
    (COALESCE(school_year_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(code))) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uidx_special_grade_configs_label ON public.special_grade_configs
    (COALESCE(school_year_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(label))) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uidx_special_grade_configs_description ON public.special_grade_configs
    (COALESCE(school_year_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(description)))
    WHERE deleted_at IS NULL AND btrim(COALESCE(description, '')) <> '';
CREATE INDEX IF NOT EXISTS idx_special_grade_configs_school_year ON public.special_grade_configs (school_year_id) WHERE deleted_at IS NULL;

-- 2. Mirror an academic year's special-grade rows into the engine's rule table
CREATE OR REPLACE FUNCTION public.fn_sync_special_grade_configs(p_school_year_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row RECORD;
    v_existing RECORD;
    v_conditions jsonb;
    v_priority smallint := 0;
    v_codes text[] := ARRAY[]::text[];
BEGIN
    FOR v_row IN
        SELECT g.*
        FROM public.grade_transmutation_tables g
        WHERE g.school_year_id = p_school_year_id
          AND g.deleted_at IS NULL
          AND NULLIF(btrim(g.special_code), '') IS NOT NULL
        ORDER BY g.created_at, g.label
    LOOP
        v_priority := v_priority + 10;
        v_codes := array_append(v_codes, upper(btrim(v_row.special_code)));
        v_conditions := COALESCE(v_row.conditions, '{"all": []}'::jsonb);

        SELECT * INTO v_existing
        FROM public.special_grade_configs
        WHERE school_year_id = p_school_year_id
          AND upper(btrim(code)) = upper(btrim(v_row.special_code))
          AND deleted_at IS NULL
        LIMIT 1;

        IF v_existing.id IS NULL THEN
            INSERT INTO public.special_grade_configs (
                school_year_id, code, label, description, is_passing, is_active,
                is_auto_detected, conditions, priority, rule_version, allows_section_override, created_by
            ) VALUES (
                p_school_year_id, upper(btrim(v_row.special_code)), btrim(v_row.label),
                NULLIF(btrim(COALESCE(v_row.description, '')), ''), v_row.is_passing, true,
                v_row.is_auto_detected, v_conditions, v_priority, 1, true, auth.uid()
            );
        ELSE
            UPDATE public.special_grade_configs
            SET label = btrim(v_row.label),
                description = NULLIF(btrim(COALESCE(v_row.description, '')), ''),
                is_passing = v_row.is_passing,
                is_active = true,
                is_auto_detected = v_row.is_auto_detected,
                conditions = v_conditions,
                priority = v_priority,
                rule_version = CASE WHEN v_existing.conditions IS DISTINCT FROM v_conditions
                                    THEN v_existing.rule_version + 1 ELSE v_existing.rule_version END,
                updated_at = now(),
                updated_by = auth.uid()
            WHERE id = v_existing.id;
        END IF;
    END LOOP;

    -- Codes removed from the schema stop being detected; history keeps the rule row
    UPDATE public.special_grade_configs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE school_year_id = p_school_year_id
      AND deleted_at IS NULL
      AND NOT (upper(btrim(code)) = ANY (v_codes));
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_sync_special_grade_configs(uuid) FROM PUBLIC, anon, authenticated;

-- Academic year of a section (rules are looked up per year)
CREATE OR REPLACE FUNCTION public.fn_section_school_year_id(p_section_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT t.school_year_id
    FROM public.sections s
    JOIN public.terms t ON t.id = s.term_id
    WHERE s.id = p_section_id;
$function$;

REVOKE ALL ON FUNCTION public.fn_section_school_year_id(uuid) FROM PUBLIC, anon;

-- fn_save_academic_year_calendar
CREATE OR REPLACE FUNCTION public.fn_save_academic_year_calendar(p_school_year_id uuid, p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean, p_terms jsonb, p_transmutation_rows jsonb, p_thresholds jsonb DEFAULT '[]'::jsonb, p_max_units_per_term smallint DEFAULT 24, p_evaluation_scope text DEFAULT 'Period'::text, p_holidays jsonb DEFAULT '[]'::jsonb, p_revert_history_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_summary text;
    v_snapshot jsonb;
    v_conflicting_sy RECORD;
    v_full_terms jsonb;
    v_full_trans jsonb;
    v_full_thresh jsonb;
    v_full_holidays jsonb;
    v_active_history_id uuid;
    v_active_snapshot jsonb;
    v_has_real_change boolean := false;
    v_header_matches boolean := false;
    v_terms_match boolean := false;
    v_trans_match boolean := false;
    v_thresh_match boolean := false;
    v_holidays_match boolean := false;
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
                description,
                is_auto_detected,
                conditions
            ) VALUES (
                v_sy_id,
                btrim(v_row_elem->>'label'),
                NULLIF(v_row_elem->>'min_percentage', '')::numeric,
                NULLIF(v_row_elem->>'max_percentage', '')::numeric,
                NULLIF(v_row_elem->>'transmuted_grade', '')::numeric,
                COALESCE((v_row_elem->>'is_passing')::boolean, true),
                NULLIF(btrim(v_row_elem->>'special_code'), ''),
                NULLIF(btrim(v_row_elem->>'description'), ''),
                NULLIF(btrim(v_row_elem->>'special_code'), '') IS NOT NULL
                    AND COALESCE((v_row_elem->>'is_auto_detected')::boolean, false),
                CASE WHEN jsonb_typeof(v_row_elem->'conditions') = 'object'
                          AND NULLIF(btrim(v_row_elem->>'special_code'), '') IS NOT NULL
                     THEN v_row_elem->'conditions' END
            );
        END LOOP;
    END IF;

    -- Special-grade rows drive the detection engine for this academic year
    PERFORM public.fn_sync_special_grade_configs(v_sy_id);

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
                        'weight', gp.weight,
                        'major_exam_start_date', gp.major_exam_start_date,
                        'major_exam_end_date', gp.major_exam_end_date,
                        'grade_encoding_start_date', gp.grade_encoding_start_date,
                        'grade_encoding_end_date', gp.grade_encoding_end_date,
                        'components', COALESCE(gp.components, '[]'::jsonb)
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
            'description', g.description,
            'is_auto_detected', g.is_auto_detected,
            'conditions', g.conditions
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

    -- Snapshot of the synchronized configuration
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

    -- 10. Handle Version History:
    -- A. When reverting back to an existing history version (p_revert_history_id IS NOT NULL),
    --    do NOT add a new version row. Mark the chosen reverted version as active.
    IF p_revert_history_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.school_year_histories
        WHERE id = p_revert_history_id
          AND school_year_id = v_sy_id
          AND deleted_at IS NULL
    ) THEN
        UPDATE public.school_year_histories
        SET is_active_version = (id = p_revert_history_id)
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Academic year calendar reverted successfully.',
            'school_year_id', v_sy_id,
            'has_real_change', false
        );

    -- B. When creating a new school year, always create version 1
    ELSIF v_is_new THEN
        v_summary := 'Created new academic year "' || v_clean_label || '" with ' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, and ' || jsonb_array_length(v_full_holidays) || ' holidays.';

        INSERT INTO public.school_year_histories (
            school_year_id,
            action,
            changed_by,
            change_summary,
            snapshot,
            is_active_version
        ) VALUES (
            v_sy_id,
            v_action,
            v_current_user_id,
            v_summary,
            v_snapshot,
            true
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Academic year calendar saved successfully.',
            'school_year_id', v_sy_id,
            'has_real_change', true
        );

    -- C. When saving an existing school year: ONLY add a new version when a real change occurs!
    ELSE
        -- Fetch active snapshot
        SELECT id, snapshot INTO v_active_history_id, v_active_snapshot
        FROM public.school_year_histories
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL
          AND is_active_version = true
        ORDER BY changed_at DESC
        LIMIT 1;

        IF v_active_history_id IS NULL THEN
            SELECT id, snapshot INTO v_active_history_id, v_active_snapshot
            FROM public.school_year_histories
            WHERE school_year_id = v_sy_id
              AND deleted_at IS NULL
            ORDER BY changed_at DESC
            LIMIT 1;
        END IF;

        IF v_active_snapshot IS NULL THEN
            v_has_real_change := true;
        ELSE
            -- 1. Compare header fields
            v_header_matches := (
                lower(btrim(COALESCE(v_active_snapshot->>'code', ''))) = lower(v_clean_code)
                AND btrim(COALESCE(v_active_snapshot->>'label', '')) = v_clean_label
                AND COALESCE(v_active_snapshot->>'start_date', '') = p_start_date::text
                AND COALESCE(v_active_snapshot->>'end_date', '') = p_end_date::text
                AND COALESCE((v_active_snapshot->>'is_active')::boolean, false) = COALESCE(p_is_active, false)
                AND COALESCE((v_active_snapshot->>'max_units_per_term')::smallint, 24::smallint) = v_units
                AND COALESCE(v_active_snapshot->>'evaluation_scope', 'Period') = v_clean_eval_scope
            );

            -- 2. Compare terms normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'term_type_label', lower(btrim(COALESCE(t->>'term_type_label', ''))),
                            'start_date', t->>'start_date',
                            'end_date', t->>'end_date',
                            'enrollment_start_date', COALESCE(t->>'enrollment_start_date', ''),
                            'enrollment_end_date', COALESCE(t->>'enrollment_end_date', ''),
                            'grading_deadline', COALESCE(t->>'grading_deadline', ''),
                            'status', COALESCE(t->>'status', 'Upcoming'),
                            'evaluation_scope', COALESCE(t->>'evaluation_scope', 'Period'),
                            'grading_periods', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', lower(btrim(COALESCE(gp->>'name', ''))),
                                        'sequence', COALESCE((gp->>'sequence')::int, 1),
                                        'start_date', COALESCE(gp->>'start_date', ''),
                                        'end_date', COALESCE(gp->>'end_date', ''),
                                        'weight', COALESCE((gp->>'weight')::numeric, 0),
                                        'major_exam_start_date', COALESCE(gp->>'major_exam_start_date', ''),
                                        'major_exam_end_date', COALESCE(gp->>'major_exam_end_date', ''),
                                        'grade_encoding_start_date', COALESCE(gp->>'grade_encoding_start_date', ''),
                                        'grade_encoding_end_date', COALESCE(gp->>'grade_encoding_end_date', ''),
                                        'components', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'name', lower(btrim(COALESCE(c->>'name', ''))),
                                                    'weight', COALESCE((c->>'weight')::numeric, 0)
                                                ) ORDER BY lower(btrim(COALESCE(c->>'name', '')))
                                            ), '[]'::jsonb)
                                            FROM jsonb_array_elements(COALESCE(gp->'components', '[]'::jsonb)) c
                                        )
                                    ) ORDER BY COALESCE((gp->>'sequence')::int, 1)
                                ), '[]'::jsonb)
                                FROM jsonb_array_elements(COALESCE(t->'grading_periods', '[]'::jsonb)) gp
                            )
                        ) ORDER BY t->>'start_date'
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'terms', '[]'::jsonb)) t
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'term_type_label', lower(btrim(COALESCE(t->>'term_type_label', ''))),
                            'start_date', t->>'start_date',
                            'end_date', t->>'end_date',
                            'enrollment_start_date', COALESCE(t->>'enrollment_start_date', ''),
                            'enrollment_end_date', COALESCE(t->>'enrollment_end_date', ''),
                            'grading_deadline', COALESCE(t->>'grading_deadline', ''),
                            'status', COALESCE(t->>'status', 'Upcoming'),
                            'evaluation_scope', COALESCE(t->>'evaluation_scope', 'Period'),
                            'grading_periods', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', lower(btrim(COALESCE(gp->>'name', ''))),
                                        'sequence', COALESCE((gp->>'sequence')::int, 1),
                                        'start_date', COALESCE(gp->>'start_date', ''),
                                        'end_date', COALESCE(gp->>'end_date', ''),
                                        'weight', COALESCE((gp->>'weight')::numeric, 0),
                                        'major_exam_start_date', COALESCE(gp->>'major_exam_start_date', ''),
                                        'major_exam_end_date', COALESCE(gp->>'major_exam_end_date', ''),
                                        'grade_encoding_start_date', COALESCE(gp->>'grade_encoding_start_date', ''),
                                        'grade_encoding_end_date', COALESCE(gp->>'grade_encoding_end_date', ''),
                                        'components', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'name', lower(btrim(COALESCE(c->>'name', ''))),
                                                    'weight', COALESCE((c->>'weight')::numeric, 0)
                                                ) ORDER BY lower(btrim(COALESCE(c->>'name', '')))
                                            ), '[]'::jsonb)
                                            FROM jsonb_array_elements(COALESCE(gp->'components', '[]'::jsonb)) c
                                        )
                                    ) ORDER BY COALESCE((gp->>'sequence')::int, 1)
                                ), '[]'::jsonb)
                                FROM jsonb_array_elements(COALESCE(t->'grading_periods', '[]'::jsonb)) gp
                            )
                        ) ORDER BY t->>'start_date'
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'terms', '[]'::jsonb)) t
                )
            ) INTO v_terms_match;

            -- 3. Compare transmutation normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'label', lower(btrim(COALESCE(r->>'label', ''))),
                            'min_percentage', COALESCE((r->>'min_percentage')::numeric, 0),
                            'max_percentage', COALESCE((r->>'max_percentage')::numeric, 0),
                            'transmuted_grade', (r->>'transmuted_grade')::numeric,
                            'is_passing', COALESCE((r->>'is_passing')::boolean, true),
                            'special_code', lower(btrim(COALESCE(r->>'special_code', ''))),
                            'description', btrim(COALESCE(r->>'description', '')),
                            'is_auto_detected', COALESCE((r->>'is_auto_detected')::boolean, false),
                            'conditions', CASE WHEN COALESCE((r->>'is_auto_detected')::boolean, false) THEN r->'conditions' END
                        ) ORDER BY COALESCE((r->>'min_percentage')::numeric, 0) DESC, lower(btrim(COALESCE(r->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'transmutation_rows', '[]'::jsonb)) r
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'label', lower(btrim(COALESCE(r->>'label', ''))),
                            'min_percentage', COALESCE((r->>'min_percentage')::numeric, 0),
                            'max_percentage', COALESCE((r->>'max_percentage')::numeric, 0),
                            'transmuted_grade', (r->>'transmuted_grade')::numeric,
                            'is_passing', COALESCE((r->>'is_passing')::boolean, true),
                            'special_code', lower(btrim(COALESCE(r->>'special_code', ''))),
                            'description', btrim(COALESCE(r->>'description', '')),
                            'is_auto_detected', COALESCE((r->>'is_auto_detected')::boolean, false),
                            'conditions', CASE WHEN COALESCE((r->>'is_auto_detected')::boolean, false) THEN r->'conditions' END
                        ) ORDER BY COALESCE((r->>'min_percentage')::numeric, 0) DESC, lower(btrim(COALESCE(r->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'transmutation_rows', '[]'::jsonb)) r
                )
            ) INTO v_trans_match;

            -- 4. Compare thresholds normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'category', COALESCE(th->>'category', 'Honor'),
                            'code', lower(btrim(COALESCE(th->>'code', ''))),
                            'label', lower(btrim(COALESCE(th->>'label', ''))),
                            'min_gwa', (th->>'min_gwa')::numeric,
                            'max_gwa', (th->>'max_gwa')::numeric,
                            'min_subject_grade', (th->>'min_subject_grade')::numeric,
                            'requires_no_failing', COALESCE((th->>'requires_no_failing')::boolean, false),
                            'scholarship_discount_pct', (th->>'scholarship_discount_pct')::numeric,
                            'sort_order', COALESCE((th->>'sort_order')::int, 1),
                            'is_active', COALESCE((th->>'is_active')::boolean, true)
                        ) ORDER BY COALESCE((th->>'sort_order')::int, 1), lower(btrim(COALESCE(th->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'thresholds', '[]'::jsonb)) th
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'category', COALESCE(th->>'category', 'Honor'),
                            'code', lower(btrim(COALESCE(th->>'code', ''))),
                            'label', lower(btrim(COALESCE(th->>'label', ''))),
                            'min_gwa', (th->>'min_gwa')::numeric,
                            'max_gwa', (th->>'max_gwa')::numeric,
                            'min_subject_grade', (th->>'min_subject_grade')::numeric,
                            'requires_no_failing', COALESCE((th->>'requires_no_failing')::boolean, false),
                            'scholarship_discount_pct', (th->>'scholarship_discount_pct')::numeric,
                            'sort_order', COALESCE((th->>'sort_order')::int, 1),
                            'is_active', COALESCE((th->>'is_active')::boolean, true)
                        ) ORDER BY COALESCE((th->>'sort_order')::int, 1), lower(btrim(COALESCE(th->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'thresholds', '[]'::jsonb)) th
                )
            ) INTO v_thresh_match;

            -- 5. Compare holidays normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', lower(btrim(COALESCE(h->>'title', ''))),
                            'exception_type', COALESCE(h->>'exception_type', 'Holiday'),
                            'start_date', h->>'start_date',
                            'end_date', h->>'end_date',
                            'affects_attendance', COALESCE((h->>'affects_attendance')::boolean, true),
                            'description', btrim(COALESCE(h->>'description', ''))
                        ) ORDER BY h->>'start_date', lower(btrim(COALESCE(h->>'title', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'holidays', '[]'::jsonb)) h
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', lower(btrim(COALESCE(h->>'title', ''))),
                            'exception_type', COALESCE(h->>'exception_type', 'Holiday'),
                            'start_date', h->>'start_date',
                            'end_date', h->>'end_date',
                            'affects_attendance', COALESCE((h->>'affects_attendance')::boolean, true),
                            'description', btrim(COALESCE(h->>'description', ''))
                        ) ORDER BY h->>'start_date', lower(btrim(COALESCE(h->>'title', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'holidays', '[]'::jsonb)) h
                )
            ) INTO v_holidays_match;

            v_has_real_change := NOT (
                v_header_matches 
                AND v_terms_match 
                AND v_trans_match 
                AND v_thresh_match 
                AND v_holidays_match
            );
        END IF;

        IF v_has_real_change THEN
            v_summary := 'Updated academic year "' || v_clean_label || '" configuration (' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, ' || jsonb_array_length(v_full_holidays) || ' holidays).';

            UPDATE public.school_year_histories
            SET is_active_version = false
            WHERE school_year_id = v_sy_id
              AND deleted_at IS NULL
              AND is_active_version = true;

            INSERT INTO public.school_year_histories (
                school_year_id,
                action,
                changed_by,
                change_summary,
                snapshot,
                is_active_version
            ) VALUES (
                v_sy_id,
                v_action,
                v_current_user_id,
                v_summary,
                v_snapshot,
                true
            );

            RETURN jsonb_build_object(
                'success', true,
                'message', 'Academic year calendar saved successfully.',
                'school_year_id', v_sy_id,
                'has_real_change', true
            );
        ELSE
            -- No real changes: keep active version, do not add new history row
            RETURN jsonb_build_object(
                'success', true,
                'message', 'No changes detected. Academic year calendar remains unchanged.',
                'school_year_id', v_sy_id,
                'has_real_change', false
            );
        END IF;
    END IF;
END;
$function$;

-- fn_get_academic_year_calendar_details
CREATE OR REPLACE FUNCTION public.fn_get_academic_year_calendar_details(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- Collect terms and nested grading periods (with components breakdown) for this school year
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
                        'grade_encoding_end_date', gp.grade_encoding_end_date,
                        'components', COALESCE(gp.components, '[]'::jsonb)
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
            'is_conditional', (gtt.min_percentage IS NULL OR gtt.special_code IS NOT NULL),
            'is_auto_detected', gtt.is_auto_detected,
            'conditions', gtt.conditions
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
                'is_conditional', (gtt.min_percentage IS NULL OR gtt.special_code IS NOT NULL),
            'is_auto_detected', gtt.is_auto_detected,
            'conditions', gtt.conditions
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
    WHERE h.school_year_id = p_school_year_id;

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
$function$;

-- fn_get_academic_year_history
CREATE OR REPLACE FUNCTION public.fn_get_academic_year_history(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            'is_active_version', COALESCE(h.is_active_version, (h.changes->>'is_active_version')::boolean, false),
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
                    WHEN h.snapshot ? 'terms' AND jsonb_typeof(h.snapshot->'terms') = 'array'
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
                                            'weight', gp.weight,
                                            'major_exam_start_date', gp.major_exam_start_date,
                                            'major_exam_end_date', gp.major_exam_end_date,
                                            'grade_encoding_start_date', gp.grade_encoding_start_date,
                                            'grade_encoding_end_date', gp.grade_encoding_end_date,
                                            'components', COALESCE(gp.components, '[]'::jsonb)
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
                    WHEN h.snapshot ? 'transmutation_rows' AND jsonb_typeof(h.snapshot->'transmutation_rows') = 'array'
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
                                'description', g.description,
                                'is_auto_detected', g.is_auto_detected,
                                'conditions', g.conditions
                            ) ORDER BY g.min_percentage DESC NULLS LAST
                        ), '[]'::jsonb)
                        FROM public.grade_transmutation_tables g
                        WHERE g.school_year_id = h.school_year_id
                    )
                END,
                'thresholds', CASE
                    WHEN h.snapshot ? 'thresholds' AND jsonb_typeof(h.snapshot->'thresholds') = 'array'
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
                    WHEN h.snapshot ? 'holidays' AND jsonb_typeof(h.snapshot->'holidays') = 'array'
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
    LEFT JOIN LATERAL (
        SELECT r.code AS role_code
        FROM public.user_roles usr
        JOIN public.roles r ON r.id = usr.role_id
        WHERE usr.user_id = u.id AND usr.deleted_at IS NULL AND usr.revoked_at IS NULL
        ORDER BY usr.granted_at ASC NULLS LAST
        LIMIT 1
    ) ur ON TRUE
    WHERE h.school_year_id = p_school_year_id AND h.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'data', v_histories
    );
END;
$function$;

-- fn_detect_special_grade_flags_core
CREATE OR REPLACE FUNCTION public.fn_detect_special_grade_flags_core(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_enrollment_ids  UUID[];
    v_overrides       JSONB;
    v_sig             RECORD;
    v_rule            RECORD;
    v_conditions      JSONB;
    v_matched         BOOLEAN;
    v_evidence        JSONB;
    v_existing_id     UUID;
    v_existing_status TEXT;
    v_created         INTEGER := 0;
    v_refreshed       INTEGER := 0;
    v_superseded      INTEGER := 0;
BEGIN
    SELECT array_agg(e.id)
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.status     = 'Enrolled'
      AND e.deleted_at IS NULL;

    IF v_enrollment_ids IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'created', 0, 'refreshed', 0, 'superseded', 0
        );
    END IF;

    v_overrides := public.fn_section_special_grade_override_map(p_section_id);

    FOR v_sig IN
        SELECT * FROM public.fn_special_grade_signals(v_enrollment_ids)
    LOOP
        FOR v_rule IN
            SELECT sgc.*
            FROM public.special_grade_configs sgc
            WHERE sgc.deleted_at IS NULL
              AND sgc.is_active
              AND sgc.is_auto_detected
              AND sgc.school_year_id = public.fn_section_school_year_id(p_section_id)
            ORDER BY sgc.priority ASC, sgc.code ASC
        LOOP
            v_conditions := public.fn_apply_special_grade_overrides(
                v_rule.conditions,
                COALESCE(v_overrides->(v_rule.id::TEXT), '{}'::jsonb)
            );

            v_matched := public.fn_eval_special_grade_condition(v_conditions, v_sig.signals);

            SELECT f.id, f.status::TEXT
            INTO v_existing_id, v_existing_status
            FROM public.special_grade_flags f
            WHERE f.enrollment_id           = v_sig.enrollment_id
              AND f.grading_period_id       = p_grading_period_id
              AND f.special_grade_config_id = v_rule.id
              AND f.deleted_at              IS NULL;

            IF v_matched THEN
                v_evidence := public.fn_special_grade_evidence(v_conditions, v_sig.signals);

                IF v_existing_id IS NULL THEN
                    INSERT INTO public.special_grade_flags (
                        special_grade_config_id, enrollment_id, grading_period_id,
                        status, rule_version, rule_snapshot, evidence
                    ) VALUES (
                        v_rule.id, v_sig.enrollment_id, p_grading_period_id,
                        'Pending', v_rule.rule_version,
                        jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        v_evidence
                    );
                    v_created := v_created + 1;

                ELSIF v_existing_status IN ('Pending', 'Superseded') THEN
                    UPDATE public.special_grade_flags
                    SET status        = 'Pending',
                        rule_version  = v_rule.rule_version,
                        rule_snapshot = jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        evidence      = v_evidence,
                        detected_at   = now()
                    WHERE id = v_existing_id;
                    v_refreshed := v_refreshed + 1;
                END IF;

            ELSIF v_existing_id IS NOT NULL AND v_existing_status = 'Pending' THEN
                UPDATE public.special_grade_flags
                SET status = 'Superseded'
                WHERE id = v_existing_id;
                v_superseded := v_superseded + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success',    true,
        'created',    v_created,
        'refreshed',  v_refreshed,
        'superseded', v_superseded
    );
END;
$function$;

-- fn_get_section_special_grade_overrides
CREATE OR REPLACE FUNCTION public.fn_get_section_special_grade_overrides(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'special_grade_config_id', sgc.id,
                'code', sgc.code,
                'label', sgc.label,
                'description', sgc.description,
                'is_passing', sgc.is_passing,
                'priority', sgc.priority,
                'conditions', sgc.conditions,
                'overrides', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', o.id,
                            'signal', o.signal,
                            'value', o.value,
                            'value_max', o.value_max,
                            'note', o.note,
                            'updated_at', COALESCE(o.updated_at, o.created_at)
                        )
                        ORDER BY o.signal
                    ), '[]'::jsonb)
                    FROM public.special_grade_section_overrides o
                    WHERE o.special_grade_config_id = sgc.id
                      AND o.section_id = p_section_id
                      AND o.deleted_at IS NULL
                )
            )
            ORDER BY sgc.priority ASC, sgc.code ASC
        ), '[]'::jsonb)
        FROM public.special_grade_configs sgc
        WHERE sgc.deleted_at IS NULL
          AND sgc.is_active
          AND sgc.is_auto_detected
          AND sgc.allows_section_override
          AND sgc.school_year_id = public.fn_section_school_year_id(p_section_id)
    );
END;
$function$;

-- fn_save_section_special_grade_override
CREATE OR REPLACE FUNCTION public.fn_save_section_special_grade_override(p_section_id uuid, p_special_grade_config_id uuid, p_signal text, p_value numeric, p_value_max numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rule       RECORD;
    v_has_signal BOOLEAN;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    SELECT sgc.id, sgc.code, sgc.conditions, sgc.allows_section_override
    INTO v_rule
    FROM public.special_grade_configs sgc
    WHERE sgc.id = p_special_grade_config_id
      AND sgc.deleted_at IS NULL
      AND sgc.school_year_id = public.fn_section_school_year_id(p_section_id);

    IF v_rule.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'That special grade rule no longer exists.');
    END IF;

    IF NOT v_rule.allows_section_override THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The administrator has locked "' || v_rule.code || '" to its institution-wide threshold.'
        );
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
            COALESCE(v_rule.conditions->'all', v_rule.conditions->'any', '[]'::jsonb)
        ) leaf
        WHERE leaf->>'signal' = p_signal
    ) INTO v_has_signal;

    IF NOT v_has_signal THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Rule "' || v_rule.code || '" does not test that signal, so it cannot be overridden.'
        );
    END IF;

    IF p_value IS NULL OR p_value < 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'An override threshold must be zero or greater.');
    END IF;

    IF p_value_max IS NOT NULL AND p_value_max < p_value THEN
        RETURN jsonb_build_object('success', false, 'message', 'The upper bound must not be lower than the lower bound.');
    END IF;

    INSERT INTO public.special_grade_section_overrides (
        section_id, special_grade_config_id, signal, value, value_max, note, created_by
    )
    VALUES (
        p_section_id, p_special_grade_config_id, p_signal, p_value, p_value_max,
        NULLIF(btrim(COALESCE(p_note, '')), ''), auth.uid()
    )
    ON CONFLICT (section_id, special_grade_config_id, signal) WHERE deleted_at IS NULL
    DO UPDATE SET
        value      = EXCLUDED.value,
        value_max  = EXCLUDED.value_max,
        note       = EXCLUDED.note,
        updated_by = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Section threshold saved.');
END;
$function$;

-- fn_student_course_grades
CREATE OR REPLACE FUNCTION public.fn_student_course_grades(p_student_id uuid)
 RETURNS TABLE(enrollment_id uuid, term_id uuid, course_id uuid, course_code text, course_title text, units numeric, grade numeric, raw_grade numeric, special_grade text, enrollment_status text, is_released boolean, is_passing boolean, completed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        g.enrollment_id,
        g.term_id,
        g.course_id,
        g.course_code,
        g.course_title,
        g.units,
        g.grade,
        g.raw_grade,
        g.special_grade,
        g.enrollment_status,
        g.is_released,
        CASE
            WHEN g.special_grade IS NOT NULL
                THEN COALESCE(sgc.is_passing, false)
            WHEN g.is_released AND g.grade IS NOT NULL
                THEN g.grade <= 3.00
            ELSE NULL
        END AS is_passing,
        g.completed_at
    FROM (
        SELECT
            e.id AS enrollment_id,
            sec.term_id AS term_id,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units AS units,
            ROUND(
                SUM(COALESCE(sfg.transmuted_grade, sfg.final_grade) * gp.weight)
                    FILTER (WHERE sfg.status = 'Released')
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released'), 0),
                2
            ) AS grade,
            ROUND(
                SUM(sfg.final_grade * gp.weight) FILTER (WHERE sfg.status = 'Released')
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released'), 0),
                2
            ) AS raw_grade,
            MAX(sfg.special_grade) FILTER (WHERE sfg.status = 'Released') AS special_grade,
            e.status::TEXT AS enrollment_status,
            COALESCE(bool_or(sfg.status = 'Released'), false) AS is_released,
            MAX(sfg.released_at) FILTER (WHERE sfg.status = 'Released') AS completed_at
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id AND sfg.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp
            ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        WHERE e.student_id = p_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
        GROUP BY e.id, sec.term_id, c.id, c.code, c.title, c.total_units, e.status
    ) g
    LEFT JOIN public.terms gt ON gt.id = g.term_id
    LEFT JOIN public.special_grade_configs sgc
        ON upper(sgc.code) = upper(g.special_grade)
       AND sgc.school_year_id = gt.school_year_id
       AND sgc.deleted_at IS NULL

    UNION ALL

    -- Credited courses from previous institution (Transferee)
    SELECT
        scc.id AS enrollment_id,
        NULL::uuid AS term_id,
        scc.course_id AS course_id,
        c.code AS course_code,
        c.title AS course_title,
        COALESCE(scc.units_credited, c.total_units) AS units,
        scc.grade_numeric AS grade,
        scc.grade_numeric AS raw_grade,
        COALESCE(scc.grade_display, 'Credited') AS special_grade,
        'Credited'::text AS enrollment_status,
        true AS is_released,
        true AS is_passing,
        scc.created_at AS completed_at
    FROM public.student_credited_courses scc
    INNER JOIN public.courses c ON c.id = scc.course_id AND c.deleted_at IS NULL
    WHERE scc.student_id = p_student_id
      AND scc.deleted_at IS NULL;
$function$;

-- 6. Data: carry any legacy global rules onto the AY rows, mirror every year, re-point references
UPDATE public.grade_transmutation_tables g
SET conditions = sgc.conditions,
    is_auto_detected = sgc.is_auto_detected
FROM public.special_grade_configs sgc
WHERE sgc.school_year_id IS NULL
  AND sgc.deleted_at IS NULL
  AND upper(btrim(sgc.code)) = upper(btrim(g.special_code))
  AND g.deleted_at IS NULL
  AND g.conditions IS NULL;

SELECT public.fn_sync_special_grade_configs(sy.id) FROM public.school_years sy WHERE sy.deleted_at IS NULL;

UPDATE public.special_grade_flags f
SET special_grade_config_id = per_year.id
FROM public.special_grade_configs legacy, public.enrollments e, public.sections s, public.terms t, public.special_grade_configs per_year
WHERE legacy.id = f.special_grade_config_id AND legacy.school_year_id IS NULL
  AND e.id = f.enrollment_id AND s.id = e.section_id AND t.id = s.term_id
  AND per_year.school_year_id = t.school_year_id AND per_year.deleted_at IS NULL
  AND upper(per_year.code) = upper(legacy.code);

UPDATE public.special_grade_section_overrides o
SET special_grade_config_id = per_year.id
FROM public.special_grade_configs legacy, public.sections s, public.terms t, public.special_grade_configs per_year
WHERE legacy.id = o.special_grade_config_id AND legacy.school_year_id IS NULL
  AND s.id = o.section_id AND t.id = s.term_id
  AND per_year.school_year_id = t.school_year_id AND per_year.deleted_at IS NULL
  AND upper(per_year.code) = upper(legacy.code);

-- Global rules are retired; the academic year's grading schema is the only source now
UPDATE public.special_grade_configs SET deleted_at = now() WHERE school_year_id IS NULL AND deleted_at IS NULL;

COMMIT;
