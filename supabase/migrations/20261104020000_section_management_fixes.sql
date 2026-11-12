-- ====================================================================
-- Migration: 20261104020000_section_management_fixes.sql
--   * fn_list_sections_json: new optional p_program_ids filter (sections whose course is in
--     one of the programs' curriculum) and a program_code column, so the Program filter works
--     and sorting by Program no longer fails
--   * fn_update_section: Max Slots cannot go below the students already enrolled, and the
--     course or term cannot change while students are enrolled
--   * fn_save_section_schedules: refuses faculty and room clashes in the term (same check as
--     fn_check_section_schedule_conflicts) and end times that are not after the start time
--   * fn_parse_schedule_days / fn_parse_schedule_time: shared parsers for the CSV import.
--     Days accept full or short names and compact forms (MWF, TTh, M/W, Mon Wed); times accept
--     HH:MM, HH:MM:SS and 12-hour "8:00 AM"
--   * fn_bulk_create_sections: uses the parsers, reports unrecognised days or times per row
--     instead of saving no schedule, and returns section_id on each saved row
--   * fn_get_section_by_id: returns is_grading_overridden and the section's grading periods,
--     so the wizard shows an existing override
--   * fn_reset_section_grading_override: puts a section back on the term's default grading
--     (periods with grades or assessments are left alone)
-- Idempotent: functions are CREATE OR REPLACE; the old fn_list_sections_json signature is
-- dropped first because a parameter was added.
-- ====================================================================
BEGIN;

-- fn_list_sections_json (adds p_program_ids)
DROP FUNCTION IF EXISTS public.fn_list_sections_json(integer, integer, text, jsonb, uuid[], uuid[], text[]);

CREATE OR REPLACE FUNCTION public.fn_list_sections_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_ids uuid[] DEFAULT NULL::uuid[], p_course_ids uuid[] DEFAULT NULL::uuid[], p_statuses text[] DEFAULT NULL::text[], p_program_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
    v_dean_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    IF v_dean_dept_id IS NOT NULL THEN
        v_where := v_where || format(' AND c.department_id = %L', v_dean_dept_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND s.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.section_status_type[])';
    END IF;

    -- A section belongs to a program when its course is in that program's curriculum
    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND EXISTS (SELECT 1 FROM public.curriculum_maps cmf'
            || ' WHERE cmf.course_id = s.course_id AND cmf.deleted_at IS NULL'
            || ' AND cmf.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[]))';
    END IF;

    v_base_query := format(
        'SELECT
            s.id,
            s.section_code,
            s.term_id,
            tt.label || '' - '' || sy.label AS term_label,
            (
                SELECT string_agg(DISTINCT p.code, '', '' ORDER BY p.code)
                FROM public.curriculum_maps cm
                INNER JOIN public.programs p ON p.id = cm.program_id AND p.deleted_at IS NULL
                WHERE cm.course_id = s.course_id
                AND cm.deleted_at IS NULL
            ) AS program_code,
            s.course_id,
            c.code AS course_code,
            c.title AS course_title,
            s.faculty_id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            s.room,
            s.max_slots,
            (
                SELECT COUNT(*)
                FROM public.enrollments e
                WHERE e.section_id = s.id
                AND e.deleted_at IS NULL
                AND e.status NOT IN (''Dropped'', ''Withdrawn'')
            ) AS enrolled_count,
            s.status,
            COALESCE(sy.is_active, false) AS is_active_academic_year,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.created_at DESC');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_sections_json(integer, integer, text, jsonb, uuid[], uuid[], text[], uuid[]) TO authenticated, service_role;

-- fn_update_section
CREATE OR REPLACE FUNCTION public.fn_update_section(
    p_section_id uuid,
    p_term_id uuid,
    p_course_id uuid,
    p_faculty_id uuid,
    p_section_code text,
    p_room text,
    p_max_slots smallint,
    p_status public.section_status_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_old_term_id UUID;
    v_old_course_id UUID;
    v_enrolled INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be modified.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot move a section to a term outside the active academic year.');
    END IF;

    -- Lock the section so an enrollment cannot slip in while it is checked
    SELECT term_id, course_id INTO v_old_term_id, v_old_course_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL
    FOR UPDATE;

    SELECT COUNT(*) INTO v_enrolled
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn');

    IF v_enrolled > 0 AND (v_old_term_id IS DISTINCT FROM p_term_id OR v_old_course_id IS DISTINCT FROM p_course_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('The course and term cannot change while %s student(s) are enrolled in this section.', v_enrolled)
        );
    END IF;

    IF COALESCE(p_max_slots, 40) < v_enrolled THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Max Slots cannot be lower than the %s student(s) already enrolled.', v_enrolled)
        );
    END IF;

    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND id <> p_section_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    -- Update fields without touching section_code
    UPDATE public.sections
    SET term_id = p_term_id,
        course_id = p_course_id,
        faculty_id = p_faculty_id,
        room = NULLIF(btrim(p_room), ''),
        max_slots = COALESCE(p_max_slots, 40),
        status = COALESCE(p_status, 'Open'::public.section_status_type),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section updated successfully.'
    );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_update_section(uuid, uuid, uuid, uuid, text, text, smallint, public.section_status_type) TO authenticated, anon, service_role;

-- fn_save_section_schedules
CREATE OR REPLACE FUNCTION public.fn_save_section_schedules(
    p_section_id UUID,
    p_schedules JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_item JSONB;
    v_term_id UUID;
    v_faculty_id UUID;
    v_room TEXT;
    v_conflict TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT term_id, faculty_id, room INTO v_term_id, v_faculty_id, v_room
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF p_schedules IS NOT NULL AND jsonb_typeof(p_schedules) = 'array' THEN
        IF EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_schedules) slot
            WHERE (slot->>'time_end')::TIME <= (slot->>'time_start')::TIME
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Each schedule end time must be after its start time.');
        END IF;

        -- Same rule as fn_check_section_schedule_conflicts: no faculty or room double-booking
        WITH slots AS (
            SELECT
                (slot->>'day_of_week')::public.day_of_week_type AS day_of_week,
                (slot->>'time_start')::TIME AS time_start,
                (slot->>'time_end')::TIME AS time_end,
                upper(btrim(COALESCE(NULLIF(slot->>'room', ''), NULLIF(v_room, '')))) AS room
            FROM jsonb_array_elements(p_schedules) slot
        ),
        existing AS (
            SELECT
                s.section_code,
                s.faculty_id,
                ss.day_of_week,
                ss.time_start,
                ss.time_end,
                upper(btrim(COALESCE(ss.room, s.room))) AS room
            FROM public.section_schedules ss
            INNER JOIN public.sections s ON s.id = ss.section_id AND s.deleted_at IS NULL
            WHERE ss.deleted_at IS NULL
              AND s.term_id = v_term_id
              AND s.id <> p_section_id
        )
        SELECT string_agg(DISTINCT format('%s %s-%s with %s (%s)',
                   e.day_of_week, to_char(e.time_start, 'HH12:MI AM'), to_char(e.time_end, 'HH12:MI AM'),
                   e.section_code,
                   CASE WHEN v_faculty_id IS NOT NULL AND e.faculty_id = v_faculty_id
                        THEN 'same faculty' ELSE 'room ' || e.room END), '; ')
        INTO v_conflict
        FROM slots n
        INNER JOIN existing e
            ON e.day_of_week = n.day_of_week
           AND e.time_start < n.time_end
           AND n.time_start < e.time_end
        WHERE (v_faculty_id IS NOT NULL AND e.faculty_id = v_faculty_id)
           OR (n.room IS NOT NULL AND n.room <> '' AND e.room = n.room);

        IF v_conflict IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Schedule conflict: ' || v_conflict || '.');
        END IF;
    END IF;

    -- Soft delete existing section schedule slots
    UPDATE public.section_schedules
    SET deleted_at = NOW(),
        deleted_by = auth.uid()
    WHERE section_id = p_section_id
      AND deleted_at IS NULL;

    IF p_schedules IS NOT NULL AND jsonb_typeof(p_schedules) = 'array' AND jsonb_array_length(p_schedules) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_schedules) LOOP
            INSERT INTO public.section_schedules (
                section_id,
                day_of_week,
                time_start,
                time_end,
                room,
                created_by
            ) VALUES (
                p_section_id,
                (v_item->>'day_of_week')::public.day_of_week_type,
                (v_item->>'time_start')::TIME,
                (v_item->>'time_end')::TIME,
                NULLIF(v_item->>'room', ''),
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$function$;

-- fn_parse_schedule_days: NULL when any part is not a recognised day
CREATE OR REPLACE FUNCTION public.fn_parse_schedule_days(p_days text)
 RETURNS public.day_of_week_type[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_days public.day_of_week_type[] := ARRAY[]::public.day_of_week_type[];
    v_token TEXT;
    v_rest TEXT;
    v_day public.day_of_week_type;
BEGIN
    IF p_days IS NULL OR btrim(p_days) = '' THEN
        RETURN v_days;
    END IF;

    FOR v_token IN SELECT lower(t) FROM regexp_split_to_table(btrim(p_days), '[,;/\s]+') t WHERE t <> '' LOOP
        v_day := CASE
            WHEN v_token IN ('monday', 'mon') THEN 'Monday'
            WHEN v_token IN ('tuesday', 'tue', 'tues') THEN 'Tuesday'
            WHEN v_token IN ('wednesday', 'wed') THEN 'Wednesday'
            WHEN v_token IN ('thursday', 'thu', 'thur', 'thurs') THEN 'Thursday'
            WHEN v_token IN ('friday', 'fri') THEN 'Friday'
            WHEN v_token IN ('saturday', 'sat') THEN 'Saturday'
            WHEN v_token IN ('sunday', 'sun') THEN 'Sunday'
        END::public.day_of_week_type;

        IF v_day IS NOT NULL THEN
            IF NOT v_day = ANY(v_days) THEN
                v_days := v_days || v_day;
            END IF;
            CONTINUE;
        END IF;

        -- Compact letters such as MWF, TTh, TuTh, SaSu
        v_rest := v_token;
        WHILE v_rest <> '' LOOP
            IF v_rest LIKE 'th%' THEN
                v_day := 'Thursday';
                v_rest := substr(v_rest, 3);
            ELSIF v_rest LIKE 'tu%' THEN
                v_day := 'Tuesday';
                v_rest := substr(v_rest, 3);
            ELSIF v_rest LIKE 'su%' THEN
                v_day := 'Sunday';
                v_rest := substr(v_rest, 3);
            ELSIF v_rest LIKE 'sa%' THEN
                v_day := 'Saturday';
                v_rest := substr(v_rest, 3);
            ELSE
                v_day := CASE left(v_rest, 1)
                    WHEN 'm' THEN 'Monday'
                    WHEN 't' THEN 'Tuesday'
                    WHEN 'w' THEN 'Wednesday'
                    WHEN 'r' THEN 'Thursday'
                    WHEN 'f' THEN 'Friday'
                    WHEN 's' THEN 'Saturday'
                END::public.day_of_week_type;
                v_rest := substr(v_rest, 2);
            END IF;

            IF v_day IS NULL THEN
                RETURN NULL;
            END IF;

            IF NOT v_day = ANY(v_days) THEN
                v_days := v_days || v_day;
            END IF;
        END LOOP;
    END LOOP;

    RETURN v_days;
END;
$function$;

-- fn_parse_schedule_time: NULL when the text is not a time
CREATE OR REPLACE FUNCTION public.fn_parse_schedule_time(p_time text)
 RETURNS time
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
    v_text TEXT := upper(regexp_replace(btrim(COALESCE(p_time, '')), '\.', '', 'g'));
    v_match TEXT[];
    v_hour INTEGER;
BEGIN
    -- 24-hour HH:MM or HH:MM:SS
    v_match := regexp_match(v_text, '^([01]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$');
    IF v_match IS NOT NULL THEN
        RETURN make_time(v_match[1]::INTEGER, v_match[2]::INTEGER, 0);
    END IF;

    -- 12-hour 8:00 AM, 8 PM, 08:30:00 PM
    v_match := regexp_match(v_text, '^(0?[1-9]|1[0-2])(:([0-5][0-9]))?(:[0-5][0-9])?\s*(AM|PM)$');
    IF v_match IS NOT NULL THEN
        v_hour := v_match[1]::INTEGER % 12;
        IF v_match[5] = 'PM' THEN
            v_hour := v_hour + 12;
        END IF;
        RETURN make_time(v_hour, COALESCE(v_match[3], '0')::INTEGER, 0);
    END IF;

    RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_parse_schedule_days(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_parse_schedule_time(text) TO authenticated, service_role;

-- fn_bulk_create_sections
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
    v_created_rows JSONB := '[]'::JSONB;
    v_updated_rows JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_created_count INTEGER := 0;
    v_updated_count INTEGER := 0;
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

    -- Old state for diff tracking
    v_old_room TEXT;
    v_old_max_slots SMALLINT;
    v_old_faculty_email TEXT;
    v_old_course_code TEXT;
    v_changes JSONB;

    -- Schedule processing
    v_days public.day_of_week_type[];
    v_start_time TIME;
    v_end_time TIME;
    v_sched_room TEXT;
    v_conflict TEXT;
    v_day_name public.day_of_week_type;

    -- Counters as they were before the current row, restored if the row fails part-way
    v_saved_created_count INTEGER;
    v_saved_updated_count INTEGER;
    v_saved_created_rows JSONB;
    v_saved_updated_rows JSONB;
    v_time_message TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;
        v_saved_created_count := v_created_count;
        v_saved_updated_count := v_updated_count;
        v_saved_created_rows := v_created_rows;
        v_saved_updated_rows := v_updated_rows;

        -- Schedule days and times are checked before anything is saved
        v_time_message := NULL;
        v_days := ARRAY[]::public.day_of_week_type[];
        v_start_time := NULL;
        v_end_time := NULL;
        IF COALESCE(trim(v_row->>'schedule_days'), '') <> '' THEN
            v_days := public.fn_parse_schedule_days(v_row->>'schedule_days');
            v_start_time := public.fn_parse_schedule_time(v_row->>'schedule_time_start');
            v_end_time := public.fn_parse_schedule_time(v_row->>'schedule_time_end');

            IF v_days IS NULL OR cardinality(v_days) = 0 THEN
                v_time_message := format('Schedule days "%s" not recognised. Use day names or letters, e.g. Monday, Wednesday or MWF or TTh.', v_row->>'schedule_days');
            ELSIF v_start_time IS NULL OR v_end_time IS NULL THEN
                v_time_message := 'Schedule start and end times are required with schedule days, e.g. 08:00 or 8:00 AM.';
            ELSIF v_end_time <= v_start_time THEN
                v_time_message := 'Schedule end time must be after the start time.';
            END IF;
        ELSIF COALESCE(trim(v_row->>'schedule_time_start'), '') <> '' OR COALESCE(trim(v_row->>'schedule_time_end'), '') <> '' THEN
            v_time_message := 'Schedule days are required when a schedule time is given.';
        END IF;

        IF v_time_message IS NOT NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'INVALID_SCHEDULE',
                'message', v_time_message
            );
            CONTINUE;
        END IF;

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
                -- Fetch old state for diffing
                SELECT s.room, s.max_slots, c.code, u.email, s.section_code
                INTO v_old_room, v_old_max_slots, v_old_course_code, v_old_faculty_email, v_section_code
                FROM public.sections s
                LEFT JOIN public.courses c ON c.id = s.course_id
                LEFT JOIN public.users u ON u.id = s.faculty_id
                WHERE s.id = v_section_id;

                v_changes := '[]'::JSONB;

                IF COALESCE(v_old_room, '') <> COALESCE(trim(v_row->>'room'), '') AND trim(COALESCE(v_row->>'room', '')) <> '' THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Room',
                        'previous', COALESCE(v_old_room, 'None'),
                        'changed', trim(v_row->>'room')
                    );
                END IF;

                IF v_old_max_slots IS DISTINCT FROM v_max_slots THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Max Slots',
                        'previous', COALESCE(v_old_max_slots::text, '40'),
                        'changed', v_max_slots::text
                    );
                END IF;

                IF COALESCE(v_old_faculty_email, '') <> COALESCE(trim(v_row->>'faculty_email'), '') AND trim(COALESCE(v_row->>'faculty_email', '')) <> '' THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Faculty Email',
                        'previous', COALESCE(v_old_faculty_email, 'Unassigned'),
                        'changed', trim(v_row->>'faculty_email')
                    );
                END IF;

                UPDATE public.sections
                SET course_id = v_course_id,
                    faculty_id = COALESCE(v_faculty_id, faculty_id),
                    room = COALESCE(nullif(trim(v_row->>'room'), ''), room),
                    max_slots = v_max_slots,
                    updated_at = NOW(),
                    updated_by = auth.uid()
                WHERE id = v_section_id;

                v_updated_count := v_updated_count + 1;
                v_updated_rows := v_updated_rows || jsonb_build_object(
                    'row', v_index,
                    'section_id', v_section_id,
                    'section_code', v_section_code,
                    'course_code', trim(v_row->>'course_code'),
                    'faculty_email', coalesce(trim(v_row->>'faculty_email'), ''),
                    'room', coalesce(trim(v_row->>'room'), ''),
                    'max_slots', v_max_slots,
                    'changes', v_changes,
                    'message', 'Updated existing section offering'
                );
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

                v_created_count := v_created_count + 1;
                v_created_rows := v_created_rows || jsonb_build_object(
                    'row', v_index,
                    'section_id', v_section_id,
                    'section_code', v_section_code,
                    'course_code', trim(v_row->>'course_code'),
                    'faculty_email', coalesce(trim(v_row->>'faculty_email'), ''),
                    'room', coalesce(trim(v_row->>'room'), ''),
                    'max_slots', v_max_slots,
                    'message', 'Created new section offering'
                );
            END IF;

            -- Schedule slots, one per parsed day
            IF cardinality(v_days) > 0 THEN
                v_sched_room := COALESCE(NULLIF(trim(v_row->>'schedule_room'), ''), NULLIF(trim(v_row->>'room'), ''));

                UPDATE public.section_schedules
                SET deleted_at = NOW(),
                    deleted_by = auth.uid()
                WHERE section_id = v_section_id AND deleted_at IS NULL;

                FOREACH v_day_name IN ARRAY v_days LOOP
                    INSERT INTO public.section_schedules (
                        section_id,
                        day_of_week,
                        time_start,
                        time_end,
                        room,
                        created_by
                    ) VALUES (
                        v_section_id,
                        v_day_name,
                        v_start_time,
                        v_end_time,
                        v_sched_room,
                        auth.uid()
                    );
                END LOOP;
            END IF;

            -- Same check as the section wizard: no faculty or room double-booking in the term
            SELECT string_agg(DISTINCT format('%s %s-%s with %s (%s)',
                       n.day_of_week, to_char(n.time_start, 'HH24:MI'), to_char(n.time_end, 'HH24:MI'),
                       es.section_code,
                       CASE WHEN ns.faculty_id IS NOT NULL AND es.faculty_id = ns.faculty_id
                            THEN 'same faculty' ELSE 'same room' END), '; ')
            INTO v_conflict
            FROM public.section_schedules n
            INNER JOIN public.sections ns ON ns.id = n.section_id
            INNER JOIN public.sections es ON es.term_id = ns.term_id AND es.id <> ns.id AND es.deleted_at IS NULL
            INNER JOIN public.section_schedules e ON e.section_id = es.id AND e.deleted_at IS NULL
                AND e.day_of_week = n.day_of_week
                AND e.time_start < n.time_end
                AND n.time_start < e.time_end
            WHERE n.section_id = v_section_id
              AND n.deleted_at IS NULL
              AND (
                  (ns.faculty_id IS NOT NULL AND es.faculty_id = ns.faculty_id)
                  OR (
                      COALESCE(btrim(COALESCE(n.room, ns.room)), '') <> ''
                      AND upper(btrim(COALESCE(e.room, es.room))) = upper(btrim(COALESCE(n.room, ns.room)))
                  )
              );

            IF v_conflict IS NOT NULL THEN
                RAISE EXCEPTION 'Schedule conflict: %', v_conflict;
            END IF;

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            -- The row's changes were rolled back; so is its count
            v_created_count := v_saved_created_count;
            v_updated_count := v_saved_updated_count;
            v_created_rows := v_saved_created_rows;
            v_updated_rows := v_saved_updated_rows;
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', CASE WHEN SQLERRM LIKE 'Schedule conflict:%' THEN 'SCHEDULE_CONFLICT' ELSE 'DB_ERROR' END,
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_index,
        'provisioned', v_provisioned,
        'created_count', v_created_count,
        'updated_count', v_updated_count,
        'created_rows', v_created_rows,
        'updated_rows', v_updated_rows,
        'skipped', jsonb_array_length(v_errors),
        'errors', v_errors
    );
