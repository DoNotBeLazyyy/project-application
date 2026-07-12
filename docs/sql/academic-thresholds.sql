CREATE TABLE IF NOT EXISTS public.academic_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    code TEXT NOT NULL,
    label TEXT NOT NULL,
    min_gwa NUMERIC(4,2),
    max_gwa NUMERIC(4,2) NOT NULL,
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

INSERT INTO public.academic_thresholds (category, code, label, min_gwa, max_gwa, requires_no_failing, scholarship_discount_pct, sort_order)
SELECT * FROM (VALUES
    ('Honor', 'summa_cum_laude', 'Summa Cum Laude', 1.00, 1.25, true, NULL::NUMERIC, 1),
    ('Honor', 'magna_cum_laude', 'Magna Cum Laude', 1.26, 1.50, true, NULL::NUMERIC, 2),
    ('Honor', 'cum_laude', 'Cum Laude', 1.51, 1.75, true, NULL::NUMERIC, 3),
    ('Scholarship', 'academic_scholar_full', 'Full Academic Scholarship', 1.00, 1.45, true, 100.00, 1),
    ('Scholarship', 'academic_scholar_partial', 'Partial Academic Scholarship', 1.46, 1.75, true, 50.00, 2),
    ('Standing', 'good_standing', 'Good Standing', 1.00, 3.00, false, NULL::NUMERIC, 1)
) AS seed(category, code, label, min_gwa, max_gwa, requires_no_failing, scholarship_discount_pct, sort_order)
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

CREATE OR REPLACE FUNCTION public.fn_update_academic_thresholds(p_thresholds jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_item JSONB;
    v_id UUID;
    v_min_gwa NUMERIC(4,2);
    v_max_gwa NUMERIC(4,2);
    v_updated INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF jsonb_typeof(p_thresholds) <> 'array' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid payload: an array of thresholds is required.');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_thresholds)
    LOOP
        v_id := (v_item->>'id')::UUID;
        v_min_gwa := NULLIF(v_item->>'min_gwa', '')::NUMERIC(4,2);
        v_max_gwa := (v_item->>'max_gwa')::NUMERIC(4,2);

        IF v_max_gwa IS NULL OR v_max_gwa < 1.00 OR v_max_gwa > 5.00 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each threshold must have a passing grade ceiling between 1.00 and 5.00.');
        END IF;

        IF v_min_gwa IS NOT NULL AND v_min_gwa > v_max_gwa THEN
            RETURN jsonb_build_object('success', false, 'message', 'A threshold minimum cannot be greater than its maximum.');
        END IF;

        UPDATE public.academic_thresholds
        SET
            min_gwa = v_min_gwa,
            max_gwa = v_max_gwa,
            requires_no_failing = COALESCE((v_item->>'requires_no_failing')::BOOLEAN, requires_no_failing),
            scholarship_discount_pct = NULLIF(v_item->>'scholarship_discount_pct', '')::NUMERIC(5,2),
            is_active = COALESCE((v_item->>'is_active')::BOOLEAN, is_active)
        WHERE id = v_id
          AND deleted_at IS NULL;

        IF FOUND THEN
            v_updated := v_updated + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', format('Updated %s academic threshold(s).', v_updated));

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
      AND (NOT requires_no_failing OR v_failed = 0)
    ORDER BY max_gwa ASC
    LIMIT 1;

    SELECT jsonb_build_object('code', code, 'label', label, 'discount_pct', scholarship_discount_pct)
    INTO v_scholarship
    FROM public.academic_thresholds
    WHERE category = 'Scholarship'
      AND is_active
      AND deleted_at IS NULL
      AND v_gwa <= max_gwa
      AND (NOT requires_no_failing OR v_failed = 0)
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
REVOKE EXECUTE ON FUNCTION public.fn_update_academic_thresholds(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_academic_standing(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_thresholds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_academic_thresholds(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_academic_standing(uuid, uuid) TO authenticated;