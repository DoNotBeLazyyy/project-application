CREATE OR REPLACE FUNCTION public.fn_mark_my_notifications_unread(p_notification_ids uuid[])
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

    IF p_notification_ids IS NULL OR array_length(p_notification_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No notification was selected.');
    END IF;

    UPDATE public.notifications
    SET is_read = false, read_at = NULL
    WHERE user_id = v_uid
      AND is_read = true
      AND deleted_at IS NULL
      AND id = ANY(p_notification_ids);

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'marked', v_updated);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_mark_my_notifications_unread(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_mark_my_notifications_unread(uuid[]) TO authenticated;