-- Rollback for 20261031030000_index_foreign_keys.sql: drops the added indexes

BEGIN;

DROP INDEX IF EXISTS public.idx_fk_assessment_items_grading_component_id;
DROP INDEX IF EXISTS public.idx_fk_assessment_items_module_id;
DROP INDEX IF EXISTS public.idx_fk_assessment_items_section_id;
DROP INDEX IF EXISTS public.idx_fk_assessment_submissions_enrollment_id;
DROP INDEX IF EXISTS public.idx_fk_assessment_timer_sessions_assessment_item_id;
DROP INDEX IF EXISTS public.idx_fk_assessment_timer_sessions_enrollment_id;
DROP INDEX IF EXISTS public.idx_fk_competency_alignments_parent_competency_id;
DROP INDEX IF EXISTS public.idx_fk_curriculum_maps_course_id;
DROP INDEX IF EXISTS public.idx_fk_curriculum_maps_program_id;
DROP INDEX IF EXISTS public.idx_fk_curriculum_maps_school_year_id;
DROP INDEX IF EXISTS public.idx_fk_curriculum_maps_term_type_id;
DROP INDEX IF EXISTS public.idx_fk_enrollments_section_id;
DROP INDEX IF EXISTS public.idx_fk_evaluation_period_locks_grading_period_id;
DROP INDEX IF EXISTS public.idx_fk_evaluation_period_locks_template_id;
DROP INDEX IF EXISTS public.idx_fk_evaluation_responses_enrollment_id;
DROP INDEX IF EXISTS public.idx_fk_evaluation_responses_grading_period_id;
DROP INDEX IF EXISTS public.idx_fk_grade_audit_logs_grading_period_id;
DROP INDEX IF EXISTS public.idx_fk_grading_components_grading_period_id;
DROP INDEX IF EXISTS public.idx_fk_rubric_evaluations_criteria_id;
DROP INDEX IF EXISTS public.idx_fk_section_final_grades_grading_period_id;
DROP INDEX IF EXISTS public.idx_fk_sections_course_id;
DROP INDEX IF EXISTS public.idx_fk_sections_term_id;
DROP INDEX IF EXISTS public.idx_fk_student_answers_choice_id;
DROP INDEX IF EXISTS public.idx_fk_student_answers_question_id;
DROP INDEX IF EXISTS public.idx_fk_student_clearances_requirement_id;
DROP INDEX IF EXISTS public.idx_fk_student_clearances_term_id;
DROP INDEX IF EXISTS public.idx_fk_student_lifecycle_events_from_program_id;
DROP INDEX IF EXISTS public.idx_fk_student_lifecycle_events_term_id;
DROP INDEX IF EXISTS public.idx_fk_student_lifecycle_events_to_program_id;
DROP INDEX IF EXISTS public.idx_fk_student_section_colors_section_id;
DROP INDEX IF EXISTS public.idx_fk_user_roles_role_id;
DROP INDEX IF EXISTS public.idx_fk_users_department_id;

COMMIT;
