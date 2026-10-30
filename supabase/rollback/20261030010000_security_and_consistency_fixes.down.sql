-- ROLLBACK for 20261030010000_security_and_consistency_fixes.sql (generated 2026-10-30T12:06:17Z from live definitions + ACLs)
BEGIN;
DROP FUNCTION IF EXISTS public.fn_save_section_grading_override(uuid, jsonb);
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

            v_is_active := COALESCE(NULLIF(btrim(COALESCE(v_first->>'is_active', '')), '')::BOOLEAN, true);

            IF NULLIF(btrim(COALESCE(v_first->>'section_sequence', '')), '') IS NOT NULL THEN
                v_sequence := GREATEST((v_first->>'section_sequence')::SMALLINT, 1);
            ELSE
                v_next_sequence := v_next_sequence + 1;
                v_sequence := v_next_sequence;
            END IF;

            INSERT INTO public.evaluation_templates (title, description, is_active, sequence, created_by)
            VALUES (
                btrim(v_first->>'section_title'),
                NULLIF(btrim(COALESCE(v_first->>'section_description', '')), ''),
                v_is_active,
                v_sequence,
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_bulk_create_evaluation_templates(jsonb) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_bulk_create_evaluation_templates(jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_bulk_create_evaluation_templates(jsonb) TO authenticated;

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
BEGIN
  SELECT s.id INTO v_section_id
  FROM public.enrollments e
  INNER JOIN public.sections s ON s.id = e.section_id
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
    SELECT
      COALESCE(SUM(asub.final_score), 0),
      COALESCE(SUM(ai.total_points),  0)
    INTO v_component_score, v_component_max
    FROM public.assessment_items ai
    INNER JOIN public.assessment_submissions asub
      ON asub.assessment_item_id = ai.id
      AND asub.enrollment_id     = p_enrollment_id
      AND asub.deleted_at        IS NULL
      AND asub.status            = 'Graded'
    WHERE ai.grading_component_id = v_component.id
      AND ai.deleted_at           IS NULL;

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
  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE (gtt.program_id = v_program_id OR gtt.program_id IS NULL)
    AND v_raw_grade    >= gtt.min_percentage
    AND gtt.transmuted_grade IS NOT NULL
    AND gtt.deleted_at IS NULL
  ORDER BY (gtt.program_id IS NOT NULL) DESC, gtt.min_percentage DESC
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_calculate_final_grade(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_calculate_final_grade(uuid,uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_calculate_final_grade(uuid,uuid) TO authenticated;

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
$function$
;
REVOKE ALL ON FUNCTION public.fn_create_role(text,text,text) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_role(text,text,text) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_create_role(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_role(text,text,text) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_create_role(text,text,text) TO service_role;

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

    IF EXISTS (
        SELECT 1 FROM public.student_credited_courses
        WHERE student_id = p_student_id AND course_id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course ' || v_course_code || ' is already credited for this student.');
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_credit_student_course(uuid,uuid,text,text,text,text,numeric,numeric,text) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_credit_student_course(uuid,uuid,text,text,text,text,numeric,numeric,text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_credit_student_course(uuid,uuid,text,text,text,text,numeric,numeric,text) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_credit_student_course(uuid,uuid,text,text,text,text,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_credit_student_course(uuid,uuid,text,text,text,text,numeric,numeric,text) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_delete_role(p_role_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_active_users INTEGER;
BEGIN
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_delete_role(uuid) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_role(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_delete_role(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_detect_special_grade_flags_core(p_section_id uuid, p_grading_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_enrollment_ids  UUID[];
    v_overrides       JSONB;
    v_sig             RECORD;
    v_rule            RECORD;
    v_conditions      JSONB;
    v_matched         BOOLEAN;
    v_evidence        JSONB;
    v_existing_id     UUID;
    v_existing_status TEXT;
    v_created         INTEGER := 0;
    v_refreshed       INTEGER := 0;
    v_superseded      INTEGER := 0;
BEGIN
    SELECT array_agg(e.id)
    INTO v_enrollment_ids
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.status     = 'Enrolled'
      AND e.deleted_at IS NULL;

    IF v_enrollment_ids IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'created', 0, 'refreshed', 0, 'superseded', 0
        );
    END IF;

    v_overrides := public.fn_section_special_grade_override_map(p_section_id);

    FOR v_sig IN
        SELECT * FROM public.fn_special_grade_signals(v_enrollment_ids)
    LOOP
        FOR v_rule IN
            SELECT sgc.*
            FROM public.special_grade_configs sgc
            WHERE sgc.deleted_at IS NULL
              AND sgc.is_active
              AND sgc.is_auto_detected
            ORDER BY sgc.priority ASC, sgc.code ASC
        LOOP
            v_conditions := public.fn_apply_special_grade_overrides(
                v_rule.conditions,
                COALESCE(v_overrides->(v_rule.id::TEXT), '{}'::jsonb)
            );

            v_matched := public.fn_eval_special_grade_condition(v_conditions, v_sig.signals);

            SELECT f.id, f.status::TEXT
            INTO v_existing_id, v_existing_status
            FROM public.special_grade_flags f
            WHERE f.enrollment_id           = v_sig.enrollment_id
              AND f.grading_period_id       = p_grading_period_id
              AND f.special_grade_config_id = v_rule.id
              AND f.deleted_at              IS NULL;

            IF v_matched THEN
                v_evidence := public.fn_special_grade_evidence(v_conditions, v_sig.signals);

                IF v_existing_id IS NULL THEN
                    INSERT INTO public.special_grade_flags (
                        special_grade_config_id, enrollment_id, grading_period_id,
                        status, rule_version, rule_snapshot, evidence
                    ) VALUES (
                        v_rule.id, v_sig.enrollment_id, p_grading_period_id,
                        'Pending', v_rule.rule_version,
                        jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        v_evidence
                    );
                    v_created := v_created + 1;

                ELSIF v_existing_status IN ('Pending', 'Superseded') THEN
                    UPDATE public.special_grade_flags
                    SET status        = 'Pending',
                        rule_version  = v_rule.rule_version,
                        rule_snapshot = jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority,
                            'is_section_overridden', v_conditions IS DISTINCT FROM v_rule.conditions
                        ),
                        evidence      = v_evidence,
                        detected_at   = now()
                    WHERE id = v_existing_id;
                    v_refreshed := v_refreshed + 1;
                END IF;

            ELSIF v_existing_id IS NOT NULL AND v_existing_status = 'Pending' THEN
                UPDATE public.special_grade_flags
                SET status = 'Superseded'
                WHERE id = v_existing_id;
                v_superseded := v_superseded + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success',    true,
        'created',    v_created,
        'refreshed',  v_refreshed,
        'superseded', v_superseded
    );
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_detect_special_grade_flags_core(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_detect_special_grade_flags_core(uuid,uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_detect_special_grade_flags_core(uuid,uuid) TO postgres;

CREATE OR REPLACE FUNCTION public.fn_enroll_student_section(p_student_id uuid, p_section_id uuid, p_allow_conflict boolean DEFAULT false, p_conflict_reason text DEFAULT NULL::text, p_override_prerequisites boolean DEFAULT false)
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_enroll_student_section(uuid,uuid,boolean,text,boolean) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_enroll_student_section(uuid,uuid,boolean,text,boolean) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_enroll_student_section(uuid,uuid,boolean,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_enroll_student_section(uuid,uuid,boolean,text,boolean) TO service_role;

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
                'saved_answer', (
                    SELECT jsonb_build_object(
                        'answer_text', sa.answer_text,
                        'choice_id',   sa.choice_id
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_get_assessment_questions_for_student(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_assessment_questions_for_student(uuid,uuid,uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_get_assessment_questions_for_student(uuid,uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_insert_announcement_attachments(p_announcement_id uuid, p_attachments jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.announcement_attachments (announcement_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_announcement_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_insert_announcement_attachments(uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_insert_announcement_attachments(uuid,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_insert_announcement_attachments(uuid,jsonb) TO postgres;

CREATE OR REPLACE FUNCTION public.fn_insert_discussion_attachments(p_thread_id uuid, p_post_id uuid, p_attachments jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.discussion_attachments (thread_id, post_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_thread_id,
        p_post_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_insert_discussion_attachments(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_insert_discussion_attachments(uuid,uuid,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_insert_discussion_attachments(uuid,uuid,jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_insert_discussion_attachments(uuid,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_insert_event_attachments(p_event_id uuid, p_attachments jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
        RETURN;
    END IF;

    INSERT INTO public.event_attachments (event_id, file_name, file_path, mime_type, file_size)
    SELECT
        p_event_id,
        NULLIF(btrim(a ->> 'file_name'), ''),
        NULLIF(btrim(a ->> 'file_path'), ''),
        NULLIF(btrim(a ->> 'mime_type'), ''),
        NULLIF(a ->> 'file_size', '')::BIGINT
    FROM jsonb_array_elements(p_attachments) AS a
    WHERE NULLIF(btrim(a ->> 'file_path'), '') IS NOT NULL;
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_insert_event_attachments(uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_insert_event_attachments(uuid,jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_insert_event_attachments(uuid,jsonb) TO postgres;

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
                'id',         gp.id,
                'name',       gp.name,
                'sequence',   gp.sequence,
                'weight',     gp.weight,
                'start_date', gp.start_date,
                'end_date',   gp.end_date
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
$function$
;
REVOKE ALL ON FUNCTION public.fn_list_grading_periods_by_section(uuid) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_grading_periods_by_section(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_grading_periods_by_section(uuid) TO authenticated;

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
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.last_name ASC, u.first_name ASC');
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_list_section_students(uuid,integer,integer,text,jsonb) FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_section_students(uuid,integer,integer,text,jsonb) TO postgres;
GRANT EXECUTE ON FUNCTION public.fn_list_section_students(uuid,integer,integer,text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sweep_expired_assessment_sessions()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_swept_count INTEGER := 0;
    v_swept_ids UUID[];
BEGIN
    WITH expired_subs AS (
        UPDATE public.assessment_submissions
        SET status = 'Submitted',
            submitted_at = time_limit_expires_at,
            updated_at = now()
        WHERE status = 'In Progress'
        AND time_limit_expires_at IS NOT NULL
        AND time_limit_expires_at < now()
        AND deleted_at IS NULL
        RETURNING id
    )
    SELECT COUNT(*), COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_swept_count, v_swept_ids FROM expired_subs;

    PERFORM public.fn_autograde_submission(sid) FROM unnest(v_swept_ids) AS sid;

    UPDATE public.assessment_timer_sessions
    SET status = 'Expired',
        updated_at = now()
    WHERE status = 'Active'
    AND server_expires_at IS NOT NULL
    AND server_expires_at < now()
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'swept_count', v_swept_count,
        'message', 'Swept expired assessment sessions.'
    );
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_sweep_expired_assessment_sessions() FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_sweep_expired_assessment_sessions() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_sweep_expired_assessment_sessions() TO postgres;

CREATE OR REPLACE FUNCTION public.fn_sweep_special_grade_flags()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_target       RECORD;
    v_result       JSONB;
    v_created      INTEGER := 0;
    v_superseded   INTEGER := 0;
    v_sections     INTEGER := 0;
    v_notified     INTEGER := 0;
BEGIN
    -- Nothing to detect if no rule is switched on for auto-detection.
    IF NOT EXISTS (
        SELECT 1 FROM public.special_grade_configs
        WHERE deleted_at IS NULL AND is_active AND is_auto_detected
    ) THEN
        RETURN jsonb_build_object('success', true, 'sections', 0, 'created', 0);
    END IF;

    FOR v_target IN
        SELECT s.id AS section_id, s.faculty_id, s.section_code, gp.id AS grading_period_id
        FROM public.sections s
        INNER JOIN public.terms t
            ON t.id = s.term_id
            AND t.deleted_at IS NULL
            AND t.status IN ('Ongoing', 'Grading Period')
        INNER JOIN public.grading_periods gp
            ON gp.term_id = t.id
            AND gp.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
    LOOP
        v_result := public.fn_detect_special_grade_flags_core(
            v_target.section_id, v_target.grading_period_id
        );

        v_sections   := v_sections + 1;
        v_created    := v_created + COALESCE((v_result->>'created')::INTEGER, 0);
        v_superseded := v_superseded + COALESCE((v_result->>'superseded')::INTEGER, 0);

        -- Only new detections are worth a notification; refreshing evidence on
        -- an already-open flag must not re-ping faculty every 15 minutes.
        IF COALESCE((v_result->>'created')::INTEGER, 0) > 0
           AND v_target.faculty_id IS NOT NULL THEN
            -- Inserted directly rather than through fn_notify_user so the
            -- category lands atomically; that helper cannot set one.
            INSERT INTO public.notifications (
                user_id, title, message, action_url, notification_type
            ) VALUES (
                v_target.faculty_id,
                'Special grade review needed',
                (v_result->>'created') || ' student(s) in ' || v_target.section_code
                    || ' now meet the conditions for a special grade. Review and apply or dismiss.',
                '/faculty/sections/' || v_target.section_id::TEXT,
                'Grade'
            );

            v_notified := v_notified + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',    true,
        'sections',   v_sections,
        'created',    v_created,
        'superseded', v_superseded,
        'notified',   v_notified
    );
END;
$function$
;
REVOKE ALL ON FUNCTION public.fn_sweep_special_grade_flags() FROM PUBLIC, anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.fn_sweep_special_grade_flags() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_sweep_special_grade_flags() TO postgres;

COMMIT;
