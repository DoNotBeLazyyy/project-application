import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import { useFormDraft } from '@hooks/useFormDraft';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import CurriculumMapManagement from '@pages/dean/curriculum-map-management';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    FloppyDiskIcon,
    GraduationCapIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import { CurriculumMapEntry } from '@type/curriculum-map.type';
import { ProgramFormValues } from '@type/program/program.type';
import { generateProgramCode } from '@utils/entity-code.util';
import { formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { FieldErrors, UseFormReturn, useWatch } from 'react-hook-form';

interface ProgramWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    initialStep?: number;
    isEditing?: boolean;
    isSaving?: boolean;
    programId?: string;
    methods: UseFormReturn<ProgramFormValues>;
    onClose: VoidFunction;
    onSubmit: (values: ProgramFormValues) => void;
    onSwitchToEdit?: (step?: number) => void;
}

export const PROGRAM_WIZARD_STEPS = [
    {
        step: 1, title: 'Program Details', subtitle: 'Basic identity & academic duration'
    },
    {
        step: 2, title: 'Curriculum Map', subtitle: 'Course subjects mapped by year level & term'
    }
];

export default function ProgramWizardModal({
    open,
    readOnly = false,
    initialStep = 1,
    isEditing = false,
    isSaving = false,
    programId,
    methods,
    onClose,
    onSubmit,
    onSwitchToEdit
}: ProgramWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const { control, handleSubmit, setValue, trigger } = methods;

    const draftGuard = useFormDraft({
        control,
        enabled: open && !readOnly && !isSaving,
        formId: `program-wizard-${programId || 'new'}`
    });
    const selectedDepartmentId = useWatch({ control, name: 'department_id' });
    const selectedName = useWatch({ control, name: 'name' });
    const watchedCode = useWatch({ control, name: 'code' });

    const initialNameRef = useRef<string | null>(null);
    const initialCodeRef = useRef<string | null>(null);

    useEffect(() => {
        initialNameRef.current = null;
        initialCodeRef.current = null;
    }, [programId, open]);

    useEffect(() => {
        if (readOnly) return;

        if (initialNameRef.current === null) {
            initialNameRef.current = selectedName || '';
            initialCodeRef.current = watchedCode || '';
            return;
        }

        if (!isEditing) {
            if (selectedName) {
                const currentCode = methods.getValues('code');
                const generated = generateProgramCode(selectedName);
                if (generated && (!currentCode || currentCode !== generated)) {
                    setValue('code', generated, { shouldValidate: true, shouldDirty: true });
                }
            }
            else {
                setValue('code', '', { shouldValidate: false, shouldDirty: false });
            }
        }
        else {
            if (selectedName !== initialNameRef.current) {
                const generated = generateProgramCode(selectedName || '');
                if (generated) {
                    setValue('code', generated, { shouldValidate: true, shouldDirty: true });
                }
                else if (!selectedName?.trim()) {
                    setValue('code', '', { shouldValidate: false, shouldDirty: true });
                }
            }
            else if (initialCodeRef.current !== null && watchedCode !== initialCodeRef.current) {
                setValue('code', initialCodeRef.current, { shouldValidate: true, shouldDirty: false });
            }
        }
    }, [isEditing, selectedName, setValue, methods, readOnly, watchedCode]);

    useEffect(() => {
        if (open) {
            setCurrentStep(initialStep);
            setIsConfirmCloseOpen(false);
        }
    }, [open, initialStep]);

    const { activeSchoolYearId } = useSchoolYearOptions();
    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();

    const fields: FormFieldConfig<ProgramFormValues>[] = [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique program code, e.g. BSCS' },
            label: 'Program Code',
            name: 'code',
            type: 'text',
            gridCols: 1
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Full program name, e.g. Bachelor of Science in Computer Science' },
            label: 'Program Name',
            name: 'name',
            rules: readOnly
                ? undefined
                : {
                    required: 'Program name is required',
                    validate: (val: any) => Boolean(val && String(val)
                        .trim()) || 'Program name cannot be empty or whitespace only'
                },
            type: 'text',
            gridCols: 1
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Department that owns this program' },
            label: 'Department',
            name: 'department_id',
            options: departmentOptions,
            rules: readOnly
                ? undefined
                : { required: 'Please select a department' },
            type: 'select'
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Academic level of the program' },
            label: 'Program Level',
            name: 'program_level_id',
            options: programLevelOptions,
            rules: readOnly
                ? undefined
                : { required: 'Please select a program level' },
            type: 'select'
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Total units across the whole program (optional)', min: 0 },
            label: 'Total Units',
            name: 'total_units',
            rules: readOnly
                ? undefined
                : { min: { value: 0, message: 'Total units cannot be negative' } },
            type: 'number'
        },
        {
            disabled: readOnly,
            label: 'Duration (Years)',
            name: 'years_duration',
            rules: readOnly
                ? undefined
                : {
                    required: 'Number of years is required',
                    min: { value: 1, message: 'Must be at least 1 year' },
                    max: { value: 8, message: 'Cannot exceed 8 years' },
                    validate: (val: any) => Number.isInteger(Number(val)) || 'Duration must be a whole number of years'
                },
            type: 'number',
            fieldProps: {
                helperText: 'Standard duration in years (1-8)',
                maxDecimals: 0,
                min: 1,
                max: 8
            }
        },
        {
            // programs.is_active is persisted by fn_create_program / fn_update_program
            disabled: readOnly,
            items: [
                { name: 'is_active' as const, label: 'Active Program' }
            ],
            name: 'is_active',
            type: 'checkbox-group',
            gridCols: 2
        },
        {
            disabled: readOnly,
            fieldProps: {
                resize: 'vertical',
                rows: 3
            },
            label: 'Description',
            name: 'description',
            type: 'text-area',
            gridCols: 2
        }
    ];

    const currentStepConfig = PROGRAM_WIZARD_STEPS.find((s) => s.step === currentStep);

    async function handleNext() {
        if (currentStep === 1) {
            const isValid = await trigger(['code', 'name', 'department_id', 'program_level_id', 'years_duration']);
            if (!isValid) {
                formErrors(methods.formState.errors, methods);
                return;
            }
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
        if (readOnly) {
            setCurrentStep(stepNumber);
            return;
        }
        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }
        if (currentStep === 1) {
            const isValid = await trigger(['code', 'name', 'department_id', 'program_level_id', 'years_duration']);
            if (!isValid) {
                formErrors(methods.formState.errors, methods);
                return;
            }
        }
        setCurrentStep(stepNumber);
    }

    function handleFormErrors(errors: FieldErrors<ProgramFormValues>) {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            const firstKey = errorKeys[0];
            const step1Keys = ['code', 'name', 'department_id', 'program_level_id', 'years_duration'];
            if (step1Keys.includes(firstKey)) {
                setCurrentStep(1);
            }
        }
        formErrors(errors, methods);
    }

    function handleCloseModal() {
        if (isSaving) return;
        if (!readOnly && draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        setCurrentStep(1);
        onClose();
    }

    function handleDiscardAndClose() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        setCurrentStep(1);
        onClose();
    }

    function handleFormSubmit(values: ProgramFormValues) {
        draftGuard.clearDraft();
        onSubmit(values);
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full max-w-7xl p-0 overflow-hidden flex flex-col max-h-[92vh]'
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
                            <GraduationCapIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {readOnly
                                    ? 'View Academic Program'
                                    : isEditing
                                        ? 'Edit Academic Program'
                                        : 'Create Academic Program'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {readOnly
                                    ? 'Viewing program identity, department ownership, grading schema override, and curriculum map.'
                                    : 'Unified setup for program identity, department ownership, grading schema override, and curriculum map.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Desktop Actions */}
                        <div className="hidden sm:flex items-center gap-2">
                            {readOnly && onSwitchToEdit && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                    variant="outlined"
                                    onClick={() => onSwitchToEdit(currentStep)}
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
                {readOnly && onSwitchToEdit && (
                    <div className="flex sm:hidden items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 overflow-x-auto">
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                            variant="outlined"
                            onClick={() => onSwitchToEdit(currentStep)}
                        >
                            Edit
                        </CommonButton>
                    </div>
                )}
            </div>

            {/* Stepper Progress Bar Header */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly={readOnly}
                steps={PROGRAM_WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                onStepClick={handleStepClick}
            />

            {/* Stepper Step Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                <div
                    style={{
                        display: currentStep === 1
                            ? 'block'
                            : 'none'
                    }}
                >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <GraduationCapIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    Program Details
                                </h4>
                            </div>
                        </div>

                        <CommonForm
                            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                            control={control}
                            fields={fields}
                            hasHelper
                        />
                    </div>
                </div>

                <div
                    style={{
                        display: currentStep === 2
                            ? 'block'
                            : 'none'
                    }}
                >
                    <CurriculumMapManagement
                        departmentId={selectedDepartmentId}
                        hideProgramSelect
                        initialEntries={(methods.getValues('curriculum_entries') as unknown as CurriculumMapEntry[]) || []}
                        programId={programId}
                        readOnly={readOnly}
                        schoolYearId={activeSchoolYearId}
                        onChangeEntries={(newEntries, pendingDeleted) => {
                            setValue('curriculum_entries', newEntries as any, { shouldDirty: true });
                            if (pendingDeleted) {
                                setValue('pending_deleted_curriculum_ids', pendingDeleted as any, { shouldDirty: true });
                            }
                        }}
                    />
                </div>
            </div>

            {/* Sticky Bottom Action Bar (Exactly matching Academic Year Stepper Modal Footer) */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shrink-0 flex items-center justify-between gap-3 safe-bottom z-10">
                {/* Back Button */}
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

                {/* Step indicator on desktop */}
                <div className="hidden sm:block text-xs font-medium text-slate-500">
                    Step {currentStep} of {PROGRAM_WIZARD_STEPS.length} — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < PROGRAM_WIZARD_STEPS.length
                        ? (
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
                        )
                        : readOnly
                            ? (
                                onSwitchToEdit
                                    ? (
                                        <CommonButton
                                            color="primary"
                                            size="medium"
                                            startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                            variant="contained"
                                            onClick={() => onSwitchToEdit(currentStep)}
                                        >
                                Edit Program
                                        </CommonButton>
                                    )
                                    : (
                                        <CommonButton
                                            color="primary"
                                            size="medium"
                                            variant="contained"
                                            onClick={handleCloseModal}
                                        >
                                Close
                                        </CommonButton>
                                    )
                            )
                            : (
                                <CommonButton
                                    color="primary"
                                    disabled={isSaving || (Boolean(isEditing || programId) && !draftGuard.hasRealChanges)}
                                    loading={isSaving}
                                    size="medium"
                                    startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                    variant="contained"
                                    onClick={handleSubmit(handleFormSubmit, handleFormErrors)}
                                >
                                    {isSaving
                                        ? 'Saving Program...'
                                        : programId
                                            ? 'Save Changes'
                                            : 'Save Program'}
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