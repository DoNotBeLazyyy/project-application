import FileAttachmentList from '@components/attachment/FileAttachmentList';
import { CommonChip } from '@components/badge/CommonChip';
import CommonCard from '@components/card/CommonCard';
import RichContentReader from '@components/editor/RichContentReader';
import CommonModal from '@components/modal/CommonModal';
import {
    MegaphoneIcon,
    PaperclipIcon,
    PushPinIcon,
    UserIcon,
    WarningCircleIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAnnouncementById } from '@services/announcement.service';
import { AnnouncementAudience, AnnouncementDetail, AnnouncementFeedRow, AttachmentInputDto } from '@type/announcement.type';
import { useEffect, useState } from 'react';

interface AnnouncementsFeedCardProps {
    announcements: AnnouncementFeedRow[];
    error?: string | null;
}

interface AnnouncementDetailModalProps {
    announcement: AnnouncementFeedRow | null;
    onClose: () => void;
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

function formatFullDateTime(stamp: string): string {
    return new Date(stamp)
        .toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
}

function AnnouncementDetailModal({ announcement, onClose }: AnnouncementDetailModalProps) {
    const [detail, setDetail] = useState<AnnouncementDetail | null>(null);

    useEffect(() => {
        if (!announcement?.id) {
            setDetail(null);
            return;
        }

        let isMounted = true;
        getAnnouncementById(announcement.id)
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
    }, [announcement?.id]);

    if (!announcement) return null;

    const publishedDate = announcement.published_at ?? announcement.created_at;
    const content = detail?.content || announcement.content || '';
    const attachments: AttachmentInputDto[] = (detail?.attachments as AttachmentInputDto[]) || announcement.attachments || [];

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-5 max-h-[85dvh] max-w-full overflow-y-auto p-4 sm:p-6' }}
            fullScreen={false}
            fullWidth
            maxWidth="md"
            open={Boolean(announcement)}
            onClose={onClose}
        >
            <div className="flex gap-3 items-start justify-between">
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                        {announcement.is_pinned && (
                            <span className="bg-(--mui-palette-warning-main)/10 flex font-medium gap-1 items-center px-2 py-0.5 rounded text-(--mui-palette-warning-main) text-xs">
                                <PushPinIcon size={14} weight="fill" />
                                Pinned
                            </span>
                        )}
                        <CommonChip
                            label={AUDIENCE_LABELS[announcement.target_audience]}
                            variant="light"
                        />
                    </div>
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg sm:text-xl">
                        {announcement.title}
                    </h2>
                </div>
                <button
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded shrink-0 text-(--mui-palette-text-secondary) transition-colors cursor-pointer"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            <div className="border-(--mui-palette-divider) border-b border-t flex flex-wrap gap-4 py-3 text-(--mui-palette-text-secondary) text-xs">
                <div className="flex gap-1.5 items-center">
                    <UserIcon size={14} />
                    <span>Posted by <strong className="font-medium text-(--mui-palette-text-primary)">{announcement.author_name ?? 'System'}</strong></span>
                </div>
                <div>
                    <span>{formatFullDateTime(publishedDate)}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <span className="text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider font-semibold">
                    Content
                </span>
                <div className="min-h-[80px] w-full">
                    <RichContentReader
                        content={content}
                        emptyPlaceholder="No announcement content provided."
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
        </CommonModal>
    );
}

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