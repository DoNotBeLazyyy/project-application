-- ============================================================================
-- Migration: 20260106000000_registrar_section_submissions.sql
-- Purpose: Provide Registrar & Dean visibility into section-by-section grade
--          submissions per grading period, inspect student grade sheets with
--          evaluation completion indicators, and approve/release section grades.
-- ============================================================================

-- 1. Section grade submission overview per term and grading period
CREATE OR REPLACE FUNCTION public.fn_list_section_grade_submissions(
    p_term_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Dean', 'Admin');

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'section_id',          s.id,
                'section_code',        s.section_code,
                'room',                s.room,
                'course_id',           c.id,
                'course_code',         c.code,
                'course_title',        c.title,
                'faculty_id',          s.faculty_id,
                'faculty_name',        COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned'),
                'faculty_email',       u.email,
                'enrolled_count',      sub.enrolled_count,
                'graded_count',        sub.graded_count,
                'submitted_count',     sub.submitted_count,
                'approved_count',      sub.approved_count,
                'released_count',      sub.released_count,
                'submission_status',   sub.calculated_status,
                'last_submitted_at',   sub.last_submitted_at
            ) ORDER BY c.code ASC, s.section_code ASC
        )
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN LATERAL (
            SELECT
                COUNT(DISTINCT e.id)                                                            AS enrolled_count,
                COUNT(DISTINCT sfg.id)                                                          AS graded_count,
                COUNT(DISTINCT sfg.id) FILTER (WHERE sfg.status = 'Submitted')                  AS submitted_count,
                COUNT(DISTINCT sfg.id) FILTER (WHERE sfg.status = 'Approved')                   AS approved_count,
                COUNT(DISTINCT sfg.id) FILTER (WHERE sfg.status = 'Released')                   AS released_count,
                MAX(sfg.updated_at) FILTER (WHERE sfg.status IN ('Submitted', 'Approved', 'Released')) AS last_submitted_at,
                CASE
                    WHEN COUNT(DISTINCT e.id) = 0 THEN 'No Enrollees'
                    WHEN COUNT(DISTINCT sfg.id) = 0 THEN 'Not Calculated'
                    WHEN COUNT(DISTINCT sfg.id) FILTER (WHERE sfg.status = 'Released') = COUNT(DISTINCT e.id) THEN 'Released'
                    WHEN COUNT(DISTINCT sfg.id) FILTER (WHERE sfg.status IN ('Approved', 'Released')) = COUNT(DISTINCT e.id) THEN 'Approved'
                    WHEN COUNT(DISTINCT sfg.id) FILTER (WHERE sfg.status = 'Submitted') > 0 THEN 'Submitted'
                    ELSE 'Draft'
                END AS calculated_status
            FROM public.enrollments e
            LEFT JOIN public.section_final_grades sfg
                ON sfg.enrollment_id   = e.id
                AND sfg.grading_period_id = p_grading_period_id
                AND sfg.deleted_at        IS NULL
            WHERE e.section_id = s.id
              AND e.status NOT IN ('Dropped', 'Withdrawn')
              AND e.deleted_at IS NULL
        ) sub ON true
        WHERE s.term_id    = p_term_id
          AND s.deleted_at IS NULL
    ), '[]'::jsonb);
END;
$function$;

-- 2. Enhanced grade sheet including evaluation completion status & remarks
CREATE OR REPLACE FUNCTION public.fn_list_grade_sheet(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.sections s
            WHERE s.id = p_section_id
              AND s.faculty_id = auth.uid()
              AND s.deleted_at IS NULL
        )
        OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
    ) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section grade sheet.'
            USING ERRCODE = '42501';
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'enrollment_id',             e.id,
                'student_number',            st.student_number,
                'full_name',                 u.first_name || ' ' || u.last_name,
                'raw_grade',                 sfg.raw_grade,
                'final_grade',               sfg.final_grade,
                'transmuted_grade',          sfg.transmuted_grade,
                'status',                    COALESCE(sfg.status::text, 'Uncalculated'),
                'special_grade',             sfg.special_grade,
                'remarks',                   sfg.remarks,
                'is_evaluation_completed',   public.fn_check_evaluation_completion(e.id, p_grading_period_id)
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id
            AND sfg.grading_period_id = p_grading_period_id
            AND sfg.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND e.status NOT IN ('Dropped', 'Withdrawn')
          AND e.deleted_at IS NULL
    );
