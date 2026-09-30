import FileAttachmentList from '@components/attachment/FileAttachmentList';
import { CommonChip } from '@components/badge/CommonChip';
import RichContentReader from '@components/editor/RichContentReader';
import CommonModal from '@components/modal/CommonModal';
import {
    PaperclipIcon,
    PushPinIcon,
    UserIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAnnouncementById } from '@services/announcement.service';
import { AnnouncementAudience, AnnouncementDetail, AnnouncementFeedRow, AttachmentInputDto } from '@type/announcement.type';
import { useEffect, useState } from 'react';

export interface AnnouncementDetailModalProps {
    announcement?: AnnouncementFeedRow | null;
    announcementId?: string | null;
    onClose: () => void;
}

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
    Faculty: 'Faculty only',
    Global: 'Everyone',
    Section: 'Section only',
    Student: 'Students only'
};

function formatFullDateTime(stamp: string): string {
    if (!stamp) return '';
    const d = new Date(stamp);
    return Number.isNaN(d.getTime())
        ? stamp
        : d.toLocaleString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
}

export function AnnouncementDetailModal({
    announcement,
    announcementId,
    onClose
}: AnnouncementDetailModalProps) {
    const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const targetId = announcement?.id || announcementId;

    useEffect(() => {
        if (!targetId) {
            setDetail(null);
            setError(null);
            return;
        }

        let isMounted = true;
        setIsLoading(!announcement);

        getAnnouncementById(targetId)
            .then((res) => {
                if (isMounted) {
                    if (res.data) {
                        setDetail(res.data);
                    } else if (res.error && !announcement) {
                        setError(res.error.message || 'Failed to load announcement details.');
                    }
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    if (!announcement) {
                        setError(err?.message || 'Failed to load announcement details.');
                    }
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [targetId, announcement]);

    if (!targetId) return null;

    const publishedDate = detail?.published_at ?? detail?.created_at ?? announcement?.published_at ?? announcement?.created_at ?? '';
    const content = detail?.content || announcement?.content || '';
    const attachments: AttachmentInputDto[] = (detail?.attachments as AttachmentInputDto[]) || announcement?.attachments || [];
    const title = detail?.title || announcement?.title || 'Announcement Details';
    const isPinned = detail?.is_pinned ?? announcement?.is_pinned ?? false;
    const audience = detail?.target_audience ?? announcement?.target_audience ?? 'Global';
    const authorName = detail?.author_name ?? announcement?.author_name ?? 'System';

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
                <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                        {isPinned && (
                            <span className="bg-(--mui-palette-warning-main)/10 flex font-medium gap-1 items-center px-2 py-0.5 rounded text-(--mui-palette-warning-main) text-xs">
                                <PushPinIcon size={14} weight="fill" />
                                Pinned
                            </span>
                        )}
                        <CommonChip
                            label={AUDIENCE_LABELS[audience] || audience}
                            variant="light"
                        />
                    </div>
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg sm:text-xl break-words">
                        {title}
                    </h2>
                </div>
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
                        Loading announcement...
                    </div>
                )}

                {error && !isLoading && (
                    <div className="p-4 rounded bg-red-50 text-red-600 text-xs">
                        {error}
                    </div>
                )}

                {!isLoading && (
                    <>
                        <div className="border-(--mui-palette-divider) border-b flex flex-wrap gap-4 pb-3 text-(--mui-palette-text-secondary) text-xs">
                            <div className="flex gap-1.5 items-center">
                                <UserIcon size={14} />
                                <span>Posted by <strong className="font-medium text-(--mui-palette-text-primary)">{authorName}</strong></span>
                            </div>
                            {publishedDate && (
                                <div>
                                    <span>{formatFullDateTime(publishedDate)}</span>
                                </div>
                            )}
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
                    </>
                )}
            </div>
        </CommonModal>
    );
}

export default AnnouncementDetailModal;
