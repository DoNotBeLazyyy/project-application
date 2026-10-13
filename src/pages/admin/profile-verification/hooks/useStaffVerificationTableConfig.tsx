import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import { StaffProfileRequestRow } from '@type/admin-verification.type';
import { MobileCardColDef } from '@type/table.type';
import { ICellRendererParams } from 'ag-grid-community';
import { useMemo } from 'react';

export function useStaffVerificationTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'user_name',
                flex: 2,
                headerName: 'Staff Name',
                minWidth: 180,
                mobileCard: 'title',
                sortable: true
            },
            {
                cellRenderer: function(params: ICellRendererParams<StaffProfileRequestRow>) {
                    if (!params.data) return null;
                    const role = params.data.role_code;
                    return (
                        <div className="flex items-center gap-1.5">
                            <CommonChip
                                label={role}
                                size="small"
                                variant={role === 'Dean' ? 'dark' : 'light'}
                            />
                            {params.data.department_code && (
                                <span className="text-xs text-(--mui-palette-text-secondary)">
                                    ({params.data.department_code})
                                </span>
                            )}
                        </div>
                    );
                },
                field: 'role_code',
                flex: 1.5,
                headerName: 'Role & Dept',
                minWidth: 150,
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'user_email',
                flex: 2,
                headerName: 'Email Address',
                minWidth: 180,
                mobileCard: 'meta',
                sortable: true
            },
            {
                cellRenderer: function(params: ICellRendererParams<StaffProfileRequestRow>) {
                    if (!params.value) return null;
                    const status = params.value as string;
                    const variant =
                        status === 'Pending'
                            ? 'warning'
                            : status === 'Approved' || status === 'Approved with Edits'
                                ? 'success'
                                : status === 'Cancelled'
                                    ? 'info'
                                    : 'error';
                    return <CommonBadgeStatus label={status} variant={variant} />;
                },
                field: 'status',
                flex: 1.5,
                headerName: 'Status',
                minWidth: 140,
                mobileCard: 'meta',
                sortable: true
            },
            {
                field: 'created_at',
                flex: 2,
                headerName: 'Submitted On',
                minWidth: 170,
                sortable: true,
                valueFormatter: (params: any) =>
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
