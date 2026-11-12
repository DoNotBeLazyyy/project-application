-- ====================================================================
-- Migration: 20261104012000_history_holidays_per_version.sql
--   * fn_get_academic_year_history: a version saved before holidays were part of the
--     snapshot used to show today's holidays, so v1 could list a holiday that was only
--     added in v2. Now each version shows only the holidays it recorded; an older
--     version with no holiday list shows none. The active version still falls back to
--     the current holidays. Every other part of the function is unchanged.
-- Signature and grants are unchanged.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_get_academic_year_history(p_school_year_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_histories jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', h.id,
            'school_year_id', h.school_year_id,
            'action', h.action,
            'changed_at', h.changed_at,
            'change_summary', h.change_summary,
            'is_active_version', COALESCE(h.is_active_version, (h.changes->>'is_active_version')::boolean, false),
            'snapshot', jsonb_build_object(
                'id', COALESCE(h.snapshot->>'id', h.school_year_id::text),
                'code', COALESCE(h.snapshot->>'code', sy.code),
                'label', COALESCE(h.snapshot->>'label', sy.label),
                'start_date', COALESCE(h.snapshot->>'start_date', sy.start_date::text),
                'end_date', COALESCE(h.snapshot->>'end_date', sy.end_date::text),
                'is_active', COALESCE((h.snapshot->>'is_active')::boolean, sy.is_active),
                'max_units_per_term', COALESCE((h.snapshot->>'max_units_per_term')::numeric, sy.max_units_per_term, 24),
                'evaluation_scope', COALESCE(h.snapshot->>'evaluation_scope', sy.evaluation_scope::text, 'Period'),
                'terms_count', COALESCE(
                    (h.snapshot->>'terms_count')::int,
                    CASE WHEN h.snapshot ? 'terms' THEN jsonb_array_length(h.snapshot->'terms') ELSE NULL END,
                    (SELECT count(*)::int FROM public.terms WHERE school_year_id = h.school_year_id AND deleted_at IS NULL)
                ),
                'transmutation_rows_count', COALESCE(
                    (h.snapshot->>'transmutation_rows_count')::int,
                    CASE WHEN h.snapshot ? 'transmutation_rows' THEN jsonb_array_length(h.snapshot->'transmutation_rows') ELSE NULL END,
                    (SELECT count(*)::int FROM public.grade_transmutation_tables WHERE school_year_id = h.school_year_id)
                ),
                'thresholds_count', COALESCE(
                    (h.snapshot->>'thresholds_count')::int,
                    CASE WHEN h.snapshot ? 'thresholds' THEN jsonb_array_length(h.snapshot->'thresholds') ELSE NULL END,
                    (SELECT count(*)::int FROM public.academic_thresholds WHERE school_year_id = h.school_year_id)
                ),
                'holidays_count', COALESCE(
                    (h.snapshot->>'holidays_count')::int,
                    CASE WHEN h.snapshot ? 'holidays' THEN jsonb_array_length(h.snapshot->'holidays') ELSE NULL END,
                    -- Only the active version may borrow today's holidays; older versions did not record any
                    CASE WHEN COALESCE(h.is_active_version, (h.changes->>'is_active_version')::boolean, false)
                        THEN (SELECT count(*)::int FROM public.school_year_calendar_exceptions WHERE school_year_id = h.school_year_id)
                        ELSE 0
                    END
                ),
                'terms', CASE
                    WHEN h.snapshot ? 'terms' AND jsonb_typeof(h.snapshot->'terms') = 'array'
                    THEN h.snapshot->'terms'
                    ELSE (
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
                        FROM public.terms t
                        LEFT JOIN public.term_types tt ON tt.id = t.term_type_id
                        WHERE t.school_year_id = h.school_year_id AND t.deleted_at IS NULL
                    )
                END,
                'transmutation_rows', CASE
                    WHEN h.snapshot ? 'transmutation_rows' AND jsonb_typeof(h.snapshot->'transmutation_rows') = 'array'
                    THEN h.snapshot->'transmutation_rows'
                    ELSE (
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
                        FROM public.grade_transmutation_tables g
                        WHERE g.school_year_id = h.school_year_id
                    )
                END,
                'thresholds', CASE
                    WHEN h.snapshot ? 'thresholds' AND jsonb_typeof(h.snapshot->'thresholds') = 'array'
                    THEN h.snapshot->'thresholds'
                    ELSE (
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
                        FROM public.academic_thresholds a
                        WHERE a.school_year_id = h.school_year_id
                    )
                END,
                'holidays', CASE
                    WHEN h.snapshot ? 'holidays' AND jsonb_typeof(h.snapshot->'holidays') = 'array'
                    THEN h.snapshot->'holidays'
                    -- An older version without its own holiday list must not show holidays added later
                    WHEN NOT COALESCE(h.is_active_version, (h.changes->>'is_active_version')::boolean, false)
                    THEN '[]'::jsonb
                    ELSE (
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
                        FROM public.school_year_calendar_exceptions e
                        WHERE e.school_year_id = h.school_year_id
                    )
                END
            ),
            'changes', h.changes,
            'changed_by', h.changed_by,
            'changed_by_name', NULLIF(btrim(concat_ws(' ', u.first_name, u.last_name)), ''),
            'changed_by_email', u.email,
            'changed_by_role', COALESCE(ur.role_code, 'Admin')
        ) ORDER BY h.changed_at DESC
    ), '[]'::jsonb)
    INTO v_histories
    FROM public.school_year_histories h
    LEFT JOIN public.school_years sy ON sy.id = h.school_year_id
    LEFT JOIN public.users u ON u.id = h.changed_by
    LEFT JOIN LATERAL (
        SELECT r.code AS role_code
        FROM public.user_roles usr
        JOIN public.roles r ON r.id = usr.role_id
        WHERE usr.user_id = u.id AND usr.deleted_at IS NULL AND usr.revoked_at IS NULL
        ORDER BY usr.granted_at ASC NULLS LAST
        LIMIT 1
    ) ur ON TRUE
    WHERE h.school_year_id = p_school_year_id AND h.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'data', v_histories
    );
END;
$function$;

COMMIT;