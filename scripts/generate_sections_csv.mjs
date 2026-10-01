import fs from 'fs';
import path from 'path';
import { runQuery } from './query.mjs';

async function generateSectionsCsv() {
  // Fetch active term
  const termRes = await runQuery(`
    SELECT (tt.label || ' - ' || sy.label) as full_label
    FROM terms t
    JOIN term_types tt ON tt.id = t.term_type_id
    JOIN school_years sy ON sy.id = t.school_year_id
    WHERE sy.is_active = true AND t.deleted_at IS NULL
    LIMIT 1
  `);
  
  const termLabel = termRes.rows[0]?.full_label || '1st Semester - Academic Year 2025-2026';
  
  // Fetch faculty emails
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
    // --- CITE (Computer Studies) ---
    {
      term_label: termLabel,
      program_code: 'BSCS',
      course_code: 'CS 101LEC',
      section_code: 'BSCS 1-A',
      faculty_email: f1,
      room: 'CLAB-101',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '08:00',
      schedule_time_end: '10:00',
      schedule_room: 'CLAB-101',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSCS',
      course_code: 'CS 101LAB',
      section_code: 'BSCS 1-A (LAB)',
      faculty_email: f1,
      room: 'CLAB-101',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Friday',
      schedule_time_start: '08:00',
      schedule_time_end: '11:00',
      schedule_room: 'CLAB-101',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSCS',
      course_code: 'CS 102LEC',
      section_code: 'BSCS 1-B',
      faculty_email: f2,
      room: 'CLAB-102',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Tuesday, Thursday',
      schedule_time_start: '10:00',
      schedule_time_end: '12:00',
      schedule_room: 'CLAB-102',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSCS',
      course_code: 'CS 201LEC',
      section_code: 'BSCS 2-A',
      faculty_email: f3,
      room: 'CLAB-201',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '13:00',
      schedule_time_end: '15:00',
      schedule_room: 'CLAB-201',
      preset_section: '',
      override_grading_schema: 'true',
      grading_periods: 'Prelim:30(Quizzes:25,Class Standing:35,Major Exam:40); Midterm:30(Quizzes:25,Class Standing:35,Major Exam:40); Final:40(Quizzes:25,Class Standing:35,Major Exam:40)'
    },
    {
      term_label: termLabel,
      program_code: 'BSIT',
      course_code: 'CS 101LEC',
      section_code: 'BSIT 1-A',
      faculty_email: f1,
      room: 'CLAB-103',
      max_slots: 45,
      status: 'Open',
      schedule_days: 'Tuesday, Thursday',
      schedule_time_start: '08:00',
      schedule_time_end: '10:00',
      schedule_room: 'CLAB-103',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSIT',
      course_code: 'CS 102LEC',
      section_code: 'BSIT 1-B',
      faculty_email: f2,
      room: 'CLAB-104',
      max_slots: 45,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '10:00',
      schedule_time_end: '12:00',
      schedule_room: 'CLAB-104',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },

    // --- BSN (Nursing) ---
    {
      term_label: termLabel,
      program_code: 'BSN',
      course_code: 'NURS 101LEC',
      section_code: 'BSN 1-A',
      faculty_email: f2,
      room: 'NLAB-101',
      max_slots: 35,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '08:00',
      schedule_time_end: '11:00',
      schedule_room: 'NLAB-101',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSN',
      course_code: 'NURS 101LAB',
      section_code: 'BSN 1-A (LAB)',
      faculty_email: f2,
      room: 'NLAB-101',
      max_slots: 35,
      status: 'Open',
      schedule_days: 'Friday',
      schedule_time_start: '13:00',
      schedule_time_end: '16:00',
      schedule_room: 'NLAB-101',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSN',
      course_code: 'NURS 102LEC',
      section_code: 'BSN 1-B',
      faculty_email: f3,
      room: 'NLAB-102',
      max_slots: 35,
      status: 'Open',
      schedule_days: 'Tuesday, Thursday',
      schedule_time_start: '09:00',
      schedule_time_end: '12:00',
      schedule_room: 'NLAB-102',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSN-ACC',
      course_code: 'NURS 201LEC',
      section_code: 'BSN-ACC 1-A',
      faculty_email: f1,
      room: 'NLAB-201',
      max_slots: 30,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '13:00',
      schedule_time_end: '16:00',
      schedule_room: 'NLAB-201',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },

    // --- MDTCH (Medical Technology) ---
    {
      term_label: termLabel,
      program_code: 'BSMLS',
      course_code: 'MT 101LEC',
      section_code: 'BSMLS 1-A',
      faculty_email: f3,
      room: 'MLAB-101',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '09:00',
      schedule_time_end: '11:00',
      schedule_room: 'MLAB-101',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSMLS',
      course_code: 'MT 102LEC',
      section_code: 'BSMLS 1-B',
      faculty_email: f2,
      room: 'MLAB-102',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Tuesday, Thursday',
      schedule_time_start: '13:00',
      schedule_time_end: '15:00',
      schedule_room: 'MLAB-102',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'BSMT-HONORS',
      course_code: 'MT 201LEC',
      section_code: 'BSMT 1-A',
      faculty_email: f1,
      room: 'MLAB-201',
      max_slots: 25,
      status: 'Open',
      schedule_days: 'Friday',
      schedule_time_start: '08:00',
      schedule_time_end: '12:00',
      schedule_room: 'MLAB-201',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },

    // --- AB POLSCI (Political Science) ---
    {
      term_label: termLabel,
      program_code: 'AB-POLSCI',
      course_code: 'POL 101',
      section_code: 'AB-POLSCI 1-A',
      faculty_email: f3,
      room: 'ROOM-301',
      max_slots: 45,
      status: 'Open',
      schedule_days: 'Monday, Wednesday',
      schedule_time_start: '10:00',
      schedule_time_end: '12:00',
      schedule_room: 'ROOM-301',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'AB-POLSCI',
      course_code: 'POL 102',
      section_code: 'AB-POLSCI 1-B',
      faculty_email: f2,
      room: 'ROOM-302',
      max_slots: 45,
      status: 'Open',
      schedule_days: 'Tuesday, Thursday',
      schedule_time_start: '14:00',
      schedule_time_end: '16:00',
      schedule_room: 'ROOM-302',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    },
    {
      term_label: termLabel,
      program_code: 'AB-PAG',
      course_code: 'PAG 101',
      section_code: 'AB-PAG 1-A',
      faculty_email: f1,
      room: 'ROOM-303',
      max_slots: 40,
      status: 'Open',
      schedule_days: 'Friday',
      schedule_time_start: '13:00',
      schedule_time_end: '16:00',
      schedule_room: 'ROOM-303',
      preset_section: '',
      override_grading_schema: 'false',
      grading_periods: ''
    }
  ];

  const headers = [
    'term_label',
    'program_code',
    'course_code',
    'section_code',
    'faculty_email',
    'room',
    'max_slots',
    'status',
    'schedule_days',
    'schedule_time_start',
    'schedule_time_end',
    'schedule_room',
    'preset_section',
    'override_grading_schema',
    'grading_periods'
  ];

  function escapeCsvCell(val) {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csvRows = [
    headers.join(','),
    ...sectionsData.map(row => headers.map(h => escapeCsvCell(row[h])).join(','))
  ];

  const csvContent = csvRows.join('\n');
  const filePath = path.resolve('sections_bulk_import.csv');
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`Successfully generated ${filePath} with ${sectionsData.length} section rows.`);
}

generateSectionsCsv().catch(err => {
  console.error(err);
  process.exit(1);
});
