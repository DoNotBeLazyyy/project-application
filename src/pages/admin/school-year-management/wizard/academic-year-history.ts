import { isSpecialGradeRow } from '@pages/admin/school-year-management/wizard/wizard.constants';
import { EvaluationScope } from '@type/evaluation.type';
import {
    AcademicYearHistoryItem,
    AcademicYearWizardFormValues,
    WizardCalendarExceptionItem,
    WizardGradingPeriodItem,
    WizardTermItem,
    WizardThresholdItem,
    WizardTransmutationRow
} from '@type/school-year.type';

export type AcademicYearSnapshot = AcademicYearHistoryItem['snapshot'];

/** Which side of a version comparison is on screen. */
export type CompareViewMode = 'original' | 'modified';

/** How a field or item differs from the other version being compared. */
export type HistoryDiffLabel = 'Added' | 'Changed' | 'Removed in Modified';

export interface HistoryDiffMark {
    label: HistoryDiffLabel;
    /** Short text with the other version's value, e.g. "Original: 2026-06-01". */
    note?: string;
}

/**
 * Differences shown on the wizard steps while comparing versions. Keys:
 * a Step 1 field name (start_date, end_date, code, label, is_active), term:{index},
 * period:{termIndex}:{periodIndex}, holiday:{index}, row:{index} and threshold:{index}.
 * Indexes are positions in the version on screen.
 */
export type HistoryDiffMarks = Record<string, HistoryDiffMark>;

/** Classes for a card or field that differs from the other version. */
export const HISTORY_DIFF_HIGHLIGHT_CLASS = 'border-amber-300 dark:border-amber-700/70';

/** Classes for a Step 1 field wrapper that differs from the other version. */
export const HISTORY_DIFF_FIELD_CLASS = 'p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-700';

function normalizeStr(val: unknown): string {
    return String(val ?? '')
        .trim();
}

function normalizeNum(val: unknown, fallback = 0): number {
    if (val === null || val === undefined || val === '') return fallback;
    const n = Number(val);
    return Number.isNaN(n)
        ? fallback
        : n;
}

function toNumberOrNull(val: unknown): number | null {
    return val !== null && val !== undefined && val !== ''
        ? Number(val)
        : null;
}

// Joins non-empty identity parts; falls back to a positional key when every part is empty
function buildCompositeKey(parts: string[], fallback: string): string {
    return parts.some(Boolean)
        ? parts.join('::')
        : fallback;
}

function serializeTerm(t: WizardTermItem): string {
    return JSON.stringify({
        label: normalizeStr(t.term_type_label)
            .toLowerCase(),
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
        name: normalizeStr(gp.name)
            .toLowerCase(),
        sequence: normalizeNum(gp.sequence, 1),
        weight: normalizeNum(gp.weight, 0),
        start_date: normalizeStr(gp.start_date),
        end_date: normalizeStr(gp.end_date),
        major_exam_start_date: normalizeStr(gp.major_exam_start_date),
        major_exam_end_date: normalizeStr(gp.major_exam_end_date),
        grade_encoding_start_date: normalizeStr(gp.grade_encoding_start_date),
        grade_encoding_end_date: normalizeStr(gp.grade_encoding_end_date),
        components: (gp.components || []).map((c) => ({
            name: normalizeStr(c.name)
                .toLowerCase(),
            weight: normalizeNum(c.weight, 0)
        }))
    });
}

function serializeHoliday(h: WizardCalendarExceptionItem): string {
    return JSON.stringify({
        title: normalizeStr(h.title)
            .toLowerCase(),
        exception_type: normalizeStr(h.exception_type || 'Holiday'),
        start_date: normalizeStr(h.start_date),
        end_date: normalizeStr(h.end_date),
        affects_attendance: Boolean(h.affects_attendance),
        description: normalizeStr(h.description)
    });
}

