import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import { useFormDraft } from '@hooks/useFormDraft';
import Step1SectionOverview from '@pages/dean/section-management/Step1SectionOverview';
import Step2SectionSchedule from '@pages/dean/section-management/Step2SectionSchedule';
import Step3SectionGradingSchema from '@pages/dean/section-management/Step3SectionGradingSchema';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChalkboardIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import {
    createSection,
    flattenScheduleBlocksToSlots,
    getSectionById,
    getSections,
    groupScheduleSlotsToBlocks,
    saveSectionGradingOverride,
    saveSectionSchedules,
    updateSection
} from '@services/section.service';
import { useToastStore } from '@stores/toast.store';
import { SectionFormValues, SectionScheduleSlot } from '@type/section.type';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

export const SECTION_WIZARD_STEPS = [
    {
        step: 1,
        title: 'Overview',
        subtitle: 'Basic section identity, term, course, instructor, room, and capacity'
    },
    {
        step: 2,
        title: 'Schedule Assignment',
        subtitle: 'Configure class meeting days, time slots, and room assignments'
    },
    {
        step: 3,
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
    grading_override_mode: 'custom',
    source_section_id: '',
    grading_periods: [],
    schedules: [
        {
            days: ['Monday', 'Wednesday'],
            room: '',
            time_end: '10:00',
            time_start: '08:00'
        }
    ]
};

interface SectionWizardModalProps {
    open: boolean;
    initialFacultyId?: string | null;
    readOnly?: boolean;
    sectionId?: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SectionWizardModal({
    open,
    initialFacultyId,
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
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

    const methods = useForm<SectionFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: defaultFormValues
    });

    const { control, getValues, reset, trigger, setValue } = methods;

    const draftGuard = useFormDraft({
        control,
        enabled: open && !isReadOnly && !isLoading && !isSaving,
        formId: `section-wizard-${sectionId || 'new'}`
    });

    useEffect(() => {
        if (!open) {
            setCurrentStep(1);
            reset(defaultFormValues);
            setIsReadOnly(initialReadOnly);
            setIsEditable(true);
            setIsConfirmCloseOpen(false);
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
                        const rawSlots = (data.schedules || []) as unknown as SectionScheduleSlot[];
                        const scheduleBlocks = groupScheduleSlotsToBlocks(rawSlots);
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
                            grading_override_mode: 'custom',
                            source_section_id: '',
                            grading_periods: [],
                            schedules: scheduleBlocks.length > 0
                                ? scheduleBlocks
                                : defaultFormValues.schedules
                        });
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
        else {
            setIsEditable(true);
            reset({
                ...defaultFormValues,
                faculty_id: initialFacultyId || ''
            });
        }
    }, [open, sectionId, initialReadOnly, initialFacultyId, reset]);

    async function validateStep1(): Promise<boolean> {
        const isValid = await trigger(
            sectionId
                ? ['term_id', 'course_id', 'max_slots', 'status']
                : ['term_id', 'course_id', 'max_slots']
        );
        if (!isValid) {
            formErrors(methods.formState.errors, methods);
        }
        return isValid;
    }

    function validateStep2(): boolean {
        const values = getValues();
        const schedules = values.schedules || [];
        let hasErrors = false;
        for (let i = 0; i < schedules.length; i++) {
            const slot = schedules[i];
            if (!slot.days || slot.days.length === 0) {
                methods.setError(`schedules.${i}.days` as any, {
                    type: 'manual',
                    message: `Schedule Slot #${i + 1} must have at least one day selected.`
                });
                hasErrors = true;
            }
            if (!slot.time_start) {
                methods.setError(`schedules.${i}.time_start` as any, {
                    type: 'manual',
                    message: `Schedule Slot #${i + 1}: Start time is required.`
                });
                hasErrors = true;
            }
            if (!slot.time_end) {
                methods.setError(`schedules.${i}.time_end` as any, {
                    type: 'manual',
                    message: `Schedule Slot #${i + 1}: End time is required.`
                });
                hasErrors = true;
            }
            if (slot.time_start && slot.time_end && slot.time_start >= slot.time_end) {
                methods.setError(`schedules.${i}.time_start` as any, {
                    type: 'manual',
                    message: `Schedule Slot #${i + 1}: Start time must be earlier than end time.`
                });
                hasErrors = true;
                continue;
            }

            // section_schedules is unique per (day, start time); overlapping slots on a shared
            // day would also double-book the class, so block both here.
            const overlapIndex = schedules.findIndex((other, j) =>
                j < i
                && Boolean(other.time_start && other.time_end && slot.time_start && slot.time_end)
                && (other.days || []).some((day) => (slot.days || []).includes(day))
                && slot.time_start < other.time_end
                && other.time_start < slot.time_end);
            if (overlapIndex >= 0) {
                methods.setError(`schedules.${i}.time_start` as any, {
                    type: 'manual',
                    message: `Schedule Slot #${i + 1} overlaps Slot #${overlapIndex + 1} on a shared day.`
                });
                hasErrors = true;
            }
        }
        if (hasErrors) {
            formErrors(methods.formState.errors, methods);
            return false;
        }
        return true;
    }

    // Mirrors grading_components (name NOT NULL, weight CHECK > 0 and <= 100) and the
    // per-period rule that component weights total exactly 100%.
    function validateStep3(): boolean {
        const values = getValues();
        if (!values.override_grading_schema) {
            return true;
        }

        let hasErrors = false;
        (values.grading_periods || []).forEach(function(period, pIdx) {
            const components = period.components || [];
            components.forEach(function(component, cIdx) {
                if (!component.name || !component.name.trim()) {
                    methods.setError(`grading_periods.${pIdx}.components.${cIdx}.name` as any, {
                        type: 'manual',
                        message: 'Component name is required.'
                    });
                    hasErrors = true;
                }
                const weight = Number(component.weight);
                if (!(weight > 0 && weight <= 100)) {
                    methods.setError(`grading_periods.${pIdx}.components.${cIdx}.weight` as any, {
                        type: 'manual',
                        message: 'Weight must be greater than 0 and at most 100.'
                    });
                    hasErrors = true;
                }
            });
            const total = components.reduce((sum, component) => sum + (Number(component.weight) || 0), 0);
            if (components.length === 0 || Math.abs(total - 100) > 0.001) {
                methods.setError(`grading_periods.${pIdx}.weight` as any, {
                    type: 'manual',
                    message: `${period.name} component weights must total 100% (currently ${total}%).`
                });
                hasErrors = true;
            }
        });

        if (hasErrors) {
            formErrors(methods.formState.errors, methods);
        }
        return !hasErrors;
    }

    async function handleNext() {
        if (currentStep === 1) {
            const valid = await validateStep1();
            if (!valid) return;
            setCurrentStep(2);
        }
        else if (currentStep === 2) {
            const valid = validateStep2();
            if (!valid) return;
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
            if (stepNumber === 3) {
                const step2Valid = validateStep2();
                if (!step2Valid) {
                    setCurrentStep(2);
                    return;
                }
            }
        }
        else if (currentStep === 2) {
            const valid = validateStep2();
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

        const step2Valid = validateStep2();
        if (!step2Valid) {
            setCurrentStep(2);
            return;
        }

        if (!validateStep3()) {
            setCurrentStep(3);
            return;
        }

        setIsSaving(true);
        const values = getValues();
        const flatSlots = flattenScheduleBlocksToSlots(values.schedules || []);

        try {
            let targetSectionId = sectionId;

            if (sectionId) {
                const result = await updateSection(sectionId, values);
                if (result.error) return;
            }
            else {
                const result = await createSection(values);
                if (result.error) return;
                targetSectionId = result.data?.id;

                if (!targetSectionId) {
                    const sectionsRes = await getSections();
                    const newSection = sectionsRes.data?.find(
                        (s) => s.section_code === values.section_code
                    );
                    targetSectionId = newSection?.id;
                }
            }

            if (targetSectionId) {
                const schedRes = await saveSectionSchedules(targetSectionId, flatSlots);
                if (schedRes.error) return;

                // The grading step is only collected in the form - persist the override explicitly
                if (values.override_grading_schema && values.grading_periods?.length) {
                    const gradingRes = await saveSectionGradingOverride(targetSectionId, values.grading_periods);
                    if (gradingRes.error) return;
                }
            }

            useToastStore.getState()
                .showToast(
                    sectionId
                        ? 'Section updated successfully.'
                        : 'Section created successfully.',
                    'success'
                );
            draftGuard.clearDraft();
            onSuccess();
            onClose();
        }
        finally {
            setIsSaving(false);
        }
    }

    const currentStepConfig = SECTION_WIZARD_STEPS.find((s) => s.step === currentStep);

    function handleCloseModal() {
        if (isSaving) return;
        if (!isReadOnly && draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleDiscardAndClose() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        onClose();
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleCloseModal}
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
                            onClick={handleCloseModal}
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

            {/* Stepper Progress Bar Header */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly={isReadOnly}
                steps={SECTION_WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                onStepClick={handleStepClick}
            />

            {/* Wizard Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {isLoading
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-500">Loading section details...</p>
                        </div>
                    )
                    : (
                        <FormProvider {...methods}>
                            {currentStep === 1 && (
                                <Step1SectionOverview
                                    control={control}
                                    disabled={isReadOnly}
                                    isCreate={!sectionId}
                                    sectionId={sectionId}
                                    setValue={setValue}
                                />
                            )}

                            {currentStep === 2 && (
                                <Step2SectionSchedule
                                    control={control}
                                    disabled={isReadOnly}
                                />
                            )}

                            {currentStep === 3 && (
                                <Step3SectionGradingSchema
                                    control={control}
                                    currentSectionId={sectionId ?? undefined}
                                    disabled={isReadOnly}
                                />
                            )}
                        </FormProvider>
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
                    Step {currentStep} of {SECTION_WIZARD_STEPS.length} — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < SECTION_WIZARD_STEPS.length
                        ? (
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
                        )
                        : isReadOnly
                            ? (
                                <CommonButton
                                    color="primary"
                                    size="medium"
                                    variant="contained"
                                    onClick={handleCloseModal}
                                >
                            Close
                                </CommonButton>
                            )
                            : (
                                <CommonButton
                                    color="primary"
                                    disabled={isLoading || isSaving || (Boolean(sectionId) && !draftGuard.hasRealChanges)}
                                    loading={isSaving}
                                    size="medium"
                                    startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                    variant="contained"
                                    onClick={handleSave}
                                >
                                    {isSaving
                                        ? 'Saving Section...'
                                        : sectionId
                                            ? 'Save Changes'
                                            : 'Create Section'}
                                </CommonButton>
                            )}
                </div>
            </div>
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
            <DiscardChangesPromptModal
                open={isConfirmCloseOpen}
                onContinueEditing={() => setIsConfirmCloseOpen(false)}
                onDiscard={handleDiscardAndClose}
            />
        </CommonModal>
    );
}