import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import ValidCommonTextarea from '@components/textarea/ValidCommonTextArea';
import { QUESTIONS_SCROLL_STEP } from '@constants/evaluation.constant';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    FloppyDiskIcon,
    InfoIcon,
    ListChecksIcon,
    PencilSimpleIcon,
    PlusCircleIcon,
    SlidersIcon,
    TrashIcon,
    WarningIcon,
    XIcon
} from '@phosphor-icons/react';
import { EvaluationQuestionForm, EvaluationTemplateForm } from '@type/evaluation.type';
import { useEffect, useState } from 'react';
import { Control, FieldValues, useFieldArray, UseFormReturn, useWatch } from 'react-hook-form';

export const EVALUATION_WIZARD_STEPS: ModalStepItem[] = [
    {
        step: 1,
        title: 'Section Details & Scope',
        subtitle: 'Define section title, order, program target mode, and description.'
    },
    {
        step: 2,
        title: 'Evaluation Questions',
        subtitle: 'Manage rating prompts and required question items.'
    }
];

const TARGET_MODE_OPTIONS = [
    { label: 'Include selected programs only', value: 'INCLUDE' },
    { label: 'Exclude selected programs (show to all others)', value: 'EXCLUDE' }
];

const DEFAULT_QUESTION: EvaluationQuestionForm = {
    question_text: '',
    is_required: true,
    min_rating: '1',
    max_rating: '5'
};

export function validateUniqueQuestion(value: any, formValues: FieldValues) {
    const normalized = String(value ?? '')
        .trim()
        .toLowerCase();

    if (!normalized) {
        return true;
    }

    const questions = (formValues.questions ?? []) as EvaluationQuestionForm[];
    const occurrences = questions.filter(function(question) {
        return String(question.question_text ?? '')
            .trim()
            .toLowerCase() === normalized;
    }).length;

    return occurrences < 2 || 'Question must be unique';
}

