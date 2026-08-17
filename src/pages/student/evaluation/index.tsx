import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { QUESTIONS_SCROLL_STEP } from '@constants/evaluation.constant';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import EvaluationQuestionField from '@pages/student/evaluation/EvaluationQuestionField';
import EvaluationRatingMatrix, { EvaluationRatingRow } from '@pages/student/evaluation/EvaluationRatingMatrix';
import { toTargetKey, toTargetPath, useEvaluationTargets } from '@pages/student/evaluation/useEvaluationTargets';
import { getEvaluationForm, submitEvaluation } from '@services/evaluation.service';
import { useToastStore } from '@stores/toast.store';
import { ChangeEventInputTextarea } from '@type/common.type';
import { EvaluationAnswerForm, EvaluationAnswersForm, EvaluationForm, EvaluationSection } from '@type/evaluation.type';
import { useEffect, useMemo, useState } from 'react';
import { Path, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

const BASE_PATH = '/student/evaluations';

const RATING_LEGEND = '5 = Strongly Agree, 4 = Agree, 3 = Uncertain, 2 = Disagree, 1 = Strongly Disagree';

const PLACEHOLDER_OPTION: CommonSelectOption = {
    label: 'Select a faculty to evaluate',
    value: ''
};

interface RenderedSection extends EvaluationSection {
    startIndex: number;
}

interface ScrolledSection {
    openRows: EvaluationRatingRow[];
    ratingRows: EvaluationRatingRow[];
    section: RenderedSection;
}

function toAnswerForms(form: EvaluationForm): EvaluationAnswerForm[] {
    const saved = new Map(form.answers.map(function(answer) {
        return [answer.question_id, answer];
    }));
    let sequence = 0;

    return form.sections.flatMap(function(section) {
        return section.questions.map(function(question) {
            sequence += 1;

            const previous = saved.get(question.id);

            return {
                question_id: question.id,
                question_text: question.question_text,
                question_type: question.question_type,
                is_required: question.is_required,
                min_rating: question.min_rating,
                max_rating: question.max_rating,
                sequence,
                rating_value: previous?.rating_value != null
                    ? String(previous.rating_value)
                    : '',
                response_text: previous?.response_text ?? ''
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

function hasStandardScale(answers: EvaluationAnswerForm[]): boolean {
    const ratings = answers.filter(function(answer) {
        return answer.question_type === 'Rating';
    });

    return ratings.length > 0 && ratings.every(function(answer) {
        return (answer.min_rating ?? 1) === 1 && (answer.max_rating ?? 5) === 5;
    });
}

export default function StudentEvaluations() {
    const { enrollmentId = '', gradingPeriodId = '' } = useParams<{ enrollmentId: string; gradingPeriodId: string }>();
    const navigate = useNavigate();
    const [form, setForm] = useState<EvaluationForm | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { pendingCount, targetOptions } = useEvaluationTargets(refreshKey);

    const hasTarget = Boolean(enrollmentId && gradingPeriodId);

    const methods = useForm<EvaluationAnswersForm>({
        defaultValues: { responses: [] },
        mode: 'onChange'
    });
    const { fields } = useFieldArray({
        control: methods.control,
        name: 'responses'
    });

    useEffect(function() {
        setForm(null);
        methods.reset({ responses: [] });

        if (!hasTarget) {
            return;
        }

        let active = true;

        async function fetchForm() {
            const result = await getEvaluationForm(enrollmentId, gradingPeriodId);

            if (!active) {
                return;
            }

            if (!result.data) {
                navigate(BASE_PATH);
                return;
            }

            setForm(result.data);
            methods.reset({ responses: toAnswerForms(result.data) });
        }

        fetchForm();

        return function() {
            active = false;
        };
    }, [enrollmentId, gradingPeriodId, refreshKey]);

    const sections = useMemo(function() {
        return toRenderedSections(form);
    }, [form]);

    const { hasMore, reset, revealThrough, sentinelRef, visibleCount } = useInfiniteScroll(
        fields.length,
        QUESTIONS_SCROLL_STEP
    );

    useEffect(function() {
        reset();
    }, [enrollmentId, gradingPeriodId]);

    const isReadOnly = form?.is_completed === true;
    const showLegend = hasStandardScale(fields);

    const selectOptions = useMemo<CommonSelectOption[]>(function() {
        return [PLACEHOLDER_OPTION, ...targetOptions];
    }, [targetOptions]);

    const scrolledSections = useMemo<ScrolledSection[]>(function() {
        return sections
            .map(function(section) {
                const ratingRows: EvaluationRatingRow[] = [];
                const openRows: EvaluationRatingRow[] = [];

                section.questions.forEach(function(_, offset) {
                    const index = section.startIndex + offset;

                    if (index >= visibleCount) {
                        return;
                    }

                    const answer = fields[index];

                    if (!answer) {
                        return;
                    }

                    if (answer.question_type === 'Rating') {
                        ratingRows.push({ answer, index });
                        return;
                    }

                    openRows.push({ answer, index });
                });

                return {
                    openRows,
                    ratingRows,
                    section
                };
            })
            .filter(function(scrolled) {
                return scrolled.ratingRows.length > 0 || scrolled.openRows.length > 0;
            });
    }, [fields, sections, visibleCount]);

    function handleTargetChange(event: ChangeEventInputTextarea) {
        const [nextEnrollmentId, nextGradingPeriodId] = String(event.target.value)
            .split('|');

        if (!nextEnrollmentId || !nextGradingPeriodId) {
            navigate(BASE_PATH);
            return;
        }

        navigate(toTargetPath(nextEnrollmentId, nextGradingPeriodId));
    }

    function flagMissingAnswers(answers: EvaluationAnswerForm[]): number {
        let firstMissingIndex = -1;

        answers.forEach(function(answer, index) {
            if (!isAnswerMissing(answer)) {
                return;
            }

            if (firstMissingIndex < 0) {
                firstMissingIndex = index;
            }

            methods.setError(toAnswerFieldName(answer, index), {
                type: 'required',
                message: answer.question_type === 'Rating'
                    ? 'Select a rating'
                    : 'Response is required'
            });
        });

        return firstMissingIndex;
    }

    async function handleSubmit() {
        if (!form || isReadOnly) {
            return;
        }

        const answers = methods.getValues('responses');
        const firstMissingIndex = flagMissingAnswers(answers);

        if (firstMissingIndex >= 0) {
            revealThrough(firstMissingIndex);
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
        try {
            const result = await submitEvaluation(enrollmentId, gradingPeriodId, responses);

            if (!result.error) {
                setRefreshKey(function(previous) {
                    return previous + 1;
                });
            }
        }
        finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col h-full w-full">
            <CommonCard className="flex flex-col gap-4 h-full min-h-0 overflow-hidden p-4">
                <div className="flex flex-wrap gap-4 items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            Faculty Evaluation
                        </h1>
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {pendingCount > 0
                                ? `${pendingCount} faculty still awaiting your evaluation.`
                                : 'You have completed every available evaluation.'}
                        </p>
                    </div>
                    {isReadOnly && (
                        <CommonBadgeStatus label="Completed" variant="success" />
                    )}
                </div>
                <div className="flex flex-col gap-2 max-w-2xl">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Faculty
                    </span>
                    <CommonSelect
                        fullWidth
                        options={selectOptions}
                        size="small"
                        value={hasTarget && targetOptions.length
                            ? toTargetKey(enrollmentId, gradingPeriodId)
                            : ''}
                        onChange={handleTargetChange}
                    />
                    {form && (
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {`${form.course_code} — ${form.course_title} · ${form.section_code} · ${form.term_label} · ${form.grading_period_name}`}
                        </p>
                    )}
                </div>
                {form && showLegend && (
                    <div className="border-(--mui-palette-divider) border rounded-lg flex flex-col gap-1 p-4">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                            Rating Legend
                        </h2>
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {RATING_LEGEND}
                        </p>
                    </div>
                )}
                <div className="flex flex-1 flex-col gap-8 min-h-0 overflow-y-auto">
                    {!hasTarget && (
                        <p className="text-(--mui-palette-text-secondary) text-center text-sm">
                            {targetOptions.length
                                ? 'Select a faculty above to load the evaluation form.'
                                : 'No faculty evaluations are available for you right now.'}
                        </p>
                    )}
                    {hasTarget && !form && (
                        <p className="text-(--mui-palette-text-secondary) text-center text-sm">
                            Loading evaluation form...
                        </p>
                    )}
                    {form && scrolledSections.map(function({ openRows, ratingRows, section }) {
                        return (
                            <section
                                className="flex flex-col gap-4"
                                key={section.template_id}
                            >
                                <div className="flex flex-col gap-1">
                                    <h3 className="bg-(--mui-palette-primary-main)/10 font-semibold px-2 py-1 rounded self-start text-(--mui-palette-primary-main) text-sm">
                                        {section.title}
                                    </h3>
                                    {section.description && (
                                        <p className="text-(--mui-palette-text-secondary) text-sm">
                                            {section.description}
                                        </p>
                                    )}
                                </div>
                                <EvaluationRatingMatrix
                                    control={methods.control}
                                    disabled={isReadOnly}
                                    rows={ratingRows}
                                />
                                {openRows.map(function({ answer, index }) {
                                    return (
                                        <EvaluationQuestionField
                                            answer={answer}
                                            control={methods.control}
                                            disabled={isReadOnly}
                                            index={index}
                                            key={answer.question_id}
                                        />
                                    );
                                })}
                            </section>
                        );
                    })}
                    {form && (
                        <div
                            className="flex items-center justify-center text-(--mui-palette-text-secondary) text-sm"
                            ref={sentinelRef}
                        >
                            {hasMore
                                ? `Loading more questions... (${Math.min(visibleCount, fields.length)} of ${fields.length})`
                                : ''}
                        </div>
                    )}
                </div>
                {form && !isReadOnly && (
                    <div className="border-(--mui-palette-divider) border-t flex gap-2 justify-end pt-4">
                        <CommonButton
                            disabled={isSubmitting}
                            variant="contained"
                            onClick={handleSubmit}
                        >
                            {isSubmitting
                                ? 'Submitting...'
                                : 'Submit Evaluation'}
                        </CommonButton>
                    </div>
                )}
            </CommonCard>
        </div>
    );
}