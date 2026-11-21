import { getTransmutationTable } from '@services/grading-config.service';
import { TransmutationRow } from '@type/grading-config.type';
import { useEffect, useState } from 'react';

export interface TransmutationStep {
    description: string;
    grade: number;
    maxPercentage: number | null;
    minPercentage: number;
}

/**
 * Turns the raw table rows into numeric steps, best grade first.
 * Special-grade rows (INC, DRP, ...) and rows without a numeric grade or minimum
 * percentage are skipped, since they are not steps of the scale.
 */
export function toTransmutationSteps(rows: TransmutationRow[]): TransmutationStep[] {
    return rows
        .filter(function(row) {
            return !row.special_code
                && row.transmuted_grade !== null
                && row.transmuted_grade !== undefined
                && row.transmuted_grade !== ''
                && row.min_percentage !== null
                && row.min_percentage !== undefined
                && row.min_percentage !== '';
        })
        .map(function(row) {
            const max = row.max_percentage === null || row.max_percentage === undefined
                ? null
                : Number(row.max_percentage);

            return {
                description: row.description ?? '',
                grade: Number(row.transmuted_grade),
                maxPercentage: max === null || Number.isNaN(max)
                    ? null
                    : max,
                minPercentage: Number(row.min_percentage)
            };
        })
        .filter((step) => !Number.isNaN(step.grade) && !Number.isNaN(step.minPercentage))
        .sort((a, b) => a.grade - b.grade);
}

/**
 * Finds the configured grade step for a percentage, or null when no step covers it.
 * Matches the database (fn_calculate_final_grade): the step with the highest minimum
 * percentage at or below the score, so a score between two bands (97.5 when one band
 * ends at 97 and the next starts at 98) falls into the lower band.
 */
export function findTransmutationStep(steps: TransmutationStep[], percentage: number): TransmutationStep | null {
    let match: TransmutationStep | null = null;

    for (const step of steps) {
        if (percentage >= step.minPercentage && (match === null || step.minPercentage > match.minPercentage)) {
            match = step;
        }
    }

    return match;
}

/**
 * Loads the configured transmutation table (fn_get_transmutation_table).
 * `isLoaded` turns true even when loading fails, with an empty list.
 */
export function useTransmutationScale() {
    const [steps, setSteps] = useState<TransmutationStep[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        let isCurrent = true;

        async function fetchTable() {
            const result = await getTransmutationTable({ silent: true });
            if (!isCurrent) return;

            setSteps(toTransmutationSteps(result.data ?? []));
            setIsLoaded(true);
        }

        fetchTable();

        return function() {
            isCurrent = false;
        };
    }, []);

    return { isLoaded, steps };
}