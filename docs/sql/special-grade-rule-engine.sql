-- ============================================================================
-- Special Grade Rule Engine
-- ============================================================================
-- Turns special_grade_configs from an inert policy dictionary into a live rule
-- engine. Admins compose conditions over a fixed vocabulary of measurable
-- signals; the system detects matching students, records a flag with the
-- evidence that triggered it, and notifies faculty to apply the mark.
--
-- Design constraints:
--   * Advisory only. Detection proposes; a human applies. Nothing here ever
--     writes section_final_grades.special_grade without an explicit RPC call
--     made by an authenticated staff member.
--   * No dynamic SQL. Conditions are a typed JSONB tree walked by a recursive
--     function, so an admin-authored rule can never become executable code.
--   * Versioned. A flag snapshots the rule that produced it, so editing a
--     threshold never retroactively reinterprets grades already applied.
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. SCHEMA
-- ----------------------------------------------------------------------------

ALTER TABLE public.special_grade_configs
    ADD COLUMN IF NOT EXISTS conditions       JSONB    NOT NULL DEFAULT '{"all": []}'::jsonb,
    ADD COLUMN IF NOT EXISTS priority         SMALLINT NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS is_auto_detected BOOLEAN  NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS rule_version     INTEGER  NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.special_grade_configs.conditions IS
    'Condition tree: {"all"|"any": [node]} | {"not": node} | {"signal","op","value"}. Empty group never fires.';
COMMENT ON COLUMN public.special_grade_configs.priority IS
    'Lower value wins when several rules match the same student.';
COMMENT ON COLUMN public.special_grade_configs.min_absence_percentage IS
    'LEGACY. Superseded by conditions; backfilled into the absence_rate leaf. No longer read by the engine.';

DO $$ BEGIN
    CREATE TYPE public.special_grade_flag_status_type AS ENUM
        ('Pending', 'Applied', 'Dismissed', 'Superseded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.special_grade_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    special_grade_config_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    status public.special_grade_flag_status_type DEFAULT 'Pending'::public.special_grade_flag_status_type NOT NULL,
    rule_version integer NOT NULL,
    rule_snapshot jsonb NOT NULL,
    evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT special_grade_flags_pkey PRIMARY KEY (id)
);

