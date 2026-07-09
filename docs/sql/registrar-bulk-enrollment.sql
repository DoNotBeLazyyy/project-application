CREATE OR REPLACE FUNCTION public.fn_get_enrollment_target_term() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT jsonb_build_object(
        'id', t.id,
        'label', tt.label || ' - ' || sy.label,
        'status', t.status
    )
    FROM public.terms t
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
    ORDER BY
        CASE t.status
            WHEN 'Enrollment Open' THEN 1
            WHEN 'Ongoing' THEN 2
            WHEN 'Upcoming' THEN 3
            ELSE 4
        END,
        abs(t.start_date - CURRENT_DATE)
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_unmet_prerequisites(p_student_id uuid, p_course_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT string_agg(unmet.label, ', ' ORDER BY unmet.label)
    FROM (
        SELECT CASE
            WHEN cp.prerequisite_kind = 'standing'
                THEN 'Year ' || cp.year_level_required::TEXT || ' standing'
            ELSE COALESCE(pc.code, 'Unknown course')
        END AS label
        FROM public.course_prerequisites cp
        LEFT JOIN public.courses pc ON pc.id = cp.prerequisite_id AND pc.deleted_at IS NULL
        WHERE cp.course_id = p_course_id
        AND cp.deleted_at IS NULL
        AND cp.prerequisite_type = 'Required'
        AND (
            (
                cp.prerequisite_kind = 'standing'
                AND EXISTS (
                    SELECT 1 FROM public.students st
                    WHERE st.id = p_student_id
                    AND st.deleted_at IS NULL
                    AND st.year_level < cp.year_level_required
                )
            )
            OR (
                cp.prerequisite_kind = 'course'
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status = 'Completed'
                    AND s.course_id = cp.prerequisite_id
                    AND (cp.minimum_grade IS NULL OR COALESCE(e.final_grade, 5.0) <= cp.minimum_grade)
                )
            )
        )
    ) unmet;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_enrollment_students_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL,
    p_sort jsonb DEFAULT NULL,
    p_term_id uuid DEFAULT NULL,
    p_program_ids uuid[] DEFAULT NULL,
    p_year_levels integer[] DEFAULT NULL,
    p_statuses text[] DEFAULT NULL,
    p_enrollment_states text[] DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_term_id    UUID := p_term_id;
    v_term_lit   TEXT;
    v_base_query TEXT;
    v_where      TEXT := 'WHERE st.deleted_at IS NULL';
    v_load_exists TEXT;
BEGIN
    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    v_term_lit := COALESCE(quote_literal(v_term_id::TEXT), quote_literal('00000000-0000-0000-0000-000000000000'));

    v_load_exists := format(
        'EXISTS (
            SELECT 1 FROM public.enrollments le
            INNER JOIN public.sections ls ON ls.id = le.section_id AND ls.deleted_at IS NULL
            WHERE le.student_id = st.id
            AND le.deleted_at IS NULL
            AND le.status = ''Enrolled''
            AND ls.term_id = %s::uuid
        )',
        v_term_lit
    );

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND st.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_year_levels IS NOT NULL AND array_length(p_year_levels, 1) > 0 THEN
        v_where := v_where || ' AND st.year_level = ANY(' || quote_literal(p_year_levels::TEXT) || '::int[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND st.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.student_status_type[])';
    END IF;

    IF p_enrollment_states IS NOT NULL AND array_length(p_enrollment_states, 1) = 1 THEN
        IF p_enrollment_states[1] = 'Enrolled' THEN
            v_where := v_where || ' AND ' || v_load_exists;
        ELSIF p_enrollment_states[1] = 'Not Enrolled' THEN
            v_where := v_where || ' AND NOT ' || v_load_exists;
        END IF;
    END IF;

    v_base_query := format(
        'SELECT
            st.id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS student_name,
            u.email,
            st.year_level,
            st.status,
            st.program_id,
            COALESCE(p.code, ''—'') AS program_code,
            COALESCE(p.name, ''No program assigned'') AS program_name,
            COALESCE(ld.enrolled_count, 0)::INT AS enrolled_count,
            COALESCE(ld.enrolled_units, 0)::NUMERIC AS enrolled_units,
            CASE WHEN COALESCE(ld.enrolled_count, 0) > 0 THEN ''Enrolled'' ELSE ''Not Enrolled'' END AS enrollment_state,
            COUNT(*) OVER() AS total_count
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT
                COUNT(*) AS enrolled_count,
                COALESCE(SUM(c.total_units), 0) AS enrolled_units
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE e.student_id = st.id
            AND e.deleted_at IS NULL
            AND e.status = ''Enrolled''
            AND s.term_id = %s::uuid
        ) ld ON TRUE
        %s',
        v_term_lit,
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'student_number ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_student_detail(
    p_student_id uuid,
    p_term_id uuid DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_term_id UUID := p_term_id;
    v_result  JSONB;
