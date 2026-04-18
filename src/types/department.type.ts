export interface DepartmentListRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    head_user_id: string | null;
    head_full_name: string | null;
    head_role_label: string | null;
    total_count: number;
}

export interface DepartmentFormValues {
    code: string;
    name: string;
    description: string;
    head_user_id: string;
}

export interface DepartmentOption {
    id: string;
    code: string;
    label: string;
}

export interface FacultyDeanUserOption {
    id: string;
    full_name: string;
    role_label: string;
}

export interface DepartmentFilterValues {
    has_head: 'All' | 'true' | 'false';
}