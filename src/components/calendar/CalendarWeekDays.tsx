import { classMerge } from '@utils/css.util';

/**
 * CalendarWeekDays
 *
 * Renders the weekday headers (Sun–Sat) for the calendar grid.
 * Each day is displayed in a fixed-width column and styled for readability.
 *
 * @example
 * <CalendarWeekDays />
 */
export default function CalendarWeekDays() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Array of weekday abbreviations

    return (
        <div
            className={
                classMerge(
                    'font-[700] grid grid-cols-7 leading-[20px] mb-[12px] text-[16px] text-center text-[#71717A]'
                )
            }
        >
            {days.map((d) => (
                <div key={d}>{d}</div>
            ))}
        </div>
    );
}