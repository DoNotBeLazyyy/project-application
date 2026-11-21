import { findTransmutationStep, toTransmutationSteps } from '@pages/student/grade/use-transmutation-scale';
import { TransmutationRow } from '@type/grading-config.type';
import { describe, expect, it } from 'vitest';

const ROWS: TransmutationRow[] = [
    {
        description: 'Excellent', max_percentage: '100.00', min_percentage: '98.00', transmuted_grade: '1.00'
    },
    {
        description: 'Superior', max_percentage: '97.00', min_percentage: '95.00', transmuted_grade: '1.25'
    },
    {
        description: 'Passing', max_percentage: '76.00', min_percentage: '75.00', transmuted_grade: '3.00'
    },
    {
        description: 'Failed', max_percentage: '74.00', min_percentage: '0.00', transmuted_grade: '5.00'
    },
    {
        description: 'Incomplete', max_percentage: '0.00', min_percentage: '0.00', special_code: 'INC', transmuted_grade: null
    }
];

describe('toTransmutationSteps', () => {
    it('leaves out special-grade rows so no "0.00 INC" step appears', () => {
        const steps = toTransmutationSteps(ROWS);

        expect(steps.map((step) => step.grade))
            .toEqual([1, 1.25, 3, 5]);
    });
});

describe('findTransmutationStep', () => {
    const steps = toTransmutationSteps(ROWS);

    it('puts a score between two bands into the lower band, like the database', () => {
        expect(findTransmutationStep(steps, 97.5)?.grade)
            .toBe(1.25);
        expect(findTransmutationStep(steps, 74.5)?.grade)
            .toBe(5);
    });

    it('matches the band a score falls in', () => {
        expect(findTransmutationStep(steps, 100)?.grade)
            .toBe(1);
        expect(findTransmutationStep(steps, 75)?.grade)
            .toBe(3);
    });

    it('returns null when no step covers the score', () => {
        expect(findTransmutationStep([], 90))
            .toBeNull();
    });
});