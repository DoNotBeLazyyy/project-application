import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

function toTitleCase(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useAuditLogTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'changed_at',
                flex: 2,
                headerName: 'Date',
                minWidth: 175,
                sortable: true,
                valueFormatter: (params) =>
                    params.value
                        ? new Date(params.value as string)
                            .toLocaleString('en-PH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            })
                        : ''
            },
            {
                field: 'action',
                flex: 1,
                headerName: 'Action',
                minWidth: 110,
                sortable: true
            },
            {
                field: 'table_name',
                flex: 2,
                headerName: 'Table',
                minWidth: 140,
                mobileCard: 'title',
                sortable: true,
                tooltipField: 'table_name',
                valueFormatter: (params) =>
                    params.value
                        ? toTitleCase(String(params.value))
                        : ''
            },
            {
                field: 'field_changed',
                flex: 2,
                headerName: 'Field',
                minWidth: 130,
                tooltipField: 'field_changed',
                valueFormatter: (params) =>
                    params.value
                        ? toTitleCase(String(params.value))
                        : ''
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
                field: 'grading_period_name',
                flex: 2,
                headerName: 'Grading Period',
                minWidth: 160,
                mobileCard: 'hidden',
                tooltipField: 'grading_period_name'
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

    return { columnDefs, hideMenuIcon: true };
}