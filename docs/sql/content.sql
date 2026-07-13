CREATE TABLE IF NOT EXISTS public.material_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.course_materials (id) ON DELETE RESTRICT,
    enrollment_id UUID NOT NULL REFERENCES public.enrollments (id) ON DELETE RESTRICT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_material_completions_material_enrollment
    ON public.material_completions (material_id, enrollment_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_completions_enrollment
    ON public.material_completions (enrollment_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.material_completions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_material_completions_updated_audit ON public.material_completions;
CREATE TRIGGER trg_material_completions_updated_audit
    BEFORE UPDATE ON public.material_completions
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "material_completions_select" ON public.material_completions;
CREATE POLICY "material_completions_select"
    ON public.material_completions
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
            WHERE e.id = enrollment_id
              AND st.user_id = auth.uid()
              AND e.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "material_completions_insert" ON public.material_completions;
CREATE POLICY "material_completions_insert"
    ON public.material_completions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
            WHERE e.id = enrollment_id
              AND st.user_id = auth.uid()
              AND e.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "material_completions_update" ON public.material_completions;
CREATE POLICY "material_completions_update"
    ON public.material_completions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
            WHERE e.id = enrollment_id
              AND st.user_id = auth.uid()
              AND e.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
            WHERE e.id = enrollment_id
              AND st.user_id = auth.uid()
              AND e.deleted_at IS NULL
        )
    );

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modules_select" ON public.modules;
CREATE POLICY "modules_select"
    ON public.modules
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND public.fn_can_access_section(section_id));

DROP POLICY IF EXISTS "modules_insert" ON public.modules;
CREATE POLICY "modules_insert"
    ON public.modules
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_is_section_faculty(section_id));

DROP POLICY IF EXISTS "modules_update" ON public.modules;
CREATE POLICY "modules_update"
    ON public.modules
    FOR UPDATE
    TO authenticated
    USING (public.fn_is_section_faculty(section_id))
    WITH CHECK (public.fn_is_section_faculty(section_id));

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_materials_select" ON public.course_materials;
CREATE POLICY "course_materials_select"
    ON public.course_materials
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.modules m
            WHERE m.id = module_id
              AND m.deleted_at IS NULL
              AND public.fn_can_access_section(m.section_id)
        )
    );

DROP POLICY IF EXISTS "course_materials_insert" ON public.course_materials;
CREATE POLICY "course_materials_insert"
    ON public.course_materials
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.modules m
            WHERE m.id = module_id
              AND m.deleted_at IS NULL
              AND public.fn_is_section_faculty(m.section_id)
        )
    );

DROP POLICY IF EXISTS "course_materials_update" ON public.course_materials;
CREATE POLICY "course_materials_update"
    ON public.course_materials
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.modules m
            WHERE m.id = module_id
              AND m.deleted_at IS NULL
              AND public.fn_is_section_faculty(m.section_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.modules m
            WHERE m.id = module_id
              AND m.deleted_at IS NULL
              AND public.fn_is_section_faculty(m.section_id)
        )
    );

