import ValidCommonInput from '@components/input/ValidCommonInput';
import { EvaluationAnswerForm, EvaluationAnswersForm } from '@type/evaluation.type';
import { Control, Path, RegisterOptions } from 'react-hook-form';

type AnswerRules = Omit<RegisterOptions<EvaluationAnswersForm>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;

export interface EvaluationQuestionFieldProps {
    answer: EvaluationAnswerForm;
    control: Control<EvaluationAnswersForm>;
    disabled: boolean;
    index: number;
}

function buildRules(isRequired: boolean, message: string): AnswerRules | undefined {
    if (!isRequired) {
        return undefined;
    }

    return {
        validate: function(value: unknown) {
            return String(value ?? '')
                .trim().length > 0 || message;
        }
    };
}

export default function EvaluationQuestionField({
    answer,
    control,
    disabled,
    index
}: EvaluationQuestionFieldProps) {
    const responseName: Path<EvaluationAnswersForm> = `responses.${index}.response_text`;

    return (
        <div className="flex flex-col gap-2">
            <label
                className="font-medium leading-snug text-(--mui-palette-text-primary) text-sm"
                htmlFor={responseName}
            >
                <span className="text-(--mui-palette-text-secondary)">
                    {`${answer.sequence}. `}
                </span>
                {answer.question_text}
                {answer.is_required && (
                    <span className="text-(--mui-palette-error-main)"> *</span>
                )}
            </label>
            <ValidCommonInput
                control={control}
                disabled={disabled}
                fullWidth
                hasHelper
                name={responseName}
                placeholder="Type your response"
                rules={buildRules(answer.is_required, 'Response is required')}
                size="small"
            />
        </div>
    );
}