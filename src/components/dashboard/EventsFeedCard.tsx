import FileAttachmentList from '@components/attachment/FileAttachmentList';
import CommonCard from '@components/card/CommonCard';
import RichContentReader from '@components/editor/RichContentReader';
import CommonModal from '@components/modal/CommonModal';
import {
    CalendarBlankIcon,
    ClockIcon,
    MapPinIcon,
    PaperclipIcon,
    UsersThreeIcon,
    WarningCircleIcon,
    XIcon
} from '@phosphor-icons/react';
import { getEventById } from '@services/event.service';
import { AttachmentInputDto } from '@type/announcement.type';
import { EventDetail, EventFeedRow } from '@type/event.type';
import { ReactNode, useEffect, useState } from 'react';

interface EventsFeedCardProps {
    events: EventFeedRow[];
    error?: string | null;
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
                <span className="text-(--mui-palette-text-secondary) text-xs uppercase font-medium">
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
    const [detail, setDetail] = useState<EventDetail | null>(null);

    useEffect(() => {
        if (!event?.id) {
            setDetail(null);
            return;
        }

        let isMounted = true;
        getEventById(event.id)
            .then((res) => {
                if (isMounted && res.data) {
                    setDetail(res.data);
                }
            })
            .catch(() => {
                // Keep fallback row data
            });

        return () => {
            isMounted = false;
        };
    }, [event?.id]);

    if (!event) return null;

    const description = detail?.description || event.description || '';
    const attachments: AttachmentInputDto[] = (detail?.attachments as AttachmentInputDto[]) || event.attachments || [];

    return (
        <CommonModal
            cardProps={{
                className: 'flex flex-col max-h-[85dvh] w-full max-w-2xl p-0 overflow-hidden',
                sx: {
                    gap: '0 !important',
                    maxWidth: '42rem !important',
                    p: '0 !important'
                }
            }}
            fullScreen={false}
            fullWidth
            maxWidth="md"
            open={Boolean(event)}
            onClose={onClose}
        >
            <div className="border-(--mui-palette-divider) border-b flex gap-3 items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 shrink-0">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg sm:text-xl break-words min-w-0 flex-1">
                    {event.title}
                </h2>
                <button
                    aria-label="Close"
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded shrink-0 text-(--mui-palette-text-secondary) transition-colors cursor-pointer"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-5 min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="bg-(--mui-palette-action-hover)/20 border border-(--mui-palette-divider) rounded-xl p-4 flex flex-col gap-3">
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

                <div className="flex flex-col gap-2">
                    <span className="text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider font-semibold">
                        Description
                    </span>
                    <div className="min-h-[80px] w-full">
                        <RichContentReader
                            content={description}
                            emptyPlaceholder="No further details were provided for this event."
                        />
                    </div>
                </div>

                {attachments.length > 0 && (
                    <div className="border-(--mui-palette-divider) border-t flex flex-col gap-3 pt-4">
                        <span className="flex font-semibold gap-1.5 items-center text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider">
                            <PaperclipIcon size={15} weight="bold" />
                            Attachments ({attachments.length})
                        </span>
                        <FileAttachmentList
                            attachments={attachments}
                            bucket="materials"
                        />
                    </div>
                )}
            </div>
        </CommonModal>
    );
}

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