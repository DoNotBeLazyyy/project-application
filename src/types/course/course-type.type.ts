export interface CourseTypeListRow {
    id: string;
    code: string;
    label: string;
    description: string | null;
    total_count: number;
}

export interface CourseTypeFormValues {
    code: string;
    label: string;
    description: string;
}

export interface CourseTypeOption {
    id: string;
    code: string;
    label: string;
}