-- Rollback of 20261031190000_student_dashboard_current_grades: exact live definitions captured before apply
BEGIN;

-- fn_get_student_dashboard
CREATE OR REPLACE FUNCTION public.fn_get_student_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS E'\r
DECLARE\r
    v_student_id UUID;\r
    v_upcoming_count INTEGER;\r
    v_upcoming JSONB;\r
    v_released_grades_count INTEGER;\r
BEGIN\r
    SELECT id INTO v_student_id\r
    FROM public.students\r
    WHERE user_id = auth.uid() AND deleted_at IS NULL\r
    LIMIT 1;\r
\r
    IF v_student_id IS NULL THEN\r
        RETURN jsonb_build_object(''success'', false, ''message'', ''Student profile not found.'');\r
    END IF;\r
\r
    SELECT COUNT(*)\r
    INTO v_upcoming_count\r
    FROM public.enrollments e\r
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL\r
    INNER JOIN public.assessment_items ai ON ai.section_id = s.id\r
        AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))\r
        AND ai.deleted_at IS NULL\r
        AND (ai.closes_at IS NULL OR ai.closes_at > now())\r
    WHERE e.student_id = v_student_id\r
      AND e.status::TEXT = ''Enrolled''\r
      AND e.deleted_at IS NULL\r
      AND NOT EXISTS (\r
          SELECT 1\r
          FROM public.assessment_submissions asub\r
          WHERE asub.assessment_item_id = ai.id\r
            AND asub.enrollment_id = e.id\r
            AND asub.status IN (''Submitted'', ''Late'', ''Graded'')\r
            AND asub.deleted_at IS NULL\r
      );\r
\r
    SELECT COALESCE(jsonb_agg(x ORDER BY (x->>''due_at'') IS NULL, x->>''due_at''), ''[]''::JSONB)\r
    INTO v_upcoming\r
    FROM (\r
        SELECT jsonb_build_object(\r
            ''id'',              ai.id,\r
            ''title'',           ai.title,\r
            ''assessment_type'', ai.assessment_type,\r
            ''opens_at'',        ai.opens_at,\r
            ''due_at'',          ai.due_at,\r
            ''section_code'',    s.section_code,\r
            ''course_code'',     c.code,\r
            ''enrollment_id'',   e.id\r
        ) AS x\r
        FROM public.enrollments e\r
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL\r
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL\r
        INNER JOIN public.assessment_items ai ON ai.section_id = s.id\r
            AND (ai.is_published = true OR (ai.scheduled_publish_at IS NOT NULL AND ai.scheduled_publish_at <= now()))\r
            AND ai.deleted_at IS NULL\r
            AND (ai.closes_at IS NULL OR ai.closes_at > now())\r
        WHERE e.student_id = v_student_id\r
          AND e.status::TEXT = ''Enrolled''\r
          AND e.deleted_at IS NULL\r
          AND NOT EXISTS (\r
              SELECT 1\r
              FROM public.assessment_submissions asub\r
              WHERE asub.assessment_item_id = ai.id\r
                AND asub.enrollment_id = e.id\r
                AND asub.status IN (''Submitted'', ''Late'', ''Graded'')\r
                AND asub.deleted_at IS NULL\r
          )\r
        ORDER BY ai.due_at ASC NULLS LAST\r
        LIMIT 5\r
    ) upcoming;\r
\r
    SELECT COUNT(*)\r
    INTO v_released_grades_count\r
    FROM public.enrollments e\r
    INNER JOIN public.section_final_grades sfg ON sfg.enrollment_id = e.id\r
        AND sfg.status = ''Released''\r
        AND sfg.deleted_at IS NULL\r
    INNER JOIN public.grading_periods gp ON gp.id = sfg.grading_period_id AND gp.deleted_at IS NULL\r
    WHERE e.student_id = v_student_id\r
      AND e.deleted_at IS NULL;\r
\r
    RETURN jsonb_build_object(\r
        ''success'', true,\r
        ''enrolled_count'', (\r
            SELECT COUNT(*)\r
            FROM public.enrollments e\r
            WHERE e.student_id = v_student_id\r
              AND e.status::TEXT = ''Enrolled''\r
              AND e.deleted_at IS NULL\r
        ),\r
        ''upcoming_count'', COALESCE(v_upcoming_count, 0),\r
        ''upcoming_assessments'', v_upcoming,\r
        ''released_grades_count'', COALESCE(v_released_grades_count, 0)\r
    );\r
END;\r
';

COMMIT;
