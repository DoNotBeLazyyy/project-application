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

export async function runSql(filePath) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`SQL file not found: ${fullPath}`);
    }

    const sql = fs.readFileSync(fullPath, 'utf8');
    const client = new Client(DB_CONFIG);

    try {
        await client.connect();
        await client.query(sql);
        return { success: true, file: filePath };
    }
    finally {
        await client.end();
    }
}

async function main() {
    const targetFile = process.argv[2];
    if (!targetFile) {
        process.exit(0);
    }

    try {
        await runSql(targetFile);
        process.exit(0);
    }
    catch (err) {
        process.exit(1);
    }
}

if (process.argv[1] && process.argv[1].endsWith('db-apply.js')) {
    main();
}

