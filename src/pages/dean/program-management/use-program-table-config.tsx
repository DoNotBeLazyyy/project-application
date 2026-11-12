import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { ProgramListRow } from '@type/program/program.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useProgramTableConfig() {
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
    return { columnDefs };
}