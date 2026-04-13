/**
 * Converts a Date object to a string in YYYY-MM-DD format (Canada locale).
 *
 * @returns
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-CA');
}