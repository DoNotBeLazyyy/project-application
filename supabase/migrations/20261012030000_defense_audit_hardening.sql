-- ============================================================================
-- Migration: 20261012030000_defense_audit_hardening.sql
-- Description: Capstone Defense Audit Security Hardening:
--   1. Post-Release Grade Immutability Trigger on section_final_grades
--   2. Evaluation-Gated Grade Projection in fn_get_subject_grades
--   3. Assessment Submission Count & Attempt Metadata in fn_get_assessment_for_student
-- ============================================================================

-- 1. Grade Immutability Trigger: Prevent any direct modifications to Released grades
CREATE OR REPLACE FUNCTION public.fn_prevent_released_grade_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'Released' THEN
        IF (current_user != 'service_role' AND session_user != 'service_role' AND COALESCE((auth.jwt() ->> 'role'), '') != 'service_role') THEN
            IF (NEW.final_grade IS DISTINCT FROM OLD.final_grade 
                OR NEW.raw_grade IS DISTINCT FROM OLD.raw_grade 
                OR NEW.transmuted_grade IS DISTINCT FROM OLD.transmuted_grade
                OR NEW.status IS DISTINCT FROM OLD.status) THEN
                RAISE EXCEPTION 'Academic Integrity Violation: Released grades are immutable. Official grade change requests must be processed by the Registrar.'
                    USING ERRCODE = '55000';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_released_grade_tampering ON public.section_final_grades;
CREATE TRIGGER trg_prevent_released_grade_tampering
    BEFORE UPDATE ON public.section_final_grades
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_prevent_released_grade_tampering();

-- 2. Hardened fn_get_subject_grades: Redact grades at SQL projection level if evaluation is incomplete
CREATE OR REPLACE FUNCTION public.fn_get_subject_grades(
    p_enrollment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT s.id INTO v_section_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'grading_period_id',    gp.id,
            'grading_period_name',  gp.name,
            'sequence',             gp.sequence,
            'raw_grade',            CASE WHEN eval.is_completed THEN sfg.raw_grade ELSE NULL END,
            'final_grade',          CASE WHEN eval.is_completed THEN sfg.final_grade ELSE NULL END,
            'transmuted_grade',     CASE WHEN eval.is_completed THEN sfg.transmuted_grade ELSE NULL END,
            'special_grade',        CASE WHEN eval.is_completed THEN sfg.special_grade ELSE NULL END,
            'status',               sfg.status,
            'is_visible',           sfg.status IN ('Approved', 'Released'),
            'evaluation_completed', eval.is_completed
        )
        ORDER BY gp.sequence ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.grading_periods gp
    INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = v_section_id
    LEFT JOIN public.section_final_grades sfg
        ON sfg.enrollment_id = p_enrollment_id
        AND sfg.grading_period_id = gp.id
        AND sfg.deleted_at IS NULL
    CROSS JOIN LATERAL (
        SELECT COALESCE((
            SELECT epl.is_completed
            FROM public.evaluation_period_locks epl
            WHERE epl.enrollment_id = p_enrollment_id
            AND epl.grading_period_id = public.fn_resolve_evaluation_period(p_enrollment_id, gp.id)
            AND epl.deleted_at IS NULL
            LIMIT 1
        ), false) AS is_completed
    ) eval
    WHERE gp.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

-- 3. Hardened fn_get_assessment_for_student: Include attempt count and completion status for proactive UI guards
CREATE OR REPLACE FUNCTION public.fn_get_assessment_for_student(p_assessment_id uuid, p_enrollment_id uuid)
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
        'id',                       ai.id,
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
              AND asub.enrollment_id = p_enrollment_id
              AND asub.status != 'In Progress'
              AND asub.deleted_at IS NULL
        ),
        'has_active_submission', EXISTS (
            SELECT 1
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = p_enrollment_id
              AND asub.status = 'In Progress'
              AND asub.deleted_at IS NULL
        ),
        'latest_submission_status', (
            SELECT asub.status::text
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = p_enrollment_id
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
    INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
    INNER JOIN public.enrollments e ON e.section_id = s.id
        AND e.id = p_enrollment_id
        AND e.student_id = v_student_id
        AND e.deleted_at IS NULL
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
