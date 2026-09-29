export interface GradeReleaseSchedule {
    grading_period_id: string;
    grading_period_name: string;
    sequence: number;
    start_date: string | null;
    end_date: string | null;
    release_at: string | null;
    total_grades: number;
    released_count: number;
    approved_count: number;
    draft_count: number;
    submitted_count?: number;
    blocked_count: number;
}

export interface ReleaseScheduleFormValues {
    release_at: string;
}

export type SectionGradeSubmissionStatus =
    | 'No Enrollees'
    | 'Not Calculated'
    | 'Draft'
    | 'Submitted'
    | 'Approved'
    | 'Released';

export interface SectionGradeSubmissionRow {
    section_id: string;
    section_code: string;
    room: string | null;
    course_id: string;
    course_code: string;
    course_title: string;
    faculty_id: string | null;
    faculty_name: string;
    faculty_email: string | null;
    enrolled_count: number;
    graded_count: number;
    submitted_count: number;
    approved_count: number;
    released_count: number;
    submission_status: SectionGradeSubmissionStatus;
    last_submitted_at: string | null;
}

export interface SectionGradeSheetStudent {
    enrollment_id: string;
    student_number: string;
    full_name: string;
    raw_grade: number | null;
    final_grade: number | null;
    transmuted_grade: number | null;
    status: string;
    special_grade: string | null;
    remarks: string | null;
    is_evaluation_completed: boolean;
}

export interface ApproveAndReleaseResult {
    success: boolean;
    section_id?: string;
    grading_period_id?: string;
    approved: number;
    released: number;
    blocked_by_evaluation: number;
    message: string;
}