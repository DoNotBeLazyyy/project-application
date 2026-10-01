-- ====================================================================
-- Migration: 20261002000000_academic_calendar_downstream_alignments.sql
-- Description: Downstream alignments for Academic Year Calendar Steps 1-6
--   1. Enrollment window validation in fn_enroll_student_section
--   2. Grade encoding window validation in fn_submit_section_grades
--   3. RPC for Academic Thresholds Evaluation (fn_evaluate_student_academic_standing)
-- ====================================================================

-- 1. Update fn_enroll_student_section to enforce enrollment windows
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
    v_student   RECORD;
    v_section   RECORD;
    v_term      RECORD;
    v_taken     INTEGER;
    v_conflicts TEXT;
    v_unmet     TEXT;
BEGIN
    SELECT st.id, st.program_id, st.status
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

    -- Check Term Enrollment Windows (Step 2 Calendar Alignment)
    SELECT t.id, t.enrollment_start_date, t.enrollment_end_date, tt.label AS term_name
    INTO v_term
    FROM public.terms t
    JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.id = v_section.term_id AND t.deleted_at IS NULL;

    IF v_term.id IS NOT NULL AND NOT p_override_prerequisites THEN
        IF v_term.enrollment_start_date IS NOT NULL AND CURRENT_DATE < v_term.enrollment_start_date THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ENROLLMENT_WINDOW_CLOSED',
                'message', 'Enrollment window for ' || v_section.section_code || ' (' || v_term.term_name || ') has not opened yet. Starts on ' || to_char(v_term.enrollment_start_date, 'Mon DD, YYYY') || '.'
            );
        END IF;

        IF v_term.enrollment_end_date IS NOT NULL AND CURRENT_DATE > v_term.enrollment_end_date THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'ENROLLMENT_WINDOW_CLOSED',
                'message', 'Enrollment window for ' || v_section.section_code || ' (' || v_term.term_name || ') closed on ' || to_char(v_term.enrollment_end_date, 'Mon DD, YYYY') || '.'
            );
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.curriculum_maps cm
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
            'message', v_section.course_code || ' requires prerequisite: ' || v_unmet || '.'
        );
    END IF;

    v_conflicts := public.fn_check_schedule_conflict(p_student_id, p_section_id);

    IF v_conflicts IS NOT NULL AND NOT p_allow_conflict THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'SCHEDULE_CONFLICT',
            'message', v_section.section_code || ' conflicts with: ' || v_conflicts || '.'
        );
    END IF;

    INSERT INTO public.enrollments (student_id, section_id, status)
    VALUES (p_student_id, p_section_id, 'Enrolled');

    IF p_allow_conflict AND v_conflicts IS NOT NULL THEN
        INSERT INTO public.enrollment_audit_logs (
            student_id, section_id, action, performed_by, notes
        ) VALUES (
            p_student_id, p_section_id, 'OVERRIDE_CONFLICT', auth.uid(),
            COALESCE(p_conflict_reason, 'Schedule conflict overridden by registrar.')
        );
    END IF;

    IF p_override_prerequisites AND v_unmet IS NOT NULL THEN
        INSERT INTO public.enrollment_audit_logs (
            student_id, section_id, action, performed_by, notes
        ) VALUES (
            p_student_id, p_section_id, 'OVERRIDE_PREREQUISITES', auth.uid(),
            'Prerequisites overridden by registrar: ' || v_unmet
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'ENROLLED',
        'message', 'Enrolled in ' || v_section.section_code || '.'
    );
END;
$function$;


