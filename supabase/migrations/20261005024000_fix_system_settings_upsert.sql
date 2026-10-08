-- Migration: 20261005024000_fix_system_settings_upsert.sql
-- Description:
-- 1. Update fn_update_system_settings to upsert system settings (insert if no row exists, update if exists)
--    and persist institution_mobile.
-- 2. Update fn_get_system_settings to return institution_mobile.
-- 3. Seed initial default institution settings if table is empty.

CREATE OR REPLACE FUNCTION public.fn_get_system_settings()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
        'academic_year_start_month', ss.academic_year_start_month
    )
    INTO v_result
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    ORDER BY ss.created_at ASC
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_system_settings(
    p_institution_name text,
    p_institution_short_name text,
    p_institution_address text,
    p_institution_email text,
    p_institution_phone text,
    p_institution_website text,
    p_institution_logo_url text,
    p_academic_year_start_month smallint,
    p_max_units_per_term smallint DEFAULT 24,
    p_default_term_type_id uuid DEFAULT NULL::uuid,
    p_default_evaluation_scope text DEFAULT 'Period'::text,
    p_institution_mobile text DEFAULT NULL,
    p_max_upload_size_mb smallint DEFAULT 25,
    p_allowed_upload_types text DEFAULT 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    SELECT id INTO v_id
    FROM public.system_settings
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        UPDATE public.system_settings
        SET
            institution_name = p_institution_name,
            institution_short_name = p_institution_short_name,
            institution_address = p_institution_address,
            institution_email = p_institution_email,
            institution_phone = p_institution_phone,
            institution_mobile = p_institution_mobile,
            institution_website = p_institution_website,
            institution_logo_url = p_institution_logo_url,
            academic_year_start_month = p_academic_year_start_month,
            updated_at = now(),
            updated_by = auth.uid()
        WHERE id = v_id;
    ELSE
        INSERT INTO public.system_settings (
            institution_name,
            institution_short_name,
            institution_address,
            institution_email,
            institution_phone,
            institution_mobile,
            institution_website,
            institution_logo_url,
            academic_year_start_month,
            created_by
        )
        VALUES (
            p_institution_name,
            p_institution_short_name,
            p_institution_address,
            p_institution_email,
            p_institution_phone,
            p_institution_mobile,
            p_institution_website,
            p_institution_logo_url,
            p_academic_year_start_month,
            auth.uid()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_update_system_settings(text, text, text, text, text, text, text, smallint, smallint, uuid, text, text, smallint, text) TO authenticated, anon, service_role;

-- Seed default institution row if table is currently empty
INSERT INTO public.system_settings (
    institution_name,
    institution_short_name,
    institution_address,
    institution_email,
    institution_phone,
    institution_website,
    academic_year_start_month
)
SELECT
    'Arellano University - Jose Abad Santos Campus',
    'AU-JAS',
    '3058 Taft Avenue, Pasay City, Metro Manila, Philippines',
    'admin@arellano.edu.ph',
    '(+63 2) 8525-4601',
    'https://arellano.edu.ph',
    8
WHERE NOT EXISTS (
    SELECT 1 FROM public.system_settings WHERE deleted_at IS NULL
);
