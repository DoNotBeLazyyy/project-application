-- Migration: 20261015010000_transferee_course_crediting.sql
-- Description:
--   1. Create public.student_credited_courses table to record courses transferred/credited from previous institutions.
--   2. Update public.fn_student_course_grades to include credited courses as passing, completed attempts.
--   3. Update public.fn_get_unmet_prerequisites to consider credited courses as satisfied prerequisites.
--   4. Update public.fn_get_curriculum_audit to display credited courses with transfer institution labels.
--   5. Update public.fn_list_eligible_sections and fn_enroll_student_section to prevent re-enrolling in credited courses.
--   6. Provide Registrar RPCs:
--      - fn_get_student_curriculum_for_crediting
--      - fn_credit_student_course
--      - fn_remove_credited_course

-- ============================================================================
-- 1. SCHEMA: TABLE public.student_credited_courses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_credited_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    previous_school text NOT NULL,
    previous_course_code text,
    previous_course_title text,
    grade_display text NOT NULL DEFAULT 'Passed',
    grade_numeric numeric(3,2),
    units_credited numeric(4,2) NOT NULL DEFAULT 3.0,
    remarks text,
    credited_by uuid REFERENCES public.users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_student_credited_courses_student ON public.student_credited_courses(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_credited_courses_course ON public.student_credited_courses(course_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uidx_student_credited_course ON public.student_credited_courses (student_id, course_id) WHERE deleted_at IS NULL;

ALTER TABLE public.student_credited_courses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "student_credited_courses_all" ON public.student_credited_courses;
    CREATE POLICY "student_credited_courses_all" ON public.student_credited_courses
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.student_credited_courses TO authenticated, service_role;

-- Add to Realtime publication
ALTER TABLE public.student_credited_courses REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'student_credited_courses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_credited_courses;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ============================================================================
-- 2. UPDATE fn_student_course_grades TO INCLUDE CREDITED COURSES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_student_course_grades(p_student_id uuid)
RETURNS TABLE(
    enrollment_id uuid,
    term_id uuid,
    course_id uuid,
    course_code text,
    course_title text,
    units numeric,
    grade numeric,
    raw_grade numeric,
    special_grade text,
    enrollment_status text,
    is_released boolean,
    is_passing boolean,
    completed_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT
        g.enrollment_id,
        g.term_id,
        g.course_id,
        g.course_code,
        g.course_title,
        g.units,
        g.grade,
        g.raw_grade,
        g.special_grade,
        g.enrollment_status,
        g.is_released,
        CASE
            WHEN g.special_grade IS NOT NULL
                THEN COALESCE(sgc.is_passing, false)
            WHEN g.is_released AND g.grade IS NOT NULL
                THEN g.grade <= 3.00
            ELSE NULL
        END AS is_passing,
        g.completed_at
    FROM (
        SELECT
            e.id AS enrollment_id,
            sec.term_id AS term_id,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            c.total_units AS units,
            ROUND(
                SUM(COALESCE(sfg.transmuted_grade, sfg.final_grade) * gp.weight)
                    FILTER (WHERE sfg.status = 'Released')
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released'), 0),
                2
            ) AS grade,
            ROUND(
                SUM(sfg.final_grade * gp.weight) FILTER (WHERE sfg.status = 'Released')
                / NULLIF(SUM(gp.weight) FILTER (WHERE sfg.status = 'Released'), 0),
                2
            ) AS raw_grade,
            MAX(sfg.special_grade) FILTER (WHERE sfg.status = 'Released') AS special_grade,
            e.status::TEXT AS enrollment_status,
            COALESCE(bool_or(sfg.status = 'Released'), false) AS is_released,
            MAX(sfg.released_at) FILTER (WHERE sfg.status = 'Released') AS completed_at
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id AND sfg.deleted_at IS NULL
        LEFT JOIN public.grading_periods gp
            ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        WHERE e.student_id = p_student_id
          AND e.deleted_at IS NULL
          AND e.status <> 'Dropped'
        GROUP BY e.id, sec.term_id, c.id, c.code, c.title, c.total_units, e.status
    ) g
    LEFT JOIN public.special_grade_configs sgc
        ON sgc.code = g.special_grade AND sgc.deleted_at IS NULL

    UNION ALL

    -- Credited courses from previous institution (Transferee)
    SELECT
        scc.id AS enrollment_id,
        NULL::uuid AS term_id,
        scc.course_id AS course_id,
        c.code AS course_code,
        c.title AS course_title,
        COALESCE(scc.units_credited, c.total_units) AS units,
        scc.grade_numeric AS grade,
        scc.grade_numeric AS raw_grade,
        COALESCE(scc.grade_display, 'Credited') AS special_grade,
        'Credited'::text AS enrollment_status,
        true AS is_released,
        true AS is_passing,
        scc.created_at AS completed_at
    FROM public.student_credited_courses scc
    INNER JOIN public.courses c ON c.id = scc.course_id AND c.deleted_at IS NULL
    WHERE scc.student_id = p_student_id
      AND scc.deleted_at IS NULL;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_student_course_grades(uuid) TO authenticated, service_role;

-- ============================================================================
-- 3. UPDATE fn_get_unmet_prerequisites TO SATISFY PREREQUISITES VIA CREDITING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_unmet_prerequisites(p_student_id uuid, p_course_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT string_agg(unmet.label, ', ' ORDER BY unmet.label)
    FROM (
        SELECT CASE
            WHEN cp.prerequisite_kind = 'standing'
                THEN 'Year ' || cp.year_level_required::TEXT || ' standing'
            ELSE COALESCE(pc.code, 'Unknown course')
        END AS label
        FROM public.course_prerequisites cp
        LEFT JOIN public.courses pc ON pc.id = cp.prerequisite_id AND pc.deleted_at IS NULL
        WHERE cp.course_id = p_course_id
        AND cp.deleted_at IS NULL
        AND cp.prerequisite_type = 'Required'
        AND (
            (
                cp.prerequisite_kind = 'standing'
                AND EXISTS (
                    SELECT 1 FROM public.students st
                    WHERE st.id = p_student_id
                    AND st.deleted_at IS NULL
                    AND st.year_level < cp.year_level_required
                )
            )
            OR (
                cp.prerequisite_kind = 'course'
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status = 'Completed'
                    AND s.course_id = cp.prerequisite_id
                    AND (cp.minimum_grade IS NULL OR COALESCE(e.final_grade, 5.0) <= cp.minimum_grade)
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.student_credited_courses scc
                    WHERE scc.student_id = p_student_id
                    AND scc.course_id = cp.prerequisite_id
                    AND scc.deleted_at IS NULL
                )
            )
        )
    ) unmet;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_unmet_prerequisites(uuid, uuid) TO authenticated, service_role;

-- ============================================================================
-- 4. UPDATE fn_get_curriculum_audit FOR LABELS & CREDITED COURSES
-- ============================================================================

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
                WHEN b.enrollment_status = 'Credited' THEN (
                    SELECT 'Transferred · ' || scc.previous_school
                    FROM public.student_credited_courses scc
                    WHERE scc.student_id = v_student_id
                      AND scc.course_id = cm.course_id
                      AND scc.deleted_at IS NULL
                    LIMIT 1
                )
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
                    'grade', r.grade,
                    'special_grade', r.special_grade,
                    'status', r.status,
                    'taken_label', r.taken_label,
                    'is_elective', r.is_elective
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
        SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
        / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
        2
    )
    INTO v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released;

    RETURN jsonb_build_object(
        'student', v_student,
        'program', v_program,
        'progress', jsonb_build_object(
            'required_units', v_required_units,
            'earned_units', v_earned_units,
            'in_progress_units', v_in_progress_units,
            'progress_percent', CASE
                WHEN v_required_units > 0
                    THEN ROUND((v_earned_units / v_required_units) * 100, 1)
                ELSE 0
            END,
            'cumulative_gwa', v_cumulative_gwa,
            'completed_courses', v_completed,
            'failed_courses', v_failed,
            'in_progress_courses', v_in_progress,
            'total_courses', v_total_courses
        ),
        'curriculum', v_year_levels
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_curriculum_audit(uuid) TO authenticated, service_role;

-- ============================================================================
-- 5. RPC: fn_get_student_curriculum_for_crediting
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_student_curriculum_for_crediting(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_user_id UUID;
    v_student_num TEXT;
    v_student_name TEXT;
    v_program_id UUID;
    v_program_code TEXT;
    v_program_name TEXT;
    v_year_level SMALLINT;
    v_total_curriculum_units NUMERIC(8,2) := 0;
    v_credited_units NUMERIC(8,2) := 0;
    v_credited_count INT := 0;
    v_courses JSONB;
BEGIN
    SELECT s.id, s.user_id, s.student_number, s.program_id, s.year_level,
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
           p.code, p.name
    INTO v_student_id, v_user_id, v_student_num, v_program_id, v_year_level,
         v_student_name, v_program_code, v_program_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    LEFT JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not yet assigned to an academic program. Please assign a program first.');
    END IF;

    -- Build list of curriculum courses and crediting status
    WITH curr_list AS (
        SELECT
            cm.id AS curriculum_map_id,
            cm.year_level,
            cm.sequence,
            COALESCE(tt.label, 'Term ' || cm.term_type_id::text) AS term_label,
            c.id AS course_id,
            c.code AS course_code,
            c.title AS course_title,
            COALESCE(cm.units, c.total_units) AS units,
            COALESCE(cm.lecture_units, c.lecture_units, 0) AS lecture_units,
            COALESCE(cm.laboratory_units, c.laboratory_units, 0) AS laboratory_units,
            COALESCE(cm.is_elective, false) AS is_elective,
            scc.id AS credited_id,
            (scc.id IS NOT NULL) AS is_credited,
            scc.previous_school,
            scc.previous_course_code,
            scc.previous_course_title,
            scc.grade_display,
            scc.grade_numeric,
            scc.units_credited,
            scc.remarks,
            scc.created_at AS credited_at,
            btrim(COALESCE(cu.first_name, '') || ' ' || COALESCE(cu.last_name, '')) AS credited_by_name,
            -- Check if passed locally
            EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
                WHERE e.student_id = v_student_id
                  AND sec.course_id = c.id
                  AND e.deleted_at IS NULL
                  AND e.status = 'Completed'
            ) AS is_passed_locally
        FROM public.curriculum_maps cm
        INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        LEFT JOIN public.student_credited_courses scc
            ON scc.student_id = v_student_id
           AND scc.course_id = c.id
           AND scc.deleted_at IS NULL
        LEFT JOIN public.users cu ON cu.id = scc.credited_by
        WHERE cm.program_id = v_program_id
          AND cm.deleted_at IS NULL
        ORDER BY cm.year_level ASC, COALESCE(tt.sequence, 99) ASC, cm.sequence ASC, c.code ASC
    )
    SELECT
        COALESCE(SUM(units), 0),
        COALESCE(SUM(units) FILTER (WHERE is_credited IS TRUE), 0),
        COUNT(*) FILTER (WHERE is_credited IS TRUE),
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'curriculum_map_id', curriculum_map_id,
                'year_level', year_level,
                'term_label', term_label,
                'course_id', course_id,
                'course_code', course_code,
                'course_title', course_title,
                'units', units,
                'lecture_units', lecture_units,
                'laboratory_units', laboratory_units,
                'is_elective', is_elective,
                'is_credited', is_credited,
                'credited_id', credited_id,
                'previous_school', previous_school,
                'previous_course_code', previous_course_code,
                'previous_course_title', previous_course_title,
                'grade_display', grade_display,
                'grade_numeric', grade_numeric,
                'units_credited', units_credited,
                'remarks', remarks,
                'credited_at', credited_at,
                'credited_by_name', credited_by_name,
                'is_passed_locally', is_passed_locally
            )
        ), '[]'::jsonb)
    INTO v_total_curriculum_units, v_credited_units, v_credited_count, v_courses
    FROM curr_list;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'id', v_student_id,
            'student_number', v_student_num,
            'full_name', v_student_name,
            'year_level', v_year_level,
            'program_id', v_program_id,
            'program_code', v_program_code,
            'program_name', v_program_name
        ),
        'summary', jsonb_build_object(
            'total_curriculum_units', v_total_curriculum_units,
            'credited_units', v_credited_units,
            'credited_count', v_credited_count
        ),
        'courses', v_courses
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_student_curriculum_for_crediting(uuid) TO authenticated, service_role;

