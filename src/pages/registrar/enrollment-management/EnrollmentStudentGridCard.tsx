import BentoCardActionMenu from '@components/card/BentoCardActionMenu';
import CommonBentoCard from '@components/card/CommonBentoCard';
import { CopyIcon, EnvelopeSimpleIcon, EyeIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { EnrollmentStudentRow } from '@type/enrollment.type';

export interface EnrollmentStudentGridCardProps {
    row: EnrollmentStudentRow;
    isSelected: boolean;
    onToggleSelect: () => void;
    onManage: (id: string) => void;
}

/**
 * EnrollmentStudentGridCard
 *
 * Grid (bento) representation of an enrollment student row for Registrar.
 * Displays student name as title, student number as code tag, program & year,
 * enrolled load metrics, and a fully functional kebab menu for managing
 * enrollments and copying student info.
 */
export default function EnrollmentStudentGridCard({
    row,
    isSelected,
    onToggleSelect,
    onManage
}: EnrollmentStudentGridCardProps) {
    function handleCopy(text: string, message: string) {
        if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text);
            useToastStore.getState().showToast(message, 'success');
        }
    }

    const actions = [
        {
            key: 'manage',
            label: 'Manage Enrollment',
            icon: <PencilSimpleIcon size={18} weight="bold" />,
            onClick: () => onManage(row.id)
        },
        {
            key: 'view',
            label: 'View Current Load',
            icon: <EyeIcon size={18} weight="bold" />,
            onClick: () => onManage(row.id)
        },
        {
            key: 'copy_student_no',
            label: 'Copy Student No.',
            icon: <CopyIcon size={18} weight="bold" />,
            onClick: () => handleCopy(row.student_number, 'Student number copied to clipboard')
        },
        ...(row.email
            ? [
                {
                    key: 'copy_email',
                    label: 'Copy Email',
                    icon: <EnvelopeSimpleIcon size={18} weight="bold" />,
                    onClick: () => handleCopy(row.email, 'Email copied to clipboard')
                }
            ]
            : [])
    ];

    const enrolledUnits = Number(row.enrolled_units).toFixed(1);

    return (
        <CommonBentoCard
            actionMenu={(
                <BentoCardActionMenu
                    actions={actions}
                    ariaLabel="Enrollment student actions"
                />
            )}
            code={row.student_number}
            details={row.email ? [{ label: 'Email', value: row.email, lines: 1 }] : undefined}
            footerMeta={`Student: ${row.status}`}
            isSelected={isSelected}
            metrics={[
                {
                    label: 'Program & Year',
                    value: `${row.program_code || 'Unassigned'} • Year ${row.year_level}`
                },
                {
                    label: 'Enrolled Load',
                    value: `${row.enrolled_count} Subjects (${enrolledUnits} Units)`
                }
            ]}
            primaryAction={{
                label: 'Manage Load',
                onClick: () => onManage(row.id)
            }}
            secondaryAction={{
                label: 'View Load',
                onClick: () => onManage(row.id)
            }}
            selectVariant="button"
            status={row.enrollment_state}
            subtitle={`${row.program_code || 'No Program'} · Year ${row.year_level}`}
            title={row.student_name}
            onClick={() => onManage(row.id)}
            onToggleSelect={onToggleSelect}
        />
    );
}
