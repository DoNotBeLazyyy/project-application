CREATE OR REPLACE FUNCTION public.fn_list_section_announcements(
    p_section_id UUID,
    p_page INTEGER DEFAULT 1,
    p_size INTEGER DEFAULT 20
)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_is_enrolled BOOLEAN := FALSE;
    v_is_faculty BOOLEAN := FALSE;
    v_is_staff BOOLEAN := FALSE;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
    ) INTO v_is_faculty;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE st.user_id = v_uid AND e.section_id = p_section_id
          AND e.status = 'Enrolled' AND e.deleted_at IS NULL
    ) INTO v_is_enrolled;

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar'];

    IF NOT (v_is_faculty OR v_is_enrolled OR v_is_staff) THEN
        RAISE EXCEPTION 'Access Denied: You are not enrolled in or assigned to this section.'
            USING ERRCODE = '42501';
    END IF;

    v_where := format(
        'WHERE a.deleted_at IS NULL
           AND (a.published_at IS NULL OR a.published_at <= now())
           AND (a.expires_at IS NULL OR a.expires_at > now())
           AND EXISTS (
               SELECT 1 FROM public.announcement_sections asx
               WHERE asx.announcement_id = a.id
                 AND asx.section_id = %L
                 AND asx.deleted_at IS NULL
           )',
        p_section_id
    );

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.created_at,
            a.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'a.is_pinned DESC, a.created_at DESC');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_section_announcements(UUID, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_section_announcements(UUID, INTEGER, INTEGER) TO authenticated;
