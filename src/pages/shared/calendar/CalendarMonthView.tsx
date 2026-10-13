import { CalendarDay } from '@type/common/calendar.type';
import { getCalendarDays } from '@utils/calendar.util';
import { useMemo } from 'react';
import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from './calendar.types';

interface CalendarMonthViewProps {
    currentDate: Date;
    events: UnifiedCalendarEvent[];
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onSelectEvent: (event: UnifiedCalendarEvent) => void;
    onViewDay: (date: Date) => void;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isDateInRange(target: Date, start: Date, end: Date): boolean {
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t >= s && t <= e;
}

export function CalendarMonthView({
    currentDate,
    events,
    selectedDate,
    onSelectDate,
    onSelectEvent,
    onViewDay
}: CalendarMonthViewProps) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarDays = useMemo(() => {
        return getCalendarDays(year, month);
    }, [year, month]);

    const categoryMap = useMemo(() => {
        return new Map(CALENDAR_CATEGORIES.map((c) => [c.id, c]));
    }, []);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/40 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 py-3">
                {WEEKDAY_NAMES.map((d, idx) => (
                    <div
                        key={d}
                        className={idx === 0 || idx === 6 ? 'text-neutral-400 dark:text-neutral-500' : ''}
                    >
                        {d}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200/70 dark:divide-neutral-800/70 bg-neutral-100/40 dark:bg-neutral-900/40">
                {calendarDays.map((dayItem: CalendarDay, index: number) => {
                    const cellDate = new Date(dayItem.date + 'T00:00:00');
                    const isSelected =
                        selectedDate.getFullYear() === cellDate.getFullYear() &&
                        selectedDate.getMonth() === cellDate.getMonth() &&
                        selectedDate.getDate() === cellDate.getDate();

                    // Filter events occurring on this date
                    const dayEvents = events.filter((ev) => isDateInRange(cellDate, ev.start, ev.end));
                    const visibleEvents = dayEvents.slice(0, 3);
                    const overflowCount = dayEvents.length - 3;

                    return (
                        <div
                            key={`${dayItem.date}-${index}`}
                            className={`min-h-[110px] md:min-h-[125px] p-2 flex flex-col transition-colors cursor-pointer group bg-white dark:bg-neutral-900 ${
                                !dayItem.isCurrentMonth ? 'opacity-40 bg-neutral-50/60 dark:bg-neutral-950/40' : ''
                            } ${isSelected ? 'ring-2 ring-inset ring-brand-500/80 bg-brand-50/20 dark:bg-brand-950/20' : 'hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40'}`}
                            onClick={() => onSelectDate(cellDate)}
                        >
                            {/* Cell Header */}
                            <div className="flex items-center justify-between mb-1.5">
                                <span
                                    className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full transition-transform ${
                                        dayItem.isToday
                                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                                            : isSelected
                                              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold'
                                              : 'text-neutral-700 dark:text-neutral-300 group-hover:scale-110'
                                    }`}
                                >
                                    {dayItem.day}
                                </span>

                                {dayEvents.length > 0 && (
                                    <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                                        {dayEvents.length} {dayEvents.length === 1 ? 'item' : 'items'}
                                    </span>
                                )}
                            </div>

                            {/* Event Chips */}
                            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                {visibleEvents.map((ev) => {
                                    const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                                    const timeLabel = ev.allDay
                                        ? 'All day'
                                        : ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

                                    return (
                                        <button
                                            key={ev.id}
                                            aria-label={`${ev.title} at ${timeLabel}`}
                                            className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-transform hover:scale-[1.02] shadow-2xs ${cat.bgClass}`}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectEvent(ev);
                                            }}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.dotClass}`} />
                                            <span className="truncate font-semibold">{ev.title}</span>
                                            {!ev.allDay && (
                                                <span className="text-[9px] opacity-75 shrink-0 ml-auto hidden md:inline">
                                                    {timeLabel}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}

                                {overflowCount > 0 && (
                                    <button
                                        className="text-left text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onViewDay(cellDate);
                                        }}
                                    >
                                        +{overflowCount} more
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
