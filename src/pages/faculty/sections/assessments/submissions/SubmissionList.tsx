import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import { SubmissionListRow, SubmissionStatus } from '@type/assessment.type';
import { MobileCardColDef } from '@type/table.type';
import { RowClickedEvent } from 'ag-grid-community';
import { useMemo } from 'react';

const STATUS_VARIANT_MAP: Record<SubmissionStatus, 'success' | 'error' | 'warning' | 'info'> = {
    'Not Started': 'warning',
    'In Progress': 'warning',
    'Submitted': 'info',
    'Late': 'error',
    'Graded': 'success',
    'Returned': 'success'
};

interface SubmissionListProps {
    submissions: SubmissionListRow[];
    onSelect: (submissionId: string) => Promise<void>;
}

export default function SubmissionList({ submissions, onSelect }: SubmissionListProps) {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        // Shares the page with the grading panel, so columns stay few: student (name + number),
        // status (already says "Late"), score, and when it was submitted
        return [
            {
                cellRenderer: (params: { data: SubmissionListRow }) => (
                    <div className="flex flex-col h-full justify-center leading-tight min-w-0">
                        <span className="font-medium truncate">{params.data.full_name}</span>
                        <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                            {params.data.student_number}
                            {params.data.attempt_number > 1
                                ? ` · Attempt ${params.data.attempt_number}`
                                : ''}
                        </span>
                    </div>
                ),
                field: 'full_name',
                flex: 2,
                headerName: 'Student',
                minWidth: 150,
                mobileCard: 'title',
                sortable: true
            },
            {
                cellRenderer: (params: { data: SubmissionListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STATUS_VARIANT_MAP[params.data.status]}
                        />
                    </div>
                ),
                field: 'status',
                flex: 1,
                headerName: 'Status',
                minWidth: 110,
                sortable: false
            },
            {
                field: 'final_score',
                flex: 1,
                headerName: 'Score',
                minWidth: 70,
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? String(params.value)
                    : '—'
            },
            {
                field: 'submitted_at',
                flex: 1,
                headerName: 'Submitted',
                minWidth: 120,
                sortable: true,
                valueFormatter: (params) => params.value
                    ? new Date(params.value as string)
                        .toLocaleString('en-US', {
                            day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short'
                        })
                    : '—'
            }
        ];
    }, []);

    return (
        <div className="flex flex-col min-h-0 w-full h-full">
            <CommonTable<SubmissionListRow>
                leadingColumnDefs={columnDefs}
                rowData={submissions}
                onRowClicked={function(e: RowClickedEvent<SubmissionListRow>) {
                    if (e.data) {
                        onSelect(e.data.id);
                    }
                }}
            />
        </div>
    );
}