export interface TransmutationRow {
    id?: string;
    min_percentage: string | number;
    max_percentage?: string | number;
    transmuted_grade: string | number;
    description: string;
}

export interface GradingComponentTemplate {
    id?: string;
    name: string;
    weight: string | number;
}

export interface GradingPeriodTemplate {
    id?: string;
    name: string;
    sequence: number;
    weight: string | number;
    components: GradingComponentTemplate[];
}

export interface SpecialGradeConfig {
    id?: string;
    code: string;
    label: string;
    description: string;
    min_absence_percentage: string | number | null;
    requires_completion: boolean;
    completion_deadline_days: string | number | null;
    is_passing: boolean;
    is_active: boolean;
}