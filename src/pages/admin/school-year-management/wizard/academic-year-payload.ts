import {
    isSpecialGradeRow,
    toCalendarExceptionType,
    validateCalendarExceptions,
    validateGradingPeriods,
    validateTerms,
    validateThresholds,
    validateTransmutationRows
} from '@pages/admin/school-year-management/wizard/wizard.constants';
import {
    AcademicYearWizardFormValues,
    SaveAcademicYearCalendarPayload,
    WizardTermItem,
    WizardThresholdItem,
    WizardTransmutationRow
} from '@type/school-year.type';
import { ensureUniqueCode, generateAcademicThresholdCode } from '@utils/entity-code.util';

/** A term whose term type is already stored, so its id can be sent to the server. */
export type ResolvedWizardTerm = WizardTermItem & { term_type_id: string };

function hasValue(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '';
}

function buildThresholds(thresholds: WizardThresholdItem[]): WizardThresholdItem[] {
    const existingCodes: string[] = [];
    return thresholds.map((th, idx) => {
        const labelTrimmed = (th.label || '').trim() || `Threshold #${idx + 1}`;
        const rawCode = (th.code && !th.code.startsWith('custom_threshold_'))
            ? th.code.trim()
            : generateAcademicThresholdCode(labelTrimmed, existingCodes);
        const finalCode = ensureUniqueCode(rawCode, existingCodes);
        existingCodes.push(finalCode);
        return {
            id: th.id,
            category: th.category || 'Honor',
            code: finalCode,
            label: labelTrimmed,
            min_gwa: hasValue(th.min_gwa)
                ? Number(th.min_gwa)
                : null,
            max_gwa: Number(th.max_gwa),
            min_subject_grade: hasValue(th.min_subject_grade)
                ? Number(th.min_subject_grade)
                : null,
            requires_no_failing: Boolean(th.requires_no_failing),
            scholarship_discount_pct: hasValue(th.scholarship_discount_pct)
                ? Number(th.scholarship_discount_pct)
                : null,
            sort_order: th.sort_order || idx + 1,
            is_active: Boolean(th.is_active)
        };
    });
}

function buildTransmutationRows(rows: WizardTransmutationRow[]): WizardTransmutationRow[] {
    return rows.map((r, idx) => {
        const isSpecial = isSpecialGradeRow(r);
        return {
            id: r.id,
            label: (r.label || '').trim() || `Row #${idx + 1}`,
            // Special grades (INC, DRP...) have no percentage range or numeric grade
            min_percentage: isSpecial || !hasValue(r.min_percentage)
                ? 0
                : Number(r.min_percentage),
            max_percentage: isSpecial || !hasValue(r.max_percentage)
                ? 0
                : Number(r.max_percentage),
            transmuted_grade: !isSpecial && hasValue(r.transmuted_grade)
                ? Number(r.transmuted_grade)
                : null,
            is_passing: Boolean(r.is_passing),
            special_code: r.special_code
                ? r.special_code.trim()
                : null,
            description: r.description
                ? r.description.trim()
                : null,
            is_auto_detected: isSpecial && Boolean(r.is_auto_detected),
            conditions: isSpecial && r.is_auto_detected
                ? (r.conditions ?? null)
                : null
        };
    });
}

/**
 * Turns wizard (or saved version) values into the payload fn_save_academic_year_calendar expects.
 * Used by the wizard save and by reverting to an older version, so both send the same shape.
 */
export function buildAcademicYearCalendarPayload(
    values: AcademicYearWizardFormValues,
    terms: ResolvedWizardTerm[],
    revertHistoryId?: string | null
): SaveAcademicYearCalendarPayload {
    return {
        p_code: (values.code || '').trim(),
        p_end_date: values.end_date,
        p_evaluation_scope: values.evaluation_scope || 'Period',
        p_is_active: Boolean(values.is_active),
        p_label: (values.label || '').trim(),
        p_max_units_per_term: values.max_units_per_term
            ? Number(values.max_units_per_term)
            : 24,
        p_revert_history_id: revertHistoryId || null,
        p_school_year_id: values.id || null,
        p_start_date: values.start_date,
        p_terms: terms.map((t) => ({
            id: t.id,
            term_type_id: t.term_type_id,
            start_date: t.start_date,
            end_date: t.end_date,
            enrollment_start_date: t.enrollment_start_date || null,
            enrollment_end_date: t.enrollment_end_date || null,
            grading_deadline: t.grading_deadline || null,
            status: t.status || 'Upcoming',
            evaluation_scope: t.evaluation_scope || values.evaluation_scope || 'Period',
            grading_periods: (t.grading_periods || []).map((gp, idx) => ({
                id: gp.id,
                name: (gp.name || '').trim(),
                sequence: gp.sequence || (idx + 1),
                start_date: gp.start_date || null,
                end_date: gp.end_date || null,
                weight: Number(gp.weight) || 0,
                major_exam_start_date: gp.major_exam_start_date || null,
                major_exam_end_date: gp.major_exam_end_date || null,
                grade_encoding_start_date: gp.grade_encoding_start_date || null,
                grade_encoding_end_date: gp.grade_encoding_end_date || null,
                components: (gp.components || []).map((c) => ({
                    id: c.id,
                    name: (c.name || '').trim(),
                    weight: Number(c.weight) || 0
                }))
            }))
        })),
        p_thresholds: buildThresholds(values.thresholds || []),
        p_transmutation_rows: buildTransmutationRows(values.transmutation_rows || []),
        p_holidays: (values.holidays || []).map((h) => ({
            id: h.id,
            title: (h.title || '').trim(),
            exception_type: toCalendarExceptionType(h.exception_type) || 'Holiday',
            start_date: h.start_date,
            end_date: h.end_date,
            affects_attendance: Boolean(h.affects_attendance),
            description: h.description
                ? h.description.trim()
                : null
        }))
    };
}

/**
 * Runs the wizard's step checks (terms, grading periods, holidays, grades, thresholds)
 * on a full set of values and returns every problem found, in plain words.
 */
export function collectAcademicYearValidationErrors(values: AcademicYearWizardFormValues): string[] {
    const results = [
        validateTerms(values.terms || [], values.start_date, values.end_date),
        validateGradingPeriods(values.terms || []),
        validateCalendarExceptions(values.holidays || []),
        validateTransmutationRows(values.transmutation_rows || []),
        validateThresholds(values.thresholds || [])
    ];

    return results.flatMap((result) => {
        if (result.isValid) {
            return [];
        }
        if (result.errors && result.errors.length > 0) {
            return result.errors.map((err) => err.message);
        }
        return result.error
            ? [result.error]
            : [];
    });
}