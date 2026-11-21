-- ====================================================================
-- Migration: 20261121800000_scheduled_publish_sweep.sql
-- QA 2026-11-21: a quiz published by "Scheduled Publish" became visible to students at its
-- scheduled time, but nothing ever marked it published or sent the "Assessment Published"
-- notice: only the Publish button (fn_publish_assessment) does that, and no job runs at
-- the scheduled time.
--   * fn_sweep_scheduled_assessment_publishes (new, internal): marks every due scheduled
--     assessment published and notifies its enrolled students once, with the same notice
--     the Publish button sends. Assessments whose questions don't add up to Total Points
--     are skipped, like the Publish button refuses them.
--   * Assessments already past their scheduled time before this migration are marked
--     published without a late notice (students already see them, some already took them).
--   * Cron job "assessment-publish-sweep" runs the sweep every 5 minutes.
-- ====================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_sweep_scheduled_assessment_publishes()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_item        RECORD;
    v_published   INTEGER := 0;
    v_skipped     INTEGER := 0;
    v_notified    INTEGER := 0;
    v_rows        INTEGER;
BEGIN
    FOR v_item IN
        SELECT ai.id, ai.section_id, ai.title, ai.scheduled_publish_at, c.code AS course_code
        FROM public.assessment_items ai
        INNER JOIN public.sections s ON s.id = ai.section_id AND s.deleted_at IS NULL
        LEFT JOIN public.courses c ON c.id = s.course_id
        WHERE ai.deleted_at IS NULL
          AND NOT COALESCE(ai.is_published, false)
          AND ai.scheduled_publish_at IS NOT NULL
          AND ai.scheduled_publish_at <= now()
        ORDER BY ai.scheduled_publish_at
        FOR UPDATE OF ai SKIP LOCKED
    LOOP
        -- Same readiness rule as the Publish button: questions exist and add up to Total Points
        IF public.fn_assessment_publish_problem(v_item.id) IS NOT NULL THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        UPDATE public.assessment_items
        SET is_published = true,
            published_at = v_item.scheduled_publish_at
        WHERE id = v_item.id
          AND NOT COALESCE(is_published, false);

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            CONTINUE;
        END IF;

        v_published := v_published + 1;

        INSERT INTO public.notifications (user_id, title, message, action_url, notification_type)
        SELECT
            st.user_id,
            'Assessment Published',
            format('%s: %s is now available to take.', COALESCE(v_item.course_code, 'Assessment'), v_item.title),
            format('/student/subjects/%s?tab=assessments', e.id::text),
            'Assessment'::public.notification_category_type
        FROM public.enrollments e
        JOIN public.students st ON st.id = e.student_id AND st.deleted_at IS NULL
        WHERE e.section_id = v_item.section_id
          AND e.status = 'Enrolled'
          AND e.deleted_at IS NULL
          AND st.user_id IS NOT NULL;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        v_notified := v_notified + v_rows;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'published', v_published,
        'skipped_not_ready', v_skipped,
        'notified', v_notified
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_sweep_scheduled_assessment_publishes() FROM PUBLIC, anon, authenticated;

-- Already past their scheduled time: mark published, no late notice
UPDATE public.assessment_items ai
SET is_published = true,
    published_at = ai.scheduled_publish_at
WHERE ai.deleted_at IS NULL
  AND NOT COALESCE(ai.is_published, false)
  AND ai.scheduled_publish_at IS NOT NULL
  AND ai.scheduled_publish_at <= now()
  AND public.fn_assessment_publish_problem(ai.id) IS NULL;

-- Every 5 minutes (only where pg_cron is installed, i.e. the hosted project)
DO $cron$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'assessment-publish-sweep') THEN
            PERFORM cron.unschedule('assessment-publish-sweep');
        END IF;
        PERFORM cron.schedule(
            'assessment-publish-sweep',
            '*/5 * * * *',
            'SELECT public.fn_sweep_scheduled_assessment_publishes();'
        );
    END IF;
END;
$cron$;

COMMIT;
