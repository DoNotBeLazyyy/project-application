ALTER TABLE public.student_lifecycle_events
    ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.terms (id) ON DELETE RESTRICT;

ALTER TABLE public.student_lifecycle_events
    DROP CONSTRAINT IF EXISTS chk_student_lifecycle_event_type;

ALTER TABLE public.student_lifecycle_events
    ADD CONSTRAINT chk_student_lifecycle_event_type
    CHECK (event_type IN ('Status Change', 'Program Shift', 'Year Level Progression'));

CREATE INDEX IF NOT EXISTS idx_student_lifecycle_events_term
    ON public.student_lifecycle_events (student_id, term_id)
    WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.fn_list_progression_candidates(
    p_term_id uuid,
    p_program_ids uuid[] DEFAULT NULL,
    p_year_levels smallint[] DEFAULT NULL,
    p_student_ids uuid[] DEFAULT NULL
)
    RETURNS TABLE (
        student_id uuid,
        student_number text,
        student_name text,
        program_id uuid,
        program_code text,
        current_year_level smallint,
        proposed_year_level smallint,
        is_promoted boolean,
        blocker_code text,
        blocker_message text
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    WITH target AS (
        SELECT t.id, t.school_year_id, t.term_type_id
        FROM public.terms t
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
    ),
    base AS (
        SELECT
            st.id,
            st.student_number,
            u.first_name || ' ' || u.last_name AS student_name,
            st.program_id,
            p.code AS program_code,
            LEAST(COALESCE(p.years_duration, 6), 6)::SMALLINT AS max_year_level,
            st.year_level,
            st.status
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        WHERE st.deleted_at IS NULL
          AND (p_program_ids IS NULL OR st.program_id = ANY (p_program_ids))
          AND (p_year_levels IS NULL OR st.year_level = ANY (p_year_levels))
          AND (p_student_ids IS NULL OR st.id = ANY (p_student_ids))
    ),
    history AS (
        SELECT
            b.id AS student_id,
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                INNER JOIN public.terms t2 ON t2.id = s.term_id AND t2.deleted_at IS NULL
                CROSS JOIN target tg
                WHERE e.student_id = b.id
                  AND e.deleted_at IS NULL
                  AND e.status <> 'Dropped'
                  AND t2.school_year_id <> tg.school_year_id
            ) AS has_earlier_history,
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                INNER JOIN public.terms t2 ON t2.id = s.term_id AND t2.deleted_at IS NULL
                CROSS JOIN target tg
                WHERE e.student_id = b.id
                  AND e.deleted_at IS NULL
                  AND e.status <> 'Dropped'
                  AND t2.school_year_id = tg.school_year_id
            ) AS has_target_year_history,
            EXISTS (
                SELECT 1
                FROM public.student_lifecycle_events le
                INNER JOIN public.terms t3 ON t3.id = le.term_id AND t3.deleted_at IS NULL
                CROSS JOIN target tg
                WHERE le.student_id = b.id
                  AND le.deleted_at IS NULL
                  AND le.event_type = 'Year Level Progression'
                  AND t3.school_year_id = tg.school_year_id
            ) AS is_already_progressed
        FROM base b
    ),
    resolved AS (
        SELECT
            b.*,
            h.has_earlier_history,
            h.has_target_year_history,
            h.is_already_progressed,
            (
                b.status = 'Active'
                AND b.program_id IS NOT NULL
                AND h.has_earlier_history
                AND NOT h.has_target_year_history
                AND NOT h.is_already_progressed
            ) AS advances_year
        FROM base b
        INNER JOIN history h ON h.student_id = b.id
    )
    SELECT
        r.id,
        r.student_number,
        r.student_name,
        r.program_id,
        r.program_code,
        r.year_level,
        CASE
            WHEN r.advances_year AND r.year_level < r.max_year_level
                THEN (r.year_level + 1)::SMALLINT
            ELSE r.year_level
        END,
        r.advances_year AND r.year_level < r.max_year_level,
        CASE
            WHEN r.status <> 'Active' THEN 'INACTIVE'
            WHEN r.program_id IS NULL THEN 'NO_PROGRAM'
            WHEN r.advances_year AND r.year_level >= r.max_year_level THEN 'PROGRAM_COMPLETE'
            ELSE NULL
        END,
        CASE
            WHEN r.status <> 'Active'
                THEN 'Student status is ' || r.status::TEXT || ' — only active students are progressed.'
            WHEN r.program_id IS NULL
                THEN 'Student has no program assigned.'
            WHEN r.advances_year AND r.year_level >= r.max_year_level
                THEN 'Student is already in the final year level of the program — handle graduation manually.'
            ELSE NULL
        END
    FROM resolved r
    CROSS JOIN target tg
    ORDER BY r.program_code NULLS LAST, r.year_level, r.student_number;
