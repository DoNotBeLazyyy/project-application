import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { DepartmentListRow } from '@type/department.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface UseDepartmentTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useDepartmentTableConfig({
    onEdit,
    onView
}: UseDepartmentTableConfigProps) {
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
                field: 'description',
                flex: 3,
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

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<DepartmentListRow> {
            return {
                onEditClick: (row: DepartmentListRow) => () => onEdit(row.id),
                menuOptions: (row: DepartmentListRow): MenuOption[] => [
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
