/**
 * Converts a Date object to a string in YYYY-MM-DD format (Canada locale).
 *
 * @returns A string representing the date in 'YYYY-MM-DD' format.
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-CA');
}