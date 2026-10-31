import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/use-table-configs';
import { ArrowCounterClockwiseIcon, ProhibitIcon } from '@phosphor-icons/react';
import { resendInvite, resetUserPassword } from '@services/user.service';
import { useToastStore } from '@stores/toast.store';
import { UserListRow } from '@type/user.type';
import { ColDef } from 'ag-grid-community';
import { useCallback, useMemo } from 'react';

export async function handleResetPassword(email: string) {
    const { error } = await resetUserPassword(email);
    useToastStore.getState()
        .showToast(
            error
                ? error.message
                : `Password reset link sent to ${email}.`,
            error
                ? 'error'
                : 'success'
        );
}

export async function handleResendInvite(email: string) {
    const { error } = await resendInvite(email);
    useToastStore.getState()
        .showToast(
            error
                ? error.message
                : `Invitation sent again to ${email}.`,
            error
                ? 'error'
                : 'success'
        );
}

interface UseUserTableConfigProps {
    onRequestDeleteRow: (id: string) => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onReactivate?: (id: string) => void;
}

export function useUserTableConfig({
    onEdit,
    onView,
    onReactivate
}: UseUserTableConfigProps) {
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
                row.status === 'Inactive'
                    ? {
                        children: (
                            <div className="flex gap-2 items-center text-emerald-600 font-medium">
                                <ArrowCounterClockwiseIcon
                                    size={20}
                                    weight="bold"
                                />
                                <span>Reactivate</span>
                            </div>
                        ),
                        onClick: () => onReactivate?.(row.id)
                    }
                    : {
                        children: (
                            <div className="flex gap-2 items-center text-rose-600 font-medium">
                                <ProhibitIcon
                                    size={20}
                                    weight="bold"
                                />
                                <span>Deactivate</span>
                            </div>
                        ),
                        onClick: () => onDelete(row.id)
                    },
                {
                    children: (
                        <div className="flex gap-2 items-center">
                            <span>Resend Invite</span>
                        </div>
                    ),
                    disabled: row.status === 'Active',
                    onClick: () => handleResendInvite(row.email)
                },
                {
                    children: (
                        <div className="flex gap-2 items-center">
                            <span>Reset Password</span>
                        </div>
                    ),
                    disabled: row.status !== 'Active',
                    onClick: () => handleResetPassword(row.email)
                }
            ]
        };
    }, [onEdit, onView, onReactivate]);

    return { columnDefs, tableActionConfig };
}