$$;

CREATE OR REPLACE FUNCTION public.fn_plan_progression_sections(
    p_student_id uuid,
    p_program_id uuid,
    p_year_level smallint,
    p_term_id uuid
)
    RETURNS jsonb
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    WITH target AS (
        SELECT t.id, t.school_year_id, t.term_type_id
        FROM public.terms t
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
    ),
    planned AS (
        SELECT
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units,
            MIN(cm.sequence) AS sequence
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        CROSS JOIN target tg
        WHERE cm.program_id = p_program_id
          AND cm.year_level = p_year_level
          AND cm.is_elective = FALSE
          AND cm.deleted_at IS NULL
          AND c.is_active = TRUE
          AND (cm.term_type_id IS NULL OR cm.term_type_id = tg.term_type_id)
          AND (cm.school_year_id IS NULL OR cm.school_year_id = tg.school_year_id)
        GROUP BY c.id, c.code, c.title, c.total_units
    ),
    evaluated AS (
        SELECT
            pl.course_id,
            pl.course_code,
            pl.course_title,
            pl.total_units,
            pl.sequence,
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s2 ON s2.id = e.section_id AND s2.deleted_at IS NULL
                WHERE e.student_id = p_student_id
                  AND e.deleted_at IS NULL
                  AND e.status IN ('Enrolled', 'Completed')
                  AND s2.course_id = pl.course_id
            ) AS is_taken,
            pick.section_id,
            pick.section_code,
            pick.has_conflict
        FROM planned pl
        LEFT JOIN LATERAL (
            SELECT
                s.id AS section_id,
                s.section_code,
                public.fn_get_schedule_conflicts(p_student_id, s.id) IS NOT NULL AS has_conflict
            FROM public.sections s
            WHERE s.term_id = p_term_id
              AND s.course_id = pl.course_id
              AND s.deleted_at IS NULL
              AND s.status NOT IN ('Closed', 'Cancelled')
              AND (
                  SELECT COUNT(*)
                  FROM public.enrollments e2
                  WHERE e2.section_id = s.id
                    AND e2.deleted_at IS NULL
                    AND e2.status NOT IN ('Dropped', 'Withdrawn')
              ) < s.max_slots
            ORDER BY
                public.fn_get_schedule_conflicts(p_student_id, s.id) IS NULL DESC,
                s.section_code ASC
            LIMIT 1
        ) pick ON TRUE
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'course_id', ev.course_id,
                'course_code', ev.course_code,
                'course_title', ev.course_title,
                'total_units', ev.total_units,
                'section_id', CASE WHEN ev.is_taken THEN NULL ELSE ev.section_id END,
                'section_code', CASE WHEN ev.is_taken THEN NULL ELSE ev.section_code END,
                'issue_code', CASE
                    WHEN ev.is_taken THEN 'ALREADY_TAKEN'
                    WHEN ev.section_id IS NULL THEN 'NO_SECTION'
                    WHEN ev.has_conflict THEN 'SCHEDULE_CONFLICT'
                    ELSE NULL
                END,
                'issue_message', CASE
                    WHEN ev.is_taken
                        THEN ev.course_code || ' is already enrolled or completed.'
                    WHEN ev.section_id IS NULL
                        THEN 'No open section for ' || ev.course_code || ' in the selected term.'
                    WHEN ev.has_conflict
                        THEN ev.course_code || ' only has sections that conflict with the current schedule.'
                    ELSE NULL
                END
            )
            ORDER BY ev.sequence, ev.course_code
        ),
        '[]'::jsonb
    )
    FROM evaluated ev;
