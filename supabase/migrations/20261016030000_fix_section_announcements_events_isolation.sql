-- ============================================================================
-- Migration: 20261016030000_fix_section_announcements_events_isolation.sql
-- Description:
-- 1. Fix section-targeted announcement and event leakage to other professors:
--    Remove broad `created_by_role = 'Faculty'` matching in dashboard feeds,
--    calendar feeds, management lists, and detail/mutation RPCs so Faculty
--    members only see their own created items, sections they personally teach,
--    and Global/Faculty campus-wide posts.
-- 2. Prevent unenrolled new student accounts from seeing announcements and
--    upcoming events in dashboard/calendar feeds before enrolling in at least
--    one section, and strictly scope student 'Section' items to active
--    ('Enrolled') section enrollments.
-- ============================================================================

-- 1. fn_list_my_announcements_feed
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

    IF p_role = 'Student' THEN
        -- Unenrolled students (no active 'Enrolled' sections) do not see feed items yet
        v_where := v_where || format(
            ' AND EXISTS (
                SELECT 1 FROM public.enrollments e_any
                JOIN public.students st_any ON st_any.id = e_any.student_id AND st_any.deleted_at IS NULL
                WHERE st_any.user_id = %L
                  AND e_any.status = ''Enrolled''
                  AND e_any.deleted_at IS NULL
            )
            AND (
                a.target_audience IN (''Global'', ''Student'')
                OR (a.target_audience = ''Section'' AND (
                    EXISTS (
                        SELECT 1 FROM public.announcement_sections asx
                        JOIN public.enrollments e ON e.section_id = asx.section_id
                            AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                        WHERE asx.announcement_id = a.id
                          AND asx.deleted_at IS NULL
                          AND st.user_id = %L
                    )
                    OR (a.section_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.enrollments e
                        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                        WHERE e.section_id = a.section_id
                          AND e.status = ''Enrolled''
                          AND e.deleted_at IS NULL
                          AND st.user_id = %L
                    ))
                ))
            )',
            v_uid, v_uid, v_uid
        );
    ELSIF p_role = 'Faculty' THEN
        -- Faculty members only see their own created items, Global/Faculty items,
        -- or Section items for sections they personally teach (never other professors' sections)
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR a.target_audience IN (''Global'', ''Faculty'')
                OR (a.target_audience = ''Section'' AND (
                    EXISTS (
                        SELECT 1 FROM public.announcement_sections asx
                        JOIN public.sections s ON s.id = asx.section_id AND s.deleted_at IS NULL
                        WHERE asx.announcement_id = a.id
                          AND asx.deleted_at IS NULL
                          AND s.faculty_id = %L
                    )
                    OR (a.section_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.sections s
                        WHERE s.id = a.section_id
                          AND s.faculty_id = %L
                          AND s.deleted_at IS NULL
                    ))
                ))
            )',
            v_uid, v_uid, v_uid
        );
    ELSIF p_role IS NOT NULL AND p_role <> '' THEN
        -- Staff roles (Admin, Dean, Registrar): own items, non-section role items, or Global
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR (a.created_by_role = %L AND a.target_audience <> ''Section'')
                OR a.target_audience = ''Global''
            )',
            v_uid, p_role
        );
    ELSE
        -- Fallback when p_role is omitted
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR (
                    a.target_audience = ''Global''
                    AND (
                        EXISTS (
                            SELECT 1 FROM public.user_roles ur
                            JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                            WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                              AND r.code IN (''Admin'', ''Dean'', ''Registrar'', ''Faculty'')
                        )
                        OR EXISTS (
                            SELECT 1 FROM public.enrollments e
                            JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                            WHERE st.user_id = %L AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                        )
                    )
                )
                OR (
                    a.target_audience = ''Faculty''
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = ''Faculty''
                    )
                )
                OR (
                    a.target_audience = ''Student''
                    AND EXISTS (
                        SELECT 1 FROM public.enrollments e
                        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                        WHERE st.user_id = %L AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                    )
                )
                OR (
                    a.target_audience = ''Section''
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
                    )
                )
            )',
            v_uid, v_uid, v_uid, v_uid, v_uid, v_uid, v_uid
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

