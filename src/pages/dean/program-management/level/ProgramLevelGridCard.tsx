import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { ProgramLevelListRow } from '@type/program/program-level.type';

export interface ProgramLevelGridCardProps {
    row: ProgramLevelListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * ProgramLevelGridCard
 *
 * Grid (bento) representation of a program level row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md): label as the
 * hero title, and code as the subtitle.
 */
export default function ProgramLevelGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: ProgramLevelGridCardProps) {
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
                    ariaLabel="Program level actions"
                />
            )}
            isSelected={isSelected}
            selectVariant="button"
            status=""
            title={row.label}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}