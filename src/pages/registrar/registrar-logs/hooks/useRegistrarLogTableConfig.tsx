import { CommonChip } from '@components/badge/CommonChip';
import { ICellRendererParams } from 'ag-grid-community';
import { MobileCardColDef } from '@type/table.type';
import { RegistrarLogRow } from '@type/registrar-verification.type';
import { useMemo } from 'react';

function formatActionLabel(action: string): string {
    return action
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useRegistrarLogTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'created_at',
                flex: 1.8,
                headerName: 'Timestamp',
                minWidth: 170,
                sortable: true,
                valueFormatter: (params) =>
                    params.value
                        ? new Date(params.value as string).toLocaleString('en-PH', {
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })
                        : '—'
            },
            {
                cellRenderer: function(params: ICellRendererParams<RegistrarLogRow>) {
                    if (!params.value) return null;
                    const action = params.value as string;
                    const color = action.includes('APPROVED')
                        ? 'success'
                        : action.includes('REJECTED') || action.includes('FALSE_INFO')
                            ? 'error'
                            : action.includes('REQUESTED')
                                ? 'warning'
                                : 'primary';

                    return <CommonChip color={color} label={formatActionLabel(action)} size="small" variant="light" />;
                },
                field: 'action',
                flex: 2,
                headerName: 'Action',
                minWidth: 170,
                mobileCard: 'status',
                sortable: true
            },
            {
                field: 'student_name',
                flex: 2,
                headerName: 'Student Name',
                minWidth: 170,
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'student_number',
                flex: 1.5,
                headerName: 'Student No.',
                minWidth: 130,
                mobileCard: 'code',
                sortable: true
            },
            {
                field: 'performed_by_name',
                flex: 1.8,
                headerName: 'Performed By',
                minWidth: 160,
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'details',
                flex: 3,
                headerName: 'Details / Remarks',
                minWidth: 220,
                tooltipField: 'details'
            }
        ];
    }, []);

    return { columnDefs, hideMenuIcon: true };
}
