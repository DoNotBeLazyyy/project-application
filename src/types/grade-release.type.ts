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
    blocked_count: number;
}

export interface ReleaseScheduleFormValues {
    release_at: string;
}