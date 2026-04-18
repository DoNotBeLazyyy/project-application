import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { TermTypeListRow } from '@type/term/term-type.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseTermTypeTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useTermTypeTableConfig({
    onEdit,
    onRequestDeleteRow,
    onView
}: UseTermTypeTableConfigProps) {
    const columnDefs = useMemo<ColDef<TermTypeListRow>[]>(function() {
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
            },
            {
                field: 'sequence',
                flex: 1,
                headerName: 'Sequence',
                sortable: true
            }
        ];
    }, []);

    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<TermTypeListRow> {
            return {
                onEditClick: (row: TermTypeListRow) => function() {
                    onEdit(row.id);
                },
                menuOptions: (row: TermTypeListRow): MenuOption[] => [
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