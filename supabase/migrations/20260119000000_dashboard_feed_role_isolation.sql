-- Role isolation for dashboard feeds (listMyAnnouncementsFeed and listMyEventsFeed)

DROP FUNCTION IF EXISTS public.fn_list_my_announcements_feed(integer, integer, text);
DROP FUNCTION IF EXISTS public.fn_list_my_announcements_feed(integer, integer, text, text);

DROP FUNCTION IF EXISTS public.fn_list_my_events_feed(timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.fn_list_my_events_feed(timestamp with time zone, timestamp with time zone, text);

CREATE OR REPLACE FUNCTION public.fn_list_my_announcements_feed(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_role text DEFAULT NULL::text
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
           AND (a.expires_at IS NULL OR a.expires_at > now())'
    );

    IF p_role IS NOT NULL AND p_role <> '' THEN
        v_where := v_where || format(
            ' AND (
                a.created_by_role = %L
                OR (a.target_audience IN (''Faculty'', ''Student'') AND a.target_audience::text = %L)
                OR (a.target_audience = ''Section'' AND EXISTS (
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
            p_role, p_role, v_uid, v_uid
        );
    ELSE
        v_where := v_where || format(
            ' AND (
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
    END IF;

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
    p_to timestamp with time zone,
    p_role text DEFAULT NULL::text
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
              CASE
                  WHEN p_role IS NOT NULL AND p_role <> '' THEN
                      e.created_by_role = p_role
                      OR (e.target_audience IN ('Faculty', 'Student') AND e.target_audience::text = p_role)
                      OR (e.target_audience = 'Section' AND EXISTS (
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
                  ELSE
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
              END
          )
    ) t;

    RETURN v_result;
END;
$function$;