-- ============================================================================
-- 6. RPC: fn_credit_student_course
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_credit_student_course(
    p_student_id uuid,
    p_course_id uuid,
    p_previous_school text,
    p_previous_course_code text DEFAULT NULL,
    p_previous_course_title text DEFAULT NULL,
    p_grade_display text DEFAULT 'Passed',
    p_grade_numeric numeric DEFAULT NULL,
    p_units_credited numeric DEFAULT NULL,
    p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id UUID;
    v_caller_name TEXT;
    v_roles TEXT[];
    v_user_id UUID;
    v_student_num TEXT;
    v_student_name TEXT;
    v_course_code TEXT;
    v_course_title TEXT;
    v_default_units NUMERIC;
    v_credited_id UUID;
BEGIN
    v_caller_id := auth.uid();
    v_roles := public.fn_current_user_role_codes();

    IF NOT ('Registrar' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Only Registrar and Admin can credit courses.');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO v_caller_name
    FROM public.users WHERE id = v_caller_id;

    -- Validate student
    SELECT s.user_id, s.student_number, btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))
    INTO v_user_id, v_student_num, v_student_name
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = p_student_id AND s.deleted_at IS NULL;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    -- Validate course
    SELECT code, title, total_units
    INTO v_course_code, v_course_title, v_default_units
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_course_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found.');
    END IF;

    IF p_previous_school IS NULL OR trim(p_previous_school) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Previous school name is required.');
    END IF;

    -- Upsert credited course
    INSERT INTO public.student_credited_courses (
        student_id,
        course_id,
        previous_school,
        previous_course_code,
        previous_course_title,
        grade_display,
        grade_numeric,
        units_credited,
        remarks,
        credited_by,
        created_at,
        updated_at,
        deleted_at
    ) VALUES (
        p_student_id,
        p_course_id,
        trim(p_previous_school),
        NULLIF(trim(p_previous_course_code), ''),
        NULLIF(trim(p_previous_course_title), ''),
        COALESCE(NULLIF(trim(p_grade_display), ''), 'Passed'),
        p_grade_numeric,
        COALESCE(p_units_credited, v_default_units, 3.0),
        NULLIF(trim(p_remarks), ''),
        v_caller_id,
        now(),
        now(),
        NULL
    )
    ON CONFLICT (student_id, course_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        previous_school = EXCLUDED.previous_school,
        previous_course_code = EXCLUDED.previous_course_code,
        previous_course_title = EXCLUDED.previous_course_title,
        grade_display = EXCLUDED.grade_display,
        grade_numeric = EXCLUDED.grade_numeric,
        units_credited = EXCLUDED.units_credited,
        remarks = EXCLUDED.remarks,
        credited_by = EXCLUDED.credited_by,
        updated_at = now()
    RETURNING id INTO v_credited_id;

    -- Log into registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        new_values
    ) VALUES (
        'CREDIT_STUDENT_COURSE',
        p_student_id,
        v_user_id,
        v_student_name,
        v_student_num,
        v_caller_id,
        COALESCE(v_caller_name, 'Registrar'),
        format('Registrar credited %s (%s) from %s. Grade: %s.', v_course_code, v_course_title, trim(p_previous_school), COALESCE(NULLIF(trim(p_grade_display), ''), 'Passed')),
        jsonb_build_object(
            'course_id', p_course_id,
            'course_code', v_course_code,
            'course_title', v_course_title,
            'previous_school', trim(p_previous_school),
            'previous_course_code', p_previous_course_code,
            'grade_display', p_grade_display,
            'grade_numeric', p_grade_numeric,
            'units_credited', COALESCE(p_units_credited, v_default_units)
        )
    );

    -- Sync student year level if applicable
    PERFORM public.fn_sync_student_year_level(p_student_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully credited %s (%s).', v_course_code, v_course_title),
        'credited_id', v_credited_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_credit_student_course(uuid, uuid, text, text, text, text, numeric, numeric, text) TO authenticated, service_role;

-- ============================================================================
-- 7. RPC: fn_remove_credited_course
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_remove_credited_course(
    p_credited_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id UUID;
    v_caller_name TEXT;
    v_roles TEXT[];
    v_student_id UUID;
    v_user_id UUID;
    v_student_num TEXT;
    v_student_name TEXT;
    v_course_code TEXT;
    v_course_title TEXT;
BEGIN
    v_caller_id := auth.uid();
    v_roles := public.fn_current_user_role_codes();

    IF NOT ('Registrar' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Only Registrar and Admin can remove credited courses.');
    END IF;

    SELECT btrim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
    INTO v_caller_name
    FROM public.users WHERE id = v_caller_id;

    SELECT scc.student_id, s.user_id, s.student_number,
           btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')),
           c.code, c.title
    INTO v_student_id, v_user_id, v_student_num, v_student_name, v_course_code, v_course_title
    FROM public.student_credited_courses scc
    INNER JOIN public.students s ON s.id = scc.student_id
    INNER JOIN public.users u ON u.id = s.user_id
    INNER JOIN public.courses c ON c.id = scc.course_id
    WHERE scc.id = p_credited_id AND scc.deleted_at IS NULL;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credited course record not found.');
    END IF;

    UPDATE public.student_credited_courses
    SET deleted_at = now()
    WHERE id = p_credited_id;

    -- Log to registrar_logs
    INSERT INTO public.registrar_logs (
        action,
        student_id,
        student_user_id,
        student_name,
        student_number,
        performed_by,
        performed_by_name,
        details,
        new_values
    ) VALUES (
        'REMOVE_CREDITED_COURSE',
        v_student_id,
        v_user_id,
        v_student_name,
        v_student_num,
        v_caller_id,
        COALESCE(v_caller_name, 'Registrar'),
        format('Registrar revoked credited course %s (%s).%s', v_course_code, v_course_title, COALESCE(' Reason: ' || p_reason, '')),
        jsonb_build_object(
            'credited_id', p_credited_id,
            'course_code', v_course_code,
            'reason', p_reason
        )
    );

    PERFORM public.fn_sync_student_year_level(v_student_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Revoked credit for course %s (%s).', v_course_code, v_course_title)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_remove_credited_course(uuid, text) TO authenticated, service_role;

-- ============================================================================
-- 8. UPDATE fn_list_eligible_sections & fn_enroll_student_section TO AVOID RE-ENROLLING CREDITED COURSES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_list_eligible_sections(
    p_student_id uuid,
    p_term_id uuid DEFAULT NULL::uuid,
    p_search text DEFAULT NULL::text,
    p_scope text DEFAULT 'recommended'::text,
    p_year_levels smallint[] DEFAULT NULL::smallint[],
    p_include_full boolean DEFAULT true,
    p_include_prerequisite_gaps boolean DEFAULT true,
    p_include_conflicts boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id     UUID := p_term_id;
    v_program_id  UUID;
    v_year_level  SMALLINT;
    v_term_type   UUID;
    v_scope       TEXT := COALESCE(NULLIF(lower(p_scope), ''), 'recommended');
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    IF v_scope NOT IN ('recommended', 'all') THEN
        v_scope := 'recommended';
    END IF;

    IF v_term_id IS NULL THEN
        v_term_id := (public.fn_get_enrollment_target_term()->>'id')::UUID;
    END IF;

    SELECT program_id, year_level INTO v_program_id, v_year_level
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    -- If student has no assigned program or term is invalid, no curriculum sections exist
    IF v_program_id IS NULL OR v_term_id IS NULL THEN
        RETURN jsonb_build_object(
            'scope', v_scope,
            'recommended_count', 0,
            'available_count', 0,
            'total_count', 0,
            'rows', '[]'::JSONB
        );
    END IF;

    SELECT term_type_id INTO v_term_type
    FROM public.terms
    WHERE id = v_term_id AND deleted_at IS NULL;

    RETURN (
        WITH candidates AS (
            SELECT
                x.*,
                (x.slots_taken >= x.max_slots) AS is_full
            FROM (
                SELECT
                    s.id AS section_id,
                    s.section_code,
                    s.status::TEXT AS section_status,
                    c.id AS course_id,
                    c.code AS course_code,
                    c.title AS course_title,
                    c.total_units AS units,
                    COALESCE(fu.first_name || ' ' || fu.last_name, 'Unassigned') AS faculty_name,
                    COALESCE(s.room, '—') AS room,
                    s.max_slots::INT AS max_slots,
                    (
                        SELECT COUNT(*)::INT
                        FROM public.enrollments e2
                        WHERE e2.section_id = s.id
                        AND e2.deleted_at IS NULL
                        AND e2.status NOT IN ('Dropped', 'Withdrawn')
                    ) AS slots_taken,
                    cm.year_level::INT AS curriculum_year_level,
                    cm.is_elective,
                    (
                        cm.year_level = v_year_level
                        AND (cm.term_type_id IS NULL OR cm.term_type_id = v_term_type)
                    ) AS is_recommended,
                    public.fn_get_schedule_conflicts(p_student_id, s.id) AS conflict_with,
                    public.fn_get_unmet_prerequisites(p_student_id, c.id) AS unmet_prerequisites,
                    COALESCE((
                        SELECT string_agg(
                            ss.day_of_week::TEXT || ' ' ||
                            to_char(ss.time_start, 'HH12:MI AM') || ' - ' ||
                            to_char(ss.time_end, 'HH12:MI AM'),
                            ', ' ORDER BY ss.day_of_week, ss.time_start
                        )
                        FROM public.section_schedules ss
                        WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                    ), 'No schedule set') AS schedule_label
                FROM public.sections s
                INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                -- Strict curriculum constraint: ONLY courses in student's program curriculum
                INNER JOIN LATERAL (
                    SELECT cmi.year_level, cmi.sequence, cmi.is_elective, cmi.term_type_id
                    FROM public.curriculum_maps cmi
                    WHERE cmi.course_id = c.id
                    AND cmi.program_id = v_program_id
                    AND cmi.deleted_at IS NULL
                    ORDER BY cmi.year_level, cmi.sequence
                    LIMIT 1
                ) cm ON TRUE
                LEFT JOIN public.users fu ON fu.id = s.faculty_id AND fu.deleted_at IS NULL
                WHERE s.deleted_at IS NULL
                AND s.term_id = v_term_id
                AND s.status NOT IN ('Closed', 'Cancelled')
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.enrollments e
                    INNER JOIN public.sections s3 ON s3.id = e.section_id AND s3.deleted_at IS NULL
                    WHERE e.student_id = p_student_id
                    AND e.deleted_at IS NULL
                    AND e.status IN ('Enrolled', 'Completed')
                    AND s3.course_id = c.id
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.student_credited_courses scc
                    WHERE scc.student_id = p_student_id
                    AND scc.course_id = c.id
                    AND scc.deleted_at IS NULL
                )
                AND (
                    p_search IS NULL
                    OR p_search = ''
                    OR c.code ILIKE '%' || p_search || '%'
                    OR c.title ILIKE '%' || p_search || '%'
                    OR s.section_code ILIKE '%' || p_search || '%'
                )
            ) x
        ),
        visible AS (
            SELECT *
            FROM candidates
            WHERE (v_scope = 'all' OR is_recommended)
            AND (p_year_levels IS NULL OR curriculum_year_level = ANY (p_year_levels))
            AND (COALESCE(p_include_full, TRUE) OR NOT is_full)
            AND (COALESCE(p_include_prerequisite_gaps, TRUE) OR unmet_prerequisites IS NULL)
            AND (COALESCE(p_include_conflicts, TRUE) OR conflict_with IS NULL)
        )
        SELECT jsonb_build_object(
            'scope', v_scope,
            'recommended_count', (
                SELECT COUNT(*)::INT FROM candidates WHERE is_recommended
            ),
            'available_count', (
                SELECT COUNT(*)::INT FROM candidates WHERE is_recommended AND NOT is_full
            ),
            'total_count', (SELECT COUNT(*)::INT FROM candidates),
            'rows', COALESCE((
                SELECT jsonb_agg(
                    to_jsonb(v) ORDER BY
                        v.is_recommended DESC,
                        v.is_full ASC,
                        v.curriculum_year_level,
                        v.course_code,
                        v.section_code
                )
                FROM visible v
            ), '[]'::JSONB)
        )
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_list_eligible_sections(uuid, uuid, text, text, smallint[], boolean, boolean, boolean) TO authenticated, service_role;

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

    SELECT t.id, t.is_active, t.enrollment_start_date, t.enrollment_end_date
    INTO v_term
    FROM public.terms t
    WHERE t.id = v_section.term_id AND t.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_NOT_FOUND', 'message', 'Term not found.');
    END IF;

    IF NOT v_term.is_active THEN
        RETURN jsonb_build_object('success', false, 'code', 'TERM_INACTIVE', 'message', 'Term is not active for enrollment.');
    END IF;

    IF v_term.enrollment_start_date IS NOT NULL AND CURRENT_DATE < v_term.enrollment_start_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_NOT_STARTED', 'message', 'Enrollment has not started yet.');
    END IF;

    IF v_term.enrollment_end_date IS NOT NULL AND CURRENT_DATE > v_term.enrollment_end_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'ENROLLMENT_CLOSED', 'message', 'Enrollment is already closed.');
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

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully enrolled in ' || v_section.section_code || '.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_enroll_student_section(uuid, uuid, boolean, text, boolean) TO authenticated, service_role;
