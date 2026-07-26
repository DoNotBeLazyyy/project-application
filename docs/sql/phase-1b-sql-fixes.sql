CREATE OR REPLACE FUNCTION public.fn_upsert_student_section_color(p_section_id uuid, p_color text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    INSERT INTO public.student_section_colors (
        student_id,
        section_id,
        color,
        created_by
    ) VALUES (
        v_student_id,
        p_section_id,
        p_color,
        auth.uid()
    )
    ON CONFLICT (student_id, section_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        color = p_color,
        updated_at = now(),
        updated_by = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Color saved successfully.');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_start_assessment_timer(p_enrollment_id uuid, p_assessment_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_submission_id       UUID;
    v_time_limit          SMALLINT;
    v_closes_at           TIMESTAMPTZ;
    v_opens_at            TIMESTAMPTZ;
    v_attempt_number      SMALLINT;
    v_max_attempts        SMALLINT;
    v_expires_at          TIMESTAMPTZ;
    v_section_id          UUID;
    v_is_enrolled         BOOLEAN;
BEGIN
    SELECT
        ai.time_limit_minutes,
        ai.closes_at,
        ai.opens_at,
        ai.max_attempts,
        ai.section_id
    INTO v_time_limit, v_closes_at, v_opens_at, v_max_attempts, v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
    AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
    AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or not published.');
    END IF;

    IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment is not yet open.');
    END IF;

    IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment window has closed.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = p_enrollment_id
        AND e.section_id = v_section_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not enrolled in this section.');
    END IF;

    SELECT COUNT(*) INTO v_attempt_number
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = p_enrollment_id
    AND deleted_at IS NULL;

    IF v_attempt_number >= v_max_attempts THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum attempts reached.');
    END IF;

    v_expires_at := CASE
        WHEN v_time_limit IS NOT NULL THEN now() + (v_time_limit || ' minutes')::INTERVAL
        ELSE NULL
    END;

    INSERT INTO public.assessment_submissions (
        assessment_item_id, enrollment_id, attempt_number,
        status, started_at, time_limit_expires_at, created_by
    ) VALUES (
        p_assessment_id, p_enrollment_id, v_attempt_number + 1,
        'In Progress', now(), v_expires_at, auth.uid()
    )
    RETURNING id INTO v_submission_id;

    INSERT INTO public.assessment_timer_sessions (
        submission_id, enrollment_id, assessment_item_id,
        server_started_at, server_expires_at,
        status, last_activity_at, created_by
    ) VALUES (
        v_submission_id, p_enrollment_id, p_assessment_id,
        now(), v_expires_at,
        'Active', now(), auth.uid()
    );

    RETURN jsonb_build_object(
        'success',       true,
        'submission_id', v_submission_id,
        'expires_at',    v_expires_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_admin_dashboard_stats()
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_is_admin           BOOLEAN;
    v_total_students     INTEGER;
    v_total_faculty      INTEGER;
    v_total_programs     INTEGER;
    v_active_terms       INTEGER;
    v_active_enrollments INTEGER;
    v_pending_clearances INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.code = 'Admin'
        AND ur.revoked_at IS NULL
        AND ur.deleted_at IS NULL
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized.');
    END IF;

    SELECT COUNT(*) INTO v_total_students
    FROM public.students
    WHERE status = 'Active' AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT ur.user_id) INTO v_total_faculty
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    JOIN public.users u ON u.id = ur.user_id
    WHERE r.code = 'Faculty'
    AND ur.revoked_at IS NULL
    AND ur.deleted_at IS NULL
    AND u.deleted_at IS NULL;

    SELECT COUNT(*) INTO v_total_programs
    FROM public.programs
    WHERE deleted_at IS NULL;

    SELECT COUNT(*) INTO v_active_terms
    FROM public.terms
    WHERE status IN ('Enrollment Open', 'Ongoing', 'Grading Period')
    AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_active_enrollments
    FROM public.enrollments
    WHERE status = 'Enrolled' AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_pending_clearances
    FROM public.student_clearances
    WHERE status = 'Pending' AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'total_students', v_total_students,
        'total_faculty', v_total_faculty,
        'total_programs', v_total_programs,
        'active_terms', v_active_terms,
        'active_enrollments', v_active_enrollments,
        'pending_clearances', v_pending_clearances
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_admin_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_admin_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_admin_dashboard_stats() TO authenticated;
