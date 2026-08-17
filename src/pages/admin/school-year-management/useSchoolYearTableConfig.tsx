import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { MenuOption } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { SchoolYearListRow } from '@type/school-year.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface UseSchoolYearTableConfigProps {
    onRequestDeleteRow: (id: string) => void;
    onEdit: (id: string) => void;
    onView: (id: string) => void;
}

export function useSchoolYearTableConfig({
    onEdit,
    onView
}: UseSchoolYearTableConfigProps) {
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
                field: 'start_date',
                flex: 2,
                headerName: 'Start Date',
                sortable: true
            },
            {
                field: 'end_date',
                flex: 2,
                headerName: 'End Date',
                sortable: true
            },
            {
                field: 'is_active',
                flex: 1.5,
                headerName: 'Active',
                sortable: true,
                cellRenderer: (params: { data: SchoolYearListRow }) => (
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
        return function(onDelete: (id: string) => void): TableActionConfig<SchoolYearListRow> {
            return {
                onEditClick: (row: SchoolYearListRow) => function() {
                    onEdit(row.id);
                },
                menuOptions: (row: SchoolYearListRow): MenuOption[] => [
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