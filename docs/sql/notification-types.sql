DO $$ BEGIN
    CREATE TYPE public.notification_category_type AS ENUM (
        'Announcement',
        'Event',
        'Assessment',
        'Grade',
        'Enrollment',
        'Clearance',
        'Attendance',
        'Account',
        'General'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS notification_type public.notification_category_type NOT NULL DEFAULT 'General';

UPDATE public.notifications
SET notification_type = 'Announcement'
WHERE notification_type = 'General'
  AND action_url ILIKE '%announcement%';

UPDATE public.notifications
SET notification_type = 'Event'
WHERE notification_type = 'General'
  AND action_url ILIKE '%event%';

CREATE OR REPLACE FUNCTION public.fn_emit_event_notifications(p_event_id uuid, p_audience public.announcement_audience_type, p_section_ids uuid[], p_title text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New event',
        p_title,
        '\event-management\' || p_event_id::text,
        'Event'
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_emit_announcement_notifications(p_announcement_id uuid, p_audience public.announcement_audience_type, p_section_ids uuid[], p_title text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        r.uid,
        'New announcement',
        p_title,
        '\announcement-management\' || p_announcement_id::text,
        'Announcement'
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_my_notifications_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_unread_only boolean DEFAULT false)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    v_where := format('WHERE n.deleted_at IS NULL AND n.user_id = %L', v_uid);

    IF p_unread_only THEN
        v_where := v_where || ' AND n.is_read = false';
    END IF;

    v_base_query := format(
        'SELECT
            n.id,
            n.title,
            n.message,
            n.is_read,
            n.read_at,
            n.action_url,
            n.notification_type,
            n.created_at,
            COUNT(*) OVER() AS total_count
        FROM public.notifications n
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'n.created_at DESC');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_my_notifications_json(integer, integer, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_my_notifications_json(integer, integer, boolean) TO authenticated;