DO $$ BEGIN
    ALTER TABLE public.special_grade_flags ADD CONSTRAINT special_grade_flags_config_id_fkey
        FOREIGN KEY (special_grade_config_id) REFERENCES special_grade_configs(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.special_grade_flags ADD CONSTRAINT special_grade_flags_enrollment_id_fkey
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.special_grade_flags ADD CONSTRAINT special_grade_flags_grading_period_id_fkey
        FOREIGN KEY (grading_period_id) REFERENCES grading_periods(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_special_grade_flags_scope
    ON public.special_grade_flags (enrollment_id, grading_period_id, special_grade_config_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_special_grade_flags_period_status
    ON public.special_grade_flags (grading_period_id, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_special_grade_flags_enrollment
    ON public.special_grade_flags (enrollment_id)
    WHERE deleted_at IS NULL;

ALTER TABLE public.special_grade_flags ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_special_grade_flags_updated_audit ON public.special_grade_flags;
CREATE TRIGGER trg_special_grade_flags_updated_audit
    BEFORE UPDATE ON public.special_grade_flags
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_audit();

-- Read-only to section staff and academic leadership. Every write goes through
-- a SECURITY DEFINER RPC below, so no INSERT/UPDATE policy is granted.
DROP POLICY IF EXISTS "special_grade_flags_select" ON public.special_grade_flags;
CREATE POLICY "special_grade_flags_select" ON public.special_grade_flags
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
            OR EXISTS (
                SELECT 1
                FROM public.enrollments e
                INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
                WHERE e.id = special_grade_flags.enrollment_id
                  AND e.deleted_at IS NULL
                  AND s.faculty_id = auth.uid()
            )
        )
    );


-- ----------------------------------------------------------------------------
-- 2. BACKFILL: min_absence_percentage -> conditions
-- ----------------------------------------------------------------------------
-- Only touches rows still carrying the default empty group, so re-running this
-- file never clobbers conditions an admin has since authored.
--
-- Detection is deliberately NOT switched on here. A migration that silently
-- starts flagging students -- and, with the approval gate, silently starts
-- blocking grade submission -- is exactly the "advisory, never silent" failure
-- this engine exists to avoid. The threshold is translated so an admin can see
-- it in the builder; turning it on stays a human decision.

UPDATE public.special_grade_configs
SET conditions = jsonb_build_object(
        'all', jsonb_build_array(
            jsonb_build_object(
                'signal', 'absence_rate',
                'op',     '>=',
                'value',  min_absence_percentage
            )
        )
    )
WHERE deleted_at IS NULL
  AND min_absence_percentage IS NOT NULL
  AND min_absence_percentage > 0
  AND conditions = '{"all": []}'::jsonb;


-- ----------------------------------------------------------------------------
-- 3. SIGNAL REGISTRY
-- ----------------------------------------------------------------------------
-- One row per enrollment, one key per signal. This is the extension seam:
-- adding a new measurable fact means adding a key here plus a matching entry in
-- src/constants/special-grade-signals.constant.ts. Nothing else changes.
--
-- Attendance signals are term-to-date, not period-scoped -- absences accumulate
-- across a term, which is the correct semantics for DRP/FDA style policies.

CREATE OR REPLACE FUNCTION public.fn_special_grade_signals(p_enrollment_ids uuid[])
RETURNS TABLE(enrollment_id uuid, signals jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
    WITH targets AS (
        SELECT e.id AS enrollment_id, e.section_id
        FROM public.enrollments e
        WHERE e.id = ANY (p_enrollment_ids)
          AND e.deleted_at IS NULL
    ),
    engagement AS (
        SELECT * FROM public.fn_analytics_engagement(p_enrollment_ids)
    ),
    due_items AS (
        SELECT
            t.enrollment_id,
            ai.assessment_type,
            EXISTS (
                SELECT 1
                FROM public.assessment_submissions sub
                WHERE sub.assessment_item_id = ai.id
                  AND sub.enrollment_id      = t.enrollment_id
                  AND sub.deleted_at         IS NULL
                  AND sub.status IN ('Submitted', 'Late', 'Graded', 'Returned')
            ) AS has_submission
        FROM targets t
        INNER JOIN public.assessment_items ai
            ON ai.section_id = t.section_id
            AND ai.deleted_at IS NULL
            AND ai.is_published
            AND ai.due_at IS NOT NULL
            AND ai.due_at < now()
    ),
    missing AS (
        SELECT
            t.enrollment_id,
            COUNT(*) FILTER (WHERE NOT d.has_submission)::INTEGER AS missing_assessment_count,
            COUNT(*) FILTER (WHERE NOT d.has_submission AND d.assessment_type = 'Quiz')::INTEGER AS missing_quiz_count,
            COUNT(*) FILTER (WHERE NOT d.has_submission AND d.assessment_type = 'Exam')::INTEGER AS missing_exam_count,
            COUNT(*) FILTER (WHERE NOT d.has_submission AND d.assessment_type = 'Activity')::INTEGER AS missing_activity_count,
            COUNT(*) FILTER (WHERE NOT d.has_submission AND d.assessment_type = 'Assignment')::INTEGER AS missing_assignment_count,
            COUNT(*) FILTER (WHERE NOT d.has_submission AND d.assessment_type = 'Project')::INTEGER AS missing_project_count,
            COUNT(*) FILTER (WHERE NOT d.has_submission AND d.assessment_type = 'Lab Report')::INTEGER AS missing_lab_report_count
        FROM targets t
        LEFT JOIN due_items d ON d.enrollment_id = t.enrollment_id
        GROUP BY t.enrollment_id
    )
    SELECT
        t.enrollment_id,
        jsonb_build_object(
            'sessions_total',           COALESCE(en.sessions_total, 0),
            'present_count',            COALESCE(en.present_count, 0),
            'absent_count',             COALESCE(en.absent_count, 0),
            'late_count',               COALESCE(en.late_count, 0),
            'excused_count',            COALESCE(en.excused_count, 0),
            'attendance_rate',          en.attendance_rate,
            'absence_rate',
                CASE WHEN COALESCE(en.sessions_total, 0) = 0 THEN NULL
                     ELSE ROUND(en.absent_count::NUMERIC / en.sessions_total * 100, 2) END,
            'excused_rate',
                CASE WHEN COALESCE(en.sessions_total, 0) = 0 THEN NULL
                     ELSE ROUND(en.excused_count::NUMERIC / en.sessions_total * 100, 2) END,
            'missing_assessment_count', COALESCE(m.missing_assessment_count, 0),
            'missing_quiz_count',       COALESCE(m.missing_quiz_count, 0),
            'missing_exam_count',       COALESCE(m.missing_exam_count, 0),
            'missing_activity_count',   COALESCE(m.missing_activity_count, 0),
            'missing_assignment_count', COALESCE(m.missing_assignment_count, 0),
            'missing_project_count',    COALESCE(m.missing_project_count, 0),
            'missing_lab_report_count', COALESCE(m.missing_lab_report_count, 0)
        ) AS signals
    FROM targets t
    LEFT JOIN engagement en ON en.enrollment_id = t.enrollment_id
    LEFT JOIN missing m     ON m.enrollment_id  = t.enrollment_id;
$fn$;


-- ----------------------------------------------------------------------------
-- 4. EVALUATOR
-- ----------------------------------------------------------------------------
-- Walks the condition tree. Pure JSONB -- no dynamic SQL, no expression
-- parsing. Fails closed: an unknown signal, a malformed node, or a value that
-- will not cast is false, never true.

CREATE OR REPLACE FUNCTION public.fn_eval_special_grade_condition(p_node jsonb, p_signals jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
    v_child  JSONB;
    v_signal TEXT;
    v_op     TEXT;
    v_value  JSONB;
    v_actual NUMERIC;
    v_lo     NUMERIC;
    v_hi     NUMERIC;
BEGIN
    IF p_node IS NULL OR jsonb_typeof(p_node) <> 'object' THEN
        RETURN false;
    END IF;

    -- An empty group never fires, so a rule with no conditions is manual-only.
    IF jsonb_exists(p_node, 'all') THEN
        IF jsonb_typeof(p_node->'all') <> 'array' OR jsonb_array_length(p_node->'all') = 0 THEN
            RETURN false;
        END IF;
        FOR v_child IN SELECT * FROM jsonb_array_elements(p_node->'all') LOOP
            IF NOT public.fn_eval_special_grade_condition(v_child, p_signals) THEN
                RETURN false;
            END IF;
        END LOOP;
        RETURN true;
    END IF;

    IF jsonb_exists(p_node, 'any') THEN
        IF jsonb_typeof(p_node->'any') <> 'array' OR jsonb_array_length(p_node->'any') = 0 THEN
            RETURN false;
        END IF;
        FOR v_child IN SELECT * FROM jsonb_array_elements(p_node->'any') LOOP
            IF public.fn_eval_special_grade_condition(v_child, p_signals) THEN
                RETURN true;
            END IF;
        END LOOP;
        RETURN false;
    END IF;

    IF jsonb_exists(p_node, 'not') THEN
        RETURN NOT public.fn_eval_special_grade_condition(p_node->'not', p_signals);
    END IF;

    v_signal := p_node->>'signal';
    v_op     := p_node->>'op';
    v_value  := p_node->'value';

    IF v_signal IS NULL OR v_op IS NULL THEN
        RETURN false;
    END IF;

    IF NOT jsonb_exists(p_signals, v_signal) THEN
        RETURN false;
    END IF;

    IF v_op = 'is_null' THEN
        RETURN jsonb_typeof(p_signals->v_signal) = 'null';
    END IF;

    IF v_op = 'not_null' THEN
        RETURN jsonb_typeof(p_signals->v_signal) <> 'null';
    END IF;

    IF jsonb_typeof(p_signals->v_signal) = 'null' THEN
        RETURN false;
    END IF;

    BEGIN
        v_actual := (p_signals->>v_signal)::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    IF v_op = 'between' THEN
        IF jsonb_typeof(v_value) <> 'array' OR jsonb_array_length(v_value) <> 2 THEN
            RETURN false;
        END IF;
        BEGIN
            v_lo := (v_value->>0)::NUMERIC;
            v_hi := (v_value->>1)::NUMERIC;
        EXCEPTION WHEN OTHERS THEN
            RETURN false;
        END;
        RETURN v_actual >= v_lo AND v_actual <= v_hi;
    END IF;

    BEGIN
        v_lo := (v_value #>> '{}')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
        RETURN false;
    END;

    IF v_lo IS NULL THEN
        RETURN false;
    END IF;

    RETURN CASE v_op
        WHEN '>='  THEN v_actual >= v_lo
        WHEN '>'   THEN v_actual >  v_lo
        WHEN '<='  THEN v_actual <= v_lo
        WHEN '<'   THEN v_actual <  v_lo
        WHEN '='   THEN v_actual =  v_lo
        WHEN '!='  THEN v_actual <> v_lo
        ELSE false
    END;
END;
$fn$;


-- Flattens the tree into a per-leaf audit trail: what was tested, what the
-- student's actual value was, and whether that leaf matched. This is what makes
-- a flag explainable to the student it concerns.
CREATE OR REPLACE FUNCTION public.fn_special_grade_evidence(p_node jsonb, p_signals jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
    v_child JSONB;
    v_key   TEXT;
    v_out   JSONB := '[]'::jsonb;
BEGIN
    IF p_node IS NULL OR jsonb_typeof(p_node) <> 'object' THEN
        RETURN v_out;
    END IF;

    FOREACH v_key IN ARRAY ARRAY['all', 'any'] LOOP
        IF jsonb_exists(p_node, v_key) AND jsonb_typeof(p_node->v_key) = 'array' THEN
            FOR v_child IN SELECT * FROM jsonb_array_elements(p_node->v_key) LOOP
                v_out := v_out || public.fn_special_grade_evidence(v_child, p_signals);
            END LOOP;
            RETURN v_out;
        END IF;
    END LOOP;

    IF jsonb_exists(p_node, 'not') THEN
        RETURN public.fn_special_grade_evidence(p_node->'not', p_signals);
    END IF;

    IF p_node->>'signal' IS NULL THEN
        RETURN v_out;
    END IF;

    RETURN jsonb_build_array(jsonb_build_object(
        'signal',  p_node->>'signal',
        'op',      p_node->>'op',
        'value',   p_node->'value',
        'actual',  COALESCE(p_signals->(p_node->>'signal'), 'null'::jsonb),
        'known',   jsonb_exists(p_signals, p_node->>'signal'),
        'matched', public.fn_eval_special_grade_condition(p_node, p_signals)
    ));
END;
$fn$;


-- ----------------------------------------------------------------------------
-- 5. DETECTION
-- ----------------------------------------------------------------------------
-- The core carries no authorization guard so the pg_cron sweep (which runs with
-- no auth.uid()) can call it. Every caller reachable from the API goes through
-- fn_detect_special_grade_flags, which asserts section staff first.

CREATE OR REPLACE FUNCTION public.fn_detect_special_grade_flags_core(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_enrollment_ids  UUID[];
    v_sig             RECORD;
    v_rule            RECORD;
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
            v_matched := public.fn_eval_special_grade_condition(v_rule.conditions, v_sig.signals);

            SELECT f.id, f.status::TEXT
            INTO v_existing_id, v_existing_status
            FROM public.special_grade_flags f
            WHERE f.enrollment_id           = v_sig.enrollment_id
              AND f.grading_period_id       = p_grading_period_id
              AND f.special_grade_config_id = v_rule.id
              AND f.deleted_at              IS NULL;

            IF v_matched THEN
                v_evidence := public.fn_special_grade_evidence(v_rule.conditions, v_sig.signals);

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
                            'conditions', v_rule.conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority
                        ),
                        v_evidence
                    );
                    v_created := v_created + 1;

                -- A resolved flag stays resolved. Only an open or previously
                -- superseded flag is refreshed with current evidence.
                ELSIF v_existing_status IN ('Pending', 'Superseded') THEN
                    UPDATE public.special_grade_flags
                    SET status        = 'Pending',
                        rule_version  = v_rule.rule_version,
                        rule_snapshot = jsonb_build_object(
                            'code',       v_rule.code,
                            'label',      v_rule.label,
                            'conditions', v_rule.conditions,
                            'is_passing', v_rule.is_passing,
                            'priority',   v_rule.priority
                        ),
                        evidence      = v_evidence,
                        detected_at   = now()
                    WHERE id = v_existing_id;
                    v_refreshed := v_refreshed + 1;
                END IF;

            ELSIF v_existing_id IS NOT NULL AND v_existing_status = 'Pending' THEN
                -- The student's situation improved (an absence was excused, a
                -- submission landed). Never delete -- the history is evidence.
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
$fn$;


CREATE OR REPLACE FUNCTION public.fn_detect_special_grade_flags(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);
    RETURN public.fn_detect_special_grade_flags_core(p_section_id, p_grading_period_id);
END;
$fn$;


CREATE OR REPLACE FUNCTION public.fn_list_special_grade_flags(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',                f.id,
                'enrollment_id',     f.enrollment_id,
                'grading_period_id', f.grading_period_id,
                'status',            f.status,
                'code',              sgc.code,
                'label',             sgc.label,
                'is_passing',        sgc.is_passing,
                'priority',          sgc.priority,
                'student_number',    st.student_number,
                'full_name',         u.first_name || ' ' || u.last_name,
                'evidence',          f.evidence,
                'detected_at',       f.detected_at,
                'resolved_at',       f.resolved_at,
                'resolution_note',   f.resolution_note
            )
            ORDER BY sgc.priority ASC, u.last_name ASC, u.first_name ASC
        ), '[]'::jsonb)
        FROM public.special_grade_flags f
        INNER JOIN public.special_grade_configs sgc
            ON sgc.id = f.special_grade_config_id AND sgc.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st   ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u       ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE e.section_id        = p_section_id
          AND f.grading_period_id = p_grading_period_id
          AND f.deleted_at        IS NULL
          AND f.status            IN ('Pending', 'Applied', 'Dismissed')
    );
END;
$fn$;


-- ----------------------------------------------------------------------------
-- 6. RESOLUTION
-- ----------------------------------------------------------------------------
-- The only paths that ever write section_final_grades.special_grade. Both
-- require an authenticated staff member and both leave a grade_audit_logs row.

CREATE OR REPLACE FUNCTION public.fn_apply_special_grade_flag(
    p_flag_id uuid,
    p_note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_flag         RECORD;
    v_section_id   UUID;
    v_code         TEXT;
    v_grade_id     UUID;
    v_grade_status TEXT;
    v_old_special  TEXT;
    v_reason       TEXT;
BEGIN
    SELECT f.*, sgc.code AS config_code, e.section_id AS section_id
    INTO v_flag
    FROM public.special_grade_flags f
    INNER JOIN public.special_grade_configs sgc
        ON sgc.id = f.special_grade_config_id AND sgc.deleted_at IS NULL
    INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
    WHERE f.id = p_flag_id
      AND f.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Flag not found.');
    END IF;

    v_section_id := v_flag.section_id;
    v_code       := v_flag.config_code;

    PERFORM public.fn_assert_section_staff(v_section_id);

    IF v_flag.status <> 'Pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This flag is already ' || lower(v_flag.status::TEXT) || '.'
        );
    END IF;

    SELECT sfg.id, sfg.status::TEXT, sfg.special_grade
    INTO v_grade_id, v_grade_status, v_old_special
    FROM public.section_final_grades sfg
    WHERE sfg.enrollment_id     = v_flag.enrollment_id
      AND sfg.grading_period_id = v_flag.grading_period_id
      AND sfg.deleted_at        IS NULL;

    IF v_grade_id IS NOT NULL AND v_grade_status <> 'Draft' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'The grade for this period is already ' || v_grade_status
                    || '. A special grade can only be applied while it is in Draft.'
        );
    END IF;

    v_reason := 'Special grade ' || v_code || ' applied from rule flag ' || p_flag_id::TEXT
             || COALESCE('. Note: ' || NULLIF(btrim(COALESCE(p_note, '')), ''), '');

    IF v_grade_id IS NULL THEN
        -- A student caught by an attendance rule may have no computed grade at
        -- all. The mark itself is what matters: special_grade overrides the
        -- numeric display everywhere and the course is excluded from GWA.
        INSERT INTO public.section_final_grades (
            enrollment_id, grading_period_id, raw_grade, final_grade,
            special_grade, status, remarks, created_by
        ) VALUES (
            v_flag.enrollment_id, v_flag.grading_period_id, 0, 0,
            v_code, 'Draft', v_reason, auth.uid()
        )
        RETURNING id INTO v_grade_id;
    ELSE
        UPDATE public.section_final_grades
        SET special_grade = v_code,
            updated_by    = auth.uid()
        WHERE id = v_grade_id;
    END IF;

    INSERT INTO public.grade_audit_logs (
        action, table_name, record_id, enrollment_id, grading_period_id,
        field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
        'Update', 'section_final_grades', v_grade_id,
        v_flag.enrollment_id, v_flag.grading_period_id,
        'special_grade', v_old_special, v_code, v_reason, auth.uid(), inet_client_addr()
    );

    UPDATE public.special_grade_flags
    SET status          = 'Applied',
        resolved_by     = auth.uid(),
        resolved_at     = now(),
        resolution_note = NULLIF(btrim(COALESCE(p_note, '')), '')
    WHERE id = p_flag_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Applied ' || v_code || '.',
        'code',    v_code,
        'grade_id', v_grade_id
    );
