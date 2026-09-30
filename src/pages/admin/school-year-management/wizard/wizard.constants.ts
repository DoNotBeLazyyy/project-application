import {
    AcademicYearCalendarDetails,
    AcademicYearWizardFormValues,
    WizardGradingPeriodItem,
    WizardTermItem,
    WizardThresholdItem,
    WizardTransmutationRow
} from '@type/school-year.type';

export const DEFAULT_GRADING_PERIODS: WizardGradingPeriodItem[] = [
    { name: 'Prelim', sequence: 1, weight: 30 },
    { name: 'Midterm', sequence: 2, weight: 30 },
    { name: 'Finals', sequence: 3, weight: 40 }
];

export const TWO_PERIOD_PRESET: WizardGradingPeriodItem[] = [
    { name: 'Midterm', sequence: 1, weight: 50 },
    { name: 'Finals', sequence: 2, weight: 50 }
];

export const FOUR_PERIOD_PRESET: WizardGradingPeriodItem[] = [
    { name: 'Prelim', sequence: 1, weight: 25 },
    { name: 'Midterm', sequence: 2, weight: 25 },
    { name: 'Semi-Finals', sequence: 3, weight: 25 },
    { name: 'Finals', sequence: 4, weight: 25 }
];

export const DEFAULT_TRANSMUTATION_ROWS: WizardTransmutationRow[] = [
    { label: '1.00', min_percentage: 98, max_percentage: 100, transmuted_grade: 1.00, is_passing: true, special_code: null, description: 'Excellent' },
    { label: '1.25', min_percentage: 95, max_percentage: 97, transmuted_grade: 1.25, is_passing: true, special_code: null, description: 'Superior' },
    { label: '1.50', min_percentage: 92, max_percentage: 94, transmuted_grade: 1.50, is_passing: true, special_code: null, description: 'Very Good' },
    { label: '1.75', min_percentage: 89, max_percentage: 91, transmuted_grade: 1.75, is_passing: true, special_code: null, description: 'Good' },
    { label: '2.00', min_percentage: 86, max_percentage: 88, transmuted_grade: 2.00, is_passing: true, special_code: null, description: 'Meritorious' },
    { label: '2.25', min_percentage: 83, max_percentage: 85, transmuted_grade: 2.25, is_passing: true, special_code: null, description: 'Very Satisfactory' },
    { label: '2.50', min_percentage: 80, max_percentage: 82, transmuted_grade: 2.50, is_passing: true, special_code: null, description: 'Satisfactory' },
    { label: '2.75', min_percentage: 77, max_percentage: 79, transmuted_grade: 2.75, is_passing: true, special_code: null, description: 'Fairly Satisfactory' },
    { label: '3.00', min_percentage: 75, max_percentage: 76, transmuted_grade: 3.00, is_passing: true, special_code: null, description: 'Passing' },
    { label: '4.00', min_percentage: 70, max_percentage: 74, transmuted_grade: 4.00, is_passing: false, special_code: 'INC', description: 'Incomplete / Conditional' },
    { label: '5.00', min_percentage: 0, max_percentage: 69, transmuted_grade: 5.00, is_passing: false, special_code: null, description: 'Failed' },
    { label: 'DRP', min_percentage: 0, max_percentage: 0, transmuted_grade: null, is_passing: false, special_code: 'DRP', description: 'Officially Dropped' }
];

