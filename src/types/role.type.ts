export interface RoleListRow {
    id: string;
    code: string;
    label: string;
    description: string | null;
    total_count: number;
}

export interface CreateRoleFormValues {
    code: string;
    label: string;
    description: string;
}

export interface UpdateRoleFormValues {
    code: string;
    label: string;
    description: string;
}

export interface RoleOption {
    id: string;
    code: string;
    label: string;
}