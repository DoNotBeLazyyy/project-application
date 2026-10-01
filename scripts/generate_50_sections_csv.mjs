import fs from 'fs';
import path from 'path';
import { runQuery } from './query.mjs';

async function generate50SectionsCsv() {
  const termRes = await runQuery(`
    SELECT (tt.label || ' - ' || sy.label) as full_label
    FROM terms t
    JOIN term_types tt ON tt.id = t.term_type_id
    JOIN school_years sy ON sy.id = t.school_year_id
    WHERE sy.is_active = true AND t.deleted_at IS NULL
    LIMIT 1
  `);
  
  const termLabel = termRes.rows[0]?.full_label || '1st Semester - Academic Year 2025-2026';
  
  const facultyRes = await runQuery(`
    SELECT u.email
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.code = 'Faculty' AND u.deleted_at IS NULL
    ORDER BY u.created_at ASC
  `);
  
  const facultyEmails = facultyRes.rows.map(r => r.email);
  const f1 = facultyEmails[0] || 'juliustolentino.diamond@gmail.com';
  const f2 = facultyEmails[1] || 'luna.akirapogi@gmail.com';
  const f3 = facultyEmails[2] || 'juliusexample@gmail.com';

  const sectionsData = [
    // === 1. BSCS (Computer Science) ===
    // [CONFLICT FOR F1]: Row 1 (BSCS 1-A) has Mon/Wed 08:00-10:00 with F1
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 101LEC', section_code: 'BSCS 1-A',
      faculty_email: f1, room: 'CLAB-101', max_slots: 40, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'CLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 101LAB', section_code: 'BSCS 1-A (LAB)',
      faculty_email: f1, room: 'CLAB-101', max_slots: 40, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '08:00', schedule_time_end: '11:00', schedule_room: 'CLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 102LEC', section_code: 'BSCS 1-B',
      faculty_email: f2, room: 'CLAB-102', max_slots: 40, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '13:00', schedule_time_end: '15:00', schedule_room: 'CLAB-102',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    // [CONFLICT FOR F3]: Row 4 (BSCS 2-A) has Mon/Wed 13:00-15:00 with F3
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 201LEC', section_code: 'BSCS 2-A',
      faculty_email: f3, room: 'CLAB-201', max_slots: 40, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '13:00', schedule_time_end: '15:00', schedule_room: 'CLAB-201',
      preset_section: '', override_grading_schema: 'true',
      grading_periods: 'Prelim:30(Quizzes:25,Class Standing:35,Major Exam:40); Midterm:30(Quizzes:25,Class Standing:35,Major Exam:40); Final:40(Quizzes:25,Class Standing:35,Major Exam:40)'
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 201LAB', section_code: 'BSCS 2-A (LAB)',
      faculty_email: f3, room: 'CLAB-201', max_slots: 40, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'CLAB-201',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 202', section_code: 'BSCS 2-B',
      faculty_email: f1, room: 'CLAB-202', max_slots: 40, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'CLAB-202',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 301LEC', section_code: 'BSCS 3-A',
      faculty_email: f2, room: 'CLAB-301', max_slots: 35, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'CLAB-301',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 302LEC', section_code: 'BSCS 3-B',
      faculty_email: f3, room: 'CLAB-302', max_slots: 35, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '15:00', schedule_time_end: '17:00', schedule_room: 'CLAB-302',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 401', section_code: 'BSCS 4-A',
      faculty_email: f1, room: 'CLAB-401', max_slots: 30, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '09:00', schedule_time_end: '12:00', schedule_room: 'CLAB-401',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 402', section_code: 'BSCS 4-B',
      faculty_email: f2, room: 'CLAB-402', max_slots: 30, status: 'Open',
      schedule_days: 'Saturday', schedule_time_start: '08:00', schedule_time_end: '11:00', schedule_room: 'CLAB-402',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 2. BSIT (Information Technology) ===
    // [CONFLICT FOR F1]: Row 11 (BSIT 1-A) ALSO has Mon/Wed 08:00-10:00 with F1! (Faculty Conflict 1)
    {
      term_label: termLabel, program_code: 'BSIT', course_code: 'CS 101LEC', section_code: 'BSIT 1-A',
      faculty_email: f1, room: 'CLAB-103', max_slots: 45, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'CLAB-103',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSIT', course_code: 'CS 102LEC', section_code: 'BSIT 1-B',
      faculty_email: f2, room: 'CLAB-104', max_slots: 45, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'CLAB-104',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSIT', course_code: 'CS 201LEC', section_code: 'BSIT 2-A',
      faculty_email: f3, room: 'CLAB-203', max_slots: 45, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '15:00', schedule_time_end: '17:00', schedule_room: 'CLAB-203',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSIT', course_code: 'CS 301LEC', section_code: 'BSIT 3-A',
      faculty_email: f1, room: 'CLAB-303', max_slots: 40, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'CLAB-303',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSIT', course_code: 'CS 302LEC', section_code: 'BSIT 3-B',
      faculty_email: f2, room: 'CLAB-304', max_slots: 40, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'CLAB-304',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 3. BSN (Nursing) ===
    // [CONFLICT FOR F2]: Row 16 (BSN 1-A) has Tue/Thu 10:00-12:00 with F2
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 101LEC', section_code: 'BSN 1-A',
      faculty_email: f2, room: 'NLAB-101', max_slots: 35, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'NLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 101LAB', section_code: 'BSN 1-A (LAB)',
      faculty_email: f2, room: 'NLAB-101', max_slots: 35, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'NLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 102', section_code: 'BSN 1-B',
      faculty_email: f3, room: 'NLAB-102', max_slots: 35, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'NLAB-102',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 201LEC', section_code: 'BSN 2-A',
      faculty_email: f1, room: 'NLAB-201', max_slots: 35, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'NLAB-201',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 202', section_code: 'BSN 2-B',
      faculty_email: f3, room: 'NLAB-202', max_slots: 35, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '08:00', schedule_time_end: '11:00', schedule_room: 'NLAB-202',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 301LEC', section_code: 'BSN 3-A',
      faculty_email: f1, room: 'NLAB-301', max_slots: 30, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'NLAB-301',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 303', section_code: 'BSN 3-B',
      faculty_email: f2, room: 'NLAB-302', max_slots: 30, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '14:00', schedule_time_end: '16:00', schedule_room: 'NLAB-302',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 401LEC', section_code: 'BSN 4-A',
      faculty_email: f3, room: 'NLAB-401', max_slots: 25, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'NLAB-401',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 4. BSN-ACC (Accelerated Nursing) ===
    {
      term_label: termLabel, program_code: 'BSN-ACC', course_code: 'NURS 101LEC', section_code: 'BSN-ACC 1-A',
      faculty_email: f1, room: 'NLAB-103', max_slots: 30, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '14:00', schedule_time_end: '17:00', schedule_room: 'NLAB-103',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSN-ACC', course_code: 'NURS 201LEC', section_code: 'BSN-ACC 2-A',
      faculty_email: f2, room: 'NLAB-203', max_slots: 30, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '08:00', schedule_time_end: '11:00', schedule_room: 'NLAB-203',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 5. BSMLS (Medical Laboratory Science) ===
    // [CONFLICT FOR F2]: Row 26 (BSMLS 1-A) ALSO has Tue/Thu 10:00-12:00 with F2! (Faculty Conflict 2)
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 101', section_code: 'BSMLS 1-A',
      faculty_email: f2, room: 'MLAB-101', max_slots: 40, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'MLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 102LEC', section_code: 'BSMLS 1-B',
      faculty_email: f3, room: 'MLAB-102', max_slots: 40, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'MLAB-102',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 201LEC', section_code: 'BSMLS 2-A',
      faculty_email: f1, room: 'MLAB-201', max_slots: 35, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '13:00', schedule_time_end: '15:00', schedule_room: 'MLAB-201',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 202LEC', section_code: 'BSMLS 2-B',
      faculty_email: f2, room: 'MLAB-202', max_slots: 35, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '08:00', schedule_time_end: '11:00', schedule_room: 'MLAB-202',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 301LEC', section_code: 'BSMLS 3-A',
      faculty_email: f3, room: 'MLAB-301', max_slots: 30, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'MLAB-301',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 401', section_code: 'BSMLS 4-A',
      faculty_email: f1, room: 'MLAB-401', max_slots: 25, status: 'Open',
      schedule_days: 'Saturday', schedule_time_start: '08:00', schedule_time_end: '12:00', schedule_room: 'MLAB-401',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 6. BSMT-HONORS (MedTech Honors) ===
    {
      term_label: termLabel, program_code: 'BSMT-HONORS', course_code: 'MEDT 101', section_code: 'BSMT 1-A',
      faculty_email: f2, room: 'MLAB-103', max_slots: 25, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '14:00', schedule_time_end: '16:00', schedule_room: 'MLAB-103',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'BSMT-HONORS', course_code: 'MEDT 201LEC', section_code: 'BSMT 2-A',
      faculty_email: f3, room: 'MLAB-203', max_slots: 25, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'MLAB-203',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 7. AB-POLSCI (Political Science) ===
    // [CONFLICT FOR F3]: Row 34 (AB-POLSCI 1-A) ALSO has Mon/Wed 13:00-15:00 with F3! (Faculty Conflict 3)
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 101', section_code: 'AB-POLSCI 1-A',
      faculty_email: f3, room: 'ROOM-301', max_slots: 45, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '13:00', schedule_time_end: '15:00', schedule_room: 'ROOM-301',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 102', section_code: 'AB-POLSCI 1-B',
      faculty_email: f1, room: 'ROOM-302', max_slots: 45, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'ROOM-302',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 201', section_code: 'AB-POLSCI 2-A',
      faculty_email: f2, room: 'ROOM-303', max_slots: 45, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'ROOM-303',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 202', section_code: 'AB-POLSCI 2-B',
      faculty_email: f3, room: 'ROOM-304', max_slots: 45, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '08:00', schedule_time_end: '11:00', schedule_room: 'ROOM-304',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 301', section_code: 'AB-POLSCI 3-A',
      faculty_email: f1, room: 'ROOM-305', max_slots: 40, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '14:00', schedule_time_end: '16:00', schedule_room: 'ROOM-305',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 401', section_code: 'AB-POLSCI 4-A',
      faculty_email: f2, room: 'ROOM-306', max_slots: 40, status: 'Open',
      schedule_days: 'Saturday', schedule_time_start: '09:00', schedule_time_end: '12:00', schedule_room: 'ROOM-306',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === 8. AB-PAG (Public Administration) ===
    {
      term_label: termLabel, program_code: 'AB-PAG', course_code: 'POLS 204', section_code: 'AB-PAG 1-A',
      faculty_email: f1, room: 'ROOM-401', max_slots: 40, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '15:00', schedule_time_end: '17:00', schedule_room: 'ROOM-401',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-PAG', course_code: 'POLS 103', section_code: 'AB-PAG 1-B',
      faculty_email: f3, room: 'ROOM-402', max_slots: 40, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'ROOM-402',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-PAG', course_code: 'POLS 203', section_code: 'AB-PAG 2-A',
      faculty_email: f2, room: 'ROOM-403', max_slots: 40, status: 'Open',
      schedule_days: 'Friday', schedule_time_start: '14:00', schedule_time_end: '17:00', schedule_room: 'ROOM-403',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    {
      term_label: termLabel, program_code: 'AB-PAG', course_code: 'POLS 206', section_code: 'AB-PAG 3-A',
      faculty_email: f1, room: 'ROOM-404', max_slots: 35, status: 'Open',
      schedule_days: 'Saturday', schedule_time_start: '13:00', schedule_time_end: '16:00', schedule_room: 'ROOM-404',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    {
      term_label: termLabel, program_code: 'AB-PAG', course_code: 'POLS 205', section_code: 'AB-PAG 4-A',
      faculty_email: f3, room: 'ROOM-405', max_slots: 35, status: 'Open',
      schedule_days: 'Sunday', schedule_time_start: '09:00', schedule_time_end: '12:00', schedule_room: 'ROOM-405',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === DUPLICATE RECORDS (Sections with duplicate code in same term, testing upsert) ===
    // Duplicate 1: Repeats section_code 'BSCS 1-A'
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'CS 101LEC', section_code: 'BSCS 1-A',
      faculty_email: f1, room: 'CLAB-101', max_slots: 42, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'CLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    // Duplicate 2: Repeats section_code 'BSN 1-A'
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 101LEC', section_code: 'BSN 1-A',
      faculty_email: f2, room: 'NLAB-101', max_slots: 38, status: 'Open',
      schedule_days: 'Tuesday, Thursday', schedule_time_start: '10:00', schedule_time_end: '12:00', schedule_room: 'NLAB-101',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    // Duplicate 3: Repeats section_code 'AB-POLSCI 1-A'
    {
      term_label: termLabel, program_code: 'AB-POLSCI', course_code: 'POLS 101', section_code: 'AB-POLSCI 1-A',
      faculty_email: f3, room: 'ROOM-301', max_slots: 48, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '13:00', schedule_time_end: '15:00', schedule_room: 'ROOM-301',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },

    // === INVALID RECORDS (Testing bulk import validation & error handling) ===
    // Invalid 1: Non-existent course code
    {
      term_label: termLabel, program_code: 'BSCS', course_code: 'INVALID_CS999', section_code: 'BSCS-ERR1',
      faculty_email: f1, room: 'CLAB-999', max_slots: 40, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'CLAB-999',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    // Invalid 2: Non-existent faculty email
    {
      term_label: termLabel, program_code: 'BSN', course_code: 'NURS 101LEC', section_code: 'BSN-ERR2',
      faculty_email: 'nonexistent_prof@university.edu', room: 'NLAB-999', max_slots: 40, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'NLAB-999',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    },
    // Invalid 3: Out of bounds max slots (9999)
    {
      term_label: termLabel, program_code: 'BSMLS', course_code: 'MEDT 101', section_code: 'BSMLS-ERR3',
      faculty_email: f2, room: 'MLAB-999', max_slots: 9999, status: 'Open',
      schedule_days: 'Monday, Wednesday', schedule_time_start: '08:00', schedule_time_end: '10:00', schedule_room: 'MLAB-999',
      preset_section: '', override_grading_schema: 'false', grading_periods: ''
    }
  ];

  const columnMap = [
    { key: 'term_label', label: 'Term Label' },
    { key: 'program_code', label: 'Program Code' },
    { key: 'course_code', label: 'Course Code' },
    { key: 'section_code', label: 'Section Code' },
    { key: 'faculty_email', label: 'Faculty Email' },
    { key: 'room', label: 'Room' },
    { key: 'max_slots', label: 'Max Slots' },
    { key: 'status', label: 'Status' },
    { key: 'schedule_days', label: 'Schedule Days' },
    { key: 'schedule_time_start', label: 'Schedule Start Time' },
    { key: 'schedule_time_end', label: 'Schedule End Time' },
    { key: 'schedule_room', label: 'Schedule Room' },
    { key: 'preset_section', label: 'Preset Section (Code or Label)' },
    { key: 'override_grading_schema', label: 'Override Grading Schema' },
    { key: 'grading_periods', label: 'Grading Periods Schema' }
  ];

  function escapeCsvCell(val) {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerRow = columnMap.map(col => escapeCsvCell(col.label)).join(',');
  const csvRows = [
    headerRow,
    ...sectionsData.map(row => columnMap.map(col => escapeCsvCell(row[col.key])).join(','))
  ];

  const csvContent = csvRows.join('\n');
  const filePath = path.resolve('sections_bulk_import.csv');
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`Successfully generated ${filePath} with exactly ${sectionsData.length} CSV rows.`);
}

generate50SectionsCsv().catch(err => {
  console.error(err);
  process.exit(1);
});
