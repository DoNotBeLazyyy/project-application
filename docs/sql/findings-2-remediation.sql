DROP FUNCTION IF EXISTS public.fn_update_role(uuid, text, text);

DROP FUNCTION IF EXISTS public.fn_create_term_type(text, text, text);

DROP FUNCTION IF EXISTS public.fn_update_term_type(uuid, text, text, text);

DO $$
DECLARE
    r RECORD;
    v_client TEXT[] := ARRAY[
        'fn_get_enrollment_target_term',
        'fn_check_evaluation_completion',
        'fn_get_student_evaluation_status',
        'fn_list_applicable_evaluation_templates'
    ];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = ANY (v_client)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.fn_list_my_section_colors() RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'section_id', c.section_id,
        'color', c.color
    )), '[]'::jsonb)
    INTO v_result
    FROM public.student_section_colors c
    WHERE c.student_id = v_student_id
      AND c.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_list_my_section_colors() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_list_my_section_colors() FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_my_section_colors() TO authenticated;

UPDATE public.evaluation_period_locks epl
SET is_completed = TRUE,
    updated_at = now()
WHERE epl.deleted_at IS NULL
  AND COALESCE(epl.is_completed, false) = false
  AND epl.template_ids IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.evaluation_questions q
      WHERE q.template_id = ANY (epl.template_ids)
        AND q.is_required = true
        AND q.deleted_at IS NULL
        AND NOT EXISTS (
            SELECT 1
            FROM public.evaluation_responses r
            WHERE r.question_id = q.id
              AND r.enrollment_id = epl.enrollment_id
              AND r.grading_period_id = epl.grading_period_id
              AND r.deleted_at IS NULL
        )
  )
  AND EXISTS (
      SELECT 1
      FROM public.evaluation_responses r2
      WHERE r2.enrollment_id = epl.enrollment_id
        AND r2.grading_period_id = epl.grading_period_id
        AND r2.deleted_at IS NULL
  );