/**
 * Route path segment to friendly breadcrumb label dictionary.
 */
export const BREADCRUMB_SEGMENT_LABELS: Record<string, string> = {
    // Root Roles (Base route displayed as Home)
    admin: 'Home',
    dean: 'Home',
    faculty: 'Home',
    registrar: 'Home',
    student: 'Home',

    // Admin Pages
    users: 'User Accounts',
    'school-years': 'School Years',
    'grade-configurations': 'Grade Configurations',
    transmutation: 'Transmutation Scale',
    'grading-periods': 'Grading Periods',
    'special-grades': 'Special Grades',
    evaluations: 'Faculty Evaluations',
    roles: 'Role Matrix',
    terms: 'Terms',
    'term-types': 'Term Types',
    'academic-thresholds': 'Academic Thresholds',
    'audit-logs': 'Audit Logs',
    'system-settings': 'System Settings',

    // Dean Pages
    'program-level-management': 'Program Levels',
    'course-type-management': 'Course Types',
    'department-management': 'Departments',
    'program-management': 'Programs',
    'course-management': 'Courses',
    'curriculum-map-management': 'Curriculum Maps',
    'section-management': 'Sections',
    'faculty-load': 'Faculty Loading',
    'schedule-conflicts': 'Schedule Conflicts',

    // Faculty Pages
    sections: 'My Sections',
    assessments: 'Assessments',
    builder: 'Assessment Builder',
    submissions: 'Submissions',
    analysis: 'Item Analysis',
    integrity: 'Integrity Report',
    rubrics: 'Rubrics',

    // Registrar Pages
    'enrollment-management': 'Section Enrollments',
    'grade-release': 'Grade Release',
    'student-verification': 'Student Profile Verification',
    'registrar-logs': 'Registrar Logs',

    // Student Pages
    schedule: 'Class Schedule',
    subjects: 'My Subjects',
    grade: 'Grades & Transcripts',
    curriculum: 'Curriculum Audit',
    insight: 'Academic Insights',
    result: 'Results Breakdown',

    // Shared Pages
    'announcement-management': 'Announcements & Events',
    'event-management': 'Announcements & Events',
    profile: 'My Profile',
    new: 'New'
};

/**
 * Static fallback labels for common parameterized segments.
 */
export const BREADCRUMB_PARAM_FALLBACKS: Record<string, string> = {
    sectionId: 'Section Workspace',
    assessmentId: 'Assessment',
    enrollmentId: 'Subject Portal',
    studentId: 'Student Detail',
    facultyId: 'Faculty Loading Detail',
    rubricId: 'Rubric Builder',
    gradingPeriodId: 'Grading Period',
    programId: 'Program & Curriculum',
    id: 'Detail View'
};