-- ============================================================================
-- Migration: 20260107000000_reset_database_for_system_input.sql
-- Description: Reset all operational and academic dummy/seed records so that all
--              data is populated from system input (UI).
--              Preserves registered user accounts with @gmail.com, canonical roles,
--              institutional system settings, default grading config, and baseline thresholds.
-- ============================================================================

DO $$
DECLARE
    c_keep_emails TEXT[] := ARRAY[
        'crowsnight379@gmail.com',
        'dsadsa@gmail.com',
        'erikapaulamendoza2003@gmail.com',
        'hbaki386@gmail.com',
        'julius.iveinc@gmail.com',
        'juliusexample@gmail.com',
        'juliustolentino.diamond@gmail.com',
        'juliustolentino0101@gmail.com',
        'lmstest.mel01@gmail.com',
        'luna.akirapogi@gmail.com',
        'paosiopao16@gmail.com',
        'redep1892@gmail.com'
    ];
    c_keep_roles TEXT[] := ARRAY['Admin', 'Dean', 'Faculty', 'Registrar', 'Student'];
BEGIN
    -- 1. Truncate all operational and academic tables
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
      public.student_section_colors,
      public.terms
    CASCADE;

    -- 2. Clear program_id for student profiles and remove non-gmail students
    UPDATE public.students SET program_id = NULL;
    DELETE FROM public.students 
    WHERE user_id NOT IN (
      SELECT id FROM public.users WHERE lower(email) = ANY(c_keep_emails)
    );

    -- 3. Delete non-gmail user roles and non-canonical roles
    DELETE FROM public.user_roles 
    WHERE user_id NOT IN (
      SELECT id FROM public.users WHERE lower(email) = ANY(c_keep_emails)
    );

    DELETE FROM public.user_roles ur
    USING public.roles r
    WHERE r.id = ur.role_id
      AND r.code NOT IN ('Admin', 'Dean', 'Faculty', 'Registrar', 'Student');

    -- 4. Restore active status and role for all preserved user accounts
    UPDATE public.user_roles
    SET deleted_at = NULL, revoked_at = NULL
    WHERE user_id IN (
      SELECT id FROM public.users WHERE lower(email) = ANY(c_keep_emails)
    );

    INSERT INTO public.user_roles (user_id, role_id, created_by)
    SELECT u.id, r.id, u.id
    FROM public.users u
    CROSS JOIN public.roles r
    WHERE u.email IN ('erikapaulamendoza2003@gmail.com', 'paosiopao16@gmail.com')
      AND r.code = 'Student'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = u.id AND ur.role_id = r.id AND ur.deleted_at IS NULL
      );

    -- 5. Ensure all preserved student accounts have a valid profile row in public.students
    INSERT INTO public.students (user_id, student_number, year_level, status, admitted_at, created_by)
    SELECT u.id, 
           '2026-000' || (ROW_NUMBER() OVER (ORDER BY u.email))::TEXT,
           1,
           'Active'::public.student_status_type,
           CURRENT_DATE,
           u.id
    FROM public.users u
    JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
    JOIN public.roles r ON r.id = ur.role_id AND r.code = 'Student'
    WHERE lower(u.email) = ANY(c_keep_emails)
      AND NOT EXISTS (
        SELECT 1 FROM public.students s WHERE s.user_id = u.id AND s.deleted_at IS NULL
      );

    -- 6. Delete non-gmail users from public.users
    DELETE FROM public.users 
    WHERE NOT (lower(coalesce(email, '')) = ANY(c_keep_emails));

    UPDATE public.users
    SET deleted_at = NULL, status = 'Active'
    WHERE lower(email) = ANY(c_keep_emails);

    -- 7. Delete non-gmail users from auth.users
    DELETE FROM auth.users 
    WHERE NOT (lower(coalesce(email, '')) = ANY(c_keep_emails));

    -- 8. Clean public.roles: keep ONLY canonical roles
    DELETE FROM public.roles 
    WHERE code NOT IN ('Admin', 'Dean', 'Faculty', 'Registrar', 'Student');
    UPDATE public.roles SET deleted_at = NULL;

    -- 9. Clean lookup tables
    DELETE FROM public.term_types WHERE code NOT IN ('1ST_SEM', '2ND_SEM', 'SUMMER');
    UPDATE public.term_types SET deleted_at = NULL;

    DELETE FROM public.course_types WHERE code NOT IN ('LECTURE', 'LABORATORY', 'LECTURE_LAB', 'THESIS', 'OJT', 'PE', 'NSTP');
    UPDATE public.course_types SET deleted_at = NULL;

    DELETE FROM public.program_levels WHERE code NOT IN ('UNDERGRADUATE', 'GRADUATE', 'DOCTORATE', 'TVET');
    UPDATE public.program_levels SET deleted_at = NULL;

    DELETE FROM public.academic_thresholds WHERE school_year_id IS NOT NULL;
    UPDATE public.academic_thresholds SET deleted_at = NULL, is_active = true WHERE school_year_id IS NULL;

    -- 10. Re-seed clean Default grade_transmutation_tables
    INSERT INTO public.grade_transmutation_tables (
        label, min_percentage, max_percentage, transmuted_grade, is_passing, special_code, description
    ) VALUES
        ('Default', 98.00, 100.00, 1.00, true, null, 'Excellent'),
        ('Default', 95.00, 97.99,  1.25, true, null, 'Superior'),
        ('Default', 92.00, 94.99,  1.50, true, null, 'Very Good'),
        ('Default', 89.00, 91.99,  1.75, true, null, 'Good'),
        ('Default', 86.00, 88.99,  2.00, true, null, 'Meritorious'),
        ('Default', 83.00, 85.99,  2.25, true, null, 'Very Satisfactory'),
        ('Default', 80.00, 82.99,  2.50, true, null, 'Satisfactory'),
        ('Default', 77.00, 79.99,  2.75, true, null, 'Fairly Satisfactory'),
        ('Default', 75.00, 76.99,  3.00, true, null, 'Passing'),
        ('Default', 0.00,  74.99,  5.00, false, null, 'Failed');

    -- 11. Ensure institutional system settings is active
    UPDATE public.system_settings 
    SET deleted_at = NULL, default_term_type_id = NULL;

    -- 12. Delete leftover materials, announcements, events files in storage
    BEGIN
        SET LOCAL storage.allow_delete_query = 'true';
        DELETE FROM storage.objects 
        WHERE bucket_id IN ('materials', 'announcements', 'events', 'submissions', 'discussions');
    EXCEPTION WHEN OTHERS THEN
        -- If storage schema triggers differ in other environments, do not abort transaction
        NULL;
    END;
END $$;
