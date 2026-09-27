import { GradeSheetRow } from '@type/faculty.type';
import { SpecialGradeConditionNode, SpecialGradeConfig, TransmutationRow } from '@type/grading-config.type';

export const EXPECTED_GRADE_RUNGS: number[] = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00, 5.00];

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface ComputedComponentScore {
    componentId: string;
    name: string;
    weight: number;
    totalEarned: number;
    totalPossible: number;
    weightedScore: number;
}

export interface PeriodicGradeCalculation {
    rawGrade: number;
    transmutedGrade: number | null;
    totalWeightUsed: number;
    componentScores: ComputedComponentScore[];
}

export interface TermFinalGradeCalculation {
    rawFinalGrade: number;
    transmutedFinalGrade: number | null;
    isPassing: boolean;
    periodGrades: {
        periodName: string;
        weight: number;
        rawGrade: number;
        weightedContribution: number;
    }[];
}

/**
 * Validates the 10-rung transmutation table rules according to fn_save_transmutation_table.
 */
export function validateTransmutationRows(rows: TransmutationRow[]): ValidationResult {
    if (!rows || rows.length !== 10) {
        return { isValid: false, error: 'The transmutation table must contain exactly 10 grade rows' };
    }

    const actualGrades = rows
        .map((r) => Number(r.transmuted_grade))
        .sort((a, b) => a - b);

    const expectedSorted = [...EXPECTED_GRADE_RUNGS].sort((a, b) => a - b);
    for (let i = 0; i < 10; i++) {
        if (actualGrades[i] !== expectedSorted[i]) {
            return { isValid: false, error: 'Grade rungs must be exactly 1.00 to 3.00 in 0.25 steps plus 5.00' };
        }
    }

    const sortedRows = [...rows].sort(
        (a, b) => Number(a.transmuted_grade) - Number(b.transmuted_grade)
    );

    let prevFloor: number | null = null;

    for (const row of sortedRows) {
        const grade = Number(row.transmuted_grade);
        const floor = Number(row.min_percentage);

        if (isNaN(floor) || floor < 0 || floor > 100) {
            return { isValid: false, error: 'Each minimum percentage must be between 0 and 100' };
        }

        if (floor !== Math.trunc(floor)) {
            return { isValid: false, error: 'Each minimum percentage must be a whole number' };
        }

        if (grade === 5.00 && floor !== 0) {
            return { isValid: false, error: 'The 5.00 (Failed) floor must be 0' };
        }

        if (prevFloor !== null && floor >= prevFloor) {
            return {
                isValid: false,
                error: 'Each higher grade must have a strictly higher minimum percentage than the grade below it'
            };
        }

        prevFloor = floor;
    }

    return { isValid: true };
}

/**
 * Populates max_percentage for transmutation rows based on floor thresholds.
 */
export function computeTransmutationRanges(rows: TransmutationRow[]): (TransmutationRow & { max_percentage: number })[] {
    const sorted = [...rows].sort(
        (a, b) => Number(a.transmuted_grade) - Number(b.transmuted_grade)
    );

    let prevFloor = 100;
    return sorted.map((row, index) => {
        const floor = Number(row.min_percentage);
        const max = index === 0
            ? 100
            : prevFloor - 1;
        prevFloor = floor;
        return {
            ...row,
            max_percentage: max
        };
    });
}

/**
 * Transmutes a raw percentage grade into standard institutional numerical grade (1.00 to 5.00).
 */
export function transmuteGrade(
    rawPercentage: number,
    ladder: TransmutationRow[]
): number {
    const sorted = [...ladder]
        .filter((r) => r.min_percentage !== undefined && r.min_percentage !== null)
        .sort((a, b) => Number(b.min_percentage) - Number(a.min_percentage));

    for (const rung of sorted) {
        if (rawPercentage >= Number(rung.min_percentage)) {
            return Number(rung.transmuted_grade);
        }
    }

    return 5.00;
}

/**
 * Calculates raw grade for a grading period based on individual component scores and weights.
 */
