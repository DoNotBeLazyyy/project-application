import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import ValidCommonNumberInput from '@components/input/ValidCommonNumberInput';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import { useFormDraft } from '@hooks/useFormDraft';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
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
    TrashIcon,
    WarningIcon,
    XIcon
} from '@phosphor-icons/react';
import { EvaluationQuestionForm, EvaluationTemplateForm } from '@type/evaluation.type';
import { announceFormError, formErrors, validateStepFields } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import {
    Control, FieldErrors, FieldPath, FieldValues, useFieldArray, UseFormReturn, useWatch
} from 'react-hook-form';

export const EVALUATION_WIZARD_STEPS: ModalStepItem[] = [
    {
        step: 1,
        title: 'Section Details & Scope',
        subtitle: 'Define section title, section sequence, program target mode, and section description.'
    },
    {
        step: 2,
        title: 'Evaluation Questions',
        subtitle: 'Manage rating prompts and required question items.'
    }
];

const TARGET_MODE_OPTIONS = [
    { label: 'All programs (show to all students)', value: 'ALL' },
    { label: 'Include selected programs only', value: 'INCLUDE' },
    { label: 'Exclude selected programs (show to all others)', value: 'EXCLUDE' }
];

// Mirrors the `evaluation_question_type` enum. Only Rating questions carry a scale.
const QUESTION_TYPE_OPTIONS = [
    { label: 'Rating', value: 'Rating' },
    { label: 'Multiple Choice', value: 'Multiple Choice' },
    { label: 'Open Ended', value: 'Open Ended' }
];

// `evaluation_templates.sequence` is a smallint.
const SEQUENCE_MAX = 32767;

// fn_validate_evaluation_questions: min rating >= 1, max rating <= 10, min below max.
const RATING_FLOOR = 1;
const RATING_CEILING = 10;

const STEP_ONE_FIELDS: FieldPath<EvaluationTemplateForm>[] = [
    'title',
    'sequence',
    'target_mode',
    'program_ids',
    'is_active',
    'suggestion_placeholder',
    'description'
];

const DEFAULT_QUESTION: EvaluationQuestionForm = {
    question_text: '',
    question_type: 'Rating',
    is_required: true,
    min_rating: '1',
    max_rating: '5'
};

