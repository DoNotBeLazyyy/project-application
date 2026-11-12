-- ====================================================================
-- Migration: 20261106033000_return_grades_to_faculty.sql
--   * section_final_grades: new returned_reason, returned_at, returned_by columns, so a
--     returned grade keeps why it was sent back
--   * fn_return_section_grades_to_faculty (new): the registrar sends a section's Submitted
--     grades for one grading period back to the faculty as Draft, with a required reason.
--     Writes a registrar log entry and notifies the section's faculty with the reason.
--     Approved or Released grades are not touched.
-- Idempotent: columns use IF NOT EXISTS; the function is CREATE OR REPLACE.
-- ====================================================================
BEGIN;

ALTER TABLE public.section_final_grades
    ADD COLUMN IF NOT EXISTS returned_reason text,
    ADD COLUMN IF NOT EXISTS returned_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS returned_by uuid;

-- fn_return_section_grades_to_faculty
CREATE OR REPLACE FUNCTION public.fn_return_section_grades_to_faculty(
    p_section_id uuid,
    p_grading_period_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_reason         TEXT := btrim(COALESCE(p_reason, ''));
    v_registrar_id   UUID := auth.uid();
    v_registrar_name TEXT;
    v_faculty_id     UUID;
    v_section_code   TEXT;
    v_course_code    TEXT;
    v_period_name    TEXT;
    v_returned_count INTEGER := 0;
BEGIN
    PERFORM public.fn_assert_role('Registrar');

    IF v_reason = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Please give a reason so the faculty knows what to fix.'
        );
    END IF;

    SELECT s.faculty_id, s.section_code, c.code
    INTO v_faculty_id, v_section_code, v_course_code
    FROM public.sections s
    LEFT JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    SELECT gp.name INTO v_period_name
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id;

    IF v_period_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    UPDATE public.section_final_grades sfg
    SET status          = 'Draft',
        returned_reason = v_reason,
        returned_at     = now(),
        returned_by     = v_registrar_id,
        updated_at      = now(),
        updated_by      = v_registrar_id
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at IS NULL
      AND sfg.status = 'Submitted'
      AND sfg.enrollment_id IN (
          SELECT e.id FROM public.enrollments e
          WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
      );

    GET DIAGNOSTICS v_returned_count = ROW_COUNT;

    IF v_returned_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'There are no submitted grades to return for this section and period.'
        );
    END IF;

    SELECT btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_registrar_name
    FROM public.users u
    WHERE u.id = v_registrar_id;

    -- Registrar log
    INSERT INTO public.registrar_logs (
        action,
        performed_by,
        performed_by_name,
        details,
        old_values,
        new_values,
        metadata
    ) VALUES (
        'GRADES_RETURNED_TO_FACULTY',
        v_registrar_id,
        COALESCE(NULLIF(v_registrar_name, ''), 'Registrar'),
        format('Returned %s submitted %s grade(s) for %s (%s) to the faculty. Reason: %s',
            v_returned_count,
            v_period_name,
            COALESCE(v_course_code, 'Course'),
            COALESCE(v_section_code, 'Section'),
            v_reason
        ),
        jsonb_build_object('status', 'Submitted'),
        jsonb_build_object('status', 'Draft', 'reason', v_reason),
        jsonb_build_object(
            'section_id', p_section_id,
            'section_code', v_section_code,
            'course_code', v_course_code,
            'grading_period_id', p_grading_period_id,
            'grading_period_name', v_period_name,
            'faculty_id', v_faculty_id,
            'returned_count', v_returned_count
        )
    );

    -- Tell the faculty what to fix
    IF v_faculty_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_faculty_id,
            'Grades Returned for Revision',
            format('The registrar returned your %s grades for %s (%s). Reason: %s',
                v_period_name,
                COALESCE(v_course_code, 'Course'),
                COALESCE(v_section_code, 'Section'),
                v_reason
            ),
            format('/faculty/sections/%s?tab=grading', p_section_id::text),
            'Grade'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'returned_count', v_returned_count,
        'message', format('%s grade(s) returned to the faculty as drafts.', v_returned_count)
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_return_section_grades_to_faculty(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_return_section_grades_to_faculty(uuid, uuid, text) TO authenticated, service_role;

COMMIT;