-- 2. fn_list_my_events_feed
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
                  WHEN p_role = 'Student' THEN
                      EXISTS (
                          SELECT 1 FROM public.enrollments en_any
                          JOIN public.students st_any ON st_any.id = en_any.student_id AND st_any.deleted_at IS NULL
                          WHERE st_any.user_id = v_uid
                            AND en_any.status = 'Enrolled'
                            AND en_any.deleted_at IS NULL
                      )
                      AND (
                          e.target_audience IN ('Global', 'Student')
                          OR (e.target_audience = 'Section' AND (
                              EXISTS (
                                  SELECT 1 FROM public.event_sections esx
                                  JOIN public.enrollments en ON en.section_id = esx.section_id
                                      AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                                  JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                  WHERE esx.event_id = e.id
                                    AND esx.deleted_at IS NULL
                                    AND st.user_id = v_uid
                              )
                              OR (e.section_id IS NOT NULL AND EXISTS (
                                  SELECT 1 FROM public.enrollments en
                                  JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                  WHERE en.section_id = e.section_id
                                    AND en.status = 'Enrolled'
                                    AND en.deleted_at IS NULL
                                    AND st.user_id = v_uid
                              ))
                          ))
                      )
                  WHEN p_role = 'Faculty' THEN
                      e.created_by = v_uid
                      OR e.target_audience IN ('Global', 'Faculty')
                      OR (e.target_audience = 'Section' AND (
                          EXISTS (
                              SELECT 1 FROM public.event_sections esx
                              JOIN public.sections s ON s.id = esx.section_id AND s.deleted_at IS NULL
                              WHERE esx.event_id = e.id
                                AND esx.deleted_at IS NULL
                                AND s.faculty_id = v_uid
                          )
                          OR (e.section_id IS NOT NULL AND EXISTS (
                              SELECT 1 FROM public.sections s
                              WHERE s.id = e.section_id
                                AND s.faculty_id = v_uid
                                AND s.deleted_at IS NULL
                          ))
                      ))
                  WHEN p_role IS NOT NULL AND p_role <> '' THEN
                      e.created_by = v_uid
                      OR (e.created_by_role = p_role AND e.target_audience <> 'Section')
                      OR e.target_audience = 'Global'
                  ELSE
                      e.created_by = v_uid
                      OR (
                          e.target_audience = 'Global'
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.user_roles ur
                                  JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                                  WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                    AND r.code IN ('Admin', 'Dean', 'Registrar', 'Faculty')
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.enrollments en
                                  JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = v_uid AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                              )
                          )
                      )
                      OR (
                          e.target_audience = 'Faculty'
                          AND EXISTS (
                              SELECT 1 FROM public.user_roles ur
                              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                              WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                AND r.code = 'Faculty'
                          )
                      )
                      OR (
                          e.target_audience = 'Student'
                          AND EXISTS (
                              SELECT 1 FROM public.enrollments en
                              JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                              WHERE st.user_id = v_uid AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                          )
                      )
                      OR (
                          e.target_audience = 'Section'
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
                          )
                      )
              END
          )
    ) t;

    RETURN v_result;
END;
$function$;

-- 3. fn_list_announcements_json
CREATE OR REPLACE FUNCTION public.fn_list_announcements_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_audience text DEFAULT NULL::text,
    p_is_pinned boolean DEFAULT NULL::boolean,
    p_mine_only boolean DEFAULT true,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE a.deleted_at IS NULL';
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
          AND r.code = 'Admin'
    ) INTO v_is_admin;

    IF v_is_admin AND (p_role IS NULL OR p_role = 'Admin') THEN
        -- Admin management view sees all announcements
        NULL;
    ELSIF p_role = 'Faculty' THEN
        -- Faculty management view only sees own posts, Global/Faculty posts, or sections they teach
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR a.target_audience IN (''Global'', ''Faculty'')
                OR (a.target_audience = ''Section'' AND EXISTS (
                    SELECT 1 FROM public.announcement_sections asx
                    JOIN public.sections s ON s.id = asx.section_id AND s.deleted_at IS NULL
                    WHERE asx.announcement_id = a.id
                      AND asx.deleted_at IS NULL
                      AND s.faculty_id = %L
                ))
            )',
            auth.uid(), auth.uid()
        );
    ELSIF p_role IS NOT NULL AND p_role <> '' THEN
        -- Dean / Registrar management view
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR (a.created_by_role = %L AND a.target_audience <> ''Section'')
                OR a.target_audience = ''Global''
            )',
            auth.uid(), p_role
        );
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR a.target_audience = ''Global''
            )',
            auth.uid()
        );
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
            a.created_by_role,
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

