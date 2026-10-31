-- Rollback for 20261031080000_internal_grade_release.sql

BEGIN;

GRANT EXECUTE ON FUNCTION public.fn_release_grading_period_grades(uuid) TO authenticated;

COMMIT;
