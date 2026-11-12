// One way to show a period or course grade on every screen.

const VISIBLE_STATUSES = ['Approved', 'Released'];

/**
 * Text for a grade. A special grade (INC, DRP, W, ...) wins over the number, and numbers
 * always show two decimals ("1.50", not "1.5").
 *
 * @param value - Transmuted or final grade, as a number or numeric text.
 * @param specialGrade - Special grade code, when one was given.
 * @param fallback - Text when there is no grade.
 */
export function formatGrade(
    value: number | string | null | undefined,
    specialGrade?: string | null,
    fallback = '—'
): string {
    if (specialGrade) return specialGrade;

    if (value === null || value === undefined || value === '') return fallback;

    const numeric = Number(value);

    return Number.isNaN(numeric)
        ? String(value)
        : numeric.toFixed(2);
}

/**
 * Text for a GWA, always with two decimals ("1.75"), or a dash when there is none.
 *
 * @param value - The GWA, as a number or numeric text.
 */
export function formatGwa(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';

    const numeric = Number(value);

    return Number.isNaN(numeric)
        ? '—'
        : numeric.toFixed(2);
}

interface GradeReleaseInfo {
    evaluation_completed?: boolean | null;
    status?: string | null;
}

/**
 * Whether the student may see a period grade, matching fn_list_my_grades: the grade is
 * Approved or Released and the student finished the faculty evaluation. Rows without a
 * status (My Grades only returns Approved or Released rows) depend on the evaluation alone.
 */
export function isGradeReleased(item: GradeReleaseInfo): boolean {
    const isVisibleStatus = item.status === undefined || item.status === null
        ? true
        : VISIBLE_STATUSES.includes(item.status);

    return isVisibleStatus && item.evaluation_completed === true;
}