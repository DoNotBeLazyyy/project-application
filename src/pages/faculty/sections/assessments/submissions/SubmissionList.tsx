import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import { SubmissionListRow, SubmissionStatus } from '@type/assessment.type';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
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
    const columnDefs = useMemo<ColDef<SubmissionListRow>[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                sortable: true
            },
            {
                field: 'full_name',
                flex: 2,
                headerName: 'Student Name',
                sortable: true
            },
            {
                field: 'attempt_number',
                flex: 1,
                headerName: 'Attempt',
                sortable: false
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: SubmissionListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STATUS_VARIANT_MAP[params.data.status]}
                        />
                    </div>
                )
            },
            {
                field: 'final_score',
                flex: 1,
                headerName: 'Score',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? String(params.value)
                    : '—'
            },
            {
                field: 'submitted_at',
                flex: 2,
                headerName: 'Submitted At',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleString()
                    : '—'
            },
            {
                field: 'is_late',
                flex: 1,
                headerName: 'Late',
                sortable: false,
                valueFormatter: (params) => params.value
                    ? 'Yes'
                    : 'No'
            }
        ];
    }, []);

    return (
        <div className="flex flex-col min-h-0 w-2/5">
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