END;
$function$;

-- fn_get_section_by_id (adds is_grading_overridden and grading_periods)
CREATE OR REPLACE FUNCTION public.fn_get_section_by_id(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    WITH section_components AS (
        SELECT gp.id AS period_id, gp.name AS period_name, gp.sequence, gp.weight AS period_weight,
               gc.name, gc.weight
        FROM public.sections s
        INNER JOIN public.grading_periods gp ON gp.term_id = s.term_id AND gp.deleted_at IS NULL
        INNER JOIN public.grading_components gc
            ON gc.section_id = s.id AND gc.grading_period_id = gp.id AND gc.deleted_at IS NULL
        WHERE s.id = p_section_id
    ),
    -- What fn_seed_section_grading would give each period
    default_components AS (
        SELECT gp.id AS period_id, btrim(c->>'name') AS name, (c->>'weight')::NUMERIC AS weight
        FROM public.sections s
        INNER JOIN public.grading_periods gp ON gp.term_id = s.term_id AND gp.deleted_at IS NULL
        CROSS JOIN LATERAL jsonb_array_elements(
            CASE WHEN jsonb_typeof(gp.components) = 'array' THEN gp.components ELSE '[]'::JSONB END
        ) c
        WHERE s.id = p_section_id
          AND btrim(COALESCE(c->>'name', '')) <> ''
          AND COALESCE(NULLIF(c->>'weight', '')::NUMERIC, 0) > 0
        UNION ALL
        SELECT gp.id, gct.name, gct.weight
        FROM public.sections s
        INNER JOIN public.grading_periods gp ON gp.term_id = s.term_id AND gp.deleted_at IS NULL
        INNER JOIN public.grading_period_templates gpt ON gpt.sequence = gp.sequence AND gpt.deleted_at IS NULL
        INNER JOIN public.grading_component_templates gct
            ON gct.grading_period_template_id = gpt.id AND gct.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND NOT (jsonb_typeof(gp.components) = 'array' AND jsonb_array_length(gp.components) > 0)
    ),
    section_sets AS (
        SELECT period_id, string_agg(lower(btrim(name)) || ':' || round(weight, 2)::TEXT, '|' ORDER BY lower(btrim(name)), weight) AS signature
        FROM section_components
        GROUP BY period_id
    ),
    default_sets AS (
        SELECT period_id, string_agg(lower(btrim(name)) || ':' || round(weight, 2)::TEXT, '|' ORDER BY lower(btrim(name)), weight) AS signature
        FROM default_components
        GROUP BY period_id
    )
    SELECT jsonb_build_object(
        'id',          s.id,
        'term_id',     s.term_id,
        'course_id',   s.course_id,
        'faculty_id',  s.faculty_id,
        'section_code', s.section_code,
        'room',        s.room,
        'max_slots',   s.max_slots,
        'status',      s.status,
        'is_active_academic_year', COALESCE((
            SELECT sy.is_active
            FROM public.terms t
            JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE t.id = s.term_id AND t.deleted_at IS NULL
        ), false),
        'schedules', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', sch.id,
                'day_of_week', sch.day_of_week,
                'time_start', sch.time_start::text,
                'time_end', sch.time_end::text,
                'room', sch.room
            ) ORDER BY CASE sch.day_of_week
                WHEN 'Monday' THEN 1
                WHEN 'Tuesday' THEN 2
                WHEN 'Wednesday' THEN 3
                WHEN 'Thursday' THEN 4
                WHEN 'Friday' THEN 5
                WHEN 'Saturday' THEN 6
                WHEN 'Sunday' THEN 7
            END, sch.time_start)
            FROM public.section_schedules sch
            WHERE sch.section_id = s.id AND sch.deleted_at IS NULL
        ), '[]'::jsonb),
        'is_grading_overridden', EXISTS (
            SELECT 1
            FROM section_sets ss
            LEFT JOIN default_sets ds ON ds.period_id = ss.period_id
            WHERE ds.signature IS DISTINCT FROM ss.signature
        ),
        'grading_periods', COALESCE((
            SELECT jsonb_agg(period ORDER BY (period->>'sequence')::INTEGER)
            FROM (
                SELECT jsonb_build_object(
                    'name', sc.period_name,
                    'sequence', sc.sequence,
                    'weight', sc.period_weight,
                    'components', jsonb_agg(jsonb_build_object('name', sc.name, 'weight', sc.weight) ORDER BY sc.name)
                ) AS period
                FROM section_components sc
                GROUP BY sc.period_id, sc.period_name, sc.sequence, sc.period_weight
            ) periods
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.sections s
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_section_by_id(uuid) TO authenticated, service_role;

-- fn_reset_section_grading_override
CREATE OR REPLACE FUNCTION public.fn_reset_section_grading_override(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_department_id UUID;
    v_dean_department_id UUID := public.fn_get_dean_department_id();
    v_skipped TEXT[] := ARRAY[]::TEXT[];
    v_period RECORD;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT s.term_id, c.department_id INTO v_term_id, v_department_id
    FROM public.sections s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id
      AND s.deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF v_dean_department_id IS NOT NULL AND v_department_id IS DISTINCT FROM v_dean_department_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only change grading for sections in your department.');
    END IF;

    FOR v_period IN
        SELECT gp.id, gp.name
        FROM public.grading_periods gp
        WHERE gp.term_id = v_term_id
          AND gp.deleted_at IS NULL
    LOOP
        -- Same protection as fn_save_section_grading_override
        IF public.fn_is_section_grading_locked(p_section_id, v_period.id)
           OR EXISTS (
               SELECT 1
               FROM public.assessment_items ai
               JOIN public.grading_components gc ON gc.id = ai.grading_component_id
               WHERE gc.section_id = p_section_id
                 AND gc.grading_period_id = v_period.id
                 AND gc.deleted_at IS NULL
                 AND ai.deleted_at IS NULL
           ) THEN
            v_skipped := array_append(v_skipped, v_period.name);
            CONTINUE;
        END IF;

        UPDATE public.grading_components
        SET deleted_at = NOW(),
            deleted_by = auth.uid()
        WHERE section_id = p_section_id
          AND grading_period_id = v_period.id
          AND deleted_at IS NULL;
    END LOOP;

    -- Seeds the default components for every period that now has none
    PERFORM public.fn_seed_section_grading(p_section_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN array_length(v_skipped, 1) IS NULL THEN 'Section grading reset to the default.'
            ELSE format('Section grading reset to the default, except %s (already graded or used by assessments).', array_to_string(v_skipped, ', '))
        END
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_reset_section_grading_override(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_reset_section_grading_override(uuid) TO authenticated, service_role;

COMMIT;
