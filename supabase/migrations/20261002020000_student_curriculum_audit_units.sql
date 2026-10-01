-- Update fn_get_curriculum_audit to expose lecture_units and laboratory_units
CREATE OR REPLACE FUNCTION public.fn_get_curriculum_audit(p_student_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id           UUID;
    v_student              JSONB;
    v_program              JSONB;
    v_program_id           UUID;
    v_required_units       NUMERIC(8,2);
    v_earned_units         NUMERIC(8,2) := 0;
    v_in_progress_units    NUMERIC(8,2) := 0;
    v_cumulative_gwa       NUMERIC(5,2);
    v_completed            INTEGER := 0;
    v_failed               INTEGER := 0;
    v_in_progress          INTEGER := 0;
    v_total_courses        INTEGER := 0;
    v_year_levels          JSONB;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);

    SELECT
        jsonb_build_object(
            'id', s.id,
            'student_number', s.student_number,
            'full_name', u.first_name || ' ' || u.last_name,
            'year_level', s.year_level,
            'status', s.status,
            'admitted_at', s.admitted_at
        ),
        s.program_id
    INTO v_student, v_program_id
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This student is not assigned to a program yet.'
        );
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'total_units', p.total_units,
        'years_duration', p.years_duration
    )
    INTO v_program
    FROM public.programs p
    WHERE p.id = v_program_id
      AND p.deleted_at IS NULL;

    WITH attempts AS (
        SELECT * FROM public.fn_student_course_grades(v_student_id)
    ),
    best_attempt AS (
        SELECT DISTINCT ON (a.course_id)
            a.course_id,
            a.term_id,
            a.grade,
            a.special_grade,
            a.is_released,
            a.is_passing,
            a.enrollment_status
        FROM attempts a
        ORDER BY
            a.course_id,
            (a.is_passing IS TRUE) DESC,
            a.is_released DESC,
            a.grade ASC NULLS LAST
    ),
    requirements AS (
        SELECT
            COALESCE(cm.units, c.total_units) AS units,
            CASE
                WHEN b.course_id IS NULL THEN 'Not Taken'
                WHEN b.is_passing IS TRUE THEN 'Completed'
                WHEN b.is_released AND b.is_passing IS FALSE THEN 'Failed'
                WHEN b.enrollment_status = 'Enrolled' THEN 'In Progress'
                ELSE 'Not Taken'
            END AS status
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN best_attempt b ON b.course_id = cm.course_id
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
    )
    SELECT
        COALESCE(SUM(r.units) FILTER (WHERE r.status = 'Completed'), 0),
        COALESCE(SUM(r.units) FILTER (WHERE r.status = 'In Progress'), 0),
        COALESCE(SUM(r.units), 0),
        COUNT(*) FILTER (WHERE r.status = 'Completed'),
        COUNT(*) FILTER (WHERE r.status = 'Failed'),
        COUNT(*) FILTER (WHERE r.status = 'In Progress'),
        COUNT(*)
    INTO
        v_earned_units,
        v_in_progress_units,
        v_required_units,
        v_completed,
        v_failed,
        v_in_progress,
        v_total_courses
    FROM requirements r;

    WITH attempts AS (
        SELECT * FROM public.fn_student_course_grades(v_student_id)
    ),
    best_attempt AS (
        SELECT DISTINCT ON (a.course_id)
            a.course_id,
            a.term_id,
            a.grade,
            a.special_grade,
            a.is_released,
            a.is_passing,
            a.enrollment_status
        FROM attempts a
        ORDER BY
            a.course_id,
            (a.is_passing IS TRUE) DESC,
            a.is_released DESC,
            a.grade ASC NULLS LAST
    ),
    requirements AS (
        SELECT
            cm.id AS curriculum_map_id,
            cm.year_level,
            cm.sequence,
            cm.is_elective,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            COALESCE(cm.units, c.total_units) AS units,
            COALESCE(cm.lecture_units, c.lecture_units, 0) AS lecture_units,
            COALESCE(cm.laboratory_units, c.laboratory_units, 0) AS laboratory_units,
            cm.term_type_id AS term_type_id,
            COALESCE(tt.label, 'Unassigned') AS term_type_label,
            COALESCE(tt.sequence, 99) AS term_type_sequence,
            b.grade,
            b.special_grade,
            CASE
                WHEN b.course_id IS NULL THEN 'Not Taken'
                WHEN b.is_passing IS TRUE THEN 'Completed'
                WHEN b.is_released AND b.is_passing IS FALSE THEN 'Failed'
                WHEN b.enrollment_status = 'Enrolled' THEN 'In Progress'
                ELSE 'Not Taken'
            END AS status,
            CASE
                WHEN b.is_released THEN tt2.label || ' - ' || sy.label
                ELSE NULL
            END AS taken_label
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN best_attempt b ON b.course_id = cm.course_id
        LEFT JOIN public.terms t ON t.id = b.term_id AND t.deleted_at IS NULL
        LEFT JOIN public.term_types tt2 ON tt2.id = t.term_type_id AND tt2.deleted_at IS NULL
        LEFT JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
    ),
    grouped_terms AS (
        SELECT
            r.year_level,
            r.term_type_id,
            r.term_type_label,
            r.term_type_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'curriculum_map_id', r.curriculum_map_id,
                    'course_id', r.course_id,
                    'course_code', r.course_code,
                    'course_title', r.course_title,
                    'units', r.units,
                    'lecture_units', r.lecture_units,
                    'laboratory_units', r.laboratory_units,
                    'is_elective', r.is_elective,
                    'status', r.status,
                    'grade', r.grade,
                    'special_grade', r.special_grade,
                    'taken_label', r.taken_label
                )
                ORDER BY r.sequence, r.course_code
            ) AS courses
        FROM requirements r
        GROUP BY r.year_level, r.term_type_id, r.term_type_label, r.term_type_sequence
    ),
    grouped_years AS (
        SELECT
            gt.year_level,
            jsonb_agg(
                jsonb_build_object(
                    'term_type_id', gt.term_type_id,
                    'term_type_label', gt.term_type_label,
                    'courses', gt.courses
                )
                ORDER BY gt.term_type_sequence
            ) AS terms
        FROM grouped_terms gt
        GROUP BY gt.year_level
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'year_level', gy.year_level,
                'terms', gy.terms
            )
            ORDER BY gy.year_level
        ),
        '[]'::jsonb
    )
    INTO v_year_levels
    FROM grouped_years gy;

    SELECT ROUND(
        SUM(a.grade * a.units) / NULLIF(SUM(a.units), 0),
        2
    )
    INTO v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released
      AND a.grade IS NOT NULL
      AND a.special_grade IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'student', v_student,
        'program', v_program,
        'summary', jsonb_build_object(
            'required_units', v_required_units,
            'earned_units', v_earned_units,
            'in_progress_units', v_in_progress_units,
            'remaining_units', GREATEST(v_required_units - v_earned_units - v_in_progress_units, 0),
            'completion_pct', CASE
                WHEN v_required_units > 0
                    THEN ROUND((v_earned_units / v_required_units) * 100, 2)
                ELSE 0
            END,
            'total_courses', v_total_courses,
            'completed_courses', v_completed,
            'failed_courses', v_failed,
            'in_progress_courses', v_in_progress,
            'cumulative_gwa', v_cumulative_gwa
        ),
        'year_levels', v_year_levels
    );
END;
$function$;
