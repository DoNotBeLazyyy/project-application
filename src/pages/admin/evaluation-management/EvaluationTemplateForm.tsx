import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import ValidCommonTextarea from '@components/textarea/ValidCommonTextArea';
import { QUESTIONS_SCROLL_STEP } from '@constants/evaluation.constant';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import {
    ArrowDownIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    InfoIcon,
    ListChecksIcon,
    PlusCircleIcon,
    SlidersIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { ComponentPropsForm } from '@type/common.type';
import { EvaluationQuestionForm, EvaluationTemplateForm } from '@type/evaluation.type';
import { TabItemData } from '@type/tab-menu.type';
import { SyntheticEvent, useState } from 'react';
import { Control, FieldValues, useFieldArray, useWatch } from 'react-hook-form';

const TARGET_MODE_OPTIONS = [
    { label: 'Include selected programs only', value: 'INCLUDE' },
    { label: 'Exclude selected programs (show to all others)', value: 'EXCLUDE' }
];

const DEFAULT_QUESTION: EvaluationQuestionForm = {
    question_text: '',
    is_required: true
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
        <div className="border border-(--mui-palette-divider) rounded-xl p-3.5 sm:p-4 bg-white dark:bg-zinc-800/80 shadow-xs flex flex-col gap-3 transition-shadow hover:shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--mui-palette-divider) pb-2.5">
                <div className="flex items-center gap-2">
                    <span className="size-6 rounded-md bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                        #{index + 1}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm text-(--mui-palette-text-primary)">
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
                        <div className="flex items-center gap-1 border-l border-(--mui-palette-divider) pl-2 ml-1">
                            <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                disabled={index === 0}
                                title="Move up"
                                type="button"
                                onClick={() => onMove(index, index - 1)}
                            >
                                <ArrowUpIcon className="size-4" weight="bold" />
                            </button>
                            <button
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                disabled={index === total - 1}
                                title="Move down"
                                type="button"
                                onClick={() => onMove(index, index + 1)}
                            >
                                <ArrowDownIcon className="size-4" weight="bold" />
                            </button>
                            <button
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-1"
                                title="Remove question"
                                type="button"
                                onClick={() => onRemove(index)}
                            >
                                <TrashIcon className="size-4" weight="bold" />
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

export interface EvaluationTemplateFormProps extends ComponentPropsForm {
    control: Control<EvaluationTemplateForm>;
    disabled?: boolean;
}

export default function EvaluationTemplateFormPanel({
    control,
    disabled = false,
    ...formProps
}: EvaluationTemplateFormProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'questions'>('info');

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

    const tabs: TabItemData[] = [
        {
            label: '1. Section Details & Scope',
            value: 'info',
            icon: <SlidersIcon className="size-4" />
        },
        {
            label: `2. Evaluation Questions (${fields.length})`,
            value: 'questions',
            icon: <ListChecksIcon className="size-4" />
        }
    ];

    return (
        <div className="flex flex-col gap-5 w-full">
            {/* Stepper Tabs */}
            <div className="border-b border-(--mui-palette-divider) pb-1">
                <CommonTabMenu
                    menuStyle="outline"
                    tabs={tabs}
                    value={activeTab}
                    onChange={(_: SyntheticEvent, val: unknown) => setActiveTab(val as 'info' | 'questions')}
                />
            </div>

            {/* Tab 1: Section Details & Scope */}
            {activeTab === 'info' && (
                <div className="flex flex-col gap-4">
                    <CommonForm
                        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                        control={control}
                        fields={templateFields}
                        formProps={formProps}
                        hasHelper
                    />
                    <div className="flex justify-end pt-2">
                        <CommonButton
                            color="primary"
                            endIcon={<ArrowRightIcon weight="bold" />}
                            size="small"
                            variant="outlined"
                            onClick={() => setActiveTab('questions')}
                        >
                            Next: Evaluation Questions ({fields.length})
                        </CommonButton>
                    </div>
                </div>
            )}

            {/* Tab 2: Evaluation Questions (Sticky Header + Scrollable List) */}
            {activeTab === 'questions' && (
                <div className="flex flex-col gap-4">
                    {/* Fixed / Sticky Header (Does NOT scroll) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/80 dark:bg-zinc-800/60 border border-(--mui-palette-divider) shrink-0 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <ListChecksIcon className="size-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                            <div>
                                <h3 className="font-semibold text-sm text-(--mui-palette-text-primary)">
                                    Evaluation Questions ({fields.length})
                                </h3>
                                <p className="text-xs text-(--mui-palette-text-secondary)">
                                    Manage the questions that students will evaluate for this section.
                                </p>
                            </div>
                        </div>

                        {!disabled && (
                            <CommonButton
                                color="primary"
                                size="small"
                                startIcon={<PlusCircleIcon weight="bold" />}
                                variant="contained"
                                onClick={handleAddRow}
                            >
                                Add Question
                            </CommonButton>
                        )}
                    </div>

                    {/* ONLY Questions List is Scrollable */}
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-320px)] sm:max-h-[520px] pr-1 sm:pr-2">
                        {fields.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-(--mui-palette-divider) rounded-xl flex flex-col items-center justify-center gap-2">
                                <InfoIcon className="size-8 text-slate-400" />
                                <p className="font-semibold text-sm text-(--mui-palette-text-primary)">
                                    No Questions Added Yet
                                </p>
                                <p className="text-xs text-(--mui-palette-text-secondary)">
                                    Click "+ Add Question" above to add the first evaluation item.
                                </p>
                            </div>
                        ) : (
                            fields.slice(0, visibleCount).map((fieldItem, idx) => (
                                <EvaluationQuestionItem
                                    control={control}
                                    disabled={disabled}
                                    index={idx}
                                    key={fieldItem.id}
                                    total={fields.length}
                                    onMove={function(fromIdx, toIdx) {
                                        move(fromIdx, toIdx);
                                    }}
                                    onRemove={function(removeIdx) {
                                        remove(removeIdx);
                                    }}
                                />
                            ))
                        )}

                        <div className="py-1 text-center text-xs text-(--mui-palette-text-secondary)" ref={sentinelRef}>
                            {hasMore ? 'Loading more questions...' : ''}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}