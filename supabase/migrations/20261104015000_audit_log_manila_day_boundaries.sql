-- ====================================================================
-- Migration: 20261104015000_audit_log_manila_day_boundaries.sql
--   * fn_list_audit_logs_json: Date From / Date To now cover whole days in Asia/Manila
--     time. Before, the day started at midnight UTC (8:00 AM in Manila), so entries made
--     between midnight and 8:00 AM fell on the wrong day. Every other part of the function
--     is copied unchanged from 20261019030000_system_forensic_audit_logs.sql.
-- Signature and grants are unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_list_audit_logs_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_action text DEFAULT NULL::text,
    p_table_name text DEFAULT NULL::text,
    p_event_name text DEFAULT NULL::text,
    p_changed_by text DEFAULT NULL::text,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (al.event_name ILIKE %L
                OR al.table_name ILIKE %L
                OR al.changed_by_name ILIKE %L
                OR al.description ILIKE %L
                OR al.action ILIKE %L
                OR al.record_id ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND UPPER(al.action) = UPPER(%L)', p_action);
    END IF;

    IF p_table_name IS NOT NULL AND p_table_name <> 'All' AND p_table_name <> '' THEN
        v_where_clause := v_where_clause || format(' AND al.table_name = %L', p_table_name);
    END IF;

    IF p_event_name IS NOT NULL AND p_event_name <> 'All' AND p_event_name <> '' THEN
        v_where_clause := v_where_clause || format(' AND al.event_name = %L', p_event_name);
    END IF;

    IF p_changed_by IS NOT NULL AND p_changed_by <> 'All' AND p_changed_by <> '' THEN
        v_where_clause := v_where_clause || format(' AND al.changed_by_name ILIKE %L', '%' || p_changed_by || '%');
    END IF;

    IF p_date_from IS NOT NULL THEN
        -- A day starts at midnight Manila time, not midnight UTC
        v_where_clause := v_where_clause || format(' AND al.created_at >= (%L::DATE::TIMESTAMP AT TIME ZONE ''Asia/Manila'')', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND al.created_at < ((%L::DATE + 1)::TIMESTAMP AT TIME ZONE ''Asia/Manila'')', p_date_to);
    END IF;

    v_base_query := format(
        'SELECT
            al.id,
            al.action,
            al.event_name,
            al.table_name,
            al.record_id,
            al.old_data,
            al.new_data,
            al.changed_fields,
            al.changed_by,
            COALESCE(al.changed_by_name, ''System'') AS changed_by_name,
            al.description,
            al.created_at AS changed_at,
            al.created_at,
            COUNT(*) OVER () AS total_count
        FROM public.audit_logs al
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'al.created_at DESC');
END;
$function$;

COMMIT;