-- 4. fn_list_events_json
CREATE OR REPLACE FUNCTION public.fn_list_events_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_audience text DEFAULT NULL::text,
    p_upcoming_only boolean DEFAULT false,
    p_mine_only boolean DEFAULT true,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
          AND r.code = 'Admin'
    ) INTO v_is_admin;

    IF v_is_admin AND (p_role IS NULL OR p_role = 'Admin') THEN
        -- Admin management view sees all events
        NULL;
    ELSIF p_role = 'Faculty' THEN
        -- Faculty management view only sees own events, Global/Faculty events, or sections they teach
        v_where := v_where || format(
            ' AND (
                e.created_by = %L
                OR e.target_audience IN (''Global'', ''Faculty'')
                OR (e.target_audience = ''Section'' AND EXISTS (
                    SELECT 1 FROM public.event_sections esx
                    JOIN public.sections s ON s.id = esx.section_id AND s.deleted_at IS NULL
                    WHERE esx.event_id = e.id
                      AND esx.deleted_at IS NULL
                      AND s.faculty_id = %L
                ))
            )',
            auth.uid(), auth.uid()
        );
    ELSIF p_role IS NOT NULL AND p_role <> '' THEN
        -- Dean / Registrar management view
        v_where := v_where || format(
            ' AND (
                e.created_by = %L
                OR (e.created_by_role = %L AND e.target_audience <> ''Section'')
                OR e.target_audience = ''Global''
            )',
            auth.uid(), p_role
        );
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(
            ' AND (
                e.created_by = %L
                OR e.target_audience = ''Global''
            )',
            auth.uid()
        );
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
            e.created_by_role,
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

-- 5. fn_get_announcement_by_id
CREATE OR REPLACE FUNCTION public.fn_get_announcement_by_id(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', a.id,
        'title', a.title,
        'content', a.content,
        'target_audience', a.target_audience,
        'is_pinned', a.is_pinned,
        'published_at', a.published_at,
        'expires_at', a.expires_at,
        'created_at', a.created_at,
        'created_by', a.created_by,
        'created_by_role', a.created_by_role,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'section_ids', COALESCE(
            (
                SELECT jsonb_agg(asx.section_id ORDER BY asx.created_at)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'sections', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object('id', s.id, 'code', s.section_code, 'course_code', c.code)
                    ORDER BY s.section_code
                )
                FROM public.announcement_sections asx
                JOIN public.sections s ON s.id = asx.section_id AND s.deleted_at IS NULL
                LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'attachments', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', aa.id,
                        'file_name', aa.file_name,
                        'file_path', aa.file_path,
                        'mime_type', aa.mime_type,
                        'file_size', aa.file_size
                    )
                    ORDER BY aa.created_at
                )
                FROM public.announcement_attachments aa
                WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.announcements a
    LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.id = p_id
      AND a.deleted_at IS NULL
      AND (
          -- Direct creator
          a.created_by = auth.uid()
          -- Admin can view any announcement
          OR EXISTS (
              SELECT 1 FROM public.user_roles ur
              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
              WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                AND r.code = 'Admin'
          )
          -- Non-section announcements: staff role match or audience match
          OR (
              a.target_audience <> 'Section'
              AND (
                  a.target_audience = 'Global'
                  OR (
                      a.created_by_role IN ('Admin', 'Dean', 'Registrar')
                      AND EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                          WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                            AND r.code = a.created_by_role
                      )
                  )
                  OR (
                      a.target_audience IN ('Faculty', 'Student')
                      AND EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                          WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                            AND r.code = a.target_audience::text
                      )
                  )
              )
          )
          -- Section announcements: strictly limited to enrolled students or assigned section faculty
          OR (
              a.target_audience = 'Section'
              AND (
                  EXISTS (
                      SELECT 1 FROM public.announcement_sections asx
                      WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
                        AND (
                            EXISTS (
                                SELECT 1 FROM public.enrollments e
                                JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                                WHERE st.user_id = auth.uid() AND e.section_id = asx.section_id
                                  AND e.status = 'Enrolled' AND e.deleted_at IS NULL
                            )
                            OR EXISTS (
                                SELECT 1 FROM public.sections s
                                WHERE s.id = asx.section_id AND s.faculty_id = auth.uid() AND s.deleted_at IS NULL
                            )
                        )
                  )
                  OR (
                      a.section_id IS NOT NULL
                      AND (
                          EXISTS (
                              SELECT 1 FROM public.enrollments e
                              JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                              WHERE st.user_id = auth.uid() AND e.section_id = a.section_id
                                AND e.status = 'Enrolled' AND e.deleted_at IS NULL
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.sections s
                              WHERE s.id = a.section_id AND s.faculty_id = auth.uid() AND s.deleted_at IS NULL
                          )
                      )
                  )
              )
          )
      );

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    RETURN v_result;
END;
$function$;

