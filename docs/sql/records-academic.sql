CREATE TABLE IF NOT EXISTS public.student_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students (id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    from_status public.student_status_type,
    to_status public.student_status_type,
    from_program_id UUID REFERENCES public.programs (id) ON DELETE RESTRICT,
    to_program_id UUID REFERENCES public.programs (id) ON DELETE RESTRICT,
    from_year_level SMALLINT,
    to_year_level SMALLINT,
    reason TEXT,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_by UUID DEFAULT auth.uid(),
    updated_by UUID,
    deleted_by UUID,
    CONSTRAINT chk_student_lifecycle_event_type CHECK (event_type IN ('Status Change', 'Program Shift'))
);

CREATE INDEX IF NOT EXISTS idx_student_lifecycle_events_student
    ON public.student_lifecycle_events (student_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.student_lifecycle_events ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_student_lifecycle_events_updated_audit ON public.student_lifecycle_events;
CREATE TRIGGER trg_student_lifecycle_events_updated_audit
    BEFORE UPDATE ON public.student_lifecycle_events
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

DROP POLICY IF EXISTS "student_lifecycle_events_select" ON public.student_lifecycle_events;
CREATE POLICY "student_lifecycle_events_select"
    ON public.student_lifecycle_events
    FOR SELECT
    TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar', 'Dean']
            OR EXISTS (
                SELECT 1 FROM public.students s
                WHERE s.id = student_lifecycle_events.student_id
                  AND s.user_id = auth.uid()
                  AND s.deleted_at IS NULL
            )
        )
    );

DROP POLICY IF EXISTS "student_lifecycle_events_insert" ON public.student_lifecycle_events;
CREATE POLICY "student_lifecycle_events_insert"
    ON public.student_lifecycle_events
    FOR INSERT
    TO authenticated
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar']);

