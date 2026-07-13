import { listMyAnnouncementsFeed } from '@services/announcement.service';
import { listMyEventsFeed } from '@services/event.service';
import { AnnouncementFeedRow } from '@type/announcement.type';
import { EventFeedRow } from '@type/event.type';
import { useEffect, useState } from 'react';

const ANNOUNCEMENT_LIMIT = 5;
const EVENT_WINDOW_DAYS = 30;

interface UseDashboardFeedsResult {
    announcements: AnnouncementFeedRow[];
    events: EventFeedRow[];
}

export default function useDashboardFeeds(): UseDashboardFeedsResult {
    const [announcements, setAnnouncements] = useState<AnnouncementFeedRow[]>([]);
    const [events, setEvents] = useState<EventFeedRow[]>([]);

    useEffect(function() {
        async function fetchFeeds() {
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
        }

        fetchFeeds();
    }, []);

    return { announcements, events };
}