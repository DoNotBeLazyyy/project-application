INSERT INTO storage.buckets (id, name, public)
VALUES ('discussions', 'discussions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "discussions_objects_select" ON storage.objects;
CREATE POLICY "discussions_objects_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'discussions');

DROP POLICY IF EXISTS "discussions_objects_insert" ON storage.objects;
CREATE POLICY "discussions_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'discussions');

DROP POLICY IF EXISTS "discussions_objects_update" ON storage.objects;
CREATE POLICY "discussions_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'discussions' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'discussions' AND owner = auth.uid());

CREATE TABLE IF NOT EXISTS public.discussion_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES public.discussion_threads (id) ON DELETE RESTRICT,
    post_id UUID REFERENCES public.discussion_posts (id) ON DELETE RESTRICT,
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

CREATE INDEX IF NOT EXISTS idx_discussion_attachments_thread
    ON public.discussion_attachments (thread_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_discussion_attachments_post
    ON public.discussion_attachments (post_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.discussion_attachments ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_discussion_attachments_updated_audit ON public.discussion_attachments;
CREATE TRIGGER trg_discussion_attachments_updated_audit
    BEFORE UPDATE ON public.discussion_attachments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "discussion_attachments_select" ON public.discussion_attachments;
CREATE POLICY "discussion_attachments_select"
    ON public.discussion_attachments
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            EXISTS (
                SELECT 1 FROM public.discussion_threads t
                WHERE t.id = thread_id
                  AND t.deleted_at IS NULL
                  AND public.fn_can_access_section(t.section_id)
            )
            OR EXISTS (
                SELECT 1 FROM public.discussion_posts p
                JOIN public.discussion_threads t ON t.id = p.thread_id
                WHERE p.id = post_id
                  AND p.deleted_at IS NULL
                  AND t.deleted_at IS NULL
                  AND public.fn_can_access_section(t.section_id)
            )
        )
    );

DROP POLICY IF EXISTS "discussion_attachments_insert" ON public.discussion_attachments;
CREATE POLICY "discussion_attachments_insert"
    ON public.discussion_attachments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.discussion_threads t
            WHERE t.id = thread_id
              AND t.deleted_at IS NULL
              AND public.fn_can_access_section(t.section_id)
        )
        OR EXISTS (
            SELECT 1 FROM public.discussion_posts p
            JOIN public.discussion_threads t ON t.id = p.thread_id
            WHERE p.id = post_id
              AND p.deleted_at IS NULL
              AND t.deleted_at IS NULL
              AND public.fn_can_access_section(t.section_id)
        )
    );

DROP POLICY IF EXISTS "discussion_attachments_update" ON public.discussion_attachments;
CREATE POLICY "discussion_attachments_update"
    ON public.discussion_attachments
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.fn_insert_discussion_attachments(p_thread_id uuid, p_post_id uuid, p_attachments jsonb)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.discussion_attachments (thread_id, post_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_thread_id,
        p_post_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_create_thread(uuid, text, text);
CREATE OR REPLACE FUNCTION public.fn_create_thread(p_section_id uuid, p_title text, p_body text, p_attachments jsonb DEFAULT NULL::jsonb)
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

    PERFORM public.fn_insert_discussion_attachments(v_id, NULL, p_attachments);

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

DROP FUNCTION IF EXISTS public.fn_reply_to_thread(uuid, text);
CREATE OR REPLACE FUNCTION public.fn_reply_to_thread(p_thread_id uuid, p_body text, p_attachments jsonb DEFAULT NULL::jsonb)
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

    PERFORM public.fn_insert_discussion_attachments(NULL, v_id, p_attachments);

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
        'attachments', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', a.id,
                        'file_name', a.file_name,
                        'file_path', a.file_path,
                        'mime_type', a.mime_type,
                        'file_size', a.file_size
                    )
                    ORDER BY a.created_at
                )
                FROM public.discussion_attachments a
                WHERE a.thread_id = t.id AND a.deleted_at IS NULL
            ),
            '[]'::jsonb
        ),
        'posts', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', p.id,
                        'body', p.body,
                        'is_answer', p.is_answer,
                        'created_at', p.created_at,
                        'created_by', p.created_by,
                        'author_name', trim(concat(pu.first_name, ' ', pu.last_name)),
                        'attachments', COALESCE(
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'id', pa.id,
                                        'file_name', pa.file_name,
                                        'file_path', pa.file_path,
                                        'mime_type', pa.mime_type,
                                        'file_size', pa.file_size
                                    )
                                    ORDER BY pa.created_at
                                )
                                FROM public.discussion_attachments pa
                                WHERE pa.post_id = p.id AND pa.deleted_at IS NULL
                            ),
                            '[]'::jsonb
                        )
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

    UPDATE public.discussion_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL
      AND (
          thread_id = p_thread_id
          OR post_id IN (SELECT id FROM public.discussion_posts WHERE thread_id = p_thread_id)
      );

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

    UPDATE public.discussion_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE post_id = p_post_id AND deleted_at IS NULL;

    UPDATE public.discussion_posts
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_post_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Reply deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_insert_discussion_attachments(uuid, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_thread(uuid, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_reply_to_thread(uuid, text, jsonb) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_insert_discussion_attachments(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_thread(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reply_to_thread(uuid, text, jsonb) TO authenticated;
