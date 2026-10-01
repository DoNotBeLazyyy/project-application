import pg from 'pg';

const DB_CONFIG = {
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.ysitzlbjoueorndmnmdf',
  password: 'GiDv0ziY5w7SVyGl',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

async function inspect() {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();

  console.log('=== USERS IN public.users & auth.users ===');
  const usersRes = await client.query(`
    SELECT 
      COALESCE(pu.id, au.id) AS id,
      COALESCE(pu.email, au.email) AS email,
      pu.first_name,
      pu.last_name,
      pu.created_at AS pu_created_at,
      au.created_at AS au_created_at,
      au.email_confirmed_at,
      pu.deleted_at,
      (SELECT string_agg(r.code, ', ') 
       FROM public.user_roles ur 
       JOIN public.roles r ON r.id = ur.role_id 
       WHERE ur.user_id = COALESCE(pu.id, au.id) AND ur.deleted_at IS NULL) AS assigned_roles
    FROM public.users pu
    FULL OUTER JOIN auth.users au ON au.id = pu.id
    ORDER BY COALESCE(pu.email, au.email);
  `);

  console.table(usersRes.rows.map(u => ({
    email: u.email,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
    roles: u.assigned_roles,
    is_gmail: u.email ? u.email.toLowerCase().endsWith('@gmail.com') : false,
    pu_created: u.pu_created_at ? u.pu_created_at.toISOString().split('T')[0] : null,
    au_created: u.au_created_at ? u.au_created_at.toISOString().split('T')[0] : null
  })));

  console.log('\n=== ROW COUNTS ACROSS ALL PUBLIC TABLES ===');
  const tablesRes = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `);

  const tableCounts = [];
  for (const row of tablesRes.rows) {
    try {
      const countRes = await client.query(`SELECT count(*) FROM public."${row.tablename}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      if (count > 0) {
        tableCounts.push({ table: row.tablename, count });
      }
    } catch (e) {
      tableCounts.push({ table: row.tablename, error: e.message });
    }
  }
  console.log('\n=== GMAIL USERS (@gmail.com) ===');
  const gmailUsers = await client.query(`
    SELECT 
      pu.id,
      pu.email,
      pu.first_name,
      pu.last_name,
      pu.created_at,
      au.id IS NOT NULL as in_auth,
      (SELECT string_agg(r.code, ', ') 
       FROM public.user_roles ur 
       JOIN public.roles r ON r.id = ur.role_id 
       WHERE ur.user_id = pu.id AND ur.deleted_at IS NULL) AS roles
    FROM public.users pu
    LEFT JOIN auth.users au ON au.id = pu.id
    WHERE pu.email ILIKE '%@gmail.com'
    ORDER BY pu.email;
  `);
  console.table(gmailUsers.rows);

  console.log('\n=== NON-GMAIL USERS ===');
  const nonGmailUsers = await client.query(`
    SELECT 
      pu.id,
      pu.email,
      pu.first_name,
      pu.last_name,
      au.id IS NOT NULL as in_auth
    FROM public.users pu
    LEFT JOIN auth.users au ON au.id = pu.id
    WHERE pu.email NOT ILIKE '%@gmail.com' OR pu.email IS NULL
    ORDER BY pu.email;
  `);
  console.log('Non-gmail user count:', nonGmailUsers.rows.length);
  console.table(nonGmailUsers.rows.slice(0, 15));

  try {
    const bucketsRes = await client.query(`SELECT id, name, public FROM storage.buckets;`);
    console.log('Buckets:', bucketsRes.rows);
    const objectsCount = await client.query(`SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id;`);
    console.log('Objects by bucket:', objectsCount.rows);
  } catch (e) {
    console.log('Storage query error:', e.message);
  }

  await client.end();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
