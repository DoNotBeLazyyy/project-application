import CommonCard from '@components/card/CommonCard';
import { EventDetailModal } from '@components/modal/EventDetailModal';
import {
    CalendarBlankIcon,
    MapPinIcon,
    PaperclipIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { EventFeedRow } from '@type/event.type';
import { useState } from 'react';

interface EventsFeedCardProps {
    events: EventFeedRow[];
    error?: string | null;
}

function formatEventStart(event: EventFeedRow): string {
    const start = new Date(event.start_at);

    if (event.all_day) {
        return start.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    }

    return start.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

export { EventDetailModal };

export default function EventsFeedCard({ events, error }: EventsFeedCardProps) {
    const [detailEvent, setDetailEvent] = useState<EventFeedRow | null>(null);

    function handleClose() {
        setDetailEvent(null);
    }

    return (
        <CommonCard
            cardHeaderProps={{
                subheader: 'What is coming up in the next 30 days.',
                title: 'Upcoming Events'
            }}
            className="flex flex-1 flex-col"
        >
            <div className="flex flex-col gap-2 p-4 pt-0">
                {error && (
                    <div className="flex flex-col gap-2 items-center py-6">
                        <WarningCircleIcon
                            className="text-(--mui-palette-error-main)"
                            size={28}
                            weight="fill"
                        />
                        <p className="m-0 text-(--mui-palette-error-main) text-sm">
                            Upcoming events could not be loaded.
                        </p>
                        <p className="m-0 text-(--mui-palette-text-secondary) text-xs">
                            {error}
                        </p>
                    </div>
                )}
                {!error && events.length === 0 && (
                    <div className="flex flex-col gap-2 items-center py-6">
                        <CalendarBlankIcon
                            className="text-(--mui-palette-text-disabled)"
                            size={28}
                        />
                        <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                            No upcoming events.
                        </p>
                    </div>
                )}
                {events.map((event) => {
                    const hasAttachments = Boolean(
                        (event.attachment_count && event.attachment_count > 0) ||
                        (event.attachments && event.attachments.length > 0)
                    );
                    const attachmentCount = event.attachment_count || event.attachments?.length || 0;

                    return (
                        <button
                            className="border border-(--mui-palette-divider) cursor-pointer flex gap-3 hover:bg-(--mui-palette-action-hover) hover:border-(--mui-palette-primary-main) items-start p-3 rounded-lg text-left transition-colors w-full"
                            key={event.id}
                            title={event.title}
                            type="button"
                            onClick={() => setDetailEvent(event)}
                        >
                            <div className="bg-(--mui-palette-primary-light) flex h-9 items-center justify-center rounded-lg shrink-0 w-9">
                                <CalendarBlankIcon
                                    className="text-(--mui-palette-primary-main)"
                                    size={18}
                                    weight="bold"
                                />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                    {event.title}
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    {formatEventStart(event)}
                                </span>
                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                    {event.location ? (
                                        <span className="flex gap-1 items-center text-(--mui-palette-text-disabled) text-xs truncate">
                                            <MapPinIcon size={12} />
                                            {event.location}
                                        </span>
                                    ) : (
                                        <span />
                                    )}
                                    {hasAttachments && (
                                        <span className="inline-flex items-center gap-1 text-(--mui-palette-primary-main) text-xs font-medium shrink-0 ml-auto">
                                            <PaperclipIcon size={13} weight="bold" />
                                            <span>
                                                {attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            <EventDetailModal
                event={detailEvent}
                onClose={handleClose}
            />
        </CommonCard>
    );
}