END;
$function$;

-- 3. Enhanced period grade release supporting 'Submitted' grades
CREATE OR REPLACE FUNCTION public.fn_release_grading_period_grades(
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_grade    RECORD;
    v_approved INTEGER := 0;
    v_released INTEGER := 0;
    v_blocked  INTEGER := 0;
BEGIN
    FOR v_grade IN
        SELECT sfg.id, sfg.enrollment_id, sfg.status
        FROM public.section_final_grades sfg
        WHERE sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at        IS NULL
          AND sfg.status            IN ('Draft', 'Submitted', 'Approved')
    LOOP
        IF v_grade.status IN ('Draft', 'Submitted') THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Approved',
                approved_by = auth.uid(),
                approved_at = now(),
                remarks     = COALESCE(remarks, 'Approved by Registrar')
            WHERE id = v_grade.id;

            v_approved := v_approved + 1;
        END IF;

        IF public.fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Released',
                released_at = now()
            WHERE id = v_grade.id;

            UPDATE public.enrollments
            SET is_grade_visible = true
            WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

            v_released := v_released + 1;
        ELSE
            v_blocked := v_blocked + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'approved',              v_approved,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked
    );
END;
$function$;

-- 4. Enhanced section grade approval supporting 'Submitted' grades and Registrar role
CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_grade           RECORD;
  v_approved_count  INTEGER := 0;
  v_released_count  INTEGER := 0;
  v_eval_blocked    INTEGER := 0;
  v_pending_flags   INTEGER := 0;
BEGIN
  PERFORM public.fn_assert_role('Registrar', 'Admin');

  SELECT COUNT(*)
  INTO v_pending_flags
  FROM public.special_grade_flags f
  INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
  WHERE e.section_id        = p_section_id
    AND f.grading_period_id = p_grading_period_id
    AND f.status            = 'Pending'
    AND f.deleted_at        IS NULL;

  IF v_pending_flags > 0 THEN
    RETURN jsonb_build_object(
      'success',            false,
      'pending_flag_count', v_pending_flags,
      'message',            v_pending_flags || ' student(s) have an unresolved special grade flag. '
                         || 'Apply or dismiss each one before approving this period.'
    );
  END IF;

  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            IN ('Submitted', 'Draft', 'Approved')
      AND sfg.enrollment_id IN (
        SELECT e.id FROM public.enrollments e
        WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
      )
  LOOP
    UPDATE public.section_final_grades
    SET
      status      = 'Approved',
      approved_by = auth.uid(),
      approved_at = now(),
      remarks     = 'Approved via fn_approve_and_release_grades'
    WHERE id = v_grade.id;

    v_approved_count := v_approved_count + 1;

    IF fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
      UPDATE public.section_final_grades
      SET status = 'Released', released_at = now()
      WHERE id = v_grade.id;

      UPDATE public.enrollments
      SET is_grade_visible = true
      WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

      v_released_count := v_released_count + 1;
    ELSE
      v_eval_blocked := v_eval_blocked + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',                true,
    'section_id',             p_section_id,
    'grading_period_id',      p_grading_period_id,
    'approved',               v_approved_count,
    'released',               v_released_count,
    'blocked_by_evaluation',  v_eval_blocked,
    'message',                'Grades approved. Release gated by evaluation completion.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

-- Permissions
REVOKE EXECUTE ON FUNCTION public.fn_list_section_grade_submissions(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_section_grade_submissions(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_list_grade_sheet(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_list_grade_sheet(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_release_grading_period_grades(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_release_grading_period_grades(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_approve_and_release_grades(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_approve_and_release_grades(uuid, uuid) TO authenticated;
