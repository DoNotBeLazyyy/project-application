import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { EvaluationTemplateListRow } from '@type/evaluation.type';

export interface EvaluationTemplateGridCardProps {
    row: EvaluationTemplateListRow;
    /** Pre-formatted program list, e.g. "All programs" or "BSCS, BSIT". */
    programsLabel: string;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * EvaluationTemplateGridCard
 *
 * Grid (bento) representation of an evaluation section row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md): section title
 * as the hero title, order as the subtitle, active state as the status pill,
 * and question count + programs as metrics.
 */
export default function EvaluationTemplateGridCard({
    row,
    programsLabel,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: EvaluationTemplateGridCardProps) {
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
                    ariaLabel="Evaluation section actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Questions', value: String(row.question_count) },
                { label: 'Programs', value: programsLabel }
            ]}
            selectVariant="button"
            status={row.is_active
                ? 'Active'
                : 'Inactive'}
            title={row.title}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}