-- ====================================================================
-- Migration: 20261121400005_announcements_events_discussions.sql
-- Announcements, events, discussions and modules (audit 2026-11-21):
--   * #63 fn_list_my_announcements_feed: an announcement is shown through the end of its
--     expiry day in Manila (stored dates are midnight UTC = 8:00 AM Manila).
--   * T2 fn_list_my_events_feed: an all-day event counts until the end of its last Manila
--     day, so today's all-day events stay on dashboards (the page now asks from the start of
--     today).
--   * T4 fn_update_announcement / fn_update_event: people a change newly reaches (a new
--     audience or new sections) get the same notification as on create; nobody else is
--     notified again.
--   * T4 fn_set_post_answer / fn_delete_post: unmarking or deleting the accepted answer sets
--     the thread back to unresolved.
--   * T4 fn_duplicate_module_to_sections: copied materials keep their published flag.
-- Bodies are the live definitions with only these edits. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_list_my_announcements_feed(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_role text DEFAULT NULL::text)
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
           AND (a.expires_at IS NULL OR (a.expires_at AT TIME ZONE ''Asia/Manila'')::date >= (now() AT TIME ZONE ''Asia/Manila'')::date)'
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
        -- Faculty members see Global and Faculty announcements, or Section announcements
        -- for sections they personally teach (never other professors' sections)
        v_where := v_where || format(
            ' AND (
                a.target_audience IN (''Global'', ''Faculty'')
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
            v_uid, v_uid
        );
    ELSIF p_role IN ('Dean', 'Registrar', 'Admin') THEN
        -- Staff audience feeds: only Global and Faculty communications.
        -- Student-only announcements (target_audience = 'Student') are strictly excluded from staff feeds,
        -- even if authored by a Dean or staff colleague.
        v_where := v_where || ' AND a.target_audience IN (''Global'', ''Faculty'')';
    ELSE
        -- Fallback when p_role is omitted: determine audience from user credentials
        v_where := v_where || format(
            ' AND (
                a.target_audience = ''Global''
                OR (
                    a.target_audience = ''Faculty''
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code IN (''Faculty'', ''Dean'', ''Registrar'', ''Admin'')
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
                                    WHERE e.section_id = a.section_id
                                      AND e.status = ''Enrolled''
                                      AND e.deleted_at IS NULL
                                      AND st.user_id = %L
                                )
                                OR EXISTS (
                                    SELECT 1 FROM public.sections s
                                    WHERE s.id = a.section_id
                                      AND s.faculty_id = %L
                                      AND s.deleted_at IS NULL
                                )
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

CREATE OR REPLACE FUNCTION public.fn_list_my_events_feed(p_from timestamp with time zone, p_to timestamp with time zone, p_role text DEFAULT NULL::text)
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
          AND (
              COALESCE(e.end_at, e.start_at) >= p_from
              -- An all-day event lasts until the end of its last day in Manila
              OR (e.all_day AND (COALESCE(e.end_at, e.start_at) AT TIME ZONE 'Asia/Manila')::date >= (p_from AT TIME ZONE 'Asia/Manila')::date)
          )
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
                      e.target_audience IN ('Global', 'Faculty')
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
                  WHEN p_role IN ('Dean', 'Registrar', 'Admin') THEN
                      e.target_audience IN ('Global', 'Faculty')
                  ELSE
                      e.target_audience = 'Global'
                      OR (
                          e.target_audience = 'Faculty'
                          AND EXISTS (
                              SELECT 1 FROM public.user_roles ur
                              JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                              WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                                AND r.code IN ('Faculty', 'Dean', 'Registrar', 'Admin')
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

CREATE OR REPLACE FUNCTION public.fn_update_announcement(p_id uuid, p_title text, p_content text, p_audience announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[], p_is_pinned boolean DEFAULT false, p_published_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_attachments jsonb DEFAULT NULL::jsonb)
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
    v_old_section_ids UUID[];
    v_old_recipients UUID[];
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

    -- Who the item reached before this edit, so only people it newly reaches are notified
    SELECT array_agg(DISTINCT x.section_id)
    INTO v_old_section_ids
    FROM (
        SELECT ls.section_id FROM public.announcement_sections ls
        WHERE ls.announcement_id = p_id AND ls.deleted_at IS NULL
        UNION
        SELECT it.section_id FROM public.announcements it
        WHERE it.id = p_id AND it.section_id IS NOT NULL
    ) x;

    SELECT COALESCE(array_agg(DISTINCT r.uid), '{}'::UUID[])
    INTO v_old_recipients
    FROM public.fn_resolve_audience(v_existing_audience, v_old_section_ids) AS r(uid);

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

    -- A newly added audience is told about the item, like on create; the original audience
    -- was notified when it was posted
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New Announcement',
        btrim(p_title),
        '/announcements/' || p_id::text,
        'Announcement'::public.notification_category_type
    FROM (
        SELECT DISTINCT r0.uid FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r0(uid)
    ) r
    WHERE NOT (r.uid = ANY (v_old_recipients))
      AND (auth.uid() IS NULL OR r.uid <> auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Announcement updated successfully.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_update_event(p_id uuid, p_title text, p_start_at timestamp with time zone, p_audience announcement_audience_type, p_end_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_all_day boolean DEFAULT false, p_location text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_section_ids uuid[] DEFAULT NULL::uuid[], p_attachments jsonb DEFAULT NULL::jsonb)
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
    v_old_section_ids UUID[];
    v_old_recipients UUID[];
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

    -- Who the item reached before this edit, so only people it newly reaches are notified
    SELECT array_agg(DISTINCT x.section_id)
    INTO v_old_section_ids
    FROM (
        SELECT ls.section_id FROM public.event_sections ls
        WHERE ls.event_id = p_id AND ls.deleted_at IS NULL
        UNION
        SELECT it.section_id FROM public.events it
        WHERE it.id = p_id AND it.section_id IS NOT NULL
    ) x;

    SELECT COALESCE(array_agg(DISTINCT r.uid), '{}'::UUID[])
    INTO v_old_recipients
    FROM public.fn_resolve_audience(v_existing_audience, v_old_section_ids) AS r(uid);

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

    -- A newly added audience is told about the item, like on create; the original audience
    -- was notified when it was posted
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New Event',
        btrim(p_title),
        '/events/' || p_id::text,
        'Event'::public.notification_category_type
    FROM (
        SELECT DISTINCT r0.uid FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r0(uid)
    ) r
    WHERE NOT (r.uid = ANY (v_old_recipients))
      AND (auth.uid() IS NULL OR r.uid <> auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Event updated successfully.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_set_post_answer(p_post_id uuid, p_is_answer boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_thread_author UUID;
    v_thread_id UUID;
    v_was_answer BOOLEAN;
BEGIN
    SELECT t.section_id, t.created_by, t.id, p.is_answer INTO v_section_id, v_thread_author, v_thread_id, v_was_answer
    FROM public.discussion_posts p
    JOIN public.discussion_threads t ON t.id = p.thread_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found.');
    END IF;

    IF v_thread_author <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can mark an answer.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_posts
    SET is_answer = false
    WHERE thread_id = v_thread_id AND deleted_at IS NULL;

    IF COALESCE(p_is_answer, false) THEN
        UPDATE public.discussion_posts
        SET is_answer = true
        WHERE id = p_post_id AND deleted_at IS NULL;

        UPDATE public.discussion_threads
        SET is_resolved = true
        WHERE id = v_thread_id AND deleted_at IS NULL;
    END IF;

    -- Unmarking the accepted answer reopens the thread
    IF NOT COALESCE(p_is_answer, false) AND COALESCE(v_was_answer, false) THEN
        UPDATE public.discussion_threads
        SET is_resolved = false
        WHERE id = v_thread_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Answer updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_delete_post(p_post_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
    v_thread_id UUID;
    v_was_answer BOOLEAN;
BEGIN
    SELECT t.section_id, p.created_by, t.id, p.is_answer INTO v_section_id, v_author_id, v_thread_id, v_was_answer
    FROM public.discussion_posts p
    JOIN public.discussion_threads t ON t.id = p.thread_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can delete this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE post_id = p_post_id AND deleted_at IS NULL;

    UPDATE public.discussion_posts
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_post_id AND deleted_at IS NULL;

    -- Deleting the accepted answer reopens the thread
    IF COALESCE(v_was_answer, false) THEN
        UPDATE public.discussion_threads
        SET is_resolved = false
        WHERE id = v_thread_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Reply deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_duplicate_module_to_sections(p_module_id uuid, p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_src           public.modules%ROWTYPE;
    v_target_id     UUID;
    v_new_module_id UUID;
    v_sequence      SMALLINT;
    v_copied        INTEGER := 0;
    v_skipped       INTEGER := 0;
    v_message       TEXT;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT * INTO v_src
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_src.section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target_id IN ARRAY p_section_ids
    LOOP
        IF v_target_id = v_src.section_id THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target_id) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach one of the selected sections.'
                USING ERRCODE = '42501';
        END IF;

        -- Running the copy twice must not make a second copy
        IF EXISTS (
            SELECT 1 FROM public.modules t
            WHERE t.section_id = v_target_id
              AND t.deleted_at IS NULL
              AND lower(btrim(t.title)) = lower(btrim(v_src.title))
        ) THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
        FROM public.modules
        WHERE section_id = v_target_id AND deleted_at IS NULL;

        INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
        VALUES (v_target_id, v_src.title, v_src.description, v_sequence, false, NULL)
        RETURNING id INTO v_new_module_id;

        INSERT INTO public.course_materials (
            module_id, title, description, material_type,
            file_url, external_url, file_name, mime_type, file_size_bytes,
            sequence, is_published, available_from, available_until
        )
        SELECT
            v_new_module_id, cm.title, cm.description, cm.material_type,
            cm.file_url, cm.external_url, cm.file_name, cm.mime_type, cm.file_size_bytes,
            -- Materials keep their own published flag; the copied module itself starts as a draft
            cm.sequence, cm.is_published, cm.available_from, cm.available_until
        FROM public.course_materials cm
        WHERE cm.module_id = p_module_id
          AND cm.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    v_message := format('Module copied to %s section(s) as an unpublished draft.', v_copied);

    IF v_skipped > 0 THEN
        v_message := v_message || format(' %s section(s) were skipped because they already have a module named "%s".', v_skipped, v_src.title);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_message,
        'copied_count', v_copied,
        'skipped_count', v_skipped
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

COMMIT;
