import { areFormValuesEqual, hasRealFormChanges } from '@hooks/use-form-draft';
import { useMemo } from 'react';
import { Control, FieldValues, useWatch } from 'react-hook-form';

export { areFormValuesEqual, hasRealFormChanges };

/**
 * useHasRealChanges
 *
 * Tracks whether the current values of a React Hook Form control semantically differ
 * from baseline (default) values.
 *
 * Accurately returns `false` if a user modifies an input and reverts it back to
 * its original value, preventing false "dirty" flags from type coercions (e.g. `""` vs `null`).
 */
export function useHasRealChanges<T extends FieldValues>(
    control: Control<T>,
    baselineValues?: Partial<T> | object | null
): boolean {
    const liveValues = useWatch({ control });

    return useMemo(() => {
        if (!control) return false;
        const defaultVals = baselineValues ?? (control as unknown as { _defaultValues?: Record<string, unknown> })?._defaultValues;
        const current = (liveValues ?? (control as unknown as { _formValues?: Record<string, unknown> })?._formValues) as Record<string, unknown> | undefined;
        return hasRealFormChanges(current, defaultVals);
    }, [control, liveValues, baselineValues]);
}

/**
 * useObjectHasRealChanges
 *
 * Compares two state-based objects semantically to determine if a real change exists.
 */
export function useObjectHasRealChanges<T extends object>(
    currentValues: T | null | undefined,
    baselineValues: T | null | undefined
): boolean {
    return useMemo(() => {
        return hasRealFormChanges(currentValues, baselineValues);
    }, [currentValues, baselineValues]);
}