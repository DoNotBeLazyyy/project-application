import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import { SUBMISSION_STATUS_VARIANT } from '@constants/status-badge.constant';
import { IntegritySubmission } from '@type/analytics.type';
import { SubmissionListRow } from '@type/assessment.type';
import { MobileCardColDef } from '@type/table.type';
import { RowClickedEvent } from 'ag-grid-community';
import { useMemo } from 'react';

interface SubmissionListProps {
    // Integrity signals by submission id; optional so the list works without the report
    integrityById?: Record<string, IntegritySubmission>;
    isLoading?: boolean;
    submissions: SubmissionListRow[];
    onSelect: (submissionId: string) => Promise<void>;
}

/**
 * Small flag under a student's name: red when they shared a network with another student
 * during the attempt, amber when they left the quiz screen.
 */
function IntegrityBadge({ integrity }: { integrity: IntegritySubmission | undefined }) {
    if (!integrity) return null;

    if (integrity.shared_with.length > 0) {
        return (
            <span className="font-semibold text-[11px] text-rose-600 dark:text-rose-400 truncate">
                Same network as {integrity.shared_with[0].full_name}
                {integrity.shared_with.length > 1
                    ? ` +${integrity.shared_with.length - 1}`
                    : ''}
            </span>
        );
    }

    if (integrity.focus_lost_count > 0) {
        return (
            <span className="font-semibold text-[11px] text-amber-600 dark:text-amber-400 truncate">
                Left screen {integrity.focus_lost_count}×
            </span>
        );
    }

    return null;
}

export default function SubmissionList({
    integrityById = {}, isLoading = false, submissions, onSelect
}: SubmissionListProps) {
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
                        <IntegrityBadge integrity={integrityById[params.data.id]} />
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
                            variant={SUBMISSION_STATUS_VARIANT[params.data.status]}
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
    }, [integrityById]);

    return (
        <div className="flex flex-col min-h-0 w-full h-full">
            <CommonTable
                leadingColumnDefs={columnDefs}
                loading={isLoading && submissions.length === 0}
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