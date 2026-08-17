import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { ScheduleConflictRow } from '@type/faculty-load.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useScheduleConflictTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'conflict_type',
                flex: 2,
                headerName: 'Type',
                mobileCard: 'subtitle',
                cellRenderer: (params: { data: ScheduleConflictRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.conflict_type === 'Faculty'
                                ? 'Faculty double-booking'
                                : 'Room double-booking'}
                            variant="error"
                        />
                    </div>
                )
            },
            {
                field: 'subject_label',
                flex: 2,
                headerName: 'Faculty / Room',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'day_of_week',
                flex: 1,
                headerName: 'Day',
                sortable: true
            },
            {
                field: 'overlap_start',
                flex: 2,
                headerName: 'Overlap',
                valueGetter: (params) => params.data
                    ? `${params.data.overlap_start} – ${params.data.overlap_end}`
                    : ''
            },
            {
                field: 'section_a',
                flex: 1,
                headerName: 'Section A',
                sortable: true
            },
            {
                field: 'section_b',
                flex: 1,
                headerName: 'Section B',
                sortable: true
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                mobileCard: 'hidden',
                sortable: true
            }
        ];
    }, []);

    return { columnDefs };
}