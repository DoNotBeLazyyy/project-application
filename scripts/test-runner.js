import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const SUPABASE_URL = 'https://ysitzlbjoueorndmnmdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXR6bGJqb3Vlb3JuZG1ubWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjc4MTksImV4cCI6MjA4OTY0MzgxOX0.vtHOKmVjCvIZ1uav2kjWl7NPWTQvJhKqzkbx27HJzk8';

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
    return res.rows;
  } finally {
    await client.end();
  }
}

export function getSupabaseClient(authToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: authToken ? {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    } : {}
  });
}

async function main() {
  const users = await runQuery(`
    SELECT u.id, u.email, u.status, u.first_name, u.last_name, 
           array_agg(r.code) as roles
    FROM public.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE u.deleted_at IS NULL
    GROUP BY u.id, u.email, u.status, u.first_name, u.last_name
    ORDER BY u.email
  `);
  console.log('Total Active Users:', users.length);
  console.log('Sample Users with Roles:');
  console.log(users.filter(u => u.roles.some(r => r !== null)).slice(0, 30));
}

if (process.argv[1]?.includes('test-runner.js')) {
  main().catch(console.error);
}

