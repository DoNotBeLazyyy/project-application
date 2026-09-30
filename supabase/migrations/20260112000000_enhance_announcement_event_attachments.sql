-- Enhance announcement and event listing and feed functions to include attachment counts and attachments

CREATE OR REPLACE FUNCTION public.fn_list_announcements_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_audience text DEFAULT NULL::text,
    p_is_pinned boolean DEFAULT NULL::boolean,
    p_mine_only boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE a.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_mine_only THEN
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_audience IS NOT NULL AND p_audience <> '' THEN
        v_where := v_where || format(' AND a.target_audience = %L', p_audience);
    END IF;

    IF p_is_pinned IS NOT NULL THEN
        v_where := v_where || format(' AND a.is_pinned = %L', p_is_pinned::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.expires_at,
            a.created_at,
            a.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ) AS section_count,
            (
                SELECT count(*)
                FROM public.announcement_attachments aa
                WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
            ) AS attachment_count,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'a.is_pinned DESC, a.created_at DESC');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_events_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_audience text DEFAULT NULL::text,
    p_upcoming_only boolean DEFAULT false,
    p_mine_only boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_mine_only THEN
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (e.title ILIKE %L OR e.description ILIKE %L OR e.location ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_audience IS NOT NULL AND p_audience <> '' THEN
        v_where := v_where || format(' AND e.target_audience = %L', p_audience);
    END IF;

    IF p_upcoming_only THEN
        v_where := v_where || ' AND (e.end_at >= now() OR (e.end_at IS NULL AND e.start_at >= now()))';
    END IF;

    v_base_query := format(
        'SELECT
            e.id,
            e.title,
            e.description,
            e.location,
            e.target_audience,
            e.start_at,
            e.end_at,
            e.all_day,
            e.created_at,
            e.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.event_sections esx
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ) AS section_count,
            (
                SELECT count(*)
                FROM public.event_attachments ea
                WHERE ea.event_id = e.id AND ea.deleted_at IS NULL
            ) AS attachment_count,
            COUNT(*) OVER() AS total_count
        FROM public.events e
        LEFT JOIN public.users u ON u.id = e.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.start_at ASC');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_my_announcements_feed(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_where := format(
        'WHERE a.deleted_at IS NULL
           AND (a.published_at IS NULL OR a.published_at <= now())
           AND (a.expires_at IS NULL OR a.expires_at > now())
           AND (
                a.created_by = %L
                OR a.target_audience = ''Global''
                OR (a.target_audience IN (''Faculty'', ''Student'')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = a.target_audience::text
                    ))
                OR (a.target_audience = ''Section''
                    AND EXISTS (
                        SELECT 1 FROM public.announcement_sections asx
                        WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.enrollments e
                                  JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = %L AND e.section_id = asx.section_id
                                    AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.sections s
                                  WHERE s.id = asx.section_id AND s.faculty_id = %L AND s.deleted_at IS NULL
                              )
                          )
                    ))
           )',
        v_uid, v_uid, v_uid, v_uid
    );

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.created_at,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.announcement_attachments aa
                WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
            ) AS attachment_count,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            ''id'', aa.id,
                            ''file_name'', aa.file_name,
                            ''file_path'', aa.file_path,
                            ''mime_type'', aa.mime_type,
                            ''file_size'', aa.file_size
                        )
                        ORDER BY aa.created_at
                    )
                    FROM public.announcement_attachments aa
                    WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
                ),
                ''[]''::jsonb
            ) AS attachments,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_my_events_feed(
    p_from timestamp with time zone,
    p_to timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_result JSONB;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.start_at), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            e.id,
            e.title,
            e.description,
            e.location,
            e.target_audience,
            e.start_at,
            e.end_at,
            e.all_day,
            (
                SELECT count(*)
                FROM public.event_attachments ea
                WHERE ea.event_id = e.id AND ea.deleted_at IS NULL
            ) AS attachment_count,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', ea.id,
                            'file_name', ea.file_name,
                            'file_path', ea.file_path,
                            'mime_type', ea.mime_type,
                            'file_size', ea.file_size
                        )
                        ORDER BY ea.created_at
                    )
                    FROM public.event_attachments ea
                    WHERE ea.event_id = e.id AND ea.deleted_at IS NULL
                ),
                '[]'::jsonb
            ) AS attachments
        FROM public.events e
        WHERE e.deleted_at IS NULL
          AND e.start_at < p_to
          AND (COALESCE(e.end_at, e.start_at) >= p_from)
          AND (
                e.target_audience = 'Global'
                OR (e.target_audience IN ('Faculty', 'Student')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = e.target_audience::text
                    ))
                OR (e.target_audience = 'Section'
                    AND EXISTS (
                        SELECT 1 FROM public.event_sections esx
                        WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.enrollments en
                                  JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = v_uid AND en.section_id = esx.section_id
                                    AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.sections s
                                  WHERE s.id = esx.section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
                              )
                          )
                    ))
          )
    ) t;

    RETURN v_result;
END;
$function$;
