import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CourseListRow } from '@type/course/course.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface UseCourseTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useCourseTableConfig({
    onEdit,
    onView
}: UseCourseTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'code',
                flex: 1,
                headerName: 'Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'title',
                flex: 3,
                headerName: 'Title',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'department_name',
                flex: 2,
                headerName: 'Department',
                sortable: true
            },
            {
                field: 'course_type_label',
                flex: 2,
                headerName: 'Course Type',
                sortable: true
            },
            {
                field: 'total_units',
                flex: 1,
                headerName: 'Units',
                sortable: false
            },
            {
                field: 'is_active',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: CourseListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.is_active
                                ? 'Active'
                                : 'Inactive'}
                            variant={params.data.is_active
                                ? 'success'
                                : 'error'}
                        />
                    </div>
                )
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<CourseListRow> {
            return {
                onEditClick: (row: CourseListRow) => () => onEdit(row.id),
                menuOptions: (row: CourseListRow): MenuOption[] => [
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