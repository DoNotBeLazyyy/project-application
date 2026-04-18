export interface ProgramLevelListRow {
    id: string;
    code: string;
    label: string;
    description: string | null;
    total_count: number;
}

export interface ProgramLevelFormValues {
    code: string;
    label: string;
    description: string;
}

export interface ProgramLevelOption {
    id: string;
    code: string;
    label: string;
}