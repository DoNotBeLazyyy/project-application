import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import {
    EyeIcon, LockKeyIcon, PaperPlaneTiltIcon, PencilSimpleIcon, TrashIcon
} from '@phosphor-icons/react';
import { UserListRow } from '@type/user.type';

export interface UserGridCardProps {
    row: UserListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
    onResendInvite?: (email: string) => void;
    onResetPassword?: (email: string) => void;
}

/**
 * UserGridCard
 *
 * Grid (bento) representation of a user row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): full name as the hero title,
 * account status as the status pill, role as a metric, and email on its own row.
 */
export default function UserGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete,
    onResendInvite,
    onResetPassword
}: UserGridCardProps) {
    const fullName = `${row.first_name} ${row.last_name}`.trim();

    const actions = [
        {
            key: 'view',
            label: 'View',
            icon: <EyeIcon size={18} weight="bold" />,
            onClick: () => onView(row.id)
        },
        {
            key: 'edit',
            label: 'Edit',
            icon: <PencilSimpleIcon size={18} weight="bold" />,
            onClick: () => onEdit(row.id)
        },
        ...(onResendInvite && row.status !== 'Active'
            ? [{
                key: 'resend-invite',
                label: 'Resend Invite',
                icon: <PaperPlaneTiltIcon size={18} weight="bold" />,
                onClick: () => onResendInvite(row.email)
            }]
            : []),
        ...(onResetPassword && row.status === 'Active'
            ? [{
                key: 'reset-password',
                label: 'Reset Password',
                icon: <LockKeyIcon size={18} weight="bold" />,
                onClick: () => onResetPassword(row.email)
            }]
            : []),
        {
            key: 'delete',
            label: 'Delete',
            icon: <TrashIcon size={18} weight="bold" />,
            destructive: true,
            onClick: () => onRequestDelete(row.id)
        }
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