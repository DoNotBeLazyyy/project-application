/**
 * Converts a Date object to a string in YYYY-MM-DD format (Canada locale).
 *
 * @returns
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-CA');
}

export function isPastDateTime(value: string): boolean {
    if (!value) return false;

    const parsed = new Date(value)
        .getTime();

    if (Number.isNaN(parsed)) return false;

    return parsed < Date.now();
}