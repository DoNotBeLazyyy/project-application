import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from '@pages/shared/calendar/calendar.types';
import {
    CalendarDotsIcon,
    CaretRightIcon,
    ClockIcon,
    MapPinIcon,
    PlusIcon,
    XIcon
} from '@phosphor-icons/react';
import { useMemo } from 'react';

export interface CalendarDayEventsModalProps {
    canCreateEvent?: boolean;
    date: Date | null;
    events: UnifiedCalendarEvent[];
    open: boolean;
    onClose: VoidFunction;
    onCreateEvent?: (date: Date) => void;
    onSelectEvent: (event: UnifiedCalendarEvent) => void;
    onViewDay?: (date: Date) => void;
}

/**
 * CalendarDayEventsModal
 *
 * Responsive popup modal listing all scheduled events for a selected date.
 * When an event in the list is selected, opens the full event detail modal.
 * Optimized for mobile viewports down to 360px with touch-friendly cards.
 */
export function CalendarDayEventsModal({
    canCreateEvent = false,
    date,
    events,
    open,
    onClose,
    onCreateEvent,
    onSelectEvent,
    onViewDay
}: CalendarDayEventsModalProps) {
    const categoryMap = useMemo(() => {
        return new Map(CALENDAR_CATEGORIES.map((c) => [c.id, c]));
    }, []);

    const formattedDate = useMemo(() => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, [date]);

    if (!date || !open) return null;

    return (
        <CommonModal
            aria-labelledby="day-events-title"
            cardProps={{
                className: 'p-0! overflow-hidden rounded-2xl w-full max-w-md mx-auto',
                sx: { p: '0 !important', overflow: 'hidden' }
            }}
            closeOnBackdropClick
            closeOnEscape
            disableEscapeKeyDown={false}
            fullScreen={false}
            maxWidth="xs"
            open={open}
            onClose={onClose}
        >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col w-full">
                {/* Header */}
                <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800/80 flex items-start justify-between gap-3 bg-neutral-50/60 dark:bg-neutral-800/40">
                    <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                            <CalendarDotsIcon
                                size={18}
                                weight="duotone"
                            />
                        </div>
                        <div className="min-w-0">
                            <h2
                                className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-tight break-words"
                                id="day-events-title"
                            >
                                {formattedDate}
                            </h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                                {events.length} {events.length === 1
                                    ? 'event scheduled'
                                    : 'events scheduled'}
                            </p>
                        </div>
                    </div>
                    <button
                        aria-label="Close"
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 shrink-0 cursor-pointer"
                        type="button"
                        onClick={onClose}
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Event List */}
                <div className="p-3 sm:p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
                    {events.length === 0
                        ? (
                            <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">
                                No events scheduled for this day
                            </div>
                        )
                        : (
                            events.map((ev) => {
                                const cat = categoryMap.get(ev.category) || CALENDAR_CATEGORIES[0];
                                const timeLabel = ev.allDay
                                    ? 'All day'
                                    : `${ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${ev.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

                                return (
                                    <button
                                        className="w-full text-left p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/40 hover:border-blue-500/70 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 hover:shadow-xs transition-all cursor-pointer group flex flex-col gap-1.5"
                                        key={ev.id}
                                        type="button"
                                        onClick={() => onSelectEvent(ev)}
                                    >
                                        {/* Category badge & Time */}
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border ${cat.bgClass}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${cat.dotClass}`} />
                                                {cat.label}
                                            </span>

                                            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1 shrink-0">
                                                <ClockIcon size={12} />
                                                {timeLabel}
                                            </span>
                                        </div>

                                        {/* Title & Chevron */}
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {ev.title}
                                            </h3>
                                            <CaretRightIcon
                                                className="text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0"
                                                size={16}
                                            />
                                        </div>

                                        {/* Location */}
                                        {ev.location && (
                                            <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                                                <MapPinIcon
                                                    className="shrink-0"
                                                    size={12}
                                                />
                                                <span className="truncate">{ev.location}</span>
                                            </div>
                                        )}

                                        {/* Description */}
                                        {ev.description && (
                                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                                                {ev.description}
                                            </p>
                                        )}
                                    </button>
                                );
                            })
                        )}
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-neutral-50/80 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        {onViewDay && (
                            <button
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onViewDay(date);
                                }}
                            >
                                View Day Schedule →
                            </button>
                        )}
                        {canCreateEvent && onCreateEvent && (
                            <CommonButton
                                color="primary"
                                size="small"
                                startIcon={(
                                    <PlusIcon
                                        size={14}
                                        weight="bold"
                                    />
                                )}
                                variant="contained"
                                onClick={() => {
                                    onClose();
                                    onCreateEvent(date);
                                }}
                            >
                                Add Event
                            </CommonButton>
                        )}
                    </div>
                    <CommonButton
                        className="ml-auto"
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Close
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}