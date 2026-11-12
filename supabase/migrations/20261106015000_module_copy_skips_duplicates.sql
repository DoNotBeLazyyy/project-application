-- Copying a module to other sections
-- fn_duplicate_module_to_sections skips a target section that already has a module with the
-- same title (case and outer spaces ignored), so running the copy twice no longer makes
-- duplicates. The reply says how many sections were skipped (skipped_count).
-- Signature is unchanged, so grants stay in place.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_duplicate_module_to_sections(p_module_id uuid, p_section_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_src           public.modules%ROWTYPE;
    v_target_id     UUID;
    v_new_module_id UUID;
    v_sequence      SMALLINT;
    v_copied        INTEGER := 0;
    v_skipped       INTEGER := 0;
    v_message       TEXT;
BEGIN
    PERFORM public.fn_assert_role('Faculty');

    SELECT * INTO v_src
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_src.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_src.section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not teach the source section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_section_ids IS NULL OR array_length(p_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    FOREACH v_target_id IN ARRAY p_section_ids
    LOOP
        IF v_target_id = v_src.section_id THEN
            CONTINUE;
        END IF;

        IF NOT public.fn_is_section_faculty(v_target_id) THEN
            RAISE EXCEPTION 'Forbidden: you do not teach one of the selected sections.'
                USING ERRCODE = '42501';
        END IF;

        -- Running the copy twice must not make a second copy
        IF EXISTS (
            SELECT 1 FROM public.modules t
            WHERE t.section_id = v_target_id
              AND t.deleted_at IS NULL
              AND lower(btrim(t.title)) = lower(btrim(v_src.title))
        ) THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
        FROM public.modules
        WHERE section_id = v_target_id AND deleted_at IS NULL;

        INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
        VALUES (v_target_id, v_src.title, v_src.description, v_sequence, false, NULL)
        RETURNING id INTO v_new_module_id;

        INSERT INTO public.course_materials (
            module_id, title, description, material_type,
            file_url, external_url, file_name, mime_type, file_size_bytes,
            sequence, is_published, available_from, available_until
        )
        SELECT
            v_new_module_id, cm.title, cm.description, cm.material_type,
            cm.file_url, cm.external_url, cm.file_name, cm.mime_type, cm.file_size_bytes,
            cm.sequence, false, cm.available_from, cm.available_until
        FROM public.course_materials cm
        WHERE cm.module_id = p_module_id
          AND cm.deleted_at IS NULL;

        v_copied := v_copied + 1;
    END LOOP;

    v_message := format('Module copied to %s section(s) as an unpublished draft.', v_copied);

    IF v_skipped > 0 THEN
        v_message := v_message || format(' %s section(s) were skipped because they already have a module named "%s".', v_skipped, v_src.title);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_message,
        'copied_count', v_copied,
        'skipped_count', v_skipped
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

COMMIT;