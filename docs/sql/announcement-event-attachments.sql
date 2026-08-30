CREATE TABLE IF NOT EXISTS public.announcement_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements (id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_announcement_attachments_announcement
    ON public.announcement_attachments (announcement_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_announcement_attachments_updated_audit ON public.announcement_attachments;
CREATE TRIGGER trg_announcement_attachments_updated_audit
    BEFORE UPDATE ON public.announcement_attachments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "announcement_attachments_select" ON public.announcement_attachments;
CREATE POLICY "announcement_attachments_select"
    ON public.announcement_attachments
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "announcement_attachments_insert" ON public.announcement_attachments;
CREATE POLICY "announcement_attachments_insert"
    ON public.announcement_attachments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "announcement_attachments_update" ON public.announcement_attachments;
CREATE POLICY "announcement_attachments_update"
    ON public.announcement_attachments
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

CREATE TABLE IF NOT EXISTS public.event_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_event_attachments_event
    ON public.event_attachments (event_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_event_attachments_updated_audit ON public.event_attachments;
CREATE TRIGGER trg_event_attachments_updated_audit
    BEFORE UPDATE ON public.event_attachments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "event_attachments_select" ON public.event_attachments;
CREATE POLICY "event_attachments_select"
    ON public.event_attachments
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "event_attachments_insert" ON public.event_attachments;
CREATE POLICY "event_attachments_insert"
    ON public.event_attachments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "event_attachments_update" ON public.event_attachments;
CREATE POLICY "event_attachments_update"
    ON public.event_attachments
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

CREATE OR REPLACE FUNCTION public.fn_insert_announcement_attachments(p_announcement_id uuid, p_attachments jsonb)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.announcement_attachments (announcement_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_announcement_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_insert_event_attachments(p_event_id uuid, p_attachments jsonb)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.event_attachments (event_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_event_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_create_announcement(text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.fn_create_announcement(text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz, jsonb);

CREATE OR REPLACE FUNCTION public.fn_create_announcement(
    p_title text,
    p_content text,
    p_audience public.announcement_audience_type,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_is_pinned boolean DEFAULT false,
    p_published_at timestamptz DEFAULT now(),
    p_expires_at timestamptz DEFAULT NULL::timestamptz,
    p_attachments jsonb DEFAULT NULL::jsonb
)
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
        RETURN jsonb_build_object('success', false, 'message', 'Announcement title is required.');
    END IF;

    IF p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement content is required.');
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    INSERT INTO public.announcements (title, content, target_audience, section_id, is_pinned, published_at, expires_at)
    VALUES (
        btrim(p_title),
        btrim(p_content),
        p_audience,
        CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        COALESCE(p_is_pinned, false),
        p_published_at,
        p_expires_at
    )
    RETURNING id INTO v_id;

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.announcement_sections (announcement_id, section_id)
            VALUES (v_id, v_section_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    PERFORM public.fn_insert_announcement_attachments(v_id, p_attachments);

    IF p_published_at IS NULL OR p_published_at <= now() THEN
        PERFORM public.fn_emit_announcement_notifications(v_id, p_audience, p_section_ids, btrim(p_title));
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement posted.', 'id', v_id);

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_announcement(uuid, text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.fn_update_announcement(uuid, text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz, jsonb);

CREATE OR REPLACE FUNCTION public.fn_update_announcement(
    p_id uuid,
    p_title text,
    p_content text,
    p_audience public.announcement_audience_type,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_is_pinned boolean DEFAULT false,
    p_published_at timestamptz DEFAULT NULL::timestamptz,
    p_expires_at timestamptz DEFAULT NULL::timestamptz,
    p_attachments jsonb DEFAULT NULL::jsonb
)
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
        RETURN jsonb_build_object('success', false, 'message', 'Announcement title is required.');
    END IF;

    IF p_content IS NULL OR btrim(p_content) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement content is required.');
    END IF;

    SELECT created_by INTO v_owner
    FROM public.announcements
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only edit announcements you posted.'
            USING ERRCODE = '42501';
    END IF;

    PERFORM public.fn_assert_announcement_sections(p_audience, p_section_ids);

    UPDATE public.announcements
    SET title = btrim(p_title),
        content = btrim(p_content),
        target_audience = p_audience,
        section_id = CASE WHEN p_audience = 'Section' THEN p_section_ids[1] ELSE NULL END,
        is_pinned = COALESCE(p_is_pinned, false),
        published_at = p_published_at,
        expires_at = p_expires_at
    WHERE id = p_id
      AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE announcement_id = p_id
      AND deleted_at IS NULL
      AND (p_audience <> 'Section' OR p_section_ids IS NULL OR NOT (section_id = ANY(p_section_ids)));

    IF p_audience = 'Section' AND p_section_ids IS NOT NULL THEN
        FOREACH v_section_id IN ARRAY p_section_ids
        LOOP
            INSERT INTO public.announcement_sections (announcement_id, section_id)
            VALUES (p_id, v_section_id)
            ON CONFLICT (announcement_id, section_id) WHERE deleted_at IS NULL DO NOTHING;
        END LOOP;
    END IF;

    UPDATE public.announcement_attachments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE announcement_id = p_id
      AND deleted_at IS NULL;

    PERFORM public.fn_insert_announcement_attachments(p_id, p_attachments);

    RETURN jsonb_build_object('success', true, 'message', 'Announcement updated.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_announcement_by_id(p_id uuid)
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
        'id', a.id,
        'title', a.title,
        'content', a.content,
        'target_audience', a.target_audience,
        'is_pinned', a.is_pinned,
        'published_at', a.published_at,
        'expires_at', a.expires_at,
        'created_at', a.created_at,
        'created_by', a.created_by,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'section_ids', COALESCE(
            (
                SELECT jsonb_agg(asx.section_id ORDER BY asx.created_at)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'sections', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object('id', s.id, 'code', s.section_code, 'course_code', c.code)
                    ORDER BY s.section_code
                )
                FROM public.announcement_sections asx
                JOIN public.sections s ON s.id = asx.section_id AND s.deleted_at IS NULL
                LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'attachments', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', aa.id,
                        'file_name', aa.file_name,
                        'file_path', aa.file_path,
                        'mime_type', aa.mime_type,
                        'file_size', aa.file_size
                    )
                    ORDER BY aa.created_at
                )
                FROM public.announcement_attachments aa
                WHERE aa.announcement_id = a.id AND aa.deleted_at IS NULL
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.announcements a
    LEFT JOIN public.users u ON u.id = a.created_by
    WHERE a.id = p_id
      AND a.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_create_event(text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[]);
DROP FUNCTION IF EXISTS public.fn_create_event(text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[], jsonb);

CREATE OR REPLACE FUNCTION public.fn_create_event(
    p_title text,
    p_start_at timestamptz,
    p_audience public.announcement_audience_type,
    p_end_at timestamptz DEFAULT NULL::timestamptz,
    p_all_day boolean DEFAULT false,
    p_location text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_attachments jsonb DEFAULT NULL::jsonb
)
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

    PERFORM public.fn_insert_event_attachments(v_id, p_attachments);

    PERFORM public.fn_emit_event_notifications(v_id, p_audience, p_section_ids, btrim(p_title));

    RETURN jsonb_build_object('success', true, 'message', 'Event created.', 'id', v_id);

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_event(uuid, text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[]);
DROP FUNCTION IF EXISTS public.fn_update_event(uuid, text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[], jsonb);

CREATE OR REPLACE FUNCTION public.fn_update_event(
    p_id uuid,
    p_title text,
    p_start_at timestamptz,
    p_audience public.announcement_audience_type,
    p_end_at timestamptz DEFAULT NULL::timestamptz,
    p_all_day boolean DEFAULT false,
    p_location text DEFAULT NULL::text,
    p_description text DEFAULT NULL::text,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_attachments jsonb DEFAULT NULL::jsonb
)
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

    UPDATE public.event_attachments
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE event_id = p_id
      AND deleted_at IS NULL;

    PERFORM public.fn_insert_event_attachments(p_id, p_attachments);

    RETURN jsonb_build_object('success', true, 'message', 'Event updated.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
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
        ),
        'attachments', COALESCE(
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

GRANT EXECUTE ON FUNCTION public.fn_get_announcement_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_announcement(text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_announcement(uuid, text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_event_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_event(text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_event(uuid, text, timestamptz, public.announcement_audience_type, timestamptz, boolean, text, text, uuid[], jsonb) TO authenticated;

