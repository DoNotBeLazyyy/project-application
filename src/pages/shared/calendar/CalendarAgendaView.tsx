import ValidCommonInput from '@components/input/ValidCommonInput';
import {
    CalendarBlankIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    MapPinIcon
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from './calendar.types';

interface CalendarAgendaViewProps {
    events: UnifiedCalendarEvent[];
    onSelectEvent: (event: UnifiedCalendarEvent) => void;
}

interface DateGroup {
    dateKey: string;
    date: Date;
    events: UnifiedCalendarEvent[];
}

function formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarAgendaView({
    events,
    onSelectEvent
}: CalendarAgendaViewProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const categoryMap = useMemo(() => {
        return new Map(CALENDAR_CATEGORIES.map((c) => [c.id, c]));
    }, []);

    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return events;
        const q = searchQuery.toLowerCase();
        return events.filter(
            (ev) =>
                ev.title.toLowerCase().includes(q) ||
                ev.description?.toLowerCase().includes(q) ||
                ev.location?.toLowerCase().includes(q) ||
                ev.metadata?.courseCode?.toLowerCase().includes(q)
        );
    }, [events, searchQuery]);

    // Group events by date key
    const groupedEvents = useMemo(() => {
        const groups = new Map<string, DateGroup>();

        // Sort events chronologically
        const sorted = [...filteredEvents].sort((a, b) => a.start.getTime() - b.start.getTime());

        for (const ev of sorted) {
            const key = formatDateKey(ev.start);
            if (!groups.has(key)) {
                groups.set(key, {
                    dateKey: key,
                    date: new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()),
                    events: []
                });
            }
            groups.get(key)!.events.push(ev);
        }

        return Array.from(groups.values());
    }, [filteredEvents]);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col">
            {/* Search Header */}
            <div className="p-3 sm:p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                <div className="relative flex-1 w-full sm:max-w-md">
                    <input
                        className="w-full px-3.5 py-2 pl-9 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        placeholder="Search items, instructors, or rooms..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <MagnifyingGlassIcon
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        size={16}
                    />
                </div>

                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 shrink-0 self-end sm:self-auto">
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'result' : 'results'}
                </div>
            </div>

            {/* List Body */}
            <div className="p-3 sm:p-4 divide-y divide-neutral-200/60 dark:divide-neutral-800/60 space-y-4">
                {groupedEvents.length === 0 ? (
                    <div className="p-12 text-center text-neutral-400 dark:text-neutral-500 flex flex-col items-center justify-center">
                        <CalendarBlankIcon className="mb-2 opacity-50" size={40} />
                        <p className="font-semibold text-sm">No scheduled items found</p>
                        <p className="text-xs mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    groupedEvents.map((group) => {
                        const dayName = group.date.toLocaleDateString('en-US', { weekday: 'long' });
                        const fullDateStr = group.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });

                        return (
                            <div key={group.dateKey} className="pt-4 first:pt-0">
                                {/* Date Section Header */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="font-bold text-sm text-neutral-900 dark:text-white">
                                        {dayName}
                                    </div>
                                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                        • {fullDateStr}
                                    </div>
                                    <div className="h-px bg-neutral-200 dark:bg-neutral-800 flex-1 ml-2" />
                                </div>

                                {/* Events List */}
                                <div className="space-y-2">
                                    {group.events.map((ev) => {
                                        const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                                        const timeStr = ev.allDay
                                            ? 'All Day'
                                            : `${ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${ev.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

                                        return (
                                            <div
                                                key={ev.id}
                                                className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${cat.bgClass}`}
                                                onClick={() => onSelectEvent(ev)}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`w-2 h-2 rounded-full ${cat.dotClass}`} />
                                                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                                                            {ev.title}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/30 font-medium border border-neutral-200/50 dark:border-neutral-700/50">
                                                            {cat.label}
                                                        </span>
                                                        {ev.metadata?.assessmentType && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-medium">
                                                                {ev.metadata.assessmentType}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {ev.description && (
                                                        <div className="text-xs mt-1.5 text-neutral-600 dark:text-neutral-300 line-clamp-2">
                                                            {ev.description}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4 text-xs shrink-0 text-neutral-500 dark:text-neutral-400">
                                                    <span className="inline-flex items-center gap-1 font-medium">
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
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
