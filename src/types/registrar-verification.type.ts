import { ProfileFormValues } from '@type/profile.type';

export type StudentProfileRequestStatus = 'Pending' | 'Approved' | 'Approved with Edits' | 'Rejected' | 'Cancelled';

export interface StudentProfileRequestRow {
    id: string;
    student_id: string | null;
    user_id: string;
    status: StudentProfileRequestStatus;
    current_values: ProfileFormValues;
    requested_changes: ProfileFormValues;
    approved_changes?: ProfileFormValues | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    rejection_reason?: string | null;
    registrar_notes?: string | null;
    created_at: string;
    updated_at: string;
    student_name: string;
    student_email: string;
    student_number: string;
    year_level: number;
    program_code: string;
    program_name: string;
    reviewer_name: string;
}

export interface StudentProfileRequestFilterValues {
    status: string;
}

export interface RegistrarLogRow {
    id: string;
    action: string;
    student_id?: string | null;
    student_user_id?: string | null;
    student_name: string;
    student_number: string;
    performed_by?: string | null;
    performed_by_name: string;
    details: string;
    old_values?: Record<string, unknown> | null;
    new_values?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
}

export interface RegistrarLogFilterValues {
    action: string;
    date_from: string;
    date_to: string;
}
