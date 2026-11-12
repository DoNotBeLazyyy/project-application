import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { FacultyLoadRow } from '@type/faculty-load.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useFacultyLoadTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'faculty_name',
                flex: 3,
                headerName: 'Faculty',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'email',
                flex: 3,
                headerName: 'Email',
                mobileCard: 'subtitle'
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
                cellRenderer: (params: { data?: FacultyLoadRow }) => {
                    if (!params?.data) return null;
                    const count = Number(params.data.conflict_count) || 0;
                    return (
                        <div className="flex h-full items-center">
                            <CommonBadgeStatus
                                label={count > 0
                                    ? `${count} conflict(s)`
                                    : 'No conflicts'}
                                variant={count > 0
                                    ? 'error'
                                    : 'success'}
                            />
                        </div>
                    );
                }
            }
        ];
    }, []);

    return { columnDefs };
}