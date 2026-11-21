-- Flow-test fixes (2026-11-21). Each item was reproduced on a restored copy of live and re-tested after the change.
--
--  1. fn_submit_evaluation: a rating outside the question's min_rating..max_rating, or not a whole number,
--     is refused with {success:false,message}. Nothing is saved and the period is not locked.
--  2. fn_convert_communication_item: before old notifications are re-pointed to the new item, the ones held by
--     people outside the new item's audience are soft-deleted (deleted_at). Same-audience conversion still keeps
--     one live notification per person.
--  3. fn_resolve_audience: the Student audience is people holding the Student role (active, not revoked or
--     deleted). The "has a students row" fallback is removed. Other audiences are unchanged.
--  4. fn_save_academic_year_calendar: a term whose start or end date falls outside the school year's start/end
--     is refused with a message naming the term (checked before anything is written).
--  5. fn_bulk_create_programs / fn_create_program / fn_update_program: a Dean may only import, create or edit
--     programs in their own department (fn_get_dean_department_id()), and cannot move a program to another
--     department. Admin is unaffected. Curriculum entries are NOT restricted (GE courses are cross-department).
--  W1. fn_bulk_create_sections: a blank term means the current term (fn_dashboard_active_term()), not the
--      oldest term of the active year.
--  W2. fn_create_section / fn_update_section: max_slots below 1 returns 'Max slots must be at least 1.' instead
--      of the raw constraint error (the bulk path already checks 1..999).

BEGIN;

-- 1. fn_submit_evaluation
CREATE OR REPLACE FUNCTION public.fn_submit_evaluation(p_enrollment_id uuid, p_grading_period_id uuid, p_responses jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_student_id UUID;
    v_template_ids UUID[];
    v_is_completed BOOLEAN;
    v_response JSONB;
    v_required_count INTEGER;
    v_answered_count INTEGER;
    v_bad_rating RECORD;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id
        AND student_id = v_student_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    SELECT is_completed INTO v_is_completed
    FROM public.evaluation_period_locks
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL
    LIMIT 1;

    IF COALESCE(v_is_completed, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already completed this evaluation.');
    END IF;

    SELECT array_agg(t.id ORDER BY t.sequence ASC) INTO v_template_ids
    FROM public.fn_list_applicable_evaluation_templates(v_student_id) t;

    IF v_template_ids IS NULL OR array_length(v_template_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active evaluation form is available.');
    END IF;

    SELECT COUNT(*) INTO v_required_count
    FROM public.evaluation_questions
    WHERE template_id = ANY(v_template_ids)
    AND is_required = true
    AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT q.id) INTO v_answered_count
    FROM jsonb_array_elements(p_responses) r
    INNER JOIN public.evaluation_questions q
        ON q.id = (r->>'question_id')::UUID
        AND q.template_id = ANY(v_template_ids)
        AND q.is_required = true
        AND q.deleted_at IS NULL
    WHERE COALESCE(NULLIF(btrim(COALESCE(r->>'response_text', '')), ''), NULLIF(btrim(COALESCE(r->>'rating_value', '')), '')) IS NOT NULL;

    IF v_answered_count < v_required_count THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please answer all required questions before submitting.');
    END IF;

    -- A rating must be a whole number inside the question's own scale; checked before anything is saved or locked
    SELECT q.sequence,
           COALESCE(q.min_rating, 1) AS min_rating,
           COALESCE(q.max_rating, 5) AS max_rating
    INTO v_bad_rating
    FROM jsonb_array_elements(p_responses) r
    INNER JOIN public.evaluation_questions q
        ON q.id = (r->>'question_id')::UUID
        AND q.template_id = ANY(v_template_ids)
        AND q.deleted_at IS NULL
    WHERE NULLIF(btrim(COALESCE(r->>'rating_value', '')), '') IS NOT NULL
      AND (
          btrim(r->>'rating_value') !~ '^-?[0-9]{1,4}$'
          OR btrim(r->>'rating_value')::INTEGER < COALESCE(q.min_rating, 1)
          OR btrim(r->>'rating_value')::INTEGER > COALESCE(q.max_rating, 5)
      )
    ORDER BY q.sequence
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Each rating must be a whole number from %s to %s. Please check your answers and submit again.',
                v_bad_rating.min_rating, v_bad_rating.max_rating)
        );
    END IF;

    INSERT INTO public.evaluation_period_locks (
        enrollment_id, grading_period_id, template_id, template_ids,
        is_completed, completed_at, created_by
    )
    VALUES (
        p_enrollment_id, p_grading_period_id, v_template_ids[1], v_template_ids,
        true, now(), auth.uid()
    )
    ON CONFLICT (enrollment_id, grading_period_id) WHERE deleted_at IS NULL
    DO UPDATE SET
        template_id  = EXCLUDED.template_id,
        template_ids = EXCLUDED.template_ids,
        is_completed = true,
        completed_at = now(),
        updated_by   = auth.uid();

    UPDATE public.evaluation_responses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE enrollment_id = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL;

    FOR v_response IN SELECT * FROM jsonb_array_elements(p_responses)
    LOOP
        IF EXISTS (
            SELECT 1 FROM public.evaluation_questions
            WHERE id = (v_response->>'question_id')::UUID
            AND template_id = ANY(v_template_ids)
            AND deleted_at IS NULL
        ) THEN
            INSERT INTO public.evaluation_responses (
                question_id, enrollment_id, grading_period_id, rating_value, response_text, created_by
            )
            VALUES (
                (v_response->>'question_id')::UUID,
                p_enrollment_id,
                p_grading_period_id,
                NULLIF(btrim(COALESCE(v_response->>'rating_value', '')), '')::SMALLINT,
                NULLIF(btrim(COALESCE(v_response->>'response_text', '')), ''),
                auth.uid()
            );
        END IF;
    END LOOP;

    PERFORM public.fn_release_grades_after_evaluation(p_enrollment_id, p_grading_period_id);

    IF EXISTS (
        SELECT 1 FROM public.section_final_grades sfg
        WHERE sfg.enrollment_id = p_enrollment_id
          AND sfg.status = 'Released'
          AND sfg.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Evaluation submitted. Your released grade is now visible in My Grades.');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Evaluation submitted. Your grade will appear in My Grades once it is released.');
END;
$function$;

