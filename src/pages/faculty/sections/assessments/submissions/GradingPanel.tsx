import CommonButton from '@components/button/CommonButton';
import AnswerCard from '@pages/faculty/sections/assessments/submissions/AnswerCard';
import { getPointsError, MANUAL_GRADE_TYPES } from '@pages/faculty/sections/assessments/submissions/answerPoints';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { GradeAnswerUpdate, SubmissionForGrading } from '@type/assessment.type';

interface GradingPanelProps {
    draftAnswers: GradeAnswerUpdate[];
    draftFeedback: string;
    isDirty: boolean;
    isSaving: boolean;
    submission: SubmissionForGrading;
    onFeedbackChange: (value: string) => void;
    onNotesChange: (answerId: string, value: string) => void;
    onPointsChange: (answerId: string, value: number) => void;
    onSave: () => Promise<void>;
}

export default function GradingPanel({
    draftAnswers,
    draftFeedback,
    isDirty,
    isSaving,
    submission,
    onFeedbackChange,
    onNotesChange,
    onPointsChange,
    onSave
}: GradingPanelProps) {
    const isGraded = submission.status === 'Graded';
    const isNotSubmitted = submission.status === 'Not Started' || submission.status === 'In Progress';
    const hasInvalidPoints = submission.answers.some(function(answer) {
        if (!MANUAL_GRADE_TYPES.includes(answer.question_type)) return false;
        const draft = draftAnswers.find((a) => a.id === answer.id);
        return Boolean(draft && getPointsError(draft.points_earned, answer.points));
    });
    const canSave = (!isGraded || isDirty) && !hasInvalidPoints && !isNotSubmitted;

    return (
        <div className="flex flex-col flex-1 gap-3 min-h-0 min-w-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Grading
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Score: {submission.raw_score ?? '—'} pts
                    </span>
                    {isNotSubmitted && (
                        <span className="text-(--mui-palette-warning-main) text-xs">
                            This attempt has not been submitted yet, so it cannot be graded.
                        </span>
                    )}
                    {hasInvalidPoints && (
                        <span className="text-(--mui-palette-error-main) text-xs">
                            Fix the points marked below before saving.
                        </span>
                    )}
                </div>
                <CommonButton
                    disabled={isSaving || !canSave}
                    size="small"
                    startIcon={(
                        <CheckCircleIcon
                            size={14}
                            weight="bold"
                        />
                    )}
                    variant="contained"
                    onClick={onSave}
                >
                    {isSaving
                        ? 'Saving...'
                        : 'Save Grade'}
                </CommonButton>
            </div>
            <div className="flex flex-col flex-1 gap-3 overflow-y-auto">
                {submission.answers.map((answer) => {
                    const draft = draftAnswers.find((a) => a.id === answer.id) ?? {
                        id: answer.id,
                        points_earned: 0,
                        grader_notes: ''
                    };

                    return (
                        <AnswerCard
                            answer={answer}
                            draftAnswer={draft}
                            key={answer.id}
                            onNotesChange={onNotesChange}
                            onPointsChange={onPointsChange}
                        />
                    );
                })}
                <div className="flex flex-col gap-1">
                    <label className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Overall Feedback
                    </label>
                    <textarea
                        className="border border-(--mui-palette-divider) focus:border-(--mui-palette-primary-main) outline-none px-3 py-2 resize-none rounded text-sm transition-colors"
                        placeholder="Optional feedback to the student..."
                        rows={3}
                        value={draftFeedback}
                        onChange={function(e) {
                            onFeedbackChange(e.target.value);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}