function serializeTransmutationRow(r: WizardTransmutationRow): string {
    return JSON.stringify({
        label: normalizeStr(r.label)
            .toLowerCase(),
        is_conditional: Boolean(isSpecialGradeRow(r)),
        min_percentage: toNumberOrNull(r.min_percentage),
        max_percentage: toNumberOrNull(r.max_percentage),
        transmuted_grade: toNumberOrNull(r.transmuted_grade),
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
        label: normalizeStr(th.label)
            .toLowerCase(),
        category: normalizeStr(th.category || 'Honor'),
        max_gwa: normalizeNum(th.max_gwa, 0),
        min_gwa: toNumberOrNull(th.min_gwa),
        min_subject_grade: toNumberOrNull(th.min_subject_grade),
        requires_no_failing: Boolean(th.requires_no_failing),
        scholarship_discount_pct: toNumberOrNull(th.scholarship_discount_pct),
        is_active: th.is_active !== undefined
            ? Boolean(th.is_active)
            : true
    });
}

function termKey(t: WizardTermItem, idx: number): string {
    return normalizeStr(t.term_type_label)
        .toLowerCase() || `term_${idx}`;
}

function periodKey(gp: WizardGradingPeriodItem, idx: number): string {
    return normalizeStr(gp.name)
        .toLowerCase() || `gp_${idx}`;
}

function holidayKey(h: WizardCalendarExceptionItem, idx: number): string {
    return buildCompositeKey([normalizeStr(h.title)
        .toLowerCase(), normalizeStr(h.start_date)], `h_${idx}`);
}

function rowKey(r: WizardTransmutationRow, idx: number): string {
    return normalizeStr(r.label)
        .toLowerCase() || `r_${idx}`;
}

