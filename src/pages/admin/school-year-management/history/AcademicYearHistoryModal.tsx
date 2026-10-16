import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import {
    ArrowCounterClockwiseIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowsLeftRightIcon,
    CalendarDotsIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    GraduationCapIcon,
    InfoIcon,
    ScalesIcon,
    SunIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAcademicYearHistory, saveAcademicYearCalendar } from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import { EvaluationScope } from '@type/evaluation.type';
import {
    AcademicYearHistoryItem,
    SaveAcademicYearCalendarPayload,
    WizardCalendarExceptionItem,
    WizardGradingPeriodItem,
    WizardTermItem,
    WizardThresholdItem,
    WizardTransmutationRow
} from '@type/school-year.type';
import { formatShortDate } from '@utils/date.util';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WIZARD_STEPS } from '../wizard/wizard.constants';

interface AcademicYearHistoryModalProps {
    open: boolean;
    schoolYearId?: string | null;
    schoolYearLabel?: string;
    onClose: () => void;
    onReverted?: () => void;
}

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
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const [comparedVersionId, setComparedVersionId] = useState<string | null>(null);
    const [revertTargetEntry, setRevertTargetEntry] = useState<EnrichedHistoryItem | null>(null);

    const loadHistory = useCallback(async () => {
        if (!schoolYearId) return;
        setIsLoading(true);
        try {
            const res = await getAcademicYearHistory(schoolYearId);
            if (res.data) {
                setHistory(res.data);
                if (res.data.length > 0) {
                    setSelectedVersionId(res.data[0].id);
                    if (res.data.length > 1) {
                        setComparedVersionId(res.data[1].id);
                    } else {
                        setComparedVersionId(null);
                        setIsCompareMode(false);
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
            setCurrentStep(1);
            setSelectedVersionId(null);
            setIsCompareMode(false);
            setComparedVersionId(null);
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

    const comparedVersion = useMemo(() => {
        if (enrichedHistory.length <= 1) return null;
        const found = enrichedHistory.find((v) => v.id === comparedVersionId);
        if (found && found.id !== selectedVersion?.id) return found;
        return enrichedHistory.find((v) => v.id !== selectedVersion?.id) || enrichedHistory[1] || null;
    }, [enrichedHistory, comparedVersionId, selectedVersion]);

    const hasMultipleVersions = enrichedHistory.length > 1;

    function handleSwapVersions() {
        if (!selectedVersion || !comparedVersion) return;
        const prevSelected = selectedVersion.id;
        setSelectedVersionId(comparedVersion.id);
        setComparedVersionId(prevSelected);
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

    const currentStepConfig = WIZARD_STEPS.find((s) => s.step === currentStep) || WIZARD_STEPS[0];

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
                            {enrichedHistory.length > 0 && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 font-medium">
                                    {enrichedHistory.length} {enrichedHistory.length === 1 ? 'version' : 'versions'}
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
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                    title="Close"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Top Controls Bar: Version Selector Dropdown & Comparison Toggle */}
            <div className="px-3.5 sm:px-5 py-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Left: Version Selector Dropdown */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        Version:
                    </label>
                    <select
                        aria-label="Select Academic Year Version"
                        className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer max-w-full sm:max-w-xs truncate"
                        value={selectedVersion?.id || ''}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                    >
                        {enrichedHistory.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.versionLabel} — {item.formattedDate} ({item.action})
                            </option>
                        ))}
                    </select>

                    {selectedVersion?.isCurrentActive ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" weight="bold" />
                            Active
                        </span>
                    ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 shrink-0">
                            Archived
                        </span>
                    )}

                    {selectedVersion && !selectedVersion.isCurrentActive && (
                        <CommonButton
                            className="min-w-0 px-2.5 py-1 text-xs"
                            color="primary"
                            size="small"
                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" weight="bold" />}
                            variant="outlined"
                            onClick={() => setRevertTargetEntry(selectedVersion)}
                        >
                            Revert to v{selectedVersion.versionNum}
                        </CommonButton>
                    )}
                </div>

                {/* Right: Compare Toggle (ONLY visible when there are multiple versions) */}
                {hasMultipleVersions && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            aria-pressed={isCompareMode}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                                isCompareMode
                                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-300 dark:border-brand-700 shadow-xs'
                                    : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                            }`}
                            type="button"
                            onClick={() => setIsCompareMode((prev) => !prev)}
                        >
                            <ArrowsLeftRightIcon className="w-4 h-4" weight="bold" />
                            <span>Compare</span>
                        </button>

                        {isCompareMode && comparedVersion && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-400">with:</span>
                                <select
                                    aria-label="Select Version to Compare"
                                    className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                    value={comparedVersion.id}
                                    onChange={(e) => setComparedVersionId(e.target.value)}
                                >
                                    {enrichedHistory
                                        .filter((v) => v.id !== selectedVersion?.id)
                                        .map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.versionLabel} — {item.formattedDate}
                                            </option>
                                        ))}
                                </select>

                                <button
                                    className="p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                    title="Swap Base and Comparison Versions"
                                    type="button"
                                    onClick={handleSwapVersions}
                                >
                                    <ArrowsLeftRightIcon className="w-3.5 h-3.5" weight="bold" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Academic Year Stepper Header */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly
                steps={WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle
                }))}
                onStepClick={(step) => setCurrentStep(step)}
            />

            {/* Stepper Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 dark:bg-zinc-900/50 min-h-[340px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">Loading academic year history & versions...</p>
                    </div>
                ) : !selectedVersion ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                        <InfoIcon className="w-10 h-10 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            No history records found
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Any changes or revisions made to this academic year will be versioned and recorded here.
                        </p>
                    </div>
                ) : isCompareMode && comparedVersion ? (
                    /* COMPARISON STEP VIEW */
                    <StepComparisonContent
                        comparedVersion={comparedVersion}
                        currentStep={currentStep}
                        selectedVersion={selectedVersion}
                    />
                ) : (
                    /* DEFAULT BASE STEP VIEW */
                    <StepBaseContent
                        currentStep={currentStep}
                        version={selectedVersion}
                    />
                )}
            </div>

            {/* Bottom Footer: Stepper Navigation Buttons */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
                <CommonButton
                    color="inherit"
                    disabled={currentStep <= 1}
                    size="small"
                    startIcon={<ArrowLeftIcon className="w-4 h-4" weight="bold" />}
                    variant="outlined"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                >
                    Previous
                </CommonButton>

                <div className="text-xs text-slate-500 font-medium">
                    Step {currentStep} of {WIZARD_STEPS.length}: <span className="font-bold text-slate-700 dark:text-slate-300">{currentStepConfig.title}</span>
                </div>

                <div className="flex items-center gap-2">
                    {currentStep < WIZARD_STEPS.length ? (
                        <CommonButton
                            color="primary"
                            size="small"
                            endIcon={<ArrowRightIcon className="w-4 h-4" weight="bold" />}
                            variant="contained"
                            onClick={() => setCurrentStep((prev) => Math.min(WIZARD_STEPS.length, prev + 1))}
                        >
                            Next Step
                        </CommonButton>
                    ) : (
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
 * StepBaseContent
 *
 * Renders the data of a single version corresponding to the active stepper step.
 */
function StepBaseContent({
    currentStep,
    version
}: {
    currentStep: number;
    version: EnrichedHistoryItem;
}) {
    const snap = version.snapshot;
    if (!snap) {
        return <p className="text-xs text-slate-500 text-center py-6">No snapshot data available.</p>;
    }

    const terms: WizardTermItem[] = snap.terms || [];
    const holidays: WizardCalendarExceptionItem[] = snap.holidays || [];
    const transmutationRows: WizardTransmutationRow[] = snap.transmutation_rows || [];
    const thresholds: WizardThresholdItem[] = snap.thresholds || [];

    const totalGradingPeriods = terms.reduce(
        (acc, t) => acc + (t.grading_periods?.length || 0),
        0
    );

    return (
        <div className="space-y-4">
            {/* Step 1: Identity & Dates */}
            {currentStep === 1 && (
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                            <CalendarDotsIcon className="w-4 h-4 text-brand-600" weight="bold" />
                            <span>Academic Year Identity & Operational Schedule</span>
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

                        {/* Audit Details */}
                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                Recorded by <strong className="text-slate-700 dark:text-slate-300">{version.changed_by_name || 'System Administrator'}</strong> ({version.changed_by_role || 'Admin'})
                            </div>
                            <div className="text-[11px] font-medium">
                                Action: <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{version.action}</span> • {version.formattedDate}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Terms & Windows */}
            {currentStep === 2 && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                            <CalendarDotsIcon className="w-4 h-4 text-emerald-600" weight="bold" />
                            <span>Academic Terms & Operational Windows ({terms.length})</span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{terms.length} {terms.length === 1 ? 'term' : 'terms'}</span>
                    </div>

                    {terms.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No academic terms declared in this version.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {terms.map((t, idx) => (
                                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                        <span className="text-sm text-brand-700 dark:text-brand-300">{t.term_type_label || `Term #${idx + 1}`}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                            t.status === 'Ongoing'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300'
                                        }`}>
                                            {t.status || 'Upcoming'}
                                        </span>
                                    </div>

                                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Term Schedule:</span>
                                            <span className="font-semibold">{formatShortDate(t.start_date)} — {formatShortDate(t.end_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Enrollment Window:</span>
                                            <span className="font-semibold">
                                                {t.enrollment_start_date ? `${formatShortDate(t.enrollment_start_date)} — ${formatShortDate(t.enrollment_end_date)}` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Grading Deadline:</span>
                                            <span className="font-semibold">{t.grading_deadline ? formatShortDate(t.grading_deadline) : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Grading Periods */}
            {currentStep === 3 && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                            <CalendarDotsIcon className="w-4 h-4 text-blue-600" weight="bold" />
                            <span>Grading Periods Breakdown ({totalGradingPeriods} periods across {terms.length} terms)</span>
                        </div>
                    </div>

                    {terms.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No terms available to display grading periods.</p>
                    ) : (
                        <div className="space-y-4">
                            {terms.map((t, tIdx) => {
                                const gps: WizardGradingPeriodItem[] = t.grading_periods || [];
                                const totalWeight = gps.reduce((sum, gp) => sum + (Number(gp.weight) || 0), 0);

                                return (
                                    <div key={tIdx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 space-y-2.5 text-xs">
                                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-700/80 pb-2">
                                            <div>
                                                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                                    {t.term_type_label || `Term #${tIdx + 1}`}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-2 font-normal">
                                                    ({formatShortDate(t.start_date)} — {formatShortDate(t.end_date)})
                                                </span>
                                            </div>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                                totalWeight === 100
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                            }`}>
                                                Total Weight: {totalWeight}%
                                            </span>
                                        </div>

                                        {gps.length === 0 ? (
                                            <p className="text-xs text-slate-500 py-2">No grading periods configured for this term.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                {gps.map((gp, gpIdx) => (
                                                    <div key={gpIdx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 space-y-1">
                                                        <div className="flex items-center justify-between font-bold">
                                                            <span className="text-slate-800 dark:text-slate-200">{gp.name}</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                                                                {gp.weight}%
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            <span>Sequence #{gp.sequence || gpIdx + 1}</span>
                                                            {gp.start_date && (
                                                                <p className="mt-0.5">{formatShortDate(gp.start_date)} — {formatShortDate(gp.end_date)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Calendar Exceptions & Holidays */}
            {currentStep === 4 && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                            <SunIcon className="w-4 h-4 text-amber-500" weight="bold" />
                            <span>Calendar Exceptions & Holidays ({holidays.length})</span>
                        </div>
                    </div>

                    {holidays.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No calendar exceptions or holidays recorded in this version.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {holidays.map((h, hIdx) => (
                                <div key={hIdx} className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs space-y-1.5">
                                    <div className="flex items-start justify-between gap-1 font-bold text-slate-800 dark:text-slate-200">
                                        <span className="break-words">{h.title}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] shrink-0 font-bold">
                                            {h.exception_type}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        {formatShortDate(h.start_date)}{h.end_date && h.end_date !== h.start_date ? ` — ${formatShortDate(h.end_date)}` : ''}
                                    </p>
                                    {h.affects_attendance !== undefined && (
                                        <span className="inline-block text-[10px] text-slate-400">
                                            {h.affects_attendance ? '• Affects Attendance' : '• Does Not Affect Attendance'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step 5: Grade Schema (Transmutation Ladder) */}
            {currentStep === 5 && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                            <ScalesIcon className="w-4 h-4 text-purple-600" weight="bold" />
                            <span>Grade Transmutation Ladder ({transmutationRows.length} rungs)</span>
                        </div>
                    </div>

                    {transmutationRows.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No transmutation schema defined in this version.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {transmutationRows.map((row, rIdx) => (
                                <div key={rIdx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs space-y-1">
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="text-brand-600 dark:text-brand-400 text-sm">{row.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                            row.is_passing
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                        }`}>
                                            {row.is_passing ? 'Pass' : 'Fail'}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {row.is_conditional ? (
                                            <span>Special: {row.special_code || row.label}</span>
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
            )}

            {/* Step 6: Academic Thresholds */}
            {currentStep === 6 && (
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
                            <GraduationCapIcon className="w-4 h-4 text-brand-600" weight="bold" />
                            <span>Academic Thresholds & Cutoffs ({thresholds.length} rules)</span>
                        </div>
                    </div>

                    {thresholds.length === 0 ? (
                        <p className="text-xs text-slate-500 py-6 text-center">No academic thresholds defined in this version.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {thresholds.map((th, thIdx) => (
                                <div key={thIdx} className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs space-y-1.5">
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
                                        {th.scholarship_discount_pct && (
                                            <p className="text-emerald-600 dark:text-emerald-400 font-medium">Discount: {th.scholarship_discount_pct}%</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * StepComparisonContent
 *
 * Side-by-side / diff comparison for the active step between Base Version and Compared Version.
 */
function StepComparisonContent({
    currentStep,
    selectedVersion,
    comparedVersion
}: {
    currentStep: number;
    selectedVersion: EnrichedHistoryItem;
    comparedVersion: EnrichedHistoryItem;
}) {
    const snapA = selectedVersion.snapshot;
    const snapB = comparedVersion.snapshot;

    return (
        <div className="space-y-4">
            {/* Comparison Overview Banner */}
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        Comparing v{selectedVersion.versionNum} (Base) vs v{comparedVersion.versionNum} (Target):
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                        Step {currentStep} Comparison
                    </span>
                </div>
            </div>

            {/* Step 1 Comparison: Identity & Dates */}
            {currentStep === 1 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                        <div className="grid grid-cols-12 p-2.5 font-bold bg-slate-50/50 dark:bg-zinc-800/30 text-[11px] text-slate-400 uppercase tracking-wider">
                            <div className="col-span-4">Attribute</div>
                            <div className="col-span-4">v{selectedVersion.versionNum} (Base)</div>
                            <div className="col-span-4">v{comparedVersion.versionNum} (Target)</div>
                        </div>

                        {[
                            { label: 'Code', a: snapA?.code || '—', b: snapB?.code || '—' },
                            { label: 'Label', a: snapA?.label || '—', b: snapB?.label || '—' },
                            { label: 'Start Date', a: formatShortDate(snapA?.start_date || '') || '—', b: formatShortDate(snapB?.start_date || '') || '—' },
                            { label: 'End Date', a: formatShortDate(snapA?.end_date || '') || '—', b: formatShortDate(snapB?.end_date || '') || '—' },
                            { label: 'Status', a: snapA?.is_active ? 'Active' : 'Inactive', b: snapB?.is_active ? 'Active' : 'Inactive' },
                            { label: 'Scope', a: snapA?.evaluation_scope || 'Period', b: snapB?.evaluation_scope || 'Period' },
                            { label: 'Max Units', a: `${snapA?.max_units_per_term ?? 24} Units`, b: `${snapB?.max_units_per_term ?? 24} Units` }
                        ].map((item, idx) => {
                            const changed = item.a !== item.b;
                            return (
                                <div
                                    key={idx}
                                    className={`grid grid-cols-12 p-2.5 items-center ${
                                        changed ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-slate-50/40 dark:hover:bg-zinc-800/20'
                                    }`}
                                >
                                    <div className="col-span-4 font-medium text-slate-700 dark:text-slate-300">
                                        {item.label}
                                    </div>
                                    <div className="col-span-4 text-slate-600 dark:text-slate-400 break-words pr-2">
                                        {item.a}
                                    </div>
                                    <div className="col-span-4 flex items-center justify-between gap-1 break-words">
                                        <span className={changed ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}>
                                            {item.b}
                                        </span>
                                        {changed && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                                                Diff
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Step 2 Comparison: Terms & Windows */}
            {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 rounded-lg font-bold text-xs text-brand-700 dark:text-brand-300">
                            Version {selectedVersion.versionNum} (Base) — {(snapA?.terms || []).length} Terms
                        </div>
                        <StepBaseContent currentStep={2} version={selectedVersion} />
                    </div>
                    <div className="space-y-3">
                        <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-300">
                            Version {comparedVersion.versionNum} (Target) — {(snapB?.terms || []).length} Terms
                        </div>
                        <StepBaseContent currentStep={2} version={comparedVersion} />
                    </div>
                </div>
            )}

            {/* Step 3 Comparison: Grading Periods */}
            {currentStep === 3 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 rounded-lg font-bold text-xs text-brand-700 dark:text-brand-300">
                            Version {selectedVersion.versionNum} (Base)
                        </div>
                        <StepBaseContent currentStep={3} version={selectedVersion} />
                    </div>
                    <div className="space-y-3">
                        <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-300">
                            Version {comparedVersion.versionNum} (Target)
                        </div>
                        <StepBaseContent currentStep={3} version={comparedVersion} />
                    </div>
                </div>
            )}

            {/* Step 4 Comparison: Calendar Exceptions & Holidays */}
            {currentStep === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 rounded-lg font-bold text-xs text-brand-700 dark:text-brand-300">
                            Version {selectedVersion.versionNum} (Base) — {(snapA?.holidays || []).length} Exceptions
                        </div>
                        <StepBaseContent currentStep={4} version={selectedVersion} />
                    </div>
                    <div className="space-y-3">
                        <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-300">
                            Version {comparedVersion.versionNum} (Target) — {(snapB?.holidays || []).length} Exceptions
                        </div>
                        <StepBaseContent currentStep={4} version={comparedVersion} />
                    </div>
                </div>
            )}

            {/* Step 5 Comparison: Grade Schema */}
            {currentStep === 5 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 rounded-lg font-bold text-xs text-brand-700 dark:text-brand-300">
                            Version {selectedVersion.versionNum} (Base) — {(snapA?.transmutation_rows || []).length} Rungs
                        </div>
                        <StepBaseContent currentStep={5} version={selectedVersion} />
                    </div>
                    <div className="space-y-3">
                        <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-300">
                            Version {comparedVersion.versionNum} (Target) — {(snapB?.transmutation_rows || []).length} Rungs
                        </div>
                        <StepBaseContent currentStep={5} version={comparedVersion} />
                    </div>
                </div>
            )}

            {/* Step 6 Comparison: Academic Thresholds */}
            {currentStep === 6 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-950/50 rounded-lg font-bold text-xs text-brand-700 dark:text-brand-300">
                            Version {selectedVersion.versionNum} (Base) — {(snapA?.thresholds || []).length} Rules
                        </div>
                        <StepBaseContent currentStep={6} version={selectedVersion} />
                    </div>
                    <div className="space-y-3">
                        <div className="p-2.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-300">
                            Version {comparedVersion.versionNum} (Target) — {(snapB?.thresholds || []).length} Rules
                        </div>
                        <StepBaseContent currentStep={6} version={comparedVersion} />
                    </div>
                </div>
            )}
        </div>
    );
}
