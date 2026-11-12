import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { SchoolYearListRow } from '@type/school-year.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useSchoolYearTableConfig() {
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

    return { columnDefs };
}