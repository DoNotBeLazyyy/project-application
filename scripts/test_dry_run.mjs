import { runQuery } from './query.mjs';

async function testTransaction() {
  const sql = `
    BEGIN;

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

    -- 2. Clear program_id from students for gmail users, and delete non-gmail students
    UPDATE public.students SET program_id = NULL;
    DELETE FROM public.students WHERE user_id NOT IN (
      SELECT id FROM public.users WHERE email ILIKE '%@gmail.com'
    );

    -- 3. Delete non-canonical user_roles and user_roles for non-gmail users
    DELETE FROM public.user_roles WHERE user_id NOT IN (
      SELECT id FROM public.users WHERE email ILIKE '%@gmail.com'
    );

    -- 4. Delete non-gmail users from public.users
    DELETE FROM public.users WHERE email NOT ILIKE '%@gmail.com' OR email IS NULL;

    -- 5. Delete non-gmail users from auth.users
    DELETE FROM auth.users WHERE email NOT ILIKE '%@gmail.com' OR email IS NULL;

    -- 6. Delete test roles from public.roles (keep only Admin, Dean, Faculty, Registrar, Student)
    DELETE FROM public.roles WHERE code NOT IN ('Admin', 'Dean', 'Faculty', 'Registrar', 'Student');

    -- 7. Clean up term_types, course_types, program_levels
    DELETE FROM public.term_types WHERE code NOT IN ('1ST_SEM', '2ND_SEM', 'SUMMER');
    DELETE FROM public.course_types WHERE code NOT IN ('LECTURE', 'LABORATORY', 'LECTURE_LAB', 'THESIS', 'OJT', 'PE', 'NSTP');
    DELETE FROM public.program_levels WHERE code NOT IN ('UNDERGRADUATE', 'GRADUATE', 'DOCTORATE', 'TVET');

    -- Check counts
    SELECT count(*) AS remaining_public_users FROM public.users;
    SELECT count(*) AS remaining_auth_users FROM auth.users;
    SELECT count(*) AS remaining_user_roles FROM public.user_roles;
    SELECT count(*) AS remaining_roles FROM public.roles;

    ROLLBACK;
  `;

  const res = await runQuery(sql);
  console.log('DRY RUN TRANSACTION SUCCESSFUL!');
}

testTransaction().catch(err => {
  console.error('DRY RUN FAILED:', err);
  process.exit(1);
});
