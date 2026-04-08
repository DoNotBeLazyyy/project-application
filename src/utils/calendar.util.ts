export interface CalendarDay {
    // Numeric day of the month (1–31)
    day: number;

    // Full date string in YYYY-MM-DD format
    date: string;

    // Indicates whether the day belongs to the currently displayed month
    isCurrentMonth: boolean;

    // Indicates whether this day is today
    isToday: boolean;
}

/**
 * Converts a Date object to a string in YYYY-MM-DD format (Canada locale).
 *
 * @param date - The Date object to format.
 * @returns A string representing the date in 'YYYY-MM-DD' format.
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString('en-CA');
}

export function getCalendarDays(
    year: number,
    month: number
): CalendarDay[] {
    const today = new Date(); // Current date to mark 'isToday'
    const firstDay = new Date(year, month, 1)
        .getDay(); // Weekday of the 1st day of the month (0=Sun)
    const lastDate = new Date(year, month + 1, 0)
        .getDate(); // Last date of the current month
    const prevLastDate = new Date(year, month, 0)
        .getDate(); // Last date of the previous month
    const days: CalendarDay[] = []; // Array to hold all calendar day objects

    for (let i = firstDay - 1; i >= 0; i--) {
        const d = prevLastDate - i;
        const dateObj = new Date(year, month - 1, d);

        days.push({
            day: d,
            date: formatDate(dateObj),
            isCurrentMonth: false,
            isToday: false
        });
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateObj = new Date(year, month, d);

        days.push({
            day: d,
            date: formatDate(dateObj),
            isCurrentMonth: true,
            isToday:
                today.toDateString() === dateObj.toDateString()
        });
    }

    const total = days.length > 35
        ? 42
        : 35;

    for (let i = 1; days.length < total; i++) {
        const dateObj = new Date(year, month + 1, i);

        days.push({
            day: i,
            date: formatDate(dateObj),
            isCurrentMonth: false,
            isToday: false
        });
    } // Ensure the calendar grid has 35 or 42 days (5 or 6 weeks)

    return days;
}