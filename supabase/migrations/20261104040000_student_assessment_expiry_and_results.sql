-- ====================================================================
-- Migration: 20261104040000_student_assessment_expiry_and_results.sql
--   * fn_get_assessment_for_student: an In Progress attempt whose time ran out is now
--     submitted (and auto-graded) when the student opens the assessment, and the reply says
--     so (expired_attempt_auto_submitted). Before, "Resume" quietly started a new attempt.
--     Also returns active_submission_expires_at so the page knows when a live attempt ends.
--   * fn_get_my_assessment_result: submits an expired attempt the same way before reading the
--     latest attempt. When an assessment has no Show Results At, no close date and no due
--     date, a fully auto-graded attempt now shows its score right after submission (before,
--     the score stayed hidden forever).
--   Signatures and grants are unchanged (CREATE OR REPLACE keeps grants).
-- ====================================================================
BEGIN;

-- fn_get_assessment_for_student
CREATE OR REPLACE FUNCTION public.fn_get_assessment_for_student(p_assessment_id uuid, p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_actual_enrollment_id UUID;
    v_result JSONB;
    v_expired_ids UUID[];
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT e.id INTO v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.assessment_items ai ON ai.section_id = e.section_id AND ai.id = p_assessment_id
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_actual_enrollment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    -- An attempt that ran out of time is submitted now, so the student is told about it
    -- instead of "Resume" quietly starting a new attempt.
    WITH expired_subs AS (
        UPDATE public.assessment_submissions
        SET status       = 'Submitted',
            submitted_at = time_limit_expires_at,
            updated_at   = now()
        WHERE assessment_item_id = p_assessment_id
        AND enrollment_id = v_actual_enrollment_id
        AND status = 'In Progress'
        AND time_limit_expires_at IS NOT NULL
        AND time_limit_expires_at < now()
        AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_expired_ids FROM expired_subs;

    IF cardinality(v_expired_ids) > 0 THEN
        PERFORM public.fn_autograde_submission(sid) FROM unnest(v_expired_ids) AS sid;

        UPDATE public.assessment_timer_sessions
        SET status = 'Expired', last_activity_at = now()
        WHERE submission_id = ANY(v_expired_ids)
        AND status = 'Active';
    END IF;

    SELECT jsonb_build_object(
        'id',                       ai.id,
        'enrollment_id',            v_actual_enrollment_id,
        'title',                    ai.title,
        'description',              ai.description,
        'assessment_type',          ai.assessment_type,
        'total_points',             ai.total_points,
        'passing_points',           ai.passing_points,
        'time_limit_minutes',       ai.time_limit_minutes,
        'max_attempts',             ai.max_attempts,
        'show_all_questions',       ai.show_all_questions,
        'questions_per_page',       ai.questions_per_page,
        'shuffle_questions',        ai.shuffle_questions,
        'shuffle_choices',          ai.shuffle_choices,
        'opens_at',                 ai.opens_at,
        'due_at',                   ai.due_at,
        'closes_at',                ai.closes_at,
        'show_results_at',          ai.show_results_at,
        'scheduled_publish_at',     ai.scheduled_publish_at,
        'attempts_used', (
            SELECT COUNT(*)::int
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = v_actual_enrollment_id
              AND asub.status != 'In Progress'
              AND asub.deleted_at IS NULL
        ),
        'has_active_submission', EXISTS (
            SELECT 1
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = v_actual_enrollment_id
              AND asub.status = 'In Progress'
              AND asub.deleted_at IS NULL
        ),
        'active_submission_expires_at', (
            SELECT asub.time_limit_expires_at
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = v_actual_enrollment_id
              AND asub.status = 'In Progress'
              AND asub.deleted_at IS NULL
            ORDER BY asub.started_at DESC
            LIMIT 1
        ),
        'expired_attempt_auto_submitted', cardinality(v_expired_ids) > 0,
        'latest_submission_status', (
            SELECT asub.status::text
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = v_actual_enrollment_id
              AND asub.deleted_at IS NULL
            ORDER BY asub.started_at DESC
            LIMIT 1
        ),
        'attachments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              aa.id,
                    'file_name',       aa.file_name,
                    'file_url',        aa.file_url,
                    'file_size_bytes', aa.file_size_bytes,
                    'mime_type',       aa.mime_type
                )
                ORDER BY aa.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_attachments aa
            WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$function$;

-- fn_get_my_assessment_result
CREATE OR REPLACE FUNCTION public.fn_get_my_assessment_result(p_enrollment_id uuid, p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id            UUID;
    v_actual_enrollment_id  UUID;
    v_item                  RECORD;
    v_submission            RECORD;
    v_results_available     BOOLEAN;
    v_review_available      BOOLEAN;
    v_review_blocked_reason TEXT;
    v_window_over           BOOLEAN;
    v_rubric_id             UUID;
    v_is_fully_auto_graded  BOOLEAN;
    v_expired_ids           UUID[];
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT e.id INTO v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.assessment_items ai ON ai.section_id = e.section_id AND ai.id = p_assessment_id
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_actual_enrollment_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    SELECT
        ai.id, ai.title, ai.description, ai.assessment_type, ai.total_points,
        ai.passing_points, ai.max_attempts, ai.show_results_at, ai.opens_at,
        ai.due_at, ai.closes_at, ai.allow_student_review, ai.use_rubric_scoring,
        gp.name AS grading_period_name
    INTO v_item
    FROM public.assessment_items ai
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.id = p_assessment_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    IF v_item.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    -- Submit an attempt that ran out of time, so the latest attempt shows its real result.
    WITH expired_subs AS (
        UPDATE public.assessment_submissions
        SET status       = 'Submitted',
            submitted_at = time_limit_expires_at,
            updated_at   = now()
        WHERE assessment_item_id = p_assessment_id
        AND enrollment_id = v_actual_enrollment_id
        AND status = 'In Progress'
        AND time_limit_expires_at IS NOT NULL
        AND time_limit_expires_at < now()
        AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_expired_ids FROM expired_subs;

    IF cardinality(v_expired_ids) > 0 THEN
        PERFORM public.fn_autograde_submission(sid) FROM unnest(v_expired_ids) AS sid;

        UPDATE public.assessment_timer_sessions
        SET status = 'Expired', last_activity_at = now()
        WHERE submission_id = ANY(v_expired_ids)
        AND status = 'Active';
    END IF;

    SELECT asub.id, asub.status, asub.attempt_number, asub.submitted_at, asub.graded_at,
           asub.is_late, asub.raw_score, asub.final_score, asub.feedback
    INTO v_submission
    FROM public.assessment_submissions asub
    WHERE asub.assessment_item_id = p_assessment_id
    AND asub.enrollment_id = v_actual_enrollment_id
    AND asub.deleted_at IS NULL
    ORDER BY asub.attempt_number DESC
    LIMIT 1;

    -- Every question is scored by the system and no rubric is used
    v_is_fully_auto_graded := NOT COALESCE(v_item.use_rubric_scoring, false)
        AND NOT EXISTS (
            SELECT 1 FROM public.assessment_questions aq
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
            AND aq.question_type NOT IN ('Multiple Choice', 'True or False', 'Matching')
        );

    v_window_over := (v_item.closes_at IS NOT NULL AND v_item.closes_at <= now())
        OR (v_item.closes_at IS NULL AND v_item.due_at IS NOT NULL AND v_item.due_at <= now());

    IF v_submission.id IS NULL THEN
        v_results_available := v_item.show_results_at IS NOT NULL AND v_item.show_results_at <= now();
        v_review_available  := false;
        v_review_blocked_reason := 'No submission found for this assessment.';
    ELSE
        IF v_item.show_results_at IS NOT NULL THEN
            v_results_available := now() >= v_item.show_results_at;
        ELSE
            -- With no release date and no close or due date the window never ends, so a
            -- fully auto-graded attempt shows its score right after it is submitted.
            v_results_available := v_submission.status IN ('Graded', 'Submitted', 'Late')
                AND (
                    v_window_over
                    OR (
                        v_item.closes_at IS NULL
                        AND v_item.due_at IS NULL
                        AND v_submission.status = 'Graded'
                        AND v_is_fully_auto_graded
                    )
                );
        END IF;

        IF NOT COALESCE(v_item.allow_student_review, true) THEN
            v_review_available      := false;
            v_review_blocked_reason := 'The instructor has disabled question-by-question review for this assessment.';
        ELSIF NOT v_window_over THEN
            v_review_available      := false;
            v_review_blocked_reason := 'Review and correct answers will be visible after the assessment closes.';
        ELSIF NOT v_results_available THEN
            v_review_available      := false;
            v_review_blocked_reason := 'Results are scheduled to release at a later date.';
        ELSE
            v_review_available      := true;
            v_review_blocked_reason := NULL;
        END IF;
    END IF;

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_item_rubrics air
    WHERE air.assessment_item_id = p_assessment_id AND air.deleted_at IS NULL
    LIMIT 1;

    RETURN jsonb_build_object(
        'assessment_id',         v_item.id,
        'enrollment_id',         v_actual_enrollment_id,
        'title',                 v_item.title,
        'description',           v_item.description,
        'assessment_type',       v_item.assessment_type,
        'grading_period_name',   v_item.grading_period_name,
        'has_submission',        v_submission.id IS NOT NULL,
        'submission_id',         v_submission.id,
        'status',                v_submission.status,
        'submission_status',     v_submission.status,
        'attempt_number',        v_submission.attempt_number,
        'max_attempts',          v_item.max_attempts,
        'submitted_at',          v_submission.submitted_at,
        'graded_at',             v_submission.graded_at,
        'is_late',               COALESCE(v_submission.is_late, false),
        'total_points',          v_item.total_points,
        'passing_points',        v_item.passing_points,
        'question_count', (
            SELECT COUNT(*)
            FROM public.assessment_questions aq
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        ),
        'opens_at',              v_item.opens_at,
        'due_at',                v_item.due_at,
        'closes_at',             v_item.closes_at,
        'show_results_at',       v_item.show_results_at,
        'results_available',     v_results_available,
        'review_available',      v_review_available,
        'review_blocked_reason', v_review_blocked_reason,
        'use_rubric_scoring',    COALESCE(v_item.use_rubric_scoring, false),
        'raw_score',             CASE WHEN v_results_available THEN v_submission.raw_score ELSE NULL END,
        'final_score',           CASE WHEN v_results_available THEN v_submission.final_score ELSE NULL END,
        'feedback',              CASE WHEN v_results_available THEN v_submission.feedback ELSE NULL END,
        'attachments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              aa.id,
                    'file_name',       aa.file_name,
                    'file_url',        aa.file_url,
                    'file_size_bytes', aa.file_size_bytes,
                    'mime_type',       aa.mime_type,
                    'sequence',        aa.sequence
                )
                ORDER BY aa.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_attachments aa
            WHERE aa.assessment_item_id = p_assessment_id AND aa.deleted_at IS NULL
        ),
        'rubric', CASE WHEN v_rubric_id IS NULL OR NOT v_review_available THEN NULL ELSE (
            SELECT jsonb_build_object(
                'id',           r.id,
                'title',        r.title,
                'total_points', r.total_points,
                'criteria', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',            rc.id,
                            'criterion_id',  rc.id,
                            'title',         rc.title,
                            'description',   rc.description,
                            'max_points',    rc.max_points,
                            'sequence',      rc.sequence,
                            'points_earned', CASE WHEN v_results_available THEN re.points_earned ELSE NULL END,
                            'feedback',      CASE WHEN v_results_available THEN re.feedback ELSE NULL END
                        )
                        ORDER BY rc.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.rubric_criteria rc
                    LEFT JOIN public.rubric_evaluations re
                        ON re.criteria_id = rc.id
                        AND re.submission_id = v_submission.id
                        AND re.deleted_at IS NULL
                    WHERE rc.rubric_id = v_rubric_id
                    AND rc.deleted_at IS NULL
                )
            )
            FROM public.rubrics r
            WHERE r.id = v_rubric_id AND r.deleted_at IS NULL
        ) END,
        'answers', CASE WHEN NOT v_review_available THEN '[]'::JSONB ELSE (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',               aq.id,
                    'question_id',      aq.id,
                    'question_text',    aq.question_text,
                    'question_type',    aq.question_type,
                    'points',           aq.points,
                    'points_possible',  aq.points,
                    'sequence',         aq.sequence,
                    'explanation',      CASE WHEN v_results_available THEN aq.explanation ELSE NULL END,
                    'answer_text',      sa.answer_text,
                    'student_response', sa.answer_text,
                    'choice_id',        sa.choice_id,
                    'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb),
                    'attachments',      COALESCE(sa.file_attachments, '[]'::jsonb),
                    'points_earned',    CASE WHEN v_results_available THEN sa.points_earned ELSE NULL END,
                    'is_correct',       CASE WHEN v_results_available THEN sa.is_correct ELSE NULL END,
                    'grader_notes',     CASE WHEN v_results_available THEN sa.grader_notes ELSE NULL END,
                    'choices', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',          aqc.id,
                                'choice_text', aqc.choice_text,
                                'sequence',    aqc.sequence,
                                'is_correct',  CASE WHEN v_results_available THEN aqc.is_correct ELSE NULL END
                            )
                            ORDER BY aqc.sequence ASC
                        ), '[]'::JSONB)
                        FROM public.assessment_question_choices aqc
                        WHERE aqc.question_id = aq.id AND aqc.deleted_at IS NULL
                    )
                )
                ORDER BY aq.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_questions aq
            LEFT JOIN public.student_answers sa
                ON sa.question_id = aq.id
                AND sa.submission_id = v_submission.id
                AND sa.deleted_at IS NULL
            WHERE aq.assessment_item_id = p_assessment_id
            AND aq.deleted_at IS NULL
        ) END
    );
END;
$function$;

COMMIT;