END;
$fn$;


CREATE OR REPLACE FUNCTION public.fn_dismiss_special_grade_flag(
    p_flag_id uuid,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_flag       RECORD;
    v_section_id UUID;
    v_reason     TEXT;
BEGIN
    v_reason := NULLIF(btrim(COALESCE(p_reason, '')), '');

    IF v_reason IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A reason is required to dismiss a special grade flag.'
        );
    END IF;

    SELECT f.*, sgc.code AS config_code, e.section_id AS section_id
    INTO v_flag
    FROM public.special_grade_flags f
    INNER JOIN public.special_grade_configs sgc
        ON sgc.id = f.special_grade_config_id AND sgc.deleted_at IS NULL
    INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
    WHERE f.id = p_flag_id
      AND f.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Flag not found.');
    END IF;

    v_section_id := v_flag.section_id;
    PERFORM public.fn_assert_section_staff(v_section_id);

    IF v_flag.status <> 'Pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This flag is already ' || lower(v_flag.status::TEXT) || '.'
        );
    END IF;

    UPDATE public.special_grade_flags
    SET status          = 'Dismissed',
        resolved_by     = auth.uid(),
        resolved_at     = now(),
        resolution_note = v_reason
    WHERE id = p_flag_id;

    INSERT INTO public.grade_audit_logs (
        action, table_name, record_id, enrollment_id, grading_period_id,
        field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
        'Update', 'special_grade_flags', p_flag_id,
        v_flag.enrollment_id, v_flag.grading_period_id,
        'status', 'Pending', 'Dismissed',
        'Special grade ' || v_flag.config_code || ' dismissed. Reason: ' || v_reason,
        auth.uid(), inet_client_addr()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Flag dismissed.');
END;
$fn$;


-- ----------------------------------------------------------------------------
-- 7. PREVIEW (dry run)
-- ----------------------------------------------------------------------------
-- Lets an admin see who a candidate rule would catch BEFORE saving it. Writes
-- nothing. This is what makes admin-authored rules safe to author.

CREATE OR REPLACE FUNCTION public.fn_preview_special_grade_rule(
    p_conditions jsonb,
    p_term_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_term_id        UUID;
    v_enrollment_ids UUID[];
    v_total          INTEGER := 0;
    v_matched        INTEGER := 0;
    v_sample         JSONB   := '[]'::jsonb;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    v_term_id := COALESCE(p_term_id, public.fn_dashboard_active_term());

    IF v_term_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No active term to preview against.'
        );
    END IF;

    SELECT array_agg(e.id)
    INTO v_enrollment_ids
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE s.term_id  = v_term_id
      AND e.status   = 'Enrolled'
      AND e.deleted_at IS NULL;

    IF v_enrollment_ids IS NULL THEN
        RETURN jsonb_build_object(
            'success', true, 'term_id', v_term_id,
            'total_students', 0, 'matched_count', 0, 'sample', '[]'::jsonb
        );
    END IF;

    v_total := array_length(v_enrollment_ids, 1);

    WITH evaluated AS (
        SELECT
            sig.enrollment_id,
            sig.signals,
            public.fn_eval_special_grade_condition(p_conditions, sig.signals) AS matched
        FROM public.fn_special_grade_signals(v_enrollment_ids) sig
    ),
    hits AS (
        SELECT
            ev.enrollment_id,
            ev.signals,
            st.student_number,
            u.first_name || ' ' || u.last_name AS full_name,
            s.section_code
        FROM evaluated ev
        INNER JOIN public.enrollments e ON e.id = ev.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s    ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.students st   ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u       ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE ev.matched
    ),
    -- Count every match but carry only the first 25 into the sample, so a
    -- deliberately broad rule cannot return thousands of rows to the browser.
    ranked AS (
        SELECT
            h.*,
            ROW_NUMBER() OVER (ORDER BY h.full_name ASC) AS rn,
            COUNT(*)     OVER ()                         AS total_matched
        FROM hits h
    )
    SELECT
        COALESCE(MAX(r.total_matched), 0)::INTEGER,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'enrollment_id',  r.enrollment_id,
                    'student_number', r.student_number,
                    'full_name',      r.full_name,
                    'section_code',   r.section_code,
                    'evidence',       public.fn_special_grade_evidence(p_conditions, r.signals)
                )
                ORDER BY r.full_name ASC
            ) FILTER (WHERE r.rn <= 25),
            '[]'::jsonb
        )
    INTO v_matched, v_sample
    FROM ranked r;

    RETURN jsonb_build_object(
        'success',        true,
        'term_id',        v_term_id,
        'total_students', v_total,
        'matched_count',  v_matched,
        'sample',         v_sample
    );
