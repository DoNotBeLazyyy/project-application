import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from '@pages/shared/calendar/calendar.types';
import { useMemo } from 'react';

interface CalendarWeekViewProps {
    currentDate: Date;
    events: UnifiedCalendarEvent[];
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onSelectEvent: (event: UnifiedCalendarEvent) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

function isSameDay(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear()
        && d1.getMonth() === d2.getMonth()
        && d1.getDate() === d2.getDate()
    );
}

function isDateInRange(target: Date, start: Date, end: Date): boolean {
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate())
        .getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
        .getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
        .getTime();
    return t >= s && t <= e;
}

export function CalendarWeekView({
    currentDate,
    events,
    selectedDate,
    onSelectDate,
    onSelectEvent
}: CalendarWeekViewProps) {
    const today = useMemo(() => new Date(), []);

    // Calculate the 7 days of the current week (Sunday to Saturday)
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });
    }, [currentDate]);

    const categoryMap = useMemo(() => {
        return new Map(CALENDAR_CATEGORIES.map((c) => [c.id, c]));
    }, []);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-x-auto flex flex-col flex-1 min-h-0">
            <div className="min-w-[620px] flex-1 min-h-0 flex flex-col">
                {/* Header: Weekdays */}
                <div className="grid grid-cols-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-800/50 shrink-0">
                    <div className="p-3 text-center text-xs font-semibold text-neutral-400 dark:text-neutral-500 border-r border-neutral-200/80 dark:border-neutral-800">
                    Time
                    </div>
                    {weekDays.map((d) => {
                        const isToday = isSameDay(d, today);
                        const isSelected = isSameDay(d, selectedDate);

                        return (
                            <div
                                className={`p-2.5 text-center cursor-pointer transition-colors border-r last:border-r-0 border-neutral-200/80 dark:border-neutral-800 ${
                                    isSelected
                                        ? 'bg-brand-50/40 dark:bg-brand-950/30'
                                        : 'hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30'
                                }`}
                                key={d.toISOString()}
                                onClick={() => onSelectDate(d)}
                            >
                                <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div
                                    className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full mt-1 ${
                                        isToday
                                            ? 'bg-blue-600 text-white'
                                            : isSelected
                                                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                                                : 'text-neutral-800 dark:text-neutral-200'
                                    }`}
                                >
                                    {d.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* All Day Banner Row */}
                <div className="grid grid-cols-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 text-xs shrink-0">
                    <div className="p-2 text-center text-[11px] font-medium text-neutral-400 border-r border-neutral-200/80 dark:border-neutral-800">
                    All-day
                    </div>
                    {weekDays.map((d) => {
                        const allDayEvents = events.filter((ev) => ev.allDay && isDateInRange(d, ev.start, ev.end));

                        return (
                            <div
                                className="p-1.5 space-y-1 min-h-[36px] border-r last:border-r-0 border-neutral-200/80 dark:border-neutral-800"
                                key={`all-day-${d.toISOString()}`}
                            >
                                {allDayEvents.map((ev) => {
                                    const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                                    return (
                                        <button
                                            aria-label={ev.title}
                                            className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-medium border ${cat.bgClass}`}
                                            key={ev.id}
                                            type="button"
                                            onClick={() => onSelectEvent(ev)}
                                        >
                                            {ev.title}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>

                {/* Hourly Schedule Body */}
                <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                    {HOURS.map((hour) => {
                        const hourLabel = `${hour % 12 === 0
                            ? 12
                            : hour % 12} ${hour >= 12
                            ? 'PM'
                            : 'AM'}`;

                        return (
                            <div
                                className="grid grid-cols-8 min-h-[56px]"
                                key={hour}
                            >
                                {/* Hour label */}
                                <div className="p-2 text-right pr-3 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 border-r border-neutral-200/80 dark:border-neutral-800 select-none">
                                    {hourLabel}
                                </div>

                                {/* 7 Columns for the week */}
                                {weekDays.map((d) => {
                                    const timedEvents = events.filter((ev) => {
                                        if (ev.allDay) return false;
                                        if (!isSameDay(ev.start, d)) return false;
                                        return ev.start.getHours() === hour;
                                    });

                                    return (
                                        <div
                                            className="p-1 space-y-1 border-r last:border-r-0 border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                                            key={`cell-${hour}-${d.toISOString()}`}
                                        >
                                            {timedEvents.map((ev) => {
                                                const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                                                const timeString = `${ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${ev.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

                                                return (
                                                    <button
                                                        aria-label={`${ev.title} ${timeString}`}
                                                        className={`w-full text-left p-1.5 rounded-lg text-xs font-semibold border flex flex-col gap-0.5 transition-transform hover:scale-[1.02] shadow-2xs ${cat.bgClass}`}
                                                        key={ev.id}
                                                        type="button"
                                                        onClick={() => onSelectEvent(ev)}
                                                    >
                                                        <span className="truncate leading-tight">{ev.title}</span>
                                                        <span className="text-[10px] opacity-75 font-normal leading-none truncate">
                                                            {timeString}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}