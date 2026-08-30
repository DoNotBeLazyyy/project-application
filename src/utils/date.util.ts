/**
 * Converts a Date object to a string in YYYY-MM-DD format (Canada locale).
 *
 * @returns
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-CA');
}

/**
 * Formats an ISO date/datetime string for display on a card, e.g. "Aug 30, 2025".
 * Returns an em dash for empty or unparseable input so callers can render it directly.
 */
export function formatShortDate(value: string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function isPastDateTime(value: string): boolean {
    if (!value) return false;

    const parsed = new Date(value)
        .getTime();

    if (Number.isNaN(parsed)) return false;

    return parsed < Date.now();
}