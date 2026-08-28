import CommonButton from '@components/button/CommonButton';
import QuestionCard from '@pages/faculty/sections/assessments/builder/QuestionCard';
import { ArrowLineUpIcon, ArrowsClockwiseIcon, PlusIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { AssessmentQuestion } from '@type/assessment.type';

interface QuestionListProps {
    assessmentDbId: string;
    configuredTotalPoints?: number;
    expandedQuestionId: string;
    questions: AssessmentQuestion[];
    onAddQuestion: () => void;
    onDeleteQuestion: (id: string) => Promise<void>;
    onEditQuestion: (question: AssessmentQuestion) => void;
    onImportQuestions: () => void;
    onSyncTotalPoints?: (newTotal: number) => void;
    onToggleExpand: (id: string) => void;
}

export default function QuestionList({
    assessmentDbId,
    configuredTotalPoints,
    expandedQuestionId,
    questions,
    onAddQuestion,
    onDeleteQuestion,
    onEditQuestion,
    onImportQuestions,
    onSyncTotalPoints,
    onToggleExpand
}: QuestionListProps) {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const hasDiscrepancy = configuredTotalPoints !== undefined
        && questions.length > 0
        && configuredTotalPoints !== totalPoints;

    return (
        <div className="flex flex-1 flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Questions
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {questions.length} question{questions.length !== 1
                            ? 's'
                            : ''} · {totalPoints} pts total
                        {configuredTotalPoints !== undefined && (
                            <span> (Target: {configuredTotalPoints} pts)</span>
                        )}
                    </span>
                    {!assessmentDbId
                        ? (
                            <span className="text-(--mui-palette-warning-main) text-xs">
                                Save the assessment settings first to add or import questions.
                            </span>
                        )
                        : null}
                </div>
                <div className="flex gap-2 items-center">
                    <CommonButton
                        color="inherit"
                        disabled={!assessmentDbId}
                        size="small"
                        startIcon={<ArrowLineUpIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={onImportQuestions}
                    >
                        Import CSV
                    </CommonButton>
                    <CommonButton
                        disabled={!assessmentDbId}
                        size="small"
                        startIcon={<PlusIcon size={14} weight="bold" />}
                        variant="contained"
                        onClick={onAddQuestion}
                    >
                        Add Question
                    </CommonButton>
                </div>
            </div>

            {hasDiscrepancy && (
                <div className="bg-(--mui-palette-warning-main)/10 border border-(--mui-palette-warning-main)/30 flex flex-wrap gap-2 items-center justify-between p-2.5 rounded-lg">
                    <div className="flex gap-1.5 items-center text-(--mui-palette-warning-main) text-xs">
                        <WarningCircleIcon className="shrink-0" size={16} weight="fill" />
                        <span>
                            Question points sum to <strong>{totalPoints} pts</strong>, but assessment settings specify <strong>{configuredTotalPoints} pts</strong>.
                        </span>
                    </div>
                    {onSyncTotalPoints && (
                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowsClockwiseIcon size={13} weight="bold" />}
                            variant="outlined"
                            onClick={() => onSyncTotalPoints(totalPoints)}
                        >
                            Sync to {totalPoints} pts
                        </CommonButton>
                    )}
                </div>
            )}

            {!assessmentDbId && (
                <div className="flex flex-1 items-center justify-center">
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Save the assessment settings first to start adding questions.
                    </p>
                </div>
            )}
            <div className="flex flex-col gap-2 overflow-y-auto">
                {questions.map((question, index) => (
                    <QuestionCard
                        index={index}
                        isExpanded={expandedQuestionId === question.id}
                        key={question.id}
                        question={question}
                        onDelete={onDeleteQuestion}
                        onEdit={onEditQuestion}
                        onToggleExpand={onToggleExpand}
                    />
                ))}
            </div>
        </div>
    );
}