import CommonButton from '@components/button/CommonButton';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import DuplicateToSectionsModal from '@pages/shared/content/DuplicateToSectionsModal';
import {
    CheckSquareOffsetIcon,
    CopySimpleIcon,
    FileTextIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { copyRubricToSections, deleteRubric, listRubrics } from '@services/rubric.service';
import { RubricListRow } from '@type/rubric.type';
import { useEffect, useState } from 'react';
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

    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            <div className="flex items-center justify-between">
                <p className="text-slate-500 text-xs font-medium">
                    {rubrics.length} grading rubric{rubrics.length !== 1 ? 's' : ''} available
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

            <div className="flex-1 min-h-0 overflow-y-auto">
                {rubrics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                            <CheckSquareOffsetIcon size={28} weight="duotone" />
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                No rubrics created yet
                            </h3>
                            <p className="text-xs text-slate-500">
                                Design multi-criteria evaluation matrices for essays, projects, and qualitative assessments.
                            </p>
                        </div>
                        <CommonButton
                            size="small"
                            startIcon={<PlusIcon size={16} weight="bold" />}
                            variant="contained"
                            onClick={function() {
                                navigate(`/faculty/sections/${sectionId}/rubrics/new`);
                            }}
                        >
                            Create First Rubric
                        </CommonButton>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {rubrics.map((rubric) => (
                            <div
                                key={rubric.id}
                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between select-none relative group h-full"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            Rubric Matrix
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                title="Copy to other sections"
                                                onClick={() => setDuplicating(rubric)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                            >
                                                <CopySimpleIcon size={16} weight="bold" />
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete Rubric"
                                                onClick={() => setPendingDelete(rubric)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                            >
                                                <TrashIcon size={16} weight="bold" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold leading-snug text-base text-slate-900 dark:text-slate-100 tracking-tight line-clamp-2 mb-3">
                                        {rubric.title}
                                    </h3>

                                    {/* Bento Metrics */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl">
                                            <span className="block font-medium leading-none text-[10px] text-slate-400">
                                                Points
                                            </span>
                                            <span className="font-bold leading-tight mt-1 text-slate-800 dark:text-slate-200 text-xs block">
                                                {rubric.total_points} pts
                                            </span>
                                        </div>
                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl">
                                            <span className="block font-medium leading-none text-[10px] text-slate-400">
                                                Criteria
                                            </span>
                                            <span className="font-bold leading-tight mt-1 text-slate-800 dark:text-slate-200 text-xs block">
                                                {rubric.criteria_count}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2.5 rounded-xl">
                                            <span className="block font-medium leading-none text-[10px] text-slate-400">
                                                In Use
                                            </span>
                                            <span className="font-bold leading-tight mt-1 text-slate-800 dark:text-slate-200 text-xs block">
                                                {rubric.attached_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 flex items-center justify-end gap-2 mt-auto">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/faculty/sections/${sectionId}/rubrics/${rubric.id}`)}
                                        className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <PencilSimpleIcon size={14} weight="bold" />
                                        Edit Matrix
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {duplicating && (
                <DuplicateToSectionsModal
                    entityLabel="Rubric"
                    entityTitle={duplicating.title}
                    open={duplicating !== null}
                    sectionId={sectionId}
                    onClose={() => setDuplicating(null)}
                    onConfirm={async (sectionIds: string[]) => {
                        const result = await copyRubricToSections(duplicating.id, sectionIds);
                        return { data: null, error: result.error };
                    }}
                    onDuplicated={fetchRubrics}
                />
            )}

            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: { onClick: () => setPendingDelete(null) },
                    confirmProps: { onClick: handleConfirmDelete }
                }}
                mainContent={{ title: 'Delete this rubric?' }}
                open={pendingDelete !== null}
                subContent={{ title: 'This action cannot be undone.' }}
                onClose={() => setPendingDelete(null)}
            />
        </div>
    );
}