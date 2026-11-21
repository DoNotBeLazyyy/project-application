-- ====================================================================
-- Migration: 20261121400003_section_read_after_final_grades.sql
-- Section access after final grades (audit 2026-11-21):
--   * #56 fn_can_read_section (new): like fn_can_access_section, but students keep READ access
--     once the enrollment is Completed, Failed or Incomplete. Used by fn_get_section_content,
--     fn_list_section_threads_json, fn_get_discussion_thread, fn_list_section_announcements and
--     the SELECT policies of modules, course_materials, discussion_threads, discussion_posts
--     and discussion_attachments (recreated with the same expressions, read check swapped).
--     Posting (fn_create_thread, fn_reply_to_thread, insert/update policies) is unchanged.
--   * #63 fn_list_section_announcements: an announcement is shown through the end of its
--     expiry day in Manila (stored dates are midnight UTC, 8:00 AM Manila).
-- Bodies are the live definitions with only these edits. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_can_read_section(p_section_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    -- Like fn_can_access_section, but a student keeps read access after the subject is
    -- finalized (Completed, Failed or Incomplete). Posting still uses fn_can_access_section.
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
          AND e.status IN ('Enrolled', 'Completed', 'Failed', 'Incomplete')
          AND e.deleted_at IS NULL
    );
