import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonFormTable, { CommonFormTableColumn } from '@components/table/CommonFormTable';
import { QUESTIONS_SCROLL_STEP } from '@constants/evaluation.constant';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { ComponentPropsForm } from '@type/common.type';
import { EvaluationQuestionForm, EvaluationTemplateForm } from '@type/evaluation.type';
import { Control, FieldValues, useFieldArray, useWatch } from 'react-hook-form';

const TARGET_MODE_OPTIONS = [
    { label: 'Include selected programs only', value: 'INCLUDE' },
    { label: 'Exclude selected programs (show to all others)', value: 'EXCLUDE' }
];

const DEFAULT_QUESTION: EvaluationQuestionForm = {
    question_text: '',
    is_required: true
};

export function validateUniqueQuestion(value: string, formValues: FieldValues) {
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

export const QUESTION_COLUMNS: CommonFormTableColumn<EvaluationQuestionForm, EvaluationTemplateForm>[] = [
    {
        key: 'question_text',
        headerName: 'Question',
        flex: 1,
        minWidth: 320,
        fieldConfig: {
            type: 'text',
            fieldProps: {
                multiline: true,
                minRows: 2,
                maxRows: 6,
                placeholder: 'Enter evaluation question...'
            },
            rules: {
                required: 'Required',
                validate: validateUniqueQuestion
            }
        }
    },
    {
        key: 'is_required',
        headerName: 'Required',
        width: 80,
        headerClass: 'text-center flex justify-center',
        cellClass: 'items-center',
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

    function handleAddRow() {
        append(DEFAULT_QUESTION);
        revealThrough(fields.length);
        requestAnimationFrame(function() {
            sentinelRef.current?.scrollIntoView({ block: 'nearest' });
        });
    }

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
            name: 'target_mode',
            label: 'Program Target Mode',
            disabled,
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
            disabled,
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
            disabled,
            type: 'checkbox',
            fieldProps: { label: 'Active (available to students)' }
        },
        {
            name: 'suggestion_placeholder',
            label: 'Student Suggestion Box Placeholder (Optional)',
            disabled,
            fullWidth: true,
            gridCols: 2,
            type: 'text',
            fieldProps: {
                placeholder: 'e.g. Share any specific feedback or suggestions to improve this area...',
                helperText: 'If filled, students will see an open-ended suggestion box at the bottom of this section with this placeholder text. Leave empty to omit the suggestion box.'
            }
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
                containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                control={control}
                fields={templateFields}
                formProps={formProps}
                hasHelper
            />
            <div className="flex flex-col gap-2 min-h-[380px] h-[450px]">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Questions
                    </span>
                    <span className="text-xs text-(--mui-palette-text-secondary) sm:hidden">
                        (Scroll sideways for options →)
                    </span>
                </div>
                <div className="flex flex-1 min-h-0 w-full">
                    <CommonFormTable<EvaluationQuestionForm, EvaluationTemplateForm>
                        columns={QUESTION_COLUMNS}
                        contentClassName="min-w-[560px] sm:min-w-full"
                        control={control}
                        disabled={disabled}
                        emptyDataMessage="No questions yet. Click + to add one."
                        fieldArrayName="questions"
                        listFooter={
                            <div
                                className="flex items-center justify-center py-2 text-(--mui-palette-text-secondary) text-xs"
                                ref={sentinelRef}
                            >
                                {hasMore
                                    ? 'Loading more questions...'
                                    : ''}
                            </div>
                        }
                        minRows={1}
                        rows={(fields as (EvaluationQuestionForm & { id: string })[]).slice(0, visibleCount)}
                        showRowNumber
                        tableProps={{ containerClassName: 'min-h-0 h-full' }}
                        totalRows={fields.length}
                        onAddRow={handleAddRow}
                        onMoveRow={function(fromIndex, toIndex) {
                            move(fromIndex, toIndex);
                        }}
                        onRemoveRow={remove}
                    />
                </div>
            </div>
        </div>
    );
}