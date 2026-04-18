import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { ProgramLevelListRow } from '@type/program/program-level.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseProgramLevelTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useProgramLevelTableConfig({
    onEdit,
    onRequestDeleteRow,
    onView
}: UseProgramLevelTableConfigProps) {
    const columnDefs = useMemo<ColDef<ProgramLevelListRow>[]>(function() {
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
        return function(onDelete: (id: string) => void): TableActionConfig<ProgramLevelListRow> {
            return {
                onEditClick: (row: ProgramLevelListRow) => () => onEdit(row.id),
                menuOptions: (row: ProgramLevelListRow): MenuOption[] => [
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