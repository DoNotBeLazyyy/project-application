-- Rollback for 20261031140000_lighter_background_jobs.sql

BEGIN;

DROP INDEX IF EXISTS public.idx_submissions_in_progress_expiry;

SELECT cron.alter_job(job_id := jobid, schedule := '*/15 * * * *')
FROM cron.job
WHERE jobname = 'special-grade-flag-sweep';

COMMIT;