END;
$fn$;


-- ----------------------------------------------------------------------------
-- 8. SWEEP
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sweep_special_grade_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
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
$fn$;


-- ----------------------------------------------------------------------------
-- 9. CONFIG CRUD -- carry the new columns
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_get_special_grade_configs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', sgc.id,
                'code', sgc.code,
                'label', sgc.label,
                'description', sgc.description,
                'min_absence_percentage', sgc.min_absence_percentage,
                'requires_completion', sgc.requires_completion,
                'completion_deadline_days', sgc.completion_deadline_days,
                'is_passing', sgc.is_passing,
                'is_active', sgc.is_active,
                'conditions', sgc.conditions,
                'priority', sgc.priority,
                'is_auto_detected', sgc.is_auto_detected,
                'rule_version', sgc.rule_version,
                'pending_flag_count', (
                    SELECT COUNT(*)
                    FROM public.special_grade_flags f
                    WHERE f.special_grade_config_id = sgc.id
                      AND f.status     = 'Pending'
                      AND f.deleted_at IS NULL
                )
            )
            ORDER BY sgc.priority ASC, sgc.created_at ASC
        ), '[]'::jsonb)
        FROM public.special_grade_configs sgc
        WHERE sgc.deleted_at IS NULL
    );
END;
$fn$;


