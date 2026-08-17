import { CommonChip } from '@components/badge/CommonChip';
import CommonCard from '@components/card/CommonCard';
import { MegaphoneIcon, PushPinIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { AnnouncementAudience, AnnouncementFeedRow } from '@type/announcement.type';

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

export default function AnnouncementsFeedCard({ announcements, error }: AnnouncementsFeedCardProps) {
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
                {announcements.map((announcement) => (
                    <div
                        className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3 rounded-lg"
                        key={announcement.id}
                    >
                        <div className="flex gap-2 items-center">
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
                        <span className="text-(--mui-palette-text-disabled) text-xs">
                            {announcement.author_name ?? 'System'} · {formatPublishedAt(announcement)}
                        </span>
                    </div>
                ))}
            </div>
        </CommonCard>
    );
}