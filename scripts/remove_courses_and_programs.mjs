import pg from 'pg';

const DB_CONFIG = {
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.ysitzlbjoueorndmnmdf',
  password: 'GiDv0ziY5w7SVyGl',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

async function removeCoursesAndPrograms() {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();

  try {
    await client.query('BEGIN;');

    console.log('1. Removing program assignment from all students...');
    const resStudents = await client.query('UPDATE public.students SET program_id = NULL;');
    console.log(`   Updated ${resStudents.rowCount} students.`);

    console.log('2. Clearing program references from student_lifecycle_events...');
    const resLifecycle = await client.query('UPDATE public.student_lifecycle_events SET from_program_id = NULL, to_program_id = NULL;');
    console.log(`   Updated ${resLifecycle.rowCount} lifecycle events.`);

    console.log('3. Deleting evaluation template programs...');
    const resEvalProg = await client.query('DELETE FROM public.evaluation_template_programs;');
    console.log(`   Deleted ${resEvalProg.rowCount} rows.`);

    console.log('4. Deleting curriculum maps...');
    const resCurriculum = await client.query('DELETE FROM public.curriculum_maps;');
    console.log(`   Deleted ${resCurriculum.rowCount} rows.`);

    console.log('5. Deleting course prerequisites...');
    const resPrereq = await client.query('DELETE FROM public.course_prerequisites;');
    console.log(`   Deleted ${resPrereq.rowCount} rows.`);

    console.log('6. Deleting assessment questions and choices...');
    const resChoices = await client.query('DELETE FROM public.assessment_question_choices;');
    console.log(`   Deleted ${resChoices.rowCount} question choices.`);
    const resQuestions = await client.query('DELETE FROM public.assessment_questions;');
    console.log(`   Deleted ${resQuestions.rowCount} questions.`);
    const resItems = await client.query('DELETE FROM public.assessment_items;');
    console.log(`   Deleted ${resItems.rowCount} assessment items.`);

    console.log('7. Deleting section materials, modules, attendance, announcements, events, grading components...');
    const resMaterials = await client.query('DELETE FROM public.course_materials;');
    console.log(`   Deleted ${resMaterials.rowCount} course materials.`);
    const resModules = await client.query('DELETE FROM public.modules;');
    console.log(`   Deleted ${resModules.rowCount} modules.`);
    const resAttendance = await client.query('DELETE FROM public.attendance_sessions;');
    console.log(`   Deleted ${resAttendance.rowCount} attendance sessions.`);
    const resAnnSec = await client.query('DELETE FROM public.announcement_sections;');
    console.log(`   Deleted ${resAnnSec.rowCount} announcement sections.`);
    const resAnn = await client.query('DELETE FROM public.announcements;');
    console.log(`   Deleted ${resAnn.rowCount} announcements.`);
    const resEvents = await client.query('DELETE FROM public.events;');
    console.log(`   Deleted ${resEvents.rowCount} events.`);
    const resGradingComp = await client.query('DELETE FROM public.grading_components;');
    console.log(`   Deleted ${resGradingComp.rowCount} grading components.`);

    console.log('8. Deleting sections...');
    const resSections = await client.query('DELETE FROM public.sections;');
    console.log(`   Deleted ${resSections.rowCount} sections.`);

    console.log('9. Deleting all courses...');
    const resCourses = await client.query('DELETE FROM public.courses;');
    console.log(`   Deleted ${resCourses.rowCount} courses.`);

    console.log('10. Deleting all programs...');
    const resPrograms = await client.query('DELETE FROM public.programs;');
    console.log(`   Deleted ${resPrograms.rowCount} programs.`);

    await client.query('COMMIT;');
    console.log('Successfully completed removal of courses, programs, and student program assignments!');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Failed to remove courses and programs. Transaction rolled back.', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

removeCoursesAndPrograms();
