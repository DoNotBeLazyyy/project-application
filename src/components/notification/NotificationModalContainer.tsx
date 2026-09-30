import AnnouncementDetailModal from '@components/modal/AnnouncementDetailModal';
import EventDetailModal from '@components/modal/EventDetailModal';
import { useSearchParams } from 'react-router-dom';

export default function NotificationModalContainer() {
    const [searchParams, setSearchParams] = useSearchParams();

    const announcementId = searchParams.get('announcementId') || searchParams.get('announcement');
    const eventId = searchParams.get('eventId') || searchParams.get('event');

    function handleCloseAnnouncement() {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('announcementId');
                next.delete('announcement');
                return next;
            },
            { replace: true }
        );
    }

    function handleCloseEvent() {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('eventId');
                next.delete('event');
                return next;
            },
            { replace: true }
        );
    }

    return (
        <>
            {announcementId && (
                <AnnouncementDetailModal
                    announcementId={announcementId}
                    onClose={handleCloseAnnouncement}
                />
            )}
            {eventId && (
                <EventDetailModal
                    eventId={eventId}
                    onClose={handleCloseEvent}
                />
            )}
        </>
    );
}
