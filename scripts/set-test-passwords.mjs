import { createClient } from '@supabase/supabase-js';
import { runQuery } from './test-runner.js';

const SUPABASE_URL = 'https://ysitzlbjoueorndmnmdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXR6bGJqb3Vlb3JuZG1ubWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjc4MTksImV4cCI6MjA4OTY0MzgxOX0.vtHOKmVjCvIZ1uav2kjWl7NPWTQvJhKqzkbx27HJzk8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TARGET_EMAILS = [
  'juliustolentino.diamond@gmail.com',
  'juliustolentino0101@gmail.com',
  'hbaki386@gmail.com',
  'luna.akirapogi@gmail.com',
  'crowsnight379@gmail.com',
  'dsadsa@gmail.com'
];

async function main() {
  console.log('Setting test passwords for:', TARGET_EMAILS);
  
  await runQuery(`
    UPDATE auth.users
    SET encrypted_password = crypt('Password123!', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb
    WHERE email = ANY($1::text[])
  `, [TARGET_EMAILS]);

  console.log('Passwords updated in DB. Now testing signInWithPassword via Supabase client...');

  for (const email of TARGET_EMAILS) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Password123!'
    });

    if (error) {
      console.error(`FAILED: ${email} -> ${error.message}`);
    } else {
      console.log(`SUCCESS: ${email} -> logged in! Token length: ${data.session.access_token.length}`);
    }
  }
}

main().catch(console.error);

