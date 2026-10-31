-- Rollback of 20261031000000_release_and_special_grade_fixes: exact live definitions captured before apply
-- (a stored body with CRLF line endings is written as an E'' string so the CRs survive psql)
BEGIN;

-- fn_check_evaluation_completion
CREATE OR REPLACE FUNCTION public.fn_check_evaluation_completion(p_enrollment_id uuid, p_grading_period_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS E'\r
DECLARE\r
    v_is_completed BOOLEAN;\r
    v_template_ids UUID[];\r
    v_required_count INTEGER;\r
    v_answered_count INTEGER;\r
BEGIN\r
    SELECT is_completed, COALESCE(template_ids, ARRAY[template_id])\r
    INTO v_is_completed, v_template_ids\r
    FROM public.evaluation_period_locks\r
    WHERE enrollment_id = p_enrollment_id\r
    AND grading_period_id = p_grading_period_id\r
    AND deleted_at IS NULL\r
    LIMIT 1;\r
\r
    IF v_is_completed IS NULL THEN\r
        RETURN false;\r
    END IF;\r
\r
    IF v_is_completed THEN\r
        RETURN true;\r
    END IF;\r
\r
    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN\r
        RETURN false;\r
    END IF;\r
\r
    SELECT COUNT(*) INTO v_required_count\r
    FROM public.evaluation_questions\r
    WHERE template_id = ANY(v_template_ids)\r
    AND is_required = true\r
    AND deleted_at IS NULL;\r
\r
    SELECT COUNT(DISTINCT r.question_id) INTO v_answered_count\r
    FROM public.evaluation_responses r\r
    INNER JOIN public.evaluation_questions q\r
        ON q.id = r.question_id\r
        AND q.template_id = ANY(v_template_ids)\r
        AND q.is_required = true\r
        AND q.deleted_at IS NULL\r
    WHERE r.enrollment_id = p_enrollment_id\r
    AND r.grading_period_id = p_grading_period_id\r
    AND r.deleted_at IS NULL;\r
\r
    RETURN v_answered_count >= v_required_count;\r
END;\r
';

-- fn_student_course_grades
CREATE OR REPLACE FUNCTION public.fn_student_course_grades(p_student_id uuid)
 RETURNS TABLE(enrollment_id uuid, term_id uuid, course_id uuid, course_code text, course_title text, units numeric, grade numeric, raw_grade numeric, special_grade text, enrollment_status text, is_released boolean, is_passing boolean, completed_at timestamp with time zone)
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
    LEFT JOIN public.terms gt ON gt.id = g.term_id
    LEFT JOIN public.special_grade_configs sgc
        ON upper(sgc.code) = upper(g.special_grade)
       AND sgc.school_year_id = gt.school_year_id
       AND sgc.deleted_at IS NULL

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

-- fn_finalize_enrollment_outcome
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

-- fn_capture_audit_log
CREATE OR REPLACE FUNCTION public.fn_capture_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID := auth.uid();
    v_user_name TEXT := 'System';
    v_table TEXT := TG_TABLE_NAME;
    v_record_id TEXT;
    v_event_name TEXT;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_changed_fields JSONB := '[]'::jsonb;
    v_desc TEXT;
BEGIN
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_record_id := to_jsonb(OLD)->>'id';
            v_old_data := to_jsonb(OLD);
        ELSIF TG_OP = 'INSERT' THEN
            v_record_id := to_jsonb(NEW)->>'id';
            v_new_data := to_jsonb(NEW);
        ELSIF TG_OP = 'UPDATE' THEN
            v_record_id := to_jsonb(NEW)->>'id';
            v_old_data := to_jsonb(OLD);
            v_new_data := to_jsonb(NEW);

            -- Calculate changed keys
            SELECT COALESCE(jsonb_agg(key), '[]'::jsonb)
            INTO v_changed_fields
            FROM jsonb_each(v_new_data)
            WHERE (v_new_data->key) IS DISTINCT FROM (v_old_data->key)
              AND key NOT IN ('updated_at', 'updated_by');
        END IF;

        -- Fallback user ID from row metadata if auth.uid() is null
        IF v_user_id IS NULL THEN
            IF TG_OP = 'INSERT' THEN
                v_user_id := COALESCE((to_jsonb(NEW)->>'created_by')::UUID, (to_jsonb(NEW)->>'updated_by')::UUID);
            ELSIF TG_OP = 'UPDATE' THEN
                v_user_id := COALESCE((to_jsonb(NEW)->>'updated_by')::UUID, (to_jsonb(NEW)->>'created_by')::UUID);
            ELSE
                v_user_id := (to_jsonb(OLD)->>'updated_by')::UUID;
            END IF;
        END IF;

        -- Resolve operator display name
        IF v_user_id IS NOT NULL THEN
            SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'System')
            INTO v_user_name
            FROM public.users
            WHERE id = v_user_id;
        END IF;

        -- Explicit transactional event mappings aligned with Master Defense Walkthrough
        IF v_table = 'users' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'USER_PROVISIONED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'USER_UPDATED';
            ELSE v_event_name := 'USER_DELETED'; END IF;
        ELSIF v_table = 'departments' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'DEPARTMENT_CREATED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'DEPARTMENT_UPDATED';
            ELSE v_event_name := 'DEPARTMENT_DELETED'; END IF;
        ELSIF v_table = 'school_years' THEN
            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN v_event_name := 'SCHOOL_YEAR_SAVED';
            ELSE v_event_name := 'SCHOOL_YEAR_DELETED'; END IF;
        ELSIF v_table = 'announcements' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'ANNOUNCEMENT_PUBLISHED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'ANNOUNCEMENT_UPDATED';
            ELSE v_event_name := 'ANNOUNCEMENT_DELETED'; END IF;
        ELSIF v_table = 'events' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'EVENT_CREATED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'EVENT_UPDATED';
            ELSE v_event_name := 'EVENT_DELETED'; END IF;
        ELSIF v_table = 'courses' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'COURSE_CREATED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'COURSE_UPDATED';
            ELSE v_event_name := 'COURSE_DELETED'; END IF;
        ELSIF v_table = 'sections' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'SECTION_CREATED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'SECTION_UPDATED';
            ELSE v_event_name := 'SECTION_DELETED'; END IF;
        ELSIF v_table = 'programs' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'PROGRAM_CREATED';
            ELSIF TG_OP = 'UPDATE' THEN v_event_name := 'PROGRAM_UPDATED';
            ELSE v_event_name := 'PROGRAM_DELETED'; END IF;
        ELSIF v_table = 'evaluation_templates' THEN
            IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN v_event_name := 'EVALUATION_TEMPLATE_SAVED';
            ELSE v_event_name := 'EVALUATION_TEMPLATE_DELETED'; END IF;
        ELSIF v_table = 'system_settings' THEN
            v_event_name := 'SYSTEM_SETTINGS_SAVED';
        ELSIF v_table = 'section_final_grades' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'GRADE_RECORDED';
            ELSE v_event_name := 'GRADE_UPDATED'; END IF;
        ELSIF v_table = 'enrollments' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'STUDENT_ENROLLED';
            ELSE v_event_name := 'ENROLLMENT_MODIFIED'; END IF;
        ELSIF v_table = 'grading_periods' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'GRADING_PERIOD_CREATED';
            ELSE v_event_name := 'GRADING_PERIOD_UPDATED'; END IF;
        ELSIF v_table = 'grading_components' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'GRADING_COMPONENT_CREATED';
            ELSE v_event_name := 'GRADING_COMPONENT_UPDATED'; END IF;
        ELSIF v_table = 'assessment_items' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'ASSESSMENT_CREATED';
            ELSE v_event_name := 'ASSESSMENT_UPDATED'; END IF;
        ELSIF v_table = 'assessment_submissions' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'ASSESSMENT_SUBMITTED';
            ELSE v_event_name := 'ASSESSMENT_GRADED'; END IF;
        ELSIF v_table = 'roles' THEN
            v_event_name := 'ROLE_CONFIGURED';
        ELSE
            v_event_name := UPPER(v_table) || '_' || TG_OP;
        END IF;

        -- Descriptive context summary
        IF v_table = 'users' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'email', to_jsonb(OLD)->>'email', '');
        ELSIF v_table = 'departments' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'name', to_jsonb(OLD)->>'name', '');
        ELSIF v_table = 'school_years' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'label', to_jsonb(OLD)->>'label', '');
        ELSIF v_table = 'announcements' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'title', to_jsonb(OLD)->>'title', '');
        ELSIF v_table = 'events' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'title', to_jsonb(OLD)->>'title', '');
        ELSIF v_table = 'courses' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'code', to_jsonb(OLD)->>'code', '');
        ELSIF v_table = 'sections' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'section_code', to_jsonb(OLD)->>'section_code', '');
        ELSIF v_table = 'programs' THEN
            v_desc := v_event_name || ': ' || COALESCE(to_jsonb(NEW)->>'code', to_jsonb(OLD)->>'code', '');
        ELSE
            v_desc := v_event_name || ' on ' || v_table;
        END IF;

        INSERT INTO public.audit_logs (
            action,
            event_name,
            table_name,
            record_id,
            old_data,
            new_data,
            changed_fields,
            changed_by,
            changed_by_name,
            description,
            created_at
        ) VALUES (
            TG_OP,
            v_event_name,
            v_table,
            v_record_id,
            v_old_data,
            v_new_data,
            v_changed_fields,
            v_user_id,
            COALESCE(v_user_name, 'System'),
            v_desc,
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'fn_capture_audit_log warning: %', SQLERRM;
    END;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;

COMMIT;
