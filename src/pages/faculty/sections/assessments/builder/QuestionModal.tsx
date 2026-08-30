import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import { CHOICE_BASED_TYPES } from '@constants/faculty.constant';
import ChoiceBuilder from '@pages/faculty/sections/assessments/builder/ChoiceBuilder';
import { AssessmentQuestion, QuestionFormValues, QuestionType } from '@type/assessment.type';
import { formErrors } from '@utils/form.util';
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
    isDirty: boolean;
    isOpen: boolean;
    methods: UseFormReturn<QuestionFormValues>;
    watchedChoices: QuestionFormValues['choices'];
    watchedQuestionType: QuestionType;
    onClose: () => void;
    onSubmit: (values: QuestionFormValues) => Promise<void>;
}

export default function QuestionModal({
    editingQuestion,
    isDirty,
    isOpen,
    methods,
    watchedChoices,
    watchedQuestionType,
    onClose,
    onSubmit
}: QuestionModalProps) {
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

    function handleTextChange(index: number, text: string) {
        const current = methods.getValues('choices');
        const updated = current.map((c, i) => i === index
            ? { ...c, choice_text: text }
            : c);
        methods.setValue('choices', updated, { shouldDirty: true });
    }

    const baseFields: FormFieldConfig<QuestionFormValues>[] = [
        {
            name: 'question_type',
            options: QUESTION_TYPE_OPTIONS,
            rules: { required: 'Required' },
            type: 'select'
        },
        {
            name: 'points',
            rules: {
                required: 'Required',
                min: { value: 0.01, message: 'Must be greater than 0' }
            },
            type: 'number'
        },
        {
            name: 'question_text',
            rules: { required: 'Required' },
            type: 'text-area'
        },
        {
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
                { name: 'allowed_file_types' as const, type: 'text' as const },
                { name: 'max_file_size_mb' as const, type: 'number' as const },
                { name: 'max_file_count' as const, type: 'number' as const }
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
                }
            }}
            open={isOpen}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4 max-w-full sm:w-200 w-full">
                <CommonForm
                    containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                    control={methods.control}
                    fields={baseFields}
                    formProps={{
                        id: QUESTION_FORM_ID,
                        onSubmit: methods.handleSubmit(onSubmit, handleError)
                    }}
                />
                {CHOICE_BASED_TYPES.includes(watchedQuestionType) && (
                    <ChoiceBuilder
                        choices={watchedChoices}
                        questionType={watchedQuestionType}
                        onAddChoice={addChoice}
                        onRemoveChoice={removeChoice}
                        onTextChange={handleTextChange}
                        onToggleCorrect={toggleCorrect}
                    />
                )}
                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={editingQuestion !== null && !isDirty}
                        form={QUESTION_FORM_ID}
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
        </CommonModal>
    );
}