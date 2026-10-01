import { PencilSimpleIcon, TableIcon, SquaresFourIcon, TrashIcon } from '@phosphor-icons/react';
import { CurriculumMapEntry } from '@type/curriculum-map.type';
import { useMemo, useState } from 'react';

interface CurriculumTermTableProps {
    termTypeLabel: string;
    entries: CurriculumMapEntry[];
    totalUnits: number;
    readOnly?: boolean;
    onDelete: (id: string) => void;
    onView: (entry: CurriculumMapEntry) => void;
}

interface DynamicTypeHeader {
    code: string;
    label: string;
}

export default function CurriculumTermTable({
    termTypeLabel,
    entries,
    totalUnits,
    readOnly = false,
    onDelete,
    onView
}: CurriculumTermTableProps) {
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

    // Discover all distinct course types across entries in this term
    const dynamicTypes = useMemo<DynamicTypeHeader[]>(() => {
        const typeMap = new Map<string, string>();

        // Default standard types
        typeMap.set('LEC', 'Lec');
        typeMap.set('LAB', 'Lab');

        entries.forEach((entry) => {
            if (entry.course_type_code) {
                const code = entry.course_type_code.toUpperCase().trim();
                const label = entry.course_type_label || (code === 'LABORATORY' ? 'Lab' : code === 'LECTURE' ? 'Lec' : code);
                typeMap.set(code, label);
            }
            if (entry.type_units) {
                Object.keys(entry.type_units).forEach((key) => {
                    const code = key.toUpperCase().trim();
                    if (!typeMap.has(code)) {
                        typeMap.set(code, code);
                    }
                });
            }
        });

        // If no entries have LAB, keep LEC and LAB as standard defaults or list all encountered
        const result: DynamicTypeHeader[] = [];
        typeMap.forEach((label, code) => {
            result.push({ code, label });
        });

        return result;
    }, [entries]);

    function getEntryTypeUnit(entry: CurriculumMapEntry, typeCode: string): number | null {
        const code = typeCode.toUpperCase().trim();

        if (entry.type_units && entry.type_units[code] !== undefined) {
            const val = Number(entry.type_units[code]);
            return val > 0 ? val : null;
        }

        if (code === 'LEC' || code === 'LECTURE') {
            const val = Number(entry.lecture_units ?? 0);
            return val > 0 ? val : null;
        }

        if (code === 'LAB' || code === 'LABORATORY') {
            const val = Number(entry.laboratory_units ?? 0);
            return val > 0 ? val : null;
        }

        if (entry.course_type_code?.toUpperCase().trim() === code) {
            const val = Number(entry.units ?? entry.total_units ?? 0);
            return val > 0 ? val : null;
        }

        return null;
    }

    return (
        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-1 flex-col min-w-0 overflow-hidden bg-white dark:bg-zinc-900/60 shadow-xs">
            {/* Term Header Bar with Mode Toggle */}
            <div className="border-b border-slate-200 dark:border-zinc-800 px-4 py-2.5 bg-slate-100/70 dark:bg-zinc-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {termTypeLabel}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 shrink-0">
                        {totalUnits.toFixed(1)} Units ({entries.length} {entries.length === 1 ? 'Course' : 'Courses'})
                    </span>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`p-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                            viewMode === 'table'
                                ? 'bg-brand-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                        title="Table View (Dynamic Course Type Columns)"
                    >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Table</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        className={`p-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                            viewMode === 'card'
                                ? 'bg-brand-600 text-white shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                        title="Card View"
                    >
                        <SquaresFourIcon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cards</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {entries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No courses added for this term yet.
                </div>
            ) : viewMode === 'table' ? (
                /* Dynamic Columns Table View */
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th className="py-2.5 px-3 min-w-[90px]">Code</th>
                                <th className="py-2.5 px-3 min-w-[180px]">Course Title</th>
                                {dynamicTypes.map((t) => (
                                    <th key={t.code} className="py-2.5 px-3 text-center min-w-[55px]">
                                        {t.label}
                                    </th>
                                ))}
                                <th className="py-2.5 px-3 text-center min-w-[65px]">Total</th>
                                <th className="py-2.5 px-3 min-w-[120px]">Pre-req</th>
                                <th className="py-2.5 px-3 text-center min-w-[70px]">Type</th>
                                {!readOnly && <th className="py-2.5 px-3 text-right min-w-[75px] no-print">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                            {entries.map((entry) => {
                                const lec = Number(entry.lecture_units ?? 0);
                                const lab = Number(entry.laboratory_units ?? 0);
                                const sumUnits = Number(entry.total_units) || (lec + lab);

                                return (
                                    <tr
                                        key={entry.id}
                                        className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors group"
                                    >
                                        {/* Course Code */}
                                        <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                            {entry.course_code}
                                        </td>

                                        {/* Title */}
                                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                                            {entry.course_title}
                                        </td>

                                        {/* Dynamic Course Type Unit Columns */}
                                        {dynamicTypes.map((t) => {
                                            const unitVal = getEntryTypeUnit(entry, t.code);
                                            return (
                                                <td key={t.code} className="py-2 px-3 text-center">
                                                    {unitVal !== null ? (
                                                        !readOnly ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => onView(entry)}
                                                                className="px-2 py-0.5 rounded font-semibold text-slate-800 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/60 dark:hover:text-brand-400 border border-slate-200 dark:border-zinc-700 hover:border-brand-300 transition-all cursor-pointer text-xs"
                                                                title={`Edit ${t.label} units for ${entry.course_code}`}
                                                            >
                                                                {unitVal.toFixed(1)}
                                                            </button>
                                                        ) : (
                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                {unitVal.toFixed(1)}
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Total Units */}
                                        <td className="py-2 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
                                            {sumUnits.toFixed(1)}
                                        </td>

                                        {/* Prerequisites */}
                                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                                            {entry.prerequisites && entry.prerequisites.length > 0
                                                ? entry.prerequisites.map((p) => p.code).join(', ')
                                                : <span className="text-slate-400 italic">None</span>}
                                        </td>

                                        {/* Elective Tag */}
                                        <td className="py-2 px-3 text-center">
                                            {entry.is_elective ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    Elective
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px]">Req</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        {!readOnly && (
                                            <td className="py-2 px-3 text-right no-print">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => onView(entry)}
                                                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/50 transition-colors"
                                                        title="Edit Course Units"
                                                    >
                                                        <PencilSimpleIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDelete(entry.id)}
                                                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                                        title="Delete Entry"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Card View with Multi-Type Unit Chips */
                <div className="p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {entries.map((entry) => {
                            const lec = Number(entry.lecture_units ?? 0);
                            const lab = Number(entry.laboratory_units ?? 0);
                            const sumUnits = Number(entry.total_units) || (lec + lab);

                            // Collect active unit chips
                            const unitChips: { label: string; value: number }[] = [];
                            dynamicTypes.forEach((t) => {
                                const val = getEntryTypeUnit(entry, t.code);
                                if (val !== null && val > 0) {
                                    unitChips.push({ label: t.label, value: val });
                                }
                            });

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
                                                    title="Edit Course Units"
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

                                    {/* Dynamic Units Breakdown Footer */}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                                            {unitChips.length > 0 ? (
                                                unitChips.map((chip, i) => (
                                                    <span key={chip.label} className="flex items-center gap-1">
                                                        {i > 0 && <span className="text-slate-300 dark:text-slate-600">•</span>}
                                                        <span>{chip.label}: <strong className="text-slate-700 dark:text-slate-200">{chip.value}</strong></span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span>Units: <strong className="text-slate-700 dark:text-slate-200">{sumUnits}</strong></span>
                                            )}
                                        </div>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px] shrink-0">
                                            {sumUnits.toFixed(1)} Units
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}