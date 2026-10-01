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
    school_year_id?: string;
    total_units: string;
    years_duration: string;
    is_active: boolean;
    override_grading_schema?: boolean;
    grading_periods?: {
        name: string;
        sequence: number;
        weight: number;
        components?: { name: string; weight: number }[];
    }[];
    curriculum_entries?: {
        id?: string;
        course_id: string;
        course_code?: string;
        year_level: number;
        term_type_id: string;
        term_type_code?: string;
        term_type_label?: string;
        school_year_id?: string;
        sequence?: number;
        is_elective?: boolean;
        lecture_units?: number;
        laboratory_units?: number;
        units?: number;
        total_units?: number;
        type_units?: string;
    }[];
    pending_deleted_curriculum_ids?: string[];
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
    override_grading_schema?: string;
    grading_periods?: string;
    course_code?: string;
    year_level?: string;
    term_type_code?: string;
    school_year_code?: string;
    sequence?: string;
    is_elective?: string;
}

export interface ProgramBulkImportResult {
    provisioned_count: number;
    errors: {
        row: number;
        code: string;
        message: string;
    }[];
}