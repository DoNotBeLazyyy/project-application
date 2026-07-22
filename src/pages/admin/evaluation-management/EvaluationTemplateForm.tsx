import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonPagination from '@components/pagination/CommonPagination';
import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { QUESTIONS_PER_PAGE } from '@constants/evaluation.constant';
import { useFormPagination } from '@hooks/useFormPagination';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { ComponentPropsForm } from '@type/common.type';
import { EvaluationQuestionForm, EvaluationTemplateForm } from '@type/evaluation.type';
import { Control, FieldValues, useFieldArray } from 'react-hook-form';

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

function validateUniqueQuestion(value: string, formValues: FieldValues) {
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

const QUESTION_COLUMNS: CommonFormTableColumn<EvaluationQuestionForm, EvaluationTemplateForm>[] = [
    {
        key: 'question_text',
        headerName: 'Question',
        flex: 4,
        fieldConfig: {
            type: 'text',
            rules: {
                required: 'Required',
                validate: validateUniqueQuestion
            }
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

export interface EvaluationTemplateFormProps extends ComponentPropsForm {
    control: Control<EvaluationTemplateForm>;
    disabled?: boolean;
}

export default function EvaluationTemplateFormPanel({
    control,
    disabled = false,
    ...formProps
}: EvaluationTemplateFormProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'questions'
    });
    const { endIndex, goToIndex, pagination, setPagination, startIndex } = useFormPagination(
        fields.length,
        QUESTIONS_PER_PAGE
    );
    const { programOptions } = useProgramOptions();

    const templateFields: FormFieldConfig<EvaluationTemplateForm>[] = [
        {
            name: 'title',
            label: 'Section Title',
            disabled,
            rules: disabled
                ? undefined
                : { required: 'Section title is required' },
            type: 'text',
            fieldProps: { helperText: 'Shown as the section heading on the student form.' }
        },
        {
            name: 'sequence',
            label: 'Order',
            disabled,
            rules: disabled
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
            name: 'program_ids',
            label: 'Programs',
            disabled,
            gridCols: 2,
            options: programOptions,
            type: 'multi-select',
            fieldProps: {
                placeholder: 'All programs',
                helperText: 'Leave empty to show this section to every program.'
            }
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

    return (
        <div className="flex flex-col gap-4">
            <CommonForm
                containerClassName="gap-4 grid grid-cols-2"
                control={control}
                fields={templateFields}
                formProps={formProps}
                hasHelper
            />
            <div className="flex flex-col gap-2 h-80">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Questions
                </span>
                <div className="flex flex-1 min-h-0 w-full">
                    <CommonFormTable<EvaluationQuestionForm, EvaluationTemplateForm>
                        columns={QUESTION_COLUMNS}
                        control={control}
                        disabled={disabled}
                        emptyDataMessage="No questions yet. Click + to add one."
                        fieldArrayName="questions"
                        minRows={1}
                        rows={(fields as (EvaluationQuestionForm & { id: string })[]).slice(startIndex, endIndex)}
                        startIndex={startIndex}
                        tableProps={{ containerClassName: 'min-h-0 h-full' }}
                        totalRows={fields.length}
                        onAddRow={function() {
                            append(DEFAULT_QUESTION);
                            goToIndex(fields.length);
                        }}
                        onRemoveRow={remove}
                    />
                </div>
            </div>
            <CommonPagination
                className="flex h-14 items-center"
                hasPaginationSelect={false}
                pagination={pagination}
                onSetPagination={setPagination}
            />
        </div>
    );
}