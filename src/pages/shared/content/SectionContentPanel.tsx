import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonTextarea from '@components/textarea/CommonTextarea';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import DuplicateToSectionsModal from '@pages/shared/content/DuplicateToSectionsModal';
import MaterialFormModal from '@pages/shared/content/MaterialFormModal';
import {
    ArrowSquareOutIcon, BookOpenIcon, CheckCircleIcon, CircleIcon, CopySimpleIcon, FilePlusIcon,
    LinkSimpleIcon, PencilSimpleIcon, PlusIcon, TrashIcon
} from '@phosphor-icons/react';
import {
    createModule, deleteMaterial, deleteModule, duplicateModuleToSections, getSectionContent,
    markMaterialComplete, setMaterialPublished, setModulePublished, updateModule
} from '@services/content.service';
import { getFileUrl } from '@services/storage.service';
import { ContentModule, CourseMaterial, SectionContent } from '@type/content.type';
import { ChangeEvent, useEffect, useState } from 'react';

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
    const [isComposing, setIsComposing] = useState(false);
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleDescription, setModuleDescription] = useState('');
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
    const [materialModal, setMaterialModal] = useState<MaterialModalState | null>(null);
    const [pendingDelete, setPendingDelete] = useState<DeleteState | null>(null);
    const [duplicatingModule, setDuplicatingModule] = useState<ContentModule | null>(null);

    const canManage = content?.can_manage ?? false;
    const modules = content?.modules ?? [];
    const editingModule = modules.find((mod) => mod.id === editingModuleId);
    const isModuleUnchanged = editingModule
        ? moduleTitle.trim() === editingModule.title
            && (moduleDescription.trim() || null) === (editingModule.description ?? null)
        : false;

    async function loadContent() {
        const result = await getSectionContent(sectionId);

        if (result.data) {
            setContent(result.data);
        }
    }

    useEffect(function() {
        loadContent();
    }, [sectionId]);

    function resetComposer() {
        setIsComposing(false);
        setEditingModuleId(null);
        setModuleTitle('');
        setModuleDescription('');
    }

    async function handleSaveModule() {
        if (!moduleTitle.trim()) return;

        const result = editingModuleId
            ? await updateModule(editingModuleId, moduleTitle.trim(), moduleDescription.trim() || null)
            : await createModule(sectionId, moduleTitle.trim(), moduleDescription.trim() || null);

        if (!result.error) {
            resetComposer();
            await loadContent();
        }
    }

    function handleEditModule(mod: ContentModule) {
        setEditingModuleId(mod.id);
        setModuleTitle(mod.title);
        setModuleDescription(mod.description ?? '');
        setIsComposing(true);
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

        const result = pendingDelete.kind === 'module'
            ? await deleteModule(pendingDelete.id)
            : await deleteMaterial(pendingDelete.id);

        setPendingDelete(null);

        if (!result.error) await loadContent();
    }

    return (
        <div className="flex flex-col gap-4">
            {(modules.length > 0 || canManage) && (
                <div className="flex items-center justify-between">
                    {modules.length > 0 && (
                        <span className="font-medium text-(--mui-palette-text-secondary) text-sm">
                            {modules.length} Module{modules.length === 1
                                ? ''
                                : 's'}
                        </span>
                    )}
                    {canManage && (
                        <CommonButton
                            className="ml-auto"
                            size="small"
                            startIcon={<PlusIcon size={16} weight="bold" />}
                            variant="contained"
                            onClick={function() {
                                resetComposer();
                                setIsComposing(true);
                            }}
                        >
                            Add Module
                        </CommonButton>
                    )}
                </div>
            )}
            {canManage && isComposing && (
                <div className="flex flex-col gap-3 rounded-lg border border-(--mui-palette-divider) p-4">
                    <CommonInput
                        fullWidth
                        placeholder="Module title"
                        size="small"
                        value={moduleTitle}
                        onChange={function(e: ChangeEvent<HTMLInputElement>) {
                            setModuleTitle(e.target.value);
                        }}
                    />
                    <CommonTextarea
                        maxLength={1000}
                        placeholder="Optional description"
                        value={moduleDescription}
                        onChange={function(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
                            setModuleDescription(e.target.value);
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={resetComposer}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={!moduleTitle.trim() || isModuleUnchanged}
                            size="small"
                            variant="contained"
                            onClick={handleSaveModule}
                        >
                            {editingModuleId
                                ? 'Save'
                                : 'Create'}
                        </CommonButton>
                    </div>
                </div>
            )}
            {modules.length === 0 && !isComposing && (
                <div className="flex flex-col gap-2 items-center py-10">
                    <BookOpenIcon
                        className="text-(--mui-palette-text-disabled)"
                        size={32}
                    />
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        {canManage
                            ? 'No modules yet. Add the first one.'
                            : 'No content has been published yet.'}
                    </p>
                </div>
            )}
            <div className="flex flex-col gap-3">
                {modules.map(function(mod) {
                    const progress = mod.material_count > 0
                        ? (mod.completed_count / mod.material_count) * 100
                        : 0;

                    return (
                        <div
                            className="flex flex-col gap-3 rounded-lg border border-(--mui-palette-divider) p-4"
                            key={mod.id}
                        >
                            <div className="flex gap-2 items-start justify-between">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2 items-center">
                                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                            {mod.title}
                                        </span>
                                        {canManage && !mod.is_published && (
                                            <span className="rounded bg-(--mui-palette-warning-main)/15 px-1.5 py-0.5 text-(--mui-palette-warning-main) text-xs">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                    {mod.description && (
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            {mod.description}
                                        </span>
                                    )}
                                </div>
                                {canManage && (
                                    <div className="flex gap-1 items-center shrink-0">
                                        <CommonButton
                                            color="inherit"
                                            size="small"
                                            variant="text"
                                            onClick={function() {
                                                handleToggleModulePublish(mod);
                                            }}
                                        >
                                            {mod.is_published
                                                ? 'Unpublish'
                                                : 'Publish'}
                                        </CommonButton>
                                        <button
                                            className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-primary-main)"
                                            title="Copy to other sections"
                                            type="button"
                                            onClick={function() {
                                                setDuplicatingModule(mod);
                                            }}
                                        >
                                            <CopySimpleIcon size={16} />
                                        </button>
                                        <button
                                            className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-primary-main)"
                                            type="button"
                                            onClick={function() {
                                                handleEditModule(mod);
                                            }}
                                        >
                                            <PencilSimpleIcon size={16} />
                                        </button>
                                        <button
                                            className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-error-main)"
                                            type="button"
                                            onClick={function() {
                                                setPendingDelete({ id: mod.id, kind: 'module', label: mod.title });
                                            }}
                                        >
                                            <TrashIcon size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {!canManage && mod.material_count > 0 && (
                                <CommonProgressBar
                                    hasSubtext={false}
                                    label="Progress"
                                    percentage={progress}
                                    type="label"
                                />
                            )}
                            <div className="flex flex-col gap-1">
                                {mod.materials.map(function(material) {
                                    return (
                                        <div
                                            className="flex gap-2 items-center justify-between rounded-md border border-(--mui-palette-divider) px-3 py-2"
                                            key={material.id}
                                        >
                                            <button
                                                className="flex flex-1 gap-2 items-center text-left"
                                                type="button"
                                                onClick={function() {
                                                    handleOpenMaterial(material);
                                                }}
                                            >
                                                {material.material_type === 'Link'
                                                    ? <LinkSimpleIcon className="text-(--mui-palette-text-secondary) shrink-0" size={16} />
                                                    : <ArrowSquareOutIcon className="text-(--mui-palette-text-secondary) shrink-0" size={16} />}
                                                <div className="flex flex-col">
                                                    <span className="text-(--mui-palette-text-primary) text-sm">
                                                        {material.title}
                                                    </span>
                                                    {material.description && (
                                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                                            {material.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                            <div className="flex gap-1 items-center shrink-0">
                                                {canManage
                                                    ? (
                                                        <>
                                                            <CommonButton
                                                                color="inherit"
                                                                size="small"
                                                                variant="text"
                                                                onClick={function() {
                                                                    handleToggleMaterialPublish(material);
                                                                }}
                                                            >
                                                                {material.is_published
                                                                    ? 'Unpublish'
                                                                    : 'Publish'}
                                                            </CommonButton>
                                                            <button
                                                                className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-primary-main)"
                                                                type="button"
                                                                onClick={function() {
                                                                    setMaterialModal({ material, moduleId: mod.id });
                                                                }}
                                                            >
                                                                <PencilSimpleIcon size={16} />
                                                            </button>
                                                            <button
                                                                className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-error-main)"
                                                                type="button"
                                                                onClick={function() {
                                                                    setPendingDelete({ id: material.id, kind: 'material', label: material.title });
                                                                }}
                                                            >
                                                                <TrashIcon size={16} />
                                                            </button>
                                                        </>
                                                    )
                                                    : (
                                                        <button
                                                            className="p-1 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-success-main)"
                                                            type="button"
                                                            onClick={function() {
                                                                handleToggleComplete(material);
                                                            }}
                                                        >
                                                            {material.is_completed
                                                                ? <CheckCircleIcon className="text-(--mui-palette-success-main)" size={20} weight="fill" />
                                                                : <CircleIcon size={20} />}
                                                        </button>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {canManage && (
                                    <CommonButton
                                        color="inherit"
                                        size="small"
                                        startIcon={<FilePlusIcon size={16} />}
                                        variant="text"
                                        onClick={function() {
                                            setMaterialModal({ material: null, moduleId: mod.id });
                                        }}
                                    >
                                        Add Material
                                    </CommonButton>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {materialModal && (
                <MaterialFormModal
                    material={materialModal.material}
                    moduleId={materialModal.moduleId}
                    open={materialModal !== null}
                    sectionId={sectionId}
                    onClose={function() {
                        setMaterialModal(null);
                    }}
                    onSaved={loadContent}
                />
            )}
            {duplicatingModule && (
                <DuplicateToSectionsModal
                    entityLabel="Module"
                    entityTitle={duplicatingModule.title}
                    open={duplicatingModule !== null}
                    sectionId={sectionId}
                    onClose={function() {
                        setDuplicatingModule(null);
                    }}
                    onConfirm={function(sectionIds: string[]) {
                        return duplicateModuleToSections(duplicatingModule.id, sectionIds);
                    }}
                    onDuplicated={loadContent}
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
                mainContent={{
                    title: pendingDelete?.kind === 'module'
                        ? 'Delete this module?'
                        : 'Delete this material?'
                }}
                open={pendingDelete !== null}
                subContent={{ title: 'This action cannot be undone.' }}
                onClose={function() {
                    setPendingDelete(null);
                }}
            />
        </div>
    );
}