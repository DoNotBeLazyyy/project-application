import CommonCard from '@components/card/CommonCard';
import ModalStepperHeader, { ModalStepItem } from '@components/modal/ModalStepperHeader';
import { QUESTIONS_SCROLL_STEP } from '@constants/evaluation.constant';
import { useInfiniteScroll } from '@hooks/useInfiniteScroll';
import { EvaluationRatingRow } from '@pages/student/evaluation/EvaluationRatingMatrix';
import Step1FacultyAndGuide from '@pages/student/evaluation/Step1FacultyAndGuide';
import Step2EvaluationForm, { RenderedSection, ScrolledSection } from '@pages/student/evaluation/Step2EvaluationForm';
import { toTargetPath, useEvaluationTargets } from '@pages/student/evaluation/useEvaluationTargets';
import { getEvaluationForm, submitEvaluation } from '@services/evaluation.service';
import { useToastStore } from '@stores/toast.store';
import { EvaluationAnswerForm, EvaluationAnswersForm, EvaluationForm } from '@type/evaluation.type';
import { DEFAULT_FORM_OPTIONS } from '@utils/form.util';
import { useEffect, useMemo, useState } from 'react';
import { Path, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

const BASE_PATH = '/student/evaluations';

const EVALUATION_STEPS: ModalStepItem[] = [
    {
        step: 1,
        subtitle: 'Choose a faculty member and read the rating guide.',
        title: 'Select & Guide'
    },
    {
        step: 2,
        subtitle: 'Rate each statement and add comments.',
        title: 'Evaluation Form'
    }
];

function toAnswerForms(form: EvaluationForm): EvaluationAnswerForm[] {
    const saved = new Map((form.answers ?? []).map(function(answer) {
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

export default function StudentEvaluations() {
    const { enrollmentId = '', gradingPeriodId = '' } = useParams<{ enrollmentId: string; gradingPeriodId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [form, setForm] = useState<EvaluationForm | null>(null);
    const [isLoadingForm, setIsLoadingForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { pendingCount, targetOptions, targets } = useEvaluationTargets(refreshKey);

    const hasTarget = Boolean(enrollmentId && gradingPeriodId);
    const isStep2 = searchParams.get('step') === '2' && hasTarget;
    const currentStep: 1 | 2 = isStep2
        ? 2
        : 1;

    const selectedTarget = useMemo(function() {
        return targets.find(function(target) {
            return target.enrollment_id === enrollmentId && target.grading_period_id === gradingPeriodId;
        }) ?? null;
    }, [targets, enrollmentId, gradingPeriodId]);

    const methods = useForm<EvaluationAnswersForm>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: { responses: [] }
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
        setIsLoadingForm(true);

        async function fetchForm() {
            try {
                const result = await getEvaluationForm(enrollmentId, gradingPeriodId);

                if (!active) {
                    return;
                }

                if (!result.data) {
                    navigate(BASE_PATH);
                    return;
                }

                // Term-scoped evaluations resolve to an anchor period; links from the grade
                // views pass the raw period, so canonicalize the URL to the resolved one.
                if (result.data.grading_period_id && result.data.grading_period_id !== gradingPeriodId) {
                    navigate(`${toTargetPath(enrollmentId, result.data.grading_period_id)}${window.location.search}`, { replace: true });
                    return;
                }

                setForm(result.data);
                methods.reset({ responses: toAnswerForms(result.data) });
            }
            finally {
                if (active) {
                    setIsLoadingForm(false);
                }
            }
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

    function handleSelectTarget(nextEnrollmentId: string, nextGradingPeriodId: string) {
        if (!nextEnrollmentId || !nextGradingPeriodId) {
            navigate(BASE_PATH);
            setSearchParams({});
            return;
        }

        navigate(toTargetPath(nextEnrollmentId, nextGradingPeriodId));
        setSearchParams({});
    }

    function handleProceed() {
        if (!hasTarget) {
            return;
        }
        setSearchParams({ step: '2' });
    }

    function handleBack() {
        setSearchParams({});
    }

    function handleStepClick(stepNumber: number) {
        if (stepNumber === 1) {
            setSearchParams({});
        }
        else if (stepNumber === 2 && hasTarget) {
            setSearchParams({ step: '2' });
        }
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
                message: answer.question_type === 'Rating'
                    ? 'Select a rating'
                    : 'Response is required',
                type: 'required'
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
            const result = await submitEvaluation(enrollmentId, form.grading_period_id || gradingPeriodId, responses);

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
        <div className="flex flex-col h-full w-full min-h-0">
            <CommonCard className="flex flex-col gap-3 sm:gap-4 h-full min-h-0 overflow-hidden p-3 sm:p-5">
                <div className="flex flex-col gap-3 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                            <h1 className="font-bold text-(--mui-palette-text-primary) text-lg sm:text-xl truncate">
                                Faculty Evaluation
                            </h1>
                            <p className="text-(--mui-palette-text-secondary) text-xs sm:text-sm">
                                {pendingCount > 0
                                    ? `${pendingCount} faculty evaluation${pendingCount === 1
                                        ? ''
                                        : 's'} awaiting your review`
                                    : 'You have completed all available faculty evaluations'}
                            </p>
                        </div>
                    </div>
                </div>

                <ModalStepperHeader
                    currentStep={currentStep}
                    steps={EVALUATION_STEPS}
                    onStepClick={handleStepClick}
                />

                {/* Step Body */}
                {currentStep === 1
                    ? (
                        <Step1FacultyAndGuide
                            enrollmentId={enrollmentId}
                            gradingPeriodId={gradingPeriodId}
                            isLoadingForm={isLoadingForm}
                            pendingCount={pendingCount}
                            selectedTarget={selectedTarget}
                            targetOptions={targetOptions}
                            targets={targets}
                            onProceed={handleProceed}
                            onSelectTarget={handleSelectTarget}
                        />
                    )
                    : (
                        <Step2EvaluationForm
                            control={methods.control}
                            fieldsCount={fields.length}
                            form={form}
                            hasMore={hasMore}
                            isLoading={isLoadingForm}
                            isReadOnly={isReadOnly}
                            isSubmitting={isSubmitting}
                            scrolledSections={scrolledSections}
                            sentinelRef={sentinelRef}
                            visibleCount={visibleCount}
                            onBack={handleBack}
                            onSubmit={handleSubmit}
                        />
                    )}
            </CommonCard>
        </div>
    );
}