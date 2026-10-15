import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import {
    ArrowCounterClockwiseIcon,
    ArrowsLeftRightIcon,
    CalendarDotsIcon,
    CaretDownIcon,
    CaretUpIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    EyeIcon,
    GraduationCapIcon,
    InfoIcon,
    ListBulletsIcon,
    ScalesIcon,
    SunIcon,
    UserIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAcademicYearHistory, saveAcademicYearCalendar } from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import { EvaluationScope } from '@type/evaluation.type';
import {
    AcademicYearHistoryItem,
    SaveAcademicYearCalendarPayload,
    WizardCalendarExceptionItem,
    WizardTermItem,
    WizardThresholdItem,
    WizardTransmutationRow
} from '@type/school-year.type';
import { formatShortDate } from '@utils/date.util';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface AcademicYearHistoryModalProps {
    open: boolean;
    schoolYearId?: string | null;
    schoolYearLabel?: string;
    onClose: () => void;
    onReverted?: () => void;
}

type HistoryMode = 'timeline' | 'view' | 'compare';

interface EnrichedHistoryItem extends AcademicYearHistoryItem {
    versionNum: number;
    versionLabel: string;
    isCurrentActive: boolean;
    formattedDate: string;
}

export default function AcademicYearHistoryModal({
    open,
    schoolYearId,
    schoolYearLabel,
    onClose,
    onReverted
}: AcademicYearHistoryModalProps) {
    const [history, setHistory] = useState<AcademicYearHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isReverting, setIsReverting] = useState(false);
    const [activeMode, setActiveMode] = useState<HistoryMode>('timeline');
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [compareVersionAId, setCompareVersionAId] = useState<string | null>(null);
    const [compareVersionBId, setCompareVersionBId] = useState<string | null>(null);
    const [revertTargetEntry, setRevertTargetEntry] = useState<EnrichedHistoryItem | null>(null);

    const loadHistory = useCallback(async () => {
        if (!schoolYearId) return;
        setIsLoading(true);
        try {
            const res = await getAcademicYearHistory(schoolYearId);
            if (res.data) {
                setHistory(res.data);
                if (res.data.length > 0) {
                    setExpandedEntryId(res.data[0].id);
                    setSelectedVersionId(res.data[0].id);
                    setCompareVersionBId(res.data[0].id);
                    if (res.data.length > 1) {
                        setCompareVersionAId(res.data[1].id);
                    } else {
                        setCompareVersionAId(res.data[0].id);
                    }
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [schoolYearId]);

    useEffect(() => {
        if (!open || !schoolYearId) {
            setHistory([]);
            setExpandedEntryId(null);
            setSelectedVersionId(null);
            setCompareVersionAId(null);
            setCompareVersionBId(null);
            setActiveMode('timeline');
            setRevertTargetEntry(null);
            return;
        }
        loadHistory();
    }, [open, schoolYearId, loadHistory]);

    // Enriched versions with sequential version numbers: v1 (oldest) to vN (newest/active)
    const enrichedHistory: EnrichedHistoryItem[] = useMemo(() => {
        const total = history.length;
        return history.map((item, idx) => {
            const versionNum = total - idx;
            const isCurrentActive = idx === 0;
            const dateObj = new Date(item.changed_at);
            const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : item.changed_at;

            return {
                ...item,
                versionNum,
                versionLabel: `v${versionNum}${isCurrentActive ? ' (Active)' : ''}`,
                isCurrentActive,
                formattedDate
            };
        });
    }, [history]);

    const selectedVersion = useMemo(() => {
        return enrichedHistory.find((v) => v.id === selectedVersionId) || enrichedHistory[0] || null;
    }, [enrichedHistory, selectedVersionId]);

    const compareVersionA = useMemo(() => {
        return enrichedHistory.find((v) => v.id === compareVersionAId) || enrichedHistory[1] || enrichedHistory[0] || null;
    }, [enrichedHistory, compareVersionAId]);

    const compareVersionB = useMemo(() => {
        return enrichedHistory.find((v) => v.id === compareVersionBId) || enrichedHistory[0] || null;
    }, [enrichedHistory, compareVersionBId]);

    function toggleExpand(id: string) {
        setExpandedEntryId((prev) => (prev === id ? null : id));
    }

    function handleOpenViewVersion(id: string) {
        setSelectedVersionId(id);
        setActiveMode('view');
    }

    function handleOpenCompare(versionAId: string, versionBId?: string) {
        setCompareVersionAId(versionAId);
        if (versionBId) {
            setCompareVersionBId(versionBId);
        } else if (enrichedHistory.length > 0) {
            setCompareVersionBId(enrichedHistory[0].id);
        }
        setActiveMode('compare');
    }

    function handleSwapCompareVersions() {
        setCompareVersionAId(compareVersionBId);
        setCompareVersionBId(compareVersionAId);
    }

    async function handleExecuteRevert() {
        if (!revertTargetEntry || !schoolYearId) return;
        setIsReverting(true);
        try {
            const snap = revertTargetEntry.snapshot;
            const payload: SaveAcademicYearCalendarPayload = {
                p_school_year_id: schoolYearId,
                p_code: (snap.code || '').trim(),
                p_label: (snap.label || '').trim(),
                p_start_date: snap.start_date || '',
                p_end_date: snap.end_date || '',
                p_is_active: Boolean(snap.is_active),
                p_max_units_per_term: snap.max_units_per_term ? Number(snap.max_units_per_term) : 24,
                p_evaluation_scope: (snap.evaluation_scope || 'Period') as EvaluationScope,
                p_terms: (snap.terms || []).map((t) => ({
                    ...t,
                    max_units: t.max_units ? Number(t.max_units) : 24,
                    evaluation_scope: t.evaluation_scope || snap.evaluation_scope || 'Period'
                })),
                p_transmutation_rows: snap.transmutation_rows || [],
                p_thresholds: snap.thresholds || [],
                p_holidays: snap.holidays || []
            };

            const res = await saveAcademicYearCalendar(payload);
            if (res.error) {
                useToastStore.getState().showToast(
                    res.error.message || 'Failed to revert academic year version.',
                    'error'
                );
                return;
            }

            useToastStore.getState().showToast(
                `Academic year successfully reverted to Version ${revertTargetEntry.versionNum}.`,
                'success'
            );
            setRevertTargetEntry(null);
            await loadHistory();
            setActiveMode('timeline');
            onReverted?.();
        } catch (err: any) {
            useToastStore.getState().showToast(
                err?.message || 'Error occurred while reverting version.',
                'error'
            );
        } finally {
            setIsReverting(false);
        }
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-4xl p-0 overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh]'
            }}
            fullWidth
            maxWidth="lg"
            open={open}
            onClose={onClose}
        >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-start justify-between gap-3 shrink-0">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                        <ClockCounterClockwiseIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                Academic Year History & Versions
                            </h2>
                            {schoolYearLabel && (
                                <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold truncate max-w-[200px] sm:max-w-none">
                                    {schoolYearLabel}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Audit trail, version inspection, historical comparison, and snapshot reversion.
                        </p>
                    </div>
                </div>

                <button
                    aria-label="Close"
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Mode Switcher Bar */}
            <div className="px-3.5 sm:px-5 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="grid grid-cols-3 w-full sm:w-auto p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800 text-xs font-semibold gap-1">
                    <button
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                            activeMode === 'timeline'
                                ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        type="button"
                        onClick={() => setActiveMode('timeline')}
                    >
                        <ListBulletsIcon className="w-4 h-4 shrink-0" weight="bold" />
                        <span>Timeline</span>
                    </button>
                    <button
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                            activeMode === 'view'
                                ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        type="button"
                        onClick={() => setActiveMode('view')}
                    >
                        <EyeIcon className="w-4 h-4 shrink-0" weight="bold" />
                        <span>View Version</span>
                    </button>
                    <button
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg transition-all ${
                            activeMode === 'compare'
                                ? 'bg-white dark:bg-zinc-900 text-brand-600 dark:text-brand-400 shadow-xs font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                        type="button"
                        onClick={() => setActiveMode('compare')}
                    >
                        <ArrowsLeftRightIcon className="w-4 h-4 shrink-0" weight="bold" />
                        <span>Compare</span>
                    </button>
                </div>

                {enrichedHistory.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Active: <strong className="text-slate-700 dark:text-slate-300">v{enrichedHistory[0].versionNum}</strong></span>
                        <span className="text-slate-300 dark:text-zinc-700">•</span>
                        <span>{enrichedHistory.length} total {enrichedHistory.length === 1 ? 'version' : 'versions'}</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/60 dark:bg-zinc-900/50 min-h-[300px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Loading audit history & versions...</p>
                    </div>
                ) : enrichedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                        <InfoIcon className="w-10 h-10 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No history records found
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Any changes or revisions made to this academic year will be versioned and recorded here.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* 1. TIMELINE MODE */}
                        {activeMode === 'timeline' && (
                            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-zinc-800">
                                {enrichedHistory.map((entry) => {
                                    const isExpanded = expandedEntryId === entry.id;
                                    const isCreated = entry.action === 'CREATED';
                                    const snap = entry.snapshot;

                                    return (
                                        <div key={entry.id} className="relative group min-w-0">
                                            {/* Timeline Pin */}
                                            <div
                                                className={`absolute -left-6 sm:-left-8 top-2 w-5 h-5 rounded-full border-2 bg-white dark:bg-zinc-900 flex items-center justify-center ${
                                                    entry.isCurrentActive
                                                        ? 'border-emerald-500 text-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                                                        : isCreated
                                                        ? 'border-blue-500 text-blue-500'
                                                        : 'border-slate-400 text-slate-400'
                                                }`}
                                            >
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        entry.isCurrentActive
                                                            ? 'bg-emerald-500'
                                                            : isCreated
                                                            ? 'bg-blue-500'
                                                            : 'bg-slate-400'
                                                    }`}
                                                />
                                            </div>

                                            {/* History Card */}
                                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-zinc-700">
                                                <div className="p-3.5 sm:p-4 flex flex-col gap-3">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                                                        <div className="space-y-1.5 min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300">
                                                                    v{entry.versionNum}
                                                                </span>

                                                                {entry.isCurrentActive ? (
                                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                                        <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" weight="bold" />
                                                                        Active Version
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                                                                        Archived
                                                                    </span>
                                                                )}

                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                                    isCreated
                                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                                        : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300'
                                                                }`}>
                                                                    {entry.action}
                                                                </span>

                                                                <span className="text-xs text-slate-500 font-medium">
                                                                    {entry.formattedDate}
                                                                </span>
                                                            </div>

                                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                                                                {entry.change_summary || `${entry.action} academic year record.`}
                                                            </p>

                                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-0.5">
                                                                <div className="flex items-center gap-1">
                                                                    <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                    <span>{entry.changed_by_name || 'System Administrator'}</span>
                                                                </div>
                                                                <span className="text-slate-300 dark:text-zinc-700">•</span>
                                                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                                                    {entry.changed_by_role || 'Admin'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions Toolbar */}
                                                        <div className="flex flex-wrap items-center gap-1.5 self-start shrink-0 pt-1 sm:pt-0">
                                                            <button
                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
                                                                title="View full version details"
                                                                type="button"
                                                                onClick={() => handleOpenViewVersion(entry.id)}
                                                            >
                                                                <EyeIcon className="w-3.5 h-3.5" weight="bold" />
                                                                <span>View</span>
                                                            </button>

                                                            <button
                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
                                                                title="Compare with another version"
                                                                type="button"
                                                                onClick={() => handleOpenCompare(entry.id)}
                                                            >
                                                                <ArrowsLeftRightIcon className="w-3.5 h-3.5" weight="bold" />
                                                                <span className="hidden sm:inline">Compare</span>
                                                            </button>

                                                            {!entry.isCurrentActive && (
                                                                <button
                                                                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 transition-colors flex items-center gap-1"
                                                                    title="Revert configuration to this version"
                                                                    type="button"
                                                                    onClick={() => setRevertTargetEntry(entry)}
                                                                >
                                                                    <ArrowCounterClockwiseIcon className="w-3.5 h-3.5" weight="bold" />
                                                                    <span>Revert</span>
                                                                </button>
                                                            )}

                                                            <button
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                                title={isExpanded ? 'Hide snapshot summary' : 'Show snapshot summary'}
                                                                type="button"
                                                                onClick={() => toggleExpand(entry.id)}
                                                            >
                                                                {isExpanded ? (
                                                                    <CaretUpIcon className="w-4 h-4" weight="bold" />
                                                                ) : (
                                                                    <CaretDownIcon className="w-4 h-4" weight="bold" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Collapsible Quick Snapshot Breakdown */}
                                                    {isExpanded && snap && (
                                                        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3 space-y-3 text-xs">
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                                        Code & Label
                                                                    </span>
                                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 break-words mt-0.5">
                                                                        {snap.code} — {snap.label}
                                                                    </p>
                                                                </div>

                                                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                                        Schedule Dates
                                                                    </span>
                                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 break-words mt-0.5">
                                                                        {formatShortDate(snap.start_date || '')} — {formatShortDate(snap.end_date || '')}
                                                                    </p>
                                                                </div>

                                                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                                        Terms & Holidays
                                                                    </span>
                                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                        {snap.terms_count ?? (snap.terms?.length || 0)} Terms • {snap.holidays_count ?? (snap.holidays?.length || 0)} Holidays
                                                                    </p>
                                                                </div>

                                                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">
                                                                        Schema & Thresholds
                                                                    </span>
                                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                                                        {snap.transmutation_rows_count ?? (snap.transmutation_rows?.length || 0)} Grades • {snap.thresholds_count ?? (snap.thresholds?.length || 0)} Rules
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. VIEW VERSION MODE */}
                        {activeMode === 'view' && selectedVersion && (
                            <div className="space-y-4">
                                {/* Top Controls Bar: Version Selector & Revert Action */}
                                <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                            Select Version:
                                        </label>
                                        <select
                                            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                            value={selectedVersion.id}
                                            onChange={(e) => setSelectedVersionId(e.target.value)}
                                        >
                                            {enrichedHistory.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.versionLabel} — {item.formattedDate} ({item.action})
                                                </option>
                                            ))}
                                        </select>

                                        {selectedVersion.isCurrentActive ? (
                                            <span className="self-start sm:self-auto text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                                <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" weight="bold" />
                                                Active Version
                                            </span>
                                        ) : (
                                            <span className="self-start sm:self-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500">
                                                Archived Revision
                                            </span>
                                        )}
                                    </div>

                                    {!selectedVersion.isCurrentActive && (
                                        <CommonButton
                                            className="w-full sm:w-auto"
                                            color="primary"
                                            size="small"
                                            startIcon={<ArrowCounterClockwiseIcon className="w-4 h-4" weight="bold" />}
                                            variant="contained"
                                            onClick={() => setRevertTargetEntry(selectedVersion)}
                                        >
                                            Revert to Version {selectedVersion.versionNum}
                                        </CommonButton>
                                    )}
                                </div>

                                {/* Full Snapshot Breakdown */}
                                <VersionDetailsPanel snapshot={selectedVersion.snapshot} />
                            </div>
                        )}

                        {/* 3. COMPARE MODE */}
                        {activeMode === 'compare' && (
                            <div className="space-y-4">
                                {/* Compare Header & Version Pickers */}
                                <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        {/* Version A Picker */}
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                Version A (Base):
                                            </label>
                                            <select
                                                className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                                value={compareVersionA?.id || ''}
                                                onChange={(e) => setCompareVersionAId(e.target.value)}
                                            >
                                                {enrichedHistory.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.versionLabel} — {item.formattedDate}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Swap Button */}
                                        <div className="flex justify-center sm:pt-5 shrink-0">
                                            <button
                                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors"
                                                title="Swap comparison versions"
                                                type="button"
                                                onClick={handleSwapCompareVersions}
                                            >
                                                <ArrowsLeftRightIcon className="w-4 h-4" weight="bold" />
                                            </button>
                                        </div>

                                        {/* Version B Picker */}
                                        <div className="flex-1 min-w-0">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                                Version B (Comparison):
                                            </label>
                                            <select
                                                className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                                value={compareVersionB?.id || ''}
                                                onChange={(e) => setCompareVersionBId(e.target.value)}
                                            >
                                                {enrichedHistory.map((item) => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.versionLabel} — {item.formattedDate}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison Grid */}
                                {compareVersionA && compareVersionB && (
                                    <VersionComparisonView
                                        versionA={compareVersionA}
                                        versionB={compareVersionB}
                                        onRevert={(entry) => setRevertTargetEntry(entry)}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Revert Confirmation Dialog */}
            <CommonPromptModal
                actionIconProps={{
                    icon: ArrowCounterClockwiseIcon,
                    iconContainerClassName: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                }}
                formButtonsProps={{
                    cancelProps: {
                        disabled: isReverting,
                        onClick: () => setRevertTargetEntry(null)
                    },
                    confirmProps: {
                        children: isReverting ? 'Reverting...' : `Revert to Version ${revertTargetEntry?.versionNum}`,
                        color: 'primary',
                        disabled: isReverting,
                        onClick: handleExecuteRevert
                    }
                }}
                mainContent={{
                    title: `Revert to Version ${revertTargetEntry?.versionNum}?`
                }}
                open={Boolean(revertTargetEntry)}
                subContent={{
                    title: `This will restore the terms, grading periods, thresholds, holidays, and grade schema from Version ${revertTargetEntry?.versionNum} (${revertTargetEntry?.formattedDate}) as the active configuration. Are you sure you want to proceed?`
                }}
                onClose={() => setRevertTargetEntry(null)}
            />
        </CommonModal>
    );
}

/**
 * VersionDetailsPanel
 *
 * Full structured view of an academic year snapshot
 */
function VersionDetailsPanel({ snapshot: snap }: { snapshot?: AcademicYearHistoryItem['snapshot'] }) {
    if (!snap) {
        return <p className="text-xs text-slate-500 text-center py-6">No snapshot data available.</p>;
    }

    return (
        <div className="space-y-4">
            {/* Identity & System Details Card */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <CalendarDotsIcon className="w-4 h-4 text-brand-600" weight="bold" />
                    <span>Identity, Dates & System Configuration</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Code</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 break-words mt-0.5">{snap.code || '—'}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Label</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 break-words mt-0.5">{snap.label || '—'}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Start Date</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatShortDate(snap.start_date || '') || '—'}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">End Date</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatShortDate(snap.end_date || '') || '—'}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Status</span>
                        <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-full mt-0.5 ${
                            snap.is_active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-slate-300'
                        }`}>
                            {snap.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Max Units / Scope</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                            {snap.max_units_per_term ?? 24} Units • {snap.evaluation_scope || 'Period'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Terms & Grading Periods */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <CalendarDotsIcon className="w-4 h-4 text-emerald-600" weight="bold" />
                    <span>Academic Terms & Grading Periods ({snap.terms?.length || 0})</span>
                </div>

                {(!snap.terms || snap.terms.length === 0) ? (
                    <p className="text-xs text-slate-500 py-2">No terms declared in this version.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {snap.terms.map((t, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 space-y-2 text-xs">
                                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                    <span className="text-sm">{t.term_type_label || `Term #${idx + 1}`}</span>
                                    <span className="text-slate-500 font-normal">
                                        {formatShortDate(t.start_date)} — {formatShortDate(t.end_date)}
                                    </span>
                                </div>

                                <div className="text-[11px] text-slate-500 space-y-0.5">
                                    {t.enrollment_start_date && (
                                        <p>Enrollment: {formatShortDate(t.enrollment_start_date)} — {formatShortDate(t.enrollment_end_date)}</p>
                                    )}
                                    {t.grading_deadline && (
                                        <p>Grade Submission Deadline: {formatShortDate(t.grading_deadline)}</p>
                                    )}
                                </div>

                                {t.grading_periods && t.grading_periods.length > 0 && (
                                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-zinc-700/60">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Grading Periods</span>
                                        <div className="flex flex-wrap gap-1">
                                            {t.grading_periods.map((gp, gpIdx) => (
                                                <span key={gpIdx} className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                                                    {gp.name} ({gp.weight}%)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Transmutation Schema Ladder */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <ScalesIcon className="w-4 h-4 text-purple-600" weight="bold" />
                    <span>Grade Transmutation Ladder ({snap.transmutation_rows?.length || 0} rungs)</span>
                </div>

                {(!snap.transmutation_rows || snap.transmutation_rows.length === 0) ? (
                    <p className="text-xs text-slate-500 py-2">No transmutation schema defined in this version.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {snap.transmutation_rows.map((row, rIdx) => (
                            <div key={rIdx} className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs">
                                <div className="flex items-center justify-between font-bold">
                                    <span className="text-brand-600 dark:text-brand-400">{row.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                        row.is_passing
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                    }`}>
                                        {row.is_passing ? 'Pass' : 'Fail'}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                    {row.is_conditional ? (
                                        <span>Status Code: {row.special_code || row.label}</span>
                                    ) : (
                                        <span>{row.min_percentage}% — {row.max_percentage}%</span>
                                    )}
                                </div>
                                {row.description && (
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{row.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Academic Thresholds */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                    <GraduationCapIcon className="w-4 h-4 text-brand-600" weight="bold" />
                    <span>Academic Thresholds & Cutoffs ({snap.thresholds?.length || 0} rules)</span>
                </div>

                {(!snap.thresholds || snap.thresholds.length === 0) ? (
                    <p className="text-xs text-slate-500 py-2">No academic thresholds defined in this version.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {snap.thresholds.map((th, thIdx) => (
                            <div key={thIdx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                    <span>{th.label}</span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                        {th.category}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 space-y-0.5">
                                    <p>Max GWA Cutoff: <strong>≤ {th.max_gwa}</strong></p>
                                    {th.min_subject_grade && <p>Subject Floor: <strong>≤ {th.min_subject_grade}</strong></p>}
                                    {th.requires_no_failing && <p className="text-amber-600 dark:text-amber-400 font-medium">No failing marks allowed</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Holidays / Exceptions */}
            {snap.holidays && snap.holidays.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                        <SunIcon className="w-4 h-4 text-amber-500" weight="bold" />
                        <span>Calendar Exceptions & Holidays ({snap.holidays.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {snap.holidays.map((h, hIdx) => (
                            <div key={hIdx} className="p-2 rounded bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 break-words">{h.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {h.exception_type} • {formatShortDate(h.start_date)}{h.end_date && h.end_date !== h.start_date ? ` — ${formatShortDate(h.end_date)}` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * VersionComparisonView
 *
 * Side-by-side on desktop, stacked on mobile comparison between two versions
 */
function VersionComparisonView({
    versionA,
    versionB,
    onRevert
}: {
    versionA: EnrichedHistoryItem;
    versionB: EnrichedHistoryItem;
    onRevert: (entry: EnrichedHistoryItem) => void;
}) {
    const snapA = versionA.snapshot;
    const snapB = versionB.snapshot;

    const diffChecks = [
        {
            label: 'Code',
            valA: snapA?.code || '—',
            valB: snapB?.code || '—',
            changed: snapA?.code !== snapB?.code
        },
        {
            label: 'Label',
            valA: snapA?.label || '—',
            valB: snapB?.label || '—',
            changed: snapA?.label !== snapB?.label
        },
        {
            label: 'Start Date',
            valA: formatShortDate(snapA?.start_date || '') || '—',
            valB: formatShortDate(snapB?.start_date || '') || '—',
            changed: snapA?.start_date !== snapB?.start_date
        },
        {
            label: 'End Date',
            valA: formatShortDate(snapA?.end_date || '') || '—',
            valB: formatShortDate(snapB?.end_date || '') || '—',
            changed: snapA?.end_date !== snapB?.end_date
        },
        {
            label: 'Active Status',
            valA: snapA?.is_active ? 'Active' : 'Inactive',
            valB: snapB?.is_active ? 'Active' : 'Inactive',
            changed: Boolean(snapA?.is_active) !== Boolean(snapB?.is_active)
        },
        {
            label: 'Evaluation Scope',
            valA: snapA?.evaluation_scope || 'Period',
            valB: snapB?.evaluation_scope || 'Period',
            changed: snapA?.evaluation_scope !== snapB?.evaluation_scope
        },
        {
            label: 'Terms Count',
            valA: `${snapA?.terms?.length || snapA?.terms_count || 0} terms`,
            valB: `${snapB?.terms?.length || snapB?.terms_count || 0} terms`,
            changed: (snapA?.terms?.length || snapA?.terms_count || 0) !== (snapB?.terms?.length || snapB?.terms_count || 0)
        },
        {
            label: 'Transmutation Rungs',
            valA: `${snapA?.transmutation_rows?.length || snapA?.transmutation_rows_count || 0} grades`,
            valB: `${snapB?.transmutation_rows?.length || snapB?.transmutation_rows_count || 0} grades`,
            changed: (snapA?.transmutation_rows?.length || snapA?.transmutation_rows_count || 0) !== (snapB?.transmutation_rows?.length || snapB?.transmutation_rows_count || 0)
        },
        {
            label: 'Academic Thresholds',
            valA: `${snapA?.thresholds?.length || snapA?.thresholds_count || 0} rules`,
            valB: `${snapB?.thresholds?.length || snapB?.thresholds_count || 0} rules`,
            changed: (snapA?.thresholds?.length || snapA?.thresholds_count || 0) !== (snapB?.thresholds?.length || snapB?.thresholds_count || 0)
        },
        {
            label: 'Holidays Count',
            valA: `${snapA?.holidays?.length || snapA?.holidays_count || 0} exceptions`,
            valB: `${snapB?.holidays?.length || snapB?.holidays_count || 0} exceptions`,
            changed: (snapA?.holidays?.length || snapA?.holidays_count || 0) !== (snapB?.holidays?.length || snapB?.holidays_count || 0)
        }
    ];

    const totalDiffs = diffChecks.filter((d) => d.changed).length;

    return (
        <div className="space-y-4">
            {/* Diff Summary Bar */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        Comparing v{versionA.versionNum} vs v{versionB.versionNum}:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        totalDiffs > 0
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                        {totalDiffs > 0 ? `${totalDiffs} configurations differ` : 'Identical configurations'}
                    </span>
                </div>
            </div>

            {/* Core Attributes Diff Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                    Configuration Comparison Table
                </div>

                <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                    <div className="grid grid-cols-12 p-2.5 font-bold bg-slate-50/50 dark:bg-zinc-800/30 text-[11px] text-slate-400 uppercase tracking-wider">
                        <div className="col-span-4 sm:col-span-3">Setting</div>
                        <div className="col-span-4 sm:col-span-4">Version {versionA.versionNum} (Base)</div>
                        <div className="col-span-4 sm:col-span-5">Version {versionB.versionNum} (Target)</div>
                    </div>

                    {diffChecks.map((diff, idx) => (
                        <div
                            key={idx}
                            className={`grid grid-cols-12 p-2.5 items-center ${
                                diff.changed
                                    ? 'bg-amber-50/60 dark:bg-amber-950/20'
                                    : 'hover:bg-slate-50/40 dark:hover:bg-zinc-800/20'
                            }`}
                        >
                            <div className="col-span-4 sm:col-span-3 font-medium text-slate-700 dark:text-slate-300">
                                {diff.label}
                            </div>
                            <div className="col-span-4 sm:col-span-4 text-slate-600 dark:text-slate-400 break-words pr-2">
                                {diff.valA}
                            </div>
                            <div className="col-span-4 sm:col-span-5 flex items-center justify-between gap-1 break-words">
                                <span className={diff.changed ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}>
                                    {diff.valB}
                                </span>
                                {diff.changed && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                                        Changed
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Side-by-Side (Desktop) / Stacked (Mobile) Detailed Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column A */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                        <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Version {versionA.versionNum}
                            </span>
                            <p className="text-[11px] text-slate-500">{versionA.formattedDate}</p>
                        </div>
                        {!versionA.isCurrentActive && (
                            <CommonButton
                                color="primary"
                                size="small"
                                startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" weight="bold" />}
                                variant="outlined"
                                onClick={() => onRevert(versionA)}
                            >
                                Revert to v{versionA.versionNum}
                            </CommonButton>
                        )}
                    </div>
                    <VersionDetailsPanel snapshot={versionA.snapshot} />
                </div>

                {/* Column B */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                        <div>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Version {versionB.versionNum}
                            </span>
                            <p className="text-[11px] text-slate-500">{versionB.formattedDate}</p>
                        </div>
                        {!versionB.isCurrentActive && (
                            <CommonButton
                                color="primary"
                                size="small"
                                startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" weight="bold" />}
                                variant="outlined"
                                onClick={() => onRevert(versionB)}
                            >
                                Revert to v{versionB.versionNum}
                            </CommonButton>
                        )}
                    </div>
                    <VersionDetailsPanel snapshot={versionB.snapshot} />
                </div>
            </div>
        </div>
    );
}
