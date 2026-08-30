import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { EventListRow } from '@type/event.type';
import { formatShortDate } from '@utils/date.util';

export interface EventGridCardProps {
    row: EventListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * EventGridCard
 *
 * Grid (bento) representation of an event row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): title as the hero title,
 * location as the subtitle, upcoming/past as the status pill, and start date +
 * audience as metrics.
 */
export default function EventGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: EventGridCardProps) {
    const isUpcoming = new Date(row.start_at)
        .getTime() >= Date.now();

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
                    ariaLabel="Event actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Starts', value: formatShortDate(row.start_at) },
                { label: 'Audience', value: row.target_audience }
            ]}
            selectVariant="button"
            status={isUpcoming
                ? 'Upcoming'
                : 'Past'}
            title={row.title}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}