function thresholdKey(th: WizardThresholdItem, idx: number): string {
    return buildCompositeKey([normalizeStr(th.category)
        .toLowerCase(), normalizeStr(th.label)
        .toLowerCase()], `th_${idx}`);
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
        mapA.set(getKey(item, idx), serialize(item));
    });
    listB.forEach((item, idx) => {
        mapB.set(getKey(item, idx), serialize(item));
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

function flattenPeriods(terms: WizardTermItem[]): { key: string; gp: WizardGradingPeriodItem }[] {
    const periods: { key: string; gp: WizardGradingPeriodItem }[] = [];
    terms.forEach((t, tIdx) => {
        (t.grading_periods || []).forEach((gp, gpIdx) => {
            periods.push({ key: `${termKey(t, tIdx)}::${periodKey(gp, gpIdx)}`, gp });
        });
    });
    return periods;
}

/** Step 1 fields compared between versions, with how to show each value. */
const STEP1_FIELDS: { name: 'start_date' | 'end_date' | 'code' | 'label' | 'is_active'; format: (snap: AcademicYearSnapshot) => string }[] = [
    { name: 'start_date', format: (snap) => normalizeStr(snap.start_date) },
    { name: 'end_date', format: (snap) => normalizeStr(snap.end_date) },
    { name: 'code', format: (snap) => normalizeStr(snap.code) },
    { name: 'label', format: (snap) => normalizeStr(snap.label) },
    {
        name: 'is_active',
        format: (snap) => (snap.is_active
            ? 'Active'
            : 'Inactive')
    }
];

/**
 * Counts the differences per wizard step between two saved versions.
 *
 * @param snapA - One version.
 * @param snapB - The other version.
 * @returns Number of changed fields or items for steps 1 to 6.
 */
export function computeStepDiffCounts(snapA?: AcademicYearSnapshot, snapB?: AcademicYearSnapshot): Record<number, number> {
    if (!snapA || !snapB) {
        return {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
        };
    }

    const step1Diffs = STEP1_FIELDS.filter((field) => field.format(snapA) !== field.format(snapB)).length;

    const termsA = snapA.terms || [];
    const termsB = snapB.terms || [];

    return {
        1: step1Diffs,
        2: countCollectionDiffs(termsA, termsB, termKey, serializeTerm),
        3: countCollectionDiffs(
            flattenPeriods(termsA),
            flattenPeriods(termsB),
            (item, idx) => item.key || `p_${idx}`,
            (item) => serializeGradingPeriod(item.gp)
        ),
        4: countCollectionDiffs(snapA.holidays || [], snapB.holidays || [], holidayKey, serializeHoliday),
        5: countCollectionDiffs(snapA.transmutation_rows || [], snapB.transmutation_rows || [], rowKey, serializeTransmutationRow),
        6: countCollectionDiffs(snapA.thresholds || [], snapB.thresholds || [], thresholdKey, serializeThreshold)
    };
}

/**
 * Marks each item of the version on screen as Added / Removed / Changed compared with the
 * other version, keyed by position (see HistoryDiffMarks).
 */
function markCollection<T>(
    marks: HistoryDiffMarks,
    prefix: string,
    items: T[],
    otherItems: T[],
    getKey: (item: T, idx: number) => string,
    serialize: (item: T) => string,
    missingLabel: HistoryDiffLabel
): void {
    items.forEach((item, idx) => {
        const key = getKey(item, idx);
        const match = otherItems.find((other, oIdx) => getKey(other, oIdx) === key);
        if (!match) {
            marks[`${prefix}${idx}`] = { label: missingLabel };
        }
        else if (serialize(item) !== serialize(match)) {
            marks[`${prefix}${idx}`] = { label: 'Changed' };
        }
    });
}

/**
 * Builds the differences to highlight on the wizard steps for the version on screen.
 *
 * @param snap - The version on screen.
 * @param otherSnap - The version it is compared with.
 * @param viewMode - Whether the version on screen is the original or the modified one.
 * @returns Marks keyed as described on HistoryDiffMarks.
 */
export function computeHistoryDiffMarks(
    snap: AcademicYearSnapshot,
    otherSnap: AcademicYearSnapshot,
    viewMode: CompareViewMode
): HistoryDiffMarks {
    const marks: HistoryDiffMarks = {};
    // An item only in the version on screen was added (modified side) or later removed (original side)
    const missingLabel: HistoryDiffLabel = viewMode === 'modified'
        ? 'Added'
        : 'Removed in Modified';
    const otherSide = viewMode === 'original'
        ? 'Modified'
        : 'Original';

    STEP1_FIELDS.forEach((field) => {
        if (field.format(snap) !== field.format(otherSnap)) {
            marks[field.name] = { label: 'Changed', note: `${otherSide}: ${field.format(otherSnap) || '—'}` };
        }
    });

    const terms = snap.terms || [];
    const otherTerms = otherSnap.terms || [];
    markCollection(marks, 'term:', terms, otherTerms, termKey, serializeTerm, missingLabel);

    terms.forEach((term, tIdx) => {
        const key = termKey(term, tIdx);
        const otherTerm = otherTerms.find((ot, oIdx) => termKey(ot, oIdx) === key);
        markCollection(
            marks,
            `period:${tIdx}:`,
            term.grading_periods || [],
            otherTerm?.grading_periods || [],
            periodKey,
            serializeGradingPeriod,
            missingLabel
        );
    });

    markCollection(marks, 'holiday:', snap.holidays || [], otherSnap.holidays || [], holidayKey, serializeHoliday, missingLabel);
    markCollection(marks, 'row:', snap.transmutation_rows || [], otherSnap.transmutation_rows || [], rowKey, serializeTransmutationRow, missingLabel);
    markCollection(marks, 'threshold:', snap.thresholds || [], otherSnap.thresholds || [], thresholdKey, serializeThreshold, missingLabel);

    return marks;
}

/**
 * Turns a saved version into wizard form values, for viewing it and for restoring it.
 *
 * @param snap - The saved version.
 * @param schoolYearId - The academic year it belongs to.
 * @returns Values in the shape the wizard steps and the payload builder use.
 */
export function snapshotToWizardValues(snap: AcademicYearSnapshot, schoolYearId: string | null): AcademicYearWizardFormValues {
    return {
        code: snap.code || '',
        end_date: snap.end_date || '',
        evaluation_scope: (snap.evaluation_scope || 'Period') as EvaluationScope,
        holidays: snap.holidays || [],
        id: schoolYearId,
        is_active: Boolean(snap.is_active),
        label: snap.label || '',
        max_units_per_term: snap.max_units_per_term ?? 24,
        start_date: snap.start_date || '',
        terms: snap.terms || [],
        thresholds: snap.thresholds || [],
        transmutation_rows: snap.transmutation_rows || []
    };
}