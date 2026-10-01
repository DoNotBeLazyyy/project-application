import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BroomIcon,
    CheckCircleIcon,
    FloppyDiskIcon,
    GraduationCapIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import { useSchoolYearOptions } from '@pages/admin/school-year-management/useSchoolYearOptions';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import CurriculumMapManagement from '@pages/dean/curriculum-map-management';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import ProgramGradingSchemaStep from '@pages/dean/program-management/ProgramGradingSchemaStep';
import { ProgramFormValues } from '@type/program/program.type';
import { useEffect, useState } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';

interface ProgramWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    initialStep?: number;
    isEditing?: boolean;
    isCodeDisabled?: boolean;
    isSaving?: boolean;
    programId?: string;
    methods: UseFormReturn<ProgramFormValues>;
    onClose: () => void;
    onSubmit: (values: ProgramFormValues) => void;
    onSwitchToEdit?: (step?: number) => void;
}

export const PROGRAM_WIZARD_STEPS = [
    { step: 1, title: 'Program Details', subtitle: 'Basic identity & academic duration' },
    { step: 2, title: 'Grading Schema', subtitle: 'Inherit defaults or set custom schema' },
    { step: 3, title: 'Curriculum Map', subtitle: 'Course subjects mapped by year level & term' }
];

export default function ProgramWizardModal({
    open,
    readOnly = false,
    initialStep = 1,
    isEditing = false,
    isCodeDisabled = false,
    isSaving = false,
    programId,
    methods,
    onClose,
    onSubmit,
    onSwitchToEdit
}: ProgramWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const { control, handleSubmit, setValue, trigger } = methods;
    const selectedSchoolYearId = useWatch({ control, name: 'school_year_id' });

    useEffect(() => {
        if (open) {
            setCurrentStep(initialStep);
        }
    }, [open, initialStep]);

    function handleClearProgramDetails() {
        setValue('code', '', { shouldDirty: true });
        setValue('name', '', { shouldDirty: true });
        setValue('department_id', '', { shouldDirty: true });
        setValue('program_level_id', '', { shouldDirty: true });
        setValue('school_year_id', '', { shouldDirty: true });
        setValue('total_units', '', { shouldDirty: true });
        setValue('years_duration', '', { shouldDirty: true });
        setValue('description', '', { shouldDirty: true });
    }

    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();
    const { schoolYearOptions } = useSchoolYearOptions();

    const fields: FormFieldConfig<ProgramFormValues>[] = [
        {
            disabled: readOnly || isCodeDisabled,
            fieldProps: { helperText: 'Unique program code, e.g. BSCS' },
            name: 'code',
            rules: readOnly || isCodeDisabled
                ? undefined
                : { required: 'Program code is required' },
            type: 'text',
            gridCols: 1
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Full program name, e.g. Bachelor of Science in Computer Science' },
            name: 'name',
            rules: readOnly ? undefined : { required: 'Program name is required' },
            type: 'text',
            gridCols: 1
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Department that owns this program' },
            name: 'department_id',
            options: departmentOptions,
            rules: readOnly ? undefined : { required: 'Please select a department' },
            type: 'select'
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Academic level of the program' },
            name: 'program_level_id',
            options: programLevelOptions,
            rules: readOnly ? undefined : { required: 'Please select a program level' },
            type: 'select'
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Academic / School Year for this program' },
            name: 'school_year_id',
            options: schoolYearOptions,
            rules: readOnly ? undefined : { required: 'Please select an academic year' },
            type: 'select'
        },
        {
            disabled: readOnly,
            fieldProps: { helperText: 'Total units across the whole program (optional)' },
            name: 'total_units',
            type: 'number'
        },
        {
            disabled: readOnly,
            name: 'years_duration',
            rules: readOnly ? undefined : {
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
            disabled: readOnly,
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
        } else if (currentStep === 2) {
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
        if (currentStep === 1) {
            const isValid = await trigger(['code', 'name', 'department_id', 'program_level_id', 'years_duration']);
            if (!isValid) return;
        }
        setCurrentStep(stepNumber);
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
                steps={PROGRAM_WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                currentStep={currentStep}
                onStepClick={handleStepClick}
                readOnly={readOnly}
            />

            {/* Stepper Step Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {currentStep === 1 && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <GraduationCapIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    Program Details
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Basic identity & academic duration
                                </p>
                            </div>
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={handleClearProgramDetails}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
                                    title="Clear Program Details"
                                >
                                    <BroomIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Clear</span>
                                </button>
                            )}
                        </div>

                        <CommonForm
                            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                            control={control}
                            fields={fields}
                            hasHelper
                        />
                    </div>
                )}

                {currentStep === 2 && (
                    <ProgramGradingSchemaStep
                        control={control}
                        disabled={readOnly}
                    />
                )}

                {currentStep === 3 && (
                    <CurriculumMapManagement
                        hideProgramSelect
                        programId={programId}
                        schoolYearId={selectedSchoolYearId}
                        readOnly={readOnly}
                        onChangeEntries={(newEntries) => {
                            setValue('curriculum_entries', newEntries as any, { shouldDirty: true });
                        }}
                    />
                )}
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
                    Step {currentStep} of 3 — {currentStepConfig?.title}
                </div>

                {/* Next / Save Action */}
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
                        onSwitchToEdit ? (
                            <CommonButton
                                color="primary"
                                size="medium"
                                startIcon={<PencilSimpleIcon className="w-4 h-4" />}
                                variant="contained"
                                onClick={() => onSwitchToEdit(currentStep)}
                            >
                                Edit Program
                            </CommonButton>
                        ) : (
                            <CommonButton
                                color="primary"
                                size="medium"
                                variant="contained"
                                onClick={handleCloseModal}
                            >
                                Close
                            </CommonButton>
                        )
                    ) : (
                        <CommonButton
                            color="primary"
                            disabled={isSaving}
                            loading={isSaving}
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
