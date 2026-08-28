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
                minWidth: 175,
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
                minWidth: 110,
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
                minWidth: 140,
                mobileCard: 'title',
                sortable: true,
                tooltipField: 'table_name'
            },
            {
                field: 'field_changed',
                flex: 2,
                headerName: 'Field',
                minWidth: 130,
                tooltipField: 'field_changed'
            },
            {
                field: 'old_value',
                flex: 2,
                headerName: 'Old Value',
                minWidth: 130,
                tooltipField: 'old_value'
            },
            {
                field: 'new_value',
                flex: 2,
                headerName: 'New Value',
                minWidth: 130,
                tooltipField: 'new_value'
            },
            {
                field: 'student_name',
                flex: 2,
                headerName: 'Student',
                minWidth: 180,
                mobileCard: 'hidden',
                sortable: true,
                tooltipField: 'student_name'
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                minWidth: 120,
                mobileCard: 'hidden',
                tooltipField: 'section_code'
            },
            {
                field: 'changed_by_name',
                flex: 2,
                headerName: 'Changed By',
                minWidth: 180,
                mobileCard: 'subtitle',
                sortable: true,
                tooltipField: 'changed_by_name'
            },
            {
                field: 'change_reason',
                flex: 3,
                headerName: 'Reason',
                minWidth: 200,
                mobileCard: 'hidden',
                tooltipField: 'change_reason'
            }
        ];
    }, []);

    return { columnDefs };
}