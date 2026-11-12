import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
    CompareViewMode,
    computeHistoryDiffMarks,
    computeStepDiffCounts,
    snapshotToWizardValues
} from '@pages/admin/school-year-management/wizard/academic-year-history';
import { buildAcademicYearCalendarPayload, collectAcademicYearValidationErrors } from '@pages/admin/school-year-management/wizard/academic-year-payload';
import Step1SchoolYearInfo from '@pages/admin/school-year-management/wizard/Step1SchoolYearInfo';
import Step2TermsConfig from '@pages/admin/school-year-management/wizard/Step2TermsConfig';
import Step3GradingPeriodsConfig from '@pages/admin/school-year-management/wizard/Step3GradingPeriodsConfig';
import Step4HolidaysConfig from '@pages/admin/school-year-management/wizard/Step4HolidaysConfig';
import Step4TransmutationConfig from '@pages/admin/school-year-management/wizard/Step4TransmutationConfig';
import Step5ThresholdsConfig from '@pages/admin/school-year-management/wizard/Step5ThresholdsConfig';
import { WIZARD_STEPS } from '@pages/admin/school-year-management/wizard/wizard.constants';
import {
    ArrowCounterClockwiseIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowsLeftRightIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    DotsThreeVerticalIcon,
    EyeIcon,
    InfoIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAcademicYearHistory, saveAcademicYearCalendar } from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import { AcademicYearHistoryItem, AcademicYearWizardFormValues } from '@type/school-year.type';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

interface AcademicYearHistoryModalProps {
    /** The wizard behind this modal has unsaved edits that a revert would throw away. */
    hasUnsavedChanges?: boolean;
    open: boolean;
    schoolYearId?: string | null;
    schoolYearLabel?: string;
    onClose: VoidFunction;
    onReverted?: VoidFunction;
}

interface EnrichedHistoryItem extends AcademicYearHistoryItem {
    versionNum: number;
    versionLabel: string;
    isCurrentActive: boolean;
    formattedDate: string;
}

function resolveActiveHistoryId(items: AcademicYearHistoryItem[]): string | null {
    if (items.length === 0) return null;
    const explicitActive = items.find(
        (item) => item.is_active_version === true || item.changes?.is_active_version === true
    );
    if (explicitActive) {
        return explicitActive.id;
    }
    return items[0].id;
}

