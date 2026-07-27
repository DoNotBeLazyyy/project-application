import { AssessmentFormValues, QuestionFormValues, QuestionType } from '@type/assessment.type';

export const DEFAULT_ASSSESSMENT_VALUES: AssessmentFormValues = {
    title: '',
    description: '',
    assessment_type: 'Quiz',
    grading_component_id: '',
    total_points: '100',
    passing_points: '',
    time_limit_minutes: '',
    max_attempts: '1',
    opens_at: '',
    due_at: '',
    closes_at: '',
    show_results_at: '',
    scheduled_publish_at: '',
    shuffle_questions: false,
    shuffle_choices: false,
    show_all_questions: true,
    questions_per_page: '',
    allow_past_dates: false
};

export const CHOICE_BASED_TYPES: QuestionType[] = ['Multiple Choice', 'True or False', 'Matching'];

export const DEFAULT_QUESTION_VALUES: QuestionFormValues = {
    question_text: '',
    question_type: 'Multiple Choice',
    points: '1',
    explanation: '',
    is_required: true,
    allowed_file_types: '',
    max_file_size_mb: '',
    max_file_count: '',
    choices: [
        { choice_text: '', is_correct: false },
        { choice_text: '', is_correct: false }
    ]
};