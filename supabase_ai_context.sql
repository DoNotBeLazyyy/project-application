--
-- PostgreSQL database dump
--

\restrict mEIBpPjaGAVZuabeQJDSf9Ny4Gn4MRG4HaIYmkQFDMPsZ2belvcn4e9ZgwEriJq

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: announcement_audience_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.announcement_audience_type AS ENUM (
    'Global',
    'Faculty',
    'Student',
    'Section'
);


--
-- Name: assessment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assessment_type AS ENUM (
    'Quiz',
    'Exam',
    'Activity',
    'Assignment',
    'Project',
    'Lab Report'
);


--
-- Name: attendance_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status_type AS ENUM (
    'Present',
    'Absent',
    'Late',
    'Excused'
);


--
-- Name: audit_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action_type AS ENUM (
    'Insert',
    'Update',
    'Delete'
);


--
-- Name: civil_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.civil_status_type AS ENUM (
    'Single',
    'Married',
    'Widowed',
    'Separated'
);


--
-- Name: clearance_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clearance_status_type AS ENUM (
    'Pending',
    'Cleared',
    'Flagged'
);


--
-- Name: day_of_week_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.day_of_week_type AS ENUM (
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
);


--
-- Name: enrollment_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enrollment_status_type AS ENUM (
    'Enrolled',
    'Dropped',
    'Withdrawn',
    'Completed',
    'Failed',
    'Incomplete'
);


--
-- Name: evaluation_question_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.evaluation_question_type AS ENUM (
    'Rating',
    'Multiple Choice',
    'Open Ended'
);


--
-- Name: faculty_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.faculty_status_type AS ENUM (
    'Active',
    'Inactive',
    'On Leave',
    'Retired'
);


--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gender_type AS ENUM (
    'Male',
    'Female',
    'Prefer not to say'
);


--
-- Name: grade_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grade_status_type AS ENUM (
    'Draft',
    'Submitted',
    'Approved',
    'Released'
);


--
-- Name: material_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.material_type AS ENUM (
    'File',
    'Link',
    'Video',
    'Document',
    'Slide',
    'Other'
);


--
-- Name: prerequisite_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prerequisite_type AS ENUM (
    'Required',
    'Co-requisite',
    'Recommended'
);


--
-- Name: question_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_type AS ENUM (
    'Multiple Choice',
    'True or False',
    'Short Answer',
    'Essay',
    'Fill in the Blank',
    'Matching',
    'File Upload'
);


--
-- Name: section_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.section_status_type AS ENUM (
    'Open',
    'Full',
    'Ongoing',
    'Closed',
    'Cancelled'
);


--
-- Name: student_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.student_status_type AS ENUM (
    'Active',
    'Inactive',
    'LOA',
    'Graduated',
    'Expelled'
);


--
-- Name: submission_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_status_type AS ENUM (
    'Not Started',
    'In Progress',
    'Submitted',
    'Late',
    'Graded',
    'Returned'
);


--
-- Name: submission_timer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_timer_status AS ENUM (
    'Pending',
    'Active',
    'Expired',
    'Submitted'
);


--
-- Name: term_status_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.term_status_type AS ENUM (
    'Upcoming',
    'Enrollment Open',
    'Ongoing',
    'Grading Period',
    'Closed'
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: fn_activate_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_activate_user() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.users
    SET
        status     = 'Active',
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id         = auth.uid()
      AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_advance_term_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_advance_term_status(p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_status TEXT;
    v_next_status TEXT;
    v_school_year_id UUID;
    v_start_date DATE;
    v_end_date DATE;
    v_grading_deadline DATE;
BEGIN
    SELECT status, school_year_id, start_date, end_date, grading_deadline
    INTO v_current_status, v_school_year_id, v_start_date, v_end_date, v_grading_deadline
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    v_next_status := CASE v_current_status
        WHEN 'Upcoming' THEN 'Enrollment Open'
        WHEN 'Enrollment Open' THEN 'Ongoing'
        WHEN 'Ongoing' THEN 'Grading Period'
        WHEN 'Grading Period' THEN 'Closed'
        ELSE NULL
    END;

    IF v_next_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term is already closed and cannot be advanced');
    END IF;

    IF v_next_status = 'Ongoing' THEN
        IF EXISTS (
            SELECT 1 FROM public.terms
            WHERE school_year_id = v_school_year_id
            AND status IN ('Ongoing', 'Grading Period')
            AND id <> p_term_id
            AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Another term in this school year is already Ongoing or in Grading Period');
        END IF;
    END IF;

    UPDATE public.terms
    SET status = v_next_status
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Term status advanced to ' || v_next_status,
        'next_status', v_next_status,
        'previous_status', v_current_status
    );
END;
$$;


--
-- Name: fn_approve_and_release_grades(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_approve_and_release_grades(p_section_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_grade           RECORD;
  v_approved_count  INTEGER := 0;
  v_released_count  INTEGER := 0;
  v_eval_blocked    INTEGER := 0;
BEGIN
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
$$;


--
-- Name: fn_audit_assessment_submissions_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_audit_assessment_submissions_score() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF OLD.raw_score IS DISTINCT FROM NEW.raw_score THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'assessment_submissions', NEW.id, NEW.enrollment_id,
      'raw_score', OLD.raw_score::TEXT, NEW.raw_score::TEXT,
      COALESCE(NEW.feedback, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.final_score IS DISTINCT FROM NEW.final_score THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'assessment_submissions', NEW.id, NEW.enrollment_id,
      'final_score', OLD.final_score::TEXT, NEW.final_score::TEXT,
      COALESCE(NEW.feedback, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_audit_section_final_grades(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_audit_section_final_grades() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF OLD.raw_grade IS DISTINCT FROM NEW.raw_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'raw_grade', OLD.raw_grade::TEXT, NEW.raw_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.final_grade IS DISTINCT FROM NEW.final_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'final_grade', OLD.final_grade::TEXT, NEW.final_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.transmuted_grade IS DISTINCT FROM NEW.transmuted_grade THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'transmuted_grade', OLD.transmuted_grade::TEXT, NEW.transmuted_grade::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.grade_audit_logs (
      action, table_name, record_id, enrollment_id, grading_period_id,
      field_changed, old_value, new_value, change_reason, changed_by, ip_address
    ) VALUES (
      'Update', 'section_final_grades', NEW.id, NEW.enrollment_id, NEW.grading_period_id,
      'status', OLD.status::TEXT, NEW.status::TEXT,
      COALESCE(NEW.remarks, 'No reason provided'), auth.uid(), inet_client_addr()
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_auto_complete_evaluation_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_auto_complete_evaluation_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment_id     UUID;
  v_grading_period_id UUID;
BEGIN
  SELECT enrollment_id, grading_period_id
  INTO v_enrollment_id, v_grading_period_id
  FROM public.evaluation_responses
  WHERE id = NEW.id;

  IF fn_check_evaluation_completion(v_enrollment_id, v_grading_period_id) THEN
    UPDATE public.evaluation_period_locks
    SET
      is_completed      = true,
      completed_at      = now()
    WHERE enrollment_id     = v_enrollment_id
      AND grading_period_id = v_grading_period_id
      AND is_completed      = false
      AND deleted_at        IS NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: fn_broadcast_section_notification(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_broadcast_section_notification(p_section_id uuid, p_title text, p_message text, p_action_url text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment RECORD;
  v_count      INTEGER := 0;
BEGIN
  FOR v_enrollment IN
    SELECT e.student_id, st.user_id
    FROM public.enrollments e
    INNER JOIN public.students st ON st.id = e.student_id
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
      AND st.deleted_at IS NULL
  LOOP
    PERFORM fn_notify_user(v_enrollment.user_id, p_title, p_message, p_action_url);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',    true,
    'notified',   v_count,
    'section_id', p_section_id
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_build_pageable_dto(text, integer, integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_build_pageable_dto(p_base_query text, p_page integer, p_size integer, p_sort jsonb, p_default_sort text DEFAULT 'created_at ASC'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_order_by    TEXT    := '';
    v_item        JSONB;
    v_dir         TEXT;
    v_full_query  TEXT;
    v_result_rec  RECORD;
    v_rows        JSONB;
    v_total       BIGINT;
    v_page_num    INT;
    v_total_pages INT;
    v_offset      INT;
    v_sorted      BOOLEAN;
BEGIN
    v_page_num := p_page - 1;
    v_offset   := v_page_num * p_size;

    IF p_sort IS NOT NULL AND jsonb_array_length(p_sort) > 0 THEN
        v_sorted := TRUE;
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_sort)
        LOOP
            IF v_order_by <> '' THEN
                v_order_by := v_order_by || ', ';
            END IF;
            v_dir      := CASE WHEN (v_item->>'isAsc')::BOOLEAN THEN 'ASC' ELSE 'DESC' END;
            v_order_by := v_order_by || quote_ident(v_item->>'sortKey') || ' ' || v_dir;
        END LOOP;
    ELSE
        v_sorted   := FALSE;
        v_order_by := p_default_sort;
    END IF;

    v_full_query := format(
        '%s ORDER BY %s LIMIT %s OFFSET %s',
        p_base_query,
        v_order_by,
        p_size::TEXT,
        v_offset::TEXT
    );

    FOR v_result_rec IN EXECUTE format(
        'SELECT COALESCE(jsonb_agg(to_jsonb(t)), %L::JSONB) AS rows, COALESCE(MAX(t.total_count), 0) AS total FROM (%s) t',
        '[]',
        v_full_query
    )
    LOOP
        v_rows  := v_result_rec.rows;
        v_total := v_result_rec.total;
    END LOOP;

    v_total_pages := CASE WHEN p_size > 0 THEN CEIL(v_total::NUMERIC / p_size)::INT ELSE 0 END;

    RETURN jsonb_build_object(
        'content',          v_rows,
        'empty',            jsonb_array_length(v_rows) = 0,
        'first',            v_page_num = 0,
        'last',             v_page_num >= v_total_pages - 1,
        'number',           v_page_num,
        'numberOfElements', jsonb_array_length(v_rows),
        'pageable',         jsonb_build_object(
            'offset',       v_offset,
            'paged',        TRUE,
            'pageNumber',   v_page_num,
            'pageSize',     p_size,
            'sort',         jsonb_build_object(
                'empty',    NOT v_sorted,
                'sorted',   v_sorted,
                'unsorted', NOT v_sorted
            ),
            'unpaged',      FALSE
        ),
        'size',             p_size,
        'sort',             jsonb_build_object(
            'empty',        NOT v_sorted,
            'sorted',       v_sorted,
            'unsorted',     NOT v_sorted
        ),
        'totalElements',    v_total,
        'totalPages',       v_total_pages
    );
END;
$$;


--
-- Name: fn_bulk_create_courses(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_create_courses(p_courses jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_course JSONB;
    v_course_id UUID;
    v_department_id UUID;
    v_course_type_id UUID;
    v_prereq_code TEXT;
    v_prereq_type TEXT;
    v_prereq_grade TEXT;
    v_prereq_id UUID;
    v_prereq_parts TEXT[];
    v_prereq_entry TEXT;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_course IN SELECT * FROM jsonb_array_elements(p_courses)
    LOOP
        v_row_num := v_row_num + 1;

        IF (v_course->>'code') IS NULL OR TRIM(v_course->>'code') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', '', 'message', 'Code is required'));
            CONTINUE;
        END IF;

        IF (v_course->>'title') IS NULL OR TRIM(v_course->>'title') = '' THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Title is required'));
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = v_course->>'code' AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Course code already exists: ' || (v_course->>'code')));
            CONTINUE;
        END IF;

        SELECT id INTO v_department_id
        FROM public.departments
        WHERE code = v_course->>'department_code' AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Department code not found: ' || COALESCE(v_course->>'department_code', 'empty')));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_type_id
        FROM public.course_types
        WHERE code = v_course->>'course_type_code' AND deleted_at IS NULL;

        IF v_course_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Course type code not found: ' || COALESCE(v_course->>'course_type_code', 'empty')));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC < 0 OR (v_course->>'lecture_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Lecture units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'laboratory_units')::NUMERIC < 0 OR (v_course->>'laboratory_units')::NUMERIC > 10 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Laboratory units must be between 0 and 10'));
            CONTINUE;
        END IF;

        IF (v_course->>'lecture_units')::NUMERIC = 0 AND (v_course->>'laboratory_units')::NUMERIC = 0 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'At least one of lecture units or laboratory units must be greater than 0'));
            CONTINUE;
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            TRIM(v_course->>'code'),
            TRIM(v_course->>'title'),
            v_department_id,
            v_course_type_id,
            (v_course->>'lecture_units')::NUMERIC,
            (v_course->>'laboratory_units')::NUMERIC,
            CASE WHEN v_course->>'credit_hours' = '' THEN NULL
                 ELSE (v_course->>'credit_hours')::NUMERIC END,
            NULLIF(TRIM(COALESCE(v_course->>'description', '')), ''),
            COALESCE((v_course->>'is_active')::BOOLEAN, TRUE),
            auth.uid()
        )
        RETURNING id INTO v_course_id;

        IF v_course->>'prerequisites' IS NOT NULL AND v_course->>'prerequisites' <> '' THEN
            FOREACH v_prereq_entry IN ARRAY string_to_array(v_course->>'prerequisites', '|')
            LOOP
                v_prereq_parts := string_to_array(v_prereq_entry, ':');
                v_prereq_code := TRIM(v_prereq_parts[1]);
                v_prereq_type := TRIM(COALESCE(v_prereq_parts[2], 'Required'));
                v_prereq_grade := TRIM(COALESCE(v_prereq_parts[3], ''));

                SELECT id INTO v_prereq_id
                FROM public.courses
                WHERE code = v_prereq_code AND deleted_at IS NULL;

                IF v_prereq_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_num, 'code', v_course->>'code', 'message', 'Prerequisite course code not found: ' || v_prereq_code));
                    CONTINUE;
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type, minimum_grade, created_by
                )
                VALUES (
                    v_course_id,
                    v_prereq_id,
                    v_prereq_type::public.prerequisite_type,
                    CASE WHEN v_prereq_grade = '' THEN NULL ELSE v_prereq_grade::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' course(s) created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$$;


--
-- Name: fn_bulk_create_curriculum_map(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_create_curriculum_map(p_entries jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_entry JSONB;
    v_program_id UUID;
    v_course_id UUID;
    v_term_type_id UUID;
    v_school_year_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_row_num := v_row_num + 1;

        SELECT id INTO v_program_id
        FROM public.programs
        WHERE code = v_entry->>'program_code' AND deleted_at IS NULL;

        IF v_program_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Program code not found: ' || COALESCE(v_entry->>'program_code', 'empty')
            ));
            CONTINUE;
        END IF;

        SELECT id INTO v_course_id
        FROM public.courses
        WHERE code = v_entry->>'course_code' AND deleted_at IS NULL;

        IF v_course_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course code not found: ' || COALESCE(v_entry->>'course_code', 'empty')
            ));
            CONTINUE;
        END IF;

        SELECT id INTO v_term_type_id
        FROM public.term_types
        WHERE code = v_entry->>'term_type_code' AND deleted_at IS NULL;

        IF v_term_type_id IS NULL THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Term type code not found: ' || COALESCE(v_entry->>'term_type_code', 'empty')
            ));
            CONTINUE;
        END IF;

        IF v_entry->>'school_year_code' IS NOT NULL AND v_entry->>'school_year_code' <> '' THEN
            SELECT id INTO v_school_year_id
            FROM public.school_years
            WHERE code = v_entry->>'school_year_code' AND deleted_at IS NULL;

            IF v_school_year_id IS NULL THEN
                v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                    'row', v_row_num,
                    'code', v_entry->>'course_code',
                    'message', 'School year code not found: ' || (v_entry->>'school_year_code')
                ));
                CONTINUE;
            END IF;
        ELSE
            v_school_year_id := NULL;
        END IF;

        IF (v_entry->>'year_level')::SMALLINT < 1 OR (v_entry->>'year_level')::SMALLINT > 6 THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Year level must be between 1 and 6'
            ));
            CONTINUE;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.curriculum_maps
            WHERE program_id = v_program_id
            AND course_id = v_course_id
            AND school_year_id IS NOT DISTINCT FROM v_school_year_id
            AND deleted_at IS NULL
        ) THEN
            v_errors := v_errors || jsonb_build_array(jsonb_build_object(
                'row', v_row_num,
                'code', v_entry->>'course_code',
                'message', 'Course already exists in curriculum for this program and school year'
            ));
            CONTINUE;
        END IF;

        INSERT INTO public.curriculum_maps (
            program_id, course_id, year_level, term_type_id,
            school_year_id, sequence, is_elective, created_by
        )
        VALUES (
            v_program_id,
            v_course_id,
            (v_entry->>'year_level')::SMALLINT,
            v_term_type_id,
            v_school_year_id,
            COALESCE((v_entry->>'sequence')::SMALLINT, 1),
            COALESCE((v_entry->>'is_elective')::BOOLEAN, FALSE),
            auth.uid()
        );

        v_success_count := v_success_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_success_count || ' curriculum map entries created successfully',
        'provisioned_count', v_success_count,
        'errors', v_errors
    );
END;
$$;


