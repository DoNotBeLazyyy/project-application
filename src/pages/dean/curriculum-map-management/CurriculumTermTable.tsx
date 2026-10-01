import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { CurriculumMapEntry } from '@type/curriculum-map.type';

interface CurriculumTermTableProps {
    termTypeLabel: string;
    entries: CurriculumMapEntry[];
    totalUnits: number;
    readOnly?: boolean;
    onDelete: (id: string) => void;
    onView: (entry: CurriculumMapEntry) => void;
}

export default function CurriculumTermTable({
    termTypeLabel,
    entries,
    totalUnits,
    readOnly = false,
    onDelete,
    onView
}: CurriculumTermTableProps) {
    return (
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-1 flex-col min-w-0 overflow-hidden bg-white dark:bg-zinc-900/60 shadow-xs">
            {/* Term Header Bar */}
            <div className="border-b border-slate-200 dark:border-zinc-800 px-4 py-2.5 bg-slate-100/70 dark:bg-zinc-800/60 flex items-center justify-between gap-3">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {termTypeLabel}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 shrink-0">
                    Total: {totalUnits.toFixed(2)} Units ({entries.length} {entries.length === 1 ? 'Course' : 'Courses'})
                </span>
            </div>

            {/* Course Cards Grid */}
            <div className="p-3">
                {entries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        No courses added for this term yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {entries.map((entry) => {
                            const lec = Number(entry.lecture_units ?? 0);
                            const lab = Number(entry.laboratory_units ?? 0);
                            const sumUnits = Number(entry.total_units) || (lec + lab);

                            return (
                                <div
                                    key={entry.id}
                                    onClick={() => onView(entry)}
                                    className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all flex flex-col justify-between gap-3 group relative cursor-pointer"
                                >
                                    {/* Top Row: Code, Elective Tag, Action Buttons */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-mono text-xs font-bold border border-brand-200 dark:border-brand-800/60">
                                                {entry.course_code}
                                            </span>
                                            {entry.is_elective && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-800/60">
                                                    Elective
                                                </span>
                                            )}
                                        </div>

                                        {!readOnly && (
                                            <div className="flex items-center gap-1 no-print">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onView(entry);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors"
                                                    title="Edit Course"
                                                >
                                                    <PencilSimpleIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(entry.id);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                                    title="Delete Entry"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Course Title */}
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                                            {entry.course_title}
                                        </h4>
                                        {entry.prerequisites && entry.prerequisites.length > 0 && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                                Prereq: {entry.prerequisites.map((p) => p.code).join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Units Breakdown Footer */}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            {lec > 0 && <span>Lec: <strong className="text-slate-700 dark:text-slate-200">{lec}</strong></span>}
                                            {lec > 0 && lab > 0 && <span>•</span>}
                                            {lab > 0 && <span>Lab: <strong className="text-slate-700 dark:text-slate-200">{lab}</strong></span>}
                                            {lec === 0 && lab === 0 && <span>Units: <strong className="text-slate-700 dark:text-slate-200">{sumUnits}</strong></span>}
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                                            {sumUnits.toFixed(1)} Units
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}