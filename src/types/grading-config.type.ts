export interface TransmutationRow {
    id?: string;
    label?: string;
    is_passing?: boolean;
    is_conditional?: boolean;
    special_code?: string | null;
    min_percentage: string | number | null;
    max_percentage?: string | number | null;
    transmuted_grade: string | number | null;
    description: string;
}

export interface GradingComponentTemplate {
    id?: string;
    name: string;
    weight: string | number;
}

export interface GradingPeriodTemplate {
    id?: string;
    name: string;
    sequence: number;
    weight: string | number;
    components: GradingComponentTemplate[];
}

export type SpecialGradeOperator =
    | '>=' | '>' | '<=' | '<' | '=' | '!=' | 'between' | 'is_null' | 'not_null';

/**
 * One leaf of a rule: a single measurable fact compared against a threshold.
 * `value` is a pair only for the `between` operator, and unused by the two
 * null-checking operators.
 */
export interface SpecialGradeCondition {
    signal: string;
    op: SpecialGradeOperator;
    value?: number | [number, number] | null;
}

/**
 * A rule's condition tree. The grammar is recursive so nested groups can ship
 * later without a data migration, but the builder only authors the flat
 * single-group form today.
 */
export type SpecialGradeConditionNode =
    | { all: SpecialGradeConditionNode[] }
    | { any: SpecialGradeConditionNode[] }
    | { not: SpecialGradeConditionNode }
    | SpecialGradeCondition;

export type SpecialGradeConditionGroup =
    | { all: SpecialGradeConditionNode[] }
    | { any: SpecialGradeConditionNode[] };

/** An entry in the signal registry — what a rule is allowed to test. */
export interface SignalDescriptor {
    id: string;
    group: string;
    unit: string;
    description: string;
    operators: SpecialGradeOperator[];

    /**
     * A signal the SQL registry still computes but the builder no longer offers.
     * Kept so an older rule that uses it can still be read and explained; it is
     * filtered out of the picker so no new rule can be built on one.
     */
    isDeprecated?: boolean;
}

export interface SpecialGradeConfig {
    id?: string;
    code: string;
    label: string;
    description: string;
    min_absence_percentage: string | number | null;
    requires_completion: boolean;
    completion_deadline_days: string | number | null;
    is_passing: boolean;
    is_active: boolean;
    conditions?: SpecialGradeConditionGroup | null;
    priority?: number;
    is_auto_detected?: boolean;
    allows_section_override?: boolean;
    rule_version?: number;
    pending_flag_count?: number;
    section_override_count?: number;
}

export interface SpecialGradeFormValues {
    code: string;
    label: string;
    description: string;
    min_absence_percentage: string;
    requires_completion: boolean;
    completion_deadline_days: string;
    is_passing: boolean;
    is_active: boolean;
    conditions?: SpecialGradeConditionGroup | null;
    priority?: string | number;
    is_auto_detected?: boolean;
    allows_section_override?: boolean;
}

export interface SpecialGradeFilterValues {
    is_active?: string;
    is_passing?: string;
    requires_completion?: string;
    is_auto_detected?: string;
}

/** One evaluated leaf, kept on a flag so a decision can be explained later. */
export interface SpecialGradeEvidenceItem {
    signal: string;
    op: SpecialGradeOperator;
    value: number | [number, number] | null;
    actual: number | null;
    known: boolean;
    matched: boolean;
}

export type SpecialGradeFlagStatus = 'Pending' | 'Applied' | 'Dismissed' | 'Superseded';

export interface SpecialGradeFlag {
    id: string;
    enrollment_id: string;
    grading_period_id: string;
    status: SpecialGradeFlagStatus;
    code: string;
    label: string;
    is_passing: boolean;
    priority: number;
    student_number: string;
    full_name: string;
    evidence: SpecialGradeEvidenceItem[];
    detected_at: string;
    resolved_at: string | null;
    resolution_note: string | null;
}

export interface SpecialGradePreviewMatch {
    enrollment_id: string;
    student_number: string;
    full_name: string;
    section_code: string;
    evidence: SpecialGradeEvidenceItem[];
}

export interface SpecialGradePreviewResult {
    success: boolean;
    message?: string;
    term_id?: string;
    total_students: number;
    matched_count: number;
    sample: SpecialGradePreviewMatch[];
}

/**
 * Draft shapes used by the period composer. New rows have no database id yet,
 * so `key` carries a stable client-side identity for list rendering and for the
 * save diff to tell an unsaved row apart from a persisted one.
 */
export interface GradingComponentDraft extends GradingComponentTemplate {
    key: string;
}

export interface GradingPeriodDraft extends Omit<GradingPeriodTemplate, 'components'> {
    key: string;
    components: GradingComponentDraft[];
}

export interface SpecialGradeDetectionResult {
    success: boolean;
    created: number;
    refreshed: number;
    superseded: number;
}

export interface SpecialGradeFlagResolution {
    success: boolean;
    message: string;
    code?: string;
    grade_id?: string;
}

/**
 * One threshold a section has moved off the institution default.
 *
 * Only the number changes. The signal and the operator stay as the admin wrote
 * them, so a section can say "one missing Activity, not three" but can never
 * invent a condition of its own.
 */
export interface SectionSignalOverride {
    id: string;
    signal: string;
    value: number;
    value_max: number | null;
    note: string | null;
    updated_at: string;
}

/** A rule the admin opened up for section thresholds, plus this section's overrides. */
export interface SectionOverridableRule {
    special_grade_config_id: string;
    code: string;
    label: string;
    description: string | null;
    is_passing: boolean;
    priority: number;
    conditions: SpecialGradeConditionGroup | null;
    overrides: SectionSignalOverride[];
}