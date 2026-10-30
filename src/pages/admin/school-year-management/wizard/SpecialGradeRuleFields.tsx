import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import { SpecialGradeCondition, SpecialGradeConditionGroup } from '@type/grading-config.type';
import { AcademicYearWizardFormValues } from '@type/school-year.type';
import { Control, useController, useWatch } from 'react-hook-form';
import ConditionBuilder from './ConditionBuilder';

const EMPTY_GROUP: SpecialGradeConditionGroup = { all: [] };

interface SpecialGradeRuleFieldsProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    index: number;
}

function isCompleteCondition(condition: SpecialGradeCondition): boolean {
    if (!condition.signal || !condition.op) {
        return false;
    }
    if (condition.op === 'is_null' || condition.op === 'not_null') {
        return true;
    }
    if (condition.op === 'between') {
        return Array.isArray(condition.value)
            && condition.value.every((bound) => bound !== null && bound !== undefined && !Number.isNaN(Number(bound)));
    }
    return condition.value !== null && condition.value !== undefined && !Number.isNaN(Number(condition.value));
}

/**
 * Detection rule for one special-grade row of the grading schema (e.g. DRP when absences
 * reach a limit). The academic year is the only place these rules are edited; saving the
 * year mirrors them into the engine's special_grade_configs for that year.
 */
export default function SpecialGradeRuleFields({
    control,
    disabled = false,
    index
}: SpecialGradeRuleFieldsProps) {
    const isAutoDetected = Boolean(useWatch({ control, name: `transmutation_rows.${index}.is_auto_detected` }));

    const { field, fieldState } = useController({
        control,
        name: `transmutation_rows.${index}.conditions`,
        rules: {
            validate: function(value) {
                if (!isAutoDetected) {
                    return true;
                }
                const group = (value ?? EMPTY_GROUP) as SpecialGradeConditionGroup;
                const nodes = 'any' in group
                    ? group.any
                    : group.all;
                const conditions = (nodes ?? []).filter((node): node is SpecialGradeCondition => 'signal' in node);
                if (conditions.length === 0) {
                    return 'Add at least one condition, or turn off automatic detection';
                }
                if (!conditions.every(isCompleteCondition)) {
                    return 'Every condition needs a signal, an operator and a value';
                }
                return true;
            }
        }
    });

    return (
        <div className="col-span-full flex flex-col gap-3 border-(--mui-palette-divider) border-t pt-3">
            <ValidCommonCheckbox
                control={control}
                disabled={disabled}
                helperText="Flags matching students for faculty review; a flag never changes a grade on its own."
                label="Detect this special grade automatically"
                name={`transmutation_rows.${index}.is_auto_detected`}
            />
            {isAutoDetected && (
                <div className="flex flex-col gap-1">
                    <ConditionBuilder
                        disabled={disabled}
                        value={(field.value as SpecialGradeConditionGroup | null) ?? EMPTY_GROUP}
                        onChange={function(next) {
                            field.onChange(next);
                        }}
                    />
                    {fieldState.error?.message && (
                        <span className="text-(--mui-palette-error-main) text-xs" role="alert">
                            {fieldState.error.message}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
