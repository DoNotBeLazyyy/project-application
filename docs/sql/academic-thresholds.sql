CREATE TABLE IF NOT EXISTS public.academic_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    min_gwa NUMERIC(4,2),
    max_gwa NUMERIC(4,2) NOT NULL,
    min_subject_grade NUMERIC(4,2),
    requires_no_failing BOOLEAN NOT NULL DEFAULT true,
    scholarship_discount_pct NUMERIC(5,2),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

ALTER TABLE public.academic_thresholds
    ADD COLUMN IF NOT EXISTS min_subject_grade NUMERIC(4,2);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_academic_thresholds_code
    ON public.academic_thresholds (code)
    WHERE deleted_at IS NULL;

ALTER TABLE public.academic_thresholds ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_academic_thresholds_updated_audit ON public.academic_thresholds;
CREATE TRIGGER trg_academic_thresholds_updated_audit
    BEFORE UPDATE ON public.academic_thresholds
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "academic_thresholds_select" ON public.academic_thresholds;
CREATE POLICY "academic_thresholds_select"
    ON public.academic_thresholds
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "academic_thresholds_insert" ON public.academic_thresholds;
CREATE POLICY "academic_thresholds_insert"
    ON public.academic_thresholds
    FOR INSERT
    TO authenticated
    WITH CHECK ('Admin' = ANY (public.fn_current_user_role_codes()));

DROP POLICY IF EXISTS "academic_thresholds_update" ON public.academic_thresholds;
CREATE POLICY "academic_thresholds_update"
    ON public.academic_thresholds
    FOR UPDATE
    TO authenticated
    USING ('Admin' = ANY (public.fn_current_user_role_codes()))
    WITH CHECK ('Admin' = ANY (public.fn_current_user_role_codes()));

INSERT INTO public.academic_thresholds (category, code, label, min_gwa, max_gwa, min_subject_grade, requires_no_failing, scholarship_discount_pct, sort_order)
SELECT * FROM (VALUES
    ('Honor', 'summa_cum_laude', 'Summa Cum Laude', 1.00, 1.25, 1.75::NUMERIC, true, NULL::NUMERIC, 1),
    ('Honor', 'magna_cum_laude', 'Magna Cum Laude', 1.26, 1.50, 2.00::NUMERIC, true, NULL::NUMERIC, 2),
    ('Honor', 'cum_laude', 'Cum Laude', 1.51, 1.75, 2.25::NUMERIC, true, NULL::NUMERIC, 3),
    ('Scholarship', 'academic_scholar_full', 'Full Academic Scholarship', 1.00, 1.45, 2.00::NUMERIC, true, 100.00, 1),
    ('Scholarship', 'academic_scholar_partial', 'Partial Academic Scholarship', 1.46, 1.75, 2.25::NUMERIC, true, 50.00, 2),
    ('Standing', 'good_standing', 'Good Standing', 1.00, 3.00, NULL::NUMERIC, false, NULL::NUMERIC, 1)
) AS seed(category, code, label, min_gwa, max_gwa, min_subject_grade, requires_no_failing, scholarship_discount_pct, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM public.academic_thresholds t
    WHERE t.code = seed.code AND t.deleted_at IS NULL
);

CREATE OR REPLACE FUNCTION public.fn_get_academic_thresholds()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.category, t.sort_order), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            id,
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
        FROM public.academic_thresholds
        WHERE deleted_at IS NULL
    ) t;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_academic_thresholds(jsonb);
DROP FUNCTION IF EXISTS public.fn_update_academic_thresholds(jsonb, uuid[]);

