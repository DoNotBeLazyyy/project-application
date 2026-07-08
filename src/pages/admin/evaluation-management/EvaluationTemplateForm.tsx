import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { EvaluationQuestionForm, EvaluationTemplateForm } from '@type/evaluation.type';
import { formErrors } from '@utils/form.util';
import { FieldValues, useFieldArray, UseFormReturn } from 'react-hook-form';

const QUESTION_TYPE_OPTIONS = [
    { label: 'Rating', value: 'Rating' },
    { label: 'Multiple Choice', value: 'Multiple Choice' },
    { label: 'Open Ended', value: 'Open Ended' }
];

const DEFAULT_QUESTION: EvaluationQuestionForm = {
    question_text: '',
    question_type: 'Rating',
    is_required: true,
    min_rating: '1',
    max_rating: '5'
};

const QUESTION_COLUMNS: CommonFormTableColumn<EvaluationQuestionForm, EvaluationTemplateForm>[] = [
    {
        key: 'question_text',
        headerName: 'Question',
        flex: 4,
        fieldConfig: {
            type: 'text',
            rules: { required: 'Required' }
        }
    },
    {
        key: 'question_type',
        headerName: 'Type',
        flex: 2,
        fieldConfig: {
            type: 'select',
            options: QUESTION_TYPE_OPTIONS,
            rules: { required: 'Required' }
        }
    },
    {
        key: 'min_rating',
        headerName: 'Min',
        flex: 1,
        fieldConfig: {
            type: 'number',
            fieldProps: { min: 1, max: 10 }
        }
    },
    {
        key: 'max_rating',
        headerName: 'Max',
        flex: 1,
        fieldConfig: {
            type: 'number',
            fieldProps: { min: 1, max: 10 }
        }
    },
    {
        key: 'is_required',
        headerName: 'Required',
        flex: 1,
        fieldConfig: {
            type: 'checkbox'
        }
    }
];

export interface EvaluationTemplateFormProps {
    disabled?: boolean;
    formId?: string;
    methods: UseFormReturn<EvaluationTemplateForm>;
    onSubmit: (values: EvaluationTemplateForm) => void;
}

export default function EvaluationTemplateFormPanel({
    disabled = false,
    formId,
    methods,
    onSubmit
}: EvaluationTemplateFormProps) {
    const { fields, append, remove } = useFieldArray({
        control: methods.control,
        name: 'questions'
    });

    const templateFields: FormFieldConfig<EvaluationTemplateForm>[] = [
        {
            name: 'title',
            disabled,
            rules: disabled
                ? undefined
                : { required: 'Template title is required' },
            type: 'text'
        },
        {
            name: 'is_active',
            disabled,
            type: 'checkbox',
            fieldProps: { label: 'Active (available to students)' }
        },
        {
            name: 'description',
            disabled,
            fullWidth: true,
            gridCols: 2,
            type: 'text-area'
        }
    ];

    function handleError(errors: FieldValues) {
        formErrors(errors, methods);
    }

    return (
        <div className="flex flex-col gap-4">
            <CommonForm
                containerClassName="gap-4 grid grid-cols-2"
                control={methods.control}
                fields={templateFields}
                formProps={{
                    id: formId,
                    onSubmit: methods.handleSubmit(onSubmit, handleError)
                }}
                hasHelper
            />
            <div className="flex flex-col gap-2 h-80">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Questions
                </span>
                <div className="flex flex-1 min-h-0 w-full">
                    <CommonFormTable<EvaluationQuestionForm, EvaluationTemplateForm>
                        columns={QUESTION_COLUMNS}
                        control={methods.control}
                        disabled={disabled}
                        emptyDataMessage="No questions yet. Click + to add one."
                        fieldArrayName="questions"
                        minRows={1}
                        rows={fields as (EvaluationQuestionForm & { id: string })[]}
                        tableProps={{ containerClassName: 'min-h-0 h-full' }}
                        onAddRow={function() {
                            append(DEFAULT_QUESTION);
                        }}
                        onRemoveRow={remove}
                    />
                </div>
            </div>
        </div>
    );
}