DO $$ BEGIN
    CREATE TYPE public.proctor_event_type AS ENUM ('Heartbeat', 'Focus Lost', 'Focus Restored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.assessment_timer_heartbeats
    ADD COLUMN IF NOT EXISTS event_type public.proctor_event_type NOT NULL DEFAULT 'Heartbeat';

CREATE INDEX IF NOT EXISTS idx_timer_heartbeats_focus
    ON public.assessment_timer_heartbeats (session_id, recorded_at)
    WHERE deleted_at IS NULL AND event_type <> 'Heartbeat';

CREATE INDEX IF NOT EXISTS idx_timer_heartbeats_client_ip
    ON public.assessment_timer_heartbeats (client_ip, recorded_at)
    WHERE deleted_at IS NULL AND client_ip IS NOT NULL;

DROP POLICY IF EXISTS "timer_heartbeats_select" ON public.assessment_timer_heartbeats;
CREATE POLICY "timer_heartbeats_select" ON public.assessment_timer_heartbeats
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.assessment_timer_sessions ts
            INNER JOIN public.assessment_items ai
                ON ai.id = ts.assessment_item_id AND ai.deleted_at IS NULL
            WHERE ts.id = assessment_timer_heartbeats.session_id
              AND ts.deleted_at IS NULL
              AND (
                  public.fn_owns_submission(ts.submission_id)
                  OR public.fn_is_section_faculty(ai.section_id)
                  OR public.fn_current_user_role_codes() && ARRAY['Dean', 'Registrar', 'Admin']
              )
        )
    );

CREATE OR REPLACE FUNCTION public.fn_record_focus_event(p_submission_id uuid, p_event_type text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_session_id  UUID;
    v_status      submission_timer_status;
    v_event       public.proctor_event_type;
    v_event_count INT;
BEGIN
    IF NOT public.fn_owns_submission(p_submission_id) THEN
        RAISE EXCEPTION 'Forbidden: this submission does not belong to you.'
            USING ERRCODE = '42501';
    END IF;

    IF p_event_type NOT IN ('Focus Lost', 'Focus Restored') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unsupported event type.');
    END IF;

    v_event := p_event_type::public.proctor_event_type;

    SELECT id, status
    INTO v_session_id, v_status
    FROM public.assessment_timer_sessions
    WHERE submission_id = p_submission_id
      AND deleted_at IS NULL;

    IF v_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer session not found.');
    END IF;

    IF v_status != 'Active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Timer session is no longer active.');
    END IF;

    SELECT COUNT(*)
    INTO v_event_count
    FROM public.assessment_timer_heartbeats
    WHERE session_id = v_session_id
      AND event_type <> 'Heartbeat'
      AND deleted_at IS NULL;

    IF v_event_count >= 500 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Focus event limit reached for this session.');
    END IF;

    INSERT INTO public.assessment_timer_heartbeats (session_id, recorded_at, client_ip, event_type)
    VALUES (v_session_id, now(), inet_client_addr(), v_event);

    RETURN jsonb_build_object(
        'success',     true,
        'event_type',  v_event,
        'recorded_at', now()
    );

