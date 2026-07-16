export type AssessmentType =
    | 'Quiz'
    | 'Exam'
    | 'Activity'
    | 'Assignment'
    | 'Project'
    | 'Lab Report';

export type QuestionType =
    | 'Multiple Choice'
    | 'True or False'
    | 'Short Answer'
    | 'Essay'
    | 'Fill in the Blank'
    | 'Matching'
    | 'File Upload';

export type SubmissionStatus =
    | 'Not Started'
    | 'In Progress'
    | 'Submitted'
    | 'Late'
    | 'Graded'
    | 'Returned';

export interface QuestionBulkRow {
    question_text: string;
    question_type: string;
    points: string;
    is_required: string;
    explanation: string;
    choices: string;
}

export interface AssessmentAttachment {
    id: string;
    file_name: string;
    file_url: string;
    file_size_bytes: number | null;
    mime_type: string | null;
    sequence: number;
}

export interface AssessmentListRow {
    id: string;
    title: string;
    description: string | null;
    assessment_type: AssessmentType;
    total_points: number;
    passing_points: number | null;
    time_limit_minutes: number | null;
    max_attempts: number;
    is_published: boolean;
    published_at: string | null;
    opens_at: string | null;
    due_at: string | null;
    closes_at: string | null;
    show_results_at: string | null;
    scheduled_publish_at: string | null;
    shuffle_questions: boolean;
    shuffle_choices: boolean;
    show_all_questions: boolean;
    questions_per_page: number | null;
    grading_component_id: string | null;
    question_count: number;
    submission_count: number;
    attachments: AssessmentAttachment[];
}

export interface AssessmentFormValues {
    title: string;
    description: string;
    assessment_type: AssessmentType;
    grading_component_id: string;
    total_points: string;
    passing_points: string;
    time_limit_minutes: string;
    max_attempts: string;
    opens_at: string;
    due_at: string;
    closes_at: string;
    show_results_at: string;
    scheduled_publish_at: string;
    shuffle_questions: boolean;
    shuffle_choices: boolean;
    show_all_questions: boolean;
    questions_per_page: string;
}

export interface QuestionChoice {
    id: string;
    choice_text: string;
    is_correct: boolean;
    sequence: number;
}

export interface AssessmentQuestion {
    id: string;
    question_text: string;
    question_type: QuestionType;
    points: number;
    sequence: number;
    explanation: string | null;
    is_required: boolean;
    allowed_file_types: string[] | null;
    max_file_size_mb: number | null;
    max_file_count: number | null;
    choices: QuestionChoice[];
}

export interface QuestionFormValues {
    question_text: string;
    question_type: QuestionType;
    points: string;
    explanation: string;
    is_required: boolean;
    allowed_file_types: string;
    max_file_size_mb: string;
    max_file_count: string;
    choices: QuestionChoiceFormValue[];
}

export interface QuestionChoiceFormValue {
    choice_text: string;
    is_correct: boolean;
}

export interface SubmissionListRow {
    id: string;
    enrollment_id: string;
    student_number: string;
    full_name: string;
    attempt_number: number;
    status: SubmissionStatus;
    started_at: string | null;
    submitted_at: string | null;
    raw_score: number | null;
    final_score: number | null;
    is_late: boolean;
    feedback: string | null;
}

export interface SubmissionAnswer {
    id: string;
    question_id: string;
    question_text: string;
    question_type: QuestionType;
    points: number;
    sequence: number;
    answer_text: string | null;
    choice_id: string | null;
    points_earned: number | null;
    is_correct: boolean | null;
    grader_notes: string | null;
    file_attachments: { name: string; path: string }[];
}

export interface SubmissionForGrading {
    id: string;
    enrollment_id: string;
    status: SubmissionStatus;
    raw_score: number | null;
    final_score: number | null;
    feedback: string | null;
    use_rubric_scoring: boolean;
    answers: SubmissionAnswer[];
}

export interface GradeAnswerUpdate {
    id: string;
    points_earned: number;
    grader_notes: string;
}