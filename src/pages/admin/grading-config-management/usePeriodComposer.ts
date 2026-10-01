import {
    getGradingPeriodTemplates,
    saveGradingPeriodTemplates
} from '@services/grading-config.service';
import { useToastStore } from '@stores/toast.store';
import { GradingComponentDraft, GradingPeriodDraft, GradingPeriodTemplate } from '@type/grading-config.type';
import {
    balanceToTermTotal, clampPeriodWeight, componentTotal, describeTermAllocation, termTotal, toWeight, unbalancedPeriodNames, TERM_WEIGHT_TOTAL, WEIGHT_STEP
} from '@utils/period-allocation.util';
import { generateId } from '@utils/uuid.util';
import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_COMPONENTS: { name: string; weight: number }[] = [
    { name: 'Class Standing', weight: 30 },
    { name: 'Major Examination', weight: 40 },
    { name: 'Quizzes', weight: 30 }
];

function toComponentDraft(name: string, weight: string | number): GradingComponentDraft {
    return {
        key: generateId(),
        name,
        weight: toWeight(weight)
    };
}

/**
 * Maps the RPC payload onto draft rows. Weights arrive as strings and are held
 * as numbers for the whole editing session, because every affordance here is
 * arithmetic on the budget rather than free text.
 */
function toDrafts(periods: GradingPeriodTemplate[]): GradingPeriodDraft[] {
    return periods
        .slice()
        .sort((left, right) => Number(left.sequence) - Number(right.sequence))
        .map((period) => ({
            ...period,
            components: period.components.map((component) => toComponentDraft(component.name, component.weight)),
            key: period.id ?? generateId(),
            weight: toWeight(period.weight)
        }));
}

/**
 * Copies drafts deeply enough that edits to the copy cannot reach the original.
 * Only the nested `components` arrays need it — every other field is a scalar.
 */
function clonePeriods(periods: GradingPeriodDraft[]): GradingPeriodDraft[] {
    return periods.map((period) => ({
        ...period,
        components: period.components.map((component) => ({ ...component }))
    }));
}

/**
 * Strips client-only identity so two snapshots can be compared for real edits.
 * Sequence comes from array position, which is what makes reordering a change
 * the diff can see.
 */
function toComparable(periods: GradingPeriodDraft[]): string {
    return JSON.stringify(periods.map((period, index) => ({
        components: period.components.map((component) => ({
            name: component.name.trim(),
            weight: toWeight(component.weight)
        })),
        id: period.id ?? null,
        name: period.name.trim(),
        sequence: index + 1,
        weight: toWeight(period.weight)
    })));
}

function toPayload(period: GradingPeriodDraft, sequence: number): GradingPeriodTemplate {
    return {
        components: period.components.map((component) => ({
            name: component.name.trim(),
            weight: toWeight(component.weight)
        })),
        name: period.name.trim(),
        sequence,
        weight: toWeight(period.weight)
    };
}