$$;

CREATE OR REPLACE FUNCTION public.fn_preview_batch_progression(
    p_term_id uuid,
    p_program_ids uuid[] DEFAULT NULL,
    p_year_levels smallint[] DEFAULT NULL,
    p_student_ids uuid[] DEFAULT NULL
)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term        RECORD;
    v_rows        JSONB := '[]'::JSONB;
    v_candidate   RECORD;
    v_plan        JSONB;
    v_total       INTEGER := 0;
    v_promoted    INTEGER := 0;
    v_blocked     INTEGER := 0;
    v_enrollable  INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT
        t.id,
        sy.label || ' — ' || tt.label AS label
    INTO v_term
    FROM public.terms t
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    WHERE t.id = p_term_id
      AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target term not found.');
    END IF;

    FOR v_candidate IN
        SELECT *
        FROM public.fn_list_progression_candidates(p_term_id, p_program_ids, p_year_levels, p_student_ids)
    LOOP
        v_total := v_total + 1;

        IF v_candidate.blocker_code IS NOT NULL THEN
            v_blocked := v_blocked + 1;
            v_plan := '[]'::JSONB;
        ELSE
            IF v_candidate.is_promoted THEN
                v_promoted := v_promoted + 1;
            END IF;

            v_plan := public.fn_plan_progression_sections(
                v_candidate.student_id,
                v_candidate.program_id,
                v_candidate.proposed_year_level,
                p_term_id
            );

            v_enrollable := v_enrollable + (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_plan) AS item
                WHERE item->>'section_id' IS NOT NULL
            );
        END IF;

        v_rows := v_rows || jsonb_build_object(
            'student_id', v_candidate.student_id,
            'student_number', v_candidate.student_number,
            'student_name', v_candidate.student_name,
            'program_code', v_candidate.program_code,
            'current_year_level', v_candidate.current_year_level,
            'proposed_year_level', v_candidate.proposed_year_level,
            'is_promoted', v_candidate.is_promoted,
            'blocker_code', v_candidate.blocker_code,
            'blocker_message', v_candidate.blocker_message,
            'planned_courses', v_plan,
            'enrollable_count', (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_plan) AS item
                WHERE item->>'section_id' IS NOT NULL
            ),
            'issue_count', (
                SELECT COUNT(*)
                FROM jsonb_array_elements(v_plan) AS item
                WHERE item->>'issue_code' IS NOT NULL
            )
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'term_id', v_term.id,
        'term_label', v_term.label,
        'total_count', v_total,
        'promote_count', v_promoted,
        'blocked_count', v_blocked,
        'enrollable_count', v_enrollable,
        'rows', v_rows
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_run_batch_progression(
    p_term_id uuid,
    p_program_ids uuid[] DEFAULT NULL,
    p_year_levels smallint[] DEFAULT NULL,
    p_student_ids uuid[] DEFAULT NULL,
    p_auto_enroll boolean DEFAULT TRUE,
    p_reason text DEFAULT NULL
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_term         RECORD;
    v_candidate    RECORD;
    v_plan         JSONB;
    v_item         JSONB;
    v_outcome      JSONB;
    v_results      JSONB := '[]'::JSONB;
    v_issues       JSONB;
    v_enrolled     INTEGER;
    v_total        INTEGER := 0;
    v_promoted     INTEGER := 0;
    v_blocked      INTEGER := 0;
    v_enrolled_all INTEGER := 0;
    v_limit        CONSTANT INTEGER := 500;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT
        t.id,
        sy.label || ' — ' || tt.label AS label
    INTO v_term
    FROM public.terms t
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    WHERE t.id = p_term_id
      AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target term not found.');
    END IF;

    IF (
        SELECT COUNT(*)
        FROM public.fn_list_progression_candidates(p_term_id, p_program_ids, p_year_levels, p_student_ids)
    ) > v_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Batch is larger than ' || v_limit || ' students. Narrow the program or year level filters and run again.'
        );
    END IF;

    FOR v_candidate IN
        SELECT *
        FROM public.fn_list_progression_candidates(p_term_id, p_program_ids, p_year_levels, p_student_ids)
    LOOP
        v_total := v_total + 1;

        IF v_candidate.blocker_code IS NOT NULL THEN
            v_blocked := v_blocked + 1;
            v_results := v_results || jsonb_build_object(
                'student_number', v_candidate.student_number,
                'student_name', v_candidate.student_name,
                'from_year_level', v_candidate.current_year_level,
                'to_year_level', v_candidate.current_year_level,
                'is_promoted', false,
                'enrolled_count', 0,
                'issues', jsonb_build_array(v_candidate.blocker_message)
            );
            CONTINUE;
        END IF;

        IF v_candidate.is_promoted THEN
            UPDATE public.students
            SET year_level = v_candidate.proposed_year_level
            WHERE id = v_candidate.student_id
              AND deleted_at IS NULL;

            INSERT INTO public.student_lifecycle_events (
                student_id,
                event_type,
                from_year_level,
                to_year_level,
                term_id,
                reason,
                effective_date
            ) VALUES (
                v_candidate.student_id,
                'Year Level Progression',
                v_candidate.current_year_level,
                v_candidate.proposed_year_level,
                p_term_id,
                COALESCE(
                    NULLIF(btrim(COALESCE(p_reason, '')), ''),
                    'Batch progression into ' || v_term.label || '.'
                ),
                CURRENT_DATE
            );

            v_promoted := v_promoted + 1;
        END IF;

        v_enrolled := 0;
        v_issues := '[]'::JSONB;

        IF p_auto_enroll THEN
            v_plan := public.fn_plan_progression_sections(
                v_candidate.student_id,
                v_candidate.program_id,
                v_candidate.proposed_year_level,
                p_term_id
            );

            FOR v_item IN SELECT * FROM jsonb_array_elements(v_plan)
            LOOP
                IF v_item->>'section_id' IS NULL THEN
                    IF v_item->>'issue_code' <> 'ALREADY_TAKEN' THEN
                        v_issues := v_issues || to_jsonb(v_item->>'issue_message');
                    END IF;

                    CONTINUE;
                END IF;

                v_outcome := public.fn_enroll_student_section(
                    v_candidate.student_id,
                    (v_item->>'section_id')::UUID,
                    FALSE,
                    NULL,
                    FALSE
                );

                IF COALESCE((v_outcome->>'success')::BOOLEAN, FALSE) THEN
                    v_enrolled := v_enrolled + 1;
                ELSIF v_outcome->>'code' <> 'ALREADY_TAKEN' THEN
                    v_issues := v_issues || to_jsonb(v_outcome->>'message');
                END IF;
            END LOOP;
        END IF;

        v_enrolled_all := v_enrolled_all + v_enrolled;

        v_results := v_results || jsonb_build_object(
            'student_number', v_candidate.student_number,
            'student_name', v_candidate.student_name,
            'from_year_level', v_candidate.current_year_level,
            'to_year_level', v_candidate.proposed_year_level,
            'is_promoted', v_candidate.is_promoted,
            'enrolled_count', v_enrolled,
            'issues', v_issues
        );
    END LOOP;

    IF v_total = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No students matched the selected cohort.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_promoted || ' promoted, ' || v_enrolled_all || ' enrollments created, '
            || v_blocked || ' skipped.',
        'term_label', v_term.label,
        'total_count', v_total,
        'promoted_count', v_promoted,
        'blocked_count', v_blocked,
        'enrolled_count', v_enrolled_all,
        'results', v_results
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_list_progression_candidates(uuid, uuid[], smallint[], uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_plan_progression_sections(uuid, uuid, smallint, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_preview_batch_progression(uuid, uuid[], smallint[], uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_run_batch_progression(uuid, uuid[], smallint[], uuid[], boolean, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_preview_batch_progression(uuid, uuid[], smallint[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_run_batch_progression(uuid, uuid[], smallint[], uuid[], boolean, text) TO authenticated;