import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CopyIcon, EnvelopeSimpleIcon } from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { EnrollmentStudentRow, StudentStatus } from '@type/enrollment.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface UseEnrollmentStudentTableConfigProps {
    onManage: (id: string) => void;
}

const STUDENT_STATUS_VARIANT_MAP: Record<StudentStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Active: 'success',
    Inactive: 'warning',
    LOA: 'warning',
    Graduated: 'info',
    Expelled: 'error'
};

export function useEnrollmentStudentTableConfig({
    onManage
}: UseEnrollmentStudentTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'student_name',
                flex: 2,
                headerName: 'Student Name',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'program_code',
                flex: 1,
                headerName: 'Program',
                sortable: true
            },
            {
                field: 'year_level',
                flex: 1,
                headerName: 'Year',
                sortable: true,
                valueFormatter: (params) => `Year ${params.value}`
            },
            {
                field: 'enrolled_count',
                flex: 1,
                headerName: 'Subjects',
                sortable: true
            },
            {
                field: 'enrolled_units',
                flex: 1,
                headerName: 'Units',
                sortable: true,
                valueFormatter: (params) => Number(params.value)
                    .toFixed(1)
            },
            {
                field: 'enrollment_state',
                flex: 1,
                headerName: 'Enrollment',
                sortable: true,
                cellRenderer: (params: { data: EnrollmentStudentRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.enrollment_state}
                            variant={params.data.enrollment_state === 'Enrolled'
                                ? 'success'
                                : 'warning'}
                        />
                    </div>
                )
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Student Status',
                mobileCard: 'hidden',
                sortable: true,
                cellRenderer: (params: { data: EnrollmentStudentRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STUDENT_STATUS_VARIANT_MAP[params.data.status]}
                        />
                    </div>
                )
            }
        ];
    }, []);

    const tableActionConfig = useMemo<TableActionConfig<EnrollmentStudentRow>>(function() {
        return {
            onEditClick: (row: EnrollmentStudentRow) => () => onManage(row.id),
            menuOptions: (row: EnrollmentStudentRow): MenuOption[] => [
                {
                    preset: 'edit',
                    onClick: () => onManage(row.id)
                },
                {
                    preset: 'view',
                    onClick: () => onManage(row.id)
                },
                {
                    children: (
                        <div className="flex gap-2 items-center">
                            <CopyIcon size={18} weight="bold" />
                            <span>Copy Student No.</span>
                        </div>
                    ),
                    onClick: () => {
                        if (navigator?.clipboard?.writeText) {
                            navigator.clipboard.writeText(row.student_number);
                            useToastStore.getState().showToast('Student number copied to clipboard', 'success');
                        }
                    }
                },
                ...(row.email
                    ? [
                        {
                            children: (
                                <div className="flex gap-2 items-center">
                                    <EnvelopeSimpleIcon size={18} weight="bold" />
                                    <span>Copy Email</span>
                                </div>
                            ),
                            onClick: () => {
                                if (navigator?.clipboard?.writeText) {
                                    navigator.clipboard.writeText(row.email);
                                    useToastStore.getState().showToast('Email copied to clipboard', 'success');
                                }
                            }
                        }
                    ]
                    : [])
            ]
        };
    }, [onManage]);

    return { columnDefs, tableActionConfig };
}