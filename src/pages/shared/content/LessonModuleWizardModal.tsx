import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import FormLabel from '@components/form/FormLabel';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import { useObjectDraft } from '@hooks/useFormDraft';
import { isBlankText, MATERIAL_URL_PATTERN } from '@pages/shared/content/content-form.constant';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    FileTextIcon,
    FloppyDiskIcon,
    LinkSimpleIcon,
    PlusIcon,
    TrashIcon,
    UploadSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    createMaterial,
    createModule,
    deleteMaterial,
    MATERIAL_TYPE_OPTIONS,
    setModulePublished,
    updateModule
} from '@services/content.service';
import { uploadFile } from '@services/storage.service';
import { useToastStore } from '@stores/toast.store';
import { ContentModule, MaterialType } from '@type/content.type';
import { generateId } from '@utils/uuid.util';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

export const LESSON_MODULE_WIZARD_STEPS: ModalStepItem[] = [
    {
        step: 1,
        title: 'Module Identity',
        subtitle: 'Module title, description, learning goals, and grading period'
    },
    {
        step: 2,
        title: 'Syllabus & Materials',
        subtitle: 'Attach official syllabus, lecture slides, files, or external links'
    },
    {
        step: 3,
        title: 'Review & Publish',
        subtitle: 'Check module structure, publication status, and resource list'
    }
];

const PERIOD_OPTIONS = [
    { label: 'All Content / General', value: 'General' },
    { label: 'Prelim Period', value: 'Prelim' },
    { label: 'Midterm Period', value: 'Midterm' },
    { label: 'Semi-Final Period', value: 'Semi-Final' },
    { label: 'Finals Period', value: 'Finals' }
];

interface ModuleFormValues {
    title: string;
    description: string;
    period: string;
}

interface ResourceFormValues {
    title: string;
    materialType: MaterialType;
    externalUrl: string;
    description: string;
}

const EMPTY_RESOURCE: ResourceFormValues = {
    description: '',
    externalUrl: '',
    materialType: 'File',
    title: ''
};

interface StagedMaterial {
    id: string;
    title: string;
    description: string;
    material_type: MaterialType;
    external_url?: string;
    file?: File;
    isExisting?: boolean;
}

