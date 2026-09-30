import { describe, expect, it } from 'vitest';
import {
    checkSchoolYearCodeConflict,
    checkSchoolYearDateConflict,
    checkSchoolYearLabelConflict,
    cloneSchoolYearForDuplication,
    ExistingSchoolYearComparison,
    generateAcademicYearCode,
    generateAcademicYearLabel,
    parseYearFromDate,
    SourceSchoolYearInfo,
    validateGradingPeriods,
    validateStep1SchoolYear,
    validateTerms,
    distributeDatesAcrossPeriods,
    validateTransmutationRows,
    isSpecialGradeRow
} from '@pages/admin/school-year-management/wizard/wizard.constants';
import { AcademicYearCalendarDetails, WizardTermItem, WizardTransmutationRow } from '@type/school-year.type';

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

describe('Academic Year Code & Label Auto-Population Helpers', () => {
    it('should correctly parse the 4-digit year from ISO date strings without timezone drift', () => {
        expect(parseYearFromDate('2026-08-15')).toBe(2026);
        expect(parseYearFromDate('2027-01-01')).toBe(2027);
        expect(parseYearFromDate('2028-12-31')).toBe(2028);
        expect(parseYearFromDate('')).toBeNull();
    });

    it('should generate standard Academic Year Code when start and end dates are provided', () => {
        expect(generateAcademicYearCode('2026-08-15', '2027-05-30')).toBe('AY-2026-2027');
        expect(generateAcademicYearCode('2025-09-01', '2026-06-30')).toBe('AY-2025-2026');
        expect(generateAcademicYearCode('', '2027-05-30')).toBeNull();
        expect(generateAcademicYearCode('2026-08-15', '')).toBeNull();
    });

    it('should generate standard Academic Year Label when start and end dates are provided', () => {
        expect(generateAcademicYearLabel('2026-08-15', '2027-05-30')).toBe('Academic Year 2026-2027');
        expect(generateAcademicYearLabel('2025-09-01', '2026-06-30')).toBe('Academic Year 2025-2026');
        expect(generateAcademicYearLabel('', '2027-05-30')).toBeNull();
        expect(generateAcademicYearLabel('2026-08-15', '')).toBeNull();
    });
});

