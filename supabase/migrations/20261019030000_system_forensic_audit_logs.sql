-- Migration: 20261019030000_system_forensic_audit_logs.sql
-- Description: System-wide Forensic Audit Trail, JSON Payload Inspector, and Filtering Engine

-- 1. Create centralized audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    event_name TEXT NOT NULL, -- 'USER_PROVISIONED', 'DEPARTMENT_CREATED', 'SCHOOL_YEAR_SAVED', 'ANNOUNCEMENT_PUBLISHED', etc.
    table_name TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_fields JSONB,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    changed_by_name TEXT,
    ip_address INET,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_name ON public.audit_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON public.audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);

-- Enable RLS and setup policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
    CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
        FOR SELECT TO authenticated USING (
            EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid() AND r.code = 'Admin' AND ur.deleted_at IS NULL
            )
        );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "audit_logs_service_all" ON public.audit_logs;
    CREATE POLICY "audit_logs_service_all" ON public.audit_logs
        FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

GRANT ALL ON public.audit_logs TO authenticated, service_role;

-- 2. Trigger function to capture system audits automatically
CREATE OR REPLACE FUNCTION public.fn_capture_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3. Attach audit triggers to core operational tables
DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_departments ON public.departments;
CREATE TRIGGER trg_audit_departments AFTER INSERT OR UPDATE OR DELETE ON public.departments FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_school_years ON public.school_years;
CREATE TRIGGER trg_audit_school_years AFTER INSERT OR UPDATE OR DELETE ON public.school_years FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_announcements ON public.announcements;
CREATE TRIGGER trg_audit_announcements AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_events ON public.events;
CREATE TRIGGER trg_audit_events AFTER INSERT OR UPDATE OR DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_courses ON public.courses;
CREATE TRIGGER trg_audit_courses AFTER INSERT OR UPDATE OR DELETE ON public.courses FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_sections ON public.sections;
CREATE TRIGGER trg_audit_sections AFTER INSERT OR UPDATE OR DELETE ON public.sections FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_programs ON public.programs;
CREATE TRIGGER trg_audit_programs AFTER INSERT OR UPDATE OR DELETE ON public.programs FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_evaluation_templates ON public.evaluation_templates;
CREATE TRIGGER trg_audit_evaluation_templates AFTER INSERT OR UPDATE OR DELETE ON public.evaluation_templates FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_system_settings ON public.system_settings;
CREATE TRIGGER trg_audit_system_settings AFTER UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_section_final_grades ON public.section_final_grades;
CREATE TRIGGER trg_audit_section_final_grades AFTER INSERT OR UPDATE OR DELETE ON public.section_final_grades FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_enrollments ON public.enrollments;
CREATE TRIGGER trg_audit_enrollments AFTER INSERT OR UPDATE OR DELETE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_grading_periods ON public.grading_periods;
CREATE TRIGGER trg_audit_grading_periods AFTER INSERT OR UPDATE OR DELETE ON public.grading_periods FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_grading_components ON public.grading_components;
CREATE TRIGGER trg_audit_grading_components AFTER INSERT OR UPDATE OR DELETE ON public.grading_components FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_assessment_items ON public.assessment_items;
CREATE TRIGGER trg_audit_assessment_items AFTER INSERT OR UPDATE OR DELETE ON public.assessment_items FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

DROP TRIGGER IF EXISTS trg_audit_assessment_submissions ON public.assessment_submissions;
CREATE TRIGGER trg_audit_assessment_submissions AFTER INSERT OR UPDATE OR DELETE ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION fn_capture_audit_log();

-- 4. Seed initial forensic audit records from current database state so transactions are immediately visible
INSERT INTO public.audit_logs (
    action, event_name, table_name, record_id, new_data, changed_by, changed_by_name, description, created_at
)
SELECT
    'INSERT',
    'USER_PROVISIONED',
    'users',
    u.id::text,
    to_jsonb(u),
    u.created_by,
    COALESCE(admin_u.first_name || ' ' || admin_u.last_name, 'Admin Master'),
    'USER_PROVISIONED: ' || COALESCE(u.email, u.first_name || ' ' || u.last_name),
    u.created_at
FROM public.users u
LEFT JOIN public.users admin_u ON admin_u.id = u.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al WHERE al.record_id = u.id::text AND al.event_name = 'USER_PROVISIONED'
);

INSERT INTO public.audit_logs (
    action, event_name, table_name, record_id, new_data, changed_by, changed_by_name, description, created_at
)
SELECT
    'INSERT',
    'DEPARTMENT_CREATED',
    'departments',
    d.id::text,
    to_jsonb(d),
    d.created_by,
    COALESCE(admin_u.first_name || ' ' || admin_u.last_name, 'Admin Master'),
    'DEPARTMENT_CREATED: ' || d.name,
    d.created_at
FROM public.departments d
LEFT JOIN public.users admin_u ON admin_u.id = d.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al WHERE al.record_id = d.id::text AND al.event_name = 'DEPARTMENT_CREATED'
);

INSERT INTO public.audit_logs (
    action, event_name, table_name, record_id, new_data, changed_by, changed_by_name, description, created_at
)
SELECT
    'INSERT',
    'SCHOOL_YEAR_SAVED',
    'school_years',
    sy.id::text,
    to_jsonb(sy),
    sy.created_by,
    COALESCE(admin_u.first_name || ' ' || admin_u.last_name, 'Admin Master'),
    'SCHOOL_YEAR_SAVED: ' || sy.label,
    sy.created_at
