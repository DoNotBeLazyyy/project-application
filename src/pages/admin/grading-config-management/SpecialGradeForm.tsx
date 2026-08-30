import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import ConditionBuilder from '@pages/admin/grading-config-management/ConditionBuilder';
import RulePreviewPanel from '@pages/admin/grading-config-management/RulePreviewPanel';
import { ComponentPropsForm } from '@type/common.type';
import { SpecialGradeConditionGroup, SpecialGradeFormValues } from '@type/grading-config.type';
import { Control, Controller, useWatch } from 'react-hook-form';

interface SpecialGradeFormProps extends ComponentPropsForm {
    control: Control<SpecialGradeFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
}

/**
 * SpecialGradeForm
 *
 * Splits a special grade into the two things it actually is:
 *
 *   Consequences — what the mark means once a student carries it (does it pass,
 *                  does it owe completion work, how long is the clock).
 *   Conditions   — when the system should propose it, composed from the signal
 *                  registry by ConditionBuilder.
 *
 * The legacy `min_absence_percentage` field is gone from this form: absence is
 * now one signal among many, expressed as a condition. The column still exists
 * for one release but the engine no longer reads it.
 */
export default function SpecialGradeForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: SpecialGradeFormProps) {
    const conditions = useWatch({ control, name: 'conditions' });
    const code = useWatch({ control, name: 'code' });
    const isAutoDetected = useWatch({ control, name: 'is_auto_detected' });

    const fields: FormFieldConfig<SpecialGradeFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Unique grade code, e.g. INC, FDA, DRP' },
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Grade code is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full descriptive title, e.g. Incomplete' },
            name: 'label',
            rules: disabled
                ? undefined
                : { required: 'Grade label is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Explain the policy and conditions for this special grade' },
            name: 'description',
            type: 'text-area'
        },
        {
            disabled,
            fieldProps: {
                helperText: 'Lower number wins when several rules match one student'
            },
            label: 'Priority',
            name: 'priority',
            rules: disabled
                ? undefined
                : {
                    max: { message: 'Max 999', value: 999 },
                    min: { message: 'Min 1', value: 1 }
                },
            type: 'number'
        },
        {
            disabled,
            fieldProps: { helperText: 'Allowed days for the student to fulfill requirements (optional)' },
            name: 'completion_deadline_days',
            type: 'number'
        },
        {
            disabled,
            fieldProps: { label: 'Requires Completion (e.g. Incomplete removal)' },
            name: 'requires_completion',
            type: 'checkbox'
        },
        {
            disabled,
            fieldProps: { label: 'Is Passing Mark (counts towards positive academic standing)' },
            name: 'is_passing',
            type: 'checkbox'
        },
        {
            disabled,
            fieldProps: {
                label: 'Auto-detect (flag students who meet the conditions below)'
            },
            name: 'is_auto_detected',
            type: 'checkbox'
        },
        {
            disabled,
            fieldProps: { label: 'Active Status' },
            name: 'is_active',
            type: 'checkbox'
        }
    ];

    return (
        <div className="flex flex-col gap-5">
            <CommonForm
                control={control}
                fields={fields}
                formProps={formProps}
                hasHelper
            />

            <div className="flex flex-col gap-2">
                <div className="flex flex-col">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                        Conditions
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        The system flags students who meet these. A flag is a proposal — faculty
                        still decide whether to apply the mark.
                    </span>
                </div>

                <Controller
                    control={control}
                    name="conditions"
                    render={({ field }) => (
                        <ConditionBuilder
                            disabled={disabled}
                            value={field.value as SpecialGradeConditionGroup}
                            onChange={field.onChange}
                        />
                    )}
                />

                {isAutoDetected
                    ? (
                        <RulePreviewPanel
                            code={code}
                            conditions={conditions as SpecialGradeConditionGroup}
                        />
                    )
                    : (
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            Auto-detect is off, so these conditions are stored but never evaluated.
                            Turn it on to have the system find matching students.
                        </p>
                    )}
            </div>
        </div>
    );
}