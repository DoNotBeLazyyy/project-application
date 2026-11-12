import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { SECTION_STATUS_VARIANT } from '@constants/status-badge.constant';
import { SectionListRow } from '@type/section.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useSectionTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                sortable: true
            },
            {
                field: 'program_code',
                flex: 1,
                headerName: 'Program',
                sortable: true
            },
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                sortable: true
            },
            {
                field: 'room',
                flex: 1,
                headerName: 'Room',
                sortable: false
            },
            {
                field: 'max_slots',
                flex: 1,
                headerName: 'Max Slots',
                sortable: false
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: SectionListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={SECTION_STATUS_VARIANT[params.data.status]}
                        />
                    </div>
                )
            }
        ];
    }, []);

    return { columnDefs };
}