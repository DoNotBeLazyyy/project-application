import { WizardGradingPeriodItem, WizardTransmutationRow } from '@type/school-year.type';

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

export const WIZARD_STEPS = [
    { step: 1, title: 'Identity & Dates', subtitle: 'Academic year code & dates' },
    { step: 2, title: 'Terms & Windows', subtitle: 'Terms & enrollment schedules' },
    { step: 3, title: 'Grading Periods', subtitle: 'Periods and 100% weights' },
    { step: 4, title: 'Grade Schema', subtitle: 'Transmutation & passing marks' }
];
