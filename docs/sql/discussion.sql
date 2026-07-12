CREATE OR REPLACE FUNCTION public.fn_can_access_section(p_section_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id
          AND s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
    )
    OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_section_faculty(p_section_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id
          AND s.faculty_id = auth.uid()
          AND s.deleted_at IS NULL
    );
$$;

CREATE TABLE IF NOT EXISTS public.discussion_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.sections (id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_discussion_threads_section
    ON public.discussion_threads (section_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.discussion_threads ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_discussion_threads_updated_audit ON public.discussion_threads;
CREATE TRIGGER trg_discussion_threads_updated_audit
    BEFORE UPDATE ON public.discussion_threads
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "discussion_threads_select" ON public.discussion_threads;
CREATE POLICY "discussion_threads_select"
    ON public.discussion_threads
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND public.fn_can_access_section(section_id));

DROP POLICY IF EXISTS "discussion_threads_insert" ON public.discussion_threads;
CREATE POLICY "discussion_threads_insert"
    ON public.discussion_threads
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_can_access_section(section_id));

DROP POLICY IF EXISTS "discussion_threads_update" ON public.discussion_threads;
CREATE POLICY "discussion_threads_update"
    ON public.discussion_threads
    FOR UPDATE
    TO authenticated
    USING (public.fn_can_access_section(section_id))
    WITH CHECK (public.fn_can_access_section(section_id));

CREATE TABLE IF NOT EXISTS public.discussion_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.discussion_threads (id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    is_answer BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_thread
    ON public.discussion_posts (thread_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_discussion_posts_updated_audit ON public.discussion_posts;
CREATE TRIGGER trg_discussion_posts_updated_audit
    BEFORE UPDATE ON public.discussion_posts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "discussion_posts_select" ON public.discussion_posts;
CREATE POLICY "discussion_posts_select"
    ON public.discussion_posts
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id
              AND t.deleted_at IS NULL
              AND public.fn_can_access_section(t.section_id)
        )
    );

DROP POLICY IF EXISTS "discussion_posts_insert" ON public.discussion_posts;
CREATE POLICY "discussion_posts_insert"
    ON public.discussion_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id
              AND t.deleted_at IS NULL
              AND public.fn_can_access_section(t.section_id)
        )
    );

DROP POLICY IF EXISTS "discussion_posts_update" ON public.discussion_posts;
CREATE POLICY "discussion_posts_update"
    ON public.discussion_posts
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id
              AND t.deleted_at IS NULL
              AND public.fn_can_access_section(t.section_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id
              AND t.deleted_at IS NULL
              AND public.fn_can_access_section(t.section_id)
        )
    );

