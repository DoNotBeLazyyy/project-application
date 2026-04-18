import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { RoleListRow } from '@type/role.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseRoleTableConfigProps {
    onRequestDeleteRow: (id: string) => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

export function useRoleTableConfig({
    onRequestDeleteRow,
    onEdit,
    onView
}: UseRoleTableConfigProps) {
    const columnDefs = useMemo<ColDef<RoleListRow>[]>(function() {
        return [
            {
                field: 'code',
                flex: 2,
                headerName: 'Code',
                sortable: true
            },
            {
                field: 'label',
                flex: 3,
                headerName: 'Label',
                sortable: true
            },
            {
                field: 'description',
                flex: 4,
                headerName: 'Description',
                sortable: false
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<RoleListRow> {
            return {
                onEditClick: (row: RoleListRow) => function() {
                    onEdit(row.id);
                },
                menuOptions: (row: RoleListRow): MenuOption[] => [
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