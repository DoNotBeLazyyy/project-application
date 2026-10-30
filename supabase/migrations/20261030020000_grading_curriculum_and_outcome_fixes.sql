-- ====================================================================
-- Migration: 20261030020000_grading_curriculum_and_outcome_fixes.sql
--   * fn_component_item_scores (new): one counting rule for stored grades and every
--     breakdown (latest graded attempt; published, past-due unsubmitted work counts as 0)
--   * fn_calculate_final_grade: section's own AY scale, no special rows, no double-counted attempts
--   * sections seed components from the AY wizard periods; templates no longer append periods
--   * fn_finalize_enrollment_outcome + trigger: record Completed/Failed/Incomplete and the
--     final grade once all periods are released (prerequisites depend on it); backfilled
--   * curricula may include other departments' courses (General Education)
--   * role checks for fn_create_course and fn_drop_enrollment
--   * notifications: no "Grades Unlocked" when nothing was released; new-assessment link
--     points at the student's subject page
--   * fn_update_system_settings: saving without a logo no longer fails; drop unused overload
-- Rollback: supabase/rollback/20261030020000_grading_curriculum_and_outcome_fixes.down.sql
-- ====================================================================
BEGIN;

-- fn_component_item_scores (new)
-- The single definition of how an assessment counts toward a grading component,
-- shared by fn_calculate_final_grade and the three grade-breakdown views so the stored
-- grade, the faculty audit and the student's breakdown always agree:
--   * graded      -> latest graded attempt, out of total_points
--   * missed      -> published, past its close/due date, nothing awaiting grading:
--                    counts as 0 out of total_points
--   * otherwise   -> still open, or submitted and awaiting manual grading: not counted yet
CREATE OR REPLACE FUNCTION public.fn_component_item_scores(p_enrollment_id uuid, p_component_id uuid)
 RETURNS TABLE (
    id uuid,
    title text,
    assessment_type text,
    due_at timestamptz,
    max_points numeric,
    graded_points numeric,
    graded_at timestamptz,
    submission_status text,
    is_late boolean,
    is_counted boolean,
    is_missed boolean,
    counted_points numeric,
    counted_max numeric
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        x.id, x.title, x.assessment_type, x.due_at, x.max_points,
        x.graded_points, x.graded_at, x.submission_status, x.is_late,
        (x.graded_points IS NOT NULL OR x.is_missed) AS is_counted,
        x.is_missed,
        CASE WHEN x.graded_points IS NOT NULL THEN x.graded_points ELSE 0 END AS counted_points,
        CASE WHEN x.graded_points IS NOT NULL OR x.is_missed THEN x.max_points ELSE 0 END AS counted_max
    FROM (
        SELECT
            ai.id,
            ai.title,
            ai.assessment_type::text AS assessment_type,
            ai.due_at,
            ai.total_points AS max_points,
            sub.final_score AS graded_points,
            sub.graded_at,
            latest.status::text AS submission_status,
            latest.is_late,
            (
                sub.final_score IS NULL
                AND ai.is_published
                AND COALESCE(ai.closes_at, ai.due_at) IS NOT NULL
                AND COALESCE(ai.closes_at, ai.due_at) < now()
                AND COALESCE(latest.status::text, 'Not Started') IN ('Not Started', 'In Progress')
            ) AS is_missed
        FROM public.assessment_items ai
        LEFT JOIN LATERAL (
            SELECT asub.final_score, asub.graded_at
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = p_enrollment_id
              AND asub.status = 'Graded'
              AND asub.deleted_at IS NULL
            ORDER BY asub.attempt_number DESC
            LIMIT 1
        ) sub ON true
        LEFT JOIN LATERAL (
            SELECT asub.status, asub.is_late
            FROM public.assessment_submissions asub
            WHERE asub.assessment_item_id = ai.id
              AND asub.enrollment_id = p_enrollment_id
              AND asub.deleted_at IS NULL
            ORDER BY asub.attempt_number DESC
            LIMIT 1
        ) latest ON true
        WHERE ai.grading_component_id = p_component_id
          AND ai.deleted_at IS NULL
    ) x;
$function$;

REVOKE ALL ON FUNCTION public.fn_component_item_scores(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_student_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    DECLARE
        v_uid                  UUID := auth.uid();
        v_student_name         TEXT;
        v_student_number       TEXT;
        v_section_id           UUID;
        v_context              JSONB;
        v_period               JSONB;
        v_totals               JSONB;
        v_components           JSONB;
        v_total_weight         NUMERIC(8,2);
        v_passing_grade        NUMERIC(5,2);
    BEGIN
        PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

        SELECT
            s.id,
            trim(concat(st_u.first_name, ' ', st_u.last_name)),
            st.student_number,
            jsonb_build_object(
                'enrollment_id', e.id,
                'student_id',    st.id,
                'student_name',  trim(concat(st_u.first_name, ' ', st_u.last_name)),
                'student_number', st.student_number,
                'section_id',    s.id,
                'section_code',  s.section_code,
                'course_code',   c.code,
                'course_title',  c.title,
                'term_label',    tt.label || ' - ' || sy.label
            )
        INTO v_section_id, v_student_name, v_student_number, v_context
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users st_u ON st_u.id = st.user_id AND st_u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE e.id = p_enrollment_id
          AND e.deleted_at IS NULL;

        IF v_section_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment record not found.');
        END IF;

        IF NOT (public.fn_current_user_role_codes() && ARRAY['Admin', 'Dean', 'Registrar']) THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.sections s
                WHERE s.id = v_section_id AND s.faculty_id = v_uid AND s.deleted_at IS NULL
            ) THEN
                RAISE EXCEPTION 'Access Denied: You are not assigned to manage this section.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;

        SELECT jsonb_build_object(
            'grading_period_id',   gp.id,
            'grading_period_name', gp.name,
            'sequence',            gp.sequence,
            'weight',              gp.weight
        )
        INTO v_period
        FROM public.grading_periods gp
        INNER JOIN public.sections s ON s.term_id = gp.term_id AND s.id = v_section_id
        WHERE gp.id = p_grading_period_id
          AND gp.deleted_at IS NULL;

        IF v_period IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Grading period not found for this section.');
        END IF;

        SELECT jsonb_build_object(
            'raw_grade',        COALESCE(sfg.raw_grade, 0),
            'final_grade',      COALESCE(sfg.final_grade, 0),
            'transmuted_grade', COALESCE(sfg.transmuted_grade::TEXT, '—'),
            'special_grade',    sfg.special_grade,
            'status',           COALESCE(sfg.status::TEXT, 'Draft')
        )
        INTO v_totals
        FROM public.section_final_grades sfg
        WHERE sfg.enrollment_id = p_enrollment_id
          AND sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at IS NULL;

        IF v_totals IS NULL THEN
            v_totals := jsonb_build_object(
                'raw_grade', 0,
                'final_grade', 0,
                'transmuted_grade', '—',
                'special_grade', NULL,
                'status', 'Draft'
            );
        END IF;

        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',              c.id,
                'name',            c.name,
                'weight',          c.weight,
                'earned_points',   c.earned_points,
                'max_points',      c.max_points,
                'percentage',      CASE
                    WHEN c.max_points > 0
                    THEN ROUND((c.earned_points / c.max_points) * 100, 2)
                    ELSE NULL
                END,
                'weighted_score',  CASE
                    WHEN c.max_points > 0
                    THEN ROUND((c.earned_points / c.max_points) * c.weight, 2)
                    ELSE 0
                END,
                'graded_count',    c.graded_count,
                'pending_count',   c.item_count - c.graded_count,
                'items',           c.items
            )
            ORDER BY c.name ASC
        ), '[]'::jsonb), COALESCE(SUM(c.weight), 0)
        INTO v_components, v_total_weight
        FROM (
            SELECT
                gc.id,
                gc.name,
                gc.weight,
                COALESCE(SUM(i.counted_points), 0) AS earned_points,
                COALESCE(SUM(i.counted_max), 0) AS max_points,
                COUNT(i.id) AS item_count,
                COUNT(i.id) FILTER (WHERE i.is_counted) AS graded_count,
                COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id',                i.id,
                        'title',             i.title,
                        'assessment_type',   i.assessment_type,
                        'earned_points',     i.graded_points,
                        'max_points',        i.max_points,
                        'submission_status', i.submission_status,
                        'is_late',           i.is_late,
                        'is_counted',        i.is_counted,
                        'is_missed',         i.is_missed,
                        'due_at',            i.due_at,
                        'graded_at',         i.graded_at
                    )
                    ORDER BY i.due_at ASC NULLS LAST, i.title ASC
                ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
            FROM public.grading_components gc
            LEFT JOIN LATERAL public.fn_component_item_scores(p_enrollment_id, gc.id) i ON true
            WHERE gc.section_id = v_section_id
              AND gc.grading_period_id = p_grading_period_id
              AND gc.deleted_at IS NULL
            GROUP BY gc.id, gc.name, gc.weight
        ) c;

        SELECT gcfg.passing_grade
        INTO v_passing_grade
        FROM public.grading_config gcfg
        WHERE gcfg.deleted_at IS NULL
        ORDER BY gcfg.created_at ASC
        LIMIT 1;

        RETURN v_context
            || v_period
            || v_totals
            || jsonb_build_object(
                'components', v_components,
                'total_component_weight', v_total_weight,
                'passing_grade', COALESCE(v_passing_grade, 75.00)
            );
    END;
    $function$;

