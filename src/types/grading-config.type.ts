export interface TransmutationRow {
    id?: string;
    min_percentage: string;
    max_percentage: string;
    transmuted_grade: string;
    description: string;
}

export interface GradingComponentTemplate {
    id?: string;
    name: string;
    weight: string;
}

export interface GradingPeriodTemplate {
    id?: string;
    name: string;
    sequence: number;
    weight: string;
    components: GradingComponentTemplate[];
}

export interface SpecialGradeConfig {
    id?: string;
    code: string;
    label: string;
    description: string;
    min_absence_percentage: string;
    requires_completion: boolean;
    completion_deadline_days: string;
    is_passing: boolean;
    is_active: boolean;
}