describe('Academic Year Duplicate & Overlap Conflict Detection', () => {
    const existingYears: ExistingSchoolYearComparison[] = [
        {
            id: 'sy-2025-2026',
            code: 'AY-2025-2026',
            label: 'Academic Year 2025-2026',
            start_date: '2025-08-01',
            end_date: '2026-06-30'
        },
        {
            id: 'sy-2027-2028',
            code: 'AY-2027-2028',
            label: 'Academic Year 2027-2028',
            start_date: '2027-08-01',
            end_date: '2028-06-30'
        }
    ];

    describe('checkSchoolYearCodeConflict', () => {
        it('should detect duplicate code case-insensitively', () => {
            const err1 = checkSchoolYearCodeConflict('ay-2025-2026', existingYears);
            expect(err1).toContain('already in use');

            const err2 = checkSchoolYearCodeConflict('  AY-2025-2026  ', existingYears);
            expect(err2).toContain('already in use');
        });

        it('should ignore duplicate code if matching current school year id', () => {
            const err = checkSchoolYearCodeConflict('AY-2025-2026', existingYears, 'sy-2025-2026');
            expect(err).toBeNull();
        });

        it('should pass when code is unique', () => {
            const err = checkSchoolYearCodeConflict('AY-2026-2027', existingYears);
            expect(err).toBeNull();
        });
    });

    describe('checkSchoolYearLabelConflict', () => {
        it('should detect duplicate label case-insensitively', () => {
            const err = checkSchoolYearLabelConflict('academic year 2025-2026', existingYears);
            expect(err).toContain('already in use');
        });

        it('should ignore duplicate label if matching current school year id', () => {
            const err = checkSchoolYearLabelConflict('Academic Year 2025-2026', existingYears, 'sy-2025-2026');
            expect(err).toBeNull();
        });

        it('should pass when label is unique', () => {
            const err = checkSchoolYearLabelConflict('Academic Year 2026-2027', existingYears);
            expect(err).toBeNull();
        });
    });

    describe('checkSchoolYearDateConflict', () => {
        it('should reject exact same start and end dates', () => {
            const err = checkSchoolYearDateConflict('2025-08-01', '2026-06-30', existingYears);
            expect(err).toContain('exact same dates');
            expect(err).toContain('Academic Year 2025-2026');
        });

        it('should reject overlapping dates (new year starts before existing ends)', () => {
            const err = checkSchoolYearDateConflict('2026-01-01', '2026-12-31', existingYears);
            expect(err).toContain('overlap with Academic Year 2025-2026');
        });

        it('should reject overlapping dates (new year encloses an existing year)', () => {
            const err = checkSchoolYearDateConflict('2025-01-01', '2026-12-31', existingYears);
            expect(err).toContain('overlap with Academic Year 2025-2026');
        });

        it('should reject overlapping dates (new year inside an existing year)', () => {
            const err = checkSchoolYearDateConflict('2025-09-01', '2026-05-30', existingYears);
            expect(err).toContain('overlap with Academic Year 2025-2026');
        });

        it('should allow distinct non-overlapping calendar period', () => {
            const err = checkSchoolYearDateConflict('2026-08-01', '2027-06-30', existingYears);
            expect(err).toBeNull();
        });

        it('should allow adjacent contiguous dates without overlap', () => {
            // Ending 2026-06-30, next starts 2026-06-30 or 2026-07-01
            const err1 = checkSchoolYearDateConflict('2026-07-01', '2027-06-30', existingYears);
            expect(err1).toBeNull();

            const err2 = checkSchoolYearDateConflict('2026-06-30', '2027-06-30', existingYears);
            expect(err2).toBeNull();
        });

        it('should ignore date conflicts when editing own school year', () => {
            const err = checkSchoolYearDateConflict('2025-08-01', '2026-06-30', existingYears, 'sy-2025-2026');
            expect(err).toBeNull();
        });
    });

    describe('validateStep1SchoolYear with Existing School Years', () => {
        it('should fail when code collides with another school year', () => {
            const res = validateStep1SchoolYear(
                {
                    code: 'AY-2025-2026',
                    label: 'Academic Year 2026-2027',
                    start_date: '2026-08-01',
                    end_date: '2027-06-30'
                },
                null,
                existingYears
            );
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('already in use');
        });

        it('should fail when label collides with another school year', () => {
            const res = validateStep1SchoolYear(
                {
                    code: 'AY-2026-2027',
                    label: 'Academic Year 2025-2026',
                    start_date: '2026-08-01',
                    end_date: '2027-06-30'
                },
                null,
                existingYears
            );
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('already in use');
        });

        it('should fail when dates collide identically with another school year', () => {
            const res = validateStep1SchoolYear(
                {
                    code: 'AY-NEW-YEAR',
                    label: 'Academic Year New',
                    start_date: '2025-08-01',
                    end_date: '2026-06-30'
                },
                null,
                existingYears
            );
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('exact same dates');
        });

        it('should fail when dates overlap with another school year', () => {
            const res = validateStep1SchoolYear(
                {
                    code: 'AY-2026-MID',
                    label: 'Academic Year Mid',
                    start_date: '2026-03-01',
                    end_date: '2027-03-01'
                },
                null,
                existingYears
            );
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('overlap with Academic Year 2025-2026');
        });

        it('should succeed when code, label, and dates are unique and non-overlapping', () => {
            const res = validateStep1SchoolYear(
                {
                    code: 'AY-2026-2027',
                    label: 'Academic Year 2026-2027',
                    start_date: '2026-08-01',
                    end_date: '2027-06-30'
                },
                null,
                existingYears
            );
            expect(res.isValid).toBe(true);
            expect(res.error).toBeUndefined();
        });

        it('should succeed when editing the existing school year with its own values', () => {
            const res = validateStep1SchoolYear(
                {
                    code: 'AY-2025-2026',
                    label: 'Academic Year 2025-2026',
                    start_date: '2025-08-01',
                    end_date: '2026-06-30'
                },
                null,
                existingYears,
                'sy-2025-2026'
            );
            expect(res.isValid).toBe(true);
            expect(res.error).toBeUndefined();
        });
    });

    describe('Terms Validation & Non-overlapping Scheduling', () => {
        it('should fail when two terms have the same term type (e.g. two summer terms)', () => {
            const duplicateTerms: WizardTermItem[] = [
                {
                    end_date: '2027-07-15',
                    start_date: '2027-06-10',
                    term_type_id: 'summer-type-id',
                    term_type_label: 'Summer Term'
                },
                {
                    end_date: '2027-08-20',
                    start_date: '2027-07-20',
                    term_type_id: 'summer-type-id',
                    term_type_label: 'Summer Term'
                }
            ];

            const res = validateTerms(duplicateTerms);
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('Duplicate term type');
        });

        it('should fail when preceding term end date conflicts with succeeding term start date', () => {
            const overlappingTerms: WizardTermItem[] = [
                {
                    end_date: '2026-12-20',
                    start_date: '2026-08-15',
                    term_type_id: 'sem-1',
                    term_type_label: '1st Semester'
                },
                {
                    end_date: '2027-05-30',
                    start_date: '2026-12-10', // Before term 1 end date!
                    term_type_id: 'sem-2',
                    term_type_label: '2nd Semester'
                }
            ];

            const res = validateTerms(overlappingTerms);
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('conflicts with preceding term');
        });

        it('should distribute dates across periods proportionally without overlap', () => {
            const distributed = distributeDatesAcrossPeriods('2026-08-15', '2026-12-20', 3);
            expect(distributed).toHaveLength(3);
            expect(distributed[0].start_date).toBe('2026-08-15');
            expect(distributed[2].end_date).toBe('2026-12-20');
            expect(new Date(distributed[0].end_date) > new Date(distributed[0].start_date)).toBe(true);
            expect(new Date(distributed[1].start_date) >= new Date(distributed[0].end_date)).toBe(true);
        });
    });

    describe('Transmutation Validation & Special Status Grades (DRP, INC)', () => {
        it('should identify DRP and INC as special grades by label or special_code', () => {
            expect(isSpecialGradeRow({ label: 'DRP' })).toBe(true);
            expect(isSpecialGradeRow({ label: 'INC' })).toBe(true);
            expect(isSpecialGradeRow({ label: 'drp' })).toBe(true);
            expect(isSpecialGradeRow({ special_code: 'DRP' })).toBe(true);
            expect(isSpecialGradeRow({ special_code: 'INC' })).toBe(true);
            expect(isSpecialGradeRow({ label: '1.00', special_code: null })).toBe(false);
            expect(isSpecialGradeRow({ label: '5.00', special_code: null })).toBe(false);
        });

        it('should pass validation when DRP and INC have null/empty min and max percentages', () => {
            const rows: WizardTransmutationRow[] = [
                { label: '1.00', min_percentage: 95, max_percentage: 100, transmuted_grade: 1.00, is_passing: true },
                { label: '3.00', min_percentage: 75, max_percentage: 94, transmuted_grade: 3.00, is_passing: true },
                { label: '5.00', min_percentage: 0, max_percentage: 74, transmuted_grade: 5.00, is_passing: false },
                { label: 'INC', min_percentage: null, max_percentage: null, transmuted_grade: null, is_passing: false, special_code: 'INC' },
                { label: 'DRP', min_percentage: null, max_percentage: null, transmuted_grade: null, is_passing: false, special_code: 'DRP' }
            ];

            const res = validateTransmutationRows(rows);
            expect(res.isValid).toBe(true);
            expect(res.error).toBeUndefined();
        });

        it('should fail validation when regular numeric grade has missing or invalid min/max percentage', () => {
            const invalidRows: WizardTransmutationRow[] = [
                { label: '1.00', min_percentage: null, max_percentage: 100, transmuted_grade: 1.00, is_passing: true }
            ];

            const res = validateTransmutationRows(invalidRows);
            expect(res.isValid).toBe(false);
            expect(res.error).toContain('must have a Min % specified');
        });
    });
});


