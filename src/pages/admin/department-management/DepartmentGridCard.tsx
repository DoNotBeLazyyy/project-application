import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { DepartmentListRow } from '@type/department.type';

export interface DepartmentGridCardProps {
    row: DepartmentListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * DepartmentGridCard
 *
 * Grid (bento) representation of a department row for Admin.
 * Name as hero title, code as subtitle, and optional description.
 */
export default function DepartmentGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: DepartmentGridCardProps) {
    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={[
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
                        {
                            key: 'delete',
                            label: 'Delete',
                            icon: <TrashIcon size={18} weight="bold" />,
                            destructive: true,
                            onClick: () => onRequestDelete(row.id)
                        }
                    ]}
                    ariaLabel="Department actions"
                />
            )}
            details={row.description ? [{ label: 'Description', value: row.description }] : undefined}
            isSelected={isSelected}
            selectVariant="button"
            status=""
            subtitle={row.code}
            title={row.name}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}
