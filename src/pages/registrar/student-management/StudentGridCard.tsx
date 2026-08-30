import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import {
    ArrowsClockwiseIcon,
    EyeIcon, FileTextIcon, PencilSimpleIcon, TrashIcon
} from '@phosphor-icons/react';
import { StudentListRow } from '@type/student.type';

export interface StudentGridCardProps {
    row: StudentListRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onView: (id: string) => void;
    onEdit: (id: string) => void;
    onViewRecords: (id: string) => void;
    onEvaluate: (id: string) => void;
    onRequestDelete: (id: string) => void;
}

/**
 * StudentGridCard
 *
 * Grid (bento) representation of a student row. Follows the shared management-list
 * card pattern (see docs/MANAGEMENT_LIST_CARDS.md): full name as the hero title,
 * student number as the subtitle, standing as the status pill, program + year
 * level as metrics. The action menu mirrors the table row options.
 */
export default function StudentGridCard({
    row,
    isSelected,
    onToggleSelect,
    onView,
    onEdit,
    onViewRecords,
    onEvaluate,
    onRequestDelete
}: StudentGridCardProps) {
    const fullName = `${row.first_name} ${row.last_name}`.trim();

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
                            key: 'records',
                            label: 'Academic Records',
                            icon: <FileTextIcon size={18} weight="bold" />,
                            onClick: () => onViewRecords(row.id)
                        },
                        {
                            key: 'evaluate',
                            label: 'Re-evaluate Year Level',
                            icon: <ArrowsClockwiseIcon size={18} weight="bold" />,
                            onClick: () => onEvaluate(row.id)
                        },
                        {
                            key: 'delete',
                            label: 'Delete',
                            icon: <TrashIcon size={18} weight="bold" />,
                            destructive: true,
                            onClick: () => onRequestDelete(row.id)
                        }
                    ]}
                    ariaLabel="Student actions"
                />
            )}
            isSelected={isSelected}
            metrics={[
                { label: 'Program', value: row.program_code ?? 'Unassigned' },
                { label: 'Year Level', value: `Year ${row.year_level}` }
            ]}
            selectVariant="button"
            status={row.status}
            title={fullName || row.email}
            onClick={() => onView(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}