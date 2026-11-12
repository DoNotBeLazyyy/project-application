-- ====================================================================
-- Migration: 20261104022000_enrollment_workspace_fixes.sql
--   * fn_enroll_student_section:
--       - the section row is locked while seats are counted, so two enrollments at the same
--         time cannot go over Max Slots; the section is marked Full when the last seat goes
--       - "Override prerequisites" no longer skips the enrollment window check
--       - an authorized schedule conflict is stored on the enrollment (is_conflict_authorized,
--         conflict_reason, conflict_authorized_by/at); a conflict needs a reason
--   * fn_drop_enrollment: only an Enrolled subject of a term that is not over and has no
--     approved or released grade can be dropped; a Full section reopens after a drop
--   * fn_save_student_enrollment_changes (new): the registrar workspace's drops and new
--     enrollments in one call. Drops run first so a student can switch sections of the same
--     course; if none of the new sections can be enrolled, the drops are undone too. Skipped
--     sections come back with their reasons
-- The enrollments conflict columns already exist (schema_live.sql); ADD COLUMN IF NOT EXISTS
-- is kept for databases created before them.
-- Idempotent: CREATE OR REPLACE keeps the existing functions' signatures and grants
-- (fn_enroll_student_section stays callable only by its SECURITY DEFINER callers).
-- ====================================================================
BEGIN;

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS is_conflict_authorized boolean DEFAULT false NOT NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS conflict_authorized_by uuid;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS conflict_authorized_at timestamp with time zone;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS conflict_reason text;

-- fn_enroll_student_section
CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(
    p_student_id uuid,
    p_section_id uuid,
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL::text,
    p_override_prerequisites boolean DEFAULT false
)
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
        IF v_term.enrollment_start_date IS NOT NULL AND CURRENT_DATE < v_term.enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_NOT_STARTED', 'message', 'Enrollment has not started yet.');
        END IF;

        IF v_term.enrollment_end_date IS NOT NULL AND CURRENT_DATE > v_term.enrollment_end_date THEN
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

-- fn_drop_enrollment
CREATE OR REPLACE FUNCTION public.fn_drop_enrollment(p_enrollment_id uuid, p_drop_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row RECORD;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT e.status, e.section_id, s.section_code, s.status AS section_status,
           t.status AS term_status, t.end_date, COALESCE(sy.is_active, false) AS is_active_year
    INTO v_row
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    IF v_row.status <> 'Enrolled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('%s cannot be dropped: the enrollment is already %s.', v_row.section_code, v_row.status)
        );
    END IF;

    IF NOT v_row.is_active_year OR v_row.term_status = 'Closed' OR v_row.end_date < CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', v_row.section_code || ' cannot be dropped: its term is already over.'
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.section_final_grades sfg
        WHERE sfg.enrollment_id = p_enrollment_id
          AND sfg.deleted_at IS NULL
          AND sfg.status IN ('Approved', 'Released')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', v_row.section_code || ' cannot be dropped: the student already has an approved or released grade in it.'
        );
    END IF;

    UPDATE public.enrollments
    SET status = 'Dropped'::public.enrollment_status_type,
        dropped_at = now(),
        drop_reason = NULLIF(trim(COALESCE(p_drop_reason, '')), ''),
        updated_by = auth.uid()
    WHERE id = p_enrollment_id AND deleted_at IS NULL;

    -- A seat is free again
    IF v_row.section_status = 'Full' THEN
        UPDATE public.sections
        SET status = 'Open'::public.section_status_type,
            updated_at = now()
        WHERE id = v_row.section_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Dropped ' || v_row.section_code || '.');
END;
$function$;

-- fn_save_student_enrollment_changes
CREATE OR REPLACE FUNCTION public.fn_save_student_enrollment_changes(
    p_student_id uuid,
    p_section_ids uuid[] DEFAULT NULL::uuid[],
    p_drop_enrollment_ids uuid[] DEFAULT NULL::uuid[],
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL::text,
    p_override_prerequisites boolean DEFAULT false
)
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
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_requested = 0 AND COALESCE(array_length(p_drop_enrollment_ids, 1), 0) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'There are no changes to save.');
    END IF;

    -- Drops first, so a student can move to another section of the same course
    IF p_drop_enrollment_ids IS NOT NULL THEN
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

REVOKE ALL ON FUNCTION public.fn_save_student_enrollment_changes(uuid, uuid[], uuid[], boolean, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_save_student_enrollment_changes(uuid, uuid[], uuid[], boolean, text, boolean) TO authenticated, service_role;

COMMIT;
