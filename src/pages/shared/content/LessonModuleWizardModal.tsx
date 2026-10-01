import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import CommonSelect from '@components/select/CommonSelect';
import CommonTextarea from '@components/textarea/CommonTextarea';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowSquareOutIcon,
    BookOpenIcon,
    CheckCircleIcon,
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
import { ContentModule, CourseMaterial, MaterialType } from '@type/content.type';
import { generateId } from '@utils/uuid.util';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

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
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Step 1 state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [period, setPeriod] = useState('General');
    const [isPublished, setIsPublished] = useState(true);

    // Step 2 state (materials)
    const [stagedMaterials, setStagedMaterials] = useState<StagedMaterial[]>([]);
    const [newMaterialTitle, setNewMaterialTitle] = useState('');
    const [newMaterialDesc, setNewMaterialDesc] = useState('');
    const [newMaterialType, setNewMaterialType] = useState<MaterialType>('File');
    const [newMaterialUrl, setNewMaterialUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            setTitle('');
            setDescription('');
            setPeriod('General');
            setIsPublished(true);
            setStagedMaterials([]);
            setIsAddingMaterial(false);
            return;
        }

        if (initialModule) {
            setTitle(initialModule.title);
            setDescription(initialModule.description ?? '');
            setIsPublished(initialModule.is_published);

            // Infer period from title or description
            const titleLower = initialModule.title.toLowerCase();
            const descLower = (initialModule.description ?? '').toLowerCase();
            if (titleLower.includes('prelim') || descLower.includes('prelim')) setPeriod('Prelim');
            else if (titleLower.includes('midterm') || descLower.includes('midterm')) setPeriod('Midterm');
            else if (titleLower.includes('semi-final') || descLower.includes('semi-final')) setPeriod('Semi-Final');
            else if (titleLower.includes('final') || descLower.includes('final')) setPeriod('Finals');
            else setPeriod('General');

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
            setTitle('');
            setDescription('');
            setPeriod('General');
            setIsPublished(true);
            setStagedMaterials([]);
        }
    }, [open, initialModule]);

    function handleResetMaterialForm() {
        setNewMaterialTitle('');
        setNewMaterialDesc('');
        setNewMaterialType('File');
        setNewMaterialUrl('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsAddingMaterial(false);
    }

    function handleAddStagedMaterial() {
        if (!newMaterialTitle.trim()) return;

        if (newMaterialType === 'Link' && !newMaterialUrl.trim()) {
            useToastStore.getState().showToast('Please provide a valid URL for the link resource.', 'error');
            return;
        }

        if (newMaterialType !== 'Link' && !selectedFile) {
            useToastStore.getState().showToast('Please choose a file to upload.', 'error');
            return;
        }

        const newStaged: StagedMaterial = {
            id: generateId(),
            title: newMaterialTitle.trim(),
            description: newMaterialDesc.trim(),
            material_type: newMaterialType,
            external_url: newMaterialType === 'Link' ? newMaterialUrl.trim() : undefined,
            file: selectedFile || undefined,
            isExisting: false
        };

        setStagedMaterials((prev) => [...prev, newStaged]);
        handleResetMaterialForm();
        useToastStore.getState().showToast(`Added "${newStaged.title}" to module.`, 'success');
    }

    function handleRemoveMaterial(id: string) {
        setStagedMaterials((prev) => prev.filter((m) => m.id !== id));
    }

    function validateStep1(): boolean {
        if (!title.trim()) {
            useToastStore.getState().showToast('Please enter a module title.', 'error');
            return false;
        }
        return true;
    }

    function handleNext() {
        if (currentStep === 1) {
            if (!validateStep1()) return;
            setCurrentStep(2);
        } else if (currentStep === 2) {
            setCurrentStep(3);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    function handleStepClick(stepNumber: number) {
        if (stepNumber === currentStep) return;
        if (readOnly) {
            setCurrentStep(stepNumber);
            return;
        }
        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }
        if (currentStep === 1 && !validateStep1()) return;
        setCurrentStep(stepNumber);
    }

    async function handleSaveModule() {
        if (!validateStep1()) return;

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
                moduleId = (res.data as any).id || (res.data as any).module_id;
                if (!isPublished && moduleId) {
                    await setModulePublished(moduleId, false);
                }
            }

            // Save new materials
            if (moduleId) {
                const pendingUploads = stagedMaterials.filter((m) => !m.isExisting);

                for (const item of pendingUploads) {
                    if (item.material_type === 'Link') {
                        await createMaterial({
                            moduleId,
                            title: item.title,
                            description: item.description || null,
                            materialType: 'Link',
                            externalUrl: item.external_url || ''
                        });
                    } else if (item.file) {
                        const path = `${sectionId}/${moduleId}/${generateId()}-${item.file.name}`;
                        const uploadRes = await uploadFile({ bucket: 'materials', file: item.file, path });
                        if (!uploadRes.error) {
                            await createMaterial({
                                moduleId,
                                title: item.title,
                                description: item.description || null,
                                materialType: item.material_type,
                                fileUrl: path,
                                fileName: item.file.name,
                                fileSizeBytes: item.file.size,
                                mimeType: item.file.type || null
                            });
                        }
                    }
                }
            }

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
        <CommonModal
            cardProps={{
                className: 'w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={onClose}
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
                            onClick={onClose}
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
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Module Title <span className="text-rose-500">*</span>
                                </label>
                                <CommonInput
                                    fullWidth
                                    placeholder="e.g. Course Syllabus & Overview or Week 1: Algorithm Analysis"
                                    size="small"
                                    value={title}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                                />
                                {!isEdit && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {[
                                            'Course Syllabus & Academic Policies',
                                            'Week 1: Orientation & Foundations',
                                            'Prelim Examination Review',
                                            'Midterm Unit: Advanced Concepts',
                                            'Final Project Guidelines & Rubrics'
                                        ].map((preset) => (
                                            <button
                                                key={preset}
                                                className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                                                type="button"
                                                onClick={() => {
                                                    setTitle(preset);
                                                    if (preset.includes('Syllabus')) {
                                                        setDescription('Official course outline, grading distribution, attendance policy, and course expectations.');
                                                    }
                                                }}
                                            >
                                                + {preset}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Target Grading Period / Scope
                                    </label>
                                    <CommonSelect
                                        fullWidth
                                        options={PERIOD_OPTIONS}
                                        value={period}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setPeriod(e.target.value)}
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Students can filter their learning content by grading period.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Publication Status
                                    </label>
                                    <div className="flex items-center gap-3 mt-2">
                                        <button
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

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Description &amp; Learning Objectives
                                </label>
                                <CommonTextarea
                                    maxLength={1000}
                                    placeholder="Outline the key concepts, learning goals, chapter readings, or activity guide for this module..."
                                    value={description}
                                    onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                                        setDescription(e.target.value)
                                    }
                                />
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
                                    <p className="text-xs text-slate-500">
                                        Upload PDFs, slides, lecture materials, or external reference links.
                                    </p>
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
                                    <div className="flex flex-wrap gap-1.5 mb-1">
                                        {['Course Syllabus', 'Lecture Slides', 'Reading Handout', 'Lab Activity'].map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => {
                                                    setNewMaterialTitle(preset);
                                                    if (preset === 'Course Syllabus') {
                                                        setNewMaterialDesc('Official Course Outline, Learning Outcomes, and Academic Policies');
                                                        setNewMaterialType('Document');
                                                    } else if (preset === 'Lecture Slides') {
                                                        setNewMaterialType('Slide');
                                                    }
                                                }}
                                                className="px-2 py-0.5 text-xs rounded bg-white dark:bg-zinc-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                            >
                                                + {preset}
                                            </button>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Resource Title <span className="text-rose-500">*</span>
                                        </label>
                                        <CommonInput
                                            fullWidth
                                            placeholder="e.g. Official Course Syllabus (AY 2025-2026)"
                                            size="small"
                                            value={newMaterialTitle}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMaterialTitle(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Resource Type
                                            </label>
                                            <CommonSelect
                                                fullWidth
                                                options={MATERIAL_TYPE_OPTIONS}
                                                value={newMaterialType}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    setNewMaterialType(e.target.value as MaterialType)
                                                }
                                            />
                                        </div>

                                        {newMaterialType === 'Link' ? (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    External URL <span className="text-rose-500">*</span>
                                                </label>
                                                <CommonInput
                                                    fullWidth
                                                    placeholder="https://..."
                                                    size="small"
                                                    value={newMaterialUrl}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMaterialUrl(e.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    File Attachment <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    type="file"
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                        setSelectedFile(e.target.files?.[0] ?? null)
                                                    }
                                                />
                                                <CommonButton
                                                    color="inherit"
                                                    size="small"
                                                    startIcon={<UploadSimpleIcon size={16} />}
                                                    variant="outlined"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    {selectedFile ? selectedFile.name : 'Choose Document or Slide'}
                                                </CommonButton>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Description &amp; Notes
                                        </label>
                                        <CommonTextarea
                                            maxLength={500}
                                            placeholder="Optional instructions or reading guide for this file..."
                                            value={newMaterialDesc}
                                            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                                                setNewMaterialDesc(e.target.value)
                                            }
                                        />
                                    </div>

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
                                            disabled={!newMaterialTitle.trim()}
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
                    ) : (
                        <CommonButton
                            color="primary"
                            disabled={isSaving}
                            loading={isSaving}
                            size="medium"
                            startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                            variant="contained"
                            onClick={handleSaveModule}
                        >
                            {isSaving ? 'Saving Module...' : 'Save Module'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonModal>
    );
}
