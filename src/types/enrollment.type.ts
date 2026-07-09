export type EnrollmentStatus = 'Enrolled' | 'Dropped' | 'Withdrawn' | 'Completed' | 'Failed' | 'Incomplete';

export type EnrollmentState = 'Enrolled' | 'Not Enrolled';

export type StudentStatus = 'Active' | 'Inactive' | 'LOA' | 'Graduated' | 'Expelled';

export interface EnrollmentTargetTerm {
    id: string;
    label: string;
    status: string;
}

export interface EnrollmentStudentRow {
    id: string;
    student_number: string;
    student_name: string;
    email: string;
    year_level: number;
    status: StudentStatus;
    program_id: string | null;
    program_code: string;
    program_name: string;
    enrolled_count: number;
    enrolled_units: number;
    enrollment_state: EnrollmentState;
    total_count: number;
}

export interface EnrollmentStudentFilterValues {
    program_ids: string[];
    year_levels: string[];
    statuses: StudentStatus[];
    enrollment_states: EnrollmentState[];
}

export interface CurrentLoadRow {
    enrollment_id: string;
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    units: number;
    status: EnrollmentStatus;
    is_conflict_authorized: boolean;
    conflict_reason: string | null;
    faculty_name: string;
    schedule_label: string;
}

export interface EnrollmentStudentDetail {
    id: string;
    student_number: string;
    student_name: string;
    email: string;
    year_level: number;
    status: StudentStatus;
    admitted_at: string | null;
    program_id: string | null;
    program_code: string;
    program_name: string;
    term_id: string | null;
    term_label: string;
    current_load: CurrentLoadRow[];
}

export interface EligibleSectionRow {
    section_id: string;
    section_code: string;
    section_status: string;
    course_id: string;
    course_code: string;
    course_title: string;
    units: number;
    faculty_name: string;
    room: string;
    max_slots: number;
    slots_taken: number;
    is_full: boolean;
    curriculum_year_level: number;
    is_elective: boolean;
    is_recommended: boolean;
    conflict_with: string | null;
    unmet_prerequisites: string | null;
    schedule_label: string;
}

export interface BulkEnrollStudentParams {
    student_id: string;
    section_ids: string[];
    allow_conflict: boolean;
    conflict_reason: string;
    override_prerequisites: boolean;
}

export interface BulkEnrollSectionError {
    section_id: string;
    code: string;
    message: string;
}

export interface BulkEnrollStudentResult {
    success: boolean;
    message: string;
    enrolled_count: number;
    errors: BulkEnrollSectionError[];
}

export interface EnrollmentBulkRow {
    student_number: string;
    term_label: string;
    section_codes: string;
    allow_conflict: string;
    override_prerequisites: string;
    conflict_reason: string;
}