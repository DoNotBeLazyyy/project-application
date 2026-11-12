-- ====================================================================
-- Migration: 20261104032100_create_module_with_status.sql
--   * fn_create_module: takes an optional p_is_published (default true, so existing
--     three-argument calls behave the same). A module saved as Draft is created unpublished
--     straight away and students are only notified when the module is published. Before,
--     the module was always created published and then switched to Draft, so students could
--     see it for a moment and were notified about a module they cannot open.
--   The old three-argument version is dropped so the call is not ambiguous.
-- ====================================================================

DROP FUNCTION IF EXISTS public.fn_create_module(uuid, text, text);

CREATE OR REPLACE FUNCTION public.fn_create_module(
    p_section_id uuid,
    p_title text,
    p_description text DEFAULT NULL::text,
    p_is_published boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_sequence SMALLINT;
    v_course_code TEXT;
    v_is_published BOOLEAN := COALESCE(p_is_published, true);
BEGIN
    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add content.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A module title is required.');
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.modules
    WHERE section_id = p_section_id AND deleted_at IS NULL;

    INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
    VALUES (
        p_section_id,
        btrim(p_title),
        NULLIF(btrim(p_description), ''),
        v_sequence,
        v_is_published,
        CASE WHEN v_is_published THEN now() ELSE NULL END
    )
    RETURNING id INTO v_id;

    -- Notify enrolled students only when the module is visible to them
    IF v_is_published THEN
        SELECT c.code INTO v_course_code
        FROM public.sections s
        LEFT JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = p_section_id;

        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        SELECT
            st.user_id,
            'New Course Material',
            format('%s: New learning module "%s" has been posted.', COALESCE(v_course_code, 'Course'), btrim(p_title)),
            format('/student/subjects/%s', p_section_id::text),
            'General'::public.notification_category_type
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
          AND st.user_id IS NOT NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN v_is_published THEN 'Module created successfully.' ELSE 'Module saved as draft.' END,
        'id', v_id
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fn_create_module(uuid, text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_create_module(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_module(uuid, text, text, boolean) TO service_role;
