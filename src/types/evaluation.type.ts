export type EvaluationQuestionType = 'Rating' | 'Multiple Choice' | 'Open Ended';

export type EvaluationScope = 'Period' | 'Term';

export type EvaluationTargetMode = 'INCLUDE' | 'EXCLUDE';

export interface EvaluationQuestionForm {
    id?: string;
    question_text: string;
    question_type?: EvaluationQuestionType;
    is_required: boolean;
    min_rating?: string;
    max_rating?: string;
}

export interface EvaluationTemplateForm {
    id?: string;
    title: string;
    description: string;
    is_active: boolean;
    sequence: string;
    target_mode: EvaluationTargetMode;
    suggestion_placeholder?: string;
    program_ids: string[];
    questions: EvaluationQuestionForm[];
}

export interface EvaluationTemplateBulkRow {
    section_title: string;
    section_sequence: string;
    section_description: string;
    is_active: string;
    target_mode?: string;
    suggestion_placeholder?: string;
    program_codes: string;
    question_text: string;
    question_type?: string;
    is_required: string;
    min_rating?: string;
    max_rating?: string;
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
    target_mode: EvaluationTargetMode;
    suggestion_placeholder: string | null;
    program_ids: string[];
    questions: EvaluationQuestionRow[];
}

export interface EvaluationSection {
    template_id: string;
    title: string;
    description: string | null;
    sequence: number;
    suggestion_placeholder?: string | null;
    questions: EvaluationQuestionRow[];
}

export interface EvaluationSavedAnswer {
    question_id: string;
    rating_value: number | null;
    response_text: string | null;
}

export interface EvaluationForm {
    enrollment_id: string;
    faculty_name: string;
    course_code: string;
    course_title: string;
    section_code: string;
    term_label: string;
    grading_period_id: string;
    grading_period_name: string;
    evaluation_scope: EvaluationScope;
    is_completed: boolean;
    answers: EvaluationSavedAnswer[];
    sections: EvaluationSection[];
}

export interface MyEvaluationRow {
    enrollment_id: string;
    grading_period_id: string;
    grading_period_name: string;
    grading_period_sequence: number;
    evaluation_scope: EvaluationScope;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    faculty_name: string;
    is_completed: boolean;
    completed_at: string | null;
    total_count: number;
}

export type EvaluationStatusFilter = '' | 'Pending' | 'Completed';

export interface MyEvaluationsFilterValues {
    status: EvaluationStatusFilter;
}

export interface EvaluationTemplateListRow {
    id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    sequence: number;
    target_mode: EvaluationTargetMode;
    suggestion_placeholder?: string | null;
    program_ids: string[];
    question_count: number;
    total_count: number;
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