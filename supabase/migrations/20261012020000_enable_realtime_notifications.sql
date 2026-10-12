-- Migration: 20261012020000_enable_realtime_notifications.sql
-- Description: Enable Supabase Realtime publication on public.notifications and student_profile_change_requests

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.student_profile_change_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'student_profile_change_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profile_change_requests;
    END IF;
END $$;
