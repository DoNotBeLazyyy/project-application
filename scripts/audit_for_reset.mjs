import pg from 'pg';

const DB_CONFIG = {
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.ysitzlbjoueorndmnmdf',
  password: 'GiDv0ziY5w7SVyGl',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

async function audit() {
  const client = new pg.Client(DB_CONFIG);
  await client.connect();

  console.log('=== ROLES TABLE ===');
  const roles = await client.query(`SELECT * FROM public.roles;`);
  console.table(roles.rows);

  console.log('=== GMAIL USERS & THEIR ROLES & STUDENTS RECORD ===');
  const gmailUsers = await client.query(`
    SELECT 
      pu.id,
      pu.email,
      pu.first_name,
      pu.last_name,
      pu.status,
      pu.deleted_at,
      (SELECT count(*) FROM public.students s WHERE s.user_id = pu.id) AS student_count,
      (SELECT string_agg(r.code, ', ') 
       FROM public.user_roles ur 
       JOIN public.roles r ON r.id = ur.role_id 
       WHERE ur.user_id = pu.id AND ur.deleted_at IS NULL) AS active_roles
    FROM public.users pu
    WHERE pu.email ILIKE '%@gmail.com'
    ORDER BY pu.email;
  `);
  console.table(gmailUsers.rows);

  console.log('=== STUDENTS TABLE FOR GMAIL USERS ===');
  const students = await client.query(`
    SELECT s.id, s.user_id, s.student_number, pu.email, s.program_id, s.year_level
    FROM public.students s
    JOIN public.users pu ON pu.id = s.user_id
    WHERE pu.email ILIKE '%@gmail.com';
  `);
  console.table(students.rows);

  console.log('=== ALL NON-GMAIL STUDENTS ===');
  const nonGmailStudents = await client.query(`
    SELECT count(*) 
    FROM public.students s
    JOIN public.users pu ON pu.id = s.user_id
    WHERE pu.email NOT ILIKE '%@gmail.com';
  `);
  console.log('Non-gmail students count:', nonGmailStudents.rows[0].count);

  console.log('=== SYSTEM SETTINGS ===');
  const sysSettings = await client.query(`SELECT * FROM public.system_settings;`);
  console.table(sysSettings.rows);

  console.log('=== STORAGE OBJECTS ===');
  const storageObjects = await client.query(`SELECT bucket_id, name, owner, created_at FROM storage.objects;`);
  console.table(storageObjects.rows);

  console.log('=== FOREIGN KEYS REFERENCING USERS ===');
  const userFks = await client.query(`
    SELECT
      tc.table_name, 
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM 
      information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name IN ('users', 'students')
      AND tc.table_schema = 'public'
    ORDER BY ccu.table_name, tc.table_name;
  `);
  console.table(userFks.rows);

  await client.end();
}

audit().catch(console.error);
