import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { resendInvite } from '@services/user.service';
import { UserListRow } from '@type/user.type';
import { ColDef } from 'ag-grid-community';
import { useCallback, useMemo } from 'react';

interface UseUserTableConfigProps {
    onRequestDeleteRow: (id: string) => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

export function useUserTableConfig({
    onRequestDeleteRow,
    onEdit,
    onView
}: UseUserTableConfigProps) {
    const columnDefs = useMemo<ColDef<UserListRow>[]>(function() {
        return [
            {
                field: 'first_name',
                flex: 2,
                headerName: 'First Name',
                sortable: true
            },
            {
                field: 'last_name',
                flex: 2,
                headerName: 'Last Name',
                sortable: true
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
                headerName: 'Role',
                sortable: true
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
                                : 'warning'}
                        />
                    </div>
                )
            }
        ];
    }, []);
    const tableActionConfig = useCallback(function(onDelete: (id: string) => void): TableActionConfig<UserListRow> {
        return {
            onEditClick: (row: UserListRow) => function() {
                onEdit(row.id);
            },
            menuOptions: (row: UserListRow): MenuOption[] => [
                {
                    preset: 'view',
                    onClick: () => onView(row.id)
                },
                {
                    preset: 'edit',
                    onClick: () => onEdit(row.id)
                },
                {
                    preset: 'delete',
                    onClick: () => onDelete(row.id)
                },
                {
                    children: (
                        <div className="flex gap-2 items-center">
                            <span>Resend Invite</span>
                        </div>
                    ),
                    disabled: row.status === 'Active',
                    onClick: () => resendInvite(row.email)
                }
            ]
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}