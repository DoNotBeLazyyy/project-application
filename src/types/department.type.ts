export interface DepartmentListRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    total_count: number;
}

export interface DepartmentFormValues {
    code: string;
    name: string;
    description: string;
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