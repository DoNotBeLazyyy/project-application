import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { CourseTypeListRow } from '@type/course/course-type.type';

export interface CourseTypeGridCardProps {
    row: CourseTypeListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * CourseTypeGridCard
 *
 * Grid (bento) representation of a course type row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md): label as the
 * hero title, and code as the subtitle.
 */
export default function CourseTypeGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: CourseTypeGridCardProps) {
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
                    ariaLabel="Course type actions"
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