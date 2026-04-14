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
                    'flex font-(--mui-tokens-fontWeight-bold) h-7 items-center justify-center p-(--mui-tokens-spacing-2) text-(--mui-tokens-fontSize-nm) w-7',
                    isToday
                        ? 'bg-(--mui-tokens-color-brand-900) rounded-(--mui-tokens-radius-full) text-(--mui-tokens-color-common-white)'
                        : 'text-(--mui-tokens-color-neutral-900)'
                )
            }
        >
            {day}
        </div>
    );
}