-- 2. fn_convert_communication_item
CREATE OR REPLACE FUNCTION public.fn_convert_communication_item(p_id uuid, p_from_type text, p_payload jsonb, p_role text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_audience public.announcement_audience_type;
    v_section_ids uuid[];
    v_attachments jsonb;
    v_created jsonb;
    v_deleted jsonb;
    v_new_id uuid;
    v_old_url text;
    v_new_url text;
    v_new_title text;
    v_new_type public.notification_category_type;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar', 'Faculty');

    IF p_from_type NOT IN ('Announcement', 'Event') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only an announcement or an event can change type.');
    END IF;

    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'message', 'The new item details are missing.');
    END IF;

    v_audience := COALESCE(NULLIF(p_payload->>'audience', ''), 'Global')::public.announcement_audience_type;

    -- Lock the original so two type changes cannot run on it at once
    IF p_from_type = 'Announcement' THEN
        PERFORM 1 FROM public.announcements WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
    ELSE
        PERFORM 1 FROM public.events WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'The item was not found. It may have been deleted.');
    END IF;

    -- Sections: use the form's list, or keep the original's
    IF v_audience = 'Section' THEN
        IF jsonb_typeof(p_payload->'section_ids') = 'array' AND jsonb_array_length(p_payload->'section_ids') > 0 THEN
            SELECT array_agg(value::uuid) INTO v_section_ids
            FROM jsonb_array_elements_text(p_payload->'section_ids');
        ELSIF p_from_type = 'Announcement' THEN
            SELECT array_agg(section_id) INTO v_section_ids
            FROM public.announcement_sections
            WHERE announcement_id = p_id AND deleted_at IS NULL;
        ELSE
            SELECT array_agg(section_id) INTO v_section_ids
            FROM public.event_sections
            WHERE event_id = p_id AND deleted_at IS NULL;
        END IF;
    END IF;

    -- Attachments: use the form's list (an empty list removes them), or keep the original's
    IF jsonb_typeof(p_payload->'attachments') = 'array' THEN
        v_attachments := p_payload->'attachments';
    ELSIF p_from_type = 'Announcement' THEN
        SELECT jsonb_agg(jsonb_build_object(
            'file_name', file_name, 'file_path', file_path, 'mime_type', mime_type, 'file_size', file_size
        )) INTO v_attachments
        FROM public.announcement_attachments
        WHERE announcement_id = p_id AND deleted_at IS NULL;
    ELSE
        SELECT jsonb_agg(jsonb_build_object(
            'file_name', file_name, 'file_path', file_path, 'mime_type', mime_type, 'file_size', file_size
        )) INTO v_attachments
        FROM public.event_attachments
        WHERE event_id = p_id AND deleted_at IS NULL;
    END IF;

    IF v_attachments IS NOT NULL AND jsonb_array_length(v_attachments) = 0 THEN
        v_attachments := NULL;
    END IF;

    IF p_from_type = 'Announcement' THEN
        v_created := public.fn_create_event(
            p_title       => p_payload->>'title',
            p_start_at    => NULLIF(p_payload->>'start_at', '')::timestamptz,
            p_audience    => v_audience,
            p_end_at      => NULLIF(p_payload->>'end_at', '')::timestamptz,
            p_all_day     => COALESCE((p_payload->>'all_day')::boolean, false),
            p_location    => NULLIF(p_payload->>'location', ''),
            p_description => NULLIF(p_payload->>'description', ''),
            p_section_ids => v_section_ids,
            p_attachments => v_attachments,
            p_role        => p_role
        );
        v_old_url := '/announcements/' || p_id::text;
        v_new_title := 'New Event';
        v_new_type := 'Event'::public.notification_category_type;
    ELSE
        v_created := public.fn_create_announcement(
            p_title       => p_payload->>'title',
            p_content     => p_payload->>'content',
            p_audience    => v_audience,
            p_section_ids => v_section_ids,
            p_is_pinned   => COALESCE((p_payload->>'is_pinned')::boolean, false),
            p_expires_at  => NULLIF(p_payload->>'expires_at', '')::timestamptz,
            p_attachments => v_attachments,
            p_role        => p_role
        );
        v_old_url := '/events/' || p_id::text;
        v_new_title := 'New Announcement';
        v_new_type := 'Announcement'::public.notification_category_type;
    END IF;

    -- A failed check (e.g. a missing title) returns its message and nothing was created
    IF COALESCE((v_created->>'success')::boolean, false) IS NOT TRUE THEN
        RETURN v_created;
    END IF;

    v_new_id := (v_created->>'id')::uuid;
    v_new_url := CASE WHEN p_from_type = 'Announcement'
        THEN '/events/' || v_new_id::text
        ELSE '/announcements/' || v_new_id::text
    END;

    -- People who are not in the new item's audience lose their old notification, so a re-pointed
    -- notification never reaches someone who cannot see the new item
    UPDATE public.notifications old_n
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE old_n.action_url LIKE '%' || p_id::text || '%'
      AND old_n.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.fn_resolve_audience(v_audience, v_section_ids) AS a(uid)
          WHERE a.uid = old_n.user_id
      );

    -- People who were told about the old item keep that notification (and its read state);
    -- drop the copy the create just sent them, so nobody gets the same item twice
    UPDATE public.notifications fresh
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE fresh.action_url = v_new_url
      AND fresh.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM public.notifications old_n
          WHERE old_n.user_id = fresh.user_id
            AND old_n.deleted_at IS NULL
            AND old_n.action_url LIKE '%' || p_id::text || '%'
      );

    -- Point old notifications at the new item. Any link that carries the old id is updated,
    -- including ?announcementId= / ?eventId= style links.
    UPDATE public.notifications
    SET action_url = CASE
            WHEN action_url = v_old_url THEN v_new_url
            WHEN p_from_type = 'Announcement' THEN replace(replace(replace(action_url,
                'announcementId=' || p_id::text, 'eventId=' || v_new_id::text),
                '/announcements/' || p_id::text, '/events/' || v_new_id::text),
                p_id::text, v_new_id::text)
            ELSE replace(replace(replace(action_url,
                'eventId=' || p_id::text, 'announcementId=' || v_new_id::text),
                '/events/' || p_id::text, '/announcements/' || v_new_id::text),
                p_id::text, v_new_id::text)
        END,
        title = CASE WHEN title IN ('New Announcement', 'New Event') THEN v_new_title ELSE title END,
        notification_type = CASE
            WHEN notification_type IN ('Announcement'::public.notification_category_type, 'Event'::public.notification_category_type)
                THEN v_new_type
            ELSE notification_type
        END,
        message = CASE
            WHEN notification_type IN ('Announcement'::public.notification_category_type, 'Event'::public.notification_category_type)
                THEN COALESCE(NULLIF(btrim(p_payload->>'title'), ''), message)
            ELSE message
        END,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE action_url LIKE '%' || p_id::text || '%'
      AND deleted_at IS NULL;

    -- Remove the original; a refusal raises and undoes everything above
    IF p_from_type = 'Announcement' THEN
        v_deleted := public.fn_delete_announcement(p_id);
    ELSE
        v_deleted := public.fn_delete_event(p_id);
    END IF;

    IF COALESCE((v_deleted->>'success')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION '%', COALESCE(v_deleted->>'message', 'The original item could not be removed, so the type was not changed.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE WHEN p_from_type = 'Announcement'
            THEN 'The announcement is now an event.'
            ELSE 'The event is now an announcement.'
        END,
        'id', v_new_id
    );
END;
$function$;

-- 3. fn_resolve_audience
CREATE OR REPLACE FUNCTION public.fn_resolve_audience(p_audience announcement_audience_type, p_section_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT DISTINCT u.id
    FROM public.users u
    WHERE u.deleted_at IS NULL
      AND u.status = 'Active'
      AND (
          p_audience = 'Global'
          OR (
              p_audience = 'Faculty'
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = 'Faculty'
              )
          )
          OR (
              p_audience = 'Student'
              AND EXISTS (
                  SELECT 1
                  FROM public.user_roles ur
                  INNER JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
                  WHERE ur.user_id = u.id
                    AND ur.deleted_at IS NULL
                    AND ur.revoked_at IS NULL
                    AND r.code = 'Student'
              )
          )
          OR (
              p_audience = 'Section'
              AND p_section_ids IS NOT NULL
              AND (
                  EXISTS (
                      SELECT 1
                      FROM public.enrollments e
                      INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
                      WHERE st.user_id = u.id
                        AND e.section_id = ANY(p_section_ids)
                        AND e.status = 'Enrolled'
                        AND e.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.sections s
                      WHERE s.faculty_id = u.id
                        AND s.id = ANY(p_section_ids)
                        AND s.deleted_at IS NULL
                  )
              )
          )
      );
$function$;

-- 4. fn_save_academic_year_calendar
CREATE OR REPLACE FUNCTION public.fn_save_academic_year_calendar(p_school_year_id uuid, p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean, p_terms jsonb, p_transmutation_rows jsonb, p_thresholds jsonb DEFAULT '[]'::jsonb, p_max_units_per_term smallint DEFAULT 24, p_evaluation_scope text DEFAULT 'Period'::text, p_holidays jsonb DEFAULT '[]'::jsonb, p_revert_history_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_sy_id uuid;
    v_term_elem jsonb;
    v_term_id uuid;
    v_gp_elem jsonb;
    v_row_elem jsonb;
    v_thresh_elem jsonb;
    v_holiday_elem jsonb;
    v_incoming_term_ids uuid[] := '{}';
    v_incoming_gp_ids uuid[] := '{}';
    v_clean_code text := btrim(COALESCE(p_code, ''));
    v_clean_label text := btrim(COALESCE(p_label, ''));
    v_clean_eval_scope text := COALESCE(NULLIF(btrim(p_evaluation_scope), ''), 'Period');
    v_units smallint := COALESCE(p_max_units_per_term, 24);
    v_current_user_id uuid := auth.uid();
    v_is_new boolean := (p_school_year_id IS NULL);
    v_action text;
    v_summary text;
    v_snapshot jsonb;
    v_conflicting_sy RECORD;
    v_full_terms jsonb;
    v_full_trans jsonb;
    v_full_thresh jsonb;
    v_full_holidays jsonb;
    v_active_history_id uuid;
    v_active_snapshot jsonb;
    v_has_real_change boolean := false;
    v_header_matches boolean := false;
    v_terms_match boolean := false;
    v_trans_match boolean := false;
    v_thresh_match boolean := false;
    v_holidays_match boolean := false;
    v_blocked_name text;
    v_term_gp_ids uuid[] := '{}';
    v_term_has_gp_ids boolean := false;
    v_out_of_range_term text;
BEGIN
    PERFORM public.fn_assert_role('Admin');

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code is required.');
    END IF;

    IF v_clean_label IS NULL OR v_clean_label = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year label is required.');
    END IF;

    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Start date and end date are required.');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date.');
    END IF;

    IF v_units < 1 OR v_units > 60 THEN
        v_units := 24;
    END IF;

    IF v_clean_eval_scope NOT IN ('Period', 'Term') THEN
        v_clean_eval_scope := 'Period';
    END IF;

    -- 1. Check duplicate code
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(code)) = lower(v_clean_code)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year code already exists: ' || v_clean_code);
    END IF;

    -- 2. Check duplicate label
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE lower(btrim(label)) = lower(v_clean_label)
          AND (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year label already exists: ' || v_clean_label);
    END IF;

    -- 3. Check exact same start and end dates
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE (p_school_year_id IS NULL OR id <> p_school_year_id)
          AND deleted_at IS NULL
          AND start_date = p_start_date
          AND end_date = p_end_date
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An academic year with the exact same start date and end date already exists.');
    END IF;

    -- 4. Check overlapping academic year dates
    SELECT code, label, start_date, end_date INTO v_conflicting_sy
    FROM public.school_years
    WHERE (p_school_year_id IS NULL OR id <> p_school_year_id)
      AND deleted_at IS NULL
      AND (p_start_date < end_date AND p_end_date > start_date)
    LIMIT 1;

    IF v_conflicting_sy.label IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Academic year dates overlap with existing academic year "' || v_conflicting_sy.label || '" (' || v_conflicting_sy.start_date || ' to ' || v_conflicting_sy.end_date || '). Each academic year must have a distinct, non-overlapping calendar period.'
        );
    END IF;

    -- 4b. Every term must fall inside the school year's own dates (checked before anything is written)
    IF jsonb_typeof(p_terms) = 'array' THEN
        SELECT COALESCE(
                   NULLIF(btrim(te.elem->>'term_type_label'), ''),
                   tt.label,
                   'Term #' || te.ord::text
               )
        INTO v_out_of_range_term
        FROM jsonb_array_elements(p_terms) WITH ORDINALITY AS te(elem, ord)
        LEFT JOIN public.term_types tt
            ON (te.elem->>'term_type_id') ~ '^[0-9a-fA-F-]{36}$'
            AND tt.id = (te.elem->>'term_type_id')::uuid
        WHERE (NULLIF(te.elem->>'start_date', '')::date < p_start_date
               OR NULLIF(te.elem->>'start_date', '')::date > p_end_date
               OR NULLIF(te.elem->>'end_date', '')::date < p_start_date
               OR NULLIF(te.elem->>'end_date', '')::date > p_end_date)
        ORDER BY te.ord
        LIMIT 1;

        IF v_out_of_range_term IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', format('The term "%s" must start and end within the school year (%s to %s).',
                    v_out_of_range_term, p_start_date, p_end_date)
            );
        END IF;
    END IF;

    -- 5. Create or Update School Year Header
    IF v_is_new THEN
        IF COALESCE(p_is_active, false) THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND deleted_at IS NULL;
        END IF;

        INSERT INTO public.school_years (
            code,
            label,
            start_date,
            end_date,
            is_active,
            max_units_per_term,
            evaluation_scope
        ) VALUES (
            v_clean_code,
            v_clean_label,
            p_start_date,
            p_end_date,
            COALESCE(p_is_active, false),
            v_units,
            v_clean_eval_scope::public.evaluation_scope_type
        )
        RETURNING id INTO v_sy_id;
        
        v_action := 'CREATED';
    ELSE
        v_sy_id := p_school_year_id;

        IF COALESCE(p_is_active, false) THEN
            UPDATE public.school_years SET is_active = false WHERE is_active = true AND id <> v_sy_id AND deleted_at IS NULL;
        END IF;

        UPDATE public.school_years
        SET code = v_clean_code,
            label = v_clean_label,
            start_date = p_start_date,
            end_date = p_end_date,
            is_active = COALESCE(p_is_active, false),
            max_units_per_term = v_units,
            evaluation_scope = v_clean_eval_scope::public.evaluation_scope_type,
            updated_at = now(),
            updated_by = v_current_user_id
        WHERE id = v_sy_id;

        v_action := 'UPDATED';
    END IF;

    -- 6. Synchronize Terms
    IF p_terms IS NOT NULL AND jsonb_array_length(p_terms) > 0 THEN
        FOR v_term_elem IN SELECT * FROM jsonb_array_elements(p_terms) LOOP
            v_term_id := NULL;
            IF v_term_elem ? 'id' AND (v_term_elem->>'id') IS NOT NULL AND (v_term_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                v_term_id := (v_term_elem->>'id')::uuid;
            END IF;

            IF v_term_id IS NULL AND (v_term_elem ? 'term_type_id') AND (v_term_elem->>'term_type_id') IS NOT NULL AND (v_term_elem->>'term_type_id') ~ '^[0-9a-fA-F-]{36}$' THEN
                SELECT id INTO v_term_id
                FROM public.terms
                WHERE school_year_id = v_sy_id
                  AND term_type_id = (v_term_elem->>'term_type_id')::uuid
                LIMIT 1;
            END IF;

            IF v_term_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.terms WHERE id = v_term_id AND school_year_id = v_sy_id) THEN
                UPDATE public.terms
                SET term_type_id = (v_term_elem->>'term_type_id')::uuid,
                    start_date = (v_term_elem->>'start_date')::date,
                    end_date = (v_term_elem->>'end_date')::date,
                    enrollment_start_date = NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    enrollment_end_date = NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    grading_deadline = NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    status = COALESCE(v_term_elem->>'status', 'Upcoming'),
                    evaluation_scope = CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = now(),
                    updated_by = v_current_user_id
                WHERE id = v_term_id;
            ELSE
                INSERT INTO public.terms (
                    school_year_id,
                    term_type_id,
                    start_date,
                    end_date,
                    enrollment_start_date,
                    enrollment_end_date,
                    grading_deadline,
                    status,
                    evaluation_scope
                ) VALUES (
                    v_sy_id,
                    (v_term_elem->>'term_type_id')::uuid,
                    (v_term_elem->>'start_date')::date,
                    (v_term_elem->>'end_date')::date,
                    NULLIF(v_term_elem->>'enrollment_start_date', '')::date,
                    NULLIF(v_term_elem->>'enrollment_end_date', '')::date,
                    NULLIF(v_term_elem->>'grading_deadline', '')::date,
                    COALESCE(v_term_elem->>'status', 'Upcoming'),
                    CASE
                        WHEN (v_term_elem->>'evaluation_scope') IN ('Period', 'Term')
                        THEN (v_term_elem->>'evaluation_scope')::public.evaluation_scope_type
                        ELSE v_clean_eval_scope::public.evaluation_scope_type
                    END
                )
                RETURNING id INTO v_term_id;
            END IF;

            v_incoming_term_ids := array_append(v_incoming_term_ids, v_term_id);

            -- Ids of this term's existing periods that the payload keeps (#36)
            v_term_gp_ids := ARRAY(
                SELECT (gp->>'id')::uuid
                FROM jsonb_array_elements(COALESCE(v_term_elem->'grading_periods', '[]'::jsonb)) gp
                WHERE (gp->>'id') ~ '^[0-9a-fA-F-]{36}$'
            );
            v_term_has_gp_ids := COALESCE(array_length(v_term_gp_ids, 1), 0) > 0;

            IF v_term_has_gp_ids THEN
                -- A removed grading period that already holds grades or assessments must stay.
                SELECT gp.name INTO v_blocked_name
                FROM public.grading_periods gp
                WHERE gp.term_id = v_term_id
                  AND gp.deleted_at IS NULL
                  AND NOT (gp.id = ANY(v_term_gp_ids))
                  AND (
                      EXISTS (
                          SELECT 1 FROM public.section_final_grades sfg
                          WHERE sfg.grading_period_id = gp.id AND sfg.deleted_at IS NULL
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM public.grading_components gc
                          INNER JOIN public.assessment_items ai ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
                          WHERE gc.grading_period_id = gp.id AND gc.deleted_at IS NULL
                      )
                  )
                LIMIT 1;

                IF v_blocked_name IS NOT NULL THEN
                    RAISE EXCEPTION 'Cannot remove the grading period "%": it already has grades or assessments. Keep it, or remove those records first.', v_blocked_name
                        USING ERRCODE = 'P0001';
                END IF;

                -- Remove first, so a kept period can take over the removed one's sequence or name
                UPDATE public.grading_periods
                SET deleted_at = now(),
                    deleted_by = v_current_user_id
                WHERE term_id = v_term_id
                  AND deleted_at IS NULL
                  AND NOT (id = ANY(v_term_gp_ids));

                -- Their per-section grading components go with them (minor gap found 2026-11-21)
                UPDATE public.grading_components gc
                SET deleted_at = now(),
                    deleted_by = v_current_user_id
                FROM public.grading_periods gp
                WHERE gc.grading_period_id = gp.id
                  AND gp.term_id = v_term_id
                  AND gp.deleted_at IS NOT NULL
                  AND gc.deleted_at IS NULL;

                -- Kept periods that are renumbered or renamed step aside, so swapping two
                -- periods never hits the (term, sequence) or (term, name) unique index
                UPDATE public.grading_periods gp
                SET sequence = -1000 - gp.sequence,
                    name = '~' || gp.id::text
                FROM jsonb_array_elements(v_term_elem->'grading_periods') inc
                WHERE gp.term_id = v_term_id
                  AND gp.deleted_at IS NULL
                  AND (inc->>'id') ~ '^[0-9a-fA-F-]{36}$'
                  AND gp.id = (inc->>'id')::uuid
                  AND (
                      gp.sequence IS DISTINCT FROM COALESCE((inc->>'sequence')::smallint, 1)
                      OR gp.name IS DISTINCT FROM btrim(inc->>'name')
                  );
            END IF;

            -- Synchronize Grading Periods for this term
            IF v_term_elem ? 'grading_periods' AND jsonb_array_length(v_term_elem->'grading_periods') > 0 THEN
                FOR v_gp_elem IN SELECT * FROM jsonb_array_elements(v_term_elem->'grading_periods') LOOP
                    DECLARE
                        v_gp_id uuid := NULL;
                    BEGIN
                        IF v_gp_elem ? 'id' AND (v_gp_elem->>'id') IS NOT NULL AND (v_gp_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
                            v_gp_id := (v_gp_elem->>'id')::uuid;
                        END IF;

                        -- Only older payloads without any period ids are matched by sequence/name;
                        -- otherwise a period without an id is new and must not take over another's grades
                        IF v_gp_id IS NULL AND NOT v_term_has_gp_ids THEN
                            SELECT id INTO v_gp_id
                            FROM public.grading_periods
                            WHERE term_id = v_term_id
                              AND deleted_at IS NULL
                              AND (
                                  (sequence = COALESCE((v_gp_elem->>'sequence')::smallint, 1))
                                  OR (lower(name) = lower(btrim(v_gp_elem->>'name')))
                              )
                            LIMIT 1;
                        END IF;

                        IF v_gp_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.grading_periods WHERE id = v_gp_id AND term_id = v_term_id) THEN
                            UPDATE public.grading_periods
                            SET name = btrim(v_gp_elem->>'name'),
                                sequence = COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                start_date = NULLIF(v_gp_elem->>'start_date', '')::date,
                                end_date = NULLIF(v_gp_elem->>'end_date', '')::date,
                                weight = COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25),
                                major_exam_start_date = NULLIF(v_gp_elem->>'major_exam_start_date', '')::date,
                                major_exam_end_date = NULLIF(v_gp_elem->>'major_exam_end_date', '')::date,
                                grade_encoding_start_date = NULLIF(v_gp_elem->>'grade_encoding_start_date', '')::date,
                                grade_encoding_end_date = NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date,
                                components = COALESCE(v_gp_elem->'components', '[]'::jsonb),
                                deleted_at = NULL,
                                deleted_by = NULL,
                                updated_at = now(),
                                updated_by = v_current_user_id
                            WHERE id = v_gp_id;
                        ELSE
                            INSERT INTO public.grading_periods (
                                term_id,
                                name,
                                sequence,
                                start_date,
                                end_date,
                                weight,
                                major_exam_start_date,
                                major_exam_end_date,
                                grade_encoding_start_date,
                                grade_encoding_end_date,
                                components
                            ) VALUES (
                                v_term_id,
                                btrim(v_gp_elem->>'name'),
                                COALESCE((v_gp_elem->>'sequence')::smallint, 1),
                                NULLIF(v_gp_elem->>'start_date', '')::date,
                                NULLIF(v_gp_elem->>'end_date', '')::date,
                                COALESCE(NULLIF(v_gp_elem->>'weight', '')::numeric, 25),
                                NULLIF(v_gp_elem->>'major_exam_start_date', '')::date,
                                NULLIF(v_gp_elem->>'major_exam_end_date', '')::date,
                                NULLIF(v_gp_elem->>'grade_encoding_start_date', '')::date,
                                NULLIF(v_gp_elem->>'grade_encoding_end_date', '')::date,
                                COALESCE(v_gp_elem->'components', '[]'::jsonb)
                            )
                            RETURNING id INTO v_gp_id;
                        END IF;

                        v_incoming_gp_ids := array_append(v_incoming_gp_ids, v_gp_id);
                    END;
                END LOOP;
            END IF;

            -- A removed grading period that already holds grades or assessments must stay.
            -- RAISE undoes everything this call wrote, so nothing is half saved.
            SELECT gp.name INTO v_blocked_name
            FROM public.grading_periods gp
            WHERE gp.term_id = v_term_id
              AND gp.deleted_at IS NULL
              AND NOT (gp.id = ANY(v_incoming_gp_ids))
              AND (
                  EXISTS (
                      SELECT 1 FROM public.section_final_grades sfg
                      WHERE sfg.grading_period_id = gp.id AND sfg.deleted_at IS NULL
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM public.grading_components gc
                      INNER JOIN public.assessment_items ai ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
                      WHERE gc.grading_period_id = gp.id AND gc.deleted_at IS NULL
                  )
              )
            LIMIT 1;

            IF v_blocked_name IS NOT NULL THEN
                RAISE EXCEPTION 'Cannot remove the grading period "%": it already has grades or assessments. Keep it, or remove those records first.', v_blocked_name
                    USING ERRCODE = 'P0001';
            END IF;

            -- Soft delete removed grading periods for this term
            UPDATE public.grading_periods
            SET deleted_at = now(),
                deleted_by = v_current_user_id
            WHERE term_id = v_term_id
              AND deleted_at IS NULL
              AND NOT (id = ANY(v_incoming_gp_ids));

            -- Their per-section grading components go with them (minor gap found 2026-11-21)
            UPDATE public.grading_components gc
            SET deleted_at = now(),
                deleted_by = v_current_user_id
            FROM public.grading_periods gp
            WHERE gc.grading_period_id = gp.id
              AND gp.term_id = v_term_id
              AND gp.deleted_at IS NOT NULL
              AND gc.deleted_at IS NULL;
        END LOOP;
    END IF;

    -- A removed term that already has sections must stay; RAISE undoes this whole save
    SELECT COALESCE(tt.label, 'term') INTO v_blocked_name
    FROM public.terms t
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = v_sy_id
      AND t.deleted_at IS NULL
      AND NOT (t.id = ANY(v_incoming_term_ids))
      AND EXISTS (
          SELECT 1 FROM public.sections s
          WHERE s.term_id = t.id AND s.deleted_at IS NULL
      )
    LIMIT 1;

    IF v_blocked_name IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot remove the term "%": it already has sections. Keep it, or remove its sections first.', v_blocked_name
            USING ERRCODE = 'P0001';
    END IF;

    -- Soft delete removed terms for this school year
    UPDATE public.terms
    SET deleted_at = now(),
        deleted_by = v_current_user_id
    WHERE school_year_id = v_sy_id
      AND deleted_at IS NULL
      AND NOT (id = ANY(v_incoming_term_ids));

    -- 7. Synchronize Transmutation Table Rows
    IF p_transmutation_rows IS NOT NULL AND jsonb_array_length(p_transmutation_rows) > 0 THEN
        DELETE FROM public.grade_transmutation_tables
        WHERE school_year_id = v_sy_id;

        FOR v_row_elem IN SELECT * FROM jsonb_array_elements(p_transmutation_rows) LOOP
            INSERT INTO public.grade_transmutation_tables (
                school_year_id,
                label,
                min_percentage,
                max_percentage,
                transmuted_grade,
                is_passing,
                special_code,
                description,
                is_auto_detected,
                conditions
            ) VALUES (
                v_sy_id,
                btrim(v_row_elem->>'label'),
                NULLIF(v_row_elem->>'min_percentage', '')::numeric,
                NULLIF(v_row_elem->>'max_percentage', '')::numeric,
                NULLIF(v_row_elem->>'transmuted_grade', '')::numeric,
                COALESCE((v_row_elem->>'is_passing')::boolean, true),
                NULLIF(btrim(v_row_elem->>'special_code'), ''),
                NULLIF(btrim(v_row_elem->>'description'), ''),
                NULLIF(btrim(v_row_elem->>'special_code'), '') IS NOT NULL
                    AND COALESCE((v_row_elem->>'is_auto_detected')::boolean, false),
                CASE WHEN jsonb_typeof(v_row_elem->'conditions') = 'object'
                          AND NULLIF(btrim(v_row_elem->>'special_code'), '') IS NOT NULL
                     THEN v_row_elem->'conditions' END
            );
        END LOOP;
    END IF;

    -- Special-grade rows drive the detection engine for this academic year
    PERFORM public.fn_sync_special_grade_configs(v_sy_id);

    -- 8. Synchronize Academic Thresholds (an empty list removes them all, #37)
    IF p_thresholds IS NOT NULL AND jsonb_typeof(p_thresholds) = 'array' THEN
        DELETE FROM public.academic_thresholds
        WHERE school_year_id = v_sy_id;

        FOR v_thresh_elem IN SELECT * FROM jsonb_array_elements(p_thresholds) LOOP
            INSERT INTO public.academic_thresholds (
                school_year_id,
                category,
                code,
                label,
                min_gwa,
                max_gwa,
                min_subject_grade,
                requires_no_failing,
                scholarship_discount_pct,
                sort_order,
                is_active
            ) VALUES (
                v_sy_id,
                CASE 
                    WHEN (v_thresh_elem->>'category') IN ('Latin Honors', 'Scholarship', 'Standing', 'Honor', 'Custom')
                    THEN (v_thresh_elem->>'category')::public.academic_threshold_category_type
                    ELSE 'Honor'::public.academic_threshold_category_type
                END,
                btrim(v_thresh_elem->>'code'),
                btrim(v_thresh_elem->>'label'),
                NULLIF(v_thresh_elem->>'min_gwa', '')::numeric,
                (v_thresh_elem->>'max_gwa')::numeric,
                NULLIF(v_thresh_elem->>'min_subject_grade', '')::numeric,
                COALESCE((v_thresh_elem->>'requires_no_failing')::boolean, false),
                NULLIF(v_thresh_elem->>'scholarship_discount_pct', '')::numeric,
                COALESCE((v_thresh_elem->>'sort_order')::smallint, 1),
                COALESCE((v_thresh_elem->>'is_active')::boolean, true)
            );
        END LOOP;
    END IF;

    -- 9. Synchronize Calendar Exceptions & Holidays
    IF p_holidays IS NOT NULL THEN
        DELETE FROM public.school_year_calendar_exceptions
        WHERE school_year_id = v_sy_id;

        FOR v_holiday_elem IN SELECT * FROM jsonb_array_elements(p_holidays) LOOP
            INSERT INTO public.school_year_calendar_exceptions (
                school_year_id,
                title,
                exception_type,
                start_date,
                end_date,
                affects_attendance,
                description
            ) VALUES (
                v_sy_id,
                btrim(v_holiday_elem->>'title'),
                CASE 
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Break' THEN 'Break'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Suspension' THEN 'Suspension'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) IN ('Exam', 'Exam Day') THEN 'Exam'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) IN ('Event', 'Special Class') THEN 'Event'::public.calendar_exception_type
                    WHEN btrim(COALESCE(v_holiday_elem->>'exception_type', '')) = 'Other' THEN 'Other'::public.calendar_exception_type
                    ELSE 'Holiday'::public.calendar_exception_type
                END,
                COALESCE(NULLIF(v_holiday_elem->>'start_date', '')::date, p_start_date),
                COALESCE(NULLIF(v_holiday_elem->>'end_date', '')::date, NULLIF(v_holiday_elem->>'start_date', '')::date, p_start_date),
                COALESCE((v_holiday_elem->>'affects_attendance')::boolean, true),
                NULLIF(btrim(v_holiday_elem->>'description'), '')
            );
        END LOOP;
    END IF;

    -- Query full synchronized terms with grading periods
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', t.id,
            'term_type_id', t.term_type_id,
            'term_type_label', tt.label,
            'term_type_code', tt.code,
            'start_date', t.start_date,
            'end_date', t.end_date,
            'enrollment_start_date', t.enrollment_start_date,
            'enrollment_end_date', t.enrollment_end_date,
            'grading_deadline', t.grading_deadline,
            'status', t.status,
            'evaluation_scope', t.evaluation_scope,
            'grading_periods', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', gp.id,
                        'name', gp.name,
                        'sequence', gp.sequence,
                        'start_date', gp.start_date,
                        'end_date', gp.end_date,
                        'weight', gp.weight,
                        'major_exam_start_date', gp.major_exam_start_date,
                        'major_exam_end_date', gp.major_exam_end_date,
                        'grade_encoding_start_date', gp.grade_encoding_start_date,
                        'grade_encoding_end_date', gp.grade_encoding_end_date,
                        'components', COALESCE(gp.components, '[]'::jsonb)
                    ) ORDER BY gp.sequence ASC
                ), '[]'::jsonb)
                FROM public.grading_periods gp
                WHERE gp.term_id = t.id AND gp.deleted_at IS NULL
            )
        ) ORDER BY t.start_date ASC
    ), '[]'::jsonb)
    INTO v_full_terms
    FROM public.terms t
    LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
    WHERE t.school_year_id = v_sy_id AND t.deleted_at IS NULL;

    -- Query full transmutation rows
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', g.id,
            'label', g.label,
            'min_percentage', g.min_percentage,
            'max_percentage', g.max_percentage,
            'transmuted_grade', g.transmuted_grade,
            'is_passing', g.is_passing,
            'special_code', g.special_code,
            'description', g.description,
            'is_auto_detected', g.is_auto_detected,
            'conditions', g.conditions
        ) ORDER BY g.min_percentage DESC NULLS LAST
    ), '[]'::jsonb)
    INTO v_full_trans
    FROM public.grade_transmutation_tables g
    WHERE g.school_year_id = v_sy_id;

    -- Query full thresholds
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'category', a.category,
            'code', a.code,
            'label', a.label,
            'min_gwa', a.min_gwa,
            'max_gwa', a.max_gwa,
            'min_subject_grade', a.min_subject_grade,
            'requires_no_failing', a.requires_no_failing,
            'scholarship_discount_pct', a.scholarship_discount_pct,
            'sort_order', a.sort_order,
            'is_active', a.is_active
        ) ORDER BY a.sort_order ASC
    ), '[]'::jsonb)
    INTO v_full_thresh
    FROM public.academic_thresholds a
    WHERE a.school_year_id = v_sy_id;

    -- Query full holidays
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'exception_type', e.exception_type,
            'start_date', e.start_date,
            'end_date', e.end_date,
            'affects_attendance', e.affects_attendance,
            'description', e.description
        ) ORDER BY e.start_date ASC
    ), '[]'::jsonb)
    INTO v_full_holidays
    FROM public.school_year_calendar_exceptions e
    WHERE e.school_year_id = v_sy_id;

    -- Snapshot of the synchronized configuration
    v_snapshot := jsonb_build_object(
        'id', v_sy_id,
        'code', v_clean_code,
        'label', v_clean_label,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'is_active', COALESCE(p_is_active, false),
        'max_units_per_term', v_units,
        'evaluation_scope', v_clean_eval_scope,
        'terms_count', jsonb_array_length(v_full_terms),
        'transmutation_rows_count', jsonb_array_length(v_full_trans),
        'thresholds_count', jsonb_array_length(v_full_thresh),
        'holidays_count', jsonb_array_length(v_full_holidays),
        'terms', v_full_terms,
        'transmutation_rows', v_full_trans,
        'thresholds', v_full_thresh,
        'holidays', v_full_holidays
    );

    -- 10. Handle Version History:
    -- A. When reverting back to an existing history version (p_revert_history_id IS NOT NULL),
    --    do NOT add a new version row. Mark the chosen reverted version as active.
    IF p_revert_history_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.school_year_histories
        WHERE id = p_revert_history_id
          AND school_year_id = v_sy_id
          AND deleted_at IS NULL
    ) THEN
        UPDATE public.school_year_histories
        SET is_active_version = (id = p_revert_history_id)
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Academic year calendar reverted successfully.',
            'school_year_id', v_sy_id,
            'has_real_change', false
        );

    -- B. When creating a new school year, always create version 1
    ELSIF v_is_new THEN
        v_summary := 'Created new academic year "' || v_clean_label || '" with ' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, and ' || jsonb_array_length(v_full_holidays) || ' holidays.';

        INSERT INTO public.school_year_histories (
            school_year_id,
            action,
            changed_by,
            change_summary,
            snapshot,
            is_active_version
        ) VALUES (
            v_sy_id,
            v_action,
            v_current_user_id,
            v_summary,
            v_snapshot,
            true
        );

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Academic year calendar saved successfully.',
            'school_year_id', v_sy_id,
            'has_real_change', true
        );

    -- C. When saving an existing school year: ONLY add a new version when a real change occurs!
    ELSE
        -- Fetch active snapshot
        SELECT id, snapshot INTO v_active_history_id, v_active_snapshot
        FROM public.school_year_histories
        WHERE school_year_id = v_sy_id
          AND deleted_at IS NULL
          AND is_active_version = true
        ORDER BY changed_at DESC
        LIMIT 1;

        IF v_active_history_id IS NULL THEN
            SELECT id, snapshot INTO v_active_history_id, v_active_snapshot
            FROM public.school_year_histories
            WHERE school_year_id = v_sy_id
              AND deleted_at IS NULL
            ORDER BY changed_at DESC
            LIMIT 1;
        END IF;

        IF v_active_snapshot IS NULL THEN
            v_has_real_change := true;
        ELSE
            -- 1. Compare header fields
            v_header_matches := (
                lower(btrim(COALESCE(v_active_snapshot->>'code', ''))) = lower(v_clean_code)
                AND btrim(COALESCE(v_active_snapshot->>'label', '')) = v_clean_label
                AND COALESCE(v_active_snapshot->>'start_date', '') = p_start_date::text
                AND COALESCE(v_active_snapshot->>'end_date', '') = p_end_date::text
                AND COALESCE((v_active_snapshot->>'is_active')::boolean, false) = COALESCE(p_is_active, false)
                AND COALESCE((v_active_snapshot->>'max_units_per_term')::smallint, 24::smallint) = v_units
                AND COALESCE(v_active_snapshot->>'evaluation_scope', 'Period') = v_clean_eval_scope
            );

            -- 2. Compare terms normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'term_type_label', lower(btrim(COALESCE(t->>'term_type_label', ''))),
                            'start_date', t->>'start_date',
                            'end_date', t->>'end_date',
                            'enrollment_start_date', COALESCE(t->>'enrollment_start_date', ''),
                            'enrollment_end_date', COALESCE(t->>'enrollment_end_date', ''),
                            'grading_deadline', COALESCE(t->>'grading_deadline', ''),
                            'status', COALESCE(t->>'status', 'Upcoming'),
                            'evaluation_scope', COALESCE(t->>'evaluation_scope', 'Period'),
                            'grading_periods', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', lower(btrim(COALESCE(gp->>'name', ''))),
                                        'sequence', COALESCE((gp->>'sequence')::int, 1),
                                        'start_date', COALESCE(gp->>'start_date', ''),
                                        'end_date', COALESCE(gp->>'end_date', ''),
                                        'weight', COALESCE((gp->>'weight')::numeric, 0),
                                        'major_exam_start_date', COALESCE(gp->>'major_exam_start_date', ''),
                                        'major_exam_end_date', COALESCE(gp->>'major_exam_end_date', ''),
                                        'grade_encoding_start_date', COALESCE(gp->>'grade_encoding_start_date', ''),
                                        'grade_encoding_end_date', COALESCE(gp->>'grade_encoding_end_date', ''),
                                        'components', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'name', lower(btrim(COALESCE(c->>'name', ''))),
                                                    'weight', COALESCE((c->>'weight')::numeric, 0)
                                                ) ORDER BY lower(btrim(COALESCE(c->>'name', '')))
                                            ), '[]'::jsonb)
                                            FROM jsonb_array_elements(COALESCE(gp->'components', '[]'::jsonb)) c
                                        )
                                    ) ORDER BY COALESCE((gp->>'sequence')::int, 1)
                                ), '[]'::jsonb)
                                FROM jsonb_array_elements(COALESCE(t->'grading_periods', '[]'::jsonb)) gp
                            )
                        ) ORDER BY t->>'start_date'
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'terms', '[]'::jsonb)) t
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'term_type_label', lower(btrim(COALESCE(t->>'term_type_label', ''))),
                            'start_date', t->>'start_date',
                            'end_date', t->>'end_date',
                            'enrollment_start_date', COALESCE(t->>'enrollment_start_date', ''),
                            'enrollment_end_date', COALESCE(t->>'enrollment_end_date', ''),
                            'grading_deadline', COALESCE(t->>'grading_deadline', ''),
                            'status', COALESCE(t->>'status', 'Upcoming'),
                            'evaluation_scope', COALESCE(t->>'evaluation_scope', 'Period'),
                            'grading_periods', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'name', lower(btrim(COALESCE(gp->>'name', ''))),
                                        'sequence', COALESCE((gp->>'sequence')::int, 1),
                                        'start_date', COALESCE(gp->>'start_date', ''),
                                        'end_date', COALESCE(gp->>'end_date', ''),
                                        'weight', COALESCE((gp->>'weight')::numeric, 0),
                                        'major_exam_start_date', COALESCE(gp->>'major_exam_start_date', ''),
                                        'major_exam_end_date', COALESCE(gp->>'major_exam_end_date', ''),
                                        'grade_encoding_start_date', COALESCE(gp->>'grade_encoding_start_date', ''),
                                        'grade_encoding_end_date', COALESCE(gp->>'grade_encoding_end_date', ''),
                                        'components', (
                                            SELECT COALESCE(jsonb_agg(
                                                jsonb_build_object(
                                                    'name', lower(btrim(COALESCE(c->>'name', ''))),
                                                    'weight', COALESCE((c->>'weight')::numeric, 0)
                                                ) ORDER BY lower(btrim(COALESCE(c->>'name', '')))
                                            ), '[]'::jsonb)
                                            FROM jsonb_array_elements(COALESCE(gp->'components', '[]'::jsonb)) c
                                        )
                                    ) ORDER BY COALESCE((gp->>'sequence')::int, 1)
                                ), '[]'::jsonb)
                                FROM jsonb_array_elements(COALESCE(t->'grading_periods', '[]'::jsonb)) gp
                            )
                        ) ORDER BY t->>'start_date'
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'terms', '[]'::jsonb)) t
                )
            ) INTO v_terms_match;

            -- 3. Compare transmutation normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'label', lower(btrim(COALESCE(r->>'label', ''))),
                            'min_percentage', COALESCE((r->>'min_percentage')::numeric, 0),
                            'max_percentage', COALESCE((r->>'max_percentage')::numeric, 0),
                            'transmuted_grade', (r->>'transmuted_grade')::numeric,
                            'is_passing', COALESCE((r->>'is_passing')::boolean, true),
                            'special_code', lower(btrim(COALESCE(r->>'special_code', ''))),
                            'description', btrim(COALESCE(r->>'description', '')),
                            'is_auto_detected', COALESCE((r->>'is_auto_detected')::boolean, false),
                            'conditions', CASE WHEN COALESCE((r->>'is_auto_detected')::boolean, false) THEN r->'conditions' END
                        ) ORDER BY COALESCE((r->>'min_percentage')::numeric, 0) DESC, lower(btrim(COALESCE(r->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'transmutation_rows', '[]'::jsonb)) r
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'label', lower(btrim(COALESCE(r->>'label', ''))),
                            'min_percentage', COALESCE((r->>'min_percentage')::numeric, 0),
                            'max_percentage', COALESCE((r->>'max_percentage')::numeric, 0),
                            'transmuted_grade', (r->>'transmuted_grade')::numeric,
                            'is_passing', COALESCE((r->>'is_passing')::boolean, true),
                            'special_code', lower(btrim(COALESCE(r->>'special_code', ''))),
                            'description', btrim(COALESCE(r->>'description', '')),
                            'is_auto_detected', COALESCE((r->>'is_auto_detected')::boolean, false),
                            'conditions', CASE WHEN COALESCE((r->>'is_auto_detected')::boolean, false) THEN r->'conditions' END
                        ) ORDER BY COALESCE((r->>'min_percentage')::numeric, 0) DESC, lower(btrim(COALESCE(r->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'transmutation_rows', '[]'::jsonb)) r
                )
            ) INTO v_trans_match;

            -- 4. Compare thresholds normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'category', COALESCE(th->>'category', 'Honor'),
                            'code', lower(btrim(COALESCE(th->>'code', ''))),
                            'label', lower(btrim(COALESCE(th->>'label', ''))),
                            'min_gwa', (th->>'min_gwa')::numeric,
                            'max_gwa', (th->>'max_gwa')::numeric,
                            'min_subject_grade', (th->>'min_subject_grade')::numeric,
                            'requires_no_failing', COALESCE((th->>'requires_no_failing')::boolean, false),
                            'scholarship_discount_pct', (th->>'scholarship_discount_pct')::numeric,
                            'sort_order', COALESCE((th->>'sort_order')::int, 1),
                            'is_active', COALESCE((th->>'is_active')::boolean, true)
                        ) ORDER BY COALESCE((th->>'sort_order')::int, 1), lower(btrim(COALESCE(th->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'thresholds', '[]'::jsonb)) th
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'category', COALESCE(th->>'category', 'Honor'),
                            'code', lower(btrim(COALESCE(th->>'code', ''))),
                            'label', lower(btrim(COALESCE(th->>'label', ''))),
                            'min_gwa', (th->>'min_gwa')::numeric,
                            'max_gwa', (th->>'max_gwa')::numeric,
                            'min_subject_grade', (th->>'min_subject_grade')::numeric,
                            'requires_no_failing', COALESCE((th->>'requires_no_failing')::boolean, false),
                            'scholarship_discount_pct', (th->>'scholarship_discount_pct')::numeric,
                            'sort_order', COALESCE((th->>'sort_order')::int, 1),
                            'is_active', COALESCE((th->>'is_active')::boolean, true)
                        ) ORDER BY COALESCE((th->>'sort_order')::int, 1), lower(btrim(COALESCE(th->>'label', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'thresholds', '[]'::jsonb)) th
                )
            ) INTO v_thresh_match;

            -- 5. Compare holidays normalized
            SELECT (
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', lower(btrim(COALESCE(h->>'title', ''))),
                            'exception_type', COALESCE(h->>'exception_type', 'Holiday'),
                            'start_date', h->>'start_date',
                            'end_date', h->>'end_date',
                            'affects_attendance', COALESCE((h->>'affects_attendance')::boolean, true),
                            'description', btrim(COALESCE(h->>'description', ''))
                        ) ORDER BY h->>'start_date', lower(btrim(COALESCE(h->>'title', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_snapshot->'holidays', '[]'::jsonb)) h
                ) = (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'title', lower(btrim(COALESCE(h->>'title', ''))),
                            'exception_type', COALESCE(h->>'exception_type', 'Holiday'),
                            'start_date', h->>'start_date',
                            'end_date', h->>'end_date',
                            'affects_attendance', COALESCE((h->>'affects_attendance')::boolean, true),
                            'description', btrim(COALESCE(h->>'description', ''))
                        ) ORDER BY h->>'start_date', lower(btrim(COALESCE(h->>'title', '')))
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(v_active_snapshot->'holidays', '[]'::jsonb)) h
                )
            ) INTO v_holidays_match;

            v_has_real_change := NOT (
                v_header_matches 
                AND v_terms_match 
                AND v_trans_match 
                AND v_thresh_match 
                AND v_holidays_match
            );
        END IF;

        IF v_has_real_change THEN
            v_summary := 'Updated academic year "' || v_clean_label || '" configuration (' || jsonb_array_length(v_full_terms) || ' terms, ' || jsonb_array_length(v_full_trans) || ' grade schema rules, ' || jsonb_array_length(v_full_thresh) || ' thresholds, ' || jsonb_array_length(v_full_holidays) || ' holidays).';

            UPDATE public.school_year_histories
            SET is_active_version = false
            WHERE school_year_id = v_sy_id
              AND deleted_at IS NULL
              AND is_active_version = true;

            INSERT INTO public.school_year_histories (
                school_year_id,
                action,
                changed_by,
                change_summary,
                snapshot,
                is_active_version
            ) VALUES (
                v_sy_id,
                v_action,
                v_current_user_id,
                v_summary,
                v_snapshot,
                true
            );

            RETURN jsonb_build_object(
                'success', true,
                'message', 'Academic year calendar saved successfully.',
                'school_year_id', v_sy_id,
                'has_real_change', true
            );
        ELSE
            -- No real changes: keep active version, do not add new history row
            RETURN jsonb_build_object(
                'success', true,
                'message', 'No changes detected. Academic year calendar remains unchanged.',
                'school_year_id', v_sy_id,
                'has_real_change', false
            );
        END IF;
    END IF;
