-- Rollback for 20261031050000_check_section_schedule_conflicts.sql: removes the new function

BEGIN;

DROP FUNCTION IF EXISTS public.fn_check_section_schedule_conflicts(uuid, uuid, text, jsonb, uuid);

COMMIT;
