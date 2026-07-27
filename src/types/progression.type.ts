export type ProgressionBlockerCode = 'INACTIVE' | 'NO_PROGRAM' | 'PROGRAM_COMPLETE';

export type ProgressionIssueCode = 'ALREADY_TAKEN' | 'NO_SECTION' | 'SCHEDULE_CONFLICT';

export interface ProgressionPlannedCourse {
    course_id: string;
    course_code: string;
    course_title: string;
    total_units: number;
    section_id: string | null;
    section_code: string | null;
    issue_code: ProgressionIssueCode | null;
    issue_message: string | null;
}

export interface ProgressionPreviewRow {
    student_id: string;
    student_number: string;
    student_name: string;
    program_code: string | null;
    current_year_level: number;
    proposed_year_level: number;
    is_promoted: boolean;
    blocker_code: ProgressionBlockerCode | null;
    blocker_message: string | null;
    planned_courses: ProgressionPlannedCourse[];
    enrollable_count: number;
    issue_count: number;
}

export interface ProgressionPreview {
    success: boolean;
    message?: string;
    term_id: string;
    term_label: string;
    total_count: number;
    promote_count: number;
    blocked_count: number;
    enrollable_count: number;
    rows: ProgressionPreviewRow[];
}

export interface ProgressionRunRow {
    student_number: string;
    student_name: string;
    from_year_level: number;
    to_year_level: number;
    is_promoted: boolean;
    enrolled_count: number;
    issues: string[];
}

export interface ProgressionRunResult {
    success: boolean;
    message: string;
    term_label: string;
    total_count: number;
    promoted_count: number;
    blocked_count: number;
    enrolled_count: number;
    results: ProgressionRunRow[];
}

export interface ProgressionCohortFilters {
    program_ids: string[];
    year_levels: string[];
}

export interface ProgressionFormValues extends ProgressionCohortFilters {
    term_id: string;
    auto_enroll: boolean;
    reason: string;
}