import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonSelect from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import SubmissionDetailModal from '@pages/faculty/sections/student-detail/SubmissionDetailModal';
import { formatDate, formatScore, submissionStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { StudentEvaluationAssessment } from '@type/faculty.type';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
import { useMemo, useState } from 'react';

const ALL_VALUE = 'all';

interface StudentAssessmentTabProps {
    assessments: StudentEvaluationAssessment[];
}

export default function StudentAssessmentTab({ assessments }: StudentAssessmentTabProps) {
    const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE);
    const [periodFilter, setPeriodFilter] = useState<string>(ALL_VALUE);
    const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE);
    const [detailItem, setDetailItem] = useState<StudentEvaluationAssessment | null>(null);

    const typeOptions = useMemo(function() {
        const present = Array.from(new Set(assessments.map((item) => item.assessment_type)));

        return [
            { label: 'All Types', value: ALL_VALUE },
            ...present.map((type) => ({ label: type, value: type }))
        ];
    }, [assessments]);

    const periodOptions = useMemo(function() {
        const seen = new Map<string, { name: string; sequence: number }>();

        assessments.forEach(function(item) {
            if (item.grading_period_id && item.grading_period_name && !seen.has(item.grading_period_id)) {
                seen.set(item.grading_period_id, {
                    name: item.grading_period_name,
                    sequence: item.grading_period_sequence ?? 0
                });
            }
        });

        const sorted = Array.from(seen.entries())
            .sort((a, b) => a[1].sequence - b[1].sequence)
            .map(([id, meta]) => ({ label: meta.name, value: id }));

        return [{ label: 'All Periods', value: ALL_VALUE }, ...sorted];
    }, [assessments]);

    const statusOptions = useMemo(function() {
        const present = Array.from(new Set(
            assessments
                .map((item) => item.submission_status)
                .filter((status): status is string => Boolean(status))
        ));

        return [
            { label: 'All Statuses', value: ALL_VALUE },
            ...present.map((status) => ({ label: status, value: status }))
        ];
    }, [assessments]);

    const filtered = useMemo(function() {
        return assessments.filter(function(item) {
            const matchesType = typeFilter === ALL_VALUE || item.assessment_type === typeFilter;
            const matchesPeriod = periodFilter === ALL_VALUE || item.grading_period_id === periodFilter;
            const matchesStatus = statusFilter === ALL_VALUE || item.submission_status === statusFilter;

            return matchesType && matchesPeriod && matchesStatus;
        });
    }, [assessments, typeFilter, periodFilter, statusFilter]);

    const columnDefs = useMemo<ColDef<StudentEvaluationAssessment>[]>(function() {
        return [
            {
                field: 'title',
                flex: 3,
                headerName: 'Title',
                sortable: true
            },
            {
                field: 'assessment_type',
                flex: 1,
                headerName: 'Type',
                sortable: true
            },
            {
                field: 'grading_period_name',
                flex: 1,
                headerName: 'Period',
                sortable: false,
                valueFormatter: (params) => params.value ?? '—'
            },
            {
                field: 'final_score',
                flex: 1,
                headerName: 'Score',
                sortable: false,
                valueGetter: (params) => `${formatScore(params.data?.final_score ?? null)} / ${params.data?.total_points ?? 0}`
            },
            {
                field: 'due_at',
                flex: 2,
                headerName: 'Due',
                sortable: true,
                valueFormatter: (params) => formatDate(params.value)
            },
            {
                field: 'submission_status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: StudentEvaluationAssessment }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.submission_status ?? 'Not Started'}
                            variant={submissionStatusVariant(params.data.submission_status)}
                        />
                    </div>
                )
            }
        ];
    }, []);

    function handleRowClicked(event: RowClickedEvent<StudentEvaluationAssessment>) {
        if (event.data) {
            setDetailItem(event.data);
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <div className="flex flex-wrap gap-2 items-center justify-end">
                <CommonSelect
                    className="min-w-36"
                    options={typeOptions}
                    size="small"
                    value={typeFilter}
                    onChange={function(event) {
                        setTypeFilter(event.target.value);
                    }}
                />
                <CommonSelect
                    className="min-w-36"
                    options={periodOptions}
                    size="small"
                    value={periodFilter}
                    onChange={function(event) {
                        setPeriodFilter(event.target.value);
                    }}
                />
                <CommonSelect
                    className="min-w-36"
                    options={statusOptions}
                    size="small"
                    value={statusFilter}
                    onChange={function(event) {
                        setStatusFilter(event.target.value);
                    }}
                />
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<StudentEvaluationAssessment>
                    leadingColumnDefs={columnDefs}
                    rowData={filtered}
                    onRowClicked={handleRowClicked}
                />
            </div>
            <SubmissionDetailModal
                assessment={detailItem}
                onClose={function() {
                    setDetailItem(null);
                }}
            />
        </div>
    );
}