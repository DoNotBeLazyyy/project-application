-- Migration: 20261002060000_publish_faculty_assessments_and_content.sql
-- Description: Ensure assessments, lectures, syllabus, and course materials created by faculty are published by default and visible on student dashboard and subject pages.

-- 1. Update fn_create_assessment to publish created assessments by default unless scheduled in the future
CREATE OR REPLACE FUNCTION public.fn_create_assessment(
    p_section_id uuid,
    p_title text,
    p_description text,
    p_assessment_type assessment_type,
    p_grading_component_id uuid,
    p_total_points numeric,
    p_passing_points numeric,
    p_time_limit_minutes smallint,
    p_max_attempts smallint,
    p_opens_at timestamp with time zone,
    p_due_at timestamp with time zone,
    p_closes_at timestamp with time zone,
    p_show_results_at timestamp with time zone,
    p_scheduled_publish_at timestamp with time zone,
    p_shuffle_questions boolean,
    p_shuffle_choices boolean,
    p_show_all_questions boolean DEFAULT true,
    p_questions_per_page smallint DEFAULT NULL::smallint,
    p_allow_student_review boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_is_published BOOLEAN;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.sections
        WHERE id = p_section_id
        AND faculty_id = auth.uid()
        AND deleted_at IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Section not found or access denied.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_due_at IS NOT NULL AND p_opens_at >= p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before due date.');
    END IF;

    IF p_opens_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_opens_at >= p_closes_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opens date must be before closing date.');
    END IF;

    IF p_due_at IS NOT NULL AND p_closes_at IS NOT NULL AND p_closes_at < p_due_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Closing date must be on or after due date.');
    END IF;

    IF p_scheduled_publish_at IS NOT NULL AND p_opens_at IS NOT NULL AND p_scheduled_publish_at > p_opens_at THEN
        RETURN jsonb_build_object('success', false, 'message', 'Scheduled publish date must be on or before the opens date.');
    END IF;

    IF NOT COALESCE(p_show_all_questions, true) AND (p_questions_per_page IS NULL OR p_questions_per_page < 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Questions per page must be at least 1 when not showing all questions.');
    END IF;

    v_is_published := CASE
        WHEN p_scheduled_publish_at IS NOT NULL AND p_scheduled_publish_at > now() THEN false
        ELSE true
    END;

    INSERT INTO public.assessment_items (
        section_id, grading_component_id, title, description, assessment_type,
        total_points, passing_points, time_limit_minutes, max_attempts,
        opens_at, due_at, closes_at, show_results_at, scheduled_publish_at,
        shuffle_questions, shuffle_choices, show_all_questions, questions_per_page,
        allow_student_review, is_published, created_by
    ) VALUES (
        p_section_id, p_grading_component_id, p_title, NULLIF(p_description, ''), p_assessment_type,
        p_total_points, p_passing_points, p_time_limit_minutes, COALESCE(p_max_attempts, 1),
        p_opens_at, p_due_at, p_closes_at, p_show_results_at, p_scheduled_publish_at,
        COALESCE(p_shuffle_questions, false), COALESCE(p_shuffle_choices, false),
        COALESCE(p_show_all_questions, true),
        CASE WHEN COALESCE(p_show_all_questions, true) THEN NULL ELSE p_questions_per_page END,
        COALESCE(p_allow_student_review, true),
        v_is_published, auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Assessment created successfully.', 'id', v_id);
END;
$function$;

-- 2. Update fn_create_module to publish created modules by default
CREATE OR REPLACE FUNCTION public.fn_create_module(
    p_section_id uuid,
    p_title text,
    p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_id UUID;
    v_sequence SMALLINT;
BEGIN
    IF NOT public.fn_is_section_faculty(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add content.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A module title is required.');
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.modules
    WHERE section_id = p_section_id AND deleted_at IS NULL;

    INSERT INTO public.modules (section_id, title, description, sequence, is_published, published_at)
    VALUES (p_section_id, btrim(p_title), NULLIF(btrim(p_description), ''), v_sequence, true, now())
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Module created successfully.', 'id', v_id);
END;
$function$;

-- 3. Update fn_create_material to publish created materials by default
CREATE OR REPLACE FUNCTION public.fn_create_material(
    p_module_id uuid,
    p_title text,
    p_material_type material_type,
    p_description text DEFAULT NULL::text,
    p_file_url text DEFAULT NULL::text,
    p_external_url text DEFAULT NULL::text,
    p_file_name text DEFAULT NULL::text,
    p_mime_type text DEFAULT NULL::text,
    p_file_size_bytes integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_section_id UUID;
    v_id UUID;
    v_sequence SMALLINT;
BEGIN
    SELECT section_id INTO v_section_id
    FROM public.modules
    WHERE id = p_module_id AND deleted_at IS NULL;

    IF v_section_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Module not found.');
    END IF;

    IF NOT public.fn_is_section_faculty(v_section_id) THEN
        RAISE EXCEPTION 'Forbidden: only the section faculty can add materials.'
            USING ERRCODE = '42501';
    END IF;

    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'A material title is required.');
    END IF;

    IF p_material_type = 'Link' THEN
        IF p_external_url IS NULL OR btrim(p_external_url) = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'A link URL is required.');
        END IF;
    ELSE
        IF p_file_url IS NULL OR btrim(p_file_url) = '' THEN
            RETURN jsonb_build_object('success', false, 'message', 'A file is required.');
        END IF;
    END IF;

    SELECT COALESCE(max(sequence), 0) + 1 INTO v_sequence
    FROM public.course_materials
    WHERE module_id = p_module_id AND deleted_at IS NULL;

    INSERT INTO public.course_materials (
        module_id, title, description, material_type,
        file_url, external_url, file_name, mime_type, file_size_bytes, sequence, is_published
    )
    VALUES (
        p_module_id, btrim(p_title), NULLIF(btrim(p_description), ''), p_material_type,
        NULLIF(btrim(p_file_url), ''), NULLIF(btrim(p_external_url), ''),
        NULLIF(btrim(p_file_name), ''), NULLIF(btrim(p_mime_type), ''), p_file_size_bytes, v_sequence, true
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'message', 'Material added.', 'id', v_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- 4. Enhance fn_get_student_dashboard to recognize scheduled or published assessments
CREATE OR REPLACE FUNCTION public.fn_get_student_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_upcoming_count INTEGER;
    v_upcoming JSONB;
    v_released_grades_count INTEGER;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student profile not found.');
    END IF;

    SELECT COUNT(*)
    INTO v_upcoming_count
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    INNER JOIN public.assessment_items ai ON ai.section_id = s.id
        AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
        AND ai.deleted_at IS NULL
        AND (ai.closes_at IS NULL OR ai.closes_at > now())
    WHERE e.student_id = v_student_id
      AND e.status::TEXT = 'Enrolled'
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.assessment_submissions asub
          WHERE asub.assessment_item_id = ai.id
            AND asub.enrollment_id = e.id
            AND asub.status IN ('Submitted', 'Late', 'Graded')
            AND asub.deleted_at IS NULL
      );

    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'due_at') IS NULL, x->>'due_at'), '[]'::JSONB)
    INTO v_upcoming
    FROM (
        SELECT jsonb_build_object(
            'id',              ai.id,
            'title',           ai.title,
            'assessment_type', ai.assessment_type,
            'opens_at',        ai.opens_at,
            'due_at',          ai.due_at,
            'section_code',    s.section_code,
            'course_code',     c.code,
            'enrollment_id',   e.id
        ) AS x
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.assessment_items ai ON ai.section_id = s.id
            AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))
            AND ai.deleted_at IS NULL
            AND (ai.closes_at IS NULL OR ai.closes_at > now())
        WHERE e.student_id = v_student_id
          AND e.status::TEXT = 'Enrolled'
          AND e.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM public.assessment_submissions asub
              WHERE asub.assessment_item_id = ai.id
                AND asub.enrollment_id = e.id
                AND asub.status IN ('Submitted', 'Late', 'Graded')
                AND asub.deleted_at IS NULL
          )
        ORDER BY ai.due_at ASC NULLS LAST
        LIMIT 5
    ) upcoming;

    SELECT COUNT(*)
    INTO v_released_grades_count
    FROM public.enrollments e
    INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id
        AND sfg.status = 'Released'
        AND sfg.deleted_at IS NULL
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL
    WHERE e.student_id = v_student_id
      AND e.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'enrolled_count', (
            SELECT COUNT(*)
            FROM public.enrollments e
            WHERE e.student_id = v_student_id
              AND e.status::TEXT = 'Enrolled'
              AND e.deleted_at IS NULL
        ),
        'upcoming_count', COALESCE(v_upcoming_count, 0),
        'upcoming_assessments', v_upcoming,
        'released_grades_count', COALESCE(v_released_grades_count, 0)
    );
END;
$function$;

-- 5. Backfill existing unpublished modules, materials, and assessments to published status
UPDATE public.modules
SET is_published = true, published_at = COALESCE(published_at, now())
WHERE deleted_at IS NULL AND is_published = false;

UPDATE public.course_materials
SET is_published = true
WHERE deleted_at IS NULL AND is_published = false;

UPDATE public.assessment_items
SET is_published = true
WHERE deleted_at IS NULL AND is_published = false;
