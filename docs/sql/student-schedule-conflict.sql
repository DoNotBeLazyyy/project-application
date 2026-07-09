ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS is_conflict_authorized BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS conflict_authorized_by UUID;

ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS conflict_authorized_at TIMESTAMPTZ;

ALTER TABLE public.enrollments
    ADD COLUMN IF NOT EXISTS conflict_reason TEXT;

CREATE OR REPLACE FUNCTION public.fn_get_schedule_conflicts(p_student_id uuid, p_section_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
    SELECT string_agg(DISTINCT conflict_label, ', ' ORDER BY conflict_label)
    FROM (
        SELECT c.code || ' (' || s.section_code || ')' AS conflict_label
        FROM public.section_schedules target_ss
        INNER JOIN public.enrollments e
            ON e.student_id = p_student_id
            AND e.section_id <> p_section_id
            AND e.status = 'Enrolled'
            AND e.deleted_at IS NULL
        INNER JOIN public.sections s
            ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.sections target_s
            ON target_s.id = p_section_id AND target_s.deleted_at IS NULL
        INNER JOIN public.courses c
            ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.section_schedules existing_ss
            ON existing_ss.section_id = s.id
            AND existing_ss.deleted_at IS NULL
            AND existing_ss.day_of_week = target_ss.day_of_week
            AND target_ss.time_start < existing_ss.time_end
            AND existing_ss.time_start < target_ss.time_end
        WHERE target_ss.section_id = p_section_id
        AND target_ss.deleted_at IS NULL
        AND s.term_id = target_s.term_id
    ) conflicts;
$$;

DROP FUNCTION IF EXISTS public.fn_create_enrollment(uuid, uuid);

CREATE OR REPLACE FUNCTION public.fn_create_enrollment(
    p_student_id uuid,
    p_section_id uuid,
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_max_slots   SMALLINT;
    v_enrolled    INTEGER;
    v_conflicts   TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND status NOT IN ('Dropped', 'Withdrawn')
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is already enrolled in this section.');
    END IF;

    SELECT max_slots INTO v_max_slots
    FROM public.sections
    WHERE id = p_section_id AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_enrolled
    FROM public.enrollments
    WHERE section_id = p_section_id
    AND status NOT IN ('Dropped', 'Withdrawn')
    AND deleted_at IS NULL;

    IF v_enrolled >= v_max_slots THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section is already full.');
    END IF;

    v_conflicts := public.fn_get_schedule_conflicts(p_student_id, p_section_id);

    IF v_conflicts IS NOT NULL AND NOT p_allow_conflict THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Schedule conflict with ' || v_conflicts || '. Authorize the conflict to enroll anyway.'
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

    IF v_conflicts IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Student enrolled with an authorized schedule conflict against ' || v_conflicts || '.'
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Student enrolled successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_enrollments(p_enrollments jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_row            JSONB;
    v_index          INTEGER := 0;
    v_errors         JSONB := '[]'::JSONB;
    v_provisioned    INTEGER := 0;
    v_student_id     UUID;
    v_section_id     UUID;
    v_term_id        UUID;
    v_max_slots      SMALLINT;
    v_enrolled       INTEGER;
    v_conflicts      TEXT;
    v_allow_conflict BOOLEAN;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_enrollments)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE student_number = trim(v_row->>'student_number') AND deleted_at IS NULL
            LIMIT 1;

            IF v_student_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'STUDENT_NOT_FOUND',
                    'message', 'Student not found: ' || coalesce(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT t.id INTO v_term_id
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_section_id
            FROM public.sections
            WHERE section_code = trim(v_row->>'section_code')
            AND term_id = v_term_id
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_section_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SECTION_NOT_FOUND',
                    'message', 'Section not found: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.enrollments
                WHERE student_id = v_student_id
                AND section_id = v_section_id
                AND status NOT IN ('Dropped', 'Withdrawn')
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'ALREADY_ENROLLED',
                    'message', 'Student already enrolled in section: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT max_slots INTO v_max_slots
            FROM public.sections WHERE id = v_section_id;

            SELECT COUNT(*) INTO v_enrolled
            FROM public.enrollments
            WHERE section_id = v_section_id
            AND status NOT IN ('Dropped', 'Withdrawn')
            AND deleted_at IS NULL;

            IF v_enrolled >= v_max_slots THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SECTION_FULL',
                    'message', 'Section is full: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_allow_conflict := COALESCE((v_row->>'allow_conflict')::BOOLEAN, false);
            v_conflicts := public.fn_get_schedule_conflicts(v_student_id, v_section_id);

            IF v_conflicts IS NOT NULL AND NOT v_allow_conflict THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SCHEDULE_CONFLICT',
                    'message', 'Schedule conflict with ' || v_conflicts || ' for section: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
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
                v_student_id,
                v_section_id,
                'Enrolled'::public.enrollment_status_type,
                now(),
                auth.uid(),
                v_conflicts IS NOT NULL,
                CASE WHEN v_conflicts IS NOT NULL THEN auth.uid() END,
                CASE WHEN v_conflicts IS NOT NULL THEN now() END,
                CASE WHEN v_conflicts IS NOT NULL THEN NULLIF(trim(COALESCE(v_row->>'conflict_reason', '')), '') END
            );

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_student_schedule() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'section_id',    s.id,
                'section_code',  s.section_code,
                'course_code',   c.code,
                'course_title',  c.title,
                'faculty_name',  u.first_name || ' ' || u.last_name,
                'enrollment_id', e.id,
                'is_conflict_authorized', e.is_conflict_authorized,
                'conflict_reason', e.conflict_reason,
                'schedules', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',         ss.id,
                            'day_of_week', ss.day_of_week,
                            'time_start', ss.time_start,
                            'time_end',   ss.time_end,
                            'room',       ss.room
                        )
                        ORDER BY ss.day_of_week ASC, ss.time_start ASC
                    ), '[]'::JSONB)
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                )
            )
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        WHERE e.student_id = v_student_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    );
END;
$$;
