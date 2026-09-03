import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import ValidCommonNumberInput from '@components/input/ValidCommonNumberInput';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
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

const CONDITIONS_HELP = (
    <span className="flex flex-col gap-2">
        <span>
            The system flags students who meet these. A flag is a proposal — faculty still
            decide whether to apply the mark.
        </span>
        <span>
            Attendance conditions count the whole term, not a single grading period —
            absences accumulate across the term.
        </span>
    </span>
);

const CONDITIONS_HELP_INACTIVE = (
    <span className="flex flex-col gap-2">
        {CONDITIONS_HELP}
        <span>
            Auto-detect is off, so these conditions are stored but never evaluated. Turn it
            on to have the system find matching students.
        </span>
    </span>
);

/**
 * SpecialGradeForm
 *
 * Splits a special grade into the three things it actually is:
 *
 *   Identity     — the code, name and description a person reads on a transcript.
 *   Consequences — what the mark means once a student carries it (does it pass,
 *                  does it owe completion work, how long is the clock).
 *   Conditions   — when the system should propose it, composed from the signal
 *                  registry by ConditionBuilder.
 *
 * The consequence checkboxes are written as full sentences about the student
 * rather than as field names. "Is passing mark" is only meaningful to someone
 * who already knows the data model; "the student earns the units" is meaningful
 * to the registrar actually ticking the box.
 *
 * The legacy `min_absence_percentage` field is gone from this form: absence is
 * now one condition among many. The column still exists for one release but the
 * engine no longer reads it.
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
    const requiresCompletion = useWatch({ control, name: 'requires_completion' });

    const identityFields: FormFieldConfig<SpecialGradeFormValues>[] = [
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
            fieldProps: { helperText: 'Explain the policy behind this mark in plain language' },
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
        }
    ];

    return (
        <div className="flex flex-col gap-6">
            <CommonForm
                control={control}
                fields={identityFields}
                formProps={formProps}
                hasHelper
            />

            <div className="flex flex-col gap-3">
                <div className="flex gap-1.5 items-center">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                        What this mark means
                    </span>
                    <CommonInfoTooltip
                        content="These settings decide what happens to a student who carries this mark. They apply the moment the mark is on the record, whether the system proposed it or a person typed it in."
                        label="About these settings"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex gap-1.5 items-center">
                        <ValidCommonCheckbox
                            control={control}
                            disabled={disabled}
                            label="The student still passes the subject with this mark"
                            name="is_passing"
                        />
                        <CommonInfoTooltip
                            content="Tick this if the student earns the units and moves on. Leave it unticked for a failing or non-credit mark such as DRP or FDA."
                            label="About passing marks"
                            size={16}
                        />
                    </div>

                    <div className="flex gap-1.5 items-center">
                        <ValidCommonCheckbox
                            control={control}
                            disabled={disabled}
                            label="The student must finish missing work to clear this mark"
                            name="requires_completion"
                        />
                        <CommonInfoTooltip
                            content="Tick this for a mark the student can clear later by submitting the work they missed, such as INC."
                            label="About completion work"
                            size={16}
                        />
                    </div>

                    <div className="max-w-xs pl-8 pt-1">
                        <ValidCommonNumberInput
                            control={control}
                            disabled={disabled || !requiresCompletion}
                            fullWidth
                            hasClearButton={false}
                            helperText={requiresCompletion
                                ? 'Days the student has to submit the missing work. Leave blank for no deadline.'
                                : 'Available once the mark requires completion work.'}
                            label="Completion deadline (days)"
                            maxDecimals={0}
                            name="completion_deadline_days"
                            size="small"
                            variant="outlined"
                        />
                    </div>

                    <div className="flex gap-1.5 items-center">
                        <ValidCommonCheckbox
                            control={control}
                            disabled={disabled}
                            label="This mark is available for use"
                            name="is_active"
                        />
                        <CommonInfoTooltip
                            content="Untick to retire this mark without deleting it. Existing records keep it; no new one can be given."
                            label="About availability"
                            size={16}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-1.5 items-center">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                        Conditions
                    </span>
                    <CommonInfoTooltip
                        content={isAutoDetected
                            ? CONDITIONS_HELP
                            : CONDITIONS_HELP_INACTIVE}
                        label="How conditions are used"
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex gap-1.5 items-center">
                        <ValidCommonCheckbox
                            control={control}
                            disabled={disabled}
                            label="Auto-detect students who meet these conditions"
                            name="is_auto_detected"
                        />
                        <CommonInfoTooltip
                            content="The system proposes this mark for students who meet the conditions. It never applies one on its own — faculty still decide."
                            label="About auto-detect"
                            size={16}
                        />
                    </div>

                    <div className="flex gap-1.5 items-center">
                        <ValidCommonCheckbox
                            control={control}
                            disabled={disabled || !isAutoDetected}
                            label="Let faculty adjust these numbers for their own section"
                            name="allows_section_override"
                        />
                        <CommonInfoTooltip
                            content={isAutoDetected
                                ? 'Faculty may change the numbers below for their own section only. The conditions themselves stay yours.'
                                : 'Available once auto-detect is on — there is no threshold to override otherwise.'}
                            label="About section overrides"
                            size={16}
                        />
                    </div>
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
                    : null}
            </div>
        </div>
    );
}