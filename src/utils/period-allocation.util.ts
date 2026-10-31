import { GradingPeriodDraft } from '@type/grading-config.type';

export const TERM_WEIGHT_TOTAL = 100;
export const COMPONENT_WEIGHT_TOTAL = 100;export const MIN_PERIOD_WEIGHT = 1;

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
export function componentRailColor(index: number): string {
    return COMPONENT_RAIL_COLORS[index % COMPONENT_RAIL_COLORS.length];
}

export function termTotal(periods: GradingPeriodDraft[]): number {
    return sumWeights(periods);
}

export function componentTotal(period: GradingPeriodDraft): number {
    return sumWeights(period.components);
}