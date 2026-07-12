CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    target_audience public.announcement_audience_type NOT NULL DEFAULT 'Global',
    section_id UUID REFERENCES public.sections (id) ON DELETE RESTRICT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_events_range CHECK (end_at IS NULL OR end_at >= start_at)
);

CREATE INDEX IF NOT EXISTS idx_events_start_at
    ON public.events (start_at)
    WHERE deleted_at IS NULL;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_events_updated_audit ON public.events;
CREATE TRIGGER trg_events_updated_audit
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "events_select" ON public.events;
CREATE POLICY "events_select"
    ON public.events
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "events_insert" ON public.events;
CREATE POLICY "events_insert"
    ON public.events
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "events_update" ON public.events;
CREATE POLICY "events_update"
    ON public.events
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

CREATE TABLE IF NOT EXISTS public.event_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES public.sections (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_event_sections_pair
    ON public.event_sections (event_id, section_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_event_sections_section
    ON public.event_sections (section_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.event_sections ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_event_sections_updated_audit ON public.event_sections;
CREATE TRIGGER trg_event_sections_updated_audit
    BEFORE UPDATE ON public.event_sections
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "event_sections_select" ON public.event_sections;
CREATE POLICY "event_sections_select"
    ON public.event_sections
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "event_sections_insert" ON public.event_sections;
CREATE POLICY "event_sections_insert"
    ON public.event_sections
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "event_sections_update" ON public.event_sections;
CREATE POLICY "event_sections_update"
    ON public.event_sections
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

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
        '/events/' || p_event_id::text
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_events_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_audience text DEFAULT NULL::text, p_upcoming_only boolean DEFAULT false, p_mine_only boolean DEFAULT true)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_mine_only THEN
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
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.event_sections esx
                WHERE esx.event_id = e.id AND esx.deleted_at IS NULL
            ) AS section_count,
            COUNT(*) OVER() AS total_count
        FROM public.events e
        LEFT JOIN public.users u ON u.id = e.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.start_at ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_event_by_id(p_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
        )
    )
    INTO v_result
    FROM public.events e
    LEFT JOIN public.users u ON u.id = e.created_by
    WHERE e.id = p_id
      AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_my_events_feed(p_from timestamptz, p_to timestamptz)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
            e.all_day
        FROM public.events e
        WHERE e.deleted_at IS NULL
          AND e.start_at < p_to
          AND (COALESCE(e.end_at, e.start_at) >= p_from)
          AND (
                e.target_audience = 'Global'
                OR (e.target_audience IN ('Faculty', 'Student')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = v_uid AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = e.target_audience::text
                    ))
                OR (e.target_audience = 'Section'
                    AND EXISTS (
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
                    ))
          )
    ) t;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_event(p_title text, p_start_at timestamptz, p_audience public.announcement_audience_type, p_end_at timestamptz DEFAULT NULL::timestamptz, p_all_day boolean DEFAULT false, p_location text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_section_ids uuid[] DEFAULT NULL::uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_id UUID;
    v_section_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event title is required.');
    END IF;

    IF p_start_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event start date is required.');
    END IF;

    IF p_end_at IS NOT NULL AND p_end_at < p_start_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date cannot be before the start date.');
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    INSERT INTO public.events (title, description, location, target_audience, section_id, start_at, end_at, all_day)
    VALUES (
        btrim(p_title),
        NULLIF(btrim(p_description), ''),
        NULLIF(btrim(p_location), ''),
        p_audience,
        CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        p_start_at,
        p_end_at,
        COALESCE(p_all_day, false)
    )
    RETURNING id INTO v_id;

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.event_sections (event_id, section_id)
            VALUES (v_id, v_section_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    PERFORM public.fn_emit_event_notifications(v_id, p_audience, p_section_ids, btrim(p_title));

    RETURN jsonb_build_object('success', true, 'message', 'Event created.', 'id', v_id);

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_event(p_id uuid, p_title text, p_start_at timestamptz, p_audience public.announcement_audience_type, p_end_at timestamptz DEFAULT NULL::timestamptz, p_all_day boolean DEFAULT false, p_location text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_section_ids uuid[] DEFAULT NULL::uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_owner UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event title is required.');
    END IF;

    IF p_start_at IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event start date is required.');
    END IF;

    IF p_end_at IS NOT NULL AND p_end_at < p_start_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date cannot be before the start date.');
    END IF;

    SELECT created_by INTO v_owner
    FROM public.events
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only edit events you created.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    UPDATE public.events
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        location = NULLIF(btrim(p_location), ''),
        target_audience = p_audience,
        section_id = CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        start_at = p_start_at,
        end_at = p_end_at,
        all_day = COALESCE(p_all_day, false)
    WHERE id = p_id
      AND deleted_at IS NULL;

    UPDATE public.event_sections
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE event_id = p_id
      AND deleted_at IS NULL
      AND (p_audience <> 'Section' OR p_section_ids IS NULL OR NOT (section_id = ANY(p_section_ids)));

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.event_sections (event_id, section_id)
            VALUES (p_id, v_section_id)
            ON CONFLICT (event_id, section_id) WHERE deleted_at IS NULL DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Event updated.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_event(p_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_owner UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    SELECT created_by INTO v_owner
    FROM public.events
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Event not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only delete events you created.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.events
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.event_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE event_id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Event deleted.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_events(p_ids uuid[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_deleted INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No events were selected.');
    END IF;

    v_is_admin := public.fn_current_user_role_codes() && ARRAY['Admin'];

    IF NOT v_is_admin AND EXISTS (
        SELECT 1 FROM public.events
        WHERE id = ANY(p_ids) AND deleted_at IS NULL AND created_by <> auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete events you created.');
    END IF;

    UPDATE public.events
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.event_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE event_id = ANY(p_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s event(s).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_emit_event_notifications(uuid, public.announcement_audience_type, uuid[], text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_list_events_json(integer, integer, text, jsonb, text, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_event_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_my_events_feed(timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_event(text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_event(uuid, text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_event(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_delete_events(uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_events_json(integer, integer, text, jsonb, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_event_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_my_events_feed(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_event(text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_event(uuid, text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_events(uuid[]) TO authenticated;
