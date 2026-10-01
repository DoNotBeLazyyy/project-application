CREATE OR REPLACE FUNCTION public.fn_create_section(
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status section_status_type DEFAULT 'Open'::section_status_type,
    p_program_id uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_existing_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sections can only be created for the active academic year.');
    END IF;

    -- Duplicate Check Rule: check if section for term, course, and faculty (or section_code) already exists
    SELECT id INTO v_existing_id
    FROM public.sections
    WHERE term_id = p_term_id
      AND course_id = p_course_id
      AND (
          section_code = p_section_code
          OR (p_faculty_id IS NOT NULL AND faculty_id = p_faculty_id)
      )
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    INSERT INTO public.sections (
        term_id,
        course_id,
        faculty_id,
        section_code,
        room,
        max_slots,
        status,
        created_by
    ) VALUES (
        p_term_id,
        p_course_id,
        p_faculty_id,
        p_section_code,
        p_room,
        p_max_slots,
        p_status,
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.', 'id', v_section_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_sections(p_sections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_term_id UUID;
    v_is_active BOOLEAN;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
    v_section_id UUID;
    v_section_code TEXT;
    v_course_prefix TEXT;
    v_seq INTEGER;
    v_term_input TEXT;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;

        BEGIN
            v_term_input := trim(COALESCE(v_row->>'term_label', ''));
            v_term_id := NULL;
            v_is_active := FALSE;

            IF v_term_input = '' THEN
                SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
                FROM public.terms t
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE sy.is_active = TRUE AND t.deleted_at IS NULL
                ORDER BY t.created_at ASC
                LIMIT 1;
            ELSE
                SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
                FROM public.terms t
                INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE t.deleted_at IS NULL AND (
                    (tt.label || ' - ' || sy.label) = v_term_input
                    OR (tt.label || ' ' || sy.label) = v_term_input
                    OR (tt.label || ' - ' || replace(sy.label, 'Academic Year ', '')) = v_term_input
                    OR (tt.label || ' ' || replace(sy.label, 'Academic Year ', '')) = v_term_input
                    OR LOWER(tt.label || ' - ' || sy.label) = LOWER(v_term_input)
                )
                LIMIT 1;
            END IF;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            IF NOT v_is_active THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'INACTIVE_ACADEMIC_YEAR',
                    'message', 'Sections can only be imported for the active academic year.'
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = trim(v_row->>'course_code') AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'COURSE_NOT_FOUND',
                    'message', 'Course not found: ' || coalesce(v_row->>'course_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_faculty_id := NULL;
            IF (v_row->>'faculty_email') IS NOT NULL AND trim(v_row->>'faculty_email') <> '' THEN
                SELECT u.id INTO v_faculty_id
                FROM public.users u
                WHERE u.email = trim(v_row->>'faculty_email') AND u.deleted_at IS NULL
                LIMIT 1;

                IF v_faculty_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'FACULTY_NOT_FOUND',
                        'message', 'Faculty email not found: ' || (v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            v_section_code := trim(COALESCE(v_row->>'section_code', ''));
            IF v_section_code = '' THEN
                SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
                INTO v_course_prefix
                FROM public.courses WHERE id = v_course_id;

                v_seq := 1;
                v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                WHILE EXISTS (
                    SELECT 1 FROM public.sections
                    WHERE term_id = v_term_id
                    AND section_code = v_section_code
                    AND deleted_at IS NULL
                ) LOOP
                    v_seq := v_seq + 1;
                    v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                END LOOP;
            END IF;

            v_max_slots := 40;
            IF (v_row->>'max_slots') IS NOT NULL AND trim(v_row->>'max_slots') <> '' THEN
                v_max_slots := (v_row->>'max_slots')::SMALLINT;
                IF v_max_slots < 1 OR v_max_slots > 999 THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'INVALID_MAX_SLOTS',
                        'message', 'Max slots must be between 1 and 999.'
                    );
                    CONTINUE;
                END IF;
            END IF;

            -- Match existing section by (term, course, faculty) OR section_code
            SELECT id INTO v_section_id
            FROM public.sections
            WHERE term_id = v_term_id
            AND course_id = v_course_id
            AND (
                section_code = v_section_code
                OR (v_faculty_id IS NOT NULL AND faculty_id = v_faculty_id)
            )
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_section_id IS NOT NULL THEN
                UPDATE public.sections
                SET course_id = v_course_id,
                    faculty_id = COALESCE(v_faculty_id, faculty_id),
                    room = COALESCE(nullif(trim(v_row->>'room'), ''), room),
                    max_slots = v_max_slots,
                    updated_at = NOW(),
                    updated_by = auth.uid()
                WHERE id = v_section_id;
            ELSE
                INSERT INTO public.sections (
                    term_id,
                    course_id,
                    faculty_id,
                    section_code,
                    room,
                    max_slots,
                    status,
                    created_by
                ) VALUES (
                    v_term_id,
                    v_course_id,
                    v_faculty_id,
                    v_section_code,
                    nullif(trim(v_row->>'room'), ''),
                    v_max_slots,
                    'Open'::public.section_status_type,
                    auth.uid()
                )
                RETURNING id INTO v_section_id;

                PERFORM public.fn_seed_section_grading(v_section_id);
            END IF;

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'DB_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_index,
        'provisioned', v_provisioned,
        'skipped', jsonb_array_length(v_errors),
        'errors', v_errors
    );
END;
$function$;
