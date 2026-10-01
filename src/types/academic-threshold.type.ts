export type AcademicThresholdCategory = 'Honor' | 'Scholarship' | 'Standing';

export interface AcademicThreshold {
    id: string;
    category: AcademicThresholdCategory;
    code: string;
    label: string;
    min_gwa: number | null;
    max_gwa: number;
    min_subject_grade: number | null;
    requires_no_failing: boolean;
    scholarship_discount_pct: number | null;
    sort_order: number;
    is_active: boolean;
}

export interface AcademicThresholdUpdate {
    id?: string | null;
    category?: AcademicThresholdCategory;
    code?: string;
    label?: string;
    min_gwa: string;
    max_gwa: string;
    min_subject_grade: string;
    requires_no_failing: boolean;
    scholarship_discount_pct: string;
    sort_order?: number;
    is_active: boolean;
}

/** One row of the management list, edited through the update modal or in-place row editor. */
export interface AcademicThresholdFormValues {
    is_active: boolean;
    max_gwa: string;
    min_gwa: string;
    min_subject_grade: string;
    requires_no_failing: boolean;
    scholarship_discount_pct: string;
}

export interface AcademicThresholdFilterValues {
    category: 'All' | AcademicThresholdCategory;
    is_active: 'All' | 'Active' | 'Inactive';
}

export interface AcademicStandingEvaluation {
    student_id: string;
    school_year_id?: string;
    cumulative_gwa: number;
    failing_count: number;
    academic_standing: string;
    qualified_honors: { code: string; label: string; min_gwa: number; max_gwa: number }[];
    qualified_scholarships: { code: string; label: string; discount_pct: number | null }[];
}