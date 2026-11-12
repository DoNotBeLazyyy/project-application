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
 * Rows without a numeric grade or minimum percentage are skipped.
 */
export function toTransmutationSteps(rows: TransmutationRow[]): TransmutationStep[] {
    return rows
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
 */
export function findTransmutationStep(steps: TransmutationStep[], percentage: number): TransmutationStep | null {
    return steps.find(function(step) {
        return percentage >= step.minPercentage
            && (step.maxPercentage === null || percentage <= step.maxPercentage + 0.009);
    })
        ?? null;
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