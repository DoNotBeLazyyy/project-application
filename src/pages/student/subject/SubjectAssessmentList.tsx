import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonSelect from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { AssessmentType } from '@type/assessment.type';
import { SubjectAssessmentItem } from '@type/student-portal.type';
import { MobileCardColDef } from '@type/table.type';
import { RowClickedEvent } from 'ag-grid-community';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_VARIANT: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'warning'
};

const ALL_VALUE = 'all';

const SUBMITTED_STATUSES = ['Submitted', 'Late', 'Graded', 'Returned'];

function formatDateTime(value: string | null): string {
    return value
        ? new Date(value)
            .toLocaleString()
        : '—';
}

function getAssessmentState(item: SubjectAssessmentItem): {
    canTake: boolean;
    label: string;
} {
    const now = new Date();
    const isSubmitted = ['Submitted', 'Late', 'Graded'].includes(item.submission_status ?? '');
    const isMaxed = item.attempts_used >= item.max_attempts;
    const isClosed = item.closes_at
        ? new Date(item.closes_at) < now
        : false;
    const isNotYetOpen = item.opens_at
        ? new Date(item.opens_at) > now
        : false;
    const isScheduled = item.scheduled_publish_at
        ? new Date(item.scheduled_publish_at) > now
        : false;

    if (isSubmitted) return { canTake: false, label: 'Submitted' };
    if (isMaxed) return { canTake: false, label: 'Max attempts reached' };
    if (isClosed) return { canTake: false, label: 'Closed' };
    if (isScheduled) return { canTake: false, label: 'Not yet published' };
    if (isNotYetOpen) {
        const opensAt = new Date(item.opens_at ?? '');
        return {
            canTake: false,
            label: `Opens ${opensAt.toLocaleString()}`
        };
    }

    return { canTake: true, label: 'Take' };
}

interface SubjectAssessmentListProps {
    assessments: SubjectAssessmentItem[];
    enrollmentId: string;
}

export default function SubjectAssessmentList({
    assessments,
    enrollmentId
}: SubjectAssessmentListProps) {
    const navigate = useNavigate();
    const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE);
    const [periodFilter, setPeriodFilter] = useState<string>(ALL_VALUE);

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

    const filteredAssessments = useMemo(function() {
        return assessments.filter(function(item) {
            const matchesType = typeFilter === ALL_VALUE || item.assessment_type === typeFilter;
            const matchesPeriod = periodFilter === ALL_VALUE || item.grading_period_id === periodFilter;

            return matchesType && matchesPeriod;
        });
    }, [assessments, typeFilter, periodFilter]);

    function handleRowClicked(event: RowClickedEvent<SubjectAssessmentItem>) {
        if (event.data) {
            navigate(`/student/subjects/${enrollmentId}/assessments/${event.data.id}/result`);
        }
    }

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'title',
                flex: 3,
                headerName: 'Title',
                sortable: false
            },
            {
                field: 'assessment_type',
                flex: 1,
                headerName: 'Type',
                sortable: false,
                cellRenderer: (params: { data: SubjectAssessmentItem }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.assessment_type}
                            variant={TYPE_VARIANT[params.data.assessment_type]}
                        />
                    </div>
                )
            },
            {
                field: 'grading_period_name',
                flex: 1,
                headerName: 'Period',
                sortable: false,
                valueFormatter: (params) => params.value ?? '—'
            },
            {
                field: 'total_points',
                flex: 1,
                headerName: 'Points',
                sortable: false,
                valueFormatter: (params) => `${params.value} pts`
            },
            {
                field: 'opens_at',
                flex: 2,
                headerName: 'Opens',
                mobileCard: 'hidden',
                sortable: false,
                valueFormatter: (params) => formatDateTime(params.value)
            },
            {
                field: 'due_at',
                flex: 2,
                headerName: 'Due',
                sortable: false,
                valueFormatter: (params) => formatDateTime(params.value)
            },
            {
                field: 'closes_at',
                flex: 2,
                headerName: 'Closes',
                mobileCard: 'hidden',
                sortable: false,
                valueFormatter: (params) => formatDateTime(params.value)
            },
            {
                headerName: '',
                maxWidth: 140,
                minWidth: 140,
                sortable: false,
                cellRenderer: (params: { data: SubjectAssessmentItem }) => {
                    const { canTake, label } = getAssessmentState(params.data);
                    const hasSubmission = SUBMITTED_STATUSES.includes(
                        params.data.submission_status ?? ''
                    );

                    if (hasSubmission) {
                        return (
                            <div className="flex h-full ignore_row_click items-center">
                                <CommonButton
                                    size="small"
                                    variant="outlined"
                                    onClick={function() {
                                        navigate(`/student/subjects/${enrollmentId}/assessments/${params.data.id}/result`);
                                    }}
                                >
                                    View Results
                                </CommonButton>
                            </div>
                        );
                    }

                    return (
                        <div className="flex h-full ignore_row_click items-center">
                            <CommonButton
                                disabled={!canTake}
                                size="small"
                                variant="contained"
                                onClick={function() {
                                    navigate(`/student/subjects/${enrollmentId}/assessments/${params.data.id}`);
                                }}
                            >
                                {label}
                            </CommonButton>
                        </div>
                    );
                }
            }
        ];
    }, [enrollmentId]);

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Assessments
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                    <CommonSelect
                        className="min-w-40"
                        options={typeOptions}
                        size="small"
                        value={typeFilter}
                        onChange={function(event) {
                            setTypeFilter(event.target.value);
                        }}
                    />
                    <CommonSelect
                        className="min-w-40"
                        options={periodOptions}
                        size="small"
                        value={periodFilter}
                        onChange={function(event) {
                            setPeriodFilter(event.target.value);
                        }}
                    />
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<SubjectAssessmentItem>
                    leadingColumnDefs={columnDefs}
                    rowData={filteredAssessments}
                    onRowClicked={handleRowClicked}
                />
            </div>
        </div>
    );
}