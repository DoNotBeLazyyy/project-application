import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const DB_CONFIG = {
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ysitzlbjoueorndmnmdf',
    password: 'GiDv0ziY5w7SVyGl',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

const REGISTRAR_USER_ID = 'b2749c0b-eeb7-44c1-8f89-36e390669db1';

async function main() {
    const client = new pg.Client(DB_CONFIG);
    await client.connect();

    try {
        // Authenticate session as Registrar / Admin for RPC authorization
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [REGISTRAR_USER_ID]);

        // 1. Get Target Term
        const targetTermRes = await client.query(`SELECT public.fn_get_enrollment_target_term() AS term;`);
        const targetTerm = targetTermRes.rows[0].term;
        console.log('Target Term:', targetTerm);
        const termId = targetTerm.id;
        const termLabel = targetTerm.label;

        // 2. Fetch Programs map
        const programsRes = await client.query(`SELECT id, code, name FROM programs WHERE deleted_at IS NULL;`);
        const programMap = {};
        programsRes.rows.forEach(p => {
            programMap[p.code] = p.id;
        });

        // 3. Ensure all students have program_id and year_level = 3
        const studentsRes = await client.query(`
            SELECT s.id, s.student_number, u.first_name || ' ' || u.last_name as name, s.year_level, s.program_id, p.code as program_code
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN programs p ON s.program_id = p.id
            WHERE s.deleted_at IS NULL
            ORDER BY s.student_number;
        `);

        console.log('\nCurrent Students:');
        console.table(studentsRes.rows);

        const programAssignments = [
            'BSCS', 'BSIT', 'BSN', 'BSMLS', 'AB-POLSCI', 'AB-PAG', 'BSMT-HONORS', 'BSN-ACC'
        ];

        for (let i = 0; i < studentsRes.rows.length; i++) {
            const st = studentsRes.rows[i];
            const assignedProgCode = st.program_code || programAssignments[i % programAssignments.length];
            const progId = programMap[assignedProgCode];

            await client.query(`
                UPDATE students
                SET year_level = 3,
                    program_id = $1,
                    updated_at = NOW()
                WHERE id = $2;
            `, [progId, st.id]);

            console.log(`Updated student ${st.student_number} (${st.name}): Year Level = 3, Program = ${assignedProgCode}`);
        }

        // 4. Check Year 3 1st Semester courses for each program and create missing sections
        const termTypeRes = await client.query(`SELECT id FROM term_types WHERE code = '1ST_SEM' AND deleted_at IS NULL LIMIT 1;`);
        const termTypeId = termTypeRes.rows[0].id;

        const year3CoursesRes = await client.query(`
            SELECT cm.program_id, p.code as program_code, cm.course_id, c.code as course_code, c.title as course_title
            FROM curriculum_maps cm
            JOIN programs p ON cm.program_id = p.id
            JOIN courses c ON cm.course_id = c.id
            WHERE cm.deleted_at IS NULL
              AND cm.year_level = 3
              AND cm.term_type_id = $1
            ORDER BY p.code, c.code;
        `, [termTypeId]);

        console.log(`\nFound ${year3CoursesRes.rows.length} Year 3 1st Semester course-program requirements.`);

        for (const req of year3CoursesRes.rows) {
            const secRes = await client.query(`
                SELECT id, section_code
                FROM sections
                WHERE course_id = $1 AND term_id = $2 AND deleted_at IS NULL;
            `, [req.course_id, termId]);

            if (secRes.rows.length === 0) {
                const secCode = `${req.program_code} 3-${req.course_code.replace(/[^A-Za-z0-9]/g, '')}`;
                await client.query(`
                    INSERT INTO sections (
                        term_id, course_id, section_code, max_slots, status, created_at
                    ) VALUES (
                        $1, $2, $3, 40, 'Open'::public.section_status_type, NOW()
                    );
                `, [termId, req.course_id, secCode]);
                console.log(`Created section "${secCode}" for course ${req.course_code} (${req.course_title}) in program ${req.program_code}`);
            } else {
                console.log(`Section "${secRes.rows[0].section_code}" already exists for course ${req.course_code}`);
            }
        }

        // 5. Fetch updated students and all their Year 3 1st Semester section codes
        const finalStudentsRes = await client.query(`
            SELECT s.id, s.student_number, u.first_name || ' ' || u.last_name as name, s.year_level, p.code as program_code, s.program_id
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN programs p ON s.program_id = p.id
            WHERE s.deleted_at IS NULL
            ORDER BY s.student_number;
        `);

        const csvRows = [];
        const bulkPayload = [];

        console.log('\nGenerating CSV Data for All Students Year 3 1st Semester enrollment:');

        for (const st of finalStudentsRes.rows) {
            const stSecsRes = await client.query(`
                SELECT s.section_code, c.code as course_code
                FROM curriculum_maps cm
                JOIN courses c ON cm.course_id = c.id
                JOIN sections s ON s.course_id = c.id AND s.term_id = $1 AND s.deleted_at IS NULL
                WHERE cm.program_id = $2
                  AND cm.year_level = 3
                  AND cm.term_type_id = $3
                  AND cm.deleted_at IS NULL
                ORDER BY c.code, s.section_code;
            `, [termId, st.program_id, termTypeId]);

            const selectedSections = [];
            const seenCourses = new Set();
            for (const secRow of stSecsRes.rows) {
                if (!seenCourses.has(secRow.course_code)) {
                    seenCourses.add(secRow.course_code);
                    selectedSections.push(secRow.section_code);
                }
            }

            const sectionCodesStr = selectedSections.join('|');

            const csvRow = {
                student_number: st.student_number,
                term_label: termLabel,
                section_codes: sectionCodesStr,
                allow_conflict: 'true',
                override_prerequisites: 'true',
                conflict_reason: 'Year 3 1st Term mandatory section enrollment'
            };

            csvRows.push(csvRow);
            bulkPayload.push(csvRow);

            console.log(`Student ${st.student_number} (${st.name}, ${st.program_code}): Sections -> ${sectionCodesStr}`);
        }

        // 6. Write CSV File
        const csvHeader = 'student_number,term_label,section_codes,allow_conflict,override_prerequisites,conflict_reason\n';
        const csvContent = csvHeader + csvRows.map(r =>
            `"${r.student_number}","${r.term_label}","${r.section_codes}","${r.allow_conflict}","${r.override_prerequisites}","${r.conflict_reason}"`
        ).join('\n');

        const csvPath = path.resolve('year3_students_enrollment.csv');
        fs.writeFileSync(csvPath, csvContent, 'utf8');
        console.log(`\nSuccessfully written CSV to: ${csvPath}`);

        // 7. Perform Bulk Enrollment in Database
        console.log('\nExecuting fn_bulk_enroll_students with generated CSV payload...');
        await client.query(`SELECT set_config('request.jwt.claim.sub', $1, false);`, [REGISTRAR_USER_ID]);
        const enrollResult = await client.query(
            `SELECT public.fn_bulk_enroll_students($1::jsonb) AS result;`,
            [JSON.stringify(bulkPayload)]
        );

        console.log('\nEnrollment Result:', JSON.stringify(enrollResult.rows[0].result, null, 2));

    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error('Error executing script:', err);
    process.exit(1);
});
