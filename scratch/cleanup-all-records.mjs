import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ysitzlbjoueorndmnmdf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaXR6bGJqb3Vlb3JuZG1ubWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjc4MTksImV4cCI6MjA4OTY0MzgxOX0.vtHOKmVjCvIZ1uav2kjWl7NPWTQvJhKqzkbx27HJzk8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanAllRecords() {
    console.log('=== CLEANING ALL DATABASE RECORDS EXCEPT USERS ===');

    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'juliustolentino.diamond@gmail.com',
        password: 'Password123!'
    });

    if (authErr || !authData.session) {
        console.error('❌ Auth failed:', authErr?.message);
        return;
    }
    console.log('✓ Signed in as admin:', authData.user.email);

    // List of tables to delete records from (order respects foreign keys)
    const tables = [
        'sections',
        'curriculum_maps',
        'student_profile_requests',
        'registrar_logs',
        'courses',
        'programs',
        'terms',
        'school_years',
        'departments',
        'course_types',
        'program_levels'
    ];

    for (const table of tables) {
        // Delete all rows where id is not null / code is not null
        const { error, count } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.log(`Table '${table}': Delete notice (${error.message})`);
        } else {
            console.log(`✓ Table '${table}': Cleaned (${count ?? 0} rows removed)`);
        }
    }

    console.log('\n=== FINAL ROW COUNT CHECK ===');
    const checkTables = ['departments', 'school_years', 'terms', 'programs', 'courses', 'sections', 'users'];
    for (const table of checkTables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`• ${table.padEnd(20)}: ${count ?? 0} rows remaining`);
    }
}

cleanAllRecords();
