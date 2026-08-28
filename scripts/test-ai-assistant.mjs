import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysitzlbjoueorndmnmdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXR6bGJqb3Vlb3JuZG1ubWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjc4MTksImV4cCI6MjA4OTY0MzgxOX0.vtHOKmVjCvIZ1uav2kjWl7NPWTQvJhKqzkbx27HJzk8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAssistant() {
  console.log('--- Testing AI Assistant Edge Function ---');

  // 1. Authenticate as Student
  const { data: studentAuth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'crowsnight379@gmail.com',
    password: 'Password123!'
  });

  if (authError) {
    console.error('Student auth failed:', authError.message);
    return;
  }

  console.log('Student authenticated, token acquired.');

  // 2. Call Edge Function with Student role
  console.log('Invoking ai-assistant for Student...');
  const { data: studentReply, error: funcError } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message: 'Am I on track for Latin honors?',
      history: [],
      activeRole: 'Student',
      sectionId: null,
      termId: null
    },
    headers: {
      Authorization: `Bearer ${studentAuth.session.access_token}`
    }
  });

  console.log('Student AI Response:');
  console.log('Error:', funcError);
  console.log('Data:', JSON.stringify(studentReply, null, 2));

  // 3. Authenticate as Faculty
  const { data: facultyAuth } = await supabase.auth.signInWithPassword({
    email: 'luna.akirapogi@gmail.com',
    password: 'Password123!'
  });

  console.log('\nInvoking ai-assistant for Faculty...');
  const { data: facultyReply, error: facFuncError } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message: 'How do I take attendance for today?',
      history: [],
      activeRole: 'Faculty',
      sectionId: null,
      termId: null
    },
    headers: {
      Authorization: `Bearer ${facultyAuth.session.access_token}`
    }
  });

  console.log('Faculty AI Response:');
  console.log('Error:', facFuncError);
  console.log('Data:', JSON.stringify(facultyReply, null, 2));

  // 4. Authenticate as Admin
  const { data: adminAuth } = await supabase.auth.signInWithPassword({
    email: 'juliustolentino.diamond@gmail.com',
    password: 'Password123!'
  });

  console.log('\nInvoking ai-assistant for Admin...');
  const { data: adminReply, error: adminFuncError } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message: 'How do I invite a new user?',
      history: [],
      activeRole: 'Admin',
      sectionId: null,
      termId: null
    },
    headers: {
      Authorization: `Bearer ${adminAuth.session.access_token}`
    }
  });

  console.log('Admin AI Response:');
  console.log('Error:', adminFuncError);
  console.log('Data:', JSON.stringify(adminReply, null, 2));
}

testAssistant().catch(console.error);

