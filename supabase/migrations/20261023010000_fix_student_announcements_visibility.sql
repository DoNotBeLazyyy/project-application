-- Migration: 20261023010000_fix_student_announcements_visibility.sql
-- Description: Fix announcement and event visibility for Student audience.
-- Previously, target_audience = 'Student' was gated behind an active section enrollment requirement,
-- causing students to be unable to see institutional/general Student announcements and events.

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
        -- Students see campus Global and Student announcements, and Section announcements
        -- only when actively enrolled in that specific section.
        v_where := v_where || format(
            ' AND (
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
            v_uid, v_uid
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
                OR a.target_audience = ''Global''
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
                    AND (
                        EXISTS (
                            SELECT 1 FROM public.user_roles ur
                            JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                            WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                              AND r.code = ''Student''
                        )
                        OR EXISTS (
                            SELECT 1 FROM public.students st
                            WHERE st.user_id = %L AND st.deleted_at IS NULL
                        )
                    )
                )
                OR (
                    a.target_audience = ''Section''
                    AND (
                        EXISTS (
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
                        OR (
                            a.section_id IS NOT NULL
                            AND (
                                EXISTS (
                                    SELECT 1 FROM public.enrollments e
                                    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                                    WHERE st.user_id = %L AND e.section_id = a.section_id
                                      AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                                )
                                OR EXISTS (
                                    SELECT 1 FROM public.sections s
                                    WHERE s.id = a.section_id AND s.faculty_id = %L AND s.deleted_at IS NULL
                                )
                            )
                        )
                    )
                )
            )',
            v_uid, v_uid, v_uid, v_uid, v_uid, v_uid, v_uid, v_uid
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

GRANT EXECUTE ON FUNCTION public.fn_list_my_announcements_feed(integer, integer, text, text) TO authenticated, service_role;

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
                      OR e.target_audience = 'Global'
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
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.user_roles ur
                                  JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                                  WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                    AND r.code = 'Student'
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.students st
                                  WHERE st.user_id = v_uid AND st.deleted_at IS NULL
                              )
                          )
                      )
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
                                            WHERE st.user_id = v_uid AND en.section_id = esx.section_id
                                              AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                                        )
                                        OR EXISTS (
                                            SELECT 1 FROM public.sections s
                                            WHERE s.id = esx.section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
                                        )
                                    )
                              )
                              OR (
                                  e.section_id IS NOT NULL
                                  AND (
                                      EXISTS (
                                          SELECT 1 FROM public.enrollments en
                                          JOIN public.students st ON st.id = en.student_id AND st.deleted_at IS NULL
                                          WHERE st.user_id = v_uid AND en.section_id = e.section_id
                                            AND en.status = 'Enrolled' AND en.deleted_at IS NULL
                                      )
                                      OR EXISTS (
                                          SELECT 1 FROM public.sections s
                                          WHERE s.id = e.section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
                                      )
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

GRANT EXECUTE ON FUNCTION public.fn_list_my_events_feed(timestamp with time zone, timestamp with time zone, text) TO authenticated, service_role;

-- 3. fn_resolve_audience
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
          p_audience = 'Global'
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
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.user_roles ur
                      INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                      WHERE ur.user_id = u.id
                        AND ur.deleted_at IS NULL
                        AND ur.revoked_at IS NULL
                        AND r.code = 'Student'
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.students st
                      WHERE st.user_id = u.id
                        AND st.deleted_at IS NULL
                  )
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

GRANT EXECUTE ON FUNCTION public.fn_resolve_audience(announcement_audience_type, uuid[]) TO authenticated, service_role;

-- 4. fn_get_announcement_by_id
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
                      a.target_audience = 'Faculty'
                      AND EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                          WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                            AND r.code = 'Faculty'
                      )
                  )
                  OR (
                      a.target_audience = 'Student'
                      AND (
                          EXISTS (
                              SELECT 1 FROM public.user_roles ur
                              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                              WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                AND r.code = 'Student'
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.students st
                              WHERE st.user_id = auth.uid() AND st.deleted_at IS NULL
                          )
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
        RAISE EXCEPTION 'Announcement not found or access denied.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_announcement_by_id(uuid) TO authenticated, service_role;

-- 5. fn_get_event_by_id
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
                      e.target_audience = 'Faculty'
                      AND EXISTS (
                          SELECT 1 FROM public.user_roles ur
                          JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                          WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                            AND r.code = 'Faculty'
                      )
                  )
                  OR (
                      e.target_audience = 'Student'
                      AND (
                          EXISTS (
                              SELECT 1 FROM public.user_roles ur
                              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                              WHERE ur.user_id = auth.uid() AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                AND r.code = 'Student'
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.students st
                              WHERE st.user_id = auth.uid() AND st.deleted_at IS NULL
                          )
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
        RAISE EXCEPTION 'Event not found or access denied.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_event_by_id(uuid) TO authenticated, service_role;
