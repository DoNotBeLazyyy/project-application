export type AuditAction = 'Insert' | 'Update' | 'Delete' | 'INSERT' | 'UPDATE' | 'DELETE' | 'All';

export interface AuditLogRow {
    id: string;
    action: string;
    event_name: string;
    table_name: string;
    record_id: string | null;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    changed_fields: string[] | null;
    changed_by_name: string;
    changed_by?: string | null;
    description?: string;
    changed_at: string;
    created_at?: string;
    total_count: number;
    // Fallback fields for compatibility
    field_changed?: string;
    old_value?: string | null;
    new_value?: string | null;
    student_name?: string;
    section_code?: string;
    grading_period_name?: string;
}

export interface AuditLogFilterValues {
    action: string;
    table_name: string;
    event_name?: string;
    changed_by?: string;
    date_from: string;
    date_to: string;
}

export interface AuditLogFilterOptions {
    tables: { label: string; value: string }[];
    events: { label: string; value: string }[];
    operators: { label: string; value: string }[];
    actions: { label: string; value: string }[];
}