CREATE OR REPLACE FUNCTION public.fn_get_section_content(p_section_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_can_manage BOOLEAN;
    v_enrollment_id UUID;
    v_modules JSONB;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    v_can_manage := public.fn_is_section_faculty(p_section_id);

    IF NOT v_can_manage THEN
        SELECT e.id INTO v_enrollment_id
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
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
                'materials', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', cm.id,
                                'title', cm.title,
                                'description', cm.description,
                                'material_type', cm.material_type,
                                'file_url', cm.file_url,
                                'external_url', cm.external_url,
                                'file_name', cm.file_name,
                                'mime_type', cm.mime_type,
                                'file_size_bytes', cm.file_size_bytes,
                                'sequence', cm.sequence,
                                'is_published', cm.is_published,
                                'available_from', cm.available_from,
                                'available_until', cm.available_until,
                                'is_completed', EXISTS (
                                    SELECT 1 FROM public.material_completions mc
                                    WHERE mc.material_id = cm.id
                                      AND mc.enrollment_id = v_enrollment_id
                                      AND mc.deleted_at IS NULL
                                )
                            )
                            ORDER BY cm.sequence, cm.created_at
                        )
                        FROM public.course_materials cm
                        WHERE cm.module_id = m.id
                          AND cm.deleted_at IS NULL
                          AND (v_can_manage OR cm.is_published)
                    ),
                    '[]'::jsonb
                )
            ) AS mod_row
        FROM public.modules m
        WHERE m.section_id = p_section_id
          AND m.deleted_at IS NULL
          AND (v_can_manage OR m.is_published)
    ) sub;

    RETURN jsonb_build_object(
        'can_manage', v_can_manage,
        'modules', v_modules
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_module(p_section_id uuid, p_title text, p_description text DEFAULT NULL::text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_id UUID;
    v_sequence SMALLINT;
BEGIN
    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add content.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A module title is required.');
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.modules
    WHERE section_id = p_section_id AND deleted_at IS NULL;

    INSERT INTO public.modules (section_id, title, description, sequence)
    VALUES (p_section_id, btrim(p_title), NULLIF(btrim(p_description), ''), v_sequence)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Module created.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_module(p_module_id uuid, p_title text, p_description text DEFAULT NULL::text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can edit content.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A module title is required.');
    END IF;

    UPDATE public.modules
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), '')
    WHERE id = p_module_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_module(p_module_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can delete content.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.modules
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_module_id AND deleted_at IS NULL;

    UPDATE public.course_materials
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE module_id = p_module_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_module_published(p_module_id uuid, p_is_published boolean)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can publish content.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.modules
    SET is_published = COALESCE(p_is_published, false),
        published_at = CASE WHEN COALESCE(p_is_published, false) THEN now() ELSE NULL END
    WHERE id = p_module_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Module updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_create_material(p_module_id uuid, p_title text, p_material_type public.material_type, p_description text DEFAULT NULL::text, p_file_url text DEFAULT NULL::text, p_external_url text DEFAULT NULL::text, p_file_name text DEFAULT NULL::text, p_mime_type text DEFAULT NULL::text, p_file_size_bytes integer DEFAULT NULL::integer)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_id UUID;
    v_sequence SMALLINT;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add materials.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A material title is required.');
    END IF;

    IF p_material_type = 'Link' THEN
        IF p_external_url IS NULL OR btrim(p_external_url) = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'A link URL is required.');
        END IF;
    ELSE
        IF p_file_url IS NULL OR btrim(p_file_url) = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'A file is required.');
        END IF;
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.course_materials
    WHERE module_id = p_module_id AND deleted_at IS NULL;

    INSERT INTO public.course_materials (
        module_id, title, description, material_type,
        file_url, external_url, file_name, mime_type, file_size_bytes, sequence
    )
    VALUES (
        p_module_id, btrim(p_title), NULLIF(btrim(p_description), ''), p_material_type,
        NULLIF(btrim(p_file_url), ''), NULLIF(btrim(p_external_url), ''),
        NULLIF(btrim(p_file_name), ''), NULLIF(btrim(p_mime_type), ''), p_file_size_bytes, v_sequence
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Material added.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_material(p_material_id uuid, p_title text, p_description text DEFAULT NULL::text, p_external_url text DEFAULT NULL::text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id AND cm.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can edit materials.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A material title is required.');
    END IF;

    UPDATE public.course_materials
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        external_url = COALESCE(NULLIF(btrim(p_external_url), ''), external_url)
    WHERE id = p_material_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Material updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_material(p_material_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id AND cm.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can delete materials.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.course_materials
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_material_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Material deleted.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_set_material_published(p_material_id uuid, p_is_published boolean)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id AND cm.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can publish materials.'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.course_materials
    SET is_published = COALESCE(p_is_published, false)
    WHERE id = p_material_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Material updated.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_material_complete(p_material_id uuid, p_is_complete boolean DEFAULT true)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_enrollment_id UUID;
BEGIN
    SELECT m.section_id INTO v_section_id
    FROM public.course_materials cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.id = p_material_id
      AND cm.deleted_at IS NULL
      AND cm.is_published;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Material not found.');
    END IF;

    SELECT e.id INTO v_enrollment_id
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.section_id = v_section_id
      AND st.user_id = auth.uid()
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: you are not enrolled in this section.'
            USING ERRCODE = '42501';
    END IF;

    IF COALESCE(p_is_complete, true) THEN
        INSERT INTO public.material_completions (material_id, enrollment_id)
        VALUES (p_material_id, v_enrollment_id)
        ON CONFLICT (material_id, enrollment_id) WHERE deleted_at IS NULL
        DO NOTHING;
    ELSE
        UPDATE public.material_completions
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE material_id = p_material_id
          AND enrollment_id = v_enrollment_id
          AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'is_completed', COALESCE(p_is_complete, true));

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_get_section_content(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_module(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_module(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_module(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_module_published(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_material(uuid, text, public.material_type, text, text, text, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_material(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_delete_material(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_set_material_published(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_mark_material_complete(uuid, boolean) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_get_section_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_module(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_module(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_module(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_module_published(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_material(uuid, text, public.material_type, text, text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_material(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_material(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_material_published(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_mark_material_complete(uuid, boolean) TO authenticated;