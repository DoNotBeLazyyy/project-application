import { SectionStatus } from '@type/section.type';

export interface GradingPeriodStat {
    grading_period_id: string;
    grading_period_name: string;
    sequence: number;
    total_grades: number;
    released_count: number;
    approved_count: number;
    draft_count: number;
}

export interface GradeReleaseListRow {
    id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    faculty_name: string | null;
    term_label: string;
    section_status: SectionStatus;
    grading_periods: GradingPeriodStat[] | null;
    total_count: number;
}

export interface GradeReleaseFilterValues {
    term_id: string;
}