import { SpecialGradeConfig, TransmutationRow } from '@type/grading-config.type';

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
 * Evaluates whether a special grade applies (e.g. DRP on excessive absences, INC on incomplete assessment).
 */
export function evaluateSpecialGradeStatus(
    absenceCount: number,
    totalSessions: number,
    hasIncompleteRequirements: boolean,
    specialConfigs: SpecialGradeConfig[]
): { specialGrade: SpecialGradeConfig | null; reason?: string } {
    const absencePercentage = totalSessions > 0
        ? (absenceCount / totalSessions) * 100
        : 0;

    const drpConfig = specialConfigs.find((c) => c.code === 'DRP' && c.is_active);
    if (drpConfig && drpConfig.min_absence_percentage !== null && drpConfig.min_absence_percentage !== undefined && absencePercentage >= Number(drpConfig.min_absence_percentage)) {
        return {
            specialGrade: drpConfig,
            reason: `Absence rate of ${absencePercentage.toFixed(1)}% exceeds the ${drpConfig.min_absence_percentage}% threshold.`
        };
    }

    const incConfig = specialConfigs.find((c) => c.code === 'INC' && c.is_active);
    if (incConfig && hasIncompleteRequirements) {
        return {
            specialGrade: incConfig,
            reason: `Student has incomplete academic requirements. Must resolve within ${incConfig.completion_deadline_days ?? 365} days.`
        };
    }

    return { specialGrade: null };
}