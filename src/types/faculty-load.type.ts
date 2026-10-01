import { SectionStatus } from '@type/section.type';

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
    id?: string;
    day_of_week: string;
    time_start: string;
    time_end: string;
    room: string;
}

export interface FacultyLoadSection {
    section_id: string;
    section_code: string;
    course_id: string;
    course_code: string;
    course_title: string;
    term_id: string;
    term_label: string;
    program_id?: string | null;
    program_code?: string | null;
    program_name?: string | null;
    faculty_id: string | null;
    faculty_name?: string | null;
    room?: string | null;
    max_slots: number;
    enrolled_count: number;
    available_slots?: number;
    status: SectionStatus;
    is_active_academic_year?: boolean;
    lecture_units?: number;
    lab_units?: number;
    units: number;
    schedules: FacultyScheduleSlot[];
}

export interface FacultyScheduleConflict {
    id: string;
    conflict_type: ScheduleConflictType;
    faculty_id?: string;
    faculty_name?: string;
    subject_label?: string;
    day_of_week: string;
    time_start: string;
    time_end: string;
    section_a_id: string;
    section_a: string;
    course_a?: string;
    section_b_id: string;
    section_b: string;
    course_b?: string;
    overlap_start: string;
    overlap_end: string;
    room?: string;
}

export interface FacultyLoadDetail {
    faculty: {
        id: string;
        faculty_name: string;
        email: string;
    };
    sections: FacultyLoadSection[];
    conflicts?: FacultyScheduleConflict[];
}

export interface FacultyLoadAssignmentInput {
    section_id: string;
    faculty_id: string | null;
}