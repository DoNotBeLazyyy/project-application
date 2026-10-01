import CommonButton from '@components/button/CommonButton';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import DuplicateToSectionsModal from '@pages/shared/content/DuplicateToSectionsModal';
import LessonModuleWizardModal from '@pages/shared/content/LessonModuleWizardModal';
import MaterialFormModal from '@pages/shared/content/MaterialFormModal';
import {
    ArrowSquareOutIcon,
    BookOpenIcon,
    CheckCircleIcon,
    CircleIcon,
    CopySimpleIcon,
    FileDocIcon,
    FilePlusIcon,
    FileTextIcon,
    LinkSimpleIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import {
    deleteMaterial,
    deleteModule,
    duplicateModuleToSections,
    getSectionContent,
    markMaterialComplete,
    setMaterialPublished,
    setModulePublished
} from '@services/content.service';
import { getFileUrl } from '@services/storage.service';
import { ContentModule, CourseMaterial, SectionContent } from '@type/content.type';
import { useEffect, useState } from 'react';

interface SectionContentPanelProps {
    sectionId: string;
}

interface MaterialModalState {
    moduleId: string;
    material: CourseMaterial | null;
}

interface DeleteState {
    kind: 'module' | 'material';
    id: string;
    label: string;
}

export default function SectionContentPanel({ sectionId }: SectionContentPanelProps) {
    const [content, setContent] = useState<SectionContent | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
    const [materialModal, setMaterialModal] = useState<MaterialModalState | null>(null);
    const [pendingDelete, setPendingDelete] = useState<DeleteState | null>(null);
    const [duplicatingModule, setDuplicatingModule] = useState<ContentModule | null>(null);

    // Stepper Modal state for Lessons and Syllabus Module
    const [isModuleWizardOpen, setIsModuleWizardOpen] = useState(false);
    const [editingModule, setEditingModule] = useState<ContentModule | null>(null);

    const canManage = content?.can_manage ?? false;
    const rawModules = content?.modules ?? [];
    const modules = rawModules.filter((mod) => {
        if (selectedPeriod === 'All') return true;
        const titleLower = mod.title.toLowerCase();
        const descLower = (mod.description ?? '').toLowerCase();
        const target = selectedPeriod.toLowerCase();
        return titleLower.includes(target) || descLower.includes(target);
    });

    const syllabusMaterial = rawModules
        .flatMap((mod) => mod.materials)
        .find(
            (mat) =>
                mat.title.toLowerCase().includes('syllabus') ||
                (mat.description?.toLowerCase().includes('syllabus') ?? false)
        );

    async function loadContent() {
        const result = await getSectionContent(sectionId);
        if (result.data) {
            setContent(result.data);
        }
    }

    useEffect(function() {
        loadContent();
    }, [sectionId]);

    function handleOpenCreateWizard() {
        setEditingModule(null);
        setIsModuleWizardOpen(true);
    }

    function handleOpenEditWizard(mod: ContentModule) {
        setEditingModule(mod);
        setIsModuleWizardOpen(true);
    }

    async function handleToggleModulePublish(mod: ContentModule) {
        const result = await setModulePublished(mod.id, !mod.is_published);
        if (!result.error) await loadContent();
    }

    async function handleToggleMaterialPublish(material: CourseMaterial) {
        const result = await setMaterialPublished(material.id, !material.is_published);
        if (!result.error) await loadContent();
    }

    async function handleToggleComplete(material: CourseMaterial) {
        const result = await markMaterialComplete(material.id, !material.is_completed);
        if (!result.error) await loadContent();
    }

    async function handleOpenMaterial(material: CourseMaterial) {
        if (material.material_type === 'Link' && material.external_url) {
            window.open(material.external_url, '_blank', 'noopener');
            return;
        }

        if (material.file_url) {
            const result = await getFileUrl('materials', material.file_url);
            if (result.data) {
                window.open(result.data.url, '_blank', 'noopener');
            }
        }
    }

    async function handleConfirmDelete() {
        if (!pendingDelete) return;

        const result =
            pendingDelete.kind === 'module'
                ? await deleteModule(pendingDelete.id)
                : await deleteMaterial(pendingDelete.id);

        setPendingDelete(null);
        if (!result.error) await loadContent();
    }

    const PERIOD_TABS = ['All', 'Prelim', 'Midterm', 'Semi-Final', 'Finals'];

    return (
        <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto pr-1">
            {/* Pinned Official Course Syllabus Bento Card */}
            {syllabusMaterial ? (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white dark:from-blue-950/40 dark:via-zinc-900 dark:to-zinc-900 shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <BookOpenIcon size={24} weight="duotone" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-base truncate">
                                    {syllabusMaterial.title}
                                </span>
                                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                                    Official Syllabus
                                </span>
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 text-xs truncate mt-0.5">
                                {syllabusMaterial.description ||
                                    'Institutional Course Outline, Weekly Schedule of Topics, and Grading Policies'}
                            </span>
                        </div>
                    </div>
                    <CommonButton
                        size="small"
                        variant="contained"
                        startIcon={<ArrowSquareOutIcon size={16} weight="bold" />}
                        onClick={() => handleOpenMaterial(syllabusMaterial)}
                    >
                        View Official Syllabus
                    </CommonButton>
                </div>
            ) : canManage ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-2.5">
                        <BookOpenIcon size={20} className="text-slate-400" />
                        <span className="text-slate-500 text-xs">
                            Course Syllabus not yet pinned. Name any document or module material &ldquo;Syllabus&rdquo; to highlight it here for students.
                        </span>
                    </div>
                </div>
            ) : null}

            {/* Filter Tabs and Add Module Action */}
            <div className="flex flex-wrap gap-2 items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                <div className="flex gap-1.5 items-center overflow-x-auto py-0.5">
                    {PERIOD_TABS.map((period) => (
                        <button
                            key={period}
                            type="button"
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-3 py-1.5 text-xs rounded-full font-bold transition-all cursor-pointer ${
                                selectedPeriod === period
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {period === 'All' ? 'All Content' : period}
                        </button>
                    ))}
                </div>

                {canManage && (
                    <CommonButton
                        size="small"
                        startIcon={<PlusIcon size={16} weight="bold" />}
                        variant="contained"
                        onClick={handleOpenCreateWizard}
                    >
                        Add Module
                    </CommonButton>
                )}
            </div>

            {/* Empty State */}
            {modules.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                        <BookOpenIcon size={28} weight="duotone" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-sm">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {canManage ? 'No modules yet' : 'No content published'}
                        </h3>
                        <p className="text-xs text-slate-500">
                            {canManage
                                ? 'Create structured learning modules, upload syllabus documents, lecture slides, and reading handouts.'
                                : 'No content has been published by the instructor yet.'}
                        </p>
                    </div>
                    {canManage && (
                        <CommonButton
                            size="small"
                            startIcon={<PlusIcon size={16} weight="bold" />}
                            variant="contained"
                            onClick={handleOpenCreateWizard}
                        >
                            Create First Module
                        </CommonButton>
                    )}
                </div>
            )}

            {/* Modules Bento Grid */}
            <div className="flex flex-col gap-4 pb-6">
                {modules.map(function(mod) {
                    const progress =
                        mod.material_count > 0 ? (mod.completed_count / mod.material_count) * 100 : 0;

                    return (
                        <div
                            key={mod.id}
                            className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-3"
                        >
                            {/* Module Header */}
                            <div className="flex flex-wrap gap-2 items-start justify-between">
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                                            {mod.title}
                                        </h3>
                                        {canManage && (
                                            <span
                                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                    mod.is_published
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                }`}
                                            >
                                                {mod.is_published ? 'Published' : 'Draft'}
                                            </span>
                                        )}
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {mod.materials.length} resource{mod.materials.length === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                    {mod.description && (
                                        <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2">
                                            {mod.description}
                                        </p>
                                    )}
                                </div>

                                {canManage && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleModulePublish(mod)}
                                            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                                                mod.is_published
                                                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                            }`}
                                        >
                                            {mod.is_published ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                            title="Copy to other sections"
                                            type="button"
                                            onClick={() => setDuplicatingModule(mod)}
                                        >
                                            <CopySimpleIcon size={16} weight="bold" />
                                        </button>
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                            title="Edit module"
                                            type="button"
                                            onClick={() => handleOpenEditWizard(mod)}
                                        >
                                            <PencilSimpleIcon size={16} weight="bold" />
                                        </button>
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                            title="Delete module"
                                            type="button"
                                            onClick={() =>
                                                setPendingDelete({ id: mod.id, kind: 'module', label: mod.title })
                                            }
                                        >
                                            <TrashIcon size={16} weight="bold" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Progress bar for students */}
                            {!canManage && mod.material_count > 0 && (
                                <CommonProgressBar
                                    hasSubtext={false}
                                    label="Completion"
                                    percentage={progress}
                                    type="label"
                                />
                            )}

                            {/* Materials Bento Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {mod.materials.map(function(material) {
                                    const isSyl = material.title.toLowerCase().includes('syllabus');

                                    return (
                                        <div
                                            key={material.id}
                                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                                isSyl
                                                    ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/80'
                                                    : 'border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/40'
                                            }`}
                                        >
                                            <button
                                                className="flex flex-1 gap-2.5 items-center text-left min-w-0 cursor-pointer group"
                                                type="button"
                                                onClick={() => handleOpenMaterial(material)}
                                            >
                                                <div
                                                    className={`p-2 rounded-lg shrink-0 ${
                                                        material.material_type === 'Link'
                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                                            : isSyl
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                    }`}
                                                >
                                                    {material.material_type === 'Link' ? (
                                                        <LinkSimpleIcon size={16} weight="bold" />
                                                    ) : isSyl ? (
                                                        <BookOpenIcon size={16} weight="bold" />
                                                    ) : (
                                                        <FileTextIcon size={16} weight="bold" />
                                                    )}
                                                </div>

                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {material.title}
                                                        </span>
                                                        {isSyl && (
                                                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-600 text-white shrink-0">
                                                                Syllabus
                                                            </span>
                                                        )}
                                                    </div>
                                                    {material.description && (
                                                        <span className="text-slate-400 text-[11px] truncate mt-0.5">
                                                            {material.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>

                                            <div className="flex gap-1 items-center shrink-0">
                                                {canManage ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleMaterialPublish(material)}
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                                                material.is_published
                                                                    ? 'text-slate-600 dark:text-slate-300 bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700'
                                                                    : 'text-amber-700 bg-amber-50 border-amber-200'
                                                            }`}
                                                        >
                                                            {material.is_published ? 'Public' : 'Draft'}
                                                        </button>
                                                        <button
                                                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                            type="button"
                                                            title="Edit resource"
                                                            onClick={() =>
                                                                setMaterialModal({ material, moduleId: mod.id })
                                                            }
                                                        >
                                                            <PencilSimpleIcon size={14} weight="bold" />
                                                        </button>
                                                        <button
                                                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                                            type="button"
                                                            title="Delete resource"
                                                            onClick={() =>
                                                                setPendingDelete({
                                                                    id: material.id,
                                                                    kind: 'material',
                                                                    label: material.title
                                                                })
                                                            }
                                                        >
                                                            <TrashIcon size={14} weight="bold" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                                        type="button"
                                                        onClick={() => handleToggleComplete(material)}
                                                    >
                                                        {material.is_completed ? (
                                                            <CheckCircleIcon
                                                                className="text-emerald-600"
                                                                size={20}
                                                                weight="fill"
                                                            />
                                                        ) : (
                                                            <CircleIcon size={20} />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Stepper Wizard Modal for Lessons & Syllabus Module */}
            <LessonModuleWizardModal
                module={editingModule}
                open={isModuleWizardOpen}
                sectionId={sectionId}
                onClose={() => {
                    setIsModuleWizardOpen(false);
                    setEditingModule(null);
                }}
                onSuccess={loadContent}
            />

            {/* Quick Material Modal */}
            {materialModal && (
                <MaterialFormModal
                    material={materialModal.material}
                    moduleId={materialModal.moduleId}
                    open={materialModal !== null}
                    sectionId={sectionId}
                    onClose={() => setMaterialModal(null)}
                    onSaved={loadContent}
                />
            )}

            {/* Duplicate Module Modal */}
            {duplicatingModule && (
                <DuplicateToSectionsModal
                    entityLabel="Module"
                    entityTitle={duplicatingModule.title}
                    open={duplicatingModule !== null}
                    sectionId={sectionId}
                    onClose={() => setDuplicatingModule(null)}
                    onConfirm={(sectionIds: string[]) =>
                        duplicateModuleToSections(duplicatingModule.id, sectionIds)
                    }
                    onDuplicated={loadContent}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: { onClick: () => setPendingDelete(null) },
                    confirmProps: { onClick: handleConfirmDelete }
                }}
                mainContent={{
                    title:
                        pendingDelete?.kind === 'module'
                            ? `Delete module "${pendingDelete?.label}"?`
                            : `Delete resource "${pendingDelete?.label}"?`
                }}
                open={pendingDelete !== null}
                subContent={{ title: 'This action cannot be undone and will remove materials from student access.' }}
                onClose={() => setPendingDelete(null)}
            />
        </div>
    );
}