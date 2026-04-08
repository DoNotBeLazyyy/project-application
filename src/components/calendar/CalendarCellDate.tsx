import { classMerge } from '@utils/css.util';

interface DayNumberProps {
    // Numeric day of the month to display
    day: number;

    // Flag indicating if this day is today (optional)
    isToday?: boolean;
}

/**
 * CalendarCellDate
 *
 * Renders a single day number within a calendar cell.
 * Highlights the day if it is today and applies default styling otherwise.
 *
 * @example
 * <CalendarCellDate day={15} isToday={true} />
 */
export default function CalendarCellDate({
    day,
    isToday = false
}: DayNumberProps) {
    return (
        <div
            className={
                classMerge(
                    'flex font-[700] h-[28px] items-center justify-center p-[4px] text-[16px] w-[28px]',
                    isToday
                        ? 'bg-[#022179] rounded-full text-[#FFFFFF]'
                        : 'text-[#18181B]'
                )
            }
        >
            {day}
        </div>
    );
}