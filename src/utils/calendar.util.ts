import { CalendarDay } from '@type/common/calendar.type';
import { formatDate } from '@utils/date.util';

/**
 * getCalendarDays
 *
 * Generates all days for a given month, including the necessary
 * previous and next month days to fill the calendar grid (5 or 6 weeks).
 * Marks which day is today and which days belong to the current month.
 *
 * @returns An array of CalendarDay objects covering the calendar grid.
 *
 * @example
 * const days = getCalendarDays(2026, 3);
 */
export function getCalendarDays(
    // The year used to generate the calendar
    year: number,

    // The month index (0–11), where 0 = January and 11 = December.
    month: number
): CalendarDay[] {
    const today = new Date(); // Current date
    const firstDayIdx = new Date(year, month, 1)
        .getDay(); // Day of week index (0 = Sunday, 6 = Saturday) for the 1st day of the month
    const lastDate = new Date(year, month + 1, 0)
        .getDate(); // Total number of days in the given month
    const totalSlots = (firstDayIdx + lastDate) > 35
        ? 42
        : 35; // Determines calendar grid size (5 weeks = 35 slots, 6 weeks = 42 slots)
    const days: CalendarDay[] = []; // Array that will store all calendar day objects

    for (let index = 0; index < totalSlots; index++) {
        const dateObj = new Date(year, month, index - firstDayIdx + 1);
        const isCurrentMonth = dateObj.getMonth() === (month + 12) % 12;

        days.push({
            day: dateObj.getDate(),
            date: formatDate(dateObj),
            isCurrentMonth: isCurrentMonth,
            isToday: today.toDateString() === dateObj.toDateString()
        });
    }

    return days;
}

/**
 * changeMonthUtil
 *
 * Returns a new Date shifted by a given number of months.
 *
 * @param currentDate - The base Date to shift from.
 * @param direction - Number of months to move (e.g., 1 = next month, -1 = previous month).
 * @returns A new Date object set to the first day of the computed month.
 *
 * @example
 * const nextMonth = changeMonthUtil(new Date(2026, 3, 15), 1); // May 1, 2026
 * const prevMonth = changeMonthUtil(new Date(2026, 3, 15), -1); // March 1, 2026
 */
export function changeMonthUtil(
    currentDate: Date,
    direction: number
): Date {
    return new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + direction,
        1
    );
}