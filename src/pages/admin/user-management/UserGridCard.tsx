import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import {
    ArrowCounterClockwiseIcon, EyeIcon, LockKeyIcon, PaperPlaneTiltIcon, PencilSimpleIcon, ProhibitIcon
} from '@phosphor-icons/react';
import { UserListRow } from '@type/user.type';

export interface UserGridCardProps {
    row: UserListRow;
    isBusy?: boolean;
    isSelected: boolean;
    isSelf?: boolean;
    onToggleSelect: VoidFunction;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
    onReactivate?: (id: string) => void;
    onResendInvite?: (row: UserListRow) => void;
    onResetPassword?: (row: UserListRow) => void;
}

/**
 * UserGridCard
 *
 * Grid (bento) representation of a user row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): full name as the hero title,
 * account status as the status pill, role as a metric, and email on its own row.
 */
export default function UserGridCard({
    isBusy = false,
    row,
    isSelected,
    isSelf = false,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete,
    onReactivate,
    onResendInvite,
    onResetPassword
}: UserGridCardProps) {
    const fullName = `${row.first_name} ${row.last_name}`.trim();

    const actions = [
        {
            key: 'view',
            label: 'View',
            icon: (
                <EyeIcon
                    size={18}
                    weight="bold"
                />
            ),
            onClick: () => onView(row.id)
        },
        {
            key: 'edit',
            label: 'Edit',
            icon: (
                <PencilSimpleIcon
                    size={18}
                    weight="bold"
                />
            ),
            onClick: () => onEdit(row.id)
        },
        ...(row.status === 'Inactive'
            ? [{
                key: 'reactivate',
                label: 'Reactivate',
                icon: (
                    <ArrowCounterClockwiseIcon
                        className="text-emerald-600"
                        size={18}
                        weight="bold"
                    />
                ),
                isDisabled: isBusy,
                onClick: () => onReactivate?.(row.id)
            }]
            : isSelf
                // An admin cannot deactivate their own account
                ? []
                : [{
                    key: 'deactivate',
                    label: 'Deactivate',
                    icon: (
                        <ProhibitIcon
                            className="text-rose-600"
                            size={18}
                            weight="bold"
                        />
                    ),
                    destructive: true,
                    onClick: () => onRequestDelete(row.id)
                }]),
        // An inactive user must be reactivated before a new invite is sent
        ...(onResendInvite && row.status === 'Invited'
            ? [{
                key: 'resend-invite',
                label: 'Resend Invite',
                icon: (
                    <PaperPlaneTiltIcon
                        size={18}
                        weight="bold"
                    />
                ),
                isDisabled: isBusy,
                onClick: () => onResendInvite(row)
            }]
            : []),
        ...(onResetPassword && row.status === 'Active'
            ? [{
                key: 'reset-password',
                label: 'Reset Password',
                icon: (
                    <LockKeyIcon
                        size={18}
                        weight="bold"
                    />
                ),
                isDisabled: isBusy,
                onClick: () => onResetPassword(row)
            }]
            : [])
    ];

    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={actions}
                    ariaLabel="User actions"
                />
            )}
            details={[
                {
                    label: 'Email',
                    value: row.email,
                    lines: 1
                }
            ]}
            isSelected={isSelected}
            metrics={[
                { label: 'Role', value: row.role_code },
                ...(row.department_code
                    ? [{ label: 'Department', value: row.department_code }]
                    : [])
            ]}
            selectVariant="button"
            status={row.status}
            title={fullName || row.email}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}