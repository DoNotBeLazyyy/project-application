import { CommonChip } from '@components/badge/CommonChip';
import { ICellRendererParams } from 'ag-grid-community';
import { MobileCardColDef } from '@type/table.type';
import { StudentProfileRequestRow } from '@type/registrar-verification.type';
import { useMemo } from 'react';

export function useStudentVerificationTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1.5,
                headerName: 'Student No.',
                minWidth: 130,
                mobileCard: 'code',
                sortable: true
            },
            {
                field: 'student_name',
                flex: 2,
                headerName: 'Student Name',
                minWidth: 180,
                mobileCard: 'title',
                sortable: true
            },
            {
                cellRenderer: function(params: ICellRendererParams<StudentProfileRequestRow>) {
                    if (!params.data) return null;
                    return (
                        <span>
                            {params.data.program_code} (Yr {params.data.year_level})
                        </span>
                    );
                },
                field: 'program_code',
                flex: 1.5,
                headerName: 'Program & Year',
                minWidth: 150,
                mobileCard: 'subtitle'
            },
            {
                cellRenderer: function(params: ICellRendererParams<StudentProfileRequestRow>) {
                    if (!params.value) return null;
                    const status = params.value as string;
                    const color =
                        status === 'Pending'
                            ? 'warning'
                            : status === 'Approved'
                                ? 'success'
                                : status === 'Approved with Edits'
                                    ? 'primary'
                                    : 'error';
                    return <CommonChip color={color} label={status} size="small" variant="light" />;
                },
                field: 'status',
                flex: 1.5,
                headerName: 'Status',
                minWidth: 140,
                mobileCard: 'status',
                sortable: true
            },
            {
                field: 'created_at',
                flex: 2,
                headerName: 'Submitted On',
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
                field: 'reviewer_name',
                flex: 1.5,
                headerName: 'Reviewed By',
                minWidth: 150,
                sortable: true
            }
        ];
    }, []);

    return { columnDefs, hideMenuIcon: true };
}
