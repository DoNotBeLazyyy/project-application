import BentoCardActionMenu, { BentoCardAction } from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { NEXT_STATUS_MAP } from '@constants/term.constant';
import { ArrowRightIcon, EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { TermListRow, TermStatus } from '@type/term/term.type';
import { formatShortDate } from '@utils/date.util';

export interface TermGridCardProps {
    row: TermListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onAdvanceStatus: (id: string, currentStatus: TermStatus) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * TermGridCard
 *
 * Grid (bento) representation of a term row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): term type as the hero title,
 * school year as the subtitle, term status as the status pill, start/end dates
 * as metrics. The action menu mirrors the table's status-gated options.
 */
export default function TermGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onAdvanceStatus,
    onRequestDelete
}: TermGridCardProps) {
    const nextStatus = NEXT_STATUS_MAP[row.status];
    const canDelete = row.status === 'Upcoming' || row.status === 'Closed';

    const actions: BentoCardAction[] = [
        {
            key: 'view',
            label: 'View',
            icon: <EyeIcon size={18} weight="bold" />,
            onClick: () => onView(row.id)
        }
    ];

    if (row.status !== 'Closed') {
        actions.push({
            key: 'edit',
            label: 'Edit',
            icon: <PencilSimpleIcon size={18} weight="bold" />,
            onClick: () => onEdit(row.id)
        });
    }

    if (nextStatus) {
        actions.push({
            key: 'advance',
            label: `Advance to ${nextStatus}`,
            icon: <ArrowRightIcon size={18} weight="bold" />,
            onClick: () => onAdvanceStatus(row.id, row.status)
        });
    }

    if (canDelete) {
        actions.push({
            key: 'delete',
            label: 'Delete',
            icon: <TrashIcon size={18} weight="bold" />,
            destructive: true,
            onClick: () => onRequestDelete(row.id)
        });
    }

    return (
        <CommonBentoCard
            actionMenu={<BentoCardActionMenu actions={actions} ariaLabel="Term actions" />}
            isSelected={isSelected}
            metrics={[
                { label: 'Start Date', value: formatShortDate(row.start_date) },
                { label: 'End Date', value: formatShortDate(row.end_date) }
            ]}
            selectVariant="button"
            status={row.status}
            title={row.term_type_label}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}