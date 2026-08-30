import CommonButton from '@components/button/CommonButton';
import CommonNumberInput from '@components/input/CommonNumberInput';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import {
    SPECIAL_GRADE_OPERATOR_LABELS,
    SPECIAL_GRADE_SIGNALS,
    getSignalDescriptor,
    getSignalLabel
} from '@constants/special-grade-signals.constant';
import {
    SpecialGradeCondition,
    SpecialGradeConditionGroup,
    SpecialGradeOperator
} from '@type/grading-config.type';
import { useMemo } from 'react';

export interface ConditionBuilderProps {
    value: SpecialGradeConditionGroup;
    disabled?: boolean;
    onChange: (next: SpecialGradeConditionGroup) => void;
}

const GROUP_OPTIONS: CommonSelectOption[] = [
    { label: 'ALL of the following', value: 'all' },
    { label: 'ANY of the following', value: 'any' }
];

const SIGNAL_OPTIONS: CommonSelectOption[] = SPECIAL_GRADE_SIGNALS.map((signal) => ({
    label: `${signal.group} · ${getSignalLabel(signal.id)}`,
    value: signal.id
}));

/** Reads the single group this builder authors, tolerating either operator. */
function readGroup(value: SpecialGradeConditionGroup): {
    operator: 'all' | 'any';
    conditions: SpecialGradeCondition[];
} {
    const operator = 'any' in value
        ? 'any'
        : 'all';
    const nodes = 'any' in value
        ? value.any
        : value.all;

    // The grammar allows nested groups, but this builder only authors leaves.
    // Anything nested is dropped from the editable list rather than silently
    // rewritten, so a hand-authored tree is never mangled by opening the form.
    const conditions = (nodes ?? []).filter(
        (node): node is SpecialGradeCondition => 'signal' in node
    );

    return { conditions, operator };
}

/**
 * ConditionBuilder
 *
 * Authors the "when does this special grade fire" half of a rule as a flat list
 * of `[signal] [operator] [value]` rows under one group operator.
 *
 * The rows are dropdowns rather than a formula box on purpose: an admin can
 * only ever compose conditions the system already knows how to measure, so a
 * saved rule is data the evaluator walks, never code it executes. Signals come
 * from a single registry shared with the SQL side — see
 * `src/constants/special-grade-signals.constant.ts`.
 *
 * Nested groups are valid in the stored grammar but deliberately not editable
 * here; the flat form covers every policy the institution actually writes.
 */
