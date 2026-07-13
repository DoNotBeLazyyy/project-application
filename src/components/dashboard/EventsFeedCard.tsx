import CommonCard from '@components/card/CommonCard';
import { CalendarBlankIcon, MapPinIcon } from '@phosphor-icons/react';
import { EventFeedRow } from '@type/event.type';

interface EventsFeedCardProps {
    events: EventFeedRow[];
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

export default function EventsFeedCard({ events }: EventsFeedCardProps) {
    return (
        <CommonCard
            cardHeaderProps={{
                subheader: 'What is coming up in the next 30 days.',
                title: 'Upcoming Events'
            }}
            className="flex flex-1 flex-col"
        >
            <div className="flex flex-col gap-2 p-4 pt-0">
                {events.length === 0 && (
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
                {events.map((event) => (
                    <div
                        className="border border-(--mui-palette-divider) flex gap-3 items-start p-3 rounded-lg"
                        key={event.id}
                    >
                        <div className="bg-(--mui-palette-primary-light) flex h-9 items-center justify-center rounded-lg shrink-0 w-9">
                            <CalendarBlankIcon
                                className="text-(--mui-palette-primary-main)"
                                size={18}
                                weight="bold"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                {event.title}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {formatEventStart(event)}
                            </span>
                            {event.location && (
                                <span className="flex gap-1 items-center text-(--mui-palette-text-disabled) text-xs">
                                    <MapPinIcon size={12} />
                                    {event.location}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </CommonCard>
    );
}