interface LessonModuleWizardModalProps {
    open: boolean;
    sectionId: string;
    module?: ContentModule | null;
    readOnly?: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function LessonModuleWizardModal({
    open,
    sectionId,
    module: initialModule,
    readOnly = false,
    onClose,
    onSuccess
}: LessonModuleWizardModalProps) {
    const isEdit = Boolean(initialModule);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1 state
    const moduleForm = useForm<ModuleFormValues>({
        defaultValues: {
            description: '',
            period: 'General',
            title: ''
        }
    });
    const moduleValues = useWatch({ control: moduleForm.control });
    const title = moduleValues.title ?? '';
    const description = moduleValues.description ?? '';
    const period = moduleValues.period ?? 'General';
    const [isPublished, setIsPublished] = useState(true);

    // Step 2 state (materials)
    const [stagedMaterials, setStagedMaterials] = useState<StagedMaterial[]>([]);
    const resourceForm = useForm<ResourceFormValues>({ defaultValues: EMPTY_RESOURCE });
    const resourceValues = useWatch({ control: resourceForm.control });
    const newMaterialTitle = resourceValues.title ?? '';
    const newMaterialDesc = resourceValues.description ?? '';
    const newMaterialType = resourceValues.materialType ?? 'File';
    const newMaterialUrl = resourceValues.externalUrl ?? '';
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const initialPeriod = useMemo(() => {
        if (!initialModule) return 'General';
        const titleLower = initialModule.title.toLowerCase();
        const descLower = (initialModule.description ?? '').toLowerCase();
        if (titleLower.includes('prelim') || descLower.includes('prelim')) return 'Prelim';
        if (titleLower.includes('midterm') || descLower.includes('midterm')) return 'Midterm';
        if (titleLower.includes('semi-final') || descLower.includes('semi-final')) return 'Semi-Final';
        if (titleLower.includes('final') || descLower.includes('final')) return 'Finals';
        return 'General';
    }, [initialModule]);

    const defaultDraftValues = useMemo(() => ({
        title: initialModule?.title ?? '',
        description: initialModule?.description ?? '',
        period: initialPeriod,
        isPublished: initialModule?.is_published ?? true
    }), [initialModule, initialPeriod]);

    const currentDraftValues = useMemo(() => ({
        title,
        description,
        period,
        isPublished
    }), [title, description, period, isPublished]);

    const draftGuard = useObjectDraft({
        formId: initialModule?.id
            ? `lesson-module-wizard-${sectionId}-${initialModule.id}`
            : `lesson-module-wizard-${sectionId}-create`,
        values: currentDraftValues,
        defaultValues: defaultDraftValues,
        onRestore: (restored) => {
            moduleForm.setValue('title', restored.title ?? '');
            moduleForm.setValue('description', restored.description ?? '');
            moduleForm.setValue('period', restored.period ?? 'General');
            setIsPublished(restored.isPublished ?? true);
        },
        enabled: open && !readOnly
    });

    const hasMaterialsChanges = useMemo(() => {
        const origMaterials = initialModule?.materials || [];
        if (stagedMaterials.length !== origMaterials.length) return true;
        if (stagedMaterials.some((m) => !m.isExisting)) return true;
        if (origMaterials.some((orig) => !stagedMaterials.some((s) => s.id === orig.id))) return true;
        if (
            isAddingMaterial
            && (Boolean(newMaterialTitle.trim())
                || Boolean(newMaterialDesc.trim())
                || Boolean(newMaterialUrl.trim())
                || Boolean(selectedFile))
        ) {
            return true;
        }
        return false;
    }, [
        initialModule,
        stagedMaterials,
        isAddingMaterial,
        newMaterialTitle,
        newMaterialDesc,
        newMaterialUrl,
        selectedFile
    ]);

    const hasRealChanges = !readOnly && (draftGuard.hasRealChanges || hasMaterialsChanges);

    const { reset: resetModuleForm } = moduleForm;
    const { reset: resetResourceForm } = resourceForm;

    useEffect(() => {
        resetResourceForm(EMPTY_RESOURCE);
        setSelectedFile(null);
        setFileError(null);

        if (!open) {
            setIsDiscardOpen(false);
            setCurrentStep(1);
            resetModuleForm({ description: '', period: 'General', title: '' });
            setIsPublished(true);
            setStagedMaterials([]);
            setIsAddingMaterial(false);
            return;
        }

        if (initialModule) {
            resetModuleForm({
                description: initialModule.description ?? '',
                period: initialPeriod,
                title: initialModule.title
            });
            setIsPublished(initialModule.is_published);

            setStagedMaterials(
                (initialModule.materials || []).map((m) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description ?? '',
                    material_type: m.material_type,
                    external_url: m.external_url ?? undefined,
                    isExisting: true
                }))
            );
        } else {
            resetModuleForm({ description: '', period: 'General', title: '' });
            setIsPublished(true);
            setStagedMaterials([]);
        }
    }, [open, initialModule, initialPeriod, resetModuleForm, resetResourceForm]);

    const moduleFields: FormFieldConfig<ModuleFormValues>[] = [
        {
            disabled: readOnly,
            placeholder: 'e.g. Course Syllabus & Overview or Week 1: Algorithm Analysis',
            gridCols: 2,
            label: 'Module Title',
            name: 'title',
            rules: readOnly
                ? undefined
                : {
                    required: 'Please enter a module title.',
                    validate: (value: unknown) => !isBlankText(value) || 'Module title cannot be empty or whitespace only'
                },
            type: 'text'
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Students can filter their learning content by grading period.' },
            label: 'Target Grading Period / Scope',
            name: 'period',
            options: PERIOD_OPTIONS,
            type: 'select'
        },
        {
            disabled: readOnly,
            fieldProps: { maxLength: 1000 },
            placeholder: 'Outline the key concepts, learning goals, chapter readings, or activity guide for this module...',
            gridCols: 2,
            label: 'Description & Learning Objectives',
            name: 'description',
            type: 'text-area'
        }
    ];

    const resourceFields: FormFieldConfig<ResourceFormValues>[] = [
        {
            placeholder: 'e.g. Official Course Syllabus (AY 2025-2026)',
            gridCols: 2,
            label: 'Resource Title',
            name: 'title',
            rules: {
                required: 'Resource title is required',
                validate: (value: unknown) => !isBlankText(value) || 'Resource title cannot be empty or whitespace only'
            },
            type: 'text'
        },
        {
            label: 'Resource Type',
            name: 'materialType',
            options: MATERIAL_TYPE_OPTIONS,
            rules: { required: 'Resource type is required' },
            type: 'select'
        },
        ...(newMaterialType === 'Link'
            ? [
                {
                    placeholder: 'https://...',
                    label: 'External URL',
                    name: 'externalUrl' as const,
                    rules: {
                        pattern: MATERIAL_URL_PATTERN,
                        required: 'URL is required for link resources',
                        validate: (value: unknown) => !isBlankText(value) || 'URL is required for link resources'
                    },
                    type: 'text' as const
                }
            ]
            : []),
        {
            fieldProps: { maxLength: 500 },
            placeholder: 'Optional instructions or reading guide for this file...',
            gridCols: 2,
            label: 'Description & Notes',
            name: 'description',
            type: 'text-area'
        }
    ];

    function handleRequestClose() {
        if (hasRealChanges) {
            setIsDiscardOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleConfirmDiscard() {
        draftGuard.clearDraft();
        setIsDiscardOpen(false);
        onClose();
    }

    function handleResetMaterialForm() {
        resetResourceForm(EMPTY_RESOURCE);
        setSelectedFile(null);
        setFileError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsAddingMaterial(false);
    }

    /**
     * Validates the open resource form (fields plus the file picker) and stages it.
     * Returns false - leaving the inline errors visible - when anything is invalid.
     */
    async function stageResourceIfValid(): Promise<boolean> {
        const isFieldsValid = await resourceForm.trigger();
        const values = resourceForm.getValues();
        const needsFile = values.materialType !== 'Link';
        const isFileValid = !needsFile || Boolean(selectedFile);

        setFileError(isFileValid
            ? null
            : 'Choose a file to upload');

        if (!isFieldsValid || !isFileValid) {
            return false;
        }

        const newStaged: StagedMaterial = {
            id: generateId(),
            title: values.title.trim(),
            description: values.description.trim(),
            material_type: values.materialType,
            external_url: needsFile ? undefined : values.externalUrl.trim(),
            file: needsFile ? selectedFile || undefined : undefined,
            isExisting: false
        };

        setStagedMaterials((prev) => [...prev, newStaged]);
        handleResetMaterialForm();
        useToastStore.getState().showToast(`Added "${newStaged.title}" to module.`, 'success');
        return true;
    }

    async function handleAddStagedMaterial() {
        await stageResourceIfValid();
    }

    function handleRemoveMaterial(id: string) {
        setStagedMaterials((prev) => prev.filter((m) => m.id !== id));
    }

    async function validateStep1(): Promise<boolean> {
        const isValid = await moduleForm.trigger();
        if (!isValid) {
            setCurrentStep(1);
        }
        return isValid;
    }

    async function commitPendingMaterialIfValid(): Promise<boolean> {
        if (!isAddingMaterial) {
            return true;
        }

        // An untouched resource form is simply discarded rather than blocking the step.
        const isUntouched = !newMaterialTitle.trim()
            && !newMaterialDesc.trim()
            && !newMaterialUrl.trim()
            && !selectedFile;

        if (isUntouched) {
            handleResetMaterialForm();
            return true;
        }

        return stageResourceIfValid();
    }

    async function handleNext() {
        if (currentStep === 1) {
            if (!(await validateStep1())) return;
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!(await commitPendingMaterialIfValid())) return;
            setCurrentStep(3);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    async function handleStepClick(stepNumber: number) {
        if (stepNumber === currentStep) return;
        if (readOnly) {
            setCurrentStep(stepNumber);
            return;
        }
        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }
        if (currentStep === 1 && !(await validateStep1())) return;
        if (currentStep === 2 && !(await commitPendingMaterialIfValid())) return;
        setCurrentStep(stepNumber);
    }

    async function handleSaveModule() {
        if (!(await validateStep1())) return;
        if (currentStep === 2 && !(await commitPendingMaterialIfValid())) return;

        setIsSaving(true);
        try {
            let moduleId: string | undefined = initialModule?.id;

            // Compute final title with period tag if not already included
            let finalTitle = title.trim();
            if (period !== 'General' && !finalTitle.toLowerCase().includes(period.toLowerCase())) {
                finalTitle = `[${period}] ${finalTitle}`;
            }

            if (isEdit && moduleId) {
                const res = await updateModule(moduleId, finalTitle, description.trim() || null);
                if (res.error) return;
                if (initialModule && initialModule.is_published !== isPublished) {
                    await setModulePublished(moduleId, isPublished);
                }
            } else {
                const res = await createModule(sectionId, finalTitle, description.trim() || null);
                if (res.error || !res.data) return;
                const created = res.data as unknown as { id?: string; module_id?: string };
                moduleId = created.id || created.module_id;
                if (!isPublished && moduleId) {
                    await setModulePublished(moduleId, false);
                }
            }

            // Sync materials
            if (moduleId) {
                // If editing, delete any existing materials that were removed
                if (isEdit && initialModule?.materials) {
                    const removedMaterials = initialModule.materials.filter(
                        (orig) => !stagedMaterials.some((s) => s.id === orig.id)
                    );
                    for (const rem of removedMaterials) {
                        await deleteMaterial(rem.id);
                    }
                }

                // Save new materials
                const pendingUploads = stagedMaterials.filter((m) => !m.isExisting);

                for (const item of pendingUploads) {
                    if (item.material_type === 'Link') {
                        const matRes = await createMaterial({
                            moduleId,
                            title: item.title,
                            description: item.description || null,
                            materialType: 'Link',
                            externalUrl: item.external_url || ''
                        });
                        if (matRes.error) {
                            useToastStore.getState().showToast(`Failed to add resource "${item.title}": ${matRes.error.message}`, 'error');
                        }
                    } else if (item.file) {
                        const path = `${sectionId}/${moduleId}/${generateId()}-${item.file.name}`;
                        const uploadRes = await uploadFile({ bucket: 'materials', file: item.file, path });
                        if (!uploadRes.error) {
                            const matRes = await createMaterial({
                                moduleId,
                                title: item.title,
                                description: item.description || null,
                                materialType: item.material_type,
                                fileUrl: path,
                                fileName: item.file.name,
                                fileSizeBytes: item.file.size,
                                mimeType: item.file.type || null
                            });
                            if (matRes.error) {
                                useToastStore.getState().showToast(`Failed to add resource "${item.title}": ${matRes.error.message}`, 'error');
                            }
                        } else {
                            useToastStore.getState().showToast(`Failed to upload file for "${item.title}": ${uploadRes.error.message}`, 'error');
                        }
                    }
                }
            }

            draftGuard.clearDraft();
            useToastStore.getState().showToast('Lesson & syllabus module saved successfully.', 'success');
            onSuccess();
            onClose();
        } finally {
            setIsSaving(false);
        }
    }

    const currentStepConfig = LESSON_MODULE_WIZARD_STEPS.find((s) => s.step === currentStep);
    const hasSyllabus = stagedMaterials.some((m) =>
        m.title.toLowerCase().includes('syllabus') || m.description.toLowerCase().includes('syllabus')
    );

    return (
        <>
        <CommonModal
            cardProps={{
                className: 'w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleRequestClose}
        >
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                            <BookOpenIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {readOnly
                                    ? 'View Lesson & Syllabus Module'
                                    : isEdit
                                    ? `Edit Module: ${initialModule?.title}`
                                    : 'Create Lesson & Syllabus Module'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Unified setup for module overview, learning materials, syllabus documents, and publication rules.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close"
                            type="button"
                            onClick={handleRequestClose}
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stepper Progress Bar Header */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly={readOnly}
                steps={LESSON_MODULE_WIZARD_STEPS}
                onStepClick={handleStepClick}
            />

            {/* Wizard Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {/* Step 1: Module Identity */}
                {currentStep === 1 && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col gap-4">
                            <CommonForm
                                component="div"
                                containerClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
                                control={moduleForm.control}
                                enableDraftRecovery={false}
                                fields={moduleFields}
                            />

                            <div>
                                <div>
                                    <FormLabel label="Publication Status" />
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
                                            disabled={readOnly}
                                            type="button"
                                            onClick={() => setIsPublished(true)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                                isPublished
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'
                                            }`}
                                        >
                                            Published (Visible to Students)
                                        </button>
                                        <button
                                            disabled={readOnly}
                                            type="button"
                                            onClick={() => setIsPublished(false)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                                !isPublished
                                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'
                                            }`}
                                        >
                                            Draft (Hidden)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Syllabus & Materials */}
                {currentStep === 2 && (
                    <div className="flex flex-col gap-4">
                        {/* Material Creator Accordion */}
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Add Resource or Syllabus Document
                                    </h3>
                                </div>
                                {!isAddingMaterial && (
                                    <CommonButton
                                        size="small"
                                        startIcon={<PlusIcon size={14} weight="bold" />}
                                        variant="outlined"
                                        onClick={() => setIsAddingMaterial(true)}
                                    >
                                        Add Resource
                                    </CommonButton>
                                )}
                            </div>

                            {isAddingMaterial ? (
                                <div className="border border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/50 p-4 rounded-xl flex flex-col gap-3">
                                    <CommonForm
                                        component="div"
                                        containerClassName="grid grid-cols-1 md:grid-cols-2 gap-3"
                                        control={resourceForm.control}
                                        enableDraftRecovery={false}
                                        fields={resourceFields}
                                    />

                                    {newMaterialType !== 'Link' && (
                                        <div className="flex flex-col gap-1">
                                            <FormLabel
                                                errorMessage={fileError ?? undefined}
                                                isRequired
                                                label="File Attachment"
                                            />
                                            <input
                                                className="hidden"
                                                ref={fileInputRef}
                                                type="file"
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    const file = e.target.files?.[0] ?? null;
                                                    setSelectedFile(file);
                                                    if (file) setFileError(null);
                                                }}
                                            />
                                            <CommonButton
                                                color={fileError ? 'error' : 'inherit'}
                                                startIcon={<UploadSimpleIcon size={16} />}
                                                variant="outlined"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {selectedFile ? selectedFile.name : 'Choose Document or Slide'}
                                            </CommonButton>
                                            {fileError && (
                                                <span className="text-(--mui-palette-error-main) text-xs" role="alert">
                                                    {fileError}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end pt-1">
                                        <CommonButton
                                            color="inherit"
                                            size="small"
                                            variant="outlined"
                                            onClick={handleResetMaterialForm}
                                        >
                                            Cancel
                                        </CommonButton>
                                        <CommonButton
                                            size="small"
                                            variant="contained"
                                            onClick={handleAddStagedMaterial}
                                        >
                                            Add Resource to Module
                                        </CommonButton>
                                    </div>
                                </div>
                            ) : null}

                            {/* Staged Materials Bento List */}
                            <div className="mt-4 flex flex-col gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Configured Resources ({stagedMaterials.length})
                                </span>
                                {stagedMaterials.length === 0 ? (
                                    <div className="p-6 text-center border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl">
                                        <FileTextIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                        <p className="text-xs text-slate-500">
                                            No materials added to this module yet. You can attach a syllabus, PDF handouts, or lecture slides now, or add them later.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        {stagedMaterials.map((mat) => {
                                            const isSyl = mat.title.toLowerCase().includes('syllabus');
                                            return (
                                                <div
                                                    key={mat.id}
                                                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                        isSyl
                                                            ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800'
                                                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 shrink-0">
                                                            {mat.material_type === 'Link' ? (
                                                                <LinkSimpleIcon size={18} />
                                                            ) : (
                                                                <FileTextIcon size={18} />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                                    {mat.title}
                                                                </span>
                                                                {isSyl && (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                                                                        Official Syllabus
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-slate-500 truncate">
                                                                {mat.description || (mat.material_type === 'Link' ? mat.external_url : mat.file ? mat.file.name : mat.material_type)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMaterial(mat.id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <TrashIcon size={16} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Review & Publish */}
                {currentStep === 3 && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                                        Module Summary
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                                        {title}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {description || 'No description provided.'}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 border ${
                                        isPublished
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300'
                                    }`}
                                >
                                    {isPublished ? 'Ready to Publish' : 'Draft / Hidden'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Target Period
                                    </span>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                        {period}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        Resources Attached
                                    </span>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                        {stagedMaterials.length} item{stagedMaterials.length === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </div>

                            {hasSyllabus && (
                                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900/60 flex items-center gap-3">
                                    <BookOpenIcon className="w-5 h-5 text-blue-600 shrink-0" />
                                    <p className="text-xs text-blue-800 dark:text-blue-300">
                                        This module includes a designated <strong>Official Syllabus</strong> document, which will be pinned at the top of the course for all enrolled students.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shrink-0 flex items-center justify-between gap-3 safe-bottom z-10">
                <CommonButton
                    color="inherit"
                    disabled={currentStep === 1 || isSaving}
                    size="medium"
                    startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                    variant="outlined"
                    onClick={handleBack}
                >
                    Back
                </CommonButton>

                <div className="hidden sm:block text-xs font-medium text-slate-500">
                    Step {currentStep} of 3 — {currentStepConfig?.title}
                </div>

                <div className="flex items-center gap-2">
                    {currentStep < 3 ? (
                        <CommonButton
                            color="primary"
                            disabled={isSaving}
                            endIcon={<ArrowRightIcon className="w-4 h-4" />}
                            size="medium"
                            variant="contained"
                            onClick={handleNext}
                        >
                            Next Step
                        </CommonButton>
                    ) : readOnly ? (
                        <CommonButton
                            color="primary"
                            size="medium"
                            variant="contained"
                            onClick={handleRequestClose}
                        >
                            Close
                        </CommonButton>
                    ) : (
                        <CommonButton
                            color="primary"
                            disabled={isSaving || (Boolean(initialModule) && !hasRealChanges)}
                            loading={isSaving}
                            size="medium"
                            startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                            variant="contained"
                            onClick={handleSaveModule}
                        >
                            {isSaving
                                ? 'Saving Module...'
                                : isEdit
                                    ? 'Save Changes'
                                    : 'Save Module'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonModal>

        <DiscardChangesPromptModal
            open={isDiscardOpen}
            onContinueEditing={() => setIsDiscardOpen(false)}
            onDiscard={handleConfirmDiscard}
        />

        <DraftRecoveryPromptModal
            open={draftGuard.isPromptOpen}
            onContinue={draftGuard.handleContinue}
            onDiscard={draftGuard.handleDiscard}
        />
        </>
    );
}
