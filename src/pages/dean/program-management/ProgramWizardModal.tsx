import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    FloppyDiskIcon,
    GraduationCapIcon,
    XIcon
} from '@phosphor-icons/react';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import ProgramGradingSchemaStep from '@pages/dean/program-management/ProgramGradingSchemaStep';
import { ProgramFormValues } from '@type/program/program.type';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface ProgramWizardModalProps {
    open: boolean;
    isEditing?: boolean;
    isCodeDisabled?: boolean;
    isSaving?: boolean;
    methods: UseFormReturn<ProgramFormValues>;
    onClose: () => void;
    onSubmit: (values: ProgramFormValues) => void;
}

export const PROGRAM_WIZARD_STEPS = [
    { step: 1, title: 'Program Details', subtitle: 'Basic identity & academic duration' },
    { step: 2, title: 'Grading Schema', subtitle: 'Inherit defaults or set custom schema' }
];

export default function ProgramWizardModal({
    open,
    isEditing = false,
    isCodeDisabled = false,
    isSaving = false,
    methods,
    onClose,
    onSubmit
}: ProgramWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const { control, handleSubmit, trigger } = methods;

    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();

    const fields: FormFieldConfig<ProgramFormValues>[] = [
        {
            disabled: isCodeDisabled,
            fieldProps: { helperText: 'Unique program code, e.g. BSCS' },
            name: 'code',
            rules: isCodeDisabled
                ? undefined
                : { required: 'Program code is required' },
            type: 'text',
            gridCols: 1
        },
        {
            fieldProps: { helperText: 'Full program name, e.g. Bachelor of Science in Computer Science' },
            name: 'name',
            rules: { required: 'Program name is required' },
            type: 'text',
            gridCols: 1
        },
        {
            fieldProps: { helperText: 'Department that owns this program' },
            name: 'department_id',
            options: departmentOptions,
            rules: { required: 'Please select a department' },
            type: 'select'
        },
        {
            fieldProps: { helperText: 'Academic level of the program' },
            name: 'program_level_id',
            options: programLevelOptions,
            rules: { required: 'Please select a program level' },
            type: 'select'
        },
        {
            fieldProps: { helperText: 'Total units across the whole program (optional)' },
            name: 'total_units',
            type: 'number'
        },
        {
            name: 'years_duration',
            rules: {
                required: 'Number of years is required',
                min: { value: 1, message: 'Must be at least 1 year' },
                max: { value: 8, message: 'Cannot exceed 8 years' }
            },
            type: 'number',
            fieldProps: {
                helperText: 'Standard duration in years (1-8)',
                min: 2,
                max: 8
            }
        },
        {
            fieldProps: {
                resize: 'vertical',
                rows: 3
            },
            name: 'description',
            type: 'text-area',
            gridCols: 2
        }
    ];

    const currentStepConfig = PROGRAM_WIZARD_STEPS.find((s) => s.step === currentStep);

    async function handleNext() {
        if (currentStep === 1) {
            const isValid = await trigger(['code', 'name', 'department_id', 'program_level_id', 'years_duration']);
            if (!isValid) return;
            setCurrentStep(2);
        }
    }

    function handleBack() {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    }

    function handleStepClick(stepNumber: number) {
        if (stepNumber === currentStep) return;
        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            return;
        }
        handleNext();
    }

    function handleCloseModal() {
        setCurrentStep(1);
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
            {/* Modal Top Header (Exactly matching Academic Year Wizard Modal Header) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                            <GraduationCapIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {isEditing ? 'Edit Academic Program' : 'Create Academic Program'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Unified setup for program identity, department ownership, and grading schema override.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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
            </div>

            {/* Stepper Progress Bar Header (Exactly matching Academic Year Wizard Stepper Header) */}
            <div className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 px-4 py-3 shrink-0">
                {/* Desktop Stepper (>= 768px) */}
                <div className="hidden md:grid grid-cols-2 gap-2">
                    {PROGRAM_WIZARD_STEPS.map((s) => {
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

            {/* Stepper Step Body (Exactly matching Academic Year Wizard Step Body) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {currentStep === 1 && (
                    <CommonForm
                        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                        control={control}
                        fields={fields}
                        hasHelper
                    />
                )}

                {currentStep === 2 && (
                    <ProgramGradingSchemaStep
                        control={control}
                    />
                )}
            </div>

            {/* Sticky Bottom Action Bar (Exactly matching Academic Year Wizard Footer) */}
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
                    Step {currentStep} of 2 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
                <div className="flex items-center gap-2">
                    {currentStep < 2 ? (
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
                            size="medium"
                            startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                            variant="contained"
                            onClick={handleSubmit(onSubmit)}
                        >
                            {isSaving ? 'Saving Program...' : 'Save Program'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonModal>
    );
}
