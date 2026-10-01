export interface BulkImportResult {
    provisioned_count: number;
    errors: string[];
}

export interface BulkProvisionResult extends BulkImportResult {
    failed_auth_ids: string[] | null;
}

export interface BulkImportError {
    row: number;
    code: string;
    message: string;
}

export interface BulkImportRowItem {
    row: number;
    section_code?: string;
    course_code?: string;
    faculty_email?: string;
    room?: string;
    message?: string;
    changes?: { field: string; previous: string; changed: string }[];
}

export interface DetailedBulkImportResult extends BulkImportResult {
    created_count?: number;
    updated_count?: number;
    conflicts_count?: number;
    createdRows?: BulkImportRowItem[];
    updatedRows?: BulkImportRowItem[];
    structuredErrors?: BulkImportError[];
    structuredConflicts?: BulkImportError[];
}

export interface CsvTemplateColumn {
    key: string;
    label: string;
    hint?: string;
}