-- ====================================================================
-- Migration: 20261124000000_service_role_table_grants.sql
-- Fix 2026-11-24: Resend Invite did not send a new invitation.
--   * service_role had no table grants on 71 of the 77 public tables, so the
--     admin-user-provision edge function got "permission denied for table users".
--     It could not see that a user was still Invited, so Resend Invite skipped the
--     re-invite and sent a password-reset email. The same error broke the role
--     check in single and bulk invites and the status update after an email change.
--     This restores the standard Supabase grants for service_role, which runs only
--     on the server.
--   * A user marked Active who never signed in and never set a password goes back
--     to Invited, so Resend Invite is shown for them again.
-- Idempotent: GRANT and a guarded UPDATE only.
-- ====================================================================
BEGIN;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- New tables created by later migrations get the same grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

UPDATE public.users u
SET status = 'Invited',
    updated_at = NOW()
FROM auth.users au
WHERE au.id = u.id
  AND u.status = 'Active'
  AND u.deleted_at IS NULL
  AND au.last_sign_in_at IS NULL
  AND COALESCE(au.encrypted_password, '') = '';

COMMIT;
