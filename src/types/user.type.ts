import { UserRole } from '@type/app.type';

export interface UserListRow {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role_code: string;
    status: string;
    total_count: number;
    department_id?: string | null;
    department_code?: string | null;
    department_name?: string | null;
    profile_completed?: boolean;
}

export interface InviteUserParams {
    first_name: string;
    last_name: string;
    email: string;
    role_code: UserRole;
    department_id?: string | null;
}

export interface AddUserFormValues {
    first_name: string;
    last_name: string;
    email: string;
    role_code: UserRole;
    department_id?: string;
}

export interface UpdateUserFormValues {
    first_name: string;
    last_name: string;
    email: string;
    role_codes: UserRole[];
    department_id?: string;
}

export interface UpdateUserParams {
    email: string;
    first_name: string;
    last_name: string;
    role_codes: UserRole[];
    department_id?: string | null;
}

export interface SetPasswordFormValues {
    password: string;
    confirm_password: string;
}

export interface UserFilterValues {
    role_code: UserRole | 'All';
    status: 'All' | 'Active' | 'Invited' | 'Inactive' | 'Active_Invited';
    city: string;
    province: string;
}

export interface UserOption {
    id: string;
    full_name: string;
    role_label: string;
}