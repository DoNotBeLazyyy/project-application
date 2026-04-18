export interface BulkImportResult {
    provisioned_count: number;
    errors: string[];
}

export interface CsvTemplateColumn {
    key: string;
    label: string;
    hint?: string;
}