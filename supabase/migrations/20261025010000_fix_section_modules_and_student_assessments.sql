-- Migration: 20261025010000_fix_section_modules_and_student_assessments.sql
-- Description: Fix public.section_modules error (use public.modules and public.course_materials) and ensure student subject assessments display reliably.

-- 1. Fix fn_get_section_content
CREATE OR REPLACE FUNCTION public.fn_get_section_content(p_section_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_roles TEXT[] := public.fn_current_user_role_codes();
    v_can_manage BOOLEAN;
    v_enrollment_id UUID;
    v_modules JSONB;
BEGIN
    IF NOT public.fn_can_access_section(p_section_id) THEN
        RAISE EXCEPTION 'Forbidden: you do not have access to this section.'
            USING ERRCODE = '42501';
    END IF;

    IF 'Student' = ANY(v_roles) AND NOT ('Faculty' = ANY(v_roles) OR 'Admin' = ANY(v_roles)) THEN
        v_can_manage := false;
    ELSE
        v_can_manage := public.fn_is_section_faculty(p_section_id);
    END IF;

    IF NOT v_can_manage THEN
        SELECT e.id INTO v_enrollment_id
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = p_section_id
          AND st.user_id = auth.uid()
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
        LIMIT 1;
    END IF;

    SELECT COALESCE(jsonb_agg(mod_row ORDER BY mod_row_sequence, mod_row_created), '[]'::jsonb)
    INTO v_modules
    FROM (
        SELECT
            m.sequence AS mod_row_sequence,
            m.created_at AS mod_row_created,
            jsonb_build_object(
                'id', m.id,
                'title', m.title,
                'description', m.description,
                'sequence', m.sequence,
                'is_published', m.is_published,
                'material_count', (
                    SELECT count(*)
                    FROM public.course_materials cm
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND (v_can_manage OR cm.is_published)
                ),
                'completed_count', (
                    SELECT count(*)
                    FROM public.course_materials cm
                    JOIN public.material_completions mcx
                        ON mcx.material_id = cm.id
                        AND mcx.enrollment_id = v_enrollment_id
                        AND mcx.deleted_at IS NULL
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND cm.is_published
                ),
                'materials', COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'id', cm.id,
                        'title', cm.title,
                        'description', cm.description,
                        'material_type', cm.material_type,
                        'file_url', cm.file_url,
                        'external_url', cm.external_url,
                        'file_name', cm.file_name,
                        'file_size_bytes', cm.file_size_bytes,
                        'mime_type', cm.mime_type,
                        'sequence', cm.sequence,
                        'is_published', cm.is_published,
                        'available_from', cm.available_from,
                        'available_until', cm.available_until,
                        'created_at', cm.created_at,
                        'is_completed', EXISTS (
                            SELECT 1 FROM public.material_completions mc
                            WHERE mc.material_id = cm.id
                              AND mc.enrollment_id = v_enrollment_id
                              AND mc.deleted_at IS NULL
                        )
                    ) ORDER BY cm.sequence ASC, cm.created_at ASC)
                    FROM public.course_materials cm
                    WHERE cm.module_id = m.id
                      AND cm.deleted_at IS NULL
                      AND (v_can_manage OR cm.is_published)
                ), '[]'::jsonb)
            ) AS mod_row
        FROM public.modules m
        WHERE m.section_id = p_section_id
          AND m.deleted_at IS NULL
          AND (v_can_manage OR m.is_published)
    ) sub;

    RETURN jsonb_build_object(
        'section_id', p_section_id,
        'can_manage', v_can_manage,
        'modules', v_modules
    );
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_get_section_content(uuid) TO authenticated;


