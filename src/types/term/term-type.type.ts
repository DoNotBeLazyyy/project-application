export interface TermTypeListRow {
    id: string;
    code: string;
    label: string;
    description: string | null;
    sequence: number;
    total_count: number;
}

export interface TermTypeFormValues {
    code: string;
    label: string;
    sequence: string;
    description: string;
}

export interface TermTypeOption {
    id: string;
    code: string;
    label: string;
    sequence: number;
}