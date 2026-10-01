export interface CourseTypeListRow {
    id: string;
    code: string;
    label: string;
    description: string | null;
    is_active?: boolean;
    total_count: number;
}

export interface CourseTypeFormValues {
    code: string;
    label: string;
    description: string;
    is_active?: boolean;
}

export interface CourseTypeOption {
    id: string;
    code: string;
    label: string;
    is_active?: boolean;
}

export interface CourseTypeBulkRow {
    code: string;
    label: string;
    description?: string;
}