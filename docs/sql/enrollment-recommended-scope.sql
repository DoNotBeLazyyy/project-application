DROP FUNCTION IF EXISTS public.fn_list_eligible_sections(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.fn_list_eligible_sections(
    p_student_id uuid,
    p_term_id uuid DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_scope text DEFAULT 'recommended',
    p_year_levels smallint[] DEFAULT NULL,
    p_include_full boolean DEFAULT TRUE,
    p_include_prerequisite_gaps boolean DEFAULT TRUE,
    p_include_conflicts boolean DEFAULT TRUE
) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term_id     UUID := p_term_id;
    v_program_id  UUID;
    v_year_level  SMALLINT;
    v_term_type   UUID;
    v_scope       TEXT := COALESCE(NULLIF(lower(p_scope), ''), 'recommended');
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_scope NOT IN ('recommended', 'all') THEN
        v_scope := 'recommended';
    END IF;

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT program_id, year_level INTO v_program_id, v_year_level
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL OR v_term_id IS NULL THEN
        RETURN jsonb_build_object(
            'scope', v_scope,
            'recommended_count', 0,
            'available_count', 0,
            'total_count', 0,
            'rows', '[]'::JSONB
        );
    END IF;

    SELECT term_type_id INTO v_term_type
    FROM public.terms
    WHERE id = v_term_id AND deleted_at IS NULL;

    RETURN (
        WITH candidates AS (
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
        ),
        visible AS (
            SELECT *
            FROM candidates
            WHERE (v_scope = 'all' OR is_recommended)
            AND (p_year_levels IS NULL OR curriculum_year_level = ANY (p_year_levels))
            AND (COALESCE(p_include_full, TRUE) OR NOT is_full)
            AND (COALESCE(p_include_prerequisite_gaps, TRUE) OR unmet_prerequisites IS NULL)
            AND (COALESCE(p_include_conflicts, TRUE) OR conflict_with IS NULL)
        )
        SELECT jsonb_build_object(
            'scope', v_scope,
            'recommended_count', (
                SELECT COUNT(*)::INT FROM candidates WHERE is_recommended
            ),
            'available_count', (
                SELECT COUNT(*)::INT FROM candidates WHERE is_recommended AND NOT is_full
            ),
            'total_count', (SELECT COUNT(*)::INT FROM candidates),
            'rows', COALESCE((
                SELECT jsonb_agg(
                    to_jsonb(v) ORDER BY
                        v.is_recommended DESC,
                        v.is_full ASC,
                        v.curriculum_year_level,
                        v.course_code,
                        v.section_code
                )
                FROM visible v
            ), '[]'::JSONB)
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_list_eligible_sections(uuid, uuid, text, text, smallint[], boolean, boolean, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_list_eligible_sections(uuid, uuid, text, text, smallint[], boolean, boolean, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_eligible_sections(uuid, uuid, text, text, smallint[], boolean, boolean, boolean) TO authenticated;