-- ====================================================================
-- Migration: 20261106021000_convert_communication_item.sql
--   * fn_convert_communication_item (new): turns an announcement into an event, or an
--     event into an announcement, in one transaction. It creates the new item through
--     fn_create_announcement / fn_create_event (so the same checks apply), copies the
--     sections and attachments when the form did not send them, points the notifications
--     of the old item at the new one, and deletes the old item through
--     fn_delete_announcement / fn_delete_event. If any step fails, nothing is kept.
--     Before, the page created the new item and deleted the old one in two calls, so old
--     notification and calendar links broke, and a failure could leave both items.
--   Built on the latest fn_create_* (20261015000000) and fn_delete_* (20261016030000).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_convert_communication_item(
    p_id uuid,
    p_from_type text,
    p_payload jsonb,
    p_role text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_audience public.announcement_audience_type;
    v_section_ids uuid[];
    v_attachments jsonb;
    v_created jsonb;
    v_deleted jsonb;
    v_new_id uuid;
    v_old_url text;
    v_new_url text;
    v_new_title text;
    v_new_type public.notification_category_type;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_from_type NOT IN ('Announcement', 'Event') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only an announcement or an event can change type.');
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'message', 'The new item details are missing.');
    END IF;

    v_audience := COALESCE(NULLIF(p_payload->>'audience', ''), 'Global')::public.announcement_audience_type;

    -- Lock the original so two type changes cannot run on it at once
    IF p_from_type = 'Announcement' THEN
        PERFORM 1 FROM public.announcements WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
    ELSE
        PERFORM 1 FROM public.events WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'The item was not found. It may have been deleted.');
    END IF;

    -- Sections: use the form's list, or keep the original's
    IF v_audience = 'Section' THEN
        IF jsonb_typeof(p_payload->'section_ids') = 'array' AND jsonb_array_length(p_payload->'section_ids') > 0 THEN
            SELECT array_agg(value::uuid) INTO v_section_ids
            FROM jsonb_array_elements_text(p_payload->'section_ids');
        ELSIF p_from_type = 'Announcement' THEN
            SELECT array_agg(section_id) INTO v_section_ids
            FROM public.announcement_sections
            WHERE announcement_id = p_id AND deleted_at IS NULL;
        ELSE
            SELECT array_agg(section_id) INTO v_section_ids
            FROM public.event_sections
            WHERE event_id = p_id AND deleted_at IS NULL;
        END IF;
    END IF;

    -- Attachments: use the form's list (an empty list removes them), or keep the original's
    IF jsonb_typeof(p_payload->'attachments') = 'array' THEN
        v_attachments := p_payload->'attachments';
    ELSIF p_from_type = 'Announcement' THEN
        SELECT jsonb_agg(jsonb_build_object(
            'file_name', file_name, 'file_path', file_path, 'mime_type', mime_type, 'file_size', file_size
        )) INTO v_attachments
        FROM public.announcement_attachments
        WHERE announcement_id = p_id AND deleted_at IS NULL;
    ELSE
        SELECT jsonb_agg(jsonb_build_object(
            'file_name', file_name, 'file_path', file_path, 'mime_type', mime_type, 'file_size', file_size
        )) INTO v_attachments
        FROM public.event_attachments
        WHERE event_id = p_id AND deleted_at IS NULL;
    END IF;

    IF v_attachments IS NOT NULL AND jsonb_array_length(v_attachments) = 0 THEN
        v_attachments := NULL;
    END IF;

    IF p_from_type = 'Announcement' THEN
        v_created := public.fn_create_event(
            p_title       => p_payload->>'title',
            p_start_at    => NULLIF(p_payload->>'start_at', '')::timestamptz,
            p_audience    => v_audience,
            p_end_at      => NULLIF(p_payload->>'end_at', '')::timestamptz,
            p_all_day     => COALESCE((p_payload->>'all_day')::boolean, false),
            p_location    => NULLIF(p_payload->>'location', ''),
            p_description => NULLIF(p_payload->>'description', ''),
            p_section_ids => v_section_ids,
            p_attachments => v_attachments,
            p_role        => p_role
        );
        v_old_url := '/announcements/' || p_id::text;
        v_new_title := 'New Event';
        v_new_type := 'Event'::public.notification_category_type;
    ELSE
        v_created := public.fn_create_announcement(
            p_title       => p_payload->>'title',
            p_content     => p_payload->>'content',
            p_audience    => v_audience,
            p_section_ids => v_section_ids,
            p_is_pinned   => COALESCE((p_payload->>'is_pinned')::boolean, false),
            p_expires_at  => NULLIF(p_payload->>'expires_at', '')::timestamptz,
            p_attachments => v_attachments,
            p_role        => p_role
        );
        v_old_url := '/events/' || p_id::text;
        v_new_title := 'New Announcement';
        v_new_type := 'Announcement'::public.notification_category_type;
    END IF;

    -- A failed check (e.g. a missing title) returns its message and nothing was created
    IF COALESCE((v_created->>'success')::boolean, false) IS NOT TRUE THEN
        RETURN v_created;
    END IF;

    v_new_id := (v_created->>'id')::uuid;
    v_new_url := CASE WHEN p_from_type = 'Announcement'
        THEN '/events/' || v_new_id::text
        ELSE '/announcements/' || v_new_id::text
    END;

    -- People who were told about the old item keep that notification (and its read state);
    -- drop the copy the create just sent them, so nobody gets the same item twice
    UPDATE public.notifications fresh
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE fresh.action_url = v_new_url
      AND fresh.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM public.notifications old_n
          WHERE old_n.user_id = fresh.user_id
            AND old_n.deleted_at IS NULL
            AND old_n.action_url LIKE '%' || p_id::text || '%'
      );

    -- Point old notifications at the new item. Any link that carries the old id is updated,
    -- including ?announcementId= / ?eventId= style links.
    UPDATE public.notifications
    SET action_url = CASE
            WHEN action_url = v_old_url THEN v_new_url
            WHEN p_from_type = 'Announcement' THEN replace(replace(replace(action_url,
                'announcementId=' || p_id::text, 'eventId=' || v_new_id::text),
                '/announcements/' || p_id::text, '/events/' || v_new_id::text),
                p_id::text, v_new_id::text)
            ELSE replace(replace(replace(action_url,
                'eventId=' || p_id::text, 'announcementId=' || v_new_id::text),
                '/events/' || p_id::text, '/announcements/' || v_new_id::text),
                p_id::text, v_new_id::text)
        END,
        title = CASE WHEN title IN ('New Announcement', 'New Event') THEN v_new_title ELSE title END,
        notification_type = CASE
            WHEN notification_type IN ('Announcement'::public.notification_category_type, 'Event'::public.notification_category_type)
                THEN v_new_type
            ELSE notification_type
        END,
        message = CASE
            WHEN notification_type IN ('Announcement'::public.notification_category_type, 'Event'::public.notification_category_type)
                THEN COALESCE(NULLIF(btrim(p_payload->>'title'), ''), message)
            ELSE message
        END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE action_url LIKE '%' || p_id::text || '%'
      AND deleted_at IS NULL;

    -- Remove the original; a refusal raises and undoes everything above
    IF p_from_type = 'Announcement' THEN
        v_deleted := public.fn_delete_announcement(p_id);
    ELSE
        v_deleted := public.fn_delete_event(p_id);
    END IF;

    IF COALESCE((v_deleted->>'success')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION '%', COALESCE(v_deleted->>'message', 'The original item could not be removed, so the type was not changed.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN p_from_type = 'Announcement'
            THEN 'The announcement is now an event.'
            ELSE 'The event is now an announcement.'
        END,
        'id', v_new_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_convert_communication_item(uuid, text, jsonb, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_convert_communication_item(uuid, text, jsonb, text) FROM anon;

COMMIT;