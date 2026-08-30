import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard, { BentoCardFact } from '@components/card/CommonBentoCard';
import {
    BroadcastIcon,
    ClockCountdownIcon,
    EyeIcon,
    PencilSimpleIcon,
    ProhibitIcon,
    SealCheckIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { SpecialGradeConfig } from '@type/grading-config.type';
import { summarizeConditions } from '@utils/special-grade.util';

export interface SpecialGradeGridCardProps {
    row: SpecialGradeConfig;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

const FACT_ICON_SIZE = 13;

/**
 * SpecialGradeGridCard
 *
 * Grid (bento) representation of a special grade rule. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md).
 *
 * The facts answer the three short questions a reader has about a special
 * grade: does the mark pass, does the system detect it on its own, and does the
 * student owe completion work. The rule's actual conditions are free-form and
 * can run long, so they get their own detail row rather than being squeezed
 * into a fact tile. The mark itself (INC, FDA, DRP…) is the code pill.
 */
export default function SpecialGradeGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: SpecialGradeGridCardProps) {
    const rowId = row.id ?? row.code;

    const completionValue = row.requires_completion
        ? (row.completion_deadline_days
            ? `Required (${row.completion_deadline_days}d)`
            : 'Required')
        : 'Not required';

    const conditionSummary = summarizeConditions(row.conditions);
    const isDetecting = row.is_auto_detected && Boolean(conditionSummary);

    const facts: BentoCardFact[] = [
        {
            icon: row.is_passing
                ? <SealCheckIcon size={FACT_ICON_SIZE} weight="fill" />
                : <ProhibitIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'Outcome',
            tone: row.is_passing
                ? 'positive'
                : 'danger',
            value: row.is_passing
                ? 'Passing'
                : 'Non-Passing'
        },
        {
            icon: <BroadcastIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'Detection',
            tone: isDetecting
                ? 'positive'
                : 'neutral',
            value: isDetecting
                ? 'Automatic'
                : 'Manual only'
        },
        {
            icon: <ClockCountdownIcon size={FACT_ICON_SIZE} weight="fill" />,
            label: 'Completion',
            tone: row.requires_completion
                ? 'warning'
                : 'neutral',
            value: completionValue
        }
    ];

    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={[
                        {
                            key: 'view',
                            label: 'View',
                            icon: <EyeIcon size={18} weight="bold" />,
                            onClick: () => onView(rowId)
                        },
                        {
                            key: 'edit',
                            label: 'Edit',
                            icon: <PencilSimpleIcon size={18} weight="bold" />,
                            onClick: () => onEdit(rowId)
                        },
                        {
                            key: 'delete',
                            label: 'Delete',
                            icon: <TrashIcon size={18} weight="bold" />,
                            destructive: true,
                            onClick: () => onRequestDelete(rowId)
                        }
                    ]}
                    ariaLabel="Special grade actions"
                />
            )}
            code={row.code}
            details={[
                {
                    emptyText: 'No conditions — this mark is applied by hand',
                    label: 'Triggers when',
                    lines: 2,
                    value: conditionSummary
                },
                {
                    emptyText: 'No description provided',
                    label: 'Description',
                    value: row.description ?? ''
                }
            ]}
            facts={facts}
            isSelected={isSelected}
            selectVariant="button"
            status={row.is_active
                ? 'Active'
                : 'Inactive'}
            title={row.label}
            onClick={() => onView(rowId)}
            onToggleSelect={onToggleSelect}
        />
    );
}