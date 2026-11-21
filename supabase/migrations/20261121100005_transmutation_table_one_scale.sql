-- ====================================================================
-- Migration: 20261121100005_transmutation_table_one_scale.sql
-- Audit 2026-11-21 (BUG-AUDIT-20261121.md):
--   #7  fn_get_transmutation_table (What-If simulator, assessment result page, prerequisite
--       grade options): returns one school year's numeric scale instead of every year's rows
--       mixed together, and leaves out special-grade rows (which became "0.00 INC" steps).
--       The step matching on screen is fixed in use-transmutation-scale.ts.
-- Body is based on the live definition read on 2026-11-21. Idempotent (CREATE OR REPLACE).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_transmutation_table()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_year_id UUID;
BEGIN
    -- One scale: the current school year's (the Ongoing term's year, else the latest year
    -- that has started), with the global rows only when no year has any. Special-grade
    -- rows (INC, DRP, ...) are not steps of the numeric scale and are left out.
    SELECT t.school_year_id
    INTO v_school_year_id
    FROM public.terms t
    WHERE t.deleted_at IS NULL
      AND t.status = 'Ongoing'
      AND EXISTS (
          SELECT 1 FROM public.grade_transmutation_tables g
          WHERE g.school_year_id = t.school_year_id AND g.deleted_at IS NULL AND g.program_id IS NULL
      )
    ORDER BY t.start_date DESC
    LIMIT 1;

    IF v_school_year_id IS NULL THEN
        SELECT sy.id
        INTO v_school_year_id
        FROM public.school_years sy
        WHERE sy.deleted_at IS NULL
          AND EXISTS (
              SELECT 1 FROM public.grade_transmutation_tables g
              WHERE g.school_year_id = sy.id AND g.deleted_at IS NULL AND g.program_id IS NULL
          )
        ORDER BY (sy.start_date <= CURRENT_DATE) DESC, sy.start_date DESC
        LIMIT 1;
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gtt.id,
                'label', gtt.label,
                'min_percentage', gtt.min_percentage,
                'max_percentage', gtt.max_percentage,
                'transmuted_grade', gtt.transmuted_grade,
                'description', gtt.description,
                'school_year_id', gtt.school_year_id
            )
            ORDER BY gtt.transmuted_grade ASC
        ), '[]'::jsonb)
        FROM public.grade_transmutation_tables gtt
        WHERE gtt.deleted_at IS NULL
        AND gtt.program_id IS NULL
        AND gtt.special_code IS NULL
        AND gtt.transmuted_grade IS NOT NULL
        AND gtt.school_year_id IS NOT DISTINCT FROM v_school_year_id
    );
END;
$function$;

COMMIT;
