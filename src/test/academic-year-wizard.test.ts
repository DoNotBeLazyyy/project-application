import { describe, expect, it } from 'vitest';
import {
    cloneSchoolYearForDuplication,
    SourceSchoolYearInfo,
    validateGradingPeriods,
    validateStep1SchoolYear
} from '@pages/admin/school-year-management/wizard/wizard.constants';
import { AcademicYearCalendarDetails, WizardTermItem } from '@type/school-year.type';

describe('Academic Year Wizard - Grading Periods Validation', () => {
    const validTerm: WizardTermItem = {
        term_type_id: 'term-1',
        term_type_label: '1st Semester',
        start_date: '2026-08-15',
        end_date: '2026-12-20',
        grading_periods: [
            { name: 'Prelim', sequence: 1, weight: 30, start_date: '2026-08-15', end_date: '2026-09-30' },
            { name: 'Midterm', sequence: 2, weight: 30, start_date: '2026-10-01', end_date: '2026-11-15' },
            { name: 'Finals', sequence: 3, weight: 40, start_date: '2026-11-16', end_date: '2026-12-20' }
        ]
    };

    it('should pass validation when all grading periods have valid required fields and dates', () => {
        const result = validateGradingPeriods([validTerm]);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should fail when a grading period is missing a start date', () => {
        const invalidTerm: WizardTermItem = {
            ...validTerm,
            grading_periods: [
                { name: 'Prelim', sequence: 1, weight: 30, start_date: '', end_date: '2026-09-30' },
                { name: 'Midterm', sequence: 2, weight: 30, start_date: '2026-10-01', end_date: '2026-11-15' },
                { name: 'Finals', sequence: 3, weight: 40, start_date: '2026-11-16', end_date: '2026-12-20' }
            ]
        };

        const result = validateGradingPeriods([invalidTerm]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Grading period "Prelim" in 1st Semester must have a Start Date.');
    });

    it('should fail when a grading period is missing an end date', () => {
        const invalidTerm: WizardTermItem = {
            ...validTerm,
            grading_periods: [
                { name: 'Prelim', sequence: 1, weight: 30, start_date: '2026-08-15', end_date: '2026-09-30' },
                { name: 'Midterm', sequence: 2, weight: 30, start_date: '2026-10-01', end_date: '' },
                { name: 'Finals', sequence: 3, weight: 40, start_date: '2026-11-16', end_date: '2026-12-20' }
            ]
        };

        const result = validateGradingPeriods([invalidTerm]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Grading period "Midterm" in 1st Semester must have an End Date.');
    });

    it('should fail when an end date is earlier than start date', () => {
        const invalidTerm: WizardTermItem = {
            ...validTerm,
            grading_periods: [
                { name: 'Prelim', sequence: 1, weight: 30, start_date: '2026-09-30', end_date: '2026-08-15' },
                { name: 'Midterm', sequence: 2, weight: 30, start_date: '2026-10-01', end_date: '2026-11-15' },
                { name: 'Finals', sequence: 3, weight: 40, start_date: '2026-11-16', end_date: '2026-12-20' }
            ]
        };

        const result = validateGradingPeriods([invalidTerm]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('End Date cannot be before Start Date for grading period "Prelim" in 1st Semester.');
    });

    it('should fail when grading period weights do not sum to 100%', () => {
        const invalidTerm: WizardTermItem = {
            ...validTerm,
            grading_periods: [
                { name: 'Prelim', sequence: 1, weight: 30, start_date: '2026-08-15', end_date: '2026-09-30' },
                { name: 'Midterm', sequence: 2, weight: 30, start_date: '2026-10-01', end_date: '2026-11-15' },
                { name: 'Finals', sequence: 3, weight: 30, start_date: '2026-11-16', end_date: '2026-12-20' }
            ]
        };

        const result = validateGradingPeriods([invalidTerm]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Grading period weights for 1st Semester equal 90%. The total weight must strictly sum to 100%.');
    });

    it('should fail when a grading period has no name', () => {
        const invalidTerm: WizardTermItem = {
            ...validTerm,
            grading_periods: [
                { name: '', sequence: 1, weight: 30, start_date: '2026-08-15', end_date: '2026-09-30' },
                { name: 'Midterm', sequence: 2, weight: 30, start_date: '2026-10-01', end_date: '2026-11-15' },
                { name: 'Finals', sequence: 3, weight: 40, start_date: '2026-11-16', end_date: '2026-12-20' }
            ]
        };

        const result = validateGradingPeriods([invalidTerm]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('All grading periods in 1st Semester must have a name.');
    });

    it('should fail when no grading periods are defined for a term', () => {
        const invalidTerm: WizardTermItem = {
            ...validTerm,
            grading_periods: []
        };

        const result = validateGradingPeriods([invalidTerm]);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Please define at least one grading period for 1st Semester.');
    });
});

describe('Academic Year Wizard - Duplication & Required Field Change Validation', () => {
    const mockSourceYear: SourceSchoolYearInfo = {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'AY-2025-2026',
        label: 'Academic Year 2025-2026',
        start_date: '2025-08-01',
        end_date: '2026-06-30'
    };

    const mockCalendarDetails: AcademicYearCalendarDetails = {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'AY-2025-2026',
        label: 'Academic Year 2025-2026',
        start_date: '2025-08-01',
        end_date: '2026-06-30',
        is_active: true,
        terms: [
            {
                id: 'term-source-1',
                term_type_id: 'type-1',
                term_type_label: '1st Trimester',
                start_date: '2025-08-01',
                end_date: '2025-11-30',
                grading_periods: [
                    { id: 'gp-1', name: 'Midterm', sequence: 1, weight: 50, start_date: '2025-08-01', end_date: '2025-09-30' },
                    { id: 'gp-2', name: 'Finals', sequence: 2, weight: 50, start_date: '2025-10-01', end_date: '2025-11-30' }
                ]
            }
        ],
        transmutation_rows: [
            { id: 'trans-1', label: '1.00', min_percentage: 98, max_percentage: 100, transmuted_grade: 1.00, is_passing: true },
            { id: 'trans-2', label: 'INC', min_percentage: 0, max_percentage: 0, transmuted_grade: null, is_passing: false }
        ],
        thresholds: [
            { id: 'th-1', category: 'Honor', code: 'cum_laude', label: 'Cum Laude', min_gwa: 1.5, max_gwa: 1.75, min_subject_grade: null, requires_no_failing: true, scholarship_discount_pct: null, sort_order: 1, is_active: true }
        ]
    };

    it('should clone all child configurations and strip child IDs for clean insertion', () => {
        const cloned = cloneSchoolYearForDuplication(mockCalendarDetails);

        expect(cloned.id).toBeNull();
        expect(cloned.code).toBe('');
        expect(cloned.label).toBe('');
        expect(cloned.start_date).toBe('');
        expect(cloned.end_date).toBe('');
        expect(cloned.is_active).toBe(false);

        // Terms
        expect(cloned.terms).toHaveLength(1);
        expect(cloned.terms![0].id).toBeUndefined();
        expect(cloned.terms![0].term_type_id).toBe('type-1');
        expect(cloned.terms![0].grading_periods).toHaveLength(2);
        expect(cloned.terms![0].grading_periods[0].id).toBeUndefined();
        expect(cloned.terms![0].grading_periods[1].id).toBeUndefined();

        // Transmutations
        expect(cloned.transmutation_rows).toHaveLength(2);
        expect(cloned.transmutation_rows![0].id).toBeUndefined();
        expect(cloned.transmutation_rows![1].id).toBeUndefined();
        expect(cloned.transmutation_rows![1].transmuted_grade).toBeNull();

        // Thresholds
        expect(cloned.thresholds).toHaveLength(1);
        expect(cloned.thresholds![0].id).toBeUndefined();
        expect(cloned.thresholds![0].label).toBe('Cum Laude');
    });

    it('should pass Step 1 validation when code, label, and dates are unique and valid', () => {
        const res = validateStep1SchoolYear(
            {
                code: 'AY-2026-2027',
                label: 'Academic Year 2026-2027',
                start_date: '2026-08-01',
                end_date: '2027-06-30'
            },
            mockSourceYear
        );

        expect(res.isValid).toBe(true);
        expect(res.error).toBeUndefined();
    });

    it('should require Academic Year Code to be changed from source year', () => {
        const res = validateStep1SchoolYear(
            {
                code: 'ay-2025-2026', // same code case-insensitive
                label: 'Academic Year 2026-2027',
                start_date: '2026-08-01',
                end_date: '2027-06-30'
            },
            mockSourceYear
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Academic Year Code must be changed. It cannot match the duplicated year');
    });

    it('should require Academic Year Label to be changed from source year', () => {
        const res = validateStep1SchoolYear(
            {
                code: 'AY-2026-2027',
                label: 'academic year 2025-2026', // same label case-insensitive
                start_date: '2026-08-01',
                end_date: '2027-06-30'
            },
            mockSourceYear
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Academic Year Label must be changed. It cannot match the duplicated year');
    });

    it('should require Academic Year Dates to be changed from source year', () => {
        const res = validateStep1SchoolYear(
            {
                code: 'AY-2026-2027',
                label: 'Academic Year 2026-2027',
                start_date: '2025-08-01',
                end_date: '2026-06-30' // both match source year
            },
            mockSourceYear
        );

        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Academic Year Start and End Dates must be changed from the duplicated year.');
    });

    it('should fail when start date or end date is missing', () => {
        const res = validateStep1SchoolYear({
            code: 'AY-2026-2027',
            label: 'Academic Year 2026-2027',
            start_date: '',
            end_date: '2027-06-30'
        });
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('Please select a Start Date');
    });

    it('should fail when end date is on or before start date', () => {
        const res = validateStep1SchoolYear({
            code: 'AY-2026-2027',
            label: 'Academic Year 2026-2027',
            start_date: '2026-08-01',
            end_date: '2026-08-01'
        });
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('End Date must be strictly after Start Date.');
    });
});

