import { EvaluationScope } from '@type/evaluation.type';

export type TermStatus = 'Upcoming' | 'Enrollment Open' | 'Ongoing' | 'Grading Period' | 'Closed';

export type TermEvaluationScope = EvaluationScope | '';

export interface TermListRow {
    id: string;
    school_year_id: string;
    school_year_label: string;
    term_type_id: string;
    term_type_label: string;
    status: TermStatus;
    start_date: string;
    end_date: string;
    enrollment_start_date: string | null;
    enrollment_end_date: string | null;
    grading_deadline: string | null;
    evaluation_scope: TermEvaluationScope;
    effective_evaluation_scope: EvaluationScope;
    total_count: number;
}

export interface TermFormValues {
    school_year_id: string;
    term_type_id: string;
    start_date: string;
    end_date: string;
    enrollment_start_date: string;
    enrollment_end_date: string;
    grading_deadline: string;
    evaluation_scope: TermEvaluationScope;
}

export interface TermFilterValues {
    school_year_id: string;
    status: TermStatus | 'All';
}