CREATE OR REPLACE FUNCTION public.fn_update_academic_thresholds(
    p_thresholds jsonb,
    p_deleted_ids uuid[] DEFAULT '{}'::uuid[]
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_item JSONB;
    v_id UUID;
    v_category TEXT;
    v_label TEXT;
    v_code TEXT;
    v_slug TEXT;
    v_min_gwa NUMERIC(4,2);
    v_max_gwa NUMERIC(4,2);
    v_min_subject_grade NUMERIC(4,2);
    v_requires_no_failing BOOLEAN;
    v_scholarship_discount_pct NUMERIC(5,2);
    v_is_active BOOLEAN;
    v_sort_order INTEGER;
    v_updated INTEGER := 0;
    v_inserted INTEGER := 0;
    v_deleted INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_deleted_ids IS NOT NULL AND array_length(p_deleted_ids, 1) > 0 THEN
        UPDATE public.academic_thresholds
        SET deleted_at = now(),
            deleted_by = auth.uid()
        WHERE id = ANY(p_deleted_ids)
          AND deleted_at IS NULL;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
    END IF;

    IF p_thresholds IS NOT NULL AND jsonb_typeof(p_thresholds) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_thresholds)
        LOOP
            v_id := NULLIF(v_item->>'id', '')::UUID;
            v_category := COALESCE(NULLIF(trim(v_item->>'category'), ''), 'Honor');
            v_label := COALESCE(NULLIF(trim(v_item->>'label'), ''), 'Threshold');
            v_min_gwa := NULLIF(v_item->>'min_gwa', '')::NUMERIC(4,2);
            v_max_gwa := (v_item->>'max_gwa')::NUMERIC(4,2);
            v_min_subject_grade := NULLIF(v_item->>'min_subject_grade', '')::NUMERIC(4,2);
            v_requires_no_failing := COALESCE((v_item->>'requires_no_failing')::BOOLEAN, true);
            v_scholarship_discount_pct := NULLIF(v_item->>'scholarship_discount_pct', '')::NUMERIC(5,2);
            v_is_active := COALESCE((v_item->>'is_active')::BOOLEAN, true);
            v_sort_order := COALESCE((v_item->>'sort_order')::INTEGER, 0);

            IF v_max_gwa IS NULL OR v_max_gwa < 1.00 OR v_max_gwa > 5.00 THEN
                RETURN jsonb_build_object('success', false, 'message', 'Each threshold must have a passing grade ceiling between 1.00 and 5.00.');
            END IF;

            IF v_min_gwa IS NOT NULL AND v_min_gwa > v_max_gwa THEN
                RETURN jsonb_build_object('success', false, 'message', 'A threshold minimum cannot be greater than its maximum.');
            END IF;

            IF v_min_subject_grade IS NOT NULL AND (v_min_subject_grade < 1.00 OR v_min_subject_grade > 5.00) THEN
                RETURN jsonb_build_object('success', false, 'message', 'Minimum subject grade requirement must be between 1.00 and 5.00.');
            END IF;

            IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.academic_thresholds WHERE id = v_id AND deleted_at IS NULL) THEN
                UPDATE public.academic_thresholds
                SET
                    label = v_label,
                    category = v_category,
                    min_gwa = v_min_gwa,
                    max_gwa = v_max_gwa,
                    min_subject_grade = v_min_subject_grade,
                    requires_no_failing = v_requires_no_failing,
                    scholarship_discount_pct = v_scholarship_discount_pct,
                    sort_order = CASE WHEN v_sort_order > 0 THEN v_sort_order ELSE sort_order END,
                    is_active = v_is_active
                WHERE id = v_id
                  AND deleted_at IS NULL;

                IF FOUND THEN
                    v_updated := v_updated + 1;
                END IF;
            ELSE
                v_code := NULLIF(trim(v_item->>'code'), '');
                v_slug := trim(both '_' from lower(regexp_replace(COALESCE(v_code, v_label), '[^a-zA-Z0-9]+', '_', 'g')));
                IF v_slug = '' OR v_slug IS NULL THEN
                    v_slug := 'threshold_' || substr(gen_random_uuid()::text, 1, 8);
                END IF;

                IF EXISTS (SELECT 1 FROM public.academic_thresholds WHERE code = v_slug AND deleted_at IS NULL) THEN
                    v_slug := v_slug || '_' || substr(gen_random_uuid()::text, 1, 6);
                END IF;

                IF v_sort_order <= 0 THEN
                    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
                    FROM public.academic_thresholds
                    WHERE category = v_category AND deleted_at IS NULL;
                END IF;

                INSERT INTO public.academic_thresholds (
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
                    v_category,
                    v_slug,
                    v_label,
                    v_min_gwa,
                    v_max_gwa,
                    v_min_subject_grade,
                    v_requires_no_failing,
                    v_scholarship_discount_pct,
                    v_sort_order,
                    v_is_active
                );

                v_inserted := v_inserted + 1;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', format('Saved academic thresholds (%s updated, %s added, %s removed).', v_updated, v_inserted, v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_academic_standing(p_student_id uuid, p_term_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_roles TEXT[];
    v_gwa_result JSONB;
    v_gwa NUMERIC;
    v_total_units NUMERIC;
    v_failed INTEGER;
    v_worst_grade NUMERIC;
    v_passing_ceiling NUMERIC(4,2);
    v_standing TEXT;
    v_honor JSONB;
    v_scholarship JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    IF NOT (v_roles && ARRAY['Admin', 'Faculty', 'Registrar', 'Dean']) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = p_student_id
              AND s.user_id = auth.uid()
              AND s.deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Forbidden: you may only view your own academic standing.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    v_gwa_result := fn_compute_student_gwa(p_student_id, p_term_id);

    IF NOT (v_gwa_result->>'success')::BOOLEAN THEN
        RETURN v_gwa_result;
    END IF;

    v_gwa := (v_gwa_result->>'gwa')::NUMERIC;
    v_total_units := (v_gwa_result->>'total_units')::NUMERIC;

    SELECT COUNT(*)
    INTO v_failed
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id
    INNER JOIN public.sections sec ON sec.id = e.section_id
    WHERE e.student_id = p_student_id
      AND sec.term_id = p_term_id
      AND sfg.status = 'Released'
      AND COALESCE(sfg.transmuted_grade, sfg.final_grade) > 3.0
      AND e.deleted_at IS NULL
      AND sfg.deleted_at IS NULL;

    SELECT MAX(COALESCE(sfg.transmuted_grade, sfg.final_grade))
    INTO v_worst_grade
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id
    INNER JOIN public.sections sec ON sec.id = e.section_id
    WHERE e.student_id = p_student_id
      AND sec.term_id = p_term_id
      AND sfg.status = 'Released'
      AND e.deleted_at IS NULL
      AND sfg.deleted_at IS NULL;

    SELECT max_gwa
    INTO v_passing_ceiling
    FROM public.academic_thresholds
    WHERE category = 'Standing'
      AND code = 'good_standing'
      AND is_active
      AND deleted_at IS NULL
    LIMIT 1;

    v_passing_ceiling := COALESCE(v_passing_ceiling, 3.00);

    v_standing := CASE
        WHEN v_failed > 0 THEN 'Probation'
        WHEN v_gwa <= v_passing_ceiling THEN 'Good Standing'
        ELSE 'Probation'
    END;

    SELECT jsonb_build_object('code', code, 'label', label)
    INTO v_honor
    FROM public.academic_thresholds
    WHERE category = 'Honor'
      AND is_active
      AND deleted_at IS NULL
      AND v_gwa <= max_gwa
      AND (min_gwa IS NULL OR v_gwa >= min_gwa)
      AND (NOT requires_no_failing OR v_failed = 0)
      AND (min_subject_grade IS NULL OR v_worst_grade IS NULL OR v_worst_grade <= min_subject_grade)
    ORDER BY max_gwa ASC
    LIMIT 1;

    SELECT jsonb_build_object('code', code, 'label', label, 'discount_pct', scholarship_discount_pct)
    INTO v_scholarship
    FROM public.academic_thresholds
    WHERE category = 'Scholarship'
      AND is_active
      AND deleted_at IS NULL
      AND v_gwa <= max_gwa
      AND (min_gwa IS NULL OR v_gwa >= min_gwa)
      AND (NOT requires_no_failing OR v_failed = 0)
      AND (min_subject_grade IS NULL OR v_worst_grade IS NULL OR v_worst_grade <= min_subject_grade)
    ORDER BY max_gwa ASC
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'term_id', p_term_id,
        'gwa', v_gwa,
        'total_units', v_total_units,
        'failed_count', v_failed,
        'standing', v_standing,
        'honor', v_honor,
        'scholarship', v_scholarship
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_academic_thresholds() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_academic_thresholds(jsonb, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_academic_standing(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_thresholds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_academic_thresholds(jsonb, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_standing(uuid, uuid) TO authenticated;