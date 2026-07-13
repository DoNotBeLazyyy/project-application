import { callRpc } from '@services/supabase.wrapper';
import { AuditLogFilterValues, AuditLogRow } from '@type/audit-log.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ServiceResult } from '@type/service.type';

export async function listGradeAuditLogs(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: AuditLogFilterValues | null
): Promise<ServiceResult<CommonListResDto<AuditLogRow>>> {
    return callRpc<CommonListResDto<AuditLogRow>>('fn_list_grade_audit_logs_json', {
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
        p_date_from: filters?.date_from || null,
        p_date_to: filters?.date_to || null
    });
}

export async function getAuditLogTables(): Promise<ServiceResult<CommonSelectOption[]>> {
    return callRpc<CommonSelectOption[]>('fn_get_audit_log_tables');
}