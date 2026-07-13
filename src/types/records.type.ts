import { StudentStatus } from '@type/student.type';

export type CurriculumCourseStatus = 'Completed' | 'Failed' | 'In Progress' | 'Not Taken';

export type LifecycleEventType = 'Status Change' | 'Program Shift';

export interface RecordStudent {
    id: string;
    student_number: string;
    full_name: string;
    email?: string;
    year_level: number;
    status: StudentStatus;
    admitted_at: string | null;
}

export interface RecordProgram {
    id: string;
    code: string;
    name: string;
    total_units: number | null;
    years_duration?: number;
}

export interface RecordInstitution {
    name?: string;
    short_name?: string;
    address?: string;
    email?: string;
    phone?: string;
    logo_url?: string;
}

export interface CurriculumCourse {
    curriculum_map_id: string;
    course_id: string;
    course_code: string;
    course_title: string;
    units: number;
    is_elective: boolean;
    status: CurriculumCourseStatus;
    grade: number | null;
    special_grade: string | null;
    taken_label: string | null;
}

export interface CurriculumTerm {
    term_type_id: string | null;
    term_type_label: string;
    courses: CurriculumCourse[];
}

export interface CurriculumYearLevel {
    year_level: number;
    terms: CurriculumTerm[];
}

export interface CurriculumSummary {
    required_units: number;
    earned_units: number;
    in_progress_units: number;
    remaining_units: number;
    completion_pct: number;
    total_courses: number;
    completed_courses: number;
    failed_courses: number;
    in_progress_courses: number;
    cumulative_gwa: number | null;
}

export interface CurriculumAudit {
    success: boolean;
    message?: string;
    student: RecordStudent;
    program: RecordProgram;
    summary: CurriculumSummary;
    year_levels: CurriculumYearLevel[];
}

export interface TranscriptCourse {
    enrollment_id: string;
    course_code: string;
    course_title: string;
    units: number;
    grade: number | null;
    raw_grade: number | null;
    special_grade: string | null;
    is_passing: boolean | null;
}

export interface TranscriptTerm {
    term_id: string;
    term_label: string;
    school_year_label: string;
    courses: TranscriptCourse[];
    earned_units: number;
    attempted_units: number;
    term_gwa: number | null;
}

export interface StudentTranscript {
    success: boolean;
    message?: string;
    is_official: boolean;
    generated_at: string;
    student: RecordStudent;
    program: RecordProgram | null;
    institution: RecordInstitution;
    terms: TranscriptTerm[];
    summary: {
        total_units_earned: number;
        cumulative_gwa: number | null;
    };
}

export interface StudentLifecycleEvent {
    id: string;
    event_type: LifecycleEventType;
    from_status: StudentStatus | null;
    to_status: StudentStatus | null;
    from_program_code: string | null;
    to_program_code: string | null;
    from_year_level: number | null;
    to_year_level: number | null;
    reason: string | null;
    effective_date: string;
    created_at: string;
    created_by_name: string | null;
}

export interface StatusChangeFormValues {
    status: StudentStatus | '';
    effective_date: string;
    reason: string;
}

export interface ProgramShiftFormValues {
    program_id: string;
    year_level: string;
    effective_date: string;
    reason: string;
}