-- ====================================================================
-- Migration: 20261030010000_security_and_consistency_fixes.sql
-- Security:
--   * fn_create_role / fn_delete_role were callable by any signed-in user
--   * internal helpers (cron sweeps, attachment inserters, grade calculator,
--     section enrolment, flag detection) were executable by clients, several
--     by anonymous users; only SECURITY DEFINER callers and cron need them
-- Consistency (frontend now relies on these):
--   * fn_save_section_grading_override (new): dean/admin section grading override
--   * fn_bulk_create_evaluation_templates: honour target_mode / suggestion_placeholder
--   * fn_list_grading_periods_by_section: return exam / encoding window dates
--   * fn_list_section_students: return risk_level and term GWA
--   * fn_credit_student_course: editing an existing credit updates it in place
--   * fn_get_assessment_questions_for_student: return is_required, upload limits,
--     and saved file attachments (resuming no longer overwrites earlier uploads)
-- Rollback: supabase/rollback/20261030010000_security_and_consistency_fixes.down.sql
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_create_role(p_code text, p_label text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_code TEXT := btrim(COALESCE(p_code, ''));
    v_label TEXT := btrim(p_label);
    v_description TEXT := NULLIF(btrim(coalesce(p_description, '')), '');
    v_seq INT := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_label IS NULL OR v_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role label is required.');
    END IF;

    IF v_code = '' THEN
        v_code := upper(regexp_replace(v_label, '[^A-Za-z0-9]+', '_', 'g'));
        v_code := regexp_replace(v_code, '^_+|_+$', '', 'g');
        IF v_code = '' THEN
            v_code := 'ROLE';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(code)) = lower(v_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.roles
            WHERE lower(btrim(code)) = lower(v_code || '_' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_code := v_code || '_' || v_seq::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(label)) = lower(v_label) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with label "' || v_label || '" already exists.');
    END IF;

    IF v_description IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.roles
        WHERE lower(btrim(description)) = lower(v_description) AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A role with description "' || v_description || '" already exists.');
    END IF;

    INSERT INTO public.roles (code, label, description, created_by)
    VALUES (v_code, v_label, v_description, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Role created successfully', 'code', v_code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_delete_role(p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_users INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT COUNT(*) INTO v_active_users
    FROM public.user_roles
    WHERE role_id = p_role_id
    AND deleted_at IS NULL;

    IF v_active_users > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete role. ' || v_active_users || ' user(s) are currently assigned to this role.'
        );
    END IF;

    UPDATE public.roles
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role deleted successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_bulk_create_evaluation_templates(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_provisioned INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_group RECORD;
    v_first JSONB;
    v_questions JSONB;
    v_program_ids UUID[];
    v_missing_codes TEXT[];
    v_error TEXT;
    v_template_id UUID;
    v_sequence SMALLINT;
    v_next_sequence SMALLINT;
    v_is_active BOOLEAN;
    v_mode TEXT;
BEGIN
    IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) = 0 THEN
        RETURN jsonb_build_object('provisioned_count', 0, 'errors', '[]'::JSONB);
    END IF;

    SELECT COALESCE(MAX(sequence), 0) INTO v_next_sequence
    FROM public.evaluation_templates
    WHERE deleted_at IS NULL;

    FOR v_group IN
        WITH rows AS (
            SELECT r.value AS row, r.ordinality AS rn
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        )
        SELECT
            lower(btrim(row->>'section_title')) AS group_key,
            MIN(rn) AS first_rn
        FROM rows
        WHERE btrim(COALESCE(row->>'section_title', '')) <> ''
        GROUP BY lower(btrim(row->>'section_title'))
        ORDER BY MIN(rn)
    LOOP
        BEGIN
            SELECT r.value INTO v_first
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE r.ordinality = v_group.first_rn;

            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_text', btrim(COALESCE(r.value->>'question_text', '')),
                    'question_type', btrim(COALESCE(r.value->>'question_type', '')),
                    'is_required',   COALESCE(NULLIF(btrim(COALESCE(r.value->>'is_required', '')), '')::BOOLEAN, true),
                    'min_rating',    NULLIF(btrim(COALESCE(r.value->>'min_rating', '')), ''),
                    'max_rating',    NULLIF(btrim(COALESCE(r.value->>'max_rating', '')), '')
                )
                ORDER BY r.ordinality
            )
            INTO v_questions
            FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
            WHERE lower(btrim(r.value->>'section_title')) = v_group.group_key
            AND btrim(COALESCE(r.value->>'question_text', '')) <> '';

            v_error := public.fn_validate_evaluation_questions(v_questions);
            IF v_error IS NOT NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', v_error
                ));
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.evaluation_templates
                WHERE lower(title) = v_group.group_key AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'A section named "' || btrim(v_first->>'section_title') || '" already exists.'
                ));
                CONTINUE;
            END IF;

            v_program_ids := NULL;
            v_missing_codes := NULL;

            IF NULLIF(btrim(COALESCE(v_first->>'program_codes', '')), '') IS NOT NULL THEN
                SELECT
                    array_agg(p.id),
                    array_agg(codes.code) FILTER (WHERE p.id IS NULL)
                INTO v_program_ids, v_missing_codes
                FROM (
                    SELECT DISTINCT btrim(c) AS code
                    FROM unnest(string_to_array(v_first->>'program_codes', '|')) AS c
                    WHERE btrim(c) <> ''
                ) codes
                LEFT JOIN public.programs p
                    ON p.code = codes.code AND p.deleted_at IS NULL;

                IF v_missing_codes IS NOT NULL AND array_length(v_missing_codes, 1) > 0 THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                        'row', v_group.first_rn,
                        'code', btrim(v_first->>'section_title'),
                        'message', 'Program code(s) not found: ' || array_to_string(v_missing_codes, ', ')
                    ));
                    CONTINUE;
                END IF;
            END IF;

            -- Target mode: blank => INCLUDE when program codes are given (the previous implicit
            -- behaviour), else ALL. INCLUDE/EXCLUDE need at least one program (same as the UI wizard).
            v_mode := upper(NULLIF(btrim(COALESCE(v_first->>'target_mode', '')), ''));
            IF v_mode IS NULL THEN
                v_mode := CASE WHEN v_program_ids IS NULL THEN 'ALL' ELSE 'INCLUDE' END;
            END IF;

            IF v_mode NOT IN ('ALL', 'INCLUDE', 'EXCLUDE') THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'Invalid target mode "' || (v_first->>'target_mode') || '". Must be ALL, INCLUDE, or EXCLUDE.'
                ));
                CONTINUE;
            END IF;

            IF v_mode = 'ALL' THEN
                v_program_ids := NULL;
            ELSIF v_program_ids IS NULL OR array_length(v_program_ids, 1) IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_group.first_rn,
                    'code', btrim(v_first->>'section_title'),
                    'message', 'Target mode ' || v_mode || ' requires at least one program code.'
                ));
                CONTINUE;
            END IF;

            v_is_active := COALESCE(NULLIF(btrim(COALESCE(v_first->>'is_active', '')), '')::BOOLEAN, true);

            IF NULLIF(btrim(COALESCE(v_first->>'section_sequence', '')), '') IS NOT NULL THEN
                v_sequence := GREATEST((v_first->>'section_sequence')::SMALLINT, 1);
            ELSE
                v_next_sequence := v_next_sequence + 1;
                v_sequence := v_next_sequence;
            END IF;

            INSERT INTO public.evaluation_templates (
                title, description, is_active, sequence, target_mode, suggestion_placeholder, created_by
            )
            VALUES (
                btrim(v_first->>'section_title'),
                NULLIF(btrim(COALESCE(v_first->>'section_description', '')), ''),
                v_is_active,
                v_sequence,
                v_mode,
                NULLIF(btrim(COALESCE(v_first->>'suggestion_placeholder', '')), ''),
                auth.uid()
            )
            RETURNING id INTO v_template_id;

            PERFORM public.fn_insert_evaluation_questions(v_template_id, v_questions);
            PERFORM public.fn_set_evaluation_template_programs(v_template_id, v_program_ids);

            v_provisioned := v_provisioned + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_group.first_rn,
                'code', btrim(COALESCE(v_first->>'section_title', '')),
                'message', SQLERRM
            ));
        END;
    END LOOP;

    FOR v_first IN
        SELECT r.value
        FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS r(value, ordinality)
        WHERE btrim(COALESCE(r.value->>'section_title', '')) = ''
    LOOP
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
            'row', 0,
            'code', 'MISSING_TITLE',
            'message', 'Row skipped: section title is required.'
        ));
    END LOOP;

    RETURN jsonb_build_object('provisioned_count', v_provisioned, 'errors', v_errors);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_grading_periods_by_section(p_section_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',                        gp.id,
                'name',                      gp.name,
                'sequence',                  gp.sequence,
                'weight',                    gp.weight,
                'start_date',                gp.start_date,
                'end_date',                  gp.end_date,
                'major_exam_start_date',     gp.major_exam_start_date,
                'major_exam_end_date',       gp.major_exam_end_date,
                'grade_encoding_start_date', gp.grade_encoding_start_date,
                'grade_encoding_end_date',   gp.grade_encoding_end_date
            )
            ORDER BY gp.sequence ASC
        ), '[]'::JSONB)
        FROM public.grading_periods gp
        INNER JOIN public.sections s ON s.term_id = gp.term_id
        WHERE s.id = p_section_id
        AND s.deleted_at IS NULL
        AND gp.deleted_at IS NULL
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_list_section_students(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.section_id = ' || quote_literal(p_section_id) || ' AND e.deleted_at IS NULL';
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
        RAISE EXCEPTION 'Forbidden: you do not have access to this section roster.'
            USING ERRCODE = '42501';
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            st.id AS student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS full_name,
            u.email,
            st.year_level,
            e.status,
            e.enrolled_at,
            (SELECT r.risk_level FROM public.fn_dashboard_enrollment_risk(ARRAY[e.id]) r LIMIT 1) AS risk_level,
            (public.fn_compute_student_gwa(st.id, sec.term_id)->>''gwa'')::NUMERIC AS gwa,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections sec ON sec.id = e.section_id
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC, u.first_name ASC');
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_credit_student_course(p_student_id uuid, p_course_id uuid, p_previous_school text, p_previous_course_code text DEFAULT NULL::text, p_previous_course_title text DEFAULT NULL::text, p_grade_display text DEFAULT 'Passed'::text, p_grade_numeric numeric DEFAULT NULL::numeric, p_units_credited numeric DEFAULT NULL::numeric, p_remarks text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id     UUID;
    v_caller_name   TEXT;
    v_roles         TEXT[];
    v_user_id       UUID;
    v_student_num   TEXT;
    v_student_name  TEXT;
    v_course_code   TEXT;
    v_course_title  TEXT;
    v_default_units NUMERIC;
    v_final_units   NUMERIC;
    v_inserted_id   UUID;
    v_existing_id   UUID;
    v_old_data      JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You must be logged in.');
    END IF;

    SELECT array_agg(r.code) INTO v_roles
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE ur.user_id = v_caller_id AND ur.deleted_at IS NULL AND ur.revoked_at IS NULL;

    IF NOT ('Registrar' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Only Registrar or Admin can credit courses.');
    END IF;

    SELECT first_name || ' ' || last_name INTO v_caller_name
    FROM public.users WHERE id = v_caller_id;

    SELECT st.user_id, st.student_number, u.first_name || ' ' || u.last_name
    INTO v_user_id, v_student_num, v_student_name
    FROM public.students st
    JOIN public.users u ON u.id = st.user_id
    WHERE st.id = p_student_id AND st.deleted_at IS NULL;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student record not found.');
    END IF;

    SELECT code, title, total_units
    INTO v_course_code, v_course_title, v_default_units
    FROM public.courses
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF v_course_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found.');
    END IF;

    IF p_previous_school IS NULL OR trim(p_previous_school) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Previous school/institution name is required.');
    END IF;

    SELECT id,
           jsonb_build_object(
               'previous_school', previous_school,
               'previous_course_code', previous_course_code,
               'previous_course_title', previous_course_title,
               'grade_display', grade_display,
               'grade_numeric', grade_numeric,
               'units_credited', units_credited,
               'remarks', remarks
           )
    INTO v_existing_id, v_old_data
    FROM public.student_credited_courses
    WHERE student_id = p_student_id AND course_id = p_course_id AND deleted_at IS NULL
    LIMIT 1;

    -- Already credited: the Registrar is editing the credit details, so update in place.
    IF v_existing_id IS NOT NULL THEN
        UPDATE public.student_credited_courses
        SET previous_school = trim(p_previous_school),
            previous_course_code = NULLIF(trim(p_previous_course_code), ''),
            previous_course_title = NULLIF(trim(p_previous_course_title), ''),
            grade_display = COALESCE(NULLIF(trim(p_grade_display), ''), 'Passed'),
            grade_numeric = p_grade_numeric,
            units_credited = COALESCE(p_units_credited, units_credited, v_default_units, 3.0),
            remarks = NULLIF(trim(p_remarks), ''),
            credited_by = v_caller_id,
            updated_at = now()
        WHERE id = v_existing_id;

        INSERT INTO public.audit_logs (changed_by, changed_by_name, action, event_name, table_name, record_id, old_data, new_data)
        VALUES (
            v_caller_id, v_caller_name, 'UPDATE', 'COURSE_CREDIT_UPDATED', 'student_credited_courses', v_existing_id::text,
            v_old_data,
            jsonb_build_object(
                'student_id', p_student_id, 'student_number', v_student_num, 'student_name', v_student_name,
                'course_id', p_course_id, 'course_code', v_course_code, 'course_title', v_course_title,
                'previous_school', trim(p_previous_school), 'units_credited', COALESCE(p_units_credited, v_default_units, 3.0),
                'credited_by_name', v_caller_name
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Credit details for ' || v_course_code || ' updated successfully.',
            'credited_course_id', v_existing_id
        );
    END IF;


    v_final_units := COALESCE(p_units_credited, v_default_units, 3.0);

    INSERT INTO public.student_credited_courses (
        student_id, course_id, previous_school, previous_course_code, previous_course_title,
        grade_display, grade_numeric, units_credited, remarks, credited_by
    ) VALUES (
        p_student_id, p_course_id, trim(p_previous_school),
        NULLIF(trim(p_previous_course_code), ''), NULLIF(trim(p_previous_course_title), ''),
        COALESCE(NULLIF(trim(p_grade_display), ''), 'Passed'), p_grade_numeric,
        v_final_units, NULLIF(trim(p_remarks), ''), v_caller_id
    )
    RETURNING id INTO v_inserted_id;

    -- Audit Log
    INSERT INTO public.audit_logs (changed_by, changed_by_name, action, event_name, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id, v_caller_name, 'INSERT', 'COURSE_CREDITED', 'student_credited_courses', v_inserted_id::text,
        NULL,
        jsonb_build_object(
            'student_id', p_student_id, 'student_number', v_student_num, 'student_name', v_student_name,
            'course_id', p_course_id, 'course_code', v_course_code, 'course_title', v_course_title,
            'previous_school', p_previous_school, 'units_credited', v_final_units, 'credited_by_name', v_caller_name
        )
    );

    -- Notify the student in real time
    INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
    VALUES (
        v_user_id,
        'Course Credited',
        format('Course %s (%s) has been credited from %s.', v_course_code, v_course_title, trim(p_previous_school)),
        '/student/curriculum',
        'Account'::public.notification_category_type
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Course ' || v_course_code || ' credited successfully.',
        'credited_course_id', v_inserted_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions_for_student(p_assessment_id uuid, p_enrollment_id uuid, p_submission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id    UUID;
    v_shuffle_q     BOOLEAN;
    v_shuffle_c     BOOLEAN;
    v_seed          TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments e
        INNER JOIN public.assessment_items ai ON ai.section_id = e.section_id
        WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
          AND (v_student_id IS NULL OR e.student_id = v_student_id)
          AND ai.id = p_assessment_id
          AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
          AND ai.deleted_at IS NULL
          AND e.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    SELECT shuffle_questions, shuffle_choices
    INTO v_shuffle_q, v_shuffle_c
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    v_seed := p_submission_id::text;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            aq.id,
                'question_text', aq.question_text,
                'question_type', aq.question_type,
                'points',        aq.points,
                'sequence',      aq.sequence,
                'is_required',        aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'saved_answer', (
                    SELECT jsonb_build_object(
                        'id',               sa.id,
                        'answer_text',      sa.answer_text,
                        'choice_id',        sa.choice_id,
                        'file_attachments', COALESCE(sa.file_attachments, '[]'::jsonb)
                    )
                    FROM public.student_answers sa
                    WHERE sa.submission_id = p_submission_id
                      AND sa.question_id = aq.id
                      AND sa.deleted_at IS NULL
                    LIMIT 1
                ),
                'choices',       CASE
                    WHEN aq.question_type IN ('Multiple Choice', 'True or False', 'Matching') THEN (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',          c.id,
                                'choice_text', c.choice_text,
                                'sequence',    c.sequence
                            )
                            ORDER BY CASE WHEN COALESCE(v_shuffle_c, false) THEN md5(v_seed || c.id::text) ELSE c.sequence::text END ASC
                        ), '[]'::jsonb)
                        FROM public.assessment_question_choices c
                        WHERE c.question_id = aq.id AND c.deleted_at IS NULL
                    )
                    ELSE '[]'::jsonb
                END
            )
            ORDER BY CASE WHEN COALESCE(v_shuffle_q, false) THEN md5(v_seed || aq.id::text) ELSE aq.sequence::text END ASC
        ), '[]'::jsonb)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id AND aq.deleted_at IS NULL
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_save_section_grading_override(p_section_id uuid, p_periods jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_period JSONB;
    v_component JSONB;
    v_period_id UUID;
    v_period_label TEXT;
    v_sequence INTEGER;
    v_weight NUMERIC;
    v_total NUMERIC;
    v_applied INTEGER := 0;
    v_skipped TEXT[] := ARRAY[]::TEXT[];
    v_department_id UUID;
    v_dean_department_id UUID := public.fn_get_dean_department_id();
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    SELECT s.term_id, c.department_id INTO v_term_id, v_department_id
    FROM public.sections s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = p_section_id
      AND s.deleted_at IS NULL;

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    -- Deans may only change sections in their own department (NULL = Admin, unscoped)
    IF v_dean_department_id IS NOT NULL AND v_department_id IS DISTINCT FROM v_dean_department_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only change grading for sections in your department.');
    END IF;

    IF p_periods IS NULL OR jsonb_typeof(p_periods) <> 'array' OR jsonb_array_length(p_periods) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'At least one grading period is required.');
    END IF;

    -- Validate the whole payload first so an override is never half-applied
    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        v_period_label := COALESCE(NULLIF(btrim(v_period->>'name'), ''), 'Period ' || COALESCE(v_period->>'sequence', '?'));

        IF jsonb_typeof(v_period->'components') IS DISTINCT FROM 'array'
           OR jsonb_array_length(v_period->'components') = 0 THEN
            RETURN jsonb_build_object('success', false, 'message', v_period_label || ' needs at least one grading component.');
        END IF;

        v_total := 0;
        FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
        LOOP
            IF btrim(COALESCE(v_component->>'name', '')) = '' THEN
                RETURN jsonb_build_object('success', false, 'message', v_period_label || ': every component needs a name.');
            END IF;

            BEGIN
                v_weight := (v_component->>'weight')::NUMERIC;
            EXCEPTION WHEN invalid_text_representation THEN
                v_weight := NULL;
            END;

            IF v_weight IS NULL OR v_weight <= 0 OR v_weight > 100 THEN
                RETURN jsonb_build_object('success', false, 'message', v_period_label || ': component weights must be greater than 0 and at most 100.');
            END IF;

            v_total := v_total + v_weight;
        END LOOP;

        IF v_total <> 100 THEN
            RETURN jsonb_build_object('success', false, 'message', format('%s: component weights must total 100%% (currently %s%%).', v_period_label, v_total));
        END IF;
    END LOOP;

    -- Make sure the term has its grading periods (same as fn_seed_section_grading)
    PERFORM public.fn_seed_term_grading_periods(v_term_id);

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        v_period_label := COALESCE(NULLIF(btrim(v_period->>'name'), ''), 'Period ' || COALESCE(v_period->>'sequence', '?'));
        v_sequence := CASE WHEN COALESCE(v_period->>'sequence', '') ~ '^\d+$' THEN (v_period->>'sequence')::INTEGER END;
        v_period_id := NULL;

        SELECT gp.id INTO v_period_id
        FROM public.grading_periods gp
        WHERE gp.term_id = v_term_id
          AND gp.deleted_at IS NULL
          AND (gp.sequence = v_sequence OR lower(btrim(gp.name)) = lower(btrim(COALESCE(v_period->>'name', ''))))
        ORDER BY (gp.sequence = v_sequence) DESC NULLS LAST
        LIMIT 1;

        -- Replacing components would detach assessments already filed under them
        IF v_period_id IS NULL
           OR public.fn_is_section_grading_locked(p_section_id, v_period_id)
           OR EXISTS (
               SELECT 1
               FROM public.assessment_items ai
               JOIN public.grading_components gc ON gc.id = ai.grading_component_id
               WHERE gc.section_id = p_section_id
                 AND gc.grading_period_id = v_period_id
                 AND gc.deleted_at IS NULL
                 AND ai.deleted_at IS NULL
           ) THEN
            v_skipped := array_append(v_skipped, v_period_label);
            CONTINUE;
        END IF;

        UPDATE public.grading_components
        SET deleted_at = NOW(),
            deleted_by = auth.uid()
        WHERE section_id = p_section_id
          AND grading_period_id = v_period_id
          AND deleted_at IS NULL;

        INSERT INTO public.grading_components (section_id, grading_period_id, name, weight, created_by)
        SELECT p_section_id, v_period_id, btrim(c->>'name'), (c->>'weight')::NUMERIC, auth.uid()
        FROM jsonb_array_elements(v_period->'components') AS c;

        v_applied := v_applied + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN array_length(v_skipped, 1) IS NULL THEN format('Grading override applied to %s period(s).', v_applied)
            ELSE format('Grading override applied to %s period(s); skipped (locked by recorded grades, already used by assessments, or not in the term): %s.', v_applied, array_to_string(v_skipped, ', '))
        END,
        'applied_periods', v_applied,
        'skipped_periods', to_jsonb(v_skipped)
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_save_section_grading_override(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_save_section_grading_override(uuid, jsonb) TO authenticated, service_role;

-- Internal helpers: callable only by their SECURITY DEFINER callers and cron
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_calculate_final_grade' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_detect_special_grade_flags_core' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_enroll_student_section' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_insert_announcement_attachments' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_insert_discussion_attachments' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_insert_event_attachments' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_sweep_expired_assessment_sessions' \gexec
SELECT format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', p.oid::regprocedure) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'fn_sweep_special_grade_flags' \gexec

COMMIT;