CREATE OR REPLACE FUNCTION public.fn_get_my_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id           UUID;
    v_section_id           UUID;
    v_context              JSONB;
    v_period               JSONB;
    v_totals               JSONB;
    v_components           JSONB;
    v_status               TEXT;
    v_evaluation_completed BOOLEAN;
    v_total_weight         NUMERIC(8,2);
    v_passing_grade        NUMERIC(5,2);
BEGIN
    PERFORM public.fn_assert_role('Student');

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT
        s.id,
        jsonb_build_object(
            'enrollment_id', e.id,
            'section_id',    s.id,
            'section_code',  s.section_code,
            'course_code',   c.code,
            'course_title',  c.title,
            'term_label',    tt.label || ' - ' || sy.label,
            'faculty_name',  COALESCE(NULLIF(btrim(concat(u.first_name, ' ', u.last_name)), ''), 'Unassigned')
        )
    INTO v_section_id, v_context
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT jsonb_build_object(
        'grading_period_id',   gp.id,
        'grading_period_name', gp.name,
        'sequence',            gp.sequence,
        'weight',              gp.weight
    )
    INTO v_period
    FROM public.grading_periods gp
    INNER JOIN public.sections s ON s.term_id = gp.term_id AND s.id = v_section_id
    WHERE gp.id = p_grading_period_id
    AND gp.deleted_at IS NULL;

    IF v_period IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found for this subject.');
    END IF;

    SELECT
        sfg.status::TEXT,
        jsonb_build_object(
            'raw_grade',        sfg.raw_grade,
            'final_grade',      sfg.final_grade,
            'transmuted_grade', sfg.transmuted_grade,
            'special_grade',    sfg.special_grade,
            'status',           sfg.status
        )
    INTO v_status, v_totals
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at IS NULL;

    IF v_status IS DISTINCT FROM 'Released' THEN
        RETURN jsonb_build_object('success', false, 'message', 'This grade has not been released yet.');
    END IF;

    SELECT COALESCE(epl.is_completed, false)
    INTO v_evaluation_completed
    FROM public.evaluation_period_locks epl
    WHERE epl.enrollment_id = p_enrollment_id
    AND epl.grading_period_id = public.fn_resolve_evaluation_period(p_enrollment_id, p_grading_period_id)
    AND epl.deleted_at IS NULL
    LIMIT 1;

    IF NOT COALESCE(v_evaluation_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Complete the faculty evaluation to view this grade breakdown.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',              c.id,
            'name',            c.name,
            'weight',          c.weight,
            'earned_points',   c.earned_points,
            'max_points',      c.max_points,
            'percentage',      CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * 100, 2)
                ELSE NULL
            END,
            'weighted_score',  CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * c.weight, 2)
                ELSE 0
            END,
            'graded_count',    c.graded_count,
            'pending_count',   c.item_count - c.graded_count,
            'items',           c.items
        )
        ORDER BY c.name ASC
    ), '[]'::jsonb), COALESCE(SUM(c.weight), 0)
    INTO v_components, v_total_weight
    FROM (
        SELECT
            gc.id,
            gc.name,
            gc.weight,
            COALESCE(SUM(i.counted_points), 0) AS earned_points,
            COALESCE(SUM(i.counted_max), 0) AS max_points,
            COUNT(i.id) AS item_count,
            COUNT(i.id) FILTER (WHERE i.is_counted) AS graded_count,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',                i.id,
                    'title',             i.title,
                    'assessment_type',   i.assessment_type,
                    'earned_points',     i.graded_points,
                    'max_points',        i.max_points,
                    'submission_status', i.submission_status,
                    'is_late',           i.is_late,
                    'is_counted',        i.is_counted,
                    'is_missed',         i.is_missed,
                    'due_at',            i.due_at,
                    'graded_at',         i.graded_at
                )
                ORDER BY i.due_at ASC NULLS LAST, i.title ASC
            ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM public.grading_components gc
        LEFT JOIN LATERAL public.fn_component_item_scores(p_enrollment_id, gc.id) i ON true
        WHERE gc.section_id = v_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
        GROUP BY gc.id, gc.name, gc.weight
    ) c;

    SELECT gcfg.passing_grade
    INTO v_passing_grade
    FROM public.grading_config gcfg
    WHERE gcfg.deleted_at IS NULL
    ORDER BY gcfg.created_at ASC
    LIMIT 1;

    RETURN v_context
        || v_period
        || v_totals
        || jsonb_build_object(
            'components', v_components,
            'total_component_weight', v_total_weight,
            'passing_grade', v_passing_grade
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_student_grade_breakdown(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_faculty_id UUID;
    v_period JSONB;
    v_components JSONB;
    v_totals JSONB;
BEGIN
    SELECT s.id, s.faculty_id
    INTO v_section_id, v_faculty_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    IF v_faculty_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You are not assigned to this section.');
    END IF;

    SELECT jsonb_build_object(
        'grading_period_id', gp.id,
        'grading_period_name', gp.name,
        'weight', gp.weight
    )
    INTO v_period
    FROM public.grading_periods gp
    WHERE gp.id = p_grading_period_id
    AND gp.deleted_at IS NULL;

    IF v_period IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',             c.id,
            'name',           c.name,
            'weight',         c.weight,
            'earned_points',  c.earned_points,
            'max_points',     c.max_points,
            'weighted_score', CASE
                WHEN c.max_points > 0
                THEN ROUND((c.earned_points / c.max_points) * c.weight, 2)
                ELSE 0
            END,
            'items',          c.items
        )
        ORDER BY c.name ASC
    ), '[]'::jsonb)
    INTO v_components
    FROM (
        SELECT
            gc.id,
            gc.name,
            gc.weight,
            COALESCE(SUM(i.counted_points), 0) AS earned_points,
            COALESCE(SUM(i.counted_max), 0) AS max_points,
            COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',                i.id,
                    'title',             i.title,
                    'assessment_type',   i.assessment_type,
                    'earned_points',     i.graded_points,
                    'max_points',        i.max_points,
                    'submission_status', i.submission_status,
                    'is_late',           i.is_late,
                    'is_counted',        i.is_counted,
                    'is_missed',         i.is_missed,
                    'due_at',            i.due_at,
                    'graded_at',         i.graded_at
                )
                ORDER BY i.due_at ASC NULLS LAST, i.title ASC
            ) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
        FROM public.grading_components gc
        LEFT JOIN LATERAL public.fn_component_item_scores(p_enrollment_id, gc.id) i ON true
        WHERE gc.section_id = v_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
        GROUP BY gc.id, gc.name, gc.weight
    ) c;

    SELECT jsonb_build_object(
        'raw_grade',        sfg.raw_grade,
        'final_grade',      sfg.final_grade,
        'transmuted_grade', sfg.transmuted_grade,
        'special_grade',    sfg.special_grade,
        'status',           sfg.status
    )
    INTO v_totals
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.grading_period_id = p_grading_period_id
    AND sfg.deleted_at IS NULL;

    RETURN v_period
        || jsonb_build_object('components', v_components)
        || COALESCE(v_totals, jsonb_build_object(
            'raw_grade', NULL,
            'final_grade', NULL,
            'transmuted_grade', NULL,
            'special_grade', NULL,
            'status', NULL
        ));
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_calculate_final_grade(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_section_id          UUID;
  v_component           RECORD;
  v_component_score     NUMERIC(8,2);
  v_component_max       NUMERIC(8,2);
  v_component_weighted  NUMERIC(8,2);
  v_total_weight        NUMERIC(8,2) := 0;
  v_total_weighted      NUMERIC(8,2) := 0;
  v_raw_grade           NUMERIC(5,2);
  v_transmuted_grade    NUMERIC(5,2);
  v_existing_grade_id   UUID;
  v_program_id          UUID;
  v_school_year_id      UUID;
BEGIN
  SELECT s.id, t.school_year_id INTO v_section_id, v_school_year_id
  FROM public.enrollments e
  INNER JOIN public.sections s ON s.id = e.section_id
  LEFT JOIN public.terms t ON t.id = s.term_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  IF v_section_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
  END IF;

  FOR v_component IN
    SELECT gc.id, gc.name, gc.weight
    FROM public.grading_components gc
    WHERE gc.section_id        = v_section_id
      AND gc.grading_period_id = p_grading_period_id
      AND gc.deleted_at        IS NULL
  LOOP
    -- Same counting rules as the grade breakdowns (see fn_component_item_scores)
    SELECT
      COALESCE(SUM(i.counted_points), 0),
      COALESCE(SUM(i.counted_max),    0)
    INTO v_component_score, v_component_max
    FROM public.fn_component_item_scores(p_enrollment_id, v_component.id) i;

    IF v_component_max > 0 THEN
      v_component_weighted := (v_component_score / v_component_max) * v_component.weight;
    ELSE
      v_component_weighted := 0;
    END IF;

    v_total_weight   := v_total_weight   + v_component.weight;
    v_total_weighted := v_total_weighted + v_component_weighted;
  END LOOP;

  IF v_total_weight = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'No grading components found for this period.');
  END IF;

  v_raw_grade := ROUND((v_total_weighted / v_total_weight) * 100, 2);

  SELECT st.program_id INTO v_program_id
  FROM public.enrollments e
  INNER JOIN public.students st ON st.id = e.student_id
  WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

  -- Pick numeric transmuted grade matching the score range
  -- Use the section's own academic-year scale (global rows only as a fallback) and
  -- never a special-grade row such as INC/DRP
  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND (gtt.school_year_id = v_school_year_id OR gtt.school_year_id IS NULL)
    AND gtt.special_code IS NULL
    AND v_raw_grade    >= gtt.min_percentage
    AND gtt.transmuted_grade IS NOT NULL
    AND gtt.deleted_at IS NULL
  ORDER BY (gtt.school_year_id IS NOT NULL) DESC, (gtt.program_id IS NOT NULL) DESC, gtt.min_percentage DESC
  LIMIT 1;

  SELECT id INTO v_existing_grade_id
  FROM public.section_final_grades
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL;

  IF v_existing_grade_id IS NOT NULL THEN
    UPDATE public.section_final_grades
    SET
      raw_grade        = v_raw_grade,
      final_grade      = v_raw_grade,
      transmuted_grade = v_transmuted_grade,
      status           = 'Draft',
      remarks          = 'Auto-calculated via fn_calculate_final_grade'
    WHERE id = v_existing_grade_id;
  ELSE
    INSERT INTO public.section_final_grades (
      enrollment_id,
      grading_period_id,
      raw_grade,
      final_grade,
      transmuted_grade,
      status,
      remarks
    ) VALUES (
      p_enrollment_id,
      p_grading_period_id,
      v_raw_grade,
      v_raw_grade,
      v_transmuted_grade,
      'Draft',
      'Auto-calculated via fn_calculate_final_grade'
    );
  END IF;

  RETURN jsonb_build_object(
    'success',          true,
    'enrollment_id',    p_enrollment_id,
    'grading_period_id', p_grading_period_id,
    'raw_grade',        v_raw_grade,
    'transmuted_grade', v_transmuted_grade,
    'total_weight_used', v_total_weight,
    'message',          'Grade calculated and saved successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$function$;

-- fn_seed_section_grading
CREATE OR REPLACE FUNCTION public.fn_seed_section_grading(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_period RECORD;
    v_seeded INTEGER := 0;
BEGIN
    SELECT term_id INTO v_term_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    FOR v_period IN
        SELECT gp.id AS period_id, gp.sequence AS seq, gp.components
        FROM public.grading_periods gp
        WHERE gp.term_id = v_term_id
          AND gp.deleted_at IS NULL
    LOOP
        IF public.fn_is_section_grading_locked(p_section_id, v_period.period_id) THEN
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM public.grading_components gc
            WHERE gc.section_id = p_section_id
              AND gc.grading_period_id = v_period.period_id
              AND gc.deleted_at IS NULL
        ) THEN
            CONTINUE;
        END IF;

        -- The academic year wizard defines each period's components; templates are only a fallback
        IF jsonb_typeof(v_period.components) = 'array' AND jsonb_array_length(v_period.components) > 0 THEN
            INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
            SELECT p_section_id, v_period.period_id, btrim(c->>'name'), (c->>'weight')::NUMERIC, auth.uid()
            FROM jsonb_array_elements(v_period.components) AS c
            WHERE btrim(COALESCE(c->>'name', '')) <> ''
              AND COALESCE(NULLIF(c->>'weight', '')::NUMERIC, 0) > 0;
        ELSE
            INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
            SELECT p_section_id, v_period.period_id, gct.name, gct.weight, auth.uid()
            FROM public.grading_component_templates gct
            INNER JOIN public.grading_period_templates gpt
                ON gpt.id = gct.grading_period_template_id
               AND gpt.deleted_at IS NULL
            WHERE gpt.sequence = v_period.seq
              AND gct.deleted_at IS NULL;
        END IF;

        IF FOUND THEN
            v_seeded := v_seeded + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'seeded_periods', v_seeded);
