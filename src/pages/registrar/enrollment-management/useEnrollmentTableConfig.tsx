import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { EnrollmentListRow, EnrollmentStatus } from '@type/enrollment.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseEnrollmentTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

const STATUS_VARIANT_MAP: Record<EnrollmentStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Enrolled: 'success',
    Dropped: 'error',
    Withdrawn: 'error',
    Completed: 'info',
    Failed: 'error',
    Incomplete: 'warning'
};

export function useEnrollmentTableConfig({
    onEdit,
    onView
}: UseEnrollmentTableConfigProps) {
    const columnDefs = useMemo<ColDef<EnrollmentListRow>[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                sortable: true
            },
            {
                field: 'student_name',
                flex: 2,
                headerName: 'Student Name',
                sortable: true
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                sortable: true
            },
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                sortable: true
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                sortable: true
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: EnrollmentListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STATUS_VARIANT_MAP[params.data.status]}
                        />
                    </div>
                )
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<EnrollmentListRow> {
            return {
                onEditClick: (row: EnrollmentListRow) => () => onEdit(row.id),
                menuOptions: (row: EnrollmentListRow): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => onView(row.id)
                    },
                    {
                        preset: 'edit',
                        onClick: () => onEdit(row.id)
                    },
                    {
                        preset: 'delete',
                        onClick: () => onDelete(row.id)
                    }
                ]
            };
        };
    }, [onEdit, onView]);

    return { columnDefs, tableActionConfig };
}