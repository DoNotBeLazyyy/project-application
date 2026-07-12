export type AcademicThresholdCategory = 'Honor' | 'Scholarship' | 'Standing';

export interface AcademicThreshold {
    id: string;
    category: AcademicThresholdCategory;
    code: string;
    label: string;
    min_gwa: number | null;
    max_gwa: number;
    requires_no_failing: boolean;
    scholarship_discount_pct: number | null;
    sort_order: number;
    is_active: boolean;
}

export interface AcademicThresholdUpdate {
    id: string;
    min_gwa: string;
    max_gwa: string;
    requires_no_failing: boolean;
    scholarship_discount_pct: string;
    is_active: boolean;
}

export interface AcademicThresholdsFormValues {
    thresholds: AcademicThresholdUpdate[];
}