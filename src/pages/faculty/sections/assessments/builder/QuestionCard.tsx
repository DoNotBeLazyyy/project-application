import CommonButton from '@components/button/CommonButton';
import { CHOICE_BASED_TYPES } from '@constants/faculty.constant';
import { CaretDownIcon, CaretUpIcon, PencilIcon, TrashIcon } from '@phosphor-icons/react';
import { AssessmentQuestion } from '@type/assessment.type';

interface QuestionCardProps {
    index: number;
    isExpanded: boolean;
    question: AssessmentQuestion;
    onDelete: (id: string) => Promise<void>;
    onEdit: (question: AssessmentQuestion) => void;
    onToggleExpand: (id: string) => void;
}

export default function QuestionCard({
    index,
    isExpanded,
    question,
    onDelete,
    onEdit,
    onToggleExpand
}: QuestionCardProps) {
    return (
        <div className="border border-(--mui-palette-divider) overflow-hidden rounded-lg">
            <div
                className="cursor-pointer flex gap-3 hover:bg-(--mui-palette-action-hover) items-center justify-between p-3 transition-colors"
                onClick={function() {
                    onToggleExpand(question.id);
                }}
            >
                <div className="flex gap-2 items-center min-w-0">
                    <span className="font-medium shrink-0 text-(--mui-palette-text-secondary) text-xs w-6">
                        {index + 1}.
                    </span>
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                        {question.question_text}
                    </span>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {question.question_type}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {question.points} pt{question.points !== 1
                            ? 's'
                            : ''}
                    </span>
                    <CommonButton
                        color="primary"
                        size="small"
                        onClick={function(e) {
                            e.stopPropagation();
                            onEdit(question);
                        }}
                    >
                        <PencilIcon size={13} weight="bold" />
                    </CommonButton>
                    <CommonButton
                        color="error"
                        size="small"
                        onClick={function(e) {
                            e.stopPropagation();
                            onDelete(question.id);
                        }}
                    >
                        <TrashIcon size={13} weight="bold" />
                    </CommonButton>
                    {isExpanded
                        ? <CaretUpIcon size={14} />
                        : <CaretDownIcon size={14} />
                    }
                </div>
            </div>
            {isExpanded && (
                <div className="border-(--mui-palette-divider) border-t flex flex-col gap-2 p-3">
                    {question.explanation && (
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            Explanation: {question.explanation}
                        </p>
                    )}
                    {CHOICE_BASED_TYPES.includes(question.question_type) && question.choices.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {question.choices.map((choice) => (
                                <div
                                    className="flex gap-2 items-center"
                                    key={choice.id}
                                >
                                    <span
                                        className="h-3 rounded-full shrink-0 w-3"
                                        style={{
                                            backgroundColor: choice.is_correct
                                                ? 'var(--mui-palette-success-main)'
                                                : 'var(--mui-palette-divider)'
                                        }}
                                    />
                                    <span className="text-(--mui-palette-text-primary) text-xs">
                                        {choice.choice_text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}