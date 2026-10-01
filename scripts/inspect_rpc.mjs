import { runQuery } from './query.mjs';

async function main() {
  const res = await runQuery("SELECT proname, prosrc FROM pg_proc WHERE proname IN ('fn_delete_program', 'fn_bulk_delete_programs');");
  for (const row of res.rows) {
    console.log(`\n=================== ${row.proname} ===================`);
    console.log(row.prosrc);
  }
}

main().catch(console.error);
