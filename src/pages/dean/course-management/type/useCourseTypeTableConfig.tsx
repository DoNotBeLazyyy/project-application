import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CourseTypeListRow } from '@type/course/course-type.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface useCourseTypeTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useCourseTypeTableConfig({
    onEdit,
    onView
}: useCourseTypeTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'code',
                flex: 2,
                headerName: 'Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'label',
                flex: 3,
                headerName: 'Label',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'description',
                flex: 4,
                headerName: 'Description',
                sortable: false
            },
            {
                cellRenderer: (params: { data: CourseTypeListRow }) => {
                    const isActive = params.data?.is_active ?? true;
                    return (
                        <div className="flex h-full items-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                isActive 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 border border-slate-200 dark:border-zinc-700'
                            }`}>
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    );
                },
                field: 'is_active',
                flex: 1.5,
                headerName: 'Status',
                sortable: true
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<CourseTypeListRow> {
            return {
                onEditClick: (row: CourseTypeListRow) => () => onEdit(row.id),
                menuOptions: (row: CourseTypeListRow): MenuOption[] => [
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