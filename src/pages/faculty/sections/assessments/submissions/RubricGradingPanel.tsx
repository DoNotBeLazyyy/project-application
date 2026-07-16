import CommonButton from '@components/button/CommonButton';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { RubricEvaluationInput, SubmissionRubric } from '@type/rubric.type';

interface RubricGradingPanelProps {
    draftEvaluations: RubricEvaluationInput[];
    draftFeedback: string;
    isSaving: boolean;
    rubric: SubmissionRubric;
    onEvaluationFeedbackChange: (criteriaId: string, value: string) => void;
    onFeedbackChange: (value: string) => void;
    onPointsChange: (criteriaId: string, value: number) => void;
    onSave: () => Promise<void>;
}

export default function RubricGradingPanel({
    draftEvaluations,
    draftFeedback,
    isSaving,
    rubric,
    onEvaluationFeedbackChange,
    onFeedbackChange,
    onPointsChange,
    onSave
}: RubricGradingPanelProps) {
    const earned = draftEvaluations.reduce(function(sum, evaluation) {
        return sum + (Number.isFinite(evaluation.points_earned)
            ? evaluation.points_earned
            : 0);
    }, 0);

    return (
        <div className="flex flex-col flex-1 gap-3 min-h-0 min-w-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        {rubric.title}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Score: {earned} / {rubric.total_points} pts
                    </span>
                </div>
                <CommonButton
                    disabled={isSaving}
                    size="small"
                    startIcon={<CheckCircleIcon size={14} weight="bold" />}
                    variant="contained"
                    onClick={onSave}
                >
                    {isSaving
                        ? 'Saving...'
                        : 'Save Grade'}
                </CommonButton>
            </div>
            <div className="flex flex-col flex-1 gap-3 overflow-y-auto">
                {rubric.criteria.map(function(criterion) {
                    const draft = draftEvaluations.find((e) => e.criteria_id === criterion.id) ?? {
                        criteria_id: criterion.id,
                        points_earned: 0,
                        feedback: ''
                    };

                    return (
                        <div
                            className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg"
                            key={criterion.id}
                        >
                            <div className="flex gap-3 items-start justify-between">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                        {criterion.title}
                                    </span>
                                    {criterion.description && (
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            {criterion.description}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 items-center shrink-0">
                                    <input
                                        className="border border-(--mui-palette-divider) focus:border-(--mui-palette-primary-main) outline-none px-2 py-1 rounded text-right text-sm transition-colors w-16"
                                        max={criterion.max_points}
                                        min={0}
                                        type="number"
                                        value={draft.points_earned}
                                        onChange={function(e) {
                                            onPointsChange(criterion.id, Number(e.target.value));
                                        }}
                                    />
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        / {criterion.max_points}
                                    </span>
                                </div>
                            </div>
                            <textarea
                                className="border border-(--mui-palette-divider) focus:border-(--mui-palette-primary-main) outline-none px-3 py-2 resize-none rounded text-sm transition-colors"
                                placeholder="Optional note for this criterion..."
                                rows={2}
                                value={draft.feedback}
                                onChange={function(e) {
                                    onEvaluationFeedbackChange(criterion.id, e.target.value);
                                }}
                            />
                        </div>
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