import { listMyAnnouncementsFeed } from '@services/announcement.service';
import { listMyEventsFeed } from '@services/event.service';
import { AnnouncementFeedRow } from '@type/announcement.type';
import { EventFeedRow } from '@type/event.type';
import { useCallback, useEffect, useState } from 'react';

const ANNOUNCEMENT_LIMIT = 5;
const EVENT_WINDOW_DAYS = 30;

interface UseDashboardFeedsResult {
    announcements: AnnouncementFeedRow[];
    events: EventFeedRow[];
    refresh: () => Promise<void>;
}

export default function useDashboardFeeds(): UseDashboardFeedsResult {
    const [announcements, setAnnouncements] = useState<AnnouncementFeedRow[]>([]);
    const [events, setEvents] = useState<EventFeedRow[]>([]);

    const refresh = useCallback(async function() {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + EVENT_WINDOW_DAYS);

        const [announcementResult, eventResult] = await Promise.all([
            listMyAnnouncementsFeed(1, ANNOUNCEMENT_LIMIT, ''),
            listMyEventsFeed(from.toISOString(), to.toISOString())
        ]);

        if (announcementResult.data) {
            setAnnouncements(announcementResult.data.content ?? []);
        }
        if (eventResult.data) {
            setEvents(eventResult.data);
        }
    }, []);

    useEffect(function() {
        refresh();
    }, [refresh]);

    useEffect(function() {
        function handleVisibilityChange() {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        }

        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return function() {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refresh]);

    return { announcements, events, refresh };
}