-- ====================================================================
-- Migration: 20261121300013_system_settings_logo_removal.sql
-- Audit 2026-11-21 (Tier 2 system settings):
--   * fn_update_system_settings kept the old logo URL when the logo was removed (an empty
--     value fell back to the stored URL), so a deleted logo file showed as a broken image.
--     An empty value now clears the logo; only a NULL (not sent) keeps the stored one.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_update_system_settings(p_institution_name text, p_institution_short_name text, p_institution_address text, p_institution_email text, p_institution_phone text, p_institution_website text, p_institution_logo_url text, p_academic_year_start_month smallint, p_max_units_per_term smallint DEFAULT 24, p_default_term_type_id uuid DEFAULT NULL::uuid, p_default_evaluation_scope text DEFAULT 'Period'::text, p_institution_mobile text DEFAULT NULL::text, p_max_upload_size_mb smallint DEFAULT 25, p_allowed_upload_types text DEFAULT 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'::text)
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
            -- '' removes the logo; NULL (not sent) keeps the stored one
            institution_logo_url = CASE
                WHEN p_institution_logo_url IS NULL THEN COALESCE(institution_logo_url, '')
                ELSE btrim(p_institution_logo_url)
            END,
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
            COALESCE(NULLIF(btrim(p_institution_logo_url), ''), ''),
            p_academic_year_start_month,
            auth.uid()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$function$;

COMMIT;
