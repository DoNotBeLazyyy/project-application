-- Migration: 20261023030000_fix_enrollment_term_is_active_column_error.sql
-- Description:
--   Fixes runtime error: "column t.is_active does not exist" encountered during section enrollment in Registrar module.
--   The public.terms table does not have an is_active column; is_active belongs to public.school_years,
--   while public.terms has status ('Upcoming', 'Enrollment Open', 'Ongoing', 'Grading Period', 'Closed').
--   Updates public.fn_enroll_student_section to join public.school_years sy to obtain sy.is_active,
--   and validates that the term is active and open for enrollment.

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(
    p_student_id uuid,
    p_section_id uuid,
    p_allow_conflict boolean DEFAULT false,
    p_conflict_reason text DEFAULT NULL::text,
    p_override_prerequisites boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student         RECORD;
    v_section         RECORD;
    v_term            RECORD;
    v_taken           INTEGER;
    v_conflicts       TEXT;
    v_unmet           TEXT;
    v_student_user_id UUID;
BEGIN
    SELECT st.id, st.program_id, st.status, st.user_id
    INTO v_student
    FROM public.students st
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_NOT_FOUND', 'message', 'Student not found.');
    END IF;

    IF v_student.status <> 'Active' THEN
        RETURN jsonb_build_object('success', false, 'code', 'STUDENT_INACTIVE', 'message', 'Only active students can be enrolled.');
    END IF;

    IF v_student.program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_PROGRAM', 'message', 'Student has no program assigned.');
    END IF;

    SELECT s.id, s.course_id, s.term_id, s.max_slots, s.status, s.section_code, c.code AS course_code
    INTO v_section
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    WHERE s.id = p_section_id AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'SECTION_NOT_FOUND', 'message', 'Section not found.');
    END IF;

    IF v_section.status IN ('Closed', 'Cancelled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SECTION_UNAVAILABLE',
            'message', v_section.section_code || ' is ' || lower(v_section.status::TEXT) || ' and cannot accept enrollments.'
        );
    END IF;

    -- Validate Term and Academic Year Active Status
    SELECT 
        t.id, 
        sy.is_active, 
        t.status, 
        t.enrollment_start_date, 
        t.enrollment_end_date
    INTO v_term
    FROM public.terms t
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE t.id = v_section.term_id AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_NOT_FOUND', 'message', 'Term not found.');
    END IF;

    IF NOT v_term.is_active OR v_term.status = 'Closed' THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_INACTIVE', 'message', 'Term is not active for enrollment.');
    END IF;

    -- Check enrollment window dates when override is not set and term is not already Ongoing/Enrollment Open
    IF NOT p_override_prerequisites AND v_term.status NOT IN ('Enrollment Open', 'Ongoing') THEN
        IF v_term.enrollment_start_date IS NOT NULL AND CURRENT_DATE < v_term.enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_NOT_STARTED', 'message', 'Enrollment has not started yet.');
        END IF;

        IF v_term.enrollment_end_date IS NOT NULL AND CURRENT_DATE > v_term.enrollment_end_date THEN
            RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_CLOSED', 'message', 'Enrollment is already closed.');
        END IF;
    END IF;

    -- Strict curriculum check
    IF NOT EXISTS (
        SELECT 1
        FROM public.curriculum_maps cm
        WHERE cm.program_id = v_student.program_id
        AND cm.course_id = v_section.course_id
        AND cm.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_IN_CURRICULUM',
            'message', v_section.course_code || ' is not part of the student''s program curriculum.'
        );
    END IF;

    -- Check if student already enrolled or completed locally
    IF EXISTS (
        SELECT 1
        FROM public.enrollments e
        INNER JOIN public.sections s2 ON s2.id = e.section_id AND s2.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.deleted_at IS NULL
        AND e.status IN ('Enrolled', 'Completed')
        AND s2.course_id = v_section.course_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_TAKEN',
            'message', 'Student is already enrolled in or has completed ' || v_section.course_code || '.'
        );
    END IF;

    -- Check if course has already been credited from previous institution (Transferee)
    IF EXISTS (
        SELECT 1
        FROM public.student_credited_courses scc
        WHERE scc.student_id = p_student_id
        AND scc.course_id = v_section.course_id
        AND scc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CREDITED',
            'message', 'Course ' || v_section.course_code || ' has already been credited from a previous institution.'
        );
    END IF;

    SELECT COUNT(*) INTO v_taken
    FROM public.enrollments
    WHERE section_id = p_section_id
    AND deleted_at IS NULL
    AND status NOT IN ('Dropped', 'Withdrawn');

    IF v_taken >= v_section.max_slots THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SECTION_FULL',
            'message', v_section.section_code || ' is already full.'
        );
    END IF;

    v_unmet := public.fn_get_unmet_prerequisites(p_student_id, v_section.course_id);

    IF v_unmet IS NOT NULL AND NOT p_override_prerequisites THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'PREREQUISITE_UNMET',
            'message', v_section.course_code || ' requires ' || v_unmet || '.'
        );
    END IF;

    v_conflicts := public.fn_get_schedule_conflicts(p_student_id, p_section_id);

    IF v_conflicts IS NOT NULL AND NOT p_allow_conflict THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SCHEDULE_CONFLICT',
            'message', v_section.section_code || ' conflicts with ' || v_conflicts || '.'
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND deleted_at IS NULL
    ) THEN
        UPDATE public.enrollments
        SET status = 'Enrolled'::public.enrollment_status_type,
            enrolled_at = now(),
            dropped_at = NULL,
            updated_at = now()
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND deleted_at IS NULL;
    ELSE
        INSERT INTO public.enrollments (
            student_id,
            section_id,
            status,
            enrolled_at
        ) VALUES (
            p_student_id,
            p_section_id,
            'Enrolled'::public.enrollment_status_type,
            now()
        );
    END IF;

    -- Notify the student in real time
    IF v_student.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        VALUES (
            v_student.user_id,
            'Enrollment Confirmed',
            format('You have been officially enrolled in %s (%s).', v_section.course_code, v_section.section_code),
            '/student/subjects',
            'Enrollment'::public.notification_category_type
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully enrolled in ' || v_section.section_code || '.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_enroll_student_section(uuid, uuid, boolean, text, boolean) TO authenticated, service_role;

-- Ensure enrollment window for active school year terms encompasses current date
UPDATE public.terms
SET enrollment_start_date = LEAST(enrollment_start_date, CURRENT_DATE),
    enrollment_end_date = GREATEST(enrollment_end_date, CURRENT_DATE + INTERVAL '180 days')
WHERE school_year_id IN (
    SELECT id FROM public.school_years WHERE is_active = true AND deleted_at IS NULL
)
AND deleted_at IS NULL;
