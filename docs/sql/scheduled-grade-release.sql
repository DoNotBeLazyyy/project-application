ALTER TABLE public.grading_periods
    ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_grading_periods_release_at
    ON public.grading_periods (release_at)
    WHERE deleted_at IS NULL AND release_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_release_grading_period_grades(p_grading_period_id UUID) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $fn$
DECLARE
    v_grade    RECORD;
    v_approved INTEGER := 0;
    v_released INTEGER := 0;
    v_blocked  INTEGER := 0;
BEGIN
    FOR v_grade IN
        SELECT sfg.id, sfg.enrollment_id, sfg.status
        FROM public.section_final_grades sfg
        WHERE sfg.grading_period_id = p_grading_period_id
          AND sfg.deleted_at        IS NULL
          AND sfg.status            IN ('Draft', 'Approved')
    LOOP
        IF v_grade.status = 'Draft' THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Approved',
                approved_by = auth.uid(),
                approved_at = now()
            WHERE id = v_grade.id;

            v_approved := v_approved + 1;
        END IF;

        IF public.fn_check_evaluation_completion(v_grade.enrollment_id, p_grading_period_id) THEN
            UPDATE public.section_final_grades
            SET
                status      = 'Released',
                released_at = now()
            WHERE id = v_grade.id;

            UPDATE public.enrollments
            SET is_grade_visible = true
            WHERE id = v_grade.enrollment_id AND deleted_at IS NULL;

            v_released := v_released + 1;
        ELSE
            v_blocked := v_blocked + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'approved',              v_approved,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked
    );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_sweep_scheduled_grade_releases() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $fn$
DECLARE
    v_period   RECORD;
    v_outcome  jsonb;
    v_periods  INTEGER := 0;
    v_released INTEGER := 0;
    v_blocked  INTEGER := 0;
BEGIN
    FOR v_period IN
        SELECT gp.id
        FROM public.grading_periods gp
        WHERE gp.deleted_at IS NULL
          AND gp.release_at IS NOT NULL
          AND gp.release_at <= now()
        ORDER BY gp.release_at ASC
    LOOP
        v_outcome  := public.fn_release_grading_period_grades(v_period.id);
        v_periods  := v_periods + 1;
        v_released := v_released + (v_outcome ->> 'released')::INTEGER;
        v_blocked  := v_blocked + (v_outcome ->> 'blocked_by_evaluation')::INTEGER;
    END LOOP;

    RETURN jsonb_build_object(
        'success',               true,
        'periods_processed',     v_periods,
        'released',              v_released,
        'blocked_by_evaluation', v_blocked
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_set_grading_period_release_at(
    p_grading_period_id UUID,
    p_release_at TIMESTAMPTZ
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $fn$
DECLARE
    v_is_registrar BOOLEAN;
    v_exists       BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id    = auth.uid()
          AND r.code        = 'Registrar'
          AND ur.deleted_at IS NULL
    ) INTO v_is_registrar;

    IF NOT v_is_registrar THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Registrar can configure grade release schedules.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.grading_periods
        WHERE id = p_grading_period_id AND deleted_at IS NULL
    ) INTO v_exists;

    IF NOT v_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'Grading period not found.');
    END IF;

    UPDATE public.grading_periods
    SET release_at = p_release_at
    WHERE id = p_grading_period_id AND deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN p_release_at IS NULL
                THEN 'Automatic release cancelled.'
            ELSE 'Grade release scheduled.'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_release_grading_period_now(p_grading_period_id UUID) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $fn$
DECLARE
    v_is_registrar BOOLEAN;
    v_outcome      jsonb;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id    = auth.uid()
          AND r.code        = 'Registrar'
          AND ur.deleted_at IS NULL
    ) INTO v_is_registrar;

    IF NOT v_is_registrar THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only the Registrar can release grades.');
    END IF;

    v_outcome := public.fn_release_grading_period_grades(p_grading_period_id);

    RETURN jsonb_build_object(
        'success',               true,
        'released',              v_outcome ->> 'released',
        'blocked_by_evaluation', v_outcome ->> 'blocked_by_evaluation',
        'message',               format(
            '%s grade(s) released. %s still blocked by pending evaluations.',
            v_outcome ->> 'released',
            v_outcome ->> 'blocked_by_evaluation'
        )
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.fn_list_grade_release_schedule(p_term_id UUID) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $fn$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'grading_period_id',   gp.id,
                'grading_period_name', gp.name,
                'sequence',            gp.sequence,
                'start_date',          gp.start_date,
                'end_date',            gp.end_date,
                'release_at',          gp.release_at,
                'total_grades',        stats.total_grades,
                'released_count',      stats.released_count,
                'approved_count',      stats.approved_count,
                'draft_count',         stats.draft_count,
                'blocked_count',       stats.blocked_count
            ) ORDER BY gp.sequence ASC
        )
        FROM public.grading_periods gp
        LEFT JOIN LATERAL (
            SELECT
                COUNT(sfg.id)                                                    AS total_grades,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Released')             AS released_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Approved')             AS approved_count,
                COUNT(sfg.id) FILTER (WHERE sfg.status = 'Draft')                AS draft_count,
                COUNT(sfg.id) FILTER (
                    WHERE sfg.status <> 'Released'
                      AND NOT public.fn_check_evaluation_completion(sfg.enrollment_id, gp.id)
                )                                                                AS blocked_count
            FROM public.section_final_grades sfg
            WHERE sfg.grading_period_id = gp.id
              AND sfg.deleted_at        IS NULL
        ) stats ON true
        WHERE gp.term_id    = p_term_id
          AND gp.deleted_at IS NULL
    ), '[]'::jsonb);
END;
$fn$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
    PERFORM cron.unschedule('grade-release-sweep');
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$cron$;

SELECT cron.schedule(
    'grade-release-sweep',
    '*/15 * * * *',
    $job$SELECT public.fn_sweep_scheduled_grade_releases();$job$
);