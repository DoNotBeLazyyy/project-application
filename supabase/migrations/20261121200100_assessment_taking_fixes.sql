-- ====================================================================
-- Migration: 20261121200100_assessment_taking_fixes.sql
-- Audit 2026-11-21, assessments (student side). Every function below is the live
-- definition with only the listed change.
--   * #17 fn_get_assessment_questions_for_student: without shuffle, questions and choices
--     are ordered by their number (1, 2, ... 10), not as text (1, 10, 11, 2).
--   * #18 fn_record_heartbeat: an expired attempt finalizes only the caller's own attempt,
--     as of its expiry time, and auto-grades it (fn_autograde_submission). It no longer runs
--     the database-wide fn_expire_overdue_submissions, which marked every overdue attempt
--     Late and left it unscored.
--   * #28 (narrowed) fn_autograde_submission: every server auto-expiry path (heartbeat, sweep,
--     lobby, result page, start) now marks the attempt Late only when it ended after the due
--     date, like fn_submit_assessment does.
--   * #28 fn_save_student_answer, fn_save_student_answer_files: an answer sent after the
--     attempt's time limit (10 s grace for the last autosave) is refused, so it can't count.
--   * #19 fn_unpublish_assessment: also clears a scheduled publish time, so the assessment
--     really stops being takeable.
-- Idempotent: CREATE OR REPLACE only, same signatures and return shapes.
-- ====================================================================
BEGIN;

-- fn_get_assessment_questions_for_student: #17 numeric order without shuffle
CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions_for_student(p_assessment_id uuid, p_enrollment_id uuid, p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id    UUID;
    v_shuffle_q     BOOLEAN;
    v_shuffle_c     BOOLEAN;
    v_seed          TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        INNER JOIN public.assessment_items ai ON ai.section_id = e.section_id
        WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
          AND (v_student_id IS NULL OR e.student_id = v_student_id)
          AND ai.id = p_assessment_id
          AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
          AND ai.deleted_at IS NULL
          AND e.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    SELECT shuffle_questions, shuffle_choices
    INTO v_shuffle_q, v_shuffle_c
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    v_seed := p_submission_id::text;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            aq.id,
                'question_text', aq.question_text,
                'question_type', aq.question_type,
                'points',        aq.points,
                'sequence',      aq.sequence,
                'is_required',        aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'saved_answer', (
                    SELECT jsonb_build_object(
                        'id',               sa.id,
                        'answer_text',      sa.answer_text,
                        'choice_id',        sa.choice_id,
                        'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb)
                    )
                    FROM public.student_answers sa
                    WHERE sa.submission_id = p_submission_id
                      AND sa.question_id = aq.id
                      AND sa.deleted_at IS NULL
                    LIMIT 1
                ),
                'choices',       CASE
                    WHEN aq.question_type IN ('Multiple Choice', 'True or False', 'Matching') THEN (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',          c.id,
                                'choice_text', c.choice_text,
                                'sequence',    c.sequence
                            )
                            -- Shuffle key first (NULL when not shuffled), then the number itself
                            ORDER BY CASE WHEN COALESCE(v_shuffle_c, false) THEN md5(v_seed || c.id::text) END ASC,
                                     c.sequence ASC,
                                     c.id ASC
                        ), '[]'::jsonb)
                        FROM public.assessment_question_choices c
                        WHERE c.question_id = aq.id AND c.deleted_at IS NULL
                    )
                    ELSE '[]'::jsonb
                END
            )
            ORDER BY CASE WHEN COALESCE(v_shuffle_q, false) THEN md5(v_seed || aq.id::text) END ASC,
                     aq.sequence ASC,
                     aq.created_at ASC
        ), '[]'::jsonb)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id AND aq.deleted_at IS NULL
    );
END;
$function$;

-- fn_autograde_submission: #28 auto-expired attempts are Late only after the due date
CREATE OR REPLACE FUNCTION public.fn_autograde_submission(p_submission_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_assessment_id UUID;
    v_has_manual BOOLEAN;
    v_score NUMERIC;
BEGIN
    SELECT assessment_item_id INTO v_assessment_id
    FROM public.assessment_submissions
    WHERE id = p_submission_id AND deleted_at IS NULL;

    IF v_assessment_id IS NULL THEN
        RETURN;
    END IF;

    -- Same rule as fn_submit_assessment: late means it ended after the due date
    UPDATE public.assessment_submissions asub
    SET is_late = (ai.due_at IS NOT NULL AND asub.submitted_at > ai.due_at)
    FROM public.assessment_items ai
    WHERE asub.id = p_submission_id
      AND ai.id = asub.assessment_item_id
      AND asub.status = 'Submitted'
      AND asub.submitted_at IS NOT NULL;

    INSERT INTO public.student_answers (submission_id, question_id, answer_text, choice_id, is_correct, points_earned)
    SELECT p_submission_id, aq.id, NULL, NULL, false, 0
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = v_assessment_id
      AND aq.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.student_answers sa
          WHERE sa.submission_id = p_submission_id AND sa.question_id = aq.id
      );

    SELECT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = v_assessment_id
          AND aq.deleted_at IS NULL
          AND aq.question_type NOT IN ('Multiple Choice', 'True or False', 'Matching')
    ) INTO v_has_manual;

    IF v_has_manual THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(points_earned), 0) INTO v_score
    FROM public.student_answers
    WHERE submission_id = p_submission_id AND deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET status = 'Graded',
        raw_score = v_score,
        final_score = v_score,
        graded_at = now(),
        feedback = COALESCE(feedback, 'Auto-graded when the time limit expired.'),
        updated_at = now()
    WHERE id = p_submission_id
      AND status = 'Submitted';
END;
$function$;