export const DEFAULT_ACADEMIC_THRESHOLDS: WizardThresholdItem[] = [
    {
        category: 'Honor',
        code: 'summa_cum_laude',
        label: 'Summa Cum Laude',
        min_gwa: 1.00,
        max_gwa: 1.25,
        min_subject_grade: null,
        requires_no_failing: true,
        scholarship_discount_pct: null,
        sort_order: 1,
        is_active: true
    },
    {
        category: 'Honor',
        code: 'magna_cum_laude',
        label: 'Magna Cum Laude',
        min_gwa: 1.26,
        max_gwa: 1.50,
        min_subject_grade: null,
        requires_no_failing: true,
        scholarship_discount_pct: null,
        sort_order: 2,
        is_active: true
    },
    {
        category: 'Honor',
        code: 'cum_laude',
        label: 'Cum Laude',
        min_gwa: 1.51,
        max_gwa: 1.75,
        min_subject_grade: null,
        requires_no_failing: true,
        scholarship_discount_pct: null,
        sort_order: 3,
        is_active: true
    },
    {
        category: 'Scholarship',
        code: 'academic_scholar_full',
        label: 'Full Academic Scholarship',
        min_gwa: 1.00,
        max_gwa: 1.45,
        min_subject_grade: null,
        requires_no_failing: true,
        scholarship_discount_pct: null,
        sort_order: 1,
        is_active: true
    },
    {
        category: 'Scholarship',
        code: 'academic_scholar_partial',
        label: 'Partial Academic Scholarship',
        min_gwa: 1.46,
        max_gwa: 1.75,
        min_subject_grade: null,
        requires_no_failing: true,
        scholarship_discount_pct: null,
        sort_order: 2,
        is_active: true
    },
    {
        category: 'Standing',
        code: 'good_standing',
        label: 'Good Standing',
        min_gwa: 1.00,
        max_gwa: 3.00,
        min_subject_grade: null,
        requires_no_failing: false,
        scholarship_discount_pct: null,
        sort_order: 1,
        is_active: true
    },
    {
        category: 'Standing',
        code: 'deans_list',
        label: "Dean's List",
        min_gwa: 1.00,
        max_gwa: 1.75,
        min_subject_grade: 2.50,
        requires_no_failing: true,
        scholarship_discount_pct: null,
        sort_order: 2,
        is_active: true
    }
];

export const WIZARD_STEPS = [
    { step: 1, title: 'Identity & Dates', subtitle: 'Academic year code & dates' },
    { step: 2, title: 'Terms & Windows', subtitle: 'Terms & enrollment schedules' },
    { step: 3, title: 'Grading Periods', subtitle: 'Periods and 100% weights' },
    { step: 4, title: 'Grade Schema', subtitle: 'Transmutation & passing marks' },
    { step: 5, title: 'Academic Thresholds', subtitle: 'Honors, scholarships & standing' }
];

export function validateGradingPeriods(terms: WizardTermItem[]): { isValid: boolean; error?: string } {
    for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        const termName = t.term_type_label || `Term #${i + 1}`;
        const periods = t.grading_periods || [];

        if (periods.length === 0) {
            return {
                isValid: false,
                error: `Please define at least one grading period for ${termName}.`
            };
        }

        for (const p of periods) {
            const periodLabel = p.name ? `"${p.name}"` : `Period #${p.sequence || 1}`;
            if (!p.name || !p.name.trim()) {
                return {
                    isValid: false,
                    error: `All grading periods in ${termName} must have a name.`
                };
            }
            if (!p.weight || Number(p.weight) <= 0) {
                return {
                    isValid: false,
                    error: `Grading period ${periodLabel} in ${termName} must have a weight greater than 0%.`
                };
            }
            if (!p.start_date || !p.start_date.trim()) {
                return {
                    isValid: false,
                    error: `Grading period ${periodLabel} in ${termName} must have a Start Date.`
                };
            }
            if (!p.end_date || !p.end_date.trim()) {
                return {
                    isValid: false,
                    error: `Grading period ${periodLabel} in ${termName} must have an End Date.`
                };
            }
            if (new Date(p.end_date) < new Date(p.start_date)) {
                return {
                    isValid: false,
                    error: `End Date cannot be before Start Date for grading period ${periodLabel} in ${termName}.`
                };
            }
        }

        const totalWeight = periods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
        if (totalWeight !== 100) {
            return {
                isValid: false,
                error: `Grading period weights for ${termName} equal ${totalWeight}%. The total weight must strictly sum to 100%.`
            };
        }
    }
    return { isValid: true };
}

export interface SourceSchoolYearInfo {
    id: string;
    code: string;
    label: string;
    start_date: string;
    end_date: string;
}

