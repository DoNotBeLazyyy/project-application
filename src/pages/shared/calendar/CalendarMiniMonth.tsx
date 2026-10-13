import { CalendarDay } from '@type/common/calendar.type';
import { changeMonthUtil, getCalendarDays } from '@utils/calendar.util';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';

interface CalendarMiniMonthProps {
    date: Date;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onChangeMonth: (newDate: Date) => void;
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function CalendarMiniMonth({
    date,
    selectedDate,
    onSelectDate,
    onChangeMonth
}: CalendarMiniMonthProps) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const days = useMemo(() => {
        return getCalendarDays(year, month);
    }, [year, month]);

    const monthLabel = date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-2xs">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {monthLabel}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        aria-label="Previous month"
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        type="button"
                        onClick={() => onChangeMonth(changeMonthUtil(date, -1))}
                    >
                        <CaretLeftIcon size={14} />
                    </button>
                    <button
                        aria-label="Next month"
                        className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        type="button"
                        onClick={() => onChangeMonth(changeMonthUtil(date, 1))}
                    >
                        <CaretRightIcon size={14} />
                    </button>
                </div>
            </div>

            {/* Weekday initials */}
            <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                {WEEKDAY_INITIALS.map((init, i) => (
                    <div key={i}>{init}</div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
                {days.map((d: CalendarDay, idx: number) => {
                    const dayDate = new Date(d.date + 'T00:00:00');
                    const isSelected =
                        selectedDate.getFullYear() === dayDate.getFullYear() &&
                        selectedDate.getMonth() === dayDate.getMonth() &&
                        selectedDate.getDate() === dayDate.getDate();

                    return (
                        <button
                            key={`${d.date}-${idx}`}
                            className={`w-7 h-7 mx-auto rounded-full text-xs flex items-center justify-center transition-colors ${
                                !d.isCurrentMonth
                                    ? 'text-neutral-300 dark:text-neutral-600'
                                    : d.isToday
                                      ? 'bg-blue-600 text-white font-bold'
                                      : isSelected
                                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold'
                                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            }`}
                            type="button"
                            onClick={() => onSelectDate(dayDate)}
                        >
                            {d.day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
