import CommonActionModal from '@components/modal/CommonActionModal';
import EvaluationQuestionField from '@pages/student/subject/EvaluationQuestionField';
import { getEvaluationForm, submitEvaluation } from '@services/evaluation.service';
import { useToastStore } from '@stores/toast.store';
import { EvaluationAnswerForm, EvaluationAnswersForm, EvaluationForm, EvaluationSection } from '@type/evaluation.type';
import { useEffect, useMemo, useState } from 'react';
import { Path, useFieldArray, useForm } from 'react-hook-form';

interface EvaluationModalProps {
    enrollmentId: string;
    gradingPeriodId: string | null;
    open: boolean;
    onClose: () => void;
    onSubmitted: () => void;
}

interface RenderedSection extends EvaluationSection {
    startIndex: number;
}

function toAnswerForms(form: EvaluationForm): EvaluationAnswerForm[] {
    let sequence = 0;

    return form.sections.flatMap(function(section) {
        return section.questions.map(function(question) {
            sequence += 1;

            return {
                question_id: question.id,
                question_text: question.question_text,
                question_type: question.question_type,
                is_required: question.is_required,
                min_rating: question.min_rating,
                max_rating: question.max_rating,
                sequence,
                rating_value: '',
                response_text: ''
            };
        });
    });
}

function toRenderedSections(form: EvaluationForm | null): RenderedSection[] {
    if (!form) {
        return [];
    }

    let startIndex = 0;

    return form.sections.map(function(section) {
        const rendered = { ...section, startIndex };

        startIndex += section.questions.length;

        return rendered;
    });
}

function isAnswerMissing(answer: EvaluationAnswerForm): boolean {
    if (!answer.is_required) {
        return false;
    }

    const value = answer.question_type === 'Rating'
        ? answer.rating_value
        : answer.response_text;

    return !String(value ?? '')
        .trim();
}

function toAnswerFieldName(answer: EvaluationAnswerForm, index: number): Path<EvaluationAnswersForm> {
    return answer.question_type === 'Rating'
        ? `responses.${index}.rating_value`
        : `responses.${index}.response_text`;
}

export default function EvaluationModal({
    enrollmentId,
    gradingPeriodId,
    open,
    onClose,
    onSubmitted
}: EvaluationModalProps) {
    const [form, setForm] = useState<EvaluationForm | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const methods = useForm<EvaluationAnswersForm>({
        defaultValues: { responses: [] },
        mode: 'onChange'
    });
    const { fields } = useFieldArray({
        control: methods.control,
        name: 'responses'
    });

    useEffect(function() {
        if (!open || !gradingPeriodId) {
            return;
        }

        setForm(null);
        methods.reset({ responses: [] });

        async function fetchForm() {
            const result = await getEvaluationForm(enrollmentId, gradingPeriodId as string);

            if (!result.data) {
                onClose();
                return;
            }

            setForm(result.data);
            methods.reset({ responses: toAnswerForms(result.data) });
        }

        fetchForm();
    }, [open, gradingPeriodId, enrollmentId]);

    const sections = useMemo(function() {
        return toRenderedSections(form);
    }, [form]);

    function flagMissingAnswers(answers: EvaluationAnswerForm[]): Path<EvaluationAnswersForm> | null {
        let firstMissingName: Path<EvaluationAnswersForm> | null = null;

        answers.forEach(function(answer, index) {
            if (!isAnswerMissing(answer)) {
                return;
            }

            const name = toAnswerFieldName(answer, index);

            if (!firstMissingName) {
                firstMissingName = name;
            }

            methods.setError(name, {
                type: 'required',
                message: answer.question_type === 'Rating'
                    ? 'Select a rating'
                    : 'Response is required'
            });
        });

        return firstMissingName;
    }

    async function handleSubmit() {
        if (!form || !gradingPeriodId) {
            return;
        }

        const answers = methods.getValues('responses');
        const firstMissingName = flagMissingAnswers(answers);

        if (firstMissingName) {
            methods.setFocus(firstMissingName);
            useToastStore.getState()
                .showToast('Please answer all required questions.', 'warning');

            return;
        }

        setIsSubmitting(true);

        const responses = answers.map(function(answer) {
            return {
                question_id: answer.question_id,
                rating_value: answer.rating_value,
                response_text: answer.response_text
            };
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
                    title: 'Faculty Evaluation'
                },
                className: 'w-[min(94vw,820px)]'
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
                <div className="flex flex-col gap-8 max-h-[60vh] overflow-y-auto pr-1">
                    {sections.map(function(section) {
                        return (
                            <section
                                className="flex flex-col gap-4"
                                key={section.template_id}
                            >
                                <div className="border-(--mui-palette-divider) border-b flex flex-col gap-1 pb-2">
                                    <h3 className="font-semibold text-(--mui-palette-text-primary) text-base">
                                        {section.title}
                                    </h3>
                                    {section.description && (
                                        <p className="text-(--mui-palette-text-secondary) text-sm">
                                            {section.description}
                                        </p>
                                    )}
                                </div>
                                {section.questions.map(function(question, offset) {
                                    const index = section.startIndex + offset;
                                    const answer = fields[index];

                                    if (!answer) {
                                        return null;
                                    }

                                    return (
                                        <EvaluationQuestionField
                                            answer={answer}
                                            control={methods.control}
                                            index={index}
                                            key={question.id}
                                        />
                                    );
                                })}
                            </section>
                        );
                    })}
                </div>
            )}
        </CommonActionModal>
    );
}