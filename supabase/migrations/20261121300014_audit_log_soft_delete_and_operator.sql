-- ====================================================================
-- Migration: 20261121300014_audit_log_soft_delete_and_operator.sql
-- Audit 2026-11-21 (Tier 4 audit log):
--   * fn_capture_audit_log: a soft delete (deleted_at going from empty to set) was logged as
--     an update (e.g. DEPARTMENT_UPDATED). It is now logged with the delete event of that table
--     (DEPARTMENT_DELETED, COURSE_DELETED, ...; other tables <TABLE>_DELETE) and action DELETE,
--     keeping old and new data.
--   * fn_list_audit_logs_json: the Operator filter matched part of a name (Ana matched Mariana);
--     it now matches the chosen operator exactly.
-- Idempotent: CREATE OR REPLACE only. Signatures and return shapes unchanged.
-- ====================================================================
BEGIN;

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
    -- A soft delete (deleted_at set) is recorded as a delete, not an update
    v_op TEXT := TG_OP;
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

            IF (v_old_data->>'deleted_at') IS NULL AND (v_new_data->>'deleted_at') IS NOT NULL THEN
                v_op := 'DELETE';
            END IF;
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

            IF NOT FOUND THEN
                v_user_id := NULL;
                v_user_name := 'System';
            END IF;
        END IF;

        -- Explicit transactional event mappings aligned with Master Defense Walkthrough
        IF v_table = 'users' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'USER_PROVISIONED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'USER_UPDATED';
            ELSE v_event_name := 'USER_DELETED'; END IF;
        ELSIF v_table = 'departments' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'DEPARTMENT_CREATED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'DEPARTMENT_UPDATED';
            ELSE v_event_name := 'DEPARTMENT_DELETED'; END IF;
        ELSIF v_table = 'school_years' THEN
            IF TG_OP = 'INSERT' OR v_op = 'UPDATE' THEN v_event_name := 'SCHOOL_YEAR_SAVED';
            ELSE v_event_name := 'SCHOOL_YEAR_DELETED'; END IF;
        ELSIF v_table = 'announcements' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'ANNOUNCEMENT_PUBLISHED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'ANNOUNCEMENT_UPDATED';
            ELSE v_event_name := 'ANNOUNCEMENT_DELETED'; END IF;
        ELSIF v_table = 'events' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'EVENT_CREATED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'EVENT_UPDATED';
            ELSE v_event_name := 'EVENT_DELETED'; END IF;
        ELSIF v_table = 'courses' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'COURSE_CREATED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'COURSE_UPDATED';
            ELSE v_event_name := 'COURSE_DELETED'; END IF;
        ELSIF v_table = 'sections' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'SECTION_CREATED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'SECTION_UPDATED';
            ELSE v_event_name := 'SECTION_DELETED'; END IF;
        ELSIF v_table = 'programs' THEN
            IF TG_OP = 'INSERT' THEN v_event_name := 'PROGRAM_CREATED';
            ELSIF v_op = 'UPDATE' THEN v_event_name := 'PROGRAM_UPDATED';
            ELSE v_event_name := 'PROGRAM_DELETED'; END IF;
        ELSIF v_table = 'evaluation_templates' THEN
            IF TG_OP = 'INSERT' OR v_op = 'UPDATE' THEN v_event_name := 'EVALUATION_TEMPLATE_SAVED';
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
            v_event_name := UPPER(v_table) || '_' || v_op;
        END IF;

        -- Tables whose mapping has no delete branch still get a *_DELETED event for a soft delete
        IF v_op = 'DELETE' AND TG_OP = 'UPDATE' AND v_event_name !~ '_DELETED?$' THEN
            v_event_name := regexp_replace(v_event_name, '_[A-Z]+$', '') || '_DELETED';
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
            v_op,
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

CREATE OR REPLACE FUNCTION public.fn_list_audit_logs_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_action text DEFAULT NULL::text, p_table_name text DEFAULT NULL::text, p_event_name text DEFAULT NULL::text, p_changed_by text DEFAULT NULL::text, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_where_clause TEXT := 'WHERE 1=1';
    v_base_query   TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (al.event_name ILIKE %L
                OR al.table_name ILIKE %L
                OR al.changed_by_name ILIKE %L
                OR al.description ILIKE %L
                OR al.action ILIKE %L
                OR al.record_id ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_action IS NOT NULL AND p_action <> 'All' AND p_action <> '' THEN
        v_where_clause := v_where_clause || format(' AND UPPER(al.action) = UPPER(%L)', p_action);
    END IF;

    IF p_table_name IS NOT NULL AND p_table_name <> 'All' AND p_table_name <> '' THEN
        v_where_clause := v_where_clause || format(' AND al.table_name = %L', p_table_name);
    END IF;

    IF p_event_name IS NOT NULL AND p_event_name <> 'All' AND p_event_name <> '' THEN
        v_where_clause := v_where_clause || format(' AND al.event_name = %L', p_event_name);
    END IF;

    IF p_changed_by IS NOT NULL AND p_changed_by <> 'All' AND p_changed_by <> '' THEN
        v_where_clause := v_where_clause || format(' AND al.changed_by_name = %L', p_changed_by);
    END IF;

    IF p_date_from IS NOT NULL THEN
        -- A day starts at midnight Manila time, not midnight UTC
        v_where_clause := v_where_clause || format(' AND al.created_at >= (%L::DATE::TIMESTAMP AT TIME ZONE ''Asia/Manila'')', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND al.created_at < ((%L::DATE + 1)::TIMESTAMP AT TIME ZONE ''Asia/Manila'')', p_date_to);
    END IF;

    v_base_query := format(
        'SELECT
            al.id,
            al.action,
            al.event_name,
            al.table_name,
            al.record_id,
            al.old_data,
            al.new_data,
            al.changed_fields,
            al.changed_by,
            COALESCE(al.changed_by_name, ''System'') AS changed_by_name,
            al.description,
            al.created_at AS changed_at,
            al.created_at,
            COUNT(*) OVER () AS total_count
        FROM public.audit_logs al
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'al.created_at DESC');
END;
$function$;

COMMIT;
