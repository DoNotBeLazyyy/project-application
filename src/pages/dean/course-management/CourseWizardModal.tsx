import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import CourseForm, { COURSE_FORM_STEPS } from '@pages/dean/course-management/CourseForm';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CheckCircleIcon,
    FloppyDiskIcon,
    PencilSimpleIcon,
    XIcon
} from '@phosphor-icons/react';
import { CourseFormValues } from '@type/course/course.type';
import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface CourseWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    courseId?: string | null;
    isCodeDisabled?: boolean;
    isSaving?: boolean;
    methods: UseFormReturn<CourseFormValues>;
    onClose: () => void;
    onSubmit: (values: CourseFormValues) => void;
    onSwitchToEdit?: () => void;
}

export default function CourseWizardModal({
    open,
    readOnly = false,
    courseId,
    isCodeDisabled = false,
    isSaving = false,
    methods,
    onClose,
    onSubmit,
    onSwitchToEdit
}: CourseWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const { control, handleSubmit, trigger } = methods;

    const currentStepConfig = COURSE_FORM_STEPS.find((s) => s.step === currentStep);

    async function handleNext() {
        if (currentStep === 1) {
            const isValid = await trigger(['title', 'code', 'department_id']);
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
            const isValid = await trigger(['title', 'code', 'department_id']);
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
                            <BookOpenIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {readOnly
                                    ? 'View Course Details'
                                    : courseId
                                    ? 'Edit Course Details'
                                    : 'Create New Course'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {readOnly
                                    ? 'Viewing course details, course type breakdown, and prerequisites.'
                                    : 'Unified setup for course identity, course type breakdown, and prerequisites.'}
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
                                    onClick={onSwitchToEdit}
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
                            onClick={onSwitchToEdit}
                        >
                            Edit
                        </CommonButton>
                    </div>
                )}
            </div>

            {/* Stepper Progress Bar Header */}
            <ModalStepperHeader
                steps={COURSE_FORM_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                currentStep={currentStep}
                onStepClick={handleStepClick}
                readOnly={readOnly}
            />

            {/* Stepper Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                <CourseForm
                    activeStep={currentStep}
                    control={control}
                    disabled={readOnly}
                    excludeCourseId={courseId ?? undefined}
                    isCodeDisabled={isCodeDisabled}
                />
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
                                onClick={onSwitchToEdit}
                            >
                                Edit Course
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
                            {isSaving ? 'Saving Course...' : isCodeDisabled ? 'Save Changes' : 'Save Course'}
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonModal>
    );
}
