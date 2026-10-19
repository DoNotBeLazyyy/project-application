-- Migration: 20261019020000_fix_assessment_notifications_and_section_routing.sql
-- Description: Ensure student assessment notifications navigate to canonical enrollment URL,
--              support both enrollment_id and section_id in student RPCs, and navigate faculty
--              assessment notifications directly to submissions page or assessments tab.

-- ============================================================================
-- 1. STUDENT SUBJECT DETAILS & ASSESSMENT ACCESS BY ENROLLMENT OR SECTION ID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_subject_detail(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT jsonb_build_object(
        'enrollment_id',     e.id,
        'section_id',        s.id,
        'section_code',      s.section_code,
        'course_code',       c.code,
        'course_title',      c.title,
        'term_label',        tt.label || ' - ' || sy.label,
        'faculty_name',      u.first_name || ' ' || u.last_name,
        'enrollment_status', e.status
    )
    INTO v_result
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_subject_assessments(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',                       ai.id,
            'title',                    ai.title,
            'description',              ai.description,
            'assessment_type',          ai.assessment_type,
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
                AND asub.enrollment_id = v_actual_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'submission_id', (
                SELECT asub.id
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = v_actual_enrollment_id
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'attempts_used', (
                SELECT COUNT(*)::int
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = v_actual_enrollment_id
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
    );

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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

    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            sfg.raw_grade,
            'final_grade',          sfg.final_grade,
            'transmuted_grade',     sfg.transmuted_grade,
            'special_grade',        sfg.special_grade,
            'status',               sfg.status,
            'is_visible',           sfg.status = 'Released',
            'evaluation_completed', COALESCE((
                SELECT epl.is_completed
                FROM public.evaluation_period_locks epl
                WHERE epl.enrollment_id = v_actual_enrollment_id
                AND epl.grading_period_id = public.fn_resolve_evaluation_period(v_actual_enrollment_id, gp.id)
                AND epl.deleted_at IS NULL
                LIMIT 1
            ), false)
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = v_actual_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_subject_attendance(p_enrollment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_actual_enrollment_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'record_id',    ar.id,
                'session_id',   asx.id,
                'session_date', asx.session_date,
                'notes',        asx.notes,
                'status',       ar.status,
                'remarks',      ar.remarks
            )
            ORDER BY asx.session_date DESC
        ), '[]'::jsonb)
        FROM public.attendance_records ar
        INNER JOIN public.attendance_sessions asx ON asx.id = ar.attendance_session_id AND asx.deleted_at IS NULL
        WHERE ar.enrollment_id = v_actual_enrollment_id
        AND ar.deleted_at IS NULL
    );
