import { ProgressionPreviewRow } from '@type/progression.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

function resolveOutcome(row: ProgressionPreviewRow): string {
    if (row.blocker_code) {
        return 'Skipped';
    }

    if (row.is_promoted) {
        return `Promote to Year ${row.proposed_year_level}`;
    }

    return 'Stays in current year';
}

export function useProgressionColumns(): ColDef<ProgressionPreviewRow>[] {
    return useMemo(function(): ColDef<ProgressionPreviewRow>[] {
        return [
            { field: 'student_number', flex: 1, headerName: 'Student No.', minWidth: 130 },
            { field: 'student_name', flex: 2, headerName: 'Student Name', minWidth: 180 },
            { field: 'program_code', flex: 1, headerName: 'Program', minWidth: 110 },
            {
                field: 'current_year_level',
                flex: 0,
                headerName: 'Year',
                maxWidth: 90,
                minWidth: 90,
                valueFormatter: (params) => `Year ${params.value}`
            },
            {
                colId: 'outcome',
                flex: 2,
                headerName: 'Outcome',
                minWidth: 200,
                valueGetter: (params) => params.data
                    ? resolveOutcome(params.data)
                    : ''
            },
            {
                field: 'enrollable_count',
                flex: 1,
                headerName: 'Subjects To Enroll',
                minWidth: 150
            },
            {
                colId: 'notes',
                flex: 3,
                headerName: 'Notes',
                minWidth: 240,
                valueGetter: (params) => {
                    if (!params.data) {
                        return '';
                    }

                    if (params.data.blocker_message) {
                        return params.data.blocker_message;
                    }

                    if (params.data.issue_count > 0) {
                        return `${params.data.issue_count} subject(s) need attention`;
                    }

                    return 'Ready';
                }
            }
        ];
    }, []);
}