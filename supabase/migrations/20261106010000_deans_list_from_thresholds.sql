-- Dean's List candidate from the school year's academic thresholds
-- fn_list_section_students now returns is_deans_list_candidate. The server picks the rule
-- from the section's school year:
--   1. a threshold coded 'deans_list' (or labelled "Dean's List"), any category;
--   2. otherwise the Honor thresholds together (lowest min GWA to highest max GWA);
--   3. otherwise GWA <= 1.75 with no failing grades.
-- Year-specific thresholds win over global ones (school_year_id IS NULL).
-- The rule checks min/max GWA, the subject floor grade (worst released course grade in the
-- term) and "no failing grades". Signature is unchanged, so grants stay in place.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_list_section_students(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.section_id = ' || quote_literal(p_section_id) || ' AND e.deleted_at IS NULL';
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = p_section_id
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
        )
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section roster.'
            USING ERRCODE = '42501';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            st.id AS student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS full_name,
            u.email,
            st.year_level,
            e.status,
            e.enrolled_at,
            (SELECT r.risk_level FROM public.fn_dashboard_enrollment_risk(ARRAY[e.id]) r LIMIT 1) AS risk_level,
            gw.gwa,
            (
                gw.gwa IS NOT NULL
                AND gw.gwa <= COALESCE(dl.max_gwa, hon.max_gwa, 1.75)
                AND gw.gwa >= COALESCE(dl.min_gwa, hon.min_gwa, 0)
                AND (
                    COALESCE(dl.min_subject_grade, hon.min_subject_grade) IS NULL
                    OR COALESCE(tg.worst_grade, 0) <= COALESCE(dl.min_subject_grade, hon.min_subject_grade)
                )
                AND (
                    NOT COALESCE(dl.requires_no_failing, hon.requires_no_failing, true)
                    OR COALESCE(tg.failing_count, 0) = 0
                )
            ) AS is_deans_list_candidate,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.terms trm ON trm.id = sec.term_id
        LEFT JOIN LATERAL (
            SELECT (public.fn_compute_student_gwa(st.id, sec.term_id)->>''gwa'')::NUMERIC AS gwa
        ) gw ON true
        LEFT JOIN LATERAL (
            SELECT
                MAX(g.grade) FILTER (WHERE g.grade IS NOT NULL) AS worst_grade,
                COUNT(*) FILTER (WHERE g.is_passing IS FALSE) AS failing_count
            FROM public.fn_student_course_grades(st.id) g
            WHERE g.term_id = sec.term_id
              AND (g.is_released OR g.special_grade IS NOT NULL)
        ) tg ON true
        LEFT JOIN LATERAL (
            SELECT th.min_gwa, th.max_gwa, th.min_subject_grade, th.requires_no_failing
            FROM public.academic_thresholds th
            WHERE th.is_active
              AND th.deleted_at IS NULL
              AND (th.school_year_id = trm.school_year_id OR th.school_year_id IS NULL)
              AND (
                  lower(th.code) = ''deans_list''
                  OR position(''dean'' IN lower(th.label)) > 0
              )
            ORDER BY (th.school_year_id IS NOT NULL) DESC, th.sort_order ASC
            LIMIT 1
        ) dl ON true
        LEFT JOIN LATERAL (
            SELECT
                MIN(th.min_gwa) AS min_gwa,
                MAX(th.max_gwa) AS max_gwa,
                MAX(th.min_subject_grade) AS min_subject_grade,
                BOOL_OR(th.requires_no_failing) AS requires_no_failing
            FROM public.academic_thresholds th
            WHERE th.is_active
              AND th.deleted_at IS NULL
              AND th.category::TEXT = ''Honor''
              AND th.school_year_id IS NOT DISTINCT FROM (
                  SELECT th2.school_year_id
                  FROM public.academic_thresholds th2
                  WHERE th2.is_active
                    AND th2.deleted_at IS NULL
                    AND th2.category::TEXT = ''Honor''
                    AND (th2.school_year_id = trm.school_year_id OR th2.school_year_id IS NULL)
                  ORDER BY (th2.school_year_id IS NOT NULL) DESC
                  LIMIT 1
              )
            HAVING COUNT(*) > 0
        ) hon ON true
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC, u.first_name ASC');
END;
$function$;

COMMIT;