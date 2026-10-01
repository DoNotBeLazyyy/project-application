-- Migration to align manual section enrollment and bulk CSV section enrollment

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(
    p_student_id uuid,
    p_section_id uuid,
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL::text,
    p_override_prerequisites boolean DEFAULT false
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student   RECORD;
    v_section   RECORD;
    v_taken     INTEGER;
    v_conflicts TEXT;
    v_unmet     TEXT;
BEGIN
    SELECT st.id, st.program_id, st.status
    INTO v_student
    FROM public.students st
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_NOT_FOUND', 'message', 'Student not found.');
    END IF;

    IF v_student.status <> 'Active' THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_INACTIVE', 'message', 'Only active students can be enrolled.');
    END IF;

    IF v_student.program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_PROGRAM', 'message', 'Student has no program assigned.');
    END IF;

    SELECT s.id, s.course_id, s.term_id, s.max_slots, s.status, s.section_code, c.code AS course_code
    INTO v_section
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'SECTION_NOT_FOUND', 'message', 'Section not found.');
    END IF;

    IF v_section.status IN ('Closed', 'Cancelled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SECTION_UNAVAILABLE',
            'message', v_section.section_code || ' is ' || lower(v_section.status::TEXT) || ' and cannot accept enrollments.'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.curriculum_maps cm
        WHERE cm.program_id = v_student.program_id
        AND cm.course_id = v_section.course_id
        AND cm.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_IN_CURRICULUM',
            'message', v_section.course_code || ' is not part of the student''s program curriculum.'
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.enrollments e
        INNER JOIN public.sections s2 ON s2.id = e.section_id AND s2.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.deleted_at IS NULL
        AND e.status IN ('Enrolled', 'Completed')
        AND s2.course_id = v_section.course_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_TAKEN',
            'message', 'Student is already enrolled in or has completed ' || v_section.course_code || '.'
        );
    END IF;

    SELECT COUNT(*) INTO v_taken
    FROM public.enrollments
    WHERE section_id = p_section_id
    AND deleted_at IS NULL
    AND status NOT IN ('Dropped', 'Withdrawn');

    IF v_taken >= v_section.max_slots THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SECTION_FULL',
            'message', v_section.section_code || ' is already full.'
        );
    END IF;

    v_unmet := public.fn_get_unmet_prerequisites(p_student_id, v_section.course_id);

    IF v_unmet IS NOT NULL AND NOT p_override_prerequisites THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PREREQUISITE_UNMET',
            'message', v_section.course_code || ' requires ' || v_unmet || '.'
        );
    END IF;

    v_conflicts := public.fn_get_schedule_conflicts(p_student_id, p_section_id);

    IF v_conflicts IS NOT NULL THEN
        IF NOT p_allow_conflict THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'SCHEDULE_CONFLICT',
                'message', v_section.section_code || ' conflicts with ' || v_conflicts || '.'
            );
        END IF;

        IF NULLIF(trim(COALESCE(p_conflict_reason, '')), '') IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONFLICT_REASON_REQUIRED',
                'message', 'Conflict authorization reason is required when allow_conflict is true.'
            );
        END IF;
    END IF;

    INSERT INTO public.enrollments (
        student_id,
        section_id,
        status,
        enrolled_at,
        created_by,
        is_conflict_authorized,
        conflict_authorized_by,
        conflict_authorized_at,
        conflict_reason
    ) VALUES (
        p_student_id,
        p_section_id,
        'Enrolled'::public.enrollment_status_type,
        now(),
        auth.uid(),
        v_conflicts IS NOT NULL,
        CASE WHEN v_conflicts IS NOT NULL THEN auth.uid() END,
        CASE WHEN v_conflicts IS NOT NULL THEN now() END,
        CASE WHEN v_conflicts IS NOT NULL THEN NULLIF(trim(COALESCE(p_conflict_reason, '')), '') END
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'ENROLLED',
        'message', 'Enrolled in ' || v_section.section_code || '.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_students(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row        JSONB;
    v_index      INTEGER := 0;
    v_errors     JSONB := '[]'::JSONB;
    v_enrolled   INTEGER := 0;
    v_student_id UUID;
    v_term_id    UUID;
    v_section_id UUID;
    v_code       TEXT;
    v_codes      TEXT[];
    v_outcome    JSONB;
    v_allow      BOOLEAN;
    v_override   BOOLEAN;
    v_reason     TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE student_number = trim(v_row->>'student_number')
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_student_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'STUDENT_NOT_FOUND',
                    'message', 'Student not found: ' || COALESCE(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            IF COALESCE(trim(v_row->>'term_label'), '') = '' THEN
                v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
            ELSE
                SELECT t.id INTO v_term_id
                FROM public.terms t
                INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE (
                    (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
                    OR (tt.label || ' - ' || replace(sy.label, 'Academic Year', 'School Year')) = trim(v_row->>'term_label')
                    OR (tt.label || ' - ' || replace(sy.label, 'School Year', 'Academic Year')) = trim(v_row->>'term_label')
                    OR t.id::text = trim(v_row->>'term_label')
                )
                AND t.deleted_at IS NULL
                LIMIT 1;
            END IF;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || COALESCE(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT array_agg(trimmed)
            INTO v_codes
            FROM (
                SELECT trim(raw) AS trimmed
                FROM unnest(string_to_array(COALESCE(v_row->>'section_codes', ''), '|')) AS raw
                WHERE trim(raw) <> ''
            ) parsed;

            IF v_codes IS NULL OR array_length(v_codes, 1) = 0 THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'NO_SECTIONS',
                    'message', 'No section codes provided for ' || COALESCE(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            v_allow    := lower(COALESCE(trim(v_row->>'allow_conflict'), '')) IN ('true', 't', 'yes', '1');
            v_override := lower(COALESCE(trim(v_row->>'override_prerequisites'), '')) IN ('true', 't', 'yes', '1');
            v_reason   := NULLIF(trim(COALESCE(v_row->>'conflict_reason', '')), '');

            FOREACH v_code IN ARRAY v_codes
            LOOP
                SELECT id INTO v_section_id
                FROM public.sections
                WHERE (upper(section_code) = upper(v_code) OR section_code = v_code)
                AND term_id = v_term_id
                AND deleted_at IS NULL
                LIMIT 1;

                IF v_section_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'SECTION_NOT_FOUND',
                        'message', 'Section not found in term: ' || v_code
                    );
                    CONTINUE;
                END IF;

                v_outcome := public.fn_enroll_student_section(
                    v_student_id,
                    v_section_id,
                    v_allow,
                    v_reason,
                    v_override
                );

                IF (v_outcome->>'success')::BOOLEAN THEN
                    v_enrolled := v_enrolled + 1;
                ELSE
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', v_outcome->>'code',
                        'message', (v_row->>'student_number') || ': ' || (v_outcome->>'message')
                    );
                END IF;
            END LOOP;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_enrolled,
        'errors', v_errors
    );
END;
$function$;
