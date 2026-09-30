import FileAttachmentList from '@components/attachment/FileAttachmentList';
import RichContentReader from '@components/editor/RichContentReader';
import CommonModal from '@components/modal/CommonModal';
import {
    ClockIcon,
    MapPinIcon,
    PaperclipIcon,
    UsersThreeIcon,
    XIcon
} from '@phosphor-icons/react';
import { getEventById } from '@services/event.service';
import { AttachmentInputDto } from '@type/announcement.type';
import { EventDetail, EventFeedRow } from '@type/event.type';
import { ReactNode, useEffect, useState } from 'react';

export interface EventDetailModalProps {
    event?: EventFeedRow | null;
    eventId?: string | null;
    onClose: () => void;
}

interface EventDetailFieldProps {
    icon: ReactNode;
    label: string;
    value: string;
}

function formatEventRange(eventLike: { start_at?: string; end_at?: string | null; all_day?: boolean }): string {
    if (!eventLike.start_at) return '—';
    const start = new Date(eventLike.start_at);
    if (Number.isNaN(start.getTime())) return '—';

    const startLabel = eventLike.all_day
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

    if (!eventLike.end_at) {
        return startLabel;
    }

    const end = new Date(eventLike.end_at);
    if (Number.isNaN(end.getTime())) return startLabel;

    const isSameDay = start.toDateString() === end.toDateString();

    if (eventLike.all_day) {
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

export function EventDetailModal({ event, eventId, onClose }: EventDetailModalProps) {
    const [detail, setDetail] = useState<EventDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const targetId = event?.id || eventId;

    useEffect(() => {
        if (!targetId) {
            setDetail(null);
            setError(null);
            return;
        }

        let isMounted = true;
        setIsLoading(!event);

        getEventById(targetId)
            .then((res) => {
                if (isMounted) {
                    if (res.data) {
                        setDetail(res.data);
                    } else if (res.error && !event) {
                        setError(res.error.message || 'Failed to load event details.');
                    }
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (!event) {
                        setError(err?.message || 'Failed to load event details.');
                    }
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [targetId, event]);

    if (!targetId) return null;

    const title = detail?.title || event?.title || 'Event Details';
    const description = detail?.description || event?.description || '';
    const location = detail?.location || event?.location || '';
    const targetAudience = detail?.target_audience || event?.target_audience || 'Global';
    const startAt = detail?.start_at || event?.start_at || '';
    const endAt = detail?.end_at || event?.end_at || null;
    const allDay = detail?.all_day ?? event?.all_day ?? false;
    const attachments: AttachmentInputDto[] = (detail?.attachments as AttachmentInputDto[]) || event?.attachments || [];

    return (
        <CommonModal
            cardProps={{
                className: 'flex flex-col max-h-[100dvh] sm:max-h-[85dvh] w-full max-w-2xl p-0 overflow-hidden',
                sx: {
                    gap: '0 !important',
                    p: '0 !important'
                }
            }}
            fullWidth
            maxWidth="md"
            open={Boolean(targetId)}
            onClose={onClose}
        >
            <div className="border-(--mui-palette-divider) border-b flex gap-3 items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 shrink-0">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg sm:text-xl break-words min-w-0 flex-1">
                    {title}
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
                {isLoading && (
                    <div className="py-8 text-center text-sm text-(--mui-palette-text-secondary)">
                        Loading event...
                    </div>
                )}

                {error && !isLoading && (
                    <div className="p-4 rounded bg-red-50 text-red-600 text-xs">
                        {error}
                    </div>
                )}

                {!isLoading && (
                    <>
                        <div className="bg-(--mui-palette-action-hover)/20 border border-(--mui-palette-divider) rounded-xl p-4 flex flex-col gap-3">
                            <EventDetailField
                                icon={<ClockIcon size={16} />}
                                label="When"
                                value={formatEventRange({ all_day: allDay, end_at: endAt, start_at: startAt })}
                            />
                            {location && (
                                <EventDetailField
                                    icon={<MapPinIcon size={16} />}
                                    label="Where"
                                    value={location}
                                />
                            )}
                            <EventDetailField
                                icon={<UsersThreeIcon size={16} />}
                                label="Audience"
                                value={targetAudience}
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
                    </>
                )}
            </div>
        </CommonModal>
    );
}

export default EventDetailModal;
