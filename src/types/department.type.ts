export interface DepartmentAssignedUser {
    id: string;
    first_name?: string;
    last_name?: string;
    full_name: string;
    email: string;
    status?: string;
}

export interface DepartmentListRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    dean_id?: string | null;
    dean_name?: string | null;
    dean_email?: string | null;
    dean_count?: number;
    faculty_count?: number;
    faculty_names?: string;
    total_count: number;
}

export interface DepartmentFormValues {
    code: string;
    name: string;
    description: string;
    dean_id: string;
    faculty_ids: string[];
    deans?: DepartmentAssignedUser[];
    faculties?: DepartmentAssignedUser[];
}

export interface DepartmentOption {
    id: string;
    code: string;
    label: string;
}

export interface DepartmentFilterValues {
    search?: string;
}

export interface DepartmentBulkRow {
    code: string;
    name: string;
    description?: string;
}