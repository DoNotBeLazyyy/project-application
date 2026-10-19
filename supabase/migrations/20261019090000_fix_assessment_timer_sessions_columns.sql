-- Migration: 20261019090000_fix_assessment_timer_sessions_columns.sql
-- Description: Fix column "started_at" of relation "assessment_timer_sessions" does not exist error
--              by updating fn_start_assessment_timer to insert into valid columns (server_started_at, server_expires_at, status, last_activity_at, created_by).

CREATE OR REPLACE FUNCTION public.fn_start_assessment_timer(p_enrollment_id uuid, p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_submission_id           UUID;
    v_time_limit              SMALLINT;
    v_closes_at               TIMESTAMPTZ;
    v_opens_at                TIMESTAMPTZ;
    v_attempt_number          SMALLINT;
    v_max_attempts            SMALLINT;
    v_expires_at              TIMESTAMPTZ;
    v_section_id              UUID;
    v_student_id              UUID;
    v_actual_enrollment_id    UUID;
    v_existing_submission_id  UUID;
    v_existing_expires_at     TIMESTAMPTZ;
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

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT e.id INTO v_actual_enrollment_id
    FROM public.enrollments e
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.section_id = v_section_id
    AND (v_student_id IS NULL OR e.student_id = v_student_id)
    AND e.status = 'Enrolled'
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_actual_enrollment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not enrolled in this section.');
    END IF;

    SELECT id, time_limit_expires_at
    INTO v_existing_submission_id, v_existing_expires_at
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = v_actual_enrollment_id
    AND status = 'In Progress'
    AND deleted_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_submission_id IS NOT NULL THEN
        IF v_existing_expires_at IS NOT NULL AND now() > v_existing_expires_at THEN
            UPDATE public.assessment_submissions
            SET status = 'Submitted', submitted_at = v_existing_expires_at
            WHERE id = v_existing_submission_id;

            UPDATE public.assessment_timer_sessions
            SET status = 'Expired', last_activity_at = now()
            WHERE submission_id = v_existing_submission_id
            AND status = 'Active';
        ELSE
            RETURN jsonb_build_object(
                'success',          true,
                'submission_id',    v_existing_submission_id,
                'enrollment_id',    v_actual_enrollment_id,
                'expires_at',       v_existing_expires_at,
                'is_resumed',       true
            );
        END IF;
    END IF;

    SELECT COUNT(*)::SMALLINT
    INTO v_attempt_number
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = v_actual_enrollment_id
    AND status != 'In Progress'
    AND deleted_at IS NULL;

    IF v_attempt_number >= v_max_attempts THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Maximum attempts (%s) reached for this assessment.', v_max_attempts)
        );
    END IF;

    IF v_time_limit IS NOT NULL AND v_time_limit > 0 THEN
        v_expires_at := now() + (v_time_limit || ' minutes')::INTERVAL;
        IF v_closes_at IS NOT NULL AND v_expires_at > v_closes_at THEN
            v_expires_at := v_closes_at;
        END IF;
    ELSE
        v_expires_at := v_closes_at;
    END IF;

    INSERT INTO public.assessment_submissions (
        assessment_item_id, enrollment_id, attempt_number,
        status, started_at, time_limit_expires_at, created_by
    ) VALUES (
        p_assessment_id, v_actual_enrollment_id, v_attempt_number + 1,
        'In Progress', now(), v_expires_at, auth.uid()
    )
    RETURNING id INTO v_submission_id;

    INSERT INTO public.assessment_timer_sessions (
        submission_id, enrollment_id, assessment_item_id,
        server_started_at, server_expires_at,
        status, last_activity_at, created_by
    ) VALUES (
        v_submission_id, v_actual_enrollment_id, p_assessment_id,
        now(), v_expires_at,
        'Active', now(), auth.uid()
    );

    RETURN jsonb_build_object(
        'success',          true,
        'submission_id',    v_submission_id,
        'enrollment_id',    v_actual_enrollment_id,
        'expires_at',       v_expires_at,
        'attempt_number',   v_attempt_number + 1,
        'is_resumed',       false
    );
END;
$function$;
