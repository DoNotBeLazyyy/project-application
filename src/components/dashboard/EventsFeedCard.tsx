import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonCard from '@components/card/CommonCard';
import CommonModal from '@components/modal/CommonModal';
import {
    CalendarBlankIcon,
    ClockIcon,
    MapPinIcon,
    UsersThreeIcon,
    XIcon
} from '@phosphor-icons/react';
import { EventFeedRow } from '@type/event.type';
import { ReactNode, useState } from 'react';

interface EventsFeedCardProps {
    events: EventFeedRow[];
}

interface EventDetailModalProps {
    event: EventFeedRow | null;
    onClose: () => void;
}

interface EventDetailFieldProps {
    icon: ReactNode;
    label: string;
    value: string;
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

function formatEventRange(event: EventFeedRow): string {
    const start = new Date(event.start_at);
    const startLabel = event.all_day
        ? start.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : start.toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });

    if (!event.end_at) {
        return startLabel;
    }

    const end = new Date(event.end_at);
    const isSameDay = start.toDateString() === end.toDateString();

    if (event.all_day) {
        if (isSameDay) {
            return startLabel;
        }

        return `${startLabel} — ${end.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })}`;
    }

    const endLabel = isSameDay
        ? end.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit'
        })
        : end.toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });

    return `${startLabel} — ${endLabel}`;
}

function EventDetailField({ icon, label, value }: EventDetailFieldProps) {
    return (
        <div className="flex gap-3 items-start">
            <span className="mt-0.5 shrink-0 text-(--mui-palette-text-disabled)">
                {icon}
            </span>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                    {label}
                </span>
                <span className="text-(--mui-palette-text-primary) text-sm">
                    {value}
                </span>
            </div>
        </div>
    );
}

function EventDetailModal({ event, onClose }: EventDetailModalProps) {
    if (!event) return null;

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-5 max-h-[85dvh] max-w-full overflow-y-auto p-4 sm:p-6' }}
            fullWidth
            maxWidth="sm"
            open={Boolean(event)}
            onClose={onClose}
        >
            <div className="flex gap-3 items-start justify-between">
                <div className="flex flex-col gap-2 min-w-0">
                    <CommonBadgeStatus
                        label={event.all_day
                            ? 'All Day'
                            : 'Scheduled'}
                        variant="info"
                    />
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        {event.title}
                    </h2>
                </div>
                <button
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded shrink-0 text-(--mui-palette-text-secondary) transition-colors"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <EventDetailField
                    icon={<ClockIcon size={16} />}
                    label="When"
                    value={formatEventRange(event)}
                />
                {event.location && (
                    <EventDetailField
                        icon={<MapPinIcon size={16} />}
                        label="Where"
                        value={event.location}
                    />
                )}
                <EventDetailField
                    icon={<UsersThreeIcon size={16} />}
                    label="Audience"
                    value={event.target_audience}
                />
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                    Description
                </span>
                <p className="m-0 text-(--mui-palette-text-primary) text-sm whitespace-pre-wrap">
                    {event.description ?? 'No further details were provided for this event.'}
                </p>
            </div>
        </CommonModal>
    );
}

export default function EventsFeedCard({ events }: EventsFeedCardProps) {
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
                    </button>
                ))}
            </div>
            <EventDetailModal
                event={detailEvent}
                onClose={handleClose}
            />
        </CommonCard>
    );
}