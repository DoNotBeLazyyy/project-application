CREATE TABLE IF NOT EXISTS public.announcement_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements (id) ON DELETE RESTRICT,
    section_id UUID NOT NULL REFERENCES public.sections (id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_announcement_sections_pair
    ON public.announcement_sections (announcement_id, section_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_announcement_sections_section
    ON public.announcement_sections (section_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.announcement_sections ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_announcement_sections_updated_audit ON public.announcement_sections;
CREATE TRIGGER trg_announcement_sections_updated_audit
    BEFORE UPDATE ON public.announcement_sections
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "announcement_sections_select" ON public.announcement_sections;
CREATE POLICY "announcement_sections_select"
    ON public.announcement_sections
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "announcement_sections_insert" ON public.announcement_sections;
CREATE POLICY "announcement_sections_insert"
    ON public.announcement_sections
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "announcement_sections_update" ON public.announcement_sections;
CREATE POLICY "announcement_sections_update"
    ON public.announcement_sections
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select"
    ON public.announcements
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
CREATE POLICY "announcements_insert"
    ON public.announcements
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
CREATE POLICY "announcements_update"
    ON public.announcements
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar', 'Faculty']);

CREATE OR REPLACE FUNCTION public.fn_assert_announcement_sections(p_audience public.announcement_audience_type, p_section_ids uuid[])
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_is_faculty_only BOOLEAN;
    v_taught INTEGER;
BEGIN
    v_is_faculty_only := NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']);

    IF p_audience = 'Section' THEN
        IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
            RAISE EXCEPTION 'Select at least one section for a section-targeted announcement.'
                USING ERRCODE = '22023';
        END IF;

        IF v_is_faculty_only THEN
            SELECT count(*) INTO v_taught
            FROM public.sections s
            WHERE s.id = ANY(p_section_ids)
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL;

            IF v_taught <> array_length(p_section_ids, 1) THEN
                RAISE EXCEPTION 'You may only post to sections you teach.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    ELSIF v_is_faculty_only THEN
        RAISE EXCEPTION 'Faculty may only post section-targeted announcements.'
            USING ERRCODE = '42501';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_announcement_section_options()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
    v_is_staff BOOLEAN;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar'];

    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.label), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT
            s.id,
            s.section_code,
            trim(concat(c.code, ' - ', s.section_code)) AS label
        FROM public.sections s
        LEFT JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
          AND (v_is_staff OR s.faculty_id = auth.uid())
    ) t;

    RETURN v_result;
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
        '/announcements/' || p_announcement_id::text
    FROM public.fn_resolve_audience(p_audience, p_section_ids) AS r(uid)
    WHERE r.uid <> auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_announcements_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_audience text DEFAULT NULL::text, p_is_pinned boolean DEFAULT NULL::boolean, p_mine_only boolean DEFAULT true)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE a.deleted_at IS NULL';
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_mine_only THEN
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
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.announcement_sections asx
                WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
            ) AS section_count,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'a.is_pinned DESC, a.created_at DESC');
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

CREATE OR REPLACE FUNCTION public.fn_list_my_announcements_feed(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text)
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

    v_where := format(
        'WHERE a.deleted_at IS NULL
           AND (a.published_at IS NULL OR a.published_at <= now())
           AND (a.expires_at IS NULL OR a.expires_at > now())
           AND (
                a.target_audience = ''Global''
                OR (a.target_audience IN (''Faculty'', ''Student'')
                    AND EXISTS (
                        SELECT 1 FROM public.user_roles ur
                        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                        WHERE ur.user_id = %L AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
                          AND r.code = a.target_audience::text
                    ))
                OR (a.target_audience = ''Section''
                    AND EXISTS (
                        SELECT 1 FROM public.announcement_sections asx
                        WHERE asx.announcement_id = a.id AND asx.deleted_at IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1 FROM public.enrollments e
                                  JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                                  WHERE st.user_id = %L AND e.section_id = asx.section_id
                                    AND e.status = ''Enrolled'' AND e.deleted_at IS NULL
                              )
                              OR EXISTS (
                                  SELECT 1 FROM public.sections s
                                  WHERE s.id = asx.section_id AND s.faculty_id = %L AND s.deleted_at IS NULL
                              )
                          )
                    ))
           )',
        v_uid, v_uid, v_uid
    );

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (a.title ILIKE %L OR a.content ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.created_at,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_announcement(p_title text, p_content text, p_audience public.announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[], p_is_pinned boolean DEFAULT false, p_published_at timestamptz DEFAULT now(), p_expires_at timestamptz DEFAULT NULL::timestamptz)
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

CREATE OR REPLACE FUNCTION public.fn_update_announcement(p_id uuid, p_title text, p_content text, p_audience public.announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[], p_is_pinned boolean DEFAULT false, p_published_at timestamptz DEFAULT NULL::timestamptz, p_expires_at timestamptz DEFAULT NULL::timestamptz)
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

    RETURN jsonb_build_object('success', true, 'message', 'Announcement updated.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_announcement(p_id uuid)
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
    FROM public.announcements
    WHERE id = p_id AND deleted_at IS NULL;

    IF v_owner IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Announcement not found.');
    END IF;

    IF v_owner <> auth.uid() AND NOT (public.fn_current_user_role_codes() && ARRAY['Admin']) THEN
        RAISE EXCEPTION 'You may only delete announcements you posted.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id AND deleted_at IS NULL;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = p_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Announcement deleted.');

EXCEPTION
    WHEN insufficient_privilege THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_delete_announcements(p_ids uuid[])
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
        RETURN jsonb_build_object('success', false, 'message', 'No announcements were selected.');
    END IF;

    v_is_admin := public.fn_current_user_role_codes() && ARRAY['Admin'];

    IF NOT v_is_admin AND EXISTS (
        SELECT 1 FROM public.announcements
        WHERE id = ANY(p_ids) AND deleted_at IS NULL AND created_by <> auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You may only delete announcements you posted.');
    END IF;

    UPDATE public.announcements
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_ids) AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    UPDATE public.announcement_sections
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE announcement_id = ANY(p_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', format('Deleted %s announcement(s).', v_deleted));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_assert_announcement_sections(public.announcement_audience_type, uuid[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_get_announcement_section_options() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_announcement_section_options() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_emit_announcement_notifications(uuid, public.announcement_audience_type, uuid[], text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_list_announcements_json(integer, integer, text, jsonb, text, boolean, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_announcement_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_my_announcements_feed(integer, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_announcement(text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_announcement(uuid, text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_announcement(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_bulk_delete_announcements(uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_list_announcements_json(integer, integer, text, jsonb, text, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_announcement_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_my_announcements_feed(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_announcement(text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_announcement(uuid, text, text, public.announcement_audience_type, uuid[], boolean, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_announcement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bulk_delete_announcements(uuid[]) TO authenticated;