--
-- Name: fn_bulk_create_enrollments(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_create_enrollments(p_enrollments jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_row          JSONB;
    v_index        INTEGER := 0;
    v_errors       JSONB := '[]'::JSONB;
    v_provisioned  INTEGER := 0;
    v_student_id   UUID;
    v_section_id   UUID;
    v_term_id      UUID;
    v_max_slots    SMALLINT;
    v_enrolled     INTEGER;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_enrollments)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_student_id
            FROM public.students
            WHERE student_number = trim(v_row->>'student_number') AND deleted_at IS NULL
            LIMIT 1;

            IF v_student_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'STUDENT_NOT_FOUND',
                    'message', 'Student not found: ' || coalesce(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT t.id INTO v_term_id
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT id INTO v_section_id
            FROM public.sections
            WHERE section_code = trim(v_row->>'section_code')
            AND term_id = v_term_id
            AND deleted_at IS NULL
            LIMIT 1;

            IF v_section_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SECTION_NOT_FOUND',
                    'message', 'Section not found: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.enrollments
                WHERE student_id = v_student_id
                AND section_id = v_section_id
                AND status NOT IN ('Dropped', 'Withdrawn')
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'ALREADY_ENROLLED',
                    'message', 'Student already enrolled in section: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            SELECT max_slots INTO v_max_slots
            FROM public.sections WHERE id = v_section_id;

            SELECT COUNT(*) INTO v_enrolled
            FROM public.enrollments
            WHERE section_id = v_section_id
            AND status NOT IN ('Dropped', 'Withdrawn')
            AND deleted_at IS NULL;

            IF v_enrolled >= v_max_slots THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'SECTION_FULL',
                    'message', 'Section is full: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            INSERT INTO public.enrollments (
                student_id,
                section_id,
                status,
                enrolled_at,
                created_by
            ) VALUES (
                v_student_id,
                v_section_id,
                'Enrolled'::public.enrollment_status_type,
                now(),
                auth.uid()
            );

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$$;


--
-- Name: fn_bulk_create_programs(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_create_programs(p_programs jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_program JSONB;
    v_department_id UUID;
    v_program_level_id UUID;
    v_errors JSONB := '[]'::JSONB;
    v_success_count INTEGER := 0;
    v_row_num INTEGER := 0;
BEGIN
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
            WHERE code = v_program->>'code'
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
        WHERE code = v_program->>'department_code'
        AND deleted_at IS NULL;

        IF v_department_id IS NULL THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_row_num,
                'code', v_program->>'code',
                'message', 'Department code not found: ' || COALESCE(v_program->>'department_code', 'empty')
            );
            CONTINUE;
        END IF;

        SELECT id INTO v_program_level_id
        FROM public.program_levels
        WHERE code = v_program->>'program_level_code'
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

        INSERT INTO public.programs (
            code, name, department_id, program_level_id,
            years_duration, total_units, description, is_active, created_by
        )
        VALUES (
            TRIM(v_program->>'code'),
            TRIM(v_program->>'name'),
            v_department_id,
            v_program_level_id,
            (v_program->>'years_duration')::SMALLINT,
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
$$;


--
-- Name: fn_bulk_create_sections(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_create_sections(p_sections jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_row JSONB;
    v_index INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
    v_provisioned INTEGER := 0;
    v_term_id UUID;
    v_course_id UUID;
    v_faculty_id UUID;
    v_max_slots SMALLINT;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_sections)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT t.id INTO v_term_id
            FROM public.terms t
            INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
            INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
            WHERE (tt.label || ' - ' || sy.label) = trim(v_row->>'term_label')
            AND t.deleted_at IS NULL
            LIMIT 1;

            IF v_term_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'TERM_NOT_FOUND',
                    'message', 'Term not found: ' || coalesce(v_row->>'term_label', '(empty)')
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
                        'message', 'Faculty not found: ' || trim(v_row->>'faculty_email')
                    );
                    CONTINUE;
                END IF;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.sections
                WHERE term_id = v_term_id
                AND section_code = trim(v_row->>'section_code')
                AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'DUPLICATE_SECTION_CODE',
                    'message', 'Section code already exists for this term: ' || coalesce(v_row->>'section_code', '(empty)')
                );
                CONTINUE;
            END IF;

            v_max_slots := COALESCE(NULLIF(trim(v_row->>'max_slots'), '')::SMALLINT, 40);

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
                trim(v_row->>'section_code'),
                NULLIF(trim(v_row->>'room'), ''),
                v_max_slots,
                'Open'::public.section_status_type,
                auth.uid()
            );

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$$;


--
-- Name: fn_bulk_create_students(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_create_students(p_students jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_row          JSONB;
    v_index        INTEGER := 0;
    v_errors       JSONB := '[]'::JSONB;
    v_provisioned  INTEGER := 0;
    v_user_id      UUID;
    v_program_id   UUID;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_students)
    LOOP
        v_index := v_index + 1;

        BEGIN
            SELECT id INTO v_user_id
            FROM public.users
            WHERE email = trim(v_row->>'email') AND deleted_at IS NULL
            LIMIT 1;

            IF v_user_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'USER_NOT_FOUND',
                    'message', 'No user found with email: ' || coalesce(v_row->>'email', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.students
                WHERE user_id = v_user_id AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'PROFILE_EXISTS',
                    'message', 'Student profile already exists for: ' || coalesce(v_row->>'email', '(empty)')
                );
                CONTINUE;
            END IF;

            IF EXISTS (
                SELECT 1 FROM public.students
                WHERE student_number = trim(v_row->>'student_number') AND deleted_at IS NULL
            ) THEN
                v_errors := v_errors || jsonb_build_object(
                    'row', v_index,
                    'code', 'DUPLICATE_STUDENT_NUMBER',
                    'message', 'Student number already exists: ' || coalesce(v_row->>'student_number', '(empty)')
                );
                CONTINUE;
            END IF;

            v_program_id := NULL;
            IF (v_row->>'program_code') IS NOT NULL AND trim(v_row->>'program_code') <> '' THEN
                SELECT id INTO v_program_id
                FROM public.programs
                WHERE code = trim(v_row->>'program_code') AND deleted_at IS NULL
                LIMIT 1;

                IF v_program_id IS NULL THEN
                    v_errors := v_errors || jsonb_build_object(
                        'row', v_index,
                        'code', 'PROGRAM_NOT_FOUND',
                        'message', 'Program not found: ' || trim(v_row->>'program_code')
                    );
                    CONTINUE;
                END IF;
            END IF;

            INSERT INTO public.students (
                user_id,
                student_number,
                program_id,
                year_level,
                admitted_at,
                status,
                created_by
            ) VALUES (
                v_user_id,
                trim(v_row->>'student_number'),
                v_program_id,
                COALESCE(NULLIF(trim(v_row->>'year_level'), '')::SMALLINT, 1),
                NULLIF(trim(v_row->>'admitted_at'), '')::DATE,
                'Active'::public.student_status_type,
                auth.uid()
            );

            v_provisioned := v_provisioned + 1;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'row', v_index,
                'code', 'UNEXPECTED_ERROR',
                'message', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'provisioned_count', v_provisioned,
        'errors', v_errors
    );
END;
$$;


--
-- Name: fn_bulk_delete_courses(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_courses(p_course_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected courses. Some are referenced by curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = ANY(p_course_ids) AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = ANY(p_course_ids) AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Courses deleted successfully');
END;
$$;


--
-- Name: fn_bulk_delete_departments(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_departments(p_department_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_blocked INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_blocked
    FROM public.programs
    WHERE department_id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    IF v_blocked > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected departments. ' || v_blocked || ' program(s) are still referencing them.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_department_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Departments deleted successfully');
END;
$$;


--
-- Name: fn_bulk_delete_enrollments(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_enrollments(p_enrollment_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.enrollments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_enrollment_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollments deleted successfully.');
END;
$$;


--
-- Name: fn_bulk_delete_programs(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_programs(p_program_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT program_id FROM public.curriculum_maps
        WHERE program_id = ANY(p_program_ids) AND deleted_at IS NULL
        UNION ALL
        SELECT program_id FROM public.students
        WHERE program_id = ANY(p_program_ids) AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete selected programs. Some are referenced by curriculum maps or enrolled students.'
        );
    END IF;

    UPDATE public.programs
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_program_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Programs deleted successfully');
END;
$$;


--
-- Name: fn_bulk_delete_sections(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_sections(p_section_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_section_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Sections deleted successfully.');
END;
$$;


--
-- Name: fn_bulk_delete_students(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_students(p_student_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.students
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = ANY(p_student_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Students deleted successfully.');
END;
$$;


--
-- Name: fn_bulk_delete_users(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_delete_users(p_user_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    UPDATE public.users
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id = ANY(p_user_ids)
    AND deleted_at IS NULL;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    UPDATE public.user_roles
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE user_id = ANY(p_user_ids)
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', v_deleted_count || ' user(s) deleted successfully',
        'deleted_count', v_deleted_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_bulk_provision_users(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_bulk_provision_users(p_users jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_entry          JSONB;
    v_provisioned    INTEGER := 0;
    v_errors         TEXT[]  := ARRAY[]::TEXT[];
    v_result         JSONB;
BEGIN
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_users)
    LOOP
        v_result := public.fn_provision_single_user(
            (v_entry->>'auth_id')::UUID,
            v_entry->>'email',
            v_entry->>'first_name',
            v_entry->>'last_name',
            v_entry->>'role_code'
        );

        IF (v_result->>'success')::BOOLEAN THEN
            v_provisioned := v_provisioned + 1;
        ELSE
            v_errors := array_append(v_errors, v_entry->>'email' || ': ' || (v_result->>'message'));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success',           array_length(v_errors, 1) IS NULL,
        'provisioned_count', v_provisioned,
        'errors',            to_jsonb(v_errors)
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_calculate_all_grades_for_period(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_calculate_all_grades_for_period(p_section_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment      RECORD;
  v_result          JSONB;
  v_success_count   INTEGER := 0;
  v_failure_count   INTEGER := 0;
  v_failures        JSONB   := '[]'::jsonb;
BEGIN
  FOR v_enrollment IN
    SELECT e.id
    FROM public.enrollments e
    WHERE e.section_id  = p_section_id
      AND e.status      = 'Enrolled'
      AND e.deleted_at  IS NULL
  LOOP
    v_result := fn_calculate_final_grade(v_enrollment.id, p_grading_period_id);

    IF (v_result->>'success')::BOOLEAN THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_failure_count := v_failure_count + 1;
      v_failures := v_failures || jsonb_build_object(
        'enrollment_id', v_enrollment.id,
        'reason',        v_result->>'message'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success',       true,
    'section_id',    p_section_id,
    'period_id',     p_grading_period_id,
    'processed',     v_success_count + v_failure_count,
    'succeeded',     v_success_count,
    'failed',        v_failure_count,
    'failures',      v_failures
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_calculate_final_grade(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_calculate_final_grade(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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

  SELECT gtt.transmuted_grade INTO v_transmuted_grade
  FROM public.grade_transmutation_tables gtt
  WHERE gtt.program_id    = v_program_id
    AND v_raw_grade       >= gtt.min_percentage
    AND v_raw_grade       <= gtt.max_percentage
    AND gtt.deleted_at    IS NULL
  ORDER BY gtt.min_percentage DESC
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
$$;


--
-- Name: fn_check_evaluation_completion(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_check_evaluation_completion(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_lock_exists     BOOLEAN;
  v_is_completed    BOOLEAN;
  v_template_id     UUID;
  v_required_count  INTEGER;
  v_answered_count  INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.evaluation_period_locks
    WHERE enrollment_id     = p_enrollment_id
      AND grading_period_id = p_grading_period_id
      AND deleted_at        IS NULL
  ) INTO v_lock_exists;

  IF NOT v_lock_exists THEN
    RETURN false;
  END IF;

  SELECT is_completed, template_id
  INTO v_is_completed, v_template_id
  FROM public.evaluation_period_locks
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL;

  IF v_is_completed THEN
    RETURN true;
  END IF;

  SELECT COUNT(*)
  INTO v_required_count
  FROM public.evaluation_questions
  WHERE template_id  = v_template_id
    AND is_required  = true
    AND deleted_at   IS NULL;

  SELECT COUNT(*)
  INTO v_answered_count
  FROM public.evaluation_responses
  WHERE enrollment_id     = p_enrollment_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at        IS NULL
    AND question_id IN (
      SELECT id FROM public.evaluation_questions
      WHERE template_id = v_template_id
        AND is_required = true
        AND deleted_at  IS NULL
    );

  RETURN v_answered_count >= v_required_count;
END;
$$;


--
-- Name: fn_compute_student_gwa(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_compute_student_gwa(p_student_id uuid, p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total_units   NUMERIC(8,2) := 0;
  v_weighted_sum  NUMERIC(8,2) := 0;
  v_gwa           NUMERIC(5,2);
  v_course        RECORD;
BEGIN
  FOR v_course IN
    SELECT
      sfg.final_grade,
      sfg.transmuted_grade,
      c.total_units
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e    ON e.id  = sfg.enrollment_id
    INNER JOIN public.sections sec     ON sec.id = e.section_id
    INNER JOIN public.courses c        ON c.id   = sec.course_id
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id
    WHERE e.student_id    = p_student_id
      AND sec.term_id     = p_term_id
      AND sfg.status      = 'Released'
      AND e.deleted_at    IS NULL
      AND sfg.deleted_at  IS NULL
      AND c.deleted_at    IS NULL
  LOOP
    v_total_units  := v_total_units  + v_course.total_units;
    v_weighted_sum := v_weighted_sum + (
      COALESCE(v_course.transmuted_grade, v_course.final_grade) * v_course.total_units
    );
  END LOOP;

  IF v_total_units = 0 THEN
    RETURN jsonb_build_object(
      'success',    false,
      'student_id', p_student_id,
      'term_id',    p_term_id,
      'message',    'No released grades found for this term.'
    );
  END IF;

  v_gwa := ROUND(v_weighted_sum / v_total_units, 4);

  RETURN jsonb_build_object(
    'success',      true,
    'student_id',   p_student_id,
    'term_id',      p_term_id,
    'gwa',          v_gwa,
    'total_units',  v_total_units
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_create_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, boolean, boolean, boolean, smallint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_assessment(p_section_id uuid, p_title text, p_description text, p_assessment_type public.assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_opens_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be in the future.');
    END IF;

    IF p_due_at IS NOT NULL AND p_due_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Due date must be in the future.');
    END IF;

    IF p_closes_at IS NOT NULL AND p_closes_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be in the future.');
    END IF;

    IF p_show_results_at IS NOT NULL AND p_show_results_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Show results date must be in the future.');
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND p_scheduled_publish_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scheduled publish date must be in the future.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_opens_at >= p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before due date.');
    END IF;

    IF p_due_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_closes_at < p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be on or after due date.');
    END IF;

    IF NOT COALESCE(p_show_all_questions, true) AND (p_questions_per_page IS NULL OR p_questions_per_page < 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Questions per page must be at least 1 when not showing all questions.');
    END IF;

    INSERT INTO public.assessment_items (
        section_id, grading_component_id, title, description, assessment_type,
        total_points, passing_points, time_limit_minutes, max_attempts,
        opens_at, due_at, closes_at, show_results_at, scheduled_publish_at,
        shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
        is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, p_title, NULLIF(p_description, ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, p_scheduled_publish_at,
        COALESCE(p_shuffle_questions, false), COALESCE(p_shuffle_choices, false),
        COALESCE(p_show_all_questions, true),
        CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
        false, auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment created successfully.', 'id', v_id);
END;
$$;


--
-- Name: fn_create_assessment_attachment(uuid, text, text, bigint, text, smallint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_assessment_attachment(p_assessment_id uuid, p_file_name text, p_file_url text, p_file_size_bytes bigint, p_mime_type text, p_sequence smallint DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    INSERT INTO public.assessment_attachments (
        assessment_item_id, file_name, file_url,
        file_size_bytes, mime_type, sequence, created_by
    ) VALUES (
        p_assessment_id, p_file_name, p_file_url,
        p_file_size_bytes, p_mime_type, p_sequence, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Attachment added successfully.');
END;
$$;


--
-- Name: fn_create_attendance_session(uuid, date, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_attendance_session(p_section_id uuid, p_session_date date, p_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_session_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.attendance_sessions
        WHERE section_id = p_section_id
        AND session_date = p_session_date
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An attendance session already exists for this date.');
    END IF;

    INSERT INTO public.attendance_sessions (
        section_id,
        session_date,
        notes,
        created_by
    ) VALUES (
        p_section_id,
        p_session_date,
        p_notes,
        auth.uid()
    )
    RETURNING id INTO v_session_id;

    INSERT INTO public.attendance_records (
        attendance_session_id,
        enrollment_id,
        status,
        recorded_by,
        created_by
    )
    SELECT
        v_session_id,
        e.id,
        'Present'::public.attendance_status_type,
        auth.uid(),
        auth.uid()
    FROM public.enrollments e
    WHERE e.section_id = p_section_id
    AND e.status NOT IN ('Dropped', 'Withdrawn')
    AND e.deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance session created successfully.');
END;
$$;


--
-- Name: fn_create_course(text, text, uuid, uuid, boolean, numeric, numeric, numeric, text, boolean, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_course(p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_is_split boolean DEFAULT false, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_lec_id UUID;
    v_lab_id UUID;
    v_course_id UUID;
    v_prereq JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.course_types
        WHERE id = p_course_type_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    IF p_is_split THEN
        IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Lecture units must be between 0 and 10');
        END IF;

        IF p_laboratory_units IS NULL OR p_laboratory_units < 0 OR p_laboratory_units > 10 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Laboratory units must be between 0 and 10');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code || '_LEC' AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code || '_LEC');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code || '_LAB' AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code || '_LAB');
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            p_code || '_LEC', p_title || ' (Lecture)',
            p_department_id, p_course_type_id,
            p_lecture_units, 0, p_credit_hours,
            NULLIF(p_description, ''), p_is_active, auth.uid()
        )
        RETURNING id INTO v_lec_id;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            p_code || '_LAB', p_title || ' (Laboratory)',
            p_department_id, p_course_type_id,
            0, p_laboratory_units, p_credit_hours,
            NULLIF(p_description, ''), p_is_active, auth.uid()
        )
        RETURNING id INTO v_lab_id;

        IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
            FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
            LOOP
                IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                    IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                    IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_type') = 'Co-requisite' AND
                   (v_prereq->>'minimum_grade') IS NOT NULL AND
                   (v_prereq->>'minimum_grade') <> '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Co-requisite courses cannot have a minimum grade requirement');
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_lec_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_lab_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Split course created successfully (LEC and LAB)');

    ELSE
        IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Units must be between 0 and 10');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.courses
            WHERE code = p_code AND deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code);
        END IF;

        INSERT INTO public.courses (
            code, title, department_id, course_type_id,
            lecture_units, laboratory_units, credit_hours,
            description, is_active, created_by
        )
        VALUES (
            p_code, p_title, p_department_id, p_course_type_id,
            p_lecture_units, 0, p_credit_hours,
            NULLIF(p_description, ''), p_is_active, auth.uid()
        )
        RETURNING id INTO v_course_id;

        IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
            FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
            LOOP
                IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                    IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                    END IF;
                    IF (v_prereq->>'course_id')::UUID = v_course_id THEN
                        RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                    IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                        RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                    END IF;
                END IF;

                IF (v_prereq->>'prerequisite_type') = 'Co-requisite' AND
                   (v_prereq->>'minimum_grade') IS NOT NULL AND
                   (v_prereq->>'minimum_grade') <> '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Co-requisite courses cannot have a minimum grade requirement');
                END IF;

                INSERT INTO public.course_prerequisites (
                    course_id, prerequisite_id, prerequisite_type,
                    prerequisite_kind, year_level_required, minimum_grade, created_by
                )
                VALUES (
                    v_course_id,
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                        THEN (v_prereq->>'course_id')::UUID
                        ELSE NULL END,
                    (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                    COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                    CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                        THEN (v_prereq->>'year_level_required')::SMALLINT
                        ELSE NULL END,
                    CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                         ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                    auth.uid()
                );
            END LOOP;
        END IF;

        RETURN jsonb_build_object('success', true, 'message', 'Course created successfully');
    END IF;
END;
$$;


--
-- Name: fn_create_course_type(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_course_type(p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type code already exists: ' || p_code);
    END IF;

    INSERT INTO public.course_types (code, label, description, created_by)
    VALUES (p_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Course type created successfully');
END;
$$;


--
-- Name: fn_create_curriculum_map_entry(uuid, uuid, smallint, uuid, uuid, smallint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_curriculum_map_entry(p_program_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.programs
        WHERE id = p_program_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = p_course_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = p_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    INSERT INTO public.curriculum_maps (
        program_id, course_id, year_level, term_type_id,
        school_year_id, sequence, is_elective, created_by
    )
    VALUES (
        p_program_id, p_course_id, p_year_level, p_term_type_id,
        p_school_year_id, p_sequence, p_is_elective, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry created successfully');
END;
$$;


--
-- Name: fn_create_department(text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_department(p_code text, p_name text, p_description text DEFAULT NULL::text, p_head_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    IF p_head_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_head_user_id
            AND r.code IN ('Faculty', 'Dean')
            AND ur.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Department head must have a Faculty or Dean role');
        END IF;
    END IF;

    INSERT INTO public.departments (code, name, description, head_user_id, created_by)
    VALUES (p_code, p_name, NULLIF(p_description, ''), p_head_user_id, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Department created successfully');
END;
$$;


--
-- Name: fn_create_enrollment(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_enrollment(p_student_id uuid, p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_max_slots   SMALLINT;
    v_enrolled    INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE student_id = p_student_id
        AND section_id = p_section_id
        AND status NOT IN ('Dropped', 'Withdrawn')
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is already enrolled in this section.');
    END IF;

    SELECT max_slots INTO v_max_slots
    FROM public.sections
    WHERE id = p_section_id AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_enrolled
    FROM public.enrollments
    WHERE section_id = p_section_id
    AND status NOT IN ('Dropped', 'Withdrawn')
    AND deleted_at IS NULL;

    IF v_enrolled >= v_max_slots THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section is already full.');
    END IF;

    INSERT INTO public.enrollments (
        student_id,
        section_id,
        status,
        enrolled_at,
        created_by
    ) VALUES (
        p_student_id,
        p_section_id,
        'Enrolled'::public.enrollment_status_type,
        now(),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Student enrolled successfully.');
END;
$$;


--
-- Name: fn_create_grading_component(uuid, uuid, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_grading_component(p_section_id uuid, p_grading_period_id uuid, p_name text, p_weight numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_total_weight NUMERIC;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.grading_components
    WHERE section_id = p_section_id
    AND grading_period_id = p_grading_period_id
    AND deleted_at IS NULL;

    IF v_total_weight + p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total weight of grading components cannot exceed 100%.');
    END IF;

    INSERT INTO public.grading_components (
        section_id,
        grading_period_id,
        name,
        weight,
        created_by
    ) VALUES (
        p_section_id,
        p_grading_period_id,
        p_name,
        p_weight,
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Grading component created successfully.');
END;
$$;


--
-- Name: fn_create_program(text, text, uuid, uuid, smallint, numeric, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_program(p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program code already exists: ' || p_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.departments
        WHERE id = p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE id = p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    INSERT INTO public.programs (
        code, name, department_id, program_level_id,
        years_duration, total_units, description, is_active, created_by
    )
    VALUES (
        p_code, p_name, p_department_id, p_program_level_id,
        p_years_duration, p_total_units, NULLIF(p_description, ''), p_is_active, auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Program created successfully');
END;$$;


--
-- Name: fn_create_program_level(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_program_level(p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level code already exists: ' || p_code);
    END IF;

    INSERT INTO public.program_levels (code, label, description, created_by)
    VALUES (p_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Program level created successfully');
END;
$$;


--
-- Name: fn_create_role(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_role(p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    SELECT id INTO v_existing_id
    FROM public.roles
    WHERE code = p_code
    AND deleted_at IS NULL;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role code already exists: ' || p_code);
    END IF;

    INSERT INTO public.roles (code, label, description, created_by)
    VALUES (p_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Role created successfully');
END;
$$;


--
-- Name: fn_create_school_year(text, text, date, date, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_school_year(p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || p_code);
    END IF;

    IF p_is_active THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
        AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.school_years (code, label, start_date, end_date, is_active, created_by)
    VALUES (p_code, p_label, p_start_date, p_end_date, p_is_active, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'School year created successfully');
END;
$$;


--
-- Name: fn_create_section(uuid, uuid, uuid, text, text, smallint, public.section_status_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_section(p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status public.section_status_type DEFAULT 'Open'::public.section_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
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
        p_section_code,
        p_room,
        p_max_slots,
        p_status,
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Section created successfully.');
END;
$$;


--
-- Name: fn_create_student(uuid, text, uuid, smallint, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_student(p_user_id uuid, p_student_number text, p_program_id uuid, p_year_level smallint, p_admitted_at date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_user_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE user_id = p_user_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This user already has a student profile.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE student_number = p_student_number AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student number already exists.');
    END IF;

    INSERT INTO public.students (
        user_id,
        student_number,
        program_id,
        year_level,
        admitted_at,
        status,
        created_by
    ) VALUES (
        p_user_id,
        p_student_number,
        p_program_id,
        p_year_level,
        p_admitted_at,
        'Active'::public.student_status_type,
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Student profile created successfully.');
END;
$$;


--
-- Name: fn_create_term(uuid, uuid, date, date, date, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_term(p_school_year_id uuid, p_term_type_id uuid, p_start_date date, p_end_date date, p_enrollment_start_date date DEFAULT NULL::date, p_enrollment_end_date date DEFAULT NULL::date, p_grading_deadline date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    INSERT INTO public.terms (
        school_year_id, term_type_id, start_date, end_date,
        enrollment_start_date, enrollment_end_date, grading_deadline,
        status, created_by
    )
    VALUES (
        p_school_year_id, p_term_type_id, p_start_date, p_end_date,
        p_enrollment_start_date, p_enrollment_end_date, p_grading_deadline,
        'Upcoming', auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Term created successfully');
END;
$$;


--
-- Name: fn_create_term_type(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_term_type(p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

    INSERT INTO public.term_types (code, label, description, created_by)
    VALUES (p_code, p_label, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Term type created successfully');
END;
$$;


--
-- Name: fn_create_term_type(text, text, smallint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_term_type(p_code text, p_label text, p_sequence smallint, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE sequence = p_sequence
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sequence ' || p_sequence || ' is already taken by another term type');
    END IF;

    INSERT INTO public.term_types (code, label, sequence, description, created_by)
    VALUES (p_code, p_label, p_sequence, NULLIF(p_description, ''), auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'Term type created successfully');
END;
$$;


--
-- Name: fn_delete_assessment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_assessment(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    UPDATE public.assessment_items
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment deleted successfully.');
END;
$$;


--
-- Name: fn_delete_assessment_attachment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_assessment_attachment(p_attachment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_attachments aa
        INNER JOIN public.assessment_items ai ON ai.id = aa.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE aa.id = p_attachment_id
        AND s.faculty_id = auth.uid()
        AND aa.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Attachment not found or access denied.');
    END IF;

    UPDATE public.assessment_attachments
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_attachment_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attachment deleted successfully.');
END;
$$;


--
-- Name: fn_delete_attendance_session(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_attendance_session(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.attendance_sessions ats
        INNER JOIN public.sections s ON s.id = ats.section_id
        WHERE ats.id = p_session_id
        AND s.faculty_id = auth.uid()
        AND ats.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    UPDATE public.attendance_records
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE attendance_session_id = p_session_id
    AND deleted_at IS NULL;

    UPDATE public.attendance_sessions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_session_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance session deleted successfully.');
END;
$$;


--
-- Name: fn_delete_course(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_course(p_course_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT course_id FROM public.curriculum_maps
        WHERE course_id = p_course_id AND deleted_at IS NULL
        UNION ALL
        SELECT course_id FROM public.sections
        WHERE course_id = p_course_id AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete course. It is referenced by existing curriculum maps or sections.'
        );
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    UPDATE public.courses
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_course_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course deleted successfully');
END;
$$;


--
-- Name: fn_delete_course_type(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_course_type(p_course_type_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_active_courses INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_courses
    FROM public.courses
    WHERE course_type_id = p_course_type_id
    AND deleted_at IS NULL;

    IF v_active_courses > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete course type. ' || v_active_courses || ' course(s) are currently using this type.'
        );
    END IF;

    UPDATE public.course_types
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type deleted successfully');
END;
$$;


--
-- Name: fn_delete_curriculum_map_entry(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_curriculum_map_entry(p_curriculum_map_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.curriculum_maps
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry deleted successfully');
END;
$$;


--
-- Name: fn_delete_department(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_department(p_department_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_active_programs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE department_id = p_department_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete department. ' || v_active_programs || ' program(s) are currently under this department.'
        );
    END IF;

    UPDATE public.departments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department deleted successfully');
END;
$$;


--
-- Name: fn_delete_enrollment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_enrollment(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollment deleted successfully.');
END;
$$;


--
-- Name: fn_delete_grading_component(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_grading_component(p_component_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.grading_components gc
        INNER JOIN public.sections s ON s.id = gc.section_id
        WHERE gc.id = p_component_id
        AND s.faculty_id = auth.uid()
        AND gc.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component not found or access denied.');
    END IF;

    UPDATE public.grading_components
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_component_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Grading component deleted successfully.');
END;
$$;


--
-- Name: fn_delete_program(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_program(p_program_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_ref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT program_id FROM public.curriculum_maps
        WHERE program_id = p_program_id AND deleted_at IS NULL
        UNION ALL
        SELECT p.id FROM public.students s
        JOIN public.programs p ON p.id = s.program_id
        WHERE s.program_id = p_program_id AND s.deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete program. It is referenced by existing curriculum maps or enrolled students.'
        );
    END IF;

    UPDATE public.programs
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program deleted successfully');
END;
$$;


--
-- Name: fn_delete_program_level(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_program_level(p_program_level_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_active_programs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_programs
    FROM public.programs
    WHERE program_level_id = p_program_level_id
    AND deleted_at IS NULL;

    IF v_active_programs > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete program level. ' || v_active_programs || ' program(s) are currently using this level.'
        );
    END IF;

    UPDATE public.program_levels
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level deleted successfully');
END;
$$;


--
-- Name: fn_delete_question(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_question(p_question_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions aq
        INNER JOIN public.assessment_items ai ON ai.id = aq.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE aq.id = p_question_id
        AND s.faculty_id = auth.uid()
        AND aq.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Question not found or access denied.');
    END IF;

    UPDATE public.assessment_question_choices
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE question_id = p_question_id AND deleted_at IS NULL;

    UPDATE public.assessment_questions
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_question_id AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Question deleted successfully.');
END;
$$;


--
-- Name: fn_delete_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_role(p_role_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: fn_delete_school_year(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_school_year(p_school_year_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE id = p_school_year_id
        AND is_active = TRUE
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot delete an active school year. Deactivate it first before deleting.');
    END IF;

    UPDATE public.school_years
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year deleted successfully');
END;
$$;


--
-- Name: fn_delete_section(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_section(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    UPDATE public.sections
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section deleted successfully.');
END;
$$;


--
-- Name: fn_delete_special_grade_config(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_special_grade_config(p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.special_grade_configs
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE id = p_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Special grade config not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configuration deleted successfully');
END;
$$;


--
-- Name: fn_delete_student(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_student(p_student_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    UPDATE public.students
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_student_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile deleted successfully.');
END;
$$;


--
-- Name: fn_delete_term(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_term(p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_status TEXT;
    v_ref_count INTEGER;
BEGIN
    SELECT status INTO v_status
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    IF v_status NOT IN ('Upcoming', 'Closed') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Upcoming or Closed terms can be deleted');
    END IF;

    SELECT COUNT(*) INTO v_ref_count
    FROM (
        SELECT term_id FROM public.sections WHERE term_id = p_term_id AND deleted_at IS NULL
        UNION ALL
        SELECT term_id FROM public.grading_periods WHERE term_id = p_term_id AND deleted_at IS NULL
        UNION ALL
        SELECT term_id FROM public.student_clearances WHERE term_id = p_term_id AND deleted_at IS NULL
    ) refs;

    IF v_ref_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot delete term. It is referenced by existing sections, grading periods, or clearances.');
    END IF;

    UPDATE public.terms
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Term deleted successfully');
END;
$$;


--
-- Name: fn_delete_term_type(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_delete_term_type(p_term_type_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_active_terms INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_terms
    FROM public.terms
    WHERE term_type_id = p_term_type_id
    AND deleted_at IS NULL;

    IF v_active_terms > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot delete term type. ' || v_active_terms || ' term(s) are currently using this type.'
        );
    END IF;

    UPDATE public.term_types
    SET
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type deleted successfully');
END;
$$;


--
-- Name: fn_evaluate_student_year_level(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_evaluate_student_year_level(p_student_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_program_id      UUID;
    v_current_year    SMALLINT;
    v_new_year        SMALLINT;
    v_check_year      SMALLINT;
    v_required_count  INTEGER;
    v_completed_count INTEGER;
BEGIN
    SELECT program_id, year_level
    INTO v_program_id, v_current_year
    FROM public.students
    WHERE id = p_student_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found or has no program assigned.');
    END IF;

    v_new_year := v_current_year;

    FOR v_check_year IN 1..5 LOOP
        SELECT COUNT(*)
        INTO v_required_count
        FROM public.curriculum_maps cm
        WHERE cm.program_id = v_program_id
        AND cm.year_level = v_check_year
        AND cm.is_elective = false
        AND cm.deleted_at IS NULL;

        IF v_required_count = 0 THEN
            CONTINUE;
        END IF;

        SELECT COUNT(DISTINCT e.id)
        INTO v_completed_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.curriculum_maps cm ON cm.course_id = s.course_id
            AND cm.program_id = v_program_id
            AND cm.year_level = v_check_year
            AND cm.is_elective = false
            AND cm.deleted_at IS NULL
        WHERE e.student_id = p_student_id
        AND e.status = 'Completed'
        AND e.deleted_at IS NULL;

        IF v_completed_count >= v_required_count THEN
            v_new_year := LEAST(v_check_year + 1, 6);
        ELSE
            EXIT;
        END IF;
    END LOOP;

    IF v_new_year <> v_current_year THEN
        UPDATE public.students
        SET year_level = v_new_year
        WHERE id = p_student_id AND deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Year level evaluated successfully.',
        'previous_year_level', v_current_year,
        'new_year_level', v_new_year
    );
END;
$$;


--
-- Name: fn_expire_overdue_submissions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_expire_overdue_submissions() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_session       RECORD;
BEGIN
  FOR v_session IN
    SELECT ats.id AS session_id, ats.submission_id
    FROM public.assessment_timer_sessions ats
    WHERE ats.status          = 'Active'
      AND ats.server_expires_at < now()
      AND ats.deleted_at        IS NULL
  LOOP
    UPDATE public.assessment_submissions
    SET
      status       = 'Submitted',
      submitted_at = now(),
      is_late      = true,
      feedback     = 'Auto-submitted by server: time limit exceeded.'
    WHERE id        = v_session.submission_id
      AND status    = 'In Progress'
      AND deleted_at IS NULL;

    UPDATE public.assessment_timer_sessions
    SET
      status           = 'Expired',
      forced_submit_at = now(),
      last_activity_at = now()
    WHERE id = v_session.session_id;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success',         true,
    'expired_count',   v_expired_count,
    'processed_at',    now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_get_academic_standing(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_academic_standing(p_student_id uuid, p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_gwa_result  JSONB;
  v_gwa         NUMERIC;
  v_standing    TEXT;
  v_total_units NUMERIC;
  v_failed      INTEGER;
BEGIN
  v_gwa_result  := fn_compute_student_gwa(p_student_id, p_term_id);

  IF NOT (v_gwa_result->>'success')::BOOLEAN THEN
    RETURN v_gwa_result;
  END IF;

  v_gwa         := (v_gwa_result->>'gwa')::NUMERIC;
  v_total_units := (v_gwa_result->>'total_units')::NUMERIC;

  SELECT COUNT(*)
  INTO v_failed
  FROM public.section_final_grades sfg
  INNER JOIN public.enrollments e ON e.id = sfg.enrollment_id
  INNER JOIN public.sections sec  ON sec.id = e.section_id
  WHERE e.student_id   = p_student_id
    AND sec.term_id    = p_term_id
    AND sfg.status     = 'Released'
    AND COALESCE(sfg.transmuted_grade, sfg.final_grade) > 3.0
    AND e.deleted_at   IS NULL
    AND sfg.deleted_at IS NULL;

  v_standing := CASE
    WHEN v_failed > 0        THEN 'Probation'
    WHEN v_gwa <= 1.25       THEN 'Summa Cum Laude Track'
    WHEN v_gwa <= 1.50       THEN 'Magna Cum Laude Track'
    WHEN v_gwa <= 1.75       THEN "Dean's List"
    WHEN v_gwa <= 3.00       THEN 'Good Standing'
    ELSE                          'Probation'
  END;

  RETURN jsonb_build_object(
    'success',       true,
    'student_id',    p_student_id,
    'term_id',       p_term_id,
    'gwa',           v_gwa,
    'total_units',   v_total_units,
    'failed_count',  v_failed,
    'standing',      v_standing
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_get_assessment_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_assessment_by_id(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',                   ai.id,
        'section_id',           ai.section_id,
        'grading_component_id', ai.grading_component_id,
        'title',                ai.title,
        'description',          ai.description,
        'assessment_type',      ai.assessment_type,
        'total_points',         ai.total_points,
        'passing_points',       ai.passing_points,
        'time_limit_minutes',   ai.time_limit_minutes,
        'max_attempts',         ai.max_attempts,
        'is_published',         ai.is_published,
        'opens_at',             ai.opens_at,
        'due_at',               ai.due_at,
        'closes_at',            ai.closes_at,
        'show_results_at',      ai.show_results_at,
        'scheduled_publish_at', ai.scheduled_publish_at,
        'shuffle_questions',    ai.shuffle_questions,
        'shuffle_choices',      ai.shuffle_choices,
        'show_all_questions',   ai.show_all_questions,
        'questions_per_page',   ai.questions_per_page
    )
    INTO v_result
    FROM public.assessment_items ai
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE ai.id = p_assessment_id
    AND s.faculty_id = auth.uid()
    AND ai.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_assessment_for_student(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_assessment_for_student(p_assessment_id uuid, p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT jsonb_build_object(
        'id',                   ai.id,
        'title',                ai.title,
        'description',          ai.description,
        'assessment_type',      ai.assessment_type,
        'total_points',         ai.total_points,
        'passing_points',       ai.passing_points,
        'time_limit_minutes',   ai.time_limit_minutes,
        'max_attempts',         ai.max_attempts,
        'show_all_questions',   ai.show_all_questions,
        'questions_per_page',   ai.questions_per_page,
        'shuffle_questions',    ai.shuffle_questions,
        'shuffle_choices',      ai.shuffle_choices,
        'opens_at',             ai.opens_at,
        'due_at',               ai.due_at,
        'closes_at',            ai.closes_at,
        'show_results_at',      ai.show_results_at,
        'scheduled_publish_at', ai.scheduled_publish_at,
        'attachments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              aa.id,
                    'file_name',       aa.file_name,
                    'file_url',        aa.file_url,
                    'file_size_bytes', aa.file_size_bytes,
                    'mime_type',       aa.mime_type
                )
                ORDER BY aa.sequence ASC
            ), '[]'::JSONB)
            FROM public.assessment_attachments aa
            WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.assessment_items ai
    INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
    INNER JOIN public.enrollments e ON e.section_id = s.id
        AND e.id = p_enrollment_id
        AND e.student_id = v_student_id
        AND e.deleted_at IS NULL
    WHERE ai.id = p_assessment_id
    AND ai.deleted_at IS NULL
    AND (
        ai.is_published = true
        OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
    );

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_assessment_questions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_assessment_questions(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             aq.id,
                'question_text',  aq.question_text,
                'question_type',  aq.question_type,
                'points',         aq.points,
                'sequence',       aq.sequence,
                'explanation',    aq.explanation,
                'is_required',    aq.is_required,
                'allowed_file_types', aq.allowed_file_types,
                'max_file_size_mb',   aq.max_file_size_mb,
                'max_file_count',     aq.max_file_count,
                'choices', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',          ac.id,
                            'choice_text', ac.choice_text,
                            'is_correct',  ac.is_correct,
                            'sequence',    ac.sequence
                        )
                        ORDER BY ac.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY aq.sequence ASC
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
        AND aq.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_assessment_questions_for_student(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_assessment_questions_for_student(p_assessment_id uuid, p_enrollment_id uuid, p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id    UUID;
    v_shuffle_q     BOOLEAN;
    v_shuffle_c     BOOLEAN;
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
                        'id',          sa.id,
                        'answer_text', sa.answer_text,
                        'choice_id',   sa.choice_id
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
                        ORDER BY CASE WHEN v_shuffle_c THEN random() ELSE ac.sequence::float END
                    ), '[]'::JSONB)
                    FROM public.assessment_question_choices ac
                    WHERE ac.question_id = aq.id AND ac.deleted_at IS NULL
                )
            )
            ORDER BY CASE WHEN v_shuffle_q THEN random() ELSE aq.sequence::float END
        ), '[]'::JSONB)
        FROM public.assessment_questions aq
        WHERE aq.assessment_item_id = p_assessment_id
        AND aq.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_attendance_records(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_attendance_records(p_session_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',            ar.id,
                'enrollment_id', ar.enrollment_id,
                'student_number', st.student_number,
                'full_name',     u.first_name || ' ' || u.last_name,
                'status',        ar.status,
                'remarks',       ar.remarks
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.attendance_records ar
        INNER JOIN public.enrollments e ON e.id = ar.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE ar.attendance_session_id = p_session_id
        AND ar.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_attendance_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_attendance_summary(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total    INTEGER;
  v_present  INTEGER;
  v_absent   INTEGER;
  v_late     INTEGER;
  v_excused  INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ar.status = 'Present'),
    COUNT(*) FILTER (WHERE ar.status = 'Absent'),
    COUNT(*) FILTER (WHERE ar.status = 'Late'),
    COUNT(*) FILTER (WHERE ar.status = 'Excused')
  INTO v_total, v_present, v_absent, v_late, v_excused
  FROM public.attendance_records ar
  WHERE ar.enrollment_id = p_enrollment_id
    AND ar.deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id',      p_enrollment_id,
    'total_sessions',     v_total,
    'present',            v_present,
    'absent',             v_absent,
    'late',               v_late,
    'excused',            v_excused,
    'attendance_rate',    CASE WHEN v_total > 0
                            THEN ROUND(((v_present + v_late + v_excused)::NUMERIC / v_total) * 100, 2)
                            ELSE 0 END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_get_course_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_course_by_id(p_course_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
    v_prerequisites JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', c.id,
        'code', c.code,
        'title', c.title,
        'description', c.description,
        'department_id', c.department_id,
        'course_type_id', c.course_type_id,
        'lecture_units', c.lecture_units,
        'laboratory_units', c.laboratory_units,
        'total_units', c.total_units,
        'credit_hours', c.credit_hours,
        'is_active', c.is_active
    )
    INTO v_result
    FROM public.courses c
    WHERE c.id = p_course_id
    AND c.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'course_id', COALESCE(cp.prerequisite_id::TEXT, ''),
            'prerequisite_type', cp.prerequisite_type::TEXT,
            'prerequisite_kind', cp.prerequisite_kind,
            'year_level_required', COALESCE(cp.year_level_required::TEXT, ''),
            'minimum_grade', COALESCE(cp.minimum_grade::TEXT, '')
        )
        ORDER BY cp.created_at ASC
    ), '[]'::JSONB)
    INTO v_prerequisites
    FROM public.course_prerequisites cp
    WHERE cp.course_id = p_course_id
    AND cp.deleted_at IS NULL;

    RETURN v_result || jsonb_build_object('prerequisites', v_prerequisites);
END;
$$;


--
-- Name: fn_get_course_type_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_course_type_by_id(p_course_type_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', ct.id,
        'code', ct.code,
        'label', ct.label,
        'description', ct.description
    )
    INTO v_result
    FROM public.course_types ct
    WHERE ct.id = p_course_type_id
    AND ct.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_course_types(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_course_types() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ct.id,
                'code', ct.code,
                'label', ct.label
            )
            ORDER BY ct.label ASC
        ), '[]'::jsonb)
        FROM public.course_types ct
        WHERE ct.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_courses(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_courses(p_exclude_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'code', c.code,
                'label', c.code || ' — ' || c.title
            )
            ORDER BY c.code ASC
        ), '[]'::JSONB)
        FROM public.courses c
        WHERE c.deleted_at IS NULL
        AND c.is_active = TRUE
        AND (p_exclude_ids IS NULL OR c.id <> ALL(p_exclude_ids))
    );
END;
$$;


--
-- Name: fn_get_curriculum_map(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_curriculum_map(p_program_id uuid, p_school_year_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', cm.id,
                'course_id', cm.course_id,
                'course_code', c.code,
                'course_title', c.title,
                'lecture_units', c.lecture_units,
                'laboratory_units', c.laboratory_units,
                'total_units', c.total_units,
                'year_level', cm.year_level,
                'term_type_id', cm.term_type_id,
                'term_type_label', tt.label,
                'term_type_code', tt.code,
                'term_type_sequence', tt.sequence,
                'school_year_id', cm.school_year_id,
                'sequence', cm.sequence,
                'is_elective', cm.is_elective,
                'prerequisites', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'code', CASE
                                WHEN cp.prerequisite_kind = 'standing'
                                THEN 'Year ' || cp.year_level_required || ' Standing'
                                ELSE pc.code
                            END
                        )
                        ORDER BY cp.prerequisite_kind ASC, pc.code ASC
                    ), '[]'::JSONB)
                    FROM public.course_prerequisites cp
                    LEFT JOIN public.courses pc ON pc.id = cp.prerequisite_id AND pc.deleted_at IS NULL
                    WHERE cp.course_id = cm.course_id
                    AND cp.deleted_at IS NULL
                )
            )
            ORDER BY cm.year_level ASC, tt.sequence ASC, cm.sequence ASC
        ), '[]'::JSONB)
        FROM public.curriculum_maps cm
        JOIN public.courses c ON c.id = cm.course_id AND c.deleted_at IS NULL
        JOIN public.term_types tt ON tt.id = cm.term_type_id AND tt.deleted_at IS NULL
        WHERE cm.program_id = p_program_id
        AND cm.deleted_at IS NULL
        AND (p_school_year_id IS NULL OR cm.school_year_id = p_school_year_id)
    );
END;
$$;


--
-- Name: fn_get_deans_list(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_deans_list(p_term_id uuid, p_min_gwa numeric DEFAULT 1.75) RETURNS TABLE(student_id uuid, student_number text, full_name text, program_code text, program_name text, gwa numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH student_gwas AS (
    SELECT
      e.student_id                                              AS sid,
      ROUND(
        SUM(
          COALESCE(sfg.transmuted_grade, sfg.final_grade) * c.total_units
        ) / NULLIF(SUM(c.total_units), 0),
        4
      )                                                         AS computed_gwa,
      SUM(c.total_units)                                        AS units
    FROM public.section_final_grades sfg
    INNER JOIN public.enrollments e     ON e.id   = sfg.enrollment_id
    INNER JOIN public.sections sec      ON sec.id  = e.section_id
    INNER JOIN public.courses c         ON c.id    = sec.course_id
    WHERE sec.term_id     = p_term_id
      AND sfg.status      = 'Released'
      AND e.deleted_at    IS NULL
      AND sfg.deleted_at  IS NULL
      AND c.deleted_at    IS NULL
    GROUP BY e.student_id
    HAVING SUM(c.total_units) > 0
  )
  SELECT
    st.id                                                       AS student_id,
    st.student_number                                           AS student_number,
    TRIM(u.first_name || ' ' ||
      COALESCE(u.middle_name || ' ', '') ||
      u.last_name)                                              AS full_name,
    p.code                                                      AS program_code,
    p.name                                                      AS program_name,
    sg.computed_gwa                                             AS gwa
  FROM student_gwas sg
  INNER JOIN public.students st  ON st.id  = sg.sid
  INNER JOIN public.users u      ON u.id   = st.user_id
  INNER JOIN public.programs p   ON p.id   = st.program_id
  WHERE sg.computed_gwa          <= p_min_gwa
    AND st.deleted_at            IS NULL
    AND u.deleted_at             IS NULL
    AND p.deleted_at             IS NULL
  ORDER BY sg.computed_gwa ASC;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;


--
-- Name: fn_get_department_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_department_by_id(p_department_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'description', d.description,
        'head_user_id', d.head_user_id
    )
    INTO v_result
    FROM public.departments d
    WHERE d.id = p_department_id
    AND d.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_departments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_departments() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', d.id,
                'code', d.code,
                'label', d.name
            )
            ORDER BY d.name ASC
        ), '[]'::jsonb)
        FROM public.departments d
        WHERE d.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_enrollment_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_enrollment_by_id(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',         e.id,
        'student_id', e.student_id,
        'section_id', e.section_id,
        'status',     e.status
    )
    INTO v_result
    FROM public.enrollments e
    WHERE e.id = p_enrollment_id
    AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_grade_report(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_grade_report(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'grading_period_id',   sfg.grading_period_id,
      'grading_period_name', gp.name,
      'grading_period_seq',  gp.sequence,
      'raw_grade',           sfg.raw_grade,
      'final_grade',         sfg.final_grade,
      'transmuted_grade',    sfg.transmuted_grade,
      'status',              sfg.status,
      'remarks',             sfg.remarks,
      'approved_at',         sfg.approved_at,
      'released_at',         sfg.released_at,
      'is_grade_visible',    e.is_grade_visible,
      'components', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'component_name',   gc.name,
            'weight',           gc.weight,
            'earned_score',     COALESCE(SUM(asub.final_score), 0),
            'total_points',     COALESCE(SUM(ai.total_points),  0)
          )
        )
        FROM public.grading_components gc
        LEFT JOIN public.assessment_items ai
          ON ai.grading_component_id = gc.id AND ai.deleted_at IS NULL
        LEFT JOIN public.assessment_submissions asub
          ON asub.assessment_item_id = ai.id
          AND asub.enrollment_id     = p_enrollment_id
          AND asub.status            = 'Graded'
          AND asub.deleted_at        IS NULL
        WHERE gc.section_id        = e.section_id
          AND gc.grading_period_id = sfg.grading_period_id
          AND gc.deleted_at        IS NULL
        GROUP BY gc.id, gc.name, gc.weight
      )
    )
    ORDER BY gp.sequence
  )
  INTO v_result
  FROM public.section_final_grades sfg
  INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id
  INNER JOIN public.enrollments e      ON e.id  = sfg.enrollment_id
  WHERE sfg.enrollment_id = p_enrollment_id
    AND sfg.deleted_at    IS NULL
    AND gp.deleted_at     IS NULL;

  RETURN jsonb_build_object(
    'enrollment_id', p_enrollment_id,
    'grades',        COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;


--
-- Name: fn_get_grading_config(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_grading_config() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', gc.id,
        'passing_grade', gc.passing_grade,
        'max_absence_percentage', gc.max_absence_percentage
    )
    INTO v_result
    FROM public.grading_config gc
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading config not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_grading_period_templates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_grading_period_templates() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gpt.id,
                'name', gpt.name,
                'sequence', gpt.sequence,
                'weight', gpt.weight,
                'components', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', gct.id,
                            'name', gct.name,
                            'weight', gct.weight
                        )
                        ORDER BY gct.name ASC
                    ), '[]'::jsonb)
                    FROM public.grading_component_templates gct
                    WHERE gct.grading_period_template_id = gpt.id
                    AND gct.deleted_at IS NULL
                )
            )
            ORDER BY gpt.sequence ASC
        ), '[]'::jsonb)
        FROM public.grading_period_templates gpt
        WHERE gpt.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_program_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_program_by_id(p_program_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'description', p.description,
        'department_id', p.department_id,
        'program_level_id', p.program_level_id,
        'total_units', p.total_units,
        'years_duration', p.years_duration,
        'is_active', p.is_active
    )
    INTO v_result
    FROM public.programs p
    WHERE p.id = p_program_id
    AND p.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_program_level_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_program_level_by_id(p_program_level_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', pl.id,
        'code', pl.code,
        'label', pl.label,
        'description', pl.description
    )
    INTO v_result
    FROM public.program_levels pl
    WHERE pl.id = p_program_level_id
    AND pl.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_program_levels(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_program_levels() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', pl.id,
                'code', pl.code,
                'label', pl.label
            )
            ORDER BY pl.label ASC
        ), '[]'::jsonb)
        FROM public.program_levels pl
        WHERE pl.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_programs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_programs() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'code', p.code,
                'label', p.name
            )
            ORDER BY p.name ASC
        ), '[]'::jsonb)
        FROM public.programs p
        WHERE p.deleted_at IS NULL
        AND p.is_active = TRUE
    );
END;
$$;


--
-- Name: fn_get_role_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_role_by_id(p_role_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', r.id,
        'code', r.code,
        'label', r.label,
        'description', r.description
    )
    INTO v_result
    FROM public.roles r
    WHERE r.id = p_role_id
    AND r.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_roles() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'code', r.code,
                'label', r.label
            )
            ORDER BY r.label ASC
        )
        FROM public.roles r
        WHERE r.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_school_year_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_school_year_by_id(p_school_year_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', sy.id,
        'code', sy.code,
        'label', sy.label,
        'start_date', sy.start_date,
        'end_date', sy.end_date,
        'is_active', sy.is_active
    )
    INTO v_result
    FROM public.school_years sy
    WHERE sy.id = p_school_year_id
    AND sy.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_school_years(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_school_years() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', sy.id,
                'code', sy.code,
                'label', sy.label
            )
            ORDER BY sy.start_date DESC
        )
        FROM public.school_years sy
        WHERE sy.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_section_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_section_by_id(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',          s.id,
        'term_id',     s.term_id,
        'course_id',   s.course_id,
        'faculty_id',  s.faculty_id,
        'section_code', s.section_code,
        'room',        s.room,
        'max_slots',   s.max_slots,
        'status',      s.status
    )
    INTO v_result
    FROM public.sections s
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_section_detail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_section_detail(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',           s.id,
        'section_code', s.section_code,
        'course_code',  c.code,
        'course_title', c.title,
        'term_label',   tt.label || ' - ' || sy.label,
        'term_id',      t.id,
        'status',       s.status,
        'max_slots',    s.max_slots,
        'room',         s.room
    )
    INTO v_result
    FROM public.sections s
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    WHERE s.id = p_section_id
    AND s.deleted_at IS NULL
    AND s.faculty_id = auth.uid();

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_sections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_sections() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           s.id,
                'section_code', s.section_code,
                'label',        s.section_code || ' — ' || c.code
            )
            ORDER BY s.section_code ASC
        ), '[]'::JSONB)
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_special_grade_configs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_special_grade_configs() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
                'is_active', sgc.is_active
            )
            ORDER BY sgc.created_at ASC
        ), '[]'::jsonb)
        FROM public.special_grade_configs sgc
        WHERE sgc.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_student_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_by_id(p_student_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',             st.id,
        'user_id',        st.user_id,
        'student_number', st.student_number,
        'year_level',     st.year_level,
        'program_id',     st.program_id,
        'status',         st.status,
        'admitted_at',    st.admitted_at
    )
    INTO v_result
    FROM public.students st
    WHERE st.id = p_student_id
    AND st.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_student_clearance_summary(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_clearance_summary(p_student_id uuid, p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_total    INTEGER;
  v_cleared  INTEGER;
  v_pending  INTEGER;
  v_flagged  INTEGER;
  v_details  JSONB;
BEGIN
  SELECT
    COUNT(*)                                            AS total,
    COUNT(*) FILTER (WHERE sc.status = 'Cleared')      AS cleared,
    COUNT(*) FILTER (WHERE sc.status = 'Pending')      AS pending,
    COUNT(*) FILTER (WHERE sc.status = 'Flagged')      AS flagged
  INTO v_total, v_cleared, v_pending, v_flagged
  FROM public.student_clearances sc
  WHERE sc.student_id = p_student_id
    AND sc.term_id    = p_term_id
    AND sc.deleted_at IS NULL;

  SELECT jsonb_agg(
    jsonb_build_object(
      'requirement_id',   sc.requirement_id,
      'requirement_code', cr.code,
      'requirement_name', cr.name,
      'status',           sc.status,
      'remarks',          sc.remarks,
      'flagged_reason',   sc.flagged_reason,
      'cleared_at',       sc.cleared_at
    )
  )
  INTO v_details
  FROM public.student_clearances sc
  INNER JOIN public.clearance_requirements cr ON cr.id = sc.requirement_id
  WHERE sc.student_id = p_student_id
    AND sc.term_id    = p_term_id
    AND sc.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'student_id',    p_student_id,
    'term_id',       p_term_id,
    'total',         v_total,
    'cleared',       v_cleared,
    'pending',       v_pending,
    'flagged',       v_flagged,
    'is_fully_cleared', (v_total > 0 AND v_flagged = 0 AND v_pending = 0),
    'requirements',  COALESCE(v_details, '[]'::jsonb)
  );
END;
$$;


--
-- Name: fn_get_student_dashboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_dashboard() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    RETURN jsonb_build_object(
        'enrolled_count', (
            SELECT COUNT(*)
            FROM public.enrollments
            WHERE student_id = v_student_id
            AND status = 'Enrolled'
            AND deleted_at IS NULL
        ),
        'upcoming_assessments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              ai.id,
                    'title',           ai.title,
                    'assessment_type', ai.assessment_type,
                    'due_at',          ai.due_at,
                    'section_code',    s.section_code,
                    'course_code',     c.code,
                    'enrollment_id',   e.id
                )
                ORDER BY ai.due_at ASC NULLS LAST
            ), '[]'::JSONB)
            FROM public.enrollments e
            INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
            INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
            INNER JOIN public.assessment_items ai ON ai.section_id = s.id
                AND ai.is_published = true
                AND ai.deleted_at IS NULL
                AND (ai.closes_at IS NULL OR ai.closes_at > now())
            WHERE e.student_id = v_student_id
            AND e.status = 'Enrolled'
            AND e.deleted_at IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = e.id
                AND asub.status IN ('Submitted', 'Late', 'Graded')
                AND asub.deleted_at IS NULL
            )
            LIMIT 5
        ),
        'pending_grades_count', (
            SELECT COUNT(DISTINCT sfg.id)
            FROM public.enrollments e
            INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
                AND sfg.status = 'Released'
                AND sfg.deleted_at IS NULL
            WHERE e.student_id = v_student_id
            AND e.deleted_at IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM public.evaluation_period_locks epl
                WHERE epl.enrollment_id = e.id
                AND epl.grading_period_id = sfg.grading_period_id
                AND epl.is_completed = true
                AND epl.deleted_at IS NULL
            )
        )
    );
END;
$$;


--
-- Name: fn_get_student_evaluation_status(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_evaluation_status(p_student_id uuid, p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'enrollment_id',      e.id,
      'section_id',         e.section_id,
      'grading_period_id',  epl.grading_period_id,
      'grading_period_name', gp.name,
      'is_completed',       epl.is_completed,
      'completed_at',       epl.completed_at,
      'is_grade_visible',   e.is_grade_visible
    )
  )
  INTO v_result
  FROM public.enrollments e
  INNER JOIN public.sections sec            ON sec.id  = e.section_id
  INNER JOIN public.terms t                 ON t.id    = sec.term_id
  INNER JOIN public.evaluation_period_locks epl ON epl.enrollment_id = e.id
  INNER JOIN public.grading_periods gp      ON gp.id  = epl.grading_period_id
  WHERE e.student_id  = p_student_id
    AND t.id          = p_term_id
    AND e.deleted_at  IS NULL
    AND epl.deleted_at IS NULL;

  RETURN jsonb_build_object(
    'student_id', p_student_id,
    'term_id',    p_term_id,
    'locks',      COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;


--
-- Name: fn_get_student_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_schedule() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'section_id',    s.id,
                'section_code',  s.section_code,
                'course_code',   c.code,
                'course_title',  c.title,
                'faculty_name',  u.first_name || ' ' || u.last_name,
                'enrollment_id', e.id,
                'schedules', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',         ss.id,
                            'day_of_week', ss.day_of_week,
                            'time_start', ss.time_start,
                            'time_end',   ss.time_end,
                            'room',       ss.room
                        )
                        ORDER BY ss.day_of_week ASC, ss.time_start ASC
                    ), '[]'::JSONB)
                    FROM public.section_schedules ss
                    WHERE ss.section_id = s.id AND ss.deleted_at IS NULL
                )
            )
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        WHERE e.student_id = v_student_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_student_section_color(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_student_section_color(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT jsonb_build_object('id', id, 'color', color)
    INTO v_result
    FROM public.student_section_colors
    WHERE student_id = v_student_id
    AND section_id = p_section_id
    AND deleted_at IS NULL;

    RETURN COALESCE(v_result, jsonb_build_object('color', NULL));
END;
$$;


--
-- Name: fn_get_students(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_students() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             st.id,
                'student_number', st.student_number,
                'label',          st.student_number || ' — ' || u.first_name || ' ' || u.last_name
            )
            ORDER BY st.student_number ASC
        ), '[]'::JSONB)
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE st.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_subject_detail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_subject_detail(p_enrollment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    SELECT jsonb_build_object(
        'enrollment_id',     e.id,
        'section_id',        s.id,
        'section_code',      s.section_code,
        'course_code',       c.code,
        'course_title',      c.title,
        'term_label',        tt.label || ' - ' || sy.label,
        'faculty_name',      u.first_name || ' ' || u.last_name,
        'enrollment_status', e.status,
        'assessments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',                    ai.id,
                    'title',                 ai.title,
                    'assessment_type',       ai.assessment_type,
                    'total_points',          ai.total_points,
                    'passing_points',        ai.passing_points,
                    'time_limit_minutes',    ai.time_limit_minutes,
                    'max_attempts',          ai.max_attempts,
                    'show_all_questions',    ai.show_all_questions,
                    'questions_per_page',    ai.questions_per_page,
                    'opens_at',              ai.opens_at,
                    'due_at',                ai.due_at,
                    'closes_at',             ai.closes_at,
                    'scheduled_publish_at',  ai.scheduled_publish_at,
                    'submission_status', (
                        SELECT asub.status
                        FROM public.assessment_submissions asub
                        WHERE asub.assessment_item_id = ai.id
                        AND asub.enrollment_id = e.id
                        AND asub.deleted_at IS NULL
                        ORDER BY asub.attempt_number DESC
                        LIMIT 1
                    ),
                    'submission_id', (
                        SELECT asub.id
                        FROM public.assessment_submissions asub
                        WHERE asub.assessment_item_id = ai.id
                        AND asub.enrollment_id = e.id
                        AND asub.deleted_at IS NULL
                        ORDER BY asub.attempt_number DESC
                        LIMIT 1
                    ),
                    'attempts_used', (
                        SELECT COUNT(*)
                        FROM public.assessment_submissions asub
                        WHERE asub.assessment_item_id = ai.id
                        AND asub.enrollment_id = e.id
                        AND asub.deleted_at IS NULL
                    ),
                    'attachments', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id',              aa.id,
                                'file_name',       aa.file_name,
                                'file_url',        aa.file_url,
                                'file_size_bytes', aa.file_size_bytes,
                                'mime_type',       aa.mime_type
                            )
                            ORDER BY aa.sequence ASC
                        ), '[]'::JSONB)
                        FROM public.assessment_attachments aa
                        WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
                    )
                )
                ORDER BY ai.opens_at ASC NULLS LAST, ai.due_at ASC NULLS LAST
            ), '[]'::JSONB)
            FROM public.assessment_items ai
            WHERE ai.section_id = s.id
            AND ai.deleted_at IS NULL
            AND (
                ai.is_published = true
                OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now())
            )
        ),
        'grades', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'grading_period_id',    gp.id,
                    'grading_period_name',  gp.name,
                    'sequence',             gp.sequence,
                    'raw_grade',            sfg.raw_grade,
                    'final_grade',          sfg.final_grade,
                    'transmuted_grade',     sfg.transmuted_grade,
                    'special_grade',        sfg.special_grade,
                    'status',               sfg.status,
                    'is_visible',           sfg.status = 'Released',
                    'evaluation_completed', COALESCE((
                        SELECT epl.is_completed
                        FROM public.evaluation_period_locks epl
                        WHERE epl.enrollment_id = e.id
                        AND epl.grading_period_id = gp.id
                        AND epl.deleted_at IS NULL
                        LIMIT 1
                    ), false)
                )
                ORDER BY gp.sequence ASC
            ), '[]'::JSONB)
            FROM public.grading_periods gp
            INNER JOIN public.sections s2 ON s2.term_id = gp.term_id AND s2.id = s.id
            LEFT JOIN public.section_final_grades sfg
                ON sfg.enrollment_id = e.id
                AND sfg.grading_period_id = gp.id
                AND sfg.deleted_at IS NULL
            WHERE gp.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
    INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
    INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
    INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
    LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
    WHERE e.id = p_enrollment_id
    AND e.student_id = v_student_id
    AND e.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_submission_for_grading(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_submission_for_grading(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id',           asub.id,
        'enrollment_id', asub.enrollment_id,
        'status',       asub.status,
        'raw_score',    asub.raw_score,
        'final_score',  asub.final_score,
        'feedback',     asub.feedback,
        'answers', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id',              sa.id,
                    'question_id',     sa.question_id,
                    'question_text',   aq.question_text,
                    'question_type',   aq.question_type,
                    'points',          aq.points,
                    'sequence',        aq.sequence,
                    'answer_text',     sa.answer_text,
                    'choice_id',       sa.choice_id,
                    'points_earned',   sa.points_earned,
                    'is_correct',      sa.is_correct,
                    'grader_notes',    sa.grader_notes,
                    'file_attachments', sa.file_attachments
                )
                ORDER BY aq.sequence ASC
            ), '[]'::JSONB)
            FROM public.student_answers sa
            INNER JOIN public.assessment_questions aq
                ON aq.id = sa.question_id AND aq.deleted_at IS NULL
            WHERE sa.submission_id = asub.id
            AND sa.deleted_at IS NULL
        )
    )
    INTO v_result
    FROM public.assessment_submissions asub
    INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
    INNER JOIN public.sections s ON s.id = ai.section_id
    WHERE asub.id = p_submission_id
    AND s.faculty_id = auth.uid()
    AND asub.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_system_settings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_system_settings() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', ss.id,
        'institution_name', ss.institution_name,
        'institution_short_name', ss.institution_short_name,
        'institution_address', ss.institution_address,
        'institution_email', ss.institution_email,
        'institution_phone', ss.institution_phone,
        'institution_website', ss.institution_website,
        'institution_logo_url', ss.institution_logo_url,
        'academic_year_start_month', ss.academic_year_start_month,
        'max_units_per_term', ss.max_units_per_term,
        'default_term_type_id', ss.default_term_type_id
    )
    INTO v_result
    FROM public.system_settings ss
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_term_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_term_by_id(p_term_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', t.id,
        'school_year_id', t.school_year_id,
        'term_type_id', t.term_type_id,
        'status', t.status,
        'start_date', t.start_date,
        'end_date', t.end_date,
        'enrollment_start_date', t.enrollment_start_date,
        'enrollment_end_date', t.enrollment_end_date,
        'grading_deadline', t.grading_deadline
    )
    INTO v_result
    FROM public.terms t
    WHERE t.id = p_term_id
    AND t.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_term_type_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_term_type_by_id(p_term_type_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', tt.id,
        'code', tt.code,
        'label', tt.label,
        'sequence', tt.sequence,
        'description', tt.description
    )
    INTO v_result
    FROM public.term_types tt
    WHERE tt.id = p_term_type_id
    AND tt.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_term_types(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_term_types() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', tt.id,
                'code', tt.code,
                'label', tt.label,
                'sequence', tt.sequence
            )
            ORDER BY tt.sequence ASC
        ), '[]'::jsonb)
        FROM public.term_types tt
        WHERE tt.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_terms(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_terms() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'label', tt.label || ' - ' || sy.label
            )
            ORDER BY t.start_date DESC
        ), '[]'::JSONB)
        FROM public.terms t
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        WHERE t.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_get_transmutation_table(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_transmutation_table() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', gtt.id,
                'label', gtt.label,
                'min_percentage', gtt.min_percentage,
                'max_percentage', gtt.max_percentage,
                'transmuted_grade', gtt.transmuted_grade,
                'description', gtt.description
            )
            ORDER BY gtt.transmuted_grade ASC
        ), '[]'::jsonb)
        FROM public.grade_transmutation_tables gtt
        WHERE gtt.deleted_at IS NULL
        AND gtt.program_id IS NULL
    );
END;
$$;


--
-- Name: fn_get_user_by_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_user_by_id(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', u.id,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'email', u.email,
        'role_code', r.code,
        'status', u.status
    )
    INTO v_result
    FROM public.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
    LEFT JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
    WHERE u.id = p_user_id
    AND u.deleted_at IS NULL;

    IF v_result IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;

    RETURN v_result;
END;
$$;


--
-- Name: fn_get_users_by_roles(text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_users_by_roles(p_role_codes text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', u.id,
                'full_name', u.first_name || ' ' || u.last_name,
                'role_label', r.label
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::jsonb)
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        AND (p_role_codes IS NULL OR r.code = ANY(p_role_codes))
    );
END;
$$;


--
-- Name: fn_grade_submission(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_grade_submission(p_submission_id uuid, p_feedback text, p_answers jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_answer      JSONB;
    v_total_score NUMERIC := 0;
    v_max_score   NUMERIC := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.assessment_items ai ON ai.id = asub.assessment_item_id
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE asub.id = p_submission_id
        AND s.faculty_id = auth.uid()
        AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or access denied.');
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        UPDATE public.student_answers
        SET
            points_earned = (v_answer->>'points_earned')::NUMERIC,
            grader_notes  = NULLIF(trim(v_answer->>'grader_notes'), '')
        WHERE id = (v_answer->>'id')::UUID
        AND submission_id = p_submission_id
        AND deleted_at IS NULL;
    END LOOP;

    SELECT
        COALESCE(SUM(sa.points_earned), 0),
        COALESCE(SUM(aq.points), 0)
    INTO v_total_score, v_max_score
    FROM public.student_answers sa
    INNER JOIN public.assessment_questions aq ON aq.id = sa.question_id AND aq.deleted_at IS NULL
    WHERE sa.submission_id = p_submission_id
    AND sa.deleted_at IS NULL;

    UPDATE public.assessment_submissions
    SET
        raw_score  = v_total_score,
        final_score = v_total_score,
        feedback   = NULLIF(p_feedback, ''),
        status     = 'Graded'::public.submission_status_type,
        graded_at  = now(),
        graded_by  = auth.uid()
    WHERE id = p_submission_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Submission graded successfully.',
        'raw_score', v_total_score,
        'max_score', v_max_score
    );
END;
$$;


--
-- Name: fn_list_assessments(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_assessments(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',                    ai.id,
                'title',                 ai.title,
                'description',           ai.description,
                'assessment_type',       ai.assessment_type,
                'total_points',          ai.total_points,
                'passing_points',        ai.passing_points,
                'time_limit_minutes',    ai.time_limit_minutes,
                'max_attempts',          ai.max_attempts,
                'is_published',          ai.is_published,
                'published_at',          ai.published_at,
                'opens_at',              ai.opens_at,
                'due_at',                ai.due_at,
                'closes_at',             ai.closes_at,
                'show_results_at',       ai.show_results_at,
                'scheduled_publish_at',  ai.scheduled_publish_at,
                'shuffle_questions',     ai.shuffle_questions,
                'shuffle_choices',       ai.shuffle_choices,
                'show_all_questions',    ai.show_all_questions,
                'questions_per_page',    ai.questions_per_page,
                'grading_component_id',  ai.grading_component_id,
                'question_count', (
                    SELECT COUNT(*) FROM public.assessment_questions aq
                    WHERE aq.assessment_item_id = ai.id AND aq.deleted_at IS NULL
                ),
                'submission_count', (
                    SELECT COUNT(*) FROM public.assessment_submissions asub
                    WHERE asub.assessment_item_id = ai.id AND asub.deleted_at IS NULL
                ),
                'attachments', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id',              aa.id,
                            'file_name',       aa.file_name,
                            'file_url',        aa.file_url,
                            'file_size_bytes', aa.file_size_bytes,
                            'mime_type',       aa.mime_type,
                            'sequence',        aa.sequence
                        )
                        ORDER BY aa.sequence ASC
                    ), '[]'::JSONB)
                    FROM public.assessment_attachments aa
                    WHERE aa.assessment_item_id = ai.id AND aa.deleted_at IS NULL
                )
            )
            ORDER BY ai.created_at DESC
        ), '[]'::JSONB)
        FROM public.assessment_items ai
        WHERE ai.section_id = p_section_id
        AND ai.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_list_attendance_sessions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_attendance_sessions(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',           ats.id,
                'session_date', ats.session_date,
                'notes',        ats.notes
            )
            ORDER BY ats.session_date DESC
        ), '[]'::JSONB)
        FROM public.attendance_sessions ats
        WHERE ats.section_id = p_section_id
        AND ats.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_list_course_types_json(integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_course_types_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            ct.id,
            ct.code,
            ct.label,
            ct.description,
            COUNT(*) OVER() AS total_count
        FROM public.course_types ct
        WHERE ct.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (ct.label ILIKE %L OR ct.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'ct.created_at ASC');
END;
$$;


--
-- Name: fn_list_courses_json(integer, integer, text, jsonb, uuid[], uuid[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_courses_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_department_ids uuid[] DEFAULT NULL::uuid[], p_course_type_ids uuid[] DEFAULT NULL::uuid[], p_is_active boolean DEFAULT NULL::boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE c.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_type_ids IS NOT NULL AND array_length(p_course_type_ids, 1) > 0 THEN
        v_where := v_where || ' AND c.course_type_id = ANY(' || quote_literal(p_course_type_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND c.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            c.id,
            c.code,
            c.title,
            c.description,
            c.department_id,
            d.name AS department_name,
            c.course_type_id,
            ct.label AS course_type_label,
            c.lecture_units,
            c.laboratory_units,
            c.total_units,
            c.credit_hours,
            c.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.courses c
        JOIN public.departments d ON d.id = c.department_id AND d.deleted_at IS NULL
        JOIN public.course_types ct ON ct.id = c.course_type_id AND ct.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'c.code ASC');
END;
$$;


--
-- Name: fn_list_departments_json(integer, integer, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_departments_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_has_head boolean DEFAULT NULL::boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE d.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (d.code ILIKE %L OR d.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_has_head IS NOT NULL THEN
        IF p_has_head THEN
            v_where := v_where || ' AND d.head_user_id IS NOT NULL';
        ELSE
            v_where := v_where || ' AND d.head_user_id IS NULL';
        END IF;
    END IF;

    v_base_query := format(
        'SELECT
            d.id,
            d.code,
            d.name,
            d.description,
            d.head_user_id,
            CASE
                WHEN d.head_user_id IS NOT NULL
                THEN u.first_name || '' '' || u.last_name
                ELSE NULL
            END AS head_full_name,
            CASE
                WHEN d.head_user_id IS NOT NULL
                THEN r.label
                ELSE NULL
            END AS head_role_label,
            COUNT(*) OVER() AS total_count
        FROM public.departments d
        LEFT JOIN public.users u ON u.id = d.head_user_id AND u.deleted_at IS NULL
        LEFT JOIN public.user_roles ur ON ur.user_id = d.head_user_id AND ur.deleted_at IS NULL
        LEFT JOIN public.roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'd.code ASC');
END;
$$;


--
-- Name: fn_list_enrollments_json(integer, integer, text, jsonb, uuid[], uuid[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_enrollments_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_ids uuid[] DEFAULT NULL::uuid[], p_section_ids uuid[] DEFAULT NULL::uuid[], p_statuses text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR s.section_code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_section_ids IS NOT NULL AND array_length(p_section_ids, 1) > 0 THEN
        v_where := v_where || ' AND e.section_id = ANY(' || quote_literal(p_section_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND e.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.enrollment_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            e.id,
            e.student_id,
            st.student_number,
            u.first_name || '' '' || u.last_name AS student_name,
            e.section_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            e.status,
            e.enrolled_at,
            e.final_grade,
            e.is_grade_visible,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'e.enrolled_at DESC');
END;
$$;


--
-- Name: fn_list_grade_release_json(integer, integer, text, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_grade_release_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND s.term_id = %L', p_term_id);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'WITH grading_period_stats AS (
            SELECT
                gp.id AS grading_period_id,
                gp.term_id,
                gp.name AS grading_period_name,
                gp.sequence,
                e.section_id,
                COUNT(sfg.id) AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Released'') AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Approved'') AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = ''Draft'') AS draft_count
            FROM public.grading_periods gp
            LEFT JOIN public.enrollments e
                ON e.section_id IN (
                    SELECT id FROM public.sections WHERE term_id = gp.term_id AND deleted_at IS NULL
                )
                AND e.deleted_at IS NULL
            LEFT JOIN public.section_final_grades sfg
                ON sfg.grading_period_id = gp.id
                AND sfg.enrollment_id = e.id
                AND sfg.deleted_at IS NULL
            WHERE gp.deleted_at IS NULL
            GROUP BY gp.id, gp.term_id, gp.name, gp.sequence, e.section_id
        ),
        grading_period_agg AS (
            SELECT
                section_id,
                jsonb_agg(jsonb_build_object(
                    ''grading_period_id'', grading_period_id,
                    ''grading_period_name'', grading_period_name,
                    ''sequence'', sequence,
                    ''total_grades'', total_grades,
                    ''released_count'', released_count,
                    ''approved_count'', approved_count,
                    ''draft_count'', draft_count
                ) ORDER BY sequence ASC) AS grading_periods
            FROM grading_period_stats
            WHERE section_id IS NOT NULL
            GROUP BY section_id
        )
        SELECT
            s.id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            u.first_name || '' '' || u.last_name AS faculty_name,
            tt.label || '' - '' || sy.label AS term_label,
            s.status AS section_status,
            gpa.grading_periods,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        LEFT JOIN grading_period_agg gpa ON gpa.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$$;


--
-- Name: fn_list_grade_sheet(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_grade_sheet(p_section_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'enrollment_id',   e.id,
                'student_number',  st.student_number,
                'full_name',       u.first_name || ' ' || u.last_name,
                'raw_grade',       sfg.raw_grade,
                'final_grade',     sfg.final_grade,
                'transmuted_grade', sfg.transmuted_grade,
                'status',          sfg.status,
                'special_grade',   sfg.special_grade
            )
            ORDER BY u.last_name ASC, u.first_name ASC
        ), '[]'::JSONB)
        FROM public.enrollments e
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.section_final_grades sfg
            ON sfg.enrollment_id = e.id
            AND sfg.grading_period_id = p_grading_period_id
            AND sfg.deleted_at IS NULL
        WHERE e.section_id = p_section_id
        AND e.status NOT IN ('Dropped', 'Withdrawn')
        AND e.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_list_grading_components(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_grading_components(p_section_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',     gc.id,
                'name',   gc.name,
                'weight', gc.weight
            )
            ORDER BY gc.name ASC
        ), '[]'::JSONB)
        FROM public.grading_components gc
        WHERE gc.section_id = p_section_id
        AND gc.grading_period_id = p_grading_period_id
        AND gc.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_list_grading_periods_by_section(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_grading_periods_by_section(p_section_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
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
$$;


--
-- Name: fn_list_my_grades(integer, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_my_grades(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_sort jsonb DEFAULT NULL::jsonb, p_term_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id)
        || ' AND e.deleted_at IS NULL'
        || ' AND sfg.status = ''Released'''
        || ' AND sfg.deleted_at IS NULL'
        || ' AND COALESCE(epl.is_completed, false) = true';

    IF p_term_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.id = %L', p_term_id);
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            gp.name AS grading_period_name,
            gp.sequence AS grading_period_sequence,
            sfg.raw_grade,
            sfg.final_grade,
            sfg.transmuted_grade,
            sfg.special_grade,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
        LEFT JOIN public.evaluation_period_locks epl
            ON epl.enrollment_id = e.id
            AND epl.grading_period_id = gp.id
            AND epl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'term_label DESC, c.code ASC, gp.sequence ASC');
END;
$$;


--
-- Name: fn_list_my_sections(integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_my_sections(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL AND s.faculty_id = auth.uid()';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'WITH enrolled_counts AS (
            SELECT
                e.section_id,
                COUNT(*) AS enrolled_count
            FROM public.enrollments e
            WHERE e.status NOT IN (''Dropped'', ''Withdrawn'')
            AND e.deleted_at IS NULL
            GROUP BY e.section_id
        )
        SELECT
            s.id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            tt.label || '' - '' || sy.label AS term_label,
            s.status,
            s.max_slots,
            COALESCE(ec.enrolled_count, 0) AS enrolled_count,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN enrolled_counts ec ON ec.section_id = s.id
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$$;


--
-- Name: fn_list_my_subjects(integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_my_subjects(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
    v_base_query TEXT;
    v_where TEXT;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    v_where := 'WHERE e.student_id = ' || quote_literal(v_student_id) || ' AND e.deleted_at IS NULL';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            e.id AS enrollment_id,
            s.id AS section_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            c.lecture_units,
            c.laboratory_units,
            tt.label || '' - '' || sy.label AS term_label,
            u.first_name || '' '' || u.last_name AS faculty_name,
            e.status AS enrollment_status,
            e.final_grade,
            e.is_grade_visible,
            COUNT(*) OVER() AS total_count
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'term_label DESC, c.code ASC');
END;
$$;


--
-- Name: fn_list_program_levels_json(integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_program_levels_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            pl.id,
            pl.code,
            pl.label,
            pl.description,
            COUNT(*) OVER() AS total_count
        FROM public.program_levels pl
        WHERE pl.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (pl.label ILIKE %L OR pl.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'pl.created_at ASC');
END;
$$;


--
-- Name: fn_list_programs_json(integer, integer, text, jsonb, uuid[], uuid[], boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_programs_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_department_ids uuid[] DEFAULT NULL::uuid[], p_program_level_ids uuid[] DEFAULT NULL::uuid[], p_is_active boolean DEFAULT NULL::boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE p.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (p.code ILIKE %L OR p.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
        v_where := v_where || ' AND p.department_id = ANY(' || quote_literal(p_department_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_program_level_ids IS NOT NULL AND array_length(p_program_level_ids, 1) > 0 THEN
        v_where := v_where || ' AND p.program_level_id = ANY(' || quote_literal(p_program_level_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND p.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            p.id,
            p.code,
            p.name,
            p.description,
            p.department_id,
            d.name AS department_name,
            p.program_level_id,
            pl.label AS program_level_label,
            p.total_units,
            p.years_duration,
            p.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.programs p
        JOIN public.departments d ON d.id = p.department_id AND d.deleted_at IS NULL
        JOIN public.program_levels pl ON pl.id = p.program_level_id AND pl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'p.code ASC');
END;
$$;


--
-- Name: fn_list_programs_json(integer, integer, text, jsonb, uuid, uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_programs_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_department_id uuid DEFAULT NULL::uuid, p_program_level_id uuid DEFAULT NULL::uuid, p_is_active boolean DEFAULT NULL::boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE p.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (p.code ILIKE %L OR p.name ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_department_id IS NOT NULL THEN
        v_where := v_where || format(' AND p.department_id = %L', p_department_id);
    END IF;

    IF p_program_level_id IS NOT NULL THEN
        v_where := v_where || format(' AND p.program_level_id = %L', p_program_level_id);
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND p.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            p.id,
            p.code,
            p.name,
            p.description,
            p.department_id,
            d.name AS department_name,
            p.program_level_id,
            pl.label AS program_level_label,
            p.total_units,
            p.years_duration,
            p.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.programs p
        JOIN public.departments d ON d.id = p.department_id AND d.deleted_at IS NULL
        JOIN public.program_levels pl ON pl.id = p.program_level_id AND pl.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'p.code ASC');
END;
$$;


--
-- Name: fn_list_roles_json(integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_roles_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            r.id,
            r.code,
            r.label,
            r.description,
            COUNT(*) OVER() AS total_count
        FROM public.roles r
        WHERE r.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || ' AND (r.label ILIKE ' || quote_literal('%' || p_search || '%') || ' OR r.code ILIKE ' || quote_literal('%' || p_search || '%') || ')';
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort);
END;
$$;


--
-- Name: fn_list_school_years_json(integer, integer, text, jsonb, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_school_years_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_is_active boolean DEFAULT NULL::boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE sy.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (sy.code ILIKE %L OR sy.label ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND sy.is_active = %L', p_is_active::TEXT);
    END IF;

    v_base_query := format(
        'SELECT
            sy.id,
            sy.code,
            sy.label,
            sy.start_date,
            sy.end_date,
            sy.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.school_years sy
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'sy.start_date DESC');
END;
$$;


--
-- Name: fn_list_school_years_json(integer, integer, text, jsonb, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_school_years_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_is_active boolean DEFAULT NULL::boolean, p_year integer DEFAULT NULL::integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE sy.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (sy.code ILIKE %L OR sy.label ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_is_active IS NOT NULL THEN
        v_where := v_where || format(' AND sy.is_active = %L', p_is_active::TEXT);
    END IF;

    IF p_year IS NOT NULL THEN
        v_where := v_where || format(
            ' AND EXTRACT(YEAR FROM sy.start_date) <= %s AND EXTRACT(YEAR FROM sy.end_date) >= %s',
            p_year,
            p_year
        );
    END IF;

    v_base_query := format(
        'SELECT
            sy.id,
            sy.code,
            sy.label,
            sy.start_date,
            sy.end_date,
            sy.is_active,
            COUNT(*) OVER() AS total_count
        FROM public.school_years sy
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'sy.start_date DESC');
END;
$$;


--
-- Name: fn_list_section_students(uuid, integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_section_students(p_section_id uuid, p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE e.section_id = ' || quote_literal(p_section_id) || ' AND e.deleted_at IS NULL';
BEGIN
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
$$;


--
-- Name: fn_list_sections_json(integer, integer, text, jsonb, uuid[], uuid[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_sections_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_term_ids uuid[] DEFAULT NULL::uuid[], p_course_ids uuid[] DEFAULT NULL::uuid[], p_statuses text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE s.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (s.section_code ILIKE %L OR c.code ILIKE %L OR c.title ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_term_ids IS NOT NULL AND array_length(p_term_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.term_id = ANY(' || quote_literal(p_term_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_course_ids IS NOT NULL AND array_length(p_course_ids, 1) > 0 THEN
        v_where := v_where || ' AND s.course_id = ANY(' || quote_literal(p_course_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND s.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.section_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            s.id,
            s.section_code,
            s.term_id,
            tt.label || '' - '' || sy.label AS term_label,
            s.course_id,
            c.code AS course_code,
            c.title AS course_title,
            s.faculty_id,
            u.first_name || '' '' || u.last_name AS faculty_name,
            s.room,
            s.max_slots,
            s.status,
            COUNT(*) OVER() AS total_count
        FROM public.sections s
        INNER JOIN public.terms t ON t.id = s.term_id AND t.deleted_at IS NULL
        INNER JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        INNER JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        LEFT JOIN public.users u ON u.id = s.faculty_id AND u.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 's.section_code ASC');
END;
$$;


--
-- Name: fn_list_students_json(integer, integer, text, jsonb, uuid[], smallint[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_students_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_program_ids uuid[] DEFAULT NULL::uuid[], p_year_levels smallint[] DEFAULT NULL::smallint[], p_statuses text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE st.deleted_at IS NULL';
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (st.student_number ILIKE %L OR u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_program_ids IS NOT NULL AND array_length(p_program_ids, 1) > 0 THEN
        v_where := v_where || ' AND st.program_id = ANY(' || quote_literal(p_program_ids::TEXT) || '::uuid[])';
    END IF;

    IF p_year_levels IS NOT NULL AND array_length(p_year_levels, 1) > 0 THEN
        v_where := v_where || ' AND st.year_level = ANY(' || quote_literal(p_year_levels::TEXT) || '::smallint[])';
    END IF;

    IF p_statuses IS NOT NULL AND array_length(p_statuses, 1) > 0 THEN
        v_where := v_where || ' AND st.status = ANY(' || quote_literal(p_statuses::TEXT) || '::public.student_status_type[])';
    END IF;

    v_base_query := format(
        'SELECT
            st.id,
            st.student_number,
            st.year_level,
            st.status,
            st.admitted_at,
            st.program_id,
            p.code AS program_code,
            p.name AS program_name,
            st.user_id,
            u.first_name,
            u.last_name,
            u.email,
            u.status AS user_status,
            COUNT(*) OVER() AS total_count
        FROM public.students st
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        LEFT JOIN public.programs p ON p.id = st.program_id AND p.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'st.student_number ASC');
END;
$$;


--
-- Name: fn_list_submissions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_submissions(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id',             asub.id,
                'enrollment_id',  asub.enrollment_id,
                'student_number', st.student_number,
                'full_name',      u.first_name || ' ' || u.last_name,
                'attempt_number', asub.attempt_number,
                'status',         asub.status,
                'started_at',     asub.started_at,
                'submitted_at',   asub.submitted_at,
                'raw_score',      asub.raw_score,
                'final_score',    asub.final_score,
                'is_late',        asub.is_late,
                'feedback',       asub.feedback
            )
            ORDER BY asub.submitted_at DESC NULLS LAST
        ), '[]'::JSONB)
        FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        INNER JOIN public.users u ON u.id = st.user_id AND u.deleted_at IS NULL
        WHERE asub.assessment_item_id = p_assessment_id
        AND asub.deleted_at IS NULL
    );
END;
$$;


--
-- Name: fn_list_term_types_json(integer, integer, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_term_types_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
BEGIN
    v_base_query := '
        SELECT
            tt.id,
            tt.code,
            tt.label,
            tt.description,
            tt.sequence,
            COUNT(*) OVER() AS total_count
        FROM public.term_types tt
        WHERE tt.deleted_at IS NULL
    ';

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_base_query := v_base_query || format(
            ' AND (tt.label ILIKE %L OR tt.code ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'tt.sequence ASC');
END;
$$;


--
-- Name: fn_list_terms_json(integer, integer, text, jsonb, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_terms_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_school_year_id uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_base_query TEXT;
    v_where TEXT := 'WHERE t.deleted_at IS NULL';
BEGIN
    IF p_school_year_id IS NOT NULL THEN
        v_where := v_where || format(' AND t.school_year_id = %L', p_school_year_id);
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where := v_where || format(' AND t.status = %L', p_status);
    END IF;

    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where := v_where || format(
            ' AND (sy.label ILIKE %L OR tt.label ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    v_base_query := format(
        'SELECT
            t.id,
            t.school_year_id,
            sy.label AS school_year_label,
            t.term_type_id,
            tt.label AS term_type_label,
            t.status,
            t.start_date,
            t.end_date,
            t.enrollment_start_date,
            t.enrollment_end_date,
            t.grading_deadline,
            COUNT(*) OVER() AS total_count
        FROM public.terms t
        JOIN public.school_years sy ON sy.id = t.school_year_id AND sy.deleted_at IS NULL
        JOIN public.term_types tt ON tt.id = t.term_type_id AND tt.deleted_at IS NULL
        %s',
        v_where
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 't.start_date DESC');
END;
$$;


--
-- Name: fn_list_users_json(integer, integer, text, jsonb, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_list_users_json(p_page integer DEFAULT 1, p_size integer DEFAULT 20, p_search text DEFAULT NULL::text, p_sort jsonb DEFAULT NULL::jsonb, p_role_code text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_province text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_where_clause TEXT := 'WHERE u.deleted_at IS NULL';
    v_base_query   TEXT;
BEGIN
    IF p_search IS NOT NULL AND p_search <> '' THEN
        v_where_clause := v_where_clause || format(
            ' AND (u.first_name ILIKE %L OR u.last_name ILIKE %L OR u.email ILIKE %L)',
            '%' || p_search || '%',
            '%' || p_search || '%',
            '%' || p_search || '%'
        );
    END IF;

    IF p_role_code IS NOT NULL AND p_role_code <> 'All' THEN
        v_where_clause := v_where_clause || format(' AND r.code = %L', p_role_code);
    END IF;

    IF p_status IS NOT NULL AND p_status <> 'All' THEN
        v_where_clause := v_where_clause || format(' AND u.status = %L', p_status);
    END IF;

    IF p_city IS NOT NULL AND p_city <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.city ILIKE %L', '%' || p_city || '%');
    END IF;

    IF p_province IS NOT NULL AND p_province <> '' THEN
        v_where_clause := v_where_clause || format(' AND u.province ILIKE %L', '%' || p_province || '%');
    END IF;

    v_base_query := format(
        'SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            r.code::TEXT     AS role_code,
            u.status,
            COUNT(*) OVER () AS total_count
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
        JOIN public.roles r       ON r.id = ur.role_id AND r.deleted_at IS NULL
        %s',
        v_where_clause
    );

    RETURN public.fn_build_pageable_dto(v_base_query, p_page, p_size, p_sort, 'u.created_at ASC');
END;
$$;


--
-- Name: fn_mark_notifications_read(uuid, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_mark_notifications_read(p_user_id uuid, p_notification_ids uuid[] DEFAULT NULL::uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = p_user_id
      AND is_read     = false
      AND deleted_at  IS NULL;
  ELSE
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE user_id     = p_user_id
      AND id          = ANY(p_notification_ids)
      AND is_read     = false
      AND deleted_at  IS NULL;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',  true,
    'marked',   v_updated
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_notify_user(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_user(p_user_id uuid, p_title text, p_message text, p_action_url text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, action_url)
  VALUES (p_user_id, p_title, p_message, p_action_url);
END;
$$;


--
-- Name: fn_provision_single_user(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_provision_single_user(p_auth_id uuid, p_email text, p_first_name text, p_last_name text, p_role_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_role_id UUID;
BEGIN
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = p_role_code
    AND deleted_at IS NULL;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role code: ' || p_role_code);
    END IF;

    INSERT INTO public.users (id, email, first_name, last_name, status)
    VALUES (p_auth_id, p_email, p_first_name, p_last_name, 'Invited')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role_id, created_by)
    VALUES (p_auth_id, v_role_id, p_auth_id)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'User provisioned successfully');
END;
$$;


--
-- Name: fn_publish_assessment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_publish_assessment(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_questions
        WHERE assessment_item_id = p_assessment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot publish an assessment with no questions.');
    END IF;

    UPDATE public.assessment_items
    SET
        is_published = true,
        published_at = now()
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment published successfully.');
END;
$$;


--
-- Name: fn_record_heartbeat(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_record_heartbeat(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_session_id  UUID;
  v_expires_at  TIMESTAMPTZ;
  v_status      submission_timer_status;
BEGIN
  SELECT id, server_expires_at, status
  INTO v_session_id, v_expires_at, v_status
  FROM public.assessment_timer_sessions
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session not found.');
  END IF;

  IF v_status != 'Active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Timer session is no longer active.', 'status', v_status);
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    PERFORM fn_expire_overdue_submissions();
    RETURN jsonb_build_object('success', false, 'message', 'Session has expired.', 'expired_at', v_expires_at);
  END IF;

  INSERT INTO public.assessment_timer_heartbeats (session_id, recorded_at, client_ip)
  VALUES (v_session_id, now(), inet_client_addr());

  UPDATE public.assessment_timer_sessions
  SET last_activity_at = now()
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'success',      true,
    'session_id',   v_session_id,
    'expires_at',   v_expires_at,
    'remaining_seconds', EXTRACT(EPOCH FROM (v_expires_at - now()))::INTEGER,
    'recorded_at',  now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_release_grades_after_evaluation(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_release_grades_after_evaluation(p_enrollment_id uuid, p_grading_period_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_is_completed BOOLEAN;
  v_grade_count  INTEGER;
BEGIN
  SELECT fn_check_evaluation_completion(p_enrollment_id, p_grading_period_id)
  INTO v_is_completed;

  IF NOT v_is_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Evaluation not yet completed for this grading period.'
    );
  END IF;

  UPDATE public.enrollments
  SET is_grade_visible = true
  WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_grade_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',      true,
    'message',      'Grades released successfully.',
    'rows_updated', v_grade_count
  );
END;
$$;


--
-- Name: fn_save_attendance_records(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_attendance_records(p_session_id uuid, p_records jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_record JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.attendance_sessions ats
        INNER JOIN public.sections s ON s.id = ats.section_id
        WHERE ats.id = p_session_id
        AND s.faculty_id = auth.uid()
        AND ats.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found or access denied.');
    END IF;

    FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        UPDATE public.attendance_records
        SET
            status  = (v_record->>'status')::public.attendance_status_type,
            remarks = NULLIF(trim(v_record->>'remarks'), '')
        WHERE id = (v_record->>'id')::UUID
        AND attendance_session_id = p_session_id
        AND deleted_at IS NULL;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Attendance saved successfully.');
END;
$$;


--
-- Name: fn_save_grading_period_templates(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_grading_period_templates(p_periods jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_period JSONB;
    v_component JSONB;
    v_period_id UUID;
    v_total_weight NUMERIC := 0;
BEGIN
    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        v_total_weight := v_total_weight + (v_period->>'weight')::NUMERIC;
    END LOOP;

    IF round(v_total_weight::NUMERIC, 2) <> 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Period weights must sum to exactly 100%. Current total: ' || v_total_weight || '%');
    END IF;

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        DECLARE
            v_comp_total NUMERIC := 0;
        BEGIN
            FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
            LOOP
                v_comp_total := v_comp_total + (v_component->>'weight')::NUMERIC;
            END LOOP;

            IF round(v_comp_total::NUMERIC, 2) <> 100 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'message', 'Component weights for ' || (v_period->>'name') || ' must sum to exactly 100%. Current total: ' || v_comp_total || '%'
                );
            END IF;
        END;
    END LOOP;

    UPDATE public.grading_component_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE grading_period_template_id IN (
        SELECT id FROM public.grading_period_templates WHERE deleted_at IS NULL
    )
    AND deleted_at IS NULL;

    UPDATE public.grading_period_templates
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE deleted_at IS NULL;

    FOR v_period IN SELECT * FROM jsonb_array_elements(p_periods)
    LOOP
        INSERT INTO public.grading_period_templates (name, sequence, weight, created_by)
        VALUES (
            v_period->>'name',
            (v_period->>'sequence')::SMALLINT,
            (v_period->>'weight')::NUMERIC,
            auth.uid()
        )
        RETURNING id INTO v_period_id;

        FOR v_component IN SELECT * FROM jsonb_array_elements(v_period->'components')
        LOOP
            INSERT INTO public.grading_component_templates (
                grading_period_template_id, name, weight, created_by
            )
            VALUES (
                v_period_id,
                v_component->>'name',
                (v_component->>'weight')::NUMERIC,
                auth.uid()
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grading period templates saved successfully');
END;
$$;


--
-- Name: fn_save_special_grade_configs(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_special_grade_configs(p_configs jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_config JSONB;
BEGIN
    FOR v_config IN SELECT * FROM jsonb_array_elements(p_configs)
    LOOP
        IF v_config->>'id' IS NOT NULL THEN
            UPDATE public.special_grade_configs
            SET
                code = v_config->>'code',
                label = v_config->>'label',
                description = v_config->>'description',
                min_absence_percentage = (v_config->>'min_absence_percentage')::NUMERIC,
                requires_completion = (v_config->>'requires_completion')::BOOLEAN,
                completion_deadline_days = (v_config->>'completion_deadline_days')::SMALLINT,
                is_passing = (v_config->>'is_passing')::BOOLEAN,
                is_active = (v_config->>'is_active')::BOOLEAN
            WHERE id = (v_config->>'id')::UUID
            AND deleted_at IS NULL;
        ELSE
            INSERT INTO public.special_grade_configs (
                code, label, description, min_absence_percentage,
                requires_completion, completion_deadline_days,
                is_passing, is_active, created_by
            )
            VALUES (
                v_config->>'code',
                v_config->>'label',
                v_config->>'description',
                (v_config->>'min_absence_percentage')::NUMERIC,
                (v_config->>'requires_completion')::BOOLEAN,
                (v_config->>'completion_deadline_days')::SMALLINT,
                (v_config->>'is_passing')::BOOLEAN,
                (v_config->>'is_active')::BOOLEAN,
                auth.uid()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Special grade configurations saved successfully');
END;
$$;


--
-- Name: fn_save_student_answer(uuid, uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_student_answer(p_submission_id uuid, p_question_id uuid, p_answer_text text, p_choice_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_is_correct BOOLEAN := NULL;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_submissions asub
        INNER JOIN public.enrollments e ON e.id = asub.enrollment_id
        INNER JOIN public.students st ON st.id = e.student_id
        WHERE asub.id = p_submission_id
        AND st.user_id = auth.uid()
        AND asub.status IN ('In Progress', 'Not Started')
        AND asub.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Submission not found or not in progress.');
    END IF;

    IF p_choice_id IS NOT NULL THEN
        SELECT is_correct INTO v_is_correct
        FROM public.assessment_question_choices
        WHERE id = p_choice_id AND deleted_at IS NULL;
    END IF;

    INSERT INTO public.student_answers (
        submission_id,
        question_id,
        answer_text,
        choice_id,
        is_correct,
        points_earned,
        created_by
    ) VALUES (
        p_submission_id,
        p_question_id,
        NULLIF(p_answer_text, ''),
        p_choice_id,
        v_is_correct,
        CASE
            WHEN v_is_correct = true THEN (
                SELECT points FROM public.assessment_questions
                WHERE id = p_question_id AND deleted_at IS NULL
            )
            WHEN v_is_correct = false THEN 0
            ELSE NULL
        END,
        auth.uid()
    )
    ON CONFLICT (submission_id, question_id)
    DO UPDATE SET
        answer_text   = NULLIF(p_answer_text, ''),
        choice_id     = p_choice_id,
        is_correct    = v_is_correct,
        points_earned = CASE
            WHEN v_is_correct = true THEN (
                SELECT points FROM public.assessment_questions
                WHERE id = p_question_id AND deleted_at IS NULL
            )
            WHEN v_is_correct = false THEN 0
            ELSE NULL
        END;

    RETURN jsonb_build_object('success', true, 'message', 'Answer saved.');
END;
$$;


--
-- Name: fn_save_transmutation_table(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_save_transmutation_table(p_rows jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_row JSONB;
    v_total_coverage NUMERIC;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        IF (v_row->>'min_percentage')::NUMERIC >= (v_row->>'max_percentage')::NUMERIC THEN
            RETURN jsonb_build_object('success', false, 'message', 'Min percentage must be less than max percentage for each row');
        END IF;

        IF (v_row->>'transmuted_grade')::NUMERIC < 1.0 OR (v_row->>'transmuted_grade')::NUMERIC > 5.0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Transmuted grade must be between 1.0 and 5.0');
        END IF;
    END LOOP;

    UPDATE public.grade_transmutation_tables
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE program_id IS NULL
    AND deleted_at IS NULL;

    FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
    LOOP
        INSERT INTO public.grade_transmutation_tables (
            label, min_percentage, max_percentage,
            transmuted_grade, description, created_by
        )
        VALUES (
            'Default',
            (v_row->>'min_percentage')::NUMERIC,
            (v_row->>'max_percentage')::NUMERIC,
            (v_row->>'transmuted_grade')::NUMERIC,
            v_row->>'description',
            auth.uid()
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Grade transmutation table saved successfully');
END;
$$;


--
-- Name: fn_set_updated_at_assessment_attachments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at_assessment_attachments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


--
-- Name: fn_set_updated_at_student_section_colors(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at_student_section_colors() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$;


--
-- Name: fn_set_updated_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_audit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid(); -- Supabase injects the authenticated user's UUID
  RETURN NEW;
END;
$$;


--
-- Name: fn_start_assessment_timer(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_start_assessment_timer(p_enrollment_id uuid, p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_submission_id       UUID;
    v_time_limit          SMALLINT;
    v_closes_at           TIMESTAMPTZ;
    v_opens_at            TIMESTAMPTZ;
    v_attempt_number      SMALLINT;
    v_max_attempts        SMALLINT;
    v_existing_session_id UUID;
    v_expires_at          TIMESTAMPTZ;
    v_section_id          UUID;
    v_is_enrolled         BOOLEAN;
BEGIN
    SELECT
        ai.time_limit_minutes,
        ai.closes_at,
        ai.opens_at,
        ai.max_attempts,
        ai.section_id
    INTO v_time_limit, v_closes_at, v_opens_at, v_max_attempts, v_section_id
    FROM public.assessment_items ai
    WHERE ai.id = p_assessment_id
    AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
    AND ai.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or not published.');
    END IF;

    IF v_opens_at IS NOT NULL AND now() < v_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment is not yet open.');
    END IF;

    IF v_closes_at IS NOT NULL AND now() > v_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment window has closed.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = p_enrollment_id
        AND e.section_id = v_section_id
        AND e.status = 'Enrolled'
        AND e.deleted_at IS NULL
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student is not enrolled in this section.');
    END IF;

    SELECT COUNT(*) INTO v_attempt_number
    FROM public.assessment_submissions
    WHERE assessment_item_id = p_assessment_id
    AND enrollment_id = p_enrollment_id
    AND deleted_at IS NULL;

    IF v_attempt_number >= v_max_attempts THEN
        RETURN jsonb_build_object('success', false, 'message', 'Maximum attempts reached.');
    END IF;

    v_expires_at := CASE
        WHEN v_time_limit IS NOT NULL THEN now() + (v_time_limit || ' minutes')::INTERVAL
        ELSE NULL
    END;

    INSERT INTO public.assessment_submissions (
        assessment_item_id, enrollment_id, attempt_number,
        status, started_at, time_limit_expires_at, created_by
    ) VALUES (
        p_assessment_id, p_enrollment_id, v_attempt_number + 1,
        'In Progress', now(), v_expires_at, auth.uid()
    )
    RETURNING id INTO v_submission_id;

    INSERT INTO public.assessment_timer_sessions (
        submission_id, started_at, expires_at,
        status, last_activity_at, created_by
    ) VALUES (
        v_submission_id, now(), v_expires_at,
        'Active', now(), auth.uid()
    );

    RETURN jsonb_build_object(
        'success',       true,
        'submission_id', v_submission_id,
        'expires_at',    v_expires_at
    );
END;
$$;


--
-- Name: fn_submit_assessment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_submit_assessment(p_submission_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_enrollment_id    UUID;
  v_assessment_id    UUID;
  v_status           submission_status_type;
  v_expires_at       TIMESTAMPTZ;
  v_due_at           TIMESTAMPTZ;
  v_is_late          BOOLEAN := false;
BEGIN
  SELECT
    asub.enrollment_id,
    asub.assessment_item_id,
    asub.status,
    asub.time_limit_expires_at
  INTO v_enrollment_id, v_assessment_id, v_status, v_expires_at
  FROM public.assessment_submissions asub
  WHERE asub.id         = p_submission_id
    AND asub.deleted_at IS NULL;

  IF v_enrollment_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission not found.');
  END IF;

  IF v_status NOT IN ('In Progress', 'Not Started') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission is not in a submittable state.');
  END IF;

  IF v_expires_at IS NOT NULL AND now() > v_expires_at THEN
    RETURN jsonb_build_object('success', false, 'message', 'Submission window has expired.');
  END IF;

  SELECT ai.due_at INTO v_due_at
  FROM public.assessment_items ai
  WHERE ai.id = v_assessment_id AND ai.deleted_at IS NULL;

  IF v_due_at IS NOT NULL AND now() > v_due_at THEN
    v_is_late := true;
  END IF;

  UPDATE public.assessment_submissions
  SET
    status       = CASE WHEN v_is_late THEN 'Late' ELSE 'Submitted' END,
    submitted_at = now(),
    is_late      = v_is_late
  WHERE id = p_submission_id;

  UPDATE public.assessment_timer_sessions
  SET
    status           = 'Submitted',
    last_activity_at = now()
  WHERE submission_id = p_submission_id
    AND deleted_at    IS NULL;

  RETURN jsonb_build_object(
    'success',       true,
    'submission_id', p_submission_id,
    'submitted_at',  now(),
    'is_late',       v_is_late,
    'message',       'Submission recorded successfully.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;


--
-- Name: fn_unpublish_assessment(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_unpublish_assessment(p_assessment_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    UPDATE public.assessment_items
    SET is_published = false
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment unpublished successfully.');
END;
$$;


--
-- Name: fn_update_assessment(uuid, text, text, public.assessment_type, uuid, numeric, numeric, smallint, smallint, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, boolean, boolean, boolean, smallint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_assessment(p_assessment_id uuid, p_title text, p_description text, p_assessment_type public.assessment_type, p_grading_component_id uuid, p_total_points numeric, p_passing_points numeric, p_time_limit_minutes smallint, p_max_attempts smallint, p_opens_at timestamp with time zone, p_due_at timestamp with time zone, p_closes_at timestamp with time zone, p_show_results_at timestamp with time zone, p_scheduled_publish_at timestamp with time zone, p_shuffle_questions boolean, p_shuffle_choices boolean, p_show_all_questions boolean DEFAULT true, p_questions_per_page smallint DEFAULT NULL::smallint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_opens_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be in the future.');
    END IF;

    IF p_due_at IS NOT NULL AND p_due_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Due date must be in the future.');
    END IF;

    IF p_closes_at IS NOT NULL AND p_closes_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be in the future.');
    END IF;

    IF p_show_results_at IS NOT NULL AND p_show_results_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Show results date must be in the future.');
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND p_scheduled_publish_at < now() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scheduled publish date must be in the future.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_opens_at >= p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before due date.');
    END IF;

    IF p_due_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_closes_at < p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be on or after due date.');
    END IF;

    IF NOT COALESCE(p_show_all_questions, true) AND (p_questions_per_page IS NULL OR p_questions_per_page < 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Questions per page must be at least 1 when not showing all questions.');
    END IF;

    UPDATE public.assessment_items
    SET
        title                = p_title,
        description          = NULLIF(p_description, ''),
        assessment_type      = p_assessment_type,
        grading_component_id = p_grading_component_id,
        total_points         = p_total_points,
        passing_points       = p_passing_points,
        time_limit_minutes   = p_time_limit_minutes,
        max_attempts         = COALESCE(p_max_attempts, 1),
        opens_at             = p_opens_at,
        due_at               = p_due_at,
        closes_at            = p_closes_at,
        show_results_at      = p_show_results_at,
        scheduled_publish_at = p_scheduled_publish_at,
        shuffle_questions    = COALESCE(p_shuffle_questions, false),
        shuffle_choices      = COALESCE(p_shuffle_choices, false),
        show_all_questions   = COALESCE(p_show_all_questions, true),
        questions_per_page   = CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END
    WHERE id = p_assessment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment updated successfully.');
END;
$$;


--
-- Name: fn_update_course(uuid, text, text, uuid, uuid, numeric, numeric, numeric, text, boolean, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_course(p_course_id uuid, p_code text, p_title text, p_department_id uuid, p_course_type_id uuid, p_lecture_units numeric DEFAULT NULL::numeric, p_laboratory_units numeric DEFAULT NULL::numeric, p_credit_hours numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true, p_prerequisites jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_prereq JSONB;
BEGIN
    IF p_lecture_units IS NULL OR p_lecture_units < 0 OR p_lecture_units > 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lecture units must be between 0 and 10');
    END IF;

    IF p_laboratory_units IS NOT NULL AND (p_laboratory_units < 0 OR p_laboratory_units > 10) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Laboratory units must be between 0 and 10');
    END IF;

    IF p_credit_hours IS NOT NULL AND (p_credit_hours < 0 OR p_credit_hours > 20) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credit hours must be between 0 and 20');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.courses
        WHERE code = p_code
        AND id <> p_course_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course code already exists: ' || p_code);
    END IF;

    UPDATE public.courses
    SET
        title = p_title,
        department_id = p_department_id,
        course_type_id = p_course_type_id,
        lecture_units = p_lecture_units,
        laboratory_units = COALESCE(p_laboratory_units, 0),
        credit_hours = p_credit_hours,
        description = NULLIF(p_description, ''),
        is_active = p_is_active
    WHERE id = p_course_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course not found');
    END IF;

    UPDATE public.course_prerequisites
    SET deleted_at = now(), deleted_by = auth.uid()
    WHERE course_id = p_course_id AND deleted_at IS NULL;

    IF p_prerequisites IS NOT NULL AND jsonb_array_length(p_prerequisites) > 0 THEN
        FOR v_prereq IN SELECT * FROM jsonb_array_elements(p_prerequisites)
        LOOP
            IF (v_prereq->>'prerequisite_kind') = 'course' THEN
                IF (v_prereq->>'course_id') IS NULL OR (v_prereq->>'course_id') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Course prerequisite must have a course selected');
                END IF;
                IF (v_prereq->>'course_id')::UUID = p_course_id THEN
                    RETURN jsonb_build_object('success', false, 'message', 'A course cannot be a prerequisite of itself');
                END IF;
            END IF;

            IF (v_prereq->>'prerequisite_kind') = 'standing' THEN
                IF (v_prereq->>'year_level_required') IS NULL OR (v_prereq->>'year_level_required') = '' THEN
                    RETURN jsonb_build_object('success', false, 'message', 'Standing prerequisite must have a year level selected');
                END IF;
            END IF;

            IF (v_prereq->>'prerequisite_type') = 'Co-requisite' AND
               (v_prereq->>'minimum_grade') IS NOT NULL AND
               (v_prereq->>'minimum_grade') <> '' THEN
                RETURN jsonb_build_object('success', false, 'message', 'Co-requisite courses cannot have a minimum grade requirement');
            END IF;

            INSERT INTO public.course_prerequisites (
                course_id, prerequisite_id, prerequisite_type,
                prerequisite_kind, year_level_required, minimum_grade, created_by
            )
            VALUES (
                p_course_id,
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'course'
                    THEN (v_prereq->>'course_id')::UUID
                    ELSE NULL END,
                (v_prereq->>'prerequisite_type')::public.prerequisite_type,
                COALESCE(v_prereq->>'prerequisite_kind', 'course'),
                CASE WHEN (v_prereq->>'prerequisite_kind') = 'standing'
                    THEN (v_prereq->>'year_level_required')::SMALLINT
                    ELSE NULL END,
                CASE WHEN v_prereq->>'minimum_grade' = '' THEN NULL
                     ELSE (v_prereq->>'minimum_grade')::NUMERIC END,
                auth.uid()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course updated successfully');
END;
$$;


--
-- Name: fn_update_course_type(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_course_type(p_course_type_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.course_types
        WHERE code = p_code
        AND id <> p_course_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type code already exists: ' || p_code);
    END IF;

    UPDATE public.course_types
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_course_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Course type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Course type updated successfully');
END;
$$;


--
-- Name: fn_update_curriculum_map_entry(uuid, uuid, smallint, uuid, uuid, smallint, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_curriculum_map_entry(p_curriculum_map_id uuid, p_course_id uuid, p_year_level smallint, p_term_type_id uuid, p_school_year_id uuid DEFAULT NULL::uuid, p_sequence smallint DEFAULT 1, p_is_elective boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_program_id UUID;
BEGIN
    SELECT program_id INTO v_program_id
    FROM public.curriculum_maps
    WHERE id = p_curriculum_map_id AND deleted_at IS NULL;

    IF v_program_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Curriculum map entry not found');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.curriculum_maps
        WHERE program_id = v_program_id
        AND course_id = p_course_id
        AND school_year_id IS NOT DISTINCT FROM p_school_year_id
        AND id <> p_curriculum_map_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This course already exists in the curriculum for the selected school year');
    END IF;

    IF p_year_level < 1 OR p_year_level > 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Year level must be between 1 and 6');
    END IF;

    UPDATE public.curriculum_maps
    SET
        course_id = p_course_id,
        year_level = p_year_level,
        term_type_id = p_term_type_id,
        school_year_id = p_school_year_id,
        sequence = p_sequence,
        is_elective = p_is_elective
    WHERE id = p_curriculum_map_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Curriculum map entry updated successfully');
END;
$$;


--
-- Name: fn_update_department(uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_department(p_department_id uuid, p_code text, p_name text, p_description text DEFAULT NULL::text, p_head_user_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.departments
        WHERE code = p_code
        AND id <> p_department_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department code already exists: ' || p_code);
    END IF;

    IF p_head_user_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = p_head_user_id
            AND r.code IN ('Faculty', 'Dean')
            AND ur.deleted_at IS NULL
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Department head must have a Faculty or Dean role');
        END IF;
    END IF;

    UPDATE public.departments
    SET
        code = p_code,
        name = p_name,
        description = NULLIF(p_description, ''),
        head_user_id = p_head_user_id
    WHERE id = p_department_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Department not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Department updated successfully');
END;
$$;


--
-- Name: fn_update_enrollment(uuid, public.enrollment_status_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_enrollment(p_enrollment_id uuid, p_status public.enrollment_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.enrollments
        WHERE id = p_enrollment_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Enrollment not found.');
    END IF;

    UPDATE public.enrollments
    SET status = p_status
    WHERE id = p_enrollment_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Enrollment updated successfully.');
END;
$$;


--
-- Name: fn_update_grading_component(uuid, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_grading_component(p_component_id uuid, p_name text, p_weight numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_section_id        UUID;
    v_grading_period_id UUID;
    v_total_weight      NUMERIC;
BEGIN
    SELECT gc.section_id, gc.grading_period_id
    INTO v_section_id, v_grading_period_id
    FROM public.grading_components gc
    INNER JOIN public.sections s ON s.id = gc.section_id
    WHERE gc.id = p_component_id
    AND s.faculty_id = auth.uid()
    AND gc.deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Component not found or access denied.');
    END IF;

    SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
    FROM public.grading_components
    WHERE section_id = v_section_id
    AND grading_period_id = v_grading_period_id
    AND id <> p_component_id
    AND deleted_at IS NULL;

    IF v_total_weight + p_weight > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Total weight of grading components cannot exceed 100%.');
    END IF;

    UPDATE public.grading_components
    SET name = p_name, weight = p_weight
    WHERE id = p_component_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Grading component updated successfully.');
END;
$$;


--
-- Name: fn_update_grading_config(numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_grading_config(p_passing_grade numeric, p_max_absence_percentage numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_passing_grade < 1.0 OR p_passing_grade > 5.0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Passing grade must be between 1.0 and 5.0');
    END IF;

    IF p_max_absence_percentage <= 0 OR p_max_absence_percentage > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max absence percentage must be between 1 and 100');
    END IF;

    UPDATE public.grading_config
    SET
        passing_grade = p_passing_grade,
        max_absence_percentage = p_max_absence_percentage
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading config not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Grading configuration updated successfully');
END;
$$;


--
-- Name: fn_update_program(uuid, text, text, uuid, uuid, smallint, numeric, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_program(p_program_id uuid, p_code text, p_name text, p_department_id uuid, p_program_level_id uuid, p_years_duration smallint, p_total_units numeric DEFAULT NULL::numeric, p_description text DEFAULT NULL::text, p_is_active boolean DEFAULT true) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$BEGIN
    IF EXISTS (
        SELECT 1 FROM public.programs
        WHERE code = p_code
        AND id <> p_program_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program code already exists: ' || p_code);
    END IF;

    IF p_years_duration < 1 OR p_years_duration > 8 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Years duration must be between 1 and 8');
    END IF;

    UPDATE public.programs
    SET
        code = p_code,
        name = p_name,
        department_id = p_department_id,
        program_level_id = p_program_level_id,
        years_duration = p_years_duration,
        total_units = p_total_units,
        description = NULLIF(p_description, ''),
        is_active = p_is_active
    WHERE id = p_program_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program updated successfully');
END;$$;


--
-- Name: fn_update_program_level(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_program_level(p_program_level_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.program_levels
        WHERE code = p_code
        AND id <> p_program_level_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level code already exists: ' || p_code);
    END IF;

    UPDATE public.program_levels
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_program_level_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Program level not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Program level updated successfully');
END;
$$;


--
-- Name: fn_update_role(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_role(p_role_id uuid, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.roles
    SET
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


--
-- Name: fn_update_role(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_role(p_role_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.roles
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_role_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Role not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Role updated successfully');
END;
$$;


--
-- Name: fn_update_school_year(uuid, text, text, date, date, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_school_year(p_school_year_id uuid, p_code text, p_label text, p_start_date date, p_end_date date, p_is_active boolean DEFAULT false) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.school_years
        WHERE code = p_code
        AND id <> p_school_year_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year code already exists: ' || p_code);
    END IF;

    IF p_is_active THEN
        UPDATE public.school_years
        SET is_active = FALSE
        WHERE is_active = TRUE
        AND id <> p_school_year_id
        AND deleted_at IS NULL;
    END IF;

    UPDATE public.school_years
    SET
        code = p_code,
        label = p_label,
        start_date = p_start_date,
        end_date = p_end_date,
        is_active = p_is_active
    WHERE id = p_school_year_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'School year not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'School year updated successfully');
END;
$$;


--
-- Name: fn_update_section(uuid, uuid, uuid, uuid, text, text, smallint, public.section_status_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_section(p_section_id uuid, p_term_id uuid, p_course_id uuid, p_faculty_id uuid, p_section_code text, p_room text, p_max_slots smallint, p_status public.section_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.sections
        WHERE term_id = p_term_id
        AND section_code = p_section_code
        AND id <> p_section_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'A section with this code already exists for the selected term.');
    END IF;

    UPDATE public.sections
    SET
        term_id      = p_term_id,
        course_id    = p_course_id,
        faculty_id   = p_faculty_id,
        section_code = p_section_code,
        room         = p_room,
        max_slots    = p_max_slots,
        status       = p_status
    WHERE id = p_section_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Section updated successfully.');
END;
$$;


--
-- Name: fn_update_student(uuid, text, uuid, smallint, date, public.student_status_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_student(p_student_id uuid, p_student_number text, p_program_id uuid, p_year_level smallint, p_admitted_at date, p_status public.student_status_type) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = p_student_id AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.students
        WHERE student_number = p_student_number
        AND id <> p_student_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student number already exists.');
    END IF;

    UPDATE public.students
    SET
        student_number = p_student_number,
        program_id     = p_program_id,
        year_level     = p_year_level,
        admitted_at    = p_admitted_at,
        status         = p_status
    WHERE id = p_student_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Student profile updated successfully.');
END;
$$;


--
-- Name: fn_update_system_settings(text, text, text, text, text, text, text, smallint, smallint, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_system_settings(p_institution_name text, p_institution_short_name text, p_institution_address text, p_institution_email text, p_institution_phone text, p_institution_website text, p_institution_logo_url text, p_academic_year_start_month smallint, p_max_units_per_term smallint, p_default_term_type_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF p_academic_year_start_month < 1 OR p_academic_year_start_month > 12 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Academic year start month must be between 1 and 12');
    END IF;

    IF p_max_units_per_term < 1 OR p_max_units_per_term > 60 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Max units per term must be between 1 and 60');
    END IF;

    UPDATE public.system_settings
    SET
        institution_name = p_institution_name,
        institution_short_name = p_institution_short_name,
        institution_address = p_institution_address,
        institution_email = p_institution_email,
        institution_phone = p_institution_phone,
        institution_website = p_institution_website,
        institution_logo_url = p_institution_logo_url,
        academic_year_start_month = p_academic_year_start_month,
        max_units_per_term = p_max_units_per_term,
        default_term_type_id = p_default_term_type_id
    WHERE deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'System settings not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'System settings updated successfully');
END;
$$;


--
-- Name: fn_update_term(uuid, uuid, uuid, date, date, date, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_term(p_term_id uuid, p_school_year_id uuid, p_term_type_id uuid, p_start_date date, p_end_date date, p_enrollment_start_date date DEFAULT NULL::date, p_enrollment_end_date date DEFAULT NULL::date, p_grading_deadline date DEFAULT NULL::date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_current_status TEXT;
BEGIN
    SELECT status INTO v_current_status
    FROM public.terms
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term not found');
    END IF;

    IF v_current_status = 'Closed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closed terms cannot be edited');
    END IF;

    IF p_end_date <= p_start_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'End date must be after start date');
    END IF;

    IF p_enrollment_start_date IS NOT NULL AND p_enrollment_end_date IS NOT NULL THEN
        IF p_enrollment_end_date <= p_enrollment_start_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment end date must be after enrollment start date');
        END IF;
        IF p_enrollment_start_date < p_start_date OR p_enrollment_end_date > p_end_date THEN
            RETURN jsonb_build_object('success', false, 'message', 'Enrollment dates must be within the term date range');
        END IF;
    END IF;

    IF p_grading_deadline IS NOT NULL AND p_grading_deadline <= p_end_date THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading deadline must be after the term end date');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.terms
        WHERE school_year_id = p_school_year_id
        AND term_type_id = p_term_type_id
        AND id <> p_term_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'This term type already exists for the selected school year');
    END IF;

    UPDATE public.terms
    SET
        school_year_id = p_school_year_id,
        term_type_id = p_term_type_id,
        start_date = p_start_date,
        end_date = p_end_date,
        enrollment_start_date = p_enrollment_start_date,
        enrollment_end_date = p_enrollment_end_date,
        grading_deadline = p_grading_deadline
    WHERE id = p_term_id
    AND deleted_at IS NULL;

    RETURN jsonb_build_object('success', true, 'message', 'Term updated successfully');
END;
$$;


--
-- Name: fn_update_term_type(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_term_type(p_term_type_id uuid, p_code text, p_label text, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

    UPDATE public.term_types
    SET
        code = p_code,
        label = p_label,
        description = NULLIF(p_description, '')
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type updated successfully');
END;
$$;


--
-- Name: fn_update_term_type(uuid, text, text, smallint, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_term_type(p_term_type_id uuid, p_code text, p_label text, p_sequence smallint, p_description text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE code = p_code
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type code already exists: ' || p_code);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.term_types
        WHERE sequence = p_sequence
        AND id <> p_term_type_id
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sequence ' || p_sequence || ' is already taken by another term type');
    END IF;

    UPDATE public.term_types
    SET
        code = p_code,
        label = p_label,
        sequence = p_sequence,
        description = NULLIF(p_description, '')
    WHERE id = p_term_type_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Term type not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Term type updated successfully');
END;
$$;


--
-- Name: fn_update_user(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_user(p_user_id uuid, p_first_name text, p_last_name text, p_role_code text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_role_id UUID;
BEGIN
    SELECT id INTO v_role_id
    FROM public.roles
    WHERE code = p_role_code
    AND deleted_at IS NULL;

    IF v_role_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid role code: ' || p_role_code);
    END IF;

    UPDATE public.users
    SET
        first_name = p_first_name,
        last_name = p_last_name
    WHERE id = p_user_id
    AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    UPDATE public.user_roles
    SET deleted_at = now(),
        deleted_by = auth.uid()
    WHERE user_id = p_user_id
    AND deleted_at IS NULL;

    INSERT INTO public.user_roles (user_id, role_id, created_by)
    VALUES (p_user_id, v_role_id, auth.uid());

    RETURN jsonb_build_object('success', true, 'message', 'User updated successfully');
END;
$$;


--
-- Name: fn_upsert_question(uuid, uuid, text, public.question_type, numeric, smallint, text, boolean, text[], integer, smallint, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_upsert_question(p_assessment_id uuid, p_question_id uuid, p_question_text text, p_question_type public.question_type, p_points numeric, p_sequence smallint, p_explanation text, p_is_required boolean, p_allowed_file_types text[], p_max_file_size_mb integer, p_max_file_count smallint, p_choices jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_question_id UUID;
    v_choice JSONB;
    v_sequence SMALLINT := 1;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id
        WHERE ai.id = p_assessment_id
        AND s.faculty_id = auth.uid()
        AND ai.deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Assessment not found or access denied.');
    END IF;

    IF p_question_id IS NOT NULL THEN
        UPDATE public.assessment_questions
        SET
            question_text      = p_question_text,
            question_type      = p_question_type,
            points             = p_points,
            sequence           = p_sequence,
            explanation        = NULLIF(p_explanation, ''),
            is_required        = p_is_required,
            allowed_file_types = p_allowed_file_types,
            max_file_size_mb   = p_max_file_size_mb,
            max_file_count     = p_max_file_count
        WHERE id = p_question_id
        AND assessment_item_id = p_assessment_id
        AND deleted_at IS NULL;

        v_question_id := p_question_id;
    ELSE
        INSERT INTO public.assessment_questions (
            assessment_item_id,
            question_text,
            question_type,
            points,
            sequence,
            explanation,
            is_required,
            allowed_file_types,
            max_file_size_mb,
            max_file_count,
            created_by
        ) VALUES (
            p_assessment_id,
            p_question_text,
            p_question_type,
            p_points,
            p_sequence,
            NULLIF(p_explanation, ''),
            p_is_required,
            p_allowed_file_types,
            p_max_file_size_mb,
            p_max_file_count,
            auth.uid()
        )
        RETURNING id INTO v_question_id;
    END IF;

    IF p_choices IS NOT NULL AND p_question_type IN ('Multiple Choice', 'True or False', 'Matching') THEN
        UPDATE public.assessment_question_choices
        SET deleted_at = now(), deleted_by = auth.uid()
        WHERE question_id = v_question_id AND deleted_at IS NULL;

        FOR v_choice IN SELECT * FROM jsonb_array_elements(p_choices)
        LOOP
            INSERT INTO public.assessment_question_choices (
                question_id,
                choice_text,
                is_correct,
                sequence,
                created_by
            ) VALUES (
                v_question_id,
                trim(v_choice->>'choice_text'),
                COALESCE((v_choice->>'is_correct')::BOOLEAN, false),
                v_sequence,
                auth.uid()
            );
            v_sequence := v_sequence + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Question saved successfully.', 'id', v_question_id);
END;
$$;


--
-- Name: fn_upsert_student_section_color(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_upsert_student_section_color(p_section_id uuid, p_color text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    INSERT INTO public.student_section_colors (
        student_id,
        section_id,
        color,
        created_by
    ) VALUES (
        v_student_id,
        p_section_id,
        p_color,
        auth.uid()
    )
    ON CONFLICT ON CONSTRAINT idx_student_section_colors_unique
    DO UPDATE SET
        color = p_color,
        updated_at = now(),
        updated_by = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Color saved successfully.');
END;
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    target_audience public.announcement_audience_type DEFAULT 'Global'::public.announcement_audience_type NOT NULL,
    section_id uuid,
    is_pinned boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: assessment_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size_bytes bigint,
    mime_type text,
    sequence smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: assessment_item_rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_item_rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    rubric_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: assessment_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    grading_component_id uuid,
    module_id uuid,
    title text NOT NULL,
    description text,
    assessment_type public.assessment_type DEFAULT 'Quiz'::public.assessment_type NOT NULL,
    total_points numeric(8,2) DEFAULT 100 NOT NULL,
    passing_points numeric(8,2),
    time_limit_minutes smallint,
    max_attempts smallint DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    due_at timestamp with time zone,
    closes_at timestamp with time zone,
    show_results_at timestamp with time zone,
    shuffle_questions boolean DEFAULT false NOT NULL,
    shuffle_choices boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    max_file_count_per_question smallint,
    show_all_questions boolean DEFAULT true NOT NULL,
    questions_per_page smallint,
    opens_at timestamp with time zone,
    scheduled_publish_at timestamp with time zone,
    CONSTRAINT assessment_items_max_attempts_check CHECK ((max_attempts > 0)),
    CONSTRAINT assessment_items_max_file_count_per_question_check CHECK ((max_file_count_per_question > 0)),
    CONSTRAINT assessment_items_time_limit_minutes_check CHECK ((time_limit_minutes > 0)),
    CONSTRAINT assessment_items_total_points_check CHECK ((total_points > (0)::numeric)),
    CONSTRAINT chk_assessment_window CHECK (((closes_at IS NULL) OR (due_at IS NULL) OR (closes_at >= due_at)))
);


--
-- Name: assessment_question_choices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_question_choices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    choice_text text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: assessment_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type DEFAULT 'Multiple Choice'::public.question_type NOT NULL,
    points numeric(6,2) DEFAULT 1 NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    explanation text,
    is_required boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    allowed_file_types text[],
    max_file_size_mb integer,
    max_file_count smallint,
    CONSTRAINT assessment_questions_max_file_count_check CHECK ((max_file_count > 0)),
    CONSTRAINT assessment_questions_max_file_size_mb_check CHECK ((max_file_size_mb > 0)),
    CONSTRAINT assessment_questions_points_check CHECK ((points > (0)::numeric))
);


--
-- Name: assessment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_item_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    attempt_number smallint DEFAULT 1 NOT NULL,
    status public.submission_status_type DEFAULT 'Not Started'::public.submission_status_type NOT NULL,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    time_limit_expires_at timestamp with time zone,
    raw_score numeric(8,2),
    final_score numeric(8,2),
    graded_at timestamp with time zone,
    graded_by uuid,
    feedback text,
    is_late boolean DEFAULT false NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT assessment_submissions_attempt_number_check CHECK ((attempt_number > 0)),
    CONSTRAINT chk_submission_attempt_window CHECK (((submitted_at IS NULL) OR (started_at IS NULL) OR (submitted_at >= started_at)))
);


--
-- Name: assessment_timer_heartbeats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_timer_heartbeats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    client_ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: assessment_timer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_timer_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    assessment_item_id uuid NOT NULL,
    status public.submission_timer_status DEFAULT 'Pending'::public.submission_timer_status NOT NULL,
    server_started_at timestamp with time zone,
    server_expires_at timestamp with time zone,
    last_activity_at timestamp with time zone,
    forced_submit_at timestamp with time zone,
    client_ip inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attendance_session_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    status public.attendance_status_type DEFAULT 'Present'::public.attendance_status_type NOT NULL,
    remarks text,
    recorded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    session_date date NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: clearance_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clearance_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    department_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: course_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    material_type public.material_type DEFAULT 'File'::public.material_type NOT NULL,
    file_url text,
    external_url text,
    sequence smallint DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    available_from timestamp with time zone,
    available_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    file_name text,
    mime_type text,
    file_size_bytes integer,
    CONSTRAINT chk_material_availability CHECK (((available_until IS NULL) OR (available_from IS NULL) OR (available_until > available_from))),
    CONSTRAINT course_materials_file_size_bytes_check CHECK ((file_size_bytes > 0))
);


--
-- Name: course_prerequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_prerequisites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    prerequisite_id uuid,
    prerequisite_type public.prerequisite_type DEFAULT 'Required'::public.prerequisite_type NOT NULL,
    minimum_grade numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    prerequisite_kind text DEFAULT 'course'::text NOT NULL,
    year_level_required smallint,
    CONSTRAINT chk_no_self_prerequisite CHECK ((course_id <> prerequisite_id)),
    CONSTRAINT chk_prerequisite_kind CHECK ((prerequisite_kind = ANY (ARRAY['course'::text, 'standing'::text]))),
    CONSTRAINT chk_year_level_required CHECK (((year_level_required >= 1) AND (year_level_required <= 6)))
);


--
-- Name: course_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    code text NOT NULL,
    title text NOT NULL,
    description text,
    lecture_units numeric(4,2) DEFAULT 0 NOT NULL,
    laboratory_units numeric(4,2) DEFAULT 0 NOT NULL,
    total_units numeric(4,2) GENERATED ALWAYS AS ((lecture_units + laboratory_units)) STORED,
    credit_hours numeric(4,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    course_type_id uuid
);


--
-- Name: curriculum_maps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum_maps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    course_id uuid NOT NULL,
    year_level smallint NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    is_elective boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    term_type_id uuid,
    school_year_id uuid,
    CONSTRAINT curriculum_maps_year_level_check CHECK (((year_level >= 1) AND (year_level <= 6)))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    head_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    section_id uuid NOT NULL,
    status public.enrollment_status_type DEFAULT 'Enrolled'::public.enrollment_status_type NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    dropped_at timestamp with time zone,
    drop_reason text,
    final_grade numeric(5,2),
    is_grade_visible boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: evaluation_period_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluation_period_locks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    template_id uuid NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: evaluation_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluation_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type public.evaluation_question_type DEFAULT 'Rating'::public.evaluation_question_type NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    min_rating smallint DEFAULT 1,
    max_rating smallint DEFAULT 5,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: evaluation_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluation_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    rating_value smallint,
    response_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: evaluation_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluation_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: grade_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action public.audit_action_type NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    enrollment_id uuid,
    grading_period_id uuid,
    field_changed text NOT NULL,
    old_value text,
    new_value text,
    change_reason text NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: grade_transmutation_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grade_transmutation_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    label text NOT NULL,
    min_percentage numeric(5,2) NOT NULL,
    max_percentage numeric(5,2) NOT NULL,
    transmuted_grade numeric(5,2) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_transmutation_range CHECK ((max_percentage >= min_percentage)),
    CONSTRAINT grade_transmutation_tables_max_percentage_check CHECK (((max_percentage >= (0)::numeric) AND (max_percentage <= (100)::numeric))),
    CONSTRAINT grade_transmutation_tables_min_percentage_check CHECK (((min_percentage >= (0)::numeric) AND (min_percentage <= (100)::numeric)))
);


--
-- Name: grading_component_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_component_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grading_period_template_id uuid NOT NULL,
    name text NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_component_template_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: grading_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    name text NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT grading_components_weight_check CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: grading_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    passing_grade numeric(5,2) DEFAULT 3.0 NOT NULL,
    max_absence_percentage numeric(5,2) DEFAULT 20.0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_max_absence_percentage CHECK (((max_absence_percentage > (0)::numeric) AND (max_absence_percentage <= (100)::numeric))),
    CONSTRAINT chk_passing_grade CHECK (((passing_grade >= 1.0) AND (passing_grade <= 5.0)))
);


--
-- Name: grading_period_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_period_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sequence smallint NOT NULL,
    weight numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_period_template_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: grading_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grading_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term_id uuid NOT NULL,
    name text NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    weight numeric(5,2) DEFAULT 25 NOT NULL,
    CONSTRAINT chk_grading_period_dates CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date > start_date))),
    CONSTRAINT chk_grading_period_weight CHECK (((weight > (0)::numeric) AND (weight <= (100)::numeric)))
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    sequence smallint DEFAULT 1 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: program_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    total_units numeric(5,2),
    years_duration smallint DEFAULT 4 NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    program_level_id uuid,
    CONSTRAINT programs_years_duration_check CHECK (((years_duration >= 1) AND (years_duration <= 8)))
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: rubric_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubric_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rubric_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    max_points numeric(6,2) NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT rubric_criteria_max_points_check CHECK ((max_points > (0)::numeric))
);


--
-- Name: rubric_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubric_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    criteria_id uuid NOT NULL,
    points_earned numeric(6,2) NOT NULL,
    feedback text,
    evaluated_by uuid NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT rubric_evaluations_points_earned_check CHECK ((points_earned >= (0)::numeric))
);


--
-- Name: rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    total_points numeric(8,2) DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT rubrics_total_points_check CHECK ((total_points > (0)::numeric))
);


--
-- Name: school_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_years (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_school_year_dates CHECK ((end_date > start_date))
);


--
-- Name: section_final_grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_final_grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enrollment_id uuid NOT NULL,
    grading_period_id uuid NOT NULL,
    raw_grade numeric(5,2) NOT NULL,
    final_grade numeric(5,2) NOT NULL,
    transmuted_grade numeric(5,2),
    status public.grade_status_type DEFAULT 'Draft'::public.grade_status_type NOT NULL,
    remarks text,
    approved_by uuid,
    approved_at timestamp with time zone,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    special_grade text,
    CONSTRAINT section_final_grades_final_grade_check CHECK (((final_grade >= (0)::numeric) AND (final_grade <= (100)::numeric))),
    CONSTRAINT section_final_grades_raw_grade_check CHECK (((raw_grade >= (0)::numeric) AND (raw_grade <= (100)::numeric)))
);


--
-- Name: section_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.section_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    day_of_week public.day_of_week_type NOT NULL,
    time_start time without time zone NOT NULL,
    time_end time without time zone NOT NULL,
    room text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_schedule_times CHECK ((time_end > time_start))
);


--
-- Name: sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    term_id uuid NOT NULL,
    course_id uuid NOT NULL,
    faculty_id uuid,
    section_code text NOT NULL,
    room text,
    max_slots smallint DEFAULT 40 NOT NULL,
    status public.section_status_type DEFAULT 'Open'::public.section_status_type NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT sections_max_slots_check CHECK ((max_slots > 0))
);


--
-- Name: special_grade_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.special_grade_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    min_absence_percentage numeric(5,2),
    requires_completion boolean DEFAULT false NOT NULL,
    completion_deadline_days smallint,
    is_passing boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: student_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    question_id uuid NOT NULL,
    choice_id uuid,
    answer_text text,
    points_earned numeric(6,2),
    is_correct boolean,
    grader_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    file_attachments jsonb DEFAULT '[]'::jsonb
);


--
-- Name: student_clearances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_clearances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    term_id uuid NOT NULL,
    status public.clearance_status_type DEFAULT 'Pending'::public.clearance_status_type NOT NULL,
    remarks text,
    cleared_by uuid,
    cleared_at timestamp with time zone,
    flagged_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: student_section_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_section_colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    section_id uuid NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_number text NOT NULL,
    year_level smallint NOT NULL,
    program_id uuid,
    status public.student_status_type DEFAULT 'Active'::public.student_status_type NOT NULL,
    admitted_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT students_year_level_check CHECK (((year_level >= 1) AND (year_level <= 6)))
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    institution_name text DEFAULT ''::text NOT NULL,
    institution_short_name text DEFAULT ''::text NOT NULL,
    institution_address text DEFAULT ''::text NOT NULL,
    institution_email text DEFAULT ''::text NOT NULL,
    institution_phone text DEFAULT ''::text NOT NULL,
    institution_website text DEFAULT ''::text NOT NULL,
    institution_logo_url text DEFAULT ''::text NOT NULL,
    academic_year_start_month smallint DEFAULT 6 NOT NULL,
    max_units_per_term smallint DEFAULT 24 NOT NULL,
    default_term_type_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    CONSTRAINT chk_academic_year_start_month CHECK (((academic_year_start_month >= 1) AND (academic_year_start_month <= 12))),
    CONSTRAINT chk_max_units_per_term CHECK (((max_units_per_term >= 1) AND (max_units_per_term <= 60)))
);


--
-- Name: term_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    sequence smallint DEFAULT 1 NOT NULL
);


--
-- Name: terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_year_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    enrollment_start_date date,
    enrollment_end_date date,
    grading_deadline date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    term_type_id uuid NOT NULL,
    status text DEFAULT 'Upcoming'::text NOT NULL,
    CONSTRAINT chk_term_dates CHECK ((end_date > start_date))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    role_code text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    suffix text,
    preferred_name text,
    email text NOT NULL,
    mobile_number text,
    address_line1 text,
    address_line2 text,
    city text,
    province text,
    postal_code text,
    date_of_birth date,
    gender public.gender_type,
    civil_status public.civil_status_type,
    nationality text DEFAULT 'Filipino'::text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_by uuid,
    deleted_by uuid,
    status text DEFAULT 'Invited'::text NOT NULL
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: assessment_item_rubrics assessment_item_rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_item_rubrics
    ADD CONSTRAINT assessment_item_rubrics_pkey PRIMARY KEY (id);


--
-- Name: assessment_items assessment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_pkey PRIMARY KEY (id);


--
-- Name: assessment_question_choices assessment_question_choices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_question_choices
    ADD CONSTRAINT assessment_question_choices_pkey PRIMARY KEY (id);


--
-- Name: assessment_questions assessment_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_pkey PRIMARY KEY (id);


--
-- Name: assessment_submissions assessment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assessment_timer_heartbeats assessment_timer_heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_timer_heartbeats
    ADD CONSTRAINT assessment_timer_heartbeats_pkey PRIMARY KEY (id);


--
-- Name: assessment_timer_sessions assessment_timer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_timer_sessions
    ADD CONSTRAINT assessment_timer_sessions_pkey PRIMARY KEY (id);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- Name: clearance_requirements clearance_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearance_requirements
    ADD CONSTRAINT clearance_requirements_pkey PRIMARY KEY (id);


--
-- Name: course_materials course_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_materials
    ADD CONSTRAINT course_materials_pkey PRIMARY KEY (id);


--
-- Name: course_prerequisites course_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_pkey PRIMARY KEY (id);


--
-- Name: course_types course_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_types
    ADD CONSTRAINT course_types_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: curriculum_maps curriculum_maps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_maps
    ADD CONSTRAINT curriculum_maps_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: evaluation_period_locks evaluation_period_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_period_locks
    ADD CONSTRAINT evaluation_period_locks_pkey PRIMARY KEY (id);


--
-- Name: evaluation_questions evaluation_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_questions
    ADD CONSTRAINT evaluation_questions_pkey PRIMARY KEY (id);


--
-- Name: evaluation_responses evaluation_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_responses
    ADD CONSTRAINT evaluation_responses_pkey PRIMARY KEY (id);


--
-- Name: evaluation_templates evaluation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_templates
    ADD CONSTRAINT evaluation_templates_pkey PRIMARY KEY (id);


--
-- Name: grade_audit_logs grade_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_audit_logs
    ADD CONSTRAINT grade_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: grade_transmutation_tables grade_transmutation_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_transmutation_tables
    ADD CONSTRAINT grade_transmutation_tables_pkey PRIMARY KEY (id);


--
-- Name: grading_component_templates grading_component_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_component_templates
    ADD CONSTRAINT grading_component_templates_pkey PRIMARY KEY (id);


--
-- Name: grading_components grading_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_components
    ADD CONSTRAINT grading_components_pkey PRIMARY KEY (id);


--
-- Name: grading_config grading_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_config
    ADD CONSTRAINT grading_config_pkey PRIMARY KEY (id);


--
-- Name: grading_period_templates grading_period_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_period_templates
    ADD CONSTRAINT grading_period_templates_pkey PRIMARY KEY (id);


--
-- Name: grading_periods grading_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_periods
    ADD CONSTRAINT grading_periods_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: program_levels program_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_levels
    ADD CONSTRAINT program_levels_pkey PRIMARY KEY (id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: rubric_criteria rubric_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_pkey PRIMARY KEY (id);


--
-- Name: rubric_evaluations rubric_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_pkey PRIMARY KEY (id);


--
-- Name: rubrics rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);


--
-- Name: school_years school_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_years
    ADD CONSTRAINT school_years_pkey PRIMARY KEY (id);


--
-- Name: section_final_grades section_final_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_final_grades
    ADD CONSTRAINT section_final_grades_pkey PRIMARY KEY (id);


--
-- Name: section_schedules section_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_schedules
    ADD CONSTRAINT section_schedules_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: special_grade_configs special_grade_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.special_grade_configs
    ADD CONSTRAINT special_grade_configs_pkey PRIMARY KEY (id);


--
-- Name: student_answers student_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_pkey PRIMARY KEY (id);


--
-- Name: student_clearances student_clearances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_clearances
    ADD CONSTRAINT student_clearances_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: term_types term_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_types
    ADD CONSTRAINT term_types_pkey PRIMARY KEY (id);


--
-- Name: terms terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: idx_announcements_audience; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_audience ON public.announcements USING btree (target_audience) WHERE (deleted_at IS NULL);


--
-- Name: idx_announcements_section; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_section ON public.announcements USING btree (section_id) WHERE ((deleted_at IS NULL) AND (section_id IS NOT NULL));


--
-- Name: idx_assessment_attachments_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_assessment_attachments_unique ON public.assessment_attachments USING btree (assessment_item_id, file_name) WHERE (deleted_at IS NULL);


--
-- Name: idx_attendance_records_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendance_records_enrollment ON public.attendance_records USING btree (enrollment_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_grade_audit_logs_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grade_audit_logs_changed_at ON public.grade_audit_logs USING btree (changed_at DESC);


--
-- Name: idx_grade_audit_logs_enrollment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grade_audit_logs_enrollment_id ON public.grade_audit_logs USING btree (enrollment_id);


--
-- Name: idx_grade_audit_logs_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grade_audit_logs_record_id ON public.grade_audit_logs USING btree (record_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE ((is_read = false) AND (deleted_at IS NULL));


--
-- Name: idx_student_answers_file_attachments; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_answers_file_attachments ON public.student_answers USING gin (file_attachments);


--
-- Name: idx_student_section_colors_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_student_section_colors_unique ON public.student_section_colors USING btree (student_id, section_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_timer_heartbeats_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timer_heartbeats_session ON public.assessment_timer_heartbeats USING btree (session_id, recorded_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_timer_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timer_sessions_expires ON public.assessment_timer_sessions USING btree (server_expires_at) WHERE ((status = 'Active'::public.submission_timer_status) AND (deleted_at IS NULL));


--
-- Name: uidx_assessment_item_rubrics; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_assessment_item_rubrics ON public.assessment_item_rubrics USING btree (assessment_item_id, rubric_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_assessment_questions_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_assessment_questions_sequence ON public.assessment_questions USING btree (assessment_item_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_attendance_records_session_enrollment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_attendance_records_session_enrollment ON public.attendance_records USING btree (attendance_session_id, enrollment_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_attendance_sessions_section_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_attendance_sessions_section_date ON public.attendance_sessions USING btree (section_id, session_date) WHERE (deleted_at IS NULL);


--
-- Name: uidx_clearance_requirements_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_clearance_requirements_code ON public.clearance_requirements USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_course_materials_module_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_course_materials_module_sequence ON public.course_materials USING btree (module_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_course_prerequisites_pair; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_course_prerequisites_pair ON public.course_prerequisites USING btree (course_id, prerequisite_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_course_types_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_course_types_code ON public.course_types USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_courses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_courses_code ON public.courses USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_departments_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_departments_code ON public.departments USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_departments_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_departments_name ON public.departments USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: uidx_enrollments_student_section; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_enrollments_student_section ON public.enrollments USING btree (student_id, section_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_evaluation_period_locks_enrollment_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_evaluation_period_locks_enrollment_period ON public.evaluation_period_locks USING btree (enrollment_id, grading_period_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_evaluation_questions_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_evaluation_questions_sequence ON public.evaluation_questions USING btree (template_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_evaluation_responses_question_enrollment_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_evaluation_responses_question_enrollment_period ON public.evaluation_responses USING btree (question_id, enrollment_id, grading_period_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_evaluation_templates_title; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_evaluation_templates_title ON public.evaluation_templates USING btree (title) WHERE (deleted_at IS NULL);


--
-- Name: uidx_grade_transmutation_program_range; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_grade_transmutation_program_range ON public.grade_transmutation_tables USING btree (program_id, min_percentage, max_percentage) WHERE (deleted_at IS NULL);


--
-- Name: uidx_grading_components_section_period_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_grading_components_section_period_name ON public.grading_components USING btree (section_id, grading_period_id, name) WHERE (deleted_at IS NULL);


--
-- Name: uidx_grading_period_templates_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_grading_period_templates_sequence ON public.grading_period_templates USING btree (sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_grading_periods_term_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_grading_periods_term_name ON public.grading_periods USING btree (term_id, name) WHERE (deleted_at IS NULL);


--
-- Name: uidx_grading_periods_term_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_grading_periods_term_sequence ON public.grading_periods USING btree (term_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_modules_section_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_modules_section_sequence ON public.modules USING btree (section_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_program_levels_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_program_levels_code ON public.program_levels USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_programs_code_dept; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_programs_code_dept ON public.programs USING btree (code, department_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_question_choices_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_question_choices_sequence ON public.assessment_question_choices USING btree (question_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_roles_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_roles_code ON public.roles USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_rubric_criteria_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_rubric_criteria_sequence ON public.rubric_criteria USING btree (rubric_id, sequence) WHERE (deleted_at IS NULL);


--
-- Name: uidx_rubric_evaluations_submission_criteria; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_rubric_evaluations_submission_criteria ON public.rubric_evaluations USING btree (submission_id, criteria_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_rubrics_section_title; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_rubrics_section_title ON public.rubrics USING btree (section_id, title) WHERE (deleted_at IS NULL);


--
-- Name: uidx_school_years_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_school_years_code ON public.school_years USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_section_final_grades_enrollment_period; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_section_final_grades_enrollment_period ON public.section_final_grades USING btree (enrollment_id, grading_period_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_section_schedules_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_section_schedules_slot ON public.section_schedules USING btree (section_id, day_of_week, time_start) WHERE (deleted_at IS NULL);


--
-- Name: uidx_sections_code_term; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_sections_code_term ON public.sections USING btree (section_code, term_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_special_grade_configs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_special_grade_configs_code ON public.special_grade_configs USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_student_answers_submission_question; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_student_answers_submission_question ON public.student_answers USING btree (submission_id, question_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_student_clearances_student_requirement_term; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_student_clearances_student_requirement_term ON public.student_clearances USING btree (student_id, requirement_id, term_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_students_student_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_students_student_number ON public.students USING btree (student_number) WHERE (deleted_at IS NULL);


--
-- Name: uidx_students_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_students_user_id ON public.students USING btree (user_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_submissions_enrollment_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_submissions_enrollment_attempt ON public.assessment_submissions USING btree (assessment_item_id, enrollment_id, attempt_number) WHERE (deleted_at IS NULL);


--
-- Name: uidx_term_types_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_term_types_code ON public.term_types USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: uidx_terms_sy_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_terms_sy_type ON public.terms USING btree (school_year_id, term_type_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_timer_sessions_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_timer_sessions_submission ON public.assessment_timer_sessions USING btree (submission_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_user_roles_user_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_user_roles_user_role ON public.user_roles USING btree (user_id, role_id) WHERE (deleted_at IS NULL);


--
-- Name: uidx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uidx_users_email ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: assessment_attachments set_updated_at_assessment_attachments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_assessment_attachments BEFORE UPDATE ON public.assessment_attachments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at_assessment_attachments();


--
-- Name: student_section_colors set_updated_at_student_section_colors; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_student_section_colors BEFORE UPDATE ON public.student_section_colors FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at_student_section_colors();


--
-- Name: announcements trg_announcements_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_announcements_updated_audit BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_item_rubrics trg_assessment_item_rubrics_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_item_rubrics_updated_audit BEFORE UPDATE ON public.assessment_item_rubrics FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_items trg_assessment_items_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_items_updated_audit BEFORE UPDATE ON public.assessment_items FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_question_choices trg_assessment_question_choices_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_question_choices_updated_audit BEFORE UPDATE ON public.assessment_question_choices FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_questions trg_assessment_questions_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_questions_updated_audit BEFORE UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_submissions trg_assessment_submissions_audit_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_submissions_audit_log AFTER UPDATE ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION public.fn_audit_assessment_submissions_score();


--
-- Name: assessment_submissions trg_assessment_submissions_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_submissions_updated_audit BEFORE UPDATE ON public.assessment_submissions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_timer_heartbeats trg_assessment_timer_heartbeats_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_timer_heartbeats_updated_audit BEFORE UPDATE ON public.assessment_timer_heartbeats FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: assessment_timer_sessions trg_assessment_timer_sessions_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_assessment_timer_sessions_updated_audit BEFORE UPDATE ON public.assessment_timer_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: attendance_records trg_attendance_records_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_attendance_records_updated_audit BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: attendance_sessions trg_attendance_sessions_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_attendance_sessions_updated_audit BEFORE UPDATE ON public.attendance_sessions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: evaluation_responses trg_auto_complete_evaluation_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_complete_evaluation_lock AFTER INSERT OR UPDATE ON public.evaluation_responses FOR EACH ROW EXECUTE FUNCTION public.fn_auto_complete_evaluation_lock();


--
-- Name: clearance_requirements trg_clearance_requirements_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_clearance_requirements_updated_audit BEFORE UPDATE ON public.clearance_requirements FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: course_materials trg_course_materials_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_materials_updated_audit BEFORE UPDATE ON public.course_materials FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: course_prerequisites trg_course_prerequisites_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_prerequisites_updated_audit BEFORE UPDATE ON public.course_prerequisites FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: course_types trg_course_types_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_course_types_updated_audit BEFORE UPDATE ON public.course_types FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: courses trg_courses_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_courses_updated_audit BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: curriculum_maps trg_curriculum_maps_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_curriculum_maps_updated_audit BEFORE UPDATE ON public.curriculum_maps FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: departments trg_departments_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_departments_updated_audit BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: enrollments trg_enrollments_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enrollments_updated_audit BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: evaluation_period_locks trg_evaluation_period_locks_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_evaluation_period_locks_updated_audit BEFORE UPDATE ON public.evaluation_period_locks FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: evaluation_questions trg_evaluation_questions_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_evaluation_questions_updated_audit BEFORE UPDATE ON public.evaluation_questions FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: evaluation_responses trg_evaluation_responses_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_evaluation_responses_updated_audit BEFORE UPDATE ON public.evaluation_responses FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: evaluation_templates trg_evaluation_templates_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_evaluation_templates_updated_audit BEFORE UPDATE ON public.evaluation_templates FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grade_audit_logs trg_grade_audit_logs_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grade_audit_logs_updated_audit BEFORE UPDATE ON public.grade_audit_logs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grade_transmutation_tables trg_grade_transmutation_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grade_transmutation_updated_audit BEFORE UPDATE ON public.grade_transmutation_tables FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grading_component_templates trg_grading_component_templates_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grading_component_templates_updated_audit BEFORE UPDATE ON public.grading_component_templates FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grading_components trg_grading_components_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grading_components_updated_audit BEFORE UPDATE ON public.grading_components FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grading_config trg_grading_config_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grading_config_updated_audit BEFORE UPDATE ON public.grading_config FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grading_period_templates trg_grading_period_templates_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grading_period_templates_updated_audit BEFORE UPDATE ON public.grading_period_templates FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: grading_periods trg_grading_periods_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grading_periods_updated_audit BEFORE UPDATE ON public.grading_periods FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: modules trg_modules_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_modules_updated_audit BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: notifications trg_notifications_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notifications_updated_audit BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: program_levels trg_program_levels_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_program_levels_updated_audit BEFORE UPDATE ON public.program_levels FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: programs trg_programs_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_programs_updated_audit BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: roles trg_roles_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_roles_updated_audit BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: rubric_criteria trg_rubric_criteria_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rubric_criteria_updated_audit BEFORE UPDATE ON public.rubric_criteria FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: rubric_evaluations trg_rubric_evaluations_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rubric_evaluations_updated_audit BEFORE UPDATE ON public.rubric_evaluations FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: rubrics trg_rubrics_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rubrics_updated_audit BEFORE UPDATE ON public.rubrics FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: school_years trg_school_years_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_school_years_updated_audit BEFORE UPDATE ON public.school_years FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: section_final_grades trg_section_final_grades_audit_log; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_section_final_grades_audit_log AFTER UPDATE ON public.section_final_grades FOR EACH ROW EXECUTE FUNCTION public.fn_audit_section_final_grades();


--
-- Name: section_final_grades trg_section_final_grades_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_section_final_grades_updated_audit BEFORE UPDATE ON public.section_final_grades FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: section_schedules trg_section_schedules_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_section_schedules_updated_audit BEFORE UPDATE ON public.section_schedules FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: sections trg_sections_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sections_updated_audit BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: special_grade_configs trg_special_grade_configs_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_special_grade_configs_updated_audit BEFORE UPDATE ON public.special_grade_configs FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: student_answers trg_student_answers_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_answers_updated_audit BEFORE UPDATE ON public.student_answers FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: student_clearances trg_student_clearances_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_student_clearances_updated_audit BEFORE UPDATE ON public.student_clearances FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: students trg_students_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_students_updated_audit BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: system_settings trg_system_settings_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_system_settings_updated_audit BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: term_types trg_term_types_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_term_types_updated_audit BEFORE UPDATE ON public.term_types FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: terms trg_terms_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_terms_updated_audit BEFORE UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: user_roles trg_user_roles_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_roles_updated_audit BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: users trg_users_updated_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_audit BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_audit();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: assessment_item_rubrics assessment_item_rubrics_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_item_rubrics
    ADD CONSTRAINT assessment_item_rubrics_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id) ON DELETE RESTRICT;


--
-- Name: assessment_item_rubrics assessment_item_rubrics_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_item_rubrics
    ADD CONSTRAINT assessment_item_rubrics_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE RESTRICT;


--
-- Name: assessment_items assessment_items_grading_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_grading_component_id_fkey FOREIGN KEY (grading_component_id) REFERENCES public.grading_components(id) ON DELETE RESTRICT;


--
-- Name: assessment_items assessment_items_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;


--
-- Name: assessment_items assessment_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_items
    ADD CONSTRAINT assessment_items_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: assessment_question_choices assessment_question_choices_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_question_choices
    ADD CONSTRAINT assessment_question_choices_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.assessment_questions(id) ON DELETE RESTRICT;


--
-- Name: assessment_questions assessment_questions_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_questions
    ADD CONSTRAINT assessment_questions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id) ON DELETE RESTRICT;


--
-- Name: assessment_submissions assessment_submissions_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id) ON DELETE RESTRICT;


--
-- Name: assessment_submissions assessment_submissions_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: assessment_submissions assessment_submissions_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_submissions
    ADD CONSTRAINT assessment_submissions_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: assessment_timer_heartbeats assessment_timer_heartbeats_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_timer_heartbeats
    ADD CONSTRAINT assessment_timer_heartbeats_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.assessment_timer_sessions(id) ON DELETE RESTRICT;


--
-- Name: assessment_timer_sessions assessment_timer_sessions_assessment_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_timer_sessions
    ADD CONSTRAINT assessment_timer_sessions_assessment_item_id_fkey FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id) ON DELETE RESTRICT;


--
-- Name: assessment_timer_sessions assessment_timer_sessions_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_timer_sessions
    ADD CONSTRAINT assessment_timer_sessions_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: assessment_timer_sessions assessment_timer_sessions_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_timer_sessions
    ADD CONSTRAINT assessment_timer_sessions_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id) ON DELETE RESTRICT;


--
-- Name: attendance_records attendance_records_attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_attendance_session_id_fkey FOREIGN KEY (attendance_session_id) REFERENCES public.attendance_sessions(id) ON DELETE RESTRICT;


--
-- Name: attendance_records attendance_records_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: attendance_records attendance_records_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: attendance_sessions attendance_sessions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: clearance_requirements clearance_requirements_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearance_requirements
    ADD CONSTRAINT clearance_requirements_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- Name: course_materials course_materials_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_materials
    ADD CONSTRAINT course_materials_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE RESTRICT;


--
-- Name: course_prerequisites course_prerequisites_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: course_prerequisites course_prerequisites_prerequisite_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_prerequisite_id_fkey FOREIGN KEY (prerequisite_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: courses courses_course_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_type_id_fkey FOREIGN KEY (course_type_id) REFERENCES public.course_types(id) ON DELETE RESTRICT;


--
-- Name: courses courses_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- Name: curriculum_maps curriculum_maps_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_maps
    ADD CONSTRAINT curriculum_maps_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: curriculum_maps curriculum_maps_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_maps
    ADD CONSTRAINT curriculum_maps_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE RESTRICT;


--
-- Name: curriculum_maps curriculum_maps_school_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_maps
    ADD CONSTRAINT curriculum_maps_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.school_years(id) ON DELETE RESTRICT;


--
-- Name: curriculum_maps curriculum_maps_term_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_maps
    ADD CONSTRAINT curriculum_maps_term_type_id_fkey FOREIGN KEY (term_type_id) REFERENCES public.term_types(id) ON DELETE RESTRICT;


--
-- Name: departments departments_head_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_head_user_id_fkey FOREIGN KEY (head_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: enrollments enrollments_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: evaluation_period_locks evaluation_period_locks_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_period_locks
    ADD CONSTRAINT evaluation_period_locks_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: evaluation_period_locks evaluation_period_locks_grading_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_period_locks
    ADD CONSTRAINT evaluation_period_locks_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES public.grading_periods(id) ON DELETE RESTRICT;


--
-- Name: evaluation_period_locks evaluation_period_locks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_period_locks
    ADD CONSTRAINT evaluation_period_locks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT;


--
-- Name: evaluation_questions evaluation_questions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_questions
    ADD CONSTRAINT evaluation_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT;


--
-- Name: evaluation_responses evaluation_responses_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_responses
    ADD CONSTRAINT evaluation_responses_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: evaluation_responses evaluation_responses_grading_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_responses
    ADD CONSTRAINT evaluation_responses_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES public.grading_periods(id) ON DELETE RESTRICT;


--
-- Name: evaluation_responses evaluation_responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_responses
    ADD CONSTRAINT evaluation_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.evaluation_questions(id) ON DELETE RESTRICT;


--
-- Name: assessment_attachments fk_assessment_attachments_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_attachments
    ADD CONSTRAINT fk_assessment_attachments_item FOREIGN KEY (assessment_item_id) REFERENCES public.assessment_items(id) ON DELETE RESTRICT;


--
-- Name: student_section_colors fk_student_section_colors_section; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_section_colors
    ADD CONSTRAINT fk_student_section_colors_section FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: student_section_colors fk_student_section_colors_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_section_colors
    ADD CONSTRAINT fk_student_section_colors_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: students fk_students_program_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT fk_students_program_id FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE RESTRICT;


--
-- Name: grade_audit_logs grade_audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_audit_logs
    ADD CONSTRAINT grade_audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: grade_audit_logs grade_audit_logs_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_audit_logs
    ADD CONSTRAINT grade_audit_logs_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: grade_audit_logs grade_audit_logs_grading_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_audit_logs
    ADD CONSTRAINT grade_audit_logs_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES public.grading_periods(id) ON DELETE RESTRICT;


--
-- Name: grade_transmutation_tables grade_transmutation_tables_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grade_transmutation_tables
    ADD CONSTRAINT grade_transmutation_tables_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE RESTRICT;


--
-- Name: grading_component_templates grading_component_templates_period_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_component_templates
    ADD CONSTRAINT grading_component_templates_period_fkey FOREIGN KEY (grading_period_template_id) REFERENCES public.grading_period_templates(id) ON DELETE RESTRICT;


--
-- Name: grading_components grading_components_grading_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_components
    ADD CONSTRAINT grading_components_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES public.grading_periods(id) ON DELETE RESTRICT;


--
-- Name: grading_components grading_components_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_components
    ADD CONSTRAINT grading_components_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: grading_periods grading_periods_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grading_periods
    ADD CONSTRAINT grading_periods_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE RESTRICT;


--
-- Name: modules modules_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: programs programs_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE RESTRICT;


--
-- Name: programs programs_program_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_program_level_id_fkey FOREIGN KEY (program_level_id) REFERENCES public.program_levels(id) ON DELETE RESTRICT;


--
-- Name: rubric_criteria rubric_criteria_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE RESTRICT;


--
-- Name: rubric_evaluations rubric_evaluations_criteria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_criteria_id_fkey FOREIGN KEY (criteria_id) REFERENCES public.rubric_criteria(id) ON DELETE RESTRICT;


--
-- Name: rubric_evaluations rubric_evaluations_evaluated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: rubric_evaluations rubric_evaluations_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_evaluations
    ADD CONSTRAINT rubric_evaluations_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id) ON DELETE RESTRICT;


--
-- Name: rubrics rubrics_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: section_final_grades section_final_grades_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_final_grades
    ADD CONSTRAINT section_final_grades_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: section_final_grades section_final_grades_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_final_grades
    ADD CONSTRAINT section_final_grades_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id) ON DELETE RESTRICT;


--
-- Name: section_final_grades section_final_grades_grading_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_final_grades
    ADD CONSTRAINT section_final_grades_grading_period_id_fkey FOREIGN KEY (grading_period_id) REFERENCES public.grading_periods(id) ON DELETE RESTRICT;


--
-- Name: section_schedules section_schedules_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.section_schedules
    ADD CONSTRAINT section_schedules_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;


--
-- Name: sections sections_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE RESTRICT;


--
-- Name: sections sections_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE RESTRICT;


--
-- Name: student_answers student_answers_choice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_choice_id_fkey FOREIGN KEY (choice_id) REFERENCES public.assessment_question_choices(id) ON DELETE RESTRICT;


--
-- Name: student_answers student_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.assessment_questions(id) ON DELETE RESTRICT;


--
-- Name: student_answers student_answers_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_answers
    ADD CONSTRAINT student_answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.assessment_submissions(id) ON DELETE RESTRICT;


--
-- Name: student_clearances student_clearances_cleared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_clearances
    ADD CONSTRAINT student_clearances_cleared_by_fkey FOREIGN KEY (cleared_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: student_clearances student_clearances_requirement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_clearances
    ADD CONSTRAINT student_clearances_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.clearance_requirements(id) ON DELETE RESTRICT;


--
-- Name: student_clearances student_clearances_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_clearances
    ADD CONSTRAINT student_clearances_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;


--
-- Name: student_clearances student_clearances_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_clearances
    ADD CONSTRAINT student_clearances_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id) ON DELETE RESTRICT;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: system_settings system_settings_default_term_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_default_term_type_fkey FOREIGN KEY (default_term_type_id) REFERENCES public.term_types(id) ON DELETE RESTRICT;


--
-- Name: terms terms_school_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.school_years(id) ON DELETE RESTRICT;


--
-- Name: terms terms_term_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_term_type_id_fkey FOREIGN KEY (term_type_id) REFERENCES public.term_types(id) ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_attachments Faculty can manage their assessment attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Faculty can manage their assessment attachments" ON public.assessment_attachments USING (((assessment_item_id IN ( SELECT ai.id
   FROM (public.assessment_items ai
     JOIN public.sections s ON ((s.id = ai.section_id)))
  WHERE ((s.faculty_id = auth.uid()) AND (ai.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: student_section_colors Students can insert their own section colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can insert their own section colors" ON public.student_section_colors FOR INSERT WITH CHECK ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))));


--
-- Name: student_section_colors Students can update their own section colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their own section colors" ON public.student_section_colors FOR UPDATE USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: assessment_attachments Students can view attachments of visible assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view attachments of visible assessments" ON public.assessment_attachments FOR SELECT USING (((deleted_at IS NULL) AND (assessment_item_id IN ( SELECT ai.id
   FROM (((public.assessment_items ai
     JOIN public.sections s ON ((s.id = ai.section_id)))
     JOIN public.enrollments e ON ((e.section_id = s.id)))
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND ((ai.is_published = true) OR ((ai.scheduled_publish_at IS NOT NULL) AND (ai.scheduled_publish_at <= now()))) AND (ai.deleted_at IS NULL) AND (e.deleted_at IS NULL))))));


--
-- Name: student_section_colors Students can view their own section colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own section colors" ON public.student_section_colors FOR SELECT USING (((student_id IN ( SELECT students.id
   FROM public.students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements announcements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_update ON public.announcements FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (created_by = auth.uid())));


--
-- Name: assessment_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_item_rubrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_item_rubrics ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_item_rubrics assessment_item_rubrics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessment_item_rubrics_select ON public.assessment_item_rubrics FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: assessment_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_question_choices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_question_choices ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_question_choices assessment_question_choices_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessment_question_choices_select ON public.assessment_question_choices FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: assessment_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_questions assessment_questions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessment_questions_select ON public.assessment_questions FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (assessment_item_id IN ( SELECT assessment_items.id
   FROM public.assessment_items
  WHERE (assessment_items.deleted_at IS NULL)))));


--
-- Name: assessment_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_submissions assessment_submissions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assessment_submissions_insert ON public.assessment_submissions FOR INSERT TO authenticated WITH CHECK ((enrollment_id IN ( SELECT e.id
   FROM (public.enrollments e
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL)))));


--
-- Name: assessment_timer_heartbeats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_timer_heartbeats ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_timer_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_timer_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: clearance_requirements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clearance_requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: clearance_requirements clearance_requirements_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clearance_requirements_insert ON public.clearance_requirements FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: clearance_requirements clearance_requirements_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clearance_requirements_select ON public.clearance_requirements FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: clearance_requirements clearance_requirements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY clearance_requirements_update ON public.clearance_requirements FOR UPDATE TO authenticated USING (false);


--
-- Name: course_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: course_prerequisites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

--
-- Name: course_prerequisites course_prerequisites_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_prerequisites_insert ON public.course_prerequisites FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: course_prerequisites course_prerequisites_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_prerequisites_select ON public.course_prerequisites FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: course_prerequisites course_prerequisites_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_prerequisites_update ON public.course_prerequisites FOR UPDATE TO authenticated USING (false);


--
-- Name: course_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_types ENABLE ROW LEVEL SECURITY;

--
-- Name: course_types course_types_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_types_insert ON public.course_types FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL)))));


--
-- Name: course_types course_types_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_types_select ON public.course_types FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));


--
-- Name: course_types course_types_soft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_types_soft_delete ON public.course_types FOR UPDATE USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));


--
-- Name: course_types course_types_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY course_types_update ON public.course_types FOR UPDATE USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL))))));


--
-- Name: courses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

--
-- Name: courses courses_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_insert ON public.courses FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: courses courses_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_select ON public.courses FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: courses courses_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY courses_update ON public.courses FOR UPDATE TO authenticated USING (false);


--
-- Name: curriculum_maps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curriculum_maps ENABLE ROW LEVEL SECURITY;

--
-- Name: curriculum_maps curriculum_maps_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY curriculum_maps_insert ON public.curriculum_maps FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: curriculum_maps curriculum_maps_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY curriculum_maps_select ON public.curriculum_maps FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: curriculum_maps curriculum_maps_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY curriculum_maps_update ON public.curriculum_maps FOR UPDATE TO authenticated USING (false);


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: departments departments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_insert ON public.departments FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: departments departments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: departments departments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_update ON public.departments FOR UPDATE TO authenticated USING (false);


--
-- Name: enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: enrollments enrollments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_insert ON public.enrollments FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: enrollments enrollments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY enrollments_update ON public.enrollments FOR UPDATE TO authenticated USING (false);


--
-- Name: evaluation_period_locks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluation_period_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_period_locks evaluation_period_locks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_period_locks_insert ON public.evaluation_period_locks FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: evaluation_period_locks evaluation_period_locks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_period_locks_update ON public.evaluation_period_locks FOR UPDATE TO authenticated USING (false);


--
-- Name: evaluation_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluation_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_questions evaluation_questions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_questions_insert ON public.evaluation_questions FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: evaluation_questions evaluation_questions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_questions_select ON public.evaluation_questions FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: evaluation_questions evaluation_questions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_questions_update ON public.evaluation_questions FOR UPDATE TO authenticated USING (false);


--
-- Name: evaluation_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_responses evaluation_responses_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_responses_insert ON public.evaluation_responses FOR INSERT TO authenticated WITH CHECK (((enrollment_id IN ( SELECT e.id
   FROM (public.enrollments e
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL)))) AND (enrollment_id IN ( SELECT epl.enrollment_id
   FROM public.evaluation_period_locks epl
  WHERE ((epl.grading_period_id = epl.grading_period_id) AND (epl.is_completed = false) AND (epl.deleted_at IS NULL))))));


--
-- Name: evaluation_responses evaluation_responses_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_responses_select ON public.evaluation_responses FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (enrollment_id IN ( SELECT e.id
   FROM (public.enrollments e
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL))))));


--
-- Name: evaluation_responses evaluation_responses_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_responses_update ON public.evaluation_responses FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (enrollment_id IN ( SELECT e.id
   FROM (public.enrollments e
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL))))));


--
-- Name: evaluation_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: evaluation_templates evaluation_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_templates_insert ON public.evaluation_templates FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: evaluation_templates evaluation_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_templates_select ON public.evaluation_templates FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: evaluation_templates evaluation_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY evaluation_templates_update ON public.evaluation_templates FOR UPDATE TO authenticated USING (false);


--
-- Name: grade_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grade_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: grade_audit_logs grade_audit_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_audit_logs_insert ON public.grade_audit_logs FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: grade_audit_logs grade_audit_logs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_audit_logs_update ON public.grade_audit_logs FOR UPDATE TO authenticated USING (false);


--
-- Name: grade_transmutation_tables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grade_transmutation_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: grade_transmutation_tables grade_transmutation_tables_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_transmutation_tables_insert ON public.grade_transmutation_tables FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: grade_transmutation_tables grade_transmutation_tables_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_transmutation_tables_select ON public.grade_transmutation_tables FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: grade_transmutation_tables grade_transmutation_tables_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grade_transmutation_tables_update ON public.grade_transmutation_tables FOR UPDATE TO authenticated USING (false);


--
-- Name: grading_component_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grading_component_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_component_templates grading_component_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_component_templates_insert ON public.grading_component_templates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: grading_component_templates grading_component_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_component_templates_select ON public.grading_component_templates FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));


--
-- Name: grading_component_templates grading_component_templates_soft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_component_templates_soft_delete ON public.grading_component_templates FOR UPDATE USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));


--
-- Name: grading_component_templates grading_component_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_component_templates_update ON public.grading_component_templates FOR UPDATE USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));


--
-- Name: grading_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grading_components ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_components grading_components_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_components_select ON public.grading_components FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: grading_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grading_config ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_config grading_config_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_config_insert ON public.grading_config FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: grading_config grading_config_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_config_select ON public.grading_config FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: grading_config grading_config_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_config_update ON public.grading_config FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: grading_period_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grading_period_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_period_templates grading_period_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_period_templates_insert ON public.grading_period_templates FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: grading_period_templates grading_period_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_period_templates_select ON public.grading_period_templates FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));


--
-- Name: grading_period_templates grading_period_templates_soft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_period_templates_soft_delete ON public.grading_period_templates FOR UPDATE USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));


--
-- Name: grading_period_templates grading_period_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_period_templates_update ON public.grading_period_templates FOR UPDATE USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));


--
-- Name: grading_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grading_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_periods grading_periods_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_periods_insert ON public.grading_periods FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: grading_periods grading_periods_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_periods_select ON public.grading_periods FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: grading_periods grading_periods_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY grading_periods_update ON public.grading_periods FOR UPDATE TO authenticated USING (false);


--
-- Name: modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert ON public.notifications FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: notifications notifications_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));


--
-- Name: notifications notifications_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));


--
-- Name: program_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: program_levels program_levels_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_levels_insert ON public.program_levels FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL)))));


--
-- Name: program_levels program_levels_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_levels_select ON public.program_levels FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));


--
-- Name: program_levels program_levels_soft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_levels_soft_delete ON public.program_levels FOR UPDATE USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));


--
-- Name: program_levels program_levels_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_levels_update ON public.program_levels FOR UPDATE USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['Admin'::text, 'Dean'::text])) AND (ur.deleted_at IS NULL))))));


--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: programs programs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_insert ON public.programs FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: programs programs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_select ON public.programs FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: programs programs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_update ON public.programs FOR UPDATE TO authenticated USING (false);


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_insert ON public.roles FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: roles roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: roles roles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_update ON public.roles FOR UPDATE TO authenticated USING (false);


--
-- Name: rubric_criteria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;

--
-- Name: rubric_criteria rubric_criteria_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rubric_criteria_select ON public.rubric_criteria FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: rubric_evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rubric_evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: rubric_evaluations rubric_evaluations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rubric_evaluations_select ON public.rubric_evaluations FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((evaluated_by = auth.uid()) OR (submission_id IN ( SELECT asub.id
   FROM ((public.assessment_submissions asub
     JOIN public.enrollments e ON ((e.id = asub.enrollment_id)))
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (asub.deleted_at IS NULL) AND (st.deleted_at IS NULL)))))));


--
-- Name: rubric_evaluations rubric_evaluations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rubric_evaluations_update ON public.rubric_evaluations FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (evaluated_by = auth.uid())));


--
-- Name: rubrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

--
-- Name: rubrics rubrics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rubrics_select ON public.rubrics FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: school_years; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

--
-- Name: school_years school_years_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_years_insert ON public.school_years FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: school_years school_years_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_years_select ON public.school_years FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: school_years school_years_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY school_years_update ON public.school_years FOR UPDATE TO authenticated USING (false);


--
-- Name: section_final_grades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_final_grades ENABLE ROW LEVEL SECURITY;

--
-- Name: section_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.section_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: section_schedules section_schedules_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_schedules_insert ON public.section_schedules FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: section_schedules section_schedules_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_schedules_select ON public.section_schedules FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: section_schedules section_schedules_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY section_schedules_update ON public.section_schedules FOR UPDATE TO authenticated USING (false);


--
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- Name: sections sections_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sections_insert ON public.sections FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: sections sections_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sections_select ON public.sections FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: special_grade_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.special_grade_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: special_grade_configs special_grade_configs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY special_grade_configs_insert ON public.special_grade_configs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: special_grade_configs special_grade_configs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY special_grade_configs_select ON public.special_grade_configs FOR SELECT USING (((auth.role() = 'authenticated'::text) AND (deleted_at IS NULL)));


--
-- Name: special_grade_configs special_grade_configs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY special_grade_configs_update ON public.special_grade_configs FOR UPDATE USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));


--
-- Name: student_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: student_answers student_answers_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_insert ON public.student_answers FOR INSERT TO authenticated WITH CHECK ((submission_id IN ( SELECT asub.id
   FROM ((public.assessment_submissions asub
     JOIN public.enrollments e ON ((e.id = asub.enrollment_id)))
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (asub.deleted_at IS NULL) AND (e.deleted_at IS NULL) AND (st.deleted_at IS NULL) AND (asub.status = 'In Progress'::public.submission_status_type) AND ((asub.time_limit_expires_at IS NULL) OR (asub.time_limit_expires_at > now()))))));


--
-- Name: student_answers student_answers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_select ON public.student_answers FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (submission_id IN ( SELECT assessment_submissions.id
   FROM public.assessment_submissions
  WHERE (assessment_submissions.deleted_at IS NULL)))));


--
-- Name: student_answers student_answers_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_answers_update ON public.student_answers FOR UPDATE TO authenticated USING (((deleted_at IS NULL) AND (submission_id IN ( SELECT asub.id
   FROM ((public.assessment_submissions asub
     JOIN public.enrollments e ON ((e.id = asub.enrollment_id)))
     JOIN public.students st ON ((st.id = e.student_id)))
  WHERE ((st.user_id = auth.uid()) AND (asub.deleted_at IS NULL) AND (st.deleted_at IS NULL) AND (asub.status = 'In Progress'::public.submission_status_type) AND ((asub.time_limit_expires_at IS NULL) OR (asub.time_limit_expires_at > now())))))));


--
-- Name: student_clearances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_clearances ENABLE ROW LEVEL SECURITY;

--
-- Name: student_clearances student_clearances_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_clearances_insert ON public.student_clearances FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: student_clearances student_clearances_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_clearances_select ON public.student_clearances FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND ((student_id IN ( SELECT students.id
   FROM public.students
  WHERE ((students.user_id = auth.uid()) AND (students.deleted_at IS NULL)))) OR (cleared_by = auth.uid()))));


--
-- Name: student_clearances student_clearances_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_clearances_update ON public.student_clearances FOR UPDATE TO authenticated USING (false);


--
-- Name: student_section_colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_section_colors ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: students students_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_insert ON public.students FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: students students_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select ON public.students FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));


--
-- Name: students students_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_update ON public.students FOR UPDATE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings system_settings_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_settings_insert ON public.system_settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: system_settings system_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_settings_select ON public.system_settings FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: system_settings system_settings_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_settings_update ON public.system_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL)))));


--
-- Name: term_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.term_types ENABLE ROW LEVEL SECURITY;

--
-- Name: term_types term_types_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY term_types_insert ON public.term_types FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: term_types term_types_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY term_types_select ON public.term_types FOR SELECT USING ((deleted_at IS NULL));


--
-- Name: term_types term_types_soft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY term_types_soft_delete ON public.term_types FOR UPDATE USING ((deleted_at IS NULL)) WITH CHECK ((deleted_at IS NOT NULL));


--
-- Name: term_types term_types_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY term_types_update ON public.term_types FOR UPDATE USING ((deleted_at IS NULL));


--
-- Name: terms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

--
-- Name: terms terms_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY terms_insert ON public.terms FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: terms terms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY terms_select ON public.terms FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: terms terms_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY terms_update ON public.terms FOR UPDATE TO authenticated USING (false);


--
-- Name: assessment_timer_heartbeats timer_heartbeats_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timer_heartbeats_insert ON public.assessment_timer_heartbeats FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: assessment_timer_heartbeats timer_heartbeats_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timer_heartbeats_select ON public.assessment_timer_heartbeats FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (session_id IN ( SELECT assessment_timer_sessions.id
   FROM public.assessment_timer_sessions
  WHERE (assessment_timer_sessions.deleted_at IS NULL)))));


--
-- Name: assessment_timer_heartbeats timer_heartbeats_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timer_heartbeats_update ON public.assessment_timer_heartbeats FOR UPDATE TO authenticated USING (false);


--
-- Name: assessment_timer_sessions timer_sessions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timer_sessions_insert ON public.assessment_timer_sessions FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: assessment_timer_sessions timer_sessions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY timer_sessions_update ON public.assessment_timer_sessions FOR UPDATE TO authenticated USING (false);


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: user_roles user_roles_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (((deleted_at IS NULL) AND (user_id = auth.uid())));


--
-- Name: user_roles user_roles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_update ON public.user_roles FOR UPDATE TO authenticated USING (false);


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert ON public.users FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: users users_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select ON public.users FOR SELECT TO authenticated USING ((deleted_at IS NULL));


--
-- Name: users users_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: objects avatars_authenticated_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_authenticated_read ON storage.objects FOR SELECT USING (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));


--
-- Name: objects avatars_owner_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_owner_delete ON storage.objects FOR DELETE USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


--
-- Name: objects avatars_owner_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_owner_update ON storage.objects FOR UPDATE USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


--
-- Name: objects avatars_owner_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY avatars_owner_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: objects logos_admin_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_admin_delete ON storage.objects FOR DELETE USING (((bucket_id = 'logos'::text) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));


--
-- Name: objects logos_admin_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_admin_update ON storage.objects FOR UPDATE USING (((bucket_id = 'logos'::text) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));


--
-- Name: objects logos_admin_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_admin_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'logos'::text) AND (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Admin'::text) AND (ur.deleted_at IS NULL))))));


--
-- Name: objects logos_public_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY logos_public_read ON storage.objects FOR SELECT USING ((bucket_id = 'logos'::text));


--
-- Name: objects materials_faculty_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY materials_faculty_delete ON storage.objects FOR DELETE USING (((bucket_id = 'materials'::text) AND (EXISTS ( SELECT 1
   FROM public.sections s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.faculty_id = auth.uid()) AND (s.deleted_at IS NULL))))));


--
-- Name: objects materials_faculty_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY materials_faculty_update ON storage.objects FOR UPDATE USING (((bucket_id = 'materials'::text) AND (EXISTS ( SELECT 1
   FROM public.sections s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.faculty_id = auth.uid()) AND (s.deleted_at IS NULL))))));


--
-- Name: objects materials_faculty_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY materials_faculty_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'materials'::text) AND (EXISTS ( SELECT 1
   FROM public.sections s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.faculty_id = auth.uid()) AND (s.deleted_at IS NULL))))));


--
-- Name: objects materials_section_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY materials_section_read ON storage.objects FOR SELECT USING (((bucket_id = 'materials'::text) AND ((EXISTS ( SELECT 1
   FROM public.sections s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.faculty_id = auth.uid()) AND (s.deleted_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.sections s ON ((s.id = e.section_id)))
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (e.student_id = auth.uid()) AND (e.deleted_at IS NULL) AND (s.deleted_at IS NULL)))))));


--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: objects submissions_read; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY submissions_read ON storage.objects FOR SELECT USING (((bucket_id = 'submissions'::text) AND (((auth.uid())::text = (storage.foldername(name))[2]) OR (EXISTS ( SELECT 1
   FROM public.sections s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.faculty_id = auth.uid()) AND (s.deleted_at IS NULL)))) OR (EXISTS ( SELECT 1
   FROM (public.user_roles ur
     JOIN public.roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'Registrar'::text) AND (ur.deleted_at IS NULL)))))));


--
-- Name: objects submissions_student_update; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY submissions_student_update ON storage.objects FOR UPDATE USING (((bucket_id = 'submissions'::text) AND ((auth.uid())::text = (storage.foldername(name))[2]) AND (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.sections s ON ((s.id = e.section_id)))
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (e.student_id = auth.uid()) AND (e.deleted_at IS NULL) AND (s.deleted_at IS NULL))))));


--
-- Name: objects submissions_student_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY submissions_student_upload ON storage.objects FOR INSERT WITH CHECK (((bucket_id = 'submissions'::text) AND ((auth.uid())::text = (storage.foldername(name))[2]) AND (EXISTS ( SELECT 1
   FROM (public.enrollments e
     JOIN public.sections s ON ((s.id = e.section_id)))
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (e.student_id = auth.uid()) AND (e.deleted_at IS NULL) AND (s.deleted_at IS NULL))))));


--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict mEIBpPjaGAVZuabeQJDSf9Ny4Gn4MRG4HaIYmkQFDMPsZ2belvcn4e9ZgwEriJq

