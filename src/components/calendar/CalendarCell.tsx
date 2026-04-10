import CalendarCellDate from '@components/calendar/CalendarCellDate';
import { CalendarDay } from '@type/common/calendar.type';
import { classMerge } from '@utils/css.util';

interface CalendarCellProps {
    // Represents a single day in the calendar, including date and flags
    day: CalendarDay;
}

/**
 * CalendarCell
 *
 * A single day cell within the calendar grid. Displays the numeric day,
 * highlights today, and dims days outside the current month. Supports
 * hover and click styles for interactive days.
 *
 * @example
 * <CalendarCell
 *  day={{ day: 15, date: '2026-04-15', isCurrentMonth: true, isToday: false }}
 * />
 */
export default function CalendarCell({ day }: CalendarCellProps) {
    const cellStateClass = !day.isCurrentMonth
        ? 'opacity-40'
        : 'cursor-pointer hover:bg-[var(--mui-tokens-color-secondary-light)] hover:outline hover:outline-[var(--mui-tokens-color-secondary-main)]'; // Dim non-current month days, add hover/click styles for current month days

    return (
        <div
            className={
                classMerge(
                    'bg-[var(--mui-tokens-color-neutral-100)] duration-200 flex flex-col min-h-[7.5rem] min-w-[10rem] p-[var(--mui-tokens-spacing-3)] rounded-[var(--mui-tokens-radius-md)] transition-colors',
                    cellStateClass
                )
            }
        >
            <div className="flex gap-[var(--mui-tokens-spacing-4)] truncate">
                <CalendarCellDate
                    day={day.day}
                    isToday={day.isToday}
                />
            </div>
        </div>
    );
}