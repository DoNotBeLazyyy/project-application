/**
 * Reformats a raw term label into a compact display form.
 *
 * The backend emits `term_label` as `"<term type> - <school year>"`, e.g.
 * `"1st Semester - School Year 2025-2026"`. This condenses it to
 * `"1st sem (AY. 2025 - 2026)"` for tight surfaces like grid cards.
 *
 * Falls back to the original string when it does not match the expected shape.
 *
 * @param rawLabel - The label as returned by the API.
 * @returns The condensed label, or the input unchanged when unparseable.
 */
export function formatTermLabel(rawLabel: string | null | undefined): string {
    if (!rawLabel) {
        return '';
    }

    const [termPart, ...rest] = rawLabel.split(' - ');
    const remainder = rest.join(' - ');

    const term = termPart
        .trim()
        .replace(/semester/i, 'sem')
        .toLowerCase();

    const source = remainder || rawLabel;
    const yearMatch = source.match(/(\d{4})\s*[-–]\s*(\d{4})/);

    if (yearMatch) {
        return yearMatch[1] === yearMatch[2]
            ? `${term} (AY. ${yearMatch[1]})`
            : `${term} (AY. ${yearMatch[1]} - ${yearMatch[2]})`;
    }

    const singleYear = source.match(/(\d{4})/);

    if (singleYear) {
        return `${term} (AY. ${singleYear[1]})`;
    }

    return remainder
        ? `${term} (${remainder.trim()})`
        : term;
}