export function usePeriodComposer() {
    const [periods, setPeriods] = useState<GradingPeriodDraft[]>([]);
    // The last state the server confirmed. Kept as drafts rather than a compare
    // string so Cancel can restore it outright instead of re-fetching.
    const [savedPeriods, setSavedPeriods] = useState<GradingPeriodDraft[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const total = termTotal(periods);
    const status = useMemo(() => describeTermAllocation(periods), [periods]);
    const snapshot = useMemo(() => toComparable(savedPeriods), [savedPeriods]);
    const isDirty = toComparable(periods) !== snapshot;
    const hasBlankName = periods.some((period) => period.name.trim().length === 0);
    const unbalancedPeriods = useMemo(() => unbalancedPeriodNames(periods), [periods]);

    /**
     * Everything standing between the current draft and a save, phrased for the
     * person reading it. Kept separate from the allocation chip so the chip can
     * describe the term honestly while this explains a disabled Save button.
     */
    const blockers = useMemo(function() {
        const reasons: string[] = [];

        if (!status.isBalanced) {
            reasons.push(`The term totals ${total}% — it must total ${TERM_WEIGHT_TOTAL}%.`);
        }

        if (hasBlankName) {
            reasons.push('Every period needs a name.');
        }

        if (unbalancedPeriods.length > 0) {
            reasons.push(`Components must total 100% in ${unbalancedPeriods.join(', ')}.`);
        }

        return reasons;
    }, [hasBlankName, status.isBalanced, total, unbalancedPeriods]);

    const canSave = blockers.length === 0 && isDirty && !isSaving;

    const load = useCallback(async function() {
        setIsLoading(true);

        const result = await getGradingPeriodTemplates();

        if (result.data) {
            const drafts = toDrafts(result.data);

            setPeriods(drafts);
            setSavedPeriods(drafts);
        }

        setIsLoading(false);
    }, []);

    useEffect(function() {
        load();
    }, [load]);

    function updatePeriod(key: string, patch: Partial<GradingPeriodDraft>) {
        setPeriods((previous) => previous.map((period) => (period.key === key
            ? { ...period, ...patch }
            : period)));
    }

    function handleRename(key: string, name: string) {
        updatePeriod(key, { name });
    }

    /**
     * Weight edits are clamped against what the other periods already spend, so
     * the stepper can trim an over-allocation but never deepen one.
     */
    function handleWeightChange(key: string, next: number) {
        setPeriods(function(previous) {
            const othersTotal = previous
                .filter((period) => period.key !== key)
                .reduce((sum, period) => sum + toWeight(period.weight), 0);

            return previous.map((period) => (period.key === key
                ? { ...period, weight: clampPeriodWeight(next, toWeight(period.weight), othersTotal) }
                : period));
        });
    }

    function handleStep(key: string, direction: number) {
        const period = periods.find((row) => row.key === key);

        if (!period) {
            return;
        }

        handleWeightChange(key, toWeight(period.weight) + (direction * WEIGHT_STEP));
    }

    function handleToggleExpanded(key: string) {
        setExpandedKeys((previous) => (previous.includes(key)
            ? previous.filter((expanded) => expanded !== key)
            : [...previous, key]));
    }

    function handleAddPeriod() {
        const remaining = TERM_WEIGHT_TOTAL - total;

        if (remaining <= 0) {
            useToastStore.getState()
                .showToast('The term is fully allocated. Reduce a period before adding another.', 'warning');

            return;
        }

        const key = generateId();

        setPeriods((previous) => [
            ...previous,
            {
                components: DEFAULT_COMPONENTS.map((component) => toComponentDraft(component.name, component.weight)),
                key,
                name: '',
                sequence: previous.length + 1,
                weight: Math.min(remaining, 25)
            }
        ]);
        setExpandedKeys((previous) => [...previous, key]);
    }

    function handleRemovePeriod(key: string) {
        setPeriods((previous) => previous.filter((period) => period.key !== key));
        setExpandedKeys((previous) => previous.filter((expanded) => expanded !== key));
    }

    /**
     * Moves a period within the sequence. Order is the academic calendar here,
     * so it is edited directly rather than inferred from a sort column.
     */
    function handleMovePeriod(key: string, direction: number) {
        setPeriods(function(previous) {
            const index = previous.findIndex((period) => period.key === key);
            const target = index + direction;

            if (index < 0 || target < 0 || target >= previous.length) {
                return previous;
            }

            const reordered = previous.slice();

            [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

            return reordered;
        });
    }

    function handleBalance() {
        setPeriods(function(previous) {
            const balanced = balanceToTermTotal(previous.map((period) => toWeight(period.weight)));

            return previous.map((period, index) => ({ ...period, weight: balanced[index] }));
        });
    }

    function handleComponentChange(periodKey: string, componentKey: string, patch: Partial<GradingComponentDraft>) {
        setPeriods((previous) => previous.map(function(period) {
            if (period.key !== periodKey) {
                return period;
            }

            return {
                ...period,
                components: period.components.map((component) => (component.key === componentKey
                    ? { ...component, ...patch }
                    : component))
            };
        }));
    }

    function handleAddComponent(periodKey: string) {
        setPeriods((previous) => previous.map(function(period) {
            if (period.key !== periodKey) {
                return period;
            }

            const remaining = Math.max(0, 100 - componentTotal(period));

            return {
                ...period,
                components: [...period.components, toComponentDraft('', remaining)]
            };
        }));
    }

    function handleRemoveComponent(periodKey: string, componentKey: string) {
        setPeriods((previous) => previous.map(function(period) {
            if (period.key !== periodKey) {
                return period;
            }

            return {
                ...period,
                components: period.components.filter((component) => component.key !== componentKey)
            };
        }));
    }

    /**
     * Distributes this period's own budget evenly across its components, the
     * nested equivalent of balancing the term.
     */
    function handleBalanceComponents(periodKey: string) {
        setPeriods((previous) => previous.map(function(period) {
            if (period.key !== periodKey || period.components.length === 0) {
                return period;
            }

            const balanced = balanceToTermTotal(period.components.map((component) => toWeight(component.weight)));

            return {
                ...period,
                components: period.components.map((component, index) => ({
                    ...component,
                    weight: balanced[index]
                }))
            };
        }));
    }

    /**
     * Cancel is a local revert, not a reload. The last confirmed state is
     * already in memory, so restoring it needs no request — and re-fetching
     * would flash the whole screen through its loading state to arrive at data
     * we were already holding.
     *
     * Rows are cloned on the way back so a later edit can never reach into the
     * pristine copy through a shared reference, and expansion is narrowed to the
     * rows that still exist rather than collapsed outright — reverting the
     * numbers should not also close the row you were working in.
     */
    function handleReset() {
        const restored = clonePeriods(savedPeriods);

        setPeriods(restored);
        setExpandedKeys((previous) => previous.filter(
            (key) => restored.some((period) => period.key === key)
        ));
    }

    async function handleSave() {
        setIsSaving(true);

        const payload = periods.map((period, index) => toPayload(period, index + 1));
        const result = await saveGradingPeriodTemplates(payload);

        if (result.error) {
            setIsSaving(false);
            return;
        }

        useToastStore.getState()
            .showToast('Grading structure saved.', 'success');

        await load();
        setIsSaving(false);
    }

    return {
        blockers,
        canSave,
        expandedKeys,
        handleAddComponent,
        handleAddPeriod,
        handleBalance,
        handleBalanceComponents,
        handleComponentChange,
        handleMovePeriod,
        handleRemoveComponent,
        handleRemovePeriod,
        handleRename,
        handleReset,
        handleSave,
        handleStep,
        handleToggleExpanded,
        handleWeightChange,
        isDirty,
        isLoading,
        isSaving,
        periods,
        status,
        total
    };
}