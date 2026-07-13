import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { StudentListRow, StudentStatus } from '@type/student.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseStudentTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
    onEvaluate: (id: string) => void;
    onViewRecords: (id: string) => void;
}

const STATUS_VARIANT_MAP: Record<StudentStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Active: 'success',
    Inactive: 'error',
    LOA: 'warning',
    Graduated: 'info',
    Expelled: 'error'
};

export function useStudentTableConfig({
    onEdit,
    onView,
    onEvaluate,
    onViewRecords
}: UseStudentTableConfigProps) {
    const columnDefs = useMemo<ColDef<StudentListRow>[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                sortable: true
            },
            {
                field: 'last_name',
                flex: 2,
                headerName: 'Last Name',
                sortable: true
            },
            {
                field: 'first_name',
                flex: 2,
                headerName: 'First Name',
                sortable: true
            },
            {
                field: 'email',
                flex: 3,
                headerName: 'Email',
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
                headerName: 'Year Level',
                sortable: true
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: StudentListRow }) => (
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
        return function(onDelete: (id: string) => void): TableActionConfig<StudentListRow> {
            return {
                onEditClick: (row: StudentListRow) => () => onEdit(row.id),
                menuOptions: (row: StudentListRow): MenuOption[] => [
                    {
                        preset: 'view',
                        onClick: () => onView(row.id)
                    },
                    {
                        preset: 'edit',
                        onClick: () => onEdit(row.id)
                    },
                    {
                        children: (
                            <div className="flex gap-2 items-center">
                                <span>Academic Records</span>
                            </div>
                        ),
                        onClick: () => onViewRecords(row.id)
                    },
                    {
                        children: (
                            <div className="flex gap-2 items-center">
                                <span>Re-evaluate Year Level</span>
                            </div>
                        ),
                        onClick: () => onEvaluate(row.id)
                    },
                    {
                        preset: 'delete',
                        onClick: () => onDelete(row.id)
                    }
                ]
            };
        };
    }, [onEdit, onView, onEvaluate, onViewRecords]);

    return { columnDefs, tableActionConfig };
}