CREATE OR REPLACE FUNCTION public.fn_list_section_threads_json(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    v_where := format('WHERE t.deleted_at IS NULL AND t.section_id = %L', p_section_id);

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (t.title ILIKE %L OR t.body ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.title,
            t.body,
            t.is_resolved,
            t.is_pinned,
            t.created_at,
            t.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            (
                SELECT count(*)
                FROM public.discussion_posts p
                WHERE p.thread_id = t.id AND p.deleted_at IS NULL
            ) AS reply_count,
            COUNT(*) OVER() AS total_count
        FROM public.discussion_threads t
        LEFT JOIN public.users u ON u.id = t.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.is_pinned DESC, t.created_at DESC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_discussion_thread(p_thread_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF NOT public.fn_can_access_section(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'id', t.id,
        'section_id', t.section_id,
        'title', t.title,
        'body', t.body,
        'is_resolved', t.is_resolved,
        'is_pinned', t.is_pinned,
        'created_at', t.created_at,
        'created_by', t.created_by,
        'author_name', trim(concat(u.first_name, ' ', u.last_name)),
        'can_moderate', public.fn_is_section_faculty(t.section_id),
        'posts', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'body', p.body,
                        'is_answer', p.is_answer,
                        'created_at', p.created_at,
                        'created_by', p.created_by,
                        'author_name', trim(concat(pu.first_name, ' ', pu.last_name))
                    )
                    ORDER BY p.is_answer DESC, p.created_at
                )
                FROM public.discussion_posts p
                LEFT JOIN public.users pu ON pu.id = p.created_by
                WHERE p.thread_id = t.id AND p.deleted_at IS NULL
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.discussion_threads t
    LEFT JOIN public.users u ON u.id = t.created_by
    WHERE t.id = p_thread_id
      AND t.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_thread(p_section_id uuid, p_title text, p_body text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_id UUID;
    v_faculty_id UUID;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A title is required.');
    END IF;

    IF p_body IS NULL OR btrim(p_body) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A message is required.');
    END IF;

    INSERT INTO public.discussion_threads (section_id, title, body)
    VALUES (p_section_id, btrim(p_title), btrim(p_body))
    RETURNING id INTO v_id;

    SELECT faculty_id INTO v_faculty_id
    FROM public.sections
    WHERE id = p_section_id AND deleted_at IS NULL;

    IF v_faculty_id IS NOT NULL AND v_faculty_id <> auth.uid() THEN
        PERFORM public.fn_notify_user(
            v_faculty_id,
            'New discussion post',
            btrim(p_title),
            '/faculty/sections/' || p_section_id::text || '?tab=discussion'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion posted.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reply_to_thread(p_thread_id uuid, p_body text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
    v_id UUID;
BEGIN
    SELECT section_id, created_by INTO v_section_id, v_author_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF NOT public.fn_can_access_section(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_body IS NULL OR btrim(p_body) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A reply message is required.');
    END IF;

    INSERT INTO public.discussion_posts (thread_id, body)
    VALUES (p_thread_id, btrim(p_body))
    RETURNING id INTO v_id;

    IF v_author_id IS NOT NULL AND v_author_id <> auth.uid() THEN
        PERFORM public.fn_notify_user(
            v_author_id,
            'New reply to your discussion',
            btrim(p_body),
            '/faculty/sections/' || v_section_id::text || '?tab=discussion'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Reply posted.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_thread(p_thread_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
BEGIN
    SELECT section_id, created_by INTO v_section_id, v_author_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can delete this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_threads
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_thread_id AND deleted_at IS NULL;

    UPDATE public.discussion_posts
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE thread_id = p_thread_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_post(p_post_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
BEGIN
    SELECT t.section_id, p.created_by INTO v_section_id, v_author_id
    FROM public.discussion_posts p
    JOIN public.discussion_threads t ON t.id = p.thread_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can delete this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_posts
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_post_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Reply deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_thread_resolved(p_thread_id uuid, p_is_resolved boolean)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_author_id UUID;
BEGIN
    SELECT section_id, created_by INTO v_section_id, v_author_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF v_author_id <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can resolve this.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_threads
    SET is_resolved = COALESCE(p_is_resolved, false)
    WHERE id = p_thread_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_post_answer(p_post_id uuid, p_is_answer boolean)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_thread_author UUID;
    v_thread_id UUID;
BEGIN
    SELECT t.section_id, t.created_by, t.id INTO v_section_id, v_thread_author, v_thread_id
    FROM public.discussion_posts p
    JOIN public.discussion_threads t ON t.id = p.thread_id
    WHERE p.id = p_post_id AND p.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reply not found.');
    END IF;

    IF v_thread_author <> auth.uid() AND NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the author or the section faculty can mark an answer.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_posts
    SET is_answer = false
    WHERE thread_id = v_thread_id AND deleted_at IS NULL;

    IF COALESCE(p_is_answer, false) THEN
        UPDATE public.discussion_posts
        SET is_answer = true
        WHERE id = p_post_id AND deleted_at IS NULL;

        UPDATE public.discussion_threads
        SET is_resolved = true
        WHERE id = v_thread_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Answer updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_thread_pinned(p_thread_id uuid, p_is_pinned boolean)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.discussion_threads
    WHERE id = p_thread_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Discussion not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can pin a discussion.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.discussion_threads
    SET is_pinned = COALESCE(p_is_pinned, false)
    WHERE id = p_thread_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Discussion updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_can_access_section(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_is_section_faculty(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_section_threads_json(uuid, integer, integer, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_discussion_thread(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_thread(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_reply_to_thread(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_thread(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_post(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_thread_resolved(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_post_answer(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_thread_pinned(uuid, boolean) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_can_access_section(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_section_faculty(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_section_threads_json(uuid, integer, integer, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_discussion_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_thread(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reply_to_thread(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_thread_resolved(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_post_answer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_thread_pinned(uuid, boolean) TO authenticated;
