import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { AuditAction, AuditLogRow } from '@type/audit-log.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

const ACTION_VARIANT: Record<AuditAction, 'success' | 'warning' | 'error'> = {
    Insert: 'success',
    Update: 'warning',
    Delete: 'error'
};

export function useAuditLogTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'changed_at',
                flex: 2,
                headerName: 'Date',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? new Date(params.value as string)
                        .toLocaleString('en-PH')
                    : ''
            },
            {
                field: 'action',
                flex: 1,
                headerName: 'Action',
                sortable: true,
                cellRenderer: (params: { data: AuditLogRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.action}
                            variant={ACTION_VARIANT[params.data.action]}
                        />
                    </div>
                )
            },
            {
                field: 'table_name',
                flex: 2,
                headerName: 'Table',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'field_changed',
                flex: 2,
                headerName: 'Field'
            },
            {
                field: 'old_value',
                flex: 2,
                headerName: 'Old Value',
                tooltipField: 'old_value'
            },
            {
                field: 'new_value',
                flex: 2,
                headerName: 'New Value',
                tooltipField: 'new_value'
            },
            {
                field: 'student_name',
                flex: 2,
                headerName: 'Student',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                mobileCard: 'hidden'
            },
            {
                field: 'changed_by_name',
                flex: 2,
                headerName: 'Changed By',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'change_reason',
                flex: 3,
                headerName: 'Reason',
                mobileCard: 'hidden',
                tooltipField: 'change_reason'
            }
        ];
    }, []);

    return { columnDefs };
}