CREATE OR REPLACE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
    v_config      JSONB;
    v_id          UUID;
    v_code        TEXT;
    v_label       TEXT;
    v_description TEXT;
    v_conditions  JSONB;
    v_prev        JSONB;
BEGIN
    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'code')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade codes must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(DISTINCT lower(btrim(c->>'label')))
        FROM jsonb_array_elements(p_configs) c
    ) <> jsonb_array_length(p_configs) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade labels must be unique within your changes.');
    END IF;

    IF (
        SELECT COUNT(*)
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) <> (
        SELECT COUNT(DISTINCT lower(btrim(c->>'description')))
        FROM jsonb_array_elements(p_configs) c
        WHERE btrim(coalesce(c->>'description', '')) <> ''
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade descriptions must be unique within your changes.');
    END IF;

    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        v_id          := NULLIF(v_config->>'id', '')::UUID;
        v_code        := btrim(v_config->>'code');
        v_label       := btrim(v_config->>'label');
        v_description := NULLIF(btrim(coalesce(v_config->>'description', '')), '');
        v_conditions  := COALESCE(v_config->'conditions', '{"all": []}'::jsonb);

        IF v_code IS NULL OR v_code = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade code is required.');
        END IF;

        IF v_label IS NULL OR v_label = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Special grade label is required.');
        END IF;

        IF jsonb_typeof(v_conditions) <> 'object' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Conditions for "' || v_code || '" are malformed.');
        END IF;

        -- A rule cannot be switched on for auto-detection with nothing to test.
        IF COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false)
           AND NOT (
               jsonb_typeof(v_conditions->'all') = 'array' AND jsonb_array_length(v_conditions->'all') > 0
               OR jsonb_typeof(v_conditions->'any') = 'array' AND jsonb_array_length(v_conditions->'any') > 0
               OR jsonb_exists(v_conditions, 'not')
           ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Add at least one condition before enabling auto-detection for "' || v_code || '".'
            );
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(code)) = lower(v_code)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with code "' || v_code || '" already exists.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(label)) = lower(v_label)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with label "' || v_label || '" already exists.');
        END IF;

        IF v_description IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.special_grade_configs
            WHERE lower(btrim(description)) = lower(v_description)
            AND deleted_at IS NULL
            AND (v_id IS NULL OR id <> v_id)
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'A special grade with description "' || v_description || '" already exists.');
        END IF;

        IF v_id IS NOT NULL THEN
            SELECT conditions INTO v_prev
            FROM public.special_grade_configs
            WHERE id = v_id AND deleted_at IS NULL;

            UPDATE public.special_grade_configs
            SET
                code = v_code,
                label = v_label,
                description = v_description,
                min_absence_percentage = (v_config->>'min_absence_percentage')::NUMERIC,
                requires_completion = (v_config->>'requires_completion')::BOOLEAN,
                completion_deadline_days = (v_config->>'completion_deadline_days')::SMALLINT,
                is_passing = (v_config->>'is_passing')::BOOLEAN,
                is_active = (v_config->>'is_active')::BOOLEAN,
                conditions = v_conditions,
                priority = COALESCE((v_config->>'priority')::SMALLINT, 100),
                is_auto_detected = COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                -- Bump only on a real change, so a flag's snapshot stays
                -- comparable across saves that did not touch the logic.
                rule_version = CASE
                    WHEN v_prev IS DISTINCT FROM v_conditions THEN rule_version + 1
                    ELSE rule_version
                END,
                updated_by = auth.uid()
            WHERE id = v_id
            AND deleted_at IS NULL;
        ELSE
            INSERT INTO public.special_grade_configs (
                code, label, description, min_absence_percentage,
                requires_completion, completion_deadline_days,
                is_passing, is_active, conditions, priority,
                is_auto_detected, rule_version, created_by
            )
            VALUES (
                v_code,
                v_label,
                v_description,
                (v_config->>'min_absence_percentage')::NUMERIC,
                (v_config->>'requires_completion')::BOOLEAN,
                (v_config->>'completion_deadline_days')::SMALLINT,
                (v_config->>'is_passing')::BOOLEAN,
                (v_config->>'is_active')::BOOLEAN,
                v_conditions,
                COALESCE((v_config->>'priority')::SMALLINT, 100),
                COALESCE((v_config->>'is_auto_detected')::BOOLEAN, false),
                1,
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully');
END;
$fn$;


-- ----------------------------------------------------------------------------
-- 10. WIRING INTO THE EXISTING GRADING FLOW
-- ----------------------------------------------------------------------------

-- Detect immediately after a calculation run so faculty see flags at the moment
-- they compute grades, not only on the next sweep. A detection failure must
-- never take down grade calculation, hence the swallowed exception.
CREATE OR REPLACE FUNCTION public.fn_calculate_all_grades_for_period(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_enrollment      RECORD;
  v_result          JSONB;
  v_success_count   INTEGER := 0;
  v_failure_count   INTEGER := 0;
  v_failures        JSONB   := '[]'::jsonb;
  v_processed       INTEGER := 0;
  v_message         TEXT;
  v_flags           JSONB   := NULL;
BEGIN
    PERFORM public.fn_assert_section_staff(p_section_id);

  FOR v_enrollment IN
    SELECT e.id,
           st.student_number,
           u.first_name || ' ' || u.last_name AS full_name
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
    INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
    ORDER BY u.last_name ASC, u.first_name ASC
  LOOP
    v_result := fn_calculate_final_grade(v_enrollment.id, p_grading_period_id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failure_count := v_failure_count + 1;
      v_failures := v_failures || jsonb_build_object(
        'enrollment_id',  v_enrollment.id,
        'student_number', v_enrollment.student_number,
        'full_name',      v_enrollment.full_name,
        'reason',         v_result->>'message'
      );
    END IF;
  END LOOP;

  v_processed := v_success_count + v_failure_count;

  IF v_processed = 0 THEN
    v_message := 'No enrolled students in this section to calculate.';
  ELSIF v_failure_count = 0 THEN
    v_message := 'Calculated grades for ' || v_success_count || ' student(s).';
  ELSIF v_success_count = 0 THEN
    v_message := 'No grades could be calculated. All ' || v_failure_count || ' student(s) failed.';
  ELSE
    v_message := 'Calculated ' || v_success_count || ' of ' || v_processed
              || ' student(s). ' || v_failure_count || ' could not be computed.';
  END IF;

  BEGIN
    v_flags := public.fn_detect_special_grade_flags_core(p_section_id, p_grading_period_id);
  EXCEPTION WHEN OTHERS THEN
    v_flags := jsonb_build_object('success', false, 'message', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'message',       v_message,
    'section_id',    p_section_id,
    'period_id',     p_grading_period_id,
    'processed',     v_processed,
    'succeeded',     v_success_count,
    'failed',        v_failure_count,
    'failures',      v_failures,
    'flags',         v_flags
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;


-- The gate: a period cannot be approved while any flag is still awaiting a
-- human decision.
CREATE OR REPLACE FUNCTION public.fn_approve_and_release_grades(
    p_section_id uuid,
    p_grading_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_grade           RECORD;
  v_approved_count  INTEGER := 0;
  v_released_count  INTEGER := 0;
  v_eval_blocked    INTEGER := 0;
  v_pending_flags   INTEGER := 0;
BEGIN
  SELECT COUNT(*)
  INTO v_pending_flags
  FROM public.special_grade_flags f
  INNER JOIN public.enrollments e ON e.id = f.enrollment_id AND e.deleted_at IS NULL
  WHERE e.section_id        = p_section_id
    AND f.grading_period_id = p_grading_period_id
    AND f.status            = 'Pending'
    AND f.deleted_at        IS NULL;

  IF v_pending_flags > 0 THEN
    RETURN jsonb_build_object(
      'success',            false,
      'pending_flag_count', v_pending_flags,
      'message',            v_pending_flags || ' student(s) have an unresolved special grade flag. '
                         || 'Apply or dismiss each one before approving this period.'
    );
  END IF;

  FOR v_grade IN
    SELECT sfg.id, sfg.enrollment_id
    FROM public.section_final_grades sfg
    WHERE sfg.grading_period_id = p_grading_period_id
      AND sfg.deleted_at        IS NULL
      AND sfg.status            = 'Draft'
      AND sfg.enrollment_id IN (
        SELECT e.id FROM public.enrollments e
        WHERE e.section_id = p_section_id AND e.deleted_at IS NULL
      )
  LOOP
    UPDATE public.section_final_grades
    SET
      status      = 'Approved',
      approved_by = auth.uid(),
      approved_at = now(),
      remarks     = 'Approved via fn_approve_and_release_grades'
    WHERE id = v_grade.id;

    v_approved_count := v_approved_count + 1;

    IF fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
      UPDATE public.section_final_grades
      SET status = 'Released', released_at = now()
      WHERE id = v_grade.id;

      UPDATE public.enrollments
      SET is_grade_visible = true
      WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

      v_released_count := v_released_count + 1;
    ELSE
      v_eval_blocked := v_eval_blocked + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',                true,
    'section_id',             p_section_id,
    'grading_period_id',      p_grading_period_id,
    'approved',               v_approved_count,
    'released',               v_released_count,
    'blocked_by_evaluation',  v_eval_blocked,
    'message',                'Grades approved. Release gated by evaluation completion.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;


-- ----------------------------------------------------------------------------
-- 11. SCHEDULE
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
    PERFORM cron.unschedule('special-grade-flag-sweep');
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$cron$;

SELECT cron.schedule(
    'special-grade-flag-sweep',
    '*/15 * * * *',
    $job$SELECT public.fn_sweep_special_grade_flags();$job$
);
