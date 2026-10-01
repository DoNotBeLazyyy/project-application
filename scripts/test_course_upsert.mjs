import { runQuery } from './query.mjs';

async function testUpsert() {
  console.log('--- TESTING COURSE BULK UPLOAD UPSERT BEHAVIOR ---');

  // Check initial active record for CS 101LEC
  const initialRes = await runQuery(`SELECT id, code, title, description FROM public.courses WHERE code = 'CS 101LEC' AND deleted_at IS NULL;`);
  console.log('Initial active CS 101LEC record:', initialRes.rows[0]);

  const activeCountBefore = await runQuery(`SELECT COUNT(*) FROM public.courses WHERE deleted_at IS NULL;`);
  console.log(`Active courses before upsert: ${activeCountBefore.rows[0].count}`);

  // Define bulk upload payload containing existing code 'CS 101LEC' with updated title and description
  const testPayload = [
    {
      code: 'CS 101LEC',
      title: 'Computer Programming 1 (Updated Title Via Bulk Upload)',
      department_code: 'CITE',
      course_type_code: 'LECTURE',
      lecture_units: '2',
      laboratory_units: '0',
      credit_hours: '2',
      description: 'Updated description via bulk upload upsert',
      is_active: 'true',
      prerequisites: ''
    }
  ];

  console.log('\nExecuting fn_bulk_create_courses with updated data for existing CS 101LEC...');
  const res = await runQuery(
    `SELECT public.fn_bulk_create_courses($1::jsonb) as result;`,
    [JSON.stringify(testPayload)]
  );

  console.log('RPC Output:', JSON.stringify(res.rows[0].result, null, 2));

  // Verify updated record in DB
  const updatedRes = await runQuery(`SELECT id, code, title, description FROM public.courses WHERE code = 'CS 101LEC' AND deleted_at IS NULL;`);
  console.log('\nUpdated CS 101LEC record:', updatedRes.rows[0]);

  const activeCountAfter = await runQuery(`SELECT COUNT(*) FROM public.courses WHERE deleted_at IS NULL;`);
  console.log(`Active courses after upsert: ${activeCountAfter.rows[0].count}`);

  if (
    updatedRes.rows[0].title === 'Computer Programming 1 (Updated Title Via Bulk Upload)' &&
    initialRes.rows[0].id === updatedRes.rows[0].id &&
    activeCountBefore.rows[0].count === activeCountAfter.rows[0].count
  ) {
    console.log('\nSUCCESS: Existing active course was updated in-place without duplicate creation!');
  } else {
    console.error('\nFAILURE: Upsert did not update existing course correctly.');
    process.exit(1);
  }
}

testUpsert().catch(console.error);
