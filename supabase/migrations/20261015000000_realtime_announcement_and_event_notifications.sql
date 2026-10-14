-- Migration: 20261015000000_realtime_announcement_and_event_notifications.sql
-- Description:
-- 1. Ensure realtime publications and replica identities for notifications, announcements, and events.
-- 2. Define canonical fn_emit_announcement_notifications and fn_emit_event_notifications to dispatch
--    in-app notifications exclusively to target audiences resolved via fn_resolve_audience.
-- 3. Update fn_create_announcement and fn_create_event to emit notifications upon creation.
-- 4. Update fn_delete_announcement, fn_bulk_delete_announcements, fn_delete_event, fn_bulk_delete_events
--    to soft-delete associated notifications in real-time.

-- 1. Replica Identity and Publication Setup
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'announcements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;
END $$;

-- 2. Emit announcement notifications to target audience only
CREATE OR REPLACE FUNCTION public.fn_emit_announcement_notifications(
    p_announcement_id uuid,
    p_audience announcement_audience_type,
    p_section_ids uuid[],
    p_title text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New Announcement',
        p_title,
        '/announcements/' || p_announcement_id::text,
        'Announcement'::public.notification_category_type
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE (auth.uid() IS NULL OR r.uid <> auth.uid());
END;
$function$;

-- 3. Emit event notifications to target audience only
CREATE OR REPLACE FUNCTION public.fn_emit_event_notifications(
    p_event_id uuid,
    p_audience announcement_audience_type,
    p_section_ids uuid[],
    p_title text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New Event',
        p_title,
        '/events/' || p_event_id::text,
        'Event'::public.notification_category_type
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE (auth.uid() IS NULL OR r.uid <> auth.uid());
END;
$function$;

-- 4. Update fn_create_announcement to emit notifications
CREATE OR REPLACE FUNCTION public.fn_create_announcement(
    p_title text,
    p_content text,
    p_audience announcement_audience_type,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_is_pinned boolean DEFAULT false,
    p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_attachments jsonb DEFAULT NULL::jsonb,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_announcement_id UUID;
    v_section_id UUID;
    v_att JSONB;
    v_role TEXT := p_role;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement title is required.');
    END IF;

    IF p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement content is required.');
    END IF;

    IF v_role IS NULL OR btrim(v_role) = '' THEN
        SELECT r.code INTO v_role
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND ur.revoked_at IS NULL
        ORDER BY ur.created_at ASC
        LIMIT 1;
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    INSERT INTO public.announcements (
        title, content, target_audience, section_id, is_pinned,
        published_at, expires_at, created_by, created_by_role
    )
    VALUES (
        btrim(p_title), btrim(p_content), p_audience,
        CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        COALESCE(p_is_pinned, false), now(), p_expires_at, auth.uid(), v_role
    )
    RETURNING id INTO v_announcement_id;

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids LOOP
            INSERT INTO public.announcement_sections (announcement_id, section_id, created_by)
            VALUES (v_announcement_id, v_section_id, auth.uid())
            ON CONFLICT (announcement_id, section_id) DO UPDATE
            SET deleted_at = NULL, deleted_by = NULL, updated_at = now(), updated_by = auth.uid();
        END LOOP;
    END IF;

    IF p_attachments IS NOT NULL AND jsonb_array_length(p_attachments) > 0 THEN
        FOR v_att IN SELECT * FROM jsonb_array_elements(p_attachments)
        LOOP
            INSERT INTO public.announcement_attachments (
                announcement_id, file_name, file_path, mime_type, file_size, created_by
            )
            VALUES (
                v_announcement_id,
                v_att->>'file_name',
                v_att->>'file_path',
                v_att->>'mime_type',
                (v_att->>'file_size')::BIGINT,
                auth.uid()
            );
        END LOOP;
    END IF;

    -- Dispatch targeted in-app notifications to resolved audience members
    PERFORM public.fn_emit_announcement_notifications(v_announcement_id, p_audience, p_section_ids, btrim(p_title));

    RETURN jsonb_build_object('success', true, 'message', 'Announcement created successfully.', 'id', v_announcement_id);
END;
$function$;

-- 5. Update fn_create_event to emit notifications
CREATE OR REPLACE FUNCTION public.fn_create_event(
    p_title text,
    p_start_at timestamp with time zone,
    p_audience announcement_audience_type,
    p_end_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_all_day boolean DEFAULT false,
    p_location text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_attachments jsonb DEFAULT NULL::jsonb,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_event_id UUID;
    v_section_id UUID;
    v_att JSONB;
    v_role TEXT := p_role;
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

    IF v_role IS NULL OR btrim(v_role) = '' THEN
        SELECT r.code INTO v_role
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = auth.uid()
          AND ur.deleted_at IS NULL
          AND ur.revoked_at IS NULL
        ORDER BY ur.created_at ASC
        LIMIT 1;
    END IF;

    PERFORM public.fn_assert_event_sections(p_audience, p_section_ids);

    INSERT INTO public.events (
        title, description, location, target_audience, section_id,
        start_at, end_at, all_day, created_by, created_by_role
    )
    VALUES (
        btrim(p_title), NULLIF(btrim(p_description), ''), NULLIF(btrim(p_location), ''),
        p_audience, CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        p_start_at, p_end_at, COALESCE(p_all_day, false), auth.uid(), v_role
    )
    RETURNING id INTO v_event_id;

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids LOOP
            INSERT INTO public.event_sections (event_id, section_id, created_by)
            VALUES (v_event_id, v_section_id, auth.uid())
            ON CONFLICT (event_id, section_id) DO UPDATE
            SET deleted_at = NULL, deleted_by = NULL, updated_at = now(), updated_by = auth.uid();
        END LOOP;
    END IF;

    IF p_attachments IS NOT NULL AND jsonb_array_length(p_attachments) > 0 THEN
        FOR v_att IN SELECT * FROM jsonb_array_elements(p_attachments)
        LOOP
            INSERT INTO public.event_attachments (
                event_id, file_name, file_path, mime_type, file_size, created_by
            )
            VALUES (
                v_event_id,
                v_att->>'file_name',
                v_att->>'file_path',
                v_att->>'mime_type',
                (v_att->>'file_size')::BIGINT,
                auth.uid()
            );
        END LOOP;
    END IF;

    -- Dispatch targeted in-app notifications to resolved audience members
    PERFORM public.fn_emit_event_notifications(v_event_id, p_audience, p_section_ids, btrim(p_title));

    RETURN jsonb_build_object('success', true, 'message', 'Event created successfully.', 'id', v_event_id);
END;
$function$;

-- 6. Update fn_delete_announcement and fn_bulk_delete_announcements to soft-delete related notifications
CREATE OR REPLACE FUNCTION public.fn_delete_announcement(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_owner UUID;
    v_created_by_role TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by, created_by_role INTO v_owner, v_created_by_role
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
             AND (r.code = 'Admin' OR (v_created_by_role IS NOT NULL AND r.code = v_created_by_role))
       )
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles creator_ur
           JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
           WHERE creator_ur.user_id = v_owner
             AND creator_ur.deleted_at IS NULL
             AND creator_ur.revoked_at IS NULL
             AND viewer_ur.user_id = auth.uid()
             AND viewer_ur.deleted_at IS NULL
             AND viewer_ur.revoked_at IS NULL
       ) THEN
        RAISE EXCEPTION 'You may only delete announcements created by your role.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = p_id AND deleted_at IS NULL;

    -- Soft-delete matching notifications so real-time badge updates immediately
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
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No announcements were selected.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.id = ANY(p_ids)
          AND a.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.user_roles creator_ur
              JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
              WHERE creator_ur.user_id = a.created_by
                AND creator_ur.deleted_at IS NULL
                AND creator_ur.revoked_at IS NULL
                AND viewer_ur.user_id = auth.uid()
                AND viewer_ur.deleted_at IS NULL
                AND viewer_ur.revoked_at IS NULL
          )
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete announcements created by your role.');
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = ANY(p_ids) AND deleted_at IS NULL;

    -- Soft-delete matching notifications
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

-- 7. Update fn_delete_event and fn_bulk_delete_events to soft-delete related notifications
CREATE OR REPLACE FUNCTION public.fn_delete_event(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_owner UUID;
    v_created_by_role TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by, created_by_role INTO v_owner, v_created_by_role
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
             AND (r.code = 'Admin' OR (v_created_by_role IS NOT NULL AND r.code = v_created_by_role))
       )
       AND NOT EXISTS (
           SELECT 1 FROM public.user_roles creator_ur
           JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
           WHERE creator_ur.user_id = v_owner
             AND creator_ur.deleted_at IS NULL
             AND creator_ur.revoked_at IS NULL
             AND viewer_ur.user_id = auth.uid()
             AND viewer_ur.deleted_at IS NULL
             AND viewer_ur.revoked_at IS NULL
       ) THEN
        RAISE EXCEPTION 'You may only delete events created by your role.'
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
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No events were selected.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = ANY(p_ids)
          AND e.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM public.user_roles creator_ur
              JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
              WHERE creator_ur.user_id = e.created_by
                AND creator_ur.deleted_at IS NULL
                AND creator_ur.revoked_at IS NULL
                AND viewer_ur.user_id = auth.uid()
                AND viewer_ur.deleted_at IS NULL
                AND viewer_ur.revoked_at IS NULL
          )
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete events created by your role.');
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
