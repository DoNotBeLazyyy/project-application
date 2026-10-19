-- Migration: 20261019040000_scoping_announcement_and_event_management_by_role.sql
-- Description: Scope announcement and event management queries by role.
-- Admin sees all. Faculty only sees their own or taught sections.
-- Dean/Registrar only see items created by themselves or colleagues within their office.
-- Global audience announcements are not mixed into management CRUD tables for non-admins
-- (they remain accessible via fn_list_my_announcements_feed / audience view).

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
        -- Faculty management view only sees own posts or sections they teach
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
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
        -- Dean / Registrar management view: only manage what was created by themselves or by someone in their office
        v_where := v_where || format(
            ' AND (
                a.created_by = %L
                OR (a.created_by_role = %L AND a.target_audience <> ''Section'')
            )',
            auth.uid(), p_role
        );
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(' AND a.created_by = %L', auth.uid());
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
        -- Faculty management view only sees own events or sections they teach
        v_where := v_where || format(
            ' AND (
                e.created_by = %L
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
        -- Dean / Registrar management view: only manage what was created by themselves or by someone in their office
        v_where := v_where || format(
            ' AND (
                e.created_by = %L
                OR (e.created_by_role = %L AND e.target_audience <> ''Section'')
            )',
            auth.uid(), p_role
        );
    ELSIF p_mine_only THEN
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
    ELSE
        v_where := v_where || format(' AND e.created_by = %L', auth.uid());
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

GRANT EXECUTE ON FUNCTION public.fn_list_announcements_json(integer, integer, text, jsonb, text, boolean, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_list_events_json(integer, integer, text, jsonb, text, boolean, boolean, text) TO authenticated, service_role;
