import { CalendarDotsIcon, CalendarIcon, SunIcon } from '@phosphor-icons/react';
import { WizardCalendarExceptionItem, WizardTermItem } from '@type/school-year.type';
import { useMemo } from 'react';

interface AcademicYearTimelinePreviewProps {
    startDate?: string;
    endDate?: string;
    terms?: WizardTermItem[];
    holidays?: WizardCalendarExceptionItem[];
}

interface TimelineEvent {
    id: string;
    date: string;
    formattedDate: string;
    label: string;
    category: 'school_year' | 'term' | 'enrollment' | 'exam' | 'grading' | 'holiday';
}

function formatTimelineDate(dateStr?: string | null): string {
    if (!dateStr) return '';
    // Append T00:00:00 to avoid timezone offset shifts
    const cleanDate = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return dateStr;

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[d.getDay()];

    return `${mm}/${dd}/${yy} (${dayName})`;
}

export default function AcademicYearTimelinePreview({
    startDate,
    endDate,
    terms = [],
    holidays = []
}: AcademicYearTimelinePreviewProps) {
    const timelineEvents = useMemo(() => {
        const events: TimelineEvent[] = [];

        if (startDate) {
            events.push({
                id: `sy-start-${startDate}`,
                date: startDate,
                formattedDate: formatTimelineDate(startDate),
                label: 'Academic Year Start',
                category: 'school_year'
            });
        }

        if (endDate) {
            events.push({
                id: `sy-end-${endDate}`,
                date: endDate,
                formattedDate: formatTimelineDate(endDate),
                label: 'Academic Year End',
                category: 'school_year'
            });
        }

        terms.forEach((t, tIdx) => {
            const termLabel = t.term_type_label || `Term #${tIdx + 1}`;

            if (t.enrollment_start_date) {
                events.push({
                    id: `term-${tIdx}-enroll-start`,
                    date: t.enrollment_start_date,
                    formattedDate: formatTimelineDate(t.enrollment_start_date),
                    label: `${termLabel} Enrollment Start`,
                    category: 'enrollment'
                });
            }

            if (t.enrollment_end_date) {
                events.push({
                    id: `term-${tIdx}-enroll-end`,
                    date: t.enrollment_end_date,
                    formattedDate: formatTimelineDate(t.enrollment_end_date),
                    label: `${termLabel} Enrollment End`,
                    category: 'enrollment'
                });
            }

            if (t.start_date) {
                events.push({
                    id: `term-${tIdx}-start`,
                    date: t.start_date,
                    formattedDate: formatTimelineDate(t.start_date),
                    label: `${termLabel} Start`,
                    category: 'term'
                });
            }

            (t.grading_periods || []).forEach((gp, gpIdx) => {
                const gpName = gp.name || `Period #${gpIdx + 1}`;

                if (gp.major_exam_start_date) {
                    events.push({
                        id: `term-${tIdx}-gp-${gpIdx}-exam-start`,
                        date: gp.major_exam_start_date,
                        formattedDate: formatTimelineDate(gp.major_exam_start_date),
                        label: `${termLabel} — ${gpName} Major Examination Start`,
                        category: 'exam'
                    });
                }

                if (gp.major_exam_end_date && gp.major_exam_end_date !== gp.major_exam_start_date) {
                    events.push({
                        id: `term-${tIdx}-gp-${gpIdx}-exam-end`,
                        date: gp.major_exam_end_date,
                        formattedDate: formatTimelineDate(gp.major_exam_end_date),
                        label: `${termLabel} — ${gpName} Major Examination End`,
                        category: 'exam'
                    });
                }

                if (gp.grade_encoding_start_date) {
                    events.push({
                        id: `term-${tIdx}-gp-${gpIdx}-encoding-start`,
                        date: gp.grade_encoding_start_date,
                        formattedDate: formatTimelineDate(gp.grade_encoding_start_date),
                        label: `${termLabel} — ${gpName} Grade Encoding Start`,
                        category: 'grading'
                    });
                }

                if (gp.grade_encoding_end_date && gp.grade_encoding_end_date !== gp.grade_encoding_start_date) {
                    events.push({
                        id: `term-${tIdx}-gp-${gpIdx}-encoding-end`,
                        date: gp.grade_encoding_end_date,
                        formattedDate: formatTimelineDate(gp.grade_encoding_end_date),
                        label: `${termLabel} — ${gpName} Grade Encoding End`,
                        category: 'grading'
                    });
                }
            });

            if (t.grading_deadline) {
                events.push({
                    id: `term-${tIdx}-grading-deadline`,
                    date: t.grading_deadline,
                    formattedDate: formatTimelineDate(t.grading_deadline),
                    label: `${termLabel} Final Grade Submission Deadline`,
                    category: 'grading'
                });
            }

            if (t.end_date) {
                events.push({
                    id: `term-${tIdx}-end`,
                    date: t.end_date,
                    formattedDate: formatTimelineDate(t.end_date),
                    label: `${termLabel} End`,
                    category: 'term'
                });
            }
        });

        holidays.forEach((h, hIdx) => {
            if (h.start_date) {
                events.push({
                    id: `holiday-${hIdx}-start`,
                    date: h.start_date,
                    formattedDate: formatTimelineDate(h.start_date),
                    label: `${h.title} (${h.exception_type})`,
                    category: 'holiday'
                });
            }

            if (h.end_date && h.end_date !== h.start_date) {
                events.push({
                    id: `holiday-${hIdx}-end`,
                    date: h.end_date,
                    formattedDate: formatTimelineDate(h.end_date),
                    label: `${h.title} (${h.exception_type}) Concludes`,
                    category: 'holiday'
                });
            }
        });

        // Sort chronologically by date
        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [startDate, endDate, terms, holidays]);

    if (!startDate || !endDate) {
        return (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs text-slate-500 text-center">
                Please set Academic Year Start Date and End Date to view the chronological schedule.
            </div>
        );
    }

    const categoryBadges: Record<TimelineEvent['category'], { bg: string; text: string }> = {
        school_year: { bg: 'bg-brand-100 dark:bg-brand-950/60', text: 'text-brand-700 dark:text-brand-300' },
        term: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
        enrollment: { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
        exam: { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
        grading: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
        holiday: { bg: 'bg-rose-100 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' }
    };

    return (
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 shadow-sm space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs border-b border-slate-100 dark:border-zinc-700/50 pb-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <CalendarDotsIcon className="w-4 h-4 text-brand-600 shrink-0" weight="bold" />
                    <span>Academic Year Schedule & Key Happenings</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {formatTimelineDate(startDate)} — {formatTimelineDate(endDate)}
                </div>
            </div>

            {/* Chronological Text List */}
            {timelineEvents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No events or terms configured yet.</p>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {timelineEvents.map((evt) => {
                        const style = categoryBadges[evt.category];
                        return (
                            <div
                                key={evt.id}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-700/50 bg-slate-50/50 dark:bg-zinc-800/40 text-xs hover:bg-slate-100/70 dark:hover:bg-zinc-700/40 transition-colors"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] shrink-0 ${style.bg} ${style.text}`}>
                                        {evt.formattedDate}
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {evt.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
