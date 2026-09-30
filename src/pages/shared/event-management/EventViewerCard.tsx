import FileAttachmentList from '@components/attachment/FileAttachmentList';
import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import RichContentReader from '@components/editor/RichContentReader';
import {
    CalendarBlankIcon,
    ClockIcon,
    MapPinIcon,
    PaperclipIcon,
    UserIcon,
    UsersThreeIcon
} from '@phosphor-icons/react';
import { AnnouncementAudience } from '@type/announcement.type';
import { EventFormValues } from '@type/event.type';
import { ReactNode } from 'react';

interface EventViewerCardProps {
    values: EventFormValues;
}

interface EventMetaTileProps {
    children?: ReactNode;
    icon: ReactNode;
    label: string;
    value?: string;
}

function formatEventDisplayRange(startAt: string, endAt: string): string {
    if (!startAt) {
        return '—';
    }

    const start = new Date(startAt);

    if (Number.isNaN(start.getTime())) {
        return startAt;
    }

    const startLabel = start.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    if (!endAt) {
        return startLabel;
    }

    const end = new Date(endAt);

    if (Number.isNaN(end.getTime())) {
        return startLabel;
    }

    const isSameDay = start.toDateString() === end.toDateString();

    if (isSameDay) {
        return startLabel;
    }

    const endLabel = end.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return `${startLabel} — ${endLabel}`;
}

function EventMetaTile({ children, icon, label, value }: EventMetaTileProps) {
    return (
        <div className="bg-(--mui-palette-action-hover)/30 border border-(--mui-palette-divider) flex gap-3.5 items-start p-3.5 rounded-xl">
            <div className="bg-(--mui-tokens-color-brand-50,rgba(2,33,121,0.08)) flex h-9 items-center justify-center rounded-lg shrink-0 text-(--mui-palette-primary-main) w-9">
                {icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-semibold text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider">
                    {label}
                </span>
                {value && (
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                        {value}
                    </span>
                )}
                {children}
            </div>
        </div>
    );
}

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
    Faculty: 'Faculty only',
    Global: 'Everyone (Global)',
    Section: 'Specific Sections',
    Student: 'Students only'
};

/**
 * EventViewerCard
 *
 * Renders an event exactly as end-viewers (students, faculty, guests) see it:
 * highlights for date, location, target audience, rich description, and attachments.
 */
export default function EventViewerCard({ values }: EventViewerCardProps) {
    const audience: AnnouncementAudience = values.target_audience || 'Global';
    const audienceLabel = AUDIENCE_LABELS[audience] ?? audience;
    const isSection = audience === 'Section';
    const hasAttachments = Boolean(values.attachments && values.attachments.length > 0);
    const hasSections = isSection && values.sections && values.sections.length > 0;
    const whenLabel = formatEventDisplayRange(values.start_at, values.end_at);

    return (
        <article className="flex flex-col gap-6 max-w-4xl mx-auto py-2 w-full">
            {/* Top Badges */}
            <div className="flex flex-wrap gap-2.5 items-center">
                <CommonBadgeStatus
                    label={values.all_day
                        ? 'All-Day Event'
                        : 'Scheduled Event'}
                    variant="info"
                />
                <CommonChip
                    label={audienceLabel}
                    variant="light"
                />
            </div>

            {/* Headline Title */}
            <h1 className="font-bold leading-tight text-(--mui-palette-text-primary) text-2xl sm:text-3xl tracking-tight break-words">
                {values.title || 'Untitled Event'}
            </h1>

            {/* Key Event Details Grid */}
            <div className="gap-3.5 grid grid-cols-1 md:grid-cols-2">
                <EventMetaTile
                    icon={<ClockIcon size={18} weight="bold" />}
                    label="When"
                    value={whenLabel}
                />
                <EventMetaTile
                    icon={<MapPinIcon size={18} weight="bold" />}
                    label="Where"
                    value={values.location || 'Location not specified'}
                />
                <EventMetaTile
                    icon={<UsersThreeIcon size={18} weight="bold" />}
                    label="Audience"
                >
                    {isSection ? (
                        hasSections ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {values.sections!.map(function(section) {
                                    const label = section.course_code
                                        ? `${section.course_code} · ${section.code}`
                                        : section.code;

                                    return (
                                        <span
                                            className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) font-medium px-2 py-0.5 rounded text-xs text-(--mui-palette-text-primary)"
                                            key={section.id}
                                        >
                                            {label}
                                        </span>
                                    );
                                })}
                            </div>
                        ) : (
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                Specific Sections
                            </span>
                        )
                    ) : (
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            {audienceLabel}
                        </span>
                    )}
                </EventMetaTile>
                <EventMetaTile
                    icon={<UserIcon size={18} weight="bold" />}
                    label="Organized by"
                    value={values.author_name || 'Staff'}
                />
            </div>

            {/* Content Divider */}
            <hr className="border-(--mui-palette-divider) my-1" />

            {/* Description Body */}
            <div className="flex flex-col gap-3 min-h-[100px] w-full">
                <span className="flex font-semibold gap-2 items-center text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider">
                    <CalendarBlankIcon size={16} />
                    Event Details & Agenda
                </span>
                <RichContentReader
                    content={values.description}
                    emptyPlaceholder="No description or agenda provided for this event."
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
