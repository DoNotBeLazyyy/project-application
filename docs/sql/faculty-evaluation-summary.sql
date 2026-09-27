CREATE OR REPLACE FUNCTION public.fn_get_faculty_evaluation_summary(
    p_term_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_faculty_id             uuid := auth.uid();
  v_overall_avg            numeric(3,2);
  v_total_evals            integer := 0;
  v_dist_5                 integer := 0;
  v_dist_4                 integer := 0;
  v_dist_3                 integer := 0;
  v_dist_2                 integer := 0;
  v_dist_1                 integer := 0;
  v_sections               jsonb   := '[]'::jsonb;
  v_questions              jsonb   := '[]'::jsonb;
  v_comments               jsonb   := '[]'::jsonb;
BEGIN
    IF NOT (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            INNER JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = v_faculty_id
              AND r.code IN ('Faculty', 'Dean', 'Admin')
              AND ur.deleted_at IS NULL
        )
    ) THEN
        RAISE EXCEPTION 'Forbidden: Only faculty members or administrators can view evaluation summaries.'
            USING ERRCODE = '42501';
    END IF;

    SELECT
        ROUND(AVG(r.rating_value), 2),
        COUNT(DISTINCT r.enrollment_id),
        COUNT(*) FILTER (WHERE r.rating_value = 5),
        COUNT(*) FILTER (WHERE r.rating_value = 4),
        COUNT(*) FILTER (WHERE r.rating_value = 3),
        COUNT(*) FILTER (WHERE r.rating_value = 2),
        COUNT(*) FILTER (WHERE r.rating_value = 1)
    INTO
        v_overall_avg,
        v_total_evals,
        v_dist_5,
        v_dist_4,
        v_dist_3,
        v_dist_2,
        v_dist_1
    FROM public.evaluation_responses r
    INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
    INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
    WHERE s.faculty_id = v_faculty_id
      AND r.rating_value IS NOT NULL
      AND r.deleted_at IS NULL
      AND (p_term_id IS NULL OR s.term_id = p_term_id);

    SELECT COALESCE(jsonb_agg(sec_row ORDER BY sec_row->>'course_code' ASC), '[]'::jsonb)
    INTO v_sections
    FROM (
        SELECT jsonb_build_object(
            'section_id',        s.id,
            'section_code',      s.section_code,
            'course_code',       c.code,
            'course_title',      c.title,
            'avg_rating',        ROUND(AVG(r.rating_value), 2),
            'evaluations_count', COUNT(DISTINCT r.enrollment_id)
        ) AS sec_row
        FROM public.sections s
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.section_id = s.id AND e.deleted_at IS NULL
        INNER JOIN public.evaluation_responses r ON r.enrollment_id = e.id AND r.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.rating_value IS NOT NULL
          AND s.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
        GROUP BY s.id, s.section_code, c.code, c.title
    ) sub_sec;

    SELECT COALESCE(jsonb_agg(q_row ORDER BY q_row->>'avg_rating' DESC), '[]'::jsonb)
    INTO v_questions
    FROM (
        SELECT jsonb_build_object(
            'question_id',     q.id,
            'question_text',   q.question_text,
            'question_type',   q.question_type,
            'avg_rating',      ROUND(AVG(r.rating_value), 2),
            'responses_count', COUNT(r.id)
        ) AS q_row
        FROM public.evaluation_responses r
        INNER JOIN public.evaluation_questions q ON q.id = r.question_id AND q.deleted_at IS NULL
        INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.rating_value IS NOT NULL
          AND r.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
        GROUP BY q.id, q.question_text, q.question_type
    ) sub_q;

    SELECT COALESCE(jsonb_agg(cmt_row ORDER BY cmt_row->>'created_at' DESC), '[]'::jsonb)
    INTO v_comments
    FROM (
        SELECT jsonb_build_object(
            'response_id',   r.id,
            'section_code',  s.section_code,
            'course_code',   c.code,
            'response_text', r.response_text,
            'created_at',    r.created_at
        ) AS cmt_row
        FROM public.evaluation_responses r
        INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.response_text IS NOT NULL
          AND BTRIM(r.response_text) <> ''
          AND r.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
        LIMIT 100
    ) sub_cmt;

    RETURN jsonb_build_object(
        'success',                  true,
        'overall_avg_rating',       v_overall_avg,
        'total_evaluations_count',  v_total_evals,
        'rating_distribution',      jsonb_build_object(
            '5', v_dist_5,
            '4', v_dist_4,
            '3', v_dist_3,
            '2', v_dist_2,
            '1', v_dist_1
        ),
        'sections',                 v_sections,
        'questions',                v_questions,
        'comments',                 v_comments
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.fn_get_faculty_evaluation_summary(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_faculty_evaluation_summary(uuid) TO authenticated;
