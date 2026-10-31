import { callRpc } from '@services/supabase.wrapper';
import { AuditLogFilterOptions, AuditLogFilterValues, AuditLogRow } from '@type/audit-log.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listAuditLogs(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: AuditLogFilterValues | null
): Promise<ServiceResult<CommonListResDto<AuditLogRow>>> {
    return callRpc<CommonListResDto<AuditLogRow>>('fn_list_audit_logs_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_action: filters?.action && filters.action !== 'All'
            ? filters.action
            : null,
        p_table_name: filters?.table_name && filters.table_name !== 'All'
            ? filters.table_name
            : null,
        p_event_name: filters?.event_name && filters.event_name !== 'All'
            ? filters.event_name
            : null,
        p_changed_by: filters?.changed_by && filters.changed_by !== 'All'
            ? filters.changed_by
            : null,
        p_date_from: filters?.date_from || null,
        p_date_to: filters?.date_to || null
    });
}

export async function getAuditLogFilters(): Promise<ServiceResult<AuditLogFilterOptions>> {
    return callRpc<AuditLogFilterOptions>('fn_get_audit_log_filters');
}