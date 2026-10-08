import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { ProgramListRow } from '@type/program/program.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface useProgramTableConfigProps {
    onEdit: (id: string) => void;
    onRequestDeleteRow: (id: string) => void;
    onView: (id: string) => void;
}

export function useProgramTableConfig({
    onEdit,
    onView
}: useProgramTableConfigProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'code',
                flex: 1.5,
                headerName: 'Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'name',
                flex: 3,
                headerName: 'Name',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'department_name',
                flex: 3,
                headerName: 'Department',
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