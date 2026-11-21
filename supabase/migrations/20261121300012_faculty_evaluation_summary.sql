-- ====================================================================
-- Migration: 20261121300012_faculty_evaluation_summary.sql
-- Audit 2026-11-21 (Tier 2 evaluation summary):
--   * fn_get_faculty_evaluation_summary averaged raw ratings across questions with different
--     scales (1-5 next to 1-10). Every rating is now put on a 1-5 scale using its question's
--     own min/max before averaging and before the 1-5 distribution is counted.
--   * The evaluation count counted enrollments, so a student's Prelim and Midterm evaluations
--     were one. It now counts one per enrollment and grading period (term-scope evaluations
--     have no period and count once).
--   * Comments were 100 arbitrary rows; they are now the newest 100. Each comment also
--     carries section_id so the page can filter by section id (extra key, nothing removed).
-- Idempotent: CREATE OR REPLACE only. Signature and return shape unchanged (one key added).
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_faculty_evaluation_summary(p_term_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_faculty_id             uuid := auth.uid();
  v_faculty_dept_id        uuid;
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

    v_faculty_dept_id := public.fn_get_scoped_department_id();

    -- Every rating of this faculty's sections, put on a 1-5 scale by its question's own range.
    -- One evaluation = one enrollment in one grading period (no period = term scope, counted once).
    WITH rated AS (
        SELECT
            r.id AS response_id,
            r.question_id,
            s.id AS section_id,
            s.section_code,
            c.code AS course_code,
            c.title AS course_title,
            r.enrollment_id::text || ':' || COALESCE(r.grading_period_id::text, 'term') AS evaluation_key,
            CASE
                WHEN COALESCE(q.max_rating, 5) > COALESCE(q.min_rating, 1)
                THEN 1 + 4 * (LEAST(GREATEST(r.rating_value, COALESCE(q.min_rating, 1)), COALESCE(q.max_rating, 5)) - COALESCE(q.min_rating, 1))::numeric
                         / (COALESCE(q.max_rating, 5) - COALESCE(q.min_rating, 1))
                ELSE LEAST(GREATEST(r.rating_value::numeric, 1), 5)
            END AS rating_5
        FROM public.evaluation_responses r
        INNER JOIN public.evaluation_questions q ON q.id = r.question_id
        INNER JOIN public.enrollments e ON e.id = r.enrollment_id AND e.deleted_at IS NULL
        INNER JOIN public.sections s ON s.id = e.section_id AND s.deleted_at IS NULL
        INNER JOIN public.courses c ON c.id = s.course_id AND c.deleted_at IS NULL
        WHERE s.faculty_id = v_faculty_id
          AND r.rating_value IS NOT NULL
          AND r.deleted_at IS NULL
          AND (p_term_id IS NULL OR s.term_id = p_term_id)
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
    )
    SELECT
        (SELECT ROUND(AVG(t.rating_5), 2) FROM rated t),
        (SELECT COUNT(DISTINCT t.evaluation_key) FROM rated t),
        (SELECT COUNT(*) FROM rated t WHERE ROUND(t.rating_5) = 5),
        (SELECT COUNT(*) FROM rated t WHERE ROUND(t.rating_5) = 4),
        (SELECT COUNT(*) FROM rated t WHERE ROUND(t.rating_5) = 3),
        (SELECT COUNT(*) FROM rated t WHERE ROUND(t.rating_5) = 2),
        (SELECT COUNT(*) FROM rated t WHERE ROUND(t.rating_5) = 1),
        (
            SELECT COALESCE(jsonb_agg(sec_row ORDER BY sec_row->>'course_code' ASC), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'section_id',        t.section_id,
                    'section_code',      t.section_code,
                    'course_code',       t.course_code,
                    'course_title',      t.course_title,
                    'avg_rating',        ROUND(AVG(t.rating_5), 2),
                    'evaluations_count', COUNT(DISTINCT t.evaluation_key)
                ) AS sec_row
                FROM rated t
                GROUP BY t.section_id, t.section_code, t.course_code, t.course_title
            ) sub_sec
        ),
        (
            SELECT COALESCE(jsonb_agg(q_row ORDER BY q_row->>'avg_rating' DESC), '[]'::jsonb)
            FROM (
                SELECT jsonb_build_object(
                    'question_id',     q.id,
                    'question_text',   q.question_text,
                    'question_type',   q.question_type,
                    'avg_rating',      ROUND(AVG(t.rating_5), 2),
                    'responses_count', COUNT(t.response_id)
                ) AS q_row
                FROM rated t
                INNER JOIN public.evaluation_questions q ON q.id = t.question_id AND q.deleted_at IS NULL
                GROUP BY q.id, q.question_text, q.question_type
            ) sub_q
        )
    INTO
        v_overall_avg,
        v_total_evals,
        v_dist_5,
        v_dist_4,
        v_dist_3,
        v_dist_2,
        v_dist_1,
        v_sections,
        v_questions;

    -- The newest 100 comments
    SELECT COALESCE(jsonb_agg(cmt_row ORDER BY cmt_row->>'created_at' DESC), '[]'::jsonb)
    INTO v_comments
    FROM (
        SELECT jsonb_build_object(
            'response_id',   r.id,
            'section_id',    s.id,
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
          AND (v_faculty_dept_id IS NULL OR c.department_id = v_faculty_dept_id)
        ORDER BY r.created_at DESC, r.id
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
$function$;

COMMIT;
