-- ====================================================================
-- Migration: 20261031080000_internal_grade_release.sql
--   * fn_release_grading_period_grades is only called by fn_release_grading_period_now
--     (Registrar) and the scheduled release sweep, yet any signed-in user could run it
--     directly. No longer executable by signed-in users
-- Rollback: supabase/rollback/20261031080000_internal_grade_release.down.sql
-- ====================================================================

BEGIN;

REVOKE EXECUTE ON FUNCTION public.fn_release_grading_period_grades(uuid) FROM authenticated;

COMMIT;
