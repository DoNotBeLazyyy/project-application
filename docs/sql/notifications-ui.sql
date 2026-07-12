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
            n.created_at,
            COUNT(*) OVER() AS total_count
        FROM public.notifications n
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'n.created_at DESC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_unread_notification_count()
    RETURNS integer
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_count INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RETURN 0;
    END IF;

    SELECT count(*) INTO v_count
    FROM public.notifications n
    WHERE n.user_id = v_uid
      AND n.is_read = false
      AND n.deleted_at IS NULL;

    RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_my_notifications_read(p_notification_ids uuid[] DEFAULT NULL::uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_updated INTEGER;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id = v_uid
      AND is_read = false
      AND deleted_at IS NULL
      AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids));

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'marked', v_updated);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_my_notifications_json(integer, integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_unread_notification_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_mark_my_notifications_read(uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_my_notifications_json(integer, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_unread_notification_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mark_my_notifications_read(uuid[]) TO authenticated;
