import CommonButton from '@components/button/CommonButton';
import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import FormLabel from '@components/form/FormLabel';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import CommonModal from '@components/modal/CommonModal';
import CommonPromptModal from '@components/modal/CommonPromptModal';
import ModalStepperHeader from '@components/modal/ModalStepperHeader';
import CommonSelect from '@components/select/CommonSelect';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import Checkbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import {
    ArrowCounterClockwiseIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowsLeftRightIcon,
    CaretDownIcon,
    CheckCircleIcon,
    ClockCounterClockwiseIcon,
    ClockIcon,
    DotsThreeVerticalIcon,
    EyeIcon,
    InfoIcon,
    ListPlusIcon,
    ShieldCheckIcon,
    SunIcon,
    WarningCircleIcon,
    XCircleIcon,
    XIcon
} from '@phosphor-icons/react';
import { getAcademicYearHistory, saveAcademicYearCalendar } from '@services/school-year.service';
import { useToastStore } from '@stores/toast.store';
import { AcademicThresholdCategory } from '@type/academic-threshold.type';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSpecialGradeRow, WIZARD_STEPS } from '../wizard/wizard.constants';

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

type CompareViewMode = 'original' | 'modified';

type SnapshotData = AcademicYearHistoryItem['snapshot'];

const THRESHOLD_CATEGORY_OPTIONS: { label: string; value: AcademicThresholdCategory }[] = [
    { label: 'Honor (Latin Honors)', value: 'Honor' },
    { label: 'Scholarship (Academic Qualification)', value: 'Scholarship' },
    { label: 'Academic Standing (Retention & Status)', value: 'Standing' }
];

const DEFAULT_EXCEPTION_TYPE_OPTIONS = [
    { label: 'Holiday', value: 'Holiday' },
    { label: 'Break', value: 'Break' },
    { label: 'Suspension', value: 'Suspension' },
    { label: 'Special Class', value: 'Special Class' },
    { label: 'Exam Day', value: 'Exam Day' }
];

function normalizeStr(val: unknown): string {
    return String(val ?? '').trim();
}

// Joins non-empty identity parts; falls back to a positional key when every part is empty
function buildCompositeKey(parts: string[], fallback: string): string {
    return parts.some(Boolean)
        ? parts.join('::')
        : fallback;
}

function normalizeNum(val: unknown, fallback = 0): number {
    if (val === null || val === undefined || val === '') return fallback;
    const n = Number(val);
    return Number.isNaN(n) ? fallback : n;
}

function serializeTermStep2(t: WizardTermItem): string {
    return JSON.stringify({
        label: normalizeStr(t.term_type_label).toLowerCase(),
        status: normalizeStr(t.status || 'Upcoming'),
        start_date: normalizeStr(t.start_date),
        end_date: normalizeStr(t.end_date),
        enrollment_start_date: normalizeStr(t.enrollment_start_date),
        enrollment_end_date: normalizeStr(t.enrollment_end_date),
        grading_deadline: normalizeStr(t.grading_deadline),
        evaluation_scope: normalizeStr(t.evaluation_scope || 'Period')
    });
}

function serializeGradingPeriod(gp: WizardGradingPeriodItem): string {
    return JSON.stringify({
        name: normalizeStr(gp.name).toLowerCase(),
        sequence: normalizeNum(gp.sequence, 1),
        weight: normalizeNum(gp.weight, 0),
        start_date: normalizeStr(gp.start_date),
        end_date: normalizeStr(gp.end_date),
        major_exam_start_date: normalizeStr(gp.major_exam_start_date),
        major_exam_end_date: normalizeStr(gp.major_exam_end_date),
        grade_encoding_start_date: normalizeStr(gp.grade_encoding_start_date),
        grade_encoding_end_date: normalizeStr(gp.grade_encoding_end_date),
        components: (gp.components || []).map((c) => ({
            name: normalizeStr(c.name).toLowerCase(),
            weight: normalizeNum(c.weight, 0)
        }))
    });
}

function serializeHoliday(h: WizardCalendarExceptionItem): string {
    return JSON.stringify({
        title: normalizeStr(h.title).toLowerCase(),
        exception_type: normalizeStr(h.exception_type || 'Holiday'),
        start_date: normalizeStr(h.start_date),
        end_date: normalizeStr(h.end_date),
        affects_attendance: Boolean(h.affects_attendance),
        description: normalizeStr(h.description)
    });
}

function serializeTransmutationRow(r: WizardTransmutationRow): string {
    return JSON.stringify({
        label: normalizeStr(r.label).toLowerCase(),
        is_conditional: Boolean(isSpecialGradeRow(r)),
        min_percentage: r.min_percentage !== null && r.min_percentage !== undefined && r.min_percentage !== '' ? Number(r.min_percentage) : null,
        max_percentage: r.max_percentage !== null && r.max_percentage !== undefined && r.max_percentage !== '' ? Number(r.max_percentage) : null,
        transmuted_grade: r.transmuted_grade !== null && r.transmuted_grade !== undefined && r.transmuted_grade !== '' ? Number(r.transmuted_grade) : null,
        is_passing: Boolean(r.is_passing),
        special_code: normalizeStr(r.special_code),
        description: normalizeStr(r.description),
        is_auto_detected: Boolean(r.is_auto_detected),
        conditions: r.is_auto_detected
            ? r.conditions ?? null
            : null
    });
}

function serializeThreshold(th: WizardThresholdItem): string {
    return JSON.stringify({
        label: normalizeStr(th.label).toLowerCase(),
        category: normalizeStr(th.category || 'Honor'),
        max_gwa: normalizeNum(th.max_gwa, 0),
        min_gwa: th.min_gwa !== null && th.min_gwa !== undefined && th.min_gwa !== '' ? Number(th.min_gwa) : null,
        min_subject_grade: th.min_subject_grade !== null && th.min_subject_grade !== undefined && th.min_subject_grade !== '' ? Number(th.min_subject_grade) : null,
        requires_no_failing: Boolean(th.requires_no_failing),
        scholarship_discount_pct: th.scholarship_discount_pct !== null && th.scholarship_discount_pct !== undefined && th.scholarship_discount_pct !== '' ? Number(th.scholarship_discount_pct) : null,
        is_active: th.is_active !== undefined ? Boolean(th.is_active) : true
    });
}

function countCollectionDiffs<T>(
    listA: T[],
    listB: T[],
    getKey: (item: T, idx: number) => string,
    serialize: (item: T) => string
): number {
    const mapA = new Map<string, string>();
    const mapB = new Map<string, string>();

    listA.forEach((item, idx) => {
        const key = getKey(item, idx);
        mapA.set(key, serialize(item));
    });
    listB.forEach((item, idx) => {
        const key = getKey(item, idx);
        mapB.set(key, serialize(item));
    });

    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    let diffs = 0;
    allKeys.forEach((key) => {
        if (mapA.get(key) !== mapB.get(key)) {
            diffs += 1;
        }
    });
    return diffs;
}

