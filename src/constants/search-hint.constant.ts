export const SEARCH_HINTS: Record<string, readonly string[]> = {
    academicThresholds: ['Threshold code', 'Threshold label', 'Category'],
    announcements: ['Title', 'Content'],
    auditLogs: [
        'Changed by name',
        'Student name',
        'Field changed',
        'Change reason'
    ],
    courses: ['Course code', 'Course title'],
    courseTypes: ['Course type name', 'Course type code'],
    departments: ['Department code', 'Department name'],
    enrollmentStudents: [
        'Student number',
        'First name',
        'Last name',
        'Email'
    ],
    evaluationTemplates: ['Template title', 'Description'],
    events: ['Title', 'Description', 'Location'],
    facultyLoad: [
        'Faculty first name',
        'Faculty last name',
        'Faculty email'
    ],
    mySections: ['Section code', 'Course code', 'Course title'],
    mySubjects: ['Section code', 'Course code', 'Course title'],
    programLevels: ['Level name', 'Level code'],
    programs: ['Program code', 'Program name'],
    roles: ['Role name', 'Role code'],
    scheduleConflicts: [
        'Faculty name',
        'Subject',
        'Section code'
    ],
    schoolYears: ['School year code', 'School year label'],
    sectionStudents: [
        'Student number',
        'First name',
        'Last name',
        'Email'
    ],
    sections: ['Section code', 'Course code', 'Course title'],
    specialGrades: ['Code', 'Label', 'Description'],
    students: [
        'Student number',
        'First name',
        'Last name',
        'Email'
    ],
    termTypes: ['Term type name', 'Term type code'],
    terms: ['School year label', 'Term type name'],
    users: ['First name', 'Last name', 'Email']
};