$function$;
GRANT EXECUTE ON FUNCTION public.fn_can_read_section(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_section_content(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[] := public.fn_current_user_role_codes();
    v_can_manage BOOLEAN;
    v_enrollment_id UUID;
    v_modules JSONB;
BEGIN
    IF NOT public.fn_can_read_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF 'Student' = ANY(v_roles) AND NOT ('Faculty' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        v_can_manage := false;
    ELSE
        v_can_manage := public.fn_is_section_faculty(p_section_id);
    END IF;

    IF NOT v_can_manage THEN
        SELECT e.id INTO v_enrollment_id
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status IN ('Enrolled', 'Completed', 'Failed', 'Incomplete')
          AND e.deleted_at IS NULL
        ORDER BY (e.status = 'Enrolled') DESC
        LIMIT 1;
    END IF;

    SELECT COALESCE(jsonb_agg(mod_row ORDER BY mod_row_sequence, mod_row_created), '[]'::jsonb)
    INTO v_modules
    FROM (
        SELECT
            m.sequence AS mod_row_sequence,
            m.created_at AS mod_row_created,
            jsonb_build_object(
                'id', m.id,
                'title', m.title,
                'description', m.description,
                'sequence', m.sequence,
                'is_published', m.is_published,
                'material_count', (
                    SELECT count(*)
                    FROM public.course_materials cm
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND (v_can_manage OR cm.is_published)
                ),
                'completed_count', (
                    SELECT count(*)
                    FROM public.course_materials cm
                    JOIN public.material_completions mcx
                        ON mcx.material_id = cm.id
                        AND mcx.enrollment_id = v_enrollment_id
                        AND mcx.deleted_at IS NULL
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND cm.is_published
                ),
                'materials', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', cm.id,
                        'title', cm.title,
                        'description', cm.description,
                        'material_type', cm.material_type,
                        'file_url', cm.file_url,
                        'external_url', cm.external_url,
                        'file_name', cm.file_name,
                        'file_size_bytes', cm.file_size_bytes,
                        'mime_type', cm.mime_type,
                        'sequence', cm.sequence,
                        'is_published', cm.is_published,
                        'available_from', cm.available_from,
                        'available_until', cm.available_until,
                        'created_at', cm.created_at,
                        'is_completed', EXISTS (
                            SELECT 1 FROM public.material_completions mc
                            WHERE mc.material_id = cm.id
                              AND mc.enrollment_id = v_enrollment_id
                              AND mc.deleted_at IS NULL
                        )
                    ) ORDER BY cm.sequence ASC, cm.created_at ASC)
                    FROM public.course_materials cm
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND (v_can_manage OR cm.is_published)
                ), '[]'::jsonb)
            ) AS mod_row
        FROM public.modules m
        WHERE m.section_id = p_section_id
          AND m.deleted_at IS NULL
          AND (v_can_manage OR m.is_published)
    ) sub;

    RETURN jsonb_build_object(
        'section_id', p_section_id,
        'can_manage', v_can_manage,
        'modules', v_modules
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_section_threads_json(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF NOT public.fn_can_read_section(p_section_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_discussion_thread(p_thread_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    IF NOT public.fn_can_read_section(v_section_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_section_announcements(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid UUID := auth.uid();
    v_is_enrolled BOOLEAN := FALSE;
    v_is_faculty BOOLEAN := FALSE;
    v_is_staff BOOLEAN := FALSE;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.sections s
        WHERE s.id = p_section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
    ) INTO v_is_faculty;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE st.user_id = v_uid AND e.section_id = p_section_id
          AND e.status IN ('Enrolled', 'Completed', 'Failed', 'Incomplete') AND e.deleted_at IS NULL
    ) INTO v_is_enrolled;

    v_is_staff := public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar'];

    IF NOT (v_is_faculty OR v_is_enrolled OR v_is_staff) THEN
        RAISE EXCEPTION 'Access Denied: You are not enrolled in or assigned to this section.'
            USING ERRCODE = '42501';
    END IF;

    v_where := format(
        'WHERE a.deleted_at IS NULL
           AND (a.published_at IS NULL OR a.published_at <= now())
           AND (a.expires_at IS NULL OR (a.expires_at AT TIME ZONE ''Asia/Manila'')::date >= (now() AT TIME ZONE ''Asia/Manila'')::date)
           AND EXISTS (
               SELECT 1 FROM public.announcement_sections asx
               WHERE asx.announcement_id = a.id
                 AND asx.section_id = %L
                 AND asx.deleted_at IS NULL
           )',
        p_section_id
    );

    v_base_query := format(
        'SELECT
            a.id,
            a.title,
            a.content,
            a.target_audience,
            a.is_pinned,
            a.published_at,
            a.created_at,
            a.created_by,
            trim(concat(u.first_name, '' '', u.last_name)) AS author_name,
            COUNT(*) OVER() AS total_count
        FROM public.announcements a
        LEFT JOIN public.users u ON u.id = a.created_by
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, NULL, 'a.is_pinned DESC, a.created_at DESC');
END;
$function$;

-- Read policies use the read check; insert/update policies keep fn_can_access_section
DROP POLICY IF EXISTS discussion_threads_select ON public.discussion_threads;
CREATE POLICY discussion_threads_select ON public.discussion_threads
    FOR SELECT TO authenticated
    USING ((deleted_at IS NULL) AND public.fn_can_read_section(section_id));

DROP POLICY IF EXISTS discussion_posts_select ON public.discussion_posts;
CREATE POLICY discussion_posts_select ON public.discussion_posts
    FOR SELECT TO authenticated
    USING ((deleted_at IS NULL) AND (EXISTS (
        SELECT 1 FROM public.discussion_threads t
        WHERE t.id = discussion_posts.thread_id AND t.deleted_at IS NULL AND public.fn_can_read_section(t.section_id)
    )));

DROP POLICY IF EXISTS modules_select ON public.modules;
CREATE POLICY modules_select ON public.modules
    FOR SELECT TO authenticated
    USING ((deleted_at IS NULL) AND public.fn_can_read_section(section_id));

DROP POLICY IF EXISTS course_materials_select ON public.course_materials;
CREATE POLICY course_materials_select ON public.course_materials
    FOR SELECT TO authenticated
    USING ((deleted_at IS NULL) AND (EXISTS (
        SELECT 1 FROM public.modules m
        WHERE m.id = course_materials.module_id AND m.deleted_at IS NULL AND public.fn_can_read_section(m.section_id)
    )));

DROP POLICY IF EXISTS discussion_attachments_select ON public.discussion_attachments;
CREATE POLICY discussion_attachments_select ON public.discussion_attachments
    FOR SELECT TO authenticated
    USING ((deleted_at IS NULL) AND ((EXISTS (
        SELECT 1 FROM public.discussion_threads t
        WHERE t.id = discussion_attachments.thread_id AND t.deleted_at IS NULL AND public.fn_can_read_section(t.section_id)
    )) OR (EXISTS (
        SELECT 1 FROM public.discussion_posts p
        JOIN public.discussion_threads t ON t.id = p.thread_id
        WHERE p.id = discussion_attachments.post_id AND p.deleted_at IS NULL AND t.deleted_at IS NULL
          AND public.fn_can_read_section(t.section_id)
    ))));

COMMIT;
