-- Fewer repeated notifications
--   * fn_grade_submission: the student is told about a grade only the first time an attempt is
--     graded, or when the score or the feedback actually changed. Saving the same grade again
--     no longer sends another "Assessment Graded" notice.
--   * fn_save_attendance_records: a student is told only when their status changes to Absent
--     or Excused. Saving the session again with the same status sends nothing.
-- Bodies copied from the latest definitions (20261104030000 and 20261015020000).
-- Signatures are unchanged, so grants stay in place.

BEGIN;

-- fn_grade_submission
CREATE OR REPLACE FUNCTION public.fn_grade_submission(p_submission_id uuid, p_feedback text, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_answer          JSONB;
    v_total_score     NUMERIC := 0;
    v_max_score       NUMERIC := 0;
    v_student_user_id UUID;
    v_assessment_title TEXT;
    v_enrollment_id   UUID;
    v_status          TEXT;
    v_points          NUMERIC;
    v_question_points NUMERIC;
    v_question_no     INTEGER;
    v_old_raw_score   NUMERIC;
    v_old_final_score NUMERIC;
    v_old_feedback    TEXT;
    v_is_changed      BOOLEAN;
BEGIN
    SELECT asub.status::text, asub.raw_score, asub.final_score, asub.feedback
    INTO v_status, v_old_raw_score, v_old_final_score, v_old_feedback
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    IF v_status IN ('Not Started', 'In Progress') THEN
        RETURN jsonb_build_object('success', false, 'message', 'This attempt has not been submitted yet, so it cannot be graded.');
    END IF;

    -- Check every answer first so a bad value saves nothing
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        SELECT aq.points, aq.sequence INTO v_question_points, v_question_no
        FROM public.student_answers sa
        INNER JOIN public.assessment_questions aq ON aq.id = sa.question_id
        WHERE sa.id = (v_answer->>'id')::UUID
        AND sa.submission_id = p_submission_id
        AND sa.deleted_at IS NULL;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'An answer does not belong to this submission.');
        END IF;

        v_points := (v_answer->>'points_earned')::NUMERIC;

        IF v_points IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', format('Enter the points earned for question %s.', v_question_no));
        END IF;

        IF v_points < 0 OR v_points > v_question_points THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format('Points for question %s must be between 0 and %s.', v_question_no, trim_scale(v_question_points))
            );
        END IF;
    END LOOP;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        UPDATE public.student_answers
        SET
            points_earned = (v_answer->>'points_earned')::NUMERIC,
            grader_notes  = NULLIF(trim(v_answer->>'grader_notes'), '')
        WHERE id = (v_answer->>'id')::UUID
        AND submission_id = p_submission_id
        AND deleted_at IS NULL;
    END LOOP;

    SELECT
        COALESCE(SUM(sa.points_earned), 0),
        COALESCE(SUM(aq.points), 0)
    INTO v_total_score, v_max_score
    FROM public.student_answers sa
    INNER JOIN public.assessment_questions aq ON aq.id = sa.question_id AND aq.deleted_at IS NULL
    WHERE sa.submission_id = p_submission_id
    AND sa.deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET
        raw_score   = v_total_score,
        final_score = v_total_score,
        feedback    = NULLIF(p_feedback, ''),
        status      = 'Graded'::public.submission_status_type,
        graded_at   = now(),
        graded_by   = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    -- Notify the student with their grade using real enrollment ID
    SELECT st.user_id, ai.title, e.id
    INTO v_student_user_id, v_assessment_title, v_enrollment_id
    FROM public.assessment_submissions asub
    JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    JOIN public.enrollments e ON e.id = asub.enrollment_id
    JOIN public.students st ON st.id = e.student_id
    WHERE asub.id = p_submission_id;

    -- Only tell the student when this is the first grade or the score/feedback changed
    v_is_changed := v_status <> 'Graded'
        OR v_old_raw_score IS DISTINCT FROM v_total_score
        OR v_old_final_score IS DISTINCT FROM v_total_score
        OR v_old_feedback IS DISTINCT FROM NULLIF(p_feedback, '');

    IF v_student_user_id IS NOT NULL AND v_is_changed THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student_user_id,
            'Assessment Graded',
            format('Your submission for "%s" has been graded: %s/%s pts.', v_assessment_title, v_total_score, v_max_score),
            format('/student/subjects/%s', v_enrollment_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Submission graded successfully.',
        'raw_score', v_total_score,
        'max_score', v_max_score
    );
END;
$function$;

-- fn_save_attendance_records
CREATE OR REPLACE FUNCTION public.fn_save_attendance_records(
    p_session_id uuid,
    p_records jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id      UUID;
    v_session_date    DATE;
    v_record          JSONB;
    v_status          public.attendance_status_type;
    v_student_user_id UUID;
    v_course_code     TEXT;
    v_old_status      public.attendance_status_type;
BEGIN
    SELECT ats.section_id, ats.session_date, c.code
    INTO v_section_id, v_session_date, v_course_code
    FROM public.attendance_sessions ats
    JOIN public.sections s ON s.id = ats.section_id
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE ats.id = p_session_id
    AND ats.deleted_at IS NULL;

    IF v_section_id IS NULL OR NOT public.fn_is_section_faculty(v_section_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        v_status := (v_record->>'status')::public.attendance_status_type;

        SELECT ar.status INTO v_old_status
        FROM public.attendance_records ar
        WHERE ar.id = (v_record->>'id')::UUID
        AND ar.attendance_session_id = p_session_id
        AND ar.deleted_at IS NULL;

        UPDATE public.attendance_records
        SET
            status  = v_status,
            remarks = NULLIF(trim(v_record->>'remarks'), '')
        WHERE id = (v_record->>'id')::UUID
        AND attendance_session_id = p_session_id
        AND deleted_at IS NULL;

        -- Notify only when the status changes to Absent or Excused, not on every save
        IF v_status IN ('Absent', 'Excused') AND v_old_status IS DISTINCT FROM v_status THEN
            SELECT st.user_id INTO v_student_user_id
            FROM public.attendance_records ar
            JOIN public.enrollments e ON e.id = ar.enrollment_id
            JOIN public.students st ON st.id = e.student_id
            WHERE ar.id = (v_record->>'id')::UUID;

            IF v_student_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
                VALUES (
                    v_student_user_id,
                    'Attendance Notice',
                    format('You were marked %s in %s on %s.', v_status, COALESCE(v_course_code, 'class'), to_char(v_session_date, 'Mon DD, YYYY')),
                    format('/student/subjects/%s', v_section_id::text),
                    'Attendance'::public.notification_category_type
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance saved successfully.');
END;
$function$;

COMMIT;