import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { ProgramLevelListRow } from '@type/program/program-level.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface UseProgramLevelTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useProgramLevelTableConfig({
    onEdit,
    onView
}: UseProgramLevelTableConfigProps) {
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