function EvaluationQuestionItem({
    control,
    disabled,
    index,
    total,
    onMove,
    onRemove
}: {
    control: Control<EvaluationTemplateForm>;
    disabled?: boolean;
    index: number;
    total: number;
    onMove: (fromIndex: number, toIndex: number) => void;
    onRemove: (index: number) => void;
}) {
    return (
        <div className="border border-slate-200 dark:border-zinc-700/80 rounded-xl p-3.5 sm:p-4 bg-white dark:bg-zinc-800/80 shadow-xs flex flex-col gap-3 transition-shadow hover:shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-700/60 pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                        #{index + 1}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        Question {index + 1}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <ValidCommonCheckbox
                        control={control}
                        disabled={disabled}
                        hasHelper={false}
                        label="Required"
                        name={`questions.${index}.is_required` as const}
                    />

                    {!disabled && (
                        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-zinc-700 pl-2 ml-1">
                            <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                disabled={index === 0}
                                title="Move up"
                                type="button"
                                onClick={() => onMove(index, index - 1)}
                            >
                                <ArrowUpIcon className="w-4 h-4" weight="bold" />
                            </button>
                            <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                                disabled={index === total - 1}
                                title="Move down"
                                type="button"
                                onClick={() => onMove(index, index + 1)}
                            >
                                <ArrowDownIcon className="w-4 h-4" weight="bold" />
                            </button>
                            <button
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-1 cursor-pointer"
                                title="Remove question"
                                type="button"
                                onClick={() => onRemove(index)}
                            >
                                <TrashIcon className="w-4 h-4" weight="bold" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full">
                <ValidCommonTextarea
                    control={control}
                    disabled={disabled}
                    hasHelper
                    label="Question Prompt"
                    name={`questions.${index}.question_text` as const}
                    placeholder="e.g. The instructor demonstrates thorough knowledge and mastery of the subject matter..."
                    rows={2}
                    rules={
                        disabled
                            ? undefined
                            : {
                                required: 'Question text is required',
                                validate: (val, formVals) => validateUniqueQuestion(val, formVals)
                            }
                    }
                />
            </div>
        </div>
    );
}

interface EvaluationWizardModalProps {
    open: boolean;
    readOnly?: boolean;
    initialStep?: number;
    templateId?: string | null;
    isSaving?: boolean;
    methods: UseFormReturn<EvaluationTemplateForm>;
    onClose: () => void;
    onSubmit: (values: EvaluationTemplateForm) => void;
    onSwitchToEdit?: (step?: number) => void;
}

export default function EvaluationWizardModal({
    open,
    readOnly = false,
    initialStep = 1,
    templateId,
    isSaving = false,
    methods,
    onClose,
    onSubmit,
    onSwitchToEdit
}: EvaluationWizardModalProps) {
    const [currentStep, setCurrentStep] = useState(initialStep);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ index: number; text: string } | null>(null);
    const { control, handleSubmit, trigger } = methods;

    useEffect(() => {
        if (open) {
            setCurrentStep(initialStep);
        }
    }, [open, initialStep]);

    const { fields, append, move, remove } = useFieldArray({
        control,
        name: 'questions'
    });

    const { hasMore, revealThrough, sentinelRef, visibleCount } = useInfiniteScroll(
        fields.length,
        QUESTIONS_SCROLL_STEP
    );

    const { programOptions } = useProgramOptions();
    const targetMode = useWatch({
        control,
        name: 'target_mode',
        defaultValue: 'INCLUDE'
    });

    function handleAddQuestion() {
        append(DEFAULT_QUESTION);
        revealThrough(fields.length);
        requestAnimationFrame(function() {
            sentinelRef.current?.scrollIntoView({ block: 'nearest' });
        });
    }

    async function handleNext() {
        if (currentStep === 1) {
            const isValid = await trigger(['title', 'sequence']);
            if (!isValid) return;
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
            const isValid = await trigger(['title', 'sequence']);
            if (!isValid) return;
        }
        setCurrentStep(stepNumber);
    }

    function handleCloseModal() {
        if (!readOnly && methods.formState.isDirty) {
            setIsConfirmCloseOpen(true);
        } else {
            setCurrentStep(1);
            onClose();
        }
    }

    const templateFields: FormFieldConfig<EvaluationTemplateForm>[] = [
        {
            name: 'title',
            label: 'Section Title',
            disabled: readOnly,
            rules: readOnly ? undefined : { required: 'Section title is required' },
            type: 'text',
            fieldProps: { helperText: 'Shown as the section heading on the student form.' }
        },
        {
            name: 'sequence',
            label: 'Order',
            disabled: readOnly,
            rules: readOnly
                ? undefined
                : {
                    required: 'Order is required',
                    min: { value: 1, message: 'Order must be at least 1' }
                },
            type: 'number',
            fieldProps: {
                min: 1,
                helperText: 'Lower numbers appear first on the student form.'
            }
        },
        {
            name: 'target_mode',
            label: 'Program Target Mode',
            disabled: readOnly,
            options: TARGET_MODE_OPTIONS,
            type: 'select',
            fieldProps: {
                helperText: targetMode === 'EXCLUDE'
                    ? 'Selected programs will be excluded from this section.'
                    : 'Only selected programs will be included in this section.'
            }
        },
        {
            name: 'program_ids',
            label: 'Programs',
            disabled: readOnly,
            options: programOptions,
            type: 'multi-select',
            fieldProps: {
                placeholder: 'All programs',
                helperText: targetMode === 'EXCLUDE'
                    ? 'Students in selected programs will NOT see this section. (Leave empty for all programs).'
                    : 'Only students in selected programs will see this section. (Leave empty for all programs).'
            }
        },
        {
            name: 'is_active',
            disabled: readOnly,
            type: 'checkbox',
            fieldProps: { label: 'Active (available to students)' }
        },
        {
            name: 'suggestion_placeholder',
            label: 'Student Suggestion Box Placeholder (Optional)',
            disabled: readOnly,
            fullWidth: true,
            gridCols: 2,
            type: 'text',
            fieldProps: {
                placeholder: 'e.g. Share any specific feedback or suggestions to improve this area...',
                helperText: 'If filled, students will see an open-ended suggestion box at the bottom of this section. Leave empty to omit.'
            }
        },
        {
            label: 'Description',
            name: 'description',
            disabled: readOnly,
            fullWidth: true,
            gridCols: 2,
            type: 'text-area'
        }
    ];

    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-4xl p-0 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={handleCloseModal}
        >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                            <ListChecksIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 sm:min-w-[260px]">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {readOnly
                                    ? 'View Evaluation Section'
                                    : templateId
                                    ? 'Edit Evaluation Section'
                                    : 'Create Evaluation Section'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {readOnly
                                    ? 'Viewing evaluation section details, program scope, and questions.'
                                    : 'Define a section, its program scope, and its questions.'}
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
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Close"
                            aria-label="Close"
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
                steps={EVALUATION_WIZARD_STEPS}
                onStepClick={handleStepClick}
            />

            {/* Stepper Step Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-zinc-900/40">
                {currentStep === 1 && (
                    <div className="flex flex-col gap-4">
                        <CommonForm
                            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                            control={control}
                            fields={templateFields}
                            hasHelper
                        />
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 shrink-0 shadow-xs">
                            <div className="flex items-center gap-2.5">
                                <ListChecksIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                        Evaluation Questions ({fields.length})
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Manage the questions that students will evaluate for this section.
                                    </p>
                                </div>
                            </div>

                            {!readOnly && (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    startIcon={<PlusCircleIcon weight="bold" />}
                                    variant="contained"
                                    onClick={handleAddQuestion}
                                >
                                    Add Question
                                </CommonButton>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            {fields.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-700/80 rounded-xl flex flex-col items-center justify-center gap-2 bg-white dark:bg-zinc-800/50">
                                    <InfoIcon className="w-8 h-8 text-slate-400" />
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                        No Questions Added Yet
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Click "+ Add Question" above to add the first evaluation item.
                                    </p>
                                </div>
                            ) : (
                                fields.slice(0, visibleCount).map((fieldItem, idx) => (
                                    <EvaluationQuestionItem
                                        control={control}
                                        disabled={readOnly}
                                        index={idx}
                                        key={fieldItem.id}
                                        total={fields.length}
                                        onMove={(fromIdx, toIdx) => move(fromIdx, toIdx)}
                                        onRemove={(removeIdx) => {
                                            const qText = methods.getValues(`questions.${removeIdx}.question_text` as const);
                                            setDeleteQuestionTarget({
                                                index: removeIdx,
                                                text: qText ? `"${qText.length > 50 ? qText.slice(0, 50) + '...' : qText}"` : `Question #${removeIdx + 1}`
                                            });
                                        }}
                                    />
                                ))
                            )}

                            <div className="py-1 text-center text-xs text-slate-500" ref={sentinelRef}>
                                {hasMore ? 'Loading more questions...' : ''}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                <CommonButton
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={handleCloseModal}
                >
                    {readOnly ? 'Close' : 'Cancel'}
                </CommonButton>

                <div className="flex items-center gap-2">
                    {currentStep > 1 && (
                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                            variant="outlined"
                            onClick={handleBack}
                        >
                            Back
                        </CommonButton>
                    )}

                    {currentStep < 2 ? (
                        <CommonButton
                            color="primary"
                            endIcon={<ArrowRightIcon className="w-4 h-4" />}
                            size="small"
                            variant="contained"
                            onClick={handleNext}
                        >
                            Next: Evaluation Questions
                        </CommonButton>
                    ) : (
                        !readOnly && (
                            <CommonButton
                                color="primary"
                                loading={isSaving}
                                size="small"
                                startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                variant="contained"
                                onClick={handleSubmit(onSubmit)}
                            >
                                {templateId ? 'Save Evaluation Section' : 'Create Evaluation Section'}
                            </CommonButton>
                        )
                    )}
                </div>
            </div>

            {/* Delete Question Prompt */}
            <DeletePromptModal
                isOpen={Boolean(deleteQuestionTarget)}
                mainContent={{
                    title: 'Delete Evaluation Question?'
                }}
                subContent={{
                    title: `Are you sure you want to delete ${deleteQuestionTarget?.text || 'this question'}? This action cannot be undone.`
                }}
                open={Boolean(deleteQuestionTarget)}
                onClose={() => setDeleteQuestionTarget(null)}
                formButtonsProps={{
                    confirmProps: {
                        onClick: () => {
                            if (deleteQuestionTarget !== null) {
                                remove(deleteQuestionTarget.index);
                                setDeleteQuestionTarget(null);
                            }
                        }
                    }
                }}
            />

            {/* Unsaved Changes Confirmation Modal */}
            <CommonPromptModal
                open={isConfirmCloseOpen}
                mainContent={{ title: 'Discard unsaved changes?' }}
                subContent={{ title: 'You have unsaved changes in this evaluation section. Are you sure you want to discard your changes and close?' }}
                actionIconProps={{
                    icon: WarningIcon,
                    iconContainerClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                }}
                formButtonsProps={{
                    cancelProps: {
                        children: 'Keep Editing',
                        onClick: () => setIsConfirmCloseOpen(false)
                    },
                    confirmProps: {
                        children: 'Discard Changes',
                        color: 'error',
                        onClick: () => {
                            setIsConfirmCloseOpen(false);
                            setCurrentStep(1);
                            onClose();
                        }
                    }
                }}
                onClose={() => setIsConfirmCloseOpen(false)}
            />
        </CommonModal>
    );
}
