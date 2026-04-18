export type EnrollmentStatus = 'Enrolled' | 'Dropped' | 'Withdrawn' | 'Completed' | 'Failed' | 'Incomplete';

export interface EnrollmentListRow {
    id: string;
    student_id: string;
    student_number: string;
    student_name: string;
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    status: EnrollmentStatus;
    enrolled_at: string;
    final_grade: number | null;
    is_grade_visible: boolean;
    total_count: number;
}

export interface EnrollmentFormValues {
    student_id: string;
    section_id: string;
    status: EnrollmentStatus;
}

export interface EnrollmentFilterValues {
    term_ids: string[];
    section_ids: string[];
    statuses: EnrollmentStatus[];
}

export interface EnrollmentBulkRow {
    student_number: string;
    term_label: string;
    section_code: string;
}