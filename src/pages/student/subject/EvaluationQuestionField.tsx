import ValidCommonInput from '@components/input/ValidCommonInput';
import { CommonSelectOption } from '@components/select/CommonSelect';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { EvaluationAnswerForm, EvaluationAnswersForm } from '@type/evaluation.type';
import { Control, Path, RegisterOptions } from 'react-hook-form';

const FALLBACK_MIN_RATING = 1;
const FALLBACK_MAX_RATING = 5;

type AnswerRules = Omit<RegisterOptions<EvaluationAnswersForm>, 'valueAsNumber' | 'valueAsDate' | 'setValueAs' | 'disabled'>;

export interface EvaluationQuestionFieldProps {
    answer: EvaluationAnswerForm;
    control: Control<EvaluationAnswersForm>;
    index: number;
}

function buildRatingOptions(min: number, max: number): CommonSelectOption[] {
    const length = Math.max(max - min + 1, 1);

    return Array.from({ length }, function(_, offset) {
        const rating = min + offset;

        return {
            label: String(rating),
            value: String(rating)
        };
    });
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
    index
}: EvaluationQuestionFieldProps) {
    const isRating = answer.question_type === 'Rating';
    const ratingName: Path<EvaluationAnswersForm> = `responses.${index}.rating_value`;
    const responseName: Path<EvaluationAnswersForm> = `responses.${index}.response_text`;

    return (
        <div className="flex flex-col gap-2">
            <label
                className="font-medium leading-snug text-(--mui-palette-text-primary) text-sm"
                htmlFor={isRating
                    ? ratingName
                    : responseName}
            >
                <span className="text-(--mui-palette-text-secondary)">
                    {`${answer.sequence}. `}
                </span>
                {answer.question_text}
                {answer.is_required && (
                    <span className="text-(--mui-palette-error-main)"> *</span>
                )}
            </label>
            {isRating
                ? (
                    <div className="w-40">
                        <ValidCommonSelect
                            control={control}
                            fullWidth
                            hasHelper
                            name={ratingName}
                            options={buildRatingOptions(
                                answer.min_rating ?? FALLBACK_MIN_RATING,
                                answer.max_rating ?? FALLBACK_MAX_RATING
                            )}
                            rules={buildRules(answer.is_required, 'Select a rating')}
                            size="small"
                        />
                    </div>
                )
                : (
                    <ValidCommonInput
                        control={control}
                        fullWidth
                        hasHelper
                        name={responseName}
                        placeholder="Type your response"
                        rules={buildRules(answer.is_required, 'Response is required')}
                        size="small"
                    />
                )}
        </div>
    );
}