END;
$function$;

-- 5a. fn_bulk_create_programs
CREATE OR REPLACE FUNCTION public.fn_bulk_create_programs(p_programs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_program JSONB;
    v_department_id UUID;
    v_program_level_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
    v_dean_department_id UUID := public.fn_get_dean_department_id();
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_program IN SELECT * FROM jsonb_array_elements(p_programs)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_program->>'code') IS NULL OR TRIM(v_program->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Code is required'
            );
            CONTINUE;
        END IF;

        IF (v_program->>'name') IS NULL OR TRIM(v_program->>'name') = '' THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Name is required'
            );
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.programs
            WHERE upper(btrim(code)) = upper(btrim(v_program->>'code'))
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program code already exists: ' || (v_program->>'code')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE upper(btrim(code)) = upper(btrim(v_program->>'department_code'))
        AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Department code not found: ' || COALESCE(v_program->>'department_code', 'empty')
            );
            CONTINUE;
        END IF;

        -- Deans import only into their own department (NULL = Admin, unscoped)
        IF v_dean_department_id IS NOT NULL AND v_department_id IS DISTINCT FROM v_dean_department_id THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'You can only import programs into your own department.'
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_program_level_id
        FROM public.program_levels
        WHERE upper(btrim(code)) = upper(btrim(v_program->>'program_level_code'))
        AND deleted_at IS NULL;

        IF v_program_level_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Program level code not found: ' || COALESCE(v_program->>'program_level_code', 'empty')
            );
            CONTINUE;
        END IF;

        IF (v_program->>'years_duration') IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Years duration is required'
            );
            CONTINUE;
        END IF;

        -- Check the format first so a bad value never reaches the cast.
        IF (CASE
            WHEN (v_program->>'years_duration') ~ '^\s*[0-9]{1,3}\s*$'
                THEN btrim(v_program->>'years_duration')::INTEGER NOT BETWEEN 1 AND 6
            ELSE TRUE
        END) THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Years duration must be between 1 and 6'
            );
            CONTINUE;
        END IF;

        INSERT INTO public.programs (
            code, name, department_id, program_level_id,
            years_duration, total_units, description, is_active, created_by
        )
        VALUES (
            TRIM(v_program->>'code'),
            TRIM(v_program->>'name'),
            v_department_id,
            v_program_level_id,
            btrim(v_program->>'years_duration')::SMALLINT,
            CASE WHEN v_program->>'total_units' = '' THEN NULL
                 ELSE (v_program->>'total_units')::NUMERIC END,
            NULLIF(TRIM(COALESCE(v_program->>'description', '')), ''),
            COALESCE((v_program->>'is_active')::BOOLEAN, TRUE),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' program(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$function$;

-- 5b. fn_create_program
CREATE OR REPLACE FUNCTION public.fn_create_program(p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
    v_program_id uuid;
    v_dean_department_id uuid := public.fn_get_dean_department_id();
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    -- Deans create programs only in their own department (NULL = Admin, unscoped)
    IF v_dean_department_id IS NOT NULL AND p_department_id IS DISTINCT FROM v_dean_department_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only create programs in your own department.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE id = p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 6');
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_program_code(p_name);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE lower(code) = lower(v_final_code) AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.programs
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    INSERT INTO public.programs (
        code, name, department_id, program_level_id,
        years_duration, total_units, description, is_active, created_by
    )
    VALUES (
        v_final_code, p_name, p_department_id, p_program_level_id,
        p_years_duration, p_total_units, NULLIF(p_description, ''), p_is_active, auth.uid()
    )
    RETURNING id INTO v_program_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Program created successfully',
        'code', v_final_code,
        'id', v_program_id,
        'program_id', v_program_id
    );
END;
$function$;

-- 5c. fn_update_program
CREATE OR REPLACE FUNCTION public.fn_update_program(p_program_id uuid, p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_final_code text;
    v_seq int := 1;
    v_dean_department_id uuid := public.fn_get_dean_department_id();
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    -- Deans edit only their own department's programs and cannot move one to another department
    IF v_dean_department_id IS NOT NULL AND (
        p_department_id IS DISTINCT FROM v_dean_department_id
        OR EXISTS (
            SELECT 1 FROM public.programs
            WHERE id = p_program_id
              AND deleted_at IS NULL
              AND department_id IS DISTINCT FROM v_dean_department_id
        )
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You can only manage programs in your own department.');
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 6');
    END IF;

    v_final_code := btrim(COALESCE(p_code, ''));
    IF v_final_code = '' THEN
        v_final_code := public.fn_generate_acronym(p_name, 'PRG');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE lower(code) = lower(v_final_code) AND id <> p_program_id AND deleted_at IS NULL
    ) THEN
        v_seq := 2;
        WHILE EXISTS (
            SELECT 1 FROM public.programs
            WHERE lower(code) = lower(v_final_code || '-' || v_seq::text) AND id <> p_program_id AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
        END LOOP;
        v_final_code := v_final_code || '-' || v_seq::text;
    END IF;

    UPDATE public.programs
    SET
        code = v_final_code,
        name = p_name,
        department_id = p_department_id,
        program_level_id = p_program_level_id,
        years_duration = p_years_duration,
        total_units = p_total_units,
        description = NULLIF(p_description, ''),
        is_active = p_is_active,
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program updated successfully', 'code', v_final_code);
END;
$function$;

-- W1. fn_bulk_create_sections
CREATE OR REPLACE FUNCTION public.fn_bulk_create_sections(p_sections jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_created_rows JSONB := '[]'::JSONB;
    v_updated_rows JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_created_count INTEGER := 0;
    v_updated_count INTEGER := 0;
    v_term_id UUID;
    v_is_active BOOLEAN;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
    v_section_id UUID;
    v_section_code TEXT;
    v_course_prefix TEXT;
    v_seq INTEGER;
    v_term_input TEXT;

    -- Old state for diff tracking
    v_old_room TEXT;
    v_old_max_slots SMALLINT;
    v_old_faculty_email TEXT;
    v_old_course_code TEXT;
    v_changes JSONB;

    -- Schedule processing
    v_days public.day_of_week_type[];
    v_start_time TIME;
    v_end_time TIME;
    v_sched_room TEXT;
    v_conflict TEXT;
    v_day_name public.day_of_week_type;

    -- Counters as they were before the current row, restored if the row fails part-way
    v_saved_created_count INTEGER;
    v_saved_updated_count INTEGER;
    v_saved_created_rows JSONB;
    v_saved_updated_rows JSONB;
    v_time_message TEXT;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean');

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;
        v_saved_created_count := v_created_count;
        v_saved_updated_count := v_updated_count;
        v_saved_created_rows := v_created_rows;
        v_saved_updated_rows := v_updated_rows;

        -- Schedule days and times are checked before anything is saved
        v_time_message := NULL;
        v_days := ARRAY[]::public.day_of_week_type[];
        v_start_time := NULL;
        v_end_time := NULL;
        IF COALESCE(trim(v_row->>'schedule_days'), '') <> '' THEN
            v_days := public.fn_parse_schedule_days(v_row->>'schedule_days');
            v_start_time := public.fn_parse_schedule_time(v_row->>'schedule_time_start');
            v_end_time := public.fn_parse_schedule_time(v_row->>'schedule_time_end');

            IF v_days IS NULL OR cardinality(v_days) = 0 THEN
                v_time_message := format('Schedule days "%s" not recognised. Use day names or letters, e.g. Monday, Wednesday or MWF or TTh.', v_row->>'schedule_days');
            ELSIF v_start_time IS NULL OR v_end_time IS NULL THEN
                v_time_message := 'Schedule start and end times are required with schedule days, e.g. 08:00 or 8:00 AM.';
            ELSIF v_end_time <= v_start_time THEN
                v_time_message := 'Schedule end time must be after the start time.';
            END IF;
        ELSIF COALESCE(trim(v_row->>'schedule_time_start'), '') <> '' OR COALESCE(trim(v_row->>'schedule_time_end'), '') <> '' THEN
            v_time_message := 'Schedule days are required when a schedule time is given.';
        END IF;

        IF v_time_message IS NOT NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'INVALID_SCHEDULE',
                'message', v_time_message
            );
            CONTINUE;
        END IF;

        BEGIN
            v_term_input := trim(COALESCE(v_row->>'term_label', ''));
            v_term_id := NULL;
            v_is_active := FALSE;

            IF v_term_input = '' THEN
                -- A blank term means the current term (same pick as the dashboards)
                SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
                FROM public.terms t
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE t.id = public.fn_dashboard_active_term()
                  AND t.deleted_at IS NULL;
            ELSE
                SELECT t.id, COALESCE(sy.is_active, false) INTO v_term_id, v_is_active
                FROM public.terms t
                INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
                INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
                WHERE t.deleted_at IS NULL AND (
                    (tt.label || ' - ' || sy.label) = v_term_input
                    OR (tt.label || ' ' || sy.label) = v_term_input
                    OR (tt.label || ' - ' || replace(sy.label, 'Academic Year ', '')) = v_term_input
                    OR (tt.label || ' ' || replace(sy.label, 'Academic Year ', '')) = v_term_input
                    OR LOWER(tt.label || ' - ' || sy.label) = LOWER(v_term_input)
                )
                LIMIT 1;
            END IF;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            IF NOT v_is_active THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'INACTIVE_ACADEMIC_YEAR',
                    'message', 'Sections can only be imported for the active academic year.'
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_course_id
            FROM public.courses
            WHERE code = trim(v_row->>'course_code') AND deleted_at IS NULL
            LIMIT 1;

            IF v_course_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'COURSE_NOT_FOUND',
                    'message', 'Course not found: ' || coalesce(v_row->>'course_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_faculty_id := NULL;
            IF (v_row->>'faculty_email') IS NOT NULL AND trim(v_row->>'faculty_email') <> '' THEN
                SELECT u.id INTO v_faculty_id
                FROM public.users u
                WHERE u.email = trim(v_row->>'faculty_email') AND u.deleted_at IS NULL
                LIMIT 1;

                IF v_faculty_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'FACULTY_NOT_FOUND',
                        'message', 'Faculty email not found: ' || (v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            v_section_code := trim(COALESCE(v_row->>'section_code', ''));
            IF v_section_code = '' THEN
                SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
                INTO v_course_prefix
                FROM public.courses WHERE id = v_course_id;

                v_seq := 1;
                v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                WHILE EXISTS (
                    SELECT 1 FROM public.sections
                    WHERE term_id = v_term_id
                    AND section_code = v_section_code
                    AND deleted_at IS NULL
                ) LOOP
                    v_seq := v_seq + 1;
                    v_section_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
                END LOOP;
            END IF;

            v_max_slots := 40;
            IF (v_row->>'max_slots') IS NOT NULL AND trim(v_row->>'max_slots') <> '' THEN
                v_max_slots := (v_row->>'max_slots')::SMALLINT;
                IF v_max_slots < 1 OR v_max_slots > 999 THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'INVALID_MAX_SLOTS',
                        'message', 'Max slots must be between 1 and 999.'
                    );
                    CONTINUE;
                END IF;
            END IF;

            -- Match existing section by (term, course, faculty) OR section_code
            SELECT id INTO v_section_id
            FROM public.sections
            WHERE term_id = v_term_id
            AND course_id = v_course_id
            AND (
                section_code = v_section_code
                OR (v_faculty_id IS NOT NULL AND faculty_id = v_faculty_id)
            )
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_section_id IS NOT NULL THEN
                -- Fetch old state for diffing
                SELECT s.room, s.max_slots, c.code, u.email, s.section_code
                INTO v_old_room, v_old_max_slots, v_old_course_code, v_old_faculty_email, v_section_code
                FROM public.sections s
                LEFT JOIN public.courses c ON c.id = s.course_id
                LEFT JOIN public.users u ON u.id = s.faculty_id
                WHERE s.id = v_section_id;

                v_changes := '[]'::JSONB;

                IF COALESCE(v_old_room, '') <> COALESCE(trim(v_row->>'room'), '') AND trim(COALESCE(v_row->>'room', '')) <> '' THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Room',
                        'previous', COALESCE(v_old_room, 'None'),
                        'changed', trim(v_row->>'room')
                    );
                END IF;

                IF v_old_max_slots IS DISTINCT FROM v_max_slots THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Max Slots',
                        'previous', COALESCE(v_old_max_slots::text, '40'),
                        'changed', v_max_slots::text
                    );
                END IF;

                IF COALESCE(v_old_faculty_email, '') <> COALESCE(trim(v_row->>'faculty_email'), '') AND trim(COALESCE(v_row->>'faculty_email', '')) <> '' THEN
                    v_changes := v_changes || jsonb_build_object(
                        'field', 'Faculty Email',
                        'previous', COALESCE(v_old_faculty_email, 'Unassigned'),
                        'changed', trim(v_row->>'faculty_email')
                    );
                END IF;

                UPDATE public.sections
                SET course_id = v_course_id,
                    faculty_id = COALESCE(v_faculty_id, faculty_id),
                    room = COALESCE(nullif(trim(v_row->>'room'), ''), room),
                    max_slots = v_max_slots,
                    updated_at = NOW(),
                    updated_by = auth.uid()
                WHERE id = v_section_id;

                v_updated_count := v_updated_count + 1;
                v_updated_rows := v_updated_rows || jsonb_build_object(
                    'row', v_index,
                    'section_id', v_section_id,
                    'section_code', v_section_code,
                    'course_code', trim(v_row->>'course_code'),
                    'faculty_email', coalesce(trim(v_row->>'faculty_email'), ''),
                    'room', coalesce(trim(v_row->>'room'), ''),
                    'max_slots', v_max_slots,
                    'changes', v_changes,
                    'message', 'Updated existing section offering'
                );
            ELSE
                INSERT INTO public.sections (
                    term_id,
                    course_id,
                    faculty_id,
                    section_code,
                    room,
                    max_slots,
                    status,
                    created_by
                ) VALUES (
                    v_term_id,
                    v_course_id,
                    v_faculty_id,
                    v_section_code,
                    nullif(trim(v_row->>'room'), ''),
                    v_max_slots,
                    'Open'::public.section_status_type,
                    auth.uid()
                )
                RETURNING id INTO v_section_id;

                PERFORM public.fn_seed_section_grading(v_section_id);

                v_created_count := v_created_count + 1;
                v_created_rows := v_created_rows || jsonb_build_object(
                    'row', v_index,
                    'section_id', v_section_id,
                    'section_code', v_section_code,
                    'course_code', trim(v_row->>'course_code'),
                    'faculty_email', coalesce(trim(v_row->>'faculty_email'), ''),
                    'room', coalesce(trim(v_row->>'room'), ''),
                    'max_slots', v_max_slots,
                    'message', 'Created new section offering'
                );
            END IF;

            -- Schedule slots, one per parsed day
            IF cardinality(v_days) > 0 THEN
                v_sched_room := COALESCE(NULLIF(trim(v_row->>'schedule_room'), ''), NULLIF(trim(v_row->>'room'), ''));

                UPDATE public.section_schedules
                SET deleted_at = NOW(),
                    deleted_by = auth.uid()
                WHERE section_id = v_section_id AND deleted_at IS NULL;

                FOREACH v_day_name IN ARRAY v_days LOOP
                    INSERT INTO public.section_schedules (
                        section_id,
                        day_of_week,
                        time_start,
                        time_end,
                        room,
                        created_by
                    ) VALUES (
                        v_section_id,
                        v_day_name,
                        v_start_time,
                        v_end_time,
                        v_sched_room,
                        auth.uid()
                    );
                END LOOP;
            END IF;

            -- Same check as the section wizard: no faculty or room double-booking in the term
            SELECT string_agg(DISTINCT format('%s %s-%s with %s (%s)',
                       n.day_of_week, to_char(n.time_start, 'HH24:MI'), to_char(n.time_end, 'HH24:MI'),
                       es.section_code,
                       CASE WHEN ns.faculty_id IS NOT NULL AND es.faculty_id = ns.faculty_id
                            THEN 'same faculty' ELSE 'same room' END), '; ')
            INTO v_conflict
            FROM public.section_schedules n
            INNER JOIN public.sections ns ON ns.id = n.section_id
            INNER JOIN public.sections es ON es.term_id = ns.term_id AND es.id <> ns.id AND es.deleted_at IS NULL
            INNER JOIN public.section_schedules e ON e.section_id = es.id AND e.deleted_at IS NULL
                AND e.day_of_week = n.day_of_week
                AND e.time_start < n.time_end
                AND n.time_start < e.time_end
            WHERE n.section_id = v_section_id
              AND n.deleted_at IS NULL
              AND (
                  (ns.faculty_id IS NOT NULL AND es.faculty_id = ns.faculty_id)
                  OR (
                      COALESCE(btrim(COALESCE(n.room, ns.room)), '') <> ''
                      AND upper(btrim(COALESCE(e.room, es.room))) = upper(btrim(COALESCE(n.room, ns.room)))
                  )
              );

            IF v_conflict IS NOT NULL THEN
                RAISE EXCEPTION 'Schedule conflict: %', v_conflict;
            END IF;

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            -- The row's changes were rolled back; so is its count
            v_created_count := v_saved_created_count;
            v_updated_count := v_saved_updated_count;
            v_created_rows := v_saved_created_rows;
            v_updated_rows := v_saved_updated_rows;
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', CASE WHEN SQLERRM LIKE 'Schedule conflict:%' THEN 'SCHEDULE_CONFLICT' ELSE 'DB_ERROR' END,
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total', v_index,
        'provisioned', v_provisioned,
        'created_count', v_created_count,
        'updated_count', v_updated_count,
        'created_rows', v_created_rows,
        'updated_rows', v_updated_rows,
        'skipped', jsonb_array_length(v_errors),
        'errors', v_errors
    );
END;
$function$;

-- W2a. fn_create_section
CREATE OR REPLACE FUNCTION public.fn_create_section(p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text DEFAULT NULL::text, p_room text DEFAULT NULL::text, p_max_slots smallint DEFAULT 40, p_status section_status_type DEFAULT 'Open'::section_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_final_code TEXT;
    v_course_prefix TEXT;
    v_seq INT := 1;
BEGIN
    PERFORM public.fn_assert_role('Admin', 'Dean', 'Registrar');

    IF COALESCE(p_max_slots, 40) < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max slots must be at least 1.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sections can only be created for the active academic year.');
    END IF;

    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    -- Resolve section code (always deterministic unique generation)
    v_final_code := btrim(COALESCE(p_section_code, ''));
    IF v_final_code = '' THEN
        SELECT COALESCE(NULLIF(regexp_replace(upper(code), '[^A-Z0-9]', '', 'g'), ''), 'SEC')
        INTO v_course_prefix
        FROM public.courses
        WHERE id = p_course_id;

        IF v_course_prefix IS NULL THEN
            v_course_prefix := 'SEC';
        END IF;

        v_final_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
        WHILE EXISTS (
            SELECT 1 FROM public.sections
            WHERE term_id = p_term_id
              AND lower(section_code) = lower(v_final_code)
              AND deleted_at IS NULL
        ) LOOP
            v_seq := v_seq + 1;
            v_final_code := v_course_prefix || '-' || lpad(v_seq::text, 3, '0');
        END LOOP;
    ELSE
        IF EXISTS (
            SELECT 1 FROM public.sections
            WHERE term_id = p_term_id
              AND lower(btrim(section_code)) = lower(v_final_code)
              AND deleted_at IS NULL
        ) THEN
            v_seq := 2;
            WHILE EXISTS (
                SELECT 1 FROM public.sections
                WHERE term_id = p_term_id
                  AND lower(btrim(section_code)) = lower(v_final_code || '-' || v_seq::text)
                  AND deleted_at IS NULL
            ) LOOP
                v_seq := v_seq + 1;
            END LOOP;
            v_final_code := v_final_code || '-' || v_seq::text;
        END IF;
    END IF;

    INSERT INTO public.sections (
        term_id,
        course_id,
        faculty_id,
        section_code,
        room,
        max_slots,
        status,
        created_by
    ) VALUES (
        p_term_id,
        p_course_id,
        p_faculty_id,
        v_final_code,
        NULLIF(btrim(p_room), ''),
        COALESCE(p_max_slots, 40),
        COALESCE(p_status, 'Open'::public.section_status_type),
        auth.uid()
    )
    RETURNING id INTO v_section_id;

    PERFORM public.fn_seed_section_grading(v_section_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section created successfully.',
        'id', v_section_id,
        'section_code', v_final_code
    );
END;
$function$;

-- W2b. fn_update_section
CREATE OR REPLACE FUNCTION public.fn_update_section(p_section_id uuid, p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status section_status_type)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_old_term_id UUID;
    v_old_course_id UUID;
    v_enrolled INTEGER;
BEGIN
    PERFORM public.fn_assert_role('Dean', 'Admin');

    IF COALESCE(p_max_slots, 40) < 1 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max slots must be at least 1.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE s.id = p_section_id
          AND s.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only sections belonging to the active academic year can be modified.');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.terms t
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.id = p_term_id
          AND t.deleted_at IS NULL
          AND sy.is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot move a section to a term outside the active academic year.');
    END IF;

    -- Lock the section so an enrollment cannot slip in while it is checked
    SELECT term_id, course_id INTO v_old_term_id, v_old_course_id
    FROM public.sections
    WHERE id = p_section_id
      AND deleted_at IS NULL
    FOR UPDATE;

    SELECT COUNT(*) INTO v_enrolled
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
      AND e.deleted_at IS NULL
      AND e.status NOT IN ('Dropped', 'Withdrawn');

    IF v_enrolled > 0 AND (v_old_term_id IS DISTINCT FROM p_term_id OR v_old_course_id IS DISTINCT FROM p_course_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('The course and term cannot change while %s student(s) are enrolled in this section.', v_enrolled)
        );
    END IF;

    IF COALESCE(p_max_slots, 40) < v_enrolled THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Max Slots cannot be lower than the %s student(s) already enrolled.', v_enrolled)
        );
    END IF;

    IF p_faculty_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
          AND course_id = p_course_id
          AND faculty_id = p_faculty_id
          AND id <> p_section_id
          AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'A section offering for this Term, Course, and Faculty already exists.'
        );
    END IF;

    -- Update fields without touching section_code
    UPDATE public.sections
    SET term_id = p_term_id,
        course_id = p_course_id,
        faculty_id = p_faculty_id,
        room = NULLIF(btrim(p_room), ''),
        max_slots = COALESCE(p_max_slots, 40),
        status = COALESCE(p_status, 'Open'::public.section_status_type),
        updated_at = now(),
        updated_by = auth.uid()
    WHERE id = p_section_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Section updated successfully.'
    );
END;
$function$;

COMMIT;
