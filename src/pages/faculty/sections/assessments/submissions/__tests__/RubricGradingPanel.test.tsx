import RubricGradingPanel from '@pages/faculty/sections/assessments/submissions/RubricGradingPanel';
import { render, screen } from '@testing-library/react';
import { SubmissionForGrading } from '@type/assessment.type';
import { SubmissionRubric } from '@type/rubric.type';
import { describe, expect, it, vi } from 'vitest';

const mockRubric: SubmissionRubric = {
    criteria: [
        {
            description: 'Quality of the code and organization',
            feedback: '',
            id: 'crit-1',
            max_points: 50,
            points_earned: 45,
            sequence: 1,
            title: 'Code Quality'
        }
    ],
    id: 'rubric-1',
    title: 'Final Project Rubric',
    total_points: 50
};

const mockSubmission: SubmissionForGrading = {
    answers: [
        {
            answer_text: 'My submission repository: https://github.com/student/final-project',
            choice_id: null,
            file_attachments: [],
            grader_notes: '',
            id: 'ans-1',
            is_correct: null,
            points: 50,
            points_earned: null,
            question_id: 'q-1',
            question_text: 'Submit your GitHub repository link and brief description',
            question_type: 'Essay',
            sequence: 1
        }
    ],
    enrollment_id: 'enr-1',
    feedback: null,
    final_score: null,
    id: 'sub-1',
    raw_score: null,
    status: 'Submitted',
    use_rubric_scoring: true
};

describe('RubricGradingPanel', () => {
    it('renders both the student submission answer with link and the rubric criteria', () => {
        render(
            <RubricGradingPanel
                draftEvaluations={[{ criteria_id: 'crit-1', feedback: '', points_earned: 45 }]}
                draftFeedback=""
                isDirty={false}
                isSaving={false}
                rubric={mockRubric}
                submission={mockSubmission}
                onEvaluationFeedbackChange={vi.fn()}
                onFeedbackChange={vi.fn()}
                onPointsChange={vi.fn()}
                onSave={vi.fn()}
            />
        );

        // Student submission question and answer must be visible
        expect(screen.getByText(/1\. Submit your GitHub repository link and brief description/i)).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /https:\/\/github\.com\/student\/final-project/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'https://github.com/student/final-project');

        // Rubric title and criterion must also be visible
        expect(screen.getByText('Final Project Rubric')).toBeInTheDocument();
        expect(screen.getByText('Code Quality')).toBeInTheDocument();
    });
});
