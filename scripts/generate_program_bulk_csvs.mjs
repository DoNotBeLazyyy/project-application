import fs from 'fs';
import path from 'path';

// Define 8 programs across 4 departments (2 programs per department)
// Department codes in DB: CITE, BSN, MDTCH, AB POLSCI
// Program level code in DB: BACHELOR
// Term type codes in DB: 1ST_SEM, 2ND_SEM, SUMMER

const programsData = [
  // =========================================================
  // DEPARTMENT 1: CITE (College of Information Technology)
  // =========================================================
  {
    code: 'BSCS',
    name: 'Bachelor of Science in Computer Science',
    department_code: 'CITE',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '145',
    description: 'Computer Science degree specializing in algorithm design, software architecture, and artificial intelligence.',
    is_active: 'true',
    override_grading_schema: 'true', // Custom grading schema 1
    grading_periods: 'Prelim:25,Midterm:25,SemiFinal:25,Final:25',
    curriculum: [
      { course_code: 'GCAS 01', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'GCAS 03', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'GCAS 07', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'CS 101LEC', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false', custom_lecture_units: '3.0' }, // Customized lecture unit for lecture type!
      { course_code: 'CS 101LAB', year_level: '1', term_type_code: '1ST_SEM', sequence: '5', is_elective: 'false' },
      { course_code: 'GCAS 15', year_level: '1', term_type_code: '1ST_SEM', sequence: '6', is_elective: 'false' },
      { course_code: 'GCAS 19', year_level: '1', term_type_code: '1ST_SEM', sequence: '7', is_elective: 'false' },

      { course_code: 'GCAS 02', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'GCAS 04', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'GCAS 08', year_level: '1', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'CS 102LEC', year_level: '1', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'CS 102LAB', year_level: '1', term_type_code: '2ND_SEM', sequence: '5', is_elective: 'false' },
      { course_code: 'GCAS 16', year_level: '1', term_type_code: '2ND_SEM', sequence: '6', is_elective: 'false' },
      { course_code: 'GCAS 20', year_level: '1', term_type_code: '2ND_SEM', sequence: '7', is_elective: 'false' },

      { course_code: 'GCAS 05', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'GCAS 06', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'CS 201LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'CS 201LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'GCAS 17', year_level: '2', term_type_code: '1ST_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'GCAS 09', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'CS 202', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'CS 301LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'CS 301LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'GCAS 18', year_level: '2', term_type_code: '2ND_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'CS 302LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'CS 302LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'CS 303', year_level: '3', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'CS 304', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },

      { course_code: 'CS 401', year_level: '4', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },

      { course_code: 'CS 402', year_level: '4', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' }
    ]
  },
  {
    code: 'BSIT',
    name: 'Bachelor of Science in Information Technology',
    department_code: 'CITE',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '140',
    description: 'Information Technology program covering network administration, web engineering, and enterprise systems.',
    is_active: 'true',
    override_grading_schema: 'false', // Standard schema
    grading_periods: '',
    curriculum: [
      { course_code: 'GCAS 01', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'GCAS 03', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'GCAS 07', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'CS 101LEC', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'CS 101LAB', year_level: '1', term_type_code: '1ST_SEM', sequence: '5', is_elective: 'false' },
      { course_code: 'GCAS 15', year_level: '1', term_type_code: '1ST_SEM', sequence: '6', is_elective: 'false' },

      { course_code: 'GCAS 02', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'GCAS 04', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'CS 102LEC', year_level: '1', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'CS 102LAB', year_level: '1', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'GCAS 16', year_level: '1', term_type_code: '2ND_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'CS 301LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'CS 301LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'CS 302LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'CS 302LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },

      { course_code: 'CS 303', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'CS 304', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' }
    ]
  },

  // =========================================================
  // DEPARTMENT 2: BSN (Bachelor of Science in Nursing)
  // =========================================================
  {
    code: 'BSN',
    name: 'Bachelor of Science in Nursing',
    department_code: 'BSN',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '168',
    description: 'Comprehensive 4-year nursing degree focusing on clinical practice, patient care, and healthcare management.',
    is_active: 'true',
    override_grading_schema: 'true', // Custom grading schema 2
    grading_periods: 'Prelim:30,Midterm:30,Final:40',
    curriculum: [
      { course_code: 'NURS 101LEC', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false', custom_lecture_units: '4.0' }, // Customized lecture unit!
      { course_code: 'NURS 101LAB', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 102', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'NURS 103', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'NURS 104LEC', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 104LAB', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 202', year_level: '1', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'NURS 203', year_level: '1', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'NURS 201LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 201LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 204LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'NURS 204LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'NURS 205LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 205LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },

      { course_code: 'NURS 301LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 301LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 303', year_level: '3', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'NURS 302LEC', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 302LAB', year_level: '3', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 304LEC', year_level: '3', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'NURS 304LAB', year_level: '3', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'NURS 305', year_level: '3', term_type_code: '2ND_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'NURS 306', year_level: '4', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 401LEC', year_level: '4', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 401LAB', year_level: '4', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'NURS 402', year_level: '4', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'NURS 405', year_level: '4', term_type_code: '1ST_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'NURS 403', year_level: '4', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 404', year_level: '4', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 406', year_level: '4', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' }
    ]
  },
  {
    code: 'BSN-ACC',
    name: 'Accelerated Bachelor of Science in Nursing',
    department_code: 'BSN',
    program_level_code: 'BACHELOR',
    years_duration: '3',
    total_units: '150',
    description: 'Fast-track nursing curriculum designed for degree holders pursuing healthcare careers.',
    is_active: 'true',
    override_grading_schema: 'false', // Standard schema
    grading_periods: '',
    curriculum: [
      { course_code: 'NURS 101LEC', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 101LAB', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 102', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'NURS 103', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'NURS 104LEC', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 104LAB', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 202', year_level: '1', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'NURS 201LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 201LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 205LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 205LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },

      { course_code: 'NURS 301LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 301LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'NURS 403', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'NURS 404', year_level: '3', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' }
    ]
  },

  // =========================================================
  // DEPARTMENT 3: MDTCH (Medical Technology)
  // =========================================================
  {
    code: 'BSMLS',
    name: 'Bachelor of Science in Medical Laboratory Science',
    department_code: 'MDTCH',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '160',
    description: 'Professional degree in diagnostic pathology, clinical biochemistry, hematology, and blood banking.',
    is_active: 'true',
    override_grading_schema: 'true', // Custom grading schema 3
    grading_periods: 'Midterm:50,Final:50',
    curriculum: [
      { course_code: 'MEDT 101', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false', custom_lecture_units: '3.5' }, // Customized lecture unit!
      { course_code: 'MEDT 102LEC', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 102LAB', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'MEDT 103', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'MEDT 104', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 201LEC', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 201LAB', year_level: '1', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'MEDT 202LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 202LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 203LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'MEDT 203LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'MEDT 204LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 204LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 205LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'MEDT 205LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'MEDT 301LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 301LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 302LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'MEDT 302LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'MEDT 303LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '5', is_elective: 'false' },
      { course_code: 'MEDT 303LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '6', is_elective: 'false' },

      { course_code: 'MEDT 304', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 305', year_level: '3', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 306', year_level: '3', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'MEDT 401', year_level: '4', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 403', year_level: '4', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 404', year_level: '4', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'MEDT 405', year_level: '4', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'MEDT 402', year_level: '4', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 406', year_level: '4', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' }
    ]
  },
  {
    code: 'BSMT-HONORS',
    name: 'Bachelor of Science in Medical Technology (Honors)',
    department_code: 'MDTCH',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '165',
    description: 'Honors curriculum in Medical Technology with advanced molecular diagnostics research modules.',
    is_active: 'true',
    override_grading_schema: 'false', // Standard schema
    grading_periods: '',
    curriculum: [
      { course_code: 'MEDT 101', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 102LEC', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 102LAB', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'MEDT 103', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'MEDT 201LEC', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 201LAB', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 204LEC', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 204LAB', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 205LEC', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 205LAB', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },

      { course_code: 'MEDT 301LEC', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 301LAB', year_level: '3', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'MEDT 403', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },

      { course_code: 'MEDT 401', year_level: '4', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'MEDT 402', year_level: '4', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' }
    ]
  },

  // =========================================================
  // DEPARTMENT 4: AB POLSCI (Bachelor of Arts in Political Science)
  // =========================================================
  {
    code: 'AB-POLSCI',
    name: 'Bachelor of Arts in Political Science',
    department_code: 'AB POLSCI',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '142',
    description: 'Degree program analyzing political behavior, constitutional law, international relations, and public policy.',
    is_active: 'true',
    override_grading_schema: 'true', // Custom grading schema 4
    grading_periods: 'Prelim:30,Midterm:30,Final:40',
    curriculum: [
      { course_code: 'POLS 101', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false', custom_lecture_units: '4.0' }, // Customized lecture unit!
      { course_code: 'POLS 102', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 103', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'GCAS 01', year_level: '1', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'GCAS 03', year_level: '1', term_type_code: '1ST_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'POLS 104', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 201', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 203', year_level: '1', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'GCAS 02', year_level: '1', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },
      { course_code: 'GCAS 04', year_level: '1', term_type_code: '2ND_SEM', sequence: '5', is_elective: 'false' },

      { course_code: 'POLS 202', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 204', year_level: '2', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 205', year_level: '2', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'POLS 206', year_level: '2', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'POLS 301', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 302', year_level: '2', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 303', year_level: '2', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'POLS 304', year_level: '2', term_type_code: '2ND_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'POLS 305', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 306', year_level: '3', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 307', year_level: '3', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'POLS 308', year_level: '3', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'POLS 401', year_level: '3', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 404', year_level: '3', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 405', year_level: '3', term_type_code: '2ND_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'POLS 402', year_level: '4', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 403', year_level: '4', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 406', year_level: '4', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },
      { course_code: 'POLS 407', year_level: '4', term_type_code: '1ST_SEM', sequence: '4', is_elective: 'false' },

      { course_code: 'POLS 408', year_level: '4', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 410', year_level: '4', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' }
    ]
  },
  {
    code: 'AB-PAG',
    name: 'Bachelor of Arts in Public Administration and Governance',
    department_code: 'AB POLSCI',
    program_level_code: 'BACHELOR',
    years_duration: '4',
    total_units: '140',
    description: 'Degree focusing on civil service administration, public policy, local governance, and administrative law.',
    is_active: 'true',
    override_grading_schema: 'false', // Standard schema
    grading_periods: '',
    curriculum: [
      { course_code: 'POLS 101', year_level: '1', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 103', year_level: '1', term_type_code: '1ST_SEM', sequence: '2', is_elective: 'false' },
      { course_code: 'POLS 204', year_level: '1', term_type_code: '1ST_SEM', sequence: '3', is_elective: 'false' },

      { course_code: 'POLS 104', year_level: '1', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 305', year_level: '1', term_type_code: '2ND_SEM', sequence: '2', is_elective: 'false' },

      { course_code: 'POLS 308', year_level: '2', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 403', year_level: '2', term_type_code: '2ND_SEM', sequence: '1', is_elective: 'false' },
      { course_code: 'POLS 411', year_level: '3', term_type_code: '1ST_SEM', sequence: '1', is_elective: 'false' }
    ]
  }
];

function buildProgramsCsv() {
  const headers = [
    'Code',
    'Name',
    'Department Code',
    'Program Level Code',
    'Years Duration',
    'Total Units',
    'Description',
    'Is Active',
    'Override Grading Schema',
    'Grading Periods',
    'Course Code',
    'Year Level',
    'Term Type Code',
    'School Year Code',
    'Sequence',
    'Is Elective'
  ];

  const rows = [headers.join(',')];

  for (const prog of programsData) {
    for (const curr of prog.curriculum) {
      const line = [
        `"${prog.code}"`,
        `"${prog.name}"`,
        `"${prog.department_code}"`,
        `"${prog.program_level_code}"`,
        prog.years_duration,
        prog.total_units,
        `"${prog.description.replace(/"/g, '""')}"`,
        prog.is_active,
        prog.override_grading_schema,
        `"${prog.grading_periods}"`,
        `"${curr.course_code}"`,
        curr.year_level,
        `"${curr.term_type_code}"`,
        '""', // school_year_code
        curr.sequence,
        curr.is_elective
      ];
      rows.push(line.join(','));
    }
  }

  const csvContent = rows.join('\n');
  const filePath = path.resolve(process.cwd(), 'programs_bulk_import.csv');
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`Generated Program Management Bulk Import CSV: ${filePath}`);
}

function buildCurriculumMapsCsv() {
  const headers = [
    'Course Code',
    'Year Level',
    'Term Type Code',
    'Lecture Units',
    'Laboratory Units',
    'Sequence',
    'Is Elective'
  ];

  const rows = [headers.join(',')];

  // Pick curriculum from BSCS as demonstration of standalone curriculum map import with customized lecture unit
  for (const prog of programsData) {
    for (const curr of prog.curriculum) {
      const line = [
        `"${curr.course_code}"`,
        curr.year_level,
        `"${curr.term_type_code}"`,
        curr.custom_lecture_units ? curr.custom_lecture_units : '', // Customized unit for lecture type!
        '', // laboratory_units
        curr.sequence,
        curr.is_elective
      ];
      rows.push(line.join(','));
    }
  }

  const csvContent = rows.join('\n');
  const filePath = path.resolve(process.cwd(), 'curriculum_maps_bulk_import.csv');
  fs.writeFileSync(filePath, csvContent, 'utf8');
  console.log(`Generated Curriculum Map Bulk Import CSV: ${filePath}`);
}

buildProgramsCsv();
buildCurriculumMapsCsv();