EXCEPTION
    WHEN sqlstate '42501' THEN
        RAISE;
    WHEN sqlstate '28000' THEN
        RAISE;
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_questions_for_student(p_assessment_id uuid, p_enrollment_id uuid, p_submission_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
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
        WHERE e.id = p_enrollment_id
          AND e.student_id = v_student_id
          AND ai.id = p_assessment_id
          AND ai.is_published = true
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
                'is_required',   aq.is_required,
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
                    WHERE sa.question_id = aq.id
                      AND sa.submission_id = p_submission_id
                      AND sa.deleted_at IS NULL
                    LIMIT 1
                ),
                'choices', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          ac.id,
                            'choice_text', ac.choice_text,
                            'sequence',    ac.sequence
                        )
                        ORDER BY CASE
                            WHEN v_shuffle_c
                                THEN hashtextextended(v_seed || ac.id::text, 0)::float
                            ELSE ac.sequence::float
                        END
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY CASE
                WHEN v_shuffle_q
                    THEN hashtextextended(v_seed || aq.id::text, 0)::float
                ELSE aq.sequence::float
            END
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
          AND aq.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_integrity_report(p_assessment_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
    v_section_id UUID;
    v_result     JSONB;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.assessment_items
    WHERE id = p_assessment_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found.');
    END IF;

    PERFORM public.fn_assert_section_staff(v_section_id);

    WITH timer AS (
        SELECT ts.id AS session_id, ts.submission_id, ts.last_activity_at
        FROM public.assessment_timer_sessions ts
        WHERE ts.assessment_item_id = p_assessment_id
          AND ts.deleted_at IS NULL
    ),
    roster AS (
        SELECT
            sub.id AS submission_id,
            sub.attempt_number,
            sub.status::text AS status,
            sub.started_at,
            sub.submitted_at,
            st.student_number,
            u.first_name || ' ' || u.last_name AS full_name
        FROM public.assessment_submissions sub
        INNER JOIN public.enrollments e ON e.id = sub.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE sub.assessment_item_id = p_assessment_id
          AND sub.deleted_at IS NULL
    ),
    focus_events AS (
        SELECT
            t.submission_id,
            h.event_type,
            h.recorded_at,
            LEAD(h.recorded_at) OVER (PARTITION BY t.submission_id ORDER BY h.recorded_at) AS next_at,
            t.last_activity_at
        FROM public.assessment_timer_heartbeats h
        INNER JOIN timer t ON t.session_id = h.session_id
        WHERE h.deleted_at IS NULL
          AND h.event_type <> 'Heartbeat'
    ),
    away_spans AS (
        SELECT
            submission_id,
            GREATEST(
                EXTRACT(EPOCH FROM (COALESCE(next_at, last_activity_at, recorded_at) - recorded_at)),
                0
            )::INT AS away_seconds
        FROM focus_events
        WHERE event_type = 'Focus Lost'
    ),
    focus_stats AS (
        SELECT
            submission_id,
            COUNT(*)::INT AS focus_lost_count,
            COALESCE(SUM(away_seconds), 0)::INT AS total_away_seconds,
            COALESCE(MAX(away_seconds), 0)::INT AS longest_away_seconds
        FROM away_spans
        GROUP BY submission_id
    ),
    submission_ips AS (
        SELECT
            t.submission_id,
            h.client_ip,
            MIN(h.recorded_at) AS first_seen,
            MAX(h.recorded_at) AS last_seen
        FROM public.assessment_timer_heartbeats h
        INNER JOIN timer t ON t.session_id = h.session_id
        WHERE h.deleted_at IS NULL
          AND h.client_ip IS NOT NULL
        GROUP BY t.submission_id, h.client_ip
    ),
    ip_stats AS (
        SELECT
            submission_id,
            COUNT(*)::INT AS distinct_ip_count,
            COALESCE(jsonb_agg(HOST(client_ip) ORDER BY first_seen), '[]'::jsonb) AS ip_addresses
        FROM submission_ips
        GROUP BY submission_id
    ),
    collisions AS (
        SELECT
            a.submission_id,
            jsonb_agg(DISTINCT jsonb_build_object(
                'ip_address',     HOST(a.client_ip),
                'student_number', r.student_number,
                'full_name',      r.full_name
            )) AS shared_with
        FROM submission_ips a
        INNER JOIN submission_ips b
            ON b.client_ip     = a.client_ip
           AND b.submission_id <> a.submission_id
           AND b.first_seen   <= a.last_seen
           AND b.last_seen    >= a.first_seen
        INNER JOIN roster r ON r.submission_id = b.submission_id
        GROUP BY a.submission_id
    )
    SELECT jsonb_build_object(
        'success', true,
        'assessment', (
            SELECT jsonb_build_object(
                'assessment_id', ai.id,
                'title',         ai.title,
                'section_id',    ai.section_id,
                'section_code',  s.section_code,
                'course_code',   c.code
            )
            FROM public.assessment_items ai
            INNER JOIN public.sections s ON s.id = ai.section_id
            INNER JOIN public.courses c ON c.id = s.course_id
            WHERE ai.id = p_assessment_id
        ),
        'summary', jsonb_build_object(
            'submission_count',    COUNT(*)::INT,
            'focus_flagged_count', COUNT(*) FILTER (WHERE COALESCE(fs.focus_lost_count, 0) > 0)::INT,
            'shared_ip_count',     COUNT(*) FILTER (WHERE col.shared_with IS NOT NULL)::INT,
            'roaming_ip_count',    COUNT(*) FILTER (WHERE COALESCE(ip.distinct_ip_count, 0) > 1)::INT
        ),
        'submissions', COALESCE(jsonb_agg(
            jsonb_build_object(
                'submission_id',        r.submission_id,
                'student_number',       r.student_number,
                'full_name',            r.full_name,
                'attempt_number',       r.attempt_number,
                'status',               r.status,
                'started_at',           r.started_at,
                'submitted_at',         r.submitted_at,
                'focus_lost_count',     COALESCE(fs.focus_lost_count, 0),
                'total_away_seconds',   COALESCE(fs.total_away_seconds, 0),
                'longest_away_seconds', COALESCE(fs.longest_away_seconds, 0),
                'distinct_ip_count',    COALESCE(ip.distinct_ip_count, 0),
                'ip_addresses',         COALESCE(ip.ip_addresses, '[]'::jsonb),
                'shared_with',          COALESCE(col.shared_with, '[]'::jsonb)
            )
            ORDER BY
                COALESCE(fs.total_away_seconds, 0) DESC,
                COALESCE(ip.distinct_ip_count, 0) DESC,
                r.full_name
        ), '[]'::jsonb)
    ) INTO v_result
    FROM roster r
    LEFT JOIN focus_stats fs ON fs.submission_id = r.submission_id
    LEFT JOIN ip_stats ip    ON ip.submission_id = r.submission_id
    LEFT JOIN collisions col ON col.submission_id = r.submission_id;

    RETURN v_result;

EXCEPTION
    WHEN sqlstate '42501' THEN
        RAISE;
    WHEN sqlstate '28000' THEN
        RAISE;
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_focus_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_assessment_integrity_report(uuid) TO authenticated;