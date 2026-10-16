import {
    AcademicYearCalendarDetails,
    AcademicYearWizardFormValues,
    WizardGradingPeriodItem,
    WizardTermItem,
    WizardThresholdItem,
    WizardTransmutationRow
} from '@type/school-year.type';
import { formatDate } from '@utils/date.util';

export const DEFAULT_GRADING_COMPONENTS: { name: string; weight: number }[] = [
    { name: 'Quizzes & Short Tasks', weight: 30 },
    { name: 'Class Standing & Performance', weight: 30 },
    { name: 'Major Exam', weight: 40 }
];

export const DEFAULT_GRADING_PERIODS: WizardGradingPeriodItem[] = [
    { name: 'Prelim', sequence: 1, weight: 30, components: DEFAULT_GRADING_COMPONENTS },
    { name: 'Midterm', sequence: 2, weight: 30, components: DEFAULT_GRADING_COMPONENTS },
    { name: 'Finals', sequence: 3, weight: 40, components: DEFAULT_GRADING_COMPONENTS }
];

export function isSpecialGradeRow(row?: {
    label?: string;
    special_code?: string | null;
    is_conditional?: boolean;
} | null): boolean {
    if (!row) return false;
    if (row.is_conditional) return true;
    const code = (row.special_code || '').trim().toUpperCase();
    const label = (row.label || '').trim().toUpperCase();
    return (
        code === 'DRP' ||
        code === 'INC' ||
        code === 'W' ||
        code === 'NFE' ||
        label === 'DRP' ||
        label === 'INC' ||
        label === 'W' ||
        label === 'NFE'
    );
}

export const DEFAULT_TRANSMUTATION_ROWS: WizardTransmutationRow[] = [
    { label: '1.00', min_percentage: 98, max_percentage: 100, transmuted_grade: 1.00, is_passing: true, is_conditional: false, special_code: null, description: 'Excellent' },
    { label: '1.25', min_percentage: 95, max_percentage: 97, transmuted_grade: 1.25, is_passing: true, is_conditional: false, special_code: null, description: 'Superior' },
    { label: '1.50', min_percentage: 92, max_percentage: 94, transmuted_grade: 1.50, is_passing: true, is_conditional: false, special_code: null, description: 'Very Good' },
    { label: '1.75', min_percentage: 89, max_percentage: 91, transmuted_grade: 1.75, is_passing: true, is_conditional: false, special_code: null, description: 'Good' },
    { label: '2.00', min_percentage: 86, max_percentage: 88, transmuted_grade: 2.00, is_passing: true, is_conditional: false, special_code: null, description: 'Meritorious' },
    { label: '2.25', min_percentage: 83, max_percentage: 85, transmuted_grade: 2.25, is_passing: true, is_conditional: false, special_code: null, description: 'Very Satisfactory' },
    { label: '2.50', min_percentage: 80, max_percentage: 82, transmuted_grade: 2.50, is_passing: true, is_conditional: false, special_code: null, description: 'Satisfactory' },
    { label: '2.75', min_percentage: 77, max_percentage: 79, transmuted_grade: 2.75, is_passing: true, is_conditional: false, special_code: null, description: 'Fairly Satisfactory' },
    { label: '3.00', min_percentage: 75, max_percentage: 76, transmuted_grade: 3.00, is_passing: true, is_conditional: false, special_code: null, description: 'Passing' },
    { label: '4.00', min_percentage: 70, max_percentage: 74, transmuted_grade: 4.00, is_passing: false, is_conditional: false, special_code: null, description: 'Conditional' },
    { label: '5.00', min_percentage: 0, max_percentage: 69, transmuted_grade: 5.00, is_passing: false, is_conditional: false, special_code: null, description: 'Failed' },
    { label: 'INC', min_percentage: null, max_percentage: null, transmuted_grade: null, is_passing: false, is_conditional: true, special_code: 'INC', description: 'Incomplete Requirements' },
    { label: 'DRP', min_percentage: null, max_percentage: null, transmuted_grade: null, is_passing: false, is_conditional: true, special_code: 'DRP', description: 'Officially Dropped' }
];

