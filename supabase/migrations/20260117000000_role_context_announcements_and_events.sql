-- Add created_by_role to announcements and events tables to scope items per role context
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_by_role text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by_role text;

-- Backfill existing rows based on first active user_role of created_by
UPDATE public.announcements a
SET created_by_role = COALESCE(
    (
        SELECT r.code
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = a.created_by
          AND ur.deleted_at IS NULL
          AND ur.revoked_at IS NULL
        ORDER BY ur.created_at ASC
        LIMIT 1
    ),
    'Admin'
)
WHERE a.created_by_role IS NULL;

UPDATE public.events e
SET created_by_role = COALESCE(
    (
        SELECT r.code
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE ur.user_id = e.created_by
          AND ur.deleted_at IS NULL
          AND ur.revoked_at IS NULL
        ORDER BY ur.created_at ASC
        LIMIT 1
    ),
    'Admin'
)
WHERE e.created_by_role IS NULL;

-- Update fn_create_announcement to accept p_role
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

    RETURN jsonb_build_object('success', true, 'message', 'Announcement created successfully.', 'id', v_announcement_id);
END;
$function$;

-- Update fn_create_event to accept p_role
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

    RETURN jsonb_build_object('success', true, 'message', 'Event created successfully.', 'id', v_event_id);
END;
$function$;

-- Update fn_list_announcements_json to support p_role
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
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_role IS NOT NULL AND p_role <> '' THEN
        v_where := v_where || format(' AND a.created_by_role = %L', p_role);
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(
            ' AND EXISTS (
                SELECT 1 FROM public.user_roles creator_ur
                JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
                WHERE creator_ur.user_id = a.created_by
                  AND creator_ur.deleted_at IS NULL
                  AND creator_ur.revoked_at IS NULL
                  AND viewer_ur.user_id = %L
                  AND viewer_ur.deleted_at IS NULL
                  AND viewer_ur.revoked_at IS NULL
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

-- Update fn_list_events_json to support p_role
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
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_role IS NOT NULL AND p_role <> '' THEN
        v_where := v_where || format(' AND e.created_by_role = %L', p_role);
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(
            ' AND EXISTS (
                SELECT 1 FROM public.user_roles creator_ur
                JOIN public.user_roles viewer_ur ON viewer_ur.role_id = creator_ur.role_id
                WHERE creator_ur.user_id = e.created_by
                  AND creator_ur.deleted_at IS NULL
                  AND creator_ur.revoked_at IS NULL
                  AND viewer_ur.user_id = %L
                  AND viewer_ur.deleted_at IS NULL
                  AND viewer_ur.revoked_at IS NULL
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
