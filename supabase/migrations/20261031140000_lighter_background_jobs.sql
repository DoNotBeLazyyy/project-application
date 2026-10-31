-- ====================================================================
-- Migration: 20261031140000_lighter_background_jobs.sql
--   The scheduled jobs ran often enough to keep the small (Nano) database busy, and under
--   load their runs overlapped (60 s+ each), which took the project offline on 2026-10-31:
--   * assessment-expiry-sweep (every 5 min) scanned every submission to find the few still
--     in progress; a partial index makes that lookup instant
--   * special-grade-flag-sweep re-checked every section every 15 min (about 10 s each run);
--     INC/DRP flags do not need that, so it now runs hourly
-- Rollback: supabase/rollback/20261031140000_lighter_background_jobs.down.sql
-- ====================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_submissions_in_progress_expiry
    ON public.assessment_submissions (time_limit_expires_at)
    WHERE status = 'In Progress' AND deleted_at IS NULL;

SELECT cron.alter_job(job_id := jobid, schedule := '7 * * * *')
FROM cron.job
WHERE jobname = 'special-grade-flag-sweep';

COMMIT;
