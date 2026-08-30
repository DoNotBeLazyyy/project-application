import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { TermTypeListRow } from '@type/term/term-type.type';

export interface TermTypeGridCardProps {
    row: TermTypeListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * TermTypeGridCard
 *
 * Grid (bento) representation of a term type row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md): label as the
 * hero title, code as the subtitle, and sequence as a metric.
 */
export default function TermTypeGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: TermTypeGridCardProps) {
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
                    ariaLabel="Term type actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Sequence', value: String(row.sequence) }
            ]}
            selectVariant="button"
            status=""
            title={row.label}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}