FROM public.school_years sy
LEFT JOIN public.users admin_u ON admin_u.id = sy.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al WHERE al.record_id = sy.id::text AND al.event_name = 'SCHOOL_YEAR_SAVED'
);

INSERT INTO public.audit_logs (
    action, event_name, table_name, record_id, new_data, changed_by, changed_by_name, description, created_at
)
SELECT
    'INSERT',
    'ANNOUNCEMENT_PUBLISHED',
    'announcements',
    a.id::text,
    to_jsonb(a),
    a.created_by,
    COALESCE(admin_u.first_name || ' ' || admin_u.last_name, 'Admin Master'),
    'ANNOUNCEMENT_PUBLISHED: ' || a.title,
    a.created_at
FROM public.announcements a
LEFT JOIN public.users admin_u ON admin_u.id = a.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al WHERE al.record_id = a.id::text AND al.event_name = 'ANNOUNCEMENT_PUBLISHED'
);

INSERT INTO public.audit_logs (
    action, event_name, table_name, record_id, new_data, changed_by, changed_by_name, description, created_at
)
SELECT
    'INSERT',
    'EVENT_CREATED',
    'events',
    e.id::text,
    to_jsonb(e),
    e.created_by,
    COALESCE(admin_u.first_name || ' ' || admin_u.last_name, 'Admin Master'),
    'EVENT_CREATED: ' || e.title,
    e.created_at
FROM public.events e
LEFT JOIN public.users admin_u ON admin_u.id = e.created_by
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al WHERE al.record_id = e.id::text AND al.event_name = 'EVENT_CREATED'
);

-- Also import legacy grade audit records into universal forensic audit trail
INSERT INTO public.audit_logs (
    action, event_name, table_name, record_id, old_data, new_data, changed_by, changed_by_name, description, created_at
)
SELECT
    UPPER(gal.action::text),
    'GRADE_AUDIT',
    gal.table_name,
    gal.record_id::text,
    jsonb_build_object(gal.field_changed, gal.old_value),
    jsonb_build_object(gal.field_changed, gal.new_value),
    gal.changed_by,
    COALESCE(u.first_name || ' ' || u.last_name, 'System'),
    COALESCE(gal.change_reason, 'Grade field changed: ' || gal.field_changed),
    gal.changed_at
FROM public.grade_audit_logs gal
LEFT JOIN public.users u ON u.id = gal.changed_by
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al WHERE al.record_id = gal.record_id::text AND al.event_name = 'GRADE_AUDIT' AND al.created_at = gal.changed_at
);

-- 5. RPC: fn_list_audit_logs_json
CREATE OR REPLACE FUNCTION public.fn_list_audit_logs_json(
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 20,
    p_search text DEFAULT NULL::text,
    p_sort jsonb DEFAULT NULL::jsonb,
    p_action text DEFAULT NULL::text,
    p_table_name text DEFAULT NULL::text,
    p_event_name text DEFAULT NULL::text,
    p_changed_by text DEFAULT NULL::text,
    p_date_from date DEFAULT NULL::date,
    p_date_to date DEFAULT NULL::date
)
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
        v_where_clause := v_where_clause || format(' AND al.changed_by_name ILIKE %L', '%' || p_changed_by || '%');
    END IF;

    IF p_date_from IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND al.created_at >= %L::TIMESTAMPTZ', p_date_from);
    END IF;

    IF p_date_to IS NOT NULL THEN
        v_where_clause := v_where_clause || format(' AND al.created_at < (%L::DATE + 1)::TIMESTAMPTZ', p_date_to);
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

-- 6. RPC: fn_get_audit_log_filters (returns options for every filterable dimension)
CREATE OR REPLACE FUNCTION public.fn_get_audit_log_filters()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_tables JSONB;
    v_events JSONB;
    v_operators JSONB;
    v_actions JSONB;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    SELECT COALESCE(jsonb_agg(jsonb_build_object('label', t.table_name, 'value', t.table_name) ORDER BY t.table_name), '[]'::JSONB)
    INTO v_tables
    FROM (SELECT DISTINCT table_name FROM public.audit_logs WHERE table_name IS NOT NULL) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('label', e.event_name, 'value', e.event_name) ORDER BY e.event_name), '[]'::JSONB)
    INTO v_events
    FROM (SELECT DISTINCT event_name FROM public.audit_logs WHERE event_name IS NOT NULL) e;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('label', o.changed_by_name, 'value', o.changed_by_name) ORDER BY o.changed_by_name), '[]'::JSONB)
    INTO v_operators
    FROM (SELECT DISTINCT changed_by_name FROM public.audit_logs WHERE changed_by_name IS NOT NULL) o;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('label', a.action, 'value', a.action) ORDER BY a.action), '[]'::JSONB)
    INTO v_actions
    FROM (SELECT DISTINCT action FROM public.audit_logs WHERE action IS NOT NULL) a;

    RETURN jsonb_build_object(
        'tables', v_tables,
        'events', v_events,
        'operators', v_operators,
        'actions', v_actions
    );
END;
$function$;

-- 7. Update fn_get_audit_log_tables to pull from audit_logs
CREATE OR REPLACE FUNCTION public.fn_get_audit_log_tables()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    PERFORM public.fn_assert_role('Admin');

    RETURN (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('label', t.table_name, 'value', t.table_name) ORDER BY t.table_name), '[]'::JSONB)
        FROM (
            SELECT DISTINCT table_name
            FROM public.audit_logs
            WHERE table_name IS NOT NULL
        ) t
    );
END;
$function$;