-- 6. fn_get_event_by_id
CREATE OR REPLACE FUNCTION public.fn_get_event_by_id(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'location', e.location,
        'target_audience', e.target_audience,
        'start_at', e.start_at,
        'end_at', e.end_at,
        'all_day', e.all_day,
        'created_at', e.created_at,
        'created_by', e.created_by,
        'created_by_role', e.created_by_role,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'section_ids', COALESCE(
            (
                SELECT jsonb_agg(esx.section_id ORDER BY esx.created_at)
                FROM public.event_sections esx
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'sections', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object('id', s.id, 'code', s.section_code, 'course_code', c.code)
                    ORDER BY s.section_code
                )
                FROM public.event_sections esx
                JOIN public.sections s ON s.id = esx.section_id AND s.deleted_at IS NULL
                LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'attachments', COALESCE(
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
        )
    )
    INTO v_result
    FROM public.events e
    LEFT JOIN public.users u ON u.id = e.created_by
    WHERE e.id = p_id
      AND e.deleted_at IS NULL
      AND (
          -- Direct creator
          e.created_by = auth.uid()
          -- Admin can view any event
          OR EXISTS (
              SELECT 1 FROM public.user_roles ur
              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
              WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                AND r.code = 'Admin'
          )
          -- Non-section events: staff role match or audience match
          OR (
              e.target_audience <> 'Section'
              AND (
                  e.target_audience = 'Global'
                  OR (
                      e.created_by_role IN ('Admin', 'Dean', 'Registrar')
                      AND EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                          WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                            AND r.code = e.created_by_role
                      )
                  )
                  OR (
                      e.target_audience IN ('Faculty', 'Student')
                      AND EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                          WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                            AND r.code = e.target_audience::text
                      )
                  )
              )
          )
          -- Section events: strictly limited to enrolled students or assigned section faculty
          OR (
              e.target_audience = 'Section'
              AND (
                  EXISTS (
                      SELECT 1 FROM public.event_sections esx
                      WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
                        AND (
                            EXISTS (
                                SELECT 1 FROM public.enrollments en
                                JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                WHERE st.user_id = auth.uid() AND en.section_id = esx.section_id
                                  AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                            )
                            OR EXISTS (
                                SELECT 1 FROM public.sections s
                                WHERE s.id = esx.section_id AND s.faculty_id = auth.uid() AND s.deleted_at IS NULL
                            )
                        )
                  )
                  OR (
                      e.section_id IS NOT NULL
                      AND (
                          EXISTS (
                              SELECT 1 FROM public.enrollments en
                              JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                              WHERE st.user_id = auth.uid() AND en.section_id = e.section_id
                                AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.sections s
                              WHERE s.id = e.section_id AND s.faculty_id = auth.uid() AND s.deleted_at IS NULL
                          )
                      )
                  )
              )
          )
      );

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    RETURN v_result;
END;
$function$;

