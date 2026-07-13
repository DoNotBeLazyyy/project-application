import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { FacultyLoadRow } from '@type/faculty-load.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

export function useFacultyLoadTableConfig() {
    const columnDefs = useMemo<ColDef<FacultyLoadRow>[]>(function() {
        return [
            {
                field: 'faculty_name',
                flex: 3,
                headerName: 'Faculty',
                sortable: true
            },
            {
                field: 'email',
                flex: 3,
                headerName: 'Email'
            },
            {
                field: 'section_count',
                flex: 1,
                headerName: 'Sections'
            },
            {
                field: 'total_units',
                flex: 1,
                headerName: 'Units'
            },
            {
                field: 'weekly_hours',
                flex: 1,
                headerName: 'Hrs / Week'
            },
            {
                field: 'student_count',
                flex: 1,
                headerName: 'Students'
            },
            {
                field: 'conflict_count',
                flex: 2,
                headerName: 'Schedule',
                cellRenderer: (params: { data: FacultyLoadRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.conflict_count > 0
                                ? `${params.data.conflict_count} conflict(s)`
                                : 'No conflicts'}
                            variant={params.data.conflict_count > 0
                                ? 'error'
                                : 'success'}
                        />
                    </div>
                )
            }
        ];
    }, []);

    return { columnDefs };
}