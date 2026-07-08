export type EvaluationQuestionType = 'Rating' | 'Multiple Choice' | 'Open Ended';

export interface EvaluationQuestionForm {
    id?: string;
    question_text: string;
    question_type: EvaluationQuestionType;
    is_required: boolean;
    min_rating: string;
    max_rating: string;
}

export interface EvaluationTemplateForm {
    id?: string;
    title: string;
    description: string;
    is_active: boolean;
    questions: EvaluationQuestionForm[];
}

export interface EvaluationQuestionRow {
    id: string;
    question_text: string;
    question_type: EvaluationQuestionType;
    sequence: number;
    is_required: boolean;
    min_rating: number | null;
    max_rating: number | null;
}

export interface EvaluationTemplateRow {
    id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    questions: EvaluationQuestionRow[];
}

export interface EvaluationForm {
    template_id: string;
    title: string;
    description: string | null;
    faculty_name: string;
    grading_period_id: string;
    grading_period_name: string;
    questions: EvaluationQuestionRow[];
}

export interface EvaluationResponseInput {
    question_id: string;
    rating_value: string;
    response_text: string;
}