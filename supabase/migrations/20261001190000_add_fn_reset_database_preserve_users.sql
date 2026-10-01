-- ============================================================================
-- Migration: 20261001190000_add_fn_reset_database_preserve_users.sql
-- Description: Defines public.fn_reset_database_preserve_users() function for
--              Admin UI database resets. Resets operational and academic records
--              while preserving all user accounts, student profiles, and roles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_reset_database_preserve_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- 1. Verify caller has Admin role
    SELECT r.code INTO v_user_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND ur.deleted_at IS NULL
      AND r.code = 'Admin'
    LIMIT 1;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Access denied. Only Admins can execute system database resets.';
    END IF;

    -- 2. Truncate all operational and academic tables
    TRUNCATE TABLE
      public.announcement_attachments,
      public.announcement_sections,
      public.announcements,
      public.assessment_attachments,
      public.assessment_item_rubrics,
      public.assessment_items,
      public.assessment_question_choices,
      public.assessment_question_competencies,
      public.assessment_questions,
      public.assessment_submissions,
      public.assessment_timer_heartbeats,
      public.assessment_timer_sessions,
      public.attendance_records,
      public.attendance_sessions,
      public.clearance_requirements,
      public.competencies,
      public.competency_alignments,
      public.course_materials,
      public.course_prerequisites,
      public.courses,
      public.curriculum_maps,
      public.departments,
      public.discussion_attachments,
      public.discussion_posts,
      public.discussion_threads,
      public.enrollments,
      public.evaluation_period_locks,
      public.evaluation_questions,
      public.evaluation_responses,
      public.evaluation_template_programs,
      public.evaluation_templates,
      public.event_attachments,
      public.event_sections,
      public.events,
      public.grade_audit_logs,
      public.grade_transmutation_tables,
      public.grading_component_templates,
      public.grading_components,
      public.grading_period_templates,
      public.grading_periods,
      public.grading_period_components,
      public.material_completions,
      public.modules,
      public.notifications,
      public.programs,
      public.rubric_criteria,
      public.rubric_evaluations,
      public.rubrics,
      public.school_year_histories,
      public.school_years,
      public.section_final_grades,
      public.section_schedules,
      public.sections,
      public.special_grade_configs,
      public.special_grade_flags,
      public.special_grade_section_overrides,
      public.student_answers,
      public.student_clearances,
      public.student_lifecycle_events,
      public.student_profile_requests,
      public.registrar_logs,
      public.student_section_colors,
      public.terms
    CASCADE;

    -- 3. Reset student program assignments without deleting student profile records
    UPDATE public.students SET program_id = NULL;

    -- 4. Re-establish lookup tables back to canonical baseline
    DELETE FROM public.term_types WHERE code NOT IN ('1ST_SEM', '2ND_SEM', 'SUMMER');
    UPDATE public.term_types SET deleted_at = NULL;

    DELETE FROM public.course_types WHERE code NOT IN ('LECTURE', 'LABORATORY', 'LECTURE_LAB', 'THESIS', 'OJT', 'PE', 'NSTP');
    UPDATE public.course_types SET deleted_at = NULL;

    DELETE FROM public.program_levels WHERE code NOT IN ('UNDERGRADUATE', 'GRADUATE', 'DOCTORATE', 'TVET');
    UPDATE public.program_levels SET deleted_at = NULL;

    DELETE FROM public.academic_thresholds WHERE school_year_id IS NOT NULL;
    UPDATE public.academic_thresholds SET deleted_at = NULL, is_active = true WHERE school_year_id IS NULL;

    -- 5. Clean storage objects if storage bucket deletion is allowed
    BEGIN
        SET LOCAL storage.allow_delete_query = 'true';
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('materials', 'announcements', 'events', 'submissions', 'discussions');
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Database operational and academic data successfully reset. Registered user accounts and roles were preserved.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_reset_database_preserve_users() TO authenticated;
