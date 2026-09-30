import { CalendarDotsIcon } from '@phosphor-icons/react';
import { WizardTermItem } from '@type/school-year.type';

interface AcademicYearTimelinePreviewProps {
    startDate?: string;
    endDate?: string;
    terms?: WizardTermItem[];
}

export default function AcademicYearTimelinePreview({
    startDate,
    endDate,
    terms = []
}: AcademicYearTimelinePreviewProps) {
    if (!startDate || !endDate) return null;

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const totalDuration = endMs - startMs;

    if (totalDuration <= 0 || isNaN(totalDuration)) return null;

    return (
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 shadow-sm space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <CalendarDotsIcon className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Academic Calendar Schedule Preview</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                    {startDate} — {endDate}
                </div>
            </div>

            {/* Timeline Progress Bar Container */}
            <div className="relative w-full h-8 bg-slate-100 dark:bg-zinc-700/60 rounded-lg overflow-hidden flex items-center px-1">
                {terms.map((t, idx) => {
                    if (!t.start_date || !t.end_date) return null;
                    const tStart = new Date(t.start_date).getTime();
                    const tEnd = new Date(t.end_date).getTime();

                    const leftPct = Math.max(0, Math.min(100, ((tStart - startMs) / totalDuration) * 100));
                    const widthPct = Math.max(2, Math.min(100 - leftPct, ((tEnd - tStart) / totalDuration) * 100));

                    const termLabel = t.term_type_label || `Term #${idx + 1}`;
                    const colors = [
                        'bg-brand-500 text-white',
                        'bg-emerald-600 text-white',
                        'bg-amber-500 text-white',
                        'bg-indigo-600 text-white'
                    ];
                    const barBg = colors[idx % colors.length];

                    return (
                        <div
                            key={t.id || idx}
                            className={`absolute h-6 rounded-md ${barBg} text-[10px] font-bold flex items-center justify-center px-1 truncate shadow-xs transition-all`}
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
            </div>
        </div>
    );
}
