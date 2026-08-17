export interface FacultyLoadRow {
    id: string;
    faculty_name: string;
    email: string;
    section_count: number;
    total_units: number;
    student_count: number;
    weekly_hours: number;
    conflict_count: number;
    total_count: number;
}

export interface FacultyLoadFilterValues {
    term_id: string;
}

export type ScheduleConflictType = 'Faculty' | 'Room';

export interface ScheduleConflictRow {
    id: string;
    conflict_type: ScheduleConflictType;
    faculty_name: string;
    subject_label: string;
    day_of_week: string;
    time_start: string;
    time_end: string;
    section_a: string;
    section_b: string;
    overlap_start: string;
    overlap_end: string;
    total_count: number;
}

export interface ScheduleConflictFilterValues {
    term_id: string;
    conflict_types: ScheduleConflictType[];
}

export interface FacultyScheduleSlot {
    day_of_week: string;
    time_start: string;
    time_end: string;
    room: string;
}

export interface FacultyLoadSection {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    units: number;
    enrolled_count: number;
    schedules: FacultyScheduleSlot[];
}

export interface FacultyLoadDetail {
    faculty: {
        id: string;
        faculty_name: string;
        email: string;
    };
    sections: FacultyLoadSection[];
}