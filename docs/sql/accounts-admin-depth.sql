CREATE OR REPLACE FUNCTION public.fn_get_my_profile()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_result  JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to view your profile.'
            USING ERRCODE = '28000';
    END IF;

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'middle_name', COALESCE(u.middle_name, ''),
        'last_name', u.last_name,
        'suffix', COALESCE(u.suffix, ''),
        'preferred_name', COALESCE(u.preferred_name, ''),
        'email', u.email,
        'mobile_number', COALESCE(u.mobile_number, ''),
        'address_line1', COALESCE(u.address_line1, ''),
        'address_line2', COALESCE(u.address_line2, ''),
        'city', COALESCE(u.city, ''),
        'province', COALESCE(u.province, ''),
        'postal_code', COALESCE(u.postal_code, ''),
        'date_of_birth', u.date_of_birth,
        'gender', COALESCE(u.gender::TEXT, ''),
        'civil_status', COALESCE(u.civil_status::TEXT, ''),
        'nationality', COALESCE(u.nationality, ''),
        'status', u.status,
        'role_labels', COALESCE((
            SELECT jsonb_agg(r.label ORDER BY r.label)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.users u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Profile not found for the signed-in account.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_update_my_profile(
    p_first_name text,
    p_middle_name text,
    p_last_name text,
    p_suffix text,
    p_preferred_name text,
    p_mobile_number text,
    p_address_line1 text,
    p_address_line2 text,
    p_city text,
    p_province text,
    p_postal_code text,
    p_date_of_birth date,
    p_gender text,
    p_civil_status text,
    p_nationality text
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'You must be signed in to update your profile.');
    END IF;

    IF btrim(COALESCE(p_first_name, '')) = '' OR btrim(COALESCE(p_last_name, '')) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'First name and last name are required.');
    END IF;

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        middle_name = NULLIF(btrim(COALESCE(p_middle_name, '')), ''),
        last_name = btrim(p_last_name),
        suffix = NULLIF(btrim(COALESCE(p_suffix, '')), ''),
        preferred_name = NULLIF(btrim(COALESCE(p_preferred_name, '')), ''),
        mobile_number = NULLIF(btrim(COALESCE(p_mobile_number, '')), ''),
        address_line1 = NULLIF(btrim(COALESCE(p_address_line1, '')), ''),
        address_line2 = NULLIF(btrim(COALESCE(p_address_line2, '')), ''),
        city = NULLIF(btrim(COALESCE(p_city, '')), ''),
        province = NULLIF(btrim(COALESCE(p_province, '')), ''),
        postal_code = NULLIF(btrim(COALESCE(p_postal_code, '')), ''),
        date_of_birth = p_date_of_birth,
        gender = NULLIF(btrim(COALESCE(p_gender, '')), '')::public.gender_type,
        civil_status = NULLIF(btrim(COALESCE(p_civil_status, '')), '')::public.civil_status_type,
        nationality = NULLIF(btrim(COALESCE(p_nationality, '')), '')
    WHERE id = v_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Profile not found for the signed-in account.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Your profile has been updated.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_apply_user_roles(p_user_id uuid, p_role_codes text[])
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_codes   TEXT[];
    v_missing TEXT;
BEGIN
    SELECT COALESCE(array_agg(DISTINCT btrim(code)), ARRAY[]::TEXT[])
    INTO v_codes
    FROM unnest(COALESCE(p_role_codes, ARRAY[]::TEXT[])) AS code
    WHERE btrim(COALESCE(code, '')) <> '';

    IF array_length(v_codes, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'A user must hold at least one role.');
    END IF;

    SELECT string_agg(c.code, ', ')
    INTO v_missing
    FROM unnest(v_codes) AS c(code)
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.roles r
        WHERE r.code = c.code
          AND r.deleted_at IS NULL
    );

    IF v_missing IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unknown role code: ' || v_missing);
    END IF;

    UPDATE public.user_roles ur
    SET deleted_at = now(),
        deleted_by = auth.uid(),
        revoked_at = now()
    WHERE ur.user_id = p_user_id
      AND ur.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = ur.role_id
            AND r.deleted_at IS NULL
            AND r.code = ANY (v_codes)
      );

    INSERT INTO public.user_roles (user_id, role_id, role_code, created_by)
    SELECT p_user_id, r.id, r.code, auth.uid()
    FROM public.roles r
    WHERE r.code = ANY (v_codes)
      AND r.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p_user_id
            AND ur.role_id = r.id
            AND ur.deleted_at IS NULL
            AND ur.revoked_at IS NULL
      );

    RETURN jsonb_build_object('success', true, 'roles', to_jsonb(v_codes));
