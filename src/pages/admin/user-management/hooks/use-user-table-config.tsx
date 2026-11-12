import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { UserListRow } from '@type/user.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

export function useUserTableConfig() {
    const columnDefs = useMemo<ColDef<UserListRow>[]>(function() {
        return [
            {
                field: 'first_name',
                flex: 2,
                headerName: 'First Name',
                sortable: true,
                valueFormatter: (params) => params.value || '—'
            },
            {
                field: 'last_name',
                flex: 2,
                headerName: 'Last Name',
                sortable: true,
                valueFormatter: (params) => params.value || '—'
            },
            {
                field: 'email',
                flex: 3,
                headerName: 'Email',
                sortable: true
            },
            {
                field: 'role_code',
                flex: 2,
                headerName: 'Roles',
                sortable: true,
                tooltipField: 'role_code'
            },
            {
                field: 'department_code',
                flex: 2,
                headerName: 'Department',
                sortable: true,
                valueFormatter: (params) => params.value || '—'
            },
            {
                field: 'status',
                flex: 2,
                headerName: 'Status',
                cellRenderer: (params: { data: UserListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={params.data.status === 'Active'
                                ? 'success'
                                : (params.data.status === 'Inactive'
                                    ? 'error'
                                    : 'warning')}
                        />
                    </div>
                )
            }
        ];
    }, []);

    return { columnDefs };
}