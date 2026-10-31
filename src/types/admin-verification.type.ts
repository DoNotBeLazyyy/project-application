import { ProfileFormValues } from '@type/profile.type';

export type StaffProfileRequestStatus = 'Pending' | 'Approved' | 'Approved with Edits' | 'Rejected' | 'Cancelled';

export interface StaffProfileRequestRow {
    id: string;
    user_id: string;
    role_code: 'Dean' | 'Faculty' | 'Registrar' | string;
    status: StaffProfileRequestStatus;
    current_values: ProfileFormValues;
    requested_changes: ProfileFormValues;
    approved_changes?: ProfileFormValues | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    rejection_reason?: string | null;
    admin_notes?: string | null;
    created_at: string;
    updated_at: string;
    user_name: string;
    user_email: string;
    department_name?: string | null;
    department_code?: string | null;
    reviewer_name?: string | null;
}

export interface StaffProfileRequestFilterValues {
    role_code: string;
    status: string;
}