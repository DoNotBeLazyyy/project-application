import CommonButton from '@components/button/CommonButton';
import CommonActionModal from '@components/modal/CommonActionModal';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { getEvaluationForm, submitEvaluation } from '@services/evaluation.service';
import { useToastStore } from '@stores/toast.store';
import { ChangeEventInputTextarea } from '@type/common.type';
import { EvaluationForm, EvaluationResponseInput } from '@type/evaluation.type';
import { useEffect, useState } from 'react';

interface EvaluationModalProps {
    enrollmentId: string;
    gradingPeriodId: string | null;
    open: boolean;
    onClose: () => void;
    onSubmitted: () => void;
}

type AnswerMap = Record<string, EvaluationResponseInput>;

export default function EvaluationModal({
    enrollmentId,
    gradingPeriodId,
    open,
    onClose,
    onSubmitted
}: EvaluationModalProps) {
    const [form, setForm] = useState<EvaluationForm | null>(null);
    const [answers, setAnswers] = useState<AnswerMap>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(function() {
        if (!open || !gradingPeriodId) return;

        setForm(null);
        setAnswers({});

        async function fetchForm() {
            const result = await getEvaluationForm(enrollmentId, gradingPeriodId as string);
            if (result.data) {
                setForm(result.data);
            }
            else {
                onClose();
            }
        }

        fetchForm();
    }, [open, gradingPeriodId, enrollmentId]);

    function setRating(questionId: string, value: number) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                rating_value: String(value),
                response_text: prev[questionId]?.response_text ?? ''
            }
        }));
    }

    function setText(questionId: string, value: string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                rating_value: prev[questionId]?.rating_value ?? '',
                response_text: value
            }
        }));
    }

    async function handleSubmit() {
        if (!form || !gradingPeriodId) return;

        const missing = form.questions.some((question) => {
            if (!question.is_required) return false;
            const answer = answers[question.id];
            if (question.question_type === 'Rating') {
                return !answer?.rating_value;
            }

            return !answer?.response_text?.trim();
        });

        if (missing) {
            useToastStore.getState()
                .showToast('Please answer all required questions.', 'warning');
            return;
        }

        setIsSubmitting(true);
        const responses = form.questions.map((question) => answers[question.id] ?? {
            question_id: question.id,
            rating_value: '',
            response_text: ''
        });
        const result = await submitEvaluation(enrollmentId, gradingPeriodId, responses);
        setIsSubmitting(false);

        if (!result.error) {
            onSubmitted();
            onClose();
        }
    }

    return (
        <CommonActionModal
            cardProps={{
                cardHeaderProps: {
                    subheader: form
                        ? `${form.faculty_name} · ${form.grading_period_name}`
                        : 'Loading evaluation form...',
                    title: form?.title ?? 'Faculty Evaluation'
                },
                className: 'max-h-[85vh] overflow-y-auto w-[min(90vw,640px)]'
            }}
            formButtonsProps={{
                cancelProps: {
                    children: 'Cancel',
                    disabled: isSubmitting,
                    onClick: onClose
                },
                confirmProps: {
                    children: isSubmitting
                        ? 'Submitting...'
                        : 'Submit Evaluation',
                    disabled: isSubmitting || !form,
                    onClick: handleSubmit
                }
            }}
            open={open}
            onClose={onClose}
        >
            {!form && (
                <p className="py-6 text-(--mui-palette-text-secondary) text-center text-sm">
                    Loading...
                </p>
            )}
            {form && (
                <div className="flex flex-col gap-5">
                    {form.description && (
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {form.description}
                        </p>
                    )}
                    {form.questions.map((question, index) => {
                        const answer = answers[question.id];
                        const min = question.min_rating ?? 1;
                        const max = question.max_rating ?? 5;
                        const scale = Array.from(
                            { length: max - min + 1 },
                            (_, i) => min + i
                        );

                        return (
                            <div className="flex flex-col gap-2" key={question.id}>
                                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    {`${index + 1}. ${question.question_text}`}
                                    {question.is_required && (
                                        <span className="text-(--mui-palette-error-main)"> *</span>
                                    )}
                                </span>
                                {question.question_type === 'Rating'
                                    ? (
                                        <div className="flex flex-wrap gap-2">
                                            {scale.map((value) => (
                                                <CommonButton
                                                    key={value}
                                                    size="small"
                                                    variant={answer?.rating_value === String(value)
                                                        ? 'contained'
                                                        : 'outlined'}
                                                    onClick={function() {
                                                        setRating(question.id, value);
                                                    }}
                                                >
                                                    {value}
                                                </CommonButton>
                                            ))}
                                        </div>
                                    )
                                    : (
                                        <CommonTextarea
                                            placeholder="Type your response"
                                            value={answer?.response_text ?? ''}
                                            onChange={function(e: ChangeEventInputTextarea) {
                                                setText(question.id, e.target.value);
                                            }}
                                        />
                                    )
                                }
                            </div>
                        );
                    })}
                </div>
            )}
        </CommonActionModal>
    );
}