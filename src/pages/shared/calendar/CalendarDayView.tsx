import {
    ClockIcon,
    MapPinIcon
} from '@phosphor-icons/react';
import { useMemo } from 'react';
import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from './calendar.types';

interface CalendarDayViewProps {
    date: Date;
    events: UnifiedCalendarEvent[];
    onSelectEvent: (event: UnifiedCalendarEvent) => void;
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7 AM to 9 PM

function isSameDay(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

function isDateInRange(target: Date, start: Date, end: Date): boolean {
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t >= s && t <= e;
}

export function CalendarDayView({
    date,
    events,
    onSelectEvent
}: CalendarDayViewProps) {
    const categoryMap = useMemo(() => {
        return new Map(CALENDAR_CATEGORIES.map((c) => [c.id, c]));
    }, []);

    const allDayEvents = useMemo(() => {
        return events.filter((ev) => ev.allDay && isDateInRange(date, ev.start, ev.end));
    }, [events, date]);

    const timedEvents = useMemo(() => {
        return events.filter((ev) => !ev.allDay && isSameDay(ev.start, date));
    }, [events, date]);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
            {/* All-Day Events Section */}
            {allDayEvents.length > 0 && (
                <div className="p-4 bg-neutral-50/40 dark:bg-neutral-800/20 border-b border-neutral-200/80 dark:border-neutral-800 space-y-2 shrink-0">
                    <div className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        All-Day Items & Milestones
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {allDayEvents.map((ev) => {
                            const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                            return (
                                <div
                                    key={ev.id}
                                    className={`p-3 rounded-xl border cursor-pointer hover:shadow-xs transition-transform hover:scale-[1.01] ${cat.bgClass}`}
                                    onClick={() => onSelectEvent(ev)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${cat.dotClass}`} />
                                        <span className="font-semibold text-sm">{ev.title}</span>
                                    </div>
                                    {ev.description && (
                                        <p className="text-xs mt-1 opacity-80 line-clamp-2">
                                            {ev.description}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Hourly Schedule Timeline */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                {HOURS.map((hour) => {
                    const hourLabel = `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
                    const slotEvents = timedEvents.filter((ev) => ev.start.getHours() === hour);

                    return (
                        <div key={hour} className="flex min-h-[72px] group">
                            {/* Time Axis */}
                            <div className="w-16 sm:w-24 p-2 sm:p-3 text-right pr-2 sm:pr-4 text-[11px] sm:text-xs font-semibold text-neutral-400 dark:text-neutral-500 border-r border-neutral-200/80 dark:border-neutral-800 shrink-0 select-none bg-neutral-50/30 dark:bg-neutral-900/30">
                                {hourLabel}
                            </div>

                            {/* Slot Content */}
                            <div className="flex-1 p-2 space-y-2 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                                {slotEvents.length === 0 ? (
                                    <div className="h-full" />
                                ) : (
                                    slotEvents.map((ev) => {
                                        const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                                        const timeStr = `${ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${ev.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

                                        return (
                                            <div
                                                key={ev.id}
                                                className={`p-3 rounded-xl border cursor-pointer transition-transform hover:scale-[1.01] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${cat.bgClass}`}
                                                onClick={() => onSelectEvent(ev)}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${cat.dotClass}`} />
                                                        <span className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                                                            {ev.title}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 font-medium">
                                                            {cat.label}
                                                        </span>
                                                    </div>

                                                    {ev.description && (
                                                        <div className="text-xs mt-1 text-neutral-600 dark:text-neutral-300">
                                                            {ev.description}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs shrink-0 text-neutral-500 dark:text-neutral-400">
                                                    <span className="inline-flex items-center gap-1">
                                                        <ClockIcon size={14} />
                                                        {timeStr}
                                                    </span>
                                                    {ev.location && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPinIcon size={14} />
                                                            {ev.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
