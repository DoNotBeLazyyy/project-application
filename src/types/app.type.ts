export type UserRole = 'Admin' | 'Faculty' | 'Student' | 'Registrar' | 'Dean';

export interface UserProfile {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    suffix: string | null;
    preferred_name: string | null;
    email: string;
    mobile_number: string | null;
    avatar_url: string | null;
    status: string;
}

export interface RoleItem {
    id: string;
    code: UserRole;
    label: string;
}

export interface AuthContext {
    user_id: string;
    profile: UserProfile;
    roles: RoleItem[];
    role_codes: UserRole[];
}