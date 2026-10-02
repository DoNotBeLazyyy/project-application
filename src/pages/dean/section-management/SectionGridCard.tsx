import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { CopyIcon, EyeIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { SectionListRow } from '@type/section.type';
import { formatTermLabel } from '@utils/term.util';

export interface SectionGridCardProps {
    row: SectionListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onCopySetup: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * SectionGridCard
 *
 * Grid (bento) representation of a section row. Follows the shared
 * management-list card pattern (see docs/MANAGEMENT_LIST_CARDS.md). Faculty falls
 * back to initials when there is no profile photo, and to "Not assigned" when no
 * faculty is set.
 */
export default function SectionGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onCopySetup,
    onRequestDelete
}: SectionGridCardProps) {
    const hasFaculty = Boolean(row.faculty_id && row.faculty_name);
    const isEditable = row.is_active_academic_year !== false;

    const actions = [
        {
            key: 'view',
            label: 'View',
            icon: <EyeIcon size={18} weight="bold" />,
            onClick: () => onView(row.id)
        },
        ...(isEditable
            ? [
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
            ]
            : []),
        {
            key: 'copy',
            label: 'Copy Grading Setup',
            icon: <CopyIcon size={18} weight="bold" />,
            onClick: () => onCopySetup(row.id)
        }
    ];

    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={actions}
                    ariaLabel="Section actions"
                />
            )}
            faculty={hasFaculty
                ? { name: row.faculty_name as string, role: 'FACULTY IN-CHARGE' }
                : undefined}
            facultyNotAssigned
            isSelected={isSelected}
            metrics={[
                { label: 'Term', value: formatTermLabel(row.term_label) },
                { label: 'Room', value: row.room ?? 'No room assigned' }
            ]}
            progress={{
                current: row.enrolled_count ?? 0,
                formatPercent: true,
                label: 'Capacity',
                total: row.max_slots
            }}
            selectVariant="button"
            status=""
            subtitle={`${row.section_code} · ${row.status}${!isEditable ? ' · Read-Only' : ''}`}
            title={row.course_title}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}