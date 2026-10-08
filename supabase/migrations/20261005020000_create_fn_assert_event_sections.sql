-- Migration: 20261005020000_create_fn_assert_event_sections.sql
-- Description: Define public.fn_assert_event_sections required by fn_create_event and fn_update_event.

CREATE OR REPLACE FUNCTION public.fn_assert_event_sections(p_audience announcement_audience_type, p_section_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_faculty_only BOOLEAN;
    v_taught INTEGER;
BEGIN
    v_is_faculty_only := NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']);

    IF p_audience = 'Section' THEN
        IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'Select at least one section for a section-targeted event.'
                USING ERRCODE = '22023';
        END IF;

        IF v_is_faculty_only THEN
            SELECT count(*) INTO v_taught
            FROM public.sections s
            WHERE s.id = ANY(p_section_ids)
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL;

            IF v_taught <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only schedule events for sections you teach.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    ELSIF v_is_faculty_only THEN
        RAISE EXCEPTION 'Faculty may only schedule section-targeted events.'
            USING ERRCODE = '42501';
    END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_assert_event_sections(announcement_audience_type, uuid[]) TO authenticated, service_role;
