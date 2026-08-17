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

export interface DetailedBulkImportResult extends BulkImportResult {
    structuredErrors?: BulkImportError[];
}

export interface CsvTemplateColumn {
    key: string;
    label: string;
    hint?: string;
}