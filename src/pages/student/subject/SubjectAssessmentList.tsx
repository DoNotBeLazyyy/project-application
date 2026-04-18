import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonTable from '@components/table/CommonTable';
import { ArrowLineDownIcon } from '@phosphor-icons/react';
import { getAttachmentSignedUrl } from '@services/assessment.service';
import { AssessmentType } from '@type/assessment.type';
import { SubjectAssessmentItem } from '@type/student-portal.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_VARIANT: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'warning'
};

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

interface SubjectAssessmentListProps {
    assessments: SubjectAssessmentItem[];
    enrollmentId: string;
}

export default function SubjectAssessmentList({
    assessments,
    enrollmentId
}: SubjectAssessmentListProps) {
    const navigate = useNavigate();

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
                field: 'total_points',
                flex: 1,
                headerName: 'Points',
                sortable: false,
                valueFormatter: (params) => `${params.value} pts`
            },
            {
                field: 'attempts_used',
                flex: 1,
                headerName: 'Attempts',
                sortable: false,
                valueFormatter: (params) => `${params.value} / ${params.data?.max_attempts ?? '—'}`
            },
            {
                field: 'opens_at',
                flex: 2,
                headerName: 'Opens',
                sortable: false,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleString()
                    : '—'
            },
            {
                field: 'due_at',
                flex: 2,
                headerName: 'Due',
                sortable: false,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleString()
                    : '—'
            },
            {
                field: 'closes_at',
                flex: 2,
                headerName: 'Closes',
                sortable: false,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleString()
                    : '—'
            },
            {
                headerName: 'Files',
                flex: 2,
                sortable: false,
                cellRenderer: (params: { data: SubjectAssessmentItem }) => {
                    const files = params.data.attachments ?? [];
                    if (!files.length) return <span className="text-(--mui-palette-text-disabled) text-xs">—</span>;

                    return (
                        <div className="flex flex-wrap gap-1 h-full items-center py-1">
                            {files.map((file) => (
                                <CommonButton
                                    key={file.id}
                                    size="small"
                                    startIcon={<ArrowLineDownIcon size={12} weight="bold" />}
                                    variant="outlined"
                                    onClick={function() {
                                        handleDownloadAttachment(file.file_url, file.file_name);
                                    }}
                                >
                                    {file.file_name.length > 12
                                        ? `${file.file_name.slice(0, 12)}...`
                                        : file.file_name}
                                </CommonButton>
                            ))}
                        </div>
                    );
                }
            },
            {
                headerName: '',
                maxWidth: 140,
                minWidth: 140,
                sortable: false,
                cellRenderer: (params: { data: SubjectAssessmentItem }) => {
                    const { canTake, label } = getAssessmentState(params.data);

                    return (
                        <div className="flex h-full items-center">
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
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                Assessments
            </span>
            <div className="flex-1 min-h-0">
                <CommonTable<SubjectAssessmentItem>
                    leadingColumnDefs={columnDefs}
                    rowData={assessments}
                />
            </div>
        </div>
    );
}