import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { CHOICE_BASED_TYPES } from '@constants/faculty.constant';
import { useFormDraft } from '@hooks/use-form-draft';
import ChoiceBuilder from '@pages/faculty/sections/assessments/builder/ChoiceBuilder';
import { AssessmentQuestion, QuestionFormValues, QuestionType } from '@type/assessment.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, UseFormReturn } from 'react-hook-form';

const QUESTION_FORM_ID = 'question-form';

const QUESTION_TYPE_OPTIONS: { label: string; value: QuestionType }[] = [
    { label: 'Multiple Choice', value: 'Multiple Choice' },
    { label: 'True or False', value: 'True or False' },
    { label: 'Short Answer', value: 'Short Answer' },
    { label: 'Essay', value: 'Essay' },
    { label: 'Fill in the Blank', value: 'Fill in the Blank' },
    { label: 'Matching', value: 'Matching' },
    { label: 'File Upload', value: 'File Upload' }
];

interface QuestionModalProps {
    editingQuestion: AssessmentQuestion | null;
    isOpen: boolean;
    methods: UseFormReturn<QuestionFormValues>;
    watchedChoices: QuestionFormValues['choices'];
    watchedQuestionType: QuestionType;
    onClose: VoidFunction;
    onSubmit: (values: QuestionFormValues) => Promise<void>;
}

export default function QuestionModal({
    editingQuestion,
    isOpen,
    methods,
    watchedChoices,
    watchedQuestionType,
    onClose,
    onSubmit
}: QuestionModalProps) {
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

    const draftGuard = useFormDraft({
        control: methods.control,
        enabled: isOpen,
        formId: `${QUESTION_FORM_ID}-${editingQuestion?.id || 'new'}`
    });

    useEffect(() => {
        if (!isOpen) {
            setIsConfirmCloseOpen(false);
        }
    }, [isOpen]);

    function handleCloseModal() {
        if (methods.formState.isSubmitting) return;
        if (draftGuard.hasRealChanges) {
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

    // fn_upsert_question stores choices as given, so a choice-based question must carry
    // at least one correct choice or it can never be auto-graded.
    function validateChoices(values: QuestionFormValues): string | null {
        if (!CHOICE_BASED_TYPES.includes(values.question_type)) return null;
        if (values.choices.length < 2) return 'Add at least two choices.';
        if (!values.choices.some((c) => c.is_correct)) return 'Mark at least one choice as correct.';
        return null;
    }

    async function handleFormSubmit(values: QuestionFormValues) {
        const choiceError = validateChoices(values);
        if (choiceError) {
            methods.setError('choices', { message: choiceError, type: 'validate' });
            return;
        }
        draftGuard.clearDraft();
        await onSubmit(values);
    }

    function handleError(errors: FieldErrors<QuestionFormValues>) {
        formErrors(errors, methods);
    }

    function addChoice() {
        const current = methods.getValues('choices');
        methods.setValue('choices', [...current, { choice_text: '', is_correct: false }], { shouldDirty: true });
    }

    function removeChoice(index: number) {
        const current = methods.getValues('choices');
        methods.setValue('choices', current.filter((_, i) => i !== index), { shouldDirty: true });
    }

    function toggleCorrect(index: number) {
        methods.clearErrors('choices');
        const current = methods.getValues('choices');
        const isMultiple = watchedQuestionType === 'Multiple Choice';
        const updated = current.map((c, i) => ({
            ...c,
            is_correct: isMultiple
                ? i === index
                    ? !c.is_correct
                    : c.is_correct
                : i === index
        }));
        methods.setValue('choices', updated, { shouldDirty: true });
    }

    // assessment_questions CHECKs: max_file_size_mb > 0 (integer), max_file_count > 0 (smallint)
    function validatePositiveWhole(label: string, max: number) {
        return function(value: unknown) {
            if (value === '' || value === null || value === undefined) return true;
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed < 1) return `${label} must be a whole number of at least 1.`;
            return parsed <= max || `${label} must be ${max} or less.`;
        };
    }

    const baseFields: FormFieldConfig<QuestionFormValues>[] = [
        {
            label: 'Question Type',
            name: 'question_type',
            options: QUESTION_TYPE_OPTIONS,
            rules: { required: 'Required' },
            type: 'select'
        },
        {
            label: 'Points',
            name: 'points',
            rules: {
                required: 'Required',
                min: { value: 0.01, message: 'Must be greater than 0' }
            },
            type: 'number'
        },
        {
            label: 'Question Text',
            name: 'question_text',
            rules: { required: 'Required' },
            type: 'text-area'
        },
        {
            label: 'Explanation',
            name: 'explanation',
            type: 'text-area'
        },
        {
            name: 'is_required',
            type: 'checkbox',
            fieldProps: { label: 'Required question' }
        },
        ...(watchedQuestionType === 'File Upload'
            ? [
                {
                    fieldProps: { helperText: 'Comma-separated extensions, e.g. pdf, docx, png. Leave blank to allow any type.' },
                    label: 'Allowed File Types',
                    name: 'allowed_file_types' as const,
                    placeholder: 'pdf, docx',
                    type: 'text' as const
                },
                {
                    label: 'Max File Size (MB)',
                    name: 'max_file_size_mb' as const,
                    rules: { validate: validatePositiveWhole('Max file size', 2147483647) },
                    type: 'number' as const
                },
                {
                    label: 'Max File Count',
                    name: 'max_file_count' as const,
                    rules: { validate: validatePositiveWhole('Max file count', 32767) },
                    type: 'number' as const
                }
            ]
            : [])
    ];

    return (
        <CommonModal
            cardProps={{
                cardHeaderProps: {
                    subheader: editingQuestion
                        ? 'Edit this question.'
                        : 'Add a new question to this assessment.',
                    title: editingQuestion
                        ? 'Edit Question'
                        : 'Add Question'
                },
                defaultActionProps: {
                    onClick: handleCloseModal
                }
            }}
            open={isOpen}
            onClose={handleCloseModal}
        >
            <div className="flex flex-col gap-4 max-w-full sm:w-200 w-full">
                <CommonForm
                    containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                    control={methods.control}
                    enableDraftRecovery={false}
                    fields={baseFields}
                    formProps={{
                        id: QUESTION_FORM_ID,
                        onSubmit: methods.handleSubmit(handleFormSubmit, handleError)
                    }}
                />
                {CHOICE_BASED_TYPES.includes(watchedQuestionType) && (
                    <ChoiceBuilder
                        choices={watchedChoices}
                        control={methods.control}
                        errorMessage={(methods.formState.errors.choices as { message?: string } | undefined)?.message}
                        questionType={watchedQuestionType}
                        onAddChoice={addChoice}
                        onRemoveChoice={removeChoice}
                        onToggleCorrect={toggleCorrect}
                    />
                )}
                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        disabled={methods.formState.isSubmitting}
                        size="small"
                        variant="outlined"
                        onClick={handleCloseModal}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={(editingQuestion !== null && !draftGuard.hasRealChanges) || methods.formState.isSubmitting}
                        form={QUESTION_FORM_ID}
                        loading={methods.formState.isSubmitting}
                        size="small"
                        type="submit"
                        variant="contained"
                    >
                        {editingQuestion
                            ? 'Save Question'
                            : 'Add Question'}
                    </CommonButton>
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