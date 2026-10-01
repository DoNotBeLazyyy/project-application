import { AcademicThresholdCategory } from '@type/academic-threshold.type';
import { EvaluationScope } from '@type/evaluation.type';

export interface SchoolYearListRow {
    id: string;
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    total_count: number;
}

export interface SchoolYearFormValues {
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

export interface SchoolYearFilterValues {
    is_active: 'All' | 'true' | 'false';
    year: string;
}

export interface SchoolYearOption {
    id: string;
    code: string;
    label: string;
    start_date?: string;
    end_date?: string;
}

export interface WizardGradingPeriodComponentItem {
    id?: string;
    name: string;
    weight: number;
}

export interface WizardGradingPeriodItem {
    id?: string;
    name: string;
    sequence: number;
    start_date?: string | null;
    end_date?: string | null;
    weight: number;
    major_exam_start_date?: string | null;
    major_exam_end_date?: string | null;
    grade_encoding_start_date?: string | null;
    grade_encoding_end_date?: string | null;
    components?: WizardGradingPeriodComponentItem[];
}

export interface WizardTermItem {
    id?: string;
    term_type_id: string;
    term_type_label?: string;
    term_type_code?: string;
    start_date: string;
    end_date: string;
    enrollment_start_date?: string | null;
    enrollment_end_date?: string | null;
    grading_deadline?: string | null;
    status?: string;
    evaluation_scope?: EvaluationScope | null;
    max_units?: number | string | null;
    grading_periods: WizardGradingPeriodItem[];
}

export interface WizardTransmutationRow {
    id?: string;
    label: string;
    is_conditional?: boolean;
    min_percentage?: number | string | null;
    max_percentage?: number | string | null;
    transmuted_grade?: number | string | null;
    is_passing: boolean;
    special_code?: string | null;
    description?: string | null;
}

export interface WizardThresholdItem {
    id?: string | null;
    category: AcademicThresholdCategory;
    code: string;
    label: string;
    min_gwa: number | string | null;
    max_gwa: number | string;
    min_subject_grade: number | string | null;
    requires_no_failing: boolean;
    scholarship_discount_pct: number | string | null;
    sort_order: number;
    is_active: boolean;
}

export type CalendarExceptionType = 'Holiday' | 'Break' | 'Suspension' | 'Special Class' | 'Exam Day' | string;

export interface ExceptionTypeOptionItem {
    id?: string;
    label: string;
    is_active: boolean;
    is_default?: boolean;
}

export interface WizardCalendarExceptionItem {
    id?: string;
    title: string;
    exception_type: CalendarExceptionType;
    start_date: string;
    end_date: string;
    affects_attendance: boolean;
    description?: string | null;
}

export interface AcademicYearCalendarDetails {
    id: string;
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    max_units_per_term?: number;
    evaluation_scope?: EvaluationScope;
    terms: WizardTermItem[];
    transmutation_rows: WizardTransmutationRow[];
    thresholds: WizardThresholdItem[];
    holidays?: WizardCalendarExceptionItem[];
}

export interface SaveAcademicYearCalendarPayload {
    p_school_year_id: string | null;
    p_code: string;
    p_label: string;
    p_start_date: string;
    p_end_date: string;
    p_is_active: boolean;
    p_terms: WizardTermItem[];
    p_transmutation_rows: WizardTransmutationRow[];
    p_thresholds?: WizardThresholdItem[];
    p_max_units_per_term?: number;
    p_evaluation_scope?: EvaluationScope;
    p_holidays?: WizardCalendarExceptionItem[];
}

export interface AcademicYearWizardFormValues {
    id?: string | null;
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    max_units_per_term: number | string;
    evaluation_scope: EvaluationScope;
    terms: WizardTermItem[];
    transmutation_rows: WizardTransmutationRow[];
    thresholds: WizardThresholdItem[];
    holidays?: WizardCalendarExceptionItem[];
}

export interface AcademicYearHistoryItem {
    id: string;
    school_year_id: string;
    action: 'CREATED' | 'UPDATED';
    changed_at: string;
    changed_by: string | null;
    changed_by_name: string | null;
    changed_by_email: string | null;
    changed_by_role: string | null;
    change_summary: string | null;
    snapshot: {
        id?: string;
        code?: string;
        label?: string;
        start_date?: string;
        end_date?: string;
        is_active?: boolean;
        max_units_per_term?: number;
        evaluation_scope?: EvaluationScope;
        terms_count?: number;
        transmutation_rows_count?: number;
        thresholds_count?: number;
        holidays_count?: number;
        terms?: WizardTermItem[];
        transmutation_rows?: WizardTransmutationRow[];
        thresholds?: WizardThresholdItem[];
        holidays?: WizardCalendarExceptionItem[];
    };
    changes?: Record<string, any> | null;
}