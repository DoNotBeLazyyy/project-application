import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysitzlbjoueorndmnmdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXR6bGJqb3Vlb3JuZG1ubWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjc4MTksImV4cCI6MjA4OTY0MzgxOX0.vtHOKmVjCvIZ1uav2kjWl7NPWTQvJhKqzkbx27HJzk8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function invokeAssistant(role, message, token, sectionId = null) {
  console.log(`\n--- [${role}] Asking: "${message}" ---`);
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: {
      message,
      history: [],
      activeRole: role,
      sectionId,
      termId: null
    },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (error) {
    console.error('Function error:', error);
  } else {
    console.log('Mode:', data?.mode);
    console.log('Reply:\n' + data?.reply);
  }
}

async function testAssistant() {
  console.log('=== Testing AI Assistant Capabilities & Grounding ===');

  // 1. Authenticate as Student
  const { data: studentAuth, error: studentAuthErr } = await supabase.auth.signInWithPassword({
    email: 'crowsnight379@gmail.com',
    password: 'Password123!'
  });

  if (studentAuthErr) {
    console.error('Student auth failed:', studentAuthErr.message);
  } else {
    const token = studentAuth.session.access_token;
    await invokeAssistant('Student', 'What assignments are due this week?', token);
    await invokeAssistant('Student', 'Can I enroll in CS301 next term?', token);
    await invokeAssistant('Student', 'Am I at risk of DRP?', token);
  }

  // 2. Authenticate as Faculty
  const { data: facultyAuth, error: facultyAuthErr } = await supabase.auth.signInWithPassword({
    email: 'luna.akirapogi@gmail.com',
    password: 'Password123!'
  });

  if (facultyAuthErr) {
    console.error('Faculty auth failed:', facultyAuthErr.message);
  } else {
    const token = facultyAuth.session.access_token;
    await invokeAssistant('Faculty', 'Show pending submissions to grade', token);
    await invokeAssistant('Faculty', 'Section attendance summary', token);
  }

  // 3. Authenticate as Admin
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: 'juliustolentino.diamond@gmail.com',
    password: 'Password123!'
  });

  if (adminAuthErr) {
    console.error('Admin auth failed:', adminAuthErr.message);
  } else {
    const token = adminAuth.session.access_token;
    await invokeAssistant('Admin', 'Check term transition status', token);
  }
}

testAssistant().catch(console.error);