END;
$function$;

-- fn_seed_term_grading_periods
CREATE OR REPLACE FUNCTION public.fn_seed_term_grading_periods(p_term_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_inserted INTEGER := 0;
BEGIN
    INSERT INTO public.grading_periods (term_id, name, sequence, weight, created_by)
    SELECT p_term_id, gpt.name, gpt.sequence, gpt.weight, auth.uid()
    FROM public.grading_period_templates gpt
    WHERE gpt.deleted_at IS NULL
      -- A term configured in the academic year wizard already has its periods; templates must not
      -- append extra ones next to them
      AND NOT EXISTS (
          SELECT 1
          FROM public.grading_periods gp
          WHERE gp.term_id = p_term_id
            AND gp.deleted_at IS NULL
      );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    RETURN v_inserted;
END;
$function$;

-- fn_finalize_enrollment_outcome (new) + trigger
-- Nothing recorded a course outcome, yet prerequisites require enrollments.status = 'Completed'
-- and read enrollments.final_grade. Uses the same arithmetic as fn_student_course_grades.
CREATE OR REPLACE FUNCTION public.fn_finalize_enrollment_outcome(p_enrollment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_status public.enrollment_status_type;
    v_term_id UUID;
    v_school_year_id UUID;
    v_period_count INTEGER;
    v_released_count INTEGER;
    v_grade NUMERIC;
    v_special TEXT;
    v_special_passing BOOLEAN;
    v_new_status public.enrollment_status_type;
BEGIN
    SELECT e.status, s.term_id, t.school_year_id
    INTO v_status, v_term_id, v_school_year_id
    FROM public.enrollments e
    JOIN public.sections s ON s.id = e.section_id
    LEFT JOIN public.terms t ON t.id = s.term_id
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    -- Dropped/withdrawn enrollments keep their status
    IF v_status IS NULL OR v_status IN ('Dropped', 'Withdrawn') THEN
        RETURN;
    END IF;

    SELECT count(*) INTO v_period_count
    FROM public.grading_periods gp
    WHERE gp.term_id = v_term_id AND gp.deleted_at IS NULL;

    SELECT
        count(DISTINCT sfg.grading_period_id),
        ROUND(SUM(COALESCE(sfg.transmuted_grade, sfg.final_grade) * gp.weight) / NULLIF(SUM(gp.weight), 0), 2),
        MAX(sfg.special_grade)
    INTO v_released_count, v_grade, v_special
    FROM public.section_final_grades sfg
    JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
    WHERE sfg.enrollment_id = p_enrollment_id
      AND sfg.status = 'Released'
      AND sfg.deleted_at IS NULL;

    IF v_period_count = 0 OR v_released_count < v_period_count THEN
        RETURN;
    END IF;

    IF v_special IS NOT NULL THEN
        SELECT g.is_passing INTO v_special_passing
        FROM public.grade_transmutation_tables g
        WHERE upper(g.special_code) = upper(v_special)
          AND (g.school_year_id = v_school_year_id OR g.school_year_id IS NULL)
          AND g.deleted_at IS NULL
        ORDER BY (g.school_year_id IS NOT NULL) DESC
        LIMIT 1;

        v_new_status := CASE
            WHEN COALESCE(v_special_passing, false) THEN 'Completed'
            WHEN upper(v_special) = 'INC' THEN 'Incomplete'
            ELSE 'Failed'
        END;
        v_grade := NULL;
    ELSE
        v_new_status := CASE WHEN v_grade IS NOT NULL AND v_grade <= 3.00 THEN 'Completed' ELSE 'Failed' END;
    END IF;

    UPDATE public.enrollments
    SET status = v_new_status,
        final_grade = v_grade,
        updated_at = now()
    WHERE id = p_enrollment_id
      AND (status IS DISTINCT FROM v_new_status OR final_grade IS DISTINCT FROM v_grade);
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_finalize_enrollment_outcome(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_trg_finalize_enrollment_outcome()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_finalize_enrollment_outcome(NEW.enrollment_id);
    RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finalize_enrollment_outcome ON public.section_final_grades;
CREATE TRIGGER trg_finalize_enrollment_outcome
    AFTER INSERT OR UPDATE OF status, special_grade, transmuted_grade ON public.section_final_grades
    FOR EACH ROW
    WHEN (NEW.status = 'Released')
    EXECUTE FUNCTION public.fn_trg_finalize_enrollment_outcome();

-- Backfill enrollments whose grades were already fully released
SELECT public.fn_finalize_enrollment_outcome(e.id)
FROM public.enrollments e
WHERE e.deleted_at IS NULL AND e.status NOT IN ('Dropped', 'Withdrawn');

-- fn_create_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_create_curriculum_map_entry(p_program_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_units numeric DEFAULT NULL::numeric, p_type_units jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    -- Enforce department match: program and course must belong to the same department
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.programs p ON p.id = p_program_id
        WHERE c.id = p_course_id
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course does not belong to the department of this program');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course already exists in curriculum for this program and school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective,
        lecture_units, laboratory_units, units, type_units,
        created_by
    )
    VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective,
        p_lecture_units, p_laboratory_units, p_units, COALESCE(p_type_units, '{}'::jsonb),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$function$;

-- fn_update_curriculum_map_entry
CREATE OR REPLACE FUNCTION public.fn_update_curriculum_map_entry(p_curriculum_map_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_units numeric DEFAULT NULL::numeric, p_type_units jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program_id UUID;
BEGIN
    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    -- Enforce department match
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c
        JOIN public.programs p ON p.id = v_program_id
        WHERE c.id = p_course_id
        AND c.deleted_at IS NULL
        AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course does not belong to the department of this program');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = v_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND id <> p_curriculum_map_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    UPDATE public.curriculum_maps
    SET
        course_id = p_course_id,
        year_level = p_year_level,
        term_type_id = p_term_type_id,
        school_year_id = p_school_year_id,
        sequence = p_sequence,
        is_elective = p_is_elective,
        lecture_units = p_lecture_units,
        laboratory_units = p_laboratory_units,
        units = p_units,
        type_units = COALESCE(p_type_units, type_units, '{}'::jsonb),
        updated_at = clock_timestamp(),
        updated_by = auth.uid()
    WHERE id = p_curriculum_map_id;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$function$;

-- fn_bulk_create_curriculum_map
CREATE OR REPLACE FUNCTION public.fn_bulk_create_curriculum_map(p_entries jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_entry JSONB;
    v_program_id UUID;
    v_course_id UUID;
    v_term_type_id UUID;
    v_school_year_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_row_num := v_row_num + 1;

        -- 1. Resolve Program ID
        IF v_entry->>'program_id' IS NOT NULL AND v_entry->>'program_id' <> '' THEN
            SELECT id INTO v_program_id
            FROM public.programs
            WHERE id = (v_entry->>'program_id')::UUID AND deleted_at IS NULL;
        ELSE
            SELECT id INTO v_program_id
            FROM public.programs
            WHERE lower(code) = lower(btrim(COALESCE(v_entry->>'program_code', ''))) AND deleted_at IS NULL;
        END IF;

        IF v_program_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Program not found: ' || COALESCE(v_entry->>'program_code', v_entry->>'program_id', 'empty')
            ));
            CONTINUE;
        END IF;

        -- 2. Resolve Course ID
        IF v_entry->>'course_id' IS NOT NULL AND v_entry->>'course_id' <> '' THEN
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE id = (v_entry->>'course_id')::UUID AND deleted_at IS NULL;
        ELSE
            SELECT id INTO v_course_id
            FROM public.courses
            WHERE upper(code) = upper(btrim(COALESCE(v_entry->>'course_code', ''))) AND deleted_at IS NULL;
        END IF;

        IF v_course_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Course not found: ' || COALESCE(v_entry->>'course_code', v_entry->>'course_id', 'empty')
            ));
            CONTINUE;
        END IF;

        -- 3. Check department matching (allow null department for universal/GE courses)
        IF NOT EXISTS (
            SELECT 1 FROM public.courses c
            JOIN public.programs p ON p.id = v_program_id
            WHERE c.id = v_course_id
            AND c.deleted_at IS NULL
            AND p.deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Course does not belong to the department of program ' || COALESCE(v_entry->>'program_code', v_program_id::text)
            ));
            CONTINUE;
        END IF;

        -- 4. Resolve Term Type ID (support UUID, code, label, and common aliases)
        IF v_entry->>'term_type_id' IS NOT NULL AND v_entry->>'term_type_id' <> '' THEN
            SELECT id INTO v_term_type_id
            FROM public.term_types
            WHERE id = (v_entry->>'term_type_id')::UUID AND deleted_at IS NULL;
        ELSE
            SELECT id INTO v_term_type_id
            FROM public.term_types
            WHERE (
                upper(code) = upper(btrim(COALESCE(v_entry->>'term_type_code', '')))
                OR lower(label) = lower(btrim(COALESCE(v_entry->>'term_type_code', '')))
                OR (upper(btrim(COALESCE(v_entry->>'term_type_code', ''))) IN ('1ST_SEM', '1ST_SEMESTER', '1ST SEMESTER', 'FIRST SEMESTER', '1ST-SEM') AND upper(code) = '1ST_SEM')
                OR (upper(btrim(COALESCE(v_entry->>'term_type_code', ''))) IN ('2ND_SEM', '2ND_SEMESTER', '2ND SEMESTER', 'SECOND SEMESTER', '2ND-SEM') AND upper(code) = '2ND_SEM')
                OR (upper(btrim(COALESCE(v_entry->>'term_type_code', ''))) IN ('SUMMER', 'SUMMER_TERM', 'SUMMER TERM') AND upper(code) = 'SUMMER')
            )
            AND deleted_at IS NULL
            LIMIT 1;
        END IF;

        IF v_term_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Term type code not found: ' || COALESCE(v_entry->>'term_type_code', v_entry->>'term_type_id', 'empty')
            ));
            CONTINUE;
        END IF;

        -- 5. Resolve School Year ID
        IF v_entry->>'school_year_id' IS NOT NULL AND v_entry->>'school_year_id' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE id = (v_entry->>'school_year_id')::UUID AND deleted_at IS NULL;
        ELSIF v_entry->>'school_year_code' IS NOT NULL AND v_entry->>'school_year_code' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE code = v_entry->>'school_year_code' AND deleted_at IS NULL;

            IF v_school_year_id IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num,
                    'code', COALESCE(v_entry->>'course_code', 'unknown'),
                    'message', 'School year code not found: ' || (v_entry->>'school_year_code')
                ));
                CONTINUE;
            END IF;
        ELSE
            v_school_year_id := NULL;
        END IF;

        IF (v_entry->>'year_level')::SMALLINT < 1 OR (v_entry->>'year_level')::SMALLINT > 8 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', COALESCE(v_entry->>'course_code', 'unknown'),
                'message', 'Year level must be between 1 and 8'
            ));
            CONTINUE;
        END IF;

        -- 6. Upsert into curriculum_maps: if already exists, update properties
        IF EXISTS (
            SELECT 1 FROM public.curriculum_maps
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL
        ) THEN
            UPDATE public.curriculum_maps
            SET
                year_level = (v_entry->>'year_level')::SMALLINT,
                term_type_id = v_term_type_id,
                sequence = COALESCE((v_entry->>'sequence')::SMALLINT, sequence, 1),
                is_elective = COALESCE((v_entry->>'is_elective')::BOOLEAN, is_elective, FALSE),
                lecture_units = COALESCE((v_entry->>'lecture_units')::NUMERIC, lecture_units),
                laboratory_units = COALESCE((v_entry->>'laboratory_units')::NUMERIC, laboratory_units),
                units = COALESCE((v_entry->>'units')::NUMERIC, units),
                type_units = COALESCE(NULLIF((v_entry->>'type_units')::JSONB, '{}'::jsonb), type_units, '{}'::jsonb),
                updated_at = clock_timestamp(),
                updated_by = auth.uid()
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL;

            v_success_count := v_success_count + 1;
            CONTINUE;
        END IF;

        -- 7. Insert new curriculum_map record
        INSERT INTO public.curriculum_maps (
            program_id, course_id, year_level, term_type_id,
            school_year_id, sequence, is_elective,
            lecture_units, laboratory_units, units, type_units,
            created_by
        )
        VALUES (
            v_program_id,
            v_course_id,
            (v_entry->>'year_level')::SMALLINT,
            v_term_type_id,
            v_school_year_id,
            COALESCE((v_entry->>'sequence')::SMALLINT, 1),
            COALESCE((v_entry->>'is_elective')::BOOLEAN, FALSE),
            (v_entry->>'lecture_units')::NUMERIC,
            (v_entry->>'laboratory_units')::NUMERIC,
            (v_entry->>'units')::NUMERIC,
            COALESCE((v_entry->>'type_units')::JSONB, '{}'::jsonb),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', v_errors = '[]'::JSONB,
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;

-- fn_get_courses
CREATE OR REPLACE FUNCTION public.fn_get_courses(p_exclude_ids uuid[] DEFAULT NULL::uuid[], p_department_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_dean_dept_id UUID;
    v_eff_dept_id UUID;
BEGIN
    v_dean_dept_id := public.fn_get_dean_department_id();
    v_eff_dept_id := COALESCE(v_dean_dept_id, p_department_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'base_code', COALESCE(c.base_code, c.code),
                'label', c.code || ' — ' || c.title,
                'department_id', c.department_id,
                'department_code', (SELECT d.code FROM public.departments d WHERE d.id = c.department_id),
                'course_type_id', c.course_type_id,
                'course_type_code', ct.code,
                'course_type_label', COALESCE(
                    NULLIF((
                        SELECT string_agg(DISTINCT ct_sub.label, ', ' ORDER BY ct_sub.label)
                        FROM public.course_course_types cct
                        JOIN public.course_types ct_sub ON ct_sub.id = cct.course_type_id AND ct_sub.deleted_at IS NULL
                        WHERE cct.course_id = c.id AND cct.deleted_at IS NULL
                    ), ''),
                    ct.label
                ),
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'credit_hours', c.credit_hours,
                'course_types', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'course_type_id', cct.course_type_id,
                        'course_type_code', ct2.code,
                        'course_type_label', ct2.label,
                        'units', cct.units,
                        'credit_hours', cct.credit_hours
                    ) ORDER BY cct.created_at ASC)
                    FROM public.course_course_types cct
                    JOIN public.course_types ct2 ON ct2.id = cct.course_type_id AND ct2.deleted_at IS NULL
                    WHERE cct.course_id = c.id AND cct.deleted_at IS NULL
                ), '[]'::jsonb)
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        LEFT JOIN public.course_types ct ON ct.id = c.course_type_id
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
        AND (v_eff_dept_id IS NULL OR c.department_id = v_eff_dept_id)
    );
