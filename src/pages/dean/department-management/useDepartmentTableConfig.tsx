import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { DepartmentListRow } from '@type/department.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseDepartmentTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useDepartmentTableConfig({
    onEdit,
    onRequestDeleteRow,
    onView
}: UseDepartmentTableConfigProps) {
    const columnDefs = useMemo<ColDef<DepartmentListRow>[]>(function() {
        return [
            {
                field: 'code',
                flex: 1,
                headerName: 'Code',
                sortable: true
            },
            {
                field: 'name',
                flex: 3,
                headerName: 'Name',
                sortable: true
            },
            {
                field: 'head_full_name',
                flex: 2,
                headerName: 'Department Head',
                sortable: false,
                cellRenderer: (params: { data: DepartmentListRow }) => (
                    <div className="flex h-full items-center">
                        {params.data.head_full_name
                            ? (
                                <span className="text-(--mui-palette-text-primary) text-sm">
                                    {params.data.head_full_name}
                                    <span className="ml-1 text-(--mui-palette-text-secondary) text-xs">
                                        — {params.data.head_role_label}
                                    </span>
                                </span>
                            )
                            : (
                                <CommonBadgeStatus
                                    label="Unassigned"
                                    variant="warning"
                                />
                            )
                        }
                    </div>
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