export function shiftDateByOneYear(dateStr?: string | null): string {
    if (!dateStr || !dateStr.trim()) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setFullYear(d.getFullYear() + 1);
    return formatDate(d);
}

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
    {
        step: 1,
        title: 'Identity & Dates',
        subtitle:
            'Define the overarching school year. Terms, enrollment windows, grading periods, and grade transmutation rules declared in the subsequent steps will be irrevocably anchored to this academic year for historical audit integrity.'
    },
    {
        step: 2,
        title: 'Terms & Windows',
        subtitle:
            'Declare unique terms running under this school year (e.g. 1st Semester, 2nd Semester, Summer). Each term holds its own enrollment window and grade submission deadline.'
    },
    {
        step: 3,
        title: 'Grading Periods',
        subtitle:
            'Configure grading periods (e.g. Prelim, Midterm, Finals) for each term. The sum of weights for every term must strictly equal 100%.'
    },
    {
        step: 4,
        title: 'Holidays & Exceptions',
        subtitle:
            'Declare national holidays, academic breaks, emergency suspensions, and special class days. These exceptions overlay onto the academic calendar and adjust attendance expectations.'
    },
    {
        step: 5,
        title: 'Grade Schema',
        subtitle:
            'Define how computed raw grade percentages map to official transmuted marks (e.g. 1.00, 1.25, 3.00, 5.00) or special marks (INC, DRP). Your institution completely controls which grades are considered passing or failing.'
    },
    {
        step: 6,
        title: 'Academic Thresholds',
        subtitle:
            'Define academic performance cutoffs to track student advantages (Latin Honors, Academic Scholarships, Dean\'s List) and disadvantages (Academic Probation / Standing). These serve as official academic achievement and qualification flags for students and academic advisers.'
    }
];

export function distributeDatesAcrossPeriods(
    startDateStr: string,
    endDateStr: string,
    count: number
): { start_date: string; end_date: string }[] {
    if (count <= 0) return [];
    if (!startDateStr || !endDateStr) {
        return Array.from({ length: count }, () => ({
            end_date: endDateStr || '',
            start_date: startDateStr || ''
        }));
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffMs = end.getTime() - start.getTime();

    if (diffMs <= 0 || isNaN(diffMs)) {
        return Array.from({ length: count }, () => ({
            end_date: endDateStr,
            start_date: startDateStr
        }));
    }

    const chunkMs = diffMs / count;
    const result: { start_date: string; end_date: string }[] = [];

    for (let i = 0; i < count; i++) {
        const pStart = new Date(start.getTime() + i * chunkMs);
        const pEnd = i === count - 1 ? end : new Date(start.getTime() + (i + 1) * chunkMs);
        result.push({
            end_date: formatDate(pEnd),
            start_date: formatDate(pStart)
        });
    }

    return result;
}

export function validateTerms(
    terms: WizardTermItem[],
    syStartDate?: string,
    syEndDate?: string
): { isValid: boolean; error?: string; fieldPath?: string; termIndex?: number } {
    if (!terms || terms.length === 0) {
        return {
            error: 'Please declare at least one Term for this academic year.',
            isValid: false
        };
    }

    const seenLabels = new Set<string>();

    for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        const termName = (t.term_type_label || '').trim();

        if (!termName) {
            return {
                error: `Please specify a Term Type / Name for Term #${i + 1}.`,
                fieldPath: `terms.${i}.term_type_label`,
                isValid: false,
                termIndex: i
            };
        }

        const cleanKey = termName.toLowerCase();
        if (seenLabels.has(cleanKey)) {
            return {
                error: `Duplicate term type: "${termName}" is used multiple times. Each term in an academic year must have a unique name.`,
                fieldPath: `terms.${i}.term_type_label`,
                isValid: false,
                termIndex: i
            };
        }
        seenLabels.add(cleanKey);

        if (!t.start_date) {
            return {
                error: `Please specify a Start Date for ${termName}.`,
                fieldPath: `terms.${i}.start_date`,
                isValid: false,
                termIndex: i
            };
        }

        if (!t.end_date) {
            return {
                error: `Please specify an End Date for ${termName}.`,
                fieldPath: `terms.${i}.end_date`,
                isValid: false,
                termIndex: i
            };
        }

        if (new Date(t.end_date) < new Date(t.start_date)) {
            return {
                error: `End Date cannot be before Start Date in ${termName}.`,
                fieldPath: `terms.${i}.end_date`,
                isValid: false,
                termIndex: i
            };
        }

        if (new Date(t.end_date).getTime() === new Date(t.start_date).getTime()) {
            return {
                error: `End Date must be strictly after Start Date in ${termName}.`,
                fieldPath: `terms.${i}.end_date`,
                isValid: false,
                termIndex: i
            };
        }

        if (i > 0) {
            const prevTerm = terms[i - 1];
            const prevName = prevTerm.term_type_label || `Term #${i}`;
            if (new Date(t.start_date) < new Date(prevTerm.end_date)) {
                return {
                    error: `Term #${i + 1} (${termName}) start date (${t.start_date}) conflicts with preceding term #${i} (${prevName}) end date (${prevTerm.end_date}). Terms cannot have overlapping dates.`,
                    fieldPath: `terms.${i}.start_date`,
                    isValid: false,
                    termIndex: i
                };
            }
        }

        if (syStartDate && new Date(t.start_date) < new Date(syStartDate)) {
            return {
                error: `Term #${i + 1} (${termName}) start date (${t.start_date}) cannot be before the school year start date (${syStartDate}).`,
                fieldPath: `terms.${i}.start_date`,
                isValid: false,
                termIndex: i
            };
        }

        if (syEndDate && new Date(t.end_date) > new Date(syEndDate)) {
            return {
                error: `Term #${i + 1} (${termName}) end date (${t.end_date}) cannot be after the school year end date (${syEndDate}).`,
                fieldPath: `terms.${i}.end_date`,
                isValid: false,
                termIndex: i
            };
        }

        if (t.enrollment_start_date && t.enrollment_end_date) {
            if (new Date(t.enrollment_end_date) < new Date(t.enrollment_start_date)) {
                return {
                    error: `Enrollment End Date cannot be before Enrollment Start Date in ${termName}.`,
                    fieldPath: `terms.${i}.enrollment_end_date`,
                    isValid: false,
                    termIndex: i
                };
            }
        }
    }

    return { isValid: true };
}

