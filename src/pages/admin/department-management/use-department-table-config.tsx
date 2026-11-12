import { DepartmentListRow } from '@type/department.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useDepartmentTableConfig() {
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
                field: 'name',
                flex: 2,
                headerName: 'Name',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'dean_name',
                flex: 1.5,
                headerName: 'Assigned Dean',
                sortable: false,
                cellRenderer: (params: { data: DepartmentListRow }) => (
                    <span
                        className={params.data.dean_name
                            ? 'text-sm font-medium text-slate-800 dark:text-slate-200 truncate'
                            : 'text-sm text-(--mui-palette-text-secondary) italic truncate'}
                    >
                        {params.data.dean_name || 'Unassigned'}
                    </span>
                )
            },
            {
                field: 'faculty_count',
                flex: 1,
                headerName: 'Faculty',
                sortable: false,
                cellRenderer: (params: { data: DepartmentListRow }) => {
                    const count = params.data.faculty_count ?? 0;
                    return (
                        <div
                            className="flex h-full items-center"
                            title={params.data.faculty_names || 'No faculty assigned'}
                        >
                            <span
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                    count > 0
                                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                                }`}
                            >
                                {count} {count === 1
                                    ? 'Faculty'
                                    : 'Faculties'}
                            </span>
                        </div>
                    );
                }
            },
            {
                field: 'description',
                flex: 2,
                headerName: 'Description',
                sortable: false,
                cellRenderer: (params: { data: DepartmentListRow }) => (
                    <span className="text-(--mui-palette-text-secondary) text-sm truncate">
                        {params.data.description || '—'}
                    </span>
                )
            }
        ];
    }, []);

    return { columnDefs };
}