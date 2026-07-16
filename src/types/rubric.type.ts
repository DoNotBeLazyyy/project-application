export interface RubricListRow {
    id: string;
    title: string;
    description: string | null;
    total_points: number;
    is_active: boolean;
    criteria_count: number;
    attached_count: number;
}

export interface RubricCriterion {
    id: string;
    title: string;
    description: string | null;
    max_points: number;
    sequence: number;
}

export interface RubricDetail {
    id: string;
    section_id: string;
    title: string;
    description: string | null;
    total_points: number;
    is_active: boolean;
    criteria: RubricCriterion[];
}

export interface RubricCriterionInput {
    id: string | null;
    title: string;
    description: string;
    max_points: number;
}

export interface RubricCriterionFormValue {
    id: string | null;
    title: string;
    description: string;
    max_points: string;
}

export interface RubricFormValues {
    title: string;
    description: string;
    criteria: RubricCriterionFormValue[];
}

export interface AssessmentRubricSummary {
    id: string;
    title: string;
    total_points: number;
    criteria: RubricCriterion[];
}

export interface AssessmentRubricState {
    assessment_id: string;
    use_rubric_scoring: boolean;
    rubric_id: string | null;
    rubric: AssessmentRubricSummary | null;
}

export interface SubmissionRubricCriterion {
    id: string;
    title: string;
    description: string | null;
    max_points: number;
    sequence: number;
    points_earned: number | null;
    feedback: string | null;
}

export interface SubmissionRubric {
    submission_id: string;
    rubric_id: string;
    title: string;
    total_points: number;
    criteria: SubmissionRubricCriterion[];
}

export interface RubricEvaluationInput {
    criteria_id: string;
    points_earned: number;
    feedback: string;
}