-- Migration: 20261027000000_fix_student_assessment_visibility_and_submission.sql
-- Description: Fix student assessment visibility, question loading, submission score columns, and notification routing to assessments tab.

-- 1. Fix fn_get_subject_assessments: Ensure published and scheduled assessments are visible to students, and calculate is_published reliably.
CREATE OR REPLACE FUNCTION public.fn_get_subject_assessments(p_enrollment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_actual_enrollment_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    -- 1. Try to find enrollment and section by enrollment_id or section_id
    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND (
        v_student_id IS NULL
        OR e.student_id = v_student_id
        OR EXISTS (
            SELECT 1 FROM public.students st
            WHERE st.id = e.student_id AND st.user_id = auth.uid() AND st.deleted_at IS NULL
        )
    )
    AND e.deleted_at IS NULL
    ORDER BY CASE WHEN e.status = 'Enrolled' THEN 1 ELSE 2 END ASC
    LIMIT 1;

    -- 2. If not matched to current user enrollment, check if p_enrollment_id is directly a section_id
    IF v_section_id IS NULL THEN
        SELECT s.id INTO v_section_id
        FROM public.sections s
        WHERE s.id = p_enrollment_id AND s.deleted_at IS NULL;

        IF v_section_id IS NOT NULL AND v_student_id IS NOT NULL THEN
            SELECT e.id INTO v_actual_enrollment_id
            FROM public.enrollments e
            WHERE e.section_id = v_section_id
              AND e.student_id = v_student_id
              AND e.deleted_at IS NULL
            ORDER BY CASE WHEN e.status = 'Enrolled' THEN 1 ELSE 2 END ASC
            LIMIT 1;
        END IF;
    END IF;

    -- 3. If p_enrollment_id was an enrollment_id belonging to any student in that section
    IF v_section_id IS NULL THEN
        SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- If no section can be resolved, return an empty array (safe for UI table)
    IF v_section_id IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',                       ai.id,
            'title',                    ai.title,
            'description',              ai.description,
            'assessment_type',          ai.assessment_type,
            'is_published',             (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())),
            'grading_period_id',        gp.id,
            'grading_period_name',      gp.name,
            'grading_period_sequence',  gp.sequence,
            'total_points',             ai.total_points,
            'passing_points',           ai.passing_points,
            'time_limit_minutes',       ai.time_limit_minutes,
            'max_attempts',             ai.max_attempts,
            'question_count', (
                SELECT COUNT(*)
                FROM public.assessment_questions aq
                WHERE aq.assessment_item_id = ai.id
                AND aq.deleted_at IS NULL
            ),
            'show_all_questions',       ai.show_all_questions,
            'questions_per_page',       ai.questions_per_page,
            'opens_at',                 ai.opens_at,
            'due_at',                   ai.due_at,
            'closes_at',                ai.closes_at,
            'scheduled_publish_at',     ai.scheduled_publish_at,
            'submission_status', (
                SELECT asub.status::text
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND (v_actual_enrollment_id IS NOT NULL AND asub.enrollment_id = v_actual_enrollment_id)
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'submission_id', (
                SELECT asub.id
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND (v_actual_enrollment_id IS NOT NULL AND asub.enrollment_id = v_actual_enrollment_id)
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'attempts_used', (
                SELECT COUNT(*)::int
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND (v_actual_enrollment_id IS NOT NULL AND asub.enrollment_id = v_actual_enrollment_id)
                AND asub.status != 'In Progress'
                AND asub.deleted_at IS NULL
            ),
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
                WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
            )
        )
        ORDER BY ai.created_at ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.assessment_items ai
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.section_id = v_section_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true 
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
        OR EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = ai.section_id AND s.faculty_id = auth.uid()
        )
    );

    RETURN v_result;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_get_subject_assessments(uuid) TO authenticated;

-- 2. Fix fn_get_assessment_questions_for_student: Allow both is_published and scheduled assessments that reached publish time.
CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions_for_student(
    p_assessment_id uuid,
    p_enrollment_id uuid,
    p_submission_id uuid
)
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
                'saved_answer', (
                    SELECT jsonb_build_object(
                        'answer_text', sa.answer_text,
                        'choice_id',   sa.choice_id
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
                            ORDER BY CASE WHEN COALESCE(v_shuffle_c, false) THEN md5(v_seed || c.id::text) ELSE c.sequence::text END ASC
                        ), '[]'::jsonb)
                        FROM public.assessment_question_choices c
                        WHERE c.question_id = aq.id AND c.deleted_at IS NULL
                    )
                    ELSE '[]'::jsonb
                END
            )
            ORDER BY CASE WHEN COALESCE(v_shuffle_q, false) THEN md5(v_seed || aq.id::text) ELSE aq.sequence::text END ASC
        ), '[]'::jsonb)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id AND aq.deleted_at IS NULL
    );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_get_assessment_questions_for_student(uuid, uuid, uuid) TO authenticated;

