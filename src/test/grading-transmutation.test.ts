import { SpecialGradeConfig, TransmutationRow } from '@type/grading-config.type';
import {
    calculatePeriodRawGrade,
    calculateTermFinalGrade,
    computeTransmutationRanges,
    evaluateCondition,
    resolveMatchingSpecialGrade,
    transmuteGrade,
    validateTransmutationRows
} from '@utils/grading.util';
import { describe, expect, it } from 'vitest';

describe('Grading Transmutation Engine & Periodic Weighting Logic', () => {
    const defaultTransmutationLadder: TransmutationRow[] = [
        { transmuted_grade: 1.00, min_percentage: 98, description: 'Excellent' },
        { transmuted_grade: 1.25, min_percentage: 95, description: 'Superior' },
        { transmuted_grade: 1.50, min_percentage: 92, description: 'Very Good' },
        { transmuted_grade: 1.75, min_percentage: 89, description: 'Good' },
        { transmuted_grade: 2.00, min_percentage: 86, description: 'Meritorious' },
        { transmuted_grade: 2.25, min_percentage: 83, description: 'Very Satisfactory' },
        { transmuted_grade: 2.50, min_percentage: 80, description: 'Satisfactory' },
        { transmuted_grade: 2.75, min_percentage: 77, description: 'Fairly Satisfactory' },
        { transmuted_grade: 3.00, min_percentage: 75, description: 'Passing' },
        { transmuted_grade: 5.00, min_percentage: 0, description: 'Failed' }
    ];

    const sampleSpecialConfigs: SpecialGradeConfig[] = [
        {
            code: 'INC',
            label: 'Incomplete',
            description: 'Course requirements incomplete',
            conditions: { all: [{ op: '>=', signal: 'missing_exam_count', value: 1 }] },
            min_absence_percentage: null,
            requires_completion: true,
            completion_deadline_days: 365,
            is_passing: false,
            is_active: true,
            is_auto_detected: true,
            priority: 20
        },
        {
            code: 'DRP',
            label: 'Dropped',
            description: 'Excessive unexcused absences',
            conditions: { all: [{ op: '>=', signal: 'absence_rate', value: 20 }] },
            min_absence_percentage: 20,
            requires_completion: false,
            completion_deadline_days: null,
            is_passing: false,
            is_active: true,
            is_auto_detected: true,
            priority: 10
        }
    ];

    describe('1. Transmutation Table Validation (fn_save_transmutation_table rules)', () => {
        it('should validate a valid 10-rung institutional transmutation table', () => {
            const result = validateTransmutationRows(defaultTransmutationLadder);
            expect(result.isValid)
                .toBe(true);
            expect(result.error)
                .toBeUndefined();
        });

        it('should reject table if row count is not exactly 10', () => {
            const shortLadder = defaultTransmutationLadder.slice(0, 9);
            const result = validateTransmutationRows(shortLadder);
            expect(result.isValid)
                .toBe(false);
            expect(result.error)
                .toContain('must contain exactly 10 grade rows');
        });

        it('should reject table if grade rungs do not match 1.00-3.00 in 0.25 steps plus 5.00', () => {
            const invalidRungs = defaultTransmutationLadder.map((r) =>
                r.transmuted_grade === 3.00
                    ? { ...r, transmuted_grade: 3.50 }
                    : r);
            const result = validateTransmutationRows(invalidRungs);
            expect(result.isValid)
                .toBe(false);
            expect(result.error)
                .toContain('Grade rungs must be exactly 1.00 to 3.00 in 0.25 steps plus 5.00');
        });

        it('should reject floor percentage outside 0-100', () => {
            const invalidFloor = defaultTransmutationLadder.map((r) =>
                r.transmuted_grade === 1.00
                    ? { ...r, min_percentage: 105 }
                    : r);
            const result = validateTransmutationRows(invalidFloor);
            expect(result.isValid)
                .toBe(false);
            expect(result.error)
                .toContain('between 0 and 100');
        });

        it('should reject non-integer minimum percentage floor', () => {
            const nonIntFloor = defaultTransmutationLadder.map((r) =>
                r.transmuted_grade === 3.00
                    ? { ...r, min_percentage: 74.5 }
                    : r);
            const result = validateTransmutationRows(nonIntFloor);
            expect(result.isValid)
                .toBe(false);
            expect(result.error)
                .toContain('must be a whole number');
        });

        it('should reject 5.00 (Failed) if floor is non-zero', () => {
            const nonZeroFail = defaultTransmutationLadder.map((r) =>
                r.transmuted_grade === 5.00
                    ? { ...r, min_percentage: 50 }
                    : r);
            const result = validateTransmutationRows(nonZeroFail);
            expect(result.isValid)
                .toBe(false);
            expect(result.error)
                .toContain('The 5.00 (Failed) floor must be 0');
        });

        it('should reject non-monotonic floors where higher grade has lower or equal floor', () => {
            const nonMonotonic = defaultTransmutationLadder.map((r) => {
                if (r.transmuted_grade === 1.25) return { ...r, min_percentage: 91 };
                if (r.transmuted_grade === 1.50) return { ...r, min_percentage: 93 };
                return r;
            });
            const result = validateTransmutationRows(nonMonotonic);
            expect(result.isValid)
                .toBe(false);
            expect(result.error)
                .toContain('strictly higher minimum percentage');
        });

        it('should compute continuous max_percentage ranges correctly', () => {
            const ranges = computeTransmutationRanges(defaultTransmutationLadder);
            expect(ranges.find((r) => r.transmuted_grade === 1.00)?.max_percentage)
                .toBe(100);
            expect(ranges.find((r) => r.transmuted_grade === 1.25)?.max_percentage)
                .toBe(97);
            expect(ranges.find((r) => r.transmuted_grade === 3.00)?.max_percentage)
                .toBe(76);
            expect(ranges.find((r) => r.transmuted_grade === 5.00)?.max_percentage)
                .toBe(74);
        });
    });

    describe('2. Transmutation Scale Grade Lookup', () => {
        it.each([
            [100.0, 1.00],
            [98.0, 1.00],
            [97.99, 1.25],
            [95.0, 1.25],
            [94.9, 1.50],
            [92.0, 1.50],
            [89.5, 1.75],
            [86.0, 2.00],
            [83.0, 2.25],
            [80.5, 2.50],
            [77.0, 2.75],
            [75.0, 3.00],
            [74.99, 5.00],
            [50.0, 5.00],
            [0.0, 5.00]
        ])('should map raw grade %f to transmuted grade %f', (rawGrade, expectedTransmuted) => {
            const transmuted = transmuteGrade(rawGrade, defaultTransmutationLadder);
            expect(transmuted)
                .toBe(expectedTransmuted);
        });
    });

    describe('3. Grading Period Raw & Transmuted Calculation', () => {
        const components = [
            { id: 'c1', name: 'Written Works', weight: 30, earnedPoints: 90, totalPoints: 100 },
            { id: 'c2', name: 'Performance Tasks', weight: 50, earnedPoints: 45, totalPoints: 50 },
            { id: 'c3', name: 'Periodic Exam', weight: 20, earnedPoints: 80, totalPoints: 100 }
        ];

        it('should calculate accurate weighted component percentages and raw period grade', () => {
            // Written Works: (90/100)*30 = 27
            // Performance Tasks: (45/50)*50 = 45
            // Periodic Exam: (80/100)*20 = 16
            // Total weighted = 88.00%
            const calculation = calculatePeriodRawGrade(components, defaultTransmutationLadder);

            expect(calculation.totalWeightUsed)
                .toBe(100);
            expect(calculation.rawGrade)
                .toBe(88.00);
            expect(calculation.transmutedGrade)
                .toBe(2.00);

            expect(calculation.componentScores[0].weightedScore)
                .toBe(27.0);
            expect(calculation.componentScores[1].weightedScore)
                .toBe(45.0);
            expect(calculation.componentScores[2].weightedScore)
                .toBe(16.0);
        });

        it('should handle zero-point component without division-by-zero error', () => {
            const compWithZeroTotal = [
                { id: 'c1', name: 'Written Works', weight: 40, earnedPoints: 0, totalPoints: 0 },
                { id: 'c2', name: 'Performance Tasks', weight: 60, earnedPoints: 60, totalPoints: 60 }
            ];

            const calculation = calculatePeriodRawGrade(compWithZeroTotal, defaultTransmutationLadder);
            // Written Works: 0
            // Performance Tasks: (60/60)*60 = 60
            // Raw Grade: (60 / 100) * 100 = 60.00%
            expect(calculation.rawGrade)
                .toBe(60.00);
            expect(calculation.transmutedGrade)
                .toBe(5.00);
        });

        it('should return 0 raw grade if total component weight is 0', () => {
            const noWeights = [
                { id: 'c1', name: 'Written Works', weight: 0, earnedPoints: 10, totalPoints: 10 }
            ];
            const calculation = calculatePeriodRawGrade(noWeights, defaultTransmutationLadder);
            expect(calculation.rawGrade)
                .toBe(0);
            expect(calculation.totalWeightUsed)
                .toBe(0);
            expect(calculation.transmutedGrade)
                .toBeNull();
        });
    });

    describe('4. Overall Term Final Grade Calculation (Periodic Weighting)', () => {
        it('should compute weighted term final grade across Prelim, Midterm, Semi-Finals, and Finals', () => {
            const periods = [
                { periodName: 'Prelim', weight: 20, rawGrade: 85.0 },
                { periodName: 'Midterm', weight: 20, rawGrade: 90.0 },
                { periodName: 'Semi-Finals', weight: 20, rawGrade: 88.0 },
                { periodName: 'Finals', weight: 40, rawGrade: 94.0 }
            ];

            // Weighted:
            // Prelim: (85 * 20)/100 = 17.0
            // Midterm: (90 * 20)/100 = 18.0
            // Semi-Finals: (88 * 20)/100 = 17.6
            // Finals: (94 * 40)/100 = 37.6
            // Sum = 90.20
            const result = calculateTermFinalGrade(periods, defaultTransmutationLadder);

            expect(result.rawFinalGrade)
                .toBe(90.20);
            expect(result.transmutedFinalGrade)
                .toBe(1.75); // 89-91 is 1.75
            expect(result.isPassing)
                .toBe(true);
        });

        it('should correctly flag failing students with transmuted grade 5.00', () => {
            const failingPeriods = [
                { periodName: 'Prelim', weight: 25, rawGrade: 60.0 },
                { periodName: 'Midterm', weight: 25, rawGrade: 65.0 },
                { periodName: 'Finals', weight: 50, rawGrade: 70.0 }
            ];

            // Weighted:
            // Prelim: 15.0
            // Midterm: 16.25
            // Finals: 35.0
            // Sum = 66.25%
            const result = calculateTermFinalGrade(failingPeriods, defaultTransmutationLadder);

            expect(result.rawFinalGrade)
                .toBe(66.25);
            expect(result.transmutedFinalGrade)
                .toBe(5.00);
            expect(result.isPassing)
                .toBe(false);
        });
    });

    describe('5. Special Grade Condition Evaluation', () => {
        // Mirrors what fn_special_grade_signals returns for one enrollment.
        function signals(overrides: Record<string, number | null> = {}): Record<string, number | null> {
            return {
                absence_rate: 0,
                absent_count: 0,
                attendance_rate: 100,
                excused_count: 0,
                excused_rate: 0,
                late_count: 0,
                missing_assessment_count: 0,
                missing_exam_count: 0,
                sessions_total: 20,
                ...overrides
            };
        }

        it('matches DRP when the absence rate reaches the threshold', () => {
            // 6 absences out of 20 sessions = 30% absence
            const matched = resolveMatchingSpecialGrade(
                sampleSpecialConfigs,
                signals({ absence_rate: 30, absent_count: 6 })
            );

            expect(matched?.code)
                .toBe('DRP');
        });

        it('matches INC when a past-due exam has no submission', () => {
            const matched = resolveMatchingSpecialGrade(
                sampleSpecialConfigs,
                signals({ absence_rate: 10, missing_exam_count: 1 })
            );

            expect(matched?.code)
                .toBe('INC');
            expect(matched?.requires_completion)
                .toBe(true);
        });

        it('prefers the lower priority rule when several match', () => {
            // Both DRP (priority 10) and INC (priority 20) fire here.
            const matched = resolveMatchingSpecialGrade(
                sampleSpecialConfigs,
                signals({ absence_rate: 30, missing_exam_count: 2 })
            );

            expect(matched?.code)
                .toBe('DRP');
        });

        it('matches nothing when the student is inside every threshold', () => {
            const matched = resolveMatchingSpecialGrade(
                sampleSpecialConfigs,
                signals({ absence_rate: 5 })
            );

            expect(matched)
                .toBeNull();
        });

        it('requires every leaf of an ALL group', () => {
            const node = {
                all: [
                    { op: '>=' as const, signal: 'absence_rate', value: 20 },
                    { op: '>=' as const, signal: 'missing_exam_count', value: 1 }
                ]
            };

            expect(evaluateCondition(node, signals({ absence_rate: 30, missing_exam_count: 1 })))
                .toBe(true);
            expect(evaluateCondition(node, signals({ absence_rate: 30, missing_exam_count: 0 })))
                .toBe(false);
        });

        it('needs only one leaf of an ANY group', () => {
            const node = {
                any: [
                    { op: '>=' as const, signal: 'absence_rate', value: 20 },
                    { op: '>=' as const, signal: 'missing_exam_count', value: 1 }
                ]
            };

            expect(evaluateCondition(node, signals({ missing_exam_count: 1 })))
                .toBe(true);
            expect(evaluateCondition(node, signals()))
                .toBe(false);
        });

        it('supports not, between and the null checks', () => {
            expect(evaluateCondition(
                { not: { op: '>=', signal: 'absence_rate', value: 20 } },
                signals({ absence_rate: 5 })
            ))
                .toBe(true);

            expect(evaluateCondition(
                { op: 'between', signal: 'absence_rate', value: [10, 30] },
                signals({ absence_rate: 15 })
            ))
                .toBe(true);

            expect(evaluateCondition(
                { op: 'between', signal: 'absence_rate', value: [10, 30] },
                signals({ absence_rate: 45 })
            ))
                .toBe(false);

            expect(evaluateCondition(
                { op: 'is_null', signal: 'absence_rate' },
                signals({ absence_rate: null })
            ))
                .toBe(true);
        });

        // Fail-closed is the whole safety story: a rule the system cannot fully
        // evaluate must never flag a student.
        it('fails closed on an empty group, an unknown signal, and a null reading', () => {
            expect(evaluateCondition({ all: [] }, signals()))
                .toBe(false);

            expect(evaluateCondition(
                { op: '>=', signal: 'not_a_real_signal', value: 1 },
                signals()
            ))
                .toBe(false);

            expect(evaluateCondition(
                { op: '>=', signal: 'absence_rate', value: 20 },
                signals({ absence_rate: null })
            ))
                .toBe(false);
        });

        it('ignores an inactive rule even when its conditions match', () => {
            const inactive = sampleSpecialConfigs.map((config) => ({ ...config, is_active: false }));

            expect(resolveMatchingSpecialGrade(inactive, signals({ absence_rate: 30 })))
                .toBeNull();
        });
    });
});