export function calculatePeriodRawGrade(
    components: {
        id: string;
        name: string;
        weight: number;
        earnedPoints: number;
        totalPoints: number;
    }[],
    transmutationLadder?: TransmutationRow[]
): PeriodicGradeCalculation {
    let totalWeight = 0;
    let totalWeightedScore = 0;

    const componentScores: ComputedComponentScore[] = components.map((comp) => {
        const weight = Number(comp.weight) || 0;
        const earned = Number(comp.earnedPoints) || 0;
        const total = Number(comp.totalPoints) || 0;

        const weighted = total > 0
            ? (earned / total) * weight
            : 0;
        totalWeight += weight;
        totalWeightedScore += weighted;

        return {
            componentId: comp.id,
            name: comp.name,
            weight,
            totalEarned: earned,
            totalPossible: total,
            weightedScore: Number(weighted.toFixed(4))
        };
    });

    if (totalWeight === 0) {
        return {
            rawGrade: 0,
            transmutedGrade: null,
            totalWeightUsed: 0,
            componentScores
        };
    }

    const rawGrade = Number(((totalWeightedScore / totalWeight) * 100).toFixed(2));
    const transmutedGrade = transmutationLadder
        ? transmuteGrade(rawGrade, transmutationLadder)
        : null;

    return {
        rawGrade,
        transmutedGrade,
        totalWeightUsed: totalWeight,
        componentScores
    };
}

/**
 * Computes the overall term final grade by weighting each grading period.
 */
export function calculateTermFinalGrade(
    periodResults: {
        periodName: string;
        weight: number;
        rawGrade: number;
    }[],
    transmutationLadder?: TransmutationRow[]
): TermFinalGradeCalculation {
    let totalWeight = 0;
    let weightedSum = 0;

    const periodGrades = periodResults.map((p) => {
        const weight = Number(p.weight) || 0;
        const raw = Number(p.rawGrade) || 0;
        const weightedContribution = (raw * weight) / 100;

        totalWeight += weight;
        weightedSum += weightedContribution;

        return {
            periodName: p.periodName,
            weight,
            rawGrade: raw,
            weightedContribution: Number(weightedContribution.toFixed(4))
        };
    });

    const rawFinalGrade = totalWeight > 0
        ? Number(((weightedSum / totalWeight) * 100).toFixed(2))
        : 0;
    const transmutedFinalGrade = transmutationLadder
        ? transmuteGrade(rawFinalGrade, transmutationLadder)
        : null;
    const isPassing = transmutedFinalGrade !== null
        ? transmutedFinalGrade <= 3.00
        : rawFinalGrade >= 75;

    return {
        rawFinalGrade,
        transmutedFinalGrade,
        isPassing,
        periodGrades
    };
}

/**
 * Evaluates one node of a special grade condition tree against a student's
 * measured signals.
 *
 * This mirrors the SQL function `fn_eval_special_grade_condition`, which is the
 * authority — detection runs in the database. This copy exists so the rule
 * builder can show an admin what a rule does before it is saved, and the two
 * must agree. Both fail closed: an unknown signal, a malformed node, or a value
 * that will not parse is `false`, never `true`.
 */
export function evaluateCondition(
    node: SpecialGradeConditionNode | null | undefined,
    signals: Record<string, number | null>
): boolean {
    if (!node || typeof node !== 'object') return false;

    // An empty group never fires, so a rule with no conditions is manual-only.
    if ('all' in node) {
        if (!Array.isArray(node.all) || node.all.length === 0) return false;
        return node.all.every((child) => evaluateCondition(child, signals));
    }

    if ('any' in node) {
        if (!Array.isArray(node.any) || node.any.length === 0) return false;
        return node.any.some((child) => evaluateCondition(child, signals));
    }

    if ('not' in node) {
        return !evaluateCondition(node.not, signals);
    }

    const { signal, op, value } = node;
    if (!signal || !op) return false;
    if (!(signal in signals)) return false;

    const actual = signals[signal];

    if (op === 'is_null') return actual === null;
    if (op === 'not_null') return actual !== null;
    if (actual === null) return false;

    if (op === 'between') {
        if (!Array.isArray(value) || value.length !== 2) return false;
        const [low, high] = value;
        if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
        return actual >= low && actual <= high;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) return false;

    switch (op) {
    case '>=': return actual >= value;
    case '>': return actual > value;
    case '<=': return actual <= value;
    case '<': return actual < value;
    case '=': return actual === value;
    case '!=': return actual !== value;
    default: return false;
    }
}

