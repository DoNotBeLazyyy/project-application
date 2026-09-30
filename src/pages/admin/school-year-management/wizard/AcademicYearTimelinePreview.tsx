import { CalendarDotsIcon, SunIcon } from '@phosphor-icons/react';
import { WizardCalendarExceptionItem, WizardTermItem } from '@type/school-year.type';

interface AcademicYearTimelinePreviewProps {
    startDate?: string;
    endDate?: string;
    terms?: WizardTermItem[];
    holidays?: WizardCalendarExceptionItem[];
}

export default function AcademicYearTimelinePreview({
    startDate,
    endDate,
    terms = [],
    holidays = []
}: AcademicYearTimelinePreviewProps) {
    if (!startDate || !endDate) return null;

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const totalDuration = endMs - startMs;

    if (totalDuration <= 0 || isNaN(totalDuration)) return null;

    return (
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 shadow-sm space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <CalendarDotsIcon className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Academic Calendar Schedule & Holiday Overlay</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                    {startDate} — {endDate}
                </div>
            </div>

            {/* Timeline Progress Bar Container */}
            <div className="relative w-full h-10 bg-slate-100 dark:bg-zinc-700/60 rounded-lg overflow-hidden flex items-center px-1">
                {terms.map((t, idx) => {
                    if (!t.start_date || !t.end_date) return null;
                    const tStart = new Date(t.start_date).getTime();
                    const tEnd = new Date(t.end_date).getTime();

                    const leftPct = Math.max(0, Math.min(100, ((tStart - startMs) / totalDuration) * 100));
                    const widthPct = Math.max(2, Math.min(100 - leftPct, ((tEnd - tStart) / totalDuration) * 100));

                    const termLabel = t.term_type_label || `Term #${idx + 1}`;
                    const colors = [
                        'bg-brand-600 text-white',
                        'bg-emerald-600 text-white',
                        'bg-amber-600 text-white',
                        'bg-indigo-600 text-white'
                    ];
                    const barBg = colors[idx % colors.length];

                    return (
                        <div
                            key={t.id || idx}
                            className={`absolute h-7 rounded-md ${barBg} text-[10px] font-bold flex items-center justify-center px-1 truncate shadow-xs transition-all opacity-90`}
                            style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`
                            }}
                            title={`${termLabel}: ${t.start_date} to ${t.end_date}`}
                        >
                            <span className="truncate">{termLabel}</span>
                        </div>
                    );
                })}

                {/* Holiday & Calendar Exception Overlays */}
                {holidays.map((h, hIdx) => {
                    if (!h.start_date || !h.end_date) return null;
                    const hStart = new Date(h.start_date).getTime();
                    const hEnd = new Date(h.end_date).getTime();

                    const leftPct = Math.max(0, Math.min(100, ((hStart - startMs) / totalDuration) * 100));
                    const widthPct = Math.max(1, Math.min(100 - leftPct, Math.max(1.5, ((hEnd - hStart) / totalDuration) * 100)));

                    const badgeColors: Record<string, string> = {
                        Holiday: 'bg-red-500 text-white ring-1 ring-red-400',
                        Break: 'bg-amber-400 text-slate-900 ring-1 ring-amber-300 font-bold',
                        Suspension: 'bg-purple-600 text-white ring-1 ring-purple-400',
                        'Special Class': 'bg-blue-500 text-white ring-1 ring-blue-300',
                        'Exam Day': 'bg-rose-600 text-white ring-1 ring-rose-400'
                    };
                    const overlayStyle = badgeColors[h.exception_type] || 'bg-slate-700 text-white';

                    return (
                        <div
                            key={h.id || hIdx}
                            className={`absolute h-8 rounded-xs ${overlayStyle} text-[9px] font-extrabold flex items-center justify-center px-0.5 truncate z-10 opacity-95 border-x border-white/60 shadow-xs`}
                            style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`
                            }}
                            title={`[${h.exception_type}] ${h.title}: ${h.start_date} to ${h.end_date}${h.description ? ` (${h.description})` : ''}`}
                        >
                            <span className="truncate hidden sm:inline">{h.title}</span>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            {holidays.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <SunIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span>Holidays & Overlays ({holidays.length}):</span>
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Holiday
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> Break
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                            <span className="w-2 h-2 rounded-full bg-purple-600" /> Suspension
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-500" /> Special Class
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