END;
$function$;

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
          AND e.student_id = v_student_id
          AND ai.id = p_assessment_id
          AND ai.is_published = true
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

    SELECT asub.id, asub.status, asub.attempt_number, asub.submitted_at, asub.graded_at,
           asub.is_late, asub.raw_score, asub.final_score, asub.feedback
    INTO v_submission
    FROM public.assessment_submissions asub
    WHERE asub.assessment_item_id = p_assessment_id
    AND asub.enrollment_id = v_actual_enrollment_id
    AND asub.deleted_at IS NULL
    ORDER BY asub.attempt_number DESC
    LIMIT 1;

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
            v_results_available := v_submission.status IN ('Graded', 'Submitted', 'Late') AND v_window_over;
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

    SELECT e.id INTO v_actual_enrollment_id
    FROM public.enrollments e
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND e.section_id = v_section_id
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
        status, started_at, time_limit_expires_at
    ) VALUES (
        p_assessment_id, v_actual_enrollment_id, v_attempt_number + 1,
        'In Progress', now(), v_expires_at
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

-- ============================================================================
-- 2. NOTIFICATION GENERATION WITH CANONICAL URLS
-- ============================================================================

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

    -- Notify enrolled students using their real enrollment IDs
    SELECT c.code INTO v_course_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = v_section_id;

    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        st.user_id,
        'Assessment Published',
        format('%s: %s is now available to take.', COALESCE(v_course_code, 'Assessment'), v_title),
        format('/student/subjects/%s', e.id::text),
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

CREATE OR REPLACE FUNCTION public.fn_create_assessment_item(
    p_section_id              uuid,
    p_grading_component_id    uuid,
    p_title                   text,
    p_assessment_type         public.assessment_type,
    p_total_points            numeric,
    p_description             text DEFAULT NULL::text,
    p_passing_points          numeric DEFAULT NULL::numeric,
    p_time_limit_minutes      smallint DEFAULT NULL::smallint,
    p_max_attempts            smallint DEFAULT 1,
    p_opens_at                timestamptz DEFAULT NULL::timestamptz,
    p_due_at                  timestamptz DEFAULT NULL::timestamptz,
    p_closes_at               timestamptz DEFAULT NULL::timestamptz,
    p_show_results_at         timestamptz DEFAULT NULL::timestamptz,
    p_scheduled_publish_at    timestamptz DEFAULT NULL::timestamptz,
    p_shuffle_questions       boolean DEFAULT false,
    p_shuffle_choices         boolean DEFAULT false,
    p_show_all_questions      boolean DEFAULT true,
    p_questions_per_page      smallint DEFAULT NULL::smallint,
    p_allow_student_review    boolean DEFAULT true,
    p_publish_now             boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_is_published BOOLEAN;
    v_course_code TEXT;
BEGIN
    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the assigned faculty member may manage assessments for this section.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment title is required.');
    END IF;

    IF p_total_points IS NULL OR p_total_points <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total points must be greater than zero.');
    END IF;

    v_is_published := COALESCE(p_publish_now, false);

    INSERT INTO public.assessment_items (
        section_id, grading_component_id, title, description, assessment_type,
        total_points, passing_points, time_limit_minutes, max_attempts,
        opens_at, due_at, closes_at, show_results_at, scheduled_publish_at,
        shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
        allow_student_review, is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, btrim(p_title), NULLIF(btrim(p_description), ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, p_scheduled_publish_at,
        COALESCE(p_shuffle_questions, false), COALESCE(p_shuffle_choices, false),
        COALESCE(p_show_all_questions, true),
        CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
        COALESCE(p_allow_student_review, true),
        v_is_published, auth.uid()
    )
    RETURNING id INTO v_id;

    -- If published immediately, notify all enrolled students using their real enrollment IDs
    IF v_is_published THEN
        SELECT c.code INTO v_course_code
        FROM public.sections s
        LEFT JOIN public.courses c ON c.id = s.course_id
        WHERE s.id = p_section_id;

        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        SELECT
            st.user_id,
            'New Assessment Posted',
            format('%s: %s (%s pts)', COALESCE(v_course_code, 'Assessment'), btrim(p_title), p_total_points),
            format('/student/subjects/%s', e.id::text),
            'Assessment'::public.notification_category_type
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
          AND st.user_id IS NOT NULL;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment created successfully.', 'id', v_id);
END;
$function$;

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

  -- Notify the assigned faculty member directly to the submissions page
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
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

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
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE asub.id = p_submission_id
        AND s.faculty_id = auth.uid()
        AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

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

    IF v_student_user_id IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION public.fn_grade_submission_rubric(p_submission_id uuid, p_feedback text, p_evaluations jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_eval            JSONB;
    v_total           NUMERIC := 0;
    v_student_user_id UUID;
    v_assessment_title TEXT;
    v_enrollment_id   UUID;
    v_section_id      UUID;
    v_rubric_id       UUID;
    v_criteria_id     UUID;
    v_points          NUMERIC;
    v_max_points      NUMERIC;
    v_updated         INTEGER;
BEGIN
    SELECT ai.section_id, ai.title, e.id, st.user_id
    INTO v_section_id, v_assessment_title, v_enrollment_id, v_student_user_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
    INNER JOIN public.students st ON st.id = e.student_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    SELECT air.rubric_id INTO v_rubric_id
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_item_rubrics air
        ON air.assessment_item_id = asub.assessment_item_id AND air.deleted_at IS NULL
    WHERE asub.id = p_submission_id AND asub.deleted_at IS NULL
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No rubric attached to this assessment.');
    END IF;

    FOR v_eval IN SELECT * FROM jsonb_array_elements(p_evaluations)
    LOOP
        v_criteria_id := COALESCE((v_eval->>'criteria_id')::UUID, (v_eval->>'criterion_id')::UUID);
        v_points      := COALESCE((v_eval->>'points_earned')::NUMERIC, 0);

        SELECT rc.max_points INTO v_max_points
        FROM public.rubric_criteria rc
        WHERE rc.id = v_criteria_id
        AND rc.rubric_id = v_rubric_id
        AND rc.deleted_at IS NULL;

        IF v_max_points IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'A criterion does not belong to the attached rubric.');
        END IF;

        IF v_points < 0 OR v_points > v_max_points THEN
            RETURN jsonb_build_object('success', false, 'message', 'Points for a criterion exceed its maximum.');
        END IF;

        UPDATE public.rubric_evaluations
        SET
            points_earned = v_points,
            feedback      = NULLIF(trim(v_eval->>'feedback'), ''),
            evaluated_by  = auth.uid(),
            evaluated_at  = now()
        WHERE submission_id = p_submission_id
        AND criteria_id = v_criteria_id
        AND deleted_at IS NULL;

        GET DIAGNOSTICS v_updated = ROW_COUNT;

        IF v_updated = 0 THEN
            INSERT INTO public.rubric_evaluations (submission_id, criteria_id, points_earned, feedback, evaluated_by)
            VALUES (p_submission_id, v_criteria_id, v_points, NULLIF(trim(v_eval->>'feedback'), ''), auth.uid());
        END IF;

        v_total := v_total + v_points;
    END LOOP;

    UPDATE public.assessment_submissions
    SET
        raw_score   = v_total,
        final_score = v_total,
        feedback    = NULLIF(p_feedback, ''),
        status      = 'Graded'::public.submission_status_type,
        graded_at   = now(),
        graded_by   = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    -- Notify the student with their real enrollment ID
    IF v_student_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student_user_id,
            'Assessment Graded',
            format('Your submission for "%s" has been evaluated with rubric (Score: %s pts).', v_assessment_title, v_total),
            format('/student/subjects/%s', v_enrollment_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rubric evaluation saved successfully.',
        'raw_score', v_total,
        'total_score', v_total
    );
END;
$function$;

-- ============================================================================
-- 3. MIGRATE EXISTING NOTIFICATIONS
-- ============================================================================

-- Update student notifications that used section_id in /student/subjects/<section_id> to use enrollment_id
UPDATE public.notifications n
SET action_url = '/student/subjects/' || e.id::text
FROM public.students st
JOIN public.enrollments e ON e.student_id = st.id AND e.deleted_at IS NULL
WHERE n.user_id = st.user_id
  AND n.action_url = '/student/subjects/' || e.section_id::text
  AND n.action_url != '/student/subjects/' || e.id::text;

-- Update faculty assessment notifications without tab parameter
UPDATE public.notifications n
SET action_url = n.action_url || '?tab=assessments'
WHERE n.notification_type = 'Assessment'
  AND n.action_url LIKE '/faculty/sections/%'
  AND n.action_url NOT LIKE '%tab=%'
  AND n.action_url NOT LIKE '%/assessments/%';