export function validateGradingPeriods(terms: WizardTermItem[]): {
    isValid: boolean;
    error?: string;
    fieldPath?: string;
    termIndex?: number;
    periodIndex?: number;
} {
    for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        const termName = t.term_type_label || `Term #${i + 1}`;
        const periods = t.grading_periods || [];

        if (periods.length === 0) {
            return {
                error: `Please define at least one grading period for ${termName}.`,
                isValid: false,
                termIndex: i
            };
        }

        const seenNames = new Set<string>();

        for (let j = 0; j < periods.length; j++) {
            const p = periods[j];
            const periodLabel = p.name ? `"${p.name}"` : `Period #${p.sequence || j + 1}`;

            if (!p.name || !p.name.trim()) {
                return {
                    error: `All grading periods in ${termName} must have a name.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.name`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            const cleanName = p.name.trim().toLowerCase();
            if (seenNames.has(cleanName)) {
                return {
                    error: `Duplicate grading period name "${p.name}" in ${termName}. Each grading period in a term must have a unique name.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.name`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }
            seenNames.add(cleanName);

            if (!p.weight || Number(p.weight) <= 0) {
                return {
                    error: `Grading period ${periodLabel} in ${termName} must have a weight greater than 0%.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.weight`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (!p.start_date || !p.start_date.trim()) {
                return {
                    error: `Grading period ${periodLabel} in ${termName} must have a Start Date.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.start_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (!p.end_date || !p.end_date.trim()) {
                return {
                    error: `Grading period ${periodLabel} in ${termName} must have an End Date.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.end_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (new Date(p.end_date) < new Date(p.start_date)) {
                return {
                    error: `End Date cannot be before Start Date for grading period ${periodLabel} in ${termName}.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.end_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (new Date(p.end_date).getTime() === new Date(p.start_date).getTime()) {
                return {
                    error: `End Date must be strictly after Start Date for grading period ${periodLabel} in ${termName}.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.end_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (t.start_date && new Date(p.start_date) < new Date(t.start_date)) {
                return {
                    error: `Grading period ${periodLabel} start date (${p.start_date}) cannot be before the term start date (${t.start_date}).`,
                    fieldPath: `terms.${i}.grading_periods.${j}.start_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (t.end_date && new Date(p.end_date) > new Date(t.end_date)) {
                return {
                    error: `Grading period ${periodLabel} end date (${p.end_date}) cannot be after the term end date (${t.end_date}).`,
                    fieldPath: `terms.${i}.grading_periods.${j}.end_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }
            if (p.major_exam_start_date && p.major_exam_end_date && new Date(p.major_exam_end_date) < new Date(p.major_exam_start_date)) {
                return {
                    error: `Major Exam End Date cannot be before Major Exam Start Date for grading period ${periodLabel} in ${termName}.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.major_exam_end_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }

            if (p.grade_encoding_start_date && p.grade_encoding_end_date && new Date(p.grade_encoding_end_date) < new Date(p.grade_encoding_start_date)) {
                return {
                    error: `Grade Encoding End Date cannot be before Grade Encoding Start Date for grading period ${periodLabel} in ${termName}.`,
                    fieldPath: `terms.${i}.grading_periods.${j}.grade_encoding_end_date`,
                    isValid: false,
                    periodIndex: j,
                    termIndex: i
                };
            }
        }

        const totalWeight = periods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
        if (totalWeight !== 100) {
            return {
                error: `Grading period weights for ${termName} equal ${totalWeight}%. The total weight must strictly sum to 100%.`,
                fieldPath: `terms.${i}.grading_periods.${periods.length - 1}.weight`,
                isValid: false,
                periodIndex: periods.length - 1,
                termIndex: i
            };
        }
    }
    return { isValid: true };
}

export function validateTransmutationRows(
    rows: WizardTransmutationRow[]
): { isValid: boolean; error?: string; fieldPath?: string; rowIndex?: number } {
    if (!rows || rows.length === 0) {
        return {
            error: 'Please define at least one transmutation row / grade ladder.',
            isValid: false
        };
    }

    let prevRow: WizardTransmutationRow | null = null;
    let prevIndex: number = -1;

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.label || !r.label.trim()) {
            return {
                error: `Row #${i + 1} must have a Grade Mark / Label (e.g. 1.00, 1.25, INC).`,
                fieldPath: `transmutation_rows.${i}.label`,
                isValid: false,
                rowIndex: i
            };
        }

        // Special status grades like DRP and INC do not require grade percentage ranges
        if (isSpecialGradeRow(r)) {
            continue;
        }

        const minPct = r.min_percentage !== null && r.min_percentage !== undefined && r.min_percentage !== ''
            ? Number(r.min_percentage)
            : null;
        const maxPct = r.max_percentage !== null && r.max_percentage !== undefined && r.max_percentage !== ''
            ? Number(r.max_percentage)
            : null;

        if (minPct === null || isNaN(minPct)) {
            return {
                error: `Row #${i + 1} (${r.label}) must have a Min % specified.`,
                fieldPath: `transmutation_rows.${i}.min_percentage`,
                isValid: false,
                rowIndex: i
            };
        }

        if (maxPct === null || isNaN(maxPct)) {
            return {
                error: `Row #${i + 1} (${r.label}) must have a Max % specified.`,
                fieldPath: `transmutation_rows.${i}.max_percentage`,
                isValid: false,
                rowIndex: i
            };
        }

        if (minPct < 0 || maxPct > 100) {
            return {
                error: `Row #${i + 1} (${r.label}) percentages must be between 0% and 100%.`,
                fieldPath: minPct < 0 ? `transmutation_rows.${i}.min_percentage` : `transmutation_rows.${i}.max_percentage`,
                isValid: false,
                rowIndex: i
            };
        }

        if (minPct > maxPct) {
            return {
                error: `Row #${i + 1} (${r.label}) Min % (${minPct}) cannot be greater than Max % (${maxPct}).`,
                fieldPath: `transmutation_rows.${i}.min_percentage`,
                isValid: false,
                rowIndex: i
            };
        }

        if (prevRow !== null) {
            const prevMin = Number(prevRow.min_percentage);
            if (minPct >= prevMin) {
                return {
                    error: `Row #${i + 1} (${r.label}) Min % (${minPct}%) cannot be greater than or equal to preceding Row #${prevIndex + 1} (${prevRow.label}) Min % (${prevMin}%).`,
                    fieldPath: `transmutation_rows.${i}.min_percentage`,
                    isValid: false,
                    rowIndex: i
                };
            }
            if (maxPct >= prevMin) {
                return {
                    error: `Row #${i + 1} (${r.label}) Max % (${maxPct}%) cannot be greater than or equal to preceding Row #${prevIndex + 1} (${prevRow.label}) Min % (${prevMin}%).`,
                    fieldPath: `transmutation_rows.${i}.max_percentage`,
                    isValid: false,
                    rowIndex: i
                };
            }
        }

        prevRow = r;
        prevIndex = i;
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
        evaluation_scope: t.evaluation_scope || details.evaluation_scope || 'Period',
        max_units: t.max_units ?? details.max_units_per_term ?? 24,
        grading_periods: (t.grading_periods || []).map((gp, gIdx) => ({
            id: undefined,
            name: gp.name,
            sequence: gp.sequence || gIdx + 1,
            start_date: gp.start_date || '',
            end_date: gp.end_date || '',
            weight: Number(gp.weight) || 0,
            major_exam_start_date: gp.major_exam_start_date || '',
            major_exam_end_date: gp.major_exam_end_date || '',
            grade_encoding_start_date: gp.grade_encoding_start_date || '',
            grade_encoding_end_date: gp.grade_encoding_end_date || '',
            components: (gp.components || []).map((c) => ({
                id: undefined,
                name: c.name,
                weight: Number(c.weight) || 0
            }))
        }))
    }));

    const clonedTransmutation: WizardTransmutationRow[] = (details.transmutation_rows || []).map((r) => {
        const isSpecial = isSpecialGradeRow(r);
        return {
            id: undefined,
            label: r.label,
            is_conditional: Boolean(r.is_conditional || isSpecial),
            min_percentage: isSpecial ? null : r.min_percentage,
            max_percentage: isSpecial ? null : r.max_percentage,
            transmuted_grade: isSpecial ? null : r.transmuted_grade,
            is_passing: Boolean(r.is_passing),
            special_code: r.special_code,
            description: r.description
        };
    });

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
        max_units_per_term: details.max_units_per_term || 24,
        evaluation_scope: details.evaluation_scope || 'Period',
        terms: clonedTerms,
        transmutation_rows: clonedTransmutation,
        thresholds: clonedThresholds
    };
}

export interface ExistingSchoolYearComparison {
    id: string;
    code: string;
    label: string;
    start_date?: string | null;
    end_date?: string | null;
}

export function checkSchoolYearCodeConflict(
    code: string,
    existingSchoolYears?: ExistingSchoolYearComparison[] | null,
    currentId?: string | null,
    sourceSchoolYear?: SourceSchoolYearInfo | null
): string | null {
    const cleanCode = code ? code.trim().toLowerCase() : '';
    if (!cleanCode) return null;

    if (sourceSchoolYear && cleanCode === sourceSchoolYear.code.trim().toLowerCase()) {
        return `Academic Year Code must be changed. It cannot match the duplicated year (${sourceSchoolYear.code}).`;
    }

    if (existingSchoolYears && existingSchoolYears.length > 0) {
        const match = existingSchoolYears.find(
            (sy) => sy.id !== currentId && sy.code && sy.code.trim().toLowerCase() === cleanCode
        );
        if (match) {
            return `Academic Year Code "${code.trim()}" is already in use by ${match.label} (${match.code}).`;
        }
    }

    return null;
}

export function checkSchoolYearLabelConflict(
    label: string,
    existingSchoolYears?: ExistingSchoolYearComparison[] | null,
    currentId?: string | null,
    sourceSchoolYear?: SourceSchoolYearInfo | null
): string | null {
    const cleanLabel = label ? label.trim().toLowerCase() : '';
    if (!cleanLabel) return null;

    if (sourceSchoolYear && cleanLabel === sourceSchoolYear.label.trim().toLowerCase()) {
        return `Academic Year Label must be changed. It cannot match the duplicated year (${sourceSchoolYear.label}).`;
    }

    if (existingSchoolYears && existingSchoolYears.length > 0) {
        const match = existingSchoolYears.find(
            (sy) => sy.id !== currentId && sy.label && sy.label.trim().toLowerCase() === cleanLabel
        );
        if (match) {
            return `Academic Year Label "${label.trim()}" is already in use.`;
        }
    }

    return null;
}

export function checkSchoolYearDateConflict(
    startDate: string,
    endDate: string,
    existingSchoolYears?: ExistingSchoolYearComparison[] | null,
    currentId?: string | null,
    sourceSchoolYear?: SourceSchoolYearInfo | null
): string | null {
    if (!startDate || !endDate) return null;

    if (
        sourceSchoolYear &&
        startDate === sourceSchoolYear.start_date &&
        endDate === sourceSchoolYear.end_date
    ) {
        return 'Academic Year Start and End Dates must be changed from the duplicated year.';
    }

    if (existingSchoolYears && existingSchoolYears.length > 0) {
        for (const sy of existingSchoolYears) {
            if (sy.id === currentId || !sy.start_date || !sy.end_date) continue;

            const sStart = sy.start_date.substring(0, 10);
            const sEnd = sy.end_date.substring(0, 10);
            const cStart = startDate.substring(0, 10);
            const cEnd = endDate.substring(0, 10);

            // 1. Identical date span check
            if (cStart === sStart && cEnd === sEnd) {
                return `Two academic years cannot have the exact same dates. Conflicts with ${sy.label} (${sStart} to ${sEnd}).`;
            }

            // 2. Overlapping calendar period: cStart < sEnd AND cEnd > sStart
            if (cStart < sEnd && cEnd > sStart) {
                return `Academic year dates (${cStart} to ${cEnd}) overlap with ${sy.label} (${sStart} to ${sEnd}). Each academic year must have a distinct, non-overlapping calendar period.`;
            }
        }
    }

    return null;
}

export function validateStep1SchoolYear(
    values: {
        code: string;
        label: string;
        start_date: string;
        end_date: string;
        max_units_per_term?: number | string;
        evaluation_scope?: string;
    },
    sourceSchoolYear?: SourceSchoolYearInfo | null,
    existingSchoolYears?: ExistingSchoolYearComparison[] | null,
    currentId?: string | null
): { isValid: boolean; error?: string; field?: 'start_date' | 'end_date' | 'code' | 'label' } {
    if (!values.start_date) {
        return { field: 'start_date', isValid: false, error: 'Please select a Start Date for the school year.' };
    }
    if (!values.end_date) {
        return { field: 'end_date', isValid: false, error: 'Please select an End Date for the school year.' };
    }
    if (new Date(values.end_date) <= new Date(values.start_date)) {
        return { field: 'end_date', isValid: false, error: 'End Date must be strictly after Start Date.' };
    }
    if (!values.code || !values.code.trim()) {
        return { field: 'code', isValid: false, error: 'Academic Year Code is required.' };
    }
    if (!values.label || !values.label.trim()) {
        return { field: 'label', isValid: false, error: 'Academic Year Label is required.' };
    }

    const codeConflict = checkSchoolYearCodeConflict(
        values.code,
        existingSchoolYears,
        currentId,
        sourceSchoolYear
    );
    if (codeConflict) {
        return { field: 'code', isValid: false, error: codeConflict };
    }

    const labelConflict = checkSchoolYearLabelConflict(
        values.label,
        existingSchoolYears,
        currentId,
        sourceSchoolYear
    );
    if (labelConflict) {
        return { field: 'label', isValid: false, error: labelConflict };
    }

    const dateConflict = checkSchoolYearDateConflict(
        values.start_date,
        values.end_date,
        existingSchoolYears,
        currentId,
        sourceSchoolYear
    );
    if (dateConflict) {
        return { field: 'start_date', isValid: false, error: dateConflict };
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

export function validateCalendarExceptions(
    holidays: { title?: string; start_date?: string; end_date?: string }[]
): { isValid: boolean; error?: string; fieldPath?: string; holidayIndex?: number } {
    if (!holidays) return { isValid: true };
    for (let i = 0; i < holidays.length; i++) {
        const h = holidays[i];
        if (!h.title || !h.title.trim()) {
            return {
                fieldPath: `holidays.${i}.title`,
                holidayIndex: i,
                isValid: false,
                error: `Holiday/Exception #${i + 1} must have a Title.`
            };
        }
        if (!h.start_date) {
            return {
                fieldPath: `holidays.${i}.start_date`,
                holidayIndex: i,
                isValid: false,
                error: `Holiday/Exception "${h.title}" must specify a Start Date.`
            };
        }
        if (!h.end_date) {
            return {
                fieldPath: `holidays.${i}.end_date`,
                holidayIndex: i,
                isValid: false,
                error: `Holiday/Exception "${h.title}" must specify an End Date.`
            };
        }
        if (new Date(h.end_date) < new Date(h.start_date)) {
            return {
                fieldPath: `holidays.${i}.end_date`,
                holidayIndex: i,
                isValid: false,
                error: `End Date cannot be before Start Date in Holiday/Exception "${h.title}".`
            };
        }
    }
    return { isValid: true };
}