-- 7. fn_update_announcement, fn_delete_announcement, fn_bulk_delete_announcements
CREATE OR REPLACE FUNCTION public.fn_update_announcement(
    p_id uuid,
    p_title text,
    p_content text,
    p_audience announcement_audience_type,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_is_pinned boolean DEFAULT false,
    p_published_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_attachments jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_owner UUID;
    v_created_by_role TEXT;
    v_existing_audience public.announcement_audience_type;
    v_att JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement title is required.');
    END IF;

    IF p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement content is required.');
    END IF;

    SELECT created_by, created_by_role, target_audience
    INTO v_owner, v_created_by_role, v_existing_audience
    FROM public.announcements
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    IF v_owner <> auth.uid()
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles ur
           JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
           WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
             AND (
                 r.code = 'Admin'
                 OR (
                     v_existing_audience <> 'Section'
                     AND v_created_by_role IN ('Dean', 'Registrar')
                     AND r.code = v_created_by_role
                 )
             )
       ) THEN
        RAISE EXCEPTION 'You may only edit announcements you created.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    UPDATE public.announcements
    SET title = btrim(p_title),
        content = btrim(p_content),
        target_audience = p_audience,
        section_id = CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        is_pinned = COALESCE(p_is_pinned, false),
        published_at = COALESCE(p_published_at, published_at),
        expires_at = p_expires_at,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_id
      AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE announcement_id = p_id
      AND deleted_at IS NULL
      AND (p_audience <> 'Section' OR p_section_ids IS NULL OR NOT (section_id = ANY(p_section_ids)));

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids LOOP
            INSERT INTO public.announcement_sections (announcement_id, section_id, created_by)
            VALUES (p_id, v_section_id, auth.uid())
            ON CONFLICT (announcement_id, section_id)
            DO UPDATE SET deleted_at = NULL, deleted_by = NULL, updated_at = now(), updated_by = auth.uid();
        END LOOP;
    END IF;

    IF p_attachments IS NOT NULL THEN
        UPDATE public.announcement_attachments
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE announcement_id = p_id AND deleted_at IS NULL;

        IF jsonb_array_length(p_attachments) > 0 THEN
            FOR v_att IN SELECT * FROM jsonb_array_elements(p_attachments)
            LOOP
                INSERT INTO public.announcement_attachments (
                    announcement_id, file_name, file_path, mime_type, file_size, created_by
                )
                VALUES (
                    p_id,
                    v_att->>'file_name',
                    v_att->>'file_path',
                    v_att->>'mime_type',
                    (v_att->>'file_size')::BIGINT,
                    auth.uid()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement updated successfully.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_delete_announcement(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_owner UUID;
    v_created_by_role TEXT;
    v_existing_audience public.announcement_audience_type;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by, created_by_role, target_audience
    INTO v_owner, v_created_by_role, v_existing_audience
    FROM public.announcements
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    IF v_owner <> auth.uid()
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles ur
           JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
           WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
             AND (
                 r.code = 'Admin'
                 OR (
                     v_existing_audience <> 'Section'
                     AND v_created_by_role IN ('Dean', 'Registrar')
                     AND r.code = v_created_by_role
                 )
             )
       ) THEN
        RAISE EXCEPTION 'You may only delete announcements you created.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = p_id AND deleted_at IS NULL;

    UPDATE public.notifications
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE action_url LIKE '%' || p_id::text
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement deleted.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_announcements(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No announcements were selected.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
          AND r.code = 'Admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin AND EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id = ANY(p_ids)
          AND a.deleted_at IS NULL
          AND a.created_by <> auth.uid()
          AND NOT (
              a.target_audience <> 'Section'
              AND a.created_by_role IN ('Dean', 'Registrar')
              AND EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                    AND r.code = a.created_by_role
              )
          )
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete announcements you created.');
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = ANY(p_ids) AND deleted_at IS NULL;

    UPDATE public.notifications
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM unnest(p_ids) AS del_id
          WHERE action_url LIKE '%' || del_id::text
      );

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s announcement(s).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 8. fn_update_event, fn_delete_event, fn_bulk_delete_events
CREATE OR REPLACE FUNCTION public.fn_update_event(
    p_id uuid,
    p_title text,
    p_start_at timestamp with time zone,
    p_audience announcement_audience_type,
    p_end_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_all_day boolean DEFAULT false,
    p_location text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_attachments jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_owner UUID;
    v_created_by_role TEXT;
    v_existing_audience public.announcement_audience_type;
    v_att JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event title is required.');
    END IF;

    IF p_start_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event start date/time is required.');
    END IF;

    IF p_end_at IS NOT NULL AND p_end_at < p_start_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event end date/time cannot be earlier than start date/time.');
    END IF;

    SELECT created_by, created_by_role, target_audience
    INTO v_owner, v_created_by_role, v_existing_audience
    FROM public.events
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    IF v_owner <> auth.uid()
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles ur
           JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
           WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
             AND (
                 r.code = 'Admin'
                 OR (
                     v_existing_audience <> 'Section'
                     AND v_created_by_role IN ('Dean', 'Registrar')
                     AND r.code = v_created_by_role
                 )
             )
       ) THEN
        RAISE EXCEPTION 'You may only edit events you created.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM public.fn_assert_event_sections(p_audience, p_section_ids);

    UPDATE public.events
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        location = NULLIF(btrim(p_location), ''),
        target_audience = p_audience,
        section_id = CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        start_at = p_start_at,
        end_at = p_end_at,
        all_day = COALESCE(p_all_day, false),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_id
      AND deleted_at IS NULL;

    UPDATE public.event_sections
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE event_id = p_id
      AND deleted_at IS NULL
      AND (p_audience <> 'Section' OR p_section_ids IS NULL OR NOT (section_id = ANY(p_section_ids)));

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids LOOP
            INSERT INTO public.event_sections (event_id, section_id, created_by)
            VALUES (p_id, v_section_id, auth.uid())
            ON CONFLICT (event_id, section_id)
            DO UPDATE SET deleted_at = NULL, deleted_by = NULL, updated_at = now(), updated_by = auth.uid();
        END LOOP;
    END IF;

    IF p_attachments IS NOT NULL THEN
        UPDATE public.event_attachments
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE event_id = p_id AND deleted_at IS NULL;

        IF jsonb_array_length(p_attachments) > 0 THEN
            FOR v_att IN SELECT * FROM jsonb_array_elements(p_attachments)
            LOOP
                INSERT INTO public.event_attachments (
                    event_id, file_name, file_path, mime_type, file_size, created_by
                )
                VALUES (
                    p_id,
                    v_att->>'file_name',
                    v_att->>'file_path',
                    v_att->>'mime_type',
                    (v_att->>'file_size')::BIGINT,
                    auth.uid()
                );
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Event updated successfully.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_delete_event(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_owner UUID;
    v_created_by_role TEXT;
    v_existing_audience public.announcement_audience_type;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by, created_by_role, target_audience
    INTO v_owner, v_created_by_role, v_existing_audience
    FROM public.events
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    IF v_owner <> auth.uid()
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles ur
           JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
           WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
             AND (
                 r.code = 'Admin'
                 OR (
                     v_existing_audience <> 'Section'
                     AND v_created_by_role IN ('Dean', 'Registrar')
                     AND r.code = v_created_by_role
                 )
             )
       ) THEN
        RAISE EXCEPTION 'You may only delete events you created.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.events
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.event_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE event_id = p_id AND deleted_at IS NULL;

    UPDATE public.notifications
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE action_url LIKE '%' || p_id::text
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Event deleted.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_events(p_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_deleted INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No events were selected.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
          AND r.code = 'Admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin AND EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = ANY(p_ids)
          AND e.deleted_at IS NULL
          AND e.created_by <> auth.uid()
          AND NOT (
              e.target_audience <> 'Section'
              AND e.created_by_role IN ('Dean', 'Registrar')
              AND EXISTS (
                  SELECT 1 FROM public.user_roles ur
                  JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                    AND r.code = e.created_by_role
              )
          )
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete events you created.');
    END IF;

    UPDATE public.events
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.event_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE event_id = ANY(p_ids) AND deleted_at IS NULL;

    UPDATE public.notifications
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM unnest(p_ids) AS del_id
          WHERE action_url LIKE '%' || del_id::text
      );

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s event(s).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 9. fn_resolve_audience: ensure unenrolled students do not receive Global/Student notifications
CREATE OR REPLACE FUNCTION public.fn_resolve_audience(
    p_audience announcement_audience_type,
    p_section_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT DISTINCT u.id
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.status = 'Active'
      AND (
          (
              p_audience = 'Global'
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.user_roles ur
                      INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                      WHERE ur.user_id = u.id
                        AND ur.deleted_at IS NULL
                        AND ur.revoked_at IS NULL
                        AND r.code IN ('Admin', 'Dean', 'Registrar', 'Faculty')
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.enrollments e
                      INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND e.status = 'Enrolled'
                        AND e.deleted_at IS NULL
                  )
              )
          )
          OR (
              p_audience = 'Faculty'
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = 'Faculty'
              )
          )
          OR (
              p_audience = 'Student'
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = 'Student'
              )
              AND EXISTS (
                  SELECT 1
                  FROM public.enrollments e
                  INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                  WHERE st.user_id = u.id
                    AND e.status = 'Enrolled'
                    AND e.deleted_at IS NULL
              )
          )
          OR (
              p_audience = 'Section'
              AND p_section_ids IS NOT NULL
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.enrollments e
                      INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND e.section_id = ANY(p_section_ids)
                        AND e.status = 'Enrolled'
                        AND e.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.sections s
                      WHERE s.faculty_id = u.id
                        AND s.id = ANY(p_section_ids)
                        AND s.deleted_at IS NULL
                  )
              )
          )
      );
$function$;
