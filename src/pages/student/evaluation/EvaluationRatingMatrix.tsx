import Radio from '@mui/material/Radio';
import { EvaluationAnswerForm, EvaluationAnswersForm } from '@type/evaluation.type';
import { Control, Controller, Path } from 'react-hook-form';

const FALLBACK_MIN_RATING = 1;
const FALLBACK_MAX_RATING = 5;

export interface EvaluationRatingRow {
    answer: EvaluationAnswerForm;
    index: number;
}

export interface EvaluationRatingMatrixProps {
    control: Control<EvaluationAnswersForm>;
    disabled: boolean;
    rows: EvaluationRatingRow[];
}

function resolveRatingScale(rows: EvaluationRatingRow[]): number[] {
    const min = Math.min(...rows.map((row) => row.answer.min_rating ?? FALLBACK_MIN_RATING));
    const max = Math.max(...rows.map((row) => row.answer.max_rating ?? FALLBACK_MAX_RATING));
    const length = Math.max(max - min + 1, 1);

    return Array.from({ length }, function(_, offset) {
        return max - offset;
    });
}

function isRatingAllowed(answer: EvaluationAnswerForm, rating: number): boolean {
    const min = answer.min_rating ?? FALLBACK_MIN_RATING;
    const max = answer.max_rating ?? FALLBACK_MAX_RATING;

    return rating >= min && rating <= max;
}

export default function EvaluationRatingMatrix({
    control,
    disabled,
    rows
}: EvaluationRatingMatrixProps) {
    if (!rows.length) {
        return null;
    }

    const scale = resolveRatingScale(rows);

    return (
        <div className="overflow-x-auto w-full">
            <table className="min-w-full table-fixed">
                <thead>
                    <tr className="border-(--mui-palette-divider) border-b">
                        <th className="font-semibold pb-2 pr-4 text-(--mui-palette-text-primary) text-left text-sm w-1/2">
                            Questions
                        </th>
                        {scale.map(function(rating) {
                            return (
                                <th
                                    className="font-semibold pb-2 text-(--mui-palette-text-primary) text-center text-sm"
                                    key={rating}
                                >
                                    {rating}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.map(function({ answer, index }) {
                        const name = `responses.${index}.rating_value` as Path<EvaluationAnswersForm>;

                        return (
                            <Controller
                                control={control}
                                key={answer.question_id}
                                name={name}
                                render={function({ field, fieldState }) {
                                    return (
                                        <tr className="border-(--mui-palette-divider) border-b last:border-b-0">
                                            <td className="align-middle py-1 pr-4">
                                                <span className="leading-snug text-(--mui-palette-text-primary) text-sm">
                                                    <span className="text-(--mui-palette-text-secondary)">
                                                        {`${answer.sequence}. `}
                                                    </span>
                                                    {answer.question_text}
                                                    {answer.is_required && (
                                                        <span className="text-(--mui-palette-error-main)"> *</span>
                                                    )}
                                                </span>
                                                {fieldState.error && (
                                                    <span className="block text-(--mui-palette-error-main) text-xs">
                                                        {fieldState.error.message}
                                                    </span>
                                                )}
                                            </td>
                                            {scale.map(function(rating) {
                                                if (!isRatingAllowed(answer, rating)) {
                                                    return (
                                                        <td
                                                            className="text-center"
                                                            key={rating}
                                                        />
                                                    );
                                                }

                                                return (
                                                    <td
                                                        className="text-center"
                                                        key={rating}
                                                    >
                                                        <Radio
                                                            checked={String(field.value ?? '') === String(rating)}
                                                            disabled={disabled}
                                                            inputProps={{ 'aria-label': `${answer.question_text} — ${rating}` }}
                                                            size="small"
                                                            value={String(rating)}
                                                            onChange={function() {
                                                                field.onChange(String(rating));
                                                            }}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                }}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}