-- 2. Fix fn_get_subject_assessments
CREATE OR REPLACE FUNCTION public.fn_get_subject_assessments(p_enrollment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_student_id UUID;
    v_section_id UUID;
    v_actual_enrollment_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = auth.uid() AND deleted_at IS NULL
    LIMIT 1;

    -- 1. Try to find enrollment and section by enrollment_id or section_id
    SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
    FROM public.enrollments e
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE (e.id = p_enrollment_id OR e.section_id = p_enrollment_id)
    AND (
        v_student_id IS NULL
        OR e.student_id = v_student_id
        OR EXISTS (
            SELECT 1 FROM public.students st
            WHERE st.id = e.student_id AND st.user_id = auth.uid() AND st.deleted_at IS NULL
        )
    )
    AND e.deleted_at IS NULL
    LIMIT 1;

    -- 2. If not matched to current user enrollment, check if p_enrollment_id is directly a section_id
    IF v_section_id IS NULL THEN
        SELECT s.id INTO v_section_id
        FROM public.sections s
        WHERE s.id = p_enrollment_id AND s.deleted_at IS NULL;

        IF v_section_id IS NOT NULL AND v_student_id IS NOT NULL THEN
            SELECT e.id INTO v_actual_enrollment_id
            FROM public.enrollments e
            WHERE e.section_id = v_section_id
              AND e.student_id = v_student_id
              AND e.deleted_at IS NULL
            LIMIT 1;
        END IF;
    END IF;

    -- 3. If p_enrollment_id was an enrollment_id belonging to any student in that section
    IF v_section_id IS NULL THEN
        SELECT s.id, e.id INTO v_section_id, v_actual_enrollment_id
        FROM public.enrollments e
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        WHERE e.id = p_enrollment_id AND e.deleted_at IS NULL
        LIMIT 1;
    END IF;

    -- If no section can be resolved, return an empty array (safe for UI table)
    IF v_section_id IS NULL THEN
        RETURN '[]'::JSONB;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',                       ai.id,
            'title',                    ai.title,
            'description',              ai.description,
            'assessment_type',          ai.assessment_type,
            'is_published',             ai.is_published,
            'grading_period_id',        gp.id,
            'grading_period_name',      gp.name,
            'grading_period_sequence',  gp.sequence,
            'total_points',             ai.total_points,
            'passing_points',           ai.passing_points,
            'time_limit_minutes',       ai.time_limit_minutes,
            'max_attempts',             ai.max_attempts,
            'question_count', (
                SELECT COUNT(*)
                FROM public.assessment_questions aq
                WHERE aq.assessment_item_id = ai.id
                AND aq.deleted_at IS NULL
            ),
            'show_all_questions',       ai.show_all_questions,
            'questions_per_page',       ai.questions_per_page,
            'opens_at',                 ai.opens_at,
            'due_at',                   ai.due_at,
            'closes_at',                ai.closes_at,
            'scheduled_publish_at',     ai.scheduled_publish_at,
            'submission_status', (
                SELECT asub.status::text
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND (v_actual_enrollment_id IS NOT NULL AND asub.enrollment_id = v_actual_enrollment_id)
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'submission_id', (
                SELECT asub.id
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND (v_actual_enrollment_id IS NOT NULL AND asub.enrollment_id = v_actual_enrollment_id)
                AND asub.deleted_at IS NULL
                ORDER BY asub.attempt_number DESC
                LIMIT 1
            ),
            'attempts_used', (
                SELECT COUNT(*)::int
                FROM public.assessment_submissions asub
                WHERE asub.assessment_item_id = ai.id
                AND (v_actual_enrollment_id IS NOT NULL AND asub.enrollment_id = v_actual_enrollment_id)
                AND asub.status != 'In Progress'
                AND asub.deleted_at IS NULL
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
        ORDER BY ai.created_at ASC
    ), '[]'::JSONB)
    INTO v_result
    FROM public.assessment_items ai
    LEFT JOIN public.grading_components gc ON gc.id = ai.grading_component_id AND gc.deleted_at IS NULL
    LEFT JOIN public.grading_periods gp ON gp.id = gc.grading_period_id AND gp.deleted_at IS NULL
    WHERE ai.section_id = v_section_id
    AND ai.deleted_at IS NULL;

    RETURN v_result;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_get_subject_assessments(uuid) TO authenticated;
