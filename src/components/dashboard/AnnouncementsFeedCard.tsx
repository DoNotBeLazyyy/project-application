import { CommonChip } from '@components/badge/CommonChip';
import CommonCard from '@components/card/CommonCard';
import { AnnouncementDetailModal } from '@components/modal/AnnouncementDetailModal';
import {
    MegaphoneIcon,
    PaperclipIcon,
    PushPinIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { AnnouncementAudience, AnnouncementFeedRow } from '@type/announcement.type';
import { useState } from 'react';

interface AnnouncementsFeedCardProps {
    announcements: AnnouncementFeedRow[];
    error?: string | null;
}

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
    Faculty: 'Faculty only',
    Global: 'Everyone',
    Section: 'Section only',
    Student: 'Students only'
};

function formatPublishedAt(announcement: AnnouncementFeedRow): string {
    const stamp = announcement.published_at ?? announcement.created_at;

    return new Date(stamp)
        .toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
}

export { AnnouncementDetailModal };

export default function AnnouncementsFeedCard({ announcements, error }: AnnouncementsFeedCardProps) {
    const [detailAnnouncement, setDetailAnnouncement] = useState<AnnouncementFeedRow | null>(null);

    function handleClose() {
        setDetailAnnouncement(null);
    }

    return (
        <CommonCard
            cardHeaderProps={{
                subheader: 'The latest posts addressed to you.',
                title: 'Announcements'
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
                            Announcements could not be loaded.
                        </p>
                        <p className="m-0 text-(--mui-palette-text-secondary) text-xs">
                            {error}
                        </p>
                    </div>
                )}
                {!error && announcements.length === 0 && (
                    <div className="flex flex-col gap-2 items-center py-6">
                        <MegaphoneIcon
                            className="text-(--mui-palette-text-disabled)"
                            size={28}
                        />
                        <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                            No announcements right now.
                        </p>
                    </div>
                )}
                {announcements.map((announcement) => {
                    const hasAttachments = Boolean(
                        (announcement.attachment_count && announcement.attachment_count > 0) ||
                        (announcement.attachments && announcement.attachments.length > 0)
                    );
                    const attachmentCount = announcement.attachment_count || announcement.attachments?.length || 0;

                    return (
                        <button
                            className="border border-(--mui-palette-divider) cursor-pointer flex flex-col gap-1.5 hover:bg-(--mui-palette-action-hover) hover:border-(--mui-palette-primary-main) p-3 rounded-lg text-left transition-colors w-full"
                            key={announcement.id}
                            title={announcement.title}
                            type="button"
                            onClick={() => setDetailAnnouncement(announcement)}
                        >
                            <div className="flex gap-2 items-center w-full">
                                {announcement.is_pinned && (
                                    <PushPinIcon
                                        className="shrink-0 text-(--mui-palette-warning-main)"
                                        size={16}
                                        weight="fill"
                                    />
                                )}
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                    {announcement.title}
                                </span>
                                <div className="ml-auto shrink-0">
                                    <CommonChip
                                        label={AUDIENCE_LABELS[announcement.target_audience]}
                                        variant="light"
                                    />
                                </div>
                            </div>
                            <p className="line-clamp-2 m-0 text-(--mui-palette-text-secondary) text-xs">
                                {announcement.content}
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                <span className="text-(--mui-palette-text-disabled) text-xs">
                                    {announcement.author_name ?? 'System'} · {formatPublishedAt(announcement)}
                                </span>
                                {hasAttachments && (
                                    <span className="inline-flex items-center gap-1 text-(--mui-palette-primary-main) text-xs font-medium shrink-0">
                                        <PaperclipIcon size={13} weight="bold" />
                                        <span>
                                            {attachmentCount} {attachmentCount === 1 ? 'file' : 'files'}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            <AnnouncementDetailModal
                announcement={detailAnnouncement}
                onClose={handleClose}
            />
        </CommonCard>
    );
}