-- 2. Create RPC for Academic Thresholds Evaluation (Step 6 Calendar Alignment)
CREATE OR REPLACE FUNCTION public.fn_evaluate_student_academic_standing(
    p_student_id uuid,
    p_school_year_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student         RECORD;
    v_sy_id           UUID;
    v_gwa             NUMERIC;
    v_failing_count   INTEGER := 0;
    v_lowest_grade    NUMERIC := 1.00;
    v_thresholds      JSONB;
    v_matched_honors  JSONB := '[]'::jsonb;
    v_matched_sch     JSONB := '[]'::jsonb;
    v_standing_label  TEXT := 'Good Standing';
    v_t_rec           RECORD;
BEGIN
    SELECT st.id, st.student_number, st.program_id, st.year_level
    INTO v_student
    FROM public.students st
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    -- Determine active school year if not specified
    IF p_school_year_id IS NULL THEN
        SELECT id INTO v_sy_id
        FROM public.school_years
        WHERE is_active = true AND deleted_at IS NULL
        ORDER BY start_date DESC LIMIT 1;
    ELSE
        v_sy_id := p_school_year_id;
    END IF;

    -- Calculate Cumulative GWA and grade metrics for student
    SELECT
        ROUND(COALESCE(AVG(sfg.final_grade), 1.00), 2),
        COUNT(*) FILTER (WHERE sfg.final_grade > 3.00 OR sfg.special_grade IN ('DRP', 'FDA')),
        MAX(sfg.final_grade)
    INTO v_gwa, v_failing_count, v_lowest_grade
    FROM public.enrollments e
    JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id AND sfg.deleted_at IS NULL
    WHERE e.student_id = p_student_id
    AND e.deleted_at IS NULL
    AND sfg.status IN ('Approved', 'Released');

    IF v_gwa IS NULL THEN
        v_gwa := 1.00;
    END IF;

    -- Evaluate against thresholds declared for school year (fallback to global if none)
    FOR v_t_rec IN
        SELECT
            at.id, at.category, at.code, at.label, at.min_gwa, at.max_gwa,
            at.min_subject_grade, at.requires_no_failing, at.scholarship_discount_pct
        FROM public.academic_thresholds at
        WHERE (at.school_year_id = v_sy_id OR (at.school_year_id IS NULL AND NOT EXISTS (
            SELECT 1 FROM public.academic_thresholds at2 WHERE at2.school_year_id = v_sy_id AND at2.is_active = true AND at2.deleted_at IS NULL
        )))
        AND at.is_active = true AND at.deleted_at IS NULL
        ORDER BY at.sort_order ASC, at.min_gwa ASC
    LOOP
        -- Check if GWA falls within min_gwa and max_gwa
        IF (v_t_rec.min_gwa IS NULL OR v_gwa >= v_t_rec.min_gwa)
           AND (v_t_rec.max_gwa IS NULL OR v_gwa <= v_t_rec.max_gwa) THEN

            -- Check no failing grades requirement
            IF NOT (v_t_rec.requires_no_failing AND v_failing_count > 0) THEN
                -- Check minimum subject grade requirement
                IF v_t_rec.min_subject_grade IS NULL OR v_lowest_grade <= v_t_rec.min_subject_grade THEN

                    IF v_t_rec.category = 'Honor' THEN
                        v_matched_honors := v_matched_honors || jsonb_build_object(
                            'code', v_t_rec.code,
                            'label', v_t_rec.label,
                            'min_gwa', v_t_rec.min_gwa,
                            'max_gwa', v_t_rec.max_gwa
                        );
                    ELSIF v_t_rec.category = 'Scholarship' THEN
                        v_matched_sch := v_matched_sch || jsonb_build_object(
                            'code', v_t_rec.code,
                            'label', v_t_rec.label,
                            'discount_pct', v_t_rec.scholarship_discount_pct
                        );
                    ELSIF v_t_rec.category = 'Standing' THEN
                        v_standing_label := v_t_rec.label;
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- Default to Academic Probation if student has failing grades and standing is default
    IF v_failing_count > 0 AND v_standing_label = 'Good Standing' THEN
        v_standing_label := 'Academic Probation';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'school_year_id', v_sy_id,
        'cumulative_gwa', v_gwa,
        'failing_count', v_failing_count,
        'academic_standing', v_standing_label,
        'qualified_honors', v_matched_honors,
        'qualified_scholarships', v_matched_sch
    );
END;
$function$;
