import CommonButton from '@components/button/CommonButton';
import QuestionCard from '@pages/faculty/sections/assessments/builder/QuestionCard';
import { PlusIcon } from '@phosphor-icons/react';
import { AssessmentQuestion } from '@type/assessment.type';

interface QuestionListProps {
    assessmentDbId: string;
    expandedQuestionId: string;
    questions: AssessmentQuestion[];
    onAddQuestion: () => void;
    onDeleteQuestion: (id: string) => Promise<void>;
    onEditQuestion: (question: AssessmentQuestion) => void;
    onToggleExpand: (id: string) => void;
}

export default function QuestionList({
    assessmentDbId,
    expandedQuestionId,
    questions,
    onAddQuestion,
    onDeleteQuestion,
    onEditQuestion,
    onToggleExpand
}: QuestionListProps) {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    return (
        <div className="flex flex-col flex-1 gap-3 min-w-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Questions
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {questions.length} question{questions.length !== 1
                            ? 's'
                            : ''} · {totalPoints} pts total
                    </span>
                </div>
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