import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { ArrowLineDownIcon, XIcon } from '@phosphor-icons/react';
import { getAttachmentSignedUrl } from '@services/assessment.service';
import { AssessmentType } from '@type/assessment.type';
import { SubjectAssessmentItem } from '@type/student-portal.type';
import { ColDef, RowClickedEvent } from 'ag-grid-community';
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

async function handleDownloadAttachment(fileUrl: string, fileName: string) {
    const url = await getAttachmentSignedUrl(fileUrl);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    a.click();
}

interface DetailFieldProps {
    label: string;
    value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                {label}
            </span>
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                {value}
            </span>
        </div>
    );
}

interface AssessmentDetailModalProps {
    assessment: SubjectAssessmentItem | null;
    onClose: () => void;
    onViewResults: (assessment: SubjectAssessmentItem) => void;
}

function AssessmentDetailModal({ assessment, onClose, onViewResults }: AssessmentDetailModalProps) {
    if (!assessment) return null;

    const state = getAssessmentState(assessment);
    const attachments = assessment.attachments ?? [];
    const hasSubmission = ['Submitted', 'Late', 'Graded', 'Returned'].includes(
        assessment.submission_status ?? ''
    );

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-5 max-h-[85vh] overflow-y-auto p-6' }}
            fullWidth
            maxWidth="sm"
            open={Boolean(assessment)}
            onClose={onClose}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 items-center">
                        <CommonBadgeStatus
                            label={assessment.assessment_type}
                            variant={TYPE_VARIANT[assessment.assessment_type]}
                        />
                        {assessment.grading_period_name && (
                            <CommonBadgeStatus
                                label={assessment.grading_period_name}
                                variant="info"
                            />
                        )}
                        <CommonBadgeStatus
                            label={state.canTake
                                ? 'Available'
                                : state.label}
                            variant={state.canTake
                                ? 'success'
                                : 'warning'}
                        />
                    </div>
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        {assessment.title}
                    </h2>
                </div>
                <button
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                    title="Close"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            {assessment.description && (
                <div className="flex flex-col gap-1">
                    <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                        Description
                    </span>
                    <p className="text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                        {assessment.description}
                    </p>
                </div>
            )}

            <div className="gap-4 grid grid-cols-2 sm:grid-cols-3">
                <DetailField
                    label="Total Points"
                    value={`${assessment.total_points} pts`}
                />
                <DetailField
                    label="Passing"
                    value={assessment.passing_points !== null
                        ? `${assessment.passing_points} pts`
                        : '—'}
                />
                <DetailField
                    label="Questions"
                    value={String(assessment.question_count)}
                />
                <DetailField
                    label="Time Limit"
                    value={assessment.time_limit_minutes !== null
                        ? `${assessment.time_limit_minutes} min`
                        : 'None'}
                />
                <DetailField
                    label="Attempts"
                    value={`${assessment.attempts_used} / ${assessment.max_attempts}`}
                />
                <DetailField
                    label="Submission"
                    value={assessment.submission_status ?? 'Not Started'}
                />
            </div>

            <div className="gap-4 grid grid-cols-1 sm:grid-cols-3">
                <DetailField
                    label="Opens"
                    value={formatDateTime(assessment.opens_at)}
                />
                <DetailField
                    label="Due"
                    value={formatDateTime(assessment.due_at)}
                />
                <DetailField
                    label="Closes"
                    value={formatDateTime(assessment.closes_at)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                    Attachments
                </span>
                {attachments.length
                    ? (
                        <div className="flex flex-wrap gap-2">
                            {attachments.map((file) => (
                                <CommonButton
                                    key={file.id}
                                    size="small"
                                    startIcon={<ArrowLineDownIcon size={14} weight="bold" />}
                                    variant="outlined"
                                    onClick={function() {
                                        handleDownloadAttachment(file.file_url, file.file_name);
                                    }}
                                >
                                    {file.file_name}
                                </CommonButton>
                            ))}
                        </div>
                    )
                    : (
                        <span className="text-(--mui-palette-text-disabled) text-sm">
                            No attachments
                        </span>
                    )}
            </div>

            {hasSubmission && (
                <div className="flex justify-end">
                    <CommonButton
                        size="small"
                        variant="contained"
                        onClick={function() {
                            onViewResults(assessment);
                        }}
                    >
                        View Results
                    </CommonButton>
                </div>
            )}
        </CommonModal>
    );
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
    const [detailItem, setDetailItem] = useState<SubjectAssessmentItem | null>(null);

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
            setDetailItem(event.data);
        }
    }

    const columnDefs = useMemo<ColDef<SubjectAssessmentItem>[]>(function() {
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
                    const hasSubmission = ['Submitted', 'Late', 'Graded', 'Returned'].includes(
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
            <AssessmentDetailModal
                assessment={detailItem}
                onClose={function() {
                    setDetailItem(null);
                }}
                onViewResults={function(assessment) {
                    navigate(`/student/subjects/${enrollmentId}/assessments/${assessment.id}/result`);
                }}
            />
        </div>
    );
}