import CommonButton from '@components/button/CommonButton';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { QuestionChoiceFormValue, QuestionType } from '@type/assessment.type';

interface ChoiceBuilderProps {
    choices: QuestionChoiceFormValue[];
    questionType: QuestionType;
    onAddChoice: () => void;
    onRemoveChoice: (index: number) => void;
    onTextChange: (index: number, text: string) => void;
    onToggleCorrect: (index: number) => void;
}

export default function ChoiceBuilder({
    choices,
    questionType,
    onAddChoice,
    onRemoveChoice,
    onTextChange,
    onToggleCorrect
}: ChoiceBuilderProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Choices
                </span>
                {questionType !== 'True or False' && (
                    <CommonButton
                        size="small"
                        startIcon={<PlusIcon size={12} weight="bold" />}
                        variant="outlined"
                        onClick={onAddChoice}
                    >
                        Add Choice
                    </CommonButton>
                )}
            </div>
            <div className="flex flex-col gap-2 max-h-41 overflow-y-auto pr-4">
                {choices.map((choice, index) => (
                    <div
                        className="flex gap-2 items-center"
                        key={index}
                    >
                        <CommonButton
                            size="small"
                            sx={{
                                flexShrink: 0,
                                minWidth: 0,
                                p: 0.5,
                                borderRadius: '50%',
                                backgroundColor: choice.is_correct
                                    ? 'success.main'
                                    : 'error.main',
                                borderColor: choice.is_correct
                                    ? 'success.main'
                                    : 'error.main',
                                border: '2px solid',
                                width: 20,
                                height: 20
                            }}
                            onClick={function() {
                                onToggleCorrect(index);
                            }}
                        />
                        <input
                            className="border border-(--mui-palette-divider) flex-1 focus:border-(--mui-palette-primary-main) outline-none px-3 py-1.5 rounded-md text-sm transition-colors"
                            placeholder={`Choice ${index + 1}`}
                            value={choice.choice_text}
                            onChange={function(e) {
                                onTextChange(index, e.target.value);
                            }}
                        />
                        {choices.length > 2 && (
                            <CommonButton
                                color="error"
                                size="small"
                                onClick={function() {
                                    onRemoveChoice(index);
                                }}
                            >
                                <TrashIcon size={14} weight="bold" />
                            </CommonButton>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}