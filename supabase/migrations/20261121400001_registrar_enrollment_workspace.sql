-- ====================================================================
-- Migration: 20261121400001_registrar_enrollment_workspace.sql
-- Registrar enrollment workspace and program modal (audit 2026-11-21):
--   * #52 fn_save_student_enrollment_changes: when an add fails for a subject that is being
--     dropped in the same save (a section switch), nothing is saved, so the student never
--     loses the subject.
--   * #55 fn_get_enrollment_student_detail: each current-load row carries drop_blocked_reason
--     (same checks as fn_drop_enrollment), so Drop is offered only on rows that can be dropped.
--   * T4 fn_list_eligible_sections: new p_pending_drop_enrollment_ids, so a subject marked to
--     drop is offered again in its other sections (switch a section in one save). The old
--     8-argument version is dropped; the only caller is listEligibleSections().
--   * T4 fn_enroll_student_section: the enrollment window uses the Manila date, not UTC.
--   * T2 fn_list_enrollment_students_json / fn_get_curriculum_audit: return
--     year_level_overridden, so Manage Program keeps a manual year-level override.
-- Bodies are the live definitions with only these edits. Idempotent.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_save_student_enrollment_changes(p_student_id uuid, p_section_ids uuid[] DEFAULT NULL::uuid[], p_drop_enrollment_ids uuid[] DEFAULT NULL::uuid[], p_allow_conflict boolean DEFAULT false, p_conflict_reason text DEFAULT NULL::text, p_override_prerequisites boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_outcome JSONB;
    v_dropped INTEGER := 0;
    v_enrolled INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_requested INTEGER := COALESCE(array_length(p_section_ids, 1), 0);
    v_section_code TEXT;
    v_summary TEXT;
    v_drop_course_ids UUID[] := '{}'::UUID[];
    v_blocked TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_requested = 0 AND COALESCE(array_length(p_drop_enrollment_ids, 1), 0) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'There are no changes to save.');
    END IF;

    -- Drops first, so a student can move to another section of the same course
    IF p_drop_enrollment_ids IS NOT NULL THEN
        -- The subjects being dropped, to check the adds that replace them
        SELECT COALESCE(array_agg(DISTINCT s.course_id), '{}'::UUID[])
        INTO v_drop_course_ids
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id
        WHERE e.id = ANY (p_drop_enrollment_ids)
          AND e.student_id = p_student_id;

        FOREACH v_id IN ARRAY p_drop_enrollment_ids LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.enrollments
                WHERE id = v_id AND student_id = p_student_id AND deleted_at IS NULL
            ) THEN
                RAISE EXCEPTION 'An enrollment to drop does not belong to this student.';
            END IF;

            v_outcome := public.fn_drop_enrollment(v_id, 'Dropped via registrar workspace');
            IF NOT COALESCE((v_outcome->>'success')::BOOLEAN, false) THEN
                -- Undo every change made so far
                RAISE EXCEPTION '%', v_outcome->>'message';
            END IF;
            v_dropped := v_dropped + 1;
        END LOOP;
    END IF;

    IF p_section_ids IS NOT NULL THEN
        FOREACH v_id IN ARRAY p_section_ids LOOP
            BEGIN
                v_outcome := public.fn_enroll_student_section(
                    p_student_id, v_id, p_allow_conflict, p_conflict_reason, p_override_prerequisites
                );
            EXCEPTION WHEN OTHERS THEN
                v_outcome := jsonb_build_object('success', false, 'code', 'UNEXPECTED_ERROR', 'message', SQLERRM);
            END;

            IF COALESCE((v_outcome->>'success')::BOOLEAN, false) THEN
                v_enrolled := v_enrolled + 1;
            ELSE
                SELECT section_code INTO v_section_code FROM public.sections WHERE id = v_id;
                v_errors := v_errors || jsonb_build_object(
                    'section_id', v_id,
                    'section_code', COALESCE(v_section_code, 'Section'),
                    'code', v_outcome->>'code',
                    'message', v_outcome->>'message'
                );
            END IF;
        END LOOP;
    END IF;

    -- A failed add for a subject that is being dropped (a section switch) would leave the
    -- student without that subject, so nothing is saved (#52)
    SELECT string_agg(format('%s: %s', e->>'section_code', e->>'message'), ' ')
    INTO v_blocked
    FROM jsonb_array_elements(v_errors) e
    INNER JOIN public.sections s ON s.id = (e->>'section_id')::UUID
    WHERE s.course_id = ANY (v_drop_course_ids);

    IF v_blocked IS NOT NULL THEN
        RAISE EXCEPTION 'Nothing was saved: a new section could not be added, so the subject it replaces was not dropped. %', v_blocked;
    END IF;

    -- Nothing could be enrolled: keep the student's load as it was
    IF v_requested > 0 AND v_enrolled = 0 THEN
        RAISE EXCEPTION 'No sections were enrolled, so no subjects were dropped. %',
            (SELECT string_agg(e->>'message', ' ') FROM jsonb_array_elements(v_errors) e);
    END IF;

    v_summary := concat_ws(' ',
        CASE WHEN v_enrolled > 0 THEN format('Enrolled in %s section(s).', v_enrolled) END,
        CASE WHEN v_dropped > 0 THEN format('Dropped %s subject(s).', v_dropped) END
    );

    IF jsonb_array_length(v_errors) > 0 THEN
        -- No "message" key: the page shows these skips as a warning, not a success toast
        RETURN jsonb_build_object(
            'success', true,
            'summary', v_summary || format(' %s of %s section(s) were skipped.', jsonb_array_length(v_errors), v_requested),
            'enrolled_count', v_enrolled,
            'dropped_count', v_dropped,
            'errors', v_errors
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_summary,
        'enrolled_count', v_enrolled,
        'dropped_count', v_dropped,
        'errors', v_errors
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_enrollment_student_detail(p_student_id uuid, p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID := p_term_id;
    v_result  JSONB;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

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
                -- Same checks as fn_drop_enrollment, so Drop is offered only where it can work (#55)
                'drop_blocked_reason', CASE
                    WHEN e.status <> 'Enrolled'
                        THEN format('Cannot be dropped: already %s', e.status)
                    WHEN NOT COALESCE(lsy.is_active, false) OR lt.status = 'Closed' OR lt.end_date < CURRENT_DATE
                        THEN 'Cannot be dropped: its term is over'
                    WHEN EXISTS (
                        SELECT 1
                        FROM public.section_final_grades sfg
                        WHERE sfg.enrollment_id = e.id
                          AND sfg.deleted_at IS NULL
                          AND sfg.status IN ('Approved', 'Released')
                    ) THEN 'Cannot be dropped: a grade is already approved'
                END,
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
            LEFT JOIN public.terms lt ON lt.id = s.term_id AND lt.deleted_at IS NULL
            LEFT JOIN public.school_years lsy ON lsy.id = lt.school_year_id AND lsy.deleted_at IS NULL
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
$function$;

DROP FUNCTION IF EXISTS public.fn_list_eligible_sections(uuid, uuid, text, text, smallint[], boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.fn_list_eligible_sections(p_student_id uuid, p_term_id uuid DEFAULT NULL::uuid, p_search text DEFAULT NULL::text, p_scope text DEFAULT 'recommended'::text, p_year_levels smallint[] DEFAULT NULL::smallint[], p_include_full boolean DEFAULT true, p_include_prerequisite_gaps boolean DEFAULT true, p_include_conflicts boolean DEFAULT true, p_pending_drop_enrollment_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- If student has no assigned program or term is invalid, no curriculum sections exist
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
                -- Strict curriculum constraint: ONLY courses in student's program curriculum
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
                    -- A subject marked to drop in the workspace can be re-added in another section
                    AND NOT (e.id = ANY (COALESCE(p_pending_drop_enrollment_ids, '{}'::UUID[])))
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.student_credited_courses scc
                    WHERE scc.student_id = p_student_id
                    AND scc.course_id = c.id
                    AND scc.deleted_at IS NULL
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
$function$;
GRANT EXECUTE ON FUNCTION public.fn_list_eligible_sections(uuid, uuid, text, text, smallint[], boolean, boolean, boolean, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(p_student_id uuid, p_section_id uuid, p_allow_conflict boolean DEFAULT false, p_conflict_reason text DEFAULT NULL::text, p_override_prerequisites boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student         RECORD;
    v_section         RECORD;
    v_term            RECORD;
    v_taken           INTEGER;
    v_conflicts       TEXT;
    v_unmet           TEXT;
    v_is_authorized   BOOLEAN := false;
    v_reason          TEXT := NULLIF(btrim(COALESCE(p_conflict_reason, '')), '');
BEGIN
    SELECT st.id, st.program_id, st.status, st.user_id
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

    -- Locked until the transaction ends, so the seat count below cannot go stale
    SELECT s.id, s.course_id, s.term_id, s.max_slots, s.status, s.section_code, c.code AS course_code
    INTO v_section
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.id = p_section_id AND s.deleted_at IS NULL
    FOR UPDATE OF s;

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

    -- Validate Term and Academic Year Active Status
    SELECT
        t.id,
        sy.is_active,
        t.status,
        t.enrollment_start_date,
        t.enrollment_end_date
    INTO v_term
    FROM public.terms t
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.id = v_section.term_id AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_NOT_FOUND', 'message', 'Term not found.');
    END IF;

    IF NOT v_term.is_active OR v_term.status = 'Closed' THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_INACTIVE', 'message', 'Term is not active for enrollment.');
    END IF;

    -- Enrollment window dates apply unless the term is already Enrollment Open or Ongoing.
    -- Overriding prerequisites does not bypass this.
    IF v_term.status NOT IN ('Enrollment Open', 'Ongoing') THEN
        IF v_term.enrollment_start_date IS NOT NULL AND (now() AT TIME ZONE 'Asia/Manila')::date < v_term.enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_NOT_STARTED', 'message', 'Enrollment has not started yet.');
        END IF;

        IF v_term.enrollment_end_date IS NOT NULL AND (now() AT TIME ZONE 'Asia/Manila')::date > v_term.enrollment_end_date THEN
            RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_CLOSED', 'message', 'Enrollment is already closed.');
        END IF;
    END IF;

    -- Strict curriculum check
    IF NOT EXISTS (
        SELECT 1
        FROM public.curriculum_maps cm
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

    -- Check if student already enrolled or completed locally
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

    -- Check if course has already been credited from previous institution (Transferee)
    IF EXISTS (
        SELECT 1
        FROM public.student_credited_courses scc
        WHERE scc.student_id = p_student_id
        AND scc.course_id = v_section.course_id
        AND scc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CREDITED',
            'message', 'Course ' || v_section.course_code || ' has already been credited from a previous institution.'
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

    IF v_conflicts IS NOT NULL THEN
        IF NOT p_allow_conflict THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'SCHEDULE_CONFLICT',
                'message', v_section.section_code || ' conflicts with ' || v_conflicts || '.'
            );
        END IF;

        IF v_reason IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CONFLICT_REASON_REQUIRED',
                'message', v_section.section_code || ' conflicts with ' || v_conflicts || '. A reason is required to authorize the conflict.'
            );
        END IF;

        v_is_authorized := true;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND deleted_at IS NULL
    ) THEN
        UPDATE public.enrollments
        SET status = 'Enrolled'::public.enrollment_status_type,
            enrolled_at = now(),
            dropped_at = NULL,
            drop_reason = NULL,
            is_conflict_authorized = v_is_authorized,
            conflict_reason = CASE WHEN v_is_authorized THEN v_reason END,
            conflict_authorized_by = CASE WHEN v_is_authorized THEN auth.uid() END,
            conflict_authorized_at = CASE WHEN v_is_authorized THEN now() END,
            updated_at = now(),
            updated_by = auth.uid()
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND deleted_at IS NULL;
    ELSE
        INSERT INTO public.enrollments (
            student_id,
            section_id,
            status,
            enrolled_at,
            is_conflict_authorized,
            conflict_reason,
            conflict_authorized_by,
            conflict_authorized_at
        ) VALUES (
            p_student_id,
            p_section_id,
            'Enrolled'::public.enrollment_status_type,
            now(),
            v_is_authorized,
            CASE WHEN v_is_authorized THEN v_reason END,
            CASE WHEN v_is_authorized THEN auth.uid() END,
            CASE WHEN v_is_authorized THEN now() END
        );
    END IF;

    -- The last seat was taken
    IF v_taken + 1 >= v_section.max_slots AND v_section.status = 'Open' THEN
        UPDATE public.sections
        SET status = 'Full'::public.section_status_type,
            updated_at = now()
        WHERE id = p_section_id;
    END IF;

    -- Notify the student in real time
    IF v_student.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student.user_id,
            'Enrollment Confirmed',
            format('You have been officially enrolled in %s (%s).', v_section.course_code, v_section.section_code),
            '/student/subjects',
            'Enrollment'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully enrolled in ' || v_section.section_code || '.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_enrollment_students_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels integer[] DEFAULT NULL::integer[], p_statuses text[] DEFAULT NULL::text[], p_enrollment_states text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id    UUID := p_term_id;
    v_term_lit   TEXT;
    v_base_query TEXT;
    v_where      TEXT := 'WHERE st.deleted_at IS NULL';
    v_load_exists TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

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
            COALESCE(st.year_level_overridden, false) AS year_level_overridden,
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_curriculum_audit(p_student_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id           UUID;
    v_student              JSONB;
    v_program              JSONB;
    v_program_id           UUID;
    v_required_units       NUMERIC(8,2);
    v_earned_units         NUMERIC(8,2) := 0;
    v_in_progress_units    NUMERIC(8,2) := 0;
    v_cumulative_gwa       NUMERIC(5,2);
    v_completed            INTEGER := 0;
    v_failed               INTEGER := 0;
    v_in_progress          INTEGER := 0;
    v_total_courses        INTEGER := 0;
    v_year_levels          JSONB;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);

    SELECT
        jsonb_build_object(
            'id', s.id,
            'student_number', s.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'year_level', s.year_level,
            'year_level_overridden', COALESCE(s.year_level_overridden, false),
            'status', s.status,
            'admitted_at', s.admitted_at
        ),
        s.program_id
    INTO v_student, v_program_id
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This student is not assigned to a program yet.'
        );
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'total_units', p.total_units,
        'years_duration', p.years_duration
    )
    INTO v_program
    FROM public.programs p
    WHERE p.id = v_program_id
      AND p.deleted_at IS NULL;

    WITH attempts AS (
        SELECT * FROM public.fn_student_course_grades(v_student_id)
    ),
    best_attempt AS (
        SELECT DISTINCT ON (a.course_id)
            a.course_id,
            a.term_id,
            a.grade,
            a.special_grade,
            a.is_released,
            a.is_passing,
            a.enrollment_status
        FROM attempts a
        ORDER BY
            a.course_id,
            (a.is_passing IS TRUE) DESC,
            a.is_released DESC,
            a.grade ASC NULLS LAST
    ),
    requirements AS (
        SELECT
            COALESCE(cm.units, c.total_units) AS units,
            CASE
                WHEN b.course_id IS NULL THEN 'Not Taken'
                WHEN b.is_passing IS TRUE THEN 'Completed'
                WHEN b.is_released AND b.is_passing IS FALSE THEN 'Failed'
                WHEN b.enrollment_status = 'Enrolled' THEN 'In Progress'
                ELSE 'Not Taken'
            END AS status
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN best_attempt b ON b.course_id = cm.course_id
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
    )
    SELECT
        COALESCE(SUM(r.units) FILTER (WHERE r.status = 'Completed'), 0),
        COALESCE(SUM(r.units) FILTER (WHERE r.status = 'In Progress'), 0),
        COALESCE(SUM(r.units), 0),
        COUNT(*) FILTER (WHERE r.status = 'Completed'),
        COUNT(*) FILTER (WHERE r.status = 'Failed'),
        COUNT(*) FILTER (WHERE r.status = 'In Progress'),
        COUNT(*)
    INTO
        v_earned_units,
        v_in_progress_units,
        v_required_units,
        v_completed,
        v_failed,
        v_in_progress,
        v_total_courses
    FROM requirements r;

    WITH attempts AS (
        SELECT * FROM public.fn_student_course_grades(v_student_id)
    ),
    best_attempt AS (
        SELECT DISTINCT ON (a.course_id)
            a.course_id,
            a.term_id,
            a.grade,
            a.special_grade,
            a.is_released,
            a.is_passing,
            a.enrollment_status
        FROM attempts a
        ORDER BY
            a.course_id,
            (a.is_passing IS TRUE) DESC,
            a.is_released DESC,
            a.grade ASC NULLS LAST
    ),
    requirements AS (
        SELECT
            cm.id AS curriculum_map_id,
            cm.year_level,
            cm.sequence,
            cm.is_elective,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            COALESCE(cm.units, c.total_units) AS units,
            COALESCE(cm.lecture_units, c.lecture_units, 0) AS lecture_units,
            COALESCE(cm.laboratory_units, c.laboratory_units, 0) AS laboratory_units,
            cm.term_type_id AS term_type_id,
            COALESCE(tt.label, 'Unassigned') AS term_type_label,
            COALESCE(tt.sequence, 99) AS term_type_sequence,
            b.grade,
            b.special_grade,
            CASE
                WHEN b.course_id IS NULL THEN 'Not Taken'
                WHEN b.is_passing IS TRUE THEN 'Completed'
                WHEN b.is_released AND b.is_passing IS FALSE THEN 'Failed'
                WHEN b.enrollment_status = 'Enrolled' THEN 'In Progress'
                ELSE 'Not Taken'
            END AS status,
            CASE
                WHEN b.enrollment_status = 'Credited' THEN (
                    SELECT 'Transferred · ' || scc.previous_school
                    FROM public.student_credited_courses scc
                    WHERE scc.student_id = v_student_id
                      AND scc.course_id = cm.course_id
                      AND scc.deleted_at IS NULL
                    LIMIT 1
                )
                WHEN b.is_released THEN tt2.label || ' - ' || sy.label
                ELSE NULL
            END AS taken_label
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN best_attempt b ON b.course_id = cm.course_id
        LEFT JOIN public.terms t ON t.id = b.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt2 ON tt2.id = t.term_type_id AND tt2.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
    ),
    grouped_terms AS (
        SELECT
            r.year_level,
            r.term_type_id,
            r.term_type_label,
            r.term_type_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'curriculum_map_id', r.curriculum_map_id,
                    'course_id', r.course_id,
                    'course_code', r.course_code,
                    'course_title', r.course_title,
                    'units', r.units,
                    'lecture_units', r.lecture_units,
                    'laboratory_units', r.laboratory_units,
                    'grade', r.grade,
                    'special_grade', r.special_grade,
                    'status', r.status,
                    'taken_label', r.taken_label,
                    'is_elective', r.is_elective
                )
                ORDER BY r.sequence, r.course_code
            ) AS courses
        FROM requirements r
        GROUP BY r.year_level, r.term_type_id, r.term_type_label, r.term_type_sequence
    ),
    grouped_years AS (
        SELECT
            gt.year_level,
            jsonb_agg(
                jsonb_build_object(
                    'term_type_id', gt.term_type_id,
                    'term_type_label', gt.term_type_label,
                    'courses', gt.courses
                )
                ORDER BY gt.term_type_sequence
            ) AS terms
        FROM grouped_terms gt
        GROUP BY gt.year_level
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'year_level', gy.year_level,
                'terms', gy.terms
            )
            ORDER BY gy.year_level
        ),
        '[]'::jsonb
    )
    INTO v_year_levels
    FROM grouped_years gy;

    SELECT ROUND(
        SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
        / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
        2
    )
    INTO v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released;

    RETURN jsonb_build_object(
        'success', true,
        'student', v_student,
        'program', v_program,
        'summary', jsonb_build_object(
            'required_units', v_required_units,
            'earned_units', v_earned_units,
            'in_progress_units', v_in_progress_units,
            'remaining_units', GREATEST(v_required_units - v_earned_units - v_in_progress_units, 0),
            'completion_pct', CASE
                WHEN v_required_units > 0
                    THEN ROUND((v_earned_units / v_required_units) * 100, 2)
                ELSE 0
            END,
            'total_courses', v_total_courses,
            'completed_courses', v_completed,
            'failed_courses', v_failed,
            'in_progress_courses', v_in_progress,
            'cumulative_gwa', v_cumulative_gwa
        ),
        'progress', jsonb_build_object(
            'required_units', v_required_units,
            'earned_units', v_earned_units,
            'in_progress_units', v_in_progress_units,
            'progress_percent', CASE
                WHEN v_required_units > 0
                    THEN ROUND((v_earned_units / v_required_units) * 100, 1)
                ELSE 0
            END,
            'cumulative_gwa', v_cumulative_gwa,
            'completed_courses', v_completed,
            'failed_courses', v_failed,
            'in_progress_courses', v_in_progress,
            'total_courses', v_total_courses
        ),
        'year_levels', v_year_levels,
        'curriculum', v_year_levels
    );
END;
$function$;

COMMIT;
