import CommonModal from '@components/modal/CommonModal';
import {
    CalendarDotsIcon,
    CaretDownIcon,
    CaretUpIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    GraduationCapIcon,
    InfoIcon,
    TagIcon,
    UserIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAcademicYearHistory } from '@services/school-year.service';
import { AcademicYearHistoryItem } from '@type/school-year.type';
import { formatShortDate } from '@utils/date.util';
import { useEffect, useState } from 'react';

interface AcademicYearHistoryModalProps {
    open: boolean;
    schoolYearId?: string | null;
    schoolYearLabel?: string;
    onClose: () => void;
}

export default function AcademicYearHistoryModal({
    open,
    schoolYearId,
    schoolYearLabel,
    onClose
}: AcademicYearHistoryModalProps) {
    const [history, setHistory] = useState<AcademicYearHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !schoolYearId) {
            setHistory([]);
            setExpandedEntryId(null);
            return;
        }

        setIsLoading(true);
        getAcademicYearHistory(schoolYearId)
            .then((res) => {
                if (res.data) {
                    setHistory(res.data);
                    // Automatically expand the latest entry if available
                    if (res.data.length > 0) {
                        setExpandedEntryId(res.data[0].id);
                    }
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [open, schoolYearId]);

    function toggleExpand(id: string) {
        setExpandedEntryId((prev) => (prev === id ? null : id));
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-3xl p-0 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh]'
            }}
            fullWidth
            maxWidth="md"
            open={open}
            onClose={onClose}
        >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                        <ClockCounterClockwiseIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2 leading-snug">
                            <span>Change History</span>
                            {schoolYearLabel && (
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold">
                                    {schoolYearLabel}
                                </span>
                            )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Audit trail of configuration updates, calendar revisions, and threshold changes.
                        </p>
                    </div>
                </div>

                <button
                    aria-label="Close"
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Content Viewport */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 dark:bg-zinc-900/50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Loading audit history...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                        <InfoIcon className="w-10 h-10 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No history records found
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Any subsequent modifications to this academic year will be versioned and recorded here.
                        </p>
                    </div>
                ) : (
                    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
                        {history.map((entry, index) => {
                            const isExpanded = expandedEntryId === entry.id;
                            const isCreated = entry.action === 'CREATED';
                            const dateObj = new Date(entry.changed_at);
                            const formattedDate = dateObj.toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            const snap = entry.snapshot;

                            return (
                                <div key={entry.id} className="relative group">
                                    {/* Timeline Pin */}
                                    <div
                                        className={`absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full border-2 bg-white dark:bg-zinc-900 flex items-center justify-center ${
                                            isCreated
                                                ? 'border-emerald-500 text-emerald-500'
                                                : index === 0
                                                ? 'border-brand-600 text-brand-600 ring-4 ring-brand-100 dark:ring-brand-950/60'
                                                : 'border-slate-400 text-slate-400'
                                        }`}
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                isCreated
                                                    ? 'bg-emerald-500'
                                                    : index === 0
                                                    ? 'bg-brand-600'
                                                    : 'bg-slate-400'
                                            }`}
                                        />
                                    </div>

                                    {/* History Card */}
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-zinc-700">
                                        <div
                                            className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            onClick={() => toggleExpand(entry.id)}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                            isCreated
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                                                        }`}
                                                    >
                                                        {entry.action}
                                                    </span>

                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {formattedDate}
                                                    </span>
                                                </div>

                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                    {entry.change_summary || `${entry.action} academic year record.`}
                                                </p>

                                                <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                                                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>
                                                        {entry.changed_by_name || 'System Administrator'}
                                                    </span>
                                                    <span className="text-slate-300 dark:text-zinc-700">•</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                        {entry.changed_by_role || 'Admin'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                                <button
                                                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                                    type="button"
                                                >
                                                    <span>{isExpanded ? 'Hide Snapshot' : 'View Snapshot'}</span>
                                                    {isExpanded ? (
                                                        <CaretUpIcon className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <CaretDownIcon className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Snapshot Breakdown */}
                                        {isExpanded && snap && (
                                            <div className="border-t border-slate-100 dark:border-zinc-800 p-4 bg-slate-50/50 dark:bg-zinc-800/30 space-y-4 text-xs">
                                                {/* Overview Pills */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                            Code & Label
                                                        </span>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                                            {snap.code} - {snap.label}
                                                        </p>
                                                    </div>

                                                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                            Dates
                                                        </span>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                                            {formatShortDate(snap.start_date || '')} — {formatShortDate(snap.end_date || '')}
                                                        </p>
                                                    </div>

                                                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                            Status
                                                        </span>
                                                        <span
                                                            className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] mt-0.5 ${
                                                                snap.is_active
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            {snap.is_active ? 'Active Year' : 'Inactive'}
                                                        </span>
                                                    </div>

                                                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                            Config Counts
                                                        </span>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                            {snap.terms_count ?? (snap.terms?.length || 0)} Terms • {snap.transmutation_rows_count ?? (snap.transmutation_rows?.length || 0)} Grades • {snap.thresholds_count ?? (snap.thresholds?.length || 0)} Thresholds{snap.max_units_per_term ? ` • Max ${snap.max_units_per_term} Units` : ''}{snap.evaluation_scope ? ` • ${snap.evaluation_scope} Eval` : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Detailed Tabs / Accordion of Snapshot */}
                                                <div className="space-y-3 pt-2">
                                                    {/* Terms & Periods */}
                                                    {snap.terms && snap.terms.length > 0 && (
                                                        <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                                                <CalendarDotsIcon className="w-4 h-4 text-brand-600" />
                                                                <span>Declared Terms ({snap.terms.length})</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {snap.terms.map((t: any, tIdx: number) => (
                                                                    <div key={tIdx} className="p-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px]">
                                                                        <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                                                                            <span>{t.term_type_label || `Term #${tIdx + 1}`}</span>
                                                                            <span className="text-slate-500 font-normal">
                                                                                {formatShortDate(t.start_date)} - {formatShortDate(t.end_date)}
                                                                            </span>
                                                                        </div>
                                                                        {t.grading_periods && t.grading_periods.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                                {t.grading_periods.map((gp: any, gpIdx: number) => (
                                                                                    <span key={gpIdx} className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] text-slate-600 dark:text-slate-400">
                                                                                        {gp.name} ({gp.weight}%)
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Academic Thresholds */}
                                                    {snap.thresholds && snap.thresholds.length > 0 && (
                                                        <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                                                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-2">
                                                                <GraduationCapIcon className="w-4 h-4 text-brand-600" />
                                                                <span>Configured Academic Thresholds ({snap.thresholds.length})</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                                {snap.thresholds.map((th: any, thIdx: number) => (
                                                                    <div key={thIdx} className="p-2 rounded bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-[11px]">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{th.label}</span>
                                                                            <span className="px-1 py-0.2 rounded bg-slate-200 dark:bg-zinc-700 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                                                                {th.category}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                                                            <p>GWA Cutoff: <strong>≤ {th.max_gwa}</strong></p>
                                                                            {th.min_subject_grade && <p>Subject Floor: <strong>≤ {th.min_subject_grade}</strong></p>}
                                                                            {th.requires_no_failing && <p className="text-amber-600 dark:text-amber-400 font-medium">No failing grades permitted</p>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </CommonModal>
    );
}