function computeStepDiffCounts(snapA?: SnapshotData, snapB?: SnapshotData): Record<number, number> {
    if (!snapA || !snapB) {
        return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    }

    // Step 1: 5 displayed fields in Step 1 form (Start Date, End Date, Code, Label, Active Status)
    let step1Diffs = 0;
    if (normalizeStr(snapA.start_date) !== normalizeStr(snapB.start_date)) step1Diffs += 1;
    if (normalizeStr(snapA.end_date) !== normalizeStr(snapB.end_date)) step1Diffs += 1;
    if (normalizeStr(snapA.code) !== normalizeStr(snapB.code)) step1Diffs += 1;
    if (normalizeStr(snapA.label) !== normalizeStr(snapB.label)) step1Diffs += 1;
    if (Boolean(snapA.is_active) !== Boolean(snapB.is_active)) step1Diffs += 1;

    // Step 2: Terms
    const termsA = snapA.terms || [];
    const termsB = snapB.terms || [];
    const step2Diffs = countCollectionDiffs(
        termsA,
        termsB,
        (t, idx) => normalizeStr(t.term_type_label).toLowerCase() || `term_${idx}`,
        serializeTermStep2
    );

    // Step 3: Grading periods across terms
    const periodsA: { key: string; gp: WizardGradingPeriodItem }[] = [];
    termsA.forEach((t, tIdx) => {
        const termKey = normalizeStr(t.term_type_label).toLowerCase() || `term_${tIdx}`;
        (t.grading_periods || []).forEach((gp, gpIdx) => {
            const gpKey = normalizeStr(gp.name).toLowerCase() || `gp_${gpIdx}`;
            periodsA.push({ key: `${termKey}::${gpKey}`, gp });
        });
    });
    const periodsB: { key: string; gp: WizardGradingPeriodItem }[] = [];
    termsB.forEach((t, tIdx) => {
        const termKey = normalizeStr(t.term_type_label).toLowerCase() || `term_${tIdx}`;
        (t.grading_periods || []).forEach((gp, gpIdx) => {
            const gpKey = normalizeStr(gp.name).toLowerCase() || `gp_${gpIdx}`;
            periodsB.push({ key: `${termKey}::${gpKey}`, gp });
        });
    });
    const step3Diffs = countCollectionDiffs(
        periodsA,
        periodsB,
        (item, idx) => item.key || `p_${idx}`,
        (item) => serializeGradingPeriod(item.gp)
    );

    // Step 4: Holidays & Calendar Exceptions
    const holidaysA = snapA.holidays || [];
    const holidaysB = snapB.holidays || [];
    const step4Diffs = countCollectionDiffs(
        holidaysA,
        holidaysB,
        (h, idx) => buildCompositeKey([normalizeStr(h.title).toLowerCase(), normalizeStr(h.start_date)], `h_${idx}`),
        serializeHoliday
    );

    // Step 5: Transmutation Rows
    const rowsA = snapA.transmutation_rows || [];
    const rowsB = snapB.transmutation_rows || [];
    const step5Diffs = countCollectionDiffs(
        rowsA,
        rowsB,
        (r, idx) => normalizeStr(r.label).toLowerCase() || `r_${idx}`,
        serializeTransmutationRow
    );

    // Step 6: Academic Thresholds
    const thresholdsA = snapA.thresholds || [];
    const thresholdsB = snapB.thresholds || [];
    const step6Diffs = countCollectionDiffs(
        thresholdsA,
        thresholdsB,
        (th, idx) => buildCompositeKey([normalizeStr(th.category).toLowerCase(), normalizeStr(th.label).toLowerCase()], `th_${idx}`),
        serializeThreshold
    );

    return {
        1: step1Diffs,
        2: step2Diffs,
        3: step3Diffs,
        4: step4Diffs,
        5: step5Diffs,
        6: step6Diffs
    };
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

    const loadHistory = useCallback(async (preferredSelectedId?: string | null) => {
        if (!schoolYearId) return;
        setIsLoading(true);
        try {
            const res = await getAcademicYearHistory(schoolYearId);
            if (res.data) {
                setHistory(res.data);
                if (res.data.length > 0) {
                    const activeId = resolveActiveHistoryId(res.data);
                    const nextSelectedId =
                        preferredSelectedId && res.data.some((r) => r.id === preferredSelectedId)
                            ? preferredSelectedId
                            : activeId || res.data[0].id;
                    setSelectedVersionId(nextSelectedId);

                    if (res.data.length > 1) {
                        const fallbackCompared = res.data.find((r) => r.id !== nextSelectedId) || res.data[1];
                        setComparedVersionId((prev) =>
                            prev && prev !== nextSelectedId && res.data!.some((r) => r.id === prev)
                                ? prev
                                : fallbackCompared.id
                        );
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
        return Object.values(stepDiffCounts).reduce((sum, count) => sum + count, 0);
    }, [stepDiffCounts]);

    // Version currently shown in the step body
    const activeDisplayVersion = useMemo(() => {
        if (isCompareMode && comparedVersion) {
            return compareViewMode === 'original' ? comparedVersion : selectedVersion;
        }
        return selectedVersion;
    }, [isCompareMode, compareViewMode, comparedVersion, selectedVersion]);

    const counterpartVersion = useMemo(() => {
        if (!isCompareMode || !comparedVersion || !selectedVersion) return null;
        return compareViewMode === 'original' ? selectedVersion : comparedVersion;
    }, [isCompareMode, compareViewMode, comparedVersion, selectedVersion]);

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
            const targetId = revertTargetEntry.id;
            const targetVerNum = revertTargetEntry.versionNum;
            const snap = revertTargetEntry.snapshot;
            const payload: SaveAcademicYearCalendarPayload = {
                p_school_year_id: schoolYearId,
                p_revert_history_id: targetId,
                p_code: (snap.code || '').trim(),
                p_label: (snap.label || '').trim(),
                p_start_date: snap.start_date || '',
                p_end_date: snap.end_date || '',
                p_is_active: Boolean(snap.is_active),
                p_max_units_per_term: snap.max_units_per_term ? Number(snap.max_units_per_term) : 24,
                p_evaluation_scope: (snap.evaluation_scope || 'Period') as EvaluationScope,
                p_terms: (snap.terms || []).map((t) => ({
                    ...t,
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
                `Academic year successfully reverted to Version ${targetVerNum}.`,
                'success'
            );
            setRevertTargetEntry(null);
            onReverted?.();
            onClose();
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
                {!isCompareMode ? (
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
                                    title={selectedVersion?.isCurrentActive ? 'Active Version' : 'Archived Version'}
                                    value={selectedVersion?.id || ''}
                                    onChange={(e) => setSelectedVersionId(e.target.value)}
                                >
                                    {enrichedHistory.map((item) => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                            className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                        >
                                            {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive ? ' [Active]' : ''}
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
                                    <DotsThreeVerticalIcon className="w-4 h-4" weight="bold" />
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
                                    startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" weight="bold" />}
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
                                    <ArrowsLeftRightIcon className="w-3.5 h-3.5" weight="bold" />
                                    <span>Compare Versions</span>
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
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
                                    Viewing {compareViewMode === 'original' ? 'Original' : 'Modified'}
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
                                <DotsThreeVerticalIcon className="w-4 h-4" weight="bold" />
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
                                    <EyeIcon className="w-3.5 h-3.5 shrink-0" weight={compareViewMode === 'original' ? 'fill' : 'regular'} />
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
                                    <EyeIcon className="w-3.5 h-3.5 shrink-0" weight={compareViewMode === 'modified' ? 'fill' : 'regular'} />
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
                                        ? `${totalDiffCount} total ${totalDiffCount === 1 ? 'difference' : 'differences'}`
                                        : 'No differences'}
                                </span>

                                {/* Desktop Action Controls */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {activeDisplayVersion && !activeDisplayVersion.isCurrentActive && (
                                        <CommonButton
                                            className="min-w-0 px-2.5 py-1 text-xs"
                                            color="primary"
                                            size="small"
                                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" weight="bold" />}
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
                                        <XIcon className="w-3.5 h-3.5" weight="bold" />
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
                                    } ${compareViewMode === 'original' ? 'ring-2 ring-slate-400/30 shadow-2xs' : ''}`}
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
                                            comparedVersion.isCurrentActive ? 'bg-emerald-500' : 'bg-amber-500'
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
                                                    key={item.id}
                                                    value={item.id}
                                                    className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                                >
                                                    {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive ? ' [Active]' : ''}
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
                                        <ArrowsLeftRightIcon className="w-3.5 h-3.5" weight="bold" />
                                    </button>
                                </div>

                                {/* Modified Version Selector Card */}
                                <div
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all min-w-0 ${
                                        selectedVersion.isCurrentActive
                                            ? 'bg-emerald-50/90 dark:bg-emerald-950/45 border-emerald-400 dark:border-emerald-600'
                                            : 'bg-amber-50/75 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700'
                                    } ${compareViewMode === 'modified' ? 'ring-2 ring-brand-500/30 shadow-2xs' : ''}`}
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
                                            selectedVersion.isCurrentActive ? 'bg-emerald-500' : 'bg-amber-500'
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
                                                    key={item.id}
                                                    value={item.id}
                                                    className="bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100"
                                                >
                                                    {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive ? ' [Active]' : ''}
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
                {!isCompareMode ? (
                    <div>
                        {selectedVersion && !selectedVersion.isCurrentActive && (
                            <MenuItem
                                onClick={() => {
                                    setMobileMenuAnchorEl(null);
                                    setRevertTargetEntry(selectedVersion);
                                }}
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    <ArrowCounterClockwiseIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" weight="bold" />
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
                                    <ArrowsLeftRightIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" weight="bold" />
                                    <span>Compare Versions</span>
                                </div>
                            </MenuItem>
                        )}
                    </div>
                ) : comparedVersion && selectedVersion ? (
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
                                    <EyeIcon className="w-4 h-4 text-slate-500" weight={compareViewMode === 'original' ? 'fill' : 'regular'} />
                                    <span>Original (v{comparedVersion.versionNum})</span>
                                </div>
                                {compareViewMode === 'original' && (
                                    <CheckCircleIcon className="w-4 h-4 text-brand-600" weight="fill" />
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
                                    <EyeIcon className="w-4 h-4 text-brand-600" weight={compareViewMode === 'modified' ? 'fill' : 'regular'} />
                                    <span>Modified (v{selectedVersion.versionNum})</span>
                                </div>
                                {compareViewMode === 'modified' && (
                                    <CheckCircleIcon className="w-4 h-4 text-brand-600" weight="fill" />
                                )}
                            </div>
                        </MenuItem>

                        <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                        {/* Selectors for Original & Modified */}
                        <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Original Version
                        </div>
                        <div className="px-3 pb-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
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
                                        <option key={item.id} value={item.id}>
                                            {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive ? ' [Active]' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Modified Version
                        </div>
                        <div className="px-3 pb-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
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
                                        <option key={item.id} value={item.id}>
                                            {item.versionLabel} — {item.formattedDate} ({item.action}){item.isCurrentActive ? ' [Active]' : ''}
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
                                <ArrowsLeftRightIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" weight="bold" />
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
                                    <ArrowCounterClockwiseIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" weight="bold" />
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
                                <XIcon className="w-4 h-4" weight="bold" />
                                <span>Exit Compare</span>
                            </div>
                        </MenuItem>
                    </div>
                ) : null}
            </Menu>

            {/* Academic Year Stepper Header with Step Difference Indicators */}
            <ModalStepperHeader
                currentStep={currentStep}
                readOnly
                steps={WIZARD_STEPS.map((s) => ({
                    step: s.step,
                    title: s.title,
                    subtitle: s.subtitle,
                    diffCount: stepDiffCounts ? stepDiffCounts[s.step] : undefined
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
                ) : !activeDisplayVersion ? (
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
                    <StepBaseContent
                        compareViewMode={isCompareMode && counterpartVersion ? compareViewMode : undefined}
                        counterpartVersion={counterpartVersion}
                        currentStep={currentStep}
                        stepDiffCount={stepDiffCounts ? stepDiffCounts[currentStep] : undefined}
                        version={activeDisplayVersion}
                        onToggleCompareViewMode={
                            isCompareMode && counterpartVersion
                                ? () => setCompareViewMode((prev) => (prev === 'original' ? 'modified' : 'original'))
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
                    startIcon={<ArrowLeftIcon className="w-4 h-4" weight="bold" />}
                    variant="outlined"
                    onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                >
                    Back
                </CommonButton>

                <div className="flex items-center gap-2">
                    {currentStep < WIZARD_STEPS.length ? (
                        <CommonButton
                            color="primary"
                            endIcon={<ArrowRightIcon className="w-4 h-4" weight="bold" />}
                            size="small"
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
                        loading: isReverting,
                        onClick: handleExecuteRevert
                    }
                }}
                mainContent={{
                    title: `Revert to Version ${revertTargetEntry?.versionNum}?`
                }}
                open={Boolean(revertTargetEntry)}
                subContent={{
                    title: `This will restore the terms, grading periods, thresholds, holidays, and grade schema from Version ${revertTargetEntry?.versionNum} (${revertTargetEntry?.formattedDate}) and set Version ${revertTargetEntry?.versionNum} as the active version without creating a new version. Are you sure you want to proceed?`
                }}
                onClose={() => setRevertTargetEntry(null)}
            />
        </CommonModal>
    );
}

/**
 * StepBaseContent
 *
 * Renders the academic year fields using the exact same form field appearance
 * as Edit/View mode in the Wizard across all 6 steps, with inline difference highlights when comparing versions.
 */
function StepBaseContent({
    currentStep,
    version,
    counterpartVersion,
    compareViewMode,
    stepDiffCount,
    onToggleCompareViewMode
}: {
    currentStep: number;
    version: EnrichedHistoryItem;
    counterpartVersion?: EnrichedHistoryItem | null;
    compareViewMode?: CompareViewMode;
    stepDiffCount?: number;
    onToggleCompareViewMode?: () => void;
}) {
    const [collapsedTermsStep2, setCollapsedTermsStep2] = useState<Record<number, boolean>>({});
    const [collapsedTermsStep3, setCollapsedTermsStep3] = useState<Record<number, boolean>>({});
    const [collapsedPeriodsStep3, setCollapsedPeriodsStep3] = useState<Record<string, boolean>>({});
    const [collapsedExceptionsStep4, setCollapsedExceptionsStep4] = useState<Record<number, boolean>>({});
    const [collapsedRungsStep5, setCollapsedRungsStep5] = useState<Record<number, boolean>>({});
    const [collapsedThresholdsStep6, setCollapsedThresholdsStep6] = useState<Record<number, boolean>>({});

    const snap = version.snapshot;
    const otherSnap = counterpartVersion?.snapshot;
    const isComparing = Boolean(compareViewMode && counterpartVersion && otherSnap);

    if (!snap) {
        return <p className="text-xs text-slate-500 text-center py-6">No snapshot data available.</p>;
    }

    const terms: WizardTermItem[] = snap.terms || [];
    const otherTerms: WizardTermItem[] = otherSnap?.terms || [];

    const holidays: WizardCalendarExceptionItem[] = snap.holidays || [];
    const otherHolidays: WizardCalendarExceptionItem[] = otherSnap?.holidays || [];

    const transmutationRows: WizardTransmutationRow[] = snap.transmutation_rows || [];
    const otherTransmutationRows: WizardTransmutationRow[] = otherSnap?.transmutation_rows || [];

    const thresholds: WizardThresholdItem[] = snap.thresholds || [];
    const otherThresholds: WizardThresholdItem[] = otherSnap?.thresholds || [];

    const startDateChanged = isComparing && normalizeStr(snap.start_date) !== normalizeStr(otherSnap?.start_date);
    const endDateChanged = isComparing && normalizeStr(snap.end_date) !== normalizeStr(otherSnap?.end_date);
    const codeChanged = isComparing && normalizeStr(snap.code) !== normalizeStr(otherSnap?.code);
    const labelChanged = isComparing && normalizeStr(snap.label) !== normalizeStr(otherSnap?.label);
    const activeChanged = isComparing && Boolean(snap.is_active) !== Boolean(otherSnap?.is_active);

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
                            Viewing {compareViewMode === 'original' ? 'Original' : 'Modified'}
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
                                    ? `${stepDiffCount} ${stepDiffCount === 1 ? 'difference' : 'differences'} in Step ${currentStep}`
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
                            <ArrowsLeftRightIcon className="w-3.5 h-3.5" weight="bold" />
                            <span>
                                Switch to {compareViewMode === 'original' ? `Modified (v${counterpartVersion.versionNum})` : `Original (v${counterpartVersion.versionNum})`}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* Step 1: Identity & Dates — Matching Step1SchoolYearInfo form field appearance */}
            {currentStep === 1 && (
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className={startDateChanged ? 'p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-700' : ''}>
                            <CommonDatePicker
                                description="Official start date of the academic calendar. Terms must begin on or after this date."
                                disabled
                                isRequired
                                label="Start Date"
                                value={snap.start_date || ''}
                                onChange={() => {}}
                            />
                            {startDateChanged && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
                                    {compareViewMode === 'original' ? 'Modified' : 'Original'}: <strong>{otherSnap?.start_date || '—'}</strong>
                                </p>
                            )}
                        </div>

                        <div className={endDateChanged ? 'p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-700' : ''}>
                            <CommonDatePicker
                                description="Official concluding date of this academic year. Terms must end on or before this date."
                                disabled
                                isRequired
                                label="End Date"
                                value={snap.end_date || ''}
                                onChange={() => {}}
                            />
                            {endDateChanged && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
                                    {compareViewMode === 'original' ? 'Modified' : 'Original'}: <strong>{otherSnap?.end_date || '—'}</strong>
                                </p>
                            )}
                        </div>

                        <div className={codeChanged ? 'p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-700' : ''}>
                            <CommonInput
                                description="Auto-generated unique system identifier for this academic year based on Start and End dates (e.g. AY-2026-2027)."
                                disabled
                                fullWidth
                                isRequired
                                label="Academic Year Code"
                                placeholder="e.g. AY-2026-2027"
                                value={snap.code || ''}
                            />
                            {codeChanged && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
                                    {compareViewMode === 'original' ? 'Modified' : 'Original'}: <strong>{otherSnap?.code || '—'}</strong>
                                </p>
                            )}
                        </div>

                        <div className={labelChanged ? 'p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-700' : ''}>
                            <CommonInput
                                description="Auto-generated title displayed on portal headers, report cards, and official transcripts based on Start and End dates."
                                disabled
                                fullWidth
                                isRequired
                                label="Academic Year Label"
                                placeholder="e.g. Academic Year 2026-2027"
                                value={snap.label || ''}
                            />
                            {labelChanged && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium">
                                    {compareViewMode === 'original' ? 'Modified' : 'Original'}: <strong>{otherSnap?.label || '—'}</strong>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Active Status Card — Matching Step1SchoolYearInfo */}
                    <div
                        className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                            activeChanged
                                ? 'bg-amber-50/50 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700'
                                : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40'
                        }`}
                    >
                        <div className="flex items-center gap-2 flex-wrap">
                            <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Set as Active Academic Year
                                <span className="inline-flex align-middle ml-1.5 whitespace-nowrap">
                                    <CommonInfoTooltip
                                        content="When active, new student enrollments, curriculum schedules, and faculty grade submissions default to this academic year."
                                        size={14}
                                    />
                                </span>
                            </span>
                            {activeChanged && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200">
                                    Changed
                                </span>
                            )}
                        </div>
                        <Checkbox checked={Boolean(snap.is_active)} disabled sx={{ padding: 0.5, width: 'fit-content' }} />
                    </div>

                    {/* Audit Details Footer */}
                    <div className="px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            Recorded by <strong className="text-slate-700 dark:text-slate-300">{version.changed_by_name || 'System Administrator'}</strong> ({version.changed_by_role || 'Admin'})
                        </div>
                        <div className="text-[11px] font-medium">
                            Action: <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">{version.action}</span> • {version.formattedDate}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Terms & Windows — Matching Step2TermsConfig form field appearance */}
            {currentStep === 2 && (
                <div className="flex flex-col gap-6">
                    {terms.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 space-y-3">
                            <ClockIcon className="w-10 h-10 text-slate-400 mx-auto" />
                            <p className="font-medium text-slate-700 dark:text-slate-300">
                                No terms added for this Academic Year version.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {terms.map((currentTerm, index) => {
                                const termKey = normalizeStr(currentTerm.term_type_label).toLowerCase() || `term_${index}`;
                                const matchedOther = isComparing
                                    ? otherTerms.find((ot, oIdx) => (normalizeStr(ot.term_type_label).toLowerCase() || `term_${oIdx}`) === termKey)
                                    : undefined;
                                const isAddedOrRemoved = isComparing && !matchedOther;
                                const isModified =
                                    isComparing && Boolean(matchedOther) && serializeTermStep2(currentTerm) !== serializeTermStep2(matchedOther!);

                                return (
                                    <div
                                        key={currentTerm.id || index}
                                        className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border shadow-sm space-y-4 transition-all ${
                                            isAddedOrRemoved || isModified
                                                ? 'border-amber-300 dark:border-amber-700/70'
                                                : 'border-slate-200 dark:border-zinc-700/60'
                                        }`}
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/40 pb-3">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center shrink-0">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {currentTerm.term_type_label || `Term #${index + 1}`}
                                                </span>
                                                {currentTerm.start_date && currentTerm.end_date && (
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        ({currentTerm.start_date} to {currentTerm.end_date})
                                                    </span>
                                                )}
                                                {(isAddedOrRemoved || isModified) && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200">
                                                        {isAddedOrRemoved
                                                            ? compareViewMode === 'modified'
                                                                ? 'Added'
                                                                : 'Removed in Modified'
                                                            : 'Changed'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    aria-label={collapsedTermsStep2[index] ? 'Expand Term' : 'Collapse Term'}
                                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                    title={collapsedTermsStep2[index] ? 'Expand Term' : 'Collapse Term'}
                                                    type="button"
                                                    onClick={() =>
                                                        setCollapsedTermsStep2((prev) => ({ ...prev, [index]: !prev[index] }))
                                                    }
                                                >
                                                    <CaretDownIcon
                                                        className={`w-4 h-4 transition-transform duration-200 ${collapsedTermsStep2[index] ? '-rotate-90' : 'rotate-0'}`}
                                                        weight="bold"
                                                    />
                                                    <span className="text-xs hidden sm:inline">
                                                        {collapsedTermsStep2[index] ? 'Expand' : 'Collapse'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={collapsedTermsStep2[index] ? 'hidden' : 'space-y-4'}>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                                    <CommonInput
                                                        description="Declare the term name for this academic year (e.g. 1st Semester, 2nd Semester, Summer)."
                                                        disabled
                                                        fullWidth
                                                        isRequired
                                                        label="Term Type / Name"
                                                        placeholder="e.g. 1st Semester"
                                                        size="small"
                                                        value={currentTerm.term_type_label || ''}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        description="Official date when classes begin for this term."
                                                        disabled
                                                        isRequired
                                                        label="Term Start Date"
                                                        size="small"
                                                        value={currentTerm.start_date || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        description="Official date when classes conclude for this term."
                                                        disabled
                                                        isRequired
                                                        label="Term End Date"
                                                        size="small"
                                                        value={currentTerm.end_date || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonNumberInput
                                                        description="Maximum credit units a student can register for in each term of this academic year (1 - 60)."
                                                        disabled
                                                        fullWidth
                                                        isRequired
                                                        label="Max Units per Term"
                                                        max={60}
                                                        min={1}
                                                        placeholder="24"
                                                        size="small"
                                                        value={snap.max_units_per_term ?? 24}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        description="Date when student course registration and online enrollment opens."
                                                        disabled
                                                        label="Enrollment Opens"
                                                        size="small"
                                                        value={currentTerm.enrollment_start_date || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        description="Final date for student course registration, late enrollment, and add-drop requests."
                                                        disabled
                                                        label="Enrollment Closes"
                                                        size="small"
                                                        value={currentTerm.enrollment_end_date || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        description="Final deadline for faculty to encode and submit final grades."
                                                        disabled
                                                        label="Grading Deadline"
                                                        size="small"
                                                        value={currentTerm.grading_deadline || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                                                    <CommonSelect
                                                        description="Determines whether student evaluation of faculty is conducted per period or per term for this specific term."
                                                        disabled
                                                        fullWidth
                                                        label="Faculty Evaluation Scope"
                                                        options={[
                                                            { label: 'Per Grading Period', value: 'Period' },
                                                            { label: 'Per Term', value: 'Term' }
                                                        ]}
                                                        size="small"
                                                        value={currentTerm.evaluation_scope || snap.evaluation_scope || 'Period'}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Grading Periods — Matching Step3GradingPeriodsConfig form field appearance */}
            {currentStep === 3 && (
                <div className="flex flex-col gap-6">
                    {terms.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                            <WarningCircleIcon className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                            <p className="font-semibold text-slate-800 dark:text-slate-200">No Terms Defined</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {terms.map((term, tIdx) => {
                                const periods = term.grading_periods || [];
                                const totalWeight = periods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
                                const isBalanced = totalWeight === 100;
                                const termTitle = term.term_type_label || `Term #${tIdx + 1}`;
                                const termKey = normalizeStr(term.term_type_label).toLowerCase() || `term_${tIdx}`;
                                const matchedOtherTerm = isComparing
                                    ? otherTerms.find((ot, oIdx) => (normalizeStr(ot.term_type_label).toLowerCase() || `term_${oIdx}`) === termKey)
                                    : undefined;
                                const otherGps = matchedOtherTerm?.grading_periods || [];

                                return (
                                    <div
                                        key={term.id || tIdx}
                                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm space-y-4"
                                    >
                                        {/* Term Heading & Weight Meter */}
                                        <div
                                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                collapsedTermsStep3[tIdx] ? '' : 'border-b border-slate-100 dark:border-zinc-700/40 pb-3'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                                                        {tIdx + 1}
                                                    </span>
                                                    <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                                                        {termTitle}
                                                    </h4>
                                                    <span className="text-xs text-slate-500 font-normal">
                                                        ({periods.length} {periods.length === 1 ? 'period' : 'periods'})
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 ml-8">
                                                    {term.start_date || 'No start'} to {term.end_date || 'No end'}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                        isBalanced
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                    }`}
                                                >
                                                    {isBalanced ? (
                                                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                                                    ) : (
                                                        <WarningCircleIcon className="w-4 h-4 text-amber-600" />
                                                    )}
                                                    Weight: {totalWeight}% {isBalanced ? '(100%)' : '(Must equal 100%)'}
                                                </span>

                                                <button
                                                    aria-label={collapsedTermsStep3[tIdx] ? 'Expand Term' : 'Collapse Term'}
                                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                    title={collapsedTermsStep3[tIdx] ? 'Expand Term' : 'Collapse Term'}
                                                    type="button"
                                                    onClick={() =>
                                                        setCollapsedTermsStep3((prev) => ({ ...prev, [tIdx]: !prev[tIdx] }))
                                                    }
                                                >
                                                    <CaretDownIcon
                                                        className={`w-4 h-4 transition-transform duration-200 ${collapsedTermsStep3[tIdx] ? '-rotate-90' : 'rotate-0'}`}
                                                        weight="bold"
                                                    />
                                                    <span className="text-xs hidden sm:inline">
                                                        {collapsedTermsStep3[tIdx] ? 'Expand' : 'Collapse'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Periods List */}
                                        <div className={collapsedTermsStep3[tIdx] ? 'hidden' : 'space-y-4'}>
                                            {periods.length === 0 ? (
                                                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-zinc-700/60 rounded-xl space-y-2 bg-slate-50/40 dark:bg-zinc-800/20">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        No grading periods declared for this term.
                                                    </p>
                                                </div>
                                            ) : (
                                                periods.map((period, pIdx) => {
                                                    const gpKey = normalizeStr(period.name).toLowerCase() || `gp_${pIdx}`;
                                                    const matchedOtherGp = isComparing
                                                        ? otherGps.find(
                                                              (ogp, oIdx) => (normalizeStr(ogp.name).toLowerCase() || `gp_${oIdx}`) === gpKey
                                                          )
                                                        : undefined;
                                                    const gpAddedOrRemoved = isComparing && !matchedOtherGp;
                                                    const gpModified =
                                                        isComparing &&
                                                        Boolean(matchedOtherGp) &&
                                                        serializeGradingPeriod(period) !== serializeGradingPeriod(matchedOtherGp!);

                                                    const components = period.components || [];
                                                    const compTotalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
                                                    const isCompBalanced = components.length === 0 || compTotalWeight === 100;
                                                    const periodCollapseKey = `${tIdx}_${pIdx}`;

                                                    return (
                                                        <div
                                                            key={period.id || `term_${tIdx}_period_${pIdx}`}
                                                            className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                                                                gpAddedOrRemoved || gpModified
                                                                    ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/20 dark:bg-amber-950/10'
                                                                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40'
                                                            }`}
                                                        >
                                                            {/* Row 1: Entry number and collapse */}
                                                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-700/50 pb-2.5">
                                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                                    <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                                        #{period.sequence || pIdx + 1}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                        {period.name || `Period #${period.sequence || pIdx + 1}`}
                                                                    </span>
                                                                    {Number(period.weight) > 0 && (
                                                                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                                                                            ({period.weight}%)
                                                                        </span>
                                                                    )}
                                                                    {period.start_date && period.end_date && (
                                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                                            • {period.start_date} to {period.end_date}
                                                                        </span>
                                                                    )}
                                                                    {(gpAddedOrRemoved || gpModified) && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-bold text-[10px]">
                                                                            {gpAddedOrRemoved
                                                                                ? compareViewMode === 'modified'
                                                                                    ? 'Added'
                                                                                    : 'Removed in Modified'
                                                                                : 'Changed'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    aria-label={collapsedPeriodsStep3[periodCollapseKey] ? 'Expand period' : 'Collapse period'}
                                                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer shrink-0"
                                                                    title={collapsedPeriodsStep3[periodCollapseKey] ? 'Expand period' : 'Collapse period'}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setCollapsedPeriodsStep3((prev) => ({
                                                                            ...prev,
                                                                            [periodCollapseKey]: !prev[periodCollapseKey]
                                                                        }))
                                                                    }
                                                                >
                                                                    <CaretDownIcon
                                                                        className={`w-4 h-4 transition-transform duration-200 ${collapsedPeriodsStep3[periodCollapseKey] ? '-rotate-90' : 'rotate-0'}`}
                                                                        weight="bold"
                                                                    />
                                                                    <span className="text-xs hidden sm:inline">
                                                                        {collapsedPeriodsStep3[periodCollapseKey] ? 'Expand' : 'Collapse'}
                                                                    </span>
                                                                </button>
                                                            </div>

                                                            <div className={collapsedPeriodsStep3[periodCollapseKey] ? 'hidden' : 'flex flex-col gap-3'}>
                                                                {/* Row 2: Period name and weight */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div>
                                                                        <CommonInput
                                                                            description="Descriptive name of the grading period (e.g. Prelim, Midterm, Finals)."
                                                                            disabled
                                                                            fullWidth
                                                                            isRequired
                                                                            label="Period Name"
                                                                            placeholder="e.g. Prelim, Midterm, Finals"
                                                                            size="small"
                                                                            value={period.name || ''}
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <CommonNumberInput
                                                                            description="Percentage contribution toward the final term grade. Sum of all periods in a term must equal 100%."
                                                                            disabled
                                                                            fullWidth
                                                                            isRequired
                                                                            label="Weight (%)"
                                                                            max={100}
                                                                            min={0}
                                                                            size="small"
                                                                            suffixText="%"
                                                                            value={period.weight ?? ''}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Row 3: Start and End Date */}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <div>
                                                                        <CommonDatePicker
                                                                            description="Opening date for coursework and assessment recording in this grading period."
                                                                            disabled
                                                                            isRequired
                                                                            label="Period Start Date"
                                                                            size="small"
                                                                            value={period.start_date || ''}
                                                                            onChange={() => {}}
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <CommonDatePicker
                                                                            description="Cut-off date for exams and grade input for this period."
                                                                            disabled
                                                                            isRequired
                                                                            label="Period End Date"
                                                                            size="small"
                                                                            value={period.end_date || ''}
                                                                            onChange={() => {}}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Row 4: Major Examination Day(s) & Grade Encoding Range */}
                                                                <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-700/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/50">
                                                                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                                            <span>Major Examination Day(s)</span>
                                                                            <span className="inline-flex align-middle ml-1 whitespace-nowrap">
                                                                                <CommonInfoTooltip
                                                                                    content="Date or date range reserved for major examinations (e.g. Midterm Exams, Final Exams)."
                                                                                    size={12}
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                            <div>
                                                                                <CommonDatePicker
                                                                                    disabled
                                                                                    label="Exam Start"
                                                                                    size="small"
                                                                                    value={period.major_exam_start_date || ''}
                                                                                    onChange={() => {}}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <CommonDatePicker
                                                                                    disabled
                                                                                    label="Exam End"
                                                                                    size="small"
                                                                                    value={period.major_exam_end_date || ''}
                                                                                    onChange={() => {}}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/50">
                                                                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                                            <span>Grade Encoding Range</span>
                                                                            <span className="inline-flex align-middle ml-1 whitespace-nowrap">
                                                                                <CommonInfoTooltip
                                                                                    content="Official window during which faculty members can encode and submit grades for this period."
                                                                                    size={12}
                                                                                />
                                                                            </span>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                            <div>
                                                                                <CommonDatePicker
                                                                                    disabled
                                                                                    label="Encoding Start"
                                                                                    size="small"
                                                                                    value={period.grade_encoding_start_date || ''}
                                                                                    onChange={() => {}}
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <CommonDatePicker
                                                                                    disabled
                                                                                    label="Encoding End"
                                                                                    size="small"
                                                                                    value={period.grade_encoding_end_date || ''}
                                                                                    onChange={() => {}}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Row 5: Grading Component Breakdown */}
                                                                <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-700/50 space-y-2.5">
                                                                    <div className="flex items-center justify-between gap-2 w-full">
                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                                                                                <ListPlusIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                                                                                Grading Component Breakdown
                                                                            </span>
                                                                            <span className="inline-flex align-middle ml-1 whitespace-nowrap">
                                                                                <CommonInfoTooltip
                                                                                    className="shrink-0"
                                                                                    content="Component weight breakdown for this grading period (e.g., Quizzes: 30%, Performance Tasks: 30%, Major Exam: 40%). Total component weight must equal 100%."
                                                                                    size={13}
                                                                                />
                                                                            </span>
                                                                        </div>

                                                                        <span
                                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ml-auto ${
                                                                                isCompBalanced
                                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                                            }`}
                                                                        >
                                                                            {isCompBalanced ? (
                                                                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                                            ) : (
                                                                                <WarningCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                                                                            )}
                                                                            <span>{compTotalWeight}/100</span>
                                                                        </span>
                                                                    </div>

                                                                    {components.length === 0 ? (
                                                                        <div className="p-3 text-center rounded-lg border border-dashed border-slate-200 dark:border-zinc-700/60 bg-white/50 dark:bg-zinc-800/30">
                                                                            <p className="text-xs text-slate-500">No component breakdown declared yet.</p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            {components.map((comp, cIdx) => (
                                                                                <div
                                                                                    key={comp.id || `comp_${tIdx}_${pIdx}_${cIdx}`}
                                                                                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-2 bg-white dark:bg-zinc-800 p-2.5 sm:p-2 rounded-lg border border-slate-200 dark:border-zinc-700"
                                                                                >
                                                                                    <div className="flex items-center gap-1.5 sm:hidden w-full">
                                                                                        <span className="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                                            c{cIdx + 1}
                                                                                        </span>
                                                                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                                            Component #{cIdx + 1}
                                                                                        </span>
                                                                                    </div>

                                                                                    <span className="hidden sm:flex w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold items-center justify-center shrink-0">
                                                                                        c{cIdx + 1}
                                                                                    </span>

                                                                                    <div className="w-full sm:flex-1">
                                                                                        <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                                            Component Name
                                                                                        </span>
                                                                                        <CommonInput
                                                                                            containerClassName="w-full"
                                                                                            disabled
                                                                                            fullWidth
                                                                                            placeholder="e.g. Quizzes, Midterm Exam, Recitation"
                                                                                            size="small"
                                                                                            value={comp.name || ''}
                                                                                        />
                                                                                    </div>

                                                                                    <div className="w-full sm:w-28 sm:shrink-0">
                                                                                        <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                                            Weight (%)
                                                                                        </span>
                                                                                        <CommonNumberInput
                                                                                            containerClassName="w-full"
                                                                                            disabled
                                                                                            fullWidth
                                                                                            max={100}
                                                                                            min={0}
                                                                                            placeholder="Weight"
                                                                                            size="small"
                                                                                            suffixText="%"
                                                                                            value={comp.weight ?? ''}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Calendar Exceptions & Holidays — Matching Step4HolidaysConfig form field appearance */}
            {currentStep === 4 && (
                <div className="flex flex-col gap-5">
                    {holidays.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 space-y-2 bg-slate-50/40 dark:bg-zinc-800/20">
                            <SunIcon className="w-10 h-10 text-amber-500 mx-auto" />
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                No Calendar Exceptions or Holidays Added
                            </p>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                No holidays, breaks, or class suspensions were recorded in this version.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {holidays.map((current, idx) => {
                                const hKey = buildCompositeKey([normalizeStr(current.title).toLowerCase(), normalizeStr(current.start_date)], `h_${idx}`);
                                const matchedOtherH = isComparing
                                    ? otherHolidays.find(
                                          (oh, oIdx) =>
                                              (buildCompositeKey([normalizeStr(oh.title).toLowerCase(), normalizeStr(oh.start_date)], `h_${oIdx}`)) === hKey
                                      )
                                    : undefined;
                                const hAddedOrRemoved = isComparing && !matchedOtherH;
                                const hModified =
                                    isComparing && Boolean(matchedOtherH) && serializeHoliday(current) !== serializeHoliday(matchedOtherH!);

                                const exceptionOptions = DEFAULT_EXCEPTION_TYPE_OPTIONS.some((o) => o.value === current.exception_type)
                                    ? DEFAULT_EXCEPTION_TYPE_OPTIONS
                                    : [
                                          ...DEFAULT_EXCEPTION_TYPE_OPTIONS,
                                          ...(current.exception_type
                                              ? [{ label: current.exception_type, value: current.exception_type }]
                                              : [])
                                      ];

                                return (
                                    <div
                                        key={current.id || idx}
                                        className={`p-4 sm:p-5 rounded-2xl border bg-white dark:bg-zinc-800/80 shadow-xs space-y-4 w-full ${
                                            hAddedOrRemoved || hModified
                                                ? 'border-amber-300 dark:border-amber-700/70'
                                                : 'border-slate-200 dark:border-zinc-700/70'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-700/60 pb-3">
                                            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                                                <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                                                    #{idx + 1}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {current.title || `Exception #${idx + 1}`}
                                                </span>
                                                {current.exception_type && (
                                                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                        {current.exception_type}
                                                    </span>
                                                )}
                                                {current.start_date && (
                                                    <span className="text-xs text-slate-400 shrink-0 hidden md:inline">
                                                        • {current.start_date}
                                                        {current.end_date && current.end_date !== current.start_date ? ` to ${current.end_date}` : ''}
                                                    </span>
                                                )}
                                                {(hAddedOrRemoved || hModified) && (
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                                        {hAddedOrRemoved
                                                            ? compareViewMode === 'modified'
                                                                ? 'Added'
                                                                : 'Removed in Modified'
                                                            : 'Changed'}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                aria-label={collapsedExceptionsStep4[idx] ? 'Expand exception' : 'Collapse exception'}
                                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer shrink-0"
                                                title={collapsedExceptionsStep4[idx] ? 'Expand exception' : 'Collapse exception'}
                                                type="button"
                                                onClick={() =>
                                                    setCollapsedExceptionsStep4((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                                }
                                            >
                                                <CaretDownIcon
                                                    className={`w-4 h-4 transition-transform duration-200 ${collapsedExceptionsStep4[idx] ? '-rotate-90' : 'rotate-0'}`}
                                                    weight="bold"
                                                />
                                                <span className="text-xs hidden sm:inline">
                                                    {collapsedExceptionsStep4[idx] ? 'Expand' : 'Collapse'}
                                                </span>
                                            </button>
                                        </div>

                                        <div className={collapsedExceptionsStep4[idx] ? 'hidden' : 'space-y-4'}>
                                            <div>
                                                <CommonInput
                                                    disabled
                                                    fullWidth
                                                    isRequired
                                                    label="Holiday / Exception Title"
                                                    placeholder="Holiday / Exception Title (e.g. Independence Day)"
                                                    size="small"
                                                    value={current.title || ''}
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                                <div>
                                                    <CommonSelect
                                                        disabled
                                                        fullWidth
                                                        label="Exception Type"
                                                        options={exceptionOptions}
                                                        size="small"
                                                        value={current.exception_type || 'Holiday'}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-(--mui-tokens-spacing-2) relative">
                                                    <FormLabel className="tw_body_small_bold" label="Class Impact" />
                                                    <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-700 dark:text-slate-300 select-none cursor-default">
                                                        <input
                                                            checked={Boolean(current.affects_attendance)}
                                                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-100"
                                                            disabled
                                                            type="checkbox"
                                                            onChange={() => {}}
                                                        />
                                                        <span className="font-medium">Class Suspended</span>
                                                    </label>
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        disabled
                                                        isRequired
                                                        label="Start Date"
                                                        size="small"
                                                        value={current.start_date || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        disabled
                                                        isRequired
                                                        label="End Date"
                                                        size="small"
                                                        value={current.end_date || ''}
                                                        onChange={() => {}}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <CommonInput
                                                    disabled
                                                    fullWidth
                                                    label="Description / Note (Optional)"
                                                    placeholder="e.g. Regular National Non-Working Holiday"
                                                    size="small"
                                                    value={current.description || ''}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Step 5: Grade Schema (Transmutation Ladder) — Matching Step4TransmutationConfig form field appearance */}
            {currentStep === 5 && (
                <div className="flex flex-col gap-5">
                    {transmutationRows.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800">
                            <p className="text-xs text-slate-500">No transmutation schema defined in this version.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transmutationRows.map((row, index) => {
                                const isCond = Boolean(isSpecialGradeRow(row));
                                const rKey = normalizeStr(row.label).toLowerCase() || `r_${index}`;
                                const matchedOtherRow = isComparing
                                    ? otherTransmutationRows.find((or, oIdx) => (normalizeStr(or.label).toLowerCase() || `r_${oIdx}`) === rKey)
                                    : undefined;
                                const rAddedOrRemoved = isComparing && !matchedOtherRow;
                                const rModified =
                                    isComparing && Boolean(matchedOtherRow) && serializeTransmutationRow(row) !== serializeTransmutationRow(matchedOtherRow!);

                                return (
                                    <div
                                        key={row.id || index}
                                        className={`p-4 rounded-xl border transition-all space-y-3 w-full ${
                                            rAddedOrRemoved || rModified
                                                ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/20 dark:bg-amber-950/10'
                                                : isCond
                                                  ? 'border-slate-200 dark:border-zinc-700/70 bg-slate-50/60 dark:bg-zinc-800/50'
                                                  : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                                        }`}
                                    >
                                        {/* Row 1: Rung Badge + Collapse */}
                                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-700/60">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {row.label || `Grade Rung #${index + 1}`}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                        row.is_passing
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                    }`}
                                                >
                                                    {row.is_passing ? (
                                                        <>
                                                            <CheckCircleIcon className="w-3.5 h-3.5" /> Passing
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircleIcon className="w-3.5 h-3.5" /> Failing
                                                        </>
                                                    )}
                                                </span>
                                                {(rAddedOrRemoved || rModified) && (
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                                        {rAddedOrRemoved
                                                            ? compareViewMode === 'modified'
                                                                ? 'Added'
                                                                : 'Removed in Modified'
                                                            : 'Changed'}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                aria-label={collapsedRungsStep5[index] ? 'Expand grade rung' : 'Collapse grade rung'}
                                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer shrink-0"
                                                title={collapsedRungsStep5[index] ? 'Expand grade rung' : 'Collapse grade rung'}
                                                type="button"
                                                onClick={() =>
                                                    setCollapsedRungsStep5((prev) => ({ ...prev, [index]: !prev[index] }))
                                                }
                                            >
                                                <CaretDownIcon
                                                    className={`w-4 h-4 transition-transform duration-200 ${collapsedRungsStep5[index] ? '-rotate-90' : 'rotate-0'}`}
                                                    weight="bold"
                                                />
                                                <span className="text-xs hidden sm:inline">
                                                    {collapsedRungsStep5[index] ? 'Expand' : 'Collapse'}
                                                </span>
                                            </button>
                                        </div>

                                        <div className={collapsedRungsStep5[index] ? 'hidden' : 'space-y-4'}>
                                            {/* Row 2: Grade Type, Description, Status */}
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                <div className="sm:col-span-4 md:col-span-3">
                                                    <CommonSelect
                                                        description="Choose whether this mark is a Fixed score range or a Conditional status grade (INC, DRP)."
                                                        disabled
                                                        fullWidth
                                                        label="Grade Type"
                                                        options={[
                                                            { label: 'Fixed Range', value: 'fixed' },
                                                            { label: 'Conditional', value: 'conditional' }
                                                        ]}
                                                        size="small"
                                                        value={isCond ? 'conditional' : 'fixed'}
                                                    />
                                                </div>

                                                <div className="sm:col-span-5 md:col-span-6">
                                                    <CommonInput
                                                        description="Human-readable descriptor appearing on report cards and evaluation transcripts."
                                                        disabled
                                                        fullWidth
                                                        label="Description"
                                                        placeholder="e.g. Excellent, Incomplete, Dropped"
                                                        size="small"
                                                        value={row.description || ''}
                                                    />
                                                </div>

                                                <div className="sm:col-span-3 flex flex-col gap-(--mui-tokens-spacing-2) relative">
                                                    <FormLabel
                                                        className="tw_body_small_bold"
                                                        description="Toggles whether this grade mark grants academic credit (Passing vs Failing)."
                                                        label="Status"
                                                    />
                                                    <button
                                                        className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-default ${
                                                            row.is_passing
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                                        }`}
                                                        disabled
                                                        type="button"
                                                    >
                                                        {row.is_passing ? '✓ Passing' : '✕ Failing'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Row 3: Mark, Min %, Max % */}
                                            {isCond ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <CommonInput
                                                            description="Status grade code (e.g. INC, DRP, W, NFE)."
                                                            disabled
                                                            fullWidth
                                                            isRequired
                                                            label="Mark / Grade"
                                                            placeholder="e.g. INC, DRP"
                                                            size="small"
                                                            value={row.label || ''}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                    <div>
                                                        <CommonInput
                                                            description="Transmuted numeric mark (e.g. 1.00, 1.25, 3.00, 5.00)."
                                                            disabled
                                                            fullWidth
                                                            isRequired
                                                            label="Mark / Grade"
                                                            placeholder="e.g. 1.25, 3.00"
                                                            size="small"
                                                            value={row.label || ''}
                                                        />
                                                    </div>

                                                    <div>
                                                        <CommonNumberInput
                                                            description="Minimum raw percentage required for this fixed grade mark."
                                                            disabled
                                                            fullWidth
                                                            isRequired
                                                            label="Min %"
                                                            max={100}
                                                            min={0}
                                                            size="small"
                                                            step={0.5}
                                                            suffixText="%"
                                                            value={row.min_percentage ?? ''}
                                                        />
                                                    </div>

                                                    <div>
                                                        <CommonNumberInput
                                                            description="Maximum raw percentage allocated to this fixed grade mark."
                                                            disabled
                                                            fullWidth
                                                            isRequired
                                                            label="Max %"
                                                            max={100}
                                                            min={0}
                                                            size="small"
                                                            step={0.5}
                                                            suffixText="%"
                                                            value={row.max_percentage ?? ''}
                                                        />
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
            )}

            {/* Step 6: Academic Thresholds — Matching Step5ThresholdsConfig form field appearance */}
            {currentStep === 6 && (
                <div className="flex flex-col gap-5">
                    {thresholds.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 space-y-2">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                No Academic Thresholds Configured
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {thresholds.map((item, idx) => {
                                const thKey = buildCompositeKey([normalizeStr(item.category).toLowerCase(), normalizeStr(item.label).toLowerCase()], `th_${idx}`);
                                const matchedOtherTh = isComparing
                                    ? otherThresholds.find(
                                          (oth, oIdx) =>
                                              (buildCompositeKey([normalizeStr(oth.category).toLowerCase(), normalizeStr(oth.label).toLowerCase()], `th_${oIdx}`)) === thKey
                                      )
                                    : undefined;
                                const thAddedOrRemoved = isComparing && !matchedOtherTh;
                                const thModified =
                                    isComparing && Boolean(matchedOtherTh) && serializeThreshold(item) !== serializeThreshold(matchedOtherTh!);
                                const isActive = item.is_active !== undefined ? Boolean(item.is_active) : true;

                                return (
                                    <div
                                        key={item.id || idx}
                                        className={`p-4 rounded-xl border transition-all space-y-3 w-full ${
                                            thAddedOrRemoved || thModified
                                                ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/20 dark:bg-amber-950/10'
                                                : 'border-slate-200 dark:border-zinc-700/70 bg-white dark:bg-zinc-800/80 shadow-xs'
                                        }`}
                                    >
                                        {/* Row 1: Entry number & collapse */}
                                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-700/60">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                    #{idx + 1}
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {item.label || `Threshold #${idx + 1}`}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                                                    {item.category}
                                                </span>
                                                {item.max_gwa && (
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        (Max GWA: {item.max_gwa})
                                                    </span>
                                                )}
                                                {(thAddedOrRemoved || thModified) && (
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                                                        {thAddedOrRemoved
                                                            ? compareViewMode === 'modified'
                                                                ? 'Added'
                                                                : 'Removed in Modified'
                                                            : 'Changed'}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                aria-label={collapsedThresholdsStep6[idx] ? 'Expand threshold' : 'Collapse threshold'}
                                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer shrink-0"
                                                title={collapsedThresholdsStep6[idx] ? 'Expand threshold' : 'Collapse threshold'}
                                                type="button"
                                                onClick={() =>
                                                    setCollapsedThresholdsStep6((prev) => ({ ...prev, [idx]: !prev[idx] }))
                                                }
                                            >
                                                <CaretDownIcon
                                                    className={`w-4 h-4 transition-transform duration-200 ${collapsedThresholdsStep6[idx] ? '-rotate-90' : 'rotate-0'}`}
                                                    weight="bold"
                                                />
                                                <span className="text-xs hidden sm:inline">
                                                    {collapsedThresholdsStep6[idx] ? 'Expand' : 'Collapse'}
                                                </span>
                                            </button>
                                        </div>

                                        <div className={collapsedThresholdsStep6[idx] ? 'hidden' : 'flex flex-col gap-4'}>
                                            {/* Row 2: Category, Threshold Name, Status */}
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                <div className="sm:col-span-4 md:col-span-3">
                                                    <CommonSelect
                                                        description="Functional classification of this academic criterion (Honor, Scholarship, or Academic Standing)."
                                                        disabled
                                                        fullWidth
                                                        isRequired
                                                        label="Category"
                                                        options={THRESHOLD_CATEGORY_OPTIONS}
                                                        size="small"
                                                        value={item.category || 'Honor'}
                                                    />
                                                </div>

                                                <div className="sm:col-span-5 md:col-span-6">
                                                    <CommonInput
                                                        description="Official title revealed on student rank lists, certificates, and academic summary cards."
                                                        disabled
                                                        fullWidth
                                                        isRequired
                                                        label="Threshold Name / Label"
                                                        placeholder="e.g. Summa Cum Laude, Full Scholar"
                                                        size="small"
                                                        value={item.label || ''}
                                                    />
                                                </div>

                                                <div className="sm:col-span-3 flex flex-col gap-(--mui-tokens-spacing-2) relative">
                                                    <FormLabel
                                                        className="tw_body_small_bold"
                                                        description="Toggles whether this threshold is active for student evaluations."
                                                        label="Status"
                                                    />
                                                    <button
                                                        className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-default ${
                                                            isActive
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 border border-slate-300 dark:border-zinc-700'
                                                        }`}
                                                        disabled
                                                        type="button"
                                                    >
                                                        {isActive ? '✓ Active Threshold' : '✕ Inactive'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Row 4: Min and Max GWA */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <CommonNumberInput
                                                        description="Minimum (best) GWA required for this threshold tier (typically 1.00)."
                                                        disabled
                                                        fullWidth
                                                        label="Min GWA"
                                                        maxDecimals={2}
                                                        minDecimals={2}
                                                        placeholder="1.00 (Optional)"
                                                        size="small"
                                                        step={0.01}
                                                        value={item.min_gwa ?? ''}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonNumberInput
                                                        description="Maximum allowed GWA cutoff. Students with GWA worse than this value are disqualified."
                                                        disabled
                                                        fullWidth
                                                        isRequired
                                                        label="Max GWA (Cutoff)"
                                                        maxDecimals={2}
                                                        minDecimals={2}
                                                        placeholder="1.25"
                                                        size="small"
                                                        step={0.01}
                                                        value={item.max_gwa ?? ''}
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 5: Subject Floor Grade and No Failing Checkbox */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                                <div>
                                                    <CommonNumberInput
                                                        description="Worst allowed grade in any single course unit. If a student receives a grade worse than this, they are disqualified even if their GWA qualifies."
                                                        disabled
                                                        fullWidth
                                                        label="Subject Floor Grade"
                                                        maxDecimals={2}
                                                        minDecimals={2}
                                                        placeholder="Optional (e.g. 2.50)"
                                                        size="small"
                                                        step={0.01}
                                                        value={item.min_subject_grade ?? ''}
                                                    />
                                                </div>

                                                <div className="h-9 flex items-center px-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                                                    <label className="inline-flex items-center gap-2 cursor-default text-xs font-medium text-slate-800 dark:text-slate-200 w-full select-none">
                                                        <input
                                                            checked={Boolean(item.requires_no_failing)}
                                                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700 shrink-0 disabled:opacity-100"
                                                            disabled
                                                            type="checkbox"
                                                            onChange={() => {}}
                                                        />
                                                        <span className="truncate">No failing grades permitted</span>
                                                        <CommonInfoTooltip
                                                            content="Requires that the student has zero failing marks (5.00, DRP, INC) in the evaluation period."
                                                            size={13}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
