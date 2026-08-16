CREATE OR REPLACE FUNCTION public.fn_emit_event_notifications(p_event_id uuid, p_audience public.announcement_audience_type, p_section_ids uuid[], p_title text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, action_url)
    SELECT
        r.uid,
        'New event',
        p_title,
        '/event-management/' || p_event_id::text
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
    INSERT INTO public.notifications (user_id, title, message, action_url)
    SELECT
        r.uid,
        'New announcement',
        p_title,
        '/announcement-management/' || p_announcement_id::text
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$$;

UPDATE public.notifications
SET action_url = '/event-management/' || substring(action_url FROM '^/events/(.*)$')
WHERE action_url ~ '^/events/';

UPDATE public.notifications
SET action_url = '/announcement-management/' || substring(action_url FROM '^/announcements/(.*)$')
WHERE action_url ~ '^/announcements/';