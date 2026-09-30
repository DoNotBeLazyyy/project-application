import FileAttachmentList from '@components/attachment/FileAttachmentList';
import { CommonChip } from '@components/badge/CommonChip';
import RichContentReader from '@components/editor/RichContentReader';
import {
    CalendarBlankIcon,
    ClockCountdownIcon,
    PaperclipIcon,
    PushPinIcon,
    UserIcon,
    UsersThreeIcon
} from '@phosphor-icons/react';
import { AnnouncementAudience, AnnouncementFormValues } from '@type/announcement.type';

interface AnnouncementViewerCardProps {
    values: AnnouncementFormValues;
}

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
    Faculty: 'Faculty only',
    Global: 'Everyone (Global)',
    Section: 'Specific Sections',
    Student: 'Students only'
};

function formatExpiryDate(value: string): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
}

/**
 * AnnouncementViewerCard
 *
 * Renders an announcement exactly as end-viewers (students, faculty) will see it:
 * clean typography, author metadata, badges, formatted rich text, and attachment cards.
 */
export default function AnnouncementViewerCard({ values }: AnnouncementViewerCardProps) {
    const audienceLabel = AUDIENCE_LABELS[values.target_audience] ?? values.target_audience;
    const hasAttachments = Boolean(values.attachments && values.attachments.length > 0);
    const hasSections = values.target_audience === 'Section' && values.sections && values.sections.length > 0;
    const formattedExpiry = values.expires_at ? formatExpiryDate(values.expires_at) : '';

    return (
        <article className="flex flex-col gap-6 max-w-4xl mx-auto py-2 w-full">
            {/* Top Badges & Meta */}
            <div className="flex flex-wrap gap-2.5 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                    {values.is_pinned && (
                        <span className="bg-(--mui-palette-warning-main)/10 border border-(--mui-palette-warning-main)/20 flex font-medium gap-1.5 items-center px-2.5 py-1 rounded-full text-(--mui-palette-warning-main) text-xs">
                            <PushPinIcon size={14} weight="fill" />
                            Pinned Announcement
                        </span>
                    )}
                    <CommonChip
                        label={audienceLabel}
                        variant="light"
                    />
                </div>

                {formattedExpiry && (
                    <div className="flex gap-1.5 items-center text-(--mui-palette-text-secondary) text-xs">
                        <ClockCountdownIcon size={14} />
                        <span>Expires on <strong className="font-medium text-(--mui-palette-text-primary)">{formattedExpiry}</strong></span>
                    </div>
                )}
            </div>

            {/* Headline Title */}
            <h1 className="font-bold leading-tight text-(--mui-palette-text-primary) text-2xl sm:text-3xl tracking-tight break-words">
                {values.title || 'Untitled Announcement'}
            </h1>

            {/* Author and Date Meta Bar */}
            <div className="bg-(--mui-palette-action-hover)/30 border border-(--mui-palette-divider) flex flex-wrap gap-4 items-center justify-between p-3.5 rounded-xl">
                <div className="flex gap-3 items-center">
                    <div className="bg-(--mui-tokens-color-brand-50,rgba(2,33,121,0.08)) flex h-9 items-center justify-center rounded-full text-(--mui-palette-primary-main) w-9">
                        <UserIcon size={18} weight="bold" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Posted by
                        </span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {values.author_name || 'System'}
                        </span>
                    </div>
                </div>

                {values.posted_on && (
                    <div className="flex gap-2 items-center text-(--mui-palette-text-secondary) text-xs">
                        <CalendarBlankIcon size={16} />
                        <span>{values.posted_on}</span>
                    </div>
                )}
            </div>

            {/* Target Sections (if audience is Section) */}
            {hasSections && (
                <div className="flex flex-col gap-2">
                    <span className="flex font-medium gap-1.5 items-center text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider">
                        <UsersThreeIcon size={16} />
                        Targeted Sections ({values.sections!.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {values.sections!.map(function(section) {
                            const label = section.course_code
                                ? `${section.course_code} · ${section.code}`
                                : section.code;

                            return (
                                <span
                                    className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) font-medium px-2.5 py-1 rounded-md text-(--mui-palette-text-primary) text-xs"
                                    key={section.id}
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content Divider */}
            <hr className="border-(--mui-palette-divider) my-1" />

            {/* Main Rich Content */}
            <div className="min-h-[120px] w-full">
                <RichContentReader
                    content={values.content}
                    emptyPlaceholder="No announcement content provided."
                />
            </div>

            {/* Attachments Section */}
            {hasAttachments && (
                <div className="border-(--mui-palette-divider) border-t flex flex-col gap-3 mt-4 pt-5">
                    <h3 className="flex font-semibold gap-2 items-center text-(--mui-palette-text-primary) text-sm">
                        <PaperclipIcon size={16} weight="bold" />
                        <span>Attachments ({values.attachments!.length})</span>
                    </h3>
                    <FileAttachmentList
                        attachments={values.attachments!}
                        bucket="materials"
                    />
                </div>
            )}
        </article>
    );
}
