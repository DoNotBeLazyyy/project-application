import { runQuery } from './query.mjs';

const PRESERVED_EMAILS = [
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

const CANONICAL_ROLES = ['Admin', 'Dean', 'Faculty', 'Registrar', 'Student'];

async function executeFullReset(apply = false) {
  console.log(`=== EXECUTING DATABASE RESET (APPLY: ${apply}) ===\n`);

  const sql = `
    ${apply ? 'BEGIN;' : 'BEGIN; -- DRY RUN'}

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
      public.course_types,
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
      public.grading_config,
      public.grading_period_templates,
      public.grading_periods,
      public.material_completions,
      public.modules,
      public.notifications,
      public.program_levels,
      public.programs,
      public.registrar_logs,
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
      public.student_profile_change_requests,
      public.student_section_colors,
      public.terms
    CASCADE;

    -- 2. Clear program_id for existing student profiles and delete non-preserved students
    UPDATE public.students SET program_id = NULL;
    DELETE FROM public.students 
    WHERE user_id NOT IN (
      SELECT id FROM public.users WHERE lower(email) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}])
    );

    -- 3. Delete non-preserved user roles
    DELETE FROM public.user_roles 
    WHERE user_id NOT IN (
      SELECT id FROM public.users WHERE lower(email) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}])
    );

    -- 4. Delete non-canonical role assignments for preserved users
    DELETE FROM public.user_roles ur
    USING public.roles r
    WHERE r.id = ur.role_id
      AND r.code NOT IN (${CANONICAL_ROLES.map(r => `'${r}'`).join(',')});

    -- 5. Restore active status and role for all preserved user accounts
    UPDATE public.user_roles
    SET deleted_at = NULL, revoked_at = NULL
    WHERE user_id IN (
      SELECT id FROM public.users WHERE lower(email) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}])
    );

    -- Ensure erikapaulamendoza2003 and paosiopao16 have active Student role if missing
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

    -- Ensure all preserved student accounts have a valid profile row in public.students
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
    WHERE lower(u.email) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}])
      AND NOT EXISTS (
        SELECT 1 FROM public.students s WHERE s.user_id = u.id AND s.deleted_at IS NULL
      );

    -- 6. Delete non-preserved users from public.users
    DELETE FROM public.users 
    WHERE NOT (lower(coalesce(email, '')) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}]));

    -- Un-delete preserved users
    UPDATE public.users
    SET deleted_at = NULL, status = 'Active'
    WHERE lower(email) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}]);

    -- 7. Delete non-preserved users from auth.users
    DELETE FROM auth.users 
    WHERE NOT (lower(coalesce(email, '')) = ANY(ARRAY[${PRESERVED_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',')}]));

    -- 8. Clean public.roles: keep ONLY canonical roles
    DELETE FROM public.roles 
    WHERE code NOT IN (${CANONICAL_ROLES.map(r => `'${r}'`).join(',')});
    UPDATE public.roles SET deleted_at = NULL;

    -- 9. Clean lookup tables
    -- term_types: keep 1ST_SEM, 2ND_SEM, SUMMER
    DELETE FROM public.term_types WHERE code NOT IN ('1ST_SEM', '2ND_SEM', 'SUMMER');
    UPDATE public.term_types SET deleted_at = NULL;

    -- academic_thresholds: delete school-year specific thresholds, keep baseline global thresholds
    DELETE FROM public.academic_thresholds WHERE school_year_id IS NOT NULL;
    UPDATE public.academic_thresholds SET deleted_at = NULL, is_active = true WHERE school_year_id IS NULL;

    -- 10. Re-seed clean Default grade_transmutation_tables
    DELETE FROM public.grade_transmutation_tables;
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
    SET deleted_at = NULL;

    -- 12. Delete leftover materials, announcements, events files in storage
    SET LOCAL storage.allow_delete_query = 'true';
    DELETE FROM storage.objects 
    WHERE bucket_id IN ('materials', 'announcements', 'events', 'submissions', 'discussions');

    ${apply ? 'COMMIT;' : 'ROLLBACK;'}
  `;

  await runQuery(sql);

  console.log(apply ? 'RESET COMMITTED SUCCESSFULLY!' : 'DRY RUN COMPLETED SUCCESSFULLY!');
}

async function verify() {
  console.log('\n=== POST-RESET VERIFICATION ===');
  
  const users = await runQuery(`
    SELECT pu.email, pu.status, pu.deleted_at,
           (SELECT string_agg(r.code, ', ') 
            FROM public.user_roles ur 
            JOIN public.roles r ON r.id = ur.role_id 
            WHERE ur.user_id = pu.id AND ur.deleted_at IS NULL) AS roles
    FROM public.users pu
    ORDER BY pu.email;
  `);
  console.log('Surviving Public Users:');
  console.table(users.rows);

  const authUsers = await runQuery(`
    SELECT email, confirmed_at, last_sign_in_at
    FROM auth.users
    ORDER BY email;
  `);
  console.log(`Surviving Auth Users (${authUsers.rows.length}):`);
  console.table(authUsers.rows);

  const roles = await runQuery(`SELECT code, label, deleted_at FROM public.roles ORDER BY code;`);
  console.log('Canonical Roles:');
  console.table(roles.rows);

  const sysSettings = await runQuery(`SELECT institution_name, institution_short_name, institution_logo_url FROM public.system_settings;`);
  console.log('System Settings:');
  console.table(sysSettings.rows);

  const transmutations = await runQuery(`SELECT label, min_percentage, max_percentage, transmuted_grade, is_passing, description FROM public.grade_transmutation_tables ORDER BY min_percentage DESC;`);
  console.log('Default Transmutation Ladder:');
  console.table(transmutations.rows);

  const tables = await runQuery(`
    SELECT t.table_name
    FROM information_schema.tables t 
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('users', 'user_roles', 'roles', 'term_types', 'course_types', 'program_levels', 'system_settings', 'grade_transmutation_tables', 'academic_thresholds', 'students')
    ORDER BY t.table_name;
  `);

  const wipedTables = [];
  for (const row of tables.rows) {
    const c = await runQuery(`SELECT count(*) FROM public."${row.table_name}"`);
    wipedTables.push({ table: row.table_name, count: parseInt(c.rows[0].count, 10) });
  }
  console.log('Operational Tables Status (should be 0 rows):');
  console.table(wipedTables.filter(t => t.count > 0));
  if (wipedTables.filter(t => t.count > 0).length === 0) {
    console.log('ALL OPERATIONAL TABLES ARE PRISTINE (0 rows)!');
  }

  const storageObjs = await runQuery(`SELECT bucket_id, name FROM storage.objects;`);
  console.log('Remaining Storage Objects:');
  console.table(storageObjs.rows);
}

const isApply = process.argv.includes('--apply');
executeFullReset(isApply)
  .then(() => {
    if (isApply) return verify();
  })
  .catch(err => {
    console.error('RESET FAILED:', err);
    process.exit(1);
  });
