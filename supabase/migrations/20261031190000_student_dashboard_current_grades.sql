-- ====================================================================
-- Migration: 20261031190000_student_dashboard_current_grades.sql
--   * fn_get_student_dashboard: "Grades to View" counted every released period grade from
--     every past term (e.g. 100 for a 3rd-year student). It now counts the released grades of
--     the subjects the student is currently enrolled in, matching "Enrolled Subjects"
-- Rollback: supabase/rollback/20261031190000_student_dashboard_current_grades.down.sql
-- ====================================================================
BEGIN;

-- fn_get_student_dashboard
CREATE OR REPLACE FUNCTION public.fn_get_student_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_upcoming_count INTEGER;
    v_upcoming JSONB;
    v_released_grades_count INTEGER;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT COUNT(*)
    INTO v_upcoming_count
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.assessment_items ai ON ai.section_id = s.id
        AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
        AND ai.deleted_at IS NULL
        AND (ai.closes_at IS NULL OR ai.closes_at > now())
    WHERE e.student_id = v_student_id
      AND e.status::TEXT = 'Enrolled'
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.assessment_submissions asub
          WHERE asub.assessment_item_id = ai.id
            AND asub.enrollment_id = e.id
            AND asub.status IN ('Submitted', 'Late', 'Graded')
            AND asub.deleted_at IS NULL
      );

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'due_at') IS NULL, x->>'due_at'), '[]'::JSONB)
    INTO v_upcoming
    FROM (
        SELECT jsonb_build_object(
            'id',              ai.id,
            'title',           ai.title,
            'assessment_type', ai.assessment_type,
            'opens_at',        ai.opens_at,
            'due_at',          ai.due_at,
            'section_code',    s.section_code,
            'course_code',     c.code,
            'enrollment_id',   e.id
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.assessment_items ai ON ai.section_id = s.id
            AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
            AND ai.deleted_at IS NULL
            AND (ai.closes_at IS NULL OR ai.closes_at > now())
        WHERE e.student_id = v_student_id
          AND e.status::TEXT = 'Enrolled'
          AND e.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.assessment_submissions asub
              WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = e.id
                AND asub.status IN ('Submitted', 'Late', 'Graded')
                AND asub.deleted_at IS NULL
          )
        ORDER BY ai.due_at ASC NULLS LAST
        LIMIT 5
    ) upcoming;

    SELECT COUNT(*)
    INTO v_released_grades_count
    FROM public.enrollments e
    INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        AND sfg.status = 'Released'
        AND sfg.deleted_at IS NULL
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.status::TEXT = 'Enrolled'
      AND e.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'enrolled_count', (
            SELECT COUNT(*)
            FROM public.enrollments e
            WHERE e.student_id = v_student_id
              AND e.status::TEXT = 'Enrolled'
              AND e.deleted_at IS NULL
        ),
        'upcoming_count', COALESCE(v_upcoming_count, 0),
        'upcoming_assessments', v_upcoming,
        'released_grades_count', COALESCE(v_released_grades_count, 0)
    );
END;
$function$;

COMMIT;
