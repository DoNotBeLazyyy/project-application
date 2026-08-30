import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { ProgramListRow } from '@type/program/program.type';

export interface ProgramGridCardProps {
    row: ProgramListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * ProgramGridCard
 *
 * Grid (bento) representation of a program row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): name as the hero title, code
 * as the subtitle, active state as the status pill, and department + level as
 * metrics.
 */
export default function ProgramGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: ProgramGridCardProps) {
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
                    ariaLabel="Program actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Department', value: row.department_name },
                { label: 'Level', value: row.program_level_label }
            ]}
            selectVariant="button"
            status={row.is_active
                ? 'Active'
                : 'Inactive'}
            subtitle={row.code}
            title={row.name}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}