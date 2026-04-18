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
    status: SectionStatus;
    total_count: number;
}

export interface SectionFormValues {
    term_id: string;
    course_id: string;
    faculty_id: string;
    section_code: string;
    room: string;
    max_slots: string;
    status: SectionStatus;
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
    term_label: string;
    course_code: string;
    faculty_email: string;
    section_code: string;
    room: string;
    max_slots: string;
}