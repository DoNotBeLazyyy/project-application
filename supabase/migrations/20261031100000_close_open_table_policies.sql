-- ====================================================================
-- Migration: 20261031100000_close_open_table_policies.sql
--   Five tables had a policy letting any signed-in user read, change and delete every row
--   through the API (a student could read everyone's profile change requests, approve their
--   own, or add credited courses with grades to their record). All writes already go through
--   database functions that run as the table owner, so the open policies are replaced with
--   read-only policies for the owner of the row and the staff who handle it:
--   * registrar_logs: Registrar, Admin
--   * staff_profile_change_requests: the requester, Admin
--   * student_profile_change_requests: the requesting student, Registrar, Admin
--   * student_credited_courses: the student, Registrar, Admin, Dean, Faculty
--   * course_course_types: the existing read policy stays; the open write policy is removed
-- Rollback: supabase/rollback/20261031100000_close_open_table_policies.down.sql
-- ====================================================================

BEGIN;

DROP POLICY registrar_logs_all ON public.registrar_logs;
DROP POLICY staff_profile_requests_all ON public.staff_profile_change_requests;
DROP POLICY student_profile_requests_all ON public.student_profile_change_requests;
DROP POLICY student_credited_courses_all ON public.student_credited_courses;
DROP POLICY course_course_types_all ON public.course_course_types;

CREATE POLICY registrar_logs_staff_select ON public.registrar_logs
    FOR SELECT TO authenticated
    USING (public.fn_current_user_role_codes() && ARRAY['Registrar', 'Admin']);

CREATE POLICY staff_profile_requests_select ON public.staff_profile_change_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.fn_current_user_role_codes() && ARRAY['Admin']);

CREATE POLICY student_profile_requests_select ON public.student_profile_change_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.fn_current_user_role_codes() && ARRAY['Registrar', 'Admin']);

CREATE POLICY student_credited_courses_select ON public.student_credited_courses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = student_credited_courses.student_id
              AND s.user_id = auth.uid()
        )
        OR public.fn_current_user_role_codes() && ARRAY['Registrar', 'Admin', 'Dean', 'Faculty']
    );

COMMIT;