END;
$function$;

-- fn_create_course
CREATE OR REPLACE FUNCTION public.fn_create_course(p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_is_split boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb, p_course_types jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_type_count INTEGER := 0;
    v_type_elem JSONB;
    v_ct_record RECORD;
    v_dept_code TEXT;
    v_base_code TEXT;
    v_created_id UUID;
    v_prereq JSONB;
    v_next_course_num INT := 101;
    v_sum_lec NUMERIC := 0;
    v_sum_lab NUMERIC := 0;
    v_sum_units NUMERIC := 0;
    v_sum_credit NUMERIC := 0;
    v_elem_units NUMERIC := 0;
    v_elem_credit NUMERIC := 0;
    v_elem_type_id UUID;
    v_primary_course_type_id UUID := NULL;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    -- Deans may only create courses in their own department (NULL = Admin, unscoped)
    IF public.fn_get_dean_department_id() IS NOT NULL AND p_department_id IS DISTINCT FROM public.fn_get_dean_department_id() THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only create courses in your department.');
    END IF;

    SELECT code INTO v_dept_code FROM public.departments
    WHERE id = p_department_id AND deleted_at IS NULL;

    IF v_dept_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    v_base_code := btrim(COALESCE(p_code, ''));
    IF v_base_code = '' THEN
        IF v_dept_code LIKE '%GAS%' OR v_dept_code LIKE '%GEN%' THEN
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(code, '^' || v_dept_code || '([0-9]+).*$', '\1'), code)::int), 0
            ) + 1
            INTO v_next_course_num
            FROM public.courses
            WHERE department_id = p_department_id AND deleted_at IS NULL AND code ~ ('^' || v_dept_code || '[0-9]+');

            v_base_code := v_dept_code || lpad(v_next_course_num::text, 2, '0');
        ELSE
            SELECT COALESCE(
                MAX(NULLIF(regexp_replace(code, '^' || v_dept_code || '([0-9]+).*$', '\1'), code)::int), 100
            ) + 1
            INTO v_next_course_num
            FROM public.courses
            WHERE department_id = p_department_id AND deleted_at IS NULL AND code ~ ('^' || v_dept_code || '[0-9]+');

            IF v_next_course_num < 101 THEN
                v_next_course_num := 101;
            END IF;

            v_base_code := v_dept_code || v_next_course_num::text;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.courses
        WHERE lower(code) = lower(v_base_code) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || v_base_code);
    END IF;

    IF p_course_types IS NOT NULL AND jsonb_typeof(p_course_types) = 'array' THEN
        v_type_count := jsonb_array_length(p_course_types);
    END IF;

    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            v_elem_type_id := (v_type_elem->>'course_type_id')::uuid;
            SELECT * INTO v_ct_record
            FROM public.course_types
            WHERE id = v_elem_type_id
            AND deleted_at IS NULL;

            IF v_ct_record.id IS NULL THEN
                RETURN jsonb_build_object('success', false, 'message', 'Course type not found: ' || COALESCE(v_type_elem->>'course_type_id', 'null'));
            END IF;

            IF v_primary_course_type_id IS NULL THEN
                v_primary_course_type_id := v_ct_record.id;
            END IF;

            v_elem_units := COALESCE((v_type_elem->>'units')::numeric, 0);
            v_elem_credit := COALESCE((v_type_elem->>'credit_hours')::numeric, v_elem_units);

            v_sum_units := v_sum_units + v_elem_units;
            v_sum_credit := v_sum_credit + v_elem_credit;

            IF UPPER(TRIM(v_ct_record.code)) IN ('LAB', 'LABORATORY') THEN
                v_sum_lab := v_sum_lab + v_elem_units;
            ELSIF UPPER(TRIM(v_ct_record.code)) IN ('LEC', 'LECTURE') THEN
                v_sum_lec := v_sum_lec + v_elem_units;
            ELSE
                v_sum_lec := v_sum_lec + v_elem_units;
            END IF;
        END LOOP;
    ELSE
        v_primary_course_type_id := p_course_type_id;
        v_sum_lec := COALESCE(p_lecture_units, 0);
        v_sum_lab := COALESCE(p_laboratory_units, 0);
        v_sum_units := v_sum_lec + v_sum_lab;
        v_sum_credit := COALESCE(p_credit_hours, v_sum_units);

        IF v_primary_course_type_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.course_types
            WHERE id = v_primary_course_type_id AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
        END IF;
    END IF;

    -- Create single unified course (total_units is generated automatically)
    INSERT INTO public.courses (
        code, title, department_id, course_type_id,
        lecture_units, laboratory_units, credit_hours,
        description, is_active, base_code, created_by
    )
    VALUES (
        v_base_code, p_title, p_department_id, v_primary_course_type_id,
        v_sum_lec, v_sum_lab, v_sum_credit,
        NULLIF(p_description, ''), p_is_active, v_base_code, auth.uid()
    )
    RETURNING id INTO v_created_id;

    -- Insert course types breakdown into course_course_types
    IF v_type_count > 0 THEN
        FOR v_type_elem IN SELECT * FROM jsonb_array_elements(p_course_types)
        LOOP
            INSERT INTO public.course_course_types (
                course_id, course_type_id, units, credit_hours, created_by
            )
            VALUES (
                v_created_id,
                (v_type_elem->>'course_type_id')::uuid,
                COALESCE((v_type_elem->>'units')::numeric, 0),
                COALESCE((v_type_elem->>'credit_hours')::numeric, (v_type_elem->>'units')::numeric, 0),
                auth.uid()
            );
        END LOOP;
    ELSIF v_primary_course_type_id IS NOT NULL THEN
        INSERT INTO public.course_course_types (
            course_id, course_type_id, units, credit_hours, created_by
        )
        VALUES (
            v_created_id,
            v_primary_course_type_id,
            v_sum_units,
            v_sum_credit,
            auth.uid()
        );
    END IF;

    -- Attach prerequisites
    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    CONTINUE;
                END IF;
                IF (v_prereq->>'course_id')::UUID = v_created_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
            END IF;

            INSERT INTO public.course_prerequisites (
                course_id, prerequisite_id, prerequisite_type,
                prerequisite_kind, year_level_required, minimum_grade, created_by
            )
            VALUES (
                v_created_id,
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                    THEN (v_prereq->>'course_id')::UUID
                    ELSE NULL END,
                (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                    THEN (v_prereq->>'year_level_required')::SMALLINT
                    ELSE NULL END,
                CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                     ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course created successfully', 'id', v_created_id);
END;
$function$;

-- fn_drop_enrollment
CREATE OR REPLACE FUNCTION public.fn_drop_enrollment(p_enrollment_id uuid, p_drop_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_code TEXT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.section_code INTO v_section_code
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET status = 'Dropped'::public.enrollment_status_type,
        dropped_at = now(),
        drop_reason = NULLIF(trim(COALESCE(p_drop_reason, '')), ''),
        updated_by = auth.uid()
    WHERE id = p_enrollment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Dropped ' || v_section_code || '.');
END;
$function$;

-- fn_release_grades_after_evaluation
CREATE OR REPLACE FUNCTION public.fn_release_grades_after_evaluation(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_completed BOOLEAN;
  v_grade_count  INTEGER;
  v_student_user_id UUID;
  v_course_code TEXT;
BEGIN
  SELECT fn_check_evaluation_completion(p_enrollment_id, p_grading_period_id)
  INTO v_is_completed;

  IF NOT v_is_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Evaluation not yet completed for this grading period.'
    );
  END IF;

  UPDATE public.enrollments
  SET is_grade_visible = true
  WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

  UPDATE public.section_final_grades
  SET status = 'Released', released_at = now()
  WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND status = 'Approved'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_grade_count = ROW_COUNT;

  -- Notify the student that grades are now unlocked
  SELECT st.user_id, c.code
  INTO v_student_user_id, v_course_code
  FROM public.enrollments e
  JOIN public.students st ON st.id = e.student_id
  JOIN public.sections s ON s.id = e.section_id
  LEFT JOIN public.courses c ON c.id = s.course_id
  WHERE e.id = p_enrollment_id;

  IF v_student_user_id IS NOT NULL AND v_grade_count > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
      v_student_user_id,
      'Grades Unlocked',
      format('Evaluation completed! Your %s grades are now unlocked and viewable.', COALESCE(v_course_code, 'course')),
      '/student/grade',
      'Grade'::public.notification_category_type
    );
  END IF;

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Grades released successfully.',
    'rows_updated', v_grade_count
  );
END;
$function$;

-- fn_create_assessment
CREATE OR REPLACE FUNCTION public.fn_create_assessment(p_section_id uuid, p_title text, p_description text, p_assessment_type assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint, p_allow_student_review boolean DEFAULT true)
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
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_opens_at >= p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before due date.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_opens_at >= p_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before closing date.');
    END IF;

    IF p_due_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_closes_at < p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be on or after due date.');
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND p_opens_at IS NOT NULL AND p_scheduled_publish_at > p_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scheduled publish date must be on or before the opens date.');
    END IF;

    IF NOT COALESCE(p_show_all_questions, true) AND (p_questions_per_page IS NULL OR p_questions_per_page < 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Questions per page must be at least 1 when not showing all questions.');
    END IF;

    v_is_published := CASE
        WHEN p_scheduled_publish_at IS NOT NULL AND p_scheduled_publish_at > now() THEN false
        ELSE true
    END;

    INSERT INTO public.assessment_items (
        section_id, grading_component_id, title, description, assessment_type,
        total_points, passing_points, time_limit_minutes, max_attempts,
        opens_at, due_at, closes_at, show_results_at, scheduled_publish_at,
        shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
        allow_student_review, is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, p_title, NULLIF(p_description, ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, p_scheduled_publish_at,
        COALESCE(p_shuffle_questions, false), COALESCE(p_shuffle_choices, false),
        COALESCE(p_show_all_questions, true),
        CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
        COALESCE(p_allow_student_review, true),
        v_is_published, auth.uid()
    )
    RETURNING id INTO v_id;

    -- If published immediately, notify all enrolled students
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
            format('/student/subjects/%s?tab=assessments', e.id::text),
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

-- fn_update_system_settings
CREATE OR REPLACE FUNCTION public.fn_update_system_settings(p_institution_name text, p_institution_short_name text, p_institution_address text, p_institution_email text, p_institution_phone text, p_institution_website text, p_institution_logo_url text, p_academic_year_start_month smallint, p_max_units_per_term smallint DEFAULT 24, p_default_term_type_id uuid DEFAULT NULL::uuid, p_default_evaluation_scope text DEFAULT 'Period'::text, p_institution_mobile text DEFAULT NULL::text, p_max_upload_size_mb smallint DEFAULT 25, p_allowed_upload_types text DEFAULT 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    SELECT id INTO v_id
    FROM public.system_settings
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        UPDATE public.system_settings
        SET
            institution_name = p_institution_name,
            institution_short_name = p_institution_short_name,
            institution_address = p_institution_address,
            institution_email = p_institution_email,
            institution_phone = p_institution_phone,
            institution_mobile = p_institution_mobile,
            institution_website = p_institution_website,
            institution_logo_url = COALESCE(NULLIF(btrim(p_institution_logo_url), ''), institution_logo_url, ''),
            academic_year_start_month = p_academic_year_start_month,
            updated_at = now(),
            updated_by = auth.uid()
        WHERE id = v_id;
    ELSE
        INSERT INTO public.system_settings (
            institution_name,
            institution_short_name,
            institution_address,
            institution_email,
            institution_phone,
            institution_mobile,
            institution_website,
            institution_logo_url,
            academic_year_start_month,
            created_by
        )
        VALUES (
            p_institution_name,
            p_institution_short_name,
            p_institution_address,
            p_institution_email,
            p_institution_phone,
            p_institution_mobile,
            p_institution_website,
            COALESCE(NULLIF(btrim(p_institution_logo_url), ''), ''),
            p_academic_year_start_month,
            auth.uid()
        )
        RETURNING id INTO v_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$function$;

-- The older 12-parameter overload is unused; one definition removes call ambiguity
DROP FUNCTION IF EXISTS public.fn_update_system_settings(text,text,text,text,text,text,text,text,smallint,smallint,uuid,text);

COMMIT;
