import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { AnnouncementListRow } from '@type/announcement.type';
import { formatShortDate } from '@utils/date.util';

export interface AnnouncementGridCardProps {
    row: AnnouncementListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * AnnouncementGridCard
 *
 * Grid (bento) representation of an announcement row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md): title as the
 * hero title, author as the subtitle, publish/pin state as the status pill,
 * and audience + posted date as metrics.
 */
export default function AnnouncementGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: AnnouncementGridCardProps) {
    const status = row.is_pinned
        ? 'Pinned'
        : row.published_at
            ? 'Published'
            : 'Draft';

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
                    ariaLabel="Announcement actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Audience', value: row.target_audience },
                { label: 'Posted', value: formatShortDate(row.published_at ?? row.created_at) }
            ]}
            selectVariant="button"
            status={status}
            title={row.title}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}