END;
$$;

DROP FUNCTION IF EXISTS public.fn_update_user(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.fn_update_user(
    p_user_id uuid,
    p_first_name text,
    p_last_name text,
    p_role_codes text[]
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_user_id = auth.uid() AND NOT ('Admin' = ANY (COALESCE(p_role_codes, ARRAY[]::TEXT[]))) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You cannot remove the Admin role from your own account.'
        );
    END IF;

    UPDATE public.users
    SET first_name = btrim(p_first_name),
        last_name = btrim(p_last_name)
    WHERE id = p_user_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    v_result := public.fn_apply_user_roles(p_user_id, p_role_codes);

    IF NOT (v_result->>'success')::BOOLEAN THEN
        RETURN v_result;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_user_by_id(p_user_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'email', u.email,
        'status', u.status,
        'role_codes', COALESCE((
            SELECT jsonb_agg(r.code ORDER BY r.code)
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ), '[]'::JSONB)
    )
    INTO v_result
    FROM public.users u
    WHERE u.id = p_user_id
      AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_users_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_role_code text DEFAULT NULL::text,
    p_status text DEFAULT NULL::text,
    p_city text DEFAULT NULL::text,
    p_province text DEFAULT NULL::text
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_where_clause TEXT := 'WHERE u.deleted_at IS NULL';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_role_code IS NOT NULL AND p_role_code <> 'All' THEN
        v_where_clause := v_where_clause || format(
            ' AND EXISTS (
                SELECT 1
                FROM public.user_roles fur
                INNER JOIN public.roles fr ON fr.id = fur.role_id AND fr.deleted_at IS NULL
                WHERE fur.user_id = u.id
                  AND fur.deleted_at IS NULL
                  AND fur.revoked_at IS NULL
                  AND fr.code = %L
            )',
            p_role_code
        );
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where_clause := v_where_clause || format(' AND u.status = %L', p_status);
    END IF;

    IF p_city IS NOT NULL AND p_city <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.city ILIKE %L', '%' || p_city || '%');
    END IF;

    IF p_province IS NOT NULL AND p_province <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.province ILIKE %L', '%' || p_province || '%');
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            COALESCE(ra.role_code, ''No role'') AS role_code,
            u.status,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        LEFT JOIN LATERAL (
            SELECT string_agg(r.code::TEXT, '', '' ORDER BY r.code) AS role_code
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
        ) ra ON TRUE
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.created_at ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_grade_audit_logs_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_action text DEFAULT NULL::text,
    p_table_name text DEFAULT NULL::text,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_where_clause TEXT := 'WHERE gal.deleted_at IS NULL';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (cu.first_name ILIKE %L
                OR cu.last_name ILIKE %L
                OR gal.field_changed ILIKE %L
                OR gal.change_reason ILIKE %L
                OR su.first_name ILIKE %L
                OR su.last_name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND gal.action = %L::public.audit_action_type', p_action);
    END IF;

    IF p_table_name IS NOT NULL AND p_table_name <> 'All' AND p_table_name <> '' THEN
        v_where_clause := v_where_clause || format(' AND gal.table_name = %L', p_table_name);
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND gal.changed_at >= %L::DATE', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND gal.changed_at < (%L::DATE + 1)', p_date_to);
    END IF;

    v_base_query := format(
        'SELECT
            gal.id,
            gal.action::TEXT AS action,
            gal.table_name,
            gal.field_changed,
            gal.old_value,
            gal.new_value,
            gal.change_reason,
            gal.changed_at,
            COALESCE(cu.first_name || '' '' || cu.last_name, ''System'') AS changed_by_name,
            COALESCE(su.first_name || '' '' || su.last_name, '''') AS student_name,
            COALESCE(sec.section_code, '''') AS section_code,
            COALESCE(gp.name, '''') AS grading_period_name,
            COUNT(*) OVER () AS total_count
        FROM public.grade_audit_logs gal
        LEFT JOIN public.users cu ON cu.id = gal.changed_by
        LEFT JOIN public.enrollments e ON e.id = gal.enrollment_id AND e.deleted_at IS NULL
        LEFT JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        LEFT JOIN public.users su ON su.id = st.user_id AND su.deleted_at IS NULL
        LEFT JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp ON gp.id = gal.grading_period_id AND gp.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'gal.changed_at DESC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_audit_log_tables()
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', t.table_name, 'value', t.table_name) ORDER BY t.table_name), '[]'::JSONB)
        FROM (
            SELECT DISTINCT gal.table_name
            FROM public.grade_audit_logs gal
            WHERE gal.deleted_at IS NULL
        ) t
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_faculty_load_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_where_clause TEXT := 'u.deleted_at IS NULL';
    v_term_clause  TEXT := '';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            u.email,
            (
                SELECT COUNT(*)
                FROM public.sections s
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
            ) AS section_count,
            (
                SELECT COALESCE(SUM(c.total_units), 0)
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND s.deleted_at IS NULL
                  %1$s
            ) AS total_units,
            (
                SELECT COUNT(*)
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND e.deleted_at IS NULL
                  AND e.status = ''Enrolled''::public.enrollment_status_type
                  %1$s
            ) AS student_count,
            (
                SELECT COALESCE(ROUND(SUM(EXTRACT(EPOCH FROM (sch.time_end - sch.time_start)) / 3600.0)::NUMERIC, 2), 0)
                FROM public.section_schedules sch
                INNER JOIN public.sections s ON s.id = sch.section_id AND s.deleted_at IS NULL
                WHERE s.faculty_id = u.id
                  AND sch.deleted_at IS NULL
                  %1$s
            ) AS weekly_hours,
            (
                SELECT COUNT(*)
                FROM public.section_schedules a
                INNER JOIN public.sections s ON s.id = a.section_id AND s.deleted_at IS NULL
                INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
                INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
                WHERE a.deleted_at IS NULL
                  AND s.faculty_id = u.id
                  AND sb.faculty_id = u.id
                  AND sb.id <> s.id
                  AND sb.term_id = s.term_id
                  AND a.day_of_week = b.day_of_week
                  AND a.time_start < b.time_end
                  AND b.time_start < a.time_end
                  %1$s
            ) AS conflict_count,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        WHERE EXISTS (
            SELECT 1
            FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
            WHERE ur.user_id = u.id
              AND ur.deleted_at IS NULL
              AND ur.revoked_at IS NULL
              AND r.code = ''Faculty''
        )
        AND %2$s',
        v_term_clause,
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_schedule_conflicts(p_term_id uuid DEFAULT NULL::uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_faculty JSONB;
    v_rooms   JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'faculty_name', x->>'day_of_week', x->>'time_start'), '[]'::JSONB)
    INTO v_faculty
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', 'Faculty',
            'faculty_name', fu.first_name || ' ' || fu.last_name,
            'subject_label', fu.first_name || ' ' || fu.last_name,
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a', sa.section_code,
            'section_b', sb.section_code,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM')
        ) AS x
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        INNER JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sa.faculty_id IS NOT NULL
          AND sb.faculty_id = sa.faculty_id
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
    ) faculty_conflicts;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'subject_label', x->>'day_of_week', x->>'time_start'), '[]'::JSONB)
    INTO v_rooms
    FROM (
        SELECT jsonb_build_object(
            'conflict_type', 'Room',
            'faculty_name', COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned'),
            'subject_label', COALESCE(a.room, sa.room),
            'day_of_week', a.day_of_week::TEXT,
            'time_start', to_char(a.time_start, 'HH12:MI AM'),
            'time_end', to_char(a.time_end, 'HH12:MI AM'),
            'section_a', sa.section_code,
            'section_b', sb.section_code,
            'overlap_start', to_char(GREATEST(a.time_start, b.time_start), 'HH12:MI AM'),
            'overlap_end', to_char(LEAST(a.time_end, b.time_end), 'HH12:MI AM')
        ) AS x
        FROM public.section_schedules a
        INNER JOIN public.sections sa ON sa.id = a.section_id AND sa.deleted_at IS NULL
        INNER JOIN public.section_schedules b ON b.id > a.id AND b.deleted_at IS NULL
        INNER JOIN public.sections sb ON sb.id = b.section_id AND sb.deleted_at IS NULL
        LEFT JOIN public.users fu ON fu.id = sa.faculty_id AND fu.deleted_at IS NULL
        WHERE a.deleted_at IS NULL
          AND sb.id <> sa.id
          AND sb.term_id = sa.term_id
          AND a.day_of_week = b.day_of_week
          AND a.time_start < b.time_end
          AND b.time_start < a.time_end
          AND COALESCE(a.room, sa.room) IS NOT NULL
          AND upper(btrim(COALESCE(a.room, sa.room))) = upper(btrim(COALESCE(b.room, sb.room)))
          AND (p_term_id IS NULL OR sa.term_id = p_term_id)
    ) room_conflicts;

    RETURN jsonb_build_object(
        'faculty_conflicts', v_faculty,
        'room_conflicts', v_rooms,
        'faculty_conflict_count', jsonb_array_length(v_faculty),
        'room_conflict_count', jsonb_array_length(v_rooms)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_load_detail(p_faculty_id uuid, p_term_id uuid DEFAULT NULL::uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_faculty  JSONB;
    v_sections JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT jsonb_build_object(
        'id', u.id,
        'faculty_name', u.first_name || ' ' || u.last_name,
        'email', u.email
    )
    INTO v_faculty
    FROM public.users u
    WHERE u.id = p_faculty_id
      AND u.deleted_at IS NULL;

    IF v_faculty IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Faculty member not found.');
    END IF;

    SELECT COALESCE(jsonb_agg(x ORDER BY x->>'section_code'), '[]'::JSONB)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id', s.id,
            'section_code', s.section_code,
            'course_code', c.code,
            'course_title', c.title,
            'term_label', tt.label || ' - ' || sy.label,
            'units', c.total_units,
            'enrolled_count', (
                SELECT COUNT(*)
                FROM public.enrollments e
                WHERE e.section_id = s.id
                  AND e.deleted_at IS NULL
                  AND e.status = 'Enrolled'::public.enrollment_status_type
            ),
            'schedules', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'day_of_week', sch.day_of_week::TEXT,
                    'time_start', to_char(sch.time_start, 'HH12:MI AM'),
                    'time_end', to_char(sch.time_end, 'HH12:MI AM'),
                    'room', COALESCE(sch.room, s.room, '')
                ) ORDER BY sch.day_of_week, sch.time_start)
                FROM public.section_schedules sch
                WHERE sch.section_id = s.id
                  AND sch.deleted_at IS NULL
            ), '[]'::JSONB)
        ) AS x
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.faculty_id = p_faculty_id
          AND s.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
    ) sections;

    RETURN jsonb_build_object(
        'faculty', v_faculty,
        'sections', v_sections
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_copy_section_setup_to_sections(
    p_source_section_id uuid,
    p_target_section_ids uuid[]
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_source_term_id UUID;
    v_source_code    TEXT;
    v_target_id      UUID;
    v_target_term_id UUID;
    v_target_code    TEXT;
    v_period         RECORD;
    v_target_period  UUID;
    v_component      RECORD;
    v_copied         INTEGER := 0;
    v_periods_copied INTEGER;
    v_skipped        JSONB := '[]'::JSONB;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_target_section_ids IS NULL OR array_length(p_target_section_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Select at least one target section.');
    END IF;

    SELECT s.term_id, s.section_code
    INTO v_source_term_id, v_source_code
    FROM public.sections s
    WHERE s.id = p_source_section_id
      AND s.deleted_at IS NULL;

    IF v_source_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Source section not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.grading_components gc
        WHERE gc.section_id = p_source_section_id
          AND gc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'The source section has no grading components to copy.');
    END IF;

    FOREACH v_target_id IN ARRAY p_target_section_ids
    LOOP
        CONTINUE WHEN v_target_id = p_source_section_id;

        SELECT s.term_id, s.section_code
        INTO v_target_term_id, v_target_code
        FROM public.sections s
        WHERE s.id = v_target_id
          AND s.deleted_at IS NULL;

        IF v_target_term_id IS NULL THEN
            v_skipped := v_skipped || jsonb_build_object(
                'section_code', '(unknown)',
                'reason', 'Target section not found.'
            );
            CONTINUE;
        END IF;

        PERFORM public.fn_seed_term_grading_periods(v_target_term_id);

        v_periods_copied := 0;

        FOR v_period IN
            SELECT gp.id AS period_id, gp.sequence AS seq, gp.name AS period_name
            FROM public.grading_periods gp
            WHERE gp.term_id = v_source_term_id
              AND gp.deleted_at IS NULL
              AND EXISTS (
                  SELECT 1
                  FROM public.grading_components gc
                  WHERE gc.section_id = p_source_section_id
                    AND gc.grading_period_id = gp.id
                    AND gc.deleted_at IS NULL
              )
            ORDER BY gp.sequence
        LOOP
            SELECT tp.id
            INTO v_target_period
            FROM public.grading_periods tp
            WHERE tp.term_id = v_target_term_id
              AND tp.deleted_at IS NULL
              AND tp.sequence = v_period.seq
            LIMIT 1;

            IF v_target_period IS NULL THEN
                v_skipped := v_skipped || jsonb_build_object(
                    'section_code', v_target_code,
                    'reason', format('No matching grading period for %s.', v_period.period_name)
                );
                CONTINUE;
            END IF;

            IF public.fn_is_section_grading_locked(v_target_id, v_target_period) THEN
                v_skipped := v_skipped || jsonb_build_object(
                    'section_code', v_target_code,
                    'reason', format('%s is locked because grades have already been recorded.', v_period.period_name)
                );
                CONTINUE;
            END IF;

            UPDATE public.grading_components
            SET deleted_at = now(),
                deleted_by = auth.uid()
            WHERE section_id = v_target_id
              AND grading_period_id = v_target_period
              AND deleted_at IS NULL;

            FOR v_component IN
                SELECT gc.name, gc.weight
                FROM public.grading_components gc
                WHERE gc.section_id = p_source_section_id
                  AND gc.grading_period_id = v_period.period_id
                  AND gc.deleted_at IS NULL
                ORDER BY gc.name
            LOOP
                INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
                VALUES (v_target_id, v_target_period, v_component.name, v_component.weight, auth.uid());
            END LOOP;

            INSERT INTO public.grade_audit_logs (
                action, table_name, record_id, enrollment_id, grading_period_id,
                field_changed, old_value, new_value, change_reason, changed_by, ip_address
            ) VALUES (
                'Update', 'grading_components', v_target_id, NULL, v_target_period,
                'components', NULL, format('Copied from section %s', v_source_code),
                'Section setup rollover', auth.uid(), inet_client_addr()
            );

            v_periods_copied := v_periods_copied + 1;
        END LOOP;

        IF v_periods_copied > 0 THEN
            v_copied := v_copied + 1;
        END IF;
    END LOOP;

    IF v_copied = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Nothing was copied. Every target section is locked by recorded grades or has no matching grading period.',
            'copied_sections', 0,
            'skipped', v_skipped
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Grading setup from %s copied into %s section(s).', v_source_code, v_copied),
        'copied_sections', v_copied,
        'skipped', v_skipped
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_apply_user_roles(uuid, text[]) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_get_my_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_user_by_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_users_json(integer, integer, text, jsonb, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_grade_audit_logs_json(integer, integer, text, jsonb, text, text, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_audit_log_tables() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_faculty_load_json(integer, integer, text, jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_schedule_conflicts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_faculty_load_detail(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_copy_section_setup_to_sections(uuid, uuid[]) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_my_profile(text, text, text, text, text, text, text, text, text, text, text, date, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_user(uuid, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_user_by_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_users_json(integer, integer, text, jsonb, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_grade_audit_logs_json(integer, integer, text, jsonb, text, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_audit_log_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_faculty_load_json(integer, integer, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_schedule_conflicts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_faculty_load_detail(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_copy_section_setup_to_sections(uuid, uuid[]) TO authenticated;
