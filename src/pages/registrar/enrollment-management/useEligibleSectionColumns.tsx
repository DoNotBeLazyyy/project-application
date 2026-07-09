import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { EligibleSectionRow } from '@type/enrollment.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

function renderAdvisories(row: EligibleSectionRow) {
    const advisories: { label: string; variant: 'success' | 'error' | 'warning' | 'info' }[] = [];

    if (row.is_recommended) {
        advisories.push({ label: 'Recommended', variant: 'success' });
    }

    if (row.is_elective) {
        advisories.push({ label: 'Elective', variant: 'info' });
    }

    if (row.is_full) {
        advisories.push({ label: 'Full', variant: 'error' });
    }

    if (row.conflict_with) {
        advisories.push({ label: `Conflicts with ${row.conflict_with}`, variant: 'error' });
    }

    if (row.unmet_prerequisites) {
        advisories.push({ label: `Needs ${row.unmet_prerequisites}`, variant: 'warning' });
    }

    if (!advisories.length) {
        advisories.push({ label: 'Open', variant: 'info' });
    }

    return (
        <div className="flex flex-wrap gap-1 h-full items-center">
            {advisories.map((advisory) => (
                <CommonBadgeStatus
                    key={advisory.label}
                    label={advisory.label}
                    variant={advisory.variant}
                />
            ))}
        </div>
    );
}

export function useEligibleSectionColumns() {
    return useMemo<ColDef<EligibleSectionRow>[]>(function() {
        return [
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course',
                minWidth: 110
            },
            {
                field: 'course_title',
                flex: 2,
                headerName: 'Title',
                minWidth: 180
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                minWidth: 110
            },
            {
                field: 'schedule_label',
                flex: 2,
                headerName: 'Schedule',
                minWidth: 200
            },
            {
                field: 'faculty_name',
                flex: 1,
                headerName: 'Faculty',
                minWidth: 140
            },
            {
                field: 'units',
                flex: 0,
                headerName: 'Units',
                maxWidth: 90,
                minWidth: 90,
                valueFormatter: (params) => Number(params.value)
                    .toFixed(1)
            },
            {
                colId: 'slots',
                flex: 0,
                headerName: 'Slots',
                maxWidth: 100,
                minWidth: 100,
                valueGetter: (params) => params.data
                    ? `${params.data.slots_taken}/${params.data.max_slots}`
                    : ''
            },
            {
                colId: 'advisories',
                flex: 2,
                headerName: 'Advisories',
                minWidth: 220,
                cellRenderer: (params: { data: EligibleSectionRow }) => renderAdvisories(params.data)
            }
        ];
    }, []);
}