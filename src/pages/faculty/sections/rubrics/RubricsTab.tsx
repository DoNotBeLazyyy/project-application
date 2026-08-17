import CommonButton from '@components/button/CommonButton';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonTable from '@components/table/CommonTable';
import DuplicateToSectionsModal from '@pages/shared/content/DuplicateToSectionsModal';
import { CopySimpleIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { copyRubricToSections, deleteRubric, listRubrics } from '@services/rubric.service';
import { RubricListRow } from '@type/rubric.type';
import { MobileCardColDef } from '@type/table.type';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface RubricsTabProps {
    sectionId: string;
}

export default function RubricsTab({ sectionId }: RubricsTabProps) {
    const navigate = useNavigate();
    const [rubrics, setRubrics] = useState<RubricListRow[]>([]);
    const [duplicating, setDuplicating] = useState<RubricListRow | null>(null);
    const [pendingDelete, setPendingDelete] = useState<RubricListRow | null>(null);

    useEffect(function() {
        fetchRubrics();
    }, [sectionId]);

    async function fetchRubrics() {
        const result = await listRubrics(sectionId);

        if (result.data) {
            setRubrics(result.data);
        }
    }

    async function handleConfirmDelete() {
        if (!pendingDelete) return;

        const result = await deleteRubric(pendingDelete.id);
        setPendingDelete(null);

        if (!result.error) {
            await fetchRubrics();
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
                field: 'total_points',
                flex: 1,
                headerName: 'Points',
                sortable: false,
                valueFormatter: (params) => `${params.value} pts`
            },
            {
                field: 'criteria_count',
                flex: 1,
                headerName: 'Criteria',
                sortable: false
            },
            {
                field: 'attached_count',
                flex: 1,
                headerName: 'In Use',
                sortable: false,
                valueFormatter: (params) => `${params.value} assessment${params.value === 1
                    ? ''
                    : 's'}`
            },
            {
                headerName: '',
                minWidth: 150,
                maxWidth: 150,
                sortable: false,
                cellRenderer: (params: { data: RubricListRow }) => (
                    <div className="flex gap-1 h-full items-center">
                        <button
                            className="hover:bg-(--mui-palette-action-hover) px-2 py-1 rounded text-(--mui-palette-primary-main) transition-colors"
                            title="Edit"
                            onClick={function() {
                                navigate(`/faculty/sections/${sectionId}/rubrics/${params.data.id}`);
                            }}
                        >
                            <PencilSimpleIcon size={14} weight="bold" />
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
                                setPendingDelete(params.data);
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
                    {rubrics.length} rubric{rubrics.length !== 1
                        ? 's'
                        : ''}
                </p>
                <CommonButton
                    size="small"
                    startIcon={<PlusIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={function() {
                        navigate(`/faculty/sections/${sectionId}/rubrics/new`);
                    }}
                >
                    New Rubric
                </CommonButton>
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<RubricListRow>
                    leadingColumnDefs={columnDefs}
                    rowData={rubrics}
                />
            </div>
            {duplicating && (
                <DuplicateToSectionsModal
                    entityLabel="Rubric"
                    entityTitle={duplicating.title}
                    open={duplicating !== null}
                    sectionId={sectionId}
                    onClose={function() {
                        setDuplicating(null);
                    }}
                    onConfirm={async function(sectionIds: string[]) {
                        const result = await copyRubricToSections(duplicating.id, sectionIds);
                        return { data: null, error: result.error };
                    }}
                    onDuplicated={fetchRubrics}
                />
            )}
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setPendingDelete(null);
                        }
                    },
                    confirmProps: {
                        onClick: handleConfirmDelete
                    }
                }}
                mainContent={{ title: 'Delete this rubric?' }}
                open={pendingDelete !== null}
                subContent={{ title: 'This action cannot be undone.' }}
                onClose={function() {
                    setPendingDelete(null);
                }}
            />
        </div>
    );
}