BEGIN
    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT jsonb_build_object(
        'id', st.id,
        'student_number', st.student_number,
        'student_name', u.first_name || ' ' || u.last_name,
        'email', u.email,
        'year_level', st.year_level,
        'status', st.status,
        'admitted_at', st.admitted_at,
        'program_id', st.program_id,
        'program_code', COALESCE(p.code, '—'),
        'program_name', COALESCE(p.name, 'No program assigned'),
        'term_id', v_term_id,
        'term_label', COALESCE((
            SELECT tt.label || ' - ' || sy.label
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE t.id = v_term_id AND t.deleted_at IS NULL
        ), 'No active term'),
        'current_load', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'enrollment_id', e.id,
                'section_id', s.id,
                'section_code', s.section_code,
                'course_code', c.code,
                'course_title', c.title,
                'units', c.total_units,
                'status', e.status,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'faculty_name', COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned'),
                'schedule_label', COALESCE((
                    SELECT string_agg(
                        ss.day_of_week::TEXT || ' ' ||
                        to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                        to_char(ss.time_end, 'HH12:MI AM'),
                        ', ' ORDER BY ss.day_of_week, ss.time_start
                    )
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                ), 'No schedule set')
            ) ORDER BY c.code)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
            WHERE e.student_id = st.id
            AND e.deleted_at IS NULL
            AND e.status NOT IN ('Dropped', 'Withdrawn')
            AND s.term_id = v_term_id
        ), '[]'::JSONB)
    ) INTO v_result
    FROM public.students st
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_eligible_sections(
    p_student_id uuid,
    p_term_id uuid DEFAULT NULL,
    p_search text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
    v_term_id     UUID := p_term_id;
    v_program_id  UUID;
    v_year_level  SMALLINT;
    v_term_type   UUID;
BEGIN
    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT program_id, year_level INTO v_program_id, v_year_level
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL OR v_term_id IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    SELECT term_type_id INTO v_term_type
    FROM public.terms
    WHERE id = v_term_id AND deleted_at IS NULL;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            to_jsonb(y) ORDER BY y.is_recommended DESC, y.course_code, y.section_code
        ), '[]'::JSONB)
        FROM (
            SELECT
                x.*,
                (x.slots_taken >= x.max_slots) AS is_full
            FROM (
                SELECT
                    s.id AS section_id,
                    s.section_code,
                    s.status::TEXT AS section_status,
                    c.id AS course_id,
                    c.code AS course_code,
                    c.title AS course_title,
                    c.total_units AS units,
                    COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned') AS faculty_name,
                    COALESCE(s.room, '—') AS room,
                    s.max_slots::INT AS max_slots,
                    (
                        SELECT COUNT(*)::INT
                        FROM public.enrollments e2
                        WHERE e2.section_id = s.id
                        AND e2.deleted_at IS NULL
                        AND e2.status NOT IN ('Dropped', 'Withdrawn')
                    ) AS slots_taken,
                    cm.year_level::INT AS curriculum_year_level,
                    cm.is_elective,
                    (
                        cm.year_level = v_year_level
                        AND (cm.term_type_id IS NULL OR cm.term_type_id = v_term_type)
                    ) AS is_recommended,
                    public.fn_get_schedule_conflicts(p_student_id, s.id) AS conflict_with,
                    public.fn_get_unmet_prerequisites(p_student_id, c.id) AS unmet_prerequisites,
                    COALESCE((
                        SELECT string_agg(
                            ss.day_of_week::TEXT || ' ' ||
                            to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                            to_char(ss.time_end, 'HH12:MI AM'),
                            ', ' ORDER BY ss.day_of_week, ss.time_start
                        )
                        FROM public.section_schedules ss
                        WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                    ), 'No schedule set') AS schedule_label
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                INNER JOIN LATERAL (
                    SELECT cmi.year_level, cmi.sequence, cmi.is_elective, cmi.term_type_id
                    FROM public.curriculum_maps cmi
                    WHERE cmi.course_id = c.id
                    AND cmi.program_id = v_program_id
                    AND cmi.deleted_at IS NULL
                    ORDER BY cmi.year_level, cmi.sequence
                    LIMIT 1
                ) cm ON TRUE
                LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
                WHERE s.deleted_at IS NULL
                AND s.term_id = v_term_id
                AND s.status NOT IN ('Closed', 'Cancelled')
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s3 ON s3.id = e.section_id AND s3.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status IN ('Enrolled', 'Completed')
                    AND s3.course_id = c.id
                )
                AND (
                    p_search IS NULL
                    OR p_search = ''
                    OR c.code ILIKE '%' || p_search || '%'
                    OR c.title ILIKE '%' || p_search || '%'
                    OR s.section_code ILIKE '%' || p_search || '%'
                )
            ) x
        ) y
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(
    p_student_id uuid,
    p_section_id uuid,
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL,
    p_override_prerequisites boolean DEFAULT false
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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

    IF v_conflicts IS NOT NULL AND NOT p_allow_conflict THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SCHEDULE_CONFLICT',
            'message', v_section.section_code || ' conflicts with ' || v_conflicts || '.'
        );
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
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_student(
    p_student_id uuid,
    p_section_ids uuid[],
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL,
    p_override_prerequisites boolean DEFAULT false
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_section_id UUID;
    v_outcome    JSONB;
    v_enrolled   INTEGER := 0;
    v_errors     JSONB := '[]'::JSONB;
    v_total      INTEGER := COALESCE(array_length(p_section_ids, 1), 0);
BEGIN
    IF v_total = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Select at least one section to enroll.',
            'enrolled_count', 0,
            'errors', v_errors
        );
    END IF;

    FOREACH v_section_id IN ARRAY p_section_ids
    LOOP
        BEGIN
            v_outcome := public.fn_enroll_student_section(
                p_student_id,
                v_section_id,
                p_allow_conflict,
                p_conflict_reason,
                p_override_prerequisites
            );

            IF (v_outcome->>'success')::BOOLEAN THEN
                v_enrolled := v_enrolled + 1;
            ELSE
                v_errors := v_errors || jsonb_build_object(
                    'section_id', v_section_id,
                    'code', v_outcome->>'code',
                    'message', v_outcome->>'message'
                );
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'section_id', v_section_id,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    IF v_enrolled = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No sections were enrolled. ' || (v_errors->0->>'message'),
            'enrolled_count', 0,
            'errors', v_errors
        );
    END IF;

    IF jsonb_array_length(v_errors) > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', v_enrolled || ' of ' || v_total || ' sections enrolled. ' ||
                jsonb_array_length(v_errors) || ' were skipped.',
            'enrolled_count', v_enrolled,
            'errors', v_errors
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student enrolled in ' || v_enrolled || ' section(s).',
        'enrolled_count', v_enrolled,
        'errors', v_errors
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_enroll_students(p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
                WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
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
                WHERE section_code = v_code
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
$$;

CREATE OR REPLACE FUNCTION public.fn_drop_enrollment(
    p_enrollment_id uuid,
    p_drop_reason text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_section_code TEXT;
BEGIN
    SELECT s.section_code INTO v_section_code
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET status = 'Dropped'::public.enrollment_status_type,
        dropped_at = now(),
        drop_reason = NULLIF(trim(COALESCE(p_drop_reason, '')), ''),
        updated_by = auth.uid()
    WHERE id = p_enrollment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Dropped ' || v_section_code || '.');
END;
$$;
