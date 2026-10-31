-- Rollback for 20261031100000_close_open_table_policies.sql: restores the previous open policies

BEGIN;

DROP POLICY IF EXISTS registrar_logs_staff_select ON public.registrar_logs;
DROP POLICY IF EXISTS staff_profile_requests_select ON public.staff_profile_change_requests;
DROP POLICY IF EXISTS student_profile_requests_select ON public.student_profile_change_requests;
DROP POLICY IF EXISTS student_credited_courses_select ON public.student_credited_courses;

CREATE POLICY registrar_logs_all ON public.registrar_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY staff_profile_requests_all ON public.staff_profile_change_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY student_profile_requests_all ON public.student_profile_change_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY student_credited_courses_all ON public.student_credited_courses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY course_course_types_all ON public.course_course_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
