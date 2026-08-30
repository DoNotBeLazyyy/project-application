import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { CourseListRow } from '@type/course/course.type';

export interface CourseGridCardProps {
    row: CourseListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * CourseGridCard
 *
 * Grid (bento) representation of a course row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): title as the hero title, code
 * as the subtitle, active state as the status pill, and department + units as
 * metrics.
 */
export default function CourseGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onRequestDelete
}: CourseGridCardProps) {
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
                    ariaLabel="Course actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Department', value: row.department_name },
                { label: 'Units', value: `${row.total_units} (${row.course_type_label})` }
            ]}
            selectVariant="button"
            status={row.is_active
                ? 'Active'
                : 'Inactive'}
            subtitle={row.code}
            title={row.title}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}