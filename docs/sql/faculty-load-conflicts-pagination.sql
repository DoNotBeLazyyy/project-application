CREATE OR REPLACE FUNCTION public.fn_list_schedule_conflicts_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_term_id uuid DEFAULT NULL::uuid,
    p_conflict_types text[] DEFAULT NULL::text[]
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_clause    TEXT := '';
    v_type_clause    TEXT := '';
    v_search_clause  TEXT := '';
    v_base_query     TEXT;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF p_term_id IS NOT NULL THEN
        v_term_clause := format(' AND sa.term_id = %L', p_term_id);
    END IF;

    IF p_conflict_types IS NOT NULL AND array_length(p_conflict_types, 1) > 0 THEN
        v_type_clause := format(' WHERE c.conflict_type = ANY (%L::TEXT[])', p_conflict_types);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_search_clause := format(
            ' %1$s (c.faculty_name ILIKE %2$L OR c.subject_label ILIKE %2$L OR c.section_a ILIKE %2$L OR c.section_b ILIKE %2$L)',
            CASE WHEN v_type_clause = '' THEN 'WHERE' ELSE 'AND' END,
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.conflict_type,
            c.faculty_name,
            c.subject_label,
            c.day_of_week,
            c.time_start,
            c.time_end,
            c.section_a,
            c.section_b,
            c.overlap_start,
            c.overlap_end,
            COUNT(*) OVER () AS total_count
        FROM (
            SELECT
                md5(a.id::TEXT || b.id::TEXT || ''Faculty'') AS id,
                ''Faculty'' AS conflict_type,
                fu.first_name || '' '' || fu.last_name AS faculty_name,
                fu.first_name || '' '' || fu.last_name AS subject_label,
                a.day_of_week::TEXT AS day_of_week,
                to_char(a.time_start, ''HH12:MI AM'') AS time_start,
                to_char(a.time_end, ''HH12:MI AM'') AS time_end,
                sa.section_code AS section_a,
                sb.section_code AS section_b,
                to_char(GREATEST(a.time_start, b.time_start), ''HH12:MI AM'') AS overlap_start,
                to_char(LEAST(a.time_end, b.time_end), ''HH12:MI AM'') AS overlap_end,
                GREATEST(a.time_start, b.time_start) AS overlap_start_raw
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
              %1$s
            UNION ALL
            SELECT
                md5(a.id::TEXT || b.id::TEXT || ''Room'') AS id,
                ''Room'' AS conflict_type,
                COALESCE(fu.first_name || '' '' || fu.last_name, ''Unassigned'') AS faculty_name,
                COALESCE(a.room, sa.room) AS subject_label,
                a.day_of_week::TEXT AS day_of_week,
                to_char(a.time_start, ''HH12:MI AM'') AS time_start,
                to_char(a.time_end, ''HH12:MI AM'') AS time_end,
                sa.section_code AS section_a,
                sb.section_code AS section_b,
                to_char(GREATEST(a.time_start, b.time_start), ''HH12:MI AM'') AS overlap_start,
                to_char(LEAST(a.time_end, b.time_end), ''HH12:MI AM'') AS overlap_end,
                GREATEST(a.time_start, b.time_start) AS overlap_start_raw
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
              %1$s
        ) c
        %2$s
        %3$s',
        v_term_clause,
        v_type_clause,
        v_search_clause
    );

    RETURN public.fn_build_pageable_dto(
        v_base_query,
        p_page,
        p_size,
        p_sort,
        'conflict_type ASC, faculty_name ASC, day_of_week ASC, overlap_start_raw ASC'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_schedule_conflicts_json(integer, integer, text, jsonb, uuid, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_schedule_conflicts_json(integer, integer, text, jsonb, uuid, text[]) TO authenticated;
