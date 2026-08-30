import { GradingPeriodDraft } from '@type/grading-config.type';

export const TERM_WEIGHT_TOTAL = 100;
export const COMPONENT_WEIGHT_TOTAL = 100;
export const WEIGHT_STEP = 5;
export const MIN_PERIOD_WEIGHT = 1;

/**
 * Sequence is the one thing the old card grid could not express, so the rail
 * colour encodes it: period 1 is the deepest brand blue and each later period
 * steps lighter. A glance down the rail reads as an ordered ramp rather than
 * six unrelated bands.
 */
const PERIOD_RAIL_COLORS: string[] = [
    'var(--mui-tokens-color-brand-900)',
    'var(--mui-tokens-color-brand-800)',
    'var(--mui-tokens-color-brand-700)',
    'var(--mui-tokens-color-brand-600)',
    'var(--mui-tokens-color-brand-500)',
    'var(--mui-tokens-color-brand-400)'
];

const COMPONENT_RAIL_COLORS: string[] = [
    'var(--mui-tokens-color-brand-700)',
    'var(--mui-tokens-color-brand-500)',
    'var(--mui-tokens-color-brand-300)',
    'var(--mui-tokens-color-brand-200)'
];

export type AllocationTone = 'error' | 'success' | 'warning';

export interface AllocationStatus {
    // Sentence shown beside the headline figure
    detail: string;

    // Whether the term and every component budget close at exactly 100
    isBalanced: boolean;

    // Semantic colour for the status chip
    tone: AllocationTone;
}

/**
 * Coerces a weight that may arrive as a string from the RPC, an empty input, or
 * `undefined` on a freshly added row into a number safe to add up.
 */
export function toWeight(value: string | number | null | undefined): number {
    const weight = Number(value);

    return Number.isFinite(weight)
        ? weight
        : 0;
}

export function sumWeights(rows: { weight: string | number }[]): number {
    return rows.reduce((total, row) => total + toWeight(row.weight), 0);
}

export function periodRailColor(index: number): string {
    return PERIOD_RAIL_COLORS[index % PERIOD_RAIL_COLORS.length];
}

export function componentRailColor(index: number): string {
    return COMPONENT_RAIL_COLORS[index % COMPONENT_RAIL_COLORS.length];
}

export function termTotal(periods: GradingPeriodDraft[]): number {
    return sumWeights(periods);
}

export function componentTotal(period: GradingPeriodDraft): number {
    return sumWeights(period.components);
}

/**
 * Names the periods whose own component budget does not close at 100. This is
 * the check the retired grid card never performed — it printed a hardcoded
 * "100% components" regardless of the data behind it.
 */
export function unbalancedPeriodNames(periods: GradingPeriodDraft[]): string[] {
    return periods
        .filter((period) => componentTotal(period) !== COMPONENT_WEIGHT_TOTAL)
        .map((period) => period.name.trim() || 'Untitled period');
}

/**
 * Describes the term allocation and nothing else: over, short, or balanced.
 *
 * It deliberately says nothing about whether the structure can be saved. Those
 * are separate facts — a balanced term with no edits pending is not saveable,
 * and a chip that reads "ready to save" beside a disabled Save button is simply
 * wrong. What blocks a save is reported next to the save affordance instead.
 */
export function describeTermAllocation(periods: GradingPeriodDraft[]): AllocationStatus {
    const total = termTotal(periods);

    if (total > TERM_WEIGHT_TOTAL) {
        return {
            detail: `${total - TERM_WEIGHT_TOTAL} points over`,
            isBalanced: false,
            tone: 'error'
        };
    }

    if (total < TERM_WEIGHT_TOTAL) {
        return {
            detail: `${TERM_WEIGHT_TOTAL - total} points short`,
            isBalanced: false,
            tone: 'warning'
        };
    }

    return {
        detail: 'Balanced',
        isBalanced: true,
        tone: 'success'
    };
}

/**
 * Scales every period proportionally onto exactly 100. The last period absorbs
 * the rounding remainder so the parts always sum to the whole — rounding each
 * share independently is what lands a "balanced" structure on 99 or 101.
 */
export function balanceToTermTotal(weights: number[]): number[] {
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    if (weights.length === 0 || total <= 0) {
        return weights;
    }

    let allocated = 0;

    return weights.map(function(weight, index) {
        if (index === weights.length - 1) {
            return TERM_WEIGHT_TOTAL - allocated;
        }

        const share = Math.max(
            MIN_PERIOD_WEIGHT,
            Math.round((weight / total) * TERM_WEIGHT_TOTAL)
        );

        allocated += share;

        return share;
    });
}

/**
 * Clamps a period weight to what the remaining budget can fund, so an edit can
 * never push the term further past 100 than it already is.
 *
 * Reductions always pass through untouched. A structure loaded at 125% is only
 * fixable downward, and clamping such an edit to the remaining budget would
 * snap a 50 → 45 step all the way to 25 — moving the value far further than the
 * user asked for.
 */
export function clampPeriodWeight(next: number, current: number, othersTotal: number): number {
    const floored = Math.max(next, MIN_PERIOD_WEIGHT);

    if (floored <= current) {
        return floored;
    }

    const ceiling = Math.max(current, TERM_WEIGHT_TOTAL - othersTotal);

    return Math.min(floored, ceiling);
}