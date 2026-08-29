CREATE INDEX IF NOT EXISTS idx_enrollments_section ON public.enrollments (section_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments (student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_items_section ON public.assessment_items (section_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_items_component ON public.assessment_items (grading_component_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_items_period ON public.assessment_items (grading_period_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_enrollment ON public.assessment_submissions (enrollment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_item_status ON public.assessment_submissions (assessment_item_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_grading_components_section_period ON public.grading_components (section_id, grading_period_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sections_term_faculty ON public.sections (term_id, faculty_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sections_course ON public.sections (course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sections_term ON public.sections (term_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_section ON public.attendance_sessions (section_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records (attendance_session_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_section_final_grades_period ON public.section_final_grades (grading_period_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status_created ON public.users (status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_name_search ON public.users (last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_program ON public.students (program_id) WHERE deleted_at IS NULL;

