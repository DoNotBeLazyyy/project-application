export type AuditAction = 'Insert' | 'Update' | 'Delete';

export interface AuditLogRow {
    id: string;
    action: AuditAction;
    table_name: string;
    field_changed: string;
    old_value: string | null;
    new_value: string | null;
    change_reason: string;
    changed_at: string;
    changed_by_name: string;
    student_name: string;
    section_code: string;
    grading_period_name: string;
    total_count: number;
}

export interface AuditLogFilterValues {
    action: AuditAction | 'All';
    table_name: string;
    date_from: string;
    date_to: string;
}