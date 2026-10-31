import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import {
    ArrowSquareOutIcon,
    ClockIcon,
    GraduationCapIcon,
    MapPinIcon,
    XIcon
} from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { CALENDAR_CATEGORIES, UnifiedCalendarEvent } from './calendar.types';

interface CalendarEventDetailModalProps {
    event: UnifiedCalendarEvent | null;
    open: boolean;
    onClose: VoidFunction;
}

export function CalendarEventDetailModal({
    event,
    open,
    onClose
}: CalendarEventDetailModalProps) {
    const navigate = useNavigate();

    const categoryConfig = useMemo(() => {
        if (!event) return null;
        return CALENDAR_CATEGORIES.find((c) => c.id === event.category) || CALENDAR_CATEGORIES[0];
    }, [event]);

    if (!event || !categoryConfig) return null;

    const formattedDateRange = (() => {
        const startStr = event.start.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        if (event.allDay) {
            const endStr = event.end.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            if (startStr === endStr) {
                return `${startStr} (All Day)`;
            }
            return `${startStr} – ${endStr} (All Day)`;
        }

        const startTime = event.start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
        const endTime = event.end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });

        const isSameDay = event.start.toDateString() === event.end.toDateString();
        if (isSameDay) {
            return `${startStr} • ${startTime} – ${endTime}`;
        }

        const endStr = event.end.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        return `${startStr} at ${startTime} – ${endStr} at ${endTime}`;
    })();

    const handleActionClick = () => {
        if (event.metadata?.targetUrl) {
            onClose();
            navigate(event.metadata.targetUrl);
        }
    };

    return (
        <CommonModal
            cardProps={{
                className: 'p-0! overflow-hidden rounded-2xl w-full max-w-lg mx-auto',
                sx: { p: '0 !important', overflow: 'hidden' }
            }}
            closeOnBackdropClick
            closeOnEscape
            disableEscapeKeyDown={false}
            fullScreen={false}
            maxWidth="sm"
            open={open}
            onClose={onClose}
        >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-200/80 dark:border-neutral-800 flex flex-col">
                {/* Header Banner */}
                <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-neutral-800/80 flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${categoryConfig.bgClass}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${categoryConfig.dotClass}`} />
                                {categoryConfig.label}
                            </span>
                            {event.metadata?.assessmentType && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                    {event.metadata.assessmentType}
                                </span>
                            )}
                            {event.metadata?.rawStatus && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                                    {event.metadata.rawStatus}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white leading-tight break-words">
                            {event.title}
                        </h2>
                    </div>
                    <button
                        aria-label="Close modal"
                        className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0 cursor-pointer"
                        type="button"
                        onClick={onClose}
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 space-y-4 text-sm text-neutral-600 dark:text-neutral-300 overflow-y-auto max-h-[60vh]">
                    {/* Time & Date */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                        <ClockIcon
                            className="text-neutral-500 shrink-0 mt-0.5"
                            size={20}
                        />
                        <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Date & Time</div>
                            <div className="text-neutral-600 dark:text-neutral-400">{formattedDateRange}</div>
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                            <MapPinIcon
                                className="text-neutral-500 shrink-0 mt-0.5"
                                size={20}
                            />
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">Location</div>
                                <div className="text-neutral-600 dark:text-neutral-400">{event.location}</div>
                            </div>
                        </div>
                    )}

                    {/* Section / Course Details */}
                    {(event.metadata?.courseCode || event.metadata?.sectionCode) && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                            <GraduationCapIcon
                                className="text-neutral-500 shrink-0 mt-0.5"
                                size={20}
                            />
                            <div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">Course & Section</div>
                                <div className="text-neutral-600 dark:text-neutral-400">
                                    {event.metadata.courseCode} {event.metadata.sectionCode
                                        ? `• Section ${event.metadata.sectionCode}`
                                        : ''}
                                    {event.metadata.authorName
                                        ? ` • ${event.metadata.authorName}`
                                        : ''}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="space-y-1.5 pt-1">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">Overview</div>
                            <p className="whitespace-pre-line text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 sm:p-4 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-3">
                    <CommonButton
                        size="medium"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Close
                    </CommonButton>
                    {event.metadata?.targetUrl && (
                        <CommonButton
                            color="primary"
                            endIcon={<ArrowSquareOutIcon size={16} />}
                            size="medium"
                            variant="contained"
                            onClick={handleActionClick}
                        >
                            View Details
                        </CommonButton>
                    )}
                </div>
            </div>
        </CommonModal>
    );
}