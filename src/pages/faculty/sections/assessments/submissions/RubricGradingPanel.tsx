import CommonButton from '@components/button/CommonButton';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import AnswerCard from '@pages/faculty/sections/assessments/submissions/AnswerCard';
import { CheckCircleIcon, FileTextIcon, ListChecksIcon } from '@phosphor-icons/react';
import { SubmissionForGrading } from '@type/assessment.type';
import { RubricEvaluationInput, SubmissionRubric } from '@type/rubric.type';
import { TabItemData } from '@type/tab-menu.type';
import { stripLeadingZeros } from '@utils/input.util';
import { SyntheticEvent, useState } from 'react';

type RubricGradingTab = 'all' | 'submission' | 'rubric';

interface RubricGradingPanelProps {
    draftEvaluations: RubricEvaluationInput[];
    draftFeedback: string;
    isDirty: boolean;
    isSaving: boolean;
    rubric: SubmissionRubric;
    submission: SubmissionForGrading;
    onEvaluationFeedbackChange: (criteriaId: string, value: string) => void;
    onFeedbackChange: (value: string) => void;
    onPointsChange: (criteriaId: string, value: number) => void;
    onSave: () => Promise<void>;
}

export default function RubricGradingPanel({
    draftEvaluations,
    draftFeedback,
    isDirty,
    isSaving,
    rubric,
    submission,
    onEvaluationFeedbackChange,
    onFeedbackChange,
    onPointsChange,
    onSave
}: RubricGradingPanelProps) {
    const [viewMode, setViewMode] = useState<RubricGradingTab>('all');

    const earned = draftEvaluations.reduce(function(sum, evaluation) {
        return sum + (Number.isFinite(evaluation.points_earned)
            ? evaluation.points_earned
            : 0);
    }, 0);

    const tabs: TabItemData[] = [
        { label: 'All', value: 'all' },
        {
            icon: <FileTextIcon />, label: `Submission (${submission.answers.length})`, value: 'submission'
        },
        {
            icon: <ListChecksIcon />, label: `Rubric (${rubric.criteria.length})`, value: 'rubric'
        }
    ];

    function handleTabChange(_: SyntheticEvent, value: string) {
        setViewMode(value as RubricGradingTab);
    }

    const showSubmission = viewMode === 'all' || viewMode === 'submission';
    const showRubric = viewMode === 'all' || viewMode === 'rubric';

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
                    disabled={isSaving || !isDirty}
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

            <CommonTabMenu
                menuStyle="outline"
                size="small"
                tabs={tabs}
                value={viewMode}
                onChange={handleTabChange}
            />

            <div className="flex flex-col flex-1 gap-4 overflow-y-auto">
                {showSubmission && (
                    <div className="flex flex-col gap-2">
                        <div className="border-b border-(--mui-palette-divider) flex items-center justify-between pb-1">
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                Student Submission
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {submission.answers.length} {submission.answers.length === 1
                                    ? 'question'
                                    : 'questions'}
                            </span>
                        </div>
                        {submission.answers.length === 0
                            ? (
                                <p className="border border-(--mui-palette-divider) italic p-3 rounded-lg text-(--mui-palette-text-disabled) text-sm">
                                    No answers recorded for this submission.
                                </p>
                            )
                            : (
                                submission.answers.map(function(answer) {
                                    return (
                                        <AnswerCard
                                            answer={answer}
                                            key={answer.id}
                                            readOnly
                                        />
                                    );
                                })
                            )}
                    </div>
                )}

                {showRubric && (
                    <div className="flex flex-col gap-3">
                        <div className="border-b border-(--mui-palette-divider) flex items-center justify-between pb-1">
                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                Rubric Evaluation
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {rubric.criteria.length} {rubric.criteria.length === 1
                                    ? 'criterion'
                                    : 'criteria'}
                            </span>
                        </div>
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
                                                    const val = stripLeadingZeros(e.target.value);
                                                    e.target.value = val;
                                                    onPointsChange(criterion.id, Number(val));
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
                )}
            </div>
        </div>
    );
}