// One way to show when an event happens, used by every event detail view.

const LOCALE = 'en-PH';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit'
};

/**
 * Turns a date value into a Date, or null when it is missing or not a real date.
 */
function toValidDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;

    const date = value instanceof Date
        ? value
        : new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

/**
 * Text for an event's date range, e.g. "Friday, 6 November 2026, 9:00 AM – 11:00 AM".
 *
 * @param start - When the event starts.
 * @param end - When the event ends, if it has an end.
 * @param isAllDay - Whether the event takes the whole day.
 * @returns The range text, or a dash when there is no start.
 */
export function formatEventDateRange(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined,
    isAllDay: boolean
): string {
    const startDate = toValidDate(start);
    if (!startDate) return '—';

    const endDate = toValidDate(end);
    const startDay = startDate.toLocaleDateString(LOCALE, DATE_OPTIONS);
    const endDay = endDate?.toLocaleDateString(LOCALE, DATE_OPTIONS) ?? startDay;

    if (isAllDay) {
        return startDay === endDay
            ? `${startDay} (All Day)`
            : `${startDay} – ${endDay} (All Day)`;
    }

    const startTime = startDate.toLocaleTimeString(LOCALE, TIME_OPTIONS);
    if (!endDate) return `${startDay}, ${startTime}`;

    const endTime = endDate.toLocaleTimeString(LOCALE, TIME_OPTIONS);

    return startDay === endDay
        ? `${startDay}, ${startTime} – ${endTime}`
        : `${startDay}, ${startTime} – ${endDay}, ${endTime}`;
}