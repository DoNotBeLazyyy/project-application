import { UnifiedCalendarEvent } from '@pages/shared/calendar/calendar.types';

const FIRST_HOUR = 6;
const LAST_HOUR = 22;

/**
 * Hour rows for the week and day grids: 6 AM to 10 PM, widened to fit the earliest and
 * latest timed item so early or late classes are never hidden.
 */
export function getVisibleHours(events: UnifiedCalendarEvent[]): number[] {
    let first = FIRST_HOUR;
    let last = LAST_HOUR;

    events.forEach(function(ev) {
        if (ev.allDay) return;
        const hour = ev.start.getHours();
        first = Math.min(first, hour);
        last = Math.max(last, hour);
    });

    return Array.from({ length: last - first + 1 }, (_, i) => i + first);
}