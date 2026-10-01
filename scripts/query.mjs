import pg from 'pg';

const DB_CONFIG = {
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.ysitzlbjoueorndmnmdf',
  password: 'GiDv0ziY5w7SVyGl',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

export async function runQuery(sql, params = []) {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    await client.end();
  }
}

async function main() {
  const sql = process.argv.slice(2).join(' ');
  if (!sql) {
    console.error('No SQL provided');
    process.exit(1);
  }
  const res = await runQuery(sql);
  if (Array.isArray(res.rows)) {
    console.table(res.rows);
    console.log(`Row count: ${res.rows.length}`);
  } else {
    console.log(res);
  }
}

if (process.argv[1] && process.argv[1].endsWith('query.mjs')) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
