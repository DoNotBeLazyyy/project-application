import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { MobileCardColDef } from '@type/table.type';
import { TermTypeListRow } from '@type/term/term-type.type';
import { useMemo } from 'react';

interface UseTermTypeTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useTermTypeTableConfig({
    onEdit,
    onView
}: UseTermTypeTableConfigProps) {
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