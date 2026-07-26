DROP FUNCTION IF EXISTS public.fn_update_user(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.fn_update_user(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_role_codes text[]
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_user_id = auth.uid() AND NOT ('Admin' = ANY (COALESCE(p_role_codes, ARRAY[]::TEXT[]))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot remove the Admin role from your own account.'
        );
    END IF;

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name)
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    v_result := public.fn_apply_user_roles(p_user_id, p_role_codes);

    IF NOT (v_result->>'success')::BOOLEAN THEN
        RETURN v_result;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[]) TO authenticated;

DO $$ BEGIN
    CREATE TYPE public.evaluation_scope_type AS ENUM ('Period', 'Term');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS default_evaluation_scope public.evaluation_scope_type NOT NULL DEFAULT 'Period';

ALTER TABLE public.terms
    ADD COLUMN IF NOT EXISTS evaluation_scope public.evaluation_scope_type;

DROP FUNCTION IF EXISTS public.fn_create_term(uuid, uuid, date, date, date, date, date);

CREATE OR REPLACE FUNCTION public.fn_create_term(
    p_school_year_id uuid,
    p_term_type_id uuid,
    p_start_date date,
    p_end_date date,
    p_enrollment_start_date date DEFAULT NULL::date,
    p_enrollment_end_date date DEFAULT NULL::date,
    p_grading_deadline date DEFAULT NULL::date,
    p_evaluation_scope text DEFAULT NULL::text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_evaluation_scope IS NOT NULL AND p_evaluation_scope <> '' AND p_evaluation_scope NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    INSERT INTO public.terms (
        school_year_id, term_type_id, start_date, end_date,
        enrollment_start_date, enrollment_end_date, grading_deadline,
        status, evaluation_scope, created_by
    )
    VALUES (
        p_school_year_id, p_term_type_id, p_start_date, p_end_date,
        p_enrollment_start_date, p_enrollment_end_date, p_grading_deadline,
        'Upcoming', NULLIF(p_evaluation_scope, '')::public.evaluation_scope_type, auth.uid()
    )
    RETURNING id INTO v_term_id;

    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    RETURN jsonb_build_object('success', true, 'message', 'Term created successfully');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_create_term(uuid, uuid, date, date, date, date, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_create_term(uuid, uuid, date, date, date, date, date, text) TO authenticated;