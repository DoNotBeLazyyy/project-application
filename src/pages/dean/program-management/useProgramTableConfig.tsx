import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { ProgramListRow } from '@type/program/program.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface useProgramTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useProgramTableConfig({
    onEdit,
    onRequestDeleteRow,
    onView
}: useProgramTableConfigProps) {
    const columnDefs = useMemo<ColDef<ProgramListRow>[]>(function() {
        return [
            {
                field: 'code',
                flex: 1.5,
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
                field: 'department_name',
                flex: 3,
                headerName: 'Department Name',
                sortable: false
            },
            {
                field: 'program_level_label',
                flex: 3,
                headerName: 'Program Level',
                sortable: false
            },
            {
                field: 'is_active',
                flex: 1.5,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: ProgramListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={
                                params.data.is_active
                                    ? 'Active'
                                    : 'Inactive'
                            }
                            variant={
                                params.data.is_active
                                    ? 'success'
                                    : 'warning'
                            }
                        />
                    </div>
                )
            }
        ];
    }, []);
    const tableActionConfig = useMemo(function() {
        return function(onDelete: (id: string) => void): TableActionConfig<ProgramListRow> {
            return {
                onEditClick: (row: ProgramListRow) => () => onEdit(row.id),
                menuOptions: (row: ProgramListRow): MenuOption[] => [
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