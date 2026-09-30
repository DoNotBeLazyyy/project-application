import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { CommunicationListRow } from '@type/announcement.type';
import { formatShortDate } from '@utils/date.util';

export interface CommunicationGridCardProps {
    isSelected: boolean;
    row: CommunicationListRow;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
    onToggleSelect: () => void;
    onView: (id: string) => void;
}

export default function CommunicationGridCard({
    isSelected,
    row,
    onEdit,
    onRequestDelete,
    onToggleSelect,
    onView
}: CommunicationGridCardProps) {
    let status = 'Announcement';
    if (row.item_type === 'Event') {
        const isUpcoming = new Date(row.start_at || row.date).getTime() >= Date.now();
        status = isUpcoming ? 'Upcoming Event' : 'Past Event';
    } else {
        status = row.is_pinned ? 'Pinned' : 'Announcement';
    }

    const audienceLabel = row.target_audience === 'Section'
        ? `${row.section_count || 1} Section(s)`
        : row.target_audience;

    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={[
                        {
                            icon: <EyeIcon size={18} weight="bold" />,
                            key: 'view',
                            label: 'View',
                            onClick: () => onView(row.id)
                        },
                        {
                            icon: <PencilSimpleIcon size={18} weight="bold" />,
                            key: 'edit',
                            label: 'Edit',
                            onClick: () => onEdit(row.id)
                        },
                        {
                            destructive: true,
                            icon: <TrashIcon size={18} weight="bold" />,
                            key: 'delete',
                            label: 'Delete',
                            onClick: () => onRequestDelete(row.id)
                        }
                    ]}
                    ariaLabel="Communication item actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Type', value: row.item_type },
                { label: 'Audience', value: audienceLabel },
                {
                    label: row.item_type === 'Event' ? 'Starts' : 'Posted',
                    value: formatShortDate(row.date || row.created_at)
                },
                ...(row.attachment_count && row.attachment_count > 0
                    ? [{ label: 'Attachments', value: `${row.attachment_count}` }]
                    : [])
            ]}
            selectVariant="button"
            status={status}
            title={row.title}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}