-- fn_record_heartbeat: #18 finalize only the caller's own expired attempt, and grade it
CREATE OR REPLACE FUNCTION public.fn_record_heartbeat(p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id  UUID;
  v_expires_at  TIMESTAMPTZ;
  v_status      submission_timer_status;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

  SELECT id, server_expires_at, status
  INTO v_session_id, v_expires_at, v_status
  FROM public.assessment_timer_sessions
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session not found.');
  END IF;

  IF v_status != 'Active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session is no longer active.', 'status', v_status);
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    -- Only this attempt, as of the moment its time ran out
    UPDATE public.assessment_submissions
    SET status       = 'Submitted',
        submitted_at = COALESCE(time_limit_expires_at, v_expires_at),
        updated_at   = now()
    WHERE id         = p_submission_id
      AND status     = 'In Progress'
      AND deleted_at IS NULL;

    IF FOUND THEN
      PERFORM public.fn_autograde_submission(p_submission_id);
    END IF;

    UPDATE public.assessment_timer_sessions
    SET status           = 'Expired',
        forced_submit_at = now(),
        last_activity_at = now()
    WHERE id     = v_session_id
      AND status = 'Active';

    RETURN jsonb_build_object('success', false, 'message', 'Session has expired.', 'expired_at', v_expires_at);
  END IF;

  INSERT INTO public.assessment_timer_heartbeats (session_id, recorded_at, client_ip)
  VALUES (v_session_id, now(), inet_client_addr());

  UPDATE public.assessment_timer_sessions
  SET last_activity_at = now()
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'success',      true,
    'session_id',   v_session_id,
    'expires_at',   v_expires_at,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_expires_at - now()))::INTEGER,
    'recorded_at',  now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- fn_save_student_answer: #28 refuse answers sent after the time limit
CREATE OR REPLACE FUNCTION public.fn_save_student_answer(p_submission_id uuid, p_question_id uuid, p_answer_text text, p_choice_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_correct BOOLEAN := NULL;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
        INNER JOIN public.students st ON st.id = e.student_id
        WHERE asub.id = p_submission_id
        AND st.user_id = auth.uid()
        AND asub.status IN ('In Progress', 'Not Started')
        AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or not in progress.');
    END IF;

    -- A short grace covers the autosave sent as the timer reaches zero
    IF EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        WHERE asub.id = p_submission_id
          AND asub.time_limit_expires_at IS NOT NULL
          AND now() > asub.time_limit_expires_at + interval '10 seconds'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Time is up: this attempt has expired, so the answer was not saved.');
    END IF;

    IF p_choice_id IS NOT NULL THEN
        SELECT is_correct INTO v_is_correct
        FROM public.assessment_question_choices
        WHERE id = p_choice_id AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.student_answers (
        submission_id,
        question_id,
        answer_text,
        choice_id,
        is_correct,
        points_earned,
        created_by
    ) VALUES (
        p_submission_id,
        p_question_id,
        NULLIF(p_answer_text, ''),
        p_choice_id,
        v_is_correct,
        CASE
            WHEN v_is_correct = true THEN (
                SELECT points FROM public.assessment_questions
                WHERE id = p_question_id AND deleted_at IS NULL
            )
            WHEN v_is_correct = false THEN 0
            ELSE NULL
        END,
        auth.uid()
    )
    ON CONFLICT (submission_id, question_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        deleted_at    = NULL,
        updated_at    = now(),
        answer_text   = NULLIF(p_answer_text, ''),
        choice_id     = p_choice_id,
        is_correct    = v_is_correct,
        points_earned = CASE
            WHEN v_is_correct = true THEN (
                SELECT points FROM public.assessment_questions
                WHERE id = p_question_id AND deleted_at IS NULL
            )
            WHEN v_is_correct = false THEN 0
            ELSE NULL
        END;

    RETURN jsonb_build_object('success', true, 'message', 'Answer saved.');
END;
$function$;

-- fn_save_student_answer_files: #28 refuse files sent after the time limit
CREATE OR REPLACE FUNCTION public.fn_save_student_answer_files(p_submission_id uuid, p_question_id uuid, p_files jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
        INNER JOIN public.students st ON st.id = e.student_id
        WHERE asub.id = p_submission_id
          AND st.user_id = auth.uid()
          AND asub.status IN ('In Progress', 'Not Started')
          AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or not in progress.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        WHERE asub.id = p_submission_id
          AND asub.time_limit_expires_at IS NOT NULL
          AND now() > asub.time_limit_expires_at + interval '10 seconds'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Time is up: this attempt has expired, so the files were not saved.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        INNER JOIN public.assessment_submissions asub ON asub.assessment_item_id = aq.assessment_item_id
        WHERE aq.id = p_question_id
          AND asub.id = p_submission_id
          AND aq.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question does not belong to this assessment.');
    END IF;

    INSERT INTO public.student_answers (
        submission_id,
        question_id,
        file_attachments,
        created_by
    ) VALUES (
        p_submission_id,
        p_question_id,
        COALESCE(p_files, '[]'::jsonb),
        auth.uid()
    )
    ON CONFLICT (submission_id, question_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        deleted_at = NULL,
        updated_at = now(),
        file_attachments = COALESCE(p_files, '[]'::jsonb),
        answer_text = NULL,
        choice_id = NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Files saved.');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- fn_unpublish_assessment: #19 also cancel a scheduled publish
CREATE OR REPLACE FUNCTION public.fn_unpublish_assessment(p_assessment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    -- A scheduled publish time keeps an assessment takeable, so it is cleared too
    UPDATE public.assessment_items
    SET is_published         = false,
        scheduled_publish_at = NULL
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment unpublished successfully.');
END;
$function$;

COMMIT;
