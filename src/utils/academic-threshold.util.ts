import { AcademicThreshold, AcademicThresholdCategory } from '@type/academic-threshold.type';

/** Presentation order of the three threshold families, used by filters and sorting. */
export const ACADEMIC_THRESHOLD_CATEGORIES: AcademicThresholdCategory[] = [
    'Honor',
    'Scholarship',
    'Standing'
];

export const ACADEMIC_THRESHOLD_CATEGORY_DESCRIPTION: Record<AcademicThresholdCategory, string> = {
    Honor: 'Latin honor cutoffs. A student qualifies for the highest honor whose GWA ceiling they meet.',
    Scholarship: 'Academic scholarship cutoffs and the tuition discount awarded at each tier.',
    Standing: 'The passing GWA ceiling used to derive Good Standing versus Probation.'
};

/** A GWA always reads with two decimals ("1.00", not "1"), the way the registrar writes it. */
export function formatGwa(value: number | null): string {
    if (value === null || Number.isNaN(Number(value))) {
        return '\u2014';
    }

    return Number(value)
        .toFixed(2);
}

/**
 * The band a threshold covers. A row without a minimum (Standing, and the top
 * of any open-ended ladder) is a ceiling rather than a range, so it reads as
 * an upper bound ("at most 3.00") instead of borrowing a floor it lacks.
 */
export function formatGwaBand(minGwa: number | null, maxGwa: number): string {
    if (minGwa === null) {
        return `\u2264 ${formatGwa(maxGwa)}`;
    }

    return `${formatGwa(minGwa)} \u2013 ${formatGwa(maxGwa)}`;
}

export function hasThresholdDiscount(threshold: AcademicThreshold): boolean {
    return threshold.scholarship_discount_pct !== null
        && Number(threshold.scholarship_discount_pct) > 0;
}

export function formatThresholdDiscount(threshold: AcademicThreshold): string {
    if (!hasThresholdDiscount(threshold)) {
        return 'Not applicable';
    }

    return `${Number(threshold.scholarship_discount_pct)}%`;
}

/**
 * The rule spelled out as a sentence. The card and the table both carry the raw
 * numbers; this is what an admin reads to confirm the numbers mean what they
 * think they mean before editing them.
 */
export function describeAcademicThreshold(threshold: AcademicThreshold): string {
    const band = threshold.min_gwa === null
        ? `is ${formatGwa(threshold.max_gwa)} or better`
        : `falls between ${formatGwa(threshold.min_gwa)} and ${formatGwa(threshold.max_gwa)}`;

    const sentences = [`Applies when the general weighted average ${band}.`];

    if (threshold.requires_no_failing) {
        sentences.push('A failing grade in any subject disqualifies the student.');
    }

    if (hasThresholdDiscount(threshold)) {
        sentences.push(
            `Qualifying students receive a ${Number(threshold.scholarship_discount_pct)}% tuition discount.`
        );
    }

    return sentences.join(' ');
}