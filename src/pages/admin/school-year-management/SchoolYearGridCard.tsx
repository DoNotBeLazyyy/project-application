import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { SchoolYearListRow } from '@type/school-year.type';
import { formatShortDate } from '@utils/date.util';

export interface SchoolYearGridCardProps {
    row: SchoolYearListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * SchoolYearGridCard
 *
 * Grid (bento) representation of an academic year row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md): label as the
 * hero title, code as the subtitle, active state as the status pill, start/end
 * dates as metrics.
 */
export default function SchoolYearGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: SchoolYearGridCardProps) {
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
                    ariaLabel="Academic year actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Start Date', value: formatShortDate(row.start_date) },
                { label: 'End Date', value: formatShortDate(row.end_date) }
            ]}
            selectVariant="button"
            status={row.is_active
                ? 'Active'
                : 'Inactive'}
            title={row.label}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}