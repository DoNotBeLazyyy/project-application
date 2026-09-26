ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS max_upload_size_mb SMALLINT NOT NULL DEFAULT 25;

ALTER TABLE public.system_settings
    ADD COLUMN IF NOT EXISTS allowed_upload_types TEXT NOT NULL DEFAULT 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip';

CREATE OR REPLACE FUNCTION public.fn_get_system_settings() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id',                        ss.id,
        'institution_name',          ss.institution_name,
        'institution_short_name',    ss.institution_short_name,
        'institution_address',       ss.institution_address,
        'institution_email',         ss.institution_email,
        'institution_phone',         ss.institution_phone,
        'institution_mobile',        ss.institution_mobile,
        'institution_website',       ss.institution_website,
        'institution_logo_url',      ss.institution_logo_url,
        'academic_year_start_month', ss.academic_year_start_month,
        'max_units_per_term',        ss.max_units_per_term,
        'default_term_type_id',      ss.default_term_type_id,
        'default_evaluation_scope',  ss.default_evaluation_scope::TEXT,
        'max_upload_size_mb',        ss.max_upload_size_mb,
        'allowed_upload_types',      ss.allowed_upload_types
    )
    INTO v_result
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    ORDER BY ss.created_at ASC
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN v_result;
END;
$$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = 'fn_update_system_settings'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.fn_update_system_settings(
    p_institution_name text,
    p_institution_short_name text,
    p_institution_address text,
    p_institution_email text,
    p_institution_phone text,
    p_institution_mobile text,
    p_institution_website text,
    p_institution_logo_url text,
    p_academic_year_start_month smallint,
    p_max_units_per_term smallint,
    p_default_term_type_id uuid DEFAULT NULL::uuid,
    p_default_evaluation_scope text DEFAULT 'Period',
    p_max_upload_size_mb smallint DEFAULT 25,
    p_allowed_upload_types text DEFAULT 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF COALESCE(NULLIF(p_default_evaluation_scope, ''), 'Period') NOT IN ('Period', 'Term') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Evaluation scope must be either Period or Term');
    END IF;

    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    IF p_max_units_per_term < 1 OR p_max_units_per_term > 60 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max units per term must be between 1 and 60');
    END IF;

    IF p_max_upload_size_mb < 1 OR p_max_upload_size_mb > 500 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max upload size must be between 1 MB and 500 MB');
    END IF;

    IF btrim(COALESCE(p_allowed_upload_types, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one allowed file type is required');
    END IF;

    UPDATE public.system_settings
    SET
        institution_name = p_institution_name,
        institution_short_name = p_institution_short_name,
        institution_address = p_institution_address,
        institution_email = p_institution_email,
        institution_phone = p_institution_phone,
        institution_mobile = COALESCE(p_institution_mobile, ''),
        institution_website = p_institution_website,
        institution_logo_url = p_institution_logo_url,
        academic_year_start_month = p_academic_year_start_month,
        max_units_per_term = p_max_units_per_term,
        default_term_type_id = p_default_term_type_id,
        default_evaluation_scope = COALESCE(NULLIF(p_default_evaluation_scope, ''), 'Period')::public.evaluation_scope_type,
        max_upload_size_mb = p_max_upload_size_mb,
        allowed_upload_types = btrim(p_allowed_upload_types)
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$$;

DO $$
DECLARE
    r RECORD;
    v_fns TEXT[] := ARRAY[
        'fn_get_system_settings',
        'fn_update_system_settings'
    ];
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS sig
        FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname = ANY (v_fns)
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END LOOP;
END $$;
