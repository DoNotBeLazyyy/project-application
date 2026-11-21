-- ====================================================================
-- Migration: 20261121300015_pageable_dto_id_tiebreaker.sql
-- Audit 2026-11-21 (Tier 4 paging):
--   * fn_build_pageable_dto ordered only by the requested columns, so rows with equal values
--     (e.g. the same created_at) could repeat or be skipped between pages. It now appends id
--     as a last sort key. Any list whose query cannot sort by a plain id (no id column, an
--     ambiguous one, DISTINCT/GROUP BY rules) falls back to the old ordering, so no caller
--     can break.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_build_pageable_dto(p_base_query text, p_page integer, p_size integer, p_sort jsonb, p_default_sort text DEFAULT 'created_at ASC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order_by    TEXT    := '';
    v_item        JSONB;
    v_dir         TEXT;
    v_full_query  TEXT;
    v_result_rec  RECORD;
    v_rows        JSONB;
    v_total       BIGINT;
    v_page_num    INT;
    v_total_pages INT;
    v_offset      INT;
    v_sorted      BOOLEAN;
BEGIN
    v_page_num := p_page - 1;
    v_offset   := v_page_num * p_size;

    IF p_sort IS NOT NULL AND jsonb_array_length(p_sort) > 0 THEN
        v_sorted := TRUE;
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_sort)
        LOOP
            IF v_order_by <> '' THEN
                v_order_by := v_order_by || ', ';
            END IF;
            v_dir      := CASE WHEN (v_item->>'isAsc')::BOOLEAN THEN 'ASC' ELSE 'DESC' END;
            v_order_by := v_order_by || quote_ident(v_item->>'sortKey') || ' ' || v_dir;
        END LOOP;
    ELSE
        v_sorted   := FALSE;
        v_order_by := p_default_sort;
    END IF;

    -- id as the last sort key keeps pages stable when sort values tie
    v_full_query := format(
        '%s ORDER BY %s, id LIMIT %s OFFSET %s',
        p_base_query,
        v_order_by,
        p_size::TEXT,
        v_offset::TEXT
    );

    BEGIN
        FOR v_result_rec IN EXECUTE format(
            'SELECT COALESCE(jsonb_agg(to_jsonb(t)), %L::JSONB) AS rows, COALESCE(MAX(t.total_count), 0) AS total FROM (%s) t',
            '[]',
            v_full_query
        )
        LOOP
            v_rows  := v_result_rec.rows;
            v_total := v_result_rec.total;
        END LOOP;
    EXCEPTION
        -- The query has no usable plain id (none, ambiguous, or not allowed by DISTINCT/GROUP BY):
        -- run it with the requested ordering only, as before
        WHEN undefined_column OR ambiguous_column OR invalid_column_reference OR grouping_error THEN
            v_full_query := format(
                '%s ORDER BY %s LIMIT %s OFFSET %s',
                p_base_query,
                v_order_by,
                p_size::TEXT,
                v_offset::TEXT
            );

            FOR v_result_rec IN EXECUTE format(
                'SELECT COALESCE(jsonb_agg(to_jsonb(t)), %L::JSONB) AS rows, COALESCE(MAX(t.total_count), 0) AS total FROM (%s) t',
                '[]',
                v_full_query
            )
            LOOP
                v_rows  := v_result_rec.rows;
                v_total := v_result_rec.total;
            END LOOP;
    END;

    v_total_pages := CASE WHEN p_size > 0 THEN CEIL(v_total::NUMERIC / p_size)::INT ELSE 0 END;

    RETURN jsonb_build_object(
        'content',          v_rows,
        'empty',            jsonb_array_length(v_rows) = 0,
        'first',            v_page_num = 0,
        'last',             v_page_num >= v_total_pages - 1,
        'number',           v_page_num,
        'numberOfElements', jsonb_array_length(v_rows),
        'pageable',         jsonb_build_object(
            'offset',       v_offset,
            'paged',        TRUE,
            'pageNumber',   v_page_num,
            'pageSize',     p_size,
            'sort',         jsonb_build_object(
                'empty',    NOT v_sorted,
                'sorted',   v_sorted,
                'unsorted', NOT v_sorted
            ),
            'unpaged',      FALSE
        ),
        'size',             p_size,
        'sort',             jsonb_build_object(
            'empty',        NOT v_sorted,
            'sorted',       v_sorted,
            'unsorted',     NOT v_sorted
        ),
        'totalElements',    v_total,
        'totalPages',       v_total_pages
    );
END;
$function$;

COMMIT;