export interface SpecialGradeEvaluationResult {
    specialGrade: SpecialGradeConfig | null;
    reason?: string;
}

export function evaluateSpecialGradeStatus(
    absentSessions: number,
    totalSessions: number,
    hasIncompleteRequirements: boolean,
    configs: SpecialGradeConfig[]
): SpecialGradeEvaluationResult {
    const absencePercentage = totalSessions > 0
        ? (absentSessions / totalSessions) * 100
        : 0;

    // Check DRP first (absence percentage exceeded)
    const drpConfig = configs.find(
        (c) => c.code === 'DRP' && c.is_active && c.min_absence_percentage && absencePercentage >= Number(c.min_absence_percentage)
    );
    if (drpConfig) {
        return {
            specialGrade: drpConfig,
            reason: `Absence rate of ${absencePercentage.toFixed(1)}% exceeds the ${drpConfig.min_absence_percentage}% threshold`
        };
    }

    // Check INC second (incomplete requirements)
    if (hasIncompleteRequirements) {
        const incConfig = configs.find((c) => c.code === 'INC' && c.is_active && c.requires_completion);
        if (incConfig) {
            return {
                specialGrade: incConfig,
                reason: `Incomplete requirements. Must resolve within ${incConfig.completion_deadline_days ?? 365} days.`
            };
        }
    }

    return {
        specialGrade: null
    };
}

/**
 * Picks the rule that should win when several match the same student. Lower
 * `priority` wins; `code` breaks ties so the outcome is stable rather than
 * dependent on row order.
 */
export function resolveMatchingSpecialGrade(
    configs: SpecialGradeConfig[],
    signals: Record<string, number | null>
): SpecialGradeConfig | null {
    const matches = configs
        .filter((config) => config.is_active && evaluateCondition(config.conditions, signals))
        .sort((a, b) => ((a.priority ?? 0) - (b.priority ?? 0)) || a.code.localeCompare(b.code));

    return matches[0] ?? null;
}

export interface GradeSheetCsvExportOptions {
    sectionCode?: string;
    courseCode?: string;
    courseTitle?: string;
    periodName?: string;
    gradeSheet: GradeSheetRow[];
}

export function escapeCsvField(val: string | number | null | undefined): string {
    if (val === null || val === undefined) {
        return '""';
    }
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
}

export function generateGradeSheetCsv({
    sectionCode,
    courseCode,
    courseTitle,
    periodName,
    gradeSheet
}: GradeSheetCsvExportOptions): string {
    const lines: string[] = [];

    if (courseCode || sectionCode) {
        lines.push(`${escapeCsvField('Course / Section')},${escapeCsvField(`${courseCode ?? ''} — ${sectionCode ?? ''}`)}`);
    }
    if (courseTitle) {
        lines.push(`${escapeCsvField('Course Title')},${escapeCsvField(courseTitle)}`);
    }
    if (periodName) {
        lines.push(`${escapeCsvField('Grading Period')},${escapeCsvField(periodName)}`);
    }
    lines.push(`${escapeCsvField('Export Date')},${escapeCsvField(new Date()
        .toLocaleDateString('en-PH'))}`);
    lines.push('');

    const headers = ['Student No.', 'Full Name', 'Raw Grade', 'Transmuted Grade', 'Special Grade', 'Status'];
    lines.push(headers.map(escapeCsvField)
        .join(','));

    for (const row of gradeSheet) {
        const rawGradeStr = row.raw_grade != null
            ? `${row.raw_grade}%`
            : '—';
        const transmutedStr = row.transmuted_grade != null
            ? String(row.transmuted_grade)
            : '—';
        const specialGradeStr = row.special_grade ?? '—';
        const statusStr = row.status ?? 'Draft';

        lines.push([
            escapeCsvField(row.student_number),
            escapeCsvField(row.full_name),
            escapeCsvField(rawGradeStr),
            escapeCsvField(transmutedStr),
            escapeCsvField(specialGradeStr),
            escapeCsvField(statusStr)
        ].join(','));
    }

    return lines.join('\r\n');
}