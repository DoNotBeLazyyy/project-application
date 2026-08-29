CREATE OR REPLACE FUNCTION public.fn_get_assistant_context(
    p_active_role text,
    p_section_id uuid DEFAULT NULL::uuid,
    p_term_id uuid DEFAULT NULL::uuid
)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY INVOKER
    SET search_path = public
    AS $$
DECLARE
    v_roles TEXT[];
    v_role TEXT;
    v_profile JSONB;
    v_student_id UUID;
    v_term_id UUID;
    v_program_id UUID;
    v_year_level SMALLINT;
    v_enrollment_ids UUID[];
    v_insight JSONB;
    v_prereq_eligibility JSONB;
    v_upcoming_deadlines JSONB;
    v_attendance_drp JSONB;
    v_dashboard JSONB;
    v_section JSONB;
    v_faculty_section_ids UUID[];
    v_grading_queue JSONB;
    v_section_attendance JSONB;
    v_active_term_id UUID;
    v_active_term JSONB;
    v_term_checkpoints JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: you must be signed in to use the assistant.'
            USING ERRCODE = '28000';
    END IF;

    v_roles := public.fn_current_user_role_codes();

    SELECT held.code
    INTO v_role
    FROM unnest(v_roles) AS held(code)
    WHERE lower(btrim(held.code)) = lower(btrim(coalesce(p_active_role, '')))
    LIMIT 1;

    IF v_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You do not currently hold the selected role.'
        );
    END IF;

    SELECT jsonb_build_object(
               'full_name', btrim(coalesce(u.preferred_name, u.first_name) || ' ' || u.last_name),
               'email', u.email
           )
    INTO v_profile
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL;

    IF v_role = 'Student' THEN
        SELECT s.id, s.program_id, s.year_level
        INTO v_student_id, v_program_id, v_year_level
        FROM public.students s
        WHERE s.user_id = auth.uid()
          AND s.deleted_at IS NULL
        LIMIT 1;

        IF v_student_id IS NOT NULL THEN
            IF p_term_id IS NOT NULL THEN
                v_term_id := p_term_id;
            ELSE
                SELECT t.id
                INTO v_term_id
                FROM public.enrollments e
                INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
                INNER JOIN public.terms t ON t.id = sec.term_id AND t.deleted_at IS NULL
                WHERE e.student_id = v_student_id
                  AND e.deleted_at IS NULL
                  AND e.status <> 'Dropped'
                ORDER BY (t.status = 'Ongoing') DESC, t.start_date DESC
                LIMIT 1;
            END IF;

            BEGIN
                v_insight := public.fn_get_student_insight(v_student_id, v_term_id);
            EXCEPTION
                WHEN OTHERS THEN
                    v_insight := NULL;
            END;

            SELECT COALESCE(array_agg(e.id), ARRAY[]::UUID[])
            INTO v_enrollment_ids
            FROM public.enrollments e
            INNER JOIN public.sections sec ON sec.id = e.section_id AND sec.deleted_at IS NULL
            WHERE e.student_id = v_student_id
              AND e.deleted_at IS NULL
              AND e.status <> 'Dropped'
              AND (v_term_id IS NULL OR sec.term_id = v_term_id);

            BEGIN
                WITH student_grades AS (
                    SELECT * FROM public.fn_student_course_grades(v_student_id)
                ),
                curriculum_courses AS (
                    SELECT
                        c.id AS course_id,
                        c.code AS course_code,
                        c.title AS course_title,
                        c.total_units AS units,
                        cm.year_level,
                        cm.is_elective,
                        sg.grade,
                        sg.special_grade,
                        sg.is_passing,
                        CASE
                            WHEN sg.is_passing IS TRUE THEN 'Completed'
                            WHEN sg.enrollment_status = 'Enrolled' THEN 'In Progress'
                            WHEN sg.is_released AND sg.is_passing IS FALSE THEN 'Failed'
                            ELSE 'Not Taken'
                        END AS course_status
                    FROM public.curriculum_maps cm
                    INNER JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
                    LEFT JOIN LATERAL (
                        SELECT
                            g.grade,
                            g.special_grade,
                            g.is_passing,
                            g.is_released,
                            g.enrollment_status
                        FROM student_grades g
                        WHERE g.course_id = c.id
                        ORDER BY (g.is_passing IS TRUE) DESC, g.is_released DESC, g.grade ASC NULLS LAST
                        LIMIT 1
                    ) sg ON TRUE
                    WHERE cm.program_id = v_program_id
                      AND cm.deleted_at IS NULL
                ),
                prereq_eval AS (
                    SELECT
                        cc.course_id,
                        cc.course_code,
                        cc.course_title,
                        cc.units,
                        cc.year_level,
                        cc.is_elective,
                        cc.course_status,
                        cc.grade,
                        COALESCE(
                            jsonb_agg(
                                jsonb_build_object(
                                    'prerequisite_kind', cp.prerequisite_kind,
                                    'prerequisite_course_code', pc.code,
                                    'prerequisite_course_title', pc.title,
                                    'required_year_level', cp.year_level_required,
                                    'minimum_grade', COALESCE(cp.minimum_grade, 3.00),
                                    'is_met', CASE
                                        WHEN cp.prerequisite_kind = 'standing' THEN
                                            v_year_level >= cp.year_level_required
                                        WHEN cp.prerequisite_kind = 'course' THEN
                                            EXISTS (
                                                SELECT 1
                                                FROM student_grades g2
                                                WHERE g2.course_id = cp.prerequisite_id
                                                  AND g2.is_passing IS TRUE
                                                  AND (cp.minimum_grade IS NULL OR COALESCE(g2.grade, 5.00) <= cp.minimum_grade)
                                            )
                                        ELSE true
                                    END,
                                    'detail', CASE
                                        WHEN cp.prerequisite_kind = 'standing' THEN
                                            'Requires Year ' || cp.year_level_required::TEXT || ' standing (Current: Year ' || COALESCE(v_year_level::TEXT, '1') || ')'
                                        ELSE
                                            'Requires ' || COALESCE(pc.code, 'course') || ' with grade <= ' || COALESCE(cp.minimum_grade, 3.00)::TEXT
                                    END
                                )
                                ORDER BY cp.prerequisite_kind DESC, pc.code
                            ) FILTER (WHERE cp.id IS NOT NULL),
                            '[]'::jsonb
                        ) AS prerequisites
                    FROM curriculum_courses cc
                    LEFT JOIN public.course_prerequisites cp
                        ON cp.course_id = cc.course_id
                        AND cp.deleted_at IS NULL
                        AND cp.prerequisite_type = 'Required'
                    LEFT JOIN public.courses pc
                        ON pc.id = cp.prerequisite_id
                        AND pc.deleted_at IS NULL
                    GROUP BY
                        cc.course_id,
                        cc.course_code,
                        cc.course_title,
                        cc.units,
                        cc.year_level,
                        cc.is_elective,
                        cc.course_status,
                        cc.grade
                )
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'course_id', pe.course_id,
                            'course_code', pe.course_code,
                            'course_title', pe.course_title,
                            'units', pe.units,
                            'curriculum_year_level', pe.year_level,
                            'is_elective', pe.is_elective,
                            'status', pe.course_status,
                            'grade', pe.grade,
                            'is_eligible', NOT EXISTS (
                                SELECT 1
                                FROM jsonb_array_elements(pe.prerequisites) elem
                                WHERE (elem->>'is_met')::BOOLEAN IS FALSE
                            ),
                            'unmet_reasons', COALESCE((
                                SELECT jsonb_agg(elem->>'detail')
                                FROM jsonb_array_elements(pe.prerequisites) elem
                                WHERE (elem->>'is_met')::BOOLEAN IS FALSE
                            ), '[]'::jsonb),
                            'prerequisites', pe.prerequisites
                        )
                        ORDER BY pe.year_level ASC, pe.course_code ASC
                    ),
                    '[]'::jsonb
                )
                INTO v_prereq_eligibility
                FROM prereq_eval pe;
            EXCEPTION
                WHEN OTHERS THEN
                    v_prereq_eligibility := '[]'::jsonb;
            END;

            BEGIN
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'assessment_id', ai.id,
                            'title', ai.title,
                            'assessment_type', ai.assessment_type::TEXT,
                            'course_code', c.code,
                            'course_title', c.title,
                            'section_code', sec.section_code,
                            'due_at', ai.due_at,
                            'total_points', ai.total_points,
                            'submission_status', COALESCE(sub.status::TEXT, 'Not Submitted'),
                            'is_submitted', (sub.id IS NOT NULL AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')),
                            'score', COALESCE(sub.final_score, sub.raw_score)
                        )
                        ORDER BY ai.due_at ASC, ai.title ASC
                    ),
                    '[]'::jsonb
                )
                INTO v_upcoming_deadlines
                FROM public.assessment_items ai
                INNER JOIN public.sections sec ON sec.id = ai.section_id AND sec.deleted_at IS NULL
                INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL
                INNER JOIN public.enrollments e ON e.section_id = sec.id AND e.deleted_at IS NULL AND e.student_id = v_student_id AND e.status <> 'Dropped'
                LEFT JOIN public.assessment_submissions sub
                    ON sub.assessment_item_id = ai.id
                    AND sub.enrollment_id = e.id
                    AND sub.deleted_at IS NULL
                WHERE ai.deleted_at IS NULL
                  AND ai.is_published
                  AND ai.due_at IS NOT NULL
                  AND ai.due_at >= now() - interval '1 day'
                  AND ai.due_at <= now() + interval '14 days';
            EXCEPTION
                WHEN OTHERS THEN
                    v_upcoming_deadlines := '[]'::jsonb;
            END;

            BEGIN
                SELECT COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'section_id', sec.id,
                            'section_code', sec.section_code,
                            'course_code', c.code,
                            'course_title', c.title,
                            'sessions_total_recorded', att.sessions_total,
                            'present_count', att.present_count,
                            'late_count', att.late_count,
                            'excused_count', att.excused_count,
                            'absent_count', att.absent_count,
                            'attendance_rate', att.attendance_rate,
                            'absence_rate_pct', CASE
                                WHEN att.sessions_total = 0 THEN 0.00
                                ELSE ROUND((att.absent_count::NUMERIC / att.sessions_total) * 100, 2)
                            END,
                            'total_sessions_planned', att.total_sessions_planned,
                            'max_allowable_absences', att.max_allowable_absences,
                            'remaining_allowable_absences', GREATEST(0, att.max_allowable_absences - att.absent_count),
                            'is_drp_risk', (
                                att.absent_count >= att.max_allowable_absences
                                OR (att.sessions_total > 0 AND (att.absent_count::NUMERIC / att.sessions_total) >= 0.20)
                            ),
                            'status', CASE
                                WHEN att.absent_count >= att.max_allowable_absences THEN 'DRP Risk Triggered'
                                WHEN (att.max_allowable_absences - att.absent_count) <= 1 THEN 'Near DRP Limit'
                                ELSE 'Good Standing'
                            END
                        )
                        ORDER BY c.code
                    ),
                    '[]'::jsonb
                )
                INTO v_attendance_drp
                FROM (
                    SELECT
                        e.id AS enrollment_id,
                        e.section_id,
                        COALESCE(COUNT(ar.id), 0)::INTEGER AS sessions_total,
                        COALESCE(COUNT(ar.id) FILTER (WHERE ar.status = 'Present'), 0)::INTEGER AS present_count,
                        COALESCE(COUNT(ar.id) FILTER (WHERE ar.status = 'Late'), 0)::INTEGER AS late_count,
                        COALESCE(COUNT(ar.id) FILTER (WHERE ar.status = 'Excused'), 0)::INTEGER AS excused_count,
                        COALESCE(COUNT(ar.id) FILTER (WHERE ar.status = 'Absent'), 0)::INTEGER AS absent_count,
                        CASE
                            WHEN COUNT(ar.id) = 0 THEN 100.00
                            ELSE ROUND(((COUNT(ar.id) - COUNT(ar.id) FILTER (WHERE ar.status = 'Absent'))::NUMERIC / COUNT(ar.id)) * 100, 2)
                        END AS attendance_rate,
                        GREATEST(
                            (SELECT COUNT(*)::INTEGER FROM public.attendance_sessions asx WHERE asx.section_id = e.section_id AND asx.deleted_at IS NULL),
                            COUNT(ar.id)::INTEGER,
                            18
                        ) AS total_sessions_planned,
                        FLOOR(
                            GREATEST(
                                (SELECT COUNT(*)::INTEGER FROM public.attendance_sessions asx WHERE asx.section_id = e.section_id AND asx.deleted_at IS NULL),
                                COUNT(ar.id)::INTEGER,
                                18
                            ) * 0.20
                        )::INTEGER AS max_allowable_absences
                    FROM public.enrollments e
                    LEFT JOIN public.attendance_records ar
                        ON ar.enrollment_id = e.id
                        AND ar.deleted_at IS NULL
                    WHERE e.id = ANY (v_enrollment_ids)
                    GROUP BY e.id, e.section_id
                ) att
                INNER JOIN public.sections sec ON sec.id = att.section_id AND sec.deleted_at IS NULL
                INNER JOIN public.courses c ON c.id = sec.course_id AND c.deleted_at IS NULL;
            EXCEPTION
                WHEN OTHERS THEN
                    v_attendance_drp := '[]'::jsonb;
            END;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'student_advising',
            'active_role', v_role,
            'profile', v_profile,
            'insight', v_insight,
            'prerequisite_eligibility', COALESCE(v_prereq_eligibility, '[]'::jsonb),
            'upcoming_deadlines', COALESCE(v_upcoming_deadlines, '[]'::jsonb),
            'attendance_drp_status', COALESCE(v_attendance_drp, '[]'::jsonb)
        );
    END IF;

    IF v_role = 'Faculty' THEN
        BEGIN
            v_dashboard := public.fn_get_faculty_dashboard(p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_dashboard := NULL;
        END;

        IF p_section_id IS NOT NULL THEN
            BEGIN
                v_section := public.fn_get_section_insight(p_section_id);
            EXCEPTION
                WHEN OTHERS THEN
                    v_section := NULL;
            END;
        END IF;

        SELECT COALESCE(array_agg(s.id), ARRAY[]::UUID[])
        INTO v_faculty_section_ids
        FROM public.sections s
        WHERE s.deleted_at IS NULL
          AND s.faculty_id = auth.uid()
          AND (p_term_id IS NULL OR s.term_id = p_term_id);

        BEGIN
            SELECT jsonb_build_object(
                'total_pending_grading', (
                    SELECT COUNT(*)
                    FROM public.assessment_submissions sub
                    INNER JOIN public.assessment_items ai ON ai.id = sub.assessment_item_id AND ai.deleted_at IS NULL
                    WHERE sub.deleted_at IS NULL
                      AND ai.section_id = ANY (v_faculty_section_ids)
                      AND sub.status IN ('Submitted', 'Late')
                ),
                'sections', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'section_id', s.id,
                            'section_code', s.section_code,
                            'course_code', c.code,
                            'course_title', c.title,
                            'total_pending', COUNT(sub.id),
                            'assessments', COALESCE((
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'assessment_id', ai2.id,
                                        'title', ai2.title,
                                        'assessment_type', ai2.assessment_type::TEXT,
                                        'due_at', ai2.due_at,
                                        'total_points', ai2.total_points,
                                        'pending_count', COUNT(sub2.id)
                                    )
                                    ORDER BY ai2.due_at ASC NULLS LAST, ai2.title ASC
                                )
                                FROM public.assessment_items ai2
                                INNER JOIN public.assessment_submissions sub2
                                    ON sub2.assessment_item_id = ai2.id
                                    AND sub2.deleted_at IS NULL
                                    AND sub2.status IN ('Submitted', 'Late')
                                WHERE ai2.section_id = s.id
                                  AND ai2.deleted_at IS NULL
                                GROUP BY ai2.id, ai2.title, ai2.assessment_type, ai2.due_at, ai2.total_points
                            ), '[]'::jsonb)
                        )
                        ORDER BY c.code, s.section_code
                    )
                    FROM public.sections s
                    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
                    LEFT JOIN public.assessment_items ai ON ai.section_id = s.id AND ai.deleted_at IS NULL
                    LEFT JOIN public.assessment_submissions sub
                        ON sub.assessment_item_id = ai.id
                        AND sub.deleted_at IS NULL
                        AND sub.status IN ('Submitted', 'Late')
                    WHERE s.id = ANY (v_faculty_section_ids)
                    GROUP BY s.id, s.section_code, c.code, c.title
                ), '[]'::jsonb)
            )
            INTO v_grading_queue;
        EXCEPTION
            WHEN OTHERS THEN
                v_grading_queue := NULL;
        END;

        BEGIN
            SELECT COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'section_id', s.id,
                        'section_code', s.section_code,
                        'course_code', c.code,
                        'course_title', c.title,
                        'enrolled_count', (
                            SELECT COUNT(*)
                            FROM public.enrollments e
                            WHERE e.section_id = s.id
                              AND e.deleted_at IS NULL
                              AND e.status NOT IN ('Dropped', 'Withdrawn')
                        ),
                        'sessions_held', (
                            SELECT COUNT(*)
                            FROM public.attendance_sessions asx
                            WHERE asx.section_id = s.id
                              AND asx.deleted_at IS NULL
                        ),
                        'avg_attendance_rate', (
                            SELECT ROUND(
                                AVG(
                                    CASE
                                        WHEN total_rec = 0 THEN 100.00
                                        ELSE ((total_rec - absent_rec)::NUMERIC / total_rec) * 100
                                    END
                                ), 2
                            )
                            FROM (
                                SELECT
                                    e.id,
                                    COUNT(ar.id) AS total_rec,
                                    COUNT(ar.id) FILTER (WHERE ar.status = 'Absent') AS absent_rec
                                FROM public.enrollments e
                                LEFT JOIN public.attendance_records ar ON ar.enrollment_id = e.id AND ar.deleted_at IS NULL
                                WHERE e.section_id = s.id
                                  AND e.deleted_at IS NULL
                                  AND e.status NOT IN ('Dropped', 'Withdrawn')
                                GROUP BY e.id
                            ) att_agg
                        ),
                        'students_at_drp_risk', (
                            SELECT COUNT(*)
                            FROM (
                                SELECT
                                    e.id,
                                    COUNT(ar.id) AS total_rec,
                                    COUNT(ar.id) FILTER (WHERE ar.status = 'Absent') AS absent_rec
                                FROM public.enrollments e
                                INNER JOIN public.attendance_records ar ON ar.enrollment_id = e.id AND ar.deleted_at IS NULL
                                WHERE e.section_id = s.id
                                  AND e.deleted_at IS NULL
                                  AND e.status NOT IN ('Dropped', 'Withdrawn')
                                GROUP BY e.id
                                HAVING COUNT(ar.id) > 0
                                   AND (COUNT(ar.id) FILTER (WHERE ar.status = 'Absent')::NUMERIC / COUNT(ar.id)) >= 0.20
                            ) drp_agg
                        )
                    )
                    ORDER BY c.code, s.section_code
                ),
                '[]'::jsonb
            )
            INTO v_section_attendance
            FROM public.sections s
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            WHERE s.id = ANY (v_faculty_section_ids);
        EXCEPTION
            WHEN OTHERS THEN
                v_section_attendance := '[]'::jsonb;
        END;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'faculty_advising',
            'active_role', v_role,
            'profile', v_profile,
            'dashboard', v_dashboard,
            'section', v_section,
            'grading_queue_summary', v_grading_queue,
            'section_attendance_summary', COALESCE(v_section_attendance, '[]'::jsonb)
        );
    END IF;

    IF v_role = 'Admin' THEN
        v_active_term_id := public.fn_dashboard_active_term();

        SELECT jsonb_build_object(
            'term_id', t.id,
            'term_label', tt.label || ' - ' || sy.label,
            'school_year_label', sy.label,
            'term_type_label', tt.label,
            'status', t.status,
            'start_date', t.start_date,
            'end_date', t.end_date
        )
        INTO v_active_term
        FROM public.terms t
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = v_active_term_id
          AND t.deleted_at IS NULL;

        BEGIN
            SELECT jsonb_build_object(
                'active_term', v_active_term,
                'total_active_students', (
                    SELECT COUNT(*)
                    FROM public.students s
                    WHERE s.deleted_at IS NULL AND s.status = 'Active'
                ),
                'total_active_faculty', (
                    SELECT COUNT(DISTINCT ur.user_id)
                    FROM public.user_roles ur
                    INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                    WHERE ur.deleted_at IS NULL AND ur.revoked_at IS NULL AND r.code = 'Faculty'
                ),
                'sections_in_term', (
                    SELECT COUNT(*)
                    FROM public.sections s
                    WHERE s.deleted_at IS NULL AND s.term_id = v_active_term_id
                ),
                'unassigned_sections_count', (
                    SELECT COUNT(*)
                    FROM public.sections s
                    WHERE s.deleted_at IS NULL AND s.term_id = v_active_term_id AND s.faculty_id IS NULL
                ),
                'enrollments_in_term', (
                    SELECT COUNT(*)
                    FROM public.enrollments e
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE e.deleted_at IS NULL AND e.status = 'Enrolled' AND s.term_id = v_active_term_id
                ),
                'pending_grade_releases', (
                    SELECT COUNT(*)
                    FROM public.section_final_grades sfg
                    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE sfg.deleted_at IS NULL
                      AND sfg.status IN ('Submitted', 'Approved')
                      AND s.term_id = v_active_term_id
                ),
                'released_grade_count', (
                    SELECT COUNT(*)
                    FROM public.section_final_grades sfg
                    INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id AND e.deleted_at IS NULL
                    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                    WHERE sfg.deleted_at IS NULL
                      AND sfg.status = 'Released'
                      AND s.term_id = v_active_term_id
                ),
                'pending_clearances_count', (
                    SELECT COUNT(*)
                    FROM public.student_clearances sc
                    WHERE sc.deleted_at IS NULL AND sc.status = 'Pending'
                ),
                'upcoming_terms', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'term_id', t.id,
                            'term_label', tt.label || ' - ' || sy.label,
                            'status', t.status,
                            'start_date', t.start_date
                        )
                        ORDER BY t.start_date ASC
                    )
                    FROM public.terms t
                    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                    WHERE t.deleted_at IS NULL
                      AND t.start_date > CURRENT_DATE
                    LIMIT 3
                ), '[]'::jsonb)
            )
            INTO v_term_checkpoints;
        EXCEPTION
            WHEN OTHERS THEN
                v_term_checkpoints := NULL;
        END;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'admin_overview',
            'active_role', v_role,
            'profile', v_profile,
            'term_checkpoints', v_term_checkpoints
        );
    END IF;

    IF v_role = 'Dean' THEN
        BEGIN
            v_dashboard := public.fn_get_dean_dashboard(p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_dashboard := NULL;
        END;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'dean_overview',
            'active_role', v_role,
            'profile', v_profile,
            'dashboard', v_dashboard
        );
    END IF;

    IF v_role = 'Registrar' THEN
        BEGIN
            v_dashboard := public.fn_get_registrar_dashboard(p_term_id);
        EXCEPTION
            WHEN OTHERS THEN
                v_dashboard := NULL;
        END;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'registrar_overview',
            'active_role', v_role,
            'profile', v_profile,
            'dashboard', v_dashboard
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'mode', 'howto',
        'active_role', v_role,
        'profile', v_profile
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_assistant_context(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_assistant_context(text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_assistant_context(text, uuid, uuid) TO authenticated;