-- 3. Fix fn_submit_assessment: Correct column names raw_score and final_score instead of non-existent score column.
CREATE OR REPLACE FUNCTION public.fn_submit_assessment(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enrollment_id    UUID;
  v_assessment_id    UUID;
  v_status           submission_status_type;
  v_expires_at       TIMESTAMPTZ;
  v_due_at           TIMESTAMPTZ;
  v_is_late          BOOLEAN := false;
  v_faculty_id       UUID;
  v_section_id       UUID;
  v_assessment_title TEXT;
  v_student_name     TEXT;
  v_has_manual_questions BOOLEAN := false;
  v_total_earned_score NUMERIC := 0;
  v_question_rec     RECORD;
BEGIN
  IF NOT public.fn_owns_submission(p_submission_id) THEN
      RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
          USING ERRCODE = '42501';
  END IF;

  SELECT
    asub.enrollment_id,
    asub.assessment_item_id,
    asub.status,
    asub.time_limit_expires_at
  INTO v_enrollment_id, v_assessment_id, v_status, v_expires_at
  FROM public.assessment_submissions asub
  WHERE asub.id         = p_submission_id
    AND asub.deleted_at IS NULL;

  IF v_enrollment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission not found.');
  END IF;

  IF v_status NOT IN ('In Progress', 'Not Started') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission is not in a submittable state.');
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission window has expired.');
  END IF;

  SELECT ai.due_at, ai.title, s.id, s.faculty_id
  INTO v_due_at, v_assessment_title, v_section_id, v_faculty_id
  FROM public.assessment_items ai
  JOIN public.sections s ON s.id = ai.section_id
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  -- Ensure all questions have answer records in public.student_answers
  FOR v_question_rec IN
    SELECT aq.id, aq.question_type, aq.points
    FROM public.assessment_questions aq
    WHERE aq.assessment_item_id = v_assessment_id AND aq.deleted_at IS NULL
  LOOP
    IF v_question_rec.question_type IN ('Essay', 'Short Answer', 'File Upload') THEN
      v_has_manual_questions := true;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.student_answers
      WHERE submission_id = p_submission_id AND question_id = v_question_rec.id
    ) THEN
      INSERT INTO public.student_answers (
        submission_id, question_id, answer_text, choice_id, is_correct, points_earned, created_by
      ) VALUES (
        p_submission_id, v_question_rec.id, NULL, NULL, false, 0, auth.uid()
      );
    END IF;
  END LOOP;

  -- If assessment consists entirely of auto-gradable questions, compute final score & mark Graded
  IF NOT v_has_manual_questions THEN
    SELECT COALESCE(SUM(points_earned), 0)
    INTO v_total_earned_score
    FROM public.student_answers
    WHERE submission_id = p_submission_id AND deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET
      status        = 'Graded',
      raw_score     = v_total_earned_score,
      final_score   = v_total_earned_score,
      graded_at     = now(),
      submitted_at  = now(),
      is_late       = v_is_late,
      feedback      = 'Auto-graded upon submission.',
      updated_by    = auth.uid()
    WHERE id = p_submission_id;
  ELSE
    UPDATE public.assessment_submissions
    SET
      status       = 'Submitted',
      submitted_at = now(),
      is_late      = v_is_late,
      updated_by   = auth.uid()
    WHERE id = p_submission_id;
  END IF;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted',
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  -- Notify assigned faculty member
  IF v_faculty_id IS NOT NULL THEN
    SELECT u.first_name || ' ' || u.last_name INTO v_student_name
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id
    JOIN public.users u ON u.id = st.user_id
    WHERE e.id = v_enrollment_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
      v_faculty_id,
      'Assessment Submitted',
      format('%s submitted "%s"%s.', COALESCE(v_student_name, 'A student'), v_assessment_title, CASE WHEN v_is_late THEN ' (Late)' ELSE '' END),
      format('/faculty/sections/%s/assessments/%s/submissions', v_section_id::text, v_assessment_id::text),
      'Assessment'::public.notification_category_type
    );
  END IF;

  RETURN jsonb_build_object(
    'success',       true,
    'submission_id', p_submission_id,
    'submitted_at',  now(),
    'is_late',       v_is_late,
    'is_auto_graded', NOT v_has_manual_questions,
    'score',         CASE WHEN NOT v_has_manual_questions THEN v_total_earned_score ELSE NULL END,
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_submit_assessment(uuid) TO authenticated;

-- 4. Fix notification action_url to route directly to assessments tab
CREATE OR REPLACE FUNCTION public.fn_publish_assessment(p_assessment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_title TEXT;
    v_course_code TEXT;
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

    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions
        WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot publish an assessment with no questions.');
    END IF;

    UPDATE public.assessment_items
    SET
        is_published = true,
        published_at = now()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL
    RETURNING section_id, title INTO v_section_id, v_title;

    -- Notify enrolled students using their real enrollment IDs and tab=assessments query
    SELECT c.code INTO v_course_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = v_section_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        st.user_id,
        'Assessment Published',
        format('%s: %s is now available to take.', COALESCE(v_course_code, 'Assessment'), v_title),
        format('/student/subjects/%s?tab=assessments', e.id::text),
        'Assessment'::public.notification_category_type
    FROM public.enrollments e
    JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    WHERE e.section_id = v_section_id
      AND e.status = 'Enrolled'
      AND e.deleted_at IS NULL
      AND st.user_id IS NOT NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment published successfully.');
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_publish_assessment(uuid) TO authenticated;