function parseRating(value: unknown): number | null {
    const text = value === undefined || value === null
        ? ''
        : String(value);

    if (text.trim() === '') {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : null;
}

// Listed in display order so the first invalid question is the one focused; the array root
// (at-least-one rule) goes last.
function getQuestionFieldNames(count: number): FieldPath<EvaluationTemplateForm>[] {
    const names: FieldPath<EvaluationTemplateForm>[] = [];

    for (let index = 0; index < count; index++) {
        names.push(
            `questions.${index}.question_text`,
            `questions.${index}.question_type`,
            `questions.${index}.is_required`,
            `questions.${index}.min_rating`,
            `questions.${index}.max_rating`
        );
    }

    names.push('questions');

    return names;
}

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
    const questionType = useWatch({
        control,
        name: `questions.${index}.question_type` as const,
        defaultValue: 'Rating'
    });
    const isRating = (questionType || 'Rating') === 'Rating';

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
                                validate: (val, formVals) => {
                                    if (!val || !String(val).trim()) {
                                        return 'Question text cannot be empty or whitespace only';
                                    }
                                    return validateUniqueQuestion(val, formVals);
                                }
                            }
                    }
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ValidCommonSelect
                    control={control}
                    disabled={disabled}
                    hasHelper
                    isRequired={!disabled}
                    label="Question Type"
                    name={`questions.${index}.question_type` as const}
                    options={QUESTION_TYPE_OPTIONS}
                    rules={disabled ? undefined : { required: 'Question type is required' }}
                />

                {isRating && (
                    <>
                        <ValidCommonNumberInput
                            control={control}
                            disabled={disabled}
                            hasHelper
                            isRequired={!disabled}
                            label="Min Rating"
                            max={RATING_CEILING - 1}
                            maxDecimals={0}
                            min={RATING_FLOOR}
                            name={`questions.${index}.min_rating` as const}
                            rules={
                                disabled
                                    ? undefined
                                    : {
                                        deps: [`questions.${index}.max_rating`],
                                        required: 'Min rating is required',
                                        min: { value: RATING_FLOOR, message: `Min rating must be at least ${RATING_FLOOR}` },
                                        max: { value: RATING_CEILING - 1, message: `Min rating must be at most ${RATING_CEILING - 1}` },
                                        validate: (val, formVals) => {
                                            const maxRating = parseRating(formVals.questions?.[index]?.max_rating);
                                            return maxRating === null || Number(val) < maxRating || 'Min rating must be below max rating';
                                        }
                                    }
                            }
                        />
                        <ValidCommonNumberInput
                            control={control}
                            disabled={disabled}
                            hasHelper
                            isRequired={!disabled}
                            label="Max Rating"
                            max={RATING_CEILING}
                            maxDecimals={0}
                            min={RATING_FLOOR + 1}
                            name={`questions.${index}.max_rating` as const}
                            rules={
                                disabled
                                    ? undefined
                                    : {
                                        deps: [`questions.${index}.min_rating`],
                                        required: 'Max rating is required',
                                        min: { value: RATING_FLOOR + 1, message: `Max rating must be at least ${RATING_FLOOR + 1}` },
                                        max: { value: RATING_CEILING, message: `Max rating must be at most ${RATING_CEILING}` },
                                        validate: (val, formVals) => {
                                            const minRating = parseRating(formVals.questions?.[index]?.min_rating);
                                            return minRating === null || Number(val) > minRating || 'Max rating must be above min rating';
                                        }
                                    }
                            }
                        />
                    </>
                )}
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
    const { control, handleSubmit } = methods;

    const draftGuard = useFormDraft({
        control,
        enabled: open && !readOnly && !isSaving,
        formId: `evaluation-wizard-${templateId || 'new'}`
    });

    useEffect(() => {
        if (open) {
            setCurrentStep(initialStep);
        }
    }, [open, initialStep]);

    // fn_validate_evaluation_questions rejects an empty question list.
    const { fields, append, move, remove } = useFieldArray({
        control,
        name: 'questions',
        rules: readOnly
            ? undefined
            : {
                validate: (questions) => questions.length > 0 || 'At least one question is required.'
            }
    });
    const questionsRootError = methods.formState.errors.questions?.root?.message;

    const { hasMore, revealThrough, sentinelRef, visibleCount } = useInfiniteScroll(
        fields.length,
        QUESTIONS_SCROLL_STEP
    );

    const { programOptions } = useProgramOptions();
    const targetMode = useWatch({
        control,
        name: 'target_mode',
        defaultValue: 'ALL'
    });

    useEffect(() => {
        if (targetMode === 'ALL') {
            const current = methods.getValues('program_ids');
            if (current && current.length > 0) {
                methods.setValue('program_ids', []);
            }
            methods.clearErrors('program_ids');
        }
    }, [targetMode, methods]);

    function handleAddQuestion() {
        if (questionsRootError) {
            methods.clearErrors('questions.root' as FieldPath<EvaluationTemplateForm>);
        }
        append(DEFAULT_QUESTION);
        revealThrough(fields.length);
        requestAnimationFrame(function() {
            sentinelRef.current?.scrollIntoView({ block: 'nearest' });
        });
    }

    async function handleNext() {
        if (currentStep === 1) {
            const isValid = await validateStepFields(methods, STEP_ONE_FIELDS);
            if (!isValid) {
                return;
            }
            setCurrentStep(2);
        }
    }

    async function handleSave() {
        // Questions past the infinite-scroll window are not mounted, and React Hook Form
        // skips unmounted fields, so render every question before validating the step.
        if (hasMore) {
            flushSync(function() {
                revealThrough(fields.length - 1);
            });
        }

        const isValid = await validateStepFields(methods, getQuestionFieldNames(fields.length));
        if (!isValid) {
            const rootMessage = methods.formState.errors.questions?.root?.message;
            if (rootMessage) {
                announceFormError({ count: 1, message: rootMessage, firstErrorField: 'questions' });
            }
            return;
        }

        await handleSubmit(onSubmit, handleEvaluationErrors)();
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
            const isValid = await validateStepFields(methods, STEP_ONE_FIELDS);
            if (!isValid) {
                return;
            }
        }
        setCurrentStep(stepNumber);
    }

    function handleEvaluationErrors(errors: FieldErrors<EvaluationTemplateForm>) {
        const hasStepOneError = STEP_ONE_FIELDS.some(function(name) {
            return Boolean(errors[name as keyof EvaluationTemplateForm]);
        });
        if (hasStepOneError) {
            setCurrentStep(1);
        }
        formErrors(errors, methods);
    }

    function handleCloseModal() {
        if (isSaving) return;
        if (!readOnly && draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
        } else {
            draftGuard.clearDraft();
            setCurrentStep(1);
            onClose();
        }
    }

    const templateFields: FormFieldConfig<EvaluationTemplateForm>[] = [
        {
            name: 'title',
            label: 'Section Title',
            disabled: readOnly,
            rules: readOnly
                ? undefined
                : {
                    required: 'Section title is required',
                    validate: (val: any) => Boolean(val && String(val).trim()) || 'Section title cannot be empty or whitespace only'
                },
            type: 'text',
            fieldProps: { helperText: 'Shown as the section heading on the student form.' }
        },
        {
            name: 'sequence',
            label: 'Section Sequence',
            disabled: readOnly,
            rules: readOnly
                ? undefined
                : {
                    required: 'Section sequence is required',
                    min: { value: 1, message: 'Section sequence must be at least 1' },
                    max: { value: SEQUENCE_MAX, message: `Section sequence must be at most ${SEQUENCE_MAX}` },
                    validate: (val: unknown) => Number.isInteger(Number(val)) || 'Section sequence must be a whole number'
                },
            type: 'number',
            fieldProps: {
                max: SEQUENCE_MAX,
                maxDecimals: 0,
                min: 1,
                helperText: 'Lower numbers appear first on the student form.'
            }
        },
        {
            name: 'target_mode',
            label: 'Program Target Mode',
            disabled: readOnly,
            fullWidth: targetMode === 'ALL',
            gridCols: targetMode === 'ALL' ? 2 : 1,
            options: TARGET_MODE_OPTIONS,
            rules: readOnly
                ? undefined
                : { required: 'Program target mode is required' },
            type: 'select',
            fieldProps: {
                helperText: targetMode === 'ALL'
                    ? 'This evaluation section applies institution-wide to students in all programs.'
                    : targetMode === 'EXCLUDE'
                    ? 'Selected programs will be excluded from this section.'
                    : 'Only selected programs will be included in this section.'
            }
        },
        ...(targetMode !== 'ALL' ? [{
            name: 'program_ids' as const,
            label: 'Programs',
            disabled: readOnly,
            options: programOptions,
            // A section with no linked programs applies to every program, so INCLUDE/EXCLUDE
            // without a selection would silently behave like ALL.
            rules: readOnly
                ? undefined
                : {
                    validate: (val: unknown) => (Array.isArray(val) && val.length > 0) || 'Select at least one program'
                },
            type: 'multi-select' as const,
            fieldProps: {
                placeholder: 'Select programs',
                helperText: targetMode === 'EXCLUDE'
                    ? 'Students in selected programs will NOT see this section.'
                    : 'Only students in selected programs will see this section.'
            }
        }] : []),
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
            label: 'Section Description',
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
                        <div className="flex flex-col gap-3">
                            {fields.length === 0 ? (
                                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-700/80 rounded-xl flex flex-col items-center justify-center gap-3 bg-white dark:bg-zinc-800/50">
                                    <InfoIcon className="w-8 h-8 text-slate-400" />
                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                        No Questions Added Yet
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Click &quot;+ Add Question&quot; below to add the first evaluation item.
                                    </p>
                                    {questionsRootError && (
                                        <p className="text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
                                            {questionsRootError}
                                        </p>
                                    )}
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
                            ) : (
                                <>
                                    {fields.slice(0, visibleCount).map((fieldItem, idx) => (
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
                                    ))}

                                    <div className="py-1 text-center text-xs text-slate-500" ref={sentinelRef}>
                                        {hasMore ? 'Loading more questions...' : ''}
                                    </div>

                                    {!readOnly && (
                                        <div className="flex justify-start pt-1">
                                            <CommonButton
                                                color="primary"
                                                size="small"
                                                startIcon={<PlusCircleIcon weight="bold" />}
                                                variant="contained"
                                                onClick={handleAddQuestion}
                                            >
                                                Add Question
                                            </CommonButton>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
                <CommonButton
                    color="primary"
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
                    Step {currentStep} of {EVALUATION_WIZARD_STEPS.length} — {EVALUATION_WIZARD_STEPS[currentStep - 1]?.title}
                </div>

                <div className="flex items-center gap-2">
                    {currentStep < EVALUATION_WIZARD_STEPS.length
                        ? (
                            <CommonButton
                                color="primary"
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
                                    disabled={isSaving || (Boolean(templateId) && !draftGuard.hasRealChanges)}
                                    loading={isSaving}
                                    size="medium"
                                    startIcon={<FloppyDiskIcon className="w-4 h-4" />}
                                    variant="contained"
                                    onClick={handleSave}
                                >
                                    {templateId
                                        ? 'Save Changes'
                                        : 'Save Evaluation Section'}
                                </CommonButton>
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
                            draftGuard.clearDraft();
                            setCurrentStep(1);
                            onClose();
                        }
                    }
                }}
                onClose={() => setIsConfirmCloseOpen(false)}
            />
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
        </CommonModal>
    );
}
