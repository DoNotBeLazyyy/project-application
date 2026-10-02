-- Migration: 20261002030000_fix_announcements_and_assessment_submissions.sql
-- Description:
-- 1. Add unique constraints on announcement_sections, event_sections, and student_answers
--    to support ON CONFLICT specifications in fn_create_announcement, fn_create_event,
--    and fn_save_student_answer.
-- 2. Fix enum casting in fn_submit_assessment so setting status from CASE expression
--    does not fail with type mismatch (text vs submission_status_type).

-- 1. Unique constraint on announcement_sections(announcement_id, section_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_announcement_sections'
    ) THEN
        ALTER TABLE public.announcement_sections
        ADD CONSTRAINT uq_announcement_sections UNIQUE (announcement_id, section_id);
    END IF;
END $$;

-- 2. Unique constraint on event_sections(event_id, section_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_event_sections'
    ) THEN
        ALTER TABLE public.event_sections
        ADD CONSTRAINT uq_event_sections UNIQUE (event_id, section_id);
    END IF;
END $$;

-- 3. Unique constraint on student_answers(submission_id, question_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_student_answers'
    ) THEN
        ALTER TABLE public.student_answers
        ADD CONSTRAINT uq_student_answers UNIQUE (submission_id, question_id);
    END IF;
END $$;

-- 4. Correct fn_submit_assessment enum casting
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

  SELECT ai.due_at INTO v_due_at
  FROM public.assessment_items ai
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  UPDATE public.assessment_submissions
  SET
    status       = (CASE WHEN v_is_late THEN 'Late'::public.submission_status_type ELSE 'Submitted'::public.submission_status_type END),
    submitted_at = now(),
    is_late      = v_is_late
  WHERE id = p_submission_id;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted'::public.submission_timer_status,
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'success',       true,
    'submission_id', p_submission_id,
    'submitted_at',  now(),
    'is_late',       v_is_late,
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
