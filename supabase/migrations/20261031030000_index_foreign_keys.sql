-- ====================================================================
-- Migration: 20261031030000_index_foreign_keys.sql
--   * Indexes every foreign-key column on the larger tables that had no index. Lookups such
--     as "the enrollments of a section" or "the sections of a term" read the whole table
--     without them, which made pages slow when several people used the system at once
-- Rollback: supabase/rollback/20261031030000_index_foreign_keys.down.sql
-- ====================================================================

BEGIN;

CREATE INDEX IF NOT EXISTS idx_fk_assessment_items_grading_component_id ON public.assessment_items (grading_component_id);
CREATE INDEX IF NOT EXISTS idx_fk_assessment_items_module_id ON public.assessment_items (module_id);
CREATE INDEX IF NOT EXISTS idx_fk_assessment_items_section_id ON public.assessment_items (section_id);
CREATE INDEX IF NOT EXISTS idx_fk_assessment_submissions_enrollment_id ON public.assessment_submissions (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fk_assessment_timer_sessions_assessment_item_id ON public.assessment_timer_sessions (assessment_item_id);
CREATE INDEX IF NOT EXISTS idx_fk_assessment_timer_sessions_enrollment_id ON public.assessment_timer_sessions (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fk_competency_alignments_parent_competency_id ON public.competency_alignments (parent_competency_id);
CREATE INDEX IF NOT EXISTS idx_fk_curriculum_maps_course_id ON public.curriculum_maps (course_id);
CREATE INDEX IF NOT EXISTS idx_fk_curriculum_maps_program_id ON public.curriculum_maps (program_id);
CREATE INDEX IF NOT EXISTS idx_fk_curriculum_maps_school_year_id ON public.curriculum_maps (school_year_id);
CREATE INDEX IF NOT EXISTS idx_fk_curriculum_maps_term_type_id ON public.curriculum_maps (term_type_id);
CREATE INDEX IF NOT EXISTS idx_fk_enrollments_section_id ON public.enrollments (section_id);
CREATE INDEX IF NOT EXISTS idx_fk_evaluation_period_locks_grading_period_id ON public.evaluation_period_locks (grading_period_id);
CREATE INDEX IF NOT EXISTS idx_fk_evaluation_period_locks_template_id ON public.evaluation_period_locks (template_id);
CREATE INDEX IF NOT EXISTS idx_fk_evaluation_responses_enrollment_id ON public.evaluation_responses (enrollment_id);
CREATE INDEX IF NOT EXISTS idx_fk_evaluation_responses_grading_period_id ON public.evaluation_responses (grading_period_id);
CREATE INDEX IF NOT EXISTS idx_fk_grade_audit_logs_grading_period_id ON public.grade_audit_logs (grading_period_id);
CREATE INDEX IF NOT EXISTS idx_fk_grading_components_grading_period_id ON public.grading_components (grading_period_id);
CREATE INDEX IF NOT EXISTS idx_fk_rubric_evaluations_criteria_id ON public.rubric_evaluations (criteria_id);
CREATE INDEX IF NOT EXISTS idx_fk_section_final_grades_grading_period_id ON public.section_final_grades (grading_period_id);
CREATE INDEX IF NOT EXISTS idx_fk_sections_course_id ON public.sections (course_id);
CREATE INDEX IF NOT EXISTS idx_fk_sections_term_id ON public.sections (term_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_answers_choice_id ON public.student_answers (choice_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_answers_question_id ON public.student_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_clearances_requirement_id ON public.student_clearances (requirement_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_clearances_term_id ON public.student_clearances (term_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_lifecycle_events_from_program_id ON public.student_lifecycle_events (from_program_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_lifecycle_events_term_id ON public.student_lifecycle_events (term_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_lifecycle_events_to_program_id ON public.student_lifecycle_events (to_program_id);
CREATE INDEX IF NOT EXISTS idx_fk_student_section_colors_section_id ON public.student_section_colors (section_id);
CREATE INDEX IF NOT EXISTS idx_fk_user_roles_role_id ON public.user_roles (role_id);
CREATE INDEX IF NOT EXISTS idx_fk_users_department_id ON public.users (department_id);

ANALYZE;

COMMIT;
