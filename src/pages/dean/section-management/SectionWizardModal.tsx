import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import Step1SectionOverview from '@pages/dean/section-management/Step1SectionOverview';
import Step2SectionGradingSchema from '@pages/dean/section-management/Step2SectionGradingSchema';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChalkboardIcon,
    CheckCircleIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    copySectionSetupToSections,
    createSection,
    getSectionById,
    getSections,
    updateSection
} from '@services/section.service';
import { useToastStore } from '@stores/toast.store';
import { SectionFormValues } from '@type/section.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export const SECTION_WIZARD_STEPS = [
    {
        step: 1,
        title: 'Overview',
        subtitle: 'Basic section identity, term, course, instructor, room, and capacity'
    },
    {
        step: 2,
        title: 'Grading Schema Settings',
        subtitle: 'Configure section grading schema and component weights'
    }
];

const defaultFormValues: SectionFormValues = {
    term_id: '',
    course_id: '',
    faculty_id: '',
    section_code: '',
    room: '',
    max_slots: '40',
    status: 'Open',
    override_grading_schema: false,
    grading_override_mode: 'copy_section',
    source_section_id: '',
    grading_periods: []
};

interface SectionWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    sectionId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SectionWizardModal({
    open,
    readOnly: initialReadOnly = false,
    sectionId,
    onClose,
    onSuccess
}: SectionWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(initialReadOnly);
    const [isEditable, setIsEditable] = useState(true);

    const methods = useForm<SectionFormValues>({
        defaultValues: defaultFormValues
    });

    const { control, getValues, reset, trigger } = methods;

    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            reset(defaultFormValues);
            setIsReadOnly(initialReadOnly);
            setIsEditable(true);
            return;
        }

        setIsReadOnly(initialReadOnly);

        if (sectionId) {
            setIsLoading(true);
            getSectionById(sectionId)
                .then((res) => {
                    if (res.data) {
                        const data = res.data;
                        setIsEditable(data.is_active_academic_year !== false);
                        reset({
                            term_id: data.term_id || '',
                            course_id: data.course_id || '',
                            faculty_id: data.faculty_id || '',
                            section_code: data.section_code || '',
                            room: data.room || '',
                            max_slots: String(data.max_slots ?? 40),
                            status: data.status || 'Open',
                            is_active_academic_year: data.is_active_academic_year,
                            override_grading_schema: false,
                            grading_override_mode: 'copy_section',
                            source_section_id: '',
                            grading_periods: []
                        });
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsEditable(true);
            reset(defaultFormValues);
        }
    }, [open, sectionId, initialReadOnly, reset]);

    async function validateStep1(): Promise<boolean> {
        const isValid = await trigger(
            sectionId
                ? ['section_code', 'term_id', 'course_id', 'max_slots', 'status']
                : ['section_code', 'term_id', 'course_id', 'max_slots']
        );
        return isValid;
    }

    function validateStep2(): boolean {
        const values = getValues();
        if (values.override_grading_schema) {
            if (values.grading_override_mode === 'copy_section' && !values.source_section_id) {
                useToastStore.getState().showToast('Please select a source section to copy grading schema from.', 'error');
                return false;
            }
        }
        return true;
    }

    async function handleNext() {
        if (currentStep === 1) {
            const valid = await validateStep1();
            if (!valid) return;
            setCurrentStep(2);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    async function handleStepClick(stepNumber: number) {
        if (stepNumber === currentStep) return;
        if (isReadOnly) {
            setCurrentStep(stepNumber);
            return;
        }

        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }

        if (currentStep === 1) {
            const valid = await validateStep1();
            if (!valid) return;
        }

        setCurrentStep(stepNumber);
    }

    async function handleSave() {
        const step1Valid = await validateStep1();
        if (!step1Valid) {
            setCurrentStep(1);
            return;
        }

        if (!validateStep2()) {
            return;
        }

        setIsSaving(true);
        const values = getValues();

        try {
            if (sectionId) {
                const result = await updateSection(sectionId, values);
                if (!result.error) {
                    if (
                        values.override_grading_schema &&
                        values.grading_override_mode === 'copy_section' &&
                        values.source_section_id
                    ) {
                        await copySectionSetupToSections(values.source_section_id, [sectionId]);
                    }
                    useToastStore.getState().showToast('Section updated successfully.', 'success');
                    onSuccess();
                    onClose();
                }
            } else {
                const result = await createSection(values);
                if (!result.error) {
                    if (
                        values.override_grading_schema &&
                        values.grading_override_mode === 'copy_section' &&
                        values.source_section_id
                    ) {
                        const sectionsRes = await getSections();
                        const newSection = sectionsRes.data?.find(
                            (s) => s.section_code === values.section_code
                        );
                        if (newSection?.id) {
                            await copySectionSetupToSections(values.source_section_id, [newSection.id]);
                        }
                    }
                    useToastStore.getState().showToast('Section created successfully.', 'success');
                    onSuccess();
                    onClose();
                }
            }
        } finally {
            setIsSaving(false);
        }
    }

    const currentStepConfig = SECTION_WIZARD_STEPS.find((s) => s.step === currentStep);

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
            {/* Modal Top Header (Exactly matching Academic Year Stepper Modal Header) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                            <ChalkboardIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {sectionId
                                    ? isReadOnly
                                        ? 'View Section Details'
                                        : 'Edit Section Details'
                                    : 'Create New Section'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {isReadOnly
                                    ? isEditable
                                        ? 'Viewing section details and grading schema configuration.'
                                        : 'Viewing section details (Read-Only: Inactive Academic Year).'
                                    : 'Unified setup for section identity, schedule assignment, and grading schema override.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Desktop Actions */}
                        <div className="hidden sm:flex items-center gap-2">
                            {isReadOnly && isEditable && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    onClick={() => setIsReadOnly(false)}
                                >
                                    Edit
                                </CommonButton>
                            )}
                        </div>

                        <button
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Close"
                            type="button"
                            onClick={onClose}
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Mobile Actions */}
                {isReadOnly && isEditable && (
                    <div className="flex sm:hidden items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 overflow-x-auto">
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                            variant="outlined"
                            onClick={() => setIsReadOnly(false)}
                        >
                            Edit
                        </CommonButton>
                    </div>
                )}
            </div>

            {/* Stepper Progress Bar Header (Exactly matching Academic Year Stepper Modal Step Tracker) */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 px-4 py-3 shrink-0">
                {/* Desktop Stepper (>= 768px) */}
                <div className="hidden md:grid grid-cols-2 gap-2">
                    {SECTION_WIZARD_STEPS.map((s) => {
                        const isActive = currentStep === s.step;
                        const isDone = currentStep > s.step;

                        return (
                            <button
                                key={s.step}
                                className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                                    isActive
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm border border-brand-300 dark:border-brand-700/60'
                                        : 'hover:bg-white/60 dark:hover:bg-zinc-800/40 opacity-80'
                                }`}
                                type="button"
                                onClick={() => handleStepClick(s.step)}
                            >
                                <span
                                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                        isActive
                                            ? 'bg-brand-600 text-white'
                                            : isDone
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    {isDone ? <CheckCircleIcon className="w-4 h-4" /> : s.step}
                                </span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                        className={`text-xs font-semibold truncate ${
                                            isActive
                                                ? 'text-brand-600 dark:text-brand-400'
                                                : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        {s.title}
                                    </span>
                                    <span onClick={(e) => e.stopPropagation()}>
                                        <CommonInfoTooltip content={s.subtitle} size={14} />
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Mobile Stepper Header (< 768px) */}
                <div className="block md:hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wide flex items-center gap-1.5">
                            <span>Step {currentStep} of 2: {currentStepConfig?.title}</span>
                            {currentStepConfig?.subtitle && (
                                <CommonInfoTooltip content={currentStepConfig.subtitle} size={14} />
                            )}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {Math.round((currentStep / 2) * 100)}%
                        </span>
                    </div>
                    {/* Progress Bar Line */}
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden flex">
                        <div
                            className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${(currentStep / 2) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Wizard Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Loading section details...</p>
                    </div>
                ) : (
                    <>
                        {currentStep === 1 && (
                            <Step1SectionOverview
                                control={control}
                                disabled={isReadOnly}
                                isCreate={!sectionId}
                            />
                        )}

                        {currentStep === 2 && (
                            <Step2SectionGradingSchema
                                control={control}
                                currentSectionId={sectionId ?? undefined}
                                disabled={isReadOnly}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Sticky Bottom Action Bar (Exactly matching Academic Year Stepper Modal Footer) */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shrink-0 flex items-center justify-between gap-3 safe-bottom z-10">
                {/* Back Button */}
                <CommonButton
                    color="inherit"
                    disabled={currentStep === 1 || isLoading || isSaving}
                    size="medium"
                    startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                    variant="outlined"
                    onClick={handleBack}
                >
                    Back
                </CommonButton>

                {/* Step indicator on desktop */}
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                    Step {currentStep} of 2 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 2 ? (
                        <CommonButton
                            color="primary"
                            disabled={isLoading || isSaving}
                            endIcon={<ArrowRightIcon className="w-4 h-4" />}
                            size="medium"
                            variant="contained"
                            onClick={handleNext}
                        >
                            Next Step
                        </CommonButton>
                    ) : isReadOnly ? (
                        <CommonButton
                            color="primary"
                            size="medium"
                            variant="contained"
                            onClick={onClose}
                        >
                            Close
                        </CommonButton>
                    ) : (
                        <CommonButton
                            color="primary"
                            disabled={isLoading || isSaving}
                            loading={isSaving}
                            size="medium"
                            startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                            variant="contained"
                            onClick={handleSave}
                        >
                            {isSaving ? 'Saving Section...' : sectionId ? 'Save Changes' : 'Create Section'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonModal>
    );
}
