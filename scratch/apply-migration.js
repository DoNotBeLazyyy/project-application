import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

const DB_CONFIG = {
    host: process.env.SUPABASE_DB_HOST || 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: Number(process.env.SUPABASE_DB_PORT) || 6543,
    user: process.env.SUPABASE_DB_USER || 'postgres.ysitzlbjoueorndmnmdf',
    password: process.env.SUPABASE_DB_PASSWORD || 'GiDv0ziY5w7SVyGl',
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
};

async function runSqlFile(filePath) {
    const fullPath = path.resolve(filePath);
    console.log(`Reading SQL file: ${fullPath}`);
    const sql = fs.readFileSync(fullPath, 'utf8');

    const client = new Client(DB_CONFIG);
    console.log(`Connecting to Supabase PostgreSQL at ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
    await client.connect();
    console.log('Connected! Executing SQL...');

    await client.query(sql);
    console.log('SQL executed successfully!');

    await client.end();
}

const file = process.argv[2] || 'supabase/migrations/20261002020000_student_curriculum_audit_units.sql';
runSqlFile(file)
    .then(() => {
        console.log('Done.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error applying SQL:', err);
        process.exit(1);
    });
