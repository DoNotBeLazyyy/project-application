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
    sequence: string;
    program_ids: string[];
    questions: EvaluationQuestionForm[];
}

export interface EvaluationTemplateBulkRow {
    section_title: string;
    section_sequence: string;
    section_description: string;
    is_active: string;
    program_codes: string;
    question_text: string;
    question_type: string;
    is_required: string;
    min_rating: string;
    max_rating: string;
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
    sequence: number;
    program_ids: string[];
    questions: EvaluationQuestionRow[];
}

export interface EvaluationSection {
    template_id: string;
    title: string;
    description: string | null;
    sequence: number;
    questions: EvaluationQuestionRow[];
}

export interface EvaluationForm {
    faculty_name: string;
    grading_period_id: string;
    grading_period_name: string;
    sections: EvaluationSection[];
}

export interface EvaluationResponseInput {
    question_id: string;
    rating_value: string;
    response_text: string;
}

export interface EvaluationAnswerForm {
    question_id: string;
    question_text: string;
    question_type: EvaluationQuestionType;
    is_required: boolean;
    min_rating: number | null;
    max_rating: number | null;
    sequence: number;
    rating_value: string;
    response_text: string;
}

export interface EvaluationAnswersForm {
    responses: EvaluationAnswerForm[];
}