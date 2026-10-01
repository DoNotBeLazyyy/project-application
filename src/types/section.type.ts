export type SectionStatus = 'Open' | 'Full' | 'Ongoing' | 'Closed' | 'Cancelled';

export interface SectionListRow {
    id: string;
    section_code: string;
    term_id: string;
    term_label: string;
    course_id: string;
    course_code: string;
    course_title: string;
    faculty_id: string | null;
    faculty_name: string | null;
    room: string | null;
    max_slots: number;
    /** Seats currently taken. Optional: only present when the list RPC aggregates it. */
    enrolled_count?: number;
    status: SectionStatus;
    is_active_academic_year?: boolean;
    total_count: number;
}

export interface SectionGradingComponentOverride {
    id?: string;
    name: string;
    weight: number;
}

export interface SectionGradingPeriodOverride {
    id?: string;
    name: string;
    sequence: number;
    weight?: number;
    components: SectionGradingComponentOverride[];
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface SectionScheduleSlot {
    id?: string;
    day_of_week: DayOfWeek;
    time_start: string;
    time_end: string;
    room?: string | null;
}

export interface SectionScheduleBlock {
    id?: string;
    days: DayOfWeek[];
    time_start: string;
    time_end: string;
    room?: string;
}

export interface SectionFormValues {
    term_id: string;
    course_id: string;
    faculty_id: string;
    section_code?: string;
    room: string;
    max_slots: string;
    status: SectionStatus;
    is_active_academic_year?: boolean;
    override_grading_schema?: boolean;
    grading_override_mode?: 'copy_section' | 'custom';
    source_section_id?: string;
    grading_periods?: SectionGradingPeriodOverride[];
    schedules?: SectionScheduleBlock[];
}

export interface SectionFilterValues {
    term_ids: string[];
    course_ids: string[];
    statuses: SectionStatus[];
}

export interface SectionOption {
    id: string;
    section_code: string;
    label: string;
}

export interface SectionBulkRow {
    section_code?: string;
    term_label: string;
    course_code: string;
    faculty_email?: string;
    room?: string;
    max_slots?: string;
    status?: string;
    schedule_days?: string;
    schedule_time_start?: string;
    schedule_time_end?: string;
    schedule_room?: string;
    override_grading_schema?: string;
    source_section_code?: string;
}