import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import ValidCommonDateTimePicker from '@components/datepicker/ValidCommonDateTimepicker';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { AssessmentFormValues, AssessmentType } from '@type/assessment.type';
import { isPastDateTime } from '@utils/date.util';
import { formErrors } from '@utils/form.util';
import { useEffect } from 'react';
import { FieldErrors, UseFormReturn } from 'react-hook-form';

const SETTINGS_FORM_ID = 'assessment-settings-form';

const ASSESSMENT_TYPE_OPTIONS: { label: string; value: AssessmentType }[] = [
    { label: 'Quiz', value: 'Quiz' },
    { label: 'Exam', value: 'Exam' },
    { label: 'Activity', value: 'Activity' },
    { label: 'Assignment', value: 'Assignment' },
    { label: 'Project', value: 'Project' },
    { label: 'Lab Report', value: 'Lab Report' }
];

interface AssessmentSettingsFormProps {
    componentOptions: CommonSelectOption[];
    isDirty: boolean;
    isNew: boolean;
    isSaving: boolean;
    methods: UseFormReturn<AssessmentFormValues>;
    onSubmit: (values: AssessmentFormValues) => Promise<void>;
}

export default function AssessmentSettingsForm({
    componentOptions,
    isDirty,
    isNew,
    isSaving,
    methods,
    onSubmit
}: AssessmentSettingsFormProps) {
    const showAllQuestions = methods.watch('show_all_questions');
    const allowPastDates = methods.watch('allow_past_dates');

    useEffect(function() {
        const dateFields = ['due_at', 'closes_at', 'show_results_at'] as const;
        const hasDateError = dateFields.some((field) => !!methods.formState.errors[field]);

        if (hasDateError) {
            methods.trigger(dateFields);
        }
    }, [allowPastDates]);

    function handleError(errors: FieldErrors<AssessmentFormValues>) {
        formErrors(errors, methods);
    }

    function validateNotPast(label: string) {
        return function(value: string | boolean) {
            if (allowPastDates || typeof value !== 'string' || !isPastDateTime(value)) return true;

            return `${label} is in the past. Tick "Allow past dates" if this is intentional.`;
        };
    }

    const baseFields: FormFieldConfig<AssessmentFormValues>[] = [
        {
            name: 'title',
            rules: { required: 'Required' },
            type: 'text',
            gridCols: 2
        },
        {
            name: 'assessment_type',
            options: ASSESSMENT_TYPE_OPTIONS,
            rules: { required: 'Required' },
            type: 'select',
            gridCols: 2
        },
        {
            name: 'description',
            type: 'text-area',
            gridCols: 2
        },
        {
            name: 'grading_component_id',
            options: componentOptions,
            type: 'select',
            gridCols: 2
        },
        {
            name: 'total_points',
            rules: { required: 'Required', min: { value: 1, message: 'Must be at least 1' } },
            type: 'number',
            gridCols: 2
        },
        {
            name: 'passing_points',
            type: 'number',
            gridCols: 2
        },
        {
            name: 'time_limit_minutes',
            type: 'number',
            gridCols: 2
        },
        {
            name: 'max_attempts',
            type: 'number',
            gridCols: 2
        },
        {
            name: 'shuffle_questions',
            type: 'checkbox',
            fieldProps: { label: 'Shuffle Questions' },
            gridCols: 2
        },
        {
            name: 'shuffle_choices',
            type: 'checkbox',
            fieldProps: { label: 'Shuffle Choices' },
            gridCols: 2
        },
        {
            name: 'show_all_questions',
            type: 'checkbox',
            fieldProps: { label: 'Show all questions at once' },
            gridCols: 2
        },
        ...(!showAllQuestions
            ? [{
                name: 'questions_per_page' as const,
                rules: {
                    required: 'Required when not showing all questions',
                    min: { value: 1, message: 'Must be at least 1' }
                },
                type: 'number' as const,
                gridCols: 2
            }]
            : []
        )
    ];

    return (
        <div className="flex flex-col flex-shrink-0 gap-3 overflow-y-auto w-80">
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                Settings
            </span>
            <CommonForm
                containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                control={methods.control}
                fields={baseFields}
                formProps={{
                    id: SETTINGS_FORM_ID,
                    onSubmit: methods.handleSubmit(onSubmit, handleError)
                }}
            />
            <div className="flex flex-col gap-4">
                <ValidCommonDateTimePicker
                    control={methods.control}
                    hasHelper
                    helperText="When the assessment auto-publishes to students. A past time publishes it immediately. Leave blank to publish manually."
                    label="Scheduled Publish"
                    name="scheduled_publish_at"
                />
                <ValidCommonDateTimePicker
                    control={methods.control}
                    hasHelper
                    helperText="When students can start the assessment."
                    label="Opens At"
                    name="opens_at"
                />
                <ValidCommonDateTimePicker
                    control={methods.control}
                    disablePast={!allowPastDates}
                    hasHelper
                    helperText="Submission deadline; attempts after this are marked late."
                    label="Due At"
                    name="due_at"
                    rules={{ validate: validateNotPast('Due date') }}
                />
                <ValidCommonDateTimePicker
                    control={methods.control}
                    disablePast={!allowPastDates}
                    hasHelper
                    helperText="Hard cutoff; no submissions accepted after this time."
                    label="Closes At"
                    name="closes_at"
                    rules={{ validate: validateNotPast('Closing date') }}
                />
                <ValidCommonDateTimePicker
                    control={methods.control}
                    disablePast={!allowPastDates}
                    hasHelper
                    helperText="When students can view their scores and correct answers. Leave blank to release manually."
                    label="Show Results At"
                    name="show_results_at"
                    rules={{ validate: validateNotPast('Results release date') }}
                />
                <ValidCommonCheckbox
                    control={methods.control}
                    label="Allow past dates for due, closing and results"
                    name="allow_past_dates"
                />
                <p className="-mt-3 text-(--mui-palette-text-secondary) text-xs">
                    Off by default: due, closing and results dates must be in the future. Tick this to backdate an assessment that already happened.
                </p>
            </div>
            <CommonButton
                disabled={isSaving || (!isNew && !isDirty)}
                form={SETTINGS_FORM_ID}
                size="small"
                type="submit"
                variant="contained"
            >
                {isSaving
                    ? 'Saving...'
                    : isNew
                        ? 'Create Assessment'
                        : 'Save Settings'}
            </CommonButton>
        </div>
    );
}