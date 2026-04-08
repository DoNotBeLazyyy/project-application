import CalendarCellDate from '@components/calendar/CalendarCellDate';
import { CalendarDay } from '@utils/calendar.util';
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
export default function CalendarCell({
    day
}: CalendarCellProps) {
    const isMuted = !day.isCurrentMonth; // Determines if the day is outside the current month

    return (
        <div
            className={
                classMerge(
                    'bg-[#F4F4F5] duration-200 flex flex-col min-h-[120px] min-w-[160px] p-[8px] rounded-[16px] transition-colors',
                    isMuted
                        ? 'opacity-40'
                        : 'cursor-pointer hover:bg-[#c6dcfc] hover:outline hover:outline-[#5192f5]'
                )
            }
        >
            <div className="flex gap-[10px] truncate">
                <CalendarCellDate
                    day={day.day}
                    isToday={day.isToday}
                />
            </div>
        </div>
    );
}