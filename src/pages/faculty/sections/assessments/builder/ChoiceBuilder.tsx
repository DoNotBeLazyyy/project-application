import CommonButton from '@components/button/CommonButton';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { QuestionChoiceFormValue, QuestionFormValues, QuestionType } from '@type/assessment.type';
import { Control } from 'react-hook-form';

interface ChoiceBuilderProps {
    choices: QuestionChoiceFormValue[];
    control: Control<QuestionFormValues>;
    errorMessage?: string;
    questionType: QuestionType;
    onAddChoice: VoidFunction;
    onRemoveChoice: (index: number) => void;
    onToggleCorrect: (index: number) => void;
}

export default function ChoiceBuilder({
    choices,
    control,
    errorMessage,
    questionType,
    onAddChoice,
    onRemoveChoice,
    onToggleCorrect
}: ChoiceBuilderProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Choices
                    <span className="font-normal ml-2 text-(--mui-palette-text-secondary) text-xs">
                        Click the circle to mark the correct answer
                    </span>
                </span>
                {questionType !== 'True or False' && (
                    <CommonButton
                        size="small"
                        startIcon={(
                            <PlusIcon
                                size={12}
                                weight="bold"
                            />
                        )}
                        variant="outlined"
                        onClick={onAddChoice}
                    >
                        Add Choice
                    </CommonButton>
                )}
            </div>
            {errorMessage && (
                <p
                    className="text-(--mui-palette-error-main) text-xs"
                    role="alert"
                >
                    {errorMessage}
                </p>
            )}
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {choices.map((choice, index) => (
                    <div
                        className="flex gap-2 items-start"
                        key={index}
                    >
                        <CommonButton
                            aria-label={choice.is_correct
                                ? `Choice ${index + 1} is correct`
                                : `Mark choice ${index + 1} as correct`}
                            size="small"
                            sx={{
                                flexShrink: 0,
                                minWidth: 0,
                                mt: 1.25,
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
                        <div className="flex-1 min-w-0">
                            <ValidCommonInput
                                control={control}
                                fullWidth
                                name={`choices.${index}.choice_text`}
                                placeholder={`Choice ${index + 1}`}
                                rules={{
                                    validate: (value) => String(value ?? '')
                                        .trim() !== '' || `Choice ${index + 1} text is required.`
                                }}
                            />
                        </div>
                        {choices.length > 2 && (
                            <CommonButton
                                aria-label={`Remove choice ${index + 1}`}
                                color="error"
                                size="small"
                                sx={{ mt: 0.75 }}
                                onClick={function() {
                                    onRemoveChoice(index);
                                }}
                            >
                                <TrashIcon
                                    size={14}
                                    weight="bold"
                                />
                            </CommonButton>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}