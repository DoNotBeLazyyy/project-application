import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonTable from '@components/table/CommonTable';
import DuplicateToSectionsModal from '@pages/shared/content/DuplicateToSectionsModal';
import {
    BookOpenIcon, ChartBarIcon, CopySimpleIcon, EyeIcon, EyeSlashIcon, ListChecksIcon, PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import {
    deleteAssessment, duplicateAssessmentToSections, listAssessments, publishAssessment,
    unpublishAssessment
} from '@services/assessment.service';
import { AssessmentListRow, AssessmentType } from '@type/assessment.type';
import { MobileCardColDef } from '@type/table.type';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_VARIANT_MAP: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'info'
};

interface AssessmentsTabProps {
    sectionId: string;
}

export default function AssessmentsTab({ sectionId }: AssessmentsTabProps) {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState<AssessmentListRow[]>([]);
    const [duplicating, setDuplicating] = useState<AssessmentListRow | null>(null);

    useEffect(function() {
        fetchAssessments();
    }, [sectionId]);

    async function fetchAssessments() {
        const result = await listAssessments(sectionId);

        if (result.data) {
            setAssessments(result.data);
        }
    }

    async function handlePublishToggle(row: AssessmentListRow) {
        const result = row.is_published
            ? await unpublishAssessment(row.id)
            : await publishAssessment(row.id);

        if (!result.error) {
            await fetchAssessments();
        }
    }

    async function handleDelete(id: string) {
        const result = await deleteAssessment(id);

        if (!result.error) {
            await fetchAssessments();
        }
    }

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
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
                sortable: false,
                cellRenderer: (params: { data: AssessmentListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.assessment_type}
                            variant={TYPE_VARIANT_MAP[params.data.assessment_type]}
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
                field: 'question_count',
                flex: 1,
                headerName: 'Questions',
                mobileCard: 'hidden',
                sortable: false
            },
            {
                field: 'submission_count',
                flex: 1,
                headerName: 'Submissions',
                sortable: false
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
                field: 'is_published',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: AssessmentListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.is_published
                                ? 'Published'
                                : 'Draft'}
                            variant={params.data.is_published
                                ? 'success'
                                : 'warning'}
                        />
                    </div>
                )
            },
            {
                headerName: '',
                minWidth: 250,
                maxWidth: 250,
                sortable: false,
                cellRenderer: (params: { data: AssessmentListRow }) => (
                    <div className="flex gap-1 h-full items-center">
                        <button
                            className="flex gap-1 hover:bg-(--mui-palette-action-hover) items-center px-2 py-1 rounded text-(--mui-palette-primary-main) text-xs transition-colors"
                            title="Builder"
                            onClick={function() {
                                navigate(`/faculty/sections/${sectionId}/assessments/${params.data.id}/builder`);
                            }}
                        >
                            <BookOpenIcon size={14} weight="bold" />
                            Builder
                        </button>
                        <button
                            className="flex gap-1 hover:bg-(--mui-palette-action-hover) items-center px-2 py-1 rounded text-(--mui-palette-text-secondary) text-xs transition-colors"
                            title="Submissions"
                            onClick={function() {
                                navigate(`/faculty/sections/${sectionId}/assessments/${params.data.id}/submissions`);
                            }}
                        >
                            <ListChecksIcon size={14} weight="bold" />
                            Submissions
                        </button>
                        <button
                            className="flex gap-1 hover:bg-(--mui-palette-action-hover) items-center px-2 py-1 rounded text-xs transition-colors"
                            style={{
                                color: params.data.is_published
                                    ? 'var(--mui-palette-warning-main)'
                                    : 'var(--mui-palette-success-main)'
                            }}
                            title={params.data.is_published
                                ? 'Unpublish'
                                : 'Publish'}
                            onClick={function() {
                                handlePublishToggle(params.data);
                            }}
                        >
                            {params.data.is_published
                                ? <EyeSlashIcon size={14} weight="bold" />
                                : <EyeIcon size={14} weight="bold" />
                            }
                        </button>
                        <button
                            className="hover:bg-(--mui-palette-action-hover) px-2 py-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                            title="Item analysis"
                            onClick={function() {
                                navigate(`/faculty/sections/${sectionId}/assessments/${params.data.id}/analysis`);
                            }}
                        >
                            <ChartBarIcon size={14} weight="bold" />
                        </button>
                        <button
                            className="hover:bg-(--mui-palette-action-hover) px-2 py-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                            title="Copy to other sections"
                            onClick={function() {
                                setDuplicating(params.data);
                            }}
                        >
                            <CopySimpleIcon size={14} weight="bold" />
                        </button>
                        <button
                            className="hover:bg-(--mui-palette-action-hover) px-2 py-1 rounded text-(--mui-palette-error-main) transition-colors"
                            title="Delete"
                            onClick={function() {
                                handleDelete(params.data.id);
                            }}
                        >
                            <TrashIcon size={14} weight="bold" />
                        </button>
                    </div>
                )
            }
        ];
    }, [sectionId]);

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    {assessments.length} assessment{assessments.length !== 1
                        ? 's'
                        : ''}
                </p>
                <CommonButton
                    size="small"
                    startIcon={<PlusIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={function() {
                        navigate(`/faculty/sections/${sectionId}/assessments/new/builder`);
                    }}
                >
                    New Assessment
                </CommonButton>
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<AssessmentListRow>
                    leadingColumnDefs={columnDefs}
                    rowData={assessments}
                />
            </div>
            {duplicating && (
                <DuplicateToSectionsModal
                    entityLabel="Assessment"
                    entityTitle={duplicating.title}
                    open={duplicating !== null}
                    sectionId={sectionId}
                    onClose={function() {
                        setDuplicating(null);
                    }}
                    onConfirm={function(sectionIds: string[]) {
                        return duplicateAssessmentToSections(duplicating.id, sectionIds);
                    }}
                    onDuplicated={fetchAssessments}
                />
            )}
        </div>
    );
}