export default function ConditionBuilder({
    value,
    disabled = false,
    onChange
}: ConditionBuilderProps) {
    const { conditions, operator } = useMemo(() => readGroup(value), [value]);

    function emit(nextOperator: 'all' | 'any', nextConditions: SpecialGradeCondition[]) {
        onChange(nextOperator === 'any'
            ? { any: nextConditions }
            : { all: nextConditions });
    }

    function handleOperatorChange(nextOperator: string) {
        emit(nextOperator === 'any'
            ? 'any'
            : 'all', conditions);
    }

    function handleAdd() {
        const fallback = SPECIAL_GRADE_SIGNALS[0];
        emit(operator, [
            ...conditions,
            { op: '>=', signal: fallback.id, value: 0 }
        ]);
    }

    function handleRemove(index: number) {
        emit(operator, conditions.filter((_, i) => i !== index));
    }

    function handleUpdate(index: number, patch: Partial<SpecialGradeCondition>) {
        emit(operator, conditions.map((condition, i) => i === index
            ? { ...condition, ...patch }
            : condition));
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    Flag a student when
                </span>
                <CommonSelect
                    disabled={disabled}
                    options={GROUP_OPTIONS}
                    size="small"
                    value={operator}
                    variant="outlined"
                    onChange={(event) => handleOperatorChange(event.target.value)}
                />
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    are true:
                </span>
            </div>

            {conditions.length === 0
                ? (
                    <div className="border border-(--mui-palette-divider) border-dashed flex flex-col gap-1 items-center p-4 rounded-lg text-center">
                        <p className="font-medium text-(--mui-palette-text-primary) text-sm">
                            No conditions yet
                        </p>
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            A rule with no conditions never fires on its own. Add one to let the
                            system detect this grade, or leave it empty for a manual-only mark.
                        </p>
                    </div>
                )
                : null}

            <div className="flex flex-col gap-2">
                {conditions.map(function(condition, index) {
                    const descriptor = getSignalDescriptor(condition.signal);
                    const operatorOptions: CommonSelectOption[] = (
                        descriptor?.operators ?? ['>=']
                    ).map((op) => ({
                        label: SPECIAL_GRADE_OPERATOR_LABELS[op],
                        value: op
                    }));
                    const isRangeOperator = condition.op === 'between';
                    const isValueless = condition.op === 'is_null' || condition.op === 'not_null';
                    const range = Array.isArray(condition.value)
                        ? condition.value
                        : [0, 0];

                    return (
                        <div
                            className="bg-(--mui-palette-background-default) border border-(--mui-palette-divider) flex flex-col gap-2 p-3 rounded-lg"
                            key={`${condition.signal}-${index}`}
                        >
                            <div className="flex flex-wrap gap-2 items-start">
                                <div className="flex-1 min-w-45">
                                    <CommonSelect
                                        disabled={disabled}
                                        fullWidth
                                        options={SIGNAL_OPTIONS}
                                        size="small"
                                        value={condition.signal}
                                        variant="outlined"
                                        onChange={(event) => handleUpdate(index, {
                                            signal: event.target.value
                                        })}
                                    />
                                </div>

                                <div className="min-w-35">
                                    <CommonSelect
                                        disabled={disabled}
                                        fullWidth
                                        options={operatorOptions}
                                        size="small"
                                        value={condition.op}
                                        variant="outlined"
                                        onChange={(event) => handleUpdate(index, {
                                            op: event.target.value as SpecialGradeOperator,
                                            value: event.target.value === 'between'
                                                ? [0, 0]
                                                : 0
                                        })}
                                    />
                                </div>

                                {isValueless
                                    ? null
                                    : isRangeOperator
                                        ? (
                                            <div className="flex gap-2 items-center">
                                                <CommonNumberInput
                                                    className="w-28"
                                                    disabled={disabled}
                                                    size="small"
                                                    suffixText={descriptor?.unit}
                                                    value={range[0] ?? 0}
                                                    variant="outlined"
                                                    onChange={(next) => handleUpdate(index, {
                                                        value: [next ?? 0, range[1] ?? 0]
                                                    })}
                                                />
                                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                                    and
                                                </span>
                                                <CommonNumberInput
                                                    className="w-28"
                                                    disabled={disabled}
                                                    size="small"
                                                    suffixText={descriptor?.unit}
                                                    value={range[1] ?? 0}
                                                    variant="outlined"
                                                    onChange={(next) => handleUpdate(index, {
                                                        value: [range[0] ?? 0, next ?? 0]
                                                    })}
                                                />
                                            </div>
                                        )
                                        : (
                                            <CommonNumberInput
                                                className="w-32"
                                                disabled={disabled}
                                                size="small"
                                                suffixText={descriptor?.unit}
                                                value={typeof condition.value === 'number'
                                                    ? condition.value
                                                    : 0}
                                                variant="outlined"
                                                onChange={(next) => handleUpdate(index, {
                                                    value: next ?? 0
                                                })}
                                            />
                                        )}

                                {disabled
                                    ? null
                                    : (
                                        <button
                                            aria-label="Remove condition"
                                            className="cursor-pointer ml-auto p-2 text-(--mui-palette-error-main)"
                                            title="Remove condition"
                                            type="button"
                                            onClick={() => handleRemove(index)}
                                        >
                                            <TrashIcon size={16} weight="bold" />
                                        </button>
                                    )}
                            </div>

                            {descriptor
                                ? (
                                    <p className="text-(--mui-palette-text-secondary) text-xs">
                                        {descriptor.description}
                                    </p>
                                )
                                : (
                                    <p className="text-(--mui-palette-warning-main) text-xs">
                                        This rule references an unknown signal, so it will never
                                        match. Pick a signal from the list.
                                    </p>
                                )}
                        </div>
                    );
                })}
            </div>

            {disabled
                ? null
                : (
                    <div>
                        <CommonButton
                            size="small"
                            startIcon={<PlusIcon size={14} weight="bold" />}
                            variant="outlined"
                            onClick={handleAdd}
                        >
                            Add condition
                        </CommonButton>
                    </div>
                )}

            <p className="text-(--mui-palette-text-secondary) text-xs">
                Attendance signals count the whole term, not a single grading period —
                absences accumulate across the term.
            </p>
        </div>
    );
}