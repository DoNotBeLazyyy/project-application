import { runQuery } from './query.mjs';

async function check() {
  const tables = await runQuery(`
    SELECT t.table_name
    FROM information_schema.tables t 
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
  `);

  console.log('--- ALL PUBLIC TABLES & COUNTS ---');
  for (const row of tables.rows) {
    const countRes = await runQuery(`SELECT count(*) FROM public."${row.table_name}"`);
    console.log(`${row.table_name.padEnd(35)} : ${countRes.rows[0].count} rows`);
  }
}

check().catch(console.error);
