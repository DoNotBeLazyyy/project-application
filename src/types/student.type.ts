export type StudentStatus = 'Active' | 'Inactive' | 'LOA' | 'Graduated' | 'Expelled';

export interface StudentListRow {
    id: string;
    student_number: string;
    year_level: number;
    status: StudentStatus;
    admitted_at: string | null;
    program_id: string | null;
    program_code: string | null;
    program_name: string | null;
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_status: string;
    total_count: number;
}

export interface StudentFormValues {
    user_id: string;
    student_number: string;
    program_id: string;
    year_level: string;
    admitted_at: string;
    status: StudentStatus;
}

export interface StudentFilterValues {
    program_ids: string[];
    year_levels: string[];
    statuses: StudentStatus[];
}

export interface StudentOption {
    id: string;
    student_number: string;
    label: string;
}

export interface StudentBulkRow {
    email: string;
    student_number: string;
    program_code: string;
    year_level: string;
    admitted_at: string;
}