export function cloneSchoolYearForDuplication(
    details: AcademicYearCalendarDetails
): Partial<AcademicYearWizardFormValues> {
    const clonedTerms: WizardTermItem[] = (details.terms || []).map((t) => ({
        id: undefined,
        term_type_id: t.term_type_id,
        term_type_label: t.term_type_label,
        term_type_code: t.term_type_code,
        start_date: t.start_date || '',
        end_date: t.end_date || '',
        enrollment_start_date: t.enrollment_start_date || '',
        enrollment_end_date: t.enrollment_end_date || '',
        grading_deadline: t.grading_deadline || '',
        status: 'Upcoming',
        grading_periods: (t.grading_periods || []).map((gp, gIdx) => ({
            id: undefined,
            name: gp.name,
            sequence: gp.sequence || gIdx + 1,
            start_date: gp.start_date || '',
            end_date: gp.end_date || '',
            weight: Number(gp.weight) || 0
        }))
    }));

    const clonedTransmutation: WizardTransmutationRow[] = (details.transmutation_rows || []).map((r) => ({
        id: undefined,
        label: r.label,
        min_percentage: r.min_percentage,
        max_percentage: r.max_percentage,
        transmuted_grade: r.transmuted_grade,
        is_passing: Boolean(r.is_passing),
        special_code: r.special_code,
        description: r.description
    }));

    const clonedThresholds: WizardThresholdItem[] = (details.thresholds || []).map((th, thIdx) => ({
        id: undefined,
        category: th.category,
        code: th.code,
        label: th.label,
        min_gwa: th.min_gwa,
        max_gwa: th.max_gwa,
        min_subject_grade: th.min_subject_grade,
        requires_no_failing: Boolean(th.requires_no_failing),
        scholarship_discount_pct: th.scholarship_discount_pct,
        sort_order: th.sort_order || thIdx + 1,
        is_active: Boolean(th.is_active)
    }));

    return {
        id: null,
        code: '',
        label: '',
        start_date: '',
        end_date: '',
        is_active: false,
        terms: clonedTerms,
        transmutation_rows: clonedTransmutation,
        thresholds: clonedThresholds
    };
}

export function validateStep1SchoolYear(
    values: { code: string; label: string; start_date: string; end_date: string },
    sourceSchoolYear?: SourceSchoolYearInfo | null
): { isValid: boolean; error?: string } {
    if (!values.start_date) {
        return { isValid: false, error: 'Please select a Start Date for the school year.' };
    }
    if (!values.end_date) {
        return { isValid: false, error: 'Please select an End Date for the school year.' };
    }
    if (new Date(values.end_date) <= new Date(values.start_date)) {
        return { isValid: false, error: 'End Date must be strictly after Start Date.' };
    }
    if (!values.code || !values.code.trim()) {
        return { isValid: false, error: 'Academic Year Code is required.' };
    }
    if (!values.label || !values.label.trim()) {
        return { isValid: false, error: 'Academic Year Label is required.' };
    }

    if (sourceSchoolYear) {
        if (values.code.trim().toLowerCase() === sourceSchoolYear.code.trim().toLowerCase()) {
            return {
                isValid: false,
                error: `Academic Year Code must be changed. It cannot match the duplicated year (${sourceSchoolYear.code}).`
            };
        }
        if (values.label.trim().toLowerCase() === sourceSchoolYear.label.trim().toLowerCase()) {
            return {
                isValid: false,
                error: `Academic Year Label must be changed. It cannot match the duplicated year (${sourceSchoolYear.label}).`
            };
        }
        if (
            values.start_date === sourceSchoolYear.start_date &&
            values.end_date === sourceSchoolYear.end_date
        ) {
            return {
                isValid: false,
                error: 'Academic Year Start and End Dates must be changed from the duplicated year.'
            };
        }
    }

    return { isValid: true };
}

export function parseYearFromDate(dateStr: string): number | null {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{4})/);
    if (match) {
        return parseInt(match[1], 10);
    }
    const d = new Date(dateStr);
    return isNaN(d.getFullYear()) ? null : d.getFullYear();
}

export function generateAcademicYearCode(startDate: string, endDate: string): string | null {
    const startYear = parseYearFromDate(startDate);
    const endYear = parseYearFromDate(endDate);
    if (!startYear || !endYear) return null;
    return `AY-${startYear}-${endYear}`;
}

export function generateAcademicYearLabel(startDate: string, endDate: string): string | null {
    const startYear = parseYearFromDate(startDate);
    const endYear = parseYearFromDate(endDate);
    if (!startYear || !endYear) return null;
    return `Academic Year ${startYear}-${endYear}`;
}

