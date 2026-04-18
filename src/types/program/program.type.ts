export interface ProgramListRow {
    id: string;
    code: string;
    name: string;
    description: string | null;
    department_id: string;
    department_name: string;
    program_level_id: string;
    program_level_label: string;
    total_units: number | null;
    years_duration: number;
    is_active: boolean;
    total_count: number;
}

export interface ProgramFormValues {
    code: string;
    name: string;
    description: string;
    department_id: string;
    program_level_id: string;
    total_units: string;
    years_duration: string;
    is_active: boolean;
}

export interface ProgramOption {
    id: string;
    code: string;
    label: string;
}

export interface ProgramFilterValues {
    department_ids: string[];
    program_level_ids: string[];
    is_active: 'All' | 'true' | 'false';
}

export interface ProgramBulkRow {
    code: string;
    name: string;
    department_code: string;
    program_level_code: string;
    years_duration: string;
    total_units: string;
    description: string;
    is_active: string;
}

export interface ProgramBulkImportResult {
    provisioned_count: number;
    errors: {
        row: number;
        code: string;
        message: string;
    }[];
}