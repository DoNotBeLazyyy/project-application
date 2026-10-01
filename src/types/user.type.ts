import { UserRole } from '@type/app.type';

export interface UserListRow {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role_code: string;
    status: string;
    total_count: number;
}

export interface InviteUserParams {
    first_name: string;
    last_name: string;
    email: string;
    role_code: UserRole;
}

export interface AddUserFormValues {
    first_name: string;
    last_name: string;
    email: string;
    role_code: UserRole;
}

export interface UpdateUserFormValues {
    first_name: string;
    last_name: string;
    email: string;
    role_codes: UserRole[];
}

export interface UpdateUserParams {
    email: string;
    first_name: string;
    last_name: string;
    role_codes: UserRole[];
}

export interface SetPasswordFormValues {
    password: string;
    confirm_password: string;
}

export interface UserFilterValues {
    role_code: UserRole | 'All';
    status: 'All' | 'Active' | 'Invited';
    city: string;
    province: string;
}

export interface UserOption {
    id: string;
    full_name: string;
    role_label: string;
}