import {
    getSignalDescriptor,
    getSignalLabel,
    SPECIAL_GRADE_OPERATOR_LABELS
} from '@constants/special-grade-signals.constant';
import {
    SpecialGradeCondition,
    SpecialGradeConditionGroup,
    SpecialGradeEvidenceItem,
    SpecialGradeOperator
} from '@type/grading-config.type';

const COMPACT_OPERATORS: Partial<Record<SpecialGradeOperator, string>> = {
    '!=': '≠',
    '<': '<',
    '<=': '≤',
    '=': '=',
    '>': '>',
    '>=': '≥'
};

/** Pulls the editable leaves out of a group, ignoring any nested sub-groups. */
export function readConditionLeaves(
    group: SpecialGradeConditionGroup | null | undefined
): SpecialGradeCondition[] {
    if (!group) return [];

    const nodes = 'any' in group
        ? group.any
        : group.all;

    return (nodes ?? []).filter(
        (node): node is SpecialGradeCondition => Boolean(node) && 'signal' in node
    );
}

export function getConditionOperator(group: SpecialGradeConditionGroup | null | undefined): 'all' | 'any' {
    return group && 'any' in group
        ? 'any'
        : 'all';
}

/**
 * Compact one-line rendering of a rule, for cards and list rows:
 * "≥ 20% absence rate + ≥ 1 missing Exams".
 */
export function summarizeConditions(
    group: SpecialGradeConditionGroup | null | undefined
): string {
    const leaves = readConditionLeaves(group);
    if (leaves.length === 0) return '';

    const joiner = getConditionOperator(group) === 'any'
        ? ' or '
        : ' + ';

    return leaves
        .map(function(leaf) {
            const label = getSignalLabel(leaf.signal)
                .toLowerCase();
            const unit = getSignalDescriptor(leaf.signal)?.unit === '%'
                ? '%'
                : '';

            if (leaf.op === 'is_null') return `${label} never recorded`;
            if (leaf.op === 'not_null') return `${label} recorded`;

            if (leaf.op === 'between' && Array.isArray(leaf.value)) {
                return `${label} ${leaf.value[0]}${unit}–${leaf.value[1]}${unit}`;
            }

            const symbol = COMPACT_OPERATORS[leaf.op] ?? leaf.op;
            return `${symbol} ${leaf.value ?? 0}${unit} ${label}`;
        })
        .join(joiner);
}

/**
 * Renders one evaluated leaf of a flag as a sentence a person can check:
 * "Absence rate 24 (is at least 20)".
 */
export function describeEvidenceItem(item: SpecialGradeEvidenceItem): string {
    const label = getSignalLabel(item.signal);
    const operator = SPECIAL_GRADE_OPERATOR_LABELS[item.op] ?? item.op;

    if (item.op === 'is_null' || item.op === 'not_null') {
        return `${label} ${operator}`;
    }

    const threshold = Array.isArray(item.value)
        ? `${item.value[0]}–${item.value[1]}`
        : item.value ?? '';
    const actual = item.actual ?? '—';

    return `${label} ${actual} (${operator} ${threshold})`;
}

/** Joins a flag's evidence into the one-line "why" shown beside a student. */
export function describeEvidence(items: SpecialGradeEvidenceItem[] | null | undefined): string {
    if (!items || items.length === 0) return 'No evidence recorded.';

    return items.map(describeEvidenceItem)
        .join('; ');
}