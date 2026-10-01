export interface MyStudentInfo {
    id: string;
    student_number: string;
    year_level: number;
    status: string;
    program_id: string | null;
    program_code: string | null;
    program_name: string | null;
}

export interface PendingProfileRequest {
    id: string;
    status: 'Pending' | 'Approved' | 'Approved with Edits' | 'Rejected' | 'Cancelled';
    requested_changes: Partial<ProfileFormValues>;
    current_values: Partial<ProfileFormValues>;
    created_at: string;
    rejection_reason?: string | null;
    registrar_notes?: string | null;
}

export interface MyProfile {
    id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    preferred_name: string;
    email: string;
    mobile_number: string;
    address_line1: string;
    address_line2: string;
    city: string;
    province: string;
    postal_code: string;
    date_of_birth: string | null;
    gender: string;
    civil_status: string;
    nationality: string;
    avatar_url: string | null;
    status: string;
    role_labels: string[];
    student?: MyStudentInfo | null;
    pending_profile_request?: PendingProfileRequest | null;
}

export interface ProfileFormValues {
    first_name: string;
    middle_name: string;
    last_name: string;
    suffix: string;
    preferred_name: string;
    mobile_number: string;
    address_line1: string;
    address_line2: string;
    city: string;
    province: string;
    postal_code: string;
    date_of_birth: string;
    gender: string;
    civil_status: string;
    nationality: string;
    program_id?: string;
    program_code?: string;
    program_name?: string;
    year_level?: number | string;
}

export interface ChangePasswordFormValues {
    current_password: string;
    new_password: string;
    confirm_password: string;
}