export default function AcademicYearHistoryModal({
    hasUnsavedChanges = false,
    open,
    schoolYearId,
    schoolYearLabel,
    onClose,
    onReverted
}: AcademicYearHistoryModalProps) {
    const [history, setHistory] = useState<AcademicYearHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isReverting, setIsReverting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [comparedVersionId, setComparedVersionId] = useState<string | null>(null);
    const [compareViewMode, setCompareViewMode] = useState<CompareViewMode>('modified');
    const [revertTargetEntry, setRevertTargetEntry] = useState<EnrichedHistoryItem | null>(null);
    const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState<null | HTMLElement>(null);

    const loadHistory = useCallback(async(preferredSelectedId?: string | null) => {
        if (!schoolYearId) return;
        setIsLoading(true);
        try {
            const res = await getAcademicYearHistory(schoolYearId);
            if (res.data) {
                setHistory(res.data);
                if (res.data.length > 0) {
                    const activeId = resolveActiveHistoryId(res.data);
                    const nextSelectedId
                        = preferredSelectedId && res.data.some((r) => r.id === preferredSelectedId)
                            ? preferredSelectedId
                            : activeId || res.data[0].id;
                    setSelectedVersionId(nextSelectedId);

                    if (res.data.length > 1) {
                        const historyRows = res.data;
                        const fallbackCompared = historyRows.find((r) => r.id !== nextSelectedId) || historyRows[1];
                        setComparedVersionId((prev) =>
                            prev && prev !== nextSelectedId && historyRows.some((r) => r.id === prev)
                                ? prev
                                : fallbackCompared.id);
                    }
                    else {
                        setComparedVersionId(null);
                        setIsCompareMode(false);
                    }
                }
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [schoolYearId]);

    useEffect(() => {
        if (!open || !schoolYearId) {
            setHistory([]);
            setCurrentStep(1);
            setSelectedVersionId(null);
            setIsCompareMode(false);
            setComparedVersionId(null);
            setCompareViewMode('modified');
            setRevertTargetEntry(null);
            setMobileMenuAnchorEl(null);
            return;
        }
        loadHistory();
    }, [open, schoolYearId, loadHistory]);

    // Enriched versions with sequential version numbers: v1 (oldest) to vN (newest)
    const enrichedHistory: EnrichedHistoryItem[] = useMemo(() => {
        const total = history.length;
        const activeId = resolveActiveHistoryId(history);

        return history.map((item, idx) => {
            const versionNum = total - idx;
            const isCurrentActive = item.id === activeId;
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
                versionLabel: `v${versionNum}`,
                isCurrentActive,
                formattedDate
            };
        });
    }, [history]);

    // Modified version (primary selected version)
    const selectedVersion = useMemo(() => {
        return enrichedHistory.find((v) => v.id === selectedVersionId) || enrichedHistory[0] || null;
    }, [enrichedHistory, selectedVersionId]);

    // Original version (baseline compared version)
    const comparedVersion = useMemo(() => {
        if (enrichedHistory.length <= 1) return null;
        const found = enrichedHistory.find((v) => v.id === comparedVersionId);
        if (found && found.id !== selectedVersion?.id) return found;
        return enrichedHistory.find((v) => v.id !== selectedVersion?.id) || enrichedHistory[1] || null;
    }, [enrichedHistory, comparedVersionId, selectedVersion]);

    const hasMultipleVersions = enrichedHistory.length > 1;

    // Compute per-step difference counts between Original (comparedVersion) and Modified (selectedVersion)
    const stepDiffCounts = useMemo(() => {
        if (!isCompareMode || !selectedVersion || !comparedVersion) return null;
        return computeStepDiffCounts(comparedVersion.snapshot, selectedVersion.snapshot);
    }, [isCompareMode, selectedVersion, comparedVersion]);

    const totalDiffCount = useMemo(() => {
        if (!stepDiffCounts) return 0;
        return Object.values(stepDiffCounts)
            .reduce((sum, count) => sum + count, 0);
    }, [stepDiffCounts]);

    // Version currently shown in the step body
    const activeDisplayVersion = useMemo(() => {
        if (isCompareMode && comparedVersion) {
            return compareViewMode === 'original'
                ? comparedVersion
                : selectedVersion;
        }
        return selectedVersion;
    }, [isCompareMode, compareViewMode, comparedVersion, selectedVersion]);

    const counterpartVersion = useMemo(() => {
        if (!isCompareMode || !comparedVersion || !selectedVersion) return null;
        return compareViewMode === 'original'
            ? selectedVersion
            : comparedVersion;
    }, [isCompareMode, compareViewMode, comparedVersion, selectedVersion]);

    function handleSwapVersions() {
        if (!selectedVersion || !comparedVersion) return;
        const prevSelected = selectedVersion.id;
        setSelectedVersionId(comparedVersion.id);
        setComparedVersionId(prevSelected);
    }

    async function handleExecuteRevert() {
        if (!revertTargetEntry || !schoolYearId) return;
        const targetId = revertTargetEntry.id;
        const targetVerNum = revertTargetEntry.versionNum;
        const values = snapshotToWizardValues(revertTargetEntry.snapshot, schoolYearId);

        // A saved version goes through the same checks as the wizard before it is restored
        const problems = collectAcademicYearValidationErrors(values);
        if (problems.length > 0) {
            const extra = problems.length > 1
                ? ` (and ${problems.length - 1} more issue${problems.length > 2
                    ? 's'
                    : ''})`
                : '';
            useToastStore.getState()
                .showToast(`Version ${targetVerNum} cannot be restored: ${problems[0]}${extra}`, 'error');
            return;
        }

        setIsReverting(true);
        try {
            const payload = buildAcademicYearCalendarPayload(values, values.terms, targetId);
            // Silent call: this screen shows exactly one message for the result
            const res = await saveAcademicYearCalendar(payload, { silent: true });
            if (res.error) {
                useToastStore.getState()
                    .showToast(
                        res.error.message || 'Failed to revert academic year version.',
                        'error'
                    );
                return;
            }

            useToastStore.getState()
                .showToast(
                    `Academic year successfully reverted to Version ${targetVerNum}.`,
                    'success'
                );
            setRevertTargetEntry(null);
            onReverted?.();
            onClose();
        }
        finally {
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
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug inline-flex items-center gap-1.5">
                                <span>Academic Year History & Versions</span>
                                <CommonInfoTooltip
                                    content="Audit trail, version inspection, original vs. modified toggle comparison, and snapshot reversion."
                                    label="About Academic Year History"
                                    size={15}
                                />
                            </h2>
                            {schoolYearLabel && (
                                <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold truncate max-w-[180px] sm:max-w-none">
                                    {schoolYearLabel}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    aria-label="Close"
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Version Control & Comparison Section */}
            <div className="px-3.5 sm:px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/90 shrink-0 space-y-2.5">
                {!isCompareMode
                    ? (
                        /* Single Version Inspection Bar — Selector color indicates Active (green) vs Archived (amber/slate) */
                        <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                    Version:
                                </span>
                                <div className="min-w-0 flex-1 sm:max-w-md relative flex items-center">
                                    <span
                                        aria-hidden="true"
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 absolute left-3 pointer-events-none ${
                                            selectedVersion?.isCurrentActive
                                                ? 'bg-emerald-500 ring-2 ring-emerald-500/25'
                                                : 'bg-amber-500 ring-2 ring-amber-500/25'
                                        }`}
                                    />
                                    <select
                                        aria-label="Select Academic Year Version"
                                        className={`w-full h-9 pl-7 pr-3 text-xs font-bold rounded-lg border transition-colors focus:outline-none focus:ring-2 cursor-pointer truncate ${
                                            selectedVersion?.isCurrentActive
                                                ? 'bg-emerald-50/90 border-emerald-400 text-emerald-900 focus:ring-emerald-500/40 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200'
                                                : 'bg-amber-50/80 border-amber-300 text-amber-900 focus:ring-amber-500/40 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
                                        }`}
                                        title={selectedVersion?.isCurrentActive
                                            ? 'Active Version'
                                            : 'Archived Version'}
                                        value={selectedVersion?.id || ''}
                                        onChange={(e) => setSelectedVersionId(e.target.value)}
                                    >
                                        {enrichedHistory.map((item) => (
                                            <option
                                                className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive
                                                    ? ' [Active]'
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Mobile Action Controls: Kebab Menu */}
                            {(hasMultipleVersions || (selectedVersion && !selectedVersion.isCurrentActive)) && (
                                <div className="flex sm:hidden items-center shrink-0">
                                    <button
                                        aria-label="Version actions"
                                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                        type="button"
                                        onClick={(e) => setMobileMenuAnchorEl(e.currentTarget)}
                                    >
                                        <DotsThreeVerticalIcon
                                            className="w-4 h-4"
                                            weight="bold"
                                        />
                                    </button>
                                </div>
                            )}

                            {/* Desktop Action Controls */}
                            <div className="hidden sm:flex items-center justify-end gap-2 shrink-0">
                                {selectedVersion && !selectedVersion.isCurrentActive && (
                                    <CommonButton
                                        className="min-w-0 px-2.5 py-1.5 text-xs"
                                        color="primary"
                                        size="small"
                                        startIcon={(
                                            <ArrowCounterClockwiseIcon
                                                className="w-3.5 h-3.5"
                                                weight="bold"
                                            />
                                        )}
                                        variant="outlined"
                                        onClick={() => setRevertTargetEntry(selectedVersion)}
                                    >
                                        Revert to v{selectedVersion.versionNum}
                                    </CommonButton>
                                )}

                                {hasMultipleVersions && (
                                    <button
                                        aria-pressed={isCompareMode}
                                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all border bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-zinc-700 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 dark:hover:bg-brand-950/50 dark:hover:text-brand-300 cursor-pointer shrink-0 shadow-2xs"
                                        type="button"
                                        onClick={() => {
                                            setCompareViewMode('modified');
                                            setIsCompareMode(true);
                                        }}
                                    >
                                        <ArrowsLeftRightIcon
                                            className="w-3.5 h-3.5"
                                            weight="bold"
                                        />
                                        <span>Compare Versions</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                    : (
                        /* Editor-Style Original vs. Modified Toggle Comparison Panel */
                        <div className="space-y-2.5">
                            {/* Mobile Compare Bar: Shows currently viewed version badge and the 3-dots menu button containing all controls */}
                            <div className="flex sm:hidden items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span
                                        className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] shrink-0 ${
                                            compareViewMode === 'original'
                                                ? 'bg-slate-200 text-slate-800 dark:bg-zinc-700 dark:text-slate-200'
                                                : 'bg-brand-600 text-white'
                                        }`}
                                    >
                                        Viewing {compareViewMode === 'original'
                                            ? 'Original'
                                            : 'Modified'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        v{activeDisplayVersion?.versionNum} ({activeDisplayVersion?.formattedDate})
                                    </span>
                                </div>
                                <button
                                    aria-label="Compare actions"
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                                    type="button"
                                    onClick={(e) => setMobileMenuAnchorEl(e.currentTarget)}
                                >
                                    <DotsThreeVerticalIcon
                                        className="w-4 h-4"
                                        weight="bold"
                                    />
                                </button>
                            </div>

                            {/* Desktop Row 1: Original / Modified Toggle Switch & Summary Actions */}
                            <div className="hidden sm:flex sm:items-center justify-between gap-2">
                                {/* Segmented Toggle: Original vs Modified */}
                                <div
                                    aria-label="Toggle between Original and Modified version"
                                    className="inline-grid grid-cols-2 p-1 rounded-xl bg-slate-200/80 dark:bg-zinc-800 border border-slate-300/70 dark:border-zinc-700 w-auto"
                                    role="group"
                                >
                                    <button
                                        aria-pressed={compareViewMode === 'original'}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-0 ${
                                            compareViewMode === 'original'
                                                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-slate-300/80 dark:ring-zinc-700'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                        type="button"
                                        onClick={() => setCompareViewMode('original')}
                                    >
                                        <EyeIcon
                                            className="w-3.5 h-3.5 shrink-0"
                                            weight={compareViewMode === 'original'
                                                ? 'fill'
                                                : 'regular'}
                                        />
                                        <span className="truncate">Original (v{comparedVersion?.versionNum})</span>
                                    </button>

                                    <button
                                        aria-pressed={compareViewMode === 'modified'}
                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-w-0 ${
                                            compareViewMode === 'modified'
                                                ? 'bg-brand-600 text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                        type="button"
                                        onClick={() => setCompareViewMode('modified')}
                                    >
                                        <EyeIcon
                                            className="w-3.5 h-3.5 shrink-0"
                                            weight={compareViewMode === 'modified'
                                                ? 'fill'
                                                : 'regular'}
                                        />
                                        <span className="truncate">Modified (v{selectedVersion?.versionNum})</span>
                                    </button>
                                </div>

                                {/* Right Side: Total Differences Pill, Revert, & Exit Compare */}
                                <div className="flex items-center justify-end gap-2">
                                    <span
                                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                                            totalDiffCount > 0
                                                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                        }`}
                                    >
                                        {totalDiffCount > 0
                                            ? `${totalDiffCount} total ${totalDiffCount === 1
                                                ? 'difference'
                                                : 'differences'}`
                                            : 'No differences'}
                                    </span>

                                    {/* Desktop Action Controls */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {activeDisplayVersion && !activeDisplayVersion.isCurrentActive && (
                                            <CommonButton
                                                className="min-w-0 px-2.5 py-1 text-xs"
                                                color="primary"
                                                size="small"
                                                startIcon={(
                                                    <ArrowCounterClockwiseIcon
                                                        className="w-3.5 h-3.5"
                                                        weight="bold"
                                                    />
                                                )}
                                                variant="outlined"
                                                onClick={() => setRevertTargetEntry(activeDisplayVersion)}
                                            >
                                                Revert to v{activeDisplayVersion.versionNum}
                                            </CommonButton>
                                        )}

                                        <button
                                            aria-pressed={isCompareMode}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all border bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-700 hover:bg-brand-100 dark:hover:bg-brand-900/60 cursor-pointer shrink-0"
                                            type="button"
                                            onClick={() => setIsCompareMode(false)}
                                        >
                                            <XIcon
                                                className="w-3.5 h-3.5"
                                                weight="bold"
                                            />
                                            <span>Exit Compare</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Row 2: Clean Non-Overflowing Original & Modified Version Selectors colored by Active (green) vs Archived */}
                            {comparedVersion && selectedVersion && (
                                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                                    {/* Original Version Selector Card */}
                                    <div
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all min-w-0 ${
                                            comparedVersion.isCurrentActive
                                                ? 'bg-emerald-50/90 dark:bg-emerald-950/45 border-emerald-400 dark:border-emerald-600'
                                                : 'bg-amber-50/75 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700'
                                        } ${compareViewMode === 'original'
                                            ? 'ring-2 ring-slate-400/30 shadow-2xs'
                                            : ''}`}
                                    >
                                        <button
                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/90 dark:bg-zinc-700 text-slate-800 dark:text-slate-200 shrink-0 cursor-pointer"
                                            title="Switch view to Original version"
                                            type="button"
                                            onClick={() => setCompareViewMode('original')}
                                        >
                                            Original
                                        </button>
                                        <span
                                            aria-hidden="true"
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                comparedVersion.isCurrentActive
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-500'
                                            }`}
                                        />
                                        <select
                                            aria-label="Select Original Version"
                                            className={`w-full min-w-0 h-7 text-xs font-bold bg-transparent focus:outline-none cursor-pointer truncate ${
                                                comparedVersion.isCurrentActive
                                                    ? 'text-emerald-900 dark:text-emerald-200'
                                                    : 'text-amber-900 dark:text-amber-200'
                                            }`}
                                            value={comparedVersion.id}
                                            onChange={(e) => {
                                                setComparedVersionId(e.target.value);
                                                setCompareViewMode('original');
                                            }}
                                        >
                                            {enrichedHistory
                                                .filter((v) => v.id !== selectedVersion.id)
                                                .map((item) => (
                                                    <option
                                                        className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive
                                                            ? ' [Active]'
                                                            : ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {/* Swap Original & Modified Button (Desktop only; on mobile it is in the 3-dots menu) */}
                                    <div className="hidden sm:flex justify-center">
                                        <button
                                            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs shrink-0"
                                            title="Swap Original and Modified versions"
                                            type="button"
                                            onClick={handleSwapVersions}
                                        >
                                            <ArrowsLeftRightIcon
                                                className="w-3.5 h-3.5"
                                                weight="bold"
                                            />
                                        </button>
                                    </div>

                                    {/* Modified Version Selector Card */}
                                    <div
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all min-w-0 ${
                                            selectedVersion.isCurrentActive
                                                ? 'bg-emerald-50/90 dark:bg-emerald-950/45 border-emerald-400 dark:border-emerald-600'
                                                : 'bg-amber-50/75 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700'
                                        } ${compareViewMode === 'modified'
                                            ? 'ring-2 ring-brand-500/30 shadow-2xs'
                                            : ''}`}
                                    >
                                        <button
                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 shrink-0 cursor-pointer"
                                            title="Switch view to Modified version"
                                            type="button"
                                            onClick={() => setCompareViewMode('modified')}
                                        >
                                            Modified
                                        </button>
                                        <span
                                            aria-hidden="true"
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                                selectedVersion.isCurrentActive
                                                    ? 'bg-emerald-500'
                                                    : 'bg-amber-500'
                                            }`}
                                        />
                                        <select
                                            aria-label="Select Modified Version"
                                            className={`w-full min-w-0 h-7 text-xs font-bold bg-transparent focus:outline-none cursor-pointer truncate ${
                                                selectedVersion.isCurrentActive
                                                    ? 'text-emerald-900 dark:text-emerald-200'
                                                    : 'text-amber-900 dark:text-amber-200'
                                            }`}
                                            value={selectedVersion.id}
                                            onChange={(e) => {
                                                setSelectedVersionId(e.target.value);
                                                setCompareViewMode('modified');
                                            }}
                                        >
                                            {enrichedHistory
                                                .filter((v) => v.id !== comparedVersion.id)
                                                .map((item) => (
                                                    <option
                                                        className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive
                                                            ? ' [Active]'
                                                            : ''}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
            </div>

            {/* Mobile Actions Dropdown Menu */}
            <Menu
                anchorEl={mobileMenuAnchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                open={Boolean(mobileMenuAnchorEl)}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 260,
                            maxWidth: 320,
                            borderRadius: '0.75rem',
                            p: 0.5,
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                        }
                    }
                }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                onClose={() => setMobileMenuAnchorEl(null)}
            >
                {!isCompareMode
                    ? (
                        <div>
                            {selectedVersion && !selectedVersion.isCurrentActive && (
                                <MenuItem
                                    onClick={() => {
                                        setMobileMenuAnchorEl(null);
                                        setRevertTargetEntry(selectedVersion);
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        <ArrowCounterClockwiseIcon
                                            className="w-4 h-4 text-brand-600 dark:text-brand-400"
                                            weight="bold"
                                        />
                                        <span>Revert to v{selectedVersion.versionNum}</span>
                                    </div>
                                </MenuItem>
                            )}
                            {hasMultipleVersions && (
                                <MenuItem
                                    onClick={() => {
                                        setMobileMenuAnchorEl(null);
                                        setCompareViewMode('modified');
                                        setIsCompareMode(true);
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        <ArrowsLeftRightIcon
                                            className="w-4 h-4 text-brand-600 dark:text-brand-400"
                                            weight="bold"
                                        />
                                        <span>Compare Versions</span>
                                    </div>
                                </MenuItem>
                            )}
                        </div>
                    )
                    : comparedVersion && selectedVersion
                        ? (
                            <div className="py-1">
                                {/* Tab Switcher: Original vs Modified */}
                                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Switch View
                                </div>
                                <MenuItem
                                    selected={compareViewMode === 'original'}
                                    onClick={() => {
                                        setCompareViewMode('original');
                                        setMobileMenuAnchorEl(null);
                                    }}
                                >
                                    <div className="flex items-center justify-between w-full text-xs font-semibold">
                                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                            <EyeIcon
                                                className="w-4 h-4 text-slate-500"
                                                weight={compareViewMode === 'original'
                                                    ? 'fill'
                                                    : 'regular'}
                                            />
                                            <span>Original (v{comparedVersion.versionNum})</span>
                                        </div>
                                        {compareViewMode === 'original' && (
                                            <CheckCircleIcon
                                                className="w-4 h-4 text-brand-600"
                                                weight="fill"
                                            />
                                        )}
                                    </div>
                                </MenuItem>
                                <MenuItem
                                    selected={compareViewMode === 'modified'}
                                    onClick={() => {
                                        setCompareViewMode('modified');
                                        setMobileMenuAnchorEl(null);
                                    }}
                                >
                                    <div className="flex items-center justify-between w-full text-xs font-semibold">
                                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                            <EyeIcon
                                                className="w-4 h-4 text-brand-600"
                                                weight={compareViewMode === 'modified'
                                                    ? 'fill'
                                                    : 'regular'}
                                            />
                                            <span>Modified (v{selectedVersion.versionNum})</span>
                                        </div>
                                        {compareViewMode === 'modified' && (
                                            <CheckCircleIcon
                                                className="w-4 h-4 text-brand-600"
                                                weight="fill"
                                            />
                                        )}
                                    </div>
                                </MenuItem>

                                <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                                {/* Selectors for Original & Modified */}
                                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Original Version
                                </div>
                                <div
                                    className="px-3 pb-2 pt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <select
                                        aria-label="Select Original Version"
                                        className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                                        value={comparedVersion.id}
                                        onChange={(e) => {
                                            setComparedVersionId(e.target.value);
                                            setCompareViewMode('original');
                                            setMobileMenuAnchorEl(null);
                                        }}
                                    >
                                        {enrichedHistory
                                            .filter((v) => v.id !== selectedVersion.id)
                                            .map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive
                                                        ? ' [Active]'
                                                        : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    Modified Version
                                </div>
                                <div
                                    className="px-3 pb-2 pt-0.5"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <select
                                        aria-label="Select Modified Version"
                                        className="w-full h-8 px-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                                        value={selectedVersion.id}
                                        onChange={(e) => {
                                            setSelectedVersionId(e.target.value);
                                            setCompareViewMode('modified');
                                            setMobileMenuAnchorEl(null);
                                        }}
                                    >
                                        {enrichedHistory
                                            .filter((v) => v.id !== comparedVersion.id)
                                            .map((item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive
                                                        ? ' [Active]'
                                                        : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                                {/* Swap Original & Modified */}
                                <MenuItem
                                    onClick={() => {
                                        setMobileMenuAnchorEl(null);
                                        handleSwapVersions();
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        <ArrowsLeftRightIcon
                                            className="w-4 h-4 text-brand-600 dark:text-brand-400"
                                            weight="bold"
                                        />
                                        <span>Swap Original &amp; Modified</span>
                                    </div>
                                </MenuItem>

                                {/* Revert Option */}
                                {activeDisplayVersion && !activeDisplayVersion.isCurrentActive && (
                                    <MenuItem
                                        onClick={() => {
                                            setMobileMenuAnchorEl(null);
                                            setRevertTargetEntry(activeDisplayVersion);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                            <ArrowCounterClockwiseIcon
                                                className="w-4 h-4 text-brand-600 dark:text-brand-400"
                                                weight="bold"
                                            />
                                            <span>Revert to v{activeDisplayVersion.versionNum}</span>
                                        </div>
                                    </MenuItem>
                                )}

                                {/* Exit Compare */}
                                <MenuItem
                                    onClick={() => {
                                        setMobileMenuAnchorEl(null);
                                        setIsCompareMode(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                        <XIcon
                                            className="w-4 h-4"
                                            weight="bold"
                                        />
                                        <span>Exit Compare</span>
                                    </div>
                                </MenuItem>
                            </div>
                        )
                        : null}
            </Menu>

            {/* Academic Year Stepper Header with Step Difference Indicators */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly
                steps={WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle,
                    diffCount: stepDiffCounts
                        ? stepDiffCounts[s.step]
                        : undefined
                }))}
                onStepClick={(step) => setCurrentStep(step)}
            />

            {/* Stepper Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 dark:bg-zinc-900/50 min-h-[340px]">
                {isLoading
                    ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-500">Loading academic year history & versions...</p>
                        </div>
                    )
                    : !activeDisplayVersion
                        ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                                <InfoIcon className="w-10 h-10 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No history records found
                                </p>
                                <p className="text-xs text-slate-500 max-w-sm">
                            Any changes or revisions made to this academic year will be versioned and recorded here.
                                </p>
                            </div>
                        )
                        : (
                            <StepBaseContent
                                compareViewMode={isCompareMode && counterpartVersion
                                    ? compareViewMode
                                    : undefined}
                                counterpartVersion={counterpartVersion}
                                currentStep={currentStep}
                                key={activeDisplayVersion.id}
                                schoolYearId={schoolYearId ?? null}
                                stepDiffCount={stepDiffCounts
                                    ? stepDiffCounts[currentStep]
                                    : undefined}
                                version={activeDisplayVersion}
                                onToggleCompareViewMode={
                                    isCompareMode && counterpartVersion
                                        ? () => setCompareViewMode((prev) => (prev === 'original'
                                            ? 'modified'
                                            : 'original'))
                                        : undefined
                                }
                            />
                        )}
            </div>

            {/* Bottom Footer: Stepper Navigation Buttons */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
                <CommonButton
                    color="inherit"
                    disabled={currentStep <= 1}
                    size="small"
                    startIcon={(
                        <ArrowLeftIcon
                            className="w-4 h-4"
                            weight="bold"
                        />
                    )}
                    variant="outlined"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                >
                    Back
                </CommonButton>

                <div className="flex items-center gap-2">
                    {currentStep < WIZARD_STEPS.length
                        ? (
                            <CommonButton
                                color="primary"
                                endIcon={(
                                    <ArrowRightIcon
                                        className="w-4 h-4"
                                        weight="bold"
                                    />
                                )}
                                size="small"
                                variant="contained"
                                onClick={() => setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1))}
                            >
                            Next Step
                            </CommonButton>
                        )
                        : (
                            <CommonButton
                                color="primary"
                                size="small"
                                variant="contained"
                                onClick={onClose}
                            >
                            Close
                            </CommonButton>
                        )}
                </div>
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
                        children: isReverting
                            ? 'Reverting...'
                            : `Revert to Version ${revertTargetEntry?.versionNum}`,
                        color: 'primary',
                        disabled: isReverting,
                        loading: isReverting,
                        onClick: handleExecuteRevert
                    }
                }}
                mainContent={{
                    title: `Revert to Version ${revertTargetEntry?.versionNum}?`
                }}
                open={Boolean(revertTargetEntry)}
                subContent={{
                    title: `This will restore the terms, grading periods, thresholds, holidays, and grade schema from Version ${revertTargetEntry?.versionNum} (${revertTargetEntry?.formattedDate}) and set Version ${revertTargetEntry?.versionNum} as the active version without creating a new version.${hasUnsavedChanges
                        ? ' Your unsaved changes in the academic year form will be discarded.'
                        : ''} Are you sure you want to proceed?`
                }}
                onClose={() => setRevertTargetEntry(null)}
            />
        </CommonModal>
    );
}

/**
 * StepBaseContent
 *
 * Shows one saved version with the wizard's own step components in view mode, on a form
 * seeded with the version's snapshot. While comparing, the differences with the other version
 * are passed to the steps so they mark fields and items as Added, Changed or Removed.
 * The parent remounts it per version, so the form always holds that version's values.
 */
function StepBaseContent({
    currentStep,
    version,
    counterpartVersion,
    compareViewMode,
    schoolYearId,
    stepDiffCount,
    onToggleCompareViewMode
}: {
    currentStep: number;
    version: EnrichedHistoryItem;
    counterpartVersion?: EnrichedHistoryItem | null;
    compareViewMode?: CompareViewMode;
    schoolYearId: string | null;
    stepDiffCount?: number;
    onToggleCompareViewMode?: VoidFunction;
}) {
    const snap = version.snapshot;
    const otherSnap = counterpartVersion?.snapshot;
    const isComparing = Boolean(compareViewMode && counterpartVersion && otherSnap);

    const methods = useForm<AcademicYearWizardFormValues>({
        defaultValues: snapshotToWizardValues(snap || {}, schoolYearId)
    });
    const { control, setValue } = methods;

    const diffMarks = useMemo(() => {
        if (!isComparing || !snap || !otherSnap || !compareViewMode) {
            return undefined;
        }
        return computeHistoryDiffMarks(snap, otherSnap, compareViewMode);
    }, [isComparing, snap, otherSnap, compareViewMode]);

    if (!snap) {
        return <p className="text-xs text-slate-500 text-center py-6">No snapshot data available.</p>;
    }

    return (
        <div className="space-y-4">
            {/* Active Version / Toggle Indicator Banner in Compare Mode */}
            {isComparing && counterpartVersion && (
                <div className="hidden sm:flex p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] shrink-0 ${
                                compareViewMode === 'original'
                                    ? 'bg-slate-200 text-slate-800 dark:bg-zinc-700 dark:text-slate-200'
                                    : 'bg-brand-100 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300'
                            }`}
                        >
                            Viewing {compareViewMode === 'original'
                                ? 'Original'
                                : 'Modified'}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {version.versionLabel} — {version.formattedDate}
                        </span>
                        {typeof stepDiffCount === 'number' && (
                            <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    stepDiffCount > 0
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                        : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400'
                                }`}
                            >
                                {stepDiffCount > 0
                                    ? `${stepDiffCount} ${stepDiffCount === 1
                                        ? 'difference'
                                        : 'differences'} in Step ${currentStep}`
                                    : `No differences in Step ${currentStep}`}
                            </span>
                        )}
                    </div>

                    {onToggleCompareViewMode && (
                        <button
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                            type="button"
                            onClick={onToggleCompareViewMode}
                        >
                            <ArrowsLeftRightIcon
                                className="w-3.5 h-3.5"
                                weight="bold"
                            />
                            <span>
                                Switch to {compareViewMode === 'original'
                                    ? `Modified (v${counterpartVersion.versionNum})`
                                    : `Original (v${counterpartVersion.versionNum})`}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* The wizard's own steps, read-only */}
            {currentStep === 1 && (
                <Step1SchoolYearInfo
                    control={control}
                    currentSchoolYearId={schoolYearId}
                    diffMarks={diffMarks}
                    disabled
                    isNew={false}
                    setValue={setValue}
                />
            )}

            {currentStep === 2 && (
                <Step2TermsConfig
                    control={control}
                    diffMarks={diffMarks}
                    disabled
                    setValue={setValue}
                />
            )}

            {currentStep === 3 && (
                <Step3GradingPeriodsConfig
                    control={control}
                    diffMarks={diffMarks}
                    disabled
                    setValue={setValue}
                    onChangeTerms={(updated) => setValue('terms', updated)}
                />
            )}

            {currentStep === 4 && (
                <Step4HolidaysConfig
                    control={control}
                    diffMarks={diffMarks}
                    disabled
                    setValue={setValue}
                />
            )}

            {currentStep === 5 && (
                <Step4TransmutationConfig
                    control={control}
                    diffMarks={diffMarks}
                    disabled
                    setValue={setValue}
                />
            )}

            {currentStep === 6 && (
                <Step5ThresholdsConfig
                    control={control}
                    diffMarks={diffMarks}
                    disabled
                    setValue={setValue}
                />
            )}
        </div>
    );
}