DROP POLICY IF EXISTS "student_lifecycle_events_update" ON public.student_lifecycle_events;
CREATE POLICY "student_lifecycle_events_update"
    ON public.student_lifecycle_events
    FOR UPDATE
    TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar'])
    WITH CHECK (public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar']);

CREATE OR REPLACE FUNCTION public.fn_resolve_record_student(p_student_id uuid)
    RETURNS uuid
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to perform this action.'
            USING ERRCODE = '28000';
    END IF;

    IF p_student_id IS NULL THEN
        SELECT s.id
        INTO v_student_id
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.deleted_at IS NULL
        LIMIT 1;

        IF v_student_id IS NULL THEN
            RAISE EXCEPTION 'Forbidden: no student profile is linked to your account.'
                USING ERRCODE = '42501';
        END IF;

        RETURN v_student_id;
    END IF;

    IF public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar', 'Dean'] THEN
        RETURN p_student_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = p_student_id
          AND s.user_id = auth.uid()
          AND s.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Forbidden: you may only view your own academic records.'
            USING ERRCODE = '42501';
    END IF;

    RETURN p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_student_course_grades(p_student_id uuid)
    RETURNS TABLE (
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
        completed_at timestamptz
    )
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
        ON sgc.code = g.special_grade AND sgc.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.fn_student_course_grades(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_student_course_grades(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_student_course_grades(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_curriculum_audit(p_student_id uuid DEFAULT NULL)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_student JSONB;
    v_program JSONB;
    v_program_id UUID;
    v_required_units NUMERIC(8,2);
    v_earned_units NUMERIC(8,2) := 0;
    v_in_progress_units NUMERIC(8,2) := 0;
    v_cumulative_gwa NUMERIC(5,2);
    v_completed INTEGER := 0;
    v_failed INTEGER := 0;
    v_in_progress INTEGER := 0;
    v_total_courses INTEGER := 0;
    v_year_levels JSONB;
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
            c.total_units AS units,
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
            c.total_units AS units,
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
$$;

CREATE OR REPLACE FUNCTION public.fn_get_student_transcript(p_student_id uuid DEFAULT NULL)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_student JSONB;
    v_program JSONB;
    v_institution JSONB;
    v_terms JSONB;
    v_total_units NUMERIC(8,2);
    v_cumulative_gwa NUMERIC(5,2);
    v_is_official BOOLEAN;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);
    v_is_official := public.fn_current_user_role_codes() && ARRAY['Admin', 'Registrar'];

    SELECT jsonb_build_object(
        'id', s.id,
        'student_number', s.student_number,
        'full_name', u.first_name || ' ' || u.last_name,
        'email', u.email,
        'year_level', s.year_level,
        'status', s.status,
        'admitted_at', s.admitted_at
    )
    INTO v_student
    FROM public.students s
    INNER JOIN public.users u ON u.id = s.user_id AND u.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'total_units', p.total_units
    )
    INTO v_program
    FROM public.students s
    INNER JOIN public.programs p ON p.id = s.program_id AND p.deleted_at IS NULL
    WHERE s.id = v_student_id
      AND s.deleted_at IS NULL;

    SELECT jsonb_build_object(
        'name', ss.institution_name,
        'short_name', ss.institution_short_name,
        'address', ss.institution_address,
        'email', ss.institution_email,
        'phone', ss.institution_phone,
        'logo_url', ss.institution_logo_url
    )
    INTO v_institution
    FROM public.system_settings ss
    WHERE ss.deleted_at IS NULL
    LIMIT 1;

    WITH attempts AS (
        SELECT a.*
        FROM public.fn_student_course_grades(v_student_id) a
        WHERE a.is_released
    ),
    term_rows AS (
        SELECT
            t.id AS term_id,
            tt.label || ' - ' || sy.label AS term_label,
            sy.label AS school_year_label,
            sy.start_date AS school_year_start,
            COALESCE(tt.sequence, 99) AS term_sequence,
            jsonb_agg(
                jsonb_build_object(
                    'enrollment_id', a.enrollment_id,
                    'course_code', a.course_code,
                    'course_title', a.course_title,
                    'units', a.units,
                    'grade', a.grade,
                    'raw_grade', a.raw_grade,
                    'special_grade', a.special_grade,
                    'is_passing', a.is_passing
                )
                ORDER BY a.course_code
            ) AS courses,
            COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0) AS earned_units,
            COALESCE(SUM(a.units), 0) AS attempted_units,
            ROUND(
                SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
                / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
                2
            ) AS term_gwa
        FROM attempts a
        INNER JOIN public.terms t ON t.id = a.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        GROUP BY t.id, tt.label, sy.label, sy.start_date, tt.sequence
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'term_id', tr.term_id,
                'term_label', tr.term_label,
                'school_year_label', tr.school_year_label,
                'courses', tr.courses,
                'earned_units', tr.earned_units,
                'attempted_units', tr.attempted_units,
                'term_gwa', tr.term_gwa
            )
            ORDER BY tr.school_year_start, tr.term_sequence
        ),
        '[]'::jsonb
    )
    INTO v_terms
    FROM term_rows tr;

    SELECT
        COALESCE(SUM(a.units) FILTER (WHERE a.is_passing IS TRUE), 0),
        ROUND(
            SUM(a.grade * a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL)
            / NULLIF(SUM(a.units) FILTER (WHERE a.grade IS NOT NULL AND a.special_grade IS NULL), 0),
            2
        )
    INTO v_total_units, v_cumulative_gwa
    FROM public.fn_student_course_grades(v_student_id) a
    WHERE a.is_released;

    RETURN jsonb_build_object(
        'success', true,
        'is_official', v_is_official,
        'generated_at', now(),
        'student', v_student,
        'program', v_program,
        'institution', COALESCE(v_institution, '{}'::jsonb),
        'terms', v_terms,
        'summary', jsonb_build_object(
            'total_units_earned', v_total_units,
            'cumulative_gwa', v_cumulative_gwa
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_change_student_status(
    p_student_id uuid,
    p_status public.student_status_type,
    p_reason text DEFAULT NULL,
    p_effective_date date DEFAULT NULL
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_current public.student_status_type;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.status
    INTO v_current
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.deleted_at IS NULL;

    IF v_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF v_current = p_status THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The student already holds this status.'
        );
    END IF;

    UPDATE public.students
    SET status = p_status
    WHERE id = p_student_id;

    INSERT INTO public.student_lifecycle_events (
        student_id,
        event_type,
        from_status,
        to_status,
        reason,
        effective_date
    ) VALUES (
        p_student_id,
        'Status Change',
        v_current,
        p_status,
        NULLIF(btrim(COALESCE(p_reason, '')), ''),
        COALESCE(p_effective_date, CURRENT_DATE)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student status updated to ' || p_status || '.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_shift_student_program(
    p_student_id uuid,
    p_program_id uuid,
    p_year_level smallint DEFAULT NULL,
    p_reason text DEFAULT NULL,
    p_effective_date date DEFAULT NULL
)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_current_program UUID;
    v_current_year SMALLINT;
    v_target_year SMALLINT;
BEGIN
    PERFORM public.fn_assert_role('Registrar', 'Admin');

    SELECT s.program_id, s.year_level
    INTO v_current_program, v_current_year
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.programs p
        WHERE p.id = p_program_id
          AND p.is_active
          AND p.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target program not found or inactive.');
    END IF;

    v_target_year := COALESCE(p_year_level, v_current_year);

    IF v_target_year < 1 OR v_target_year > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6.');
    END IF;

    IF v_current_program IS NOT DISTINCT FROM p_program_id AND v_current_year = v_target_year THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The student is already in this program and year level.'
        );
    END IF;

    UPDATE public.students
    SET program_id = p_program_id,
        year_level = v_target_year
    WHERE id = p_student_id;

    INSERT INTO public.student_lifecycle_events (
        student_id,
        event_type,
        from_program_id,
        to_program_id,
        from_year_level,
        to_year_level,
        reason,
        effective_date
    ) VALUES (
        p_student_id,
        'Program Shift',
        v_current_program,
        p_program_id,
        v_current_year,
        v_target_year,
        NULLIF(btrim(COALESCE(p_reason, '')), ''),
        COALESCE(p_effective_date, CURRENT_DATE)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Student program updated.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_list_student_lifecycle_events(p_student_id uuid DEFAULT NULL)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    v_student_id := public.fn_resolve_record_student(p_student_id);

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', e.id,
                'event_type', e.event_type,
                'from_status', e.from_status,
                'to_status', e.to_status,
                'from_program_code', fp.code,
                'to_program_code', tp.code,
                'from_year_level', e.from_year_level,
                'to_year_level', e.to_year_level,
                'reason', e.reason,
                'effective_date', e.effective_date,
                'created_at', e.created_at,
                'created_by_name', u.first_name || ' ' || u.last_name
            )
            ORDER BY e.effective_date DESC, e.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO v_result
    FROM public.student_lifecycle_events e
    LEFT JOIN public.programs fp ON fp.id = e.from_program_id
    LEFT JOIN public.programs tp ON tp.id = e.to_program_id
    LEFT JOIN public.users u ON u.id = e.created_by
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_resolve_record_student(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_curriculum_audit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_get_student_transcript(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_change_student_status(uuid, public.student_status_type, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_shift_student_program(uuid, uuid, smallint, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_list_student_lifecycle_events(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.fn_get_curriculum_audit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_student_transcript(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_change_student_status(uuid, public.student_status_type, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_shift_student_program(uuid, uuid, smallint, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_list_student_lifecycle_events(uuid) TO authenticated;
