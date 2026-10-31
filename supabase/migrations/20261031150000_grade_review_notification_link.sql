-- ====================================================================
-- Migration: 20261031150000_grade_review_notification_link.sql
--   * fn_submit_section_grades: the "Grade Submission for Review" notification linked to
--     /registrar/grades, which is not a page (404); it now links to /registrar/grade-release
--   * Existing notifications with the old link are updated
-- Rollback: supabase/rollback/20261031150000_grade_review_notification_link.down.sql
-- ====================================================================
BEGIN;

-- fn_submit_section_grades
CREATE OR REPLACE FUNCTION public.fn_submit_section_grades(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_course_code TEXT;
  v_section_code TEXT;
  v_period_name TEXT;
  v_faculty_name TEXT;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    SELECT c.code, s.section_code
    INTO v_course_code, v_section_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id;

    SELECT u.first_name || ' ' || u.last_name INTO v_faculty_name
    FROM public.users u
    WHERE u.id = auth.uid();

    SELECT COUNT(*) INTO v_count
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
    WHERE e.section_id = p_section_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    IF v_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No calculated grades found to submit. Calculate grades first.'
        );
    END IF;

    UPDATE public.section_final_grades sfg
    SET status = 'Submitted'::public.grade_status_type,
        updated_at = now(),
        updated_by = auth.uid()
    FROM public.enrollments e
    WHERE e.id = sfg.enrollment_id
      AND e.section_id = p_section_id
      AND sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL;

    -- Notify all active Registrars in real time
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    SELECT
        u.id,
        'Grade Submission for Review',
        format('%s submitted %s grades for %s (%s) - %s student(s).',
            COALESCE(v_faculty_name, 'Faculty'),
            COALESCE(v_period_name, 'Period'),
            COALESCE(v_course_code, 'Course'),
            COALESCE(v_section_code, 'Section'),
            v_count
        ),
        '/registrar/grade-release',
        'Grade'::public.notification_category_type
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE u.deleted_at IS NULL AND u.status = 'Active' AND r.code = 'Registrar';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Officially submitted ' || v_count || ' student grade(s) to the Registrar.',
        'submitted_count', v_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

UPDATE public.notifications
SET action_url = '/registrar/grade